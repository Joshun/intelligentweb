
var dbp = require('dbpediaclient');
var storage = require('./storage.js');
var helper = require('./helper.js');

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
                    resolve(firstOnly ? parsedResults[0] : parsedResults);
                }
                else {
                    resolve(null);
                }
            }
        });
    });  
}


function getTeamStats(teamTwitterHandle) {
    return new Promise(function(resolve, reject) {
        // If "@" not present, don't query anything
        if (! teamTwitterHandle.startsWith("@")) {
            resolve(null);
        }
        else {
            // If "@" present, trim it and carry on with query
            teamTwitterHandle = teamTwitterHandle.slice(1, teamTwitterHandle.length);
        }

       storage.getTeamFromScreenName(teamTwitterHandle).then(function(result) {
              teamTwitterHandle = teamTwitterHandle.trim();
               
           if (result == null) resolve(null);
           else {
               searchTeam(result).then(function(stats) {
                   resolve(stats);
               }).catch(function(error) {
                   helper.error('getTeamStats failed');
                   reject(error);
               });
           }
       }).catch(function(error) {
           helper.error("getTeamStats failed: ", error);
           reject("getTeamStats failed");
       });
    });
}

function getPlayerStats(playerTwitterHandle) {
    return new Promise(function(resolve, reject) {
        playerTwitterHandle = playerTwitterHandle.trim();
        // If "@" not present, don't query anything
        if (! playerTwitterHandle.startsWith("@")) {
            resolve(null);
        }
        else {
            // If "@" present, trim it and carry on with query
                playerTwitterHandle = playerTwitterHandle.slice(1, playerTwitterHandle.length);
        }
        storage.getPlayerFromScreenName(playerTwitterHandle).then(function(result) {
            searchPlayer(result).then(function(stats) {
                if (result == null) resolve(null);
                else {
                    searchPlayer(result).then(function(stats) {
                        resolve(stats);
                    }).catch(function(error) {
                        helper.error('getPlayerStats failed');
                        reject(error);
                    });
                }
            });
        }).catch(function(error) {
            helper.error("getPlayerStats failed: ", error);
            reject("getPlayerStats failed");
        });
    });
}


function getAndEmitStats(socket, playerTwitterHandle, teamTwitterHandle) {
    helper.debug('getAndEmitStats: ', playerTwitterHandle, ', ', teamTwitterHandle);
    getTeamStats(teamTwitterHandle).then(function(teamResults) {
        helper.debug("got team results");
        var statsToSend = {
            "description": teamResults != null && "description" in teamResults ? teamResults.description : ""
        };
        socket.emit('team_stats', statsToSend);

    }).catch(function(error) {
        helper.error("getAndEmitStats failed: ", error);
    });


    getPlayerStats(playerTwitterHandle).then(function(playerResults) {
        helper.debug("got player results");
        helper.debug("stats sent!");
        var statsToSend = { 
            "description": playerResults != null && "description" in playerResults ? playerResults.description : ""
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