import { DEFAULT_SAMPLE_RATE } from './base'
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
    mode = 'line'
  if ((match = fun.match(/(.+)@\/([^@]+)(@.+|$)/))) {
    fun = match[1] + (match[3] || '')
    mode = match[2].trim()
  }
  if ((match = fun.match(/(.+)@!([^@]+)(@.+|$)/))) {
    fun = match[1] + (match[3] || '')
    samples = match[2].trim()
  }
  if ((match = fun.match(/(.+)@\s*(auto|size|adaptative|fft)\s*(@.+|$)/))) {
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
    samples = samples || duration * sampleRate
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
    recIndexes,
  }
}
