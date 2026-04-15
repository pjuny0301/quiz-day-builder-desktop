param(
  [string]$ExePath = 'C:\quiz_app\src-tauri\target\release\quiz_day_builder_desktop.exe',
  [string]$StoragePath = "$env:APPDATA\com.quizday.builder\app_data.json",
  [string]$OutputDir = 'C:\quiz_app\.tools\captures\storage-smoke'
)

Add-Type -AssemblyName System.Drawing
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32StorageSmoke {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@

function Write-Utf8JsonFile([string]$Path, [string]$Content) {
  [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

function Invoke-UiAction([string]$ActionId, [string]$PayloadJson = '') {
  $arguments = @('-ExecutionPolicy','Bypass','-File','C:\quiz_app\.tools\invoke_ui_action.ps1','-ActionId',$ActionId)
  if ($PayloadJson) {
    $arguments += @('-PayloadJson',$PayloadJson)
  }
  $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WindowStyle Hidden -PassThru -Wait
  if ($process.ExitCode -ne 0) {
    throw "자동화 액션 실행 실패: $ActionId"
  }
  Start-Sleep -Milliseconds 900
}

function New-SampleState {
  return @{
    settings = @{ delay_ms = 1500; default_day_size = 30 }
    decks = @(
      @{
        id = 'deck-1'; name = 'History'; cover_image_data_url = ''; delay_ms = 1200; day_size = 10;
        cards = @(
          @{ id = 'c1'; question_html = '<p>King who created Hunminjeongeum</p>'; answer_html = '<p>Sejong</p>' },
          @{ id = 'c2'; question_html = '<p>Year the Imjin War began</p>'; answer_html = '<p>1592</p>' },
          @{ id = 'c3'; question_html = '<p>Founder of Goryeo</p>'; answer_html = '<p>Wang Geon</p>' },
          @{ id = 'c4'; question_html = '<p>Founding year of Joseon</p>'; answer_html = '<p>1392</p>' }
        );
        days = @(
          @{ day = 1; name = 'Day 001'; card_ids = @('c1','c2','c3','c4') }
        );
        day_stats = @{ '1' = @{ total_correct = 8; total_wrong = 2; last_correct = 3; last_wrong = 1; last_total = 4; last_mode = 'Mixed' } }
      }
    )
  }
}

function SaveShot([string]$Path) {
  $handle = [Win32StorageSmoke]::GetForegroundWindow()
  $rect = New-Object Win32StorageSmoke+RECT
  [void][Win32StorageSmoke]::GetWindowRect($handle, [ref]$rect)
  $bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left), ($rect.Bottom - $rect.Top)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose()
}

function Wait-ForWindow([System.Diagnostics.Process]$Process) {
  for ($i = 0; $i -lt 50; $i++) {
    $Process.Refresh()
    if ($Process.MainWindowHandle -ne 0) { return }
    Start-Sleep -Milliseconds 250
  }
  throw '창이 열리지 않았습니다.'
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$storageDir = Split-Path -Parent $StoragePath
New-Item -ItemType Directory -Force -Path $storageDir | Out-Null
$stateBackup = "$StoragePath.codex-backup"
$backupStoragePath = Join-Path $storageDir 'app_data.backup.json'
$backupStorageBackup = "$backupStoragePath.codex-backup"
$hadState = Test-Path $StoragePath
$hadBackupState = Test-Path $backupStoragePath
if ($hadState) { Copy-Item $StoragePath $stateBackup -Force }
if ($hadBackupState) { Copy-Item $backupStoragePath $backupStorageBackup -Force }
Write-Utf8JsonFile -Path $StoragePath -Content ((New-SampleState) | ConvertTo-Json -Depth 8)
$process = $null
try {
  $process = Start-Process -FilePath $ExePath -PassThru
  Wait-ForWindow $process
  Start-Sleep -Milliseconds 7000
  $wshell = New-Object -ComObject WScript.Shell
  [void]$wshell.AppActivate($process.Id)
  Invoke-UiAction -ActionId 'app.navigate' -PayloadJson '{"route":"manager","replace":true}'
  [void]$wshell.AppActivate($process.Id)
  Start-Sleep -Milliseconds 300
  SaveShot (Join-Path $OutputDir '01-manager.png')

  Invoke-UiAction -ActionId 'manager.open-deck' -PayloadJson '{"deckId":"deck-1"}'
  [void]$wshell.AppActivate($process.Id)
  Start-Sleep -Milliseconds 300
  SaveShot (Join-Path $OutputDir '02-deck-detail.png')

  Invoke-UiAction -ActionId 'deck-detail.study-all'
  [void]$wshell.AppActivate($process.Id)
  Start-Sleep -Milliseconds 300
  SaveShot (Join-Path $OutputDir '03-study-launcher.png')
}
finally {
  if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
  if ($hadState -and (Test-Path $stateBackup)) { Move-Item $stateBackup $StoragePath -Force }
  elseif (Test-Path $stateBackup) { Remove-Item $stateBackup -Force }
  elseif (Test-Path $StoragePath) { Remove-Item $StoragePath -Force }

  if ($hadBackupState -and (Test-Path $backupStorageBackup)) { Move-Item $backupStorageBackup $backupStoragePath -Force }
  elseif (Test-Path $backupStorageBackup) { Remove-Item $backupStorageBackup -Force }
  elseif (Test-Path $backupStoragePath) { Remove-Item $backupStoragePath -Force }
}
