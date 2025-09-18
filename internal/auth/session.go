package auth

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/alexedwards/scs/postgresstore"
	"github.com/alexedwards/scs/v2"
)

type Session struct {
	Manager *scs.SessionManager
}

type SessionConfig struct {
	SQLDB        *sql.DB
	CookieDomain string
	Lifetime     time.Duration
	Production   bool
}

func NewSession(cfg SessionConfig) *Session {
	sm := scs.New()
	sm.Store = postgresstore.New(cfg.SQLDB)
	sm.Lifetime = cfg.Lifetime
	sm.IdleTimeout = 0

	// Cookies
	sm.Cookie.Name = "hf_session"
	sm.Cookie.HttpOnly = true
	sm.Cookie.SameSite = http.SameSiteLaxMode
	sm.Cookie.Path = "/"
	if cfg.CookieDomain != "" {
		sm.Cookie.Domain = cfg.CookieDomain
	}
	sm.Cookie.Secure = cfg.Production

	return &Session{Manager: sm}
}
