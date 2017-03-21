var Twit = require('twit');

var Twitter = function() {
  this.config = require('./config.json');
  this.T = new Twit({
    consumer_key:        this.config.twitter.consumer_key,
    consumer_secret:     this.config.twitter.consumer_secret,
    access_token:        this.config.twitter.access_token,
    access_token_secret: this.config.twitter.access_token_secret,
    timeout_ms:          30000
  });
  this.TWEET_LIMIT = 10;
};

Twitter.prototype.getTwitInstance = function() {
  return this.T;
};

Twitter.prototype.getTweets = function(keywords) {
  return this.T.get('search/tweets', {q: keywords, count: this.TWEET_LIMIT});
}

module.exports = Twitter;
