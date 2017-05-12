var config = require('./config.json');
var db     = require('./storage.js');
var helper = require('./helper.js');

var Twit = require('twit');
var T = new Twit({
  consumer_key:         config.twitter.consumer_key,
  consumer_secret:      config.twitter.consumer_secret,
  access_token:         config.twitter.access_token,
  access_token_secret:  config.twitter.access_token_secret,
  timeout_ms:           30000
});

var tweet_limit = 300;

function get_tweets(query) {
  return T.get('search/tweets', { q: query, count: tweet_limit });
}

function get_stream(query) {
  return T.stream('statuses/filter', { track: query });
}

function get_timeline(user){
  return T.get('statuses/user_timeline', {screen_name: user, count:this.TWEET_LIMIT});
}

function get_frequency_weekly(query) {
  var curr_date = new Date();
  var prev_date = new Date(curr_date)
      prev_date.setDate(curr_date.getDate() - 7);

  helper.info(curr_date, prev_date);

  return get_frequency(query, prev_date, curr_date);
}

function get_frequency(query, prev, curr) {
  var prev_date = get_date_format(prev);
  var curr_date = get_date_format(curr);
  var query_string = query + " since:" + prev_date + " until:" + curr_date;

  return get_tweets(query_string)
    .then(function(tweets) {
      helper.info(tweets.data.statuses)
      return tweets.data.statuses.length;
    })
    .catch(function(error) {
    	return error;
    });
}

function get_date_format(date) {
  return              date.getFullYear()      + "-"
    + get_date_padded(date.getMonth() + 1, 2) + "-"
    + get_date_padded(date.getDate(),      2);
}

function get_data_padded(data, size) {
  var out = data.trim();
  while (out.length < size)
  	out = '0' + out;
  return out;
}

///////////////////////////////////////////////////////////////////////////////

// callback function, stored here to preserve scope
function tweet_reply(socket, reply, query) {
  helper.info("Tweets Update Received, Processing...");

  // creates connection to twitter stream, and listens for tweets
  var stream = get_stream(db.generate_query(query).replace(' OR ', ', '));

  socket.emit('reply_tweets', reply.data);
  helper.info("Tweets Update Complete");

  // creates socket.io emission to webpage with live tweets
  stream.on('tweet', function(reply) {
    helper.debug("Stream Update Received, Processing...");
    socket.emit('reply_stream', reply);
    helper.debug("Stream Update Complete");
  });

  // returns an error if the query is invalid
  stream.catch(function(error) {
    helper.error("Invalid Query");
    throw error;
  });
};

// callback function, stored here to preserve scope
function tweet_error(socket, error) {
    helper.error("Invalid Query");
    throw error;
};

// callback function, stored here to preserve scope
function tweet_combo(socket, query, tweet_time, tweet_store) {
  var tweets = tweet_query(socket, query, tweet_time);

  tweets.then(function(store) {
    tweet_reply(socket, store, tweet_store == null ? query : {
      statuses: store.data.statuses.concat(tweet_store)
    });
  });

  tweets.catch(function(error) {
    throw error;
  });
}

// queries tweets, logs the search result and stores the tweets
function tweet_query(socket, query, time) {
  return new Promise(function(resolve, reject) {

    helper.info("Collecting Tweets...");
    helper.debug("  Started @: " + time);

    var tweets = get_tweets(db.generate_query(query)); // + "since:" + time
      // tweets = client.get_tweets([query.player_query + ' ' + query.team_query]);
      // tweets = client.get_tweets([query.player_query,        query.team_query]);

    // generates socket.io emission to webpage with tweets
    tweets.then(function(reply) {
      helper.info("Logging...");
      var log = db.logSearch(query);

      log.then(function(data) {
        helper.info("Storing...");
     
        var storeTweet = db.storeTweetData(reply.data, data.insertId);
        storeTweet.then(function(results) {
          helper.info("Stored!");
          resolve(reply);
        });

        storeTweet.catch(function(error) {
          reject(error);
        });
      });

      log.catch(function(error) {
        reject(error);
      });
    });

    // returns an error if the query is valid
    tweets.catch(function(error) {
      reject(error);
    });
  });
};

///////////////////////////////////////////////////////////////////////////////

module.exports = {
  T:                        T,

  get_tweets:               get_tweets,
  get_stream:               get_stream,
  get_frequency_weekly:     get_frequency_weekly,
  get_frequency:            get_frequency,

  tweet_reply:              tweet_reply,
  tweet_error:              tweet_error,
  tweet_combo:              tweet_combo,
  tweet_query:              tweet_query
}