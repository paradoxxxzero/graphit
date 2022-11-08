export function lerp(v0, v1, t) {
  return (1 - t) * v0 + t * v1
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

export function orderRange(min, max, proj, minTick) {
  const range = max - min
  const order = ~~Math.log10(range)
  let step = Math.pow(10, order)

  let precision = ~~-Math.log10(step)

  while (proj(step) > minTick) {
    step /= 2
    precision += 1
  }

  return {
    min: Math.ceil(min / step) * step,
    max: Math.ceil(max / step) * step,
    step,
    precision: Math.max(0, precision),
  }
}

export function getFunctionType(fun) {
  let match, type, functions
  if ((match = fun.match(/^\s*y\s*=\s*(.+)/))) {
    type = 'linear'
    functions = [match[1]]
  } else if ((match = fun.match(/^\s*x\s*=\s*(.+)/))) {
    type = 'linear-horizontal'
    functions = [match[1]]
  } else if ((match = fun.match(/^\s*r\s*=\s*(.+)/))) {
    type = 'polar'
    functions = [match[1]]
  } else if ((match = fun.match(/^\s*{\s*x\s*=\s*(.+)\s*,\s*y\s*=\s*(.+)}/))) {
    type = 'parametric'
    functions = [match[1], match[2]]
  } else {
    throw new Error('Invalid function')
  }
  return { type, functions }
}

export function getValuesForType(type, x, y, i2x, j2y, options) {
  let values,
    n = 0
  switch (type) {
    case 'linear':
      values = new Float64Array((2 * x) / options.precision)

      for (let i = 0; i < x; i += options.precision) {
        values[n] = i2x(i)
        n += 2
      }
      break
    case 'linear-horizontal':
      values = new Float64Array((2 * y) / options.precision)

      for (let j = 0; j < y; j += options.precision) {
        values[n] = j2y(j)
        n += 2
      }
      break

    case 'polar':
      values = new Float64Array((2 * options.polarMax) / options.polarPrecision)
      for (let o = 0; o < options.polarMax; o += options.polarPrecision) {
        values[n] = o
        n += 2
      }
      break
    case 'parametric':
      values = new Float64Array(
        (2 * options.parametricMax) / options.parametricPrecision
      )
      for (
        let t = 0;
        t < options.parametricMax;
        t += options.parametricPrecision
      ) {
        values[n] = t
        n += 2
      }
      break
    default:
      throw new Error('Invalid function type')
  }
  return values
}
