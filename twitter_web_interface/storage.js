var config = require('./config.json');
var helper = require('./helper.js');

var db  = require('mysql').createPool({
	host:            config.storage.host,
	user:            config.storage.user,
	password:        config.storage.password,
	database:        config.storage.database,
	connectionLimit: 100,
	debug:           false
});

helper.info('DATABASE CONNECTED');

// db.query('SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME LIKE \'%create%\'', function(err, row, res) {
// 	if(err) throw err;
// 	console.log(row);
// });

function createTable() {
	var numConnect = 0;
	var totalConnect = 4;

	function checkCount(connection, total) {
		numConnect++;
		console.log(numConnect);
		if (numConnect == total) {
			console.log("DONE!");
			connection.release();
		}
		else {
			console.log("NOT YET.");
		}
	}

	db.getConnection(function(err, connection) {
		connection.query(
			"CREATE TABLE IF NOT EXISTS players ("
			+ " id INT PRIMARY KEY,"
			+ " firstName VARCHAR(20),"
			+ " lastName VARCHAR(20),"
			+ " age TINYINT"
			+ " )",
		function(error, results, fields) {
			if (err) throw err;
			checkCount(connection, totalConnect);
		});

		connection.query(
			"CREATE TABLE IF NOT EXISTS teams ("
			+ " id INT PRIMARY KEY,"
			+ " name VARCHAR(20),"
			+ " league VARCHAR(20),"
			+ " location VARCHAR(20)"
			+ " )",
		function(error, results, fields) {
			if (err) throw err;
			checkCount(connection, totalConnect);
		});

		connection.query(
			"CREATE TABLE IF NOT EXISTS teamHandles ("
			+ " id INT PRIMARY KEY,"
			+ " handleType VARCHAR(5)," // @ or # tag
			+ " handleText VARCHAR(20),"
			+ " teamId INT,"
			+ " FOREIGN KEY (teamId) REFERENCES teams(id)"
			+ " )",
		function(error, results, fields) {
			if (err) throw err;
			checkCount(connection, totalConnect);
		});

		connection.query(
			"CREATE TABLE IF NOT EXISTS playerHandles ("
			+ " id INT PRIMARY KEY,"
			+ " handleType VARCHAR(5)," // @ or # tag
			+ " handleText VARCHAR(20),"
			+ " playerId INT,"
			+ " FOREIGN KEY (playerId) REFERENCES players(id)"
			+ " )",
		function(error, results, fields) {
			if (err) throw err;
			checkCount(connection, totalConnect);
		});
	});
	console.log("DATABASE CREATION SUCCESS");
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
	getTeams: getTeams
};
