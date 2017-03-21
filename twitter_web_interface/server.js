/**
 * server.js
 */

var express = require('express');
var app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');

var config = require('./config.json');

var port = process.env.PORT || 3000;

var twitter = require('./twitter.js')

// creates a connection to the Twitter API, such that data may be queried
var Twit = require('twit');
var T = new Twit({
  consumer_key:        config.twitter.consumer_key,
  consumer_secret:     config.twitter.consumer_secret,
  access_token:        config.twitter.access_token,
  access_token_secret: config.twitter.access_token_secret,
  timeout_ms:          30000
});

// specifies which port the server should be hosted on
server.listen(port, function() {
  console.log('Server listening on port %d', port);
})

// allows paths to be defined relative to the public folder
app.use(express['static'](__dirname + '/public'));

// retrieves the most recent tweet on a specified user's timeline, and outputs it on the console
app.get('/test', function(req, res) {
  T.get('statuses/user_timeline', {screen_name: 'EndoMatrix', count: 1}, function(errors, tweets, response) {
    if(errors) throw errors;
    console.log(tweets);
      res.redirect('/');
  })
});

// retrieves the relevant file to render, or returns a 404 error if none exists
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
