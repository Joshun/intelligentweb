var config = require('./config.json');

var Twit = require('twit');
var T = new Twit({
  consumer_key:        config.twitter.consumer_key,
  consumer_secret:     config.twitter.consumer_secret,
  access_token:        config.twitter.access_token,
  access_token_secret: config.twitter.access_token_secret,
  timeout_ms:          30000
});

module.exports = {
	Twit: Twit,
	T: T
}