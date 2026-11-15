package app.forma.persistence;

import app.forma.domain.Project;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

@Repository
public class ProjectRepository {
  private final JdbcTemplate jdbc;
  private final RowMapper<Project> mapper =
      (r, n) ->
          new Project(
              r.getString("id"),
              r.getString("name"),
              r.getString("description"),
              r.getString("color"),
              r.getBoolean("archived"),
              Instant.parse(r.getString("created_at")),
              Instant.parse(r.getString("updated_at")),
              r.getLong("revision"),
              r.getString("parent_id"));

  public ProjectRepository(JdbcTemplate jdbc, Migrations migrations) {
    this.jdbc = jdbc;
  }

  public List<Project> list(String workspace) {
    return jdbc.query(
        "SELECT * FROM projects WHERE workspace=? ORDER BY archived,created_at,id",
        mapper,
        workspace);
  }

  public Optional<Project> find(String workspace, String id) {
    return jdbc
        .query("SELECT * FROM projects WHERE workspace=? AND id=?", mapper, workspace, id)
        .stream()
        .findFirst();
  }

  public void insert(String workspace, Project p) {
    jdbc.update(
        "INSERT INTO"
            + " projects(id,workspace,name,description,color,archived,created_at,updated_at,revision,parent_id)"
            + " VALUES(?,?,?,?,?,?,?,?,?,?)",
        p.id(),
        workspace,
        p.name(),
        p.description(),
        p.color(),
        p.archived(),
        p.createdAt().toString(),
        p.updatedAt().toString(),
        p.revision(),
        p.parentId());
  }

  public boolean update(String workspace, Project p, long expected) {
    return jdbc.update(
            "UPDATE projects SET"
                + " name=?,description=?,color=?,archived=?,updated_at=?,revision=?,parent_id=?"
                + " WHERE workspace=? AND id=? AND revision=?",
            p.name(),
            p.description(),
            p.color(),
            p.archived(),
            p.updatedAt().toString(),
            p.revision(),
            p.parentId(),
            workspace,
            p.id(),
            expected)
        == 1;
  }
}
