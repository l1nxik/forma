package app.forma.api;

import app.forma.domain.FocusSession;
import app.forma.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/focus")
public class FocusController {
  private final FocusService service;
  private final StatisticsService statistics;

  public FocusController(FocusService service, StatisticsService statistics) {
    this.service = service;
    this.statistics = statistics;
  }

  @GetMapping
  public FocusService.FocusState state(@RequestParam(defaultValue = "personal") String workspace) {
    return service.state(workspace);
  }

  @PostMapping
  public FocusSession start(
      @RequestParam(defaultValue = "personal") String workspace,
      @Valid @RequestBody StartInput input) {
    return service.start(
        workspace, input.kind(), input.taskId(), input.projectId(), input.targetSeconds());
  }

  @PostMapping("/{id}/{action}")
  public FocusSession transition(
      @RequestParam(defaultValue = "personal") String workspace,
      @PathVariable String id,
      @PathVariable String action,
      @Valid @RequestBody Revision input) {
    return service.transition(workspace, id, action, input.revision());
  }

  @PutMapping("/{id}")
  public FocusSession edit(
      @RequestParam(defaultValue = "personal") String workspace,
      @PathVariable String id,
      @Valid @RequestBody EditInput input) {
    return service.edit(workspace, id, input.startedAt(), input.endedAt(), input.revision());
  }

  @DeleteMapping("/{id}")
  public Map<String, Boolean> delete(
      @RequestParam(defaultValue = "personal") String workspace,
      @PathVariable String id,
      @RequestParam long revision) {
    service.delete(workspace, id, revision);
    return Map.of("deleted", true);
  }

  @GetMapping("/statistics")
  public StatisticsService.Statistics stats(
      @RequestParam(defaultValue = "personal") String workspace,
      @RequestParam LocalDate from,
      @RequestParam LocalDate to,
      @RequestParam String zone) {
    return statistics.get(workspace, from, to, ZoneId.of(zone));
  }

  public record StartInput(
      @NotNull @Pattern(regexp = "work|break") String kind,
      String taskId,
      String projectId,
      Integer targetSeconds) {}

  public record Revision(@Min(0) long revision) {}

  public record EditInput(
      @NotNull Instant startedAt, @NotNull Instant endedAt, @Min(0) long revision) {}
}
