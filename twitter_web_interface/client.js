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

var tweets; // global reference to tweets handler
var stream; // global reference to stream handler

process.stdin.resume();

process.on('SIGINT', function() {
  helper.info("Program Terminated");
  stop_stream();
  process.exit();
});

function get_tweets(query) {
  return T.get('search/tweets', { q: query, count: tweet_limit });
}

function get_stream(query) {
  return T.stream('statuses/filter', { track: query });
}

function stop_tweets() {
    // if (tweets) tweets.stop();
}

function stop_stream() {
    if (stream) stream.stop();
}

function get_timeline(user){
  return T.get('statuses/user_timeline', {screen_name: user, count:this.TWEET_LIMIT});
}

function get_frequency_weekly(query) {
  return new Promise(function(resolve,reject) {

  var curr_date = new Date();
  var prev_date = new Date(curr_date-1);
  var dict = {};
  var count = [];

  var j = 0;
  var i = 0;
  for (var i=1; i<=7; i++) {
    curr_date.setDate(prev_date.getDate());
    prev_date.setDate(curr_date.getDate() - 1);

    get_frequency(query,prev_date,curr_date).then(function(result){
      count.push(result);
      dict[j] = result;
      j+=1;

      if (j == 7) {
        resolve(count);
      } else if (j ==8) {
        reject(null)
      }

    })
  };
  })
};

function get_frequency(query, prev, curr) {
  return new Promise(function(resolve,reject) {
  var prev_date = get_date_format(prev);
  var curr_date = get_date_format(curr);
  var query_string = query + " since:" + prev_date + " until:" + curr_date;
  var pair = {};
    get_tweets(query_string).then(function(tweets) {
      pair[curr_date] = tweets.data.statuses.length
      resolve(pair)

    }).catch(function(error) {
      reject(error)
    })
  });
}

function get_date_format(date) {
  return              date.getFullYear().toString()      + "-"
    + get_date_padded((date.getMonth()+1).toString(), 2) + "-"
    + get_date_padded(date.getDate().toString(), 2);
}

function get_date_padded(date, size) {
  var out = date.trim();
  while (out.length < size) {
    out = '0' + out;
  }

  return out;
}

///////////////////////////////////////////////////////////////////////////////

// callback function, stored here to preserve scope
function tweet_reply(socket, query, prev_timestamp, prev_tweetlist) {
  // return new Promise(function(resolve, reject) {
    helper.info("Tweets Update Received, Processing...");
    helper.info("Tweets Update Complete");

    // creates connection to twitter search, and retrieves tweets
    if (prev_timestamp != null) {
      helper.info("prev_timestamp: ", prev_timestamp);

      // convert timestamp into compatible database format
      var formatted_prev_timestamp = get_date_format(new Date(prev_timestamp));

      helper.info("Complete Tweets String:", (db.generate_query(query) + " since_id:" + prev_tweetlist[0].id_str));
      tweets = get_tweets(db.generate_query(query) + " since_id:" + prev_tweetlist[0].id_str);
    }
    else {
      helper.info("Complete Tweets String:", db.generate_query(query));
      tweets = get_tweets(db.generate_query(query));
    }

    // todo: send tweetfreqs via socket.io
    tweetfreqs = get_frequency_weekly(db.generate_query(query));
    tweetfreqs.then(function(data) {
        helper.info(data);
    })


    // creates socket.io emission to webpage with tweets
    tweets.then(function(reply) {
      helper.info("Tweets Retrieved from Twitter: " + reply.data.statuses.length);

      socket.emit('reply_tweets', { statuses: reply.data.statuses.concat(prev_tweetlist) });

      stream_reply(socket, query);

      helper.info("Logging...");
      return db.logSearch(query, reply);
    })

    // returns an error if the search terms cannot be stored within the database
    .catch(function(error) {
      helper.error("Unable to Store Search:", error);
    })


    .then(function(reply) {
      helper.info("Storing:", reply[1].data.statuses.length);

      return db.storeTweetData(reply[1].data, reply[0]);
    })

    // returns an error if the tweets cannot be stored within the database
    .catch(function(error) {
    helper.error("Unable to Store Tweets:", error);
    })

    .then(function(results) {
      helper.info("Stored!");
    });

    // returns an error if the search terms invalid
    tweets.catch(function(error) {
        helper.error("Search Terms Invalid:", error);
    });
  // });
};

function stream_reply(socket, query) {
  // creates connection to twitter stream, and listens for tweets

  var tweet_p = query.player_query.split(", ");
  var tweet_t = query.team_query.split(", ");
  var tweet   = [];

  if (query.or_operator) {
    tweet = tweet_p.concat(tweet_t);
  }
  else {
    for (var i = 0 ; i < tweet_p.length ; i++) {
      for (var j = 0 ; j < tweet_t.length ; j++) {
        tweet.push((tweet_p[i].trim() + " " + tweet_t[j]).trim());
      }
    }
  }

  helper.info("Complete Stream String:", tweet);

  stream = get_stream(tweet);

  // creates socket.io emission to webpage with live tweets
  stream.on('tweet', function(reply) {
    // helper.debug("Stream Update Received, Processing...");

    socket.emit('reply_stream', reply);
    // helper.debug("Stream Update Complete");
  });

  stream.on('disconnect', function(error) {
    helper.warn("Multiple Streams Detected, Closing...");
    stream.stop();
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
  stop_tweets:              stop_tweets,
  stop_stream:              stop_stream,
  get_frequency_weekly:     get_frequency_weekly,
  get_frequency:            get_frequency,

  tweet_reply:              tweet_reply,
  tweet_error:              tweet_error
};
