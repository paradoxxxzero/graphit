import { useGesture } from '@use-gesture/react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import './Graphit.css'
import { lerp, clamp, orderRange } from './utils'

const PRECISION = 1
const POLAR_MAX = 2 * Math.PI
const POLAR_PRECISION = POLAR_MAX / 1028
const PARAMETRIC_MAX = 10
const PARAMETRIC_PRECISION = PARAMETRIC_MAX / 512
const TICK_SIZE = 10
const MIN_TICK = 200

export function Graphit({ fun, theme, onError }) {
  const canvasRef = useRef(null)
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
      return (x - xmin) * (width / (xmax - xmin))
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
      return height - (y - ymin) * (height / (ymax - ymin))
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

  const dx2di = useCallback(
    dx => {
      const { width } = canvasRef.current
      const [[xmin, xmax]] = region
      return (dx * width) / (xmax - xmin)
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

  const dy2dj = useCallback(
    dy => {
      const { height } = canvasRef.current
      const [, [ymin, ymax]] = region
      return (dy * height) / (ymax - ymin)
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
    const [[xmin, xmax], [ymin, ymax]] = region

    // Clear background
    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw axes
    ctx.strokeStyle = theme.axis
    ctx.beginPath()
    ctx.moveTo(clamp(x2i(0), 0, canvas.width), 0)
    ctx.lineTo(clamp(x2i(0), 0, canvas.width), canvas.height)
    ctx.moveTo(0, clamp(y2j(0), 0, canvas.height))
    ctx.lineTo(canvas.width, clamp(y2j(0), 0, canvas.height))
    ctx.stroke()

    // Draw ticks
    ctx.strokeStyle = theme.tick
    ctx.fillStyle = theme.foreground
    ctx.beginPath()

    const xTick = orderRange(xmin, xmax, dx2di, MIN_TICK)

    for (let x = xTick.min; x < xTick.max; x += xTick.step) {
      const i = x2i(x)
      const j = y2j(0)

      ctx.moveTo(i, j)
      ctx.lineTo(i, j + TICK_SIZE)
      ctx.fillText(
        xTick.precision ? x.toFixed(xTick.precision) : x,
        i,
        j + TICK_SIZE * 2
      )
    }
    const yTick = orderRange(ymin, ymax, dy2dj, MIN_TICK)

    for (let y = yTick.min; y < yTick.max; y += yTick.step) {
      const i = x2i(0)
      const j = y2j(y)

      ctx.moveTo(i + TICK_SIZE, j)
      ctx.lineTo(i, j)
      ctx.fillText(
        yTick.precision ? y.toFixed(yTick.precision) : y,
        i + TICK_SIZE * 2,
        j
      )
    }
    ctx.stroke()

    let error = ''

    fun.split(';').forEach((fun, i) => {
      ctx.strokeStyle = theme.colors[i]
      ctx.beginPath()
      let plotter, type, match, skipNext
      try {
        if ((match = fun.match(/^\s*y\s*=\s*(.+)/))) {
          type = 'linear'
          // eslint-disable-next-line no-new-func
          plotter = new Function('x', 'return ' + match[1])
        } else if ((match = fun.match(/^\s*x\s*=\s*(.+)/))) {
          type = 'linear-horizontal'
          // eslint-disable-next-line no-new-func
          plotter = new Function('y', 'return ' + match[1])
        } else if ((match = fun.match(/^\s*r\s*=\s*(.+)/))) {
          type = 'polar'
          // eslint-disable-next-line no-new-func
          plotter = new Function('o', 'return ' + match[1])
        } else if (
          (match = fun.match(/^\s*{\s*x\s*=\s*(.+)\s*,\s*y\s*=\s*(.+)}/))
        ) {
          type = 'parametric'
          plotter = [
            // eslint-disable-next-line no-new-func
            new Function('t', 'return ' + match[1]),
            // eslint-disable-next-line no-new-func
            new Function('t', 'return ' + match[2]),
          ]
        } else {
          throw new Error('Invalid function')
        }
      } catch (e) {
        console.warn(e)
        error = e.message
        return
      }
      if (type === 'linear') {
        for (let i = 0; i < canvas.width; i += PRECISION) {
          const x = i2x(i)
          let y
          try {
            y = plotter(x)
          } catch (e) {
            console.warn(e)
            error = e.message
            return
          }
          const j = y2j(y)
          if (!isFinite(y)) {
            skipNext = true
            continue
          }
          if (i === 0 || (skipNext && (j < 0 || j > canvas.height)))
            ctx.moveTo(i, j)
          else ctx.lineTo(i, j)
          skipNext = j < 0 || j > canvas.height
        }
      } else if (type === 'linear-horizontal') {
        for (let j = 0; j < canvas.height; j += PRECISION) {
          const y = j2y(j)
          let x
          try {
            x = plotter(y)
          } catch (e) {
            console.warn(e)
            error = e.message
            return
          }
          const i = x2i(x)

          if (j === 0 || (skipNext && (i < 0 || i > canvas.width)))
            ctx.moveTo(i, j)
          else ctx.lineTo(i, j)
          skipNext = i < 0 || i > canvas.width
        }
      } else if (type === 'polar') {
        for (let o = 0; o < POLAR_MAX; o += POLAR_PRECISION) {
          let r
          try {
            r = plotter(o)
          } catch (e) {
            console.warn(e)
            error = e.message
            return
          }
          const x = r * Math.cos(o)
          const y = r * Math.sin(o)
          const i = x2i(x)
          const j = y2j(y)

          if (o === 0) ctx.moveTo(i, j)
          else ctx.lineTo(i, j)
        }
      } else if (type === 'parametric') {
        for (let t = 0; t < PARAMETRIC_MAX; t += PARAMETRIC_PRECISION) {
          let x, y
          try {
            x = plotter[0](t)
            y = plotter[1](t)
          } catch (e) {
            console.warn(e)
            error = e.message
            return
          }
          const i = x2i(x)
          const j = y2j(y)

          if (t === 0) ctx.moveTo(i, j)
          else ctx.lineTo(i, j)
        }
      }

      ctx.stroke()
    })
    onError(error)
    return true
  }, [
    region,
    theme.background,
    theme.axis,
    theme.tick,
    theme.foreground,
    theme.colors,
    x2i,
    y2j,
    dx2di,
    dy2dj,
    fun,
    onError,
    i2x,
    j2y,
  ])

  const size = useCallback(() => {
    const canvas = canvasRef.current
    const { width, height } = canvas.parentNode.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 1.5 * dpr

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
      onPinch: ({ origin: [i, j], da: [d, a], touches, first, memo }) => {
        if (!first && touches > 2) {
          memo[3] = false
        }
        const [[xmin, xmax], [ymin, ymax], od, constraint] = first
          ? [...region, d, true]
          : memo
        const dd = d - od
        if (constraint) {
          a = Math.PI / 4
        } else {
          a = (-a + 90 + 360) % 180
          a = (a * Math.PI) / 180
        }
        const ddx = dd * Math.abs(Math.cos(a))
        const ddy = dd * Math.abs(Math.sin(a))

        const canvas = canvasRef.current
        const dx = di2dx(ddx)
        const dy = dj2dy(ddy)
        const dxmin = lerp(0, dx, i / canvas.width)
        const dymin = lerp(0, dy, j / canvas.height)
        setRegion([
          [xmin + dxmin, xmax - (dx - dxmin)],
          [ymin + (dy - dymin), ymax - dymin],
        ])

        return first ? [[xmin, xmax], [ymin, ymax], od, constraint] : memo
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
