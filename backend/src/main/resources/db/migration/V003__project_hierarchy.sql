ALTER TABLE projects ADD COLUMN parent_id TEXT REFERENCES projects(id) ON DELETE RESTRICT;
CREATE INDEX projects_parent ON projects(parent_id);
