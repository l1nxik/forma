#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run prepare:backend
npm run desktop:build
python3 scripts/package-macos.py
python3 scripts/smoke-backend.py "${FORMA_RELEASE_DIR:-$PWD/release.noindex}/Forma.app/Contents/Resources/backend" --launcher "${FORMA_RELEASE_DIR:-$PWD/release.noindex}/Forma.app/Contents/MacOS/forma-backend"
python3 scripts/package-source.py
