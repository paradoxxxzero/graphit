export default {
  // Sound functions
  sound: {
    adsr: 'adsr usage: (x, attack = 0.2, decay = 0.1, sustain = 0.4, release = 0.3, sustainLevel = 0.5, duration = <sound duration>)',
    osc: 'osc usage: (freq, type = sine|square|smoothsquare|sawtooth|triangle|noise, smooth = 0.5)',
    oscs: 'oscs usage: (freqs, type = sine|square|smoothsquare|sawtooth|triangle|noise, smooth = 0.5)',
    sine: 'sine usage: (freq)',
    square: 'square usage: (freq)',
    smoothsquare: 'smoothsquare usage: (freq, smooth = 0.5)',
    sawtooth: 'sawtooth usage: (freq)',
    triangle: 'triangle usage: (freq)',
    noise: 'noise usage: ()',
    lowpass: 'lowpass usage: (x, cutoff)',
    highpass: 'highpass usage: (x, cutoff)',
    segment: 'segment usage: (x, ...pairs)',
    at: 'at usage: (d, f, x)',
  },

  // MATH functions
  math: {
    abs: 'Returns the absolute value of x.',
    acos: 'Returns the arccosine of x.',
    acosh: 'Returns the hyperbolic arccosine of x.',
    asin: 'Returns the arcsine of x.',
    asinh: 'Returns the hyperbolic arcsine of a number.',
    atan: 'Returns the arctangent of x.',
    atanh: 'Returns the hyperbolic arctangent of x.',
    atan2: 'Returns the arctangent of the quotient of its arguments.',
    cbrt: 'Returns the cube root of x.',
    ceil: 'Returns the smallest integer greater than or equal to x.',
    clz32: 'Returns the number of leading zero bits of the 32-bit integer x.',
    cos: 'Returns the cosine of x.',
    cosh: 'Returns the hyperbolic cosine of x.',
    exp: "Returns ex, where x is the argument, and e is Euler's constant (2.718…, the base of the natural logarithm).",
    expm1: 'Returns subtracting 1 from exp(x).',
    floor: 'Returns the largest integer less than or equal to x.',
    fround: 'Returns the nearest single precision float representation of x.',
    hypot: 'Returns the square root of the sum of squares of its arguments.',
    imul: 'Returns the result of the 32-bit integer multiplication of x and y.',
    log: 'Returns the natural logarithm (㏒e; also, ㏑) of x.',
    log1p:
      'Returns the natural logarithm (㏒e; also ㏑) of 1 + x for the number x.',
    log10: 'Returns the base-10 logarithm of x.',
    log2: 'Returns the base-2 logarithm of x.',
    max: 'Returns the largest of zero or more numbers.',
    min: 'Returns the smallest of zero or more numbers.',
    pow: 'Returns base x to the exponent power y (that is, xy).',
    random: 'Returns a pseudo-random number between 0 and 1.',
    round: 'Returns the value of the number x rounded to the nearest integer.',
    sign: 'Returns the sign of the x, indicating whether x is positive, negative, or zero.',
    sin: 'Returns the sine of x.',
    sinh: 'Returns the hyperbolic sine of x.',
    sqrt: 'Returns the positive square root of x.',
    tan: 'Returns the tangent of x.',
    tanh: 'Returns the hyperbolic tangent of x.',
    trunc: 'Returns the integer portion of x, removing any fractional digits.',
  },

  // Math constants
  constant: {
    e: "Euler's constant and the base of natural logarithms; approximately 2.718.",
    ln2: 'Natural logarithm of 2; approximately 0.693.',
    ln10: 'Natural logarithm of 10; approximately 2.303.',
    log2e: 'Base-2 logarithm of E; approximately 1.443.',
    log10e: 'Base-10 logarithm of E; approximately 0.434.',
    pi: "Ratio of a circle's circumference to its diameter; approximately 3.14159.",
    sqrt1_2: 'Square root of ½; approximately 0.707.',
    sqrt2: 'Square root of 2; approximately 1.414.',
  },

  // Utility functions
  util: {
    lerp: 'lerp usage: (x, y, a)',
    clamp: 'clamp usage: (x, min, max)',
  },

  // Graphit syntax
  graphit: {
    '@size': 'Plot each pixel',
    '@adaptative': 'Adaptative plot',
    '@auto': 'Better adaptative plot',
    '@!': 'Precision',
    '@/dot': 'Dot plot mode',
    '@/point': 'Point plot mode',
    '@/line': 'Line plot mode',
    '@ ': '@ x0 -> x1 : Plot range [x0;x1]',
  },
}
