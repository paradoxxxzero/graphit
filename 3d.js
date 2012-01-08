(function() {
  var Box, Camera, Dot, GraphIt, cos, sin,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  cos = Math.cos;

  sin = Math.sin;

  Camera = (function() {

    Camera.name = 'Camera';

    function Camera() {
      this.scale = 150;
      this.fov = 1.2;
      this.x = window.innerWidth / 2;
      this.y = window.innerHeight / 2;
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

    Dot.prototype.project = function(camera) {
      var zoom;
      zoom = 1 + (this.z * camera.scale) * camera.fov / camera.z;
      return [camera.x + (this.x * camera.scale) / zoom, camera.y + (this.y * camera.scale) / zoom];
    };

    Dot.prototype.rotate = function(a, b) {
      var ca, cb, sa, sb, t;
      ca = cos(a);
      sa = sin(a);
      cb = cos(b);
      sb = sin(b);
      t = this.z;
      this.z = -this.y * sa + t * ca;
      this.y = this.y * ca + t * sa;
      t = this.z;
      this.z = this.x * sb + t * cb;
      return this.x = this.x * cb - t * sb;
    };

    return Dot;

  })();

  Box = (function() {

    Box.name = 'Box';

    function Box() {
      this.dots = [new Dot(1, 1, 1), new Dot(1, 1, -1), new Dot(1, -1, -1), new Dot(1, -1, 1), new Dot(-1, -1, 1), new Dot(-1, 1, 1), new Dot(-1, 1, -1), new Dot(-1, -1, -1)];
      this.links = [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [2, 7], [1, 6], [0, 5], [4, 5], [5, 6], [6, 7], [7, 4]];
    }

    Box.prototype.render = function(c, camera) {
      var d1, d2, x, y, _i, _len, _ref, _ref2, _ref3, _ref4;
      c.beginPath();
      _ref = this.links;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref2 = _ref[_i], d1 = _ref2[0], d2 = _ref2[1];
        _ref3 = this.dots[d1].project(camera), x = _ref3[0], y = _ref3[1];
        c.moveTo(x, y);
        _ref4 = this.dots[d2].project(camera), x = _ref4[0], y = _ref4[1];
        c.lineTo(x, y);
      }
      return c.stroke();
    };

    Box.prototype.rotate = function(a, b) {
      var dot, _i, _len, _ref, _results;
      _ref = this.dots;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        dot = _ref[_i];
        _results.push(dot.rotate(a, b));
      }
      return _results;
    };

    return Box;

  })();

  GraphIt = (function() {

    GraphIt.name = 'GraphIt';

    GraphIt.prototype.dragging = {
      on: false,
      x: 0,
      y: 0
    };

    function GraphIt() {
      this.mouseup = __bind(this.mouseup, this);

      this.mousemove = __bind(this.mousemove, this);

      this.mousedown = __bind(this.mousedown, this);
      this.canvas = $("#canvas").get(0);
      this.c = this.canvas.getContext("2d");
      this.camera = new Camera();
      this.box = new Box();
    }

    GraphIt.prototype.size = function() {
      return this.scr = {
        h: this.canvas.height = window.innerHeight - 25,
        w: this.canvas.width = window.innerWidth
      };
    };

    GraphIt.prototype.render = function() {
      this.c.fillStyle = $(".bg").css("color");
      this.c.strokeStyle = $(".axis").css("color");
      this.c.fillRect(0, 0, this.scr.w, this.scr.h);
      return this.box.render(this.c, this.camera);
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
      this.box.rotate(4 * Math.PI * dy / this.scr.h, 4 * Math.PI * dx / this.scr.w);
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

    return GraphIt;

  })();

  $(function() {
    var graphit;
    graphit = new GraphIt();
    $("#canvas").mousedown(graphit.mousedown).mousemove(graphit.mousemove).mouseup(graphit.mouseup);
    graphit.size();
    return graphit.render();
  });

}).call(this);
