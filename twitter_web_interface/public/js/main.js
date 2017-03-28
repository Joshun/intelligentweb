/**
 * main.js
 */

function resultToRow(tweet) {
	row = "<tr>"
	+ "<td>" + tweet["user"].screen_name + "</td>"
	+ "<td>" + "https://twitter.com/intent/user?user_id=" + tweet["user"].id + "</td>"
	+ "<td>" + tweet["text"] + "</td>"
	+ "<td>" + tweet["created_at"].substring(11,19) + "</td>"
	+ "<td>" + tweet["created_at"].substring(0,10) + "</td>"
	+ "<td>" + "https://twitter.com/statuses/" + tweet.id + "</td>"
	+ "<tr>";
	return row;
}

function initialise() {
  var socket = io(); // auto-detects port

  // emits query data from the input form to the server
  $('#query_form').submit(function() {
		$("#resultsTable td").remove();
  	socket.emit('query', {
  		player_query: $('#player_query').val(), // input for player name (string)
  		handles_player: $('#handles_player').is(':checked'), // checkbox for player handles (boolean)
  		hashtag_player: $('#hashtag_player').is(':checked'), // checkbox for player hashtag (boolean)
  		keyword_player: $('#keyword_player').is(':checked'), // checkbox for player keyword (boolean)
  		team_query: $('#team_query').val(), // input for team name (string)
  		handles_team: $('#handles_team').is(':checked'), // checkbox for team handles (boolean)
  		hashtag_team: $('#hashtag_team').is(':checked'), // checkbox for team hashtag (boolean)
  		keyword_team: $('#keyword_team').is(':checked')  // checkbox for team keyword (boolean)
  	});
  	return false; // stops page from refreshing
  });

  socket.on('results', function(results) {
  	// write results into table
	console.log(results);

	table = $('#resultsTable');
	for (var i=0; i<results.statuses.length; i++) {
		//console.log(resultToRow(results.statuses[i]));
		table.append(resultToRow(results.statuses[i]));
	}

  });
}
