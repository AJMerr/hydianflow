# ---- build stage ----
FROM golang:1.25.1-alpine AS builder
WORKDIR /src
RUN apk add --no-cache git ca-certificates

# cache deps
COPY go.mod go.sum ./
RUN go mod download

# copy source
COPY . .

# build
ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64
RUN go build -ldflags="-s -w" -o /out/hydianflow ./cmd/hydianflow-server

# ---- runtime stage ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata curl
WORKDIR /app

# non-root user
RUN adduser -D -H -u 10001 appuser
USER appuser

COPY --from=builder /out/hydianflow /app/hydianflow

EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=2s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8080/healthz || exit 1

ENV HTTP_ADDR=:8080
CMD ["/app/hydianflow"]

