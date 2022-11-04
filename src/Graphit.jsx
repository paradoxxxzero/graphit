import { useGesture } from '@use-gesture/react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import './Graphit.css'
import { lerp } from './utils'

export function Graphit({ fun, color, bgColor, onError }) {
  const canvasRef = useRef(null)
  const [step, setStep] = useState(1)
  const [region, setRegion] = useState(null)

  const i2x = useCallback(
    i => {
      const { width } = canvasRef.current
      const [[xmin, xmax]] = region
      return xmin + (xmax - xmin) * (i / width)
    },
    [region]
  )
  const x2i = useCallback(
    x => {
      const { width } = canvasRef.current
      const [[xmin, xmax]] = region
      return Math.round((x - xmin) * (width / (xmax - xmin)))
    },
    [region]
  )

  const j2y = useCallback(
    j => {
      const { height } = canvasRef.current
      const [, [ymin, ymax]] = region
      return ymin + (ymax - ymin) * ((height - j) / height)
    },
    [region]
  )

  const y2j = useCallback(
    y => {
      const { height } = canvasRef.current
      const [, [ymin, ymax]] = region
      return Math.round(height - (y - ymin) * (height / (ymax - ymin)))
    },
    [region]
  )

  const di2dx = useCallback(
    di => {
      const { width } = canvasRef.current
      const [[xmin, xmax]] = region
      return (di * (xmax - xmin)) / width
    },
    [region]
  )

  const dj2dy = useCallback(
    dj => {
      const { height } = canvasRef.current
      const [, [ymin, ymax]] = region

      return (dj * (ymax - ymin)) / height
    },
    [region]
  )

  const plot = useCallback(() => {
    if (!region) {
      return
    }
    // console.log(...region)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = color
    ctx.beginPath()
    let plotter
    try {
      // eslint-disable-next-line no-new-func
      plotter = new Function('x', 'return ' + fun)
    } catch (e) {
      console.error(e)
      onError(e)
      return
    }

    for (let i = 0; i < canvas.width; i += step) {
      const x = i2x(i)
      let y
      try {
        y = plotter(x)
      } catch (e) {
        console.error(e)
        onError(e)
        return
      }
      const j = y2j(y)

      if (i === 0) ctx.moveTo(i, j)
      else ctx.lineTo(i, j)
    }

    ctx.stroke()
    onError()
    return true
  }, [region, bgColor, color, onError, fun, step, i2x, y2j])

  const size = useCallback(() => {
    const canvas = canvasRef.current
    canvas.height = window.innerHeight - 25
    canvas.width = window.innerWidth

    const yx = canvas.height / canvas.width
    let newRegion = region || [[-2, 2], []]
    setRegion([newRegion[0], newRegion[0].map(x => x * yx)])
  }, [region])

  useEffect(() => {
    window.addEventListener('resize', size)
    return () => window.removeEventListener('resize', size)
  }, [size])

  useLayoutEffect(() => {
    size()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    plot()
  }, [plot])

  useGesture(
    {
      onDrag: ({ movement: [i, j], first, memo, pinching, cancel }) => {
        if (pinching) {
          cancel()
        }
        const [[xmin, xmax], [ymin, ymax]] = first ? region : memo

        const dx = di2dx(i)
        const dy = dj2dy(-j)

        setRegion([
          [xmin - dx, xmax - dx],
          [ymin - dy, ymax - dy],
        ])
        return first
          ? [
              [xmin, xmax],
              [ymin, ymax],
            ]
          : memo
      },
      onPinch: ({ origin, da: [d, a], first, memo, movement }) => {
        const [[xmin, xmax], [ymin, ymax], od, [i, j]] = first
          ? [...region, d, origin]
          : memo
        a = (-a + 90 + 360) % 180
        a = (a * Math.PI) / 180
        const dd = d - od

        const canvas = canvasRef.current
        const dy = dj2dy(dd * Math.abs(Math.sin(a)))
        const dx = di2dx(dd * Math.abs(Math.cos(a)))
        const dxmin = lerp(0, dx, i / canvas.width)
        const dymin = lerp(0, dy, j / canvas.height)
        setRegion([
          [xmin + dxmin, xmax - (dx - dxmin)],
          [ymin + (dy - dymin), ymax - dymin],
        ])

        return first ? [[xmin, xmax], [ymin, ymax], od, [i, j]] : memo
      },
      onWheel: ({ movement: [, dj], first, memo, event, altKey, shiftKey }) => {
        const [[xmin, xmax], [ymin, ymax]] = first ? region : memo
        const { clientX: i, clientY: j } = event
        const canvas = canvasRef.current
        const dy = altKey ? 0 : dj2dy(-dj)
        const dx = shiftKey ? 0 : di2dx(-dj * (canvas.width / canvas.height))
        const dxmin = lerp(0, dx, i / canvas.width)
        const dymin = lerp(0, dy, j / canvas.height)
        setRegion([
          [xmin + dxmin, xmax - (dx - dxmin)],
          [ymin + (dy - dymin), ymax - dymin],
        ])

        return first
          ? [
              [xmin, xmax],
              [ymin, ymax],
            ]
          : memo
      },
    },
    {
      target: canvasRef,
    }
  )

  return <canvas ref={canvasRef} className="canvas" />
}
