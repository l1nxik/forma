package app.forma.api;

import app.forma.service.*;
import java.time.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workspace")
public class WorkspaceController {
  private final TaskService tasks;
  private final ProjectService projects;
  private final PlanService plans;
  private final FocusService focus;
  private final StatisticsService statistics;
  private final PreferencesService preferences;
  private final Clock clock;

  public WorkspaceController(
      TaskService tasks,
      ProjectService projects,
      PlanService plans,
      FocusService focus,
      StatisticsService statistics,
      PreferencesService preferences,
      Clock clock) {
    this.tasks = tasks;
    this.projects = projects;
    this.plans = plans;
    this.focus = focus;
    this.statistics = statistics;
    this.preferences = preferences;
    this.clock = clock;
  }

  @GetMapping
  public Map<String, Object> get(
      @RequestParam(defaultValue = "personal") String workspace,
      @RequestParam LocalDate date,
      @RequestParam String zone) {
    ZoneId timezone = ZoneId.of(zone);
    LocalDate today = LocalDate.now(clock.withZone(timezone));
    return Map.of(
        "tasks",
        tasks.list(workspace),
        "projects",
        projects.list(workspace),
        "plan",
        plans.get(workspace, date),
        "focus",
        focus.state(workspace),
        "preferences",
        preferences.get(),
        "dayStatistics",
        statistics.get(workspace, today, today, timezone));
  }
}
