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
	multipleStatements: true // Required to allow the SQL schema to be loaded from text file
});

helper.info('Database Connection Established');

// Creates tables from the sql schema specified in config.storage.schema
function createTable() {
	// Read the SQL schema from text file, the path of which is specified in config.storage.schema
	fs.readFile(config.storage.schema, 'utf8', function(err, data){
		helper.debug("SQL: " + data);
		db.getConnection(function(err, connection) {
			if (err) throw err; // At this stage, MySQL errors are critical, so throw them
			connection.query(data, function(error, results, fields) {
				connection.release();
				
				if (error) throw error;
				helper.debug("CREATE QUERY EXECUTED");
				helper.debug(results);

			});
		});
	});

	helper.debug("DATABASE CREATION SUCCESS");
}

// Writes a search made by the user to the database, timestamped at the time it was made
function logSearch(query, reply) {
	return new Promise(function(resolve, reject){
		helper.debug("BEGIN LOG QUERY");

		// Map client-side query variables to those used by database
		var playerQuery = query.player_query;
		var teamQuery = query.team_query;
		var isOrOperator = query.or_operator;

		db.getConnection(function(err, connection) {
			if (err) reject(err);
			// Check if any searches exist with the same parameters (playerQuery, teamQuery, isOrOperator)
			connection.query(
				"SELECT * FROM previousSearches \
					WHERE playerQuery = ? \
					AND teamQuery = ? \
					AND isOrOperator = ? \
					LIMIT 1",
				[playerQuery, teamQuery, isOrOperator],
				function(error, results, field) {
					if (error) reject(error);
					else {
						if (results.length > 0) {
							// Previous search result with the same parameters exists, so simply update its timestamp
							connection.query(
								"UPDATE previousSearches SET queryTimestamp = NOW() WHERE playerQuery = ? AND teamQuery = ? AND isOrOperator = ?",
							[playerQuery, teamQuery, isOrOperator],
							function(error, data, fields) {
								connection.release();

								if (error) reject(error);
								else {
									helper.debug("Log Complete!");
									// Resolving id, which is used when inserting tweets, so that they are linked to previous searches
									resolve([results[0].id, reply]);
								}
							});
						}
						else {
							// Search has not been carried out before, so insert it as entry to previous searches
							connection.query(
								"INSERT INTO previousSearches (playerQuery, teamQuery, isOrOperator, queryTimestamp) VALUES (?, ?, ?, NOW())",
							[playerQuery, teamQuery, isOrOperator],
							function(error, data, fields) {
								connection.release();

								if (error) reject(error);
								else {
									helper.debug("Log Complete!");
									// Resolving id, which is used when inserting tweets, so that they are linked to previous searches
									resolve([data.insertId, reply]);
								}
							});
						}
					}
				});
		});
	});
}

// Stores tweets in the database, with a reference to the corresponding user search
function storeTweetData(data, logPrimaryKey) {

	return new Promise(function(resolve, reject){
		helper.debug("START TWEET STORE:");
		helper.debug("logPrimaryKey: ", logPrimaryKey);
		helper.debug("Tweet count: " + data.statuses.length);

		db.getConnection(function(err, connection) {
			var statuses = data.statuses;
			var promiseList = [];
			for (var i=0; i<statuses.length; i++) {
				var status = statuses[i];

				// Convert RFC2822 to millisecond epoch, and then to second epoch
				var timestamp = new Date(status.created_at).getTime() / 1000.0;

				// Skip tweets that have invalid properties (i.e. null name, text, id or timestamp)
				// This prevents errors or crashes
				if (! (status.user.screen_name && status.id_str && status.text && timestamp)) {
					helper.debug("Skipping tweet with invalid property (", i, ")");
					continue;
				}

				// Make a list of promises, one for each insert operation
				// This is the most straightforward way to bulk insert using the MySQL library
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
			// Carry out all the insertion operations
			Promise.all(promiseList)
			// Catch errors during bulk insert
			.catch(function(error) {
				connection.release();

				helper.warn("Storing tweets failed.");
				helper.debug(error);
				reject(error);
			})
			// If they succeed, release database connection and resolve the inserted data
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

		db.getConnection(function(err, connection) {
			if (err) reject(err);
			connection.query(
				// Query gets all previousSearches that match the parameters of the previous query
				"SELECT * FROM previousSearches WHERE playerQuery=? AND teamQuery=? AND isOrOperator=? ORDER BY queryTimestamp DESC",
				[playerQuery, teamQuery, isOrOperator],
				function(error, results, fields) {
					connection.release();

					if (error) reject(error);
					resolve(results);
				});
		});
	});
}

// Gets previous tweets, given the corresponding id of a previous search
function getPreviousTweets(prevSearchId) {
	return new Promise(function(resolve, reject) {
		db.getConnection(function(err, connection) {
			if (err) reject(err);

			// Get stored tweets, ordered by tweetId decending
			// Since tweet ids are incremental, we want higher tweet ids to appear first, since these are the most recent
			connection.query(
				"SELECT * from tweets WHERE previousSearchId = ? ORDER BY tweetId DESC",
				[prevSearchId],
				function(error, results, fields) {
					connection.release();

					if (error) reject(error);
					else resolve(results);
				}
			);
		});
	});
}

/**
 * Converts the user's search terms into the appropriate format for Twitter to use.
 *
 * Since the tokenfield entity supplies a comma-delimited string, the query
 * must be processed to make it compatible with the REST API. Specifically, the
 * addition of quotes around each term, and the replacement of ", " with " OR "
 * to denote union of exact phrases.
 *
 * @param    query    the search terms to be used
 * @returns           the formatted query
 */
function generate_query(query) {
	// converts each comma-delimited string into list of strings
	var tweet_p = query.player_query.split(",");
	var tweet_t = query.team_query.split(",");

	// trims whitespace around each term, and adds quotes to either side
	tweet_p = tweet_p.map(function(str) {
		return "\"" + str.trim() + "\"";
	});

	// trims whitespace around each term, and adds quotes to either side
	tweet_t = tweet_t.map(function(str) {
		return "\"" + str.trim() + "\"";
	});

	var tweet_query;

    if (query.or_operator) {
      tweet_query = tweet_p.toString().replace(",", " OR ") + ' OR ' + tweet_t.toString().replace(",", " OR "); // adds " OR " between player and team terms to intersect
  	}
    else {
      tweet_query = tweet_p.toString().replace(",", " OR ") + ' '    + tweet_t.toString().replace(",", " OR "); // adds " " between player and team terms to union
    }

    helper.debug("Processed:", tweet_query, query.or_operator);

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

// Given a table (i.e. players or teams), get the real name that corresponds to a screen name or twitter handle
function getRealNameFromScreenName(nameTable, screenName) {
	return new Promise(function (resolve, reject) {
		if (screenName == undefined || screenName == null) {
			reject("screenName null or undefined;");
		}
		db.getConnection(function(err, connection) {
			if (err) reject(err);
			helper.debug("SELECT * FROM $TABLE WHERE screenName = ?".replace("$TABLE", nameTable));
			helper.debug(screenName);
			// Substitutes $TABLE with the table corresponding to the type of name
			connection.query("SELECT * FROM $TABLE WHERE screenName = ?".replace("$TABLE", nameTable), screenName, function(error, results, fields) {
				helper.debug('query done');
				if (error) reject(error);
				else {
					connection.release();

					// This should not happen, if it does an error has occurred
					if (results == null) {
						reject("getRealNameFromScreenName failed!");
					}
					// If a corresponding real name exists for the screen name, resolve it (there should only be one)
					else if (results.length > 0) {
						helper.info("getRealNameFromScreenName worked!");
						resolve(results[0].realName);
					}
					// Otherwise, resolve null to indicate the corresponding real name has not been found
					else {
						helper.info("getRealNameFromScreenName nulled!");
						resolve(null);
					}
				}
			});
		});
	});
}

// Given a screen name of a team, retrieve the team's real name
function getTeamFromScreenName(screenName) {
	return getRealNameFromScreenName('teams', screenName);
}

// Given the screen name of a player, retrieve the player's real name
function getPlayerFromScreenName(screenName) {
	return getRealNameFromScreenName('players', screenName);
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
	savedTweetToWeb: savedTweetToWeb,

	getTeamFromScreenName: getTeamFromScreenName,
	getPlayerFromScreenName: getPlayerFromScreenName
};

