package app.forma.persistence;

import app.forma.domain.FocusSession;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

@Repository
public class FocusRepository {
  public record Segment(String id, Instant start, Instant end) {}

  public record WorkInterval(
      String sessionId,
      String taskId,
      String projectId,
      String state,
      Instant start,
      Instant end) {}

  private final JdbcTemplate jdbc;

  public FocusRepository(JdbcTemplate jdbc, Migrations migrations) {
    this.jdbc = jdbc;
  }

  private RowMapper<FocusSession> mapper(Instant now) {
    return (r, n) -> {
      String id = r.getString("id");
      Integer target = r.getObject("target_seconds") == null ? null : r.getInt("target_seconds");
      return new FocusSession(
          id,
          r.getString("kind"),
          r.getString("state"),
          r.getString("task_id"),
          r.getString("project_id"),
          r.getString("label"),
          Instant.parse(r.getString("started_at")),
          parse(r.getString("ended_at")),
          target,
          r.getLong("revision"),
          elapsed(id, now));
    };
  }

  private static Instant parse(String s) {
    return s == null ? null : Instant.parse(s);
  }

  public List<Segment> segments(String id) {
    return jdbc.query(
        "SELECT * FROM focus_segments WHERE session_id=? ORDER BY started_at",
        (r, n) ->
            new Segment(
                r.getString("id"),
                Instant.parse(r.getString("started_at")),
                parse(r.getString("ended_at"))),
        id);
  }

  public long elapsed(String id, Instant now) {
    return segments(id).stream()
        .mapToLong(
            s ->
                Math.max(
                    0, Duration.between(s.start(), s.end() == null ? now : s.end()).toMillis()))
        .sum();
  }

  public Optional<FocusSession> active(String w, Instant now) {
    return jdbc
        .query(
            "SELECT * FROM focus_sessions WHERE workspace=? AND state!='completed'", mapper(now), w)
        .stream()
        .findFirst();
  }

  public Optional<FocusSession> find(String w, String id, Instant now) {
    return jdbc
        .query("SELECT * FROM focus_sessions WHERE workspace=? AND id=?", mapper(now), w, id)
        .stream()
        .findFirst();
  }

  public List<FocusSession> recent(String w, Instant now) {
    return jdbc.query(
        "SELECT * FROM focus_sessions WHERE workspace=? AND state='completed' ORDER BY started_at"
            + " DESC LIMIT 100",
        mapper(now),
        w);
  }

  public void insert(String w, FocusSession s) {
    jdbc.update(
        "INSERT INTO"
            + " focus_sessions(id,workspace,kind,state,task_id,project_id,label,started_at,ended_at,target_seconds,revision)"
            + " VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        s.id(),
        w,
        s.kind(),
        s.state(),
        s.taskId(),
        s.projectId(),
        s.label(),
        s.startedAt().toString(),
        null,
        s.targetSeconds(),
        0);
    open(s.id(), s.startedAt());
  }

  public void open(String id, Instant now) {
    jdbc.update(
        "INSERT INTO focus_segments VALUES(?,?,?,NULL)",
        UUID.randomUUID().toString(),
        id,
        now.toString());
  }

  public void close(String id, Instant now) {
    for (Segment segment : segments(id))
      if (segment.end() == null) {
        Instant end = now.isBefore(segment.start()) ? segment.start() : now;
        jdbc.update(
            "UPDATE focus_segments SET ended_at=? WHERE id=? AND ended_at IS NULL",
            end.toString(),
            segment.id());
      }
  }

  public boolean transition(String w, FocusSession s, String state, Instant end) {
    return jdbc.update(
            "UPDATE focus_sessions SET state=?,ended_at=?,revision=revision+1 WHERE workspace=? AND"
                + " id=? AND revision=?",
            state,
            end == null ? null : end.toString(),
            w,
            s.id(),
            s.revision())
        == 1;
  }

  public boolean edit(String w, FocusSession s, Instant start, Instant end) {
    if (jdbc.update(
            "UPDATE focus_sessions SET started_at=?,ended_at=?,revision=revision+1 WHERE"
                + " workspace=? AND id=? AND revision=? AND state='completed'",
            start.toString(),
            end.toString(),
            w,
            s.id(),
            s.revision())
        != 1) return false;
    jdbc.update("DELETE FROM focus_segments WHERE session_id=?", s.id());
    jdbc.update(
        "INSERT INTO focus_segments VALUES(?,?,?,?)",
        UUID.randomUUID().toString(),
        s.id(),
        start.toString(),
        end.toString());
    return true;
  }

  public boolean delete(String w, FocusSession s) {
    return jdbc.update(
            "DELETE FROM focus_sessions WHERE workspace=? AND id=? AND revision=? AND"
                + " state='completed'",
            w,
            s.id(),
            s.revision())
        == 1;
  }

  public List<WorkInterval> workIntervals(String w) {
    return jdbc.query(
        "SELECT s.id,s.task_id,s.project_id,s.state,g.started_at,g.ended_at FROM focus_sessions s"
            + " JOIN focus_segments g ON g.session_id=s.id WHERE s.workspace=? AND s.kind='work'",
        (r, n) ->
            new WorkInterval(
                r.getString("id"),
                r.getString("task_id"),
                r.getString("project_id"),
                r.getString("state"),
                Instant.parse(r.getString("started_at")),
                parse(r.getString("ended_at"))),
        w);
  }
}
