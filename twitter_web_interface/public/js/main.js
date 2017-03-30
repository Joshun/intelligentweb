/**
 * main.js
 */

function resultToRow(tweet) {
	row = "<tr>"
    	+   "<td>" + tweet["user"].screen_name + "</td>"
    	+   "<td> <a href=" + "https://twitter.com/" + tweet["user"].screen_name + "> Author Link </a>  </td>"
    	+   "<td>" + tweet["text"] + "</td>"
    	+   "<td>" + tweet["created_at"].substring(11,19) + "</td>"
    	+   "<td>" + tweet["created_at"].substring(0,10) + "</td>"
    	+   "<td> <a href=" + "https://twitter.com/statuses/" + tweet.id_str + "> Tweet Link </a>  </td>"
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
  		handles_player: $('#handles_player').is(':checked'), // checkbox for player handles (boolean)
  		hashtag_player: $('#hashtag_player').is(':checked'), // checkbox for player hashtag (boolean)
  		keyword_player: $('#keyword_player').is(':checked'), // checkbox for player keyword (boolean)
  		team_query:     $('#team_query').val(), // input for team name (string)
  		handles_team:   $('#handles_team').is(':checked'), // checkbox for team handles (boolean)
  		hashtag_team:   $('#hashtag_team').is(':checked'), // checkbox for team hashtag (boolean)
  		keyword_team:   $('#keyword_team').is(':checked')  // checkbox for team keyword (boolean)
  	});
  	return false; // stops page from refreshing
  });

  socket.on('reply_tweets', function(tweets) {
    // write results into table
  	console.log(tweets);

  	table = $('#form_table');
  	for (var i = 0; i < tweets.statuses.length; i++) {
  		//console.log(resultToRow(results.statuses[i]));
  		table.append(resultToRow(tweets.statuses[i]));
    }
  });

  socket.on('reply_stream', function(stream) {
    // write results into table
    console.log(stream);

    table = $('#form_table');
    table.prepend(resultToRow(stream));
  });
}
