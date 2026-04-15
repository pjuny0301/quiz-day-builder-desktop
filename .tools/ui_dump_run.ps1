param(
  [string]$ExePath = 'C:\quiz_app\src-tauri\target\debug\quiz_day_builder_desktop.exe',
  [string]$StoragePath = "$env:APPDATA\com.quizday.builder\app_data.json"
)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
function Write-Utf8JsonFile([string]$Path,[string]$Content) { [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom) }
function New-SampleState {
  return @{
    settings = @{ delay_ms = 1500; default_day_size = 30 }
    decks = @(
      @{
        id = 'deck-1'; name = '한국사'; cover_image_data_url = ''; delay_ms = 1400; day_size = 10;
        cards = @(
          @{ id = 'c1'; question_html = '<p>한 줄에</p>'; answer_html = '<p>카드 하나씩</p>' },
          @{ id = 'c2'; question_html = '<p>aas</p>'; answer_html = '<p>세종</p>' }
        );
        days = @(
          @{ day = 1; name = 'Day 001'; card_ids = @('c1','c2') }
        );
        day_stats = @{ '1' = @{ total_correct = 12; total_wrong = 4; last_correct = 3; last_wrong = 1; last_total = 4; last_mode = 'Mixed' } }
      }
    )
  }
}
function Wait-ForWindow([System.Diagnostics.Process]$Process) {
  for ($i=0; $i -lt 40; $i++) { $Process.Refresh(); if ($Process.MainWindowHandle -ne 0) { return }; Start-Sleep -Milliseconds 250 }
  throw '창이 열리지 않았습니다.'
}
$storageDir = Split-Path -Parent $StoragePath
New-Item -ItemType Directory -Force -Path $storageDir | Out-Null
$backupPath = "$StoragePath.codex-backup"
$hadOriginal = Test-Path $StoragePath
if ($hadOriginal) { Copy-Item $StoragePath $backupPath -Force }
Write-Utf8JsonFile -Path $StoragePath -Content ((New-SampleState) | ConvertTo-Json -Depth 8)
$process = $null
try {
  $process = Start-Process -FilePath $ExePath -PassThru
  Wait-ForWindow $process
  Start-Sleep -Milliseconds 4500
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, '덱 관리')
  $window = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $condition)
  if ($null -eq $window) { throw 'automation window not found' }
  $elements = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
  foreach ($element in $elements) {
    $name = $element.Current.Name
    $type = $element.Current.ControlType.ProgrammaticName
    if ($name) { Write-Output "$type`t$name" }
  }
}
finally {
  if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
  if ($hadOriginal -and (Test-Path $backupPath)) { Move-Item $backupPath $StoragePath -Force }
  elseif (Test-Path $backupPath) { Remove-Item $backupPath -Force }
  elseif (Test-Path $StoragePath) { Remove-Item $StoragePath -Force }
}
