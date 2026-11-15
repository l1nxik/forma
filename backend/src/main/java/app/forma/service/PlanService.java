package app.forma.service;

import app.forma.domain.*;
import app.forma.persistence.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlanService {
  private final PlanRepository plans;
  private final TaskRepository tasks;
  private final ProjectRepository projects;
  private final ProjectService projectService;

  public PlanService(
      PlanRepository plans,
      TaskRepository tasks,
      ProjectRepository projects,
      ProjectService projectService) {
    this.projectService = projectService;
    this.plans = plans;
    this.tasks = tasks;
    this.projects = projects;
  }

  public DayPlan get(String workspace, LocalDate date) {
    return plans.get(TaskService.workspace(workspace), date);
  }

  @Transactional
  public DayPlan save(
      String workspace, LocalDate date, long expectedRevision, List<String> taskIds) {
    TaskService.workspace(workspace);
    if (taskIds.size() > 500 || new HashSet<>(taskIds).size() != taskIds.size())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "plan.invalid");
    DayPlan current = plans.get(workspace, date);
    if (current.revision() != expectedRevision)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "conflict");
    for (String id : taskIds)
      if (tasks.find(workspace, id).isEmpty())
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "task.notFound");
    plans.replace(workspace, date, current.revision() + 1, taskIds);
    return plans.get(workspace, date);
  }

  public List<String> suggest(String workspace, LocalDate date, int limit) {
    if (limit < 1 || limit > 30)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "plan.invalid");
    Set<String> archived = new HashSet<>();
    for (Project project : projects.list(TaskService.workspace(workspace)))
      if (projectService.archived(workspace, project.id())) archived.add(project.id());
    return rank(
            tasks.list(workspace).stream()
                .filter(task -> !task.completed() && !archived.contains(task.projectId()))
                .toList(),
            date)
        .stream()
        .limit(limit)
        .map(Task::id)
        .toList();
  }

  public static List<Task> rank(List<Task> tasks, LocalDate date) {
    Map<String, Integer> priorities = Map.of("high", 3, "medium", 2, "low", 1, "none", 0);
    return tasks.stream()
        .sorted(
            Comparator.<Task, Boolean>comparing(
                    task -> task.deadline() == null || task.deadline().isAfter(date))
                .thenComparing(
                    Comparator.comparingInt((Task task) -> priorities.get(task.priority()))
                        .reversed())
                .thenComparing(Task::deadline, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(Task::createdAt)
                .thenComparing(Task::id))
        .toList();
  }
}
