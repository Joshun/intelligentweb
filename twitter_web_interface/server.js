/**
 * server.js
 */


var express = require('express');
var app     = express();

var server  = require('http').Server(app);
var io      = require('socket.io')(server);
var fs      = require('fs');

var config  = require('./config.json');
var client  = require('./client.js');
var db      = require('./storage.js');
var helper  = require('./helper.js');

// creates a connection to the Twitter API, such that data may be queried

var port = process.env.PORT || 3000;

// specifies which port the server should be hosted on
server.listen(port, function() {
  helper.info('Server listening on port %d', port);
});

// allows paths to be defined relative to the public folder
app.use(express['static'](__dirname + '/public'));

// retrieves the most recent tweet on a specified user's timeline, and outputs it on the console
app.get('/test', test);

io.of('/').on('connection', function(socket) {
  helper.info("Connection Created");
  socket.on('query', function(data) {
    // TODO: OR is list query, AND is concatenating terms
    db.getPreviousSearches(data)
          .then(function(data){
            console.log("RECEIVED:");
            console.log(data);
          });
 // client.get_tweets([data.player_query,        data.team_query])          
    client.get_tweets([data.player_query + ' ' + data.team_query])
      .then(function(tweets) {
  	    helper.info("QUERY PROCESSED");
        db.logSearch(data)
          .then(function(data){
            console.log("LOG DONE");
            console.log(data);
            var primaryKey = data.insertId;
            db.storeTweetData(tweets.data, primaryKey)
              .catch(function(error) {
                console.log(error);
              })
              .then(function(data) {
                console.log(data);
                console.log("STORED.");
              });
          });
  	    socket.emit('results', tweets.data); // TODO return results based on query
      })
      .catch(function(errors) {
        throw errors;
      });
  });
});

function test(req, res) {
  client.T.get('statuses/user_timeline', {screen_name: 'EndoMatrix', count: 1}, function(errors, tweets, response) {
    if(errors) throw errors;
    helper.info(tweets);
    res.redirect('/');
  });
}

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
