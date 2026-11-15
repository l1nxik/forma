package app.forma;

import java.nio.file.*;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FormaApplication {
  public static void main(String[] args) throws Exception {
    String token = System.getenv("FORMA_API_TOKEN");
    if (token == null || token.length() < 32)
      throw new IllegalStateException("A private API token is required");
    String data = System.getenv("FORMA_DATA_DIR");
    if (data == null || data.isBlank())
      throw new IllegalStateException("A data directory is required");
    Path directory = Files.createDirectories(Path.of(data));
    try {
      Files.setPosixFilePermissions(
          directory, java.nio.file.attribute.PosixFilePermissions.fromString("rwx------"));
    } catch (UnsupportedOperationException ignored) {
      /* Windows uses inherited ACLs. */
    }
    var context = SpringApplication.run(FormaApplication.class, args);
    if ("1".equals(System.getenv("FORMA_PARENT_WATCH"))) {
      Thread.ofPlatform()
          .daemon()
          .name("desktop-parent-watch")
          .start(
              () -> {
                try {
                  while (System.in.read() != -1) {}
                } catch (java.io.IOException ignored) {
                }
                SpringApplication.exit(context);
                System.exit(0);
              });
    }
  }
}
