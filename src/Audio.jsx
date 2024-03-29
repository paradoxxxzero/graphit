import { useCallback, useEffect, useState } from 'react'
import { plotFunctions } from './plotter'
import { DEFAULT_SAMPLE_RATE } from './base'
import recordProcessor from './recording.worklet?url'

export const Audio = ({
  functions,
  volume,
  recordings,
  setPlayAudio,
  setRecordAudio,
  setSpectrograms,
}) => {
  const [audioContext, setAudioContext] = useState(null)
  const [masterGain, setMasterGain] = useState(null)

  const createContext = useCallback(() => {
    const audioContext = new AudioContext({ sampleRate: DEFAULT_SAMPLE_RATE })
    const masterGain = audioContext.createGain()
    masterGain.connect(audioContext.destination)
    setAudioContext(audioContext)
    setMasterGain(masterGain)
    return { audioContext, masterGain }
  }, [])

  const playAudio = useCallback(
    async (makeBlob = true) => {
      let ctx = audioContext,
        master = masterGain

      if (!audioContext) {
        ;({ audioContext: ctx, masterGain: master } = createContext())
      }

      const errors = []
      const data = await plotFunctions(functions, null, recordings, 'sound')

      const sources = []
      for (let i = 0; i < data.length; i++) {
        const { index, values, max: duration, samples, err } = data[i]
        if (err) {
          errors.push(err)
          continue
        }
        const sampleRate = samples / duration
        const buffer = ctx.createBuffer(1, samples, sampleRate)
        buffer.copyToChannel(values, 0)

        const gain = ctx.createGain()

        // const attack = 0.01
        // const release = 0.01
        // gain.gain.setValueAtTime(0, ctx.currentTime)
        // gain.gain.linearRampToValueAtTime(1, ctx.currentTime + attack)
        // gain.gain.setValueAtTime(1, ctx.currentTime + attack)
        // gain.gain.linearRampToValueAtTime(1, ctx.currentTime + duration - release)
        // gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

        const source = ctx.createBufferSource()
        source.buffer = buffer
        const spectrogram = []

        const analyser = ctx.createAnalyser()
        analyser.fftSize = 2 ** 11
        // analyser.fftSize = 2**15
        analyser.smoothingTimeConstant = 0.2
        analyser.minDecibels = -70
        analyser.maxDecibels = -10

        source.connect(analyser)
        analyser.connect(gain)
        gain.connect(master)

        function extractSpectrogram() {
          const frequencyData = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(frequencyData)
          spectrogram.push(frequencyData)
        }

        const interval = setInterval(extractSpectrogram)

        sources.push(
          new Promise(resolve => {
            source.start()
            // eslint-disable-next-line no-loop-func
            source.onended = ((index, spectrogram, interval) => () => {
              clearInterval(interval)
              gain.disconnect(master)
              analyser.disconnect(gain)
              source.disconnect(analyser)
              resolve({ index, spectrogram, sampleRate })
            })(index, spectrogram, interval)
          })
        )
      }
      let chunks = []
      if (makeBlob) {
        await ctx.audioWorklet.addModule(recordProcessor)
        const workletNode = new AudioWorkletNode(ctx, 'recording-processor')
        master.connect(workletNode)
        workletNode.port.onmessage = ({ data }) => chunks.push(data)
      }
      const spectrograms = await Promise.all(sources)
      setSpectrograms(spectrograms)
      if (makeBlob) {
        const size = chunks.reduce((a, b) => a + b.length, 0)
        const sound = new Float32Array(size)
        let s = 0
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          for (let j = 0; j < chunk.length; j++) {
            sound[s + j] = chunk[j]
          }
          s += chunk.length
        }

        function floatTo16BitPCM(output, offset, input) {
          for (let i = 0; i < input.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, input[i]))
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
          }
        }

        function writeString(view, offset, string) {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i))
          }
        }
        const numChannels = 1
        const buffer = new ArrayBuffer(44 + sound.length * 2)
        const view = new DataView(buffer)

        /* RIFF identifier */
        writeString(view, 0, 'RIFF')
        /* RIFF chunk length */
        view.setUint32(4, 36 + sound.length * 2, true)
        /* RIFF type */
        writeString(view, 8, 'WAVE')
        /* format chunk identifier */
        writeString(view, 12, 'fmt ')
        /* format chunk length */
        view.setUint32(16, 16, true)
        /* sample format (raw) */
        view.setUint16(20, 1, true)
        /* channel count */
        view.setUint16(22, numChannels, true)
        /* sample rate */
        view.setUint32(24, ctx.sampleRate, true)
        /* byte rate (sample rate * block align) */
        view.setUint32(28, ctx.sampleRate * 4, true)
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, numChannels * 2, true)
        /* bits per sample */
        view.setUint16(34, 16, true)
        /* data chunk identifier */
        writeString(view, 36, 'data')
        /* data chunk length */
        view.setUint32(40, sound.length * 2, true)

        floatTo16BitPCM(view, 44, sound)

        const blob = new Blob([view], { type: 'audio/wav' })
        const url = window.URL.createObjectURL(blob)
        return url
      }
    },
    [
      audioContext,
      createContext,
      functions,
      masterGain,
      recordings,
      setSpectrograms,
    ]
  )

  const recordAudio = useCallback(
    async stream => {
      let ctx = audioContext

      if (!audioContext) {
        ;({ audioContext: ctx } = createContext())
      }
      const sampleRate = stream.getAudioTracks()[0].getSettings().sampleRate
      const input = ctx.createMediaStreamSource(stream)

      await ctx.audioWorklet.addModule(recordProcessor)

      const workletNode = new AudioWorkletNode(ctx, 'recording-processor')

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(2, ctx.currentTime)
      const dynamicsCompressor = ctx.createDynamicsCompressor()
      input.connect(gain)
      gain.connect(dynamicsCompressor)
      dynamicsCompressor.connect(workletNode)

      let chunks = []
      workletNode.port.onmessage = ({ data }) => chunks.push(data)
      return async () => {
        let start, end, k
        for (start = 0; start < chunks.length; start++) {
          const chunk = chunks[start]
          for (k = 0; k < chunk.length; k++) {
            if (Math.abs(chunk[k]) > 0.075) {
              break
            }
          }
          if (k < chunk.length) {
            start--
            break
          }
        }
        for (end = chunks.length - 1; end >= 0; end--) {
          const chunk = chunks[end]
          for (k = 0; k < chunk.length; k++) {
            if (Math.abs(chunk[k]) > 0.075) {
              break
            }
          }
          if (k < chunk.length) {
            end++
            break
          }
        }
        chunks = chunks.slice(start, end)
        const size = chunks.reduce((a, b) => a + b.length, 0)
        const data = new Float32Array(size)
        let s = 0
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          for (let j = 0; j < chunk.length; j++) {
            data[s + j] = chunk[j]
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
        return { sampleRate, data }
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
