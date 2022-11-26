/* eslint-disable no-new-func */

import doc from './doc'

/* eslint-disable no-restricted-globals */
const TYPE_VARIABLES = {
  linear: 'x',
  'linear-horizontal': 'y',
  polar: 'o',
  parametric: 't',
}
self.lerp = (a, b, x) => a + (b - a) * x
self.clamp = (x, a, b) => Math.min(Math.max(x, a), b)

// Globalize Math functions and constants
for (let key of Array.from(Object.getOwnPropertyNames(Math))) {
  self[key.toLowerCase()] = self[key] = Math[key]
}

// Custom globlals:
const PI = self.PI
const TAU = (self.tau = self.TAU = PI * 2)
self.eta = self.ETA = PI / 2

self.ln = self.log

self.osc = (freq, type = 'sine', smooth = 0.5) => {
  const k = ++self._state.call
  if (!self._state[k]) {
    self._state[k] = {
      f: 0,
    }
  }
  const state = self._state[k]
  const dt = 1 / self._state.sampleRate
  const f = (state.f += self.clamp(freq, 0, 22050) * dt)

  switch (type) {
    case 'sine':
      return Math.sin(f * TAU)
    case 'square':
      return Math.sign(Math.sin(f * TAU))
    case 'smoothsquare':
      return Math.tanh(Math.sin(f * TAU) / smooth)
    case 'sawtooth':
      return (f % 1) * 2 - 1
    case 'triangle':
      return Math.abs((f % 1) * 4 - 2) - 1
    case 'noise':
      return Math.random() * 2 - 1
    default:
      throw new Error(`Unknown oscillator type: ${type}`)
  }
}

self.sine = freq => self.osc(freq, 'sine')
self.square = freq => self.osc(freq, 'square')
self.smoothsquare = (freq, smooth = 0.5) =>
  self.osc(freq, 'smoothsquare', smooth)
self.sawtooth = freq => self.osc(freq, 'sawtooth')
self.triangle = freq => self.osc(freq, 'triangle')
self.noise = () => self.osc(0, 'noise')

self.oscs = (freqs, type, smooth = 0.5) => {
  let sum = 0
  freqs = Array.isArray(freqs) ? freqs : [freqs]
  for (let i = 0; i < freqs.length; i++) {
    sum += self.osc(freqs[i], type, smooth)
  }
  return sum / freqs.length
}

self.adsr = (
  x,
  attack = 0.2,
  decay = 0.1,
  sustain = 0.4,
  release = 0.3,
  sustainLevel = 0.5,
  duration = null
) => {
  duration = duration || self._state.duration
  x = x / duration

  return x < 0
    ? 0
    : x <= attack
    ? x / attack // attack - linear increase to 1
    : x <= attack + decay
    ? 1 - ((1 - sustainLevel) * (x - attack)) / decay // decay - linear decrease from 1 to sustainLevel
    : x <= attack + decay + sustain
    ? sustainLevel // sustain - constant value of s
    : x <= attack + decay + sustain + release
    ? sustainLevel -
      ((sustainLevel - 0) * (x - attack - decay - sustain)) / release // release - linear decrease from s to 0
    : 0 // end - constant value of 0
}

// IIR filters:

self.lowpass = (x, cutoff) => {
  const k = ++self._state.call
  if (!self._state[k]) {
    const rc = 1 / (2 * Math.PI * cutoff)
    const dt = 1 / self._state.sampleRate
    self._state[k] = { alpha: dt / (rc + dt), last_y: 0 }
  }
  return (self._state[k].last_y =
    self._state[k].last_y + self._state[k].alpha * (x - self._state[k].last_y))
}

self.highpass = (x, cutoff) => {
  const k = ++self._state.call
  if (!self._state[k]) {
    const rc = 1 / (2 * Math.PI * cutoff)
    const dt = 1 / self._state.sampleRate
    self._state[k] = { alpha: rc / (rc + dt), last_x: 0, last_y: 0 }
  }

  self._state[k].last_y =
    self._state[k].alpha * (self._state[k].last_y + x - self._state[k].last_x)
  self._state[k].last_x = x
  return self._state[k].last_y
}

// Utils
self.segment = (x, ...pairs) => {
  for (let i = 0; i < pairs.length; i += 2) {
    if (x < pairs[i]) return pairs[i + 1]
  }
}

self.at = (d, f, x) => f(x + d)
self.__doc__ = Object.fromEntries(
  Object.entries(doc)
    .map(([type, docs]) =>
      Object.entries(docs).map(([name, ndoc]) => [
        self[name],
        `${type}: ${ndoc}`,
      ])
    )
    .flat()
)

const auto = {
  epsilon: 1e-9,
  sampling: 1500,
  subsampling: 32,
  minBlockSize: 10,
  precisionPass: 8,
  precision: PI / 1024,
  extremumPass: 32,
  straightness: 1e-5,
  maxPoints: 10000,
  overflow: 0.1,
}

const pushBounded = (points, x, y, region, type) => {
  if (
    isNaN(x) ||
    isNaN(y) ||
    x < region[0][0] ||
    x > region[0][1] ||
    y < region[1][0] ||
    y > region[1][1]
  ) {
    // Out of range
    if (!points.out?.length) {
      // Adding first points.out of range point
      if (points.length > 0) {
        points.push(x, y)
      }
    }
    points.out = [x, y]
    return
  }
  if (points.out?.length) {
    // In range but was points.out, adding last points.out of range point
    if (type === 'linear-horizontal') {
      points.push(
        NaN,
        ((points[points.length - 1] || region[1][0]) + points.out[1]) / 2
      )
    } else if (type === 'linear') {
      points.push(
        ((points[points.length - 2] || region[0][0]) + points.out[0]) / 2,
        NaN
      )
    } else {
      points.push(NaN, NaN)
    }
    points.push(...points.out)
    points.out.splice(0)
  }
  points.push(x, y)
}

const dividePoints = (push, plotters, type, x1, y1, x2, y2, k) => {
  if (type === 'linear') {
    const x = k * x1 + (1 - k) * x2
    const y = plotters[0](x)
    push(x, y)
  } else if (type === 'linear-horizontal') {
    const y = k * y1 + (1 - k) * y2
    const x = plotters[0](y)
    push(x, y)
  }
}
const increasePrecision = (points, plotters, type, region, onlyStraight) => {
  const [[xmin, xmax], [ymin, ymax]] = region
  const newPoints = []
  const push = (x, y) => pushBounded(newPoints, x, y, region, type)
  const divide = (x1, y1, x2, y2, k) =>
    dividePoints(push, plotters, type, x1, y1, x2, y2, k)

  const k = (ymax - ymin) / (xmax - xmin)
  let shift = 0
  for (let i = 0; i + shift < points.length; i += 4) {
    // Reverse points in horizontal?
    const x1 = points[i]
    const y1 = points[i + 1]
    const x2 = points[i + 2 + shift]
    const y2 = points[i + 3 + shift]
    const x3 = points[i + 4 + shift]
    const y3 = points[i + 5 + shift]

    if (
      (type === 'linear' && (isNaN(y1) || isNaN(y2) || isNaN(y3))) ||
      (type === 'linear-horizontal' && (isNaN(x1) || isNaN(x2) || isNaN(x3)))
    ) {
      i += shift
      shift = 0
      push(x1, y1)
      push(x2, y2)
      continue
    }

    const angle12 = Math.atan2(y2 - y1, k * (x2 - x1))
    const angle23 = Math.atan2(y3 - y2, k * (x3 - x2))
    const angle = angle23 - angle12
    const absAngle = Math.abs(angle)

    const distance =
      ((x3 - x1) / (xmax - xmin)) ** 2 + ((y3 - y1) / (ymax - ymin)) ** 2

    if (absAngle * distance < auto.straightness) {
      i -= 4
      shift += 2
      continue
    }
    if (shift) {
      i += shift
      shift = 0
    }
    if (onlyStraight) {
      push(x1, y1)
      push(x2, y2)
      continue
    }
    const subdivide = absAngle > auto.precision
    // This only works on linear (vertical)
    push(x1, y1)

    if (subdivide) {
      divide(x1, y1, x2, y2, 1 / 2)
    }

    push(x2, y2)

    if (subdivide) {
      divide(x2, y2, x3, y3, 1 / 2)
    }
  }
  return newPoints
}

const affineExtremums = (points, plotters, type, region) => {
  for (let i = 2; i < points.length - 2; i += 2) {
    let x0 = points[i - 2]
    let y0 = points[i - 1]
    let x1 = points[i]
    let y1 = points[i + 1]
    let x2 = points[i + 2]
    let y2 = points[i + 3]
    const axisRegion = region[type === 'linear-horizontal' ? 0 : 1]
    if (type === 'linear-horizontal') {
      ;[x0, y0] = [y0, x0]
      ;[x1, y1] = [y1, x1]
      ;[x2, y2] = [y2, x2]
    }
    if (isNaN(y1) || isNaN(y2) || isNaN(y0)) {
      continue
    }

    const sign01 = Math.sign(y1 - y0)
    const sign12 = Math.sign(y2 - y1)
    if (sign01 !== sign12) {
      let xo0 = x0
      let xo1 = x1
      let xo2 = x2
      let yo = y1

      for (let j = 0; j < auto.extremumPass; j++) {
        const xm0 = (xo0 + xo1) / 2
        const ym0 = plotters[0](xm0)

        const xm2 = (xo1 + xo2) / 2
        const ym2 = plotters[0](xm2)

        if (Math.sign(ym0 - yo) === sign01) {
          xo2 = xo1
          xo1 = xm0
          yo = ym0
        } else if (Math.sign(ym2 - yo) === sign01) {
          xo0 = xo1
          xo1 = xm2
          yo = ym2
        } else {
          xo0 = xm0
          xo2 = xm2
        }
        if (xo0 === xo2 || yo > axisRegion[1] || yo < axisRegion[0]) {
          break
        }
      }
      points[i] = xo1
      points[i + 1] = yo
      if (type === 'linear-horizontal') {
        ;[points[i], points[i + 1]] = [points[i + 1], points[i]]
      }
    }
  }
}

const adaptativePlot = (plotters, type, region, min, max, step) => {
  let points = []
  // const t0 = performance.now()
  // const lens = [points.length]
  for (let n = min; n < max; n += step) {
    const [x, y] = evalPoint(plotters, type, n)
    pushBounded(points, x, y, region, type)
  }
  points = increasePrecision(points, plotters, type, region, true)
  // lens.push(points.length)
  affineExtremums(points, plotters, type, region)
  // lens.push(points.length)
  for (let i = 0; i < auto.precisionPass; i++) {
    if (points.length > auto.maxPoints) {
      // console.warn("Max points reached, can't subdivide anymore")
      break
    }
    points = increasePrecision(points, plotters, type, region)
    // lens.push(points.length)
  }
  // lens.push(points.length)
  // console.log(performance.now() - t0, lens)
  return points
}

const autoPlot = (plotters, type, region, min, max, step) => {
  const len = max - min
  min -= (len * auto.overflow) / 2
  max += (len * auto.overflow) / 2

  const points = []
  let point = [NaN, NaN],
    last = [NaN, NaN],
    next = evalPoint(plotters, type, min)
  const [X, Y] = type === 'linear-horizontal' ? [1, 0] : [0, 1]
  const verticalRegion = region[type === 'linear-horizontal' ? 0 : 1]
  const horizontalRegion = region[type === 'linear-horizontal' ? 1 : 0]
  const k =
    (verticalRegion[1] - verticalRegion[0]) /
    (horizontalRegion[1] - horizontalRegion[0])

  const regionEpsilon =
    (horizontalRegion[1] - horizontalRegion[0]) * auto.epsilon
  let blocking = null
  let consecutive = { min: [], max: [] }
  let skipping = false

  for (let n = min; n <= max; n += step) {
    // Working for pixel n -> n + step
    last = point
    point = next
    next = evalPoint(plotters, type, n + step)

    if (isNaN(point[Y]) || isNaN(next[Y])) {
      points.push(point[0], point[1])
      continue
    }

    // Start by removing straight lines
    if (!isNaN(last[Y]) && !blocking && n < max - step) {
      const angleLast = Math.atan2(point[Y] - last[Y], k * (point[X] - last[X]))
      const angleNext = Math.atan2(next[Y] - point[Y], k * (next[X] - point[X]))
      const angle = angleNext - angleLast
      const absAngle = Math.abs(angle)

      const distance =
        ((next[X] - last[X]) / (horizontalRegion[1] - horizontalRegion[0])) **
          2 +
        ((next[Y] - last[Y]) / (verticalRegion[1] - verticalRegion[0])) ** 2

      if (absAngle * distance < auto.straightness) {
        skipping = true
        point = last
        continue
      } else if (skipping) {
        skipping = false
        // Rewind
        n -= step
        next = point
        point = last
      }
    }

    if (!blocking) {
      points.push(point[0], point[1])
    }

    // Then let's look for extremums
    let left = point[X]
    let right = next[X]
    let leftThird = evalPoint(plotters, type, left + (right - left) / 3)
    let rightThird = evalPoint(plotters, type, right - (right - left) / 3)

    const leftGrowth = Math.sign(leftThird[Y] - point[Y])
    const centerGrowth = Math.sign(rightThird[Y] - leftThird[Y])
    const rightGrowth = Math.sign(next[Y] - rightThird[Y])
    const extremumType = rightGrowth === -1 ? 'max' : 'min'

    // A change of growth sign means we have an extremum
    if (leftGrowth !== centerGrowth || centerGrowth !== rightGrowth) {
      if (leftGrowth === rightGrowth) {
        // A double change of growth sign means we have two extrema
        // Likely a sampling issue or an asymptote
        // consecutive++
      }

      for (let j = 0; j < auto.extremumPass; j++) {
        if (
          (leftThird[Y] > verticalRegion[1] &&
            rightThird[Y] < verticalRegion[0]) ||
          (leftThird[Y] < verticalRegion[0] &&
            rightThird[Y] > verticalRegion[1])
        ) {
          // Asymptote?
          const middle = evalPoint(plotters, type, (left + right) / 2)
          const leftMiddleGrowth = Math.sign(middle[Y] - leftThird[Y])
          const rightMiddleGrowth = Math.sign(rightThird[Y] - middle[Y])

          if (leftMiddleGrowth !== rightMiddleGrowth) {
            // TODO : check if asymptote or simply a range issue
            // y = osc(2, x, 'square') for instance
            // y = exp(tan(x))
            if (leftThird[Y] > rightThird[Y]) {
              consecutive.max.push(leftThird)
              consecutive.min.push(rightThird)
            } else {
              consecutive.max.push(rightThird)
              consecutive.min.push(leftThird)
            }

            if (blocking) {
              if (leftThird[Y] > rightThird[Y]) {
                blocking.max.push(leftThird[0], leftThird[1])
                blocking.min.push(rightThird[0], rightThird[1])
              } else {
                blocking.max.push(rightThird[0], rightThird[1])
                blocking.min.push(leftThird[0], leftThird[1])
              }
            } else {
              points.push(leftThird[0], leftThird[1])
              if (type === 'linear-horizontal') {
                points.push(NaN, (leftThird[1] + rightThird[1]) / 2)
              } else {
                points.push((leftThird[0] + rightThird[0]) / 2, NaN)
              }
              points.push(rightThird[0], rightThird[1])
            }
            break
          }
        }
        if (rightGrowth === -1) {
          if (leftThird[Y] < rightThird[Y]) {
            left = leftThird[X]
          } else {
            right = rightThird[X]
          }
        } else {
          if (leftThird[Y] > rightThird[Y]) {
            left = leftThird[X]
          } else {
            right = rightThird[X]
          }
        }

        if (
          Math.abs(right - left) < regionEpsilon ||
          j === auto.extremumPass - 1
        ) {
          if (
            (rightGrowth === -1 && leftThird[Y] > rightThird[Y]) ||
            (rightGrowth === 1 && leftThird[Y] < rightThird[Y])
          ) {
            consecutive[extremumType].push(leftThird)
            if (blocking) {
              blocking[extremumType].push(leftThird[0], leftThird[1])
            } else {
              points.push(leftThird[0], leftThird[1])
            }
          } else {
            consecutive[extremumType].push(rightThird)
            if (blocking) {
              blocking[extremumType].push(rightThird[0], rightThird[1])
            } else {
              points.push(rightThird[0], rightThird[1])
            }
          }
          break
        }
        leftThird = evalPoint(plotters, type, left + (right - left) / 3)
        rightThird = evalPoint(plotters, type, right - (right - left) / 3)
      }
    } else {
      if (consecutive.max.length + consecutive.min.length > 0) {
        let lastPoint = null
        let lastGrowth = 0
        let extremum = false
        for (let i = 0; i <= auto.subsampling; i++) {
          let currentPoint =
            i === 0
              ? point
              : i === auto.subsampling
              ? next
              : evalPoint(
                  plotters,
                  type,
                  ((auto.subsampling - i) * point[X] + i * next[X]) /
                    auto.subsampling
                )
          if (lastPoint) {
            const growth = Math.sign(currentPoint[Y] - lastPoint[Y])
            if (lastGrowth && growth !== lastGrowth) {
              consecutive[growth === -1 ? 'max' : 'min'].push(currentPoint)
              extremum = true
              break
            }
            lastGrowth = growth
          }
          lastPoint = currentPoint
        }
        if (!extremum) {
          consecutive.min.shift()
          consecutive.max.shift()
        }
      } else {
        consecutive.min.shift()
        consecutive.max.shift()
      }
    }
    if (consecutive.min.length > 3) {
      consecutive.min.shift()
    }
    if (consecutive.max.length > 3) {
      consecutive.max.shift()
    }
    if (blocking) {
      if (
        (consecutive.min.length < 1 && consecutive.max.length < 1) ||
        n > max - step
      ) {
        // Closing block
        // if (blocking.min.length > auto.minBlockSize) {
        if (blocking.min.length > 2 && blocking.max.length > 2) {
          // Start block marker
          points.push(NaN, NaN)
          for (let i = 0; i < blocking.min.length; i += 2) {
            points.push(blocking.min[i], blocking.min[i + 1])
          }
          if (type === 'linear-horizontal') {
            points.push(blocking.min[blocking.min.length - 2], point[1])
            points.push(blocking.max[blocking.max.length - 2], point[1])
          } else {
            points.push(point[0], blocking.min[blocking.min.length - 1])
            points.push(point[0], blocking.max[blocking.max.length - 1])
          }
          for (let i = blocking.max.length - 2; i >= 0; i -= 2) {
            points.push(blocking.max[i], blocking.max[i + 1])
          }
          // End block marker
          points.push(NaN, NaN)
        }
        points.push(point[0], point[1])

        // }

        blocking = null
      }
    } else if (consecutive.min.length >= 1 && consecutive.max.length >= 1) {
      // We have a block
      // points.push(next[0], next[1])
      const min = consecutive.min[consecutive.min.length - 1]
      const max = consecutive.max[consecutive.max.length - 1]

      const x = Math.min(min[X], max[X])
      // points.splice(points.length - 2)
      blocking = {
        min: type === 'linear-horizontal' ? [min[Y], x] : [x, min[Y]],
        max: type === 'linear-horizontal' ? [max[Y], x] : [x, max[Y]],
      }
    }
  }

  points.push(next[0], next[1])

  // console.log(points)
  return points
}

const sizePlot = (plotters, type, region, min, max, step) => {
  const points = []
  for (let n = min; n < max; n += step) {
    const [x, y] = evalPoint(plotters, type, n)
    pushBounded(points, x, y, region, type)
  }
  return points
}

const evalPoint = (plotters, type, n) => {
  self._state.call = 0
  if (type === 'parametric') {
    const x = plotters[0](n)
    const y = plotters[1](n)
    return [x, y]
  } else if (type === 'polar') {
    const r = plotters[0](n)
    return [r * Math.cos(n), r * Math.sin(n)]
  } else if (type === 'linear-horizontal') {
    const x = plotters[0](n)
    return [x, n]
  } else if (type === 'linear') {
    const y = plotters[0](n)
    return [n, y]
  }
  throw new Error(`Unknown plot type ${type}`)
}

const modes = ['line', 'dot', 'point']
const affected = {}
onmessage = ({
  data: {
    index,
    funs,
    type,
    min,
    max,
    samples,
    region,
    affects,
    mode,
    rendering,
    recs,
    dimensions = 2,
    sampleRate,
    duration,
    uuid,
  },
}) => {
  let err = '',
    points = [],
    values

  try {
    if (type === 'unknown') {
      throw new Error(`Invalid function type ${funs.join(', ')}`)
    }
    if (!modes.includes(mode)) {
      throw new Error(
        `Invalid mode: ${mode}, must be one of ${modes.join(', ')}`
      )
    }
    if (typeof min === 'string') {
      min = new Function('return ' + min)()
    }
    if (typeof max === 'string') {
      max = new Function('return ' + max)()
    }
    if (typeof samples === 'string') {
      samples = new Function('return ' + samples)()
    }
    const step = (max - min) / samples
    if (isNaN(step) || step === 0) {
      throw new Error(`Invalid step ${step}`)
    }
    if (!rendering) {
      if (
        ['linear', 'linear-horizontal'].includes(type) &&
        // For sound, size is still better
        !Object.keys(doc.sound).some(x =>
          funs[0].match(new RegExp(`\\b${x}\\b`))
        )
      ) {
        rendering = 'auto'
      } else {
        rendering = 'size'
      }
    }
    for (let i = 0; i < affects.length; i++) {
      const [name, valueText] = affects[i]
      const value = new Function('', 'return ' + valueText)()
      affected[name] = self[name]
      self[name] = value
    }
    if (recs) {
      Object.entries(recs).forEach(([i, rec]) => {
        if (!rec) {
          return
        }
        self[`$rec${i}`] = x => {
          const n = ~~Math.round(x * rec.sampleRate)
          if (n >= 0 && n < rec.buffer.length) {
            return rec.buffer[n]
          }
          return 0
        }
      })
    }

    self._state = { sampleRate, duration, call: 0 }
    const plotters = funs.map(
      fun => new Function(TYPE_VARIABLES[type], 'return ' + fun)
    )
    if (dimensions === 1) {
      values = new Float32Array((max - min) / step)
      let i = 0
      for (let n = min; n < max; n += step) {
        self._state.call = 0
        const val = plotters[0](n)
        if (typeof val !== 'number') {
          let e
          if (typeof val === 'function') {
            e = new Error(self.__doc__[val] || 'Function not supported')
          } else if (typeof val === 'undefined') {
            e = new Error(`${funs[0]} is undefined`)
          } else {
            e = new Error(`${typeof val} is not a number`)
          }
          throw e
        }
        values[i++] = val
      }
    } else if (dimensions === 2) {
      if (rendering === 'size') {
        points = sizePlot(plotters, type, region, min, max, step)
      } else if (rendering === 'adaptative') {
        points = adaptativePlot(plotters, type, region, min, max, step)
      } else if (rendering === 'auto') {
        points = autoPlot(plotters, type, region, min, max, step)
      }
      values = new Float32Array(points)
    }

    if (recs) {
      Object.keys(recs).forEach(i => {
        delete self[`$rec${i}`]
      })
    }
    for (let i = 0; i < affects.length; i++) {
      const [name] = affects[i]
      self[name] = affected[name]
      delete affected[name]
    }
  } catch (e) {
    err = e
  }

  postMessage({ index, values, type, mode, err, uuid }, values?.buffer)
}
