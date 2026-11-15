package app.forma.domain;

import jakarta.validation.constraints.*;

public record ProjectInput(
    @NotBlank @Size(max = 120) String name,
    @NotNull @Size(max = 10000) String description,
    @NotNull @Pattern(regexp = "blue|violet|green|amber|rose|teal|slate") String color,
    boolean archived,
    @Min(0) long revision,
    @Pattern(regexp = "[0-9a-fA-F-]{36}") String parentId) {
  public ProjectInput(
      String name, String description, String color, boolean archived, long revision) {
    this(name, description, color, archived, revision, null);
  }
}
