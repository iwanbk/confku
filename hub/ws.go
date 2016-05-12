package main

import (
	"net/http"

	log "github.com/Sirupsen/logrus"
	"github.com/gorilla/websocket"
	"golang.org/x/net/context"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: wsCheckOrigin,
}

func wsCheckOrigin(r *http.Request) bool {
	return true
}

func wsHandler(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	log.Infof("[index]new conn=%v", r.RequestURI)

	// upgrade websocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Errorf("failed to upgrade HTTP connection to Websocket:%v", err)
		w.WriteHeader(500)
		return
	}

	conn := newConn(ws)
	conn.mainLoop()
}
