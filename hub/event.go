package main

type EventData struct {
	Name       string  `json:"name,omitempty"`
	Room       string  `json:"room,omitempty"`
	RoomName   string  `json:"room_name,omitempty"` // deprecated, use Room instead
	PeerID     string  `json:"peerId,omitempty"`
	Peers      []*Conn `json:"peers"`
	PeerIDDest string  `json:"peerIdDest,omitempty"`
	PeerIDSrc  string  `json:"peerIdSrc,omitempty"`
}

type Event struct {
	Name string    `json:"eventName" validate:"nonzero"`
	Data EventData `json:"data"`
}
