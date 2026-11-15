# Preparing a release

The repository can be published independently of binary releases. The workflow builds packages and uploads Actions artifacts; it never creates or publishes a GitHub Release.

## First push

Create an empty GitHub repository without generated README, license, or gitignore files. The local repository already contains those files. Review the staged files and use your own Git identity:

```sh
git status
git diff --cached --stat
git commit -m "Initial Forma preview"
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

Repository description:

> A local-first desktop planner for focused study, daily planning, and time tracking.

Suggested topics: `productivity`, `task-manager`, `study`, `focus-timer`, `local-first`, `tauri`, `react`, `spring-boot`, `sqlite`.

## Build packages

After the push, open **Actions → Desktop builds**. It runs frontend and Java tests, formatting checks, native packaging, and the backend smoke test on macOS arm64 and Windows x64. Download the two platform artifacts after both jobs succeed. You can also run the workflow manually.

For a local build, follow the prerequisites in README and run `npm run package:desktop`. Outputs are kept in `release.noindex/`; they are ignored by Git. Both platforms include their own `SHA256SUMS.txt`. If combining artifacts into a single release, recompute one checksum file for the final set of downloadable files.

## Before publishing binaries

- Install on a separate test account/device and verify startup, task creation/edit/completion, nested projects, plan ordering, focus restart recovery, themes, and both languages.
- On Windows, test a non-ASCII username/path, a clean machine with no Java, WebView2 installation, uninstall/reinstall with data retained, and backend process cleanup after closing the app.
- On macOS, check the downloaded ZIP on another Mac, including the Gatekeeper experience. An ad-hoc signature is not Developer ID signing/notarization.
- Review third-party license notices for the exact packaged dependency versions, including transitive dependencies. Keep Java's `runtime/legal` directory intact. Include required notices and any corresponding-source obligations before distributing binaries.
- Confirm no database, logs, screenshots of personal tasks, signing material, or test data is included. Review the package footprint against the 450 MB limit.
- Keep the platform status and verification record honest. A successful compile or backend smoke test does not replace installation/UI testing.

Create a **draft prerelease**, attach the verified packages and checksums, and describe remaining limitations. Publish it manually once reviewed. No signing credentials or write-capable GitHub tokens are required by the current build workflow.
