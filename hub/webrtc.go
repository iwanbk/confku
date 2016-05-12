package main

import (
	log "github.com/Sirupsen/logrus"
)

func forwardToPeerIdDest(c *Conn, evt Event, msg []byte, funcName string) {
	room := rooms.getRoom(c.Room)
	if room == nil {
		log.Errorf("%v() invalid room :%v", funcName, c.Room)
		return
	}

	peer := room.getConn(evt.Data.PeerIDDest)
	if peer == nil {
		log.Errorf("%v() invalid peer ID dest :%v, room:%v", funcName, evt.Data.PeerIDDest, c.Room)
		return
	}
	peer.sendRaw(msg)
}

func handleOffer(c *Conn, evt Event, msg []byte) {
	forwardToPeerIdDest(c, evt, msg, "handleOffer")
}
func handleAnswer(c *Conn, evt Event, msg []byte) {
	forwardToPeerIdDest(c, evt, msg, "handleAnswer")
}

func handleIceCandidate(c *Conn, evt Event, msg []byte) {
	forwardToPeerIdDest(c, evt, msg, "handleIceCandidate")
}
