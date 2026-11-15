package app.forma.api;

import app.forma.domain.DayPlan;
import app.forma.service.PlanService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/plans/{date}")
public class PlanController {
  private final PlanService service;

  public PlanController(PlanService service) {
    this.service = service;
  }

  @GetMapping
  public DayPlan get(
      @RequestParam(defaultValue = "personal") String workspace, @PathVariable LocalDate date) {
    return service.get(workspace, date);
  }

  @PutMapping
  public DayPlan save(
      @RequestParam(defaultValue = "personal") String workspace,
      @PathVariable LocalDate date,
      @Valid @RequestBody PlanInput input) {
    return service.save(workspace, date, input.revision(), input.taskIds());
  }

  @GetMapping("/suggestions")
  public List<String> suggestions(
      @RequestParam(defaultValue = "personal") String workspace,
      @PathVariable LocalDate date,
      @RequestParam(defaultValue = "5") int limit) {
    return service.suggest(workspace, date, limit);
  }

  public record PlanInput(
      @Min(-1) long revision, @NotNull @Size(max = 500) List<@NotBlank String> taskIds) {}
}
