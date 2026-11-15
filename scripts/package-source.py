#!/usr/bin/env python3
"""Export the editable source, without build caches, runtimes or personal data."""
import os
import subprocess
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

PROJECT = Path(__file__).resolve().parent.parent
OUTPUT = Path(os.environ.get("FORMA_RELEASE_DIR", str(PROJECT / "release.noindex"))).resolve()


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    archive = OUTPUT / "Forma-source.zip"
    # Share Git's ignore rules instead of maintaining a second exclusion list.
    # GitHub checkouts contain only tracked source; local exports also include
    # eligible changes that have not yet been staged.
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=PROJECT, check=True, capture_output=True,
    )
    names = sorted(set(os.fsdecode(name) for name in result.stdout.split(b"\0") if name))
    with ZipFile(archive, "w", ZIP_DEFLATED, compresslevel=9) as bundle:
        for name in names:
            path = PROJECT / name
            if path.is_file() and not path.is_symlink():
                bundle.write(path, Path("forma") / name)
    artifacts = sorted({archive, *OUTPUT.glob("Forma-macos-*.zip"), *OUTPUT.glob("Forma_*_x64-setup.exe")})
    checksums = [f"{sha256(path.read_bytes()).hexdigest()}  {path.name}" for path in artifacts]
    (OUTPUT / "SHA256SUMS.txt").write_text("\n".join(checksums) + "\n")
    print(f"Packaged source: {archive}")


if __name__ == "__main__":
    main()
