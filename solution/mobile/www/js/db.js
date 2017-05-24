// db.js
// working: storing results and tweets
// not yet tested: retrieving results and tweets

function Database() {
    // Initialise database
    this.db = window.sqlitePlugin.openDatabase({name: "football.db", location: "default"});

    // Create tables if they don't exist
    // The SQL schema for the mobile local database is defined here, since it is small
    // and enables it to be easily changed
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

}


// Given searchParams, retrieve previous tweet results
// searchParams is the users query: the team and player terms, and the type of query (AND or OR)
Database.prototype.getResult = function(searchParams) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.getSearch(searchParams).then(function(prevSearchId) {
            console.log("get search success");

            // Could not find a prevSearchId, so there are no previous searches, resolve empty list
            // This enables the previous searches to always be easily concatenated
            if (prevSearchId == null) {
                console.log("no prev searches");
                resolve([]);
            }
            // prevSearchId found, so get the corresponding stored tweets and resolve those
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

// Helper for getResult, gets previous search result given searchParams
Database.prototype.getSearch = function(searchParams) {
    var that = this;
    return new Promise(function(resolve, reject) {
        // Gets previous search entry given the search parameters
        // There should only ever be at most one in the table, since when storing it is updated if it exists
        var sqlQuery = "SELECT * FROM previousSearches WHERE isOrOperator=? AND playerQuery=? AND teamQuery=? LIMIT 1";

        that.db.transaction(function(tx) {
            tx.executeSql(sqlQuery,
                [searchParams.isOrOperator, searchParams.playerQuery, searchParams.teamQuery],
                function(tx, rs) {
                    if (rs.rows.length > 0) {
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

// Helper for getSearch, gets stored tweets given previousSearchId
Database.prototype.getSearchTweets = function(previousSearchId) {
    var that = this;
    return new Promise(function(resolve, reject) {
        // Get the tweets that correspond to the id of the previous search
        // They are ordered by date, most recent first, since this is the order they should appear on the page
        // It also means we can use this function to get the twitter id of the most recent tweet
        var sqlQuery = "SELECT * from tweets WHERE previousSearchId=? ORDER BY date(tweetTimestamp) DESC";
        that.db.transaction(function(tx) {
            tx.executeSql(sqlQuery, [previousSearchId],
                function(tx, rs) {
                    // the database API does not provide tweets in a list, rather they must be iterated through
                    // and added to a list
                    // if there are none, it will safely return an empty list
                    var tweets = [];
                    for (var i=0; i<rs.rows.length; i++) {
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
            console.log("search stored");
            // Search has been stored and we have got the id that it has been indexed by
            // Now the corresponding tweets must be stored based on the previousSearchId
            that.storeSearchTweets(prevSearchId, tweetList).then(function(result) {
                console.log("tweets stored");
                // Tweets stored, resolve status object returned by database insert
                resolve(result);
            }).catch(function(error) {
                console.log("error storing tweets", error);
                // Something went wrong, reject the corresponding error
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
                // Store the user's search in the previousSearches table
                var sqlQuery = "INSERT INTO previousSearches (isOrOperator, playerQuery, teamQuery) VALUES (?,?,?)";
                that.db.transaction(function(tx) {
                    tx.executeSql(sqlQuery, [searchParams.isOrOperator, searchParams.playerQuery, searchParams.teamQuery],
                        function(tx, rs) {
                            console.log("insert previous search OK, id=", rs.insertId);
                            // Storing the search was successful, resolve the id of the database row
                            // This is needed when storing the corresponding tweets
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
                // Query to update the timestamp of a previous search
                // This is called if the user performs a search that has been done before
                // We are updating existing searches rather than creating duplicate ones with different dates,
                // since each of the tweets must belong to one previous search
                var sqlQuery = "UPDATE previousSearches SET searchTimestamp = date('now') \
                    WHERE playerQuery = ? AND teamQuery = ? AND isOrOperator = ?";
                that.db.transaction(function(tx) {
                    tx.executeSql(sqlQuery, [searchParams.playerQuery, searchParams.teamQuery, searchParams.isOrOperator],
                    function(tx, rs) {
                        console.log("update search record OK");
                        // The update was successful, resolve the database status
                        resolve(prevSearch);
                    },
                    function(tx, error) {
                        console.error("error updating prev search timestamp", error);
                        reject(error);
                    });

                } );
            }

        }).catch(function(error) {
            console.error("error checking getting prev search", error);
        });
    });
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

        // Make a list of values to insert
        for (var i=0; i<tweetList.length; i++) {
            // Convert time to second epoch, since SQLite expects this
            var timestamp = new Date(tweetList[i].created_at).getTime() / 1000.0;

            valuesList.push([tweetList[i].user.screen_name, tweetList[i].id_str, tweetList[i].text, timestamp, previousSearchId]);
        }

        // Make list of pairs of query string and values, ready for batch operation
        for (var i=0; i<valuesList.length; i++) {
            batchList.push([sqlQuery, valuesList[i]]);
        }

        // Run the batch SQL insertion
        that.db.sqlBatch(batchList, function() {
            console.log("storeTweets (count=", batchList.length.toString(), ") OK");
            // resolve the number of tweets successfully inserted
            resolve(batchList.length);
        }, function(error) {
            console.error("storeTweets batch operation failed: ", error);
            reject(error);
        });
    });
};


// Converts a mobile local database tweet to the format expected by the app frontend
function savedTweetToWeb(tweet) {
    // Convert stored epoch timestamp to JS date object
    // Stored timestamp is in second-epoch, but Date takes millisecond-epoch
    var convertedTimestamp = new Date(tweet.tweetTimestamp * 1000).toISOString();

	return {
		text: tweet.tweetText,
		created_at: convertedTimestamp,
		user: { screen_name: tweet.userName},
		id_str: tweet.tweetId,
        db_state_mobile: true // tells frontend these tweets are from the mobile's local db storage
	};
}