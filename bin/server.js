var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);
var url = require('url');

server.listen(80);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get(/\/(css|js)\/.*/, function(req, res) {
  var path = url.parse(req.url).pathname;
  res.sendfile(__dirname + '/' + path);
});

pixels = [[]];
palette = [
{r:0,g:0,b:0},
{r:255,g:0,b:0},
{r:0,g:255,b:0},
{r:0,g:0,b:255},
{r:0,g:255,b:255},
{r:255,g:0,b:255},
{r:255,g:255,b:0},
{r:255,g:255,b:255}
];

setPixel = function(idx, x, y) {
	if (!pixels[x]) pixels[x] = [];
	pixels[x][y] = idx;
}

setPalette = function(idx, newVal) {
	if (idx > -1) palette[idx] = newVal;
}

io.sockets.on('connection', function (socket) {
  for (var i in palette) {
    socket.emit('palette', {type: "palette", "color": i, "rgb": palette[i]});
  }

  for (var i in palette) {
    var output = [];
    for (var x in pixels) {
      for (var y in pixels[x]) {
	    if (pixels[x][y] == i) {
		  output.push([x,y]);
		}
  	  }
    }
	socket.emit('palette', {type: "pixel", "color": i, "pixels": output});


  }

  socket.on('palette', function (data) {
  	if (data.type == 'pixel') {
  		for (var j in data.pixels) {
  			setPixel(data.color, data.pixels[j][0], data.pixels[j][1]);
  		}
  		console.log('new pixel contents: ', pixels);
  	} else {
  		setPalette(data.color, data.rgb);
  		console.log('new palette contents: ', palette);
  	}
      io.sockets.emit('palette', data);
    });
});
