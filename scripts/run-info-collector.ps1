param(
  [ValidateSet("web", "youtube", "all")] [string]$Mode = "web",
  [int]$Max = 50,
  [switch]$DryRun,
  [string]$YouTubeUrl = "",
  [string]$YouTubeName = "",
  [int]$YouTubeLimit = 20,
  [string]$YouTubeLangs = "zh-Hans,zh-Hant,zh,en",
  [string]$YouTubeOut = "",
  [string]$YouTubeSourcesConfig = "",
  [switch]$UseYouTubeSources,
  [string]$Cookies = "",
  [string]$CookiesFromBrowser = "",
  [switch]$CleanYouTube,
  [switch]$CleanRaw,
  [string]$CleanRawSourceDir = "",
  [string]$CleanRawOut = "",
  [switch]$ProcessInbox,
  [switch]$SkipWeb
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $projectRoot "scripts\training-automation.env.ps1"
$webRunner = Join-Path $projectRoot "bb.ps1"
$youtubeRunner = Join-Path $projectRoot "bf.ps1"
$rawCleaner = Join-Path $projectRoot "bc.ps1"
$inboxRunner = Join-Path $projectRoot "scripts\run-training-inbox.ps1"

if (Test-Path -LiteralPath $envFile) {
  . $envFile
}

if ([string]::IsNullOrWhiteSpace($YouTubeSourcesConfig)) {
  $YouTubeSourcesConfig = Join-Path $projectRoot "scripts\youtube-sources.json"
}

$started = Get-Date
$report = New-Object System.Collections.Generic.List[string]
$report.Add("# Goodminton 信息采集报告")
$report.Add("")
$report.Add("- started: $($started.ToString("s"))")
$report.Add("- mode: $Mode")
$report.Add("- dry_run: $DryRun")
$report.Add("")

function Invoke-Step {
  param(
    [Parameter(Mandatory=$true)] [string]$Name,
    [Parameter(Mandatory=$true)] [scriptblock]$Body
  )

  Write-Host ""
  Write-Host "== $Name =="
  $script:report.Add("## $Name")
  $script:report.Add("")

  try {
    $output = & $Body 2>&1
    foreach ($line in $output) {
      Write-Host $line
      $script:report.Add([string]$line)
    }
    $script:report.Add("")
  } catch {
    $message = $_.Exception.Message
    Write-Host "FAILED: $message"
    $script:report.Add("FAILED: $message")
    $script:report.Add("")
    throw
  }
}

$shouldRunWeb = -not $SkipWeb -and ($Mode -eq "web" -or $Mode -eq "all")
$shouldRunYouTube = $Mode -eq "youtube" -or $Mode -eq "all" -or -not [string]::IsNullOrWhiteSpace($YouTubeUrl)

if ($shouldRunWeb) {
  Invoke-Step "网页/RSS/Brave/论文增量采集" {
    $parameters = @{ Max = $Max }
    if ($DryRun) { $parameters.DryRun = $true }
    & $webRunner @parameters
  }
}

if ($shouldRunYouTube) {
  if ([string]::IsNullOrWhiteSpace($YouTubeUrl)) {
    if ($UseYouTubeSources -and (Test-Path -LiteralPath $YouTubeSourcesConfig)) {
      $youtubeSources = (Get-Content -Raw -LiteralPath $YouTubeSourcesConfig | ConvertFrom-Json).sources
      foreach ($source in $youtubeSources) {
        if ($source.enabled -eq $false) { continue }
        if ($DryRun) {
          Write-Host "Would collect YouTube source: $($source.name) <$($source.url)> limit=$($source.limit)"
          $report.Add("Would collect YouTube source: $($source.name) <$($source.url)> limit=$($source.limit)")
          continue
        }
        Invoke-Step "YouTube 字幕采集: $($source.name)" {
          $parameters = @{
            Url = [string]$source.url
            Name = [string]$source.name
            Limit = if ($source.limit) { [int]$source.limit } else { $YouTubeLimit }
            Langs = if ($source.langs) { [string]$source.langs } else { $YouTubeLangs }
          }
          if (-not [string]::IsNullOrWhiteSpace($YouTubeOut)) { $parameters.Out = $YouTubeOut }
          if (-not [string]::IsNullOrWhiteSpace($Cookies)) { $parameters.Cookies = $Cookies }
          if (-not [string]::IsNullOrWhiteSpace($CookiesFromBrowser)) { $parameters.CookiesFromBrowser = $CookiesFromBrowser }
          if ($CleanYouTube) { $parameters.Clean = $true }
          & $youtubeRunner @parameters
        }
      }
    } else {
      Write-Host "Skipping YouTube: pass -YouTubeUrl or -UseYouTubeSources."
      $report.Add("## YouTube 字幕采集")
      $report.Add("")
      $report.Add("Skipped: missing YouTubeUrl and UseYouTubeSources is not enabled.")
      $report.Add("")
    }
  } else {
    if ($DryRun) {
      Write-Host "Would collect YouTube URL: $YouTubeUrl limit=$YouTubeLimit"
      $report.Add("## YouTube 字幕采集")
      $report.Add("")
      $report.Add("Would collect YouTube URL: $YouTubeUrl limit=$YouTubeLimit")
      $report.Add("")
    } else {
    Invoke-Step "YouTube 字幕采集" {
      $parameters = @{
        Url = $YouTubeUrl
        Limit = $YouTubeLimit
        Langs = $YouTubeLangs
      }
      if (-not [string]::IsNullOrWhiteSpace($YouTubeName)) { $parameters.Name = $YouTubeName }
      if (-not [string]::IsNullOrWhiteSpace($YouTubeOut)) { $parameters.Out = $YouTubeOut }
      if (-not [string]::IsNullOrWhiteSpace($Cookies)) { $parameters.Cookies = $Cookies }
      if (-not [string]::IsNullOrWhiteSpace($CookiesFromBrowser)) { $parameters.CookiesFromBrowser = $CookiesFromBrowser }
      if ($CleanYouTube) { $parameters.Clean = $true }
      & $youtubeRunner @parameters
    }
    }
  }
}

if ($CleanRaw) {
  Invoke-Step "Raw 外层清洗" {
    $parameters = @{}
    if ($DryRun) { $parameters.DryRun = $true }
    if (-not [string]::IsNullOrWhiteSpace($CleanRawSourceDir)) { $parameters.SourceDir = $CleanRawSourceDir }
    if (-not [string]::IsNullOrWhiteSpace($CleanRawOut)) { $parameters.Out = $CleanRawOut }
    & $rawCleaner @parameters
  }
}

if ($ProcessInbox) {
  Invoke-Step "训练卡片入库" {
    $parameters = @{}
    if ($DryRun) { $parameters.DryRun = $true }
    & $inboxRunner @parameters
  }
}

$finished = Get-Date
$report.Add("- finished: $($finished.ToString("s"))")
$report.Add("- duration_seconds: $([int]($finished - $started).TotalSeconds)")

$reportRoot = $env:BADMINTON_COLLECTOR_REPORTS
if ([string]::IsNullOrWhiteSpace($reportRoot)) {
  $reportRoot = "D:\Badminton\collector-reports"
}

if (-not $DryRun) {
  New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
  $reportPath = Join-Path $reportRoot "$($started.ToString("yyyy-MM-dd-HHmmss"))-collector-report.md"
  Set-Content -Encoding UTF8 -LiteralPath $reportPath -Value $report
  Write-Host ""
  Write-Host "Report: $reportPath"
}
