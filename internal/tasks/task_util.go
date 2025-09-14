package tasks

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/AJMerr/hydianflow/internal/auth"
)

var allowedStatuses = map[string]struct{}{
	"todo": {}, "in_progress": {}, "done": {},
}

func normalStatus(s string) (string, bool) {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "completed" {
		s = "done"
	}
	_, ok := allowedStatuses[s]
	return s, ok
}

func mustUserID(r *http.Request) (uint, bool) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	return uid, ok && uid != 0
}

func parseLimit(r *http.Request, def, max int) int {
	q := r.URL.Query().Get("limit")
	if q == "" {
		return def
	}
	n, err := strconv.Atoi(q)
	if err != nil || n <= 0 {
		return def
	}
	if n > max {
		return max
	}
	return n
}

func parseCursor(r *http.Request) uint {
	q := r.URL.Query().Get("cursor")
	if q == "" {
		return 0
	}
	v, _ := strconv.ParseUint(q, 10, 64)
	return uint(v)
}

func nullableStr(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}
