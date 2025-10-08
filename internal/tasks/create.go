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
	if s := req.Title; s == "" {
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

	// Position (scoped per status/creator, and per project if provided)
	pos := 1000.0
	if req.Position != nil {
		pos = *req.Position
	} else {
		var maxPos float64
		posQ := h.DB.Model(&database.Task{}).
			Where("status = ? AND creator_id = ?", status, uid)
		if req.ProjectID != nil {
			posQ = posQ.Where("project_id = ?", *req.ProjectID)
		}
		_ = posQ.Select("COALESCE(MAX(position), 0)").Scan(&maxPos).Error
		pos = maxPos + 1000
	}

	t := database.Task{
		Title:      req.Title,
		Status:     database.TaskStatus(status),
		Position:   pos,
		CreatorID:  uid,
		RepoName:   req.RepoName,
		BranchHint: req.BranchHint,
	}
	if req.Description != nil {
		t.Description = *req.Description
	}
	if req.AssigneeID != nil {
		t.AssigneeID = req.AssigneeID
	}
	if req.ProjectID != nil {
		t.ProjectID = req.ProjectID

		var p database.Project
		if err := h.DB.Where("id = ? AND owner_id = ?", *req.ProjectID, uid).First(&p).Error; err != nil {
			utils.Error(w, http.StatusForbidden, "forbidden", "invalid project")
			return
		}
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
