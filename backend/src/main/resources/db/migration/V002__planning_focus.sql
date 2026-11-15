CREATE TABLE projects (
 id TEXT PRIMARY KEY, workspace TEXT NOT NULL CHECK(workspace IN ('personal','demo')),
 name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 description TEXT NOT NULL DEFAULT '' CHECK(length(description)<=10000),
 color TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE tasks ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX tasks_project ON tasks(project_id);
CREATE TABLE day_plans (
 workspace TEXT NOT NULL CHECK(workspace IN ('personal','demo')), date TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
 PRIMARY KEY(workspace,date)
);
CREATE TABLE day_plan_items (
 workspace TEXT NOT NULL, date TEXT NOT NULL, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 position INTEGER NOT NULL CHECK(position>=0),
 PRIMARY KEY(workspace,date,task_id), UNIQUE(workspace,date,position),
 FOREIGN KEY(workspace,date) REFERENCES day_plans(workspace,date) ON DELETE CASCADE
);
INSERT INTO day_plans(workspace,date,updated_at)
 SELECT workspace,scheduled_date,MIN(created_at) FROM tasks WHERE scheduled_date IS NOT NULL GROUP BY workspace,scheduled_date;
INSERT INTO day_plan_items(workspace,date,task_id,position)
 SELECT workspace,scheduled_date,id,ROW_NUMBER() OVER(PARTITION BY workspace,scheduled_date ORDER BY created_at,id)-1 FROM tasks WHERE scheduled_date IS NOT NULL;
CREATE TABLE focus_sessions (
 id TEXT PRIMARY KEY, workspace TEXT NOT NULL CHECK(workspace IN ('personal','demo')),
 kind TEXT NOT NULL CHECK(kind IN ('work','break')),
 state TEXT NOT NULL CHECK(state IN ('running','paused','completed')),
 task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
 project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
 label TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT,
 target_seconds INTEGER CHECK(target_seconds BETWEEN 60 AND 3600),
 revision INTEGER NOT NULL DEFAULT 0,
 CHECK((state='completed' AND ended_at IS NOT NULL) OR (state!='completed' AND ended_at IS NULL))
);
CREATE UNIQUE INDEX focus_one_active_per_workspace ON focus_sessions(workspace) WHERE state IN ('running','paused');
CREATE TABLE focus_segments (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
 started_at TEXT NOT NULL, ended_at TEXT
);
CREATE UNIQUE INDEX focus_one_open_segment ON focus_segments(session_id) WHERE ended_at IS NULL;
CREATE INDEX focus_workspace_start ON focus_sessions(workspace,started_at);
