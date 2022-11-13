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

export function getFunctionParams(fun, region, precisions) {
  let match,
    type,
    funs,
    recIndexes,
    min = null,
    max = null,
    step = null
  if ((match = fun.match(/(.+)!\s*(.+)\s*$/))) {
    fun = match[1]
    step = match[2]
  }
  if ((match = fun.match(/(.+)@\s*(.+)\s*->\s*(.+)\s*/))) {
    fun = match[1]
    min = match[2]
    max = match[3]
  }

  if ((match = fun.match(/\$rec\d\(.+?\)/g))) {
    recIndexes = []
    match.forEach(rec => {
      recIndexes.push(rec.match(/\$rec(\d)/)[1])
    })
  }
  if ((match = fun.match(/^\s*y\s*=\s*(.+)\s*$/))) {
    type = 'linear'
    funs = [match[1]]
    if (min === null) {
      ;[[min, max]] = region
    }
    if (step === null) {
      step = precisions[0]
    }
  } else if ((match = fun.match(/^\s*x\s*=\s*(.+)\s*$/))) {
    type = 'linear-horizontal'
    funs = [match[1]]
    if (min === null) {
      ;[, [min, max]] = region
    }
    if (step === null) {
      step = precisions[1]
    }
  } else if ((match = fun.match(/^\s*r\s*=\s*(.+)\s*$/))) {
    type = 'polar'
    funs = [match[1]]
    if (min === null) {
      ;[min, max] = [0, 2 * Math.PI]
    }
    if (step === null) {
      step = Math.min(...precisions)
    }
  } else if (
    (match = fun.match(/^\s*{\s*x\s*=\s*(.+)\s*,\s*y\s*=\s*(.+)\s*}\s*$/))
  ) {
    type = 'parametric'
    funs = [match[1], match[2]]
    if (min === null) {
      ;[min, max] = [0, 1]
    }
    if (step === null) {
      step = Math.min(...precisions)
    }
  } else if ((match = fun.match(/^\s*(\S+)\s*=\s*(.+)\s*$/))) {
    type = 'affect'
    funs = [match[1], match[2]]
    ;[min, max] = [0, 1]
    step = 1
  } else {
    type = 'unknown'
    funs = [fun]
  }

  return { type, funs: funs.map(f => f.trim()), min, max, step, recIndexes }
}
