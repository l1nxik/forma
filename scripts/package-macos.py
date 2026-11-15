#!/usr/bin/env python3
"""Sign the bundled runtime inside-out and publish one canonical macOS app."""

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

PROJECT = Path(__file__).resolve().parent.parent
GENERATED_BUNDLES = PROJECT / "src-tauri/target.noindex/release/bundle/macos"
LSREGISTER = Path(
    "/System/Library/Frameworks/CoreServices.framework/Frameworks/"
    "LaunchServices.framework/Support/lsregister"
)
MACH_O_HEADERS = {
    bytes.fromhex(value)
    for value in ("feedface", "cefaedfe", "feedfacf", "cffaedfe", "cafebabe", "bebafeca")
}
MAX_APP_BYTES = 450_000_000


def run(*arguments):
    subprocess.run([str(argument) for argument in arguments], check=True)


def unregister(app):
    if LSREGISTER.exists():
        subprocess.run([str(LSREGISTER), "-u", str(app)], check=False, capture_output=True)


def sign(app):
    runtime = app / "Contents/Resources/backend/runtime"
    for path in sorted(runtime.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        with path.open("rb") as stream:
            is_executable = stream.read(4) in MACH_O_HEADERS
        if is_executable:
            run("codesign", "--force", "--sign", "-", path)
    run("codesign", "--force", "--sign", "-", app / "Contents/MacOS/forma-backend")
    run("codesign", "--force", "--sign", "-", app)
    run("codesign", "--verify", "--deep", "--strict", app)


def package(source, output, create_zip):
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="forma-package-") as scratch:
        staged = Path(scratch) / "Forma.app"
        run("ditto", source, staged)
        sign(staged)
        size = sum(
            path.stat().st_size
            for path in staged.rglob("*")
            if path.is_file() and not path.is_symlink()
        )
        if size > MAX_APP_BYTES:
            raise RuntimeError(f"App exceeds the 450 MB limit: {size} bytes")
        destination = output / "Forma.app"
        if destination.exists():
            unregister(destination)
            shutil.rmtree(destination)
        run("ditto", staged, destination)
        run("codesign", "--verify", "--deep", "--strict", destination)
        if create_zip:
            archive = Path(scratch) / "Forma-macos-arm64.zip"
            run("ditto", "-c", "-k", "--sequesterRsrc", "--keepParent", destination, archive)
            shutil.copy2(archive, output / archive.name)
        print(f"Installed application size: {size / 1_000_000:.2f} MB")
        print(f"Packaged: {destination}")

    # These are reproducible build products. Keep caches, but prevent Spotlight
    # from registering every intermediate app as another installed Forma.
    if source.resolve().parent == GENERATED_BUNDLES.resolve():
        for generated in GENERATED_BUNDLES.glob("Forma*.app"):
            unregister(generated)
            shutil.rmtree(generated)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=GENERATED_BUNDLES / "Forma.app")
    parser.add_argument("--no-zip", action="store_true")
    arguments = parser.parse_args()
    output = Path(os.environ.get("FORMA_RELEASE_DIR", str(PROJECT / "release.noindex"))).resolve()
    package(arguments.source, output, create_zip=not arguments.no_zip)


if __name__ == "__main__":
    main()
