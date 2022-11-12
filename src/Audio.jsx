import { useCallback, useEffect, useState } from 'react'
import { plotFunctions } from './plotter'
import { allocate } from './utils'
import recordProcessor from './recording.worklet?url'

export const Audio = ({
  functions,
  duration,
  sampleRate,
  volume,
  loop,
  recordings,
  setPlayAudio,
  setRecordAudio,
  setSpectrograms,
}) => {
  const [audioContext, setAudioContext] = useState(null)
  const [masterGain, setMasterGain] = useState(null)

  const createContext = useCallback(() => {
    const audioContext = new AudioContext()
    const masterGain = audioContext.createGain()
    masterGain.connect(audioContext.destination)
    setAudioContext(audioContext)
    setMasterGain(masterGain)
    return { audioContext, masterGain }
  }, [])

  const playAudio = useCallback(async () => {
    let ctx = audioContext,
      master = masterGain

    if (!audioContext) {
      ;({ audioContext: ctx, masterGain: master } = createContext())
    }
    const count = duration * sampleRate

    const errors = []
    const data = await plotFunctions(
      functions,
      type => {
        const values = allocate(count)
        for (let j = 0; j < count; j++) {
          values[j] = j / sampleRate
        }
        return values
      },
      recordings,
      { dimensions: 1 }
    )

    const spectrograms = []

    let playing = 0
    for (let i = 0; i < data.length; i++) {
      if (!data[i]) continue
      const { index, values, err } = data[i]
      if (err) {
        errors.push(err)
        continue
      }
      const buffer = ctx.createBuffer(1, count, sampleRate)
      buffer.copyToChannel(values, 0)

      const gain = ctx.createGain()
      gain.connect(master)

      // const attack = 0.01
      // const release = 0.01
      // gain.gain.setValueAtTime(0, ctx.currentTime)
      // gain.gain.linearRampToValueAtTime(1, ctx.currentTime + attack)
      // gain.gain.setValueAtTime(1, ctx.currentTime + attack)
      // gain.gain.linearRampToValueAtTime(1, ctx.currentTime + duration - release)
      // gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = loop
      const spectrogram = []

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2 ** 11
      // analyser.fftSize = 2**15
      analyser.smoothingTimeConstant = 0
      analyser.minDecibels = -70
      analyser.maxDecibels = -20
      source.connect(analyser)

      function extractSpectrogram() {
        const frequencyData = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(frequencyData)
        spectrogram.push(frequencyData)
      }

      const interval = setInterval(extractSpectrogram)
      // eslint-disable-next-line no-loop-func
      source.onended = ((index, spectrogram, interval) => () => {
        playing--
        spectrograms.push({ index, spectrogram })
        if (playing === 0) {
          setSpectrograms(spectrograms)
        }
        clearInterval(interval)
        gain.disconnect(master)
        source.disconnect(gain)
      })(index, spectrogram, interval)

      source.connect(gain)
      source.start()
      playing++
    }
  }, [
    audioContext,
    createContext,
    duration,
    functions,
    loop,
    masterGain,
    recordings,
    sampleRate,
    setSpectrograms,
  ])

  const recordAudio = useCallback(
    async stream => {
      let ctx = audioContext

      if (!audioContext) {
        ;({ audioContext: ctx } = createContext())
      }

      const input = ctx.createMediaStreamSource(stream)

      await ctx.audioWorklet.addModule(recordProcessor)

      const workletNode = new AudioWorkletNode(ctx, 'recording-processor')

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(2, ctx.currentTime)
      const dynamicsCompressor = ctx.createDynamicsCompressor()
      input.connect(gain)
      gain.connect(dynamicsCompressor)
      dynamicsCompressor.connect(workletNode)

      const chunks = []
      workletNode.port.onmessage = ({ data }) => chunks.push(data)
      return async () => {
        const size = chunks.reduce((a, b) => a + b.length, 0)
        const buffer = new Float32Array(size)
        let s = 0
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          for (let j = 0; j < chunk.length; j++) {
            buffer[s + j] = chunk[j]
          }
          s += chunk.length
        }

        dynamicsCompressor.disconnect(workletNode)
        gain.disconnect(dynamicsCompressor)
        input.disconnect(gain)
        // Disconnect
        stream.getAudioTracks().forEach(track => {
          track.stop()
        })
        return buffer
      }
    },
    [audioContext, createContext]
  )

  useEffect(() => {
    if (audioContext) {
      masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.01)
    }
  }, [audioContext, masterGain, volume])

  useEffect(() => {
    setPlayAudio(playAudio)
  }, [playAudio, setPlayAudio])

  useEffect(() => {
    setRecordAudio(recordAudio)
  }, [recordAudio, setRecordAudio])

  return null
}
