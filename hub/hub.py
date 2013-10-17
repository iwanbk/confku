import json
import logging
import random

import gevent
from gevent.pywsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler

logging.basicConfig(level=logging.DEBUG)

LISTEN_HOST = "0.0.0.0"
HTTP_PORT = 8000
WS_PORT = 8001


class Rooms(object):
    '''Chat rooms'''
    def __init__(self):
        self.rooms = {}

    def add(self, ws, room_name):
        """add ws session id to the room."""
        logging.debug("add ws :" + ws.sessid + " to room : " + room_name)
        self.rooms.setdefault(room_name, []).append(ws)

    def remove_client(self, ws):
        """remove a client from room."""
        logging.debug("remove ws=" + ws.sessid + " from room " + ws.room_name)
        if ws.room_name in self.rooms:
            room = self.rooms[ws.room_name]
            if ws in room:
                room.remove(ws)
                logging.debug("ws " + ws.sessid + " removed from room " + ws.room_name)

    def broadcast_room_not_me(self, room_name, ws, msg):
        """broadcast message to all client in room, except me"""
        logging.debug("broadcast_not_me.room=" + room_name + ".msg=" + msg)
        other = self._get_other_ws(room_name, ws)
        for w in other:
            w.send(msg)

    def send_to_ws(self, room_name, sessid, msg):
        """Send message to a ws with id=sessid"""
        ws = self.get_ws(room_name, sessid)
        if ws is not None:
            ws.send(msg)

    def get_ws(self, room_name, sessid):
        """get ws with sessid"""
        all_ws = self.rooms[room_name]
        for w in all_ws:
            if w.sessid == sessid:
                return w
        return None

    def _get_other_ws(self, room_name, ws):
        """get session id of the other ws in the same room."""
        all_ws = self.rooms[room_name]
        other = []
        for w in all_ws:
            if w.sessid != ws.sessid:
                other.append(w)
        return other

    def get_other_peers(self, room_name, ws):
        """get session id of the other ws in the same room."""
        all_ws = self.rooms[room_name]
        other = []
        for w in all_ws:
            if w.sessid != ws.sessid:
                peer = {
                    'peerId': w.sessid,
                    'name': w.name
                }
                other.append(peer)
        return other

rooms = Rooms()


class WebSocketApp(object):
    """Stream sine values"""
    def __call__(self, environ, start_response):
        ws = environ['wsgi.websocket']
        while True:
            msg = ws.receive()
            if not self.process_msg(ws, msg):
                return
            gevent.sleep(0)

    def process_msg(self, ws, msg_str):
        """Process message and dispatch it to respective handler"""
        if msg_str is None:
            self.on_close(ws)
            return False
        msg = json.loads(msg_str)
        eventName = msg['eventName']
        if eventName == 'join_room':
            self.on_join_room(ws, msg)
        elif eventName == 'offer':
            self.on_offer(ws, msg, msg_str)
        elif eventName == 'answer':
            self.on_answer(ws, msg, msg_str)
        elif eventName == 'ice_candidate':
            self.on_ice_candidate(ws, msg, msg_str)
        else:
            logging.error("unknown msg_str = " + msg_str)
        return True


    def on_close(self, ws):
        """a method that will be called when this websocket is closed"""
        logging.info("close the session for ws = " + ws.sessid)
        msg = json.dumps({
            'eventName': 'peer_leave_room',
            'data': {
                'peerId': ws.sessid,
                'name': ws.name,
            }
        })
        rooms.broadcast_room_not_me(ws.room_name, ws, msg)
        #remove from room
        rooms.remove_client(ws)

    def on_ice_candidate(self, ws, msg, msg_str):
        """Send ice_candidate message handler"""
        #logging.debug("on send ice candidate " + msg)
        data = msg['data']
        rooms.send_to_ws(ws.room_name, data['peerIdDest'], msg_str)

    def on_answer(self, ws, msg, msg_str):
        """answer message handler"""
        logging.debug("on answer from " + ws.sessid)
        data = msg['data']
        rooms.send_to_ws(ws.room_name, data['peerIdDest'], msg_str)

    def on_offer(self, ws, msg, msg_str):
        """on offer message"""
        logging.debug("on send offer from " + ws.sessid)
        data = msg['data']
        rooms.send_to_ws(ws.room_name, data['peerIdDest'], msg_str)

    def on_join_room(self, ws, msg):
        data = msg['data']
        room_name = data['room']
        name = data['name']
        ws.room_name = room_name
        ws.sessid = str(random.random())[2:]
        ws.name = name
        logging.debug("on_join_room.sessid = " + ws.sessid + ".roomname=" + ws.room_name)
        rooms.add(ws, room_name)

        #emit to room: new peer join a room
        new_peer_msg = json.dumps({
            'eventName': 'peer_join_room',
            'data': {
                'peerId': ws.sessid,
                'name': name,
            }
        })
        rooms.broadcast_room_not_me(room_name, ws, new_peer_msg)

        #join_room_ok : join room succeed
        ws.send(json.dumps({
                'eventName': 'join_room_ok',
                'data': {
                    'peerId': ws.sessid,
                    'room_name': room_name,
                }
            }))
        #emit : get peers
        other_peers = rooms.get_other_peers(room_name, ws)
        logging.debug('other_peers = ' + json.dumps(other_peers))
        ws.send(json.dumps({
            'eventName': 'get_peers',
            'data': {
                'peers': other_peers,
            }
        }))


def main():
    # setup server to handle websocket requests
    ws_server = WSGIServer(
        (LISTEN_HOST, WS_PORT), WebSocketApp(),
        handler_class=WebSocketHandler
    )

    gevent.joinall([
        #gevent.spawn(http_server.serve_forever),
        gevent.spawn(ws_server.serve_forever)
    ])

if __name__ == "__main__":
    main()
