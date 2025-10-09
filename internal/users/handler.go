package users

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/AJMerr/hydianflow/internal/auth"
	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
	"gorm.io/gorm"
)

type Handler struct{ DB *gorm.DB }

type userLite struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	GithubLogin string `json:"github_login"`
}

func (h *Handler) ListByIDs(w http.ResponseWriter, r *http.Request) {
	if _, ok := auth.UserIDFromCtx(r.Context()); !ok {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "auth required")
		return
	}

	raw := strings.TrimSpace(r.URL.Query().Get("ids"))
	if raw == "" {
		utils.JSON(w, http.StatusOK, []userLite{})
		return
	}

	parts := strings.Split(raw, ",")
	ids := make([]uint, 0, len(parts))
	for _, p := range parts {
		n, err := strconv.ParseUint(strings.TrimSpace(p), 10, 64)
		if err == nil && n > 0 {
			ids = append(ids, uint(n))
		}
	}
	if len(ids) == 0 {
		utils.JSON(w, http.StatusOK, []userLite{})
		return
	}

	var rows []userLite
	if err := h.DB.Model(&database.User{}).
		Select("id, name, github_login").
		Where("id IN ?", ids).
		Scan(&rows).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db", "failed to load users")
		return
	}

	utils.JSON(w, http.StatusOK, rows)
}
