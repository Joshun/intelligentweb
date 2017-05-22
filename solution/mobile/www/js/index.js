
var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);

    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.

    onDeviceReady: function() {
        db = new Database();
        // initDB();

        // BEGIN bind button actions
        $("#team-stats-btn").on("click", function() {
            showStatsContent("team");
        });

        $("#player-stats-btn").on("click", function() {
            showStatsContent("player");
        });

        $(".back-to-main-content").on("click", showMainContent);
        // END bind button actions

        // BEGIN bind form actions
        $("#query_form").submit(function() {
            showResultsContent();
            // Stop page refreshing
            return false;
        });
        // END bind form actions

        // BEGIN bind socket actions
        socket.on('reply_tweets', function(tweets) {
            // write results into table
            console.log(tweets);

            table = $('#form_table');
            for (var i = 0; i < tweets.statuses.length; i++) {
                table.append(resultToRow(tweets.statuses[i]));
            }

            // Handle pagination
            $("#form_table").DataTable({
                "bFilter": false, // disable quick search / filter
                "bLengthChange": false // disable length change
            });

            // Hide results loading header
            $("#results-loading-header").addClass("hidden");
            
            // Unhide results table
            $("#form_table").removeClass("hidden");

            // Unhide results bottom back button
            $("#results-bottom-back-btn").removeClass("hidden");

        });
        // END bind socket actions
    }
   
};

app.initialize();

// address of server (emulator host)
// as per https://developer.android.com/studio/run/emulator-networking.html
// var serverIP = "10.0.2.2";
var serverIP = "143.167.119.16";
var serverPort = 3000;
var serverAddress = "http://" + serverIP + ":" + serverPort;

console.log("serverAddress: ", serverAddress);
var socket = io(serverAddress);


function sendGetTweetsRequest() {
    var requestObj =  {
        team_query: $("#team_query").val(),
        player_query: $("#player_query").val(),
        database_only: false,
        or_operator: $("#or_operator").is(":checked")
    };
    console.log("sendGetTweetsRequest");
    console.log(" Sending requestObj: ", requestObj);
    socket.emit('query', requestObj);
}

function resultToRow(tweet) {
  var row;

  if (tweet.db_state) {
    row = "<tr class=\"storage\">";
  }
  else {
    row = "<tr class=\"twitter\">";
  }

  row +=  "<td ><a href=" + "https://twitter.com/" + tweet["user"].screen_name + ">@" + tweet["user"].screen_name + "</a></td>"
    	+   "<td>" + tweet["text"] + "</td>"
    	+   "<td>" + tweet["created_at"].substring(0,10) + "<br>" + tweet["created_at"].substring(11,19) + "</td>"
    	// +   "<td width=\"15%\">" + tweet["created_at"].substring(0,10) + "</td>"
    	// +   "<td width=\"10%\"> <a href=" + "https://twitter.com/statuses/" + tweet.id_str + ">link</a></td>"
    	+ "</tr>";
	return row;
}

function showStatsContent(statType) {
    console.log("showStatsContent: ", statType);

    if (statType != "team" && statType != "player") {
        console.log("invalid statType");
        return;
    }

    $("#main-content").addClass("hidden");
    $("#stats-content").removeClass("hidden");

    if (statType == "team") {
        $("#team-stats-header").removeClass("hidden");
        $("#player-stats-header").addClass("hidden");
    }
    else if (statType == "player") {
        $("#team-stats-header").addClass("hidden");
        $("#player-stats-header").removeClass("hidden");
    }
}

function showResultsContent() {
    // Need some check to see if we have results...

    // Remove any existing results
    // $("#form_table tbody tr").remove();
    $("#form_table tbody").remove();

    // Show results-content container
    $("#results-content").removeClass("hidden");

    // Hide main-content container
    $("#main-content").addClass("hidden");

    // Send request to server to get tweets
    sendGetTweetsRequest();
}

function showMainContent() {
    $("#main-content").removeClass("hidden");
    $("#stats-content").addClass("hidden");
    $("#results-content").addClass("hidden");

    // Unhide results loading header
    $("#results-loading-header").removeClass("hidden");

    // Hide results table (show only when loaded)
    $("#form_table").addClass("hidden");

    // Hide results bottom back button
    $("#results-bottom-back-btn").addClass("hidden");
}