package projects

import (
	"net/http"

	"github.com/AJMerr/hydianflow/internal/auth"
	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok || uid == 0 {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "auth is required")
		return
	}
	idStr := chi.URLParam(r, "id")

	var p database.Project
	if err := h.DB.Where("id = ? AND owner_id = ?", idStr, uid).First(&p).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.Error(w, http.StatusNotFound, "not_found", "project not found")
			return
		}
		utils.Error(w, http.StatusInternalServerError, "db", "load project failed")
		return
	}

	tx := h.DB.Begin()
	defer func() { _ = tx.Rollback() }()

	if err := tx.Where("project_id = ?", p.ID).Delete(&database.Task{}).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db", "failed to delete tasks")
		return
	}

	if err := tx.Delete(&p).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db", "failed to delete project")
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db", "commit failed")
		return
	}

	utils.JSON(w, http.StatusOK, map[string]string{"ok": "deleted"})
}
