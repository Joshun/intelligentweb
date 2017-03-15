/**
 * server.js
 */

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');

var port = process.env.PORT || 3000;

server.listen(port, function() {
  console.log('Server listening on port %d', port);
})

// Routing
app.use(express['static'](__dirname + '/public'));

app.all('*', function(req, res) {
  fs.exists(req.path, function(exists) {
    if (exists) {
      res.render(req.path);
    }
    else {
      req.error = req.path + '404 File not found';
      res.redirect('/404.html?error=' + req.error);
    }
  })
})
