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

var port    = process.env.PORT || 3000;

process.stdin.resume();

process.on('SIGINT', function() {
  helper.info("Program Terminated");
  process.exit();
});

// specifies which port the server should be hosted on
server.listen(port, function() {
  helper.info('Server Listening on Port %d', port);
});

// allows paths to be defined relative to the public folder
app.use(express['static'](__dirname + '/public'));

// retrieves the most recent tweet on a specified user's timeline, and outputs it on the console
io.of('/').on('connection', function(socket) {
  var tweets;
  var stream;

  // callback function, stored here to preserve scope
  var tweet_reply = function(reply, query) {
    helper.info("Tweets Update Received, Processing...");
    // if (reply.data.errors) {
    // 	throw reply.data.errors; // if reply object is an error, abort.
    // 	return;
    // }

    socket.emit('reply_tweets', reply.data);
    helper.info("Tweets Update Complete");

    // generates connection to twitter stream, and listens for tweets
    console.log(db.generate_query(query));
    stream = client.get_stream(db.generate_query(query).replace(' OR ', ', '));

    // generates socket.io emission to webpage with live tweets
    stream.on('tweet', function(reply) {
      helper.debug("Stream Update Received, Processing...");
      socket.emit('reply_stream', reply);
      helper.debug("Stream Update Complete");
    });

    // // generates an error if the query is invalid
    // stream.catch(function(error) {
    //   helper.error("Invalid Query");
    //   throw error;
    // });
  };

  // callback function, stored here to preserve scope
  var tweet_error = function(error) {
      helper.error("Invalid Query");
      throw error;
  };

  // callback function, stored here to preserve scope
  socket.on('query', function(query) {
    var prev_query = db.getPreviousSearches(query);

    prev_query.then(function(data) {
      helper.info("PREVIOUS SEARCHES: " + (data.length > 0  ? "yes" : "no"));
 
      if (data.length > 0) {
        // for now, just use the first previous search if present
        previousSearch = data[0];
        helper.info("USING PREVIOUS SEARCH");
        helper.debug("Retrieved:");
        helper.debug(previousSearch);

        var prev_tweet;
        helper.info("GETTING PREVIOUS TWEETS...");
        prev_tweet = db.getPreviousTweets(previousSearch.id);
        prev_tweet.catch(function(error) {

        });

        prev_tweet.then(function(data) {
          var prevTweets = [];
          for (var i=0; i<data.length; i++) {
            prevTweets.push(db.savedTweetToWeb(data[i]));
          }

          helper.info("GETTING NEW TWEETS...");
          tweets = client.get_tweets(db.generate_query(query));
          // tweets = client.get_tweets([query.player_query + ' ' + query.team_query]);
          // tweets = client.get_tweets([query.player_query,        query.team_query]);

          // generates socket.io emission to webpage with tweets
          tweets.then(function(reply) {
            helper.info("LOGGING SEARCH RESULT...");
            db.logSearch(query)
              .catch(function(error) {

              })
              .then(function(data) {
                helper.info("STORING TWEETS...");
                // helper.debug("REPLY: ");
                // console.log(reply);
                db.storeTweetData(reply.data, data.insertId);
              });
            // var combinedStore = prevTweets.concat(reply.data.statuses);
            var combinedStore = reply.data.statuses.concat(prevTweets);
            // tweet_reply(reply, query);
            socket.emit('reply_tweets', {statuses: combinedStore});
          });

          // generates an error if the query is valid
          tweets.catch(function(error) {
            tweet_error(error);
          });
          // END TWITTER SEARCH

        });
      }
      else {
        helper.info("MAKING REFRESH TWITTER REQUEST...");
        // BEGIN TWITTER SEARCH
        tweets = client.get_tweets(db.generate_query(query));
        // tweets = client.get_tweets([query.player_query + ' ' + query.team_query]);
        // tweets = client.get_tweets([query.player_query,        query.team_query]);

        // generates socket.io emission to webpage with tweets
        tweets.then(function(reply) {
          db.logSearch(query)
            .catch(function(error) {

            })
            .then(function(data) {
              helper.debug("LOG: ");
              console.log(data);
              // helper.debug("REPLY: ");
              // console.log(reply);
              db.storeTweetData(reply.data, data.insertId);
            });
          tweet_reply(reply, query);
        });

        // generates an error if the query is valid
        tweets.catch(function(error) {
          tweet_error(error);
        });
        // END TWITTER SEARCH
      }

      // TODO: send saved tweets back to client

    });
    prev_query.catch(function(error) {
      helper.error("Fault in prev_query:");
      helper.error(error);
    });
    // TODO: send saved tweets back to client

});
  
  // terminates socket.io session if an error is encountered
  socket.on('connect', function() {
    helper.info("Connection Created");
  });

  // terminates socket.io session if an error is encountered
  socket.on('error', function(error) {
    helper.error('Socket Error: ', error);
    socket.destroy();
  });

  // terminates stream session if the socket is closed
  socket.on('close', function(query) {
    helper.info('Socket Closed');
    if (stream) stream.stop();
  });
});

// retrieves the relevant file to render, or returns a 404 error if none exists
app.all('*', function(req, res) {
  fs.exists(req.path, function(exists) {
    if (exists) {
      res.render(req.path); // renders static pages found in the public file structure
    }
    else {
      req.error = req.path + '404 File not found';
//    res.redirect('/404.html?error=' + req.error);
    }
  });
});
