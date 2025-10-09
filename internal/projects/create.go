package projects

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/AJMerr/hydianflow/internal/auth"
	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
	"gorm.io/gorm/clause"
)

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok || uid == 0 {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "auth required")
		return
	}

	var req ProjectCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "bad_json", "invalid body")
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		utils.Error(w, http.StatusBadRequest, "validation", "name is required")
		return
	}

	p := database.Project{
		OwnerID: uid,
		Name:    name,
	}
	if req.Description != nil {
		p.Description = strings.TrimSpace(*req.Description)
	}

	if err := h.DB.Create(&p).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db_create", "could not create project")
		return
	}

	_ = h.DB.
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&database.ProjectMember{
			ProjectID: p.ID,
			UserID:    p.OwnerID,
			Role:      "owner",
		}).Error

	utils.JSON(w, http.StatusCreated, toResp(p))
}
