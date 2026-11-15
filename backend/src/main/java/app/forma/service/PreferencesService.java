package app.forma.service;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PreferencesService {
  private static final Set<String> THEMES =
      Set.of(
          "system",
          "forma-light",
          "forma-dark",
          "light",
          "dark",
          "light-modern",
          "dark-modern",
          "light-plus",
          "dark-plus",
          "quiet-light",
          "solarized-light",
          "solarized-dark",
          "monokai",
          "monokai-dimmed",
          "abyss",
          "kimbie-dark",
          "red",
          "tomorrow-night-blue",
          "high-contrast-dark",
          "high-contrast-light");
  private final JdbcTemplate jdbc;

  public PreferencesService(JdbcTemplate jdbc, app.forma.persistence.Migrations migrations) {
    this.jdbc = jdbc;
  }

  public Map<String, String> get() {
    Map<String, String> result =
        new HashMap<>(
            Map.of(
                "theme",
                "system",
                "language",
                "en",
                "dailyGoalMinutes",
                "120",
                "breakMinutes",
                "5",
                "sidebarCollapsed",
                "false",
                "glassTransparency",
                "0"));
    jdbc.query(
        "SELECT key,value FROM preferences",
        (org.springframework.jdbc.core.RowCallbackHandler)
            r -> result.put(r.getString(1), r.getString(2)));
    return result;
  }

  @Transactional
  public Map<String, String> update(Map<String, String> input) {
    if (input.isEmpty() || input.size() > 6) invalid();
    for (var entry : input.entrySet()) {
      String value = entry.getValue();
      if (value == null) invalid();
      switch (entry.getKey()) {
        case "theme" -> {
          if (!THEMES.contains(value)) invalid();
        }
        case "sidebarCollapsed" -> {
          if (!Set.of("true", "false").contains(value)) invalid();
        }
        case "language" -> {
          if (!Set.of("en", "ru").contains(value)) invalid();
        }
        case "glassTransparency" -> {
          if (!integer(value, 0, 80)) invalid();
        }
        case "dailyGoalMinutes" -> {
          if (!integer(value, 0, 1440)) invalid();
        }
        case "breakMinutes" -> {
          if (!integer(value, 1, 60)) invalid();
        }
        default -> invalid();
      }
    }
    for (var entry : input.entrySet())
      jdbc.update(
          "INSERT INTO preferences(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET"
              + " value=excluded.value",
          entry.getKey(),
          entry.getValue());
    return get();
  }

  private boolean integer(String value, int min, int max) {
    try {
      int number = Integer.parseInt(value);
      return number >= min && number <= max;
    } catch (NumberFormatException error) {
      return false;
    }
  }

  private void invalid() {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "settings.invalid");
  }
}
