param(
  [Parameter(Mandatory = $true)]
  [string]$ActionId,
  [string]$PayloadJson = '',
  [int]$TimeoutMs = 12000
)

$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
$commandPath = Join-Path $env:TEMP 'quiz_day_builder_automation.json'
$payload = $null
if ($PayloadJson.Trim()) {
  $payload = $PayloadJson | ConvertFrom-Json
}

$command = @{ actionId = $ActionId }
if ($null -ne $payload) {
  $command.payload = $payload
}

[System.IO.File]::WriteAllText($commandPath, ($command | ConvertTo-Json -Depth 8), $Utf8NoBom)

$start = Get-Date
while ((Test-Path $commandPath) -and (((Get-Date) - $start).TotalMilliseconds -lt $TimeoutMs)) {
  Start-Sleep -Milliseconds 80
}

if (Test-Path $commandPath) {
  throw "자동화 명령이 시간 내에 소비되지 않았습니다: $ActionId"
}


