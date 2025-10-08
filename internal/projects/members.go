package projects

import (
	"github.com/AJMerr/hydianflow/internal/auth"
	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"net/http"
)

type MemberResp struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	AvatarURL   string `json:"avatar_url"`
	GithubLogin string `json:"github_login"`
}

func (h *Handler) ListMembers(w http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok || uid == 0 {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "auth required")
		return
	}

	pid := chi.URLParam(r, "id")
	// owner check (only list members of your own project)
	var p database.Project
	if err := h.DB.Where("id = ? AND owner_id = ?", pid, uid).First(&p).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.Error(w, http.StatusNotFound, "not_found", "project not found")
			return
		}
		utils.Error(w, http.StatusInternalServerError, "db", "failed to load project")
		return
	}

	// Join project_members -> users
	type row struct {
		ID          uint
		Name        string
		AvatarURL   string
		GithubLogin string
	}
	var rows []row
	if err := h.DB.
		Table("project_members pm").
		Select("u.id, u.name, u.avatar_url, u.github_login").
		Joins("JOIN users u ON u.id = pm.user_id").
		Where("pm.project_id = ?", pid).
		Scan(&rows).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db", "failed to load members")
		return
	}

	out := make([]MemberResp, len(rows))
	for i, r0 := range rows {
		out[i] = MemberResp{ID: r0.ID, Name: r0.Name, AvatarURL: r0.AvatarURL, GithubLogin: r0.GithubLogin}
	}
	utils.JSON(w, http.StatusOK, out)
}
