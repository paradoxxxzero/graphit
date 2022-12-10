import { useGesture } from '@use-gesture/react'
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import './Graphit.css'
import { plotFunctions } from './plotter'
import { clamp, lerp, orderRange, regionEquals } from './utils'

const TICK_SIZE = 10
const MIN_TICK = 200
const TAU = 2 * Math.PI

export const Graphit = memo(
  function ({
    functions,
    theme,
    region,
    lineWidth,
    hide,
    recordings,
    onRegion,
    codeRef,
  }) {
    const canvasRef = useRef(null)
    const [title, setTitle] = useState('')

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
        let { height } = canvasRef.current
        height -=
          codeRef.current.getBoundingClientRect().height *
          window.devicePixelRatio
        const [, [ymin, ymax]] = region
        return ymin + (ymax - ymin) * ((height - j) / height)
      },
      [region, codeRef]
    )

    const y2j = useCallback(
      y => {
        let { height } = canvasRef.current
        height -=
          codeRef.current.getBoundingClientRect().height *
          window.devicePixelRatio
        const [, [ymin, ymax]] = region
        return height - (y - ymin) * (height / (ymax - ymin))
      },
      [region, codeRef]
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

    const plot = useCallback(async () => {
      if (!region) {
        return
      }
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1

      const [[xmin, xmax], [ymin, ymax]] = region
      const redraw = () => {
        // Clear background
        ctx.lineJoin = 'round'
        ctx.fillStyle = theme.background
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.lineWidth = lineWidth * dpr
        // Draw axes
        ctx.strokeStyle = theme.axis
        const i0 = clamp(x2i(0), 0, canvas.width)
        const j0 = clamp(
          y2j(0),
          0,
          canvas.height -
            codeRef.current.getBoundingClientRect().height *
              window.devicePixelRatio
        )
        const sx = i0 > canvas.width / 2 ? -1 : 1
        const sy = j0 > canvas.height / 2 ? -1 : 1

        ctx.beginPath()
        ctx.moveTo(i0, 0)
        ctx.lineTo(i0, canvas.height)
        ctx.moveTo(0, j0)
        ctx.lineTo(canvas.width, j0)
        ctx.stroke()

        // Draw ticks
        ctx.strokeStyle = theme.tick
        ctx.fillStyle = theme.foreground
        ctx.textAlign = 'center'
        ctx.textBaseline = sy === 1 ? 'top' : 'bottom'

        ctx.beginPath()
        const xTick = orderRange(xmin, xmax, dx2di, MIN_TICK)

        for (let x = xTick.min; x < xTick.max; x += xTick.step) {
          const i = x2i(x)

          ctx.moveTo(i, j0)
          ctx.lineTo(i, j0 + sy * TICK_SIZE)
          x &&
            ctx.fillText(
              xTick.precision ? x.toFixed(xTick.precision) : x,
              i,
              j0 + sy * TICK_SIZE * 2
            )
        }
        ctx.textAlign = sx === 1 ? 'left' : 'right'
        ctx.textBaseline = 'middle'
        const yTick = orderRange(ymin, ymax, dy2dj, MIN_TICK)

        for (let y = yTick.min; y < yTick.max; y += yTick.step) {
          const j = y2j(y)

          ctx.moveTo(i0 + sx * TICK_SIZE, j)
          ctx.lineTo(i0, j)
          y &&
            ctx.fillText(
              yTick.precision ? y.toFixed(yTick.precision) : y,
              i0 + sx * TICK_SIZE * 2,
              j
            )
        }
        ctx.stroke()
      }
      const data = await plotFunctions(functions, region, recordings, 'plot')
      const errors = []

      redraw()

      for (let i = 0; i < data.length; i++) {
        const { index, values, mode, type, err } = data[i]
        if (err) {
          errors.push(err)
          continue
        }
        ctx.fillStyle = ctx.strokeStyle = theme.colors[index] + 'bb'
        // ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
        ctx.beginPath()
        let line = false,
          block = false
        for (let n = 0; n < values.length; n += 2) {
          if (isNaN(values[n]) || isNaN(values[n + 1])) {
            if (
              ['linear', 'linear-horizontal'].includes(type) &&
              isNaN(values[n]) &&
              isNaN(values[n + 1])
            ) {
              if (block) {
                ctx.closePath()
                ctx.fill()
                ctx.beginPath()
                block = false
              } else {
                ctx.stroke()
                ctx.beginPath()
                block = true
              }
            }
            line = false
            continue
          }
          const i = clamp(x2i(values[n]), -(2 ** 31), 2 ** 31)
          const j = clamp(y2j(values[n + 1]), -(2 ** 31), 2 ** 31)

          if (mode === 'line') {
            if (line) {
              ctx.lineTo(i, j)
            } else {
              ctx.moveTo(i, j)
            }
          }
          if (mode === 'dot') {
            ctx.fillRect(
              i - lineWidth / 2,
              j - lineWidth / 2,
              lineWidth,
              lineWidth
            )
          }
          if (mode === 'point') {
            ctx.moveTo(i, j)
            ctx.arc(i, j, lineWidth, 0, TAU)
          }
          line = true
        }
        if (mode === 'line') {
          ctx.stroke()
        }
        if (['dot', 'point'].includes(mode)) {
          ctx.fill()
        }
      }
      console.warn(...errors)
      return true
    }, [
      region,
      functions,
      recordings,
      theme.background,
      theme.axis,
      theme.tick,
      theme.foreground,
      theme.colors,
      lineWidth,
      x2i,
      y2j,
      codeRef,
      dx2di,
      dy2dj,
    ])

    const size = useCallback(() => {
      const canvas = canvasRef.current
      const dpr = window.devicePixelRatio || 1

      let oldWidth = canvas.width
      let oldHeight = canvas.height

      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr

      // Don't resize region if it was the initial one
      if (oldWidth === 300 && oldHeight === 150) {
        if (region) {
          return
        } else {
          oldWidth = canvas.width
          oldHeight = canvas.height
        }
      }

      const [[xmin, xmax], [ymin, ymax]] = region
        ? region
        : [
            [-2, 2],
            [
              (-2 * canvas.height) / canvas.width,
              (2 * canvas.height) / canvas.width,
            ],
          ]
      const dx = (xmax - xmin) * (canvas.width / oldWidth - 1)
      const dy = (ymax - ymin) * (canvas.height / oldHeight - 1)

      onRegion([
        [xmin - dx / 2, xmax + dx / 2, canvas.width],
        [ymin - dy / 2, ymax + dy / 2, canvas.height],
      ])
    }, [onRegion, region])

    useEffect(() => {
      window.addEventListener('resize', size, { passive: true })
      return () => window.removeEventListener('resize', size, { passive: true })
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
          const [[xmin, xmax, xsamples], [ymin, ymax, ysamples]] = first
            ? region
            : memo

          const dx = di2dx(i * window.devicePixelRatio)
          const dy = dj2dy(-j * window.devicePixelRatio)

          onRegion([
            [xmin - dx, xmax - dx, xsamples],
            [ymin - dy, ymax - dy, ysamples],
          ])
          return first
            ? [
                [xmin, xmax, xsamples],
                [ymin, ymax, ysamples],
              ]
            : memo
        },
        onPinch: ({ origin, da, movement: [scale], touches, first, memo }) => {
          if (!first && touches > 2 && !memo[4]) {
            const a = (-da[1] + 90 + 360) % 180
            memo[4] = a > 45 && a < 135 ? 'v' : 'h'
            memo[5] = scale
          }
          const dpr = window.devicePixelRatio || 1
          const canvas = canvasRef.current
          const [
            [xmin, xmax, xsamples],
            [ymin, ymax, ysamples],
            [i, j],
            a,
            orientation,
            oscale,
          ] = first ? [...region, origin, da[1], null, null] : memo
          let xscale, yscale
          if (!orientation) {
            xscale = yscale = scale
          } else {
            xscale = orientation === 'h' ? scale : oscale
            yscale = orientation === 'v' ? scale : oscale
          }
          const xShift = (xmax - xmin) * (1 / xscale - 1)
          const yShift = (ymax - ymin) * (1 / yscale - 1)
          const xShiftMin = lerp(0, xShift, (dpr * i) / canvas.width)
          const yShiftMin = lerp(0, yShift, 1 - (dpr * j) / canvas.height)

          onRegion([
            [xmin - xShiftMin, xmax + (xShift - xShiftMin), xsamples],
            [ymin - yShiftMin, ymax + (yShift - yShiftMin), ysamples],
          ])

          return first
            ? [
                [xmin, xmax, xsamples],
                [ymin, ymax, ysamples],
                origin,
                a,
                orientation,
                oscale,
              ]
            : memo
        },
        onWheel: ({ delta: [, dj], event, altKey, shiftKey }) => {
          const [[xmin, xmax, xsamples], [ymin, ymax, ysamples]] = region
          const { clientX: i, clientY: j } = event
          const canvas = canvasRef.current
          const dy = altKey ? 0 : dj2dy(-dj)
          const dx = shiftKey ? 0 : di2dx(-dj * (canvas.width / canvas.height))
          const dxmin = lerp(0, dx, i / canvas.width)
          const dymin = lerp(0, dy, j / canvas.height)
          onRegion([
            [xmin + dxmin, xmax - (dx - dxmin), xsamples],
            [ymin + (dy - dymin), ymax - dymin, ysamples],
          ])
        },
        onMove: ({ xy: [i, j], dragging }) => {
          if (!dragging) {
            setTitle(`x = ${i2x(i)}\n y = ${j2y(j)}`)
          }
        },
      },
      {
        target: canvasRef,
        enabled: region,
      }
    )
    return (
      <canvas
        ref={canvasRef}
        title={title}
        className="canvas"
        style={hide ? { display: 'none' } : {}}
      />
    )
  },
  (prev, next) => {
    for (let key in next) {
      if (key !== 'region' && prev[key] !== next[key]) {
        return false
      }
    }
    return regionEquals(prev.region, next.region)
  }
)
