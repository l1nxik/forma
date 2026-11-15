package app.forma.domain;

import app.forma.api.StrictLocalDate;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record TaskInput(
    @NotBlank @Size(max = 300) String title,
    @NotNull @Size(max = 20000) String notes,
    @JsonDeserialize(using = StrictLocalDate.class) LocalDate scheduledDate,
    @JsonDeserialize(using = StrictLocalDate.class) LocalDate deadline,
    @NotNull @Pattern(regexp = "none|low|medium|high") String priority,
    boolean completed,
    @Min(0) @Max(10080) int estimateMinutes,
    @Min(0) long revision,
    @Pattern(regexp = "[0-9a-fA-F-]{36}") String projectId) {
  public TaskInput(
      String title,
      String notes,
      LocalDate scheduledDate,
      LocalDate deadline,
      String priority,
      boolean completed,
      int estimateMinutes,
      long revision) {
    this(
        title,
        notes,
        scheduledDate,
        deadline,
        priority,
        completed,
        estimateMinutes,
        revision,
        null);
  }
}
