// var SQLite = window.cordova.require('cordova-sqlite-plugin.SQLite');

function Database() {
    this.db = window.sqlitePlugin.openDatabase({name: "football.db", location: "default"});

    // Create tables if they don't exist
    this.db.sqlBatch([
        "CREATE TABLE IF NOT EXISTS tweets ( \
        id INTEGER PRIMARY KEY AUTOINCREMENT, \
        userName TEXT, \
        tweetId TEXT, \
        tweetTimestamp TEXT, \
        previousSearchId INTEGER );",

        "CREATE TABLE IF NOT EXISTS previousSearches ( \
        isOrOperator INTEGER, \
        playerQuery TEXT, \
        teamQuery TEXT,  \
        searchTimestamp TEXT DEFAULT CURRENT_DATETIME);",

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

    // this.storeTweets([1, 2, 3]);
    // this.getTweets([0, "previouSearchTerm0"]);
    var tweetList = [1,2,3];
    var prevSearch = { isOrOperator: 0, playerQuery: "player", teamQuery: "team"};
    this.storeSearch(prevSearch, tweetList);
    this.getSearch(prevSearch);
}

Database.prototype.getSearch = function(searchParams) {
    var sqlQuery = "SELECT * FROM previousSearches WHERE isOrOperator=? AND playerQuery=? AND teamQuery=?";

    this.db.transaction(function(tx) {
        tx.executeSql(sqlQuery,
            [searchParams.isOrOperator, searchParams.playerQuery, searchParams.teamQuery],
            function(tx, rs) {
                console.log("QUERY success: ", tx);
                this.getSearchTweets(previousSearchId);
            },
            function(tx, error) {
                console.error("error: ", error);
            });

    });
};

Database.prototype.getSearchTweets = function(previousSearchId) {
    var sqlQuery = "SELECT * from tweets WHERE previousSearchId=?";
    this.db.transaction(sqlQuery, [previousSearchId],
        function(tx, rs) {
            console.log("QUERY success: ", tx);
        },
        function(tx, error) {
            console.error("QUERY error: ", error);
        }
    );
};

Database.prototype.storeSearch = function(searchParams, tweetList) {
    console.log("Attempting to insert search: ", searchParams);
    var sqlQuery = "INSERT INTO previousSearches (isOrOperator, playerQuery, teamQuery) VALUES \
        (?, ?, ?);";

        this.db.transaction(function(tx) {
            tx.executeSql(sqlQuery, [searchParams.isOrOperator, searchParams.playerQuery, searchParams.teamQuery],
                function(tx, rs) {
                    console.log("INSERT success: ", tx);
                    var rowId = rs.rows.item(0).id;
                    this.storeSearchTweets(rowId, tweetList);
                },
                function(tx, error) {
                    console.error("INSERT failed: ", tx);
                });
        });
};

Database.prototype.storeSearchTweets = function(previousSearchId, tweetList) {
    console.log("storeTweets ...");

    var sqlQuery = "INSERT INTO tweets \
        (userName, tweetId, tweetTimestamp, previousSearchId) \
        VALUES (?, ?, ?, ?)";
    var valuesList = [];
    var batchList = [];

    // Make a list of values
    for (var i=0; i<tweetList.length; i++) {
        valuesList.push(["userName"+i, "tweetId"+i, "tweetTimestamp"+i, 0]);
    }

    // Make list of pairs of query string and values, ready for batch operation
    for (var i=0; i<valuesList.length; i++) {
        batchList.push([sqlQuery, valuesList[i]]);
    }

    this.db.sqlBatch(batchList, function() {
        console.log("storeTweets (count=", batchList.length.toString(), ") OK");
    }, function(error) {
        console.error("storeTweets batch operation failed: ", error);
    });
};
