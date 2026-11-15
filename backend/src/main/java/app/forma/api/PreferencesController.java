package app.forma.api;

import app.forma.service.PreferencesService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/preferences")
public class PreferencesController {
  private final PreferencesService preferences;

  public PreferencesController(PreferencesService preferences) {
    this.preferences = preferences;
  }

  @GetMapping
  public Map<String, String> get() {
    return preferences.get();
  }

  @PutMapping
  public Map<String, String> update(@RequestBody Map<String, String> input) {
    return preferences.update(input);
  }
}
