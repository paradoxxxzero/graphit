(function() {
  var GraphIt;

  GraphIt = (function() {

    GraphIt.prototype.pow = 1.1;

    GraphIt.prototype.step = 1;

    GraphIt.prototype.functions = [
      {
        expr: "sin(pow(x, 4))/x",
        polar: false,
        error: false
      }
    ];

    GraphIt.prototype.selected = 0;

    GraphIt.prototype.themes = ["tango", "pastel", "white"];

    GraphIt.prototype.theme = 0;

    GraphIt.prototype.polar = {
      range: 2,
      step: 180
    };

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
      return this.scr.h + this.reg.Y.min + (y * (this.reg.Y.max - this.reg.Y.min) / this.scr.h);
    };

    GraphIt.prototype.Y2y = function(Y) {
      return this.scr.h - this.scr.h * (Y - this.reg.Y.min) / (this.reg.Y.max - this.reg.Y.min);
    };

    GraphIt.prototype.dy2DY = function(dy) {
      return dy * (this.reg.Y.max - this.reg.Y.min) / this.scr.h;
    };

    GraphIt.prototype.updateBox = function() {
      $("#pft").html((this.functions[this.selected].polar ? "&#x1D746;" : "&#x1D487;"));
      $("#nft").addClass("line-color-" + this.selected);
      $("#nft").text(this.selected);
      return $("#var").text((this.functions[this.selected].polar ? "o" : "x"));
    };

    GraphIt.prototype.prepareFunction = function(ftexp) {
      var m;
      m = 0;
      while (m < this.Math.functions.length) {
        ftexp = ftexp.replace(new RegExp(this.Math.functions[m] + "\\(", "g"), "Math." + this.Math.functions[m] + "(");
        m++;
      }
      m = 0;
      while (m < this.Math.constants.length) {
        ftexp = ftexp.replace(new RegExp("@" + this.Math.constants[m], "g"), "Math." + this.Math.constants[m]);
        m++;
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

    GraphIt.prototype.linearPlot = function(funct, i) {
      var X, Y, lineNext, x, y;
      lineNext = false;
      x = 0;
      while (x <= this.scr.w) {
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
          this.functions[i].error = true;
          console.log("Stopping plot, error with " + funct + " : " + e);
          return;
        }
        x++;
      }
      return this.functions[i].error = false;
    };

    GraphIt.prototype.polarPlot = function(funct, i) {
      var X, Y, lineNext, o, r, x, y;
      lineNext = false;
      o = 0;
      while (o <= this.polar.range * Math.PI) {
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
          this.functions[i].error = true;
          console.log("Stopping plot, error with " + funct + " : " + e);
          return;
        }
        o += Math.PI / this.polar.step;
      }
      return this.functions[i].error = false;
    };

    GraphIt.prototype.plot = function() {
      var functionValue, i;
      $("#ft").removeClass("error");
      i = 0;
      while (i < this.functions.length) {
        if (this.functions[i].expr === "") break;
        functionValue = this.prepareFunction(this.functions[i].expr);
        this.c.strokeStyle = $(".line-color-" + i).css("color");
        this.c.beginPath();
        if (this.functions[i].polar) {
          this.polarPlot((function(o) {
            return eval(functionValue);
          }), i);
        } else {
          this.linearPlot((function(x) {
            return eval(functionValue);
          }), i);
        }
        this.c.stroke();
        i++;
      }
      if (this.functions[this.selected].error) return $("#ft").addClass("error");
    };

    GraphIt.prototype.replot = function() {
      var fixrange, isBottom, isRight, max, min, order, range, s, st, ten, x, xX0, y, yY0;
      this.c.fillStyle = $(".bg").css("color");
      this.c.strokeStyle = $(".axis").css("color");
      this.c.fillRect(0, 0, this.scr.w, this.scr.h);
      this.c.beginPath();
      yY0 = this.Y2y(0);
      xX0 = this.X2x(0);
      if (xX0 < 0) xX0 = 0;
      if (xX0 > this.scr.w) xX0 = this.scr.w;
      if (yY0 < 0) yY0 = 0;
      if (yY0 > this.scr.h) yY0 = this.scr.h;
      isRight = xX0 > this.scr.w / 2;
      isBottom = yY0 > this.scr.h / 2;
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
        ten.X /= 4;
        fixrange.X += 2;
      } else if (range.X < 5 * ten.X) {
        ten.X /= 2;
        fixrange.X++;
      }
      if (range.Y < 2.5 * ten.Y) {
        ten.Y /= 4;
        fixrange.Y += 2;
      } else if (range.Y < 5 * ten.Y) {
        fixrange.Y++;
        ten.Y /= 2;
      }
      min = {
        X: Math.floor(this.reg.X.min / ten.X) * ten.X,
        Y: Math.floor(this.reg.Y.min / ten.Y) * ten.Y
      };
      max = {
        X: Math.floor(this.reg.X.max / ten.X) * ten.X,
        Y: Math.floor(this.reg.Y.max / ten.Y) * ten.Y
      };
      s = min.X;
      while (s <= max.X) {
        x = this.X2x(s);
        st = (ten.X < 1 ? s.toFixed(fixrange.X) : s);
        if (parseFloat(st) !== 0) {
          this.c.moveTo(x, yY0 - (isBottom ? this.reg.tickSize : 0));
          this.c.lineTo(x, yY0 + (isBottom ? 0 : this.reg.tickSize));
          this.c.fillText(st, x - 3, yY0 + (1.5 * this.reg.tickSize + (isBottom ? 2 : 10)) * (isBottom ? -1 : 1));
        }
        s += ten.X;
      }
      s = min.Y;
      while (s <= max.Y) {
        y = this.Y2y(s);
        st = (Math.abs(ten.Y) < 1 ? s.toFixed(fixrange.Y) : s);
        if (parseFloat(st) !== 0) {
          this.c.moveTo(xX0 + (isRight ? 0 : this.reg.tickSize), y);
          this.c.lineTo(xX0 - (isRight ? this.reg.tickSize : 0), y);
          this.c.fillText(st, xX0 + (1.5 * this.reg.tickSize + (isRight ? 5 * new String(st).length : 0)) * (isRight ? -1 : 1), y + 3);
        }
        s += ten.Y;
      }
      this.c.stroke();
      this.c.fillStyle = $(".bg").css("color");
      return this.plot();
    };

    function GraphIt() {
      var $ft, nw, t;
      var _this = this;
      ($ft = $("#ft")).bind("input", function() {
        var functionValue;
        functionValue = $ft.val();
        if (functionValue === "") return;
        _this.functions[_this.selected].expr = functionValue;
        _this.replot();
        return false;
      });
      $ft.keydown(function() {
        if (event.keyCode === 38) {
          $("#nft").removeClass("line-color-" + _this.selected);
          _this.selected++;
          if (_this.selected > 15) _this.selected = 0;
          _this.newSelected();
        } else if (event.keyCode === 40) {
          $("#nft").removeClass("line-color-" + _this.selected);
          _this.selected--;
          if (_this.selected < 0) _this.selected = 15;
          _this.newSelected();
        } else if (event.ctrlKey && event.keyCode === 32) {
          _this.functions[_this.selected].polar = !_this.functions[_this.selected].polar;
          _this.updateBox();
          _this.replot();
        }
        return event.stopPropagation();
      });
      $("#canvas").mousedown(function(event) {
        _this.dragging.on = true;
        _this.dragging.x = event.clientX;
        _this.dragging.y = event.clientY;
        event.stopPropagation();
        $("body").addClass("moving");
        $("#ft").blur();
        return false;
      }).mousemove(function(event) {
        var D, d;
        if (!_this.dragging.on) return;
        d = {
          x: _this.dragging.x - event.clientX,
          y: _this.dragging.y - event.clientY
        };
        D = {
          X: _this.dx2DX(d.x),
          Y: _this.dy2DY(d.y)
        };
        _this.reg.X.min += D.X;
        _this.reg.X.max += D.X;
        _this.reg.Y.min -= D.Y;
        _this.reg.Y.max -= D.Y;
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
        var d, p;
        d = {
          x: 0,
          y: 0
        };
        if (delta < 0) {
          if (!event.shiftKey && _this.mode !== "y") {
            _this.reg.X.zcoef += _this.step;
            d.x = (Math.pow(_this.pow, _this.step) - 1) * Math.pow(_this.pow, _this.reg.X.zcoef - _this.step);
          }
          if (!event.altKey && _this.mode !== "x") {
            _this.reg.Y.zcoef += _this.step;
            d.y = (Math.pow(_this.pow, _this.step) - 1) * Math.pow(_this.pow, _this.reg.Y.zcoef - _this.step);
          }
        } else {
          if (!event.shiftKey && _this.mode !== "y") {
            d.x = (1 - Math.pow(_this.pow, _this.step)) * Math.pow(_this.pow, _this.reg.X.zcoef - _this.step);
            _this.reg.X.zcoef -= _this.step;
          }
          if (!event.altKey && _this.mode !== "x") {
            d.y = (1 - Math.pow(_this.pow, _this.step)) * Math.pow(_this.pow, _this.reg.Y.zcoef - _this.step);
            _this.reg.Y.zcoef -= _this.step;
          }
        }
        p = {
          x: event.clientX / _this.scr.w,
          y: event.clientY / _this.scr.h
        };
        _this.reg.X.min -= (2 * d.x * event.clientX) / _this.scr.w;
        _this.reg.X.max += (2 * d.x * (_this.scr.w - event.clientX)) / _this.scr.w;
        _this.reg.Y.min -= (2 * d.y * (_this.scr.h - event.clientY)) / _this.scr.h;
        _this.reg.Y.max += (2 * d.y * event.clientY) / _this.scr.h;
        _this.replot();
        event.stopPropagation();
        return false;
      });
      $(window).keydown(function(event) {
        var nw, r;
        if (event.keyCode === 88) {
          _this.mode = "x";
        } else if (event.keyCode === 89) {
          _this.mode = "y";
        } else {
          _this.mode = null;
        }
        if (event.keyCode === 82) {
          r = {
            X: _this.reg.X.max - _this.reg.X.min,
            Y: _this.reg.Y.max - _this.reg.Y.min
          };
          _this.reg.X.min = -r.X / 2;
          _this.reg.X.max = r.X / 2;
          _this.reg.Y.min = -r.Y / 2;
          _this.reg.Y.max = r.Y / 2;
          return _this.replot();
        } else if (event.keyCode === 84) {
          _this.reg.X.zcoef = _this.reg.Y.zcoef = 1;
          nw = {
            x: Math.pow(_this.pow, _this.reg.X.zcoef),
            y: Math.pow(_this.pow, _this.reg.Y.zcoef)
          };
          _this.reg.X.min = -nw.x;
          _this.reg.X.max = nw.x;
          _this.reg.Y.min = -nw.y;
          _this.reg.Y.max = nw.y;
          return _this.replot();
        } else if (event.keyCode === 83) {
          $("#theme")[0].href = _this.themes[++_this.theme % _this.themes.length] + ".css";
          return _this.replot();
        } else if (event.keyCode === 77) {
          _this.polar.range *= 2;
          return _this.replot();
        } else if (event.keyCode === 76) {
          _this.polar.range /= 2;
          return _this.replot();
        } else if (event.keyCode === 80) {
          _this.polar.step *= 2;
          return _this.replot();
        } else if (event.keyCode === 79) {
          _this.polar.step /= 2;
          return _this.replot();
        }
      });
      $(window).resize(function() {
        _this.size();
        return _this.replot();
      });
      this.canvas = $("#canvas").get(0);
      this.c = this.canvas.getContext("2d");
      this.size();
      nw = {
        x: Math.pow(this.pow, this.reg.X.zcoef),
        y: Math.pow(this.pow, this.reg.Y.zcoef)
      };
      this.reg.X.min -= nw.x;
      this.reg.X.max += nw.x;
      this.reg.Y.min -= nw.y;
      this.reg.Y.max += nw.y;
      t = 1;
      while (t < 16) {
        this.functions[t] = {
          expr: "",
          polar: false
        };
        t++;
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
