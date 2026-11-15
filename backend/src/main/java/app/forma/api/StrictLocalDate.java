package app.forma.api;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.*;
import java.io.IOException;
import java.time.LocalDate;

public class StrictLocalDate extends JsonDeserializer<LocalDate> {
  @Override
  public LocalDate deserialize(JsonParser parser, DeserializationContext context)
      throws IOException {
    try {
      return LocalDate.parse(parser.getText());
    } catch (java.time.format.DateTimeParseException error) {
      throw context.weirdStringException(
          parser.getText(), LocalDate.class, "Expected a valid ISO calendar date");
    }
  }
}
