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

  socket.on('query', function(query) {
    var prev_query;
    var prev_tweet;
    var next_tweet;

    prev_query = db.getPreviousSearches(query);

    prev_query.then(function(data) {

      // Previous search term(s) exist
      if (data.length > 0) {

        // prev_tweet =; // gets first result of previous tweets

        // get first result of previous tweets
         db.getPreviousTweets(data[0].id).then(function(prev_tweets) {
        // Previous search term existed, and tweets were stored
          if (prev_tweets.length > 0) {
            console.log("length:" + prev_tweets.length);
            // creates tweet list from twitter and database
              var tweet_times = null;
              var tweet_store = [];

              for (var i = 0; i < data.length; i++) {
                tweet_store.push(db.savedTweetToWeb(data[i]));
              }

              tweet_times = data[data.length - 1].tweetTimestamp;

              client.tweet_combo(socket, query, tweet_times, tweet_store);
            }

          // Previous search term existed, however there were no tweets stored
          else {
            helper.warn("No previous tweets found for query");
            tweet_combo(socket, query, null, null);
          }
        })
        .catch(function(error) {
          helper.warn("error getting previous tweets");
          helper.debug(error);
        });
      }

      else {
        client.tweet_combo(socket, query, null, null);
      }
    });

    prev_query.catch(function(error) {
      helper.error("Task Refused: ", error);
      throw error;
    });
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

 function tweet_reply(socket, reply, query) {
    helper.info("Tweets Update Received, Processing...");

    socket.emit('reply_tweets', reply.data);
    helper.info("Tweets Update Complete");

    // creates connection to twitter stream, and listens for tweets
    helper.info("query: ");
    helper.info(query);
    // helper.info(db.generate_query(query));
    
    stream = client.get_stream(db.generate_query(query).replace(' OR ', ', '));

    // creates socket.io emission to webpage with live tweets
    stream.on('tweet', function(reply) {
      helper.debug("Stream Update Received, Processing...");
      socket.emit('reply_stream', reply);
      helper.debug("Stream Update Complete");
    });
  }

  // function tweet_combo(socket, query, tweet_time, tweet_store) {
  //   tweets = tweet_query(query, tweet_time);

  //   tweets.then(function(store) {
  //     tweet_reply(socket, store, tweet_store == null ? query : {
  //       statuses: store.data.statuses.concat(tweet_store)
  //     });
  //   });

  //   tweets.catch(function(error) {
  //     throw error;
  //   });
  // }

  // function tweet_query(query, lastTimestamp) {
  //   return new Promise(function(resolve, reject) {
  //     helper.info("GETTING NEW TWEETS...");
  //     helper.debug("LAST TIMESTAMP: " + lastTimestamp);
  //     helper.debug(query);

  //     query_string = db.generate_query(query);

  //     // If lastTimestamp is set, add this to the query "since:" parameter
  //     if (lastTimestamp != null) {
  //       query_string = query_string + " since: " + lastTimestamp;
  //       helper.debug("QUERY: " + query_string);
  //     }
  //     helper.debug("QUERY: " + query_string);


  //     tweets = client.get_tweets(query_string); // + "since:" + lastTimestamp



  //     // generates socket.io emission to webpage with tweets
  //     tweets.then(function(reply) {
  //       helper.info("LOGGING SEARCH RESULT...");
  //       var log = db.logSearch(query);

  //       log.then(function(data) {
  //         helper.info("STORING TWEETS...");
       
  //         var storeTweet = db.storeTweetData(reply.data, data.insertId);
  //         storeTweet.then(function(results) {
  //           helper.info("TWEETS STORED");
  //           resolve(reply);
  //         });

  //         storeTweet.catch(function(error) {
  //           helper.warn("Storing tweets failed.");
  //           reject(error);
  //         });
  //       });

  //       log.catch(function(error) {
  //         reject(error);
  //       });
  //     });

  //     // returns an error if the query is valid
  //     tweets.catch(function(error) {
  //       // tweet_error(error);
  //       reject(error);
  //     });
  //   });
  // };