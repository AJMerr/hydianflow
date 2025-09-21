CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_repo_status
  ON tasks (repo_full_name, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_repo_status_branch
  ON tasks (repo_full_name, status, branch_hint)
  WHERE branch_hint <> '' AND status IN ('todo','in_progress');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status
  ON tasks (status);

CREATE UNIQUE INDEX IF NOT EXISTS github_event_log_delivery_id_key
  ON github_event_log (delivery_id);
