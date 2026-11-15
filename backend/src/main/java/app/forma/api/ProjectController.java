package app.forma.api;

import app.forma.domain.*;
import app.forma.service.ProjectService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
  private final ProjectService service;

  public ProjectController(ProjectService service) {
    this.service = service;
  }

  @GetMapping
  public List<Project> list(@RequestParam(defaultValue = "personal") String workspace) {
    return service.list(workspace);
  }

  @PostMapping
  public Project create(
      @RequestParam(defaultValue = "personal") String workspace,
      @Valid @RequestBody ProjectInput input) {
    return service.create(workspace, input);
  }

  @PutMapping("/{id}")
  public Project update(
      @RequestParam(defaultValue = "personal") String workspace,
      @PathVariable String id,
      @Valid @RequestBody ProjectInput input) {
    return service.update(workspace, id, input);
  }
}
