DROP TABLE IF EXISTS project_members;

-- Drop tasks index, then column
DROP INDEX IF EXISTS idx_tasks_project_status_position;
ALTER TABLE tasks DROP COLUMN IF EXISTS project_id;

-- Drop projects and its indexes
DROP INDEX IF EXISTS uq_projects_owner_name;
DROP INDEX IF EXISTS idx_projects_owner;
DROP TABLE IF EXISTS projects;
