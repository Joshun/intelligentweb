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
<<<<<<< f33c8f297fe80d68d0a7848d90e297629b2f45b5
				helper.debug("QUERY EXECUTED");
				helper.debug(results);
=======
				if (error) throw err;
				console.log("CREATE QUERY EXECUTED");
				console.log(results);
>>>>>>> Implement logSearch; Refine db schema with autoincrement
			});
		});
	});

	helper.debug("DATABASE CREATION SUCCESS");
}

function logSearch(query) {
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
				if (error) throw error;
				console.log("LOG QUERY EXECUTED");
				console.log(results);
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
	getTeams: getTeams
};

// SELECT player_handles.data, player_hashtag.data, player_keyword.data
// 	FROM player_entries
// 		INNER JOIN player_handles ON (player_entries.player_id = player_handles.player_id)
// 		INNER JOIN player_hashtag ON (player_entries.player_id = player_hashtag.player_id)
// 		INNER JOIN player_keyword ON (player_entries.player_id = player_keyword.player_id)
// 	WHERE player_entries.firstname = "WAYNE" AND player_entries.surname = "ROONEY";