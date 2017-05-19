// var SQLite = window.cordova.require('cordova-sqlite-plugin.SQLite');

function Database() {
    // var db = new SQLite("FootballDatabase");
    this.db = window.sqlitePlugin.openDatabase({name: "football.db", location: "default"});

    // this.db.transaction(function(tx) {
    //     tx.executeSql("CREATE TABLE IF NOT EXISTS FBALL ( pid INT PRIMARY KEY, name TEXT );");
    // });  
    this.db.sqlBatch([
        "CREATE TABLE IF NOT EXISTS previousSearches ( \
        id INTEGER PRIMARY KEY AUTOINCREMENT, \
        playerQuery TEXT, \
        isOrOperator INTEGER, \
        queryTimestamp TEXT );",

        "CREATE TABLE IF NOT EXISTS tweets ( \
        userName TEXT, \
        tweetId TEXT, \
        tweetTimestamp TEXT, \
        previousSearchId INT );",

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
}
