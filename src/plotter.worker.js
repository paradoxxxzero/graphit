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
