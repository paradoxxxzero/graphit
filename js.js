(function() {
  var GraphIt;

  GraphIt = (function() {

    GraphIt.name = 'GraphIt';

    GraphIt.prototype.pow = 1.1;

    GraphIt.prototype.step = 1;

    GraphIt.prototype.functions = [
      {
        expr: "sin(pow(x, 4))/x",
        type: 'linear',
        error: false
      }
    ];

    GraphIt.prototype.selected = 0;

    GraphIt.prototype.themes = ["tango", "pastel", "white"];

    GraphIt.prototype.theme = 0;

    GraphIt.prototype.polar_range = 2;

    GraphIt.prototype.polar_step = 180;

    GraphIt.prototype.reg = {
      X: {
        min: 0,
        max: 0,
        zcoef: 5
      },
      Y: {
        min: 0,
        max: 0,
        zcoef: 5
      },
      tickSize: 5
    };

    GraphIt.prototype.dragging = {
      on: false,
      x: 0,
      y: 0
    };

    GraphIt.prototype.Math = {
      functions: ["abs", "acos", "asin", "atan", "atan2", "ceil", "cos", "exp", "floor", "log", "max", "min", "pow", "random", "round", "sin", "sqrt", "tan"],
      constants: ["E", "LN2", "LN10", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"]
    };

    GraphIt.prototype.size = function() {
      return this.scr = {
        h: this.canvas.height = window.innerHeight - 25,
        w: this.canvas.width = window.innerWidth
      };
    };

    GraphIt.prototype.x2X = function(x) {
      return this.reg.X.min + (x * (this.reg.X.max - this.reg.X.min) / this.scr.w);
    };

    GraphIt.prototype.X2x = function(X) {
      return this.scr.w * (X - this.reg.X.min) / (this.reg.X.max - this.reg.X.min);
    };

    GraphIt.prototype.dx2DX = function(dx) {
      return dx * (this.reg.X.max - this.reg.X.min) / this.scr.w;
    };

    GraphIt.prototype.y2Y = function(y) {
      return this.reg.Y.min + ((this.scr.h - y) * (this.reg.Y.max - this.reg.Y.min) / this.scr.h);
    };

    GraphIt.prototype.Y2y = function(Y) {
      return this.scr.h - this.scr.h * (Y - this.reg.Y.min) / (this.reg.Y.max - this.reg.Y.min);
    };

    GraphIt.prototype.dy2DY = function(dy) {
      return dy * (this.reg.Y.max - this.reg.Y.min) / this.scr.h;
    };

    GraphIt.prototype.updateBox = function() {
      $("#pft").html(this.functions[this.selected].type === 'polar' ? "&#x1D746;" : "&#x1D487;");
      $("#nft").addClass("line-color-" + this.selected);
      return $("#nft").text(this.selected);
    };

    GraphIt.prototype.prepareFunction = function(ftexp) {
      var c, f, _i, _j, _len, _len2, _ref, _ref2;
      _ref = this.Math.functions;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        f = _ref[_i];
        ftexp = ftexp.replace(new RegExp(f + "\\(", "g"), "Math." + f + "(");
      }
      _ref2 = this.Math.constants;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        c = _ref2[_j];
        ftexp = ftexp.replace(new RegExp("@" + c, "g"), "Math." + c);
      }
      return ftexp;
    };

    GraphIt.prototype.newSelected = function() {
      $("#ft").val(this.functions[this.selected].expr);
      if (this.functions[this.selected].error) {
        $("#ft").addClass("error");
      } else {
        $("#ft").removeClass("error");
      }
      return this.updateBox();
    };

    GraphIt.prototype.linear = function(funct, f) {
      var X, Y, lineNext, x, y, _i, _ref;
      lineNext = false;
      for (x = _i = 0, _ref = this.scr.w; 0 <= _ref ? _i <= _ref : _i >= _ref; x = 0 <= _ref ? ++_i : --_i) {
        X = this.x2X(x);
        try {
          Y = funct(X);
          if (isFinite(Y)) {
            y = this.Y2y(Y);
            if (lineNext) {
              this.c.lineTo(x, y);
            } else {
              this.c.moveTo(x, y);
              lineNext = true;
            }
          } else {
            lineNext = false;
          }
        } catch (e) {
          f.error = true;
          console.log("Stopping plot, error with " + funct + " : " + e);
          return;
        }
      }
      return f.error = false;
    };

    GraphIt.prototype.horizontal = function(funct, f) {
      var X, Y, lineNext, x, y, _i, _ref;
      lineNext = false;
      for (y = _i = 0, _ref = this.scr.h; 0 <= _ref ? _i <= _ref : _i >= _ref; y = 0 <= _ref ? ++_i : --_i) {
        Y = this.y2Y(y);
        try {
          X = funct(Y);
          if (isFinite(X)) {
            x = this.X2x(X);
            if (lineNext) {
              this.c.lineTo(x, y);
            } else {
              this.c.moveTo(x, y);
              lineNext = true;
            }
          } else {
            lineNext = false;
          }
        } catch (e) {
          f.error = true;
          console.log("Stopping plot, error with " + funct + " : " + e);
          return;
        }
      }
      return f.error = false;
    };

    GraphIt.prototype.polar = function(funct, f) {
      var X, Y, lineNext, o, r, x, y, _i, _ref, _ref2;
      lineNext = false;
      for (o = _i = 0, _ref = this.polar_range * Math.PI, _ref2 = Math.PI / this.polar_step; 0 <= _ref ? _i <= _ref : _i >= _ref; o = _i += _ref2) {
        try {
          r = funct(o);
          if (isFinite(r)) {
            X = r * Math.cos(o);
            Y = r * Math.sin(o);
            x = this.X2x(X);
            y = this.Y2y(Y);
            if (lineNext) {
              this.c.lineTo(x, y);
            } else {
              this.c.moveTo(x, y);
              lineNext = true;
            }
          } else {
            lineNext = false;
          }
        } catch (e) {
          f.error = true;
          console.log("Stopping plot, error with " + funct + " : " + e);
          return;
        }
      }
      return f.error = false;
    };

    GraphIt.prototype.plot = function() {
      var f, functionValue, i, time, _i, _len, _ref;
      $("#ft").removeClass("error");
      time = new Date().getTime();
      _ref = this.functions;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        f = _ref[i];
        if (f.expr === "") break;
        functionValue = this.prepareFunction(f.expr);
        this.c.strokeStyle = $(".line-color-" + i).css("color");
        this.c.beginPath();
        this[f.type]((function(x) {
          return eval(functionValue);
        }), f);
        this.c.stroke();
      }
      document.title = new Date().getTime() - time;
      if (this.functions[this.selected].error) return $("#ft").addClass("error");
    };

    GraphIt.prototype.replot = function() {
      var fixrange, isBottom, isRight, max, min, order, range, s, st, ten, x, xX0, y, yY0, _i, _j, _ref, _ref2, _ref3, _ref4, _ref5, _ref6;
      this.c.fillStyle = $(".bg").css("color");
      this.c.strokeStyle = $(".axis").css("color");
      this.c.fillRect(0, 0, this.scr.w, this.scr.h);
      xX0 = Math.min(Math.max(this.X2x(0), 0), this.scr.w);
      yY0 = Math.min(Math.max(this.Y2y(0), 0), this.scr.h);
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
        X: this.reg.X.max - this.reg.X.min,
        Y: this.reg.Y.max - this.reg.Y.min
      };
      order = {
        X: Math.floor(Math.log(range.X) / Math.log(10)),
        Y: Math.floor(Math.log(range.Y) / Math.log(10))
      };
      ten = {
        X: Math.pow(10, order.X),
        Y: Math.pow(10, order.Y)
      };
      fixrange = {
        X: Math.abs(Math.ceil(Math.log(1 / ten.X) / Math.log(10))),
        Y: Math.abs(Math.ceil(Math.log(1 / ten.Y) / Math.log(10)))
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
      min = {
        X: Math.floor(this.reg.X.min / ten.X) * ten.X,
        Y: Math.floor(this.reg.Y.min / ten.Y) * ten.Y
      };
      max = {
        X: Math.floor(this.reg.X.max / ten.X) * ten.X,
        Y: Math.floor(this.reg.Y.max / ten.Y) * ten.Y
      };
      for (s = _i = _ref = min.X, _ref2 = max.X, _ref3 = ten.X; _ref <= _ref2 ? _i <= _ref2 : _i >= _ref2; s = _i += _ref3) {
        x = this.X2x(s);
        st = (ten.X < 1 ? s.toFixed(fixrange.X) : s);
        if (parseFloat(st) !== 0) {
          this.c.moveTo(x, yY0 - (isBottom ? this.reg.tickSize : 0));
          this.c.lineTo(x, yY0 + (isBottom ? 0 : this.reg.tickSize));
          this.c.fillText(st, x - 3, yY0 + (1.5 * this.reg.tickSize + (isBottom ? 2 : 10)) * (isBottom ? -1 : 1));
        }
      }
      for (s = _j = _ref4 = min.Y, _ref5 = max.Y, _ref6 = ten.X; _ref4 <= _ref5 ? _j <= _ref5 : _j >= _ref5; s = _j += _ref6) {
        y = this.Y2y(s);
        st = (Math.abs(ten.Y) < 1 ? s.toFixed(fixrange.Y) : s);
        if (parseFloat(st) !== 0) {
          this.c.moveTo(xX0 + (isRight ? 0 : this.reg.tickSize), y);
          this.c.lineTo(xX0 - (isRight ? this.reg.tickSize : 0), y);
          this.c.fillText(st, xX0 + (1.5 * this.reg.tickSize + (isRight ? 5 * new String(st).length : 0)) * (isRight ? -1 : 1), y + 3);
        }
      }
      this.c.stroke();
      this.c.fillStyle = $(".bg").css("color");
      return this.plot();
    };

    function GraphIt() {
      var $canvas, $ft, n, nwx, nwy, _i,
        _this = this;
      ($ft = $("#ft")).bind("input", function() {
        var functionValue;
        functionValue = $ft.val();
        _this.functions[_this.selected].expr = functionValue;
        return _this.replot();
      }).keydown(function(e) {
        var _ref;
        if (!((e.ctrlKey && e.keyCode === 32) || ((_ref = e.keyCode) === 33 || _ref === 34))) {
          return e.stopPropagation();
        }
      });
      ($canvas = $("#canvas")).mousedown(function(event) {
        _this.dragging.on = true;
        _this.dragging.x = event.clientX;
        _this.dragging.y = event.clientY;
        event.stopPropagation();
        $("body").addClass("moving");
        $("#ft").blur();
        return false;
      }).mousemove(function(event) {
        var DX, DY;
        if (!_this.dragging.on) return;
        DX = _this.dx2DX(_this.dragging.x - event.clientX);
        DY = _this.dy2DY(_this.dragging.y - event.clientY);
        _this.reg.X.min += DX;
        _this.reg.X.max += DX;
        _this.reg.Y.min -= DY;
        _this.reg.Y.max -= DY;
        _this.dragging.x = event.clientX;
        _this.dragging.y = event.clientY;
        event.stopPropagation();
        _this.replot();
        return false;
      }).mouseup(function(event) {
        _this.dragging.on = false;
        event.stopPropagation();
        $("body").removeClass("moving");
        return false;
      }).mouseout(function() {
        return $(this).trigger('mouseup');
      }).mousewheel(function(event, delta) {
        var dx, dy;
        if (delta < 0) {
          if (!event.shiftKey && _this.mode !== "y") {
            _this.reg.X.zcoef += _this.step;
            dx = (Math.pow(_this.pow, _this.step) - 1) * Math.pow(_this.pow, _this.reg.X.zcoef - _this.step);
          }
          if (!event.altKey && _this.mode !== "x") {
            _this.reg.Y.zcoef += _this.step;
            dy = (Math.pow(_this.pow, _this.step) - 1) * Math.pow(_this.pow, _this.reg.Y.zcoef - _this.step);
          }
        } else {
          if (!event.shiftKey && _this.mode !== "y") {
            dx = (1 - Math.pow(_this.pow, _this.step)) * Math.pow(_this.pow, _this.reg.X.zcoef - _this.step);
            _this.reg.X.zcoef -= _this.step;
          }
          if (!event.altKey && _this.mode !== "x") {
            dy = (1 - Math.pow(_this.pow, _this.step)) * Math.pow(_this.pow, _this.reg.Y.zcoef - _this.step);
            _this.reg.Y.zcoef -= _this.step;
          }
        }
        _this.reg.X.min -= (2 * dx * event.clientX) / _this.scr.w;
        _this.reg.X.max += (2 * dx * (_this.scr.w - event.clientX)) / _this.scr.w;
        _this.reg.Y.min -= (2 * dy * (_this.scr.h - event.clientY)) / _this.scr.h;
        _this.reg.Y.max += (2 * dy * event.clientY) / _this.scr.h;
        _this.replot();
        event.stopPropagation();
        return false;
      });
      $(window).keydown(function(event) {
        var nwx, nwy, rX, rY, w;
        if (event.keyCode === 88) {
          _this.mode = "x";
        } else if (event.keyCode === 89) {
          _this.mode = "y";
        } else {
          _this.mode = null;
        }
        if (event.keyCode === 82) {
          rX = _this.reg.X.max - _this.reg.X.min;
          rY = _this.reg.Y.max - _this.reg.Y.min;
          _this.reg.X.min = -rX / 2;
          _this.reg.X.max = rX / 2;
          _this.reg.Y.min = -rY / 2;
          _this.reg.Y.max = rY / 2;
        } else if (event.keyCode === 84) {
          _this.reg.X.zcoef = _this.reg.Y.zcoef = 5;
          nwx = Math.pow(_this.pow, _this.reg.X.zcoef);
          nwy = Math.pow(_this.pow, _this.reg.Y.zcoef);
          _this.reg.X.min = -nwx;
          _this.reg.X.max = nwx;
          _this.reg.Y.min = -nwy;
          _this.reg.Y.max = nwy;
        } else if (event.keyCode === 83) {
          $("#theme")[0].href = _this.themes[++_this.theme % _this.themes.length] + ".css";
        } else if (event.keyCode === 77) {
          _this.polar_range *= 2;
        } else if (event.keyCode === 76) {
          _this.polar_range /= 2;
        } else if (event.keyCode === 80) {
          _this.polar_step *= 2;
        } else if (event.keyCode === 79) {
          _this.polar_step /= 2;
        } else if (event.keyCode === 39) {
          w = _this.reg.X.max - _this.reg.X.min;
          _this.reg.X.min += w / 10;
          _this.reg.X.max += w / 10;
        } else if (event.keyCode === 37) {
          w = _this.reg.X.max - _this.reg.X.min;
          _this.reg.X.min -= w / 10;
          _this.reg.X.max -= w / 10;
        } else if (event.keyCode === 38) {
          w = _this.reg.Y.max - _this.reg.Y.min;
          _this.reg.Y.min += w / 10;
          _this.reg.Y.max += w / 10;
        } else if (event.keyCode === 40) {
          w = _this.reg.Y.max - _this.reg.Y.min;
          _this.reg.Y.min -= w / 10;
          _this.reg.Y.max -= w / 10;
        } else if (event.ctrlKey && event.keyCode === 32) {
          if (_this.functions[_this.selected].type === 'linear') {
            _this.functions[_this.selected].type = 'polar';
          } else if (_this.functions[_this.selected].type === 'polar') {
            _this.functions[_this.selected].type = 'horizontal';
          } else if (_this.functions[_this.selected].type === 'horizontal') {
            _this.functions[_this.selected].type = 'linear';
          }
          _this.updateBox();
          _this.replot();
        } else if (event.keyCode === 33) {
          $("#nft").removeClass("line-color-" + _this.selected);
          _this.selected++;
          if (_this.selected > 15) _this.selected = 0;
          _this.newSelected();
        } else if (event.keyCode === 34) {
          $("#nft").removeClass("line-color-" + _this.selected);
          _this.selected--;
          if (_this.selected < 0) _this.selected = 15;
          _this.newSelected();
        } else {
          return;
        }
        return _this.replot();
      }).resize(function() {
        _this.size();
        return _this.replot();
      });
      this.canvas = $canvas.get(0);
      this.c = this.canvas.getContext("2d");
      this.size();
      nwx = Math.pow(this.pow, this.reg.X.zcoef);
      nwy = Math.pow(this.pow, this.reg.Y.zcoef);
      this.reg.X.min -= nwx;
      this.reg.X.max += nwx;
      this.reg.Y.min -= nwy;
      this.reg.Y.max += nwy;
      for (n = _i = 1; _i <= 15; n = ++_i) {
        this.functions[n] = {
          expr: "",
          type: 'linear',
          error: false
        };
      }
      this.updateBox();
      $ft.val(this.functions[0].expr);
      $ft.trigger('input');
    }

    return GraphIt;

  })();

  $(function() {
    var graphit;
    return graphit = new GraphIt();
  });

}).call(this);
