ConfKu : JavaScript WebRTC conference example

You can use this example to build peer to peer video conference using WebRTC technology.

This example has 3 components:

- signaling server using Go, can be found in `hub` directory. 
- javascript client in `client` directory
- web app to serve HTML (with css and javascript) in [confku-sample](https://github.com/iwanbk/confku-sample) repo.

Signaling is separated from web app to show that it is a distinct component, can be written in any language.



----------------------
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
    
    npm install grunt grunt-contrib-concat grunt-contrib-jshint grunt-contrib-uglify


* build js client
    
    grunt


* build result can be found in dist directory

    - confku.min.js :   minified JS
    
    - confku.dist.js :  unminified JS


* include confku.min.js/confku.dist.js in the conference room
    
    example : https://github.com/iwanbk/confku-sample/blob/master/static/confku.min.js


--------------------
RUN SIGNALING SERVER
--------------------
* move to hub (signaling server) directory 
    
    cd hub

* install requirement
    
    go get -v


* run it
    
    go run *.go


It will listen on port 8001


------------
USAGE EXAMPLE
------------
* Implement addVideo and removeVideo functions.

    You need to implement two functions to make it works:
        
        /**
         * This function will be called by confku library when
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

* list of events

    TODO

* example usage

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


-------
CREDITS
------

Initial client code of this library come from webrtc.io project 
https://github.com/webRTC/webRTC.io
