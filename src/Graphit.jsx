import { useGesture } from '@use-gesture/react'
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import './Graphit.css'
import { plotFunctions } from './plotter'
import { clamp, lerp, orderRange } from './utils'

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
  }) {
    const canvasRef = useRef(null)

    // TODO: Get rid of these
    const x2i = useCallback(
      x => {
        const { width } = canvasRef.current
        const [[xmin, xmax]] = region
        return (x - xmin) * (width / (xmax - xmin))
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

    const plot = useCallback(async () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1

      const [[xmin, xmax], [ymin, ymax]] = region
      const redraw = () => {
        // Clear background
        ctx.fillStyle = theme.background
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.lineWidth = lineWidth * dpr
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
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'

        ctx.beginPath()
        const xTick = orderRange(xmin, xmax, dx2di, MIN_TICK)

        for (let x = xTick.min; x < xTick.max; x += xTick.step) {
          const i = x2i(x)
          const j = y2j(0)

          ctx.moveTo(i, j)
          ctx.lineTo(i, j + TICK_SIZE)
          x &&
            ctx.fillText(
              xTick.precision ? x.toFixed(xTick.precision) : x,
              i,
              j + TICK_SIZE * 2
            )
        }
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        const yTick = orderRange(ymin, ymax, dy2dj, MIN_TICK)

        for (let y = yTick.min; y < yTick.max; y += yTick.step) {
          const i = x2i(0)
          const j = y2j(y)

          ctx.moveTo(i + TICK_SIZE, j)
          ctx.lineTo(i, j)
          y &&
            ctx.fillText(
              yTick.precision ? y.toFixed(yTick.precision) : y,
              i + TICK_SIZE * 2,
              j
            )
        }
        ctx.stroke()
      }
      const data = await plotFunctions(
        functions,
        region,
        [1 / canvas.width, 1 / canvas.height],
        recordings
      )
      const errors = []

      redraw()

      for (let i = 0; i < data.length; i++) {
        if (!data[i]) continue
        const { index, values, err } = data[i]
        if (err) {
          errors.push(err)
          continue
        }
        ctx.fillStyle = ctx.strokeStyle = theme.colors[index]

        for (let d = 0; d < values.length; d++) {
          ctx.beginPath()
          const domain = values[d]
          for (let n = 0; n < domain.length; n += 2) {
            const i = x2i(domain[n])
            const j = y2j(domain[n + 1])
            if (lineWidth) {
              if (n === 0) {
                ctx.moveTo(i, j)
              } else {
                ctx.lineTo(i, j)
              }
            } else {
              ctx.moveTo(i, j)
              ctx.arc(i, j, 1, 0, TAU)
            }
          }
          if (lineWidth) {
            ctx.stroke()
          }
        }
      }
      if (!lineWidth) {
        ctx.fill()
      }
      console.error(...errors)
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
      dx2di,
      dy2dj,
    ])

    const size = useCallback(() => {
      const canvas = canvasRef.current
      const dpr = window.devicePixelRatio || 1
      const { width, height } = canvas.parentNode.getBoundingClientRect()

      const oldWidth = canvas.width
      const oldHeight = canvas.height

      canvas.width = width * dpr
      canvas.height = height * dpr

      // Don't resize region if it was the initial one
      if (oldWidth === 300 && oldHeight === 150) {
        return
      }

      const [[xmin, xmax], [ymin, ymax]] = region
      const dx = (xmax - xmin) * (canvas.width / oldWidth - 1)
      const dy = (ymax - ymin) * (canvas.height / oldHeight - 1)

      onRegion([
        [xmin - dx / 2, xmax + dx / 2],
        [ymin - dy / 2, ymax + dy / 2],
      ])
    }, [onRegion, region])

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

          const dx = di2dx(i * window.devicePixelRatio)
          const dy = dj2dy(-j * window.devicePixelRatio)

          onRegion([
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
        onPinch: ({ origin, da, movement: [scale], touches, first, memo }) => {
          if (!first && touches > 2 && !memo[4]) {
            const a = (-da[1] + 90 + 360) % 180
            memo[4] = a > 45 && a < 135 ? 'v' : 'h'
            memo[5] = scale
          }
          const dpr = window.devicePixelRatio || 1
          const canvas = canvasRef.current
          const [[xmin, xmax], [ymin, ymax], [i, j], a, orientation, oscale] =
            first ? [...region, origin, da[1], null, null] : memo
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
            [xmin - xShiftMin, xmax + (xShift - xShiftMin)],
            [ymin - yShiftMin, ymax + (yShift - yShiftMin)],
          ])

          return first
            ? [[xmin, xmax], [ymin, ymax], origin, a, orientation, oscale]
            : memo
        },
        onWheel: ({ delta: [, dj], event, altKey, shiftKey }) => {
          const [[xmin, xmax], [ymin, ymax]] = region
          const { clientX: i, clientY: j } = event
          const canvas = canvasRef.current
          const dy = altKey ? 0 : dj2dy(-dj)
          const dx = shiftKey ? 0 : di2dx(-dj * (canvas.width / canvas.height))
          const dxmin = lerp(0, dx, i / canvas.width)
          const dymin = lerp(0, dy, j / canvas.height)
          onRegion([
            [xmin + dxmin, xmax - (dx - dxmin)],
            [ymin + (dy - dymin), ymax - dymin],
          ])
        },
      },
      {
        target: canvasRef,
      }
    )

    return (
      <canvas
        ref={canvasRef}
        className="canvas"
        style={hide ? { display: 'none' } : {}}
      />
    )
  },
  (prev, next) => {
    return (
      prev.fun === next.fun &&
      prev.theme === next.theme &&
      prev.onRegion === next.onRegion &&
      prev.onError === next.onError &&
      prev.region[0][0] === next.region[0][0] &&
      prev.region[0][1] === next.region[0][1] &&
      prev.region[1][0] === next.region[1][0] &&
      prev.region[1][1] === next.region[1][1]
    )
  }
)
