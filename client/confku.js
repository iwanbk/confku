var CONFKU_DEFAULT_WSHOST = "localhost";
var CONFKU_DEFAULT_WSPORT = "8001";
var CONFKU_DEFAULT_ROOM = "";

var confku = {
	'localVideo': null, /* local video element */
	'iceServers': "stun:stun.l.google.com:19302",
	'ee': new EventEmitter(),
	'conns': {}, /* dict of connections to peer */
	'myPeerId': null,
	'myStream': null, /* local stream */
	'hubHost': null, /* hub host */
	'hubPort': null, /* hub port */
	'room': null, /* room name */
	'name': null, /* name of the peer */
	'isWsConnOpened': false, /* is ws conn to hub opened */
	'isGetusermedia': false, /* get user media */
	'isGetPeers': false /* get list of peers in same room */
};

var sdpConstraints = {'mandatory': {
	'OfferToReceiveAudio': true,
	'OfferToReceiveVideo': true }};


confku.NewConn = function (peerId, name)
{
	console.log('New Peer = ' + name);
	var conn = {
		'pc': null,
		'peerId': peerId,
		'name': name,
		'stream': null
	};
	return conn;
};

function checkCompatibility() {
	if (RTCPeerConnection) {
		return true;
	}
	return false;
}

confku.init = function (hubHost, hubPort, room, name) {
	if (!checkCompatibility()) {
		console.info("browser is not supported");
		return false;
	}
	confku.room = room || CONFKU_DEFAULT_ROOM;
	confku.hubHost = hubHost || CONFKU_DEFAULT_WSHOST;
	confku.hubPort = hubPort || CONFKU_DEFAULT_WSPORT;
	confku.name = name || "";

	console.info("initializing confku.hub host =" + confku.hubHost + ".hub port = " + confku.hubPort + ".room = " + room);
	//webrtc init
	this.localVideo = document.getElementById('localVideo');
	
	this.getUserMedia();

	//connect to server
	this.wsConnect();
	return true;
};

/**
 * get number of peers in same room
 */
confku.numPeers = function () {
	return Object.keys(confku.conns).length;
};

/* connect to signaling server */
confku.wsConnect = function ()
{
	var root = this;
	var server = 'ws://' + confku.hubHost + ':' + confku.hubPort;

	console.log('connect to ws=' + server);
	
	this.socket = new WebSocket(server);
	
	this.socket.onopen = function() {
		console.log('connection to server opened');
		confku.ee.trigger('wsconnopened');
	};
	this.socket.onclose = function () {
		console.log('connection to server closed');
	};
	this.socket.onerror = function (err) {
		console.log('ws connection to server error:' + err);
	};

	this.socket.onmessage = function (msg) {
		var json_msg = JSON.parse(msg.data);
		//console.log('json_msg.eventName = ' + json_msg.eventName);
		root.ee.trigger(json_msg.eventName, [json_msg.data]);
	};
};

/** get user media **/
confku.getUserMedia = function () {
	var root = this;
	var onUserMediaFailed = function (err) {
		console.error('onUserMediaFailed = ' + err);
	};
	var onUserMediaSuccess = function (stream) {
		console.log('onUserMediaSuccess');
		confku.myStream = stream;
		attachMediaStream(root.localVideo, stream);
		root.ee.trigger('getusermedia_success');
	};
	getUserMedia({'video': true, 'audio': true}, onUserMediaSuccess, onUserMediaFailed);
};


/**
 * create Peer Connection for a peer
 */
confku.createPC = function (peerId) {
	console.log('create Peer Connection for id = ' + peerId);
	var constraints = {};
	constraints.optional = [];
	constraints.optional.push({'DtlsSrtpKeyAgreement': 'true'});

	var params = {iceServers:[{url:this.iceServers}]};
	var pc = this.conns[peerId].pc = new RTCPeerConnection(params, constraints);
	var root = this;
	pc.onopen = function () {
		console.log('pc onopen');
	};
	pc.onicecandidate = function (event) {
		if (event.candidate) {
			var data = {
				'eventName': 'ice_candidate',
				'data': {
					'label': event.candidate.sdpMLineIndex,
					'candidate': event.candidate.candidate,
					'peerIdDest': peerId,
					'peerIdSrc': confku.myPeerId
				}
			};
			root.socket.send(JSON.stringify(data));
		} else {
			console.log('end of candidate');
		}
	};
	pc.onaddstream = function (event) {
		console.log('pc on add stream');
		root.ee.trigger('add_remote_stream', [event.stream, peerId]);
	};
	return pc;
};


/**
 * send offer to a peer
 */
confku.sendOffer = function (peerId) {
	console.log('sendOffer()');
	var pc = this.conns[peerId].pc;
	var _onSuccess = function (sessionDescription) {
		var _onSetSuccess = function ()  {
			console.log('set local session description OK');
		};
		var _onSetFailed = function (err) {
			console.log('set local sess description failed :' + err.toString());
		};
		pc.setLocalDescription(sessionDescription, _onSetSuccess, _onSetFailed);
		var data = {
			'eventName': 'offer',
			'data': {
				'peerIdDest': peerId,
				'peerIdSrc': confku.myPeerId,
				'sdp': sessionDescription
			}
		};
		confku.socket.send(JSON.stringify(data));
	};
	var _onFailed = function (err) {
		console.log('onCreateSessionDesc error:' + err);
	};
	pc.createOffer(_onSuccess, _onFailed, sdpConstraints);
};


confku.recvChanOnMessage = function (event) {
	console.log('recvChanOnMessage data = ' + event.data);
};

confku.recvChanOnStateChange = function (event) {
	var readyState = confku.recvChan.readyState;
	console.log('Receive channel state is: ' + readyState);
};

confku.recvChanCb = function(event) {
	console.log('pc on data channel');
	confku.recvChan = event.channel;
	confku.recvChan.onmessage = confku.recvChanOnMessage;
	confku.recvChan.onclose = confku.recvChanOnStateChange;
	confku.recvChan.onopen = confku.recvChanOnStateChange;
};

/**
 * create data channel
 */
confku.createDC = function (peerId) {
	var dataConstraint = {reliable: true};
	var pc = confku.conns[peerId].pc;
	console.log('create Data channel to '  + peerId);
	var dc = confku.conns[peerId].dc = pc.createDataChannel('dataChannel', dataConstraint);
	pc.ondatachannel = confku.recvChanCb;
	dc.onopen = function () {
		console.log('DC Open brow');
	};
};

/**
 * Establish connection to all other peers in same room.
 * Before establishing connections, it must got 2 events:
 * - getusermedia_success : got user media
 * - get_peers : got list of pepers in same room.
 */
confku.setupConns = function () {
	console.log('setup Conns');
	for (var peerId  in this.conns) {
		var pc = this.createPC(peerId);
		pc.addStream(confku.myStream);
		//this.createDC(peerId);
		this.sendOffer(peerId);
	}
};


/**
 * Send answer
 */
confku.sendAnswer = function (peerId) {
	console.log('sendAnswer()');
	var pc = this.conns[peerId].pc;
	var _onSuccess = function (sessionDescription) {
		pc.setLocalDescription(sessionDescription);
		var data = {
			'eventName': 'answer',
			'data': {
				'peerIdDest': peerId,
				'peerIdSrc': confku.myPeerId,
				'sdp': sessionDescription
			}
		};
		confku.socket.send(JSON.stringify(data));
		console.log('sending answer...');
	};
	var _onFailed = function (err) {
		console.error('sendAnswer(). Create answer failed:' + err.toString());
	};
	pc.createAnswer(_onSuccess, _onFailed, sdpConstraints);
};

/**
 * Join room.
 */
confku.joinRoom = function () {
	var data = JSON.stringify({
		'eventName': 'join_room',
		'data': {
			'name': confku.name,
			'room': confku.room
		}
	});
	confku.socket.send(data);
};
/**
 * Event handler for wsconnopened event.
 * This event happened when WS connection to signaling server 
 * established successfully
 */
confku.ee.on('wsconnopened', function (data) {
	console.log('on wsconnopened');
	confku.isWsConnOpened = true;
	if (confku.isGetusermedia) {
		confku.joinRoom();
	}
});
/**
 * Event handler for 'getusermedia_success' event.
 * This event will be fired when it successfully got user media.
 */
confku.ee.on('getusermedia_success', function(){
	console.log('on getusermedia_success');
	confku.isGetusermedia = true;
	if (confku.isWsConnOpened) {
		confku.joinRoom();
	}
	if (confku.isGetPeers) {
		confku.setupConns();
	}
});

/**
 * Join room OK
 */
confku.ee.on('join_room_ok', function (data) {
	console.log('join room ' + data.room_name + ' OK. peerId = ' + data.peerId);
	confku.myPeerId = data.peerId;
});

/**
 * event handler for 'get_peers' event.
 * This event will be fired when it receive list of all peers in the same room
 */
confku.ee.on('get_peers', function (data) {
	console.log('on get peers');
	confku.isGetPeers = true;
	for (var i = 0; i < data.peers.length; i++) {
		var peerId = data.peers[i].peerId;
		var name = data.peers[i].name;
		confku.conns[peerId] = confku.NewConn(peerId, name);
	}
	if (confku.isGetusermedia) {
		confku.setupConns();
	}
});

/**
 * new peer joining room
 */
confku.ee.on('peer_join_room', function (data) {
	console.log('on peer_join_room:' + data.peerId);
	confku.conns[data.peerId] = confku.NewConn(data.peerId, data.name);
	var pc = confku.createPC(data.peerId);
	pc.addStream(confku.myStream);
});

/**
 * peer leave the room
 */
confku.ee.on('peer_leave_room', function (data) {
	console.log('on peer_leave_room:' + data.peerId);
	//delete(confku.peerConnections[data.peerId]);
	delete(confku.conns[data.peerId]);
	//FIXME.TODO.delete connections
	confkuUI.removeVideo(data.peerId);
});

/**
 * Got answer from peer
 */
confku.ee.on('answer', function(data) {
	console.log('on answer');
	var pc = confku.conns[data.peerIdSrc].pc;
	var _onSuccess = function () {
		console.log("Set session description success");
	};
	var _onFailed = function (err) {
		console.warn("Failed to set session description : " + err.toString());
	};
	pc.setRemoteDescription(new RTCSessionDescription(data.sdp),
		_onSuccess, _onFailed);
});

/**
 * receive an offer
 */
confku.ee.on('offer', function(data) {
	console.log('on offer');
	var pc = confku.conns[data.peerIdSrc].pc;
	var _onSuccess = function () {
		console.log('Receive offer. Set remote description OK');
		confku.sendAnswer(data.peerIdSrc);
	};
	var _onFailed = function (err) {
		console.error('Receive offer. set remote description failed:' + err.toString());
	};
	pc.setRemoteDescription(new RTCSessionDescription(data.sdp), _onSuccess, _onFailed);
});

/**
 * Receive ice candidate
 */
confku.ee.on('ice_candidate', function(data) {
	console.log('on ice_candidate');
	var candidate = new RTCIceCandidate({
		'candidate': data.candidate,
		'sdpMLineIndex': data.label
	});
	confku.conns[data.peerIdSrc].pc.addIceCandidate(candidate);
});

/**
 * Happened when peerconnection get onaddstream event
 */
confku.ee.on('add_remote_stream', function (stream, peerId) {
	console.log("on add_remote_stream");
	var vidElem = confkuUI.addVideo(stream, peerId);
	attachMediaStream(vidElem, stream);
});
