import { useGesture } from '@use-gesture/react'
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import './Graphit.css'
import { plotFunctions } from './plotter'
import { clamp, getValuesForType, lerp, orderRange } from './utils'

const typeOptions = {
  precision: 1,
  polarMax: 2 * Math.PI,
  polarPrecision: (2 * Math.PI) / 1028,
  parametricMax: 10,
  parametricPrecision: 10 / 512,
}

const TICK_SIZE = 10
const MIN_TICK = 200

export const Graphit = memo(
  function ({ functions, theme, region, hide, recordings, onRegion }) {
    const canvasRef = useRef(null)

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

    const plot = useCallback(async () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const [[xmin, xmax], [ymin, ymax]] = region
      const redraw = () => {
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
        type =>
          getValuesForType(
            type,
            canvas.width,
            canvas.height,
            i2x,
            j2y,
            typeOptions
          ),
        recordings
      )
      const errors = []

      redraw()

      for (let i = 0; i < data.length; i++) {
        if (!data[i]) continue
        const { index, values, skips, err } = data[i]

        if (err) {
          errors.push(err)
          continue
        }

        ctx.strokeStyle = theme.colors[index]
        ctx.beginPath()
        for (let n = 0; n < values.length; n += 2) {
          const i = x2i(values[n])
          const j = y2j(values[n + 1])
          if (skips.includes(~~(n / 2))) {
            ctx.moveTo(i, j)
          } else {
            ctx.lineTo(i, j)
          }
        }
        ctx.stroke()
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
      x2i,
      y2j,
      dx2di,
      dy2dj,
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
    // console.log(
    //   prev.fun === next.fun,
    //   prev.theme === next.theme,
    //   prev.onRegion === next.onRegion,
    //   prev.onError === next.onError,
    //   prev.region[0][0] === next.region[0][0],
    //   prev.region[0][1] === next.region[0][1],
    //   prev.region[1][0] === next.region[1][0],
    //   prev.region[1][1] === next.region[1][1]
    // )
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
