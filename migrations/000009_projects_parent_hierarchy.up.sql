ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS parent_id BIGINT;

ALTER TABLE projects
    ADD CONSTRAINT projects_parent_fk
        FOREIGN KEY (parent_id)
        REFERENCES projects(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_parent_id
    ON projects(parent_id);
