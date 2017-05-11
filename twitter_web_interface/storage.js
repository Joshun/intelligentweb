var fs = require('fs');

var config = require('./config.json');
var helper = require('./helper.js');

var db  = require('mysql').createPool({
	host:            config.storage.host,
	user:            config.storage.user,
	password:        config.storage.password,
	database:        config.storage.database,
	connectionLimit: 100,
	debug:           false,
	multipleStatements: true
});

helper.info('Database Connection Established');

function createTable() {
	fs.readFile(config.storage.schema, 'utf8', function(err, data){
		helper.debug("SQL: " + data);
		db.getConnection(function(err, connection) {
			if (err) throw err;
			connection.query(data, function(error, results, fields) {
				if (error) throw err;
				helper.debug("CREATE QUERY EXECUTED");
				helper.debug(results);

				connection.release();
			});
		});
	});

	helper.debug("DATABASE CREATION SUCCESS");
}

function logSearch(query) {
	return new Promise(function(resolve, reject){
		helper.debug("BEGIN LOG QUERY");
		// id INT PRIMARY KEY,
		// playerQuery VARCHAR(255),
		// teamQuery VARCHAR(255),
		// playerAtChecked BOOLEAN,
		// playerHashChecked BOOLEAN,
		// playerKeywordChecked BOOLEAN,
		// teamAtChecked BOOLEAN,
		// teamHashChecked BOOLEAN,
		// teamKeywordChecked BOOLEAN,
		// queryTimestamp TIMESTAMP

		var playerQuery = query.player_query;
		var teamQuery = query.team_query;

		var playerAtChecked = query.handles_player;
		var playerHashChecked = query.hashtag_player;
		var playerKeywordChecked = query.keyword_player;

		var teamAtChecked = query.handles_team;
		var teamHashChecked = query.hashtag_team;
		var teamKeywordChecked = query.keyword_team;

		db.getConnection(function(err, connection) {
			if (err) throw err;
			connection.query(
				"INSERT INTO previousSearches(playerQuery, teamQuery, playerAtChecked, playerHashChecked, playerKeywordChecked, teamAtChecked, teamHashChecked, teamKeywordChecked, queryTimestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
				[playerQuery, teamQuery,
					playerAtChecked, playerHashChecked, playerKeywordChecked,
					teamAtChecked, teamHashChecked, teamKeywordChecked],
				function(error, results, fields) {
					if (error) reject(error);
					helper.debug("LOG QUERY EXECUTED");
					resolve(results);

					connection.release();
				});
		});
	});
}

function storeTweetData(data, logPrimaryKey) {

	return new Promise(function(resolve, reject){
		helper.debug("START TWEET STORE:");

		db.getConnection(function(err, connection) {
			var statuses = data.statuses;
			var promiseList = [];
			for (var i=0; i<statuses.length; i++) {
				var status = statuses[i];
				// Convert RFC2822 to millisecond epoch, and then to second epoch
				var timestamp = new Date(status.created_at).getTime() / 1000.0;
				promiseList.push(new Promise(function(resolve, reject) {
					connection.query(
						"INSERT INTO tweets(tweetText, tweetTimestamp, previousSearchId) VALUES (?, FROM_UNIXTIME(?), ?)",
						[status.text, timestamp, logPrimaryKey],
						function(error, results, fields) {
							if (error) reject(error);
							else {
								resolve(results);

								connection.release();
							}
					});
				}));
			}
			Promise.all(promiseList)
			.catch(function(error) {
				reject(error);
			})
			.then(function(data) {
				resolve(data);
			});

		});
	});
}

function getPreviousSearches(query) {
	return new Promise(function(resolve, reject) {

		var playerQuery = query.player_query;
		var teamQuery = query.team_query;

		var playerAtChecked = query.handles_player;
		var playerHashChecked = query.hashtag_player;
		var playerKeywordChecked = query.keyword_player;

		var teamAtChecked = query.handles_team;
		var teamHashChecked = query.hashtag_team;
		var teamKeywordChecked = query.keyword_team;

		db.getConnection(function(err, connection) {
			if (err) throw err;
			connection.query(
				// Query gets all previousSearches that match the parameters of the previous query and are recent enough
				// DATE_SUB subtracts interval from current date
				// BETWEEN gets queries between the time parameters
				"SELECT * FROM previousSearches WHERE playerQuery=? AND teamQuery=? AND playerAtChecked=? AND playerHashChecked=? AND playerKeywordChecked=? AND teamAtChecked=? AND teamHashChecked=? AND teamKeywordChecked=?",
				[playerQuery, teamQuery,
					playerAtChecked, playerHashChecked, playerKeywordChecked,
					teamAtChecked, teamHashChecked, teamKeywordChecked],
				function(error, results, fields) {
					if (error) reject(error);
					resolve(results);

					connection.release();
				});
		});
	});
}

function getTeams(name) {
	db.query("SELECT * FROM teams WHERE name = ?", [name]);
}

function getPlayers(name) {
	db.query("SELECT * FROM players WHERE name = ?", [name]);
}

function generate_query(query) {
    var tweet_query;

    helper.debug(query, query.or_operator);

    if (query.or_operator) {
      tweet_query = query.player_query + ' OR ' + query.team_query;
  	}
    else {
      tweet_query = query.player_query + ' '    + query.team_query;
    }


    helper.debug(tweet_query);

    return tweet_query;
}

function savedTweetToWeb(tweet) {
	var tweet = {
		text: tweet.tweetText,
		created_at: tweet.tweetTimestamp,
		user: { screen_name: "testScreenName"},
		id_str: "http://www.twitter.com"
	};
}

// init
createTable();

// exports
module.exports = {
	db: db,
	logSearch: logSearch,
	storeTweetData: storeTweetData,
	getPreviousSearches: getPreviousSearches,
	getTeams: getTeams,

	generate_query: generate_query,
	savedTweetToWeb: savedTweetToWeb
};

// SELECT player_handles.data, player_hashtag.data, player_keyword.data
// 	FROM player_entries
// 		INNER JOIN player_handles ON (player_entries.player_id = player_handles.player_id)
// 		INNER JOIN player_hashtag ON (player_entries.player_id = player_hashtag.player_id)
// 		INNER JOIN player_keyword ON (player_entries.player_id = player_keyword.player_id)
// 	WHERE player_entries.firstname = "WAYNE" AND player_entries.surname = "ROONEY";
