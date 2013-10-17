ConfKu : JavaScript WebRTC conference library

You can use this library to build peer to peer video conference using WebRTC technology.

BUILD JAVASCRIPT CLIENT
----------------------
* move to client dir
    cd client

* install npm (nodejs package manager):

-> install npm in ubuntu
    
    sudo apt-get install npm

-> install npm in mac with brew
    
    brew install npm

* install gruntjs:
    sudo npm install -g grunt-cli
    cd /path/to/plivowebsdk/
    npm install grunt grunt-contrib-concat grunt-contrib-jshint grunt-contrib-uglify

* build js client
    grunt

* build result can be found in dist directory
    confku.min.js   minified JS
    confku.dist.js unminified JS

* include confku.min.js/confku.dist.js in the conference room
    example : https://github.com/iwanbk/confku-sample/blob/master/static/confku.min.js


--------------------
RUN SIGNALING SERVER
--------------------
* move to hub (signaling server) directory 
    cd hub

* install requirement
    pip install -r requirements.txt
    (it will be better if you do it inside a virtualenv)

* run it
    python hub.py

It will listen on port 8001


------------
USAGE EXAMPLE
------------
* You need to implement two functions to make it works:
    /**
    * this function will be called by confku library when
    * stream from some peer become available.
    */
    confkuUI.addVideo = function (stream, peerId);

    /**
     * This function will be called by confku library when 
     * stream from some peer become unavailable.
     */
    confkuUI.removeVideo = function (peerId);
    
    You can find the example here:
    https://github.com/iwanbk/confku-sample/blob/master/static/public.confkuui.js

* include confku.min.js in your conference page

* full example can be found here : https://github.com/iwanbk/confku-sample


-------------
CONFKU EVENTS
-------------
ConfKu will fire some events regarding the conference.
You can add event handler for those events.

* EVENT LIST
-----------
    TODO

* EXAMPLE
----------
    Look at https://github.com/iwanbk/confku-sample/blob/master/static/public.confkuui.js
    There are two event handlers in that file:
        /**
         * handle for peer_join_room event.
         * This event will be fired when there is new peer joining the room
         */
        confku.ee.on('peer_join_room', function (data);

        /**
         * handle for peer_leave_room event.
         * This event will be fired when there is a peer leaving the room.
         */
        confku.ee.on('peer_leave_room', function (data);


----
TODO
----
* Chat using datachannel (soon)
* Screen sharing
* mute mic
* mute video

-------
LICENSE
------
BSD License
