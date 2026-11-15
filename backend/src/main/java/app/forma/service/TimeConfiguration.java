package app.forma.service;

import java.time.Clock;
import org.springframework.context.annotation.*;

@Configuration
public class TimeConfiguration {
  @Bean
  public Clock clock() {
    return Clock.systemUTC();
  }
}
