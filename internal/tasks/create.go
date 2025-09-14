package tasks

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
)

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	uid, ok := mustUserID(r)
	if !ok {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "login required")
		return
	}

	var req TaskCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "bad_json", "invalid JSON body")
		return
	}
	if strings := req.Title; strings == "" {
		utils.Error(w, http.StatusBadRequest, "validation", "title is required")
		return
	}

	// Defaults
	status := "todo"
	if req.Status != nil {
		if s, ok := normalStatus(*req.Status); ok {
			status = s
		} else {
			utils.Error(w, http.StatusBadRequest, "validation", "invalid status")
			return
		}
	}

	// Position defaults to append to end of col
	pos := 1000.0
	if req.Position != nil {
		pos = *req.Position
	} else {
		var maxPos float64
		_ = h.DB.Model(&database.Task{}).
			Where("status = ? AND creator_id = ?", status, uid).
			Select("COALESCE(MAX(position), 0)").
			Scan(&maxPos).Error
		pos = maxPos + 1000
	}

	t := database.Task{
		Title:     req.Title,
		Status:    database.TaskStatus(status),
		Position:  pos,
		CreatorID: uid,
	}
	if req.Description != nil {
		t.Description = *req.Description
	}

	now := time.Now().UTC()
	if status == "in_progress" {
		t.StartedAt = &now
	}
	if status == "done" {
		t.CompletedAt = &now
	}

	if err := h.DB.Create(&t).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db_create", "could not create task")
		return
	}
	utils.JSON(w, http.StatusCreated, toResp(t))
}
