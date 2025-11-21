package projects

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/AJMerr/hydianflow/internal/auth"
	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type ProjectUpdateRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	ParentID    *uint   `json:"parent_id,omitempty"`
}

func (h *Handler) Patch(w http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok || uid == 0 {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "auth is required")
		return
	}
	idStr := chi.URLParam(r, "id")

	var body ProjectUpdateRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "bad_json", "invalid json")
		return
	}

	var p database.Project
	if err := h.DB.Where("id = ? AND owner_id = ?", idStr, uid).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.Error(w, http.StatusNotFound, "not_found", "project not found")
			return
		}
		utils.Error(w, http.StatusInternalServerError, "db_get", "failed to load project")
		return
	}

	if body.Name != nil {
		name := strings.TrimSpace(*body.Name)
		if name == "" {
			utils.Error(w, http.StatusBadRequest, "validation", "name cannot be empty")
			return
		}
		p.Name = name
	}
	if body.Description != nil {
		p.Description = strings.TrimSpace(*body.Description)
	}

	if body.ParentID != nil {
		if *body.ParentID == 0 {
			p.ParentID = nil
		} else {
			if *body.ParentID == p.ID {
				utils.Error(w, http.StatusBadRequest, "validation", "project cannot be it's own parent")
				return
			}

			var parent database.Project
			if err := h.DB.
				Select("id").
				Where("id = ? AND owner_id = ?", *body.ParentID, uid).
				First(&parent).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					utils.Error(w, http.StatusBadRequest, "validation", "parent project not found")
					return
				}
				utils.Error(w, http.StatusInternalServerError, "db_parent", "failed to load parent project")
				return
			}

			p.ParentID = body.ParentID
		}
	}

	if err := h.DB.Save(&p).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db_update", "failed to update database")
		return
	}
	utils.JSON(w, http.StatusOK, toResp(p, false))
}
