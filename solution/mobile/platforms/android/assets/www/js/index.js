/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

function test() {
        alert("test");
}

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
        $("#team-stats-btn").on("click", function() {
            showStatsContent("team");
        });

        $("#player-stats-btn").on("click", function() {
            showStatsContent("player");
        });

        // $("#submit-btn").on("click", showResultsContent);

        $(".back-to-main-content").on("click", showMainContent);

        $("#query_form").submit(function() {
            showResultsContent();
            // Stop page refreshing
            return false;
        });
    }
   
};

app.initialize();


function showStatsContent(statType) {
    console.log("showStatsContent: ", statType);

    // document.getElementById("main-content").hidden = "true";
    // document.getElementById("stats-content").hidden = "false";

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
    $("#results-content").removeClass("hidden");
    $("#main-content").addClass("hidden");
}

function showMainContent() {
    $("#main-content").removeClass("hidden");
    $("#stats-content").addClass("hidden");
    $("#results-content").addClass("hidden");
}