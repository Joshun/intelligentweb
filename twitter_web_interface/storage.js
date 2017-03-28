var config = require('./config.json');

var db = require('mysql').createConnection({
	host:     config.storage.host,
	user:     config.storage.user,
	password: config.storage.password,
	database: config.storage.database
});

db.connect();

console.log('Database Created');

// db.query('SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME LIKE \'%create%\'', function(err, row, res) {
// 	if(err) throw err;
// 	console.log(row);
// });

db.end();

module.exports = {
	db: db
}