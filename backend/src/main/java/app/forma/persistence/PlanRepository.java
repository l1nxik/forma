package app.forma.persistence;

import app.forma.domain.DayPlan;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PlanRepository {
  private final JdbcTemplate jdbc;

  public PlanRepository(JdbcTemplate jdbc, Migrations migrations) {
    this.jdbc = jdbc;
  }

  public DayPlan get(String w, LocalDate date) {
    var versions =
        jdbc.queryForList(
            "SELECT revision FROM day_plans WHERE workspace=? AND date=?",
            Long.class,
            w,
            date.toString());
    return new DayPlan(
        date,
        !versions.isEmpty(),
        versions.isEmpty() ? -1 : versions.getFirst(),
        jdbc.queryForList(
            "SELECT task_id FROM day_plan_items WHERE workspace=? AND date=? ORDER BY position",
            String.class,
            w,
            date.toString()));
  }

  public void replace(String w, LocalDate date, long revision, List<String> ids) {
    jdbc.update(
        "INSERT INTO day_plans(workspace,date,revision,updated_at) VALUES(?,?,?,?) ON"
            + " CONFLICT(workspace,date) DO UPDATE SET"
            + " revision=excluded.revision,updated_at=excluded.updated_at",
        w,
        date.toString(),
        revision,
        Instant.now().toString());
    jdbc.update("DELETE FROM day_plan_items WHERE workspace=? AND date=?", w, date.toString());
    for (int i = 0; i < ids.size(); i++)
      jdbc.update("INSERT INTO day_plan_items VALUES(?,?,?,?)", w, date.toString(), ids.get(i), i);
  }
}
