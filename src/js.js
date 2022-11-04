// graphit - A free fast online plotter

// Copyright (C) 2012 Mounier Florian aka paradoxxxzero

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see http://www.gnu.org/licenses/.

class State {
  constructor() {
    this.pow = 1.1
    this.step = 1
    this.functions = [
      {
        expr: 'sin(pow(x, 4))/x',
        type: 'linear',
        error: false,
      },
    ]
    for (let n = 1; n <= 15; n++) {
      this.functions[n] = {
        expr: '',
        type: 'linear',
        error: false,
      }
    }
    this.selected = 0
    this.theme = 0
    this.polar_range = 2
    this.polar_step = 180
    this.parametric_range = 10
    this.parametric_step = 0.1
    this.reg = {
      X: {
        min: -pow(this.pow, 5),
        max: pow(this.pow, 5),
        zcoef: 5,
      },
      Y: {
        min: -pow(this.pow, 5),
        max: pow(this.pow, 5),
        zcoef: 5,
      },
      tickSize: 5,
    }
  }
}

class GraphIt {
  static initClass() {
    this.prototype.function_types = {
      linear: {
        symbol: '&#x1D487;',
        next: 'polar',
      },
      polar: {
        symbol: '&#x1D746;',
        next: 'horizontal',
      },
      horizontal: {
        symbol: '&#x1D489;',
        next: 'parametric',
      },
      parametric: {
        symbol: '&#x1D499;',
        next: 'linear',
      },
    }

    this.prototype.themes = ['tango', 'pastel', 'white']

    this.prototype.dragging = {
      on: false,
      x: 0,
      y: 0,
    }
  }

  size() {
    return (this.scr = {
      h: (this.canvas.height = window.innerHeight - 25),
      w: (this.canvas.width = window.innerWidth),
    })
  }

  x2X(x) {
    return (
      this.state.reg.X.min +
      (x * (this.state.reg.X.max - this.state.reg.X.min)) / this.scr.w
    )
  }

  X2x(X) {
    return (
      (this.scr.w * (X - this.state.reg.X.min)) /
      (this.state.reg.X.max - this.state.reg.X.min)
    )
  }

  dx2DX(dx) {
    return (dx * (this.state.reg.X.max - this.state.reg.X.min)) / this.scr.w
  }

  y2Y(y) {
    return (
      this.state.reg.Y.min +
      ((this.scr.h - y) * (this.state.reg.Y.max - this.state.reg.Y.min)) /
        this.scr.h
    )
  }

  Y2y(Y) {
    return (
      this.scr.h -
      (this.scr.h * (Y - this.state.reg.Y.min)) /
        (this.state.reg.Y.max - this.state.reg.Y.min)
    )
  }

  dy2DY(dy) {
    return (dy * (this.state.reg.Y.max - this.state.reg.Y.min)) / this.scr.h
  }

  updateBox() {
    $('#pft').html(
      this.function_types[this.state.functions[this.state.selected].type].symbol
    )
    $('#nft').addClass('line-color-' + this.state.selected)
    return $('#nft').text(this.state.selected)
  }

  prepareFunction(ftexp) {
    return ftexp.split(';')
  }

  newSelected() {
    $('#ft').val(this.state.functions[this.state.selected].expr)
    if (this.state.functions[this.state.selected].error) {
      $('#ft').addClass('error')
    } else {
      $('#ft').removeClass('error')
    }
    return this.updateBox()
  }

  linear(funct, f) {
    let lineNext = false
    return (() => {
      const result = []
      for (
        let x = 0, end = this.scr.w, asc = 0 <= end;
        asc ? x <= end : x >= end;
        asc ? x++ : x--
      ) {
        const Y = funct[0](this.x2X(x))
        if (isFinite(Y)) {
          const y = this.Y2y(Y)
          if (lineNext) {
            result.push(this.c.lineTo(x, y))
          } else {
            this.c.moveTo(x, y)
            result.push((lineNext = true))
          }
        } else {
          result.push((lineNext = false))
        }
      }
      return result
    })()
  }

  horizontal(funct, f) {
    let lineNext = false
    return (() => {
      const result = []
      for (
        let y = 0, end = this.scr.h, asc = 0 <= end;
        asc ? y <= end : y >= end;
        asc ? y++ : y--
      ) {
        const Y = this.y2Y(y)
        const X = funct[0](Y)
        if (isFinite(X)) {
          const x = this.X2x(X)
          if (lineNext) {
            result.push(this.c.lineTo(x, y))
          } else {
            this.c.moveTo(x, y)
            result.push((lineNext = true))
          }
        } else {
          result.push((lineNext = false))
        }
      }
      return result
    })()
  }

  polar(funct, f) {
    let lineNext = false
    return (() => {
      const result = []
      for (
        let o = 0,
          end = this.state.polar_range * pi,
          step = pi / this.state.polar_step,
          asc = step > 0;
        asc ? o <= end : o >= end;
        o += step
      ) {
        const r = funct[0](o)
        if (isFinite(r)) {
          const X = r * cos(o)
          const Y = r * sin(o)
          const x = this.X2x(X)
          const y = this.Y2y(Y)
          if (lineNext) {
            result.push(this.c.lineTo(x, y))
          } else {
            this.c.moveTo(x, y)
            result.push((lineNext = true))
          }
        } else {
          result.push((lineNext = false))
        }
      }
      return result
    })()
  }

  parametric(funct, f) {
    let lineNext = false
    return (() => {
      const result = []
      for (
        let t = 0,
          end = this.state.parametric_range,
          step = this.state.parametric_step,
          asc = step > 0;
        asc ? t <= end : t >= end;
        t += step
      ) {
        const X = funct[0](t)
        const Y = funct[1](t)
        if (isFinite(X) && isFinite(Y)) {
          const x = this.X2x(X)
          const y = this.Y2y(Y)
          if (lineNext) {
            result.push(this.c.lineTo(x, y))
          } else {
            this.c.moveTo(x, y)
            result.push((lineNext = true))
          }
        } else {
          result.push((lineNext = false))
        }
      }
      return result
    })()
  }

  plot() {
    $('#ft').removeClass('error')
    const time = new Date().getTime()
    for (let i = 0; i < this.state.functions.length; i++) {
      const f = this.state.functions[i]
      if (f.expr === '') {
        break
      }
      this.c.strokeStyle = $('.line-color-' + i).css('color')
      this.c.beginPath()
      try {
        this[f.type](
          Array.from(this.prepareFunction(f.expr)).map(
            fun => new Function('x', 'return ' + fun)
          ),
          f
        )
      } catch (e) {
        console.log(e)
        f.error = true
        break
      }
      f.error = false
      this.c.stroke()
      location.hash = btoa(JSON.stringify(this.state))
    }
    document.title = new Date().getTime() - time + 'ms'
    if (this.state.functions[this.state.selected].error) {
      return $('#ft').addClass('error')
    }
  }

  replot() {
    let s, st
    let asc, end, step
    let asc1, end1, step1
    this.c.fillStyle = $('.bg').css('color')
    this.c.strokeStyle = $('.axis').css('color')
    this.c.fillRect(0, 0, this.scr.w, this.scr.h)
    const xX0 = min(max(this.X2x(0), 0), this.scr.w)
    const yY0 = min(max(this.Y2y(0), 0), this.scr.h)
    const isRight = xX0 > this.scr.w / 2
    const isBottom = yY0 > this.scr.h / 2
    this.c.beginPath()
    this.c.moveTo(0, yY0)
    this.c.lineTo(this.scr.w, yY0)
    this.c.moveTo(xX0, 0)
    this.c.lineTo(xX0, this.scr.h)
    this.c.stroke()
    this.c.beginPath()
    this.c.fillStyle = $('.ticknum').css('color')
    const range = {
      X: this.state.reg.X.max - this.state.reg.X.min,
      Y: this.state.reg.Y.max - this.state.reg.Y.min,
    }

    const order = {
      X: floor(log(range.X) / log(10)),
      Y: floor(log(range.Y) / log(10)),
    }

    const ten = {
      X: pow(10, order.X),
      Y: pow(10, order.Y),
    }

    const fixrange = {
      X: abs(ceil(log(1 / ten.X) / log(10))),
      Y: abs(ceil(log(1 / ten.Y) / log(10))),
    }

    if (range.X < 2.5 * ten.X) {
      ten.X *= 0.25
      fixrange.X += 2
    } else if (range.X < 5 * ten.X) {
      ten.X *= 0.5
      fixrange.X++
    }
    if (range.Y < 2.5 * ten.Y) {
      ten.Y *= 0.25
      fixrange.Y += 2
    } else if (range.Y < 5 * ten.Y) {
      fixrange.Y++
      ten.Y *= 0.5
    }
    const minima = {
      X: floor(this.state.reg.X.min / ten.X) * ten.X,
      Y: floor(this.state.reg.Y.min / ten.Y) * ten.Y,
    }

    const maxima = {
      X: floor(this.state.reg.X.max / ten.X) * ten.X,
      Y: floor(this.state.reg.Y.max / ten.Y) * ten.Y,
    }

    for (
      s = minima.X, end = maxima.X, step = ten.X, asc = step > 0;
      asc ? s <= end : s >= end;
      s += step
    ) {
      const x = this.X2x(s)
      st = ten.X < 1 ? s.toFixed(fixrange.X) : s
      if (parseFloat(st) !== 0) {
        this.c.moveTo(x, yY0 - (isBottom ? this.state.reg.tickSize : 0))
        this.c.lineTo(x, yY0 + (isBottom ? 0 : this.state.reg.tickSize))
        this.c.fillText(
          st,
          x - 3,
          yY0 +
            (1.5 * this.state.reg.tickSize + (isBottom ? 2 : 10)) *
              (isBottom ? -1 : 1)
        )
      }
    }
    for (
      s = minima.Y, end1 = maxima.Y, step1 = ten.X, asc1 = step1 > 0;
      asc1 ? s <= end1 : s >= end1;
      s += step1
    ) {
      const y = this.Y2y(s)
      st = abs(ten.Y) < 1 ? s.toFixed(fixrange.Y) : s
      if (parseFloat(st) !== 0) {
        this.c.moveTo(xX0 + (isRight ? 0 : this.state.reg.tickSize), y)
        this.c.lineTo(xX0 - (isRight ? this.state.reg.tickSize : 0), y)
        this.c.fillText(
          st,
          xX0 +
            (1.5 * this.state.reg.tickSize +
              (isRight ? 5 * new String(st).length : 0)) *
              (isRight ? -1 : 1),
          y + 3
        )
      }
    }
    this.c.stroke()
    this.c.fillStyle = $('.bg').css('color')
    return this.plot()
  }

  constructor() {
    let $canvas, $ft
    if (location.hash !== '') {
      this.state = JSON.parse(atob(location.hash.slice(1)))
    } else {
      this.state = new State()
    }

    ;($ft = $('#ft'))
      .bind('input', () => {
        const functionValue = $ft.val()
        this.state.functions[this.state.selected].expr = functionValue
        return this.replot()
      })
      .keydown(function (e) {
        if (
          !((e.ctrlKey && e.keyCode === 32) || [33, 34].includes(e.keyCode))
        ) {
          return e.stopPropagation()
        }
      })

    ;($canvas = $('#canvas'))
      .mousedown(event => {
        this.dragging.on = true
        this.dragging.x = event.clientX
        this.dragging.y = event.clientY
        event.stopPropagation()
        $('body').addClass('moving')
        $('#ft').blur()
        return false
      })
      .mousemove(event => {
        if (!this.dragging.on) {
          return
        }
        const DX = this.dx2DX(this.dragging.x - event.clientX)
        const DY = this.dy2DY(this.dragging.y - event.clientY)

        this.state.reg.X.min += DX
        this.state.reg.X.max += DX
        this.state.reg.Y.min -= DY
        this.state.reg.Y.max -= DY
        this.dragging.x = event.clientX
        this.dragging.y = event.clientY
        event.stopPropagation()
        this.replot()
        return false
      })
      .mouseup(event => {
        this.dragging.on = false
        event.stopPropagation()
        $('body').removeClass('moving')
        return false
      })
      .mouseout(function () {
        return $(this).trigger('mouseup')
      })
      .mousewheel((event, delta) => {
        let dy
        let dx = (dy = 0)
        if (delta < 0) {
          if (!event.shiftKey && this.mode !== 'y') {
            this.state.reg.X.zcoef += this.state.step
            dx =
              (pow(this.state.pow, this.state.step) - 1) *
              pow(this.state.pow, this.state.reg.X.zcoef - this.state.step)
          }
          if (!event.altKey && this.mode !== 'x') {
            this.state.reg.Y.zcoef += this.state.step
            dy =
              (pow(this.state.pow, this.state.step) - 1) *
              pow(this.state.pow, this.state.reg.Y.zcoef - this.state.step)
          }
        } else {
          if (!event.shiftKey && this.mode !== 'y') {
            dx =
              (1 - pow(this.state.pow, this.state.step)) *
              pow(this.state.pow, this.state.reg.X.zcoef - this.state.step)
            this.state.reg.X.zcoef -= this.state.step
          }
          if (!event.altKey && this.mode !== 'x') {
            dy =
              (1 - pow(this.state.pow, this.state.step)) *
              pow(this.state.pow, this.state.reg.Y.zcoef - this.state.step)
            this.state.reg.Y.zcoef -= this.state.step
          }
        }

        this.state.reg.X.min -= (2 * dx * event.clientX) / this.scr.w
        this.state.reg.X.max +=
          (2 * dx * (this.scr.w - event.clientX)) / this.scr.w
        this.state.reg.Y.min -=
          (2 * dy * (this.scr.h - event.clientY)) / this.scr.h
        this.state.reg.Y.max += (2 * dy * event.clientY) / this.scr.h
        this.replot()
        event.stopPropagation()
        return false
      })
    $(window)
      .keydown(event => {
        let w
        if (event.keyCode === 88) {
          // x
          this.mode = 'x'
        } else if (event.keyCode === 89) {
          // y
          this.mode = 'y'
        } else {
          this.mode = null
        }

        if (event.keyCode === 82) {
          // r
          const rX = this.state.reg.X.max - this.state.reg.X.min
          const rY = this.state.reg.Y.max - this.state.reg.Y.min
          this.state.reg.X.min = -rX / 2
          this.state.reg.X.max = rX / 2
          this.state.reg.Y.min = -rY / 2
          this.state.reg.Y.max = rY / 2
        } else if (event.keyCode === 84) {
          // t
          this.state.reg.X.zcoef = this.state.reg.Y.zcoef = 5
          const nwx = pow(this.state.pow, this.state.reg.X.zcoef)
          const nwy = pow(this.state.pow, this.state.reg.Y.zcoef)

          this.state.reg.X.min = -nwx
          this.state.reg.X.max = nwx
          this.state.reg.Y.min = -nwy
          this.state.reg.Y.max = nwy
        } else if (event.keyCode === 83) {
          // s
          $('#theme')[0].href =
            this.themes[++this.state.theme % this.themes.length] + '.css'
        } else if (event.keyCode === 77) {
          // m
          this.state.polar_range *= 2
        } else if (event.keyCode === 76) {
          // l
          this.state.polar_range /= 2
        } else if (event.keyCode === 80) {
          // p
          this.state.polar_step *= 2
        } else if (event.keyCode === 79) {
          // o
          this.state.polar_step /= 2
        } else if (event.keyCode === 39) {
          // Right
          w = this.state.reg.X.max - this.state.reg.X.min
          this.state.reg.X.min += w / 10
          this.state.reg.X.max += w / 10
        } else if (event.keyCode === 37) {
          // Left
          w = this.state.reg.X.max - this.state.reg.X.min
          this.state.reg.X.min -= w / 10
          this.state.reg.X.max -= w / 10
        } else if (event.keyCode === 38) {
          // Up
          w = this.state.reg.Y.max - this.state.reg.Y.min
          this.state.reg.Y.min += w / 10
          this.state.reg.Y.max += w / 10
        } else if (event.keyCode === 40) {
          // Down
          w = this.state.reg.Y.max - this.state.reg.Y.min
          this.state.reg.Y.min -= w / 10
          this.state.reg.Y.max -= w / 10
        } else if (event.ctrlKey && event.keyCode === 32) {
          this.state.functions[this.state.selected].type =
            this.function_types[
              this.state.functions[this.state.selected].type
            ].next
          this.updateBox()
          this.replot()
        } else if (event.keyCode === 33) {
          // PageUp
          $('#nft').removeClass('line-color-' + this.state.selected)
          this.state.selected++
          if (this.state.selected > 15) {
            this.state.selected = 0
          }
          this.newSelected()
        } else if (event.keyCode === 34) {
          // PageUp
          $('#nft').removeClass('line-color-' + this.state.selected)
          this.state.selected--
          if (this.state.selected < 0) {
            this.state.selected = 15
          }
          this.newSelected()
        } else if (event.keyCode === 46) {
          // Suppr
          this.state = new State()
          location.hash = ''
          this.updateBox()
          $('#nft').removeClass('line-color-' + this.state.selected)
          $('#ft').val(this.state.functions[this.state.selected].expr)
          $('#ft').trigger('input')
        } else {
          return
        }
        return this.replot()
      })
      .resize(() => {
        this.size()
        return this.replot()
      })

    this.canvas = $canvas.get(0)
    this.c = this.canvas.getContext('2d')
    this.size()
    this.updateBox()

    $ft.val(this.state.functions[this.state.selected].expr)
    $ft.trigger('input')
  }
}
GraphIt.initClass()

$(function () {
  let graphit
  return (graphit = new GraphIt())
})

// Horrible hack to get rid of the math module:
for (let key of Array.from(Object.getOwnPropertyNames(Math))) {
  window[key.toLowerCase()] = Math[key]
}
