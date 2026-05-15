param(
  [Parameter(Mandatory=$true)] [string] $SourceDir,
  [string] $OutputDir = "",
  [switch] $Recurse
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "SourceDir not found: $SourceDir"
}

$source = Get-Item -LiteralPath $SourceDir
$files = if ($Recurse) {
  Get-ChildItem -LiteralPath $source.FullName -Recurse -File -Include *.vtt,*.srt
} else {
  Get-ChildItem -LiteralPath $source.FullName -File -Include *.vtt,*.srt
}

$written = 0

foreach ($file in $files) {
  $targetDir = if ($OutputDir) {
    $OutputDir
  } else {
    Join-Path $file.DirectoryName "txt"
  }

  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

  $lines = Get-Content -Encoding UTF8 -LiteralPath $file.FullName
  $clean = New-Object System.Collections.Generic.List[string]
  $last = ""

  foreach ($line in $lines) {
    $s = $line.Trim()
    if ($s -eq "" -or $s -eq "WEBVTT") { continue }
    if ($s -match "^Kind:" -or $s -match "^Language:") { continue }
    if ($s -match "-->") { continue }
    if ($s -match "^\d+$") { continue }
    $s = $s -replace "<[^>]+>", ""
    $s = $s -replace "&amp;", "&"
    $s = $s -replace "&lt;", "<"
    $s = $s -replace "&gt;", ">"
    $s = $s.Trim()
    if ($s -and $s -ne $last) {
      $clean.Add($s)
      $last = $s
    }
  }

  $outName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) + ".txt"
  Set-Content -Encoding UTF8 -LiteralPath (Join-Path $targetDir $outName) -Value $clean
  $written += 1
}

Write-Host "Converted subtitle files: $written"
