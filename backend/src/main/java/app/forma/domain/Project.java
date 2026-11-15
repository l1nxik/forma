package app.forma.domain;

import java.time.Instant;

public record Project(
    String id,
    String name,
    String description,
    String color,
    boolean archived,
    Instant createdAt,
    Instant updatedAt,
    long revision,
    String parentId) {}
