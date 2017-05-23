var wkdata  = require('wikidata-sdk');
var request = require('request-promise');

var client  = require('./client.js');
var storage = require('./storage.js');
var helper  = require('./helper.js');

/**
 * This method creates a query for Wikidata, in which the full
 * name of the player is supplied, and a dataset of results
 * is returned. Note that a lack of results will not throw an
 * error; instead resolving a null object.
 *
 * @param   terms   the full name of the player, as defined.
 */
function search_player_by_keyword(terms) {
  var data;

  return new Promise(function(resolve, reject) {

  	// P106  = 'occupation'           , Q937857 = 'association football player'
  	// P18   = 'image'
  	// P54   = 'member of sports team',
  	// P31   = 'instance of'          , Q476028 = 'association football club'
  	// P582  = 'end time'
  	
  	var url = wkdata.sparqlQuery(
	  'SELECT DISTINCT ?human ?humanLabel ?team ?teamLabel ?image ?date \
	   WHERE { \
		   ?human wdt:P106 wd:Q937857; \
				      rdfs:label "' + terms + '"@en; \
				      wdt:P18 ?image; \
				      p:P54 ?list. \
		   ?list  ps:P54 ?team. \
		   ?team  wdt:P31 wd:Q476028. \
		   OPTIONAL{?list pq:P582 ?date} \
		   FILTER(?date > NOW() || !BOUND(?date)) \
		   SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } \
	   } \
	   LIMIT 1'
  	);

    data = request(url);

  	data.catch(function(error) {
  		reject(error);
  	});

  	data.then(function(reply) {
      helper.debug("Wikidata Results:\n", reply);
  		resolve(JSON.parse(reply).results.bindings[0]);
  	});
  });
}

function search_player_by_handles(terms) {
  var data;

  return new Promise(function(resolve, reject) {

    // retrieves case-accurate screen name from twitter
    client.get_users(terms.substring(1))

    .catch(function(error) {
      reject(error);
    })

    .then(function(reply) {

      helper.info("Success:", reply.data.screen_name);
    
      // P106  = 'occupation'           , Q937857 = 'association football player'
      // P2002 = 'twitter handle'
      // P18   = 'image'
      // P54   = 'member of sports team',
      // P31   = 'instance of'          , Q476028 = 'association football club'
      // P582  = 'end time'
      
      var url = wkdata.sparqlQuery(
      'SELECT DISTINCT ?human ?humanLabel ?team ?teamLabel ?image ?date \
       WHERE { \
         ?human wdt:P106 wd:Q937857; \
                wdt:P2002 "' + reply.data.screen_name + '"; \
                wdt:P18 ?image; \
                p:P54 ?list. \
         ?list  ps:P54 ?team. \
         ?team  wdt:P31 wd:Q476028. \
         OPTIONAL{?list pq:P582 ?date} \
         FILTER(?date > NOW() || !BOUND(?date)) \
         SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } \
       } \
       LIMIT 1'
       );

      data = request(url);

      data.catch(function(error) {
        reject(error);
      });

      data.then(function(reply) {
        helper.debug("Wikidata Results:\n", reply);
        resolve(JSON.parse(reply).results.bindings[0]);
      });
    });
  });
}

function tokenise_player(query) {
  return new Promise(function(resolve, reject) {
    if (query.length <= 0) {
      reject(null);
    }

    if (query[0][0] == "@") {
      helper.info("Handler Detected!", query[0]);
      
      search_player_by_handles(query[0])

      .catch(function(error) {
        helper.error("Search Retrieval Failed:", error);
        reject(error);
      })

      .then(function(reply) {
        if (reply == null) {
          helper.debug("Null Reply:", reply);
          reject(null);
        }
        else {
          var stats = {
            name: reply.humanLabel.value,
            team: reply.teamLabel.value
          };
          resolve(stats);
        }
      });
    }
    else {
      helper.info("Keyword Detected!", query[0]);

      storage.getPlayerFromScreenName(query[0])

      .catch(function(error) {
        helper.error("Storage Retrieval Failed:", error);
        reject(error);
      })

      .then(function(reply) {
        helper.info("Player Token(s):", reply);
        return search_player_by_keyword(reply);
      })

      .catch(function(error) {
        helper.error("Search Retrieval Failed:", error);
        reject(error);
      })

      .then(function(reply) {
        if (reply == null) {
          helper.debug("Null Reply:", reply);
          reject(null);
        }
        else {
          var stats = {
            name: reply.humanLabel.value,
            team: reply.teamLabel.value
          };
          resolve(stats);
        }
      });
    }
  });

  // var wk;

  // wk = search_player(terms);
  
  // wk.catch(function(error) {

  // });

  // wk.then(function(reply) {

  // });
}

function emit_stats(socket, query) {
  var tweet_p = query.player_query.split(", ");
  var tweet_t = query.team_query.split(", ");

  tokenise_player(tweet_p)

  .catch(function(error) {
    helper.error("Wikidata Search Failed:", error);
  })

  .then(function(reply) {
    helper.info("Wikidata Search Complete:", reply);
    socket.emit('player_wk', reply);
  });
}

module.exports = {
  emit_stats   : emit_stats
};