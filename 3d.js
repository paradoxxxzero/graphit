(function() {
  var Box, Camera, Dot, Graph, GraphIt, cap, cos, max, min, prepareFunction, region, sin, _Math,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  cos = Math.cos;

  sin = Math.sin;

  min = Math.min;

  max = Math.max;

  _Math = {
    functions: ["abs", "acos", "asin", "atan", "atan2", "ceil", "cos", "exp", "floor", "log", "max", "min", "pow", "random", "round", "sin", "sqrt", "tan"],
    constants: ["E", "LN2", "LN10", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"]
  };

  prepareFunction = function(ftexp) {
    var c, f, _i, _j, _len, _len2, _ref, _ref2, _results;
    _ref = _Math.functions;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      f = _ref[_i];
      ftexp = ftexp.replace(new RegExp(f + "\\(", "g"), "Math." + f + "(");
    }
    _ref2 = _Math.constants;
    _results = [];
    for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
      c = _ref2[_j];
      _results.push(ftexp = ftexp.replace(new RegExp("@" + c, "g"), "Math." + c));
    }
    return _results;
  };

  region = 5;

  cap = function(n) {
    return max(min(n, region), -region);
  };

  Camera = (function() {

    Camera.name = 'Camera';

    function Camera() {
      this.fov = .5;
      this.z = 500;
    }

    return Camera;

  })();

  Dot = (function() {

    Dot.name = 'Dot';

    function Dot(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    Dot.prototype.project = function(camera, rotation) {
      var scale, x, y, z, zoom, _ref;
      _ref = this.rotate(rotation.a, rotation.b), x = _ref[0], y = _ref[1], z = _ref[2];
      scale = min(window.innerWidth, window.innerHeight) / (3 * region);
      zoom = 1 + (z * scale) * camera.fov / camera.z;
      return [camera.x + (x * scale) / zoom, camera.y + (y * scale) / zoom];
    };

    Dot.prototype.rotate = function(a, b) {
      var ca, cb, sa, sb, t, x, y, z;
      ca = cos(a);
      sa = sin(a);
      cb = cos(b);
      sb = sin(b);
      z = -this.y * sa + this.z * ca;
      y = this.y * ca + this.z * sa;
      t = z;
      z = this.x * sb + t * cb;
      x = this.x * cb - t * sb;
      return [x, y, z];
    };

    return Dot;

  })();

  Box = (function() {

    Box.name = 'Box';

    function Box(w) {
      this.dots = [new Dot(w, w, w), new Dot(w, w, -w), new Dot(w, -w, -w), new Dot(w, -w, w), new Dot(-w, -w, w), new Dot(-w, w, w), new Dot(-w, w, -w), new Dot(-w, -w, -w)];
      this.links = [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [2, 7], [1, 6], [0, 5], [4, 5], [5, 6], [6, 7], [7, 4]];
    }

    Box.prototype.render = function(c, camera, rotation) {
      var d1, d2, x, y, _i, _len, _ref, _ref2, _ref3, _ref4;
      c.beginPath();
      _ref = this.links;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref2 = _ref[_i], d1 = _ref2[0], d2 = _ref2[1];
        _ref3 = this.dots[d1].project(camera, rotation), x = _ref3[0], y = _ref3[1];
        c.moveTo(x, y);
        _ref4 = this.dots[d2].project(camera, rotation), x = _ref4[0], y = _ref4[1];
        c.lineTo(x, y);
      }
      return c.stroke();
    };

    return Box;

  })();

  Graph = (function() {

    Graph.name = 'Graph';

    function Graph(expr) {
      var dots, range, x, y, z, _i, _j, _k, _l, _len, _len2, _ref, _ref2;
      this.expr = expr;
      this.fun = new Function('x', 'y', 'return ' + prepareFunction(expr));
      this.lines = [];
      range = (function() {
        var _i, _ref, _results;
        _results = [];
        for (x = _i = -region, _ref = region / 20; -region <= region ? _i <= region : _i >= region; x = _i += _ref) {
          _results.push(x);
        }
        return _results;
      })();
      if (range.slice(-1)[0] !== region) range.push(region);
      for (_i = 0, _len = range.length; _i < _len; _i++) {
        y = range[_i];
        dots = [];
        for (x = _j = -region, _ref = region / 100; -region <= region ? _j <= region : _j >= region; x = _j += _ref) {
          z = cap(this.fun(x, y));
          dots.push(new Dot(x, y, z));
        }
        this.lines.push(dots);
      }
      for (_k = 0, _len2 = range.length; _k < _len2; _k++) {
        x = range[_k];
        dots = [];
        for (y = _l = -region, _ref2 = region / 100; -region <= region ? _l <= region : _l >= region; y = _l += _ref2) {
          z = cap(this.fun(x, y));
          dots.push(new Dot(x, y, z));
        }
        this.lines.push(dots);
      }
    }

    Graph.prototype.render = function(c, camera, rotation) {
      var dot, line, x, y, _i, _j, _len, _len2, _ref, _ref2, _ref3, _results;
      _ref = this.lines;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        c.beginPath();
        _ref2 = line[0].project(camera, rotation), x = _ref2[0], y = _ref2[1];
        c.moveTo(x, y);
        for (_j = 0, _len2 = line.length; _j < _len2; _j++) {
          dot = line[_j];
          _ref3 = dot.project(camera, rotation), x = _ref3[0], y = _ref3[1];
          c.lineTo(x, y);
        }
        _results.push(c.stroke());
      }
      return _results;
    };

    return Graph;

  })();

  GraphIt = (function() {

    GraphIt.name = 'GraphIt';

    GraphIt.prototype.dragging = {
      on: false,
      x: 0,
      y: 0
    };

    GraphIt.prototype.rotation = {
      a: .7,
      b: 0
    };

    function GraphIt() {
      this.input = __bind(this.input, this);

      this.mousewheel = __bind(this.mousewheel, this);

      this.mouseup = __bind(this.mouseup, this);

      this.mousemove = __bind(this.mousemove, this);

      this.mousedown = __bind(this.mousedown, this);
      this.canvas = $("#canvas").get(0);
      this.c = this.canvas.getContext("2d");
      this.camera = new Camera();
      this.box = new Box(region);
    }

    GraphIt.prototype.size = function() {
      this.scr = {
        h: this.canvas.height = window.innerHeight - 25,
        w: this.canvas.width = window.innerWidth
      };
      this.camera.x = this.scr.w / 2;
      return this.camera.y = this.scr.h / 2;
    };

    GraphIt.prototype.render = function() {
      this.c.fillStyle = $(".bg").css("color");
      this.c.strokeStyle = $(".axis").css("color");
      this.c.fillRect(0, 0, this.scr.w, this.scr.h);
      this.box.render(this.c, this.camera, this.rotation);
      this.c.strokeStyle = $(".line-color-0").css("color");
      return this.graph.render(this.c, this.camera, this.rotation);
    };

    GraphIt.prototype.mousedown = function(event) {
      this.dragging.on = true;
      this.dragging.x = event.clientX;
      this.dragging.y = event.clientY;
      event.stopPropagation();
      $("body").addClass("moving");
      $("#ft").blur();
      return false;
    };

    GraphIt.prototype.mousemove = function(event) {
      var dx, dy;
      if (!this.dragging.on) return;
      dx = event.clientX - this.dragging.x;
      dy = this.dragging.y - event.clientY;
      this.rotation.a += 4 * Math.PI * dy / this.scr.h;
      this.rotation.b += 4 * Math.PI * dx / this.scr.w;
      this.render();
      this.dragging.x = event.clientX;
      this.dragging.y = event.clientY;
      event.stopPropagation();
      return false;
    };

    GraphIt.prototype.mouseup = function(event) {
      this.dragging.on = false;
      event.stopPropagation();
      $("body").removeClass("moving");
      return false;
    };

    GraphIt.prototype.mousewheel = function(event, delta) {
      if (delta < 0) {
        region *= 1.1;
      } else {
        region *= .9;
      }
      this.box = new Box(region);
      this.graph = new Graph(this.graph.expr);
      return this.render();
    };

    GraphIt.prototype.input = function(event) {
      this.box = new Box(region);
      this.graph = new Graph(event.target.value);
      return this.render();
    };

    return GraphIt;

  })();

  $(function() {
    var graphit,
      _this = this;
    graphit = new GraphIt();
    $("#canvas").mousedown(graphit.mousedown).mousemove(graphit.mousemove).mouseup(graphit.mouseup).mousewheel(graphit.mousewheel);
    $(window).resize(function() {
      graphit.size();
      return graphit.render();
    });
    graphit.size();
    return $("#ft").bind('input', graphit.input).val('cos(x) * sin(y)').trigger('input');
  });

}).call(this);
