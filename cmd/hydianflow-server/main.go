package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/AJMerr/hydianflow/internal/auth"
	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/AJMerr/hydianflow/internal/ghwebhook"
	"github.com/AJMerr/hydianflow/internal/githubapi"
	"github.com/AJMerr/hydianflow/internal/githubhttp"
	"github.com/AJMerr/hydianflow/internal/projects"
	"github.com/AJMerr/hydianflow/internal/tasks"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	db, dbErr := database.Open()
	if dbErr != nil {
		log.Fatalf("database init failed: %v", dbErr)
	}
	defer func() {
		if cerr := db.Close(); cerr != nil {
			log.Printf("database close error: %v", cerr)
		}
	}()

	// Sessions (scs and Postgres store)
	sqlDB, err := db.DB.DB()
	if err != nil {
		log.Fatalf("unwrap sql db: %v", err)
	}

	prod := os.Getenv("ENV") == "prod" || os.Getenv("ENV") == "production"

	sessions := auth.NewSession(auth.SessionConfig{
		SQLDB:        sqlDB,
		CookieDomain: os.Getenv("COOKIE_DOMAIN"),
		Lifetime:     30 * 24 * time.Hour,
		Production:   prod,
	})

	// Seeds the dev user
	var devUserID uint = 0
	if os.Getenv("DEV_AUTH") == "1" {
		id, serr := database.SeedDevUser(db.DB)
		if serr != nil {
			log.Fatalf("seed failed for dev user: %v", serr)
		}
		devUserID = id
		log.Printf("DEV_AUTH enabled; default user id = %d", devUserID)
	}

	// Middleware and Router
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(sessions.Manager.LoadAndSave)

	// CORS
	origins := getListEnv("ALLOW_ORIGINS", []string{
		"http://localhost:5173",
	})

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Healthz endpoint to ping DB
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		sqlDB, _ := db.DB.DB()
		ctx, cancel := context.WithTimeout(r.Context(), 500*time.Millisecond)
		defer cancel()
		if err := sqlDB.PingContext(ctx); err != nil {
			http.Error(w, "database not read", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	secret := []byte(os.Getenv("GITHUB_WEBHOOK_SECRET"))
	r.Mount("/api/v1/webhooks/github", ghwebhook.Router(db, secret))

	sessionAuth := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if os.Getenv("DEV_AUTH") == "1" {
				next.ServeHTTP(w, r)
				return
			}
			if sessions.Manager.GetInt(r.Context(), "user_id") == 0 {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	oauth, oerr := auth.NewGitHubOAuth(db.DB, sessions.Manager)
	if oerr != nil {
		log.Fatalf("oauth init: %v", oerr)
	}

	r.Route("/api/v1", func(api chi.Router) {
		// Public auth endpoints
		api.Group(func(pub chi.Router) {
			pub.Get("/auth/github/start", oauth.Start)
			pub.Get("/auth/github/callback", oauth.Callback)
			pub.Get("/auth/me", oauth.Me)
			pub.Post("/auth/logout", oauth.Logout)
		})

		// Dev override + session guard
		api.Group(func(priv chi.Router) {
			if os.Getenv("DEV_AUTH") == "1" {
				priv.Use(auth.DevAuth(devUserID))
			}
			priv.Use(auth.FromSession(sessions.Manager))
			priv.Use(sessionAuth)

			ghsvc := &githubapi.Service{DB: db}
			priv.Mount("/github", githubhttp.Router(ghsvc))

			priv.Mount("/projects", projects.Router(db))
			priv.Mount("/tasks", tasks.Router(db))

			priv.Get("/dev", func(w http.ResponseWriter, r *http.Request) {
				uid := sessions.Manager.GetInt(r.Context(), "user_id")
				if uid == 0 {
					http.Error(w, "unauthorized", http.StatusUnauthorized)
					return
				}
				var u database.User
				if err := db.DB.First(&u, uid).Error; err != nil {
					http.Error(w, "not found", http.StatusNotFound)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				fmt.Fprintf(w, `{"data":{"id":%d,"name":%q,"github_login":%q}}`, u.ID, u.Name, u.GitHubLogin)
			})
		})
	})

	addr := getEnv("HTTP_ADDR", ":8080")
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Starts server
	go func() {
		log.Printf("hydianflow server listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
	log.Println("server stopped")
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getListEnv(key string, def []string) []string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if s := strings.TrimSpace(p); s != "" {
			out = append(out, s)
		}
	}
	if len(out) == 0 {
		return def
	}
	return out
}
