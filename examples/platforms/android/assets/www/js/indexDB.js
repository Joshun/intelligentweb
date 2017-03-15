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
var app = {
    // Application Constructor
    initialize: function () {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function () {
        this.receivedEvent('deviceready');
    },

    // Update DOM on a Received Event
    receivedEvent: function (id) {
        myDB = window.sqlitePlugin.openDatabase({name: "mySQLite.db", location: 'default'});
        myDB.transaction(function (transaction) {
            transaction.executeSql('CREATE TABLE IF NOT EXISTS phonegap_pro (id INTEGER PRIMARY KEY, title TEXT, desc TEXT)', [],
                function (tx, result) {
                    alert("Table created successfully");
                },
                function (error) {
                    alert("Error occurred while creating the table.");
                });
        });
        document.getElementById("insert").addEventListener("click", insertData);
        document.getElementById("show").addEventListener("click", showDB);

    }
};


var myDB;

function insertData() {
    var form= document.getElementById('myform');
    var title= document.getElementById('title').value;
    var desc = document.getElementById('desc').value;
    myDB.transaction(function (transaction) {
        var executeQuery = "INSERT INTO phonegap_pro (title, desc) VALUES (?,?)";
        transaction.executeSql(executeQuery, [title, desc]
            , function (tx, result) {
                alert('Inserted');
            },
            function (error) {
                alert('Error occurred');
            });
    });

}


function showDB() {
    myDB.transaction(function (transaction) {
        transaction.executeSql('SELECT * FROM phonegap_pro', [], function (tx, results) {
            var len = results.rows.length, i;
            // access with results.rows.item(i).<field>

        }, null);
    });
}


app.initialize();