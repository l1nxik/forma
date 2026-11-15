package app.forma.api;

import java.util.Map;
import org.slf4j.*;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
  private static final Logger log = LoggerFactory.getLogger(ApiErrors.class);

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> status(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode())
        .body(
            Map.of(
                "code",
                e.getReason() == null ? "request.failed" : e.getReason(),
                "message",
                e.getReason() == null ? "request.failed" : e.getReason()));
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    HttpMessageNotReadableException.class,
    IllegalArgumentException.class,
    java.time.DateTimeException.class
  })
  ResponseEntity<?> invalid(Exception e) {
    return ResponseEntity.badRequest()
        .body(Map.of("code", "validation", "message", "Check the title, dates and field values."));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<?> unexpected(Exception e) {
    log.error("API operation failed", e);
    return ResponseEntity.internalServerError()
        .body(Map.of("message", "Could not save changes. Please try again."));
  }
}
