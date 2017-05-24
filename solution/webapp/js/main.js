/**
 * main.js
 */

var stats_state = { 'player_stats': null };
var stats_keys = [38, 38, 40, 40, 37,
                  39, 37, 39, 66, 65];

/**
 * Converts date/time field to a readable date string
 *
 * @param    datestring    a date string from the database
 * @returns          a datestring in readable format
 */
function dateStringToDate(datestring) {
    var date = new Date(datestring);
    // return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
    return date.toDateString();
}

/**
 * Converts date/time field to a readable time string
 *
 * @param    datestring    a date string from the database
 * @returns          a timestring in readable format
 */
function dateStringToTime(datestring) {
    var date = new Date(datestring);
    // return (date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds());
    return date.toTimeString().substring(0, 8);
}

/**
 * Appends tweet information to rows of a table
 *
 * @param    tweet    a tweet access from twitter
 * @returns          row of a table with information from the tweets
 */
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
      +   "<td width=\"15%\">" + dateStringToTime(tweet["created_at"]) + "</td>"
    	+   "<td width=\"15%\">" + dateStringToDate(tweet["created_at"]) + "</td>"
    	+   "<td width=\"10%\"> <a href=" + "https://twitter.com/statuses/" + tweet.id_str + ">link</a></td>"
    	+ "</tr>";
	return row;
}

/**
 * Appends tweet information to rows of a table
 *
 * @param    array    an array of frequencies with relevant dates
 * @param    key    the key value of the object to sort by
 * @returns          an array sorted by date
 */
function sortByDate(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        if (x < y) return -1;
        if (x > y) return  1;
    });
}

/**
 * Runs on page load creating elements and holds relevant functionality
 */
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

  // instantiates new chart which is later updated with frequency data
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

  // Changes to player form tab if on author form
  $("#form_tab").click(function() {
      console.log('Changed to Player Form')

      $('#author_form_tab').removeClass("Active");
      $("#form_tab").addClass("Active");

      $('#author_form_container').fadeOut();
      $('#form_container').fadeIn();

    });

  // Changes to author form tab if on player form
  $("#author_form_tab").click(function() {
    console.log('Changed to Author Form')

    $('#form_tab').removeClass("Active");
    $("#author_form_tab").addClass("Active");

    $('#form_container').fadeOut();
    $('#author_form_container').fadeIn();
  });

  $('#player_query').tokenfield({ delimiter: "," });
  $('#team_query').tokenfield({ delimiter: "," });
  $('#author_query').tokenfield({ delimiter: "," });

  // emits query data from the input form to the server
  $('#query_form').submit(function() {

    stats_state.player_stats = null;
    stats_state.team_state = null;

    $('#player_modal').prop("disabled", true);
    $('#player_modal').html("UNKNOWN");
    $("#player_image").css("background-image", "");

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

  // emits query data from author form to the server
  $('#author_query_form').submit(function() {
    $("#form_table tbody tr").remove();

    socket.emit('close', 'Form Data!');

    socket.emit('author_query', {
      author_query:     $('#author_query').val() // input for author handle
    });

    return false;
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

// when tweets by author are recieved, they are appended to the table
socket.on('author_tweets', function(timeline) {
  $('#player_modal').prop("disabled", true);
    console.log(timeline);

    table = $('#form_table');
    for (var i = 0; i < timeline.data.length; i++) {
      table.append(resultToRow(timeline.data[i]));
    }

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
      data_name     = stats.data.player_stats.name;
      data_desc     = stats.data.player_stats.team;
      data_position = stats.data.player_stats.position;
      data_age      = stats.data.player_stats.age;
    }

    var age = new Date().getFullYear() - new Date(data_age).getFullYear();

    $('#head_div h4.modal-title').html(data_name);
    $('#team_row').html(data_desc);
    $('#position_row').html(data_position.toString().replace(",", ", ").replace(/\w\S*/g, function(str){ return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase(); })); // adds spaces after commas, and capitalises every word
    $('#age_row').html(new Date().getTime() - new Date(data_age).setFullYear(new Date().getFullYear()) < 0 ? age - 1 : age); // if current date is before birthday, reduce calculated age by one
    $('#dob_row').html(new Date(data_age).toLocaleDateString());
  });

  socket.on('player_wk', function(stats) {
    console.log("Player Stats Received:", stats);

    $('#player_modal').prop("disabled", false);
    $('#player_modal').html(stats.name);
    $("#player_image").css("background-image", "url(" + stats.image + ")");

    stats_state.player_stats = stats;
  });
}
