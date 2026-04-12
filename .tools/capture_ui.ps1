param(
  [string]$ExePath = "C:\quiz_app\src-tauri\target\debug\quiz_day_builder_desktop.exe",
  [string]$StoragePath = "$env:APPDATA\com.quizday.builder\app_data.json",
  [string]$OutputDir = "C:\quiz_app\.tools\captures"
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false


# Import the Win32 APIs needed to resolve and capture the active window bounds.
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class Win32Capture {
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


# Build sample data so the screenshots show real deck density instead of an empty shell.
function New-SampleState {
  return @{
    settings = @{
      delay_ms = 1500
      default_day_size = 30
    }
    decks = @(
      @{
        id = "sample-kor-history"
        name = "History Core Deck"
        delay_ms = 1400
        day_size = 10
        cards = @(
          @{ id = "c1"; question_html = "<p>Who created Hangul?</p>"; answer_html = "<p>King Sejong</p>" }
          @{ id = "c2"; question_html = "<p>When did the Imjin War begin?</p>"; answer_html = "<p>1592</p>" }
          @{ id = "c3"; question_html = "<p>When did the Gabo Reform start?</p>"; answer_html = "<p>1894</p>" }
          @{ id = "c4"; question_html = "<p>Who founded the Independence Club?</p>"; answer_html = "<p>Seo Jae-pil</p>" }
          @{ id = "c5"; question_html = "<p>What year was the March First Movement?</p>"; answer_html = "<p>1919</p>" }
          @{ id = "c6"; question_html = "<p>Who founded Goryeo?</p>"; answer_html = "<p>Wang Geon</p>" }
          @{ id = "c7"; question_html = "<p>Who founded Balhae?</p>"; answer_html = "<p>Dae Joyeong</p>" }
          @{ id = "c8"; question_html = "<p>When was Joseon founded?</p>"; answer_html = "<p>1392</p>" }
          @{ id = "c9"; question_html = "<p>When was Unified Silla completed?</p>"; answer_html = "<p>676</p>" }
          @{ id = "c10"; question_html = "<p>In which country is the Gwanggaeto Stele located?</p>"; answer_html = "<p>China</p>" }
          @{ id = "c11"; question_html = "<p>What was Heungseon Daewongun's real name?</p>"; answer_html = "<p>Yi Ha-eung</p>" }
          @{ id = "c12"; question_html = "<p>When was the Eulsa Treaty signed?</p>"; answer_html = "<p>1905</p>" }
        )
        days = @(
          @{ day = 1; name = "Day 001"; card_ids = @("c1","c2","c3","c4","c5","c6","c7","c8","c9","c10") }
          @{ day = 2; name = "Day 002"; card_ids = @("c11","c12") }
        )
        day_stats = @{
          "1" = @{ total_correct = 42; total_wrong = 11; last_correct = 8; last_wrong = 2; last_total = 10; last_mode = "Mixed" }
          "2" = @{ total_correct = 6; total_wrong = 2; last_correct = 2; last_wrong = 0; last_total = 2; last_mode = "Short Answer" }
        }
      }
      @{
        id = "sample-english"
        name = "Exam Vocabulary"
        delay_ms = 1800
        day_size = 20
        cards = @()
        days = @()
        day_stats = @{}
      }
    )
  }
}


# Write JSON text as UTF-8 without BOM so the desktop store matches the runtime serializer.
function Write-Utf8JsonFile {
  param(
    [string]$Path,
    [string]$Content
  )

  [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}


# Save the current foreground window into the requested PNG path.
function Save-ForegroundWindowScreenshot {
  param([string]$Path)

  $handle = [Win32Capture]::GetForegroundWindow()
  if ($handle -eq [IntPtr]::Zero) {
    throw "활성 창을 찾지 못했습니다."
  }

  $rect = New-Object Win32Capture+RECT
  [void][Win32Capture]::GetWindowRect($handle, [ref]$rect)

  $width = $rect.Right - $rect.Left
  $height = $rect.Bottom - $rect.Top
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}


# Click a point inside the current foreground window to trigger dedicated buttons deterministically.
function Click-ForegroundWindowPoint {
  param(
    [int]$OffsetX,
    [int]$OffsetY
  )

  $handle = [Win32Capture]::GetForegroundWindow()
  if ($handle -eq [IntPtr]::Zero) {
    throw "클릭할 활성 창을 찾지 못했습니다."
  }

  $rect = New-Object Win32Capture+RECT
  [void][Win32Capture]::GetWindowRect($handle, [ref]$rect)
  $targetX = $rect.Left + $OffsetX
  $targetY = $rect.Top + $OffsetY
  [void][Win32Capture]::SetCursorPos($targetX, $targetY)
  Start-Sleep -Milliseconds 120
  [Win32Capture]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  [Win32Capture]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
}


# Wait until the launched application exposes a main window handle for capture and focus.
function Wait-ForMainWindow {
  param([System.Diagnostics.Process]$Process)

  for ($i = 0; $i -lt 40; $i++) {
    $Process.Refresh()
    if ($Process.MainWindowHandle -ne 0) {
      return
    }
    Start-Sleep -Milliseconds 250
  }

  throw "앱 메인 창이 열리지 않았습니다."
}


# Temporarily replace the saved state, capture representative windows, then restore the user's original file.
function Invoke-CaptureWorkflow {
  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
  $storageDir = Split-Path -Parent $StoragePath
  New-Item -ItemType Directory -Force -Path $storageDir | Out-Null

  $backupPath = "$StoragePath.codex-backup"
  $hadOriginal = Test-Path $StoragePath
  if ($hadOriginal) {
    Copy-Item -LiteralPath $StoragePath -Destination $backupPath -Force
  }

  $sampleState = New-SampleState
  Write-Utf8JsonFile -Path $StoragePath -Content ($sampleState | ConvertTo-Json -Depth 8)

  $process = $null
  try {
    $process = Start-Process -FilePath $ExePath -PassThru
    Wait-ForMainWindow -Process $process
    Start-Sleep -Milliseconds 4200

    $wshell = New-Object -ComObject WScript.Shell
    [void]$wshell.AppActivate($process.Id)
    Start-Sleep -Milliseconds 600
    Save-ForegroundWindowScreenshot -Path (Join-Path $OutputDir "manager.png")

    Click-ForegroundWindowPoint -OffsetX 820 -OffsetY 150
    Start-Sleep -Milliseconds 1600
    Save-ForegroundWindowScreenshot -Path (Join-Path $OutputDir "deck-create.png")
  }
  finally {
    if ($process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force
    }

    if ($hadOriginal -and (Test-Path $backupPath)) {
      Move-Item -LiteralPath $backupPath -Destination $StoragePath -Force
    } elseif (Test-Path $backupPath) {
      Remove-Item -LiteralPath $backupPath -Force
    } elseif (Test-Path $StoragePath) {
      Remove-Item -LiteralPath $StoragePath -Force
    }
  }
}

Invoke-CaptureWorkflow
