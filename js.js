// Generated by CoffeeScript 1.8.0
var GraphIt, State, key, _i, _len, _ref;

State = (function() {
  function State() {
    var n, _i;
    this.pow = 1.1;
    this.step = 1;
    this.functions = [
      {
        expr: "sin(pow(x, 4))/x",
        type: 'linear',
        error: false
      }
    ];
    for (n = _i = 1; _i <= 15; n = ++_i) {
      this.functions[n] = {
        expr: "",
        type: 'linear',
        error: false
      };
    }
    this.selected = 0;
    this.theme = 0;
    this.polar_range = 2;
    this.polar_step = 180;
    this.parametric_range = 10;
    this.parametric_step = .1;
    this.reg = {
      X: {
        min: -pow(this.pow, 5),
        max: pow(this.pow, 5),
        zcoef: 5
      },
      Y: {
        min: -pow(this.pow, 5),
        max: pow(this.pow, 5),
        zcoef: 5
      },
      tickSize: 5
    };
  }

  return State;

})();

GraphIt = (function() {
  GraphIt.prototype.function_types = {
    linear: {
      symbol: "&#x1D487;",
      next: 'polar'
    },
    polar: {
      symbol: "&#x1D746;",
      next: 'horizontal'
    },
    horizontal: {
      symbol: "&#x1D489;",
      next: 'parametric'
    },
    parametric: {
      symbol: "&#x1D499;",
      next: 'linear'
    }
  };

  GraphIt.prototype.themes = ["tango", "pastel", "white"];

  GraphIt.prototype.dragging = {
    on: false,
    x: 0,
    y: 0
  };

  GraphIt.prototype.size = function() {
    return this.scr = {
      h: this.canvas.height = window.innerHeight - 25,
      w: this.canvas.width = window.innerWidth
    };
  };

  GraphIt.prototype.x2X = function(x) {
    return this.state.reg.X.min + (x * (this.state.reg.X.max - this.state.reg.X.min) / this.scr.w);
  };

  GraphIt.prototype.X2x = function(X) {
    return this.scr.w * (X - this.state.reg.X.min) / (this.state.reg.X.max - this.state.reg.X.min);
  };

  GraphIt.prototype.dx2DX = function(dx) {
    return dx * (this.state.reg.X.max - this.state.reg.X.min) / this.scr.w;
  };

  GraphIt.prototype.y2Y = function(y) {
    return this.state.reg.Y.min + ((this.scr.h - y) * (this.state.reg.Y.max - this.state.reg.Y.min) / this.scr.h);
  };

  GraphIt.prototype.Y2y = function(Y) {
    return this.scr.h - this.scr.h * (Y - this.state.reg.Y.min) / (this.state.reg.Y.max - this.state.reg.Y.min);
  };

  GraphIt.prototype.dy2DY = function(dy) {
    return dy * (this.state.reg.Y.max - this.state.reg.Y.min) / this.scr.h;
  };

  GraphIt.prototype.updateBox = function() {
    $("#pft").html(this.function_types[this.state.functions[this.state.selected].type].symbol);
    $("#nft").addClass("line-color-" + this.state.selected);
    return $("#nft").text(this.state.selected);
  };

  GraphIt.prototype.prepareFunction = function(ftexp) {
    return ftexp.split(';');
  };

  GraphIt.prototype.newSelected = function() {
    $("#ft").val(this.state.functions[this.state.selected].expr);
    if (this.state.functions[this.state.selected].error) {
      $("#ft").addClass("error");
    } else {
      $("#ft").removeClass("error");
    }
    return this.updateBox();
  };

  GraphIt.prototype.linear = function(funct, f) {
    var Y, lineNext, x, y, _i, _ref, _results;
    lineNext = false;
    _results = [];
    for (x = _i = 0, _ref = this.scr.w; 0 <= _ref ? _i <= _ref : _i >= _ref; x = 0 <= _ref ? ++_i : --_i) {
      Y = funct[0](this.x2X(x));
      if (isFinite(Y)) {
        y = this.Y2y(Y);
        if (lineNext) {
          _results.push(this.c.lineTo(x, y));
        } else {
          this.c.moveTo(x, y);
          _results.push(lineNext = true);
        }
      } else {
        _results.push(lineNext = false);
      }
    }
    return _results;
  };

  GraphIt.prototype.horizontal = function(funct, f) {
    var X, Y, lineNext, x, y, _i, _ref, _results;
    lineNext = false;
    _results = [];
    for (y = _i = 0, _ref = this.scr.h; 0 <= _ref ? _i <= _ref : _i >= _ref; y = 0 <= _ref ? ++_i : --_i) {
      Y = this.y2Y(y);
      X = funct[0](Y);
      if (isFinite(X)) {
        x = this.X2x(X);
        if (lineNext) {
          _results.push(this.c.lineTo(x, y));
        } else {
          this.c.moveTo(x, y);
          _results.push(lineNext = true);
        }
      } else {
        _results.push(lineNext = false);
      }
    }
    return _results;
  };

  GraphIt.prototype.polar = function(funct, f) {
    var X, Y, lineNext, o, r, x, y, _i, _ref, _ref1, _results;
    lineNext = false;
    _results = [];
    for (o = _i = 0, _ref = this.state.polar_range * pi, _ref1 = pi / this.state.polar_step; _ref1 > 0 ? _i <= _ref : _i >= _ref; o = _i += _ref1) {
      r = funct[0](o);
      if (isFinite(r)) {
        X = r * cos(o);
        Y = r * sin(o);
        x = this.X2x(X);
        y = this.Y2y(Y);
        if (lineNext) {
          _results.push(this.c.lineTo(x, y));
        } else {
          this.c.moveTo(x, y);
          _results.push(lineNext = true);
        }
      } else {
        _results.push(lineNext = false);
      }
    }
    return _results;
  };

  GraphIt.prototype.parametric = function(funct, f) {
    var X, Y, lineNext, t, x, y, _i, _ref, _ref1, _results;
    lineNext = false;
    _results = [];
    for (t = _i = 0, _ref = this.state.parametric_range, _ref1 = this.state.parametric_step; _ref1 > 0 ? _i <= _ref : _i >= _ref; t = _i += _ref1) {
      X = funct[0](t);
      Y = funct[1](t);
      if (isFinite(X) && isFinite(Y)) {
        x = this.X2x(X);
        y = this.Y2y(Y);
        if (lineNext) {
          _results.push(this.c.lineTo(x, y));
        } else {
          this.c.moveTo(x, y);
          _results.push(lineNext = true);
        }
      } else {
        _results.push(lineNext = false);
      }
    }
    return _results;
  };

  GraphIt.prototype.plot = function() {
    var e, f, fun, i, time, _i, _len, _ref;
    $("#ft").removeClass("error");
    time = new Date().getTime();
    _ref = this.state.functions;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      f = _ref[i];
      if (f.expr === "") {
        break;
      }
      this.c.strokeStyle = $(".line-color-" + i).css("color");
      this.c.beginPath();
      try {
        this[f.type]((function() {
          var _j, _len1, _ref1, _results;
          _ref1 = this.prepareFunction(f.expr);
          _results = [];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            fun = _ref1[_j];
            _results.push(new Function('x', 'return ' + fun));
          }
          return _results;
        }).call(this), f);
      } catch (_error) {
        e = _error;
        console.log(e);
        f.error = true;
        break;
      }
      f.error = false;
      this.c.stroke();
      location.hash = btoa(JSON.stringify(this.state));
    }
    document.title = (new Date().getTime() - time) + "ms";
    if (this.state.functions[this.state.selected].error) {
      return $("#ft").addClass("error");
    }
  };

  GraphIt.prototype.replot = function() {
    var fixrange, isBottom, isRight, maxima, minima, order, range, s, st, ten, x, xX0, y, yY0, _i, _j, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
    this.c.fillStyle = $(".bg").css("color");
    this.c.strokeStyle = $(".axis").css("color");
    this.c.fillRect(0, 0, this.scr.w, this.scr.h);
    xX0 = min(max(this.X2x(0), 0), this.scr.w);
    yY0 = min(max(this.Y2y(0), 0), this.scr.h);
    isRight = xX0 > this.scr.w / 2;
    isBottom = yY0 > this.scr.h / 2;
    this.c.beginPath();
    this.c.moveTo(0, yY0);
    this.c.lineTo(this.scr.w, yY0);
    this.c.moveTo(xX0, 0);
    this.c.lineTo(xX0, this.scr.h);
    this.c.stroke();
    this.c.beginPath();
    this.c.fillStyle = $(".ticknum").css("color");
    range = {
      X: this.state.reg.X.max - this.state.reg.X.min,
      Y: this.state.reg.Y.max - this.state.reg.Y.min
    };
    order = {
      X: floor(log(range.X) / log(10)),
      Y: floor(log(range.Y) / log(10))
    };
    ten = {
      X: pow(10, order.X),
      Y: pow(10, order.Y)
    };
    fixrange = {
      X: abs(ceil(log(1 / ten.X) / log(10))),
      Y: abs(ceil(log(1 / ten.Y) / log(10)))
    };
    if (range.X < 2.5 * ten.X) {
      ten.X *= .25;
      fixrange.X += 2;
    } else if (range.X < 5 * ten.X) {
      ten.X *= .5;
      fixrange.X++;
    }
    if (range.Y < 2.5 * ten.Y) {
      ten.Y *= .25;
      fixrange.Y += 2;
    } else if (range.Y < 5 * ten.Y) {
      fixrange.Y++;
      ten.Y *= .5;
    }
    minima = {
      X: floor(this.state.reg.X.min / ten.X) * ten.X,
      Y: floor(this.state.reg.Y.min / ten.Y) * ten.Y
    };
    maxima = {
      X: floor(this.state.reg.X.max / ten.X) * ten.X,
      Y: floor(this.state.reg.Y.max / ten.Y) * ten.Y
    };
    for (s = _i = _ref = minima.X, _ref1 = maxima.X, _ref2 = ten.X; _ref2 > 0 ? _i <= _ref1 : _i >= _ref1; s = _i += _ref2) {
      x = this.X2x(s);
      st = (ten.X < 1 ? s.toFixed(fixrange.X) : s);
      if (parseFloat(st) !== 0) {
        this.c.moveTo(x, yY0 - (isBottom ? this.state.reg.tickSize : 0));
        this.c.lineTo(x, yY0 + (isBottom ? 0 : this.state.reg.tickSize));
        this.c.fillText(st, x - 3, yY0 + (1.5 * this.state.reg.tickSize + (isBottom ? 2 : 10)) * (isBottom ? -1 : 1));
      }
    }
    for (s = _j = _ref3 = minima.Y, _ref4 = maxima.Y, _ref5 = ten.X; _ref5 > 0 ? _j <= _ref4 : _j >= _ref4; s = _j += _ref5) {
      y = this.Y2y(s);
      st = (abs(ten.Y) < 1 ? s.toFixed(fixrange.Y) : s);
      if (parseFloat(st) !== 0) {
        this.c.moveTo(xX0 + (isRight ? 0 : this.state.reg.tickSize), y);
        this.c.lineTo(xX0 - (isRight ? this.state.reg.tickSize : 0), y);
        this.c.fillText(st, xX0 + (1.5 * this.state.reg.tickSize + (isRight ? 5 * new String(st).length : 0)) * (isRight ? -1 : 1), y + 3);
      }
    }
    this.c.stroke();
    this.c.fillStyle = $(".bg").css("color");
    return this.plot();
  };

  function GraphIt() {
    var $canvas, $ft;
    if (location.hash !== "") {
      this.state = JSON.parse(atob(location.hash.slice(1)));
    } else {
      this.state = new State();
    }
    ($ft = $("#ft")).bind("input", (function(_this) {
      return function() {
        var functionValue;
        functionValue = $ft.val();
        _this.state.functions[_this.state.selected].expr = functionValue;
        return _this.replot();
      };
    })(this)).keydown(function(e) {
      var _ref;
      if (!((e.ctrlKey && e.keyCode === 32) || ((_ref = e.keyCode) === 33 || _ref === 34))) {
        return e.stopPropagation();
      }
    });
    ($canvas = $("#canvas")).mousedown((function(_this) {
      return function(event) {
        _this.dragging.on = true;
        _this.dragging.x = event.clientX;
        _this.dragging.y = event.clientY;
        event.stopPropagation();
        $("body").addClass("moving");
        $("#ft").blur();
        return false;
      };
    })(this)).mousemove((function(_this) {
      return function(event) {
        var DX, DY;
        if (!_this.dragging.on) {
          return;
        }
        DX = _this.dx2DX(_this.dragging.x - event.clientX);
        DY = _this.dy2DY(_this.dragging.y - event.clientY);
        _this.state.reg.X.min += DX;
        _this.state.reg.X.max += DX;
        _this.state.reg.Y.min -= DY;
        _this.state.reg.Y.max -= DY;
        _this.dragging.x = event.clientX;
        _this.dragging.y = event.clientY;
        event.stopPropagation();
        _this.replot();
        return false;
      };
    })(this)).mouseup((function(_this) {
      return function(event) {
        _this.dragging.on = false;
        event.stopPropagation();
        $("body").removeClass("moving");
        return false;
      };
    })(this)).mouseout(function() {
      return $(this).trigger('mouseup');
    }).mousewheel((function(_this) {
      return function(event, delta) {
        var dx, dy;
        dx = dy = 0;
        if (delta < 0) {
          if (!event.shiftKey && _this.mode !== "y") {
            _this.state.reg.X.zcoef += _this.state.step;
            dx = (pow(_this.state.pow, _this.state.step) - 1) * pow(_this.state.pow, _this.state.reg.X.zcoef - _this.state.step);
          }
          if (!event.altKey && _this.mode !== "x") {
            _this.state.reg.Y.zcoef += _this.state.step;
            dy = (pow(_this.state.pow, _this.state.step) - 1) * pow(_this.state.pow, _this.state.reg.Y.zcoef - _this.state.step);
          }
        } else {
          if (!event.shiftKey && _this.mode !== "y") {
            dx = (1 - pow(_this.state.pow, _this.state.step)) * pow(_this.state.pow, _this.state.reg.X.zcoef - _this.state.step);
            _this.state.reg.X.zcoef -= _this.state.step;
          }
          if (!event.altKey && _this.mode !== "x") {
            dy = (1 - pow(_this.state.pow, _this.state.step)) * pow(_this.state.pow, _this.state.reg.Y.zcoef - _this.state.step);
            _this.state.reg.Y.zcoef -= _this.state.step;
          }
        }
        _this.state.reg.X.min -= (2 * dx * event.clientX) / _this.scr.w;
        _this.state.reg.X.max += (2 * dx * (_this.scr.w - event.clientX)) / _this.scr.w;
        _this.state.reg.Y.min -= (2 * dy * (_this.scr.h - event.clientY)) / _this.scr.h;
        _this.state.reg.Y.max += (2 * dy * event.clientY) / _this.scr.h;
        _this.replot();
        event.stopPropagation();
        return false;
      };
    })(this));
    $(window).keydown((function(_this) {
      return function(event) {
        var nwx, nwy, rX, rY, w;
        if (event.keyCode === 88) {
          _this.mode = "x";
        } else if (event.keyCode === 89) {
          _this.mode = "y";
        } else {
          _this.mode = null;
        }
        if (event.keyCode === 82) {
          rX = _this.state.reg.X.max - _this.state.reg.X.min;
          rY = _this.state.reg.Y.max - _this.state.reg.Y.min;
          _this.state.reg.X.min = -rX / 2;
          _this.state.reg.X.max = rX / 2;
          _this.state.reg.Y.min = -rY / 2;
          _this.state.reg.Y.max = rY / 2;
        } else if (event.keyCode === 84) {
          _this.state.reg.X.zcoef = _this.state.reg.Y.zcoef = 5;
          nwx = pow(_this.state.pow, _this.state.reg.X.zcoef);
          nwy = pow(_this.state.pow, _this.state.reg.Y.zcoef);
          _this.state.reg.X.min = -nwx;
          _this.state.reg.X.max = nwx;
          _this.state.reg.Y.min = -nwy;
          _this.state.reg.Y.max = nwy;
        } else if (event.keyCode === 83) {
          $("#theme")[0].href = _this.themes[++_this.state.theme % _this.themes.length] + ".css";
        } else if (event.keyCode === 77) {
          _this.state.polar_range *= 2;
        } else if (event.keyCode === 76) {
          _this.state.polar_range /= 2;
        } else if (event.keyCode === 80) {
          _this.state.polar_step *= 2;
        } else if (event.keyCode === 79) {
          _this.state.polar_step /= 2;
        } else if (event.keyCode === 39) {
          w = _this.state.reg.X.max - _this.state.reg.X.min;
          _this.state.reg.X.min += w / 10;
          _this.state.reg.X.max += w / 10;
        } else if (event.keyCode === 37) {
          w = _this.state.reg.X.max - _this.state.reg.X.min;
          _this.state.reg.X.min -= w / 10;
          _this.state.reg.X.max -= w / 10;
        } else if (event.keyCode === 38) {
          w = _this.state.reg.Y.max - _this.state.reg.Y.min;
          _this.state.reg.Y.min += w / 10;
          _this.state.reg.Y.max += w / 10;
        } else if (event.keyCode === 40) {
          w = _this.state.reg.Y.max - _this.state.reg.Y.min;
          _this.state.reg.Y.min -= w / 10;
          _this.state.reg.Y.max -= w / 10;
        } else if (event.ctrlKey && event.keyCode === 32) {
          _this.state.functions[_this.state.selected].type = _this.function_types[_this.state.functions[_this.state.selected].type].next;
          _this.updateBox();
          _this.replot();
        } else if (event.keyCode === 33) {
          $("#nft").removeClass("line-color-" + _this.state.selected);
          _this.state.selected++;
          if (_this.state.selected > 15) {
            _this.state.selected = 0;
          }
          _this.newSelected();
        } else if (event.keyCode === 34) {
          $("#nft").removeClass("line-color-" + _this.state.selected);
          _this.state.selected--;
          if (_this.state.selected < 0) {
            _this.state.selected = 15;
          }
          _this.newSelected();
        } else if (event.keyCode === 46) {
          _this.state = new State();
          location.hash = '';
          _this.updateBox();
          $("#nft").removeClass("line-color-" + _this.state.selected);
          $("#ft").val(_this.state.functions[_this.state.selected].expr);
          $("#ft").trigger('input');
        } else {
          return;
        }
        return _this.replot();
      };
    })(this)).resize((function(_this) {
      return function() {
        _this.size();
        return _this.replot();
      };
    })(this));
    this.canvas = $canvas.get(0);
    this.c = this.canvas.getContext("2d");
    this.size();
    this.updateBox();
    $ft.val(this.state.functions[this.state.selected].expr);
    $ft.trigger('input');
  }

  return GraphIt;

})();

$(function() {
  var graphit;
  return graphit = new GraphIt();
});

_ref = Object.getOwnPropertyNames(Math);
for (_i = 0, _len = _ref.length; _i < _len; _i++) {
  key = _ref[_i];
  window[key.toLowerCase()] = Math[key];
}
