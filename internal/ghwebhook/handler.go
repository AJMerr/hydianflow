package ghwebhook

import (
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strconv"
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
	case "pull_request":
		updated, perr := h.handlePullRequest(body)
		if perr != nil {
			utils.Error(w, http.StatusBadRequest, "pr_parse", perr.Error())
			return
		}
		utils.JSON(w, http.StatusOK, map[string]any{
			"updated": updated,
			"event":   "pull_request",
		})
	default:
		utils.JSON(w, http.StatusOK, map[string]any{"ignored_event": event})
	}
}

type pushPayload struct {
	Ref        string `json:"ref"`
	Repository struct {
		FullName      string `json:"full_name"`
		DefaultBranch string `json:"default_branch"`
	} `json:"repository"`
	Commits []struct {
		Message string `json:"message"`
	} `json:"commits"`
}

type pullRequestPayload struct {
	Action     string `json:"action"`
	Repository struct {
		FullName      string `json:"full_name"`
		DefaultBranch string `json:"default_branch"`
	} `json:"repository"`
	PullRequest struct {
		Merged bool `json:"merged"`
		Base   struct {
			Ref string `json:"ref"`
		} `json:"base"`
		Head struct {
			Ref string `json:"ref"`
		} `json:"head"`
	} `json:"pull_request"`
}

var taskRef = regexp.MustCompile(`(?i)(?:#|task:)\s*(\d+)`)

var reMergePR = regexp.MustCompile(`(?i)Merge pull request #\d+ from [^/\s]+/([^\s]+)`)
var reMergeBranchQuoted = regexp.MustCompile(`(?i)Merge (?:remote-tracking )?branch ['"]([^'"]+)['"]`)

func extractMergedBranchesFromMessage(msg string) []string {
	out := make([]string, 0, 2)
	if m := reMergePR.FindStringSubmatch(msg); len(m) == 2 {
		out = append(out, m[1])
	}
	if m := reMergeBranchQuoted.FindStringSubmatch(msg); len(m) == 2 {
		out = append(out, m[1])
	}
	return out
}

func uniqueLowerTrim(ss []string) []string {
	seen := make(map[string]struct{}, len(ss))
	out := make([]string, 0, len(ss))
	for _, s := range ss {
		s = strings.ToLower(strings.TrimSpace(s))
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}

func (h *Handler) handlePush(body []byte) (int64, error) {
	var p pushPayload
	if err := json.Unmarshal(body, &p); err != nil {
		return 0, err
	}
	branch := strings.TrimPrefix(p.Ref, "refs/heads/")
	repo := strings.TrimSpace(p.Repository.FullName)
	if repo == "" || branch == "" {
		return 0, nil
	}

	now := time.Now().UTC()
	var total int64

	if p.Repository.DefaultBranch != "" && branch == p.Repository.DefaultBranch {
		ids := make([]int64, 0, 4)
		for _, c := range p.Commits {
			for _, m := range taskRef.FindAllStringSubmatch(c.Message, -1) {
				if len(m) == 2 {
					if id, err := strconv.ParseInt(m[1], 10, 64); err == nil {
						ids = append(ids, id)
					}
				}
			}
		}
		if len(ids) > 0 {
			res := h.DB.Table("tasks").
				Where("id IN ? AND repo_full_name = ? AND status IN ('todo','in_progress')", ids, repo).
				Updates(map[string]any{
					"status":       "done",
					"completed_at": gorm.Expr("COALESCE(completed_at, ?)", now),
					"updated_at":   now,
				})
			if res.Error != nil {
				return total, res.Error
			}
			total += res.RowsAffected
		}

		mergedBranches := make([]string, 0, 4)
		for _, c := range p.Commits {
			mergedBranches = append(mergedBranches, extractMergedBranchesFromMessage(c.Message)...)
		}
		if len(mergedBranches) > 0 {
			var allPrefixes []string
			for _, b := range mergedBranches {
				allPrefixes = append(allPrefixes, branchPrefix(b)...)
			}
			allPrefixes = uniqueLowerTrim(allPrefixes)
			if len(allPrefixes) > 0 {
				res := h.DB.Table("tasks").
					Where(`
						repo_full_name = ?
						AND status IN ('todo','in_progress')
						AND branch_hint <> ''
						AND LOWER(TRIM(branch_hint)) IN (?)
					`, repo, allPrefixes).
					Updates(map[string]any{
						"status":       "done",
						"completed_at": gorm.Expr("COALESCE(completed_at, ?)", now),
						"updated_at":   now,
					})
				if res.Error != nil {
					return total, res.Error
				}
				total += res.RowsAffected
			}
		}

		res := h.DB.Table("tasks").
			Where(`
				repo_full_name = ?
				AND status IN ('todo','in_progress')
				AND branch_hint <> ''
				AND LOWER(TRIM(branch_hint)) = LOWER(TRIM(?))
			`, repo, branch).
			Updates(map[string]any{
				"status":       "done",
				"completed_at": gorm.Expr("COALESCE(completed_at, ?)", now),
				"updated_at":   now,
			})
		if res.Error != nil {
			return total, res.Error
		}
		total += res.RowsAffected

		return total, nil
	}

	prefixes := branchPrefix(branch)
	res := h.DB.Table("tasks").
		Where("repo_full_name = ? AND status = 'todo' AND branch_hint <> '' AND branch_hint IN (?)",
			repo, prefixes).
		Updates(map[string]any{
			"status":     "in_progress",
			"updated_at": now,
		})
	return res.RowsAffected, res.Error
}

func (h *Handler) handlePullRequest(body []byte) (int64, error) {
	var p pullRequestPayload
	if err := json.Unmarshal(body, &p); err != nil {
		return 0, err
	}
	if p.Action != "closed" || !p.PullRequest.Merged {
		return 0, nil
	}
	repo := strings.TrimSpace(p.Repository.FullName)
	base := strings.TrimSpace(p.PullRequest.Base.Ref)
	head := strings.TrimSpace(p.PullRequest.Head.Ref)
	if repo == "" || base == "" || head == "" {
		return 0, nil
	}

	// Only marks done when merged into repo's default branch (main/master)
	if p.Repository.DefaultBranch != "" && base != p.Repository.DefaultBranch {
		return 0, nil
	}

	now := time.Now().UTC()

	// Move from in progress -> done for matching branch
	res := h.DB.Table("tasks").
		Where(`
			repo_full_name = ?
			AND status = 'in_progress'
			AND branch_hint <> ''
			AND (
				LOWER(TRIM(branch_hint)) = LOWER(TRIM(?))
				OR LOWER(TRIM(?)) LIKE LOWER(TRIM(branch_hint)) || '/%'
			)
		`, repo, head, head).
		Updates(map[string]any{
			"status":       "done",
			"completed_at": gorm.Expr("COALESCE(completed_at, ?)", now),
			"updated_at":   now,
		})
	return res.RowsAffected, res.Error
}
