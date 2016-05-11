package main

var (
	rooms = Rooms{rooms: map[string]*room{}}
)

type room struct {
	Name  string
	Conns map[string]*Conn
}

func (r *room) getConn(peerID string) *Conn {
	c, ok := r.Conns[peerID]
	if !ok {
		return nil
	}
	return c
}
func (r *room) broadcast(c *Conn, evt *Event, me bool) {
	for _, p := range r.Conns {
		if !me && p.SessID == c.SessID {
			continue
		}
		p.send(evt)
	}

}

func (r *room) getOther(c *Conn) []*Conn {
	others := []*Conn{}
	for _, p := range r.Conns {
		if p.SessID != c.SessID {
			others = append(others, p)
		}
	}
	return others
}

type Rooms struct {
	rooms map[string]*room
}

// add a connection to a room
func (r *Rooms) add(c *Conn, roomName string) *room {
	rm := r.getRoom(roomName)
	if rm == nil {
		rm = &room{
			Name:  roomName,
			Conns: map[string]*Conn{},
		}
		r.rooms[roomName] = rm
	}
	rm.Conns[c.SessID] = c
	return rm
}

func (r *Rooms) getRoom(roomName string) *room {
	rm, ok := r.rooms[roomName]
	if !ok {
		return nil
	}
	return rm
}

func joinRoom(c *Conn, evt Event, msg []byte) {
	c.Room = evt.Data.Room
	c.Name = evt.Data.Name

	room := rooms.add(c, evt.Data.Room)

	// broadcast join room event
	joinEvt := Event{
		Name: "peer_join_room",
		Data: EventData{
			PeerID: c.SessID,
			Name:   c.Name,
		},
	}
	room.broadcast(c, &joinEvt, false)

	// send join_room_ok event
	c.send(&Event{
		Name: "join_room_ok",
		Data: EventData{
			PeerID:   c.SessID,
			RoomName: c.Room,
		},
	})

	// get other peers
	c.send(&Event{
		Name: "get_peers",
		Data: EventData{
			Peers: room.getOther(c),
		},
	})
}
