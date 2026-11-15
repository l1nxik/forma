$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
& "$PSScriptRoot/prepare-backend.ps1"
& python scripts/smoke-backend.py src-tauri/resources/backend --launcher src-tauri/binaries/forma-backend-x86_64-pc-windows-msvc.exe
if ($LASTEXITCODE -ne 0) { throw 'Packaged backend smoke test failed.' }
& npm.cmd run desktop:build
if ($LASTEXITCODE -ne 0) { throw 'Windows app build failed.' }

$output = if ($env:FORMA_RELEASE_DIR) { $env:FORMA_RELEASE_DIR } else { Join-Path $PWD 'release.noindex' }
New-Item -ItemType Directory -Force $output | Out-Null
$installers = @(Get-ChildItem 'src-tauri/target.noindex/release/bundle/nsis/*_x64-setup.exe')
if ($installers.Count -ne 1) { throw 'Expected one x64 NSIS installer.' }
# Check the unpacked payload, rather than only the compressed installer size.
$resources = (Get-ChildItem 'src-tauri/resources/backend' -Recurse -File | Measure-Object Length -Sum).Sum
$hostSize = (Get-Item 'src-tauri/target.noindex/release/forma.exe').Length
$sidecarSize = (Get-Item 'src-tauri/binaries/forma-backend-x86_64-pc-windows-msvc.exe').Length
if (($resources + $hostSize + $sidecarSize) -gt 450000000) { throw 'App payload exceeds 450 MB.' }
Copy-Item $installers[0].FullName $output -Force
& python scripts/package-source.py
if ($LASTEXITCODE -ne 0) { throw 'Source export failed.' }
Write-Host "Packaged Windows installer: $output"
