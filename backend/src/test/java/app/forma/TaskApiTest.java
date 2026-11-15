package app.forma;

import static org.junit.jupiter.api.Assertions.*;

import app.forma.persistence.Migrations;
import com.fasterxml.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.sql.DriverManager;
import java.util.Map;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {"FORMA_API_TOKEN=0123456789abcdef0123456789abcdef"})
class TaskApiTest {
  @TempDir static Path directory;

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry r) {
    r.add("FORMA_DATA_DIR", () -> directory.toString());
  }

  @LocalServerPort int port;
  @Autowired ObjectMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired TransactionTemplate tx;
  final HttpClient client =
      HttpClient.newBuilder()
          .proxy(
              new ProxySelector() {
                public java.util.List<Proxy> select(URI uri) {
                  return java.util.List.of(Proxy.NO_PROXY);
                }

                public void connectFailed(URI uri, SocketAddress address, java.io.IOException e) {}
              })
          .build();

  @BeforeEach
  void clear() {
    jdbc.update("DELETE FROM day_plans");
    jdbc.update("DELETE FROM focus_sessions");
    jdbc.update("DELETE FROM tasks");
    jdbc.update("UPDATE projects SET parent_id=NULL");
    jdbc.update("DELETE FROM projects");
  }

  HttpResponse<String> call(String method, String path, Object body, boolean auth, String origin)
      throws Exception {
    var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path));
    if (auth) request.header("X-Forma-Token", "0123456789abcdef0123456789abcdef");
    if (origin != null) request.header("Origin", origin);
    request.header("Content-Type", "application/json");
    request.method(
        method,
        body == null
            ? HttpRequest.BodyPublishers.noBody()
            : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
    return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
  }

  Map<String, Object> task(String title) {
    return new java.util.HashMap<>(
        Map.of(
            "title",
            title,
            "notes",
            "Details",
            "scheduledDate",
            "2026-11-15",
            "deadline",
            "2026-11-20",
            "priority",
            "high",
            "completed",
            false,
            "estimateMinutes",
            25,
            "revision",
            0));
  }

  JsonNode create(String title) throws Exception {
    var response = call("POST", "/tasks", task(title), true, null);
    assertEquals(200, response.statusCode(), response.body());
    return json.readTree(response.body());
  }

  @Test
  void cleanWorkspaceAndAuthentication() throws Exception {
    assertEquals("[]", call("GET", "/tasks", null, true, null).body());
    assertEquals(403, call("GET", "/tasks", null, false, null).statusCode());
    assertEquals(403, call("GET", "/tasks", null, true, "https://example.com").statusCode());
  }

  @Test
  void createPersistsDatesAndUnicodeToSqlite() throws Exception {
    var saved = create("  Подготовить план ✨  ");
    assertEquals("Подготовить план ✨", saved.get("title").asText());
    assertNotEquals(saved.get("scheduledDate"), saved.get("deadline"));
    try (var connection =
            DriverManager.getConnection("jdbc:sqlite:" + directory.resolve("forma.sqlite"));
        var statement =
            connection.prepareStatement(
                "SELECT title,scheduled_date,deadline FROM tasks WHERE id=?")) {
      statement.setString(1, saved.get("id").asText());
      try (var row = statement.executeQuery()) {
        assertTrue(row.next());
        assertEquals("Подготовить план ✨", row.getString(1));
        assertEquals("2026-11-15", row.getString(2));
        assertEquals("2026-11-20", row.getString(3));
      }
    }
  }

  @Test
  void statusHistoryAndOptimisticConcurrency() throws Exception {
    var saved = create("A");
    var input = task("B");
    input.put("completed", true);
    String path = "/tasks/" + saved.get("id").asText();
    var updated = call("PUT", path, input, true, null);
    assertEquals(200, updated.statusCode());
    assertNotNull(json.readTree(updated.body()).get("completedAt"));
    assertEquals(409, call("PUT", path, input, true, null).statusCode());
    assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM task_status_history", Integer.class));
    input.put("completed", false);
    input.put("revision", 1);
    var reopened = json.readTree(call("PUT", path, input, true, null).body());
    assertTrue(reopened.get("completedAt").isNull());
    assertEquals(409, call("DELETE", path + "?revision=0", null, true, null).statusCode());
    assertEquals(200, call("DELETE", path + "?revision=2", null, true, null).statusCode());
    assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM task_status_history", Integer.class));
  }

  @Test
  void validatesAtBoundary() throws Exception {
    for (String title : java.util.List.of(" ", "x".repeat(301)))
      assertEquals(400, call("POST", "/tasks", task(title), true, null).statusCode());
    var input = task("Valid");
    input.put("scheduledDate", "2026-02-30");
    assertEquals(400, call("POST", "/tasks", input, true, null).statusCode());
    input = task("Valid");
    input.put("priority", "urgent");
    assertEquals(400, call("POST", "/tasks", input, true, null).statusCode());
    input = task("Valid");
    input.put("estimateMinutes", -1);
    assertEquals(400, call("POST", "/tasks", input, true, null).statusCode());
    assertEquals(400, call("GET", "/tasks?workspace=other", null, true, null).statusCode());
  }

  @Test
  void retainedLegacyWorkspaceStaysIsolated() throws Exception {
    var personal = create("Personal");
    assertEquals(
        200,
        call("POST", "/tasks?workspace=demo", task("Legacy workspace task"), true, null)
            .statusCode());
    assertEquals(1, json.readTree(call("GET", "/tasks", null, true, null).body()).size());
    assertEquals(
        404,
        call(
                "PUT",
                "/tasks/" + personal.get("id").asText() + "?workspace=demo",
                task("Changed"),
                true,
                null)
            .statusCode());
  }

  @Test
  void migrationIsIdempotentAndForeignKeysEnabled() throws Exception {
    create("Keep me");
    new Migrations(jdbc, tx);
    assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM schema_migrations", Integer.class));
    assertEquals(1, jdbc.queryForObject("PRAGMA foreign_keys", Integer.class));
    assertEquals("ok", jdbc.queryForObject("PRAGMA quick_check", String.class));
    assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM tasks", Integer.class));
  }

  @Test
  void failedTransactionRollsBackRelatedRecords() {
    assertThrows(
        RuntimeException.class,
        () ->
            tx.executeWithoutResult(
                status -> {
                  jdbc.update("INSERT INTO preferences VALUES('rollback-test','value')");
                  jdbc.update(
                      "INSERT INTO task_status_history"
                          + " VALUES('bad','missing-task',0,'2026-11-15T00:00:00Z')");
                }));
    assertEquals(
        0,
        jdbc.queryForObject(
            "SELECT count(*) FROM preferences WHERE key='rollback-test'", Integer.class));
  }

  @Test
  void themePersistsAndRejectsUnsupportedSettings() throws Exception {
    assertEquals(
        200, call("PUT", "/preferences", Map.of("theme", "dark"), true, null).statusCode());
    assertEquals(
        "dark",
        json.readTree(call("GET", "/preferences", null, true, null).body()).get("theme").asText());
    assertEquals(
        400, call("PUT", "/preferences", Map.of("theme", "neon"), true, null).statusCode());
    assertEquals(
        200,
        call("PUT", "/preferences", Map.of("glassTransparency", "45"), true, null).statusCode());
    assertEquals(
        "45",
        json.readTree(call("GET", "/preferences", null, true, null).body())
            .get("glassTransparency")
            .asText());
    assertEquals(
        400,
        call("PUT", "/preferences", Map.of("glassTransparency", "81"), true, null).statusCode());
  }

  @Test
  void migrationRejectsTamperingAndFutureSchemas() throws Exception {
    String checksum =
        jdbc.queryForObject("SELECT checksum FROM schema_migrations WHERE version=1", String.class);
    try {
      jdbc.update("UPDATE schema_migrations SET checksum='changed' WHERE version=1");
      assertThrows(IllegalStateException.class, () -> new Migrations(jdbc, tx));
    } finally {
      jdbc.update("UPDATE schema_migrations SET checksum=? WHERE version=1", checksum);
    }
    try {
      jdbc.update("INSERT INTO schema_migrations VALUES(99,'future','2026-11-15T00:00:00Z')");
      assertThrows(IllegalStateException.class, () -> new Migrations(jdbc, tx));
    } finally {
      jdbc.update("DELETE FROM schema_migrations WHERE version=99");
    }
  }

  @Test
  void projectAssignmentAndArchiveRespectWorkspace() throws Exception {
    var project =
        json.readTree(
            call(
                    "POST",
                    "/projects",
                    Map.of(
                        "name",
                        "Calculus",
                        "description",
                        "University",
                        "color",
                        "blue",
                        "archived",
                        false,
                        "revision",
                        0),
                    true,
                    null)
                .body());
    String id = project.get("id").asText();
    var input = task("Lab 1");
    input.put("projectId", id);
    var saved = call("POST", "/tasks", input, true, null);
    assertEquals(200, saved.statusCode(), saved.body());
    assertEquals(id, json.readTree(saved.body()).get("projectId").asText());
    assertEquals(404, call("POST", "/tasks?workspace=demo", input, true, null).statusCode());
    assertEquals(
        200,
        call(
                "PUT",
                "/projects/" + id,
                Map.of(
                    "name",
                    "Calculus",
                    "description",
                    "University",
                    "color",
                    "blue",
                    "archived",
                    true,
                    "revision",
                    0),
                true,
                null)
            .statusCode());
    assertEquals(400, call("POST", "/tasks", input, true, null).statusCode());
  }

  @Test
  void dayPlanPreservesManualOrderAndRejectsStaleWrites() throws Exception {
    String a = create("One").get("id").asText(), b = create("Two").get("id").asText();
    String path = "/plans/2026-11-16";
    long version =
        json.readTree(call("GET", path, null, true, null).body()).get("revision").asLong();
    var input = Map.of("revision", version, "taskIds", java.util.List.of(b, a));
    assertEquals(200, call("PUT", path, input, true, null).statusCode());
    var loaded = json.readTree(call("GET", path, null, true, null).body());
    assertEquals(b, loaded.get("taskIds").get(0).asText());
    assertEquals(409, call("PUT", path, input, true, null).statusCode());
    assertEquals(
        400,
        call(
                "PUT",
                path,
                Map.of(
                    "revision",
                    loaded.get("revision").asLong(),
                    "taskIds",
                    java.util.List.of(a, a)),
                true,
                null)
            .statusCode());
  }

  @Test
  void creatingTaskDoesNotCreateDailyPlan() throws Exception {
    var input = task("Unscheduled");
    input.remove("scheduledDate");
    var result = call("POST", "/tasks", input, true, null);
    assertEquals(200, result.statusCode());
    assertTrue(json.readTree(result.body()).get("scheduledDate").isNull());
    assertEquals(
        0,
        jdbc.queryForObject(
            "SELECT count(*) FROM day_plan_items WHERE task_id=?",
            Integer.class,
            json.readTree(result.body()).get("id").asText()));
  }

  @Test
  void multiPreferenceUpdateIsAtomicAndLanguageIsValidated() throws Exception {
    assertEquals(
        200,
        call(
                "PUT",
                "/preferences",
                Map.of("language", "ru", "theme", "monokai", "breakMinutes", "10"),
                true,
                null)
            .statusCode());
    assertEquals(
        400,
        call("PUT", "/preferences", Map.of("language", "xx", "theme", "dark"), true, null)
            .statusCode());
    var loaded = json.readTree(call("GET", "/preferences", null, true, null).body());
    assertEquals("ru", loaded.get("language").asText());
    assertEquals("monokai", loaded.get("theme").asText());
  }
}
