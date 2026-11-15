package app.forma.service;

import app.forma.domain.*;
import app.forma.persistence.ProjectRepository;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectService {
  private final ProjectRepository repository;
  private final java.time.Clock clock;

  public ProjectService(ProjectRepository repository, java.time.Clock clock) {
    this.clock = clock;
    this.repository = repository;
  }

  public List<Project> list(String workspace) {
    return repository.list(TaskService.workspace(workspace));
  }

  public Project require(String workspace, String id) {
    return repository
        .find(TaskService.workspace(workspace), id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "project.notFound"));
  }

  public boolean archived(String workspace, String id) {
    Set<String> visited = new HashSet<>();
    String current = id;
    while (current != null) {
      if (!visited.add(current))
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "project.cycle");
      Project project = require(workspace, current);
      if (project.archived()) return true;
      current = project.parentId();
    }
    return false;
  }

  public void validateAssignment(String workspace, String id) {
    if (id != null && archived(workspace, id))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "project.archived");
  }

  private void validateParent(String workspace, String id, String parentId) {
    if (parentId == null) return;
    validateAssignment(workspace, parentId);
    Set<String> visited = new HashSet<>();
    String current = parentId;
    while (current != null) {
      if (current.equals(id) || !visited.add(current))
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "project.cycle");
      current = require(workspace, current).parentId();
    }
  }

  @Transactional
  public Project create(String workspace, ProjectInput input) {
    validateParent(workspace, null, input.parentId());
    Instant now = clock.instant();
    Project project =
        new Project(
            UUID.randomUUID().toString(),
            input.name().strip(),
            input.description(),
            input.color(),
            input.archived(),
            now,
            now,
            0,
            input.parentId());
    repository.insert(TaskService.workspace(workspace), project);
    return project;
  }

  @Transactional
  public Project update(String workspace, String id, ProjectInput input) {
    Project previous = require(workspace, id);
    if (!Objects.equals(previous.parentId(), input.parentId()))
      validateParent(workspace, id, input.parentId());
    Project project =
        new Project(
            id,
            input.name().strip(),
            input.description(),
            input.color(),
            input.archived(),
            previous.createdAt(),
            clock.instant(),
            previous.revision() + 1,
            input.parentId());
    if (!repository.update(workspace, project, input.revision()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "conflict");
    return project;
  }
}
