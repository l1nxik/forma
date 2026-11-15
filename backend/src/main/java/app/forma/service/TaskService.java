package app.forma.service;

import app.forma.domain.*;
import app.forma.persistence.TaskRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TaskService {
  private final TaskRepository repository;

  private final ProjectService projects;
  private final Clock clock;

  public TaskService(TaskRepository repository, ProjectService projects, Clock clock) {
    this.clock = clock;
    this.projects = projects;
    this.repository = repository;
  }

  public static String workspace(String value) {
    if (!Set.of("personal", "demo").contains(value))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "workspace.invalid");
    return value;
  }

  public List<Task> list(String workspace) {
    return repository.list(workspace(workspace));
  }

  private Task find(String workspace, String id) {
    return repository
        .find(workspace(workspace), id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task.notFound"));
  }

  @Transactional
  public Task create(String workspace, TaskInput input) {
    projects.validateAssignment(workspace, input.projectId());
    Instant now = clock.instant();
    Task task =
        new Task(
            UUID.randomUUID().toString(),
            input.title().strip(),
            input.notes(),
            input.scheduledDate(),
            input.deadline(),
            input.priority(),
            input.completed(),
            input.estimateMinutes(),
            now,
            now,
            input.completed() ? now : null,
            0,
            input.projectId());
    repository.insert(workspace(workspace), task);
    repository.history(task.id(), task.completed(), now);
    return task;
  }

  @Transactional
  public Task update(String workspace, String id, TaskInput input) {
    Task previous = find(workspace, id);
    if (!Objects.equals(previous.projectId(), input.projectId()))
      projects.validateAssignment(workspace, input.projectId());
    Instant now = clock.instant();
    Instant completedAt =
        input.completed() ? (previous.completed() ? previous.completedAt() : now) : null;
    Task task =
        new Task(
            id,
            input.title().strip(),
            input.notes(),
            input.scheduledDate(),
            input.deadline(),
            input.priority(),
            input.completed(),
            input.estimateMinutes(),
            previous.createdAt(),
            now,
            completedAt,
            previous.revision() + 1,
            input.projectId());
    if (!repository.update(workspace, task, input.revision()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "conflict");
    if (previous.completed() != task.completed()) repository.history(id, task.completed(), now);
    return task;
  }

  @Transactional
  public void delete(String workspace, String id, long revision) {
    find(workspace, id);
    if (!repository.delete(workspace, id, revision))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "conflict");
  }
}
