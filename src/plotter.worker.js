const TYPE_VARIABLES = {
  linear: 'x',
  'linear-horizontal': 'y',
  polar: 'o',
  parametric: 't',
}

// Globalize Math functions and constants
for (let key of Array.from(Object.getOwnPropertyNames(Math))) {
  // eslint-disable-next-line no-restricted-globals
  self[key.toLowerCase()] = self[key] = Math[key]
}

// Custom globlals:
// self.asdts = ...

onmessage = ({ data: { index, functions, type, values } }) => {
  let err = '',
    skips = [0]
  try {
    const plotters = functions.map(
      // eslint-disable-next-line no-new-func
      fun => new Function(TYPE_VARIABLES[type], 'return ' + fun)
    )
    for (let i = 0; i < values.length; i += 2) {
      const value = values[i]
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
  } catch (e) {
    err = e
  }

  postMessage({ index, values, type, skips, err })
}
