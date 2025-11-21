package projects

import (
	"errors"
	"net/http"

	"github.com/AJMerr/hydianflow/internal/auth"
	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

// GET All
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
		out[i] = toResp(rows[i], false)
	}
	utils.JSON(w, http.StatusOK, out)
}

// GET /api/v1/projects/{id}
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok || uid == 0 {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "auth is required")
		return
	}

	idStr := chi.URLParam(r, "id")
	var p database.Project
	if err := h.DB.Where("id = ? AND owner_id = ?", idStr, uid).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.Error(w, http.StatusNotFound, "not_found", "project not found")
			return
		}
		utils.Error(w, http.StatusInternalServerError, "db_get", "could not load project")
		return
	}

	var childCount int64
	if err := h.DB.Model(database.Project{}).
		Where("parent_id = ?", p.ID).
		Count(&childCount).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db_children", "could not load project children")
		return
	}

	utils.JSON(w, http.StatusOK, toResp(p, childCount > 0))
}
