#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Darwin || "$(uname -m)" != arm64 ]]; then
  echo "This packaging script currently targets macOS Apple Silicon." >&2; exit 1
fi
FORMA_JDK="${JAVA_HOME:-$(/usr/libexec/java_home)}"
./backend/gradlew -p backend test bootJar
DEST="$PWD/src-tauri/resources/backend"
mkdir -p "$DEST" src-tauri/binaries
cp backend/build.noindex/libs/forma-backend.jar "$DEST/forma-backend.jar"
# Explicit runtime modules for Spring, Tomcat and Xerial; no javac/jlink in the app.
if [[ -d "$DEST/runtime" ]]; then rm -rf "$DEST/runtime"; fi
"$FORMA_JDK/bin/jlink" --add-modules "$(cat scripts/runtime-modules.txt)" --strip-debug --no-header-files --no-man-pages --output "$DEST/runtime"
# jlink preserves read-only legal files; make generated resources overwritable on rebuild.
chmod -R u+w "$DEST/runtime"
clang -O2 -arch arm64 -mmacosx-version-min=12.0 scripts/sidecar.c -o src-tauri/binaries/forma-backend-aarch64-apple-darwin
chmod +x src-tauri/binaries/forma-backend-aarch64-apple-darwin
