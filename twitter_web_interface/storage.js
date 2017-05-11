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

// Creates tables from the sql schema specified in config.storage.schema
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

// Writes a search made by the user to the database, timestamped at the time it was made
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

		var isOrOperator = query.or_operator;

		// var playerAtChecked = query.handles_player;
		// var playerHashChecked = query.hashtag_player;
		// var playerKeywordChecked = query.keyword_player;

		// var teamAtChecked = query.handles_team;
		// var teamHashChecked = query.hashtag_team;
		// var teamKeywordChecked = query.keyword_team;

		db.getConnection(function(err, connection) {
			if (err) throw err;
			connection.query(
				// "INSERT INTO previousSearches(playerQuery, teamQuery, playerAtChecked, playerHashChecked, playerKeywordChecked, teamAtChecked, teamHashChecked, teamKeywordChecked, queryTimestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
				"INSERT INTO previousSearches(playerQuery, teamQuery, isOrOperator, queryTimestamp) VALUES (?, ?, ?, NOW())",
				// [playerQuery, teamQuery,
				// 	playerAtChecked, playerHashChecked, playerKeywordChecked,
				// 	teamAtChecked, teamHashChecked, teamKeywordChecked],
				[playerQuery, teamQuery, isOrOperator],
				function(error, results, fields) {
					if (error) reject(error);
					helper.debug("LOG QUERY EXECUTED");
					resolve(results);

					connection.release();
				});
		});
	});
}

// Stores tweets in the database, with a reference to the corresponding user search
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
						"INSERT INTO tweets(userName, tweetId, tweetText, tweetTimestamp, previousSearchId) VALUES (?, ?, ?, FROM_UNIXTIME(?), ?)",
						[status.user.screen_name, status.id_str, status.text, timestamp, logPrimaryKey],
						function(error, results, fields) {
							if (error) reject(error);
							else {
								resolve(results);
							}
					});
				}));
			}
			Promise.all(promiseList)
			.catch(function(error) {
				connection.release();
				reject(error);
			})
			.then(function(data) {
				connection.release();
				resolve(data);
			});

		});
	});
}

// Retrieves previous searches that are identical or similar to the specified query
function getPreviousSearches(query) {
	return new Promise(function(resolve, reject) {

		var playerQuery = query.player_query;
		var teamQuery = query.team_query;
		var isOrOperator = query.or_operator;

		// var playerAtChecked = query.handles_player;
		// var playerHashChecked = query.hashtag_player;
		// var playerKeywordChecked = query.keyword_player;
		//
		// var teamAtChecked = query.handles_team;
		// var teamHashChecked = query.hashtag_team;
		// var teamKeywordChecked = query.keyword_team;

		db.getConnection(function(err, connection) {
			if (err) throw err;
			connection.query(
				// Query gets all previousSearches that match the parameters of the previous query and are recent enough
				// DATE_SUB subtracts interval from current date
				// BETWEEN gets queries between the time parameters
				// "SELECT * FROM previousSearches WHERE playerQuery=? AND teamQuery=? AND playerAtChecked=? AND playerHashChecked=? AND playerKeywordChecked=? AND teamAtChecked=? AND teamHashChecked=? AND teamKeywordChecked=?",
				"SELECT * FROM previousSearches WHERE playerQuery=? AND teamQuery=? AND isOrOperator=?",
				// [playerQuery, teamQuery,
				// 	playerAtChecked, playerHashChecked, playerKeywordChecked,
				// 	teamAtChecked, teamHashChecked, teamKeywordChecked],
				[playerQuery, teamQuery, isOrOperator],
				function(error, results, fields) {
					if (error) reject(error);
					resolve(results);

					connection.release();
				});
		});
	});
}

// Gets previous tweets, given the corresponding id of a previous search
function getPreviousTweets(prevSearchId) {
	return new Promise(function(resolve, reject) {
		db.getConnection(function(err, connection) {
			if (err) reject(err);
			connection.query(
				"SELECT * from tweets WHERE previousSearchId = ?",
				[prevSearchId],
				function(error, results, fields) {
					if (error) reject(error);
					resolve(results);
				}
			);
		});
	});
}

// Converts the user's search terms into the appropriate format for the Twitter API
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

// Converts a previously saved tweet from the database to the format expected by the frontend
function savedTweetToWeb(tweet) {
	return {
		text: tweet.tweetText,
		created_at: tweet.tweetTimestamp,
		user: { screen_name: tweet.userName},
		id_str: tweet.tweetId
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
	getPreviousTweets: getPreviousTweets,

	generate_query: generate_query,
	savedTweetToWeb: savedTweetToWeb
};

// Drafting of how the handles and hashtag tables might be used
// SELECT player_handles.data, player_hashtag.data, player_keyword.data
// 	FROM player_entries
// 		INNER JOIN player_handles ON (player_entries.player_id = player_handles.player_id)
// 		INNER JOIN player_hashtag ON (player_entries.player_id = player_hashtag.player_id)
// 		INNER JOIN player_keyword ON (player_entries.player_id = player_keyword.player_id)
// 	WHERE player_entries.firstname = "WAYNE" AND player_entries.surname = "ROONEY";
