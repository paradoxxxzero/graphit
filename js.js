/*
  2dplo.tk - A free fast online plotter - http://2dplo.tk/
  
  Copyright (C) 2010 Mounier Florian aka paradoxxxzero
  
  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as
  published by the Free Software Foundation, either version 3 of the
  License, or any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see http://www.gnu.org/licenses/.
*/

var _canvas, _c, _scr, _mode;
var _pow = 1.1;
var _step = 1;
var _functions = [ ];
var _selected = 0;
var _themes = [ "pastel", "white", "tango" ];
var _theme = 0;
var _reg = {
    X: {
	min: 0,
	max: 0,
	zcoef: 5},
    Y: {
	min: 0,
	max: 0,
	zcoef: 5},
    tickSize: 5};
var _dragging = {
    on: false,
    x: 0,
    y: 0};

var _Math = {
    functions: [ "abs", "acos", "asin", "atan", "atan2", "ceil", "cos", "exp", "floor", "log", "max", "min", "pow", "random", "round", "sin", "sqrt", "tan" ],
    constants: ["E", "LN2", "LN10", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"]};

function x2X(x) {
    return _reg.X.min + (x * (_reg.X.max - _reg.X.min) / _scr.w);
}
function X2x(X) {
    return _scr.w * (X - _reg.X.min) / (_reg.X.max - _reg.X.min);
}
function dx2DX(dx) {
    return dx * (_reg.X.max - _reg.X.min) / _scr.w;
}
function y2Y(y) {
    return _scr.h + _reg.Y.min + (y * (_reg.Y.max - _reg.Y.min) / _scr.h);
}
function Y2y(Y) {
    return _scr.h - _scr.h * (Y - _reg.Y.min) / (_reg.Y.max - _reg.Y.min);
}
function dy2DY(dy) {
    return dy * (_reg.Y.max - _reg.Y.min) / _scr.h;
}

function initAxis() { 
    _c.fillStyle = $(".bg").css("color");
    _c.strokeStyle = $(".axis").css("color");
    _c.fillRect(0, 0, _scr.w, _scr.h);
    _c.beginPath();
    var yY0 = Y2y(0);
    var xX0 = X2x(0);
    if(xX0 < 0) xX0 = 0;
    if(xX0 > _scr.w) xX0 = _scr.w;
    if(yY0 < 0) yY0 = 0;
    if(yY0 > _scr.h) yY0 = _scr.h;
    var isRight = xX0 > _scr.w / 2;
    var isBottom = yY0 > _scr.h / 2;
    _c.moveTo(0, yY0);
    _c.lineTo(_scr.w, yY0);
    _c.moveTo(xX0, 0);
    _c.lineTo(xX0, _scr.h);
    _c.stroke();
    _c.beginPath();
    _c.fillStyle = $(".ticknum").css("color");
    var range = {
	X: _reg.X.max - _reg.X.min,
	Y: _reg.Y.max - _reg.Y.min};
    var order = {
	X: Math.floor(Math.log(range.X)/Math.log(10)),
	Y: Math.floor(Math.log(range.Y)/Math.log(10))};
    var ten = {
	X: Math.pow(10, order.X),
	Y: Math.pow(10, order.Y)};
    var fixrange = {
	X: Math.abs(Math.ceil(Math.log(1 / ten.X) / Math.log(10))),
	Y: Math.abs(Math.ceil(Math.log(1 / ten.Y) / Math.log(10)))};

    if(range.X < 2.5 * ten.X) {
	ten.X /= 4;
	fixrange.X += 2;
    } else if(range.X < 5 * ten.X) {
	ten.X /= 2;
	fixrange.X++;
    }
    if(range.Y < 2.5 * ten.Y) {
	ten.Y /= 4;
	fixrange.Y += 2;
    } else if(range.Y < 5 * ten.Y) {
	fixrange.Y++;
	ten.Y /= 2;
    }
    var min = {
	X: Math.floor(_reg.X.min / ten.X) * ten.X,
	Y: Math.floor(_reg.Y.min / ten.Y) * ten.Y};
    var max = {
	X: Math.floor(_reg.X.max / ten.X) * ten.X,
	Y: Math.floor(_reg.Y.max / ten.Y) * ten.Y};

    for(var s = min.X  ; s <= max.X ; s += ten.X) {
	var x  = X2x(s);
	var st = ten.X < 1 ? s.toFixed(fixrange.X) : s;
	if(parseFloat(st) != 0) {
	    _c.moveTo(x, yY0 - (isBottom ? _reg.tickSize : 0));
	    _c.lineTo(x, yY0 + (isBottom ? 0 : _reg.tickSize));
	    _c.fillText(st, x - 3, yY0 + (1.5 * _reg.tickSize + (isBottom ? 2 : 10)) * (isBottom ? -1 : 1));
	}
    }

    for(var s = min.Y ; s <= max.Y ; s += ten.Y) {
	var y = Y2y(s);
	var st = Math.abs(ten.Y) < 1 ? s.toFixed(fixrange.Y) : s;
	if(parseFloat(st) != 0) {
	    _c.moveTo(xX0 + (isRight ? 0 : _reg.tickSize), y);
	    _c.lineTo(xX0 - (isRight ? _reg.tickSize : 0), y);
	    _c.fillText(st, xX0 + (1.5 * _reg.tickSize + (isRight ? 5 * new String(st).length : 0)) * (isRight ? -1 : 1), y + 3);
	}
    }
    _c.stroke();
    _c.fillStyle = $(".bg").css("color");
}

function plot() {
    for(var i = 0 ; i < _functions.length ; i++) {
	var functionValue = prepareFunction(_functions[i]);
	var funct = function (x) { return eval(functionValue); };
	_c.strokeStyle = $(".line-color-" + i).css("color");
	_c.beginPath();
	var lineNext = false; 
	for(var x = 0 ; x <= _scr.w ; x++) {
	    var X = x2X(x);
	    try {
		var Y = funct(X);
		if(isFinite(Y)) {
		    var y = Y2y(Y);
		    if(lineNext) {
			_c.lineTo(x, y);
		    } else {
			_c.moveTo(x, y);
			lineNext = true;
		    }
		} else {
		    lineNext = false;
		}
	    } catch(e) {
		$('#ft').addClass("error");
		console.log("Stopping plot, error with " + _functions[i] + " : " + e);
		return;
	    }
	}
	$('#ft').removeClass("error");
	_c.stroke();
    }
}

function replot() {
    initAxis();
    plot();
}

function size() {
    _scr = {
	h: _canvas.height = window.innerHeight - 25,
	w: _canvas.width = window.innerWidth};
}

function resize() {
    size();
    replot();
}

function prepareFunction(ftexp) {
    for (var m = 0 ; m < _Math.functions.length ; m++) {
	ftexp = ftexp.replace(new RegExp(_Math.functions[m] + "\\(", "g"), "Math." + _Math.functions[m] + "(");
    }
    for (var m = 0 ; m < _Math.constants.length ; m++) {
	ftexp = ftexp.replace(new RegExp("_" + _Math.constants[m], "g"), "Math." + _Math.constants[m]);
    }
    return ftexp;
}

function ftInput() {
    var functionValue = $('#ft').val();
    if(functionValue == "") return;
    _functions[_selected] = functionValue;
    replot();
    return false;
}

function mdown(event) {
    _dragging.on = true;
    _dragging.x = event.clientX;
    _dragging.y = event.clientY;
    event.stopPropagation();
    $("body").addClass("moving");
    $('#ft').blur();
    return false;
}

function mmove(event) {
    if(!_dragging.on) return;
    var d = {
	x: _dragging.x - event.clientX,
	y: _dragging.y - event.clientY};
    var D = {
	X: dx2DX(d.x),
	Y: dy2DY(d.y)};
    _reg.X.min += D.X;
    _reg.X.max += D.X;
    _reg.Y.min -= D.Y
    _reg.Y.max -= D.Y;
    _dragging.x = event.clientX;
    _dragging.y = event.clientY;
    event.stopPropagation();
    replot();
    return false;
}

function mup(event) {
    _dragging.on = false;
    event.stopPropagation();
    $("body").removeClass("moving");
    return false;
}

function wheel(event, delta) {
    var d = {
	x: 0,
	y: 0};
    if(delta < 0) { // Zoom out
	if(!event.shiftKey && _mode != 'y') {
	    _reg.X.zcoef += _step;
	    // a^n - a^(n-k) = (a^k-1)a^(n-k)
	    // <=> Math.pow(_pow, _reg.X.zcoef) - Math.pow(_pow, _reg.X.zcoef - _step)
	    d.x = (Math.pow(_pow, _step) - 1) * Math.pow(_pow, _reg.X.zcoef - _step); 
	}
	if(!event.altKey && _mode != 'x') {
	    _reg.Y.zcoef += _step;
	    d.y = (Math.pow(_pow, _step) - 1) * Math.pow(_pow, _reg.Y.zcoef - _step); 
	}

    } else { // Zoom in	
	if(!event.shiftKey && _mode != 'y') {
	    d.x = (1 - Math.pow(_pow, _step)) * Math.pow(_pow, _reg.X.zcoef - _step);
	    _reg.X.zcoef -= _step;
	}
	if(!event.altKey && _mode != 'x') {
	    d.y = (1 - Math.pow(_pow, _step)) * Math.pow(_pow, _reg.Y.zcoef - _step);
	    _reg.Y.zcoef -= _step;
	}
    }
    var p = {
	x: event.clientX / _scr.w,
	y: event.clientY / _scr.h};

    _reg.X.min -= (2 * d.x * event.clientX) / _scr.w;
    _reg.X.max += (2 * d.x * (_scr.w - event.clientX)) / _scr.w;
    _reg.Y.min -= (2 * d.y * (_scr.h - event.clientY)) / _scr.h;
    _reg.Y.max += (2 * d.y * event.clientY) / _scr.h;
    replot();
    event.stopPropagation();
    return false;
}

function kdown(event) {
    if(event.keyCode == 88) _mode = 'x';
    else if(event.keyCode == 89) _mode = 'y';
    else _mode = undefined;

    if(event.keyCode == 82) { // r
	var r = {
	    X: _reg.X.max - _reg.X.min,
	    Y: _reg.Y.max - _reg.Y.min};
	_reg.X.min = -r.X / 2;
	_reg.X.max =  r.X / 2;
	_reg.Y.min = -r.Y / 2;
	_reg.Y.max =  r.Y / 2;
	replot();
    } else if(event.keyCode == 84) { // t
	_reg.X.zcoef = _reg.Y.zcoef = 1;
	var nw = { 
	    x: Math.pow(_pow, _reg.X.zcoef),
	    y: Math.pow(_pow, _reg.Y.zcoef)};
	
	_reg.X.min = -nw.x;
	_reg.X.max =  nw.x;
	_reg.Y.min = -nw.y;
	_reg.Y.max =  nw.y;
	replot();
    } else if(event.keyCode == 83) { // s
	$("#theme")[0].href = _themes[++_theme % _themes.length] + '.css';
	setTimeout(replot, 500);
    }
}
function ftkdown(event) {
    $("#nft").removeClass("line-color-" + _selected);
    if(event.keyCode == 38) { // up
	if(_selected < 15) {
	    _selected++;
	    $("#ft").val(_functions[_selected]);
	}
    } else if(event.keyCode == 40) { // down
	if(_selected > 0) {
	    _selected--;
	    $("#ft").val(_functions[_selected]);
	}
    }
    $("#nft").addClass("line-color-" + _selected);
    $("#nft").text(_selected);
    event.stopPropagation(); 
}

$(window).load(function() {
    $('#ft').bind('input', ftInput);
    $('#ft').keydown(ftkdown);
    var eventSource = $('canvas');
    eventSource.mousedown(mdown);
    eventSource.mousemove(mmove);
    eventSource.mouseup(mup);
    eventSource.mouseout(mup);
    eventSource.mousewheel(wheel);
    $(window).keydown(kdown);
    $(window).resize(resize);
    _canvas = $('#canvas')[0];
    _c = _canvas.getContext('2d');
    size();
    var nw = { 
	x: Math.pow(_pow, _reg.X.zcoef),
	y: Math.pow(_pow, _reg.Y.zcoef)};
    _reg.X.min -= nw.x;
    _reg.X.max += nw.x;
    _reg.Y.min -= nw.y;
    _reg.Y.max += nw.y;
    ftInput();
});
