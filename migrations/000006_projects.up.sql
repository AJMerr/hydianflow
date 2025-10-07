-- Projects feature: base tables + task scoping

CREATE TABLE IF NOT EXISTS projects (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,

  owner_id     BIGINT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name         TEXT   NOT NULL,
  description  TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_owner_name ON projects (owner_id, lower(name));

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id BIGINT
    REFERENCES projects(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_status_position
  ON tasks (project_id, status, position);

CREATE TABLE IF NOT EXISTS project_members (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id)    ON UPDATE CASCADE ON DELETE CASCADE,
  role       TEXT   NOT NULL DEFAULT 'member',
  PRIMARY KEY (project_id, user_id)
);
