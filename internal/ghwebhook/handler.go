package ghwebhook

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/AJMerr/hydianflow/internal/utils"
	"gorm.io/gorm"
)

type Handler struct {
	DB     *gorm.DB
	Secret []byte
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	// Required headers
	event := r.Header.Get("X-GitHub-Event")
	delivery := r.Header.Get("X-GitHub-Delivery")
	if event == "" || delivery == "" {
		utils.Error(w, http.StatusBadRequest, "bad_request", "missing github headers")
		return
	}

	// Reads raw body for signature verification
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20)) // 1MB cap
	if err != nil {
		utils.Error(w, http.StatusBadRequest, "bad_body", "could not read body")
		return
	}
	if !verifySignature256(r.Header.Get("X-Hub-Signature-256"), body, h.Secret) {
		utils.Error(w, http.StatusUnauthorized, "bad_signature", "signature mismatch")
		return
	}

	var insertedID string
	if err := h.DB.
		Raw(`INSERT INTO github_event_log (delivery_id, event, payload)
		     VALUES (?, ?, ?::jsonb)
		     ON CONFLICT (delivery_id) DO NOTHING
		     RETURNING delivery_id`, delivery, event, string(body)).
		Scan(&insertedID).Error; err != nil {
		utils.Error(w, http.StatusInternalServerError, "db_event_log", "failed to log event")
		return
	}
	if insertedID == "" {
		utils.JSON(w, http.StatusOK, map[string]any{"duplicate": true})
		return
	}

	switch event {
	case "push":
		updated, perr := h.handlePush(body)
		if perr != nil {
			utils.Error(w, http.StatusBadRequest, "push_parse", perr.Error())
			return
		}
		utils.JSON(w, http.StatusOK, map[string]any{
			"updated": updated,
			"event":   "push",
		})
	default:
		utils.JSON(w, http.StatusOK, map[string]any{"ignored_event": event})
	}
}

type pushPayload struct {
	Ref        string `json:"ref"`
	Repository struct {
		FullName string `json:"full_name"`
	} `json:"repository"`
}

func (h *Handler) handlePush(body []byte) (int64, error) {
	var p pushPayload
	if err := json.Unmarshal(body, &p); err != nil {
		return 0, err
	}
	branch := strings.TrimPrefix(p.Ref, "refs/heads/")
	repo := p.Repository.FullName
	if repo == "" || branch == "" {
		return 0, nil
	}

	now := time.Now().UTC()

	res := h.DB.Table("tasks").
		Where("repo_full_name = ? AND branch_hint = ? AND status <> 'done'", repo, branch).
		Updates(map[string]any{
			"status":       "done",
			"completed_at": gorm.Expr("COALESCE(completed_at, ?)", now),
			"updated_at":   now,
		})
	return res.RowsAffected, res.Error
}
