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
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        document.getElementById("cameraTakePicture").addEventListener
           ("click", cameraTakePicture);
        document.getElementById("cameraGetPicture").addEventListener("click", cameraGetPicture);

    }
};

function cameraTakePicture() {
   navigator.camera.getPicture(onSuccess, onFail, {
       quality: 100,
               encodingType: navigator.camera.EncodingType.JPEG,
               destinationType: navigator.camera.DestinationType.FILE_URI,
               correctOrientation: true,
               saveToPhotoAlbum: true


   });
    
}

function cameraGetPicture() {
    navigator.camera.getPicture(onSuccess, onFail, {
        quality: 100,
        destinationType: navigator.camera.DestinationType.FILE_URI,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        correctOrientation: true,
    });
}
   function onSuccess(imageURL) {
       console.log(imageURL);
      var image = document.getElementById('myImage');
      image.src = imageURL;
   }

   function onFail(message) {
       console.log(message);
      alert('Failed because: ' + message);
   }


app.initialize();