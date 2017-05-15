
var dbp = require('dbpediaclient');
var helper = require('./helper.js');

function searchPlayer(term) {
    return search(term, 'soccer player');
}

function searchTeam(term) {
    return search(term, 'soccer club');
}

function search(term, ontologyClass) {
    helper.debug('term: ', term, ' class: ', ontologyClass);
    return new Promise(function(resolve, reject) {
        dbp.keywordSearch(term.player_query, ontologyClass, function(results) {
            resolve(results);
        });
    });  
}


module.exports = {
    searchTeam: searchTeam,
    searchPlayer: searchPlayer
};