ALTER TABLE users
  ADD COLUMN github_access_token TEXT,
  ADD COLUMN github_token_scope TEXT,
  ADD COLUMN github_token_updated_at TIMESTAMPTZ;
