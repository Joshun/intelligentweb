
var dbp = require('dbpediaclient');
var storage = require('./storage.js');
var helper = require('./helper.js');

//var fs = require('fs');

// Searches player stats given player term
function searchPlayer(term) {
    return search(term, 'soccer player', true);
}

// Searches a team stats given team term
function searchTeam(term) {
    return search(term, 'soccer club', true);
}

// Searches stats for term term given term and ontology class
function search(term, ontologyClass, firstOnly) {
    helper.debug('term: ', term, ' class: ', ontologyClass);
    return new Promise(function(resolve, reject) {
        dbp.keywordSearch(term, ontologyClass, function(results) {
            if (results == null) {
                reject("error searching");
            }
            else {
                var parsedResults = JSON.parse(results).results;
                if (results.length > 0) {
                    helper.debug(parsedResults);
                    // If firstOnly set, only retrieve first result

                    //// DEBUGGING DBPEDIA
                    // var fname = "/tmp/node-out-" + (Math.random() * 1e9).toString() ;
                    // fs.writeFile(fname, results, function(err) {
                    //     if (err) console.log(err);
                    //     else console.log("saved! ", fname);
                    // });
                    ////


                    resolve(firstOnly ? parsedResults[0] : parsedResults);
                }
                else {
                    resolve(null);
                }
            }
        });
    });  
}

function removeAtTag(twitterHandle) {
    // Trim whitespace
    helper.debug("Trimming Whitespace");
    twitterHandle = twitterHandle.trim();

    // If "@" not present, don't do anything and return null
    if (!twitterHandle.match("^@")) {
        helper.debug("Returning Null");
        return null;
    }
    else {
        // If "@" present, remove it and return
        helper.debug("Removing @ Tag");
        return twitterHandle.slice(1, twitterHandle.length);
    }
}

function getTeamStats(teamTwitterHandle) {
    return new Promise(function(resolve, reject) {
        helper.debug("Twitter Handle Working:", teamTwitterHandle);
        teamTwitterHandle = removeAtTag(teamTwitterHandle);
        if (teamTwitterHandle == null) {
            helper.debug("Twitter Handle Failed:", 1);
            resolve(null);
        }
        else {
            helper.debug("Testing if Working:", 1);
        }

        storage.getTeamFromScreenName(teamTwitterHandle)

        .then(function(result) {
            teamTwitterHandle = teamTwitterHandle.trim();
               
            if (result == null) {
                helper.debug("Twitter Handle Failed:", 2);
                resolve(null);
            }
            else {
                searchTeam(result)

                .then(function(stats) {
                    helper.debug("Returns Results", stats);
                    resolve(stats);
                })

                .catch(function(error) {
                    helper.error('getTeamStats failed');
                    reject(error);
                });
            }
        })

        .catch(function(error) {
            helper.error("getTeamStats failed: ", error);
            reject("getTeamStats failed");
        });
    });
}

function getPlayerStats(playerTwitterHandle) {
    return new Promise(function(resolve, reject) {

        playerTwitterHandle = removeAtTag(playerTwitterHandle);
        
        if (playerTwitterHandle == null) {
            helper.debug("Twitter Handle Failed:", 1);
            resolve(null);
        }   
        else {
            helper.debug("Testing if Working:", 2);
        }

        storage.getPlayerFromScreenName(playerTwitterHandle)

        .then(function(result) {
            searchPlayer(result)

            .then(function(stats) {
                if (result == null) {
                    helper.debug("Twitter Handle Failed:", 2);
                    resolve(null);
                }
                else {
                    helper.debug("Returns Results", stats);
                    resolve(stats);
                }
            })

            .catch(function(error) {
                helper.error('getPlayerStats failed');
                reject(error);
            });
        })

        .catch(function(error) {
            helper.error("getPlayerStats failed: ", error);
            reject("getPlayerStats failed");
        });
    });
}


function getAndEmitStats(socket, playerTwitterHandle, teamTwitterHandle) {
    helper.debug('getAndEmitStats: ', playerTwitterHandle, ',', teamTwitterHandle);
    getTeamStats(teamTwitterHandle)

    .then(function(teamResults) {
        helper.debug("got team results", teamResults);
        var statsToSend = {
            "description": teamResults != null && "description" in teamResults ? teamResults.description : "",
            "label": teamResults != null && "label" in teamResults ? teamResults.label : ""
        };
        socket.emit('team_stats', statsToSend);

    })

    .catch(function(error) {
        helper.error("getAndEmitStats failed: ", error);
    });


    getPlayerStats(playerTwitterHandle).then(function(playerResults) {
        helper.debug("got player results");
        helper.debug("stats sent!");
        var statsToSend = { 
            "description": playerResults != null && "description" in playerResults ? playerResults.description : "",
            "label": playerResults != null && "label" in playerResults ? playerResults.label : ""
        };
        socket.emit('player_stats', statsToSend);

    }).catch(function(error) {
        helper.error("getAndEmitStats failed: ", error);
    });
}


module.exports = {
    getTeamStats: getTeamStats,
    getPlayerStats: getPlayerStats,
    getAndEmitStats: getAndEmitStats
};