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
  this.TWEET_LIMIT = 100;
};

Twitter.prototype.getTwitInstance = function() {
  return this.T;
};

Twitter.prototype.getTweets = function(keywords) {
  return this.T.get('search/tweets', {q: keywords, count: this.TWEET_LIMIT});
};

Twitter.prototype.getTimeline = function(user){
  return this.T.get('statuses/user_timeline', {screen_name: user});
}

Twitter.prototype.getFrequencyPastWeek = function(term) {
  console.log("getFrequencyPastWeek()");
  var currentDate = new Date();
  var lastWeekDate = new Date(currentDate);
  lastWeekDate.setDate(currentDate.getDate() - 7);
  return this.getFrequencyBetween(term, lastWeekDate, currentDate);
};

Twitter.prototype.padLeading = function(num, width) {
  var numStr = num.toString();
  while (numStr.length < width) {
    numStr = "0" + numStr;
  }
  return numStr;
};

Twitter.prototype.formatDate = function(date) {
  return date.getFullYear() + "-" + this.padLeading(date.getMonth()+1, 2) + "-" + this.padLeading(date.getDate(), 2);
};

Twitter.prototype.getFrequencyBetween = function(term, dateStart, dateEnd) {
  console.log("getFrequencyBetween("+dateStart+","+dateEnd+")");

  // Convert start date to "year-month-day" format
  var formattedDateStart = this.formatDate(dateStart);
  var formattedDateEnd = this.formatDate(dateEnd);
  var queryString = term + " since " + formattedDateStart + " until " + formattedDateEnd;
  console.log("queryString="+queryString);
  return this.T.get('search/tweets', { q: term, count:this.TWEET_LIMIT })
    .catch(function(err) {
      return err;
    })
    .then(function(data) {
      console.log(data["data"]["statuses"]);
      return data["data"]["statuses"].length;
    });
};


module.exports = Twitter;
