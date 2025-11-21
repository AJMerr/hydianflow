DROP INDEX IF EXISTS idx_projects_parent_id;

ALTER TABLE projects
    DROP CONSTRAINT IF EXISTS projects_parent_fk;

ALTER TABLE projects
    DROP COLUMN IF EXISTS parent_id;
