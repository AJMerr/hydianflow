package tasks

import (
	"net/http"
	"strconv"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	uid, ok := mustUserID(r)
	if !ok {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "login required")
		return
	}
	id, _ := strconv.ParseUint(chi.URLParam(r, "id"), 10, 64)

	if err := h.DB.Where("id = ? AND creator_id = ?", id, uid).Delete(&database.Task{}).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db_delete", "failed to delete task")
		return
	}
	utils.JSON(w, http.StatusOK, map[string]string{"ok": "true"})
}
