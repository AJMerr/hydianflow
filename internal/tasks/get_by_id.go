package tasks

import (
	"net/http"
	"strconv"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	uid, ok := mustUserID(r)
	if !ok {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "login required")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)

	var t database.Task
	if err := h.DB.Where("id = ? AND creator_id = ?", id, uid).First(&t).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.Error(w, http.StatusNotFound, "not_found", "task not found")
			return
		}
		utils.Error(w, http.StatusInternalServerError, "db_get", "could not load task")
		return
	}
	utils.JSON(w, http.StatusOK, toResp(t))
}
