package app.forma.service;

import app.forma.domain.Project;
import app.forma.persistence.*;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StatisticsService {
  public record Day(String date, long milliseconds) {}

  public record ProjectTime(String id, String name, String color, long milliseconds) {}

  public record Statistics(
      List<Day> days,
      List<ProjectTime> projects,
      Map<String, Long> tasks,
      long totalMilliseconds,
      int sessionCount) {}

  private final FocusRepository focus;
  private final ProjectRepository projects;
  private final Clock clock;

  public StatisticsService(FocusRepository focus, ProjectRepository projects, Clock clock) {
    this.focus = focus;
    this.projects = projects;
    this.clock = clock;
  }

  public static long overlap(Instant start, Instant end, Instant rangeStart, Instant rangeEnd) {
    Instant clippedStart = start.isAfter(rangeStart) ? start : rangeStart;
    Instant clippedEnd = end.isBefore(rangeEnd) ? end : rangeEnd;
    return clippedEnd.isAfter(clippedStart)
        ? Duration.between(clippedStart, clippedEnd).toMillis()
        : 0;
  }

  public Statistics get(String workspace, LocalDate from, LocalDate to, ZoneId zone) {
    TaskService.workspace(workspace);
    if (to.isBefore(from) || java.time.temporal.ChronoUnit.DAYS.between(from, to) > 365)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "statistics.range");
    Instant now = clock.instant();
    Instant rangeStart = from.atStartOfDay(zone).toInstant();
    Instant rangeEnd = to.plusDays(1).atStartOfDay(zone).toInstant();
    Map<String, Long> dayTotals = new LinkedHashMap<>(),
        projectTotals = new HashMap<>(),
        taskTotals = new HashMap<>();
    Set<String> sessions = new HashSet<>();
    for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1))
      dayTotals.put(day.toString(), 0L);
    for (var interval : focus.workIntervals(workspace)) {
      Instant end = interval.end() == null ? now : interval.end();
      long duration = overlap(interval.start(), end, rangeStart, rangeEnd);
      if (duration <= 0) continue;
      sessions.add(interval.sessionId());
      projectTotals.merge(
          interval.projectId() == null ? "" : interval.projectId(), duration, Long::sum);
      if (interval.taskId() != null) taskTotals.merge(interval.taskId(), duration, Long::sum);
      LocalDate first = interval.start().atZone(zone).toLocalDate();
      if (first.isBefore(from)) first = from;
      LocalDate last = end.atZone(zone).toLocalDate();
      if (last.isAfter(to)) last = to;
      for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
        long milliseconds =
            overlap(
                interval.start(),
                end,
                day.atStartOfDay(zone).toInstant(),
                day.plusDays(1).atStartOfDay(zone).toInstant());
        dayTotals.merge(day.toString(), milliseconds, Long::sum);
      }
    }
    Map<String, Project> byId = new HashMap<>();
    for (Project project : projects.list(workspace)) byId.put(project.id(), project);
    var distribution =
        projectTotals.entrySet().stream()
            .map(
                entry -> {
                  Project project = byId.get(entry.getKey());
                  return new ProjectTime(
                      entry.getKey(),
                      project == null ? "" : project.name(),
                      project == null ? "slate" : project.color(),
                      entry.getValue());
                })
            .sorted(Comparator.comparingLong(ProjectTime::milliseconds).reversed())
            .toList();
    return new Statistics(
        dayTotals.entrySet().stream()
            .map(entry -> new Day(entry.getKey(), entry.getValue()))
            .toList(),
        distribution,
        taskTotals,
        dayTotals.values().stream().mapToLong(Long::longValue).sum(),
        sessions.size());
  }
}
