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
        tweetText TEXT, \
        tweetTimestamp TEXT, \
        previousSearchId INTEGER );",

        "CREATE TABLE IF NOT EXISTS previousSearches ( \
        id INTEGER PRIMARY KEY AUTOINCREMENT, \
        isOrOperator INTEGER, \
        playerQuery TEXT, \
        teamQuery TEXT,  \
        searchTimestamp TEXT DEFAULT CURRENT_DATETIME);",
    ], function() {
        console.log("db OK");
    }, function(error) {
        console.log("db error: ", error);
    });

    var tweetList = [1,2,3];
    var prevSearch = { isOrOperator: 0, playerQuery: "player", teamQuery: "team"};

    // var that = this;

    // this.storeResult(prevSearch, [4,5,6,7]).then(function(result) {
    //     console.log("done!!!");

    //     that.getResult(prevSearch).then(function(result) {
    //         console.log("get result ", result);
    //     });
    // }).catch(function(err) {
    //     console.log("error: ", err);
    // });

}

Database.prototype.getLatestTweetId = function(searchParams) {
    var that = this;

    return new Promise(function(resolve, reject) {
        var sqlQuery = "SELECT * FROM tweets ORDER BY tweetTimestamp DESC LIMIT 1";
        that.db.transaction(function(tx) {
            tx.executeSql(sqlQuery, [], function(tx, result) {
                // There is nothing in db, resolve 0 (i.e. first-time query)
                if (result.rows.length == 0) {
                    resolve(0);
                }
                // Resolve timestamp of most recent tweet
                else {
                    // resolve(result.rows.item(0).tweetTimestamp);
                    resolve(result.rows.item(0).tweetId);
                }
            }, function(tx, error) {
                reject(error);
            });
        });
    });


    // this.getResult(searchParams).then(function(results) {
    //     var mostRecent = results[0];

    //     var mostRecentTimestamp = mostRecent.tweetTimestamp;
    //     var reqObj = {
    //         mb_timestamp: mostRecentTimestamp, // timestamp of most recent tweet in local storage
            
    //         team_query: searchParams.teamQuery,
    //         player_query: searchParams.playerQuery,
    //         or_operator: searchParams.isOrOperator
    //     };
    // });
};

// Given searchParams, retrieve previous tweet results
Database.prototype.getResult = function(searchParams) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.getSearch(searchParams).then(function(prevSearchId) {
            console.log("get search success");

            if (prevSearchId == null) {
                console.log("no prev searches");
                resolve([]);
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
        // var sqlQuery = "SELECT * FROM previousSearches WHERE isOrOperator=? AND playerQuery=? AND teamQuery=?";
        var sqlQuery = "SELECT * FROM previousSearches WHERE isOrOperator=? AND playerQuery=? AND teamQuery=? LIMIT 1";

        that.db.transaction(function(tx) {
            tx.executeSql(sqlQuery,
                [searchParams.isOrOperator, searchParams.playerQuery, searchParams.teamQuery],
                function(tx, rs) {
                    console.log("QUERY success: ", tx);
                    if (rs.rows.length > 0) {
                        console.log("prev search id:", rs.rows.item(0).id);
                        resolve(rs.rows.item(0).id);
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
        var sqlQuery = "SELECT * from tweets WHERE previousSearchId=? ORDER BY date(tweetTimestamp) DESC";
        that.db.transaction(function(tx) {
            tx.executeSql(sqlQuery, [previousSearchId],
                function(tx, rs) {
                    console.log("QUERY success: ", tx);

                    var tweets = [];
                    for (var i=0; i<rs.rows.length; i++) {
                        // tweets.push(rs.rows.item(i));
                        tweets.push(savedTweetToWeb(rs.rows.item(i)));
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
        // Check if previous search exists
        // If it exists, get its id and do UPDATE operation

        // Else, do insert operation
        console.log(" performing check of previous searches...");
        that.getSearch(searchParams).then(function(prevSearch) {
            // No previous search exists, insert new entry
            if (prevSearch == null) {
                console.log(" no previous search exists, inserting fresh entry");
                var sqlQuery = "INSERT INTO previousSearches (isOrOperator, playerQuery, teamQuery) VALUES (?,?,?)";
                that.db.transaction(function(tx) {
                    console.log("transaction");
                    tx.executeSql(sqlQuery, [searchParams.isOrOperator, searchParams.playerQuery, searchParams.teamQuery],
                        function(tx, rs) {
                            console.log("insert previous search OK, id=", rs.insertId);
                            resolve(rs.insertId);
                        },
                        function(tx, error) {
                            console.error("error inserting search record", error);
                            reject(error);
                        });
                });

            }
            // Previous search exists, update timestamp
            else {
                console.log(" previous search exists, updating to current timestamp");
                // var prevSearchId = prevSearch.id;
                var sqlQuery = "UPDATE previousSearches SET searchTimestamp = date('now') \
                    WHERE playerQuery = ? AND teamQuery = ? AND isOrOperator = ?";
                that.db.transaction(function(tx) {
                    tx.executeSql(sqlQuery, [searchParams.playerQuery, searchParams.teamQuery, searchParams.isOrOperator],
                    function(tx, rs) {
                        console.log("update search record OK");
                        // resolve(rs.insertId);
                        resolve(prevSearch);
                    },
                    function(tx, error) {
                        console.error("error updating prev search timestamp", error);
                        reject(error);
                    });

                } );
            }

        }).catch(function(error) {
            console.error("errr checking getting prev search", error);
        });
    });

    // return new Promise(function(resolve, reject) {
    //     console.log("Attempting to insert search: ", searchParams);
    //     var sqlQuery = "INSERT INTO previousSearches (isOrOperator, playerQuery, teamQuery) VALUES \
    //         (?, ?, ?);";
    //     console.log(that);

    //     that.db.transaction(function(tx) {
    //         tx.executeSql(sqlQuery, [searchParams.isOrOperator, searchParams.playerQuery, searchParams.teamQuery],
    //             function(tx, rs) {
    //                 console.log("INSERT success: ", tx);
    //                 var rowId = rs.insertId;
    //                 console.log(rowId);
    //                 resolve(rowId);
    //             },
    //             function(tx, error) {
    //                 console.error("INSERT failed: ", tx);
    //                 reject(error);
    //             });
    //     });
    // });
};

// Given a previousSearchId and list of tweets, store tweets
Database.prototype.storeSearchTweets = function(previousSearchId, tweetList) {
    var that = this;
    return new Promise(function(resolve, reject) {
        console.log("storeTweets ... ( previousSearchId=", previousSearchId, ")");

        var sqlQuery = "INSERT INTO tweets \
            (userName, tweetId, tweetText, tweetTimestamp, previousSearchId) \
            VALUES (?, ?, ?, ?, ?)";
        var valuesList = [];
        var batchList = [];

        // Make a list of values
        for (var i=0; i<tweetList.length; i++) {
            var timestamp = new Date(tweetList[i].created_at).getTime() / 1000.0;

            // valuesList.push([tweetList[i].user.screen_name, tweetList[i].id_str, status.text, timestamp, previousSearchId]);
            
            // TODO: remove [STORED] debug
            valuesList.push([tweetList[i].user.screen_name, tweetList[i].id_str, tweetList[i].text, timestamp, previousSearchId]);
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

function savedTweetToWeb(tweet) {
    // Convert stored epoch timestamp to JS date object
    // Stored timestamp is in second-epoch, but Date takes millisecond-epoch
    var convertedTimestamp = new Date(tweet.tweetTimestamp * 1000);

	return {
		text: tweet.tweetText,
		created_at: convertedTimestamp.toString(),
		user: { screen_name: tweet.userName},
		id_str: tweet.tweetId,
        db_state_mobile: true
	};
}