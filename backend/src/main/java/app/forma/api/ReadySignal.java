package app.forma.api;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class ReadySignal {
  @EventListener(ApplicationReadyEvent.class)
  public void ready(ApplicationReadyEvent event) {
    if (!(event.getApplicationContext() instanceof ServletWebServerApplicationContext context))
      return;
    System.out.println("FORMA_READY:" + context.getWebServer().getPort());
    System.out.flush();
  }
}
