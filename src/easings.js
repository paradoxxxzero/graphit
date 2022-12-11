import { clamp, lerp } from './utils'

// Adapted from https://gist.github.com/cjddmut/d789b9eb78216998e95c
export const linear = (start, end, value) => {
  return lerp(start, end, value)
}

export const spring = (start, end, value) => {
  value = clamp(value, 0, 1)
  value =
    (Math.sin(value * Math.PI * (0.2 + 2.5 * value * value * value)) *
      Math.pow(1 - value, 2.2) +
      value) *
    (1 + 1.2 * (1 - value))
  return start + (end - start) * value
}

export const easeInQuad = (start, end, value) => {
  end -= start
  return end * value * value + start
}

export const easeOutQuad = (start, end, value) => {
  end -= start
  return -end * value * (value - 2) + start
}

export const easeInOutQuad = (start, end, value) => {
  value /= 0.5
  end -= start
  if (value < 1) {
    return end * 0.5 * value * value + start
  }
  value--
  return -end * 0.5 * (value * (value - 2) - 1) + start
}

export const easeInCubic = (start, end, value) => {
  end -= start
  return end * value * value * value + start
}

export const easeOutCubic = (start, end, value) => {
  value--
  end -= start
  return end * (value * value * value + 1) + start
}

export const easeInOutCubic = (start, end, value) => {
  value /= 0.5
  end -= start
  if (value < 1) {
    return end * 0.5 * value * value * value + start
  }
  value -= 2
  return end * 0.5 * (value * value * value + 2) + start
}

export const easeInQuart = (start, end, value) => {
  end -= start
  return end * value * value * value * value + start
}

export const easeOutQuart = (start, end, value) => {
  value--
  end -= start
  return -end * (value * value * value * value - 1) + start
}

export const easeInOutQuart = (start, end, value) => {
  value /= 0.5
  end -= start
  if (value < 1) {
    return end * 0.5 * value * value * value * value + start
  }
  value -= 2
  return -end * 0.5 * (value * value * value * value - 2) + start
}

export const easeInQuint = (start, end, value) => {
  end -= start
  return end * value * value * value * value * value + start
}

export const easeOutQuint = (start, end, value) => {
  value--
  end -= start
  return end * (value * value * value * value * value + 1) + start
}

export const easeInOutQuint = (start, end, value) => {
  value /= 0.5
  end -= start
  if (value < 1) {
    return end * 0.5 * value * value * value * value * value + start
  }
  value -= 2
  return end * 0.5 * (value * value * value * value * value + 2) + start
}

export const easeInSine = (start, end, value) => {
  end -= start
  return -end * Math.cos(value * (Math.PI * 0.5)) + end + start
}

export const easeOutSine = (start, end, value) => {
  end -= start
  return end * Math.sin(value * (Math.PI * 0.5)) + start
}

export const easeInOutSine = (start, end, value) => {
  end -= start
  return -end * 0.5 * (Math.cos(Math.PI * value) - 1) + start
}

export const easeInExpo = (start, end, value) => {
  end -= start
  return end * Math.pow(2, 10 * (value - 1)) + start
}

export const easeOutExpo = (start, end, value) => {
  end -= start
  return end * (-Math.pow(2, -10 * value) + 1) + start
}

export const easeInOutExpo = (start, end, value) => {
  value /= 0.5
  end -= start
  if (value < 1) {
    return end * 0.5 * Math.pow(2, 10 * (value - 1)) + start
  }
  value--
  return end * 0.5 * (-Math.pow(2, -10 * value) + 2) + start
}

export const easeInCirc = (start, end, value) => {
  end -= start
  return -end * (Math.sqrt(1 - value * value) - 1) + start
}

export const easeOutCirc = (start, end, value) => {
  value--
  end -= start
  return end * Math.sqrt(1 - value * value) + start
}

export const easeInOutCirc = (start, end, value) => {
  value /= 0.5
  end -= start
  if (value < 1) {
    return -end * 0.5 * (Math.sqrt(1 - value * value) - 1) + start
  }
  value -= 2
  return end * 0.5 * (Math.sqrt(1 - value * value) + 1) + start
}

export const easeInBounce = (start, end, value) => {
  end -= start
  const d = 1
  return end - easeOutBounce(0, end, d - value) + start
}

export const easeOutBounce = (start, end, value) => {
  value /= 1
  end -= start
  if (value < 1 / 2.75) {
    return end * (7.5625 * value * value) + start
  } else if (value < 2 / 2.75) {
    value -= 1.5 / 2.75
    return end * (7.5625 * value * value + 0.75) + start
  } else if (value < 2.5 / 2.75) {
    value -= 2.25 / 2.75
    return end * (7.5625 * value * value + 0.9375) + start
  } else {
    value -= 2.625 / 2.75
    return end * (7.5625 * value * value + 0.984375) + start
  }
}

export const easeInOutBounce = (start, end, value) => {
  end -= start
  const d = 1
  if (value < d * 0.5) {
    return easeInBounce(0, end, value * 2) * 0.5 + start
  } else return easeOutBounce(0, end, value * 2 - d) * 0.5 + end * 0.5 + start
}

export const easeInBack = (start, end, value) => {
  end -= start
  value /= 1
  let s = 1.70158
  return end * value * value * ((s + 1) * value - s) + start
}

export const easeOutBack = (start, end, value) => {
  let s = 1.70158
  end -= start
  value = value - 1
  return end * (value * value * ((s + 1) * value + s) + 1) + start
}

export const easeInOutBack = (start, end, value) => {
  let s = 1.70158
  end -= start
  value /= 0.5
  if (value < 1) {
    s *= 1.525
    return end * 0.5 * (value * value * ((s + 1) * value - s)) + start
  }
  value -= 2
  s *= 1.525
  return end * 0.5 * (value * value * ((s + 1) * value + s) + 2) + start
}

export const easeInElastic = (start, end, value) => {
  end -= start

  let d = 1
  let p = d * 0.3
  let s
  let a = 0

  if (value == 0) {
    return start
  }

  if ((value /= d) == 1) {
    return start + end
  }

  if (a == 0 || a < Math.abs(end)) {
    a = end
    s = p / 4
  } else {
    s = (p / (2 * Math.PI)) * Math.asin(end / a)
  }

  return (
    -(
      a *
      Math.pow(2, 10 * (value -= 1)) *
      Math.sin(((value * d - s) * (2 * Math.PI)) / p)
    ) + start
  )
}

export const easeOutElastic = (start, end, value) => {
  end -= start

  let d = 1
  let p = d * 0.3
  let s
  let a = 0

  if (value == 0) {
    return start
  }

  if ((value /= d) == 1) {
    return start + end
  }

  if (a == 0 || a < Math.abs(end)) {
    a = end
    s = p * 0.25
  } else {
    s = (p / (2 * Math.PI)) * Math.asin(end / a)
  }

  return (
    a *
      Math.pow(2, -10 * value) *
      Math.sin(((value * d - s) * (2 * Math.PI)) / p) +
    end +
    start
  )
}

export const easeInOutElastic = (start, end, value) => {
  end -= start

  let d = 1
  let p = d * 0.3
  let s
  let a = 0

  if (value == 0) {
    return start
  }

  if ((value /= d * 0.5) == 2) {
    return start + end
  }

  if (a == 0 || a < Math.abs(end)) {
    a = end
    s = p / 4
  } else {
    s = (p / (2 * Math.PI)) * Math.asin(end / a)
  }

  if (value < 1) {
    return (
      -0.5 *
        (a *
          Math.pow(2, 10 * (value -= 1)) *
          Math.sin(((value * d - s) * (2 * Math.PI)) / p)) +
      start
    )
  }
  return (
    a *
      Math.pow(2, -10 * (value -= 1)) *
      Math.sin(((value * d - s) * (2 * Math.PI)) / p) *
      0.5 +
    end +
    start
  )
}

export const linearD = (start, end) => {
  return end - start
}

export const easeInQuadD = (start, end, value) => {
  return 2 * (end - start) * value
}

export const easeOutQuadD = (start, end, value) => {
  end -= start
  return -end * value - end * (value - 2)
}

export const easeInOutQuadD = (start, end, value) => {
  value /= 0.5
  end -= start

  if (value < 1) {
    return end * value
  }

  value--

  return end * (1 - value)
}

export const easeInCubicD = (start, end, value) => {
  return 3 * (end - start) * value * value
}

export const easeOutCubicD = (start, end, value) => {
  value--
  end -= start
  return 3 * end * value * value
}

export const easeInOutCubicD = (start, end, value) => {
  value /= 0.5
  end -= start

  if (value < 1) {
    return (3 / 2) * end * value * value
  }

  value -= 2

  return (3 / 2) * end * value * value
}

export const easeInQuartD = (start, end, value) => {
  return 4 * (end - start) * value * value * value
}

export const easeOutQuartD = (start, end, value) => {
  value--
  end -= start
  return -4 * end * value * value * value
}

export const easeInOutQuartD = (start, end, value) => {
  value /= 0.5
  end -= start

  if (value < 1) {
    return 2 * end * value * value * value
  }

  value -= 2

  return -2 * end * value * value * value
}

export const easeInQuintD = (start, end, value) => {
  return 5 * (end - start) * value * value * value * value
}

export const easeOutQuintD = (start, end, value) => {
  value--
  end -= start
  return 5 * end * value * value * value * value
}

export const easeInOutQuintD = (start, end, value) => {
  value /= 0.5
  end -= start

  if (value < 1) {
    return (5 / 2) * end * value * value * value * value
  }

  value -= 2

  return (5 / 2) * end * value * value * value * value
}

export const easeInSineD = (start, end, value) => {
  return (end - start) * 0.5 * Math.PI * Math.sin(0.5 * Math.PI * value)
}

export const easeOutSineD = (start, end, value) => {
  end -= start
  return Math.PI * 0.5 * end * Math.cos(value * (Math.PI * 0.5))
}

export const easeInOutSineD = (start, end, value) => {
  end -= start
  return end * 0.5 * Math.PI * Math.sin(Math.PI * value)
}
export const easeInExpoD = (start, end, value) => {
  return 10 * Math.LN2 * (end - start) * Math.pow(2, 10 * (value - 1))
}

export const easeOutExpoD = (start, end, value) => {
  end -= start
  return 5 * Math.LN2 * end * Math.pow(2, 1 - 10 * value)
}

export const easeInOutExpoD = (start, end, value) => {
  value /= 0.5
  end -= start

  if (value < 1) {
    return 5 * Math.LN2 * end * Math.pow(2, 10 * (value - 1))
  }

  value--

  return (5 * Math.LN2 * end) / Math.pow(2, 10 * value)
}

export const easeInCircD = (start, end, value) => {
  return ((end - start) * value) / Math.sqrt(1 - value * value)
}

export const easeOutCircD = (start, end, value) => {
  value--
  end -= start
  return (-end * value) / Math.sqrt(1 - value * value)
}

export const easeInOutCircD = (start, end, value) => {
  value /= 0.5
  end -= start

  if (value < 1) {
    return (end * value) / (2 * Math.sqrt(1 - value * value))
  }

  value -= 2

  return (-end * value) / (2 * Math.sqrt(1 - value * value))
}

export const easeInBounceD = (start, end, value) => {
  end -= start
  const d = 1

  return easeOutBounceD(0, end, d - value)
}

export const easeOutBounceD = (start, end, value) => {
  value /= 1
  end -= start

  if (value < 1 / 2.75) {
    return 2 * end * 7.5625 * value
  } else if (value < 2 / 2.75) {
    value -= 1.5 / 2.75
    return 2 * end * 7.5625 * value
  } else if (value < 2.5 / 2.75) {
    value -= 2.25 / 2.75
    return 2 * end * 7.5625 * value
  } else {
    value -= 2.625 / 2.75
    return 2 * end * 7.5625 * value
  }
}

export const easeInOutBounceD = (start, end, value) => {
  end -= start
  const d = 1

  if (value < d * 0.5) {
    return easeInBounceD(0, end, value * 2) * 0.5
  } else {
    return easeOutBounceD(0, end, value * 2 - d) * 0.5
  }
}

export const easeInBackD = (start, end, value) => {
  let s = 1.70158

  return (
    3 * (s + 1) * (end - start) * value * value - 2 * s * (end - start) * value
  )
}

export const easeOutBackD = (start, end, value) => {
  let s = 1.70158
  end -= start
  value = value - 1

  return end * ((s + 1) * value * value + 2 * value * ((s + 1) * value + s))
}

export const easeInOutBackD = (start, end, value) => {
  let s = 1.70158
  end -= start
  value /= 0.5

  if (value < 1) {
    s *= 1.525
    return (
      0.5 * end * (s + 1) * value * value + end * value * ((s + 1) * value - s)
    )
  }

  value -= 2
  s *= 1.525
  return (
    0.5 * end * ((s + 1) * value * value + 2 * value * ((s + 1) * value + s))
  )
}

export const easeInElasticD = (start, end, value) => {
  return easeOutElasticD(start, end, 1 - value)
}

export const easeOutElasticD = (start, end, value) => {
  end -= start

  let d = 1
  let p = d * 0.3
  let s
  let a = 0

  if (a == 0 || a < Math.abs(end)) {
    a = end
    s = p * 0.25
  } else {
    s = (p / (2 * Math.PI)) * Math.asin(end / a)
  }

  return (
    (a *
      Math.PI *
      d *
      Math.pow(2, 1 - 10 * value) *
      Math.cos((2 * Math.PI * (d * value - s)) / p)) /
      p -
    5 *
      Math.LN2 *
      a *
      Math.pow(2, 1 - 10 * value) *
      Math.sin((2 * Math.PI * (d * value - s)) / p)
  )
}

export const easeInOutElasticD = (start, end, value) => {
  end -= start

  let d = 1
  let p = d * 0.3
  let s
  let a = 0

  if (a == 0 || a < Math.abs(end)) {
    a = end
    s = p / 4
  } else {
    s = (p / (2 * Math.PI)) * Math.asin(end / a)
  }

  if (value < 1) {
    value -= 1

    return (
      -5 *
        Math.LN2 *
        a *
        Math.pow(2, 10 * value) *
        Math.sin((2 * Math.PI * (d * value - 2)) / p) -
      (a *
        Math.PI *
        d *
        Math.pow(2, 10 * value) *
        Math.cos((2 * Math.PI * (d * value - s)) / p)) /
        p
    )
  }

  value -= 1

  return (
    (a * Math.PI * d * Math.cos((2 * Math.PI * (d * value - s)) / p)) /
      (p * Math.pow(2, 10 * value)) -
    (5 * Math.LN2 * a * Math.sin((2 * Math.PI * (d * value - s)) / p)) /
      Math.pow(2, 10 * value)
  )
}

export const springD = (start, end, value) => {
  value = Math.Clamp01(value)
  end -= start

  // Damn... Thanks http://www.derivative-calculator.net/
  // TODO: And it's a little bit wrong
  return (
    end *
      ((6 * (1 - value)) / 5 + 1) *
      (-2.2 *
        Math.pow(1 - value, 1.2) *
        Math.sin(Math.PI * value * (2.5 * value * value * value + 0.2)) +
        Math.pow(1 - value, 2.2) *
          (Math.PI * (2.5 * value * value * value + 0.2) +
            7.5 * Math.PI * value * value * value) *
          Math.cos(Math.PI * value * (2.5 * value * value * value + 0.2)) +
        1) -
    6 *
      end *
      (Math.pow(1 - value, 2.2) *
        Math.sin(Math.PI * value * (2.5 * value * value * value + 0.2)) +
        value / 5)
  )
}
