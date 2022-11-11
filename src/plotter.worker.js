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

const affected = {}

onmessage = ({
  data: { index, funs, type, values, affects, recs, dimensions = 2, uuid },
}) => {
  let err = '',
    skips = [0]
  try {
    for (let i = 0; i < affects.length; i++) {
      const [name, valueText] = affects[i]
      // eslint-disable-next-line no-new-func
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
          const n = ~~(x * rec.sampleRate)
          if (n > 0 && n < rec.buffer.length) {
            return rec.buffer[n]
          }
        }
      })
    }

    const plotters = funs.map(
      // eslint-disable-next-line no-new-func
      fun => new Function(TYPE_VARIABLES[type], 'return ' + fun)
    )

    for (let i = 0; i < values.length; i += dimensions) {
      if (dimensions === 1) {
        values[i] = plotters[0](values[i])
        if (typeof values[i] !== 'number') {
          let e
          if (typeof values[i] === 'function') {
            e = new Error(self.__doc__[values[i]] || 'Function not supported')
          } else if (typeof values[i] === 'undefined') {
            e = new Error(`${funs[0]} is undefined`)
          } else {
            e = new Error(`${typeof values[i]} is not a number`)
          }
          values[i] = null
          throw e
        }
      } else {
        if (type === 'parametric') {
          const value = values[i]
          values[i] = plotters[0](value)
          values[i + 1] = plotters[1](value)
        } else {
          if (type === 'linear-horizontal') {
            values[i] = plotters[0](values[i + 1])
          } else {
            values[i + 1] = plotters[0](values[i])
            if (type === 'polar') {
              const value = values[i]
              values[i] = values[i + 1] * Math.cos(value)
              values[i + 1] *= Math.sin(value)
            }
          }
        }
      }
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

  postMessage({ index, values, type, skips, err, uuid }, [values.buffer])
}
