// db.js
// working: storing results and tweets
// not yet tested: retrieving results and tweets

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

    var tweetList = [1,2,3];
    var prevSearch = { isOrOperator: 0, playerQuery: "player", teamQuery: "team"};
    var that = this;

    var that = this;
    this.storeResult(prevSearch, [4,5,6,7]).then(function(result) {
        console.log("done!!!");

        that.getResult(prevSearch).then(function(result) {
            console.log("get result ", result);
        });
    }).catch(function(err) {
        console.log("error: ", err);
    });

}

// Given searchParams, retrieve previous tweet results
Database.prototype.getResult = function(searchParams) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.getSearch(searchParams).then(function(prevSearchId) {
            console.log("get search success");

            if (prevSearchId == null) {
                console.log("no prev searches");
                resolve(null);
            }
            else {
                that.getSearchTweets(prevSearchId).then(function(tweets) {
                    console.log("get tweets success");
                    resolve(tweets);
                }).catch(function(error) {
                    console.log("get tweets error ", error);
                    reject(error);
                });
            }
        }).catch(function(error) {
            console.log("get search error ", error);
            reject(error);
        });

    });
};

// Helper for getResult, gets prev search result given searchParams
Database.prototype.getSearch = function(searchParams) {
    var that = this;
    return new Promise(function(resolve, reject) {
        var sqlQuery = "SELECT * FROM previousSearches WHERE isOrOperator=? AND playerQuery=? AND teamQuery=?";

        that.db.transaction(function(tx) {
            tx.executeSql(sqlQuery,
                [searchParams.isOrOperator, searchParams.playerQuery, searchParams.teamQuery],
                function(tx, rs) {
                    console.log("QUERY success: ", tx);
                    if (rs.rows.length > 0) {
                        resolve(rs.rows.item(0));
                    }
                    else {
                        resolve(null);
                    }
                },
                function(tx, error) {
                    console.error("error: ", error);
                    reject(error);
                });
        });
    });
};

// Helper for getSearch, gets prev tweets given previousSearchId
Database.prototype.getSearchTweets = function(previousSearchId) {
    var that = this;
    return new Promise(function(resolve, reject) {
        var sqlQuery = "SELECT * from tweets WHERE previousSearchId=?";
        that.db.transaction(function(tx) {
            tx.executeSql(sqlQuery, [previousSearchId],
                function(tx, rs) {
                    console.log("QUERY success: ", tx);

                    var tweets = [];
                    for (var i=0; i<rs.rows.length; i++) {
                        tweets.push(rs.rows.item(i));
                    }
                    resolve(tweets);
                },
                function(tx, error) {
                    console.error("QUERY error: ", error);
                    reject(error);
                }
            );
        });    
    });
};


// Given searchParams and tweetList, store the previous search and corresponding tweets
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

// Given search params, log a previous search result
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

// Given a previousSearchId and list of tweets, store tweets
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
            reject(error);
        });
    });
};
