import { useGesture } from '@use-gesture/react'
import { useCallback, useEffect, useLayoutEffect, useRef, memo } from 'react'
import './Graphit.css'
import {
  lerp,
  clamp,
  orderRange,
  getFunctionType,
  getValuesForType,
} from './utils'
import Plotter from './plotter.worker.js?worker'

const typeOptions = {
  precision: 1,
  polarMax: 2 * Math.PI,
  polarPrecision: (2 * Math.PI) / 1028,
  parametricMax: 10,
  parametricPrecision: 10 / 512,
}

const TICK_SIZE = 10
const MIN_TICK = 200
const workers = []

export const Graphit = memo(
  function ({ fun, theme, region, onRegion, onError }) {
    const canvasRef = useRef(null)
    // console.log(...region, fun, theme)

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
      if (region[0][0] === region[0][1] || region[1][0] === region[1][1]) {
        return
      }
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
      }

      const errors = []
      const data = await Promise.all(
        fun.split(';').map(
          (fun, i) =>
            new Promise(resolve => {
              let type, values, functions
              try {
                ;({ type, functions } = getFunctionType(fun))
                values = getValuesForType(
                  type,
                  canvas.width,
                  canvas.height,
                  i2x,
                  j2y,
                  typeOptions
                )
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
                functions,
                values,
              })
              plotter.onmessage = ({ data }) => resolve(data)
            })
        )
      )

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
      console.warn(...errors)
      onError(errors.map(e => e.message).join('\n'))
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
      let newRegion = region.reduce((a, b) => a + b, 0) ? [[-2, 2], []] : region
      onRegion([newRegion[0], newRegion[0].map(x => x * yx)])
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
        onPinch: ({ origin, da: [d, a], touches, first, memo }) => {
          const canvas = canvasRef.current
          if (!first && touches > 2) {
            memo[4] = false
          }
          const [[xmin, xmax], [ymin, ymax], od, [i, j], constraint] = first
            ? [...region, d, origin, true]
            : memo
          const dd = (d - od) * window.devicePixelRatio * 2

          let ddx, ddy
          if (constraint) {
            ddy = dd
            ddx = (ddy * canvas.width) / canvas.height
          } else {
            a = (-a + 90 + 360) % 180
            a = (a * Math.PI) / 180
            ddx = dd * Math.abs(Math.cos(a))
            ddy = dd * Math.abs(Math.sin(a))
          }

          // FIXME
          const dx = di2dx(Math.min(ddx, canvas.width - 1))
          const dy = dj2dy(Math.min(ddy, canvas.height - 1))
          const dxmin = lerp(
            0,
            dx,
            clamp((i * window.devicePixelRatio) / canvas.width, 0, 1)
          )
          const dymin = lerp(
            0,
            dy,
            clamp((j * window.devicePixelRatio) / canvas.height, 0, 1)
          )
          onRegion([
            [xmin + dxmin, xmax - (dx - dxmin)],
            [ymin + (dy - dymin), ymax - dymin],
          ])

          return first
            ? [[xmin, xmax], [ymin, ymax], od, origin, constraint]
            : memo
        },
        onWheel: ({
          movement: [, dj],
          first,
          memo,
          event,
          altKey,
          shiftKey,
        }) => {
          const [[xmin, xmax], [ymin, ymax]] = first ? region : memo
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
