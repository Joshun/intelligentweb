/**
 * main.js
 */

// passes results into table
function resultToRow(tweet) {
  var row;

  if (tweet.db_state) {
    row = "<tr class=\"storage\">";
  }
  else {
    row = "<tr class=\"twitter\">";
  }

  row +=  "<td width=\"10%\"><a href=" + "https://twitter.com/" + tweet["user"].screen_name + ">@" + tweet["user"].screen_name + "</a></td>"
    	+   "<td width=\"50%\">" + tweet["text"] + "</td>"
    	+   "<td width=\"15%\">" + tweet["created_at"].substring(11,19) + "</td>"
    	+   "<td width=\"15%\">" + tweet["created_at"].substring(0,10) + "</td>"
    	+   "<td width=\"10%\"> <a href=" + "https://twitter.com/statuses/" + tweet.id_str + ">link</a></td>"
    	+ "</tr>";
	return row;
}

var statsState = { 'team_stats': null, 'player_stats': null };

// function displayNoStats() {
// 	var statsContainer = $("#stats_container");
// 	statsContainer.empty();
// 	var noStatsText = $("<h1>");
// 	noStatsText.html("No stats found");
// 	statsContainer.append(noStatsText);
// }

// function makeDescription(container, stats) {
// 	if ("description" in stats) {
// 		console.log(stats.description);

// 		var generatedId = "gen-id-" + Math.round(Math.random()*1e9).toString();

// 		var descriptionBtn = $("<a>");
// 		descriptionBtn.attr("data-toggle", "collapse");
// 		descriptionBtn.prop("href", "#"+generatedId);
// 		descriptionBtn.addClass("btn");
// 		descriptionBtn.addClass("btn-default");
// 		descriptionBtn.html("show description");
// 		container.append(descriptionBtn);

// 		var descriptionPg = $("<p>");
// 		descriptionPg.attr("id", generatedId);
// 		descriptionPg.addClass("collapse");
// 		descriptionPg.html(
// 			(stats.description != null && stats.description.length > 0) ? stats.description : "not available"
// 			);
// 		container.append(descriptionPg);
// 	}
// }

// function updateStatsPanel() {
// 	var statsContainer = $("#stats_container");

// 	// Both player_stats and team_stats empty
// 	if (statsState.player_stats == null && statsState.team_stats == null) {
// 			displayNoStats();
// 	}
// 	else {
// 		// Clear the stats container
// 		statsContainer.empty();

// 		// player_stats available
// 		if (statsState.player_stats != null) {
// 			console.log("Displaying player stats...");
// 			var playerStatsHeading = $("<h1>");
// 			playerStatsHeading.html("Player");
// 			statsContainer.append(playerStatsHeading);
// 			makeDescription(statsContainer, statsState.player_stats);
// 		}
// 		// team_stats available
// 		if (statsState.team_stats != null) {
// 			console.log("Displaying team stats...");
// 			var teamStatsHeading = $("<h1>");
// 			teamStatsHeading.html("Team");
// 			statsContainer.append(teamStatsHeading);
// 			makeDescription(statsContainer, statsState.team_stats);
// 		}
// 	}
// }

function initialise() {
	// displayNoStats();

  var socket = io(); // auto-detects port

  var stream = [];

  $('#player_query').tokenfield({ delimiter: ", " });
  $('#team_query').tokenfield({ delimiter: ", " });

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

  // socket.on('reply_tweets', function(tweets) {
  //   // write results into table
  // 	console.log(tweets);

  // 	table = $('#form_table');
  // 	for (var i = 0; i < tweets.statuses.length; i++) {
  // 		table.append(resultToRow(tweets.statuses[i]));
  //   }
  // });

  socket.on('reply_stream', function(stream) {
    // write results into table
    table = $('#form_table');
    table.prepend(resultToRow(stream));

		//limits table size
    while($("#form_table tr").length > 300) {
      $("#form_table tr:last").remove();
    }
  });

  socket.on('player_stats', function(stats) {
    console.log('player stats received');
    console.log(stats);
    statsState.player_stats = stats;
    // updateStatsPanel();
  });


	socket.on('team_stats', function(stats) {
		console.log('team stats received');
		console.log(stats);
		statsState.team_stats = stats;
		// updateStatsPanel();
	});

  $('#player_modal').on('click', statsState, function(stats) {
    var data;

    if (stats.data.player_stats == null) {
      data.name = stats.data.player_stats.label;
      data.desc = stats.data.player_stats.description;
    }
    else {
      data.name = "No Player Found";
      data.desc = "No Description Found";
    }

    $('#head_div h4.modal-title').html(data.name);
    $('#body_div').html("<p>" + data.desc + "</p>");
  });

  $('#team_modal').on('click', statsState, function(stats) {
    // $('#head_div h4.modal-title').html(stats.data.team_stats.name);
    $('#head_div h4.modal-title').html(stats.data.tean_stats.description);
  });

}