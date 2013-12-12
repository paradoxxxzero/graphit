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

class State
    constructor: ->
        @pow = 1.1
        @step = 1
        @functions = [
           expr: "sin(pow(x, 4))/x"
           type: 'linear'
           error: false
        ]
        for n in [1..15]
            @functions[n] =
                expr: ""
                type: 'linear'
                error: false
        @selected = 0
        @theme = 0
        @polar_range = 2
        @polar_step = 180
        @parametric_range = 10
        @parametric_step = .1
        @reg =
            X:
                min: -pow(@pow, 5)
                max: pow(@pow, 5)
                zcoef: 5
            Y:
                min: -pow(@pow, 5)
                max: pow(@pow, 5)
                zcoef: 5
            tickSize: 5

class GraphIt
    function_types:
        linear:
            symbol: "&#x1D487;"
            next: 'polar'
        polar:
            symbol: "&#x1D746;"
            next: 'horizontal'
        horizontal:
            symbol: "&#x1D489;"
            next: 'parametric'
        parametric:
            symbol: "&#x1D499;"
            next: 'linear'

    themes: [ "tango", "pastel", "white" ]

    dragging:
        on: false
        x: 0
        y: 0

    size: ->
        @scr =
            h: @canvas.height = window.innerHeight - 25
            w: @canvas.width = window.innerWidth

    x2X: (x) ->
        @state.reg.X.min + (x * (@state.reg.X.max - @state.reg.X.min) / @scr.w)

    X2x: (X) ->
        @scr.w * (X - @state.reg.X.min) / (@state.reg.X.max - @state.reg.X.min)

    dx2DX: (dx) ->
        dx * (@state.reg.X.max - @state.reg.X.min) / @scr.w

    y2Y: (y) ->
        @state.reg.Y.min + ((@scr.h - y) * (@state.reg.Y.max - @state.reg.Y.min) / @scr.h)

    Y2y: (Y) ->
        @scr.h - @scr.h * (Y - @state.reg.Y.min) / (@state.reg.Y.max - @state.reg.Y.min)

    dy2DY: (dy) ->
        dy * (@state.reg.Y.max - @state.reg.Y.min) / @scr.h

    updateBox: ->
        $("#pft").html @function_types[@state.functions[@state.selected].type].symbol
        $("#nft").addClass "line-color-" + @state.selected
        $("#nft").text @state.selected

    prepareFunction: (ftexp) ->
        ftexp.split ';'

    newSelected: ->
        $("#ft").val @state.functions[@state.selected].expr
        if @state.functions[@state.selected].error
            $("#ft").addClass "error"
        else
            $("#ft").removeClass "error"
        @updateBox()

    linear: (funct, f) ->
        lineNext = false
        for x in [0..@scr.w]
            Y = funct[0](@x2X(x))
            if isFinite(Y)
                y = @Y2y(Y)
                if lineNext
                    @c.lineTo x, y
                else
                    @c.moveTo x, y
                    lineNext = true
            else
              lineNext = false

    horizontal: (funct, f) ->
        lineNext = false
        for y in [0..@scr.h]
            Y = @y2Y(y)
            X = funct[0](Y)
            if isFinite(X)
                x = @X2x(X)
                if lineNext
                    @c.lineTo x, y
                else
                    @c.moveTo x, y
                    lineNext = true
            else
              lineNext = false

    polar: (funct, f) ->
        lineNext = false
        for o in [0..@state.polar_range * pi] by pi / @state.polar_step
            r = funct[0](o)
            if isFinite(r)
                X = r * cos(o)
                Y = r * sin(o)
                x = @X2x(X)
                y = @Y2y(Y)
                if lineNext
                    @c.lineTo x, y
                else
                    @c.moveTo x, y
                    lineNext = true
            else
                lineNext = false

    parametric: (funct, f) ->
        lineNext = false
        for t in [0..@state.parametric_range] by @state.parametric_step
            X = funct[0](t)
            Y = funct[1](t)
            if isFinite(X) and isFinite(Y)
                x = @X2x(X)
                y = @Y2y(Y)
                if lineNext
                    @c.lineTo x, y
                else
                    @c.moveTo x, y
                    lineNext = true
            else
                lineNext = false

    plot: ->
        $("#ft").removeClass("error")
        time = new Date().getTime()
        for f, i in @state.functions
            break if f.expr is ""
            @c.strokeStyle = $(".line-color-" + i).css("color")
            @c.beginPath()
            try
                @[f.type](new Function('x', 'return ' + fun) for fun in @prepareFunction(f.expr), f)
            catch e
                console.log e
                f.error = true
                break
            f.error = false
            @c.stroke()
        document.title = (new Date().getTime() - time) + "ms"
        $("#ft").addClass("error") if @state.functions[@state.selected].error

    replot: ->
        @c.fillStyle = $(".bg").css("color")
        @c.strokeStyle = $(".axis").css("color")
        @c.fillRect 0, 0, @scr.w, @scr.h
        xX0 = min(max(@X2x(0), 0), @scr.w)
        yY0 = min(max(@Y2y(0), 0), @scr.h)
        isRight = xX0 > @scr.w / 2
        isBottom = yY0 > @scr.h / 2
        @c.beginPath()
        @c.moveTo 0, yY0
        @c.lineTo @scr.w, yY0
        @c.moveTo xX0, 0
        @c.lineTo xX0, @scr.h
        @c.stroke()
        @c.beginPath()
        @c.fillStyle = $(".ticknum").css("color")
        range =
            X: @state.reg.X.max - @state.reg.X.min
            Y: @state.reg.Y.max - @state.reg.Y.min

        order =
            X: floor(log(range.X) / log(10))
            Y: floor(log(range.Y) / log(10))

        ten =
            X: pow(10, order.X)
            Y: pow(10, order.Y)

        fixrange =
            X: abs(ceil(log(1 / ten.X) / log(10)))
            Y: abs(ceil(log(1 / ten.Y) / log(10)))

        if range.X < 2.5 * ten.X
            ten.X *= .25
            fixrange.X += 2
        else if range.X < 5 * ten.X
            ten.X *= .5
            fixrange.X++
        if range.Y < 2.5 * ten.Y
            ten.Y *= .25
            fixrange.Y += 2
        else if range.Y < 5 * ten.Y
            fixrange.Y++
            ten.Y *= .5
        minima =
            X: floor(@state.reg.X.min / ten.X) * ten.X
            Y: floor(@state.reg.Y.min / ten.Y) * ten.Y

        maxima =
            X: floor(@state.reg.X.max / ten.X) * ten.X
            Y: floor(@state.reg.Y.max / ten.Y) * ten.Y

        for s in [minima.X..maxima.X] by ten.X
            x = @X2x(s)
            st = (if ten.X < 1 then s.toFixed(fixrange.X) else s)
            unless parseFloat(st) is 0
                @c.moveTo x, yY0 - (if isBottom then @state.reg.tickSize else 0)
                @c.lineTo x, yY0 + (if isBottom then 0 else @state.reg.tickSize)
                @c.fillText st, x - 3, yY0 + (1.5 * @state.reg.tickSize + (if isBottom then 2 else 10)) * (if isBottom then -1 else 1)
        for s in [minima.Y..maxima.Y] by ten.X
            y = @Y2y(s)
            st = (if abs(ten.Y) < 1 then s.toFixed(fixrange.Y) else s)
            unless parseFloat(st) is 0
                @c.moveTo xX0 + (if isRight then 0 else @state.reg.tickSize), y
                @c.lineTo xX0 - (if isRight then @state.reg.tickSize else 0), y
                @c.fillText st, xX0 + (1.5 * @state.reg.tickSize + (if isRight then 5 * new String(st).length else 0)) * (if isRight then -1 else 1), y + 3
        @c.stroke()
        @c.fillStyle = $(".bg").css("color")
        @plot()

    constructor: ->
        if location.hash != ""
            @state = JSON.parse location.hash.slice(1)
        else
            @state = new State()

        ($ft = $("#ft")).bind("input", =>
            functionValue = $ft.val()
            @state.functions[@state.selected].expr = functionValue
            @replot()
        ).keydown (e) ->
            e.stopPropagation() if not ((e.ctrlKey and e.keyCode is 32) or e.keyCode in [33, 34])

        ($canvas = $("#canvas")).mousedown((event) =>
            @dragging.on = true
            @dragging.x = event.clientX
            @dragging.y = event.clientY
            event.stopPropagation()
            $("body").addClass "moving"
            $("#ft").blur()
            false
        ).mousemove((event) =>
            return unless @dragging.on
            DX = @dx2DX(@dragging.x - event.clientX)
            DY = @dy2DY(@dragging.y - event.clientY)

            @state.reg.X.min += DX
            @state.reg.X.max += DX
            @state.reg.Y.min -= DY
            @state.reg.Y.max -= DY
            @dragging.x = event.clientX
            @dragging.y = event.clientY
            event.stopPropagation()
            @replot()
            false
        ).mouseup((event) =>
            @dragging.on = false
            event.stopPropagation()
            $("body").removeClass "moving"
            false
        ).mouseout( ->
            $(@).trigger('mouseup')
        ).mousewheel((event, delta) =>
            if delta < 0
                if not event.shiftKey and @mode isnt "y"
                    @state.reg.X.zcoef += @state.step
                    dx = (pow(@state.pow, @state.step) - 1) * pow(@state.pow, @state.reg.X.zcoef - @state.step)
                if not event.altKey and @mode isnt "x"
                    @state.reg.Y.zcoef += @state.step
                    dy = (pow(@state.pow, @state.step) - 1) * pow(@state.pow, @state.reg.Y.zcoef - @state.step)
            else
                if not event.shiftKey and @mode isnt "y"
                    dx = (1 - pow(@state.pow, @state.step)) * pow(@state.pow, @state.reg.X.zcoef - @state.step)
                    @state.reg.X.zcoef -= @state.step
                if not event.altKey and @mode isnt "x"
                    dy = (1 - pow(@state.pow, @state.step)) * pow(@state.pow, @state.reg.Y.zcoef - @state.step)
                    @state.reg.Y.zcoef -= @state.step

            @state.reg.X.min -= (2 * dx * event.clientX) / @scr.w
            @state.reg.X.max += (2 * dx * (@scr.w - event.clientX)) / @scr.w
            @state.reg.Y.min -= (2 * dy * (@scr.h - event.clientY)) / @scr.h
            @state.reg.Y.max += (2 * dy * event.clientY) / @scr.h
            @replot()
            event.stopPropagation()
            false
        )
        $(window).keydown((event) =>
            if event.keyCode is 88 # x
                @mode = "x"
            else if event.keyCode is 89 # y
                @mode = "y"
            else
                @mode = null

            if event.keyCode is 82 # r
                rX = @state.reg.X.max - @state.reg.X.min
                rY = @state.reg.Y.max - @state.reg.Y.min
                @state.reg.X.min = -rX / 2
                @state.reg.X.max = rX / 2
                @state.reg.Y.min = -rY / 2
                @state.reg.Y.max = rY / 2
            else if event.keyCode is 84 # t
                @state.reg.X.zcoef = @state.reg.Y.zcoef = 5
                nwx = pow(@state.pow, @state.reg.X.zcoef)
                nwy = pow(@state.pow, @state.reg.Y.zcoef)

                @state.reg.X.min = -nwx
                @state.reg.X.max = nwx
                @state.reg.Y.min = -nwy
                @state.reg.Y.max = nwy
            else if event.keyCode is 83 # s
                $("#theme")[0].href = @themes[++@state.theme % @themes.length] + ".css"
            else if event.keyCode is 77 # m
                @state.polar_range *= 2
            else if event.keyCode is 76 # l
                @state.polar_range /= 2
            else if event.keyCode is 80 # p
                @state.polar_step *= 2
            else if event.keyCode is 79 # o
                @state.polar_step /= 2
            else if event.keyCode is 39 # Right
                w = @state.reg.X.max - @state.reg.X.min
                @state.reg.X.min += w / 10
                @state.reg.X.max += w / 10
            else if event.keyCode is 37 # Left
                w = @state.reg.X.max - @state.reg.X.min
                @state.reg.X.min -= w / 10
                @state.reg.X.max -= w / 10
            else if event.keyCode is 38 # Up
                w = @state.reg.Y.max - @state.reg.Y.min
                @state.reg.Y.min += w / 10
                @state.reg.Y.max += w / 10
            else if event.keyCode is 40 # Down
                w = @state.reg.Y.max - @state.reg.Y.min
                @state.reg.Y.min -= w / 10
                @state.reg.Y.max -= w / 10
            else if event.ctrlKey and event.keyCode is 32
                @state.functions[@state.selected].type = @function_types[@state.functions[@state.selected].type].next
                @updateBox()
                @replot()
            else if event.keyCode is 33 # PageUp
                $("#nft").removeClass "line-color-" + @state.selected
                @state.selected++
                @state.selected = 0  if @state.selected > 15
                @newSelected()
            else if event.keyCode is 34 # PageUp
                $("#nft").removeClass "line-color-" + @state.selected
                @state.selected--
                @state.selected = 15  if @state.selected < 0
                @newSelected()
            else if event.keyCode is 46 # Suppr
                @state = new State()
                location.hash = ''
                @updateBox()
                $("#nft").removeClass "line-color-" + @state.selected
                $("#ft").val @state.functions[@state.selected].expr
                $("#ft").trigger 'input'
            else if event.keyCode is 27 # Escape
                location.hash = JSON.stringify @state
            else
                return
            @replot()
        ).resize =>
            @size()
            @replot()

        @canvas = $canvas.get 0
        @c = @canvas.getContext "2d"
        @size()
        @updateBox()

        $ft.val @state.functions[@state.selected].expr
        $ft.trigger 'input'

$ ->
    graphit = new GraphIt()


# Horrible hack to get rid of the math module:
for key in [
    'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor',
    'log', 'max', 'min', 'pow', 'random', 'round', 'sin', 'sqrt', 'tan',
    'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI', 'SQRT1_2', 'SQRT2']
    window[key.toLowerCase()] = Math[key]
