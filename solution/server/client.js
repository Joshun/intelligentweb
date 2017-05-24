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

var tweet_limit = 100;

var tweets; // global reference to tweets handler
var stream; // global reference to stream handler

process.stdin.resume();

// terminates program with additional tasks if aborted (e.g. Ctrl+C) or terminated
process.on('SIGINT', function() {
  helper.info("Program Terminated");
  stop_stream();
  process.exit();
});


/**
 * Invokes the Twitter REST API differently, depending on the task
 *
 * Should the system be retrieving chart information, no recursion is used
 * since this would invoke a maximum of 21 calls to the REST API; which is not
 * sustainable. Should the query contain an "until:" property, then no
 * recursion is performed.
 *
 * @param    query    the search terms to be used
 * @returns           a promise to retrieve the tweets for the specified query
 */
function get_tweets(query) {
  if (query.match("until")) {
    return T.get('search/tweets', { q: query, count: tweet_limit });
  }
  else {
    return get_tweets_helper(query, 0, "");
  }
}

/**
 * Invokes the Twitter REST API to retrieve the tweets for a specific query.
 *
 * Since only 100 tweets may be obtained per query, this function recursively
 * sends requests to Twitter for a maximum of three times. It is assumed that,
 * if the number of results returned for a particular query is the same as this
 * limit, then it is possible that more tweets may be retrieved on subsequent
 * queries.
 *
 * @param    query     the search terms to be used
 * @param    index     the number of times a search has been (exclusively) performed
 * @param    max_id    the max_id query; consisting of the "max_id:" prefix and the Twitter ID string of the last tweet retrieved minus one, or nothing
 * @returns            a promise to retrieve the tweets for the specified query
 */
function get_tweets_helper(query, index, max_id) {
  var tweets;
  var nested;

  return new Promise(function(resolve, reject) {
    tweets = T.get('search/tweets', { q: query + max_id, count: tweet_limit });

    tweets.then(function(reply) {

      // rejects twitter reply if statuses are undefined, due to exceeding rate limits
      if (reply.data.statuses === undefined) {
        reject(reply);
      }
      else {
        if (reply.data.statuses.length == tweet_limit && index < 2) {

          // retrieves next set of tweets if current set is "full", and limit is not exceeded
          nested = get_tweets_helper(query, index + 1, " max_id:" + get_id_format(reply.data.statuses[reply.data.statuses.length - 1].id_str));

          nested.then(function(tweet) {

            // concatenates statuses and reconstructs object format
            resolve({ "data": { "statuses": reply.data.statuses.concat(tweet.data.statuses) }})
          })
        }
        else {

          // reconstructs object format
          resolve({ "data": { "statuses": reply.data.statuses }});
        }
      }
    });
  });
}

/**
 * Subtracts one from the Twitter ID string.
 *
 * Since Twitter considers the "max_id" filter as inclusive, using this value
 * when retrieving multiple batches of results would cause duplicate entries
 * to occur. As such, this value is reduced by one to exclude the last result
 * of one query from being the first result of the next.
 *
 * @param    value    the Twitter ID string
 * @returns           the Twitter ID string, subtracted by one
 */
function get_id_format(value) {
  var rest = value.substring(0, value.length - 1);
  var last = value.substring(value.length - 1);

  if (last === "0")
    return get_id_format(rest) + "9"; // sets last digit to 9, and recurses
  else
    return get_id_padded(rest + (parseInt(last, 10) - 1).toString(), "0"); // reduces last digit by 1, and trims result
}

/**
 * Determines if one Twitter ID string is larger than another.
 *
 * @param    num1    the first Twitter ID string
 * @param    num2    the second Twitter ID string
 * @returns          the larger Twitter ID string, or null if equal
 */
function get_id_larger(num1, num2) {
  var value1 = num1;
  var value2 = num2;

  // if value1 is longer, then the number is trivially larger
  if (value1.length > value2.length) {
    return value1;
  }

  // if value2 is longer, then the number is trivially larger
  if (value2.length > value1.length) {
    return value2;
  }

  // performs character comparison based on ascii value
  for(var i = 0; i < value1.length; i++) {
    if (value1[i] > value2[i]) return value1;
    if (value1[i] < value2[i]) return value2;
  }

  return null; // if both values are equal, return null
}

/**
 * Trims the Twitter ID string of leading characters.
 *
 * @param      value    the Twitter ID string
 * @param      pad      the character to trim
 * @returns             the trimmed Twitter ID string
 */
function get_id_padded(value, pad) {
  var i = 0;

  while (i < value.length && value[i] === pad) {
    i++;
  }

  return value.substring(i); // trims leading zeros
}

/**
 * Invokes the Twitter Stream API for live results.
 *
 * @param    query    the search terms to be sent
 * @returns           a connection to the streaming utility
 */
function get_stream(query) {
  return T.stream('statuses/filter', { track: query });
}

/**
 * Severs any tweet related connections to the Twitter REST API to prevent
 * connection saturation.
 */
function stop_tweets() {
    // if (tweets) tweets.stop();
}

/**
 * Severs any tweet related connections to the Twitter Stream API to prevent
 * connection saturation.
 */
function stop_stream() {
    if (stream) stream.stop();
}

/**
 * Invokes the Twitter REST API to retrieve the timeline of a user.
 *
 * @param    query    the Twitter screen name of the user
 * @returns           a promise to retrieve the timeline of the user
 */
function get_timeline(query){
  return T.get('statuses/user_timeline', { screen_name: query, count: tweet_limit });
}

/**
 * Invokes the Twitter REST API to retrieve details about a user
 *
 * This function is used to retrieve the screen name of a Twitter user, as
 * defined by Twitter (i.e. the case-accurate result). Since Wikidata provides
 * most Twitter handles in the same case-accurate form, this approach was taken
 * to circumvent the need to apply a filtered regular expression within the
 * Wikidata query. As such, the response time of Wikidata is much faster.
 *
 * @param    query    the Twitter screen name of the user
 * @returns           a promise to retrieve details about the user
 */
function get_users(query) {
  return T.get('users/show', { screen_name: query })
}

/**
 * Provides the frequency data for a query over the last week.
 *
 * This function is used to retrieve a sample of tweets from Twitter for each
 * day in the week. Since Twitter does not provide an API for retrieving the
 * frequency of tweets natively, this approach offered a simple solution to
 * obtaining such results, at the expense of using multiple Twitter queries.
 *
 * @param    query    the search terms to be sent
 * @returns           a promise to retrieve the searches of the past week
 */
function get_frequency_weekly(query) {
  return new Promise(function(resolve,reject) {

  var curr_date = new Date();
  var prev_date = new Date(curr_date-1);
  var count = new Array();

  var j = 0;
  var i = 0;
  for (var i=1; i<=7; i++) {
    // returns frequency day by day
    curr_date.setDate(prev_date.getDate());
    prev_date.setDate(curr_date.getDate() - 1);

    get_frequency(query,prev_date,curr_date).then(function(result){
      // pushes data for a day at a time to the resulting array
      count.push(result);
      j+=1;

      if (j == 7) {
        // when all data has been retrieved resolves array
        resolve(count);
      } else if (j ==8) {
        reject(null)
      }

    })
  };
  })
};

/**
 * Provides the frequency data for a query between two specified dates
 *
 * @param    query    the search terms to be sent
 * @param    prev     the start date
 * @param    curr     the end date
 * @returns           a promise to retrieve the searches between the specified dates
 */
function get_frequency(query, prev, curr) {
  return new Promise(function(resolve,reject) {
  var prev_date = get_date_format(prev);
  var curr_date = get_date_format(curr);
  var query_string = query + " since:" + prev_date + " until:" + curr_date  + " " + " -filter:retweets AND -filter:replies";

  var pair = {};
    get_tweets(query_string).then(function(tweets) {
      // adds related date and frequency with pertinent keys
      pair['frequency'] = tweets.data.statuses.length
      pair['date'] = curr_date
      resolve(pair)

    }).catch(function(error) {
      reject(error)
    })
  });
}

/**
 * Converts the date format into one which is compatible with Twitter queries
 *
 * @param    date    a date object
 * @returns          the date object in YYYY-MM-DD format
 */
function get_date_format(date) {
  return               date.getFullYear().toString()       + "-"
    + get_date_padded((date.getMonth() + 1).toString(), 2) + "-"
    + get_date_padded( date.getDate().toString(), 2);
}

/**
 * Pads a date element to the specified length
 *
 * @param    date    a date element
 * @returns          a padded date element
 */
function get_date_padded(date, size) {
  var out = date.trim();
  while (out.length < size) {
    out = '0' + out;
  }

  return out;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Invokes the Twitter REST API to retrieve timeline of a user
 *
 * @param    socket    the web socket to emit results
 * @param    query     the Twitter screen name of the user
 * @returns            the timeline of the user
 */
function tweet_author(socket, query) {
  // create socket.io emission to webpage with tweets by author
  author_tweets = get_timeline(query.author_query);
  author_tweets.then(function(reply) {

    socket.emit('author_tweets', reply)
  })

  .catch(function(error) {
    helper.error("Cannot get user tweets:", error)
  })
};

/**
 * Invokes the Twitter REST API to retrieve tweets for a particular query
 *
 * This function constitutes the bulk of task 1.1, in which the the search
 * terms are formatted into a meaningful query, before being sent back to the
 * client. In addition, the new results are logged and stored for retrieval
 * on future searches of the same query.
 *
 * @param    socket              the web socket to emit results
 * @param    query               the search terms to be sent
 * @param    prev_timestamp      the Twitter ID string of the most recent relevant tweet in the server database, or null if none
 * @param    prev_tweetlist      the list of previous tweets, or empty list if none
 * @param    mobile_timestamp    the Twitter ID string of the most recent relevant tweet in the mobile database, or null if web request or none
 */
function tweet_reply(socket, query, prev_timestamp, prev_tweetlist, mobile_timestamp) {
  helper.info("Tweets Update Received, Processing...");

  // should no previous timestamp be found, then adjust the search properties
  if (prev_timestamp == null) {
    // if no mobile_timstamp is detected, assume to be web connection, and retrieve unbounded tweets
    if (mobile_timestamp == null) {
      helper.info("Complete Tweets String (Server):", db.generate_query(query) + " -filter:retweets");
      tweets = get_tweets(db.generate_query(query) + " -filter:retweets");
    }
    // if mobile_timestamp is detected, assume mobile is up-to-date with server, and retrieve new tweets
    else {
      helper.info("Complete Tweets String (Mobile):", db.generate_query(query) + " since_id:" + mobile_timestamp + " -filter:retweets");
      tweets = get_tweets(db.generate_query(query) + " since_id:" + mobile_timestamp + " -filter:retweets");
    }
  }
  // should at least one previous timestamp be found, then retrieve new tweets
  else {
    helper.info("prev_timestamp: ", prev_timestamp);

    // convert timestamp into compatible database format
    var formatted_prev_timestamp = get_date_format(new Date(prev_timestamp));

    helper.info("Complete Tweets String (Server):", db.generate_query(query) + " since_id:" + prev_tweetlist[0].id_str + " -filter:retweets");
    tweets = get_tweets(db.generate_query(query) + " since_id:" + prev_tweetlist[0].id_str + " -filter:retweets");
  }

  helper.info("Tweets Update Complete");

  // create socket.io emission to webpage with frequencies
  tweetfreqs = get_frequency_weekly(db.generate_query(query));
  tweetfreqs.then(function(data) {
    helper.info(tweetfreqs)
    socket.emit('reply_freqs', data);
  })

  .catch(function(error) {
    helper.error("Cannot get tweet frequencies", error)
  })

  // creates socket.io emission to webpage with tweets
  tweets.then(function(reply) {
    helper.info("Tweets Retrieved from Twitter:", reply.data.statuses.length);

    // converts Twitter time into ISO-8601 time
    for(var i = 0; i < reply.data.statuses.length; i++) {
      reply.data.statuses[i].created_at = new Date(reply.data.statuses[i].created_at).toISOString();
    }

    // emit tweets from Twitter and server database
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
};

/**
 * Invokes the Twitter Stream API to retrieve tweets for a particular query
 *
 * This function has to alter the query supplied to the REST API, as the range
 * of filters available to the Stream API are limited. Furthermore, the syntax
 * used to define a query is different, requiring alterations to the query
 * format itself.
 *
 * @param    socket              the web socket to emit results
 * @param    query               the search terms to be sent
 */
function stream_reply(socket, query) {
  // creates connection to twitter stream, and listens for tweets
  var tweet_p = query.player_query.split(", ");
  var tweet_t = query.team_query.split(", ");

  var tweet   = [];

  // if operator is OR, then terms are concatenated as normal
  if (query.or_operator) {
    tweet = tweet_p.concat(tweet_t);
  }
  // if operator is AND, then pairs of query terms are generated
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
    if (!is_reply(reply))
      socket.emit('reply_stream', reply);
    // helper.debug("Stream Update Complete");
  });

  stream.on('disconnect', function(error) {
    helper.warn("Multiple Streams Detected, Closing...");
    stream.stop();
  });
}

/**
 * Determines if a particular tweet is a retweet.
 *
 * Since the Stream API cannot filter out retweets as part of the query
 * process, it is necessary to filter the results server-side by looking at the
 * fields supplied by Twitter.
 *
 * @param    socket              the web socket to emit results
 * @param    query               the search terms to be sent
 */
function is_reply(tweet) {
  if (tweet.retweeted_status)
  // || tweet.in_reply_to_status_id
  // || tweet.in_reply_to_status_id_str
  // || tweet.in_reply_to_user_id
  // || tweet.in_reply_to_user_id_str
  // || tweet.in_reply_to_screen_name)
    return true
}

///////////////////////////////////////////////////////////////////////////////

module.exports = {
  T:                        T,

  get_tweets:               get_tweets,
  get_stream:               get_stream,
  stop_tweets:              stop_tweets,
  stop_stream:              stop_stream,
  get_frequency_weekly:     get_frequency_weekly,
  get_frequency:            get_frequency,
  get_users:                get_users,

  get_id_larger:            get_id_larger,

  tweet_reply:              tweet_reply,
  tweet_author:             tweet_author
};
