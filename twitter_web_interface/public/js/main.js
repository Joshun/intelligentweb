/**
 * main.js
 */

function resultToRow(tweet) {
	row = "<tr>"
		+ "<td>" + tweet["author"] + "</td>"
		+ "<td>" + tweet["text"] + "</td>"
		+ "<td>" + tweet["time"] + "</td>"
		+ "<td>" + tweet["date"] + "</td>"
		+ "<tr>";
	return row;
}

function initialise() {
  var socket = io(); // auto-detects port

  // emits query data from the input form to the server
  $('#query_form').submit(function() {
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
	for (var i=0; i<results["tweets"].length; i++) {
		console.log(results["tweets"][i]);
		console.log(resultToRow(results["tweets"][i]));
		table.append(resultToRow(results["tweets"][i]));
	}

  });
}
