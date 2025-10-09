DROP INDEX IF EXISTS uq_projects_owner_name;

CREATE UNIQUE INDEX uq_projects_owner_name
  ON projects (owner_id, lower(name))
  WHERE deleted_at IS NULL;
