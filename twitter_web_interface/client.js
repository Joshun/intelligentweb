var config = require('./config.json');

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
  var query_string = query = "since:" + prev_date + " until:" + curr_date;

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

module.exports = {
  T:                        T,

  get_tweets:               get_tweets,
  get_frequency_weekly:     get_frequency_weekly,
  get_frequency:            get_frequency
}