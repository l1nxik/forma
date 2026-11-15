package app.forma.api;

import app.forma.domain.*;
import app.forma.service.TaskService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class TaskController {
  private final TaskService service;

  public TaskController(TaskService service) {
    this.service = service;
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ready", "version", "0.2.0");
  }

  @GetMapping("/tasks")
  public List<Task> list(@RequestParam(defaultValue = "personal") String workspace) {
    return service.list(workspace);
  }

  @PostMapping("/tasks")
  public Task create(
      @RequestParam(defaultValue = "personal") String workspace,
      @Valid @RequestBody TaskInput input) {
    return service.create(workspace, input);
  }

  @PutMapping("/tasks/{id}")
  public Task update(
      @RequestParam(defaultValue = "personal") String workspace,
      @PathVariable String id,
      @Valid @RequestBody TaskInput input) {
    return service.update(workspace, id, input);
  }

  @DeleteMapping("/tasks/{id}")
  public Map<String, Boolean> delete(
      @RequestParam(defaultValue = "personal") String workspace,
      @PathVariable String id,
      @RequestParam long revision) {
    service.delete(workspace, id, revision);
    return Map.of("deleted", true);
  }
}
