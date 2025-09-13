package tasks

import (
	"net/http"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/go-chi/chi/v5"
)

func Router(db *database.DB) http.Handler {
	h := &Handler{DB: db.DB}

	r := chi.NewRouter()
	r.Post("/", h.Create)
	r.Get("/", h.GetAll)
	r.Get("/:{id}", h.GetByID)
	r.Patch("/{id}", h.Update)
	r.Delete("/{id}", h.Delete)

	return r
}
