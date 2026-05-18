param(
  [string]$Endpoint = $env:GOODMINTON_STUDENT_SHEET_ENDPOINT,
  [string]$Token = $env:GOODMINTON_STUDENT_SHEET_TOKEN
)

$ErrorActionPreference = "Stop"

if (-not $Endpoint -or -not $Token) {
  Write-Error "Missing GOODMINTON_STUDENT_SHEET_ENDPOINT or GOODMINTON_STUDENT_SHEET_TOKEN."
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$studentDir = Join-Path $root "data\students"

$students = @(
  @{ File = "guo-yiwei.json"; Alias = "gyw" },
  @{ File = "li-chenrun.json"; Alias = "lcr" },
  @{ File = "sheng-xinyi.json"; Alias = "sxy" },
  @{ File = "xue-meijiao.json"; Alias = "xmj" },
  @{ File = "yang-jingnan.json"; Alias = "yjn" }
)

$rows = foreach ($item in $students) {
  $path = Join-Path $studentDir $item.File
  $raw = Get-Content -LiteralPath $path -Raw -Encoding UTF8
  $student = $raw | ConvertFrom-Json

  [ordered]@{
    studentId = [string]$student.studentId
    aliases = [string]$item.Alias
    accessCode = [string]$student.accessCode
    studentName = [string]$student.name
    studentJson = ($student | ConvertTo-Json -Depth 50 -Compress)
  }
}

$body = @{
  token = $Token
  action = "upsertStudents"
  students = $rows
} | ConvertTo-Json -Depth 60 -Compress

$response = Invoke-RestMethod -Uri $Endpoint -Method Post -ContentType "application/json; charset=utf-8" -Body $body

if ($response.error) {
  Write-Error ("Upload failed: " + ($response | ConvertTo-Json -Depth 10 -Compress))
}

Write-Host "Uploaded students:" ($response | ConvertTo-Json -Depth 10 -Compress)
