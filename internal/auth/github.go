package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/alexedwards/scs/v2"
	gh "github.com/google/go-github/v66/github"
	"golang.org/x/oauth2"
	oauthgithub "golang.org/x/oauth2/github"
	"gorm.io/gorm"
)

type OAuthHandler struct {
	DB       *gorm.DB
	Sessions *scs.SessionManager
	Conf     *oauth2.Config
}

func NewGitHubOAuth(db *gorm.DB, sessions *scs.SessionManager) (*OAuthHandler, error) {
	clientID := strings.TrimSpace(os.Getenv("GITHUB_CLIENT_ID"))
	secret := strings.TrimSpace(os.Getenv("GITHUB_CLIENT_SECRET"))
	base := strings.TrimSpace(os.Getenv("OAUTH_REDIRECT_BASE_URL"))
	if clientID == "" || secret == "" || base == "" {
		return nil, errors.New("missing GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, or OAUTH_REDIRECT_BASE_URL")
	}

	conf := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: secret,
		Endpoint:     oauthgithub.Endpoint,
		Scopes:       []string{"read:user", "user:email"},
		RedirectURL:  strings.TrimRight(base, "/") + "/api/v1/auth/github/callback",
	}
	return &OAuthHandler{DB: db, Sessions: sessions, Conf: conf}, nil
}

// GET /api/v1/auth/github/start
func (h *OAuthHandler) Start(w http.ResponseWriter, r *http.Request) {
	state := randHex(32)
	h.Sessions.Put(r.Context(), "oauth_state", state)

	next := r.URL.Query().Get("next")
	if next != "" {
		h.Sessions.Put(r.Context(), "oauth_next", next)
	}

	// Consent prompt
	prompt := r.URL.Query().Get("prompt")
	opts := []oauth2.AuthCodeOption{oauth2.SetAuthURLParam("allow_signup", "false")}
	if prompt != "" {
		opts = append(opts, oauth2.SetAuthURLParam("prompt", prompt))
	}
	url := h.Conf.AuthCodeURL(state, opts...)
	http.Redirect(w, r, url, http.StatusFound)
}

// GET /api/v1/auth/github/callback?code=...&state=...
func (h *OAuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	want := h.Sessions.GetString(r.Context(), "oauth_state")
	if state == "" || want == "" || state != want {
		http.Error(w, "invalid state", http.StatusBadRequest)
		return
	}
	h.Sessions.Remove(r.Context(), "oauth_state")

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "missing code", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	token, err := h.Conf.Exchange(ctx, code)
	if err != nil || !token.Valid() {
		http.Error(w, "token exchange failed", http.StatusBadGateway)
		return
	}

	// Gets a user profile + primary email
	ghcli := gh.NewClient(h.Conf.Client(ctx, token))

	gu, _, err := ghcli.Users.Get(ctx, "")
	if err != nil || gu == nil || gu.ID == nil || gu.Login == nil {
		http.Error(w, "github user fetch failed", http.StatusBadGateway)
		return
	}

	email := ""
	if gu.Email != nil && *gu.Email != "" {
		email = *gu.Email
	} else {
		emails, _, _ := ghcli.Users.ListEmails(ctx, nil)
		for _, e := range emails {
			if e != nil && e.Email != nil {
				if (e.Primary != nil && *e.Primary) && (e.Verified != nil && *e.Verified) {
					email = *e.Email
					break
				}
				if email == "" {
					email = *e.Email
				}
			}
		}
	}
	avatar := ""
	if gu.AvatarURL != nil {
		avatar = *gu.AvatarURL
	}
	name := ""
	if gu.Name != nil {
		name = *gu.Name
	}

	// Lookup/create/update user + store token
	var u database.User
	err = h.DB.Where("github_id = ?", *gu.ID).First(&u).Error

	scope, _ := token.Extra("scope").(string)
	now := time.Now().UTC()

	if errors.Is(err, gorm.ErrRecordNotFound) {
		u = database.User{
			GitHubID:    int64(*gu.ID),
			GitHubLogin: *gu.Login,
			Name:        name,
			AvatarURL:   avatar,
		}
		if email != "" {
			u.Email = &email
		}
		// Store token on create
		u.GitHubAccessToken = &token.AccessToken
		if scope != "" {
			u.GitHubTokenScope = &scope
		}
		u.GitHubTokenUpdatedAt = &now

		if err := h.DB.Create(&u).Error; err != nil {
			http.Error(w, "user create failed", http.StatusInternalServerError)
			return
		}
	} else if err == nil {
		// Update basics
		u.GitHubLogin = *gu.Login
		u.Name = name
		u.AvatarURL = avatar
		if email != "" {
			u.Email = &email
		}
		// Always refresh token info after OAuth
		u.GitHubAccessToken = &token.AccessToken
		if scope != "" {
			u.GitHubTokenScope = &scope
		}
		u.GitHubTokenUpdatedAt = &now

		if err := h.DB.Save(&u).Error; err != nil {
			http.Error(w, "user update failed", http.StatusInternalServerError)
			return
		}
	} else {
		http.Error(w, "user lookup failed", http.StatusInternalServerError)
		return
	}

	// Set session user_id
	h.Sessions.Put(ctx, "user_id", int(u.ID))

	// Redirect to next or home
	next := h.Sessions.PopString(ctx, "oauth_next")
	if next == "" || !strings.HasPrefix(next, "/") {
		next = "/"
	}
	http.Redirect(w, r, next, http.StatusFound)
}

// GET /api/v1/auth/me
func (h *OAuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	uid := h.Sessions.GetInt(r.Context(), "user_id")
	if uid == 0 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var u database.User
	if err := h.DB.First(&u, uid).Error; err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"data":{"id":%d,"name":%q,"github_login":%q,"avatar_url":%q}}`,
		u.ID, u.Name, u.GitHubLogin, u.AvatarURL)
}

// POST /api/v1/auth/logout
func (h *OAuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	_ = h.Sessions.Destroy(r.Context())
	w.WriteHeader(http.StatusNoContent)
}

func randHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
