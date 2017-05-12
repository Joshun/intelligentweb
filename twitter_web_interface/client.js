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
function tweet_reply(socket, query, prev_timestamp, prev_tweetlist) {
  // return new Promise(function(resolve, reject) {
    helper.info("Tweets Update Received, Processing...");
    helper.info("Tweets Update Complete");

    // creates connection to twitter search, and retrieves tweets
    var tweets;

    if (prev_timestamp != null) {
      tweets = get_tweets(db.generate_query(query) + " since: " + prev_timestamp); //TODO format prev_timestamp
    }
    else {
      tweets = get_tweets(db.generate_query(query));
    }

    // generates socket.io emission to webpage with tweets
    tweets.then(function(reply) {
      helper.info("Tweets Retrieved from Twitter: " + reply.data.statuses.length);


      reply = { data: { statuses: reply.data.statuses.concat(prev_tweetlist) } };

      socket.emit('reply_tweets', reply.data);

      stream_reply(socket, query);

      helper.info("Logging...");
      var log = db.logSearch(query);

      log.then(function(data) {
        helper.info("Storing...");
     
        var storeTweet = db.storeTweetData(reply.data, data.insertId);
        storeTweet.then(function(results) {
          helper.info("Stored!");
          // resolve(reply);
        });

        storeTweet.catch(function(error) {
        helper.error("Unable to Store Tweet:", error);
          // reject(error);
        });
      });

      log.catch(function(error) {
        helper.error("Unable to Log Tweet:", error);
        // reject(error);
      });
    });

    // returns an error if the query is valid
    tweets.catch(function(error) {
        helper.error("Invalid Query:", error);
      // reject(error);
    });
  // });
};

function stream_reply(socket, query) {
  // creates connection to twitter stream, and listens for tweets
  var stream = get_stream(db.generate_query(query).replace(' OR ', ', '));

  // creates socket.io emission to webpage with live tweets
  stream.on('tweet', function(reply) {
    helper.debug("Stream Update Received, Processing...");
    socket.emit('reply_stream', reply);
    helper.debug("Stream Update Complete");
  });

  // returns an error if the query is invalid
  // stream.catch(function(error) {
  //   helper.error("Invalid Query");
  //   throw error;
  // });
}

// callback function, stored here to preserve scope
function tweet_error(socket, error) {
    helper.error("Invalid Query");
    throw error;
};

///////////////////////////////////////////////////////////////////////////////

module.exports = {
  T:                        T,

  get_tweets:               get_tweets,
  get_stream:               get_stream,
  get_frequency_weekly:     get_frequency_weekly,
  get_frequency:            get_frequency,

  tweet_reply:              tweet_reply,
  tweet_error:              tweet_error
}