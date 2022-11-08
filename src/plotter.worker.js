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
self.osc = (freq, x) => Math.sin(2 * Math.PI * freq * x)
self.adsr = (x, a = 0.2, d = 0.1, s = 0.2, r = 0.2, sl = 0.5) =>
  x <= a
    ? x / a // attack - linear increase to 1
    : x <= a + d
    ? 1 - ((1 - sl) * (x - a)) / d // decay - linear decrease from 1 to sl
    : x <= a + d + s
    ? sl // sustain - constant value of s
    : x <= a + d + s + r
    ? sl - ((sl - 0) * (x - a - d - s)) / r // release - linear decrease from s to 0
    : 0 // end - constant value of 0

onmessage = ({ data: { index, functions, type, values, dimensions = 2 } }) => {
  let err = '',
    skips = [0]
  try {
    const plotters = functions.map(
      // eslint-disable-next-line no-new-func
      fun => new Function(TYPE_VARIABLES[type], 'return ' + fun)
    )
    for (let i = 0; i < values.length; i += dimensions) {
      const value = values[i]
      if (dimensions === 1) {
        values[i] = plotters[0](value)
      } else {
        if (type === 'parametric') {
          values[i] = plotters[0](value)
          values[i + 1] = plotters[1](value)
        } else {
          values[i] = value
          values[i + 1] = plotters[0](value)
          if (type === 'polar') {
            values[i] = values[i + 1] * Math.cos(value)
            values[i + 1] *= Math.sin(value)
          }
        }
      }
    }
  } catch (e) {
    err = e
  }

  postMessage({ index, values, type, skips, err })
}
