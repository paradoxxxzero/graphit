import { DEFAULT_SAMPLE_RATE } from './base'
import { MODES, RENDERINGS, INTERPOLATIONS } from './static'
export function lerp(v0, v1, t) {
  return (1 - t) * v0 + t * v1
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

export async function timeout(ms) {
  return new Promise(resolve => setTimeout(() => resolve('timeout'), ms))
}

export const regionEquals = (region1, region2) => {
  if (!region1 || !region2) {
    return region1 === region2
  }
  return (
    region1[0][0] === region2[0][0] &&
    region1[0][1] === region2[0][1] &&
    region1[0][2] === region2[0][2] &&
    region1[1][0] === region2[1][0] &&
    region1[1][1] === region2[1][1] &&
    region1[1][2] === region2[1][2]
  )
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

export const nextPowerOf2 = n =>
  n & (n - 1) ? 2 ** ((Math.log2(n) + 1) | 0) : n

export function getFunctionParams(fun, region) {
  let match,
    type,
    funs,
    recIndexes,
    min = null,
    max = null,
    samples = null,
    rendering = null,
    mode = null,
    interpolation = null

  if ((match = fun.match(/(.+)@@.+$/))) {
    fun = match[1]
  }
  if ((match = fun.match(/(.+)@!\s*([^@]+)(@.+|$)/))) {
    fun = match[1] + (match[3] || '')
    samples = match[2].trim()
  }
  if (
    (match = fun.match(new RegExp(`(.+)@\\/\\s*(${MODES.join('|')})(@.+|$)`)))
  ) {
    fun = match[1] + (match[3] || '')
    mode = match[2].trim()
  }
  if (
    (match = fun.match(
      new RegExp(`(.+)@\\$\\s*(${INTERPOLATIONS.join('|')})(@.+|$)`)
    ))
  ) {
    fun = match[1] + (match[3] || '')
    interpolation = match[2].trim()
  }
  if (
    (match = fun.match(new RegExp(`(.+)@\\s*(${RENDERINGS.join('|')})(@.+|$)`)))
  ) {
    fun = match[1] + (match[3] || '')
    rendering = match[2].trim()
  }

  if ((match = fun.match(/(.+)@(.+)->([^@]+)(@.+|$)/))) {
    fun = match[1] + (match[4] || '')
    min = match[2].trim()
    max = match[3].trim()
  }

  if ((match = fun.match(/\$rec\d\(.+?\)/g))) {
    recIndexes = []
    match.forEach(rec => {
      recIndexes.push(rec.match(/\$rec(\d)/)[1])
    })
  }
  if ((match = fun.match(/^\s*y\s*=(.+)$/))) {
    type = 'linear'
    funs = [match[1].trim()]
    if (min === null) {
      ;[[min, max]] = region || [[]]
    }
    samples = samples || (region ? region[0][2] : 0)
  } else if ((match = fun.match(/^\s*x\s*=(.+)$/))) {
    type = 'linear-horizontal'
    funs = [match[1].trim()]
    if (min === null) {
      ;[, [min, max]] = region || [null, []]
    }
    samples = samples || (region ? region[1][2] : 0)
  } else if (
    (match = fun.match(
      /^\s*s(?:\(\s*(\S+)\s*(?:\s*,\s*(\s*\d+\s*)\s*)?\s*\))?\s*=(.+)$/
    ))
  ) {
    type = 'sound'
    let duration = match[1] ? parseFloat(match[1]) : 1
    if (isNaN(duration) || duration <= 0) {
      console.warn('Invalid sound duration: ' + match[1])
      duration = 1
    }
    let sampleRate = match[2] ? ~~match[2] : DEFAULT_SAMPLE_RATE
    if (sampleRate < 3000 || sampleRate > 768000) {
      console.warn(
        'Invalid sample rate: ' + match[2] + ' must be in range [3000, 768000])'
      )
      sampleRate = DEFAULT_SAMPLE_RATE
    }
    min = 0
    max = duration
    samples = duration * sampleRate
    samples =
      region && rendering !== 'fft' ? region[0][2] : duration * sampleRate

    funs = [match[3].trim()]
  } else if ((match = fun.match(/^\s*r\s*=(.+)$/))) {
    type = 'polar'
    funs = [match[1].trim()]
    if (min === null) {
      ;[min, max] = [0, 2 * Math.PI]
    }
    samples = samples || (region ? Math.min(region[0][2], region[1][2]) : 0)
  } else if ((match = fun.match(/^\s*{\s*x\s*=(.+),\s*y\s*=(.+)}\s*$/))) {
    type = 'parametric'
    funs = [match[1].trim(), match[2].trim()]
    if (min === null) {
      ;[min, max] = [0, 1]
    }
    samples = samples || (region ? Math.min(region[0][2], region[1][2]) : 0)
  } else if ((match = fun.match(/^\s*\[\]\s*=\s*(.+)\s*$/))) {
    type = 'list'
    rendering = rendering || 'cubic'
    funs = [`[${match[1].trim()}]`]
    if (min === null) {
      ;[[min, max]] = region || [[]]
    }
    samples = samples || (region ? region[0][2] : 0)
  } else if ((match = fun.match(/^\s*(\S+)\s*=(.+)$/))) {
    type = 'affect'
    funs = [match[1].trim(), match[2].trim()]
    ;[min, max] = [0, 1]
    samples = 1
  } else {
    type = 'unknown'
    funs = [fun]
  }
  return {
    type,
    funs,
    min,
    max,
    samples,
    mode,
    rendering,
    interpolation,
    recIndexes,
  }
}

export const cubicInterpolation = (points, precision) => {
  const n = ~~(points.length - 1)
  const x = new Array(n + 1)
  const a = new Array(n + 1)
  const b = new Array(n + 1).fill(0)
  const c = new Array(n + 1).fill(0)
  const d = new Array(n + 1).fill(0)
  const m = new Array(n + 1).fill(0)
  const z = new Array(n + 1).fill(0)
  const h = new Array(n)
  const k = new Array(n)
  const g = new Array(n)

  for (let i = 0; i < n + 1; i++) {
    x[i] = points[i][0]
    a[i] = points[i][1]
  }

  for (let i = 0; i < n; i++) {
    h[i] = x[i + 1] - x[i]
    k[i] = a[i + 1] - a[i]
    g[i] = h[i] !== 0 ? k[i] / h[i] : 1
  }

  for (let i = 1; i < n; i++) {
    const l =
      x[i + 1] - x[i - 1] !== 0
        ? 1 / (2 * (x[i + 1] - x[i - 1]) - h[i - 1] * m[i - 1])
        : 0
    m[i] = h[i] * l
    z[i] = (3 * (g[i] - g[i - 1]) - h[i - 1] * z[i - 1]) * l
  }
  for (let j = n - 1; j >= 0; j--) {
    if (h[j] === 0) {
      continue
    }
    c[j] = z[j] - m[j] * c[j + 1]
    b[j] = g[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3
    d[j] = (c[j + 1] - c[j]) / (3 * h[j])
  }
  const result = []

  for (let i = 0; i < n + 1; i++) {
    result.push(x[i], a[i])
    if (i === n || h[i] === 0) {
      continue
    }
    for (let j = 1; j < precision; j++) {
      const t = (j * h[i]) / precision
      result.push(x[i] + t, a[i] + t * (b[i] + t * (c[i] + t * d[i])))
    }
  }
  return result
}

export const quadraticInterpolation = (points, precision) => {
  const n = ~~(points.length - 1)
  const x = new Array(n + 1)
  const a = new Array(n + 1)
  const b = new Array(n + 1).fill(0)
  const c = new Array(n + 1).fill(0)
  const h = new Array(n)
  const k = new Array(n)
  const g = new Array(n)

  for (let i = 0; i < n + 1; i++) {
    x[i] = points[i][0]
    a[i] = points[i][1]
  }

  for (let i = 0; i < n; i++) {
    h[i] = x[i + 1] - x[i]
    k[i] = a[i + 1] - a[i]
    g[i] = h[i] !== 0 ? k[i] / h[i] : 1
  }

  for (let i = 1; i < n; i++) {
    b[i] = 2 * g[i - 1] - b[i - 1]
  }
  for (let i = 0; i < n; i++) {
    c[i] = h[i] !== 0 ? (g[i] - b[i]) / h[i] : 0
  }
  const result = []
  for (let i = 0; i < n + 1; i++) {
    result.push(x[i], a[i])
    if (i === n || h[i] === 0) {
      continue
    }
    for (let j = 1; j < precision; j++) {
      const t = (j * h[i]) / precision
      result.push(x[i] + t, a[i] + t * (b[i] + t * c[i]))
    }
  }

  return result
}

export const lagrangeInterpolation = (points, precision) => {
  const n = ~~(points.length - 1)
  const x = new Array(n + 1)
  const a = new Array(n + 1)
  const h = new Array(n)
  const result = []

  for (let i = 0; i < n + 1; i++) {
    x[i] = points[i][0]
    a[i] = points[i][1]
  }
  for (let i = 0; i < n; i++) {
    h[i] = x[i + 1] - x[i]
  }

  for (let i = 0; i < n + 1; i++) {
    result.push(x[i], a[i])
    if (i === n || h[i] === 0) {
      continue
    }
    for (let j = 1; j < precision; j++) {
      const t = x[i] + (j * h[i]) / precision
      let sum = 0
      for (let k = 0; k < n + 1; k++) {
        let prod = 1
        for (let l = 0; l < n + 1; l++) {
          if (k !== l && x[k] !== x[l]) {
            prod *= (t - x[l]) / (x[k] - x[l])
          }
        }
        sum += a[k] * prod
      }
      result.push(t, sum)
    }
  }
  return result
}

export const trigonometricInterpolation = (points, precision) => {
  const n = ~~(points.length - 1)
  const x = new Array(n + 1)
  const a = new Array(n + 1)
  const h = new Array(n)
  const result = []

  for (let i = 0; i < n + 1; i++) {
    x[i] = points[i][0]
    a[i] = points[i][1]
  }

  for (let i = 0; i < n; i++) {
    h[i] = x[i + 1] - x[i]
  }

  for (let i = 0; i < n + 1; i++) {
    result.push(x[i], a[i])
    if (i === n || h[i] === 0) {
      continue
    }
    for (let j = 1; j < precision; j++) {
      const t = x[i] + (j * h[i]) / precision
      let sum = 0
      for (let k = 0; k < n + 1; k++) {
        let prod = 1
        for (let l = 0; l < n + 1; l++) {
          if (k !== l && Math.sin(0.5 * (x[k] - x[l]) !== 0)) {
            prod *= Math.sin(0.5 * (t - x[l])) / Math.sin(0.5 * (x[k] - x[l]))
          }
        }
        sum += a[k] * prod
      }
      result.push(t, sum)
    }
  }
  return result
}
