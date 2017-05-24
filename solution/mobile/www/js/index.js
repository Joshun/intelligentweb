
var db;

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
        // Create Database object (db.js) to query and store user searches and tweets
        db = new Database();

        $(".back-to-main-content").on("click", showMainContent);
        // END bind button actions

        // BEGIN bind form actions

        // When query form submitted, show query and show the results
        $("#query_form").submit(function() {
            showResultsContent();
            // Stop page refreshing
            return false;
        });
        // END bind form actions

        // BEGIN bind socket actions
        socket.on('reply_tweets', function(tweets) {
            console.log(" 3. request received  (length=", tweets.statuses.length, ") getting local tweets...");
            var searchParams = {
                teamQuery: $("#team_query").val(),
                playerQuery: $("#player_query").val(),
                isOrOperator: $("#or_operator").is(":checked")
            };

            db.getResult(searchParams).then(function(storedTweets) {
                console.log(" 4. stored tweets retrieved, combining and displaying...");
                console.log("   lengths: storedTweets=", storedTweets.length, " receivedTweets=", tweets.statuses.length);

                if (tweets.statuses === undefined || tweets.statuses == null) {
                    tweets = { statuses: [] };
                }

                // Combine server tweets with mobile local database tweets
                var combinedTweets = tweets.statuses.concat(storedTweets);

                var tableContainer = $("#form_table_container");
                tableContainer.empty();

                // Create results table
                var table = $("<table>");
                table.addClass("table table-striped");
                tableContainer.append(table);

                // Create table header
                // Storage type | Author | Text | Date
                var thead = $("<thead>");
                thead.html("<tr><th width=\"5%\"></th><th width=\"10%\">Author</th><th width=\"50%\">Text</th><th width=\"15%\">Date</th></tr>");
                table.append(thead);

                // Append each of the tweet rows to the results table
                for (var i = 0; i < combinedTweets.length; i++) {
                    table.append(resultToRow(combinedTweets[i]));
                }

                // Instruct DataTable library to set up pagination for the results table
                table.DataTable({
                    "aaSorting": [], // disable sort on load
                    "bFilter": false, // disable quick search / filter
                    "bLengthChange": false, // disable length change
                    "pageLength": 5 // display 5 results per page
                });

                console.log("Results loaded.");

                // Hide results loading header
                $("#results-loading-header").addClass("hidden");
                
                // // Unhide results table container
                $("#form_table_container").removeClass("hidden");

                // Unhide results bottom back button
                $("#results-bottom-back-btn").removeClass("hidden");

                // Store search and corresponding tweets to mobile local database
                console.log("Storing tweets...");
                db.storeResult(searchParams, tweets.statuses).then(function(result) {
                    console.log("Tweets stored.");
                }).catch(function(error) {
                    console.error("error storing tweets: ", error);
                });
                
            }).catch(function(error) {
                console.error("error checking latest timestamp: ", error);
            });

        });
        // END bind socket actions
    }
   
};

app.initialize();

// address of server (emulator host)
// as per https://developer.android.com/studio/run/emulator-networking.html
var serverIP = "10.0.2.2";

// port configured in server/server.js
var serverPort = 3000;

// address of socket
var serverAddress = "http://" + serverIP + ":" + serverPort;

console.log("serverAddress: ", serverAddress);
var socket = io(serverAddress);


function sendGetTweetsRequest() {

    console.log("sendGetTweetsRequest");

    console.log(" 1. finding out the most recent timestamp we have...");

    var dbReq =  {
        teamQuery: $("#team_query").val(),
        playerQuery: $("#player_query").val(),
        isOrOperator: $("#or_operator").is(":checked"),
    };
    
    db.getResult(dbReq).then(function(storedTweets) {
        console.log(storedTweets);
        // Try to get the id of the most recent stored tweet of the search
        // If the search has not been performed or no corresponding tweets are stored, set to 0
        var latestId = (storedTweets.length == 0) ? 0 : storedTweets[0].id_str;
        console.log("  latestId=", latestId);

    // Construct object which will be emitted to make request
    var requestObj =  {
        team_query: $("#team_query").val(),
        player_query: $("#player_query").val(),
        or_operator: $("#or_operator").is(":checked"),
        mobile_timestamp: latestId
    };

        console.log(" 2. sending request: ", requestObj);
        socket.emit('query', requestObj);

    }).catch(function(error) {
        console.error("sendGetTweetsRequest: error occurred: ", error);
    }); 
}

function resultToRow(tweet) {

  var row = "<tr>";

  // If the tweet is from the mobile's local db storage, apply relevant styling (green) to db column
  if (tweet.db_state_mobile) {
    row += "<td class=\"mobile\"></td>";
  }

  // Else if tweet from server db cache, apply relevant styling (orange) to db column
  else if (tweet.db_state) {
    row += "<td class=\"storage\"></td>";
  }

  // Else the tweet is "fresh" (has come straight from twitter) so apply relevant styling (blue)
  else {
    row += "<td class=\"twitter\"></td>";
  }

  // Generate the row cells: screen name, tweet text and datetime
  row +=  "<td ><a href=" + "https://twitter.com/" + tweet["user"].screen_name + ">@" + tweet["user"].screen_name + "</a></td>"
    	+  "<td>" + tweet["text"] + "</td>"
        + "<td>" + moment(tweet["created_at"]).format("HH:mm DD.MM.YY") + "</td>"
    	+ "</tr>";
	return row;
}

// Shows the results pane, making a request to the server and displaying the results
function showResultsContent() {
    console.log("---showResultsContent---");
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

// Shows the start page, hiding the results pane if it is open
function showMainContent() {
    console.log("---showMainContent---");
    // Show main content container
    $("#main-content").removeClass("hidden");

    // Hide results content container
    $("#results-content").addClass("hidden");

    // Unhide results loading header
    $("#results-loading-header").removeClass("hidden");

    // Hide results table container (show only when loaded)
    $("#form_table_container").addClass("hidden");

    // Hide results bottom back button
    $("#results-bottom-back-btn").addClass("hidden");
}