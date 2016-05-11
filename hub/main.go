package main

import (
	"fmt"
	"net/http"

	log "github.com/Sirupsen/logrus"
	"goji.io"
	"goji.io/pat"
	"golang.org/x/net/context"
)

var (
	listenAddr = ":8001"
)

func hello(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	name := pat.Param(ctx, "name")
	fmt.Fprintf(w, "Hello, %s!", name)
}

func main() {
	mux := goji.NewMux()
	mux.UseC(requestLogger)
	mux.HandleFuncC(pat.Get("/hello/:name"), hello)
	mux.HandleFuncC(pat.Get("/"), wsHandler)

	log.Infof("starting server at %v", listenAddr)
	http.ListenAndServe(listenAddr, mux)
}

func requestLogger(h goji.Handler) goji.Handler {
	mw := func(ctx context.Context, w http.ResponseWriter, r *http.Request) {
		h.ServeHTTPC(ctx, w, r)
		log.Infof("%v %v", r.Method, r.URL.Path)
	}
	return goji.HandlerFunc(mw)
}
