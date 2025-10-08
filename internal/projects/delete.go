package projects

import (
	"net/http"

	"github.com/AJMerr/hydianflow/internal/auth"
	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok || uid == 0 {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "auth is required")
		return
	}
	idStr := chi.URLParam(r, "id")

	if err := h.DB.Where("id = ? AND owner_id = ?", idStr, uid).Delete(&database.Project{}).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db_delete", "could not delete project")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
