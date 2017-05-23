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
    	+   "<td width=\"15%\">" + tweet["created_at"].substring(11, 19) + "</td>"
    	+   "<td width=\"15%\">" + tweet["created_at"].substring( 0, 10) + "</td>"
    	+   "<td width=\"10%\"> <a href=" + "https://twitter.com/statuses/" + tweet.id_str + ">link</a></td>"
    	+ "</tr>";
	return row;
}

// function to sort an array of objects with date attributes
function sortByDate(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        if (x < y) return -1;
        if (x > y) return  1;
    });
}

var stats_state = { 'player_stats': null, 'team_stats': null };

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

  var ctx = document.getElementById('myChart').getContext('2d');

  var options = {
      scales: {
          yAxes: [{
              display: true,
              ticks: {
                  beginAtZero: true // minimum value will be 0 as can never be below
              },
              gridLines: {}
          }]
      }
  };

  var myChart = new Chart(ctx, {
      type: 'line',
      data: {
          // initial placeholder labels
          labels: ['F', 'O', 'O', 'T', 'B', 'A', 'LL'],
          datasets: [{
              label: 'Number of tweets',
              data: [],
              backgroundColor: "rgba(0, 102, 255, 0.5)",
              borderJoinStyle: 'miter',
          }]
      },
      options: options
  });

  $('#player_query').tokenfield({ delimiter: "," });
  $('#team_query').tokenfield({ delimiter: "," });

  // emits query data from the input form to the server
  $('#query_form').submit(function() {

		$("#form_table tbody tr").remove();
    socket.emit('close', "Form Data!");

  	socket.emit('query', {
  		player_query:     $('#player_query').val(), // input for player name (string)
  		team_query:       $('#team_query').val(), // input for team name (string)
      or_operator:      $('#or_operator').is(':checked'), // checkbox for searching player OR team
      mobile_timestamp: null // mobile timestamp, set to null for server requests
  	});

  	return false; // stops page from refreshing
  });

  socket.on('reply_tweets', function(tweets) {
    // write results into table
    console.log(tweets);

    table = $('#form_table');
    for (var i = 0; i < tweets.statuses.length && i < 300; i++) {
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


  socket.on('reply_freqs', function(freqs) {
    data = new Array();
    sortByDate(freqs, 'date');
    freqs.forEach(function(length){
      data = freqs.map(function(x) {return x.frequency;});
    });

    // add sorted frequency results to chart and update
    myChart.data.datasets[0].data = data;
    myChart.data.labels = freqs.map(function(x) {return x.date; });
    myChart.update();

});

  socket.on('player_stats', function(stats) {
    console.log("Player Stats Received:", stats);
    // player_stats = stats;

    // if (stats.data.name == "") {
    //   $('#player_modal').prop("disabled", true);
    // }
    // else {
    //   $('#player_modal').prop("disabled", false);
    // }
  });


	socket.on('team_stats', function(stats) {
    console.log("Team Stats Received:", stats);
		// team_stats = stats;
	});

  $('#player_modal').on('click', stats_state, function(stats) {
    var data_name = "No Player Found";
    var data_desc = "No Description Found";

    if (!stats.data.player_stats.name == "") {
      data_name = stats.data.player_stats.name;
      data_desc = stats.data.player_stats.team;
    }

    $('#head_div h4.modal-title').html(data_name);
    $('#body_div').html("<p>" + data_desc + "</p>");
  });

  $('#team_modal').on('click', stats_state, function(stats) {
    // $('#head_div h4.modal-title').html(stats.data.team_stats.name);
    $('#head_div h4.modal-title').html(stats.description);
  });

  socket.on('player_wk', function(stats) {
    console.log("Player Stats Received:", stats);

    if (stats == null) {
      $('#player_modal').prop("disabled", true);
      $('#player_modal').html("UNKNOWN");
    }
    else {
      $('#player_modal').prop("disabled", false);
      $('#player_modal').html(stats.name);
    }

    stats_state.player_stats = stats;
  });
}