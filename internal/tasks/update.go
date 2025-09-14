package tasks

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	uid, ok := mustUserID(r)
	if !ok {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "login required")
		return
	}
	id, _ := strconv.ParseUint(chi.URLParam(r, "id"), 10, 64)

	var t database.Task
	if err := h.DB.Where("id = ? AND creator_id = ?", id, uid).First(&t).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.Error(w, http.StatusNotFound, "not_found", "task not found")
			return
		}
		utils.Error(w, http.StatusInternalServerError, "db_get", "could not load task")
		return
	}

	var req TaskUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "bad_json", "invalid JSON body")
		return
	}

	now := time.Now().UTC()
	if req.Title != nil {
		t.Title = *req.Title
	}
	if req.Description != nil {
		t.Description = *req.Description
	}
	if req.Position != nil {
		t.Position = *req.Position
	}
	if req.AssigneeID != nil {
		t.AssigneeID = req.AssigneeID
	}
	if req.Status != nil {
		if s, ok := normalStatus(*req.Status); ok {
			prev := t.Status
			t.Status = database.TaskStatus(s)
			if prev != "in_progress" && s == "in_progress" && t.StartedAt == nil {
				t.StartedAt = &now
			}
			if s == "done" && t.CompletedAt == nil {
				t.CompletedAt = &now
			}
			if s != "done" {
				t.CompletedAt = nil
			}
		} else {
			utils.Error(w, http.StatusBadRequest, "validation", "invalid status")
			return
		}
	}

	if err := h.DB.Save(&t).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db_update", "could not update task")
		return
	}
	utils.JSON(w, http.StatusOK, toResp(t))
}
