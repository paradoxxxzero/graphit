import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import './Spectrogram.css'

const margin = 0.17

export const Spectrogram = ({ data, theme }) => {
  const canvasRef = useRef(null)

  const size = useCallback(() => {
    const canvas = canvasRef.current
    const { width, height } = canvas.parentNode.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
  }, [])

  useEffect(() => {
    window.addEventListener('resize', size)
    return () => window.removeEventListener('resize', size)
  }, [size])

  useLayoutEffect(() => {
    size()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!data) {
      return
    }
    const { width, height } = canvas
    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, width, height)

    const temporalSize = data.length
    const temporalStep = width / temporalSize
    for (let i = 0; i < temporalSize; i++) {
      const frequencies = data[i]
      const frequenciesSize = frequencies.length
      const frequenciesStep = height / frequenciesSize
      const x = i * temporalStep
      for (let j = 0; j < frequenciesSize; j++) {
        const y = j * frequenciesStep
        const value = frequencies[j]
        let hexOpacity = value.toString(16)
        if (hexOpacity.length === 1) {
          hexOpacity = '0' + hexOpacity
        }
        ctx.fillStyle = theme.colors[0] + hexOpacity
        // ctx.fillStyle = '#' + (~~(Math.random() * 0xffffff)).toString(16)
        ctx.fillRect(
          x + margin,
          height - (y + margin),
          temporalStep - 2 * margin,
          frequenciesStep - 2 * margin
        )
      }
    }
  }, [data, theme.background, theme.colors, theme.foreground])

  return <canvas ref={canvasRef} className="spectrogram" />
}
