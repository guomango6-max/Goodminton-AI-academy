param(
  [string]$Config,
  [string]$Out,
  [string]$State,
  [int]$Max = 20,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$nodeScript = Join-Path $projectRoot "scripts\fetch-external-training-sources.mjs"
$envFile = Join-Path $projectRoot "scripts\training-automation.env.ps1"

if (Test-Path -LiteralPath $envFile) {
  . $envFile
}

if ([string]::IsNullOrWhiteSpace($Config)) {
  $Config = Join-Path $projectRoot "scripts\external-training-sources.json"
}

if ([string]::IsNullOrWhiteSpace($Out)) {
  $Out = $env:BADMINTON_RAW_INBOX
}

if ([string]::IsNullOrWhiteSpace($State)) {
  $State = $env:BADMINTON_FETCH_STATE
}

if ([string]::IsNullOrWhiteSpace($Out)) {
  $Out = "D:\raw"
}

if ([string]::IsNullOrWhiteSpace($State)) {
  $State = Join-Path $projectRoot "training-fetch-state.json"
}

if (-not (Test-Path -LiteralPath $Config)) {
  $example = Join-Path $projectRoot "scripts\external-training-sources.example.json"
  throw "Missing source config: $Config. Copy $example to $Config and add real RSS feeds or URLs."
}

$arguments = @(
  $nodeScript,
  "--config",
  $Config,
  "--out",
  $Out,
  "--state",
  $State,
  "--max",
  $Max
)

if ($DryRun) {
  $arguments += "--dry-run"
}

& node @arguments
