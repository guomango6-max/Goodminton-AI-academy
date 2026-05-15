param(
  [string]$TaskName = "Badminton Training Inbox",
  [int]$IntervalMinutes = 15,
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$runner = Join-Path $projectRoot "scripts\run-training-inbox.ps1"

if (-not (Test-Path -LiteralPath $runner)) {
  throw "Runner not found: $runner"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable

if ($WhatIf) {
  Write-Host "Task name: $TaskName"
  Write-Host "Interval: every $IntervalMinutes minutes"
  Write-Host "Command: powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$runner`""
  exit 0
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Convert badminton training-correction AI JSON inbox files into Obsidian Markdown notes." `
  -Force | Out-Null

Write-Host "Installed scheduled task: $TaskName"
Write-Host "Runs every $IntervalMinutes minutes."
