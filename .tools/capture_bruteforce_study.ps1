param(
  [string]$ExePath = 'C:\quiz_app\src-tauri\target\debug\quiz_day_builder_desktop.exe',
  [string]$StoragePath = "$env:APPDATA\com.quizday.builder\app_data.json",
  [string]$OutputDir = 'C:\quiz_app\.tools\captures'
)
Add-Type -AssemblyName System.Drawing
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32Flow6 {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
"@
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
function SaveShot([string]$Path) {
  $handle = [Win32Flow6]::GetForegroundWindow(); $rect = New-Object Win32Flow6+RECT; [void][Win32Flow6]::GetWindowRect($handle, [ref]$rect)
  $bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left), ($rect.Bottom - $rect.Top)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose()
}
function ClickOffset([int]$OffsetX,[int]$OffsetY) {
  $handle = [Win32Flow6]::GetForegroundWindow(); $rect = New-Object Win32Flow6+RECT; [void][Win32Flow6]::GetWindowRect($handle, [ref]$rect)
  $x = $rect.Left + $OffsetX; $y = $rect.Top + $OffsetY
  [void][Win32Flow6]::SetCursorPos($x, $y)
  Start-Sleep -Milliseconds 150
  [Win32Flow6]::mouse_event(0x0002,0,0,0,[UIntPtr]::Zero)
  [Win32Flow6]::mouse_event(0x0004,0,0,0,[UIntPtr]::Zero)
}
function Wait-ForWindow([System.Diagnostics.Process]$Process) {
  for ($i=0; $i -lt 40; $i++) { $Process.Refresh(); if ($Process.MainWindowHandle -ne 0) { return }; Start-Sleep -Milliseconds 250 }
  throw '창이 열리지 않았습니다.'
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
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
  $wshell = New-Object -ComObject WScript.Shell
  [void]$wshell.AppActivate($process.Id)
  Start-Sleep -Milliseconds 500
  ClickOffset 335 420
  Start-Sleep -Milliseconds 1800
  SaveShot (Join-Path $OutputDir 'brute-1-deck-detail.png')
  foreach ($pair in @(@(280,395), @(320,395), @(350,395), @(320,430), @(350,430))) {
    ClickOffset $pair[0] $pair[1]
    Start-Sleep -Milliseconds 700
  }
  SaveShot (Join-Path $OutputDir 'brute-2-after-clicks.png')
}
finally {
  if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
  if ($hadOriginal -and (Test-Path $backupPath)) { Move-Item $backupPath $StoragePath -Force }
  elseif (Test-Path $backupPath) { Remove-Item $backupPath -Force }
  elseif (Test-Path $StoragePath) { Remove-Item $StoragePath -Force }
}
