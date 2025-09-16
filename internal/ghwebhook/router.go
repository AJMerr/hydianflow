package ghwebhook

import (
	"net/http"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/go-chi/chi/v5"
)

func Router(db *database.DB, secret []byte) http.Handler {
	h := &Handler{DB: db.DB, Secret: secret}
	r := chi.NewRouter()
	r.Post("/", h.Handle)
	return r
}
