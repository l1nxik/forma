package app.forma.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class LocalApiFilter extends OncePerRequestFilter {
  private final byte[] token;

  public LocalApiFilter(@Value("${FORMA_API_TOKEN}") String token) {
    this.token = token.getBytes(StandardCharsets.UTF_8);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String supplied = req.getHeader("X-Forma-Token");
    String host = req.getHeader("Host");
    if (!"127.0.0.1".equals(req.getRemoteAddr())
        || host == null
        || !host.matches("127\\.0\\.0\\.1:[0-9]+")
        || req.getHeader("Origin") != null
        || supplied == null
        || !MessageDigest.isEqual(token, supplied.getBytes(StandardCharsets.UTF_8))) {
      res.setStatus(403);
      res.setContentType("application/json");
      res.getWriter().write("{\"message\":\"Access denied\"}");
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.getContentLengthLong() > 65536) {
      res.setStatus(413);
      return;
    }
    chain.doFilter(req, res);
  }
}
