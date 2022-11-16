/* eslint-disable no-new-func */
/* eslint-disable no-restricted-globals */
const TYPE_VARIABLES = {
  linear: 'x',
  'linear-horizontal': 'y',
  polar: 'o',
  parametric: 't',
}

// Globalize Math functions and constants
for (let key of Array.from(Object.getOwnPropertyNames(Math))) {
  self[key.toLowerCase()] = self[key] = Math[key]
}

// Custom globlals:
self.TAU = self.PI * 2
self.osc = (freq, x, type = 'sine') =>
  x < 0
    ? 0
    : type === 'sine'
    ? Math.sin(2 * Math.PI * freq * x)
    : type === 'square'
    ? Math.sign(Math.sin(2 * Math.PI * freq * x))
    : type === 'sawtooth'
    ? 2 * (x * freq - ~~(x * freq + 0.5))
    : type === 'triangle'
    ? 2 * Math.abs(2 * (x * freq + 0.25 - ~~(x * freq + 0.75))) - 1
    : 0

self.adsr = (
  x,
  attack = 0.2,
  decay = 0.1,
  sustain = 0.4,
  release = 0.3,
  sustainLevel = 0.5
) =>
  x < 0
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

self.__doc__ = {
  [self.adsr]:
    'adsr usage: (x, attack = 0.2, decay = 0.1, sustain = 0.4, release = 0.3, sustainLevel = 0.5)',
  [self.osc]: 'osc usage: (freq, x, type = sine|square|sawtooth|triangle)',
  // MATH functions
  [self.abs]: 'Returns the absolute value of x.',
  [self.acos]: 'Returns the arccosine of x.',
  [self.acosh]: 'Returns the hyperbolic arccosine of x.',
  [self.asin]: 'Returns the arcsine of x.',
  [self.asinh]: 'Returns the hyperbolic arcsine of a number.',
  [self.atan]: 'Returns the arctangent of x.',
  [self.atanh]: 'Returns the hyperbolic arctangent of x.',
  [self.atan2]: 'Returns the arctangent of the quotient of its arguments.',
  [self.cbrt]: 'Returns the cube root of x.',
  [self.ceil]: 'Returns the smallest integer greater than or equal to x.',
  [self.clz32]:
    'Returns the number of leading zero bits of the 32-bit integer x.',
  [self.cos]: 'Returns the cosine of x.',
  [self.cosh]: 'Returns the hyperbolic cosine of x.',
  [self.exp]:
    "Returns ex, where x is the argument, and e is Euler's constant (2.718…, the base of the natural logarithm).",
  [self.expm1]: 'Returns subtracting 1 from exp(x).',
  [self.floor]: 'Returns the largest integer less than or equal to x.',
  [self.fround]:
    'Returns the nearest single precision float representation of x.',
  [self.hypot]:
    'Returns the square root of the sum of squares of its arguments.',
  [self.imul]:
    'Returns the result of the 32-bit integer multiplication of x and y.',
  [self.log]: 'Returns the natural logarithm (㏒e; also, ㏑) of x.',
  [self.log1p]:
    'Returns the natural logarithm (㏒e; also ㏑) of 1 + x for the number x.',
  [self.log10]: 'Returns the base-10 logarithm of x.',
  [self.log2]: 'Returns the base-2 logarithm of x.',
  [self.max]: 'Returns the largest of zero or more numbers.',
  [self.min]: 'Returns the smallest of zero or more numbers.',
  [self.pow]: 'Returns base x to the exponent power y (that is, xy).',
  [self.random]: 'Returns a pseudo-random number between 0 and 1.',
  [self.round]:
    'Returns the value of the number x rounded to the nearest integer.',
  [self.sign]:
    'Returns the sign of the x, indicating whether x is positive, negative, or zero.',
  [self.sin]: 'Returns the sine of x.',
  [self.sinh]: 'Returns the hyperbolic sine of x.',
  [self.sqrt]: 'Returns the positive square root of x.',
  [self.tan]: 'Returns the tangent of x.',
  [self.tanh]: 'Returns the hyperbolic tangent of x.',
  [self.trunc]:
    'Returns the integer portion of x, removing any fractional digits.',
}

const subdivideIfNeededPoints = (
  f,
  points,
  region,
  precision,
  straightness,
  suppleness
) => {
  const [[xmin, xmax], [ymin, ymax]] = region
  let newPoints = []
  // TODO: Handle last points
  // TODO: Handle domains
  // TODO: Handle last outs
  let i
  for (i = 0; i < points.length - 4; i += 4) {
    const x1 = points[i]
    const y1 = points[i + 1]
    const x2 = points[i + 2]
    const y2 = points[i + 3]
    const x3 = points[i + 4]
    const y3 = points[i + 5]
    const angle12 = Math.atan2(y2 - y1, x2 - x1)
    const angle23 = Math.atan2(y3 - y2, x3 - x2)
    const angle = angle23 - angle12
    const isStraight = Math.abs(angle) < straightness
    const subdivide = Math.abs(angle) > precision
    if (isStraight) {
      newPoints.push(x1, y1)
      continue
    }
    if (
      subdivide &&
      (angle12 > Math.PI / 2 - suppleness ||
        angle12 < -Math.PI / 2 + suppleness)
    ) {
      newPoints.push(x2, y2)
      const x231 = (x2 * 1.5 + x3 * 0.5) / 2
      const y231 = f(x231)
      // if (x231 > xmin && x231 < xmax && y231 > ymin && y231 < ymax) {
      newPoints.push(x231, y231)
      // }
      const x232 = (x2 * 0.5 + x3 * 1.5) / 2
      const y232 = f(x232)
      // if (x232 > xmin && x232 < xmax && y232 > ymin && y232 < ymax) {
      newPoints.push(x232, y232)
      // }
      continue
    }

    // const skip =
    //   Math.PI / 2 - angle12 < straightness &&
    //   Math.PI / 2 - angle23 < straightness
    // This only works on linear (vertical)
    newPoints.push(x1, y1)
    if (subdivide) {
      const x12 = (x1 + x2) / 2
      const y12 = f(x12)
      // if (x12 > xmin && x12 < xmax && y12 > ymin && y12 < ymax) {
      newPoints.push(x12, y12)
      // }
    }
    // if (Math.PI / 2 - angle23 > straightness) {
    newPoints.push(x2, y2)
    // }
    if (subdivide) {
      const x23 = (x2 + x3) / 2
      const y23 = f(x23)
      // if (x23 > xmin && x23 < xmax && y23 > ymin && y23 < ymax) {
      newPoints.push(x23, y23)
      // }
    }
  }

  for (let j = i; j < points.length; j++) {
    newPoints.push(points[j])
  }
  return newPoints
}

const adaptativePlot = (
  fns,
  type,
  min,
  max,
  region,
  samples = 100,
  pass = 50,
  precision = Math.PI / 2 ** 11,
  straightness = Math.PI / 2 ** 9,
  suppleness = Math.PI / 2 ** 20,
  maxPoints = 2 ** 14
) => {
  const [[xmin, xmax], [ymin, ymax]] = region
  if (type === 'linear') {
    let points = []
    const f = fns[0]
    for (let x = min; x <= max; x += (max - min) / samples) {
      const y = f(x)
      if (x > xmin && x < xmax && y > ymin && y < ymax) {
        points.push(x, y)
      }
    }
    const nPoints = points.length
    for (let i = 0; i < pass; i += 2) {
      if (points.length > maxPoints) {
        console.warn("Max points reached, can't subdivide anymore")
        break
      }
      points = subdivideIfNeededPoints(
        f,
        points,
        region,
        precision,
        straightness,
        suppleness
      )
    }
    console.log(nPoints, '->', points.length)
    return points
  } else {
    throw new Error('Not implemented')
  }
}

const affected = {}

onmessage = ({
  data: {
    index,
    funs,
    type,
    min,
    max,
    step,
    region,
    affects,
    recs,
    dimensions = 2,
    uuid,
  },
}) => {
  let err = '',
    values = []

  try {
    if (type === 'unknown') {
      throw new Error(`Unknow function type ${funs.join(', ')}`)
    }
    if (typeof min === 'string') {
      min = new Function('return ' + min)()
    }
    if (typeof max === 'string') {
      max = new Function('return ' + max)()
    }
    if (typeof step === 'string' && step !== 'auto') {
      step = new Function('return ' + step)()
    }
    if (step !== 'auto') {
      step = (max - min) * step
      if (isNaN(step) || step < 1e-9) {
        throw new Error(`Invalid step ${step}`)
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
    const [[xmin, xmax], [ymin, ymax]] = region
    let lastOutX = null,
      lastOutY = null,
      lastOut = true
    const domains = []
    let domain = []
    const plotters = funs.map(
      fun => new Function(TYPE_VARIABLES[type], 'return ' + fun)
    )
    if (step === 'auto') {
      domain = adaptativePlot(plotters, type, min, max, region)
    } else {
      for (let n = min; n < max; n += step) {
        if (dimensions === 1) {
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
          domain.push(val)
        } else {
          let x, y
          if (type === 'parametric') {
            x = plotters[0](n)
            y = plotters[1](n)
          } else if (type === 'polar') {
            const r = plotters[0](n)
            x = r * Math.cos(n)
            y = r * Math.sin(n)
          } else if (type === 'linear-horizontal') {
            x = plotters[0](n)
            y = n
          } else {
            x = n
            y = plotters[0](n)
          }
          if (x < xmin || x > xmax || y < ymin || y > ymax) {
            // Out of range
            lastOutX = x
            lastOutY = y
            if (lastOut) {
              continue
            }
            // Coming out of range
            lastOut = true
            // Ending last domain
          } else if (lastOut) {
            // Coming back in range
            lastOut = false
            // Beginning new domain
            if (domain.length) {
              domains.push(domain)
              domain = []
            }
            if (lastOutX !== null) {
              domain.push(lastOutX, lastOutY)
            }
          }
          domain.push(x, y)
        }
      }
    }
    if (domain.length) {
      domains.push(domain)
    }
    values = domains.map(domain => new Float32Array(domain))
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

  postMessage(
    { index, values, type, err, uuid },
    values.map(v => v.buffer)
  )
}
