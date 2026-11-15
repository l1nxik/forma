# Third-party notices

The [MIT License](LICENSE) applies to Forma's own source code. It does not replace licenses of dependencies or of the bundled Java runtime.

## Theme palettes

The VS Code palettes are derived from Microsoft Visual Studio Code at commit `d03edc4b18d687c45af067195bad9544b5b07475`. The MIT copyright and permission notice is retained in [licenses/VSCode-MIT.txt](licenses/VSCode-MIT.txt). This does not imply endorsement by Microsoft.

## Dependency sources

Exact resolved versions are recorded in `package-lock.json`, `src-tauri/Cargo.lock`, and `backend/gradle.lockfile`. Principal upstream projects include:

| Component                      | Upstream                                       |
| ------------------------------ | ---------------------------------------------- |
| React                          | https://github.com/facebook/react              |
| Tauri                          | https://github.com/tauri-apps/tauri            |
| Motion                         | https://github.com/motiondivision/motion       |
| Lucide                         | https://github.com/lucide-icons/lucide         |
| Spring Boot / Spring Framework | https://github.com/spring-projects             |
| Xerial SQLite JDBC             | https://github.com/xerial/sqlite-jdbc          |
| Eclipse Temurin / OpenJDK      | https://adoptium.net/ and https://openjdk.org/ |

Other dependencies have their own notices. Source archives and installed packages contain upstream license files; Java dependency JARs also contain license/notice metadata where supplied by their publishers.

## Bundled Java

Packaging builds a reduced runtime from the selected local JDK using `jlink`. CI selects Eclipse Temurin 25. Temurin/OpenJDK is distributed under GPLv2 with the Classpath Exception and includes additional third-party notices. The generated `runtime/legal/` directory is retained in the application; do not remove it. If using a different JDK, review that vendor's redistribution terms.

This file is a source-project attribution overview, not a complete transitive license inventory for a binary release. Before publishing binaries, audit the exact packaged versions and distribute all required license/notice text and fulfill applicable source obligations. See the [release checklist](docs/releasing.md).
