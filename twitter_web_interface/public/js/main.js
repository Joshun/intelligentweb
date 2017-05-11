/**
 * main.js
 */

// passes results into table
function resultToRow(tweet) {
	row = "<tr>"
    	+   "<td width=\"10%\"><a href=" + "https://twitter.com/" + tweet["user"].screen_name + ">@" + tweet["user"].screen_name + "</a></td>"
    	+   "<td width=\"50%\">" + tweet["text"] + "</td>"
    	+   "<td width=\"15%\">" + tweet["created_at"].substring(11,19) + "</td>"
    	+   "<td width=\"15%\">" + tweet["created_at"].substring(0,10) + "</td>"
    	+   "<td width=\"10%\"> <a href=" + "https://twitter.com/statuses/" + tweet.id_str + ">link</a></td>"
    	+ "</tr>";
	return row;
}

function initialise() {
  var socket = io(); // auto-detects port

  // emits query data from the input form to the server
  $('#query_form').submit(function() {
		$("#form_table tbody tr").remove();
    socket.emit('close', "Form Data!");

  	socket.emit('query', {
  		player_query:   $('#player_query').val(), // input for player name (string)
  		// handles_player: $('#handles_player').is(':checked'), // checkbox for player handles (boolean)
  		// hashtag_player: $('#hashtag_player').is(':checked'), // checkbox for player hashtag (boolean)
  		// keyword_player: $('#keyword_player').is(':checked'), // checkbox for player keyword (boolean)

  		team_query:     $('#team_query').val(), // input for team name (string)
  		// handles_team:   $('#handles_team').is(':checked'), // checkbox for team handles (boolean)
  		// hashtag_team:   $('#hashtag_team').is(':checked'), // checkbox for team hashtag (boolean)
  		// keyword_team:   $('#keyword_team').is(':checked'), // checkbox for team keyword (boolean)

      database_only:  $('#database_only').is(':checked'),
      or_operator:    $('#or_operator').is(':checked') // checkbox for searching player OR team

  	});
  	return false; // stops page from refreshing
  });

  socket.on('reply_tweets', function(tweets) {
    // write results into table
  	console.log(tweets);

  	table = $('#form_table');
  	for (var i = 0; i < tweets.statuses.length; i++) {
  		table.append(resultToRow(tweets.statuses[i]));
    }
  });

  socket.on('reply_stream', function(stream) {
    // write results into table
    table = $('#form_table');
    table.prepend(resultToRow(stream));

		//limits table size
    while($("#form_table tr").length > 300) {
      $("#form_table tr:last").remove();
    }
  });
}
