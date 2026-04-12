param(
  [string]$UvExe = ""
)

$ErrorActionPreference = "Stop"

if (-not $UvExe) {
  $UvExe = Join-Path $env:LOCALAPPDATA "Programs\Anki\uv.exe"
}

if (-not (Test-Path $UvExe)) {
  throw "uv.exe not found: $UvExe"
}

Set-Location $PSScriptRoot

# Install a local Python toolchain for the project if one is not already available.
& $UvExe python install 3.13

# Create a project-local virtual environment.
& $UvExe venv --python 3.13

$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
  throw "Virtualenv python not found: $python"
}

# Install runtime and build dependencies into the local venv.
& $UvExe pip install --python $python PyQt6 PyInstaller

# Build a desktop executable.
& $python -m PyInstaller `
  --noconfirm `
  --clean `
  --windowed `
  --name QuizDayBuilder `
  --add-data "data;data" `
  main.py
