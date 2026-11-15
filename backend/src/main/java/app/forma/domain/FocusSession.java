package app.forma.domain;

import java.time.Instant;

public record FocusSession(
    String id,
    String kind,
    String state,
    String taskId,
    String projectId,
    String label,
    Instant startedAt,
    Instant endedAt,
    Integer targetSeconds,
    long revision,
    long elapsedMilliseconds) {}
