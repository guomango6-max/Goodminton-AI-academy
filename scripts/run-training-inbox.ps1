param(
  [string]$Inbox,
  [string]$Out,
  [string]$Archive,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$nodeScript = Join-Path $projectRoot "scripts\create-training-note.mjs"
$envFile = Join-Path $projectRoot "scripts\training-automation.env.ps1"

if (Test-Path -LiteralPath $envFile) {
  . $envFile
}

if ([string]::IsNullOrWhiteSpace($Inbox)) {
  $Inbox = $env:BADMINTON_TRAINING_INBOX
}

if ([string]::IsNullOrWhiteSpace($Inbox)) {
  $Inbox = $env:GOODMINTON_TRAINING_INBOX
}

if ([string]::IsNullOrWhiteSpace($Out)) {
  $Out = $env:BADMINTON_TRAINING_OUT
}

if ([string]::IsNullOrWhiteSpace($Out)) {
  $Out = $env:GOODMINTON_TRAINING_OUT
}

if ([string]::IsNullOrWhiteSpace($Archive)) {
  $Archive = $env:BADMINTON_TRAINING_ARCHIVE
}

if ([string]::IsNullOrWhiteSpace($Archive)) {
  $Archive = $env:GOODMINTON_TRAINING_ARCHIVE
}

if ([string]::IsNullOrWhiteSpace($Inbox)) {
  $Inbox = Join-Path $projectRoot "training-inbox"
}

if ([string]::IsNullOrWhiteSpace($Out)) {
  $Out = Join-Path $projectRoot "training-notes"
}

if ([string]::IsNullOrWhiteSpace($Archive)) {
  $Archive = Join-Path $projectRoot "training-archive"
}

$arguments = @(
  $nodeScript,
  "--inbox",
  $Inbox,
  "--out",
  $Out,
  "--archive",
  $Archive
)

if ($DryRun) {
  $arguments += "--dry-run"
}

& node @arguments
