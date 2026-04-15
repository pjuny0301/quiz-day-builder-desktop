param(
  [string]$ExePath = 'C:\quiz_app\src-tauri\target\release\quiz_day_builder_desktop.exe',
  [string]$StoragePath = "$env:APPDATA\com.quizday.builder\app_data.json",
  [string]$OutputDir = 'C:\quiz_app\.tools\captures\storage-recovery'
)

Add-Type -AssemblyName System.Drawing
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32StorageRecovery {
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

function New-BackupState {
  return @{
    meta = @{ schema_version = 1 }
    settings = @{ delay_ms = 1300; default_day_size = 20 }
    decks = @(
      @{
        id = 'deck-recover'; name = 'Recovered Deck'; cover_image_data_url = ''; delay_ms = 1300; day_size = 20;
        cards = @(
          @{ id = 'r1'; question_html = '<p>Recovered question</p>'; answer_html = '<p>Recovered answer</p>' }
        );
        days = @(
          @{ day = 1; name = 'Day 001'; card_ids = @('r1') }
        );
        day_stats = @{ '1' = @{ total_correct = 1; total_wrong = 0; last_correct = 1; last_wrong = 0; last_total = 1; last_mode = 'Short Answer' } }
      }
    )
  }
}

function SaveShot([string]$Path) {
  $handle = [Win32StorageRecovery]::GetForegroundWindow()
  $rect = New-Object Win32StorageRecovery+RECT
  [void][Win32StorageRecovery]::GetWindowRect($handle, [ref]$rect)
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
$backupStoragePath = Join-Path $storageDir 'app_data.backup.json'
$stateBackup = "$StoragePath.codex-backup"
$backupStorageBackup = "$backupStoragePath.codex-backup"
$hadState = Test-Path $StoragePath
$hadBackupState = Test-Path $backupStoragePath
if ($hadState) { Copy-Item $StoragePath $stateBackup -Force }
if ($hadBackupState) { Copy-Item $backupStoragePath $backupStorageBackup -Force }
Write-Utf8JsonFile -Path $StoragePath -Content '{ broken json'
Write-Utf8JsonFile -Path $backupStoragePath -Content ((New-BackupState) | ConvertTo-Json -Depth 8)
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
  SaveShot (Join-Path $OutputDir '01-recovered-launch.png')
  $restored = Get-Content -Raw $StoragePath
  [System.IO.File]::WriteAllText((Join-Path $OutputDir 'restored-app-data.json'), $restored, $Utf8NoBom)
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
