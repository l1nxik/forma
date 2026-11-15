package app.forma.service;

import app.forma.domain.*;
import app.forma.persistence.*;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FocusService {
  public record FocusState(
      FocusSession active,
      List<FocusSession> sessions,
      Instant now,
      Map<String, Long> taskMilliseconds,
      Map<String, Long> projectMilliseconds) {}

  private final FocusRepository repository;
  private final TaskRepository tasks;
  private final ProjectService projects;
  private final Clock clock;

  public FocusService(
      FocusRepository repository, TaskRepository tasks, ProjectService projects, Clock clock) {
    this.repository = repository;
    this.tasks = tasks;
    this.projects = projects;
    this.clock = clock;
  }

  private static ResponseStatusException error(HttpStatus status, String code) {
    return new ResponseStatusException(status, code);
  }

  private FocusSession require(String workspace, String id, Instant now) {
    return repository
        .find(workspace, id, now)
        .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "focus.notFound"));
  }

  private void checkRevision(FocusSession session, long revision) {
    if (session.revision() != revision) throw error(HttpStatus.CONFLICT, "conflict");
  }

  // Break deadlines are reconciled from persisted timestamps, including after app restart or sleep.
  private void reconcileBreak(String workspace, Instant now) {
    var active = repository.active(workspace, now);
    if (active.isEmpty()) return;
    FocusSession session = active.get();
    if (!session.kind().equals("break")
        || !session.state().equals("running")
        || session.elapsedMilliseconds() < session.targetSeconds() * 1000L) return;
    long closed =
        repository.segments(session.id()).stream()
            .filter(segment -> segment.end() != null)
            .mapToLong(
                segment -> Math.max(0, Duration.between(segment.start(), segment.end()).toMillis()))
            .sum();
    var open =
        repository.segments(session.id()).stream()
            .filter(segment -> segment.end() == null)
            .findFirst()
            .orElseThrow();
    Instant end = open.start().plusMillis(Math.max(0, session.targetSeconds() * 1000L - closed));
    repository.close(session.id(), end);
    repository.transition(workspace, session, "completed", end);
  }

  @Transactional
  public FocusState state(String workspace) {
    TaskService.workspace(workspace);
    Instant now = clock.instant();
    reconcileBreak(workspace, now);
    Map<String, Long> taskTime = new HashMap<>(), projectTime = new HashMap<>();
    for (var interval : repository.workIntervals(workspace)) {
      long milliseconds =
          Math.max(
              0,
              Duration.between(interval.start(), interval.end() == null ? now : interval.end())
                  .toMillis());
      if (interval.taskId() != null) taskTime.merge(interval.taskId(), milliseconds, Long::sum);
      if (interval.projectId() != null)
        projectTime.merge(interval.projectId(), milliseconds, Long::sum);
    }
    return new FocusState(
        repository.active(workspace, now).orElse(null),
        repository.recent(workspace, now),
        now,
        taskTime,
        projectTime);
  }

  @Transactional
  public FocusSession start(
      String workspace, String kind, String taskId, String projectId, Integer targetSeconds) {
    TaskService.workspace(workspace);
    Instant now = clock.instant();
    reconcileBreak(workspace, now);
    if (repository.active(workspace, now).isPresent())
      throw error(HttpStatus.CONFLICT, "focus.active");
    if (!Set.of("work", "break").contains(kind))
      throw error(HttpStatus.BAD_REQUEST, "focus.invalid");
    String label = "Focus";
    if (kind.equals("break")) {
      if (taskId != null
          || projectId != null
          || targetSeconds == null
          || targetSeconds < 60
          || targetSeconds > 3600) throw error(HttpStatus.BAD_REQUEST, "focus.invalid");
      label = "Break";
    } else {
      targetSeconds = null;
      if (taskId != null) {
        Task task =
            tasks
                .find(workspace, taskId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "task.notFound"));
        if (task.completed()) throw error(HttpStatus.BAD_REQUEST, "focus.completedTask");
        if (projectId != null && !Objects.equals(projectId, task.projectId()))
          throw error(HttpStatus.BAD_REQUEST, "focus.invalid");
        projectId = task.projectId();
        label = task.title();
      } else if (projectId != null) label = projects.require(workspace, projectId).name();
      projects.validateAssignment(workspace, projectId);
    }
    FocusSession session =
        new FocusSession(
            UUID.randomUUID().toString(),
            kind,
            "running",
            taskId,
            projectId,
            label,
            now,
            null,
            targetSeconds,
            0,
            0);
    repository.insert(workspace, session);
    return require(workspace, session.id(), now);
  }

  @Transactional
  public FocusSession transition(String workspace, String id, String action, long revision) {
    TaskService.workspace(workspace);
    Instant now = clock.instant();
    reconcileBreak(workspace, now);
    FocusSession session = require(workspace, id, now);
    checkRevision(session, revision);
    String state;
    switch (action) {
      case "pause" -> {
        if (!session.state().equals("running")) throw error(HttpStatus.CONFLICT, "focus.state");
        repository.close(id, now);
        state = "paused";
      }
      case "resume" -> {
        if (!session.state().equals("paused")) throw error(HttpStatus.CONFLICT, "focus.state");
        repository.open(id, now);
        state = "running";
      }
      case "stop" -> {
        if (session.state().equals("completed")) throw error(HttpStatus.CONFLICT, "focus.state");
        repository.close(id, now);
        state = "completed";
      }
      default -> throw error(HttpStatus.BAD_REQUEST, "focus.invalid");
    }
    Instant end =
        state.equals("completed")
            ? (now.isBefore(session.startedAt()) ? session.startedAt() : now)
            : null;
    if (!repository.transition(workspace, session, state, end))
      throw error(HttpStatus.CONFLICT, "conflict");
    return require(workspace, id, now);
  }

  @Transactional
  public FocusSession edit(String workspace, String id, Instant start, Instant end, long revision) {
    TaskService.workspace(workspace);
    FocusSession session = require(workspace, id, clock.instant());
    checkRevision(session, revision);
    if (!session.state().equals("completed")) throw error(HttpStatus.CONFLICT, "focus.state");
    if (start == null
        || end == null
        || !end.isAfter(start)
        || Duration.between(start, end).compareTo(Duration.ofDays(7)) > 0
        || end.isAfter(clock.instant().plusSeconds(5)))
      throw error(HttpStatus.BAD_REQUEST, "focus.invalidTime");
    if (!repository.edit(workspace, session, start, end))
      throw error(HttpStatus.CONFLICT, "conflict");
    return require(workspace, id, clock.instant());
  }

  @Transactional
  public void delete(String workspace, String id, long revision) {
    TaskService.workspace(workspace);
    FocusSession session = require(workspace, id, clock.instant());
    checkRevision(session, revision);
    if (!repository.delete(workspace, session)) throw error(HttpStatus.CONFLICT, "focus.state");
  }
}
