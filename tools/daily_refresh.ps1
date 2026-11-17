# Daily refresh of shop data from this computer (an Israeli connection: chain sites block GitHub's US servers).
# Pulls the repo, rebuilds data/shops.json with fresh chain hours, commits and pushes; GitHub then redeploys the site.
# Run by the Windows scheduled task "OpenNearby daily refresh". Log: %LOCALAPPDATA%\open-nearby\refresh.log

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $env:LOCALAPPDATA 'open-nearby'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Start-Transcript -Path (Join-Path $logDir 'refresh.log') -Append | Out-Null
Write-Output "=== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="

$python = 'C:\Python314\python.exe'
$git = 'git'
Set-Location $repo

try {
    # Take code changes from GitHub (the nightly bot may have committed OSM-only data; we rebuild it anyway).
    & $git pull --no-rebase -X theirs origin main
    if ($LASTEXITCODE -ne 0) { throw "git pull failed" }

    # Full update (OpenStreetMap + chains). If OpenStreetMap is down, rebuild chains on the last OSM download.
    & $python -X utf8 tools\update_data.py
    if ($LASTEXITCODE -ne 0) {
        Write-Output "OpenStreetMap download failed, reusing the last one"
        & $python -X utf8 tools\update_data.py --skip-osm
        if ($LASTEXITCODE -ne 0) { throw "data update failed" }
    }

    & $git add data/shops.json data/geocache.json data/chains
    & $git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) { Write-Output "No data changes"; return }

    & $git commit -q -m "Daily chain hours refresh ($(Get-Date -Format 'yyyy-MM-dd'), from Israel)"
    & $git push -q origin main
    if ($LASTEXITCODE -ne 0) {
        # Someone pushed meanwhile: keep our freshly built data and retry once.
        & $git pull --no-rebase -X ours origin main
        & $git push -q origin main
        if ($LASTEXITCODE -ne 0) { throw "git push failed" }
    }
    Write-Output "Pushed fresh data"
}
catch {
    Write-Output "ERROR: $_"
    exit 1
}
finally {
    Stop-Transcript | Out-Null
}
