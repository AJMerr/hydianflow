CREATE TABLE github_event_log (
  delivery_id TEXT PRIMARY KEY,
  event       TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload     JSONB
);

CREATE INDEX idx_github_event_log_event ON github_event_log(event);

