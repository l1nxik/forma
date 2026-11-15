$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if ($env:OS -ne 'Windows_NT' -or $env:PROCESSOR_ARCHITECTURE -ne 'AMD64') {
    throw 'This script requires Windows x64 and an x64 JDK.'
}
if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to an x64 JDK 25 installation.' }
if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
    throw 'Run in Developer PowerShell for VS 2022 with the x64 C++ tools.'
}

& ./backend/gradlew.bat -p backend test bootJar --no-daemon
if ($LASTEXITCODE -ne 0) { throw 'Backend tests/build failed.' }
$destination = Join-Path $PWD 'src-tauri/resources/backend'
New-Item -ItemType Directory -Force $destination, 'src-tauri/binaries' | Out-Null
Copy-Item 'backend/build.noindex/libs/forma-backend.jar' $destination -Force
$runtime = Join-Path $destination 'runtime'
if (Test-Path $runtime) { Remove-Item $runtime -Recurse -Force }
$modules = (Get-Content 'scripts/runtime-modules.txt' -Raw).Trim()
& "$env:JAVA_HOME/bin/jlink.exe" --add-modules $modules --strip-debug --no-header-files --no-man-pages --output $runtime
if ($LASTEXITCODE -ne 0) { throw 'jlink failed.' }
& cl.exe /nologo /O2 /W4 /MT scripts/sidecar-windows.c /Fosrc-tauri/binaries/sidecar.obj /Fesrc-tauri/binaries/forma-backend-x86_64-pc-windows-msvc.exe /link /SUBSYSTEM:CONSOLE
if ($LASTEXITCODE -ne 0) { throw 'Native backend launcher build failed.' }
