
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
       storage.getTeamFromScreenName(teamTwitterHandle).then(function(result) {
           helper.debug('getTeamStats (1): ', result);
           if (result == null) resolve(null);
           else {
               searchTeam(result).then(function(stats) {
                   helper.debug('getTeamStats (2): ', stats);
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
        helper.debug("playerTwitterhANDLE:", playerTwitterHandle);
       storage.getPlayerFromScreenName(playerTwitterHandle).then(function(result) {
           searchPlayer(result).then(function(stats) {
                helper.debug('getPlayerStats (1): ', result);

                if (result == null) resolve(null);
                else {
                    searchPlayer(result).then(function(stats) {
                        helper.debug('getPlayerStats (2): ', stats);
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
        socket.emit('team_stats', teamResults);

    }).catch(function(error) {
        helper.error("getAndEmitStats failed: ", error);
    });


    getPlayerStats(playerTwitterHandle).then(function(playerResults) {
        helper.debug("got player results");
        helper.debug("stats sent!");
        socket.emit('player_stats', playerResults);

    }).catch(function(error) {
        helper.error("getAndEmitStats failed: ", error);
    });
}


module.exports = {
    getTeamStats: getTeamStats,
    getPlayerStats: getPlayerStats,
    getAndEmitStats: getAndEmitStats
};