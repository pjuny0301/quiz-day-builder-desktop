param(
  [string]$ExePath = 'C:\quiz_app\src-tauri\target\debug\quiz_day_builder_desktop.exe',
  [string]$StoragePath = "$env:APPDATA\com.quizday.builder\app_data.json",
  [string]$OutputDir = 'C:\quiz_app\.tools\captures'
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class Win32Capture2 {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int x, int y);

  [DllImport("user32.dll")]
  public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
"@

function New-SampleState {
  return @{
    settings = @{ delay_ms = 1500; default_day_size = 30 }
    decks = @(
      @{
        id = 'deck-1';
        name = '한국사';
        cover_image_data_url = '';
        delay_ms = 1400;
        day_size = 10;
        cards = @(
          @{ id = 'c1'; question_html = '<p>훈민정음을 만든 왕은?</p>'; answer_html = '<p>세종</p>' },
          @{ id = 'c2'; question_html = '<p>임진왜란 시작 연도는?</p>'; answer_html = '<p>1592</p>' },
          @{ id = 'c3'; question_html = '<p>고려를 세운 인물은?</p>'; answer_html = '<p>왕건</p>' },
          @{ id = 'c4'; question_html = '<p>조선 건국 연도는?</p>'; answer_html = '<p>1392</p>' },
          @{ id = 'c5'; question_html = '<p>3.1 운동은 몇 년?</p>'; answer_html = '<p>1919</p>' },
          @{ id = 'c6'; question_html = '<p>을사조약 체결 연도는?</p>'; answer_html = '<p>1905</p>' },
          @{ id = 'c7'; question_html = '<p>발해 건국자는?</p>'; answer_html = '<p>대조영</p>' },
          @{ id = 'c8'; question_html = '<p>신라 삼국통일 완성 연도는?</p>'; answer_html = '<p>676</p>' },
          @{ id = 'c9'; question_html = '<p>독립협회 설립자는?</p>'; answer_html = '<p>서재필</p>' },
          @{ id = 'c10'; question_html = '<p>흥선대원군 본명은?</p>'; answer_html = '<p>이하응</p>' },
          @{ id = 'c11'; question_html = '<p>가보개혁은 몇 년?</p>'; answer_html = '<p>1894</p>' },
          @{ id = 'c12'; question_html = '<p>광개토대왕릉비 위치 국가는?</p>'; answer_html = '<p>중국</p>' }
        );
        days = @(
          @{ day = 1; name = 'Day 001'; card_ids = @('c1','c2','c3','c4','c5','c6','c7','c8','c9','c10') },
          @{ day = 2; name = 'Day 002'; card_ids = @('c11','c12') }
        );
        day_stats = @{
          '1' = @{ total_correct = 42; total_wrong = 11; last_correct = 8; last_wrong = 2; last_total = 10; last_mode = 'Mixed' };
          '2' = @{ total_correct = 6; total_wrong = 2; last_correct = 2; last_wrong = 0; last_total = 2; last_mode = 'Short Answer' }
        }
      }
    )
  }
}

function Write-Utf8JsonFile([string]$Path,[string]$Content) {
  [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

function SaveShot([string]$Path) {
  $handle = [Win32Capture2]::GetForegroundWindow()
  $rect = New-Object Win32Capture2+RECT
  [void][Win32Capture2]::GetWindowRect($handle, [ref]$rect)
  $bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left), ($rect.Bottom - $rect.Top)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose()
}

function ClickOffset([int]$OffsetX,[int]$OffsetY) {
  $handle = [Win32Capture2]::GetForegroundWindow()
  $rect = New-Object Win32Capture2+RECT
  [void][Win32Capture2]::GetWindowRect($handle, [ref]$rect)
  $targetX = $rect.Left + $OffsetX
  $targetY = $rect.Top + $OffsetY
  [void][Win32Capture2]::SetCursorPos($targetX, $targetY)
  Start-Sleep -Milliseconds 100
  [Win32Capture2]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  [Win32Capture2]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
}

function Wait-ForWindow([System.Diagnostics.Process]$Process) {
  for ($i=0; $i -lt 40; $i++) {
    $Process.Refresh()
    if ($Process.MainWindowHandle -ne 0) { return }
    Start-Sleep -Milliseconds 250
  }
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
  Start-Sleep -Milliseconds 3500
  $wshell = New-Object -ComObject WScript.Shell
  [void]$wshell.AppActivate($process.Id)
  Start-Sleep -Milliseconds 500
  SaveShot (Join-Path $OutputDir 'manager-current.png')
  ClickOffset 280 640
  Start-Sleep -Milliseconds 1800
  SaveShot (Join-Path $OutputDir 'deck-detail-current.png')
}
finally {
  if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
  if ($hadOriginal -and (Test-Path $backupPath)) { Move-Item $backupPath $StoragePath -Force }
  elseif (Test-Path $backupPath) { Remove-Item $backupPath -Force }
  elseif (Test-Path $StoragePath) { Remove-Item $StoragePath -Force }
}
