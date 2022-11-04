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
