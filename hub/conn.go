package main

import (
	"encoding/json"

	log "github.com/Sirupsen/logrus"
	"github.com/gorilla/websocket"
	"github.com/satori/go.uuid"
)

type Conn struct {
	ws      *websocket.Conn `json:"-"`
	SessID  string          `json:"peerId"`
	Name    string          `json:"-"`
	Room    string          `json:"-"` // room name
	outChan chan []byte     `json:"-"` // channel for data to be written
}

func newConn(ws *websocket.Conn) *Conn {
	return &Conn{
		ws:      ws,
		SessID:  uuid.NewV4().String(),
		outChan: make(chan []byte, 2),
	}
}

func (c *Conn) String() string {
	return c.SessID
}

func (c *Conn) mainLoop() {
	defer c.cleanup()

	go c.sendLoop()
	//go c.readPubsubLoop()
	c.ReadLoop()
}

// cleanup:
// - leave from room
// - send leave_room event
func (c *Conn) cleanup() {
	room := rooms.getRoom(c.Room)
	if room == nil {
		return
	}
	room.remove(c)
	evt := Event{
		Name: "peer_leave_room",
		Data: EventData{
			PeerID: c.SessID,
			Name:   c.Name,
		},
	}
	room.broadcast(c, &evt, true)
}

func (c *Conn) send(evt *Event) error {
	b, err := json.Marshal(evt)
	if err != nil {
		return err
	}
	c.sendRaw(b)
	return nil
}

func (c *Conn) sendRaw(b []byte) {
	c.outChan <- b
}

func (c *Conn) sendLoop() {
	for b := range c.outChan {
		log.Debugf("sending =%v", string(b))
		c.ws.WriteMessage(websocket.TextMessage, b)
	}
}

var handlers = map[string]func(*Conn, Event, []byte){
	"join_room":     joinRoom,
	"offer":         handleOffer,
	"answer":        handleAnswer,
	"ice_candidate": handleIceCandidate,
}

func (c *Conn) ReadLoop() {
	for {
		// read message
		_, msg, err := c.ws.ReadMessage()
		if err != nil {
			log.Errorf("ReadLoop():read error. peer = %v, err = %v", c.String(), err)
			break
		}
		log.Infof("[ReadLoop] msg = %v", string(msg))

		// unmarshal
		var evt Event
		if err := json.Unmarshal(msg, &evt); err != nil {
			log.Errorf("ReadLoop():failed to unmarshal perr = %v, message=%v, err=%v", c.String(), string(msg), err)
			continue
		}

		// handle
		fn, ok := handlers[evt.Name]
		if !ok {
			log.Errorf("invalid event:%v, peer = %v", evt.Name, c.String())
			break
		}
		fn(c, evt, msg)

	}
	log.Info("exiting ReadLoop")
}
