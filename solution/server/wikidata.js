var wkdata  = require('wikidata-sdk');
var request = require('request-promise');

var storage = require('./storage.js');
var helper  = require('./helper.js');

function search_player(terms) {
  return new Promise(function(resolve, reject) {

  	// P106 = 'occupation'           , Q937857 = 'association football player'
  	// P18  = 'image'
  	// P54  = 'member of sports team',
  	// P31  = 'instance of'          , Q476028 = 'association football club'
  	// P582 = 'end time'
  	
  	var url = wkdata.sparqlQuery(
	  'SELECT DISTINCT ?human ?humanLabel ?team ?teamLabel ?image ?date \
	   WHERE { \
		   ?human wdt:P106 wd:Q937857; \
				  rdfs:label "' + "Wayne Rooney" + '"@en; \
				  wdt:P18 ?image; \
				  p:P54 ?list. \
		   ?list  ps:P54 ?team. \
		   ?team  wdt:P31 wd:Q476028. \
		   OPTIONAL{?list pq:P582 ?date} \
		   FILTER(!BOUND(?date)) \
		   SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } \
	   } \
	   LIMIT 10'
  	);

  	var data = request(url);

  	data.catch(function(error) {
  		reject(error);
  	});

  	data.then(function(reply) {
  		resolve(reply);
  	});
  });
}

module.exports = {
	search_player: search_player
}