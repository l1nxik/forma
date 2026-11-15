package app.forma.domain;

import java.time.*;

public record Task(
    String id,
    String title,
    String notes,
    LocalDate scheduledDate,
    LocalDate deadline,
    String priority,
    boolean completed,
    int estimateMinutes,
    Instant createdAt,
    Instant updatedAt,
    Instant completedAt,
    long revision,
    String projectId) {}
