
var dbp = require('dbpediaclient');
var storage = require('./storage.js');
var helper = require('./helper.js');

// Searches player stats given player term
function searchPlayer(term) {
    return search(term, 'soccer player');
}

// Searches a team stats given team term
function searchTeam(term) {
    return search(term, 'soccer club');
}

// Searches stats for term term given term and ontology class
function search(term, ontologyClass) {
    helper.debug('term: ', term, ' class: ', ontologyClass);
    return new Promise(function(resolve, reject) {
        dbp.keywordSearch(term.player_query, ontologyClass, function(results) {
            if (results == null) {
                reject("error searching");
            }
            else if (results.length > 0) {
                resolve(results[0]);
            }
            else {
                resolve(null);
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
       storage.getTeamFromScreenName(playerTwitterHandle).then(function(result) {
           return searchPlayer(result);
       }).catch(function(error) {
           helper.error("getPlayerStats failed: ", error);
           reject("getPlayerStats failed");
       });
    });
}


module.exports = {
    getTeamStats: getTeamStats,
    getPlayerStats: getPlayerStats
};