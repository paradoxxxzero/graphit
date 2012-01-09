# graphit - A free fast online plotter

# Copyright (C) 2012 Mounier Florian aka paradoxxxzero

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.

# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see http://www.gnu.org/licenses/.

cos = Math.cos
sin = Math.sin
min = Math.min
max = Math.max

_Math =
    functions: [ "abs", "acos", "asin", "atan", "atan2", "ceil", "cos", "exp", "floor", "log", "max", "min", "pow", "random", "round", "sin", "sqrt", "tan" ]
    constants: [ "E", "LN2", "LN10", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2" ]


prepareFunction = (ftexp) ->
    for f in _Math.functions
        ftexp = ftexp.replace(new RegExp(f + "\\(", "g"), "Math." + f + "(")
    for c in _Math.constants
        ftexp = ftexp.replace(new RegExp("@" + c, "g"), "Math." + c)

region = 5
cap = (n) -> max(min(n, region), -region)

class Camera
    constructor: ->
        @fov = .5
        @z = 500


class Dot
    constructor: (x, y, z) ->
        @x = x
        @y = y
        @z = z

    project: (camera, rotation) ->
        [x, y, z] = @rotate(rotation.a, rotation.b)
        scale = min(window.innerWidth, window.innerHeight) / (3 * region)
        zoom = 1 + (z * scale) * camera.fov / camera.z
        [camera.x + (x * scale) / zoom,
         camera.y + (y * scale) / zoom]

    rotate: (a, b) ->
        ca = cos(a)
        sa = sin(a)
        cb = cos(b)
        sb = sin(b)
        z = - @y * sa + @z * ca
        y = @y * ca + @z * sa
        t = z
        z = @x * sb + t * cb
        x = @x * cb - t * sb
        [x, y, z]

class Box
    constructor: (w)->
        @dots = [
            new Dot( w,  w,  w),
            new Dot( w,  w, -w),
            new Dot( w, -w, -w),
            new Dot( w, -w,  w),
            new Dot(-w, -w,  w),
            new Dot(-w,  w,  w),
            new Dot(-w,  w, -w),
            new Dot(-w, -w, -w)
        ]
        @links = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],

            [3, 4],
            [2, 7],
            [1, 6],
            [0, 5],

            [4, 5],
            [5, 6],
            [6, 7],
            [7, 4]
        ]

    render: (c, camera, rotation) ->
        c.beginPath()
        for [d1, d2] in @links
            [x, y] = @dots[d1].project(camera, rotation)
            c.moveTo x, y
            [x, y] = @dots[d2].project(camera, rotation)
            c.lineTo x, y
        c.stroke()

class Graph
    constructor: (expr) ->
        @expr = expr
        @fun = new Function('x', 'y', 'return ' + prepareFunction(expr))
        @lines = []
        range = (x for x in [-region..region] by region / 20)
        if range.slice(-1)[0] != region
            range.push region
        for y in range
            dots = []
            for x in [-region..region] by region / 100
                z = cap(@fun x, y)
                dots.push new Dot(x, y, z)
            @lines.push(dots)
        for x in range
            dots = []
            for y in [-region..region] by region / 100
                z = cap(@fun x, y)
                dots.push new Dot(x, y, z)
            @lines.push(dots)

    render: (c, camera, rotation) ->
        for line in @lines
            c.beginPath()
            [x, y] = line[0].project(camera, rotation)
            c.moveTo x, y
            for dot in line
                [x, y] = dot.project(camera, rotation)
                c.lineTo x, y
            c.stroke()

class GraphIt
    dragging:
        on: false
        x: 0
        y: 0

    rotation:
        a: .7
        b: 0

    constructor: ->
        @canvas = $("#canvas").get 0
        @c = @canvas.getContext "2d"
        @camera = new Camera()
        @box = new Box(region)

    size: ->
        @scr =
            h: @canvas.height = window.innerHeight - 25
            w: @canvas.width = window.innerWidth
        @camera.x = @scr.w / 2
        @camera.y = @scr.h / 2

    render: ->
        @c.fillStyle = $(".bg").css("color")
        @c.strokeStyle = $(".axis").css("color")
        @c.fillRect 0, 0, @scr.w, @scr.h
        @box.render @c, @camera, @rotation
        @c.strokeStyle = $(".line-color-0").css("color")
        @graph.render @c, @camera, @rotation

    mousedown: (event) =>
        @dragging.on = true
        @dragging.x = event.clientX
        @dragging.y = event.clientY
        event.stopPropagation()
        $("body").addClass "moving"
        $("#ft").blur()
        false

    mousemove: (event) =>
        return unless @dragging.on
        dx = event.clientX - @dragging.x
        dy = @dragging.y - event.clientY
        @rotation.a += 4 * Math.PI * dy / @scr.h
        @rotation.b += 4 * Math.PI * dx / @scr.w
        @render()
        @dragging.x = event.clientX
        @dragging.y = event.clientY
        event.stopPropagation()
        false

    mouseup: (event) =>
        @dragging.on = false
        event.stopPropagation()
        $("body").removeClass "moving"
        false

    mousewheel: (event, delta) =>
        if delta < 0
            region *= 1.1
        else
            region *= .9

        @box = new Box(region)
        @graph = new Graph(@graph.expr)
        @render()

    input: (event) =>
        @box = new Box(region)
        @graph = new Graph(event.target.value)
        @render()
$ ->
    graphit = new GraphIt()
    $("#canvas")
        .mousedown(graphit.mousedown)
        .mousemove(graphit.mousemove)
        .mouseup(graphit.mouseup)
        .mousewheel(graphit.mousewheel)
    $(window).resize =>
        graphit.size()
        graphit.render()
    graphit.size()
    $("#ft")
        .bind('input', graphit.input)
        .val('cos(x) * sin(y)')
        .trigger('input')

