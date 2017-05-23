/**
 * server.js
 */

var os = require('os');
var process = require('process');

var express = require('express');
var app     = express();

var server  = require('http').Server(app);
var io      = require('socket.io')(server);
var fs      = require('fs');

var config  = require('./config.json');
var client  = require('./client.js');
var db      = require('./storage.js');
var dbpedia = require('./dbpedia.js');
var wkdata  = require('./wikidata.js');
var helper  = require('./helper.js');

var port    = process.env.PORT || 3000;


function checkPaths() {
  var cwd = process.cwd();
  // If windows, split on backslash else on forward slash
  var paths = os.type() == "Windows_NT" ? cwd.split("\\") : cwd.split("/");
  return paths[paths.length-1] == "server" && paths[paths.length-2] == "solution";
}

// Check that the current working directory is correct
// If this check is not carried out and the working dir is wrong, unhelpful errors will emerge
// and it will not be immediately obvious these are caused by being in the wrong dir.
if (! checkPaths()) {
  helper.error("Working directory must be solution/server");
  helper.error("Please run server.js from inside its own folder");
  throw new Error("WorkingDirectoryError");
}

// specifies which port the server should be hosted on
server.listen(port, function() {
  helper.info('Server Listening on Port %d', port);
});


// allows paths to be defined relative to the public folder
app.use(express.static('../webapp'));

// retrieves the most recent tweet on a specified user's timeline, and outputs it on the console
io.of('/').on('connection', function(socket) {

  // callback function, stored here to preserve scope
  socket.on('query', function(query) {
    client.stop_tweets();
    client.stop_stream();

    // wiki_search = wkdata.search_player("Hello");
    wkdata.emit_stats(socket, query);

    // wiki_search.catch(function(error) {
    //   helper.error("Wikidata Search Failed:", error);
    // });

    // wiki_search.then(function(reply) {
    //   helper.info("Wikidata Search Complete:", reply);
    // });

    dbpedia.getAndEmitStats(socket, query.player_query, query.team_query);

    var prev_search;

    prev_search = db.getPreviousSearches(query);


    prev_search.then(function(results) {

      // Previous search term(s) exist
      if (results.length > 0) {
        // get first result of previous tweets
        return db.getPreviousTweets(results[0].id);
      }
      else {
        client.tweet_reply(socket, query, null, []);
        return Promise.reject(new Error("No Tweets Found"));
      }
    })
    .then(function(prev_tweets) {

    // Previous search term existed, and tweets were stored
      if (prev_tweets.length > 0) {

        helper.info("Previous Tweets Found:", prev_tweets.length);
        helper.debug(prev_tweets[0]);

        // creates tweet list from twitter and database
        var prev_timestamp = null;
        var prev_tweetlist = [];

        for (var i = 0; i < prev_tweets.length; i++) {
          prev_tweetlist.push(db.savedTweetToWeb(prev_tweets[i]));
        }

        for (var i = 0; i < prev_tweetlist.length; i++) {
          prev_tweetlist[i].db_state = true;
        }

        prev_timestamp = prev_tweets[prev_tweets.length - 1].tweetTimestamp;

        client.tweet_reply(socket, query, prev_timestamp, prev_tweetlist);
      }

      // Previous search term existed, however there were no tweets stored
      else {
        helper.warn("Cannot Find Tweets, Invoking Alternative...");
        client.tweet_reply(socket, query, null, []);
      }
    })

    .catch(function(error) {
      helper.error("Cannot Retrieve Tweets:", error);
    });

    prev_search.catch(function(error) {
      helper.error("Task Refused:", error);
      throw error;
    });
  });

  socket.on('author_query', function(author_query) {
    client.stop_tweets();
    client.stop_stream();
    client.tweet_author(socket,author_query);
  });

  // terminates socket.io session if an error is encountered
  socket.on('connect', function() {
    helper.info("Connection Created");
  });

  // terminates socket.io session if an error is encountered
  socket.on('error', function(error) {
    helper.error("Socket Error:", error);
    socket.destroy();
  });

  // terminates stream session if the socket is closed
  socket.on('close', function(query) {
    helper.info("Socket Closed");
    // if (stream) stream.stop();
  });

  socket.on("sync", function(query) {
    helper.info("Sync request received");
    var lastTimestamp = query.lastTimestamp;
    var searchParams = query.searchParams;

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
