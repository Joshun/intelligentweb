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

module.exports = {
	db: db
}