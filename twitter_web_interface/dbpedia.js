
var dbp = require('dbpediaclient');

function search(term) {
    return new Promise(function(resolve, reject) {
        dbp.keywordSearch(keyword, "SportsLeague", function(result) {
            resolve(results);
        });
    });  
}

module.exports = {
    search: search
};