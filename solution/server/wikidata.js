var wkdata  = require('wikidata-sdk');
var request = require('request-promise');

var storage = require('./storage.js');
var helper  = require('./helper.js');

function search_player(terms) {
  return new Promise(function(resolve, reject) {

  	var url = wkdata.sparqlQuery(
	  'SELECT DISTINCT ?human ?humanLabel ?team ?teamLabel ?image ?date \
	   WHERE { \
		   ?human wdt:P106 wd:Q937857; \
				  rdfs:label "' + "Wayne Rooney" + '"@en; \
				  wdt:P18 ?image; \
				  p:P54 ?list. \
		   ?list  ps:P54 ?team. \
		   OPTIONAL{?list pq:P582 ?date} \
		   FILTER(!BOUND(?date)) \
		   SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } \
	   } \
	   LIMIT 10'
  	);

  	request(url);

  	request.catch(function(error) {
  		helper.error("Invalid Response:", error);
  		reject(error);
  	});

  	request.then(function(reply) {
  		helper.info("Response from Wikidata:", reply);
  		resolve(reply);
  	});
  });
}