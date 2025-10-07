package projects

import (
	"net/http"

	"github.com/AJMerr/hydianflow/internal/auth"
	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
)

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok || uid == 0 {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "auth required")
		return
	}

	var rows []database.Project
	if err := h.DB.Where("owner_id = ?", uid).
		Order("created_at DESC").
		Find(&rows).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db_list", "could not list projects")
		return
	}

	out := make([]ProjectResponse, len(rows))
	for i := range rows {
		out[i] = toResp(rows[i])
	}
	utils.JSON(w, http.StatusOK, out)
}
