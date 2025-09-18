package auth

import (
	"net/http"

	"github.com/alexedwards/scs/v2"
)

func FromSession(sm *scs.SessionManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			uid := sm.GetInt(r.Context(), "user_id")
			if uid > 0 {
				r = r.WithContext(WithUserID(r.Context(), uint(uid)))
			}
			next.ServeHTTP(w, r)
		})
	}
}
