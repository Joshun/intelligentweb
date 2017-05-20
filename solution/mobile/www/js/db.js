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
    var that = this;
    // this.storeSearch(prevSearch, function(result) {
    //     console.log("done: ", result);
    // });
    // this.storeSearch(prevSearch).then(function(res) {
    //     console.log("res: ", res);
    // });

    // this.storeSearchTweets(2, [1,2,3]).then(function(res) {
    //     console.log("res: ", res);
    // });

    this.storeResult(prevSearch, [4,5,6,7]).then(function(result) {
        console.log("done!!!");
    }).catch(function(err) {
        console.log("error: ", err);
    });

    // this.getSearch(prevSearch);

}

Database.prototype.getSearch = function(searchParams, callback) {
    var that = this;
    return new Promise(function(resolve, reject) {
        var sqlQuery = "SELECT * FROM previousSearches WHERE isOrOperator=? AND playerQuery=? AND teamQuery=?";

        that.db.transaction(function(tx) {
            tx.executeSql(sqlQuery,
                [searchParams.isOrOperator, searchParams.playerQuery, searchParams.teamQuery],
                function(tx, rs) {
                    console.log("QUERY success: ", tx);
                    callback(previousSearchId);
                },
                function(tx, error) {
                    console.error("error: ", error);
                    reject(error);
                });

        });
    });
};

Database.prototype.getSearchTweets = function(previousSearchId) {
    var that = this;
    return new Promise(function(resolve, reject) {
        var sqlQuery = "SELECT * from tweets WHERE previousSearchId=?";
        that.db.transaction(sqlQuery, [previousSearchId],
            function(tx, rs) {
                console.log("QUERY success: ", tx);
                resolve(rs.rows);
            },
            function(tx, error) {
                console.error("QUERY error: ", error);
                reject(error);
            }
        );
    });    
};

Database.prototype.storeResult = function(searchParams, tweetList) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.storeSearch(searchParams).then(function(prevSearchId) {
            console.log("stored search: ", prevSearchId);
            that.storeSearchTweets(prevSearchId, tweetList).then(function(result) {
                console.log("stored tweets, ", result);
                resolve(result);
            }).catch(function(error) {
                console.log("error storing tweets", error);
                reject(error);
            });
        }).catch(function(error) {
            console.log("error storing search", error);
            reject(error);
        });
    });
};

Database.prototype.storeSearch = function(searchParams) {
    var that = this;
    return new Promise(function(resolve, reject) {
        console.log("Attempting to insert search: ", searchParams);
        var sqlQuery = "INSERT INTO previousSearches (isOrOperator, playerQuery, teamQuery) VALUES \
            (?, ?, ?);";
        console.log(that);

        that.db.transaction(function(tx) {
            tx.executeSql(sqlQuery, [searchParams.isOrOperator, searchParams.playerQuery, searchParams.teamQuery],
                function(tx, rs) {
                    console.log("INSERT success: ", tx);
                    var rowId = rs.insertId;
                    console.log(rowId);
                    resolve(rowId);
                },
                function(tx, error) {
                    console.error("INSERT failed: ", tx);
                    reject(error);
                });
        });
    });
};

Database.prototype.storeSearchTweets = function(previousSearchId, tweetList) {
    var that = this;
    return new Promise(function(resolve, reject) {
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

        that.db.sqlBatch(batchList, function() {
            console.log("storeTweets (count=", batchList.length.toString(), ") OK");
            resolve(batchList.length);
        }, function(error) {
            console.error("storeTweets batch operation failed: ", error);
            // throw error;
            reject(error);
        });
    });
};
