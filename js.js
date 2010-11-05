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
var _min = -5;
var _max = 5;
var _s = _scale = _max - _min;
var _s2 = _s / 2;

function i2x(i) {
    return i * _s / _w - _s2;
}
function x2i(x) {
    return _w2 + x * _w / _s2;
}
function j2y(j) {
    return _h + (j * _s / _h - _s2 / 2);
}
function y2j(y) {
    return _h - (_h2 + y * _h / _s);
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
    for(var s = _min ; s <= _max ; s++) {
	var i  = x2i(s);
	_c.moveTo(i, _h2);
	_c.lineTo(i, _h2 + _tickSize);
	_c.fillText(s, i - 3, _h2 + 1.5 * _tickSize + 10);
    }
    for(var s = _min ; s <= _max ; s++) {
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
	    return;
	}
    }
    _c.stroke();
}

function ftInput() {
    var functionValue = document.getElementById('ft').value;
    if(functionValue == "") return;
    window["evalFunction"] = function (x) {
	return eval(functionValue);
    };
    initAxis();
    plot();
}

function wheelff(event) {
    wheel(event.detail > 0);
}

function wheelchrome(event) {
    wheel(event.wheelDelta > 0);
}

function wheel(up) {
    _min = up ? _min / 1.25 : _min * 1.25;
    _max = up ? _max / 1.25 : _max * 1.25;
     _s = _scale = _max - _min;
    _s2 = _s / 2;
    initAxis();
    plot();
}

window.addEventListener('load', function() {
    document.getElementById('ft').addEventListener('input', ftInput, false);
    document.getElementById('body').addEventListener('mousewheel', wheelchrome, false);
    document.getElementById('body').addEventListener('DOMMouseScroll', wheelff, false);
    _canvas = document.getElementById("canvas");
    _c = canvas.getContext('2d');
    _h = canvas.height = window.innerHeight - 25;
    _w = canvas.width = window.innerWidth;
    _h2 = _h / 2;
    _w2 = _w / 2;
    initAxis();
    ftInput();
}, false);
