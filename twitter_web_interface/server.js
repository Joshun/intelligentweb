/**
 * server.js
 */

var express = require('express');
var app     = express();

var server  = require('http').Server(app);
var io      = require('socket.io')(server);
var fs      = require('fs');

var config  = require('./config.json');
var client  = require('./client.js').T;
var db      = require('./storage.js');
var helper  = require('./helper.js');

// creates a connection to the Twitter API, such that data may be queried
Twitter = require("./twitter.js");

new Twitter().getFrequencyPastWeek("Henderson's Relish")
  .then(function (result) {
      console.log("success:");
      console.log(result);
  })
  .catch(function(err) {
    console.log("error:");
    console.log(err);
  });

var port = process.env.PORT || 3000;

// specifies which port the server should be hosted on
server.listen(port, function() {
  console.log('Server listening on port %d', port);
});

// allows paths to be defined relative to the public folder
app.use(express['static'](__dirname + '/public'));

// retrieves the most recent tweet on a specified user's timeline, and outputs it on the console
app.get('/test', test);

io.of('/').on('connection', function(socket) {
  helper.info("Connection Created");
  var query;
  socket.on('query', function(data) {

    if (data.player_query.length == 0) {
      query = data.team_query;
    } else {
      query = data.player_query;
    }
    // TODO: OR is list query, AND is concatenating terms
 // client.get('search/tweets', { q: [data.player_query,        data.team_query], count: 100}, function(err, req, res) {
    client.get('search/tweets', { q:  data.player_query + " " + data.team_query,  count: 100})
      .then(function(tweets) {
  	    helper.info("QUERY PROCESSED");

  	    socket.emit('results', tweets.data); // TODO return results based on query
      })
      .catch(function(errors) {
        throw errors;
      });
  });
});

function test(req, res) {
  client.get('statuses/user_timeline', {screen_name: 'EndoMatrix', count: 1}, function(errors, tweets, response) {
    if(errors) throw errors;
    console.log(tweets);
    res.redirect('/');
  });
}

// specifies which port the server should be hosted on
server.listen(port, function() {
  console.log('Server listening on port %d', port);
});

// retrieves the relevant file to render, or returns a 404 error if none exists
app.all('*', function(req, res) {
  fs.exists(req.path, function(exists) {
    if (exists) {
      res.render(req.path);
    }
    else {
      req.error = req.path + '404 File not found';
//    res.redirect('/404.html?error=' + req.error);
    }
  });
});
