package app.forma;

import static org.junit.jupiter.api.Assertions.*;

import app.forma.persistence.Migrations;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.support.TransactionTemplate;

class UpgradeTest {
  @TempDir Path directory;

  @Test
  void upgradesV1WithoutLosingTaskDatesHistoryOrOrder() throws Exception {
    var source = new DriverManagerDataSource("jdbc:sqlite:" + directory.resolve("legacy.sqlite"));
    var jdbc = new JdbcTemplate(source);
    String sql =
        new ClassPathResource("db/migration/V001__tasks.sql")
            .getContentAsString(StandardCharsets.UTF_8);
    jdbc.execute(
        "CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,checksum TEXT NOT"
            + " NULL,applied_at TEXT NOT NULL)");
    for (String statement : sql.split(";")) if (!statement.isBlank()) jdbc.execute(statement);
    jdbc.update(
        "INSERT INTO schema_migrations VALUES(1,?,'2026-11-15T00:00:00Z')",
        HexFormat.of()
            .formatHex(
                MessageDigest.getInstance("SHA-256").digest(sql.getBytes(StandardCharsets.UTF_8))));
    jdbc.update(
        "INSERT INTO tasks VALUES('legacy','personal','Keep"
            + " this','Notes','2026-11-15','2026-12-01','high',0,30,'2026-11-01T00:00:00Z','2026-11-01T00:00:00Z',NULL,4)");
    jdbc.update("INSERT INTO task_status_history VALUES('h','legacy',0,'2026-11-01T00:00:00Z')");
    new Migrations(jdbc, new TransactionTemplate(new DataSourceTransactionManager(source)));
    assertEquals("Keep this", jdbc.queryForObject("SELECT title FROM tasks", String.class));
    assertEquals(30, jdbc.queryForObject("SELECT estimate_minutes FROM tasks", Integer.class));
    assertEquals(4, jdbc.queryForObject("SELECT revision FROM tasks", Integer.class));
    assertEquals(
        "legacy",
        jdbc.queryForObject(
            "SELECT task_id FROM day_plan_items WHERE date='2026-11-15'", String.class));
    assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM task_status_history", Integer.class));
    assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM schema_migrations", Integer.class));
  }
}
