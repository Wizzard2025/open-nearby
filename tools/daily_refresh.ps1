# Daily refresh of shop data from this computer (an Israeli connection: chain sites block GitHub's US servers).
# Pulls the repo, rebuilds data/shops.json with fresh chain hours, commits and pushes; GitHub then redeploys the site.
# Run by the Windows scheduled task "OpenNearby daily refresh". Log: %LOCALAPPDATA%\open-nearby\refresh.log

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $env:LOCALAPPDATA 'open-nearby'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'refresh.log'

function Log([string]$msg) { Add-Content -Path $log -Value $msg -Encoding UTF8; Write-Output $msg }
# Runs a program, writes everything it prints to the log, returns its exit code.
function Run([string]$exe, [string[]]$arguments) {
    & $exe @arguments 2>&1 | ForEach-Object { Log "  $_" }
    return $LASTEXITCODE
}

$python = 'C:\Python314\python.exe'
Set-Location $repo
Log "=== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="

try {
    # Take code changes from GitHub (the nightly bot may have committed OSM-only data; we rebuild it anyway).
    if ((Run 'git' @('pull', '--no-rebase', '-X', 'theirs', 'origin', 'main')) -ne 0) { throw "git pull failed" }

    # Full update (OpenStreetMap + chains). If OpenStreetMap is down, rebuild chains on the last OSM download.
    if ((Run $python @('-X', 'utf8', 'tools\update_data.py')) -ne 0) {
        Log "OpenStreetMap download failed, reusing the last one"
        if ((Run $python @('-X', 'utf8', 'tools\update_data.py', '--skip-osm')) -ne 0) { throw "data update failed" }
    }

    Run 'git' @('add', 'data/shops.json', 'data/geocache.json', 'data/chains') | Out-Null
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) { Log "No data changes"; exit 0 }

    Run 'git' @('commit', '-q', '-m', "Daily chain hours refresh ($(Get-Date -Format 'yyyy-MM-dd'), from Israel)") | Out-Null
    if ((Run 'git' @('push', '-q', 'origin', 'main')) -ne 0) {
        # Someone pushed meanwhile: keep our freshly built data and retry once.
        Run 'git' @('pull', '--no-rebase', '-X', 'ours', 'origin', 'main') | Out-Null
        if ((Run 'git' @('push', '-q', 'origin', 'main')) -ne 0) { throw "git push failed" }
    }
    Log "OK: pushed fresh data"
}
catch {
    Log "ERROR: $_"
    exit 1
}
