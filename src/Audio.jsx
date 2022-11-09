import { useEffect } from 'react'
import { useCallback, useRef, useState } from 'react'
import Plotter from './plotter.worker.js?worker'
import { allocate, getFunctionType } from './utils'

const workers = []

export const Audio = ({
  functions,
  duration,
  sampleRate,
  volume,
  loop,
  setPlayAudio,
  setSpectrograms,
}) => {
  const [audioContext, setAudioContext] = useState(null)
  const [masterGain, setMasterGain] = useState(null)

  const playAudio = useCallback(async () => {
    let ctx = audioContext,
      master = masterGain
    if (!ctx) {
      ctx = new AudioContext()
      master = ctx.createGain()
      setAudioContext(ctx)
      setMasterGain(master)
      const dynamicsCompressor = ctx.createDynamicsCompressor()
      master.connect(dynamicsCompressor)
      dynamicsCompressor.connect(ctx.destination)
    }

    const count = duration * sampleRate

    const errors = []
    const data = await Promise.all(
      functions.split(';').map(
        (fun, i) =>
          new Promise(resolve => {
            let type, values, funs
            try {
              ;({ type, funs } = getFunctionType(fun))
              if (type !== 'linear') {
                resolve()
                return
              }
              values = allocate(count)
              for (let j = 0; j < count; j++) {
                values[j] = j / sampleRate
              }
            } catch (e) {
              errors.push(e)
              return
            }
            if (!workers[i]) {
              workers[i] = new Plotter()
            }

            const plotter = workers[i]
            plotter.postMessage({
              index: i,
              type,
              funs,
              values,
              dimensions: 1,
            })
            plotter.onmessage = ({ data }) => resolve(data)
          })
      )
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

      const attack = 0.01
      const release = 0.01
      const gain = ctx.createGain()
      gain.connect(master)

      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + attack)
      gain.gain.setValueAtTime(1, ctx.currentTime + attack)
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + duration - release)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

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
    duration,
    functions,
    loop,
    masterGain,
    sampleRate,
    setSpectrograms,
  ])

  useEffect(() => {
    if (audioContext) {
      masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.01)
    }
  }, [audioContext, masterGain, volume])

  useEffect(() => {
    setPlayAudio(playAudio)
  }, [playAudio, setPlayAudio])

  return null
}
