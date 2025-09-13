-- Users
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  github_id     BIGINT      NOT NULL UNIQUE,
  github_login  TEXT,
  email         TEXT,
  name          TEXT,
  avatar_url    TEXT
);

-- Unique email *when present* (case-insensitive)
CREATE UNIQUE INDEX users_email_unique
  ON users ((lower(email)))
  WHERE email IS NOT NULL;

-- Tasks
CREATE TABLE tasks (
  id             BIGSERIAL PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,

  title          TEXT        NOT NULL,
  description    TEXT,

  status         TEXT        NOT NULL DEFAULT 'todo',
  position       DOUBLE PRECISION NOT NULL DEFAULT 1000,

  creator_id     BIGINT      NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  assignee_id    BIGINT          REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,

  repo_full_name TEXT,
  branch_hint    TEXT,
  pr_number      INT,

  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ
);

-- Guard valid statuses
ALTER TABLE tasks ADD CONSTRAINT task_status_check
  CHECK (status IN ('todo','in_progress','done'));

-- Helpful indexes
CREATE INDEX idx_tasks_status_position ON tasks (status, position);
CREATE INDEX idx_tasks_branch_hint     ON tasks (branch_hint);
CREATE INDEX idx_tasks_repo            ON tasks (repo_full_name);

