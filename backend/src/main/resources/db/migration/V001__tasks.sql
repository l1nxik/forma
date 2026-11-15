CREATE TABLE tasks (
 id TEXT PRIMARY KEY,
 workspace TEXT NOT NULL CHECK(workspace IN ('personal','demo')),
 title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 300),
 notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=20000),
 scheduled_date TEXT,
 deadline TEXT,
 priority TEXT NOT NULL CHECK(priority IN ('none','low','medium','high')),
 completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
 estimate_minutes INTEGER NOT NULL DEFAULT 0 CHECK(estimate_minutes BETWEEN 0 AND 10080),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 completed_at TEXT,
 revision INTEGER NOT NULL DEFAULT 0,
 CHECK((completed=0 AND completed_at IS NULL) OR (completed=1 AND completed_at IS NOT NULL))
);
CREATE INDEX tasks_workspace_schedule ON tasks(workspace,scheduled_date,completed);
CREATE TABLE task_status_history (
 id TEXT PRIMARY KEY,
 task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 completed INTEGER NOT NULL CHECK(completed IN (0,1)),
 changed_at TEXT NOT NULL
);
CREATE TABLE preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL);
