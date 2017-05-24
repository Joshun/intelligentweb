var wkdata  = require('wikidata-sdk');
var request = require('request-promise');

var client  = require('./client.js');
var storage = require('./storage.js');
var helper  = require('./helper.js');

/**
 * This method creates a query for Wikidata, in which the full name of the
 * player is supplied, and a dataset of results is returned. Note that a lack
 * of results will not throw an error; instead resolving a null object.
 *
 * @param   terms   the full name of the player, as supplied by the database
 * @returns         a promise to return the results of the Wikidata search, or an error rejection
 */
function search_player_by_keyword(terms) {
  var data;

  return new Promise(function(resolve, reject) {

  	// P106  = 'occupation'           , Q937857 = 'association football player'
    // P569  = 'date of birth'
  	// P18   = 'image'
    // P413  = 'specialty/position'
  	// P54   = 'member of sports team',
  	// P31   = 'instance of'          , Q476028 = 'association football club'
  	// P582  = 'end time'

    /**
     * This query assumes an "active" football player to be one who currently
     * serves for an 'Association Football Club' (i.e. Chelsea F.C.) by
     * evaluting whether the entry has no end date specified, or that the end
     * date is greater than the current date.
     */
  	var url = wkdata.sparqlQuery(
    'SELECT DISTINCT ?human ?team ?image ?age ?pos ?humanLabel ?teamLabel ?posLabel \
     WHERE { \
       ?human wdt:P106 wd:Q937857; \
              rdfs:label "' + terms + '"@en; \
              wdt:P569   ?age; \
              p:P413     ?spec; \
              p:P54      ?list. \
       ?list  ps:P54     ?team. \
       ?team  wdt:P31    wd:Q476028. \
       ?spec  ps:P413    ?pos. \
       OPTIONAL{?human wdt:P18 ?image} \
       OPTIONAL{?list pq:P582 ?date} \
       FILTER(?date > NOW() || !BOUND(?date)) \
       SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } \
     } \
     LIMIT 50'
    );

    // sends request to Wikidata
    data = request(url);

  	data.catch(function(error) {
  		reject(error);
  	});

  	data.then(function(reply) {
      helper.debug("Wikidata Results:\n", reply);
  		resolve(JSON.parse(reply).results.bindings);
  	});
  });
}

/**
 * This method creates a query for Wikidata, in which the Twitter handle of the
 * player is supplied, and a dataset of results is returned. Note that a lack
 * of results will not throw an error; instead resolving a null object.
 *
 * @param   terms   the Twitter handle the player, as supplied by the user
 * @returns         a promise to return the results of the Wikidata search, or an error rejection
 */
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
      // P569  = 'date of birth'
      // P18   = 'image'
      // P413  = 'specialty/position'
      // P54   = 'member of sports team',
      // P31   = 'instance of'          , Q476028 = 'association football club'
      // P582  = 'end time'
      
      /**
       * This query assumes an "active" football player to be one who currently
       * serves for an 'Association Football Club' (i.e. Chelsea F.C.) by
       * evaluting whether the entry has no end date specified, or that the end
       * date is greater than the current date.
       */
      var url = wkdata.sparqlQuery(
      'SELECT DISTINCT ?human ?team ?image ?age ?pos ?humanLabel ?teamLabel ?posLabel \
       WHERE { \
         ?human wdt:P106   wd:Q937857; \
                wdt:P2002 "' + reply.data.screen_name + '"; \
                wdt:P569   ?age; \
                p:P413     ?spec; \
                p:P54      ?list. \
         ?list  ps:P54     ?team. \
         ?team  wdt:P31    wd:Q476028. \
         ?spec  ps:P413    ?pos. \
         OPTIONAL{?human wdt:P18 ?image} \
         OPTIONAL{?list pq:P582 ?date} \
         FILTER(?date > NOW() || !BOUND(?date)) \
         SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } \
       } \
       LIMIT 50'
       );

      // sends request to Wikidata
      data = request(url);

      data.catch(function(error) {
        reject(error);
      });

      data.then(function(reply) {
        helper.debug("Wikidata Results:\n", reply);
        resolve(JSON.parse(reply).results.bindings);
      });
    });
  });
}

/**
 * Determines whether to query Wikidata using Twitter handles or keywords.
 *
 * This function takes the first available query which satisfies the property
 * of being a Twitter handle; which is considered to be any search term that
 * begins with an "@". If no search terms contain this within the player query,
 * then the first keyword is used to search, based on existing records.
 *
 * @param   terms   the search terms to be used, as supplied by the user
 * @returns         a promise to return the results of the Wikidata search, or an error rejection
 */
function tokenise_player(query) {
  return new Promise(function(resolve, reject) {
    if (query.length <= 0) {
      reject(null);
    }

    // filters query terms by twitter handles
    var terms = query.filter(function(term) {
      return term[0] == "@";
    });

    // uses first available handle, if any are found
    if (terms.length > 0) {
      helper.info("Handler Detected!", terms[0]);
      
      search_player_by_handles(terms[0]) // invokes Wikidata search function

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
          var positions = [];

          // concatenates all position results into a single list
          for (var i = 0; i < reply.length; i++) {
            if (positions.indexOf(reply[i].posLabel.value) === -1)
              positions.push(reply[i].posLabel.value);
          }

          // creates object to emit to client
          var stats = {
            name:     reply[0].humanLabel.value,
            team:     reply[0].teamLabel.value,
            age:      reply[0].age.value,
            position: positions,
            image:    reply[0].image ? reply[0].image.value : null // supply null if no image is found
          };

          resolve(stats);
        }
      });
    }
    // uses first available term, if any are found
    else {
      helper.info("Keyword Detected!", query[0]);

      storage.getPlayerFromScreenName(query[0])

      .catch(function(error) {
        helper.error("Storage Retrieval Failed:", error);
        reject(error);
      })

      .then(function(reply) {
        helper.info("Player Token(s):", reply);
        return search_player_by_keyword(reply); // invokes Wikidata search function
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
          var positions = [];

          // concatenates all position results into a single list
          for (var i = 0; i < reply.length; i++) {
            if (positions.indexOf(reply[i].posLabel.value) === -1)
              positions.push(reply[i].posLabel.value);
          }

          // creates object to emit to client
          var stats = {
            name:     reply[0].humanLabel.value,
            team:     reply[0].teamLabel.value,
            age:      reply[0].age.value,
            position: positions,
            image:    reply[0].image ? reply[0].image.value : null // supply null if no image is found
          };
          
          resolve(stats);
        }
      });
    }
  });
}

/**
 * Handles Wikidata results to client.
 *
 * @param    socket              the web socket to emit results
 * @param    query               the search terms to be sent
 */
function emit_stats(socket, query) {
  helper.info(query);
  var tweet_p = query.player_query.split(", ");

  tokenise_player(tweet_p)

  .catch(function(error) {
    helper.error("Wikidata Search Failed:", error);
    socket.emit('player_wk', error);
  })

  .then(function(reply) {
    helper.info("Wikidata Search Complete:", reply);
    socket.emit('player_wk', reply);
  });
}

module.exports = {
  emit_stats   : emit_stats
};
