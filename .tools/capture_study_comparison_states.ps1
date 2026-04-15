param(
  [string]$ExePath = 'C:\quiz_app\src-tauri\target\debug\quiz_day_builder_desktop.exe',
  [string]$StoragePath = "$env:APPDATA\com.quizday.builder\app_data.json",
  [string]$OutputDir = 'C:\quiz_app\docs\ui_benchmark_2026-04-15\study_capture'
)

Add-Type -AssemblyName System.Drawing
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
$InvokeActionScript = 'C:\quiz_app\.tools\invoke_ui_action.ps1'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32StudyCapture {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@

function Write-Utf8JsonFile([string]$Path,[string]$Content) {
  [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

function New-SampleState {
  return @{
    settings = @{ delay_ms = 1500; default_day_size = 30 }
    decks = @(
      @{
        id = 'bench-deck'
        name = 'Study Comparison Sample'
        cover_image_data_url = ''
        delay_ms = 1800
        day_size = 10
        cards = @(
          @{ id = 'c1'; question_html = '<p>hello</p>'; answer_html = '<p>A</p>' },
          @{ id = 'c2'; question_html = '<p>there</p>'; answer_html = '<p>B</p>' },
          @{ id = 'c3'; question_html = '<p>good-bye</p>'; answer_html = '<p>C</p>' },
          @{ id = 'c4'; question_html = '<p>D</p>'; answer_html = '<p>D</p>' }
        )
        days = @(
          @{ day = 1; name = 'Day 001'; card_ids = @('c1','c2','c3','c4') }
        )
        day_stats = @{
          '1' = @{ total_correct = 12; total_wrong = 5; last_correct = 3; last_wrong = 1; last_total = 4; last_mode = 'Mixed' }
        }
      }
    )
  }
}

function Wait-ForWindow([System.Diagnostics.Process]$Process) {
  for ($i = 0; $i -lt 60; $i++) {
    $Process.Refresh()
    if ($Process.MainWindowHandle -ne 0) {
      return
    }
    Start-Sleep -Milliseconds 250
  }
  throw '앱 창이 열리지 않았습니다.'
}

function Activate-App([System.Diagnostics.Process]$Process) {
  $wshell = New-Object -ComObject WScript.Shell
  [void]$wshell.AppActivate($Process.Id)
  Start-Sleep -Milliseconds 450
}

function Save-Shot([string]$FileName) {
  $handle = [Win32StudyCapture]::GetForegroundWindow()
  $rect = New-Object Win32StudyCapture+RECT
  [void][Win32StudyCapture]::GetWindowRect($handle, [ref]$rect)
  $width = $rect.Right - $rect.Left
  $height = $rect.Bottom - $rect.Top
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $bitmap.Save((Join-Path $OutputDir $FileName), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

function Send-Action([string]$ActionId, [string]$PayloadJson = '', [int]$WaitMs = 650) {
  if ($PayloadJson) {
    & $InvokeActionScript -ActionId $ActionId -PayloadJson $PayloadJson
  }
  else {
    & $InvokeActionScript -ActionId $ActionId
  }
  Start-Sleep -Milliseconds $WaitMs
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$storageDir = Split-Path -Parent $StoragePath
New-Item -ItemType Directory -Force -Path $storageDir | Out-Null
$backupPath = "$StoragePath.codex-backup"
$hadOriginal = Test-Path $StoragePath
if ($hadOriginal) {
  Copy-Item $StoragePath $backupPath -Force
}

Get-Process quiz_day_builder_desktop -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Utf8JsonFile -Path $StoragePath -Content ((New-SampleState) | ConvertTo-Json -Depth 8)

$process = $null
try {
  $process = Start-Process -FilePath $ExePath -PassThru
  Wait-ForWindow $process
  Start-Sleep -Milliseconds 5200
  Activate-App $process

  Send-Action 'manager.open-deck' '{"deckId":"bench-deck"}' 900
  Send-Action 'deck-detail.study-all' '' 900

  Send-Action 'study-launcher.select-mode' '{"mode":"Short Answer"}' 450
  Save-Shot '01-study-launcher-short-answer.png'
  Send-Action 'study-launcher.start' '' 1100
  Send-Action 'study-session.debug.short-answer.idle' '' 500
  Save-Shot '02-short-answer-idle.png'
  Send-Action 'study-session.debug.short-answer.correct-hold' '' 500
  Save-Shot '03-short-answer-correct-hold.png'
  Send-Action 'study-session.debug.short-answer.wrong-hold' '' 500
  Save-Shot '04-short-answer-wrong-hold.png'

  Send-Action 'study-session.back-to-launcher' '' 900
  Send-Action 'study-launcher.select-mode' '{"mode":"Multiple Choice"}' 450
  Save-Shot '05-study-launcher-multiple-choice.png'
  Send-Action 'study-launcher.start' '' 1100
  Send-Action 'study-session.debug.multiple-choice.idle' '' 500
  Save-Shot '06-multiple-choice-idle.png'
  Send-Action 'study-session.debug.multiple-choice.correct-hold' '' 500
  Save-Shot '07-multiple-choice-correct-hold.png'
  Send-Action 'study-session.debug.multiple-choice.wrong-hold' '' 500
  Save-Shot '08-multiple-choice-wrong-hold.png'

  Send-Action 'study-session.debug.complete.with-wrong' '' 500
  Save-Shot '09-complete-with-wrong.png'
  Send-Action 'study-session.debug.complete.perfect' '' 500
  Save-Shot '10-complete-perfect.png'

  Send-Action 'study-session.back-to-launcher' '' 900
  Send-Action 'study-launcher.select-mode' '{"mode":"Mixed"}' 450
  Save-Shot '11-study-launcher-mixed.png'
}
finally {
  if ($process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force
  }

  if ($hadOriginal -and (Test-Path $backupPath)) {
    Move-Item $backupPath $StoragePath -Force
  }
  elseif (Test-Path $backupPath) {
    Remove-Item $backupPath -Force
  }
  elseif (Test-Path $StoragePath) {
    Remove-Item $StoragePath -Force
  }
}



