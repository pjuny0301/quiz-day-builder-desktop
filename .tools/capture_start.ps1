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
public static class Win32Shot {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
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
          @{ id = 'c1'; question_html = '<p>훈민정음을 만든 왕은?</p>'; answer_html = '<p>세종</p>' },
          @{ id = 'c2'; question_html = '<p>임진왜란 시작 연도는?</p>'; answer_html = '<p>1592</p>' },
          @{ id = 'c3'; question_html = '<p>고려를 세운 인물은?</p>'; answer_html = '<p>왕건</p>' },
          @{ id = 'c4'; question_html = '<p>조선 건국 연도는?</p>'; answer_html = '<p>1392</p>' },
          @{ id = 'c5'; question_html = '<p>3.1 운동은 몇 년?</p>'; answer_html = '<p>1919</p>' },
          @{ id = 'c6'; question_html = '<p>을사조약 체결 연도는?</p>'; answer_html = '<p>1905</p>' }
        );
        days = @(
          @{ day = 1; name = 'Day 001'; card_ids = @('c1','c2','c3','c4') },
          @{ day = 2; name = 'Day 002'; card_ids = @('c5','c6') }
        );
        day_stats = @{ '1' = @{ total_correct = 12; total_wrong = 4; last_correct = 3; last_wrong = 1; last_total = 4; last_mode = 'Mixed' } }
      }
    )
  }
}
function SaveShot([string]$Path) {
  $handle = [Win32Shot]::GetForegroundWindow(); $rect = New-Object Win32Shot+RECT; [void][Win32Shot]::GetWindowRect($handle, [ref]$rect)
  $bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left), ($rect.Bottom - $rect.Top)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose()
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
  SaveShot (Join-Path $OutputDir 'start-current.png')
}
finally {
  if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
  if ($hadOriginal -and (Test-Path $backupPath)) { Move-Item $backupPath $StoragePath -Force }
  elseif (Test-Path $backupPath) { Remove-Item $backupPath -Force }
  elseif (Test-Path $StoragePath) { Remove-Item $StoragePath -Force }
}
