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

helper.info('DATABASE CONNECTED');

function createTable() {
	fs.readFile(config.storage.schema, 'utf8', function(err, data){
		helper.debug("SQL: " + data);
		db.getConnection(function(err, connection) {
			if (err) throw err;
			connection.query(data, function(error, results, fields) {
				if (error) throw err;
				helper.debug("CREATE QUERY EXECUTED");
				helper.debug(results);
			});
		});
	});

	helper.debug("DATABASE CREATION SUCCESS");
}

function logSearch(query) {
	return new Promise(function(resolve, reject){
		console.log("BEGIN LOG QUERY");
		console.log(query);
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
					console.log("LOG QUERY EXECUTED");
					resolve(results);
				});
		});
	});
}

function storeTweetData(data, logPrimaryKey) {
	return new Promise(function(resolve, reject){
		console.log("START TWEET STORE:");
		var resultsList = [];
		var statuses = data.statuses;
		console.log("length " + statuses.length);
		for (var index=0; index<statuses.length; index++) {
			(function(status,pos,len) {
				db.getConnection(function(err, connection) {
					if (err) reject(error);
					connection.query(
						"INSERT INTO tweets(tweetText, tweetTimestamp, previousSearchId) VALUES (?, ?, ?)",
						[status.text, status.created_at, logPrimaryKey],
						function(error, results, fields) {
							if (error) reject(error);
							console.log("TWEET SAVE QUERY EXECUTED");
							resultsList.push(results);
							if (pos == len-1) {
								resolve(resultsList);
							}
						});
				});
			})(statuses[index],index,statuses.length);
		}
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
				"SELECT(id) FROM previousSearches WHERE playerQuery=? AND teamQuery=? AND playerAtChecked=? AND playerHashChecked=? AND playerKeywordChecked=? AND teamAtChecked=? AND teamHashChecked=? AND teamKeywordChecked=? and queryTimestamp BETWEEN DATE_SUB(NOW(), INTERVAL 1 DAY) AND NOW() ",
				[playerQuery, teamQuery, 
					playerAtChecked, playerHashChecked, playerKeywordChecked,
					teamAtChecked, teamHashChecked, teamKeywordChecked],
				function(error, results, fields) {
					if (error) reject(error);
					console.log("HAS SEARCH BEEN MADE? " + ((results.length > 0) ? "yes" : "no"));
					resolve(results);
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


// init
createTable();

// exports
module.exports = {
	db: db,
	logSearch: logSearch,
	storeTweetData: storeTweetData,
	getPreviousSearches: getPreviousSearches,
	getTeams: getTeams
};

// SELECT player_handles.data, player_hashtag.data, player_keyword.data
// 	FROM player_entries
// 		INNER JOIN player_handles ON (player_entries.player_id = player_handles.player_id)
// 		INNER JOIN player_hashtag ON (player_entries.player_id = player_hashtag.player_id)
// 		INNER JOIN player_keyword ON (player_entries.player_id = player_keyword.player_id)
// 	WHERE player_entries.firstname = "WAYNE" AND player_entries.surname = "ROONEY";