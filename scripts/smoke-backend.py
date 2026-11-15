#!/usr/bin/env python3
"""Exercise the packaged Java runtime with disposable SQLite, never user data."""

from contextlib import closing, contextmanager
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import queue
import secrets
import sqlite3
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request


class Api:
    def __init__(self, port, token):
        self.base = f"http://127.0.0.1:{port}/api"
        self.token = token
        self.http = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def call(self, method, path, body=None, auth=True):
        headers = {"Content-Type": "application/json"}
        if auth:
            headers["X-Forma-Token"] = self.token
        request = urllib.request.Request(
            self.base + path,
            data=None if body is None else json.dumps(body).encode(),
            method=method,
            headers=headers,
        )
        with self.http.open(request, timeout=10) as response:
            return json.load(response)


@contextmanager
def running_backend(home, directory, token, launcher=None):
    environment = dict(
        os.environ,
        FORMA_API_TOKEN=token,
        FORMA_DATA_DIR=str(directory),
        FORMA_PARENT_WATCH="1",
        FORMA_BACKEND_HOME=str(home),
    )
    java = home / "runtime/bin" / ("java.exe" if os.name == "nt" else "java")
    command = [str(launcher)] if launcher else [
        str(java), "-Xms32m", "-Xmx256m", "-XX:+UseSerialGC",
        "--enable-native-access=ALL-UNNAMED", "-jar", str(home / "forma-backend.jar")]
    process = subprocess.Popen(
        command,
        env=environment,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    lines = queue.Queue()

    def read_output():
        for line in process.stdout:
            lines.put(line)
        lines.put(None)

    threading.Thread(target=read_output, daemon=True).start()
    deadline = time.monotonic() + 45
    try:
        while True:
            try:
                line = lines.get(timeout=max(0, deadline - time.monotonic()))
            except queue.Empty as error:
                raise RuntimeError("Packaged backend startup timed out") from error
            if line is None:
                raise RuntimeError("Packaged Java exited before readiness")
            if line.startswith("FORMA_READY:"):
                yield Api(int(line.partition(":")[2].strip()), token)
                break
    finally:
        process.stdin.close()
        try:
            code = process.wait(timeout=8)
        except subprocess.TimeoutExpired as error:
            process.kill()
            process.wait()
            raise AssertionError("Parent EOF did not stop Java") from error
        finally:
            process.stdout.close()
        assert code == 0, f"Unexpected backend exit {code}"


def verify(home, directory, launcher=None):
    token = secrets.token_hex(32)
    today = dt.datetime.now(dt.timezone.utc).date()
    statistics_path = f"/focus/statistics?from={today}&to={today}&zone=UTC"
    with running_backend(home, directory, token, launcher) as api:
        assert api.call("GET", "/tasks") == []
        try:
            api.call("GET", "/tasks", auth=False)
            raise AssertionError("Unauthenticated request succeeded")
        except urllib.error.HTTPError as error:
            assert error.code == 403
        root = api.call("POST", "/projects", {
            "name": "Study", "description": "", "color": "blue", "archived": False,
            "revision": 0,
        })
        subject = api.call("POST", "/projects", {
            "name": "Calculus", "description": "", "color": "violet", "archived": False,
            "revision": 0, "parentId": root["id"],
        })
        task = api.call("POST", "/tasks", {
            "title": "Restart persistence ✓", "notes": "Created by packaged Java",
            "deadline": str(today + dt.timedelta(days=5)), "priority": "high",
            "completed": False, "estimateMinutes": 0, "revision": 0,
            "projectId": subject["id"],
        })
        api.call("PUT", f"/plans/{today}", {"revision": -1, "taskIds": [task["id"]]})
        session = api.call("POST", "/focus", {"kind": "work", "taskId": task["id"]})
        time.sleep(0.2)

    # Restart while work is running, rather than testing persistence only at rest.
    with running_backend(home, directory, token, launcher) as api:
        tasks = api.call("GET", "/tasks")
        assert len(tasks) == 1 and tasks[0]["id"] == task["id"]
        assert tasks[0]["scheduledDate"] is None
        assert api.call("GET", f"/plans/{today}")["taskIds"] == [task["id"]]
        projects = api.call("GET", "/projects")
        assert any(project["id"] == subject["id"] and project["parentId"] == root["id"]
                   for project in projects)
        active = api.call("GET", "/focus")["active"]
        assert active["id"] == session["id"] and active["elapsedMilliseconds"] >= 200
        paused = api.call("POST", f"/focus/{active['id']}/pause", {"revision": active["revision"]})
        time.sleep(0.1)
        assert api.call("GET", "/focus")["active"]["elapsedMilliseconds"] == paused["elapsedMilliseconds"]
        running = api.call("POST", f"/focus/{paused['id']}/resume", {"revision": paused["revision"]})
        time.sleep(0.1)
        finished = api.call("POST", f"/focus/{running['id']}/stop", {"revision": running["revision"]})
        assert finished["state"] == "completed"
        statistics = api.call("GET", statistics_path)
        assert statistics["totalMilliseconds"] == finished["elapsedMilliseconds"]
        assert statistics["tasks"][task["id"]] == finished["elapsedMilliseconds"]
        rest = api.call("POST", "/focus", {"kind": "break", "targetSeconds": 60})
        api.call("POST", f"/focus/{rest['id']}/stop", {"revision": 0})
        assert api.call("GET", statistics_path)["totalMilliseconds"] == statistics["totalMilliseconds"]
        api.call("PUT", "/preferences", {"glassTransparency": "40"})
        assert api.call("GET", "/preferences")["glassTransparency"] == "40"
        with closing(sqlite3.connect(directory / "forma.sqlite")) as database:
            assert database.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
            assert database.execute("SELECT count(*) FROM schema_migrations").fetchone()[0] == 3
        snapshots = list((directory / "Backups").glob("*.sqlite"))
        assert snapshots
        with closing(sqlite3.connect(snapshots[0])) as backup:
            assert backup.execute("SELECT count(*) FROM tasks").fetchone()[0] == 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("home", nargs="?", type=Path, default=Path("src-tauri/resources/backend"))
    parser.add_argument("--launcher", type=Path)
    arguments = parser.parse_args()
    home = arguments.home.resolve()
    launcher = arguments.launcher.resolve() if arguments.launcher else None
    with tempfile.TemporaryDirectory(prefix="forma-smoke-") as scratch:
        verify(home, Path(scratch), launcher)
    print("PASS: bundled Java, auth, hierarchy, plan, Focus recovery, pause/resume, "
          "statistics, preferences, backup and EOF shutdown")


if __name__ == "__main__":
    main()
