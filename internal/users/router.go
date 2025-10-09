package users

import (
	"net/http"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/go-chi/chi/v5"
)

func Router(db *database.DB) http.Handler {
	h := &Handler{DB: db.DB}
	r := chi.NewRouter()

	r.Get("/users", h.ListByIDs)

	return r
}
