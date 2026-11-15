package app.forma.persistence;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class Migrations {
  public static final int CURRENT_VERSION = 3;
  private static final List<String> MIGRATIONS =
      List.of("V001__tasks.sql", "V002__planning_focus.sql", "V003__project_hierarchy.sql");

  public Migrations(JdbcTemplate jdbc, TransactionTemplate tx) throws Exception {
    jdbc.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,checksum TEXT NOT"
            + " NULL,applied_at TEXT NOT NULL)");
    int newest =
        Objects.requireNonNull(
            jdbc.queryForObject(
                "SELECT COALESCE(MAX(version),0) FROM schema_migrations", Integer.class));
    if (newest > CURRENT_VERSION)
      throw new IllegalStateException("This database requires a newer version of Forma");
    if (!"ok".equals(jdbc.queryForObject("PRAGMA quick_check", String.class)))
      throw new IllegalStateException("SQLite integrity check failed");
    backup(jdbc, newest);
    for (int index = 0; index < MIGRATIONS.size(); index++) {
      final int version = index + 1;
      String sql =
          new ClassPathResource("db/migration/" + MIGRATIONS.get(index))
              .getContentAsString(StandardCharsets.UTF_8);
      String checksum =
          HexFormat.of()
              .formatHex(
                  MessageDigest.getInstance("SHA-256")
                      .digest(sql.getBytes(StandardCharsets.UTF_8)));
      tx.executeWithoutResult(
          status -> {
            var existing =
                jdbc.queryForList(
                    "SELECT checksum FROM schema_migrations WHERE version=?",
                    String.class,
                    version);
            if (!existing.isEmpty()) {
              if (!existing.getFirst().equals(checksum))
                throw new IllegalStateException(
                    "Migration checksum mismatch; restore the original migration");
              return;
            }
            for (String statement : sql.split(";"))
              if (!statement.isBlank()) jdbc.execute(statement);
            jdbc.update(
                "INSERT INTO schema_migrations VALUES(?,?,?)",
                version,
                checksum,
                Instant.now().toString());
          });
    }
    if (!jdbc.queryForList("PRAGMA foreign_key_check").isEmpty())
      throw new IllegalStateException("Database relationships are invalid");
  }

  private void backup(JdbcTemplate jdbc, int newest) throws Exception {
    String data = System.getenv("FORMA_DATA_DIR");
    if (data == null || newest == 0) return;
    Path directory = Files.createDirectories(Path.of(data, "Backups"));
    String name =
        newest < CURRENT_VERSION
            ? "forma-before-v" + CURRENT_VERSION + "-" + System.currentTimeMillis()
            : "forma-" + LocalDate.now(ZoneOffset.UTC);
    Path destination = directory.resolve(name + ".sqlite");
    if (Files.exists(destination)) return;
    Path temporary = directory.resolve("snapshot-" + UUID.randomUUID() + ".tmp");
    try {
      jdbc.execute(
          (ConnectionCallback<Void>)
              connection -> {
                try (var statement = connection.prepareStatement("VACUUM INTO ?")) {
                  statement.setString(1, temporary.toString());
                  statement.execute();
                }
                return null;
              });
      Files.move(temporary, destination, StandardCopyOption.ATOMIC_MOVE);
    } finally {
      Files.deleteIfExists(temporary);
    }
  }
}
