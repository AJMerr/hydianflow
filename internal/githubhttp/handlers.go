package githubhttp

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/AJMerr/hydianflow/internal/auth"
	"github.com/AJMerr/hydianflow/internal/githubapi"
	"github.com/AJMerr/hydianflow/internal/utils"
	"github.com/go-chi/chi/v5"
)

type Handler struct{ Svc *githubapi.Service }

func Router(svc *githubapi.Service) http.Handler {
	r := chi.NewRouter()
	h := &Handler{Svc: svc}

	r.Get("/repos", h.listRepos)
	r.Get("/branches", h.listBranches)
	return r
}

func (h *Handler) listRepos(w http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok || uid == 0 {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "login required")
		return
	}
	q := r.URL.Query().Get("query")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	per, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
	if per <= 0 || per > 100 {
		per = 50
	}

	repos, _, err := h.Svc.ListUserRepos(r.Context(), uid, q, page, per)
	if err != nil {
		utils.Error(w, http.StatusBadGateway, "github_error", err.Error())
		return
	}
	// Minimal payload for UI
	type Repo struct {
		FullName string `json:"full_name"`
		Name     string `json:"name"`
		Private  bool   `json:"private"`
	}
	out := make([]Repo, 0, len(repos))
	for _, gr := range repos {
		if gr == nil || gr.FullName == nil || gr.Name == nil {
			continue
		}
		if q != "" && !strings.Contains(strings.ToLower(*gr.FullName), strings.ToLower(q)) {
			continue
		}
		out = append(out, Repo{
			FullName: *gr.FullName,
			Name:     *gr.Name,
			Private:  gr.Private != nil && *gr.Private,
		})
	}
	utils.JSON(w, http.StatusOK, out)
}

func (h *Handler) listBranches(w http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok || uid == 0 {
		utils.Error(w, http.StatusUnauthorized, "unauthorized", "login required")
		return
	}
	repo := r.URL.Query().Get("repo_full_name")
	if repo == "" {
		utils.Error(w, http.StatusBadRequest, "bad_request", "repo_full_name required")
		return
	}
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	per, _ := strconv.Atoi(r.URL.Query().Get("per"))
	if per <= 0 || per > 100 {
		per = 50
	}

	branches, _, err := h.Svc.ListBranches(r.Context(), uid, repo, page, per)
	if err != nil {
		utils.Error(w, http.StatusBadGateway, "github_error", err.Error())
		return
	}
	type Branch struct{ Name string }
	out := make([]Branch, 0, len(branches))
	for _, b := range branches {
		if b != nil && b.Name != nil {
			out = append(out, Branch{Name: *b.Name})
		}
	}
	utils.JSON(w, http.StatusOK, out)
}
