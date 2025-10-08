package projects

import (
	"net/http"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/go-chi/chi/v5"
)

func Router(db *database.DB) http.Handler {
	h := &Handler{DB: db.DB}
	r := chi.NewRouter()

	r.Get("/", h.List)
	r.Get("/{id}", h.GetByID)
	r.Post("/", h.Create)
	r.Patch("/{id}", h.Patch)
	r.Delete("/{id}", h.Delete)
	return r
}
