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

class Camera
    constructor: ->
        @scale = 150
        @fov = 1.2
        @x = window.innerWidth / 2
        @y = window.innerHeight / 2
        @z = 500


class Dot
    constructor: (x, y, z) ->
        @x = x
        @y = y
        @z = z

    project: (camera) ->
        zoom = 1 + (@z * camera.scale) * camera.fov / camera.z
        [camera.x + (@x * camera.scale) / zoom, camera.y + (@y * camera.scale) / zoom]

    rotate: (a, b) ->
        ca = cos(a)
        sa = sin(a)
        cb = cos(b)
        sb = sin(b)
        t = @z
        @z = - @y * sa + t * ca
        @y = @y * ca + t * sa
        t = @z
        @z = @x * sb + t * cb
        @x = @x * cb - t * sb

class Box
    constructor: ->
        @dots = [
            new Dot( 1,  1,  1),
            new Dot( 1,  1, -1),
            new Dot( 1, -1, -1),
            new Dot( 1, -1,  1),
            new Dot(-1, -1,  1),
            new Dot(-1,  1,  1),
            new Dot(-1,  1, -1),
            new Dot(-1, -1, -1),
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

    render: (c, camera) ->
        c.beginPath()
        for [d1, d2] in @links
            [x, y] = @dots[d1].project(camera)
            c.moveTo x, y
            [x, y] = @dots[d2].project(camera)
            c.lineTo x, y
        c.stroke()

    rotate: (a, b) ->
        for dot in @dots
            dot.rotate(a, b)


class GraphIt
    dragging:
        on: false
        x: 0
        y: 0

    constructor: ->
        @canvas = $("#canvas").get 0
        @c = @canvas.getContext "2d"
        @camera = new Camera()
        @box = new Box()

    size: ->
        @scr =
            h: @canvas.height = window.innerHeight - 25
            w: @canvas.width = window.innerWidth

    render: ->
        @c.fillStyle = $(".bg").css("color")
        @c.strokeStyle = $(".axis").css("color")
        @c.fillRect 0, 0, @scr.w, @scr.h
        @box.render @c, @camera

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
        @box.rotate 4 * Math.PI * dy / @scr.h, 4 * Math.PI * dx / @scr.w
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

$ ->
    graphit = new GraphIt()
    $("#canvas")
        .mousedown(graphit.mousedown)
        .mousemove(graphit.mousemove)
        .mouseup(graphit.mouseup)
    graphit.size()
    graphit.render()
