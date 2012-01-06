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


class GraphIt
    pow: 1.1
    step: 1
    functions: [
       expr: "sin(pow(x, 4))/x"
       polar: false
       error: false
    ]
    selected: 0
    themes: [ "tango", "pastel", "white" ]
    theme: 0
    polar:
       range: 2
       step: 180

    reg:
       X:
           min: 0
           max: 0
           zcoef: 5

       Y:
           min: 0
           max: 0
           zcoef: 5

       tickSize: 5

    dragging:
        on: false
        x: 0
        y: 0

    Math:
        functions: [ "abs", "acos", "asin", "atan", "atan2", "ceil", "cos", "exp", "floor", "log", "max", "min", "pow", "random", "round", "sin", "sqrt", "tan" ]
        constants: [ "E", "LN2", "LN10", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2" ]

    size: ->
        @scr =
            h: @canvas.height = window.innerHeight - 25
            w: @canvas.width = window.innerWidth

    x2X: (x) ->
        @reg.X.min + (x * (@reg.X.max - @reg.X.min) / @scr.w)

    X2x: (X) ->
        @scr.w * (X - @reg.X.min) / (@reg.X.max - @reg.X.min)

    dx2DX: (dx) ->
        dx * (@reg.X.max - @reg.X.min) / @scr.w

    y2Y: (y) ->
        @scr.h + @reg.Y.min + (y * (@reg.Y.max - @reg.Y.min) / @scr.h)

    Y2y: (Y) ->
        @scr.h - @scr.h * (Y - @reg.Y.min) / (@reg.Y.max - @reg.Y.min)

    dy2DY: (dy) ->
        dy * (@reg.Y.max - @reg.Y.min) / @scr.h

    updateBox: ->
        $("#pft").html (if @functions[@selected].polar then "&#x1D746;" else "&#x1D487;")
        $("#nft").addClass "line-color-" + @selected
        $("#nft").text @selected
        $("#var").text (if @functions[@selected].polar then "o" else "x")

    prepareFunction: (ftexp) ->
        m = 0
        while m < @Math.functions.length
            ftexp = ftexp.replace(new RegExp(@Math.functions[m] + "\\(", "g"), "Math." + @Math.functions[m] + "(")
            m++
        m = 0

        while m < @Math.constants.length
            ftexp = ftexp.replace(new RegExp("@" + @Math.constants[m], "g"), "Math." + @Math.constants[m])
            m++
        ftexp

    newSelected: ->
        $("#ft").val @functions[@selected].expr
        if @functions[@selected].error
            $("#ft").addClass "error"
        else
            $("#ft").removeClass "error"
        @updateBox()


    linearPlot: (funct, i) ->
        lineNext = false
        x = 0

        while x <= @scr.w
            X = @x2X(x)
            try
                Y = funct(X)
                if isFinite(Y)
                    y = @Y2y(Y)
                    if lineNext
                        @c.lineTo x, y
                    else
                        @c.moveTo x, y
                        lineNext = true
                else
                  lineNext = false
            catch e
                @functions[i].error = true
                console.log "Stopping plot, error with " + funct + " : " + e
                return
            x++
        @functions[i].error = false

    polarPlot: (funct, i) ->
        lineNext = false
        o = 0

        while o <= @polar.range * Math.PI
            try
                r = funct(o)
                if isFinite(r)
                    X = r * Math.cos(o)
                    Y = r * Math.sin(o)
                    x = @X2x(X)
                    y = @Y2y(Y)
                    if lineNext
                        @c.lineTo x, y
                    else
                        @c.moveTo x, y
                        lineNext = true
                else
                    lineNext = false
            catch e
                @functions[i].error = true
                console.log "Stopping plot, error with " + funct + " : " + e
                return
            o += Math.PI / @polar.step
        @functions[i].error = false

    plot: ->
        $("#ft").removeClass("error")
        i = 0

        while i < @functions.length
            break if @functions[i].expr is ""
            functionValue = @prepareFunction(@functions[i].expr)
            @c.strokeStyle = $(".line-color-" + i).css("color")
            @c.beginPath()
            if @functions[i].polar
                @polarPlot ((o) ->
                    eval functionValue
                ), i
            else
                @linearPlot ((x) ->
                    eval functionValue
                ), i
            @c.stroke()
            i++
        $("#ft").addClass("error") if @functions[@selected].error

    replot: ->
        @c.fillStyle = $(".bg").css("color")
        @c.strokeStyle = $(".axis").css("color")
        @c.fillRect 0, 0, @scr.w, @scr.h
        @c.beginPath()
        yY0 = @Y2y(0)
        xX0 = @X2x(0)
        xX0 = 0  if xX0 < 0
        xX0 = @scr.w  if xX0 > @scr.w
        yY0 = 0  if yY0 < 0
        yY0 = @scr.h  if yY0 > @scr.h
        isRight = xX0 > @scr.w / 2
        isBottom = yY0 > @scr.h / 2
        @c.moveTo 0, yY0
        @c.lineTo @scr.w, yY0
        @c.moveTo xX0, 0
        @c.lineTo xX0, @scr.h
        @c.stroke()
        @c.beginPath()
        @c.fillStyle = $(".ticknum").css("color")
        range =
            X: @reg.X.max - @reg.X.min
            Y: @reg.Y.max - @reg.Y.min

        order =
            X: Math.floor(Math.log(range.X) / Math.log(10))
            Y: Math.floor(Math.log(range.Y) / Math.log(10))

        ten =
            X: Math.pow(10, order.X)
            Y: Math.pow(10, order.Y)

        fixrange =
            X: Math.abs(Math.ceil(Math.log(1 / ten.X) / Math.log(10)))
            Y: Math.abs(Math.ceil(Math.log(1 / ten.Y) / Math.log(10)))

        if range.X < 2.5 * ten.X
            ten.X /= 4
            fixrange.X += 2
        else if range.X < 5 * ten.X
            ten.X /= 2
            fixrange.X++
        if range.Y < 2.5 * ten.Y
            ten.Y /= 4
            fixrange.Y += 2
        else if range.Y < 5 * ten.Y
            fixrange.Y++
            ten.Y /= 2
        min =
            X: Math.floor(@reg.X.min / ten.X) * ten.X
            Y: Math.floor(@reg.Y.min / ten.Y) * ten.Y

        max =
            X: Math.floor(@reg.X.max / ten.X) * ten.X
            Y: Math.floor(@reg.Y.max / ten.Y) * ten.Y

        s = min.X

        while s <= max.X
            x = @X2x(s)
            st = (if ten.X < 1 then s.toFixed(fixrange.X) else s)
            unless parseFloat(st) is 0
                @c.moveTo x, yY0 - (if isBottom then @reg.tickSize else 0)
                @c.lineTo x, yY0 + (if isBottom then 0 else @reg.tickSize)
                @c.fillText st, x - 3, yY0 + (1.5 * @reg.tickSize + (if isBottom then 2 else 10)) * (if isBottom then -1 else 1)
            s += ten.X
        s = min.Y

        while s <= max.Y
            y = @Y2y(s)
            st = (if Math.abs(ten.Y) < 1 then s.toFixed(fixrange.Y) else s)
            unless parseFloat(st) is 0
                @c.moveTo xX0 + (if isRight then 0 else @reg.tickSize), y
                @c.lineTo xX0 - (if isRight then @reg.tickSize else 0), y
                @c.fillText st, xX0 + (1.5 * @reg.tickSize + (if isRight then 5 * new String(st).length else 0)) * (if isRight then -1 else 1), y + 3
            s += ten.Y
        @c.stroke()
        @c.fillStyle = $(".bg").css("color")
        @plot()

    constructor: ->
        ($ft = $("#ft")).bind "input", =>
            functionValue = $ft.val()
            return if functionValue is ""
            @functions[@selected].expr = functionValue
            @replot()
            false

        $ft.keydown =>
            if event.keyCode is 38
                $("#nft").removeClass "line-color-" + @selected
                @selected++
                @selected = 0  if @selected > 15
                @newSelected()
            else if event.keyCode is 40
                $("#nft").removeClass "line-color-" + @selected
                @selected--
                @selected = 15  if @selected < 0
                @newSelected()
            else if event.ctrlKey and event.keyCode is 32
                @functions[@selected].polar = not @functions[@selected].polar
                @updateBox()
                @replot()
            event.stopPropagation()

        $("#canvas").mousedown((event) =>
            @dragging.on = true
            @dragging.x = event.clientX
            @dragging.y = event.clientY
            event.stopPropagation()
            $("body").addClass "moving"
            $("#ft").blur()
            false
        ).mousemove((event) =>
            return unless @dragging.on
            d =
              x: @dragging.x - event.clientX
              y: @dragging.y - event.clientY

            D =
              X: @dx2DX(d.x)
              Y: @dy2DY(d.y)

            @reg.X.min += D.X
            @reg.X.max += D.X
            @reg.Y.min -= D.Y
            @reg.Y.max -= D.Y
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
            d =
                x: 0
                y: 0

            if delta < 0
                if not event.shiftKey and @mode isnt "y"
                    @reg.X.zcoef += @step
                    d.x = (Math.pow(@pow, @step) - 1) * Math.pow(@pow, @reg.X.zcoef - @step)
                if not event.altKey and @mode isnt "x"
                    @reg.Y.zcoef += @step
                    d.y = (Math.pow(@pow, @step) - 1) * Math.pow(@pow, @reg.Y.zcoef - @step)
            else
                if not event.shiftKey and @mode isnt "y"
                    d.x = (1 - Math.pow(@pow, @step)) * Math.pow(@pow, @reg.X.zcoef - @step)
                    @reg.X.zcoef -= @step
                if not event.altKey and @mode isnt "x"
                    d.y = (1 - Math.pow(@pow, @step)) * Math.pow(@pow, @reg.Y.zcoef - @step)
                    @reg.Y.zcoef -= @step
            p =
                x: event.clientX / @scr.w
                y: event.clientY / @scr.h

            @reg.X.min -= (2 * d.x * event.clientX) / @scr.w
            @reg.X.max += (2 * d.x * (@scr.w - event.clientX)) / @scr.w
            @reg.Y.min -= (2 * d.y * (@scr.h - event.clientY)) / @scr.h
            @reg.Y.max += (2 * d.y * event.clientY) / @scr.h
            @replot()
            event.stopPropagation()
            false
        )
        $(window).keydown (event) =>
            if event.keyCode is 88 # x
                @mode = "x"
            else if event.keyCode is 89 # y
                @mode = "y"
            else
                @mode = null
            if event.keyCode is 82 # r
                r =
                    X: @reg.X.max - @reg.X.min
                    Y: @reg.Y.max - @reg.Y.min

                @reg.X.min = -r.X / 2
                @reg.X.max = r.X / 2
                @reg.Y.min = -r.Y / 2
                @reg.Y.max = r.Y / 2
                @replot()
            else if event.keyCode is 84 # t
                @reg.X.zcoef = @reg.Y.zcoef = 1
                nw =
                    x: Math.pow(@pow, @reg.X.zcoef)
                    y: Math.pow(@pow, @reg.Y.zcoef)

                @reg.X.min = -nw.x
                @reg.X.max = nw.x
                @reg.Y.min = -nw.y
                @reg.Y.max = nw.y
                @replot()
            else if event.keyCode is 83 # s
                $("#theme")[0].href = @themes[++@theme % @themes.length] + ".css"
                @replot()
            else if event.keyCode is 77 # m
                @polar.range *= 2
                @replot()
            else if event.keyCode is 76 # l
                @polar.range /= 2
                @replot()
            else if event.keyCode is 80 # p
                @polar.step *= 2
                @replot()
            else if event.keyCode is 79 # o
                @polar.step /= 2
                @replot()

        $(window).resize =>
            @size()
            @replot()

        @canvas = $("#canvas").get(0)
        @c = @canvas.getContext("2d")
        @size()
        nw =
            x: Math.pow(@pow, @reg.X.zcoef)
            y: Math.pow(@pow, @reg.Y.zcoef)

        @reg.X.min -= nw.x
        @reg.X.max += nw.x
        @reg.Y.min -= nw.y
        @reg.Y.max += nw.y
        t = 1

        while t < 16
            @functions[t] =
                expr: ""
                polar: false
            t++
        @updateBox()
        $ft.val @functions[0].expr
        $ft.trigger 'input'

$ ->
    graphit = new GraphIt()
