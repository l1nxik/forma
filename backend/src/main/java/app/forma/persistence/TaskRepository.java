package app.forma.persistence;

import app.forma.domain.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

@Repository
public class TaskRepository {
  private final JdbcTemplate jdbc;

  public TaskRepository(JdbcTemplate jdbc, Migrations migrations) {
    this.jdbc = jdbc;
  }

  private static LocalDate date(String value) {
    return value == null ? null : LocalDate.parse(value);
  }

  private static Instant instant(String value) {
    return value == null ? null : Instant.parse(value);
  }

  private final RowMapper<Task> mapper =
      (r, n) ->
          new Task(
              r.getString("id"),
              r.getString("title"),
              r.getString("notes"),
              date(r.getString("scheduled_date")),
              date(r.getString("deadline")),
              r.getString("priority"),
              r.getBoolean("completed"),
              r.getInt("estimate_minutes"),
              instant(r.getString("created_at")),
              instant(r.getString("updated_at")),
              instant(r.getString("completed_at")),
              r.getLong("revision"),
              r.getString("project_id"));

  public List<Task> list(String workspace) {
    return jdbc.query(
        "SELECT * FROM tasks WHERE workspace=? ORDER BY created_at,id", mapper, workspace);
  }

  public Optional<Task> find(String workspace, String id) {
    return jdbc
        .query("SELECT * FROM tasks WHERE workspace=? AND id=?", mapper, workspace, id)
        .stream()
        .findFirst();
  }

  public void insert(String workspace, Task t) {
    jdbc.update(
        "INSERT INTO"
            + " tasks(id,workspace,title,notes,scheduled_date,deadline,priority,completed,estimate_minutes,created_at,updated_at,completed_at,revision,project_id)"
            + " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        t.id(),
        workspace,
        t.title(),
        t.notes(),
        text(t.scheduledDate()),
        text(t.deadline()),
        t.priority(),
        t.completed(),
        t.estimateMinutes(),
        text(t.createdAt()),
        text(t.updatedAt()),
        text(t.completedAt()),
        t.revision(),
        t.projectId());
  }

  public boolean update(String workspace, Task t, long expected) {
    return jdbc.update(
            "UPDATE tasks SET"
                + " title=?,notes=?,scheduled_date=?,deadline=?,priority=?,completed=?,estimate_minutes=?,updated_at=?,completed_at=?,revision=?,project_id=?"
                + " WHERE workspace=? AND id=? AND revision=?",
            t.title(),
            t.notes(),
            text(t.scheduledDate()),
            text(t.deadline()),
            t.priority(),
            t.completed(),
            t.estimateMinutes(),
            text(t.updatedAt()),
            text(t.completedAt()),
            t.revision(),
            t.projectId(),
            workspace,
            t.id(),
            expected)
        == 1;
  }

  public boolean delete(String workspace, String id, long revision) {
    return jdbc.update(
            "DELETE FROM tasks WHERE workspace=? AND id=? AND revision=?", workspace, id, revision)
        == 1;
  }

  public void history(String id, boolean completed, Instant now) {
    jdbc.update(
        "INSERT INTO task_status_history VALUES(?,?,?,?)",
        UUID.randomUUID().toString(),
        id,
        completed,
        now.toString());
  }

  private static String text(Object value) {
    return value == null ? null : value.toString();
  }
}
