// var SQLite = window.cordova.require('cordova-sqlite-plugin.SQLite');

function Database() {
    this.db = window.sqlitePlugin.openDatabase({name: "football.db", location: "default"});

    this.db.sqlBatch([
        "CREATE TABLE IF NOT EXISTS tweets ( \
        id INTEGER PRIMARY KEY AUTOINCREMENT, \
        userName TEXT, \
        tweetId TEXT, \
        tweetTimestamp TEXT, \
        previousSearchIsOrOperator INTEGER, \
        previousSearchTerm TEXT );",

        "CREATE TABLE IF NOT EXISTS teams ( \
        id INTEGER PRIMARY KEY AUTOINCREMENT, \
        screenName TEXT UNIQUE, \
        realName TEXT UNIQUE );",

        "CREATE TABLE IF NOT EXISTS players ( \
        id INTEGER PRIMARY KEY AUTOINCREMENT, \
        screenName TEXT UNIQUE, \
        realName TEXT UNIQUE );"
    ], function() {
        console.log("db OK");
    }, function(error) {
        console.log("db error: ", error);
    });

    this.storeTweets([1, 2, 3]);
    this.getTweets([0, "previouSearchTerm0"]);
}

Database.prototype.getTweets = function(previousSearchIsOrOperator, previousSearchTerm) {
    this.db.transaction(function(tx) {
        tx.executeSql("SELECT * FROM tweets",
            [], function(tx, rs) {
                console.log(rs.rows.length);
            }, function(tx, error) {
                console.error("error: ", error);
            });

    });
}

Database.prototype.storeTweets = function(tweetList) {
    console.log("storeTweets ...");
    var sqlQuery = "INSERT INTO tweets \
        (userName, tweetId, tweetTimestamp, previousSearchIsOrOperator, previousSearchTerm) \
        VALUES (?, ?, ?, ?, ?)"
    var valuesList = [];
    var batchList = [];

    // Make a list of values
    for (var i=0; i<tweetList.length; i++) {
        valuesList.push(["userName"+i, "tweetId"+i, "tweetTimestamp"+i, 0, "previousSearchTerm"+i]);
    }

    // Make list of pairs of query string and values, ready for batch operation
    for (var i=0; i<valuesList.length; i++) {
        batchList.push([sqlQuery, valuesList[i]]);
    }

    this.db.sqlBatch(batchList, function() {
        console.log("storeTweets (count=", batchList.length.toString(), ") OK")
    }, function(error) {
        console.error("storeTweets batch operation failed: ", error);
    });
}
