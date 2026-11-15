package app.forma;

import static org.junit.jupiter.api.Assertions.*;

import app.forma.domain.*;
import app.forma.persistence.*;
import app.forma.service.*;
import java.nio.file.Path;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;

@SpringBootTest(
    classes = {FormaApplication.class, FocusServiceTest.TestTime.class},
    properties = {"FORMA_API_TOKEN=0123456789abcdef0123456789abcdef"})
// Close the connection pool before JUnit removes the temporary SQLite files.
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class FocusServiceTest {
  @TempDir static Path directory;

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry r) {
    r.add("FORMA_DATA_DIR", () -> directory.toString());
  }

  @TestConfiguration
  static class TestTime {
    @Bean
    @Primary
    MutableClock mutableClock() {
      return new MutableClock();
    }
  }

  static class MutableClock extends Clock {
    Instant value = Instant.parse("2026-11-15T09:00:00Z");

    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    public Clock withZone(ZoneId zone) {
      return Clock.fixed(value, zone);
    }

    public Instant instant() {
      return value;
    }

    void advance(long seconds) {
      value = value.plusSeconds(seconds);
    }
  }

  @Autowired MutableClock clock;
  @Autowired FocusService focus;
  @Autowired StatisticsService stats;
  @Autowired JdbcTemplate jdbc;
  @Autowired TaskService tasks;
  @Autowired PlanService plans;
  @Autowired ProjectService projects;

  @BeforeEach
  void clean() {
    jdbc.update("DELETE FROM focus_sessions");
    jdbc.update("DELETE FROM day_plans");
    jdbc.update("DELETE FROM tasks");
    jdbc.update("UPDATE projects SET parent_id=NULL");
    jdbc.update("DELETE FROM projects");
    clock.value = Instant.parse("2026-11-15T09:00:00Z");
  }

  @Test
  void pauseAndResumeExcludePausedTime() {
    var s = focus.start("personal", "work", null, null, null);
    clock.advance(600);
    s = focus.transition("personal", s.id(), "pause", s.revision());
    assertEquals(600000, s.elapsedMilliseconds());
    clock.advance(300);
    s = focus.transition("personal", s.id(), "resume", s.revision());
    clock.advance(300);
    s = focus.transition("personal", s.id(), "stop", s.revision());
    assertEquals(900000, s.elapsedMilliseconds());
    assertEquals(
        900000,
        stats
            .get(
                "personal",
                LocalDate.parse("2026-11-15"),
                LocalDate.parse("2026-11-15"),
                ZoneOffset.UTC)
            .totalMilliseconds());
    assertNull(focus.state("personal").active());
  }

  @Test
  void breakCompletesAtItsDeadlineAndNeverCountsAsWork() {
    focus.start("personal", "break", null, null, 60);
    clock.advance(90);
    var state = focus.state("personal");
    assertNull(state.active());
    assertEquals(60000, state.sessions().getFirst().elapsedMilliseconds());
    assertEquals(Instant.parse("2026-11-15T09:01:00Z"), state.sessions().getFirst().endedAt());
    assertEquals(
        0,
        stats
            .get(
                "personal",
                LocalDate.parse("2026-11-15"),
                LocalDate.parse("2026-11-15"),
                ZoneOffset.UTC)
            .totalMilliseconds());
  }

  @Test
  void onlyOneActiveSessionAndRevisionsGuardTransitions() {
    var s = focus.start("personal", "work", null, null, null);
    assertThrows(
        org.springframework.web.server.ResponseStatusException.class,
        () -> focus.start("personal", "work", null, null, null));
    focus.transition("personal", s.id(), "pause", 0);
    assertThrows(
        org.springframework.web.server.ResponseStatusException.class,
        () -> focus.transition("personal", s.id(), "resume", 0));
    assertEquals("paused", focus.state("personal").active().state());
    assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM focus_sessions", Integer.class));
  }

  @Test
  void splitsIntervalsAtLocalMidnight() {
    clock.value = Instant.parse("2026-11-15T20:50:00Z");
    var s = focus.start("personal", "work", null, null, null);
    clock.advance(1800);
    focus.transition("personal", s.id(), "stop", 0);
    var result =
        stats.get(
            "personal",
            LocalDate.parse("2026-11-15"),
            LocalDate.parse("2026-11-16"),
            ZoneId.of("Europe/Moscow"));
    assertEquals(600000, result.days().get(0).milliseconds());
    assertEquals(1200000, result.days().get(1).milliseconds());
    assertEquals(1800000, result.totalMilliseconds());
  }

  @Test
  void daylightSavingDayIsTwentyThreeHours() {
    clock.value = Instant.parse("2026-03-08T05:00:00Z");
    var s = focus.start("personal", "work", null, null, null);
    clock.advance(23 * 3600);
    focus.transition("personal", s.id(), "stop", 0);
    assertEquals(
        23 * 3600000L,
        stats
            .get(
                "personal",
                LocalDate.parse("2026-03-08"),
                LocalDate.parse("2026-03-08"),
                ZoneId.of("America/New_York"))
            .totalMilliseconds());
  }

  @Test
  void sessionCorrectionAndDeleteRecomputeStatistics() {
    var s = focus.start("personal", "work", null, null, null);
    clock.advance(600);
    focus.transition("personal", s.id(), "stop", 0);
    s = focus.edit("personal", s.id(), clock.instant().minusSeconds(120), clock.instant(), 1);
    assertEquals(120000, s.elapsedMilliseconds());
    assertEquals(
        120000,
        stats
            .get(
                "personal",
                LocalDate.parse("2026-11-15"),
                LocalDate.parse("2026-11-15"),
                ZoneOffset.UTC)
            .totalMilliseconds());
    focus.delete("personal", s.id(), 2);
    assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM focus_segments", Integer.class));
  }

  @Test
  void taskAndProjectTotalsShareTheSameSession() {
    Project p = projects.create("personal", new ProjectInput("Calculus", "", "blue", false, 0));
    Task t =
        tasks.create(
            "personal", new TaskInput("Problem set", "", null, null, "high", false, 0, 0, p.id()));
    var s = focus.start("personal", "work", t.id(), null, null);
    clock.advance(60);
    focus.transition("personal", s.id(), "stop", 0);
    var state = focus.state("personal");
    assertEquals(60000, state.taskMilliseconds().get(t.id()));
    assertEquals(60000, state.projectMilliseconds().get(p.id()));
    assertEquals(
        60000,
        stats
            .get(
                "personal",
                LocalDate.parse("2026-11-15"),
                LocalDate.parse("2026-11-15"),
                ZoneOffset.UTC)
            .totalMilliseconds());
  }

  @Test
  void autoPlanRanksDueWorkAndDoesNotMutateSavedPlan() {
    Task future =
        tasks.create(
            "personal",
            new TaskInput("Future", "", null, LocalDate.parse("2027-01-01"), "high", false, 0, 0));
    Task due =
        tasks.create(
            "personal",
            new TaskInput("Due", "", null, LocalDate.parse("2026-11-15"), "low", false, 0, 0));
    var date = LocalDate.parse("2026-11-15");
    assertEquals(due.id(), plans.suggest("personal", date, 5).getFirst());
    plans.save("personal", date, -1, List.of(future.id(), due.id()));
    assertEquals(List.of(future.id(), due.id()), plans.get("personal", date).taskIds());
    plans.suggest("personal", date, 5);
    assertEquals(List.of(future.id(), due.id()), plans.get("personal", date).taskIds());
  }

  @Test
  void nestedProjectsRejectCyclesAndHonorArchivedAncestors() {
    Project root = projects.create("personal", new ProjectInput("Study", "", "blue", false, 0));
    Project subject =
        projects.create(
            "personal", new ProjectInput("Calculus", "", "violet", false, 0, root.id()));
    assertEquals(root.id(), subject.parentId());
    assertThrows(
        org.springframework.web.server.ResponseStatusException.class,
        () ->
            projects.update(
                "personal",
                root.id(),
                new ProjectInput("Study", "", "blue", false, 0, subject.id())));
    assertNull(projects.require("personal", root.id()).parentId());
    Task task =
        tasks.create(
            "personal",
            new TaskInput("Homework", "", null, null, "high", false, 0, 0, subject.id()));
    projects.update("personal", root.id(), new ProjectInput("Study", "", "blue", true, 0, null));
    assertThrows(
        org.springframework.web.server.ResponseStatusException.class,
        () -> focus.start("personal", "work", task.id(), null, null));
    assertTrue(plans.suggest("personal", LocalDate.parse("2026-11-15"), 5).isEmpty());
  }
}
