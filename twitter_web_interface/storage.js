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

// db.query('SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME LIKE \'%create%\'', function(err, row, res) {
// 	if(err) throw err;
// 	console.log(row);
// });

function createTable() {
	fs.readFile(config.storage.schema, 'utf8', function(err, data){
		console.log("SQL: " + data);
		db.getConnection(function(err, connection) {
			connection.query(data, function(error, results, fields) {
				console.log("QUERY EXECUTED");
				console.log(results);
			});
		});
	});

	// db.getConnection(function(err, connection) {
	// 	connection.query(
	// 	function(error, results, fields) {
	// 		if (err) throw err;
	// 		checkCount(connection, totalConnect);
	// 	});

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
