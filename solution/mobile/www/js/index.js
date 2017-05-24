
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
        db = new Database();

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
            console.log(" 3. request received  (length=", tweets.statuses.length, ") getting local tweets...");
            var searchParams = {
                teamQuery: $("#team_query").val(),
                playerQuery: $("#player_query").val(),
                isOrOperator: $("#or_operator").is(":checked")
            };

            console.log("  searchParams:", searchParams);

            db.getResult(searchParams).then(function(storedTweets) {
                console.log(" 4. stored tweets retrieved, combining and displaying...");
                console.log("   lengths: storedTweets=", storedTweets.length, " receivedTweets=", tweets.statuses.length);

                // concat stored tweets with received tweets
                // tweets.statuses = tweets.statuses.concat(tweets.statuses);

                if (tweets.statuses === undefined || tweets.statuses == null) {
                    tweets = { statuses: [] };
                }

                // var combinedTweets = storedTweets.concat(tweets.statuses);
                var combinedTweets = tweets.statuses.concat(storedTweets);

                // write results into table

                // var table = $('#form_table').DataTable();

                var tableContainer = $("#form_table_container");
                tableContainer.empty();

                var table = $("<table>");
                table.addClass("table table-striped");
                tableContainer.append(table);

                var thead = $("<thead>");
                thead.html("<tr><th width=\"5%\"></th><th width=\"10%\">Author</th><th width=\"50%\">Text</th><th width=\"15%\">Date</th></tr>");
                table.append(thead);

                for (var i = 0; i < combinedTweets.length; i++) {

                    table.append(resultToRow(combinedTweets[i]));
                }
                table.DataTable({
                    "aaSorting": [], // disable sort on load
                    "bFilter": false, // disable quick search / filter
                    "bLengthChange": false, // disable length change
                    "pageLength": 5 // display 5 results per page
                });

                console.log("DONE");

                // Hide results loading header
                $("#results-loading-header").addClass("hidden");
                
                // // Unhide results table container
                $("#form_table_container").removeClass("hidden");

                // Unhide results bottom back button
                $("#results-bottom-back-btn").removeClass("hidden");

                // var table = $("#form_table").DataTable();
                // table.draw();

                console.log("Storing tweets...");
                db.storeResult(searchParams, tweets.statuses).then(function(result) {
                    console.log("DONE");
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
// var serverIP = "143.167.119.16";
var serverPort = 3000;
var serverAddress = "http://" + serverIP + ":" + serverPort;

console.log("serverAddress: ", serverAddress);
var socket = io(serverAddress);


function sendGetTweetsRequest() {
    // var requestObj =  {
    //     team_query: $("#team_query").val(),
    //     player_query: $("#player_query").val(),
    //     database_only: false,
    //     or_operator: $("#or_operator").is(":checked"),
    // };
    // console.log("sendGetTweetsRequest");
    // console.log(" Sending requestObj: ", requestObj);
    // socket.emit('query', requestObj);
    console.log("sendGetTweetsRequest");

    // console.log(" 1. getting previous search tweets...");

    // db.getResult(requestObj).then(function(prevTweets) {
    //      console.log(" 2. finding out the most recent timestamp we have...");
    //     db.getLastTimestamp().then(function(lastTimestamp) {
    //         console.log("  lastTimestamp=", lastTimestamp);
    //         console.log(" 3. sending request: ", requestObj);
    //         socket.emit('query', requestObj);

    //     }).catch(function(error) {
    //         console.error("sendGetTweetsRequest: error occurred: ", error);
    //     });
    // });

    console.log(" 1. finding out the most recent timestamp we have...");
    db.getLatestTweetId().then(function(latestId) {
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
//   var row;

//   if (tweet.db_state) {
//     row = "<tr class=\"storage\">";
//   }
//   else {
//     row = "<tr class=\"twitter\">";
//   }

  var row = "<tr>";

  if (tweet.db_state_mobile) {
    row += "<td class=\"mobile\"></td>";
  }

  else if (tweet.db_state) {
      console.log("db state!!!");
    row += "<td class=\"storage\"></td>";
  }

  else {
    row += "<td class=\"twitter\"></td>";
  }

  row +=  "<td ><a href=" + "https://twitter.com/" + tweet["user"].screen_name + ">@" + tweet["user"].screen_name + "</a></td>"
    	+   "<td>" + tweet["text"] + "</td>"
    	// +   "<td>" + tweet["created_at"].substring(0,10) + "<br>" + tweet["created_at"].substring(11,19) + "</td>"
        + "<td>" + moment(tweet["created_at"]).format("HH:mm DD.MM.YY") + "</td>"
    	// +   "<td width=\"15%\">" + tweet["created_at"].substring(0,10) + "</td>"
    	// +   "<td width=\"10%\"> <a href=" + "https://twitter.com/statuses/" + tweet.id_str + ">link</a></td>"
    	+ "</tr>";
	return row;
}

function resultToRowList(tweet) {
    return [
        tweet["user"].screen_name,
        tweet["text"],
        tweet["created_at"].substring(0,10)
    ];
}

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

function showMainContent() {
    console.log("---showMainContent---");
    $("#main-content").removeClass("hidden");
    $("#stats-content").addClass("hidden");
    $("#results-content").addClass("hidden");

    // Unhide results loading header
    $("#results-loading-header").removeClass("hidden");

    // Hide results table container (show only when loaded)
    $("#form_table_container").addClass("hidden");

    // Hide results bottom back button
    $("#results-bottom-back-btn").addClass("hidden");
}