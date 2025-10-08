package tasks

import (
	"net/http"
	"strconv"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/utils"
)

// Get All Tasks
func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	uid, ok := mustUserID(r)
	if !ok {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "login required")
		return
	}

	where := h.DB.Where("creator_id = ?", uid)

	if pidStr := r.URL.Query().Get("project_id"); pidStr != "" {
		pid, err := strconv.ParseUint(pidStr, 10, 64)
		if err != nil {
			utils.Error(w, http.StatusBadRequest, "validation", "invalid project_id")
			return
		}
		where = where.Where("project_id = ?", uint(pid))
	}

	if s := r.URL.Query().Get("status"); s != "" {
		if ns, ok := normalStatus(s); ok {
			where = where.Where("status = ?", ns)
		} else {
			utils.Error(w, http.StatusBadRequest, "validation", "invalid status")
			return
		}
	}

	limit := parseLimit(r, 50, 100)
	cursor := parseCursor(r)

	var rows []database.Task
	q := where.Order("position ASC, id ASC").Limit(limit)
	if cursor > 0 {
		q = q.Where("id > ?", cursor)
	}
	if err := q.Find(&rows).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db_list", "could not get all tasks")
		return
	}

	nextCursor := uint(0)
	if len(rows) > 0 {
		nextCursor = rows[len(rows)-1].ID
	}

	type listResp struct {
		Items      []TaskResponse `json:"items"`
		NextCursor uint           `json:"next_cursor"`
	}
	items := make([]TaskResponse, len(rows))
	for i, t := range rows {
		items[i] = toResp(t)
	}
	utils.JSON(w, http.StatusOK, listResp{Items: items, NextCursor: nextCursor})
}
