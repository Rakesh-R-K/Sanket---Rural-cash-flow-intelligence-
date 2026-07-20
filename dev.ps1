#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiDir = Join-Path $root 'api'
$appDir = Join-Path $root 'app'
$venvPython = Join-Path $apiDir '.venv\Scripts\python.exe'
$needsInstall = $false

if (-not (Test-Path $venvPython)) {
    Write-Host "▶ Creating backend virtualenv…"
    Push-Location $apiDir
    try {
        py -3 -m venv .venv
    } finally {
        Pop-Location
    }
    $needsInstall = $true
}

if ($needsInstall) {
    Write-Host "▶ Installing backend dependencies…"
    & $venvPython -m pip install -r (Join-Path $apiDir 'requirements.txt')
}

Write-Host "▶ Seeding pristine demo state…"
Push-Location $apiDir
try {
    & $venvPython -m app.seed
} finally {
    Pop-Location
}

Write-Host "▶ Starting API (:8000) and PWA (:5173). Ctrl-C to stop both."
$backend = Start-Process -FilePath $venvPython -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000') -WorkingDirectory $apiDir -PassThru -NoNewWindow
$frontend = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev', '--', '--host') -WorkingDirectory $appDir -PassThru -NoNewWindow

try {
    Wait-Process -Id $backend.Id, $frontend.Id
} finally {
    foreach ($pid in @($backend.Id, $frontend.Id)) {
        Stop-Process -Id $pid -ErrorAction SilentlyContinue
    }
}