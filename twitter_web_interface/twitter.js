var Twit = require('twit');

function Twitter() {
  this.config = require('./config.json');
  this.T = new Twit({
    consumer_key:        config.twitter.consumer_key,
    consumer_secret:     config.twitter.consumer_secret,
    access_token:        config.twitter.access_token,
    access_token_secret: config.twitter.access_token_secret,
    timeout_ms:          30000
  });
}

Twitter.prototype.getTwitInstance = function() {
  return this.T;
}

module.exports = Twitter
