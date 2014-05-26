/** Utility functions **/
function makeLine(x0, y0, x1, y1){
   var dx = Math.abs(x1 - x0);
   var dy = Math.abs(y1 - y0);
   var sx = (x0 < x1) ? 1 : -1;
   var sy = (y0 < y1) ? 1 : -1;
   var err = dx - dy;

   while(true){
   	 instructor.add([x0, y0]);
     setPixel(x0, y0);
     if ((x0==x1) && (y0==y1)) break;
     var e2 = 2*err;
     if (e2 >-dy){ err -= dy; x0 += sx; }
     if (e2 < dx){ err += dx; y0 += sy; }
   }
}

function componentToHex(c) {
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}


function drawPixelFromMouseEvent(e) {
	var px = Math.floor((e.offsetX || e.clientX - $(e.target).offset().left) / 16);
	var py = Math.floor((e.offsetY || e.clientY - $(e.target).offset().top) / 16);
	instructor.add([px, py]);
	if (window.pixelLast) {
		makeLine(px, py, window.pixelLast[0], window.pixelLast[1]);
	} else {
		setPixel(px, py);
	}
	window.pixelLast = [px, py];
};

function setPixel(x, y) {
	setArrayPixel(x, y);
	drawPixelToCanvas(x, y);
};

function setArrayPixel(x, y) {
	if (!colours[x]) colours[x] = [];
	if (penIndex == -1) {
		colours[x][y] = undefined;
	} else {
		colours[x][y] = penIndex;
	}
}

function drawPixelToCanvas(x, y) {
	if (penIndex == -1) {
		context.clearRect(x * 16, y * 16, 16, 16);
	} else {
		context.fillRect(x * 16, y * 16, 16, 16);
	}
}

function setPalette(idx, newValue) {
	setPaletteColorSwatch(idx, newValue);
	context.fillStyle = newValue;
	var temp = penIndex;
	penIndex = idx;
	redrawPixels(idx);
	penIndex = temp;
};

function setPaletteColorSwatch(idx, newValue) {
	$('#palette').children().eq(idx+1).data('color', newValue).css({
		backgroundColor: newValue
	});
};

function redrawPixels(idx) {
	for (var x in colours) {
		for (var y in colours[x]) {
			if (colours[x][y] == idx) {
				drawPixelToCanvas(x, y);
			}
		}
	}
};

$_setPenColor = function () {
	$('.currentColor').removeClass('currentColor');
	$(this).addClass('currentColor');
	context.fillStyle = $(this).data("color");
	penIndex = $(this).index() - 1;
	$('#colorPicker div').slider("option", "disabled", penIndex == -1);
	if (penIndex > -1) {
		var c = hexToRgb($(this).data("color"));
		$('#red-slider').slider("value", c.r);
		$('#green-slider').slider("value", c.g);
		$('#blue-slider').slider("value", c.b);
	}
};

/* Instructor: makes Instructions. */
var instructor = {
	pixels: [],

	startPixelInstruction: function () {
		this.pixels = [];
	},

	add: function (px) {
		for (var i in this.pixels) {
			if (this.pixels[i][0] == px[0] && this.pixels[i][1] == px[1]) {
				return;
			}
		}
		this.pixels.push(px);
	},

	finishPixelInstruction: function (color) {
		var instruction = {
			type: "pixel",
			color: color,
			pixels: this.pixels
		};
		this.pixels = [];
		return instruction;
	},

	makePaletteInstruction: function (color, rgb) {
		return {
			type: "palette",
			color: color,
			rgb: rgb
		};
	}
};

/* Painter: takes in commands and draws them. */
var painter = {
	apply: function (instruction) {
		switch (instruction.type) {
			case "pixel":
				var prevPen = context.fillStyle;
				var prevIdx = penIndex;
				penIndex = parseInt(instruction.color);
				context.fillStyle = $('#palette li').eq(parseInt(instruction.color) + 1).data('color');
				console.log(instruction.color + ":" + context.fillStyle);
				for (var pixel in instruction.pixels) {
					var thisPixel = instruction.pixels[pixel];
					setPixel(thisPixel[0], thisPixel[1]);
				}
				context.fillStyle = prevPen;
				penIndex = prevIdx;
				break;
			case "palette":
				setPalette(
				parseInt(instruction.color),
				rgbToHex(
				instruction.rgb.r,
				instruction.rgb.g,
				instruction.rgb.b));
				if (instruction.color == penIndex) {
					$('#red-slider').slider('value', instruction.rgb.r);
					$('#green-slider').slider('value', instruction.rgb.g);
					$('#blue-slider').slider('value', instruction.rgb.b);
				}
				break;
		}
	}
};


var colours = [
	[]
];

var penIndex = 0;
var context;

$(document).ready(function() {
	context = $('#mainDraw')[0].getContext("2d");
	context.fillStyle = $('#palette li').eq(1).data('color');

	$('li').each(function () {
		$(this).css({
			backgroundColor: $(this).data('color')
		});
	});

	$('canvas').mousedown(function (e) {
		if (e.which == 1) {
			window.mouseLast = e;
			context.fillStyle = $('#palette li').eq(penIndex + 1).data('color');
			window.writing = true;
			instructor.startPixelInstruction();
			drawPixelFromMouseEvent(e);
		}
	});

	$('canvas, body').mouseup(function (e) {
		if (e.which == 1) {
			window.pixelLast = null;
			window.writing = false;
			var fin = instructor.finishPixelInstruction(penIndex);
			socket.emit('palette', fin);
		}

	});

	$('canvas').mousemove(function (e) {
		if (window.writing) {
			drawPixelFromMouseEvent(e);
		}
	});



	$('#palette li').click($_setPenColor);

	$('#addColor').click(function () {
		var colorId = $('#addColorInput').val();
		$('<li data-color="' + colorId + '">' + colorId + '</li>')
			.appendTo($('#palette')).click($_setPenColor);
	});

	$("#red-slider, #green-slider, #blue-slider").css({
		width: '300px',
		display: 'inline-block'
	}).slider({
		min: 0,
		max: 255,
		width: 300,
		change: function (e) {
			if (e.originalEvent) {
				var hex = rgbToHex(
				$('#red-slider').slider("value"),
				$('#green-slider').slider("value"),
				$('#blue-slider').slider("value"));
				setPalette(penIndex, hex);
				var fin = instructor.makePaletteInstruction(penIndex, hexToRgb(hex))
				socket.emit('palette', fin);
			}
		}
	});
});

