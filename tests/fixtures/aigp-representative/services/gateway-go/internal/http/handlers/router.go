package handlers

import "net/http"

func Register(mux *http.ServeMux, handler http.Handler) {
	mux.Handle("POST /v1/chat/completions", handler)
	mux.Handle("GET /healthz", handler)
}
