import { useLayoutEffect, useRef } from 'react'
import './Spectrogram.css'

const parseColor = hexColor => {
  if (hexColor.length === 4) {
    return [
      parseInt(hexColor[1] + hexColor[1], 16),
      parseInt(hexColor[2] + hexColor[2], 16),
      parseInt(hexColor[3] + hexColor[3], 16),
    ]
  }
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  return [r, g, b]
}

export const Spectrogram = ({ data, theme }) => {
  const canvasRef = useRef(null)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
    })

    const width = (canvas.width = Math.max(
      ...data.map(({ spectrogram }) => spectrogram.length)
    ))
    const height = (canvas.height = Math.max(
      ...data.map(({ spectrogram }) => spectrogram[0].length)
    ))
    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < data.length; i++) {
      let { index, spectrogram } = data[i]
      let start = 0
      let end = spectrogram.length
      for (let i = 0; i < spectrogram.length; i++) {
        if (spectrogram[i].reduce((a, b) => a + b) === 0) {
          start = i + 1
        } else {
          break
        }
      }
      for (let i = spectrogram.length - 1; i >= 0; i--) {
        if (spectrogram[i].reduce((a, b) => a + b) === 0) {
          end = i
        } else {
          break
        }
      }
      spectrogram = spectrogram.slice(start, end)

      if (!spectrogram.length) {
        continue
      }
      const [r, g, b] = parseColor(theme.colors[index])
      const imageData = ctx.getImageData(0, 0, width, height)
      const thisWidth = spectrogram.length
      const thisHeight = spectrogram[0].length

      for (let i = 0; i < thisWidth; i++) {
        for (let j = 0; j < thisHeight; j++) {
          const k = (i + j * width) * 4
          const value = spectrogram[i][j]
          imageData.data[k] += (r * value) / 255
          imageData.data[k + 1] += (g * value) / 255
          imageData.data[k + 2] += (b * value) / 255
          // imageData.data[k + 3] += value
        }
      }
      ctx.putImageData(imageData, 0, 0)
    }
  }, [data, theme])

  return <canvas ref={canvasRef} className="spectrogram" />
}
