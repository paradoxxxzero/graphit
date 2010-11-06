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

var _canvas, _c, _w, _h, _w2, _h2;
var _tickSize = 5;

var _xzcoef = 1;
var _yzcoef = 1;

var _minx = -5;
var _maxx = 5;
var _sx = _maxx - _minx;
var _sx2 = _sx / 2;
var _miny = -3;
var _maxy = 3;
var _sy = _maxy - _miny;
var _sy2 = _sy / 2;
var _MathFunctions = [ "abs", "acos", "asin", "atan", "atan2", "ceil", "cos", "exp", "floor", "log", "max", "min", "pow", "random", "round", "sin", "sqrt", "tan" ];


function i2x(i) {
    return i * _sx / _w - _sx2;
}
function x2i(x) {
    return _w2 + x * _w / _sx;
}
function j2y(j) {
    return _h + (j * _sy / _h - _sy2 / 2);
}
function y2j(y) {
    return _h - (_h2 + y * _h / _sy);
}

function initAxis() { 
    _c.fillStyle = "#222";
    _c.strokeStyle = "#444";
    _c.fillRect(0, 0, _w, _h);
    _c.beginPath();
    _c.moveTo(_w2, 0);
    _c.lineTo(_w2, _h);
    _c.moveTo(0, _h2);
    _c.lineTo(_w, _h2);
    _c.stroke();

    _c.beginPath();
    _c.fillStyle = "#448";
    for(var s = _minx ; s <= _maxx ; s++) {
	var i  = x2i(s);
	_c.moveTo(i, _h2);
	_c.lineTo(i, _h2 + _tickSize);
	_c.fillText(s, i - 3, _h2 + 1.5 * _tickSize + 10);
    }
    for(var s = _miny ; s <= _maxy ; s++) {
	var j = y2j(s);
	_c.moveTo(_w2, j);
	_c.lineTo(_w2 - _tickSize, j);
	_c.fillText(s, _w2 - 1.5 * _tickSize - 10, j + 3);
    }
    _c.stroke();
    _c.fillStyle = "#222";
    _c.strokeStyle = "#888";
}
function plot() {
    _c.beginPath();
    var lineNext = false; 
    for(var i = 0 ; i <= _w ; i++) {
	var x = i2x(i);
	try {
	    var y = evalFunction(x);
	    if(isFinite(y)) {
		var j = y2j(y);
		if(lineNext) {
		    _c.lineTo(i, j);
		} else {
		    _c.moveTo(i, j);
		    lineNext = true;
		}
	    } else {
		lineNext = false;
	    }
	} catch(e) {
	    console.log("Stopping plot, error with " + evalFunction + " : " + e);
	    $('#ft').addClass("error");
	    return;
	}
    }
    $('#ft').removeClass("error");
    _c.stroke();
}

function replot() {
    initAxis();
    plot();
}

function size() {
    _h = _canvas.height = window.innerHeight - 25;
    _w = _canvas.width = window.innerWidth;
    _h2 = _h / 2;
    _w2 = _w / 2;
}

function resize() {
    size();
    replot();
}

function prepareFunction(ftexp) {
    for (var m = 0 ; m < _MathFunctions.length ; m++) {
	ftexp = ftexp.replace(_MathFunctions[m] + "(", "Math." + _MathFunctions[m] + "(");	
    }
    return ftexp;
}

function ftInput() {
    var functionValue = $('#ft')[0].value;
    if(functionValue == "") return;
    functionValue = prepareFunction(functionValue);
    window["evalFunction"] = function (x) {
	return eval(functionValue);
    };
    replot();
}

function mdown(event) {
    
}

function mmove(event) {
    
}

function mup(event) {
    
}






function wheelff(event) {
    wheel(event.detail > 0);
}

function wheelchrome(event) {
    wheel(event.wheelDelta > 0);
}

function wheel(up) {
    _minx = up ? _minx / 1.25 : _minx * 1.25;
    _maxx = up ? _maxx / 1.25 : _maxx * 1.25;
     _sx = _maxx - _minx;
    _sx2 = _sx / 2;
    _miny = up ? _miny / 1.25 : _miny * 1.25;
    _maxy = up ? _maxy / 1.25 : _maxy * 1.25;
     _sy = _maxy - _miny;
    _sy2 = _sy / 2;
    replot();
}


window.addEventListener('load', function() {
    $('#ft')[0].addEventListener('input', ftInput, false);
    var body = $('body')[0];
    body.addEventListener('mousedown', mdown, false);
    body.addEventListener('mousemove', mmove, false);
    body.addEventListener('mouseup', mup, false);
    body.addEventListener('mousewheel', wheelchrome, false);
    body.addEventListener('DOMMouseScroll', wheelff, false);
    window.addEventListener('resize', resize, false);
    _canvas = $('#canvas')[0];
    _c = _canvas.getContext('2d');
    size();
    ftInput();
}, false);
