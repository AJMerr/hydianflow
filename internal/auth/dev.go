package auth

import (
	"context"
	"net/http"
	"os"
	"strconv"
)

type ctxKey string

const userIDKey ctxKey = "userID"

// Enabled when DEV_AUTH=1
func DevAuth(defaultUserID uint) func(http.Handler) http.Handler {
	devOn := os.Getenv("DEV_AUTH") == "1"

	return func(next http.Handler) http.Handler {
		if !devOn {
			return next
		}
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if h := r.Header.Get("X-Dev-User"); h != "" {
				if v, err := strconv.ParseInt(h, 10, 64); err == nil {
					ctx := context.WithValue(r.Context(), userIDKey, uint(v))
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}
			ctx := context.WithValue(r.Context(), userIDKey, defaultUserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func WithUserID(ctx context.Context, id uint) context.Context {
	return context.WithValue(ctx, userIDKey, id)
}

func UserIDFromCtx(ctx context.Context) (uint, bool) {
	v := ctx.Value(userIDKey)
	id, ok := v.(uint)
	return id, ok
}
