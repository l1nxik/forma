package app.forma.domain;

import java.time.LocalDate;
import java.util.List;

public record DayPlan(LocalDate date, boolean exists, long revision, List<String> taskIds) {}
