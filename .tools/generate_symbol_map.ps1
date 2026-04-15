param(
  [string]$SourceRoot = 'C:\quiz_app\src',
  [string]$OutputPath = 'C:\quiz_app\docs\2026-04-16\03_SYMBOL_MAP.md'
)

Set-StrictMode -Version Latest
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Get-ExportSymbols {
  param([string]$FilePath)

  $content = Get-Content -Raw -LiteralPath $FilePath

  foreach ($match in [regex]::Matches($content, '(?m)^export\s+(?<kind>function|const|class|interface|type|enum)\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)')) {
    [pscustomobject]@{
      Kind = $match.Groups['kind'].Value
      Name = $match.Groups['name'].Value
      File = $FilePath
    }
  }

  foreach ($line in $content -split "`r?`n") {
    $trimmed = $line.Trim()
    if (-not $trimmed.StartsWith('export {')) {
      continue
    }
    $fromIndex = $trimmed.IndexOf(' from ')
    if ($fromIndex -lt 0) {
      continue
    }
    $openBrace = $trimmed.IndexOf('{')
    $closeBrace = $trimmed.IndexOf('}')
    if ($openBrace -lt 0 -or $closeBrace -le $openBrace) {
      continue
    }

    $body = $trimmed.Substring($openBrace + 1, $closeBrace - $openBrace - 1)
    foreach ($entry in $body.Split(',')) {
      $symbol = ($entry -split '\s+as\s+')[-1].Trim()
      if ($symbol) {
        [pscustomobject]@{
          Kind = 're-export'
          Name = $symbol
          File = $FilePath
        }
      }
    }
  }
}

$files = Get-ChildItem -LiteralPath $SourceRoot -Recurse -File -Include *.ts, *.tsx | Sort-Object FullName
$symbols = foreach ($file in $files) { Get-ExportSymbols -FilePath $file.FullName }
$grouped = $symbols | Group-Object File | Sort-Object Name
$basePath = 'C:\quiz_app\'

$builder = New-Object System.Text.StringBuilder
[void]$builder.AppendLine('# Symbol Map')
[void]$builder.AppendLine('')
[void]$builder.AppendLine('Status: generated')
[void]$builder.AppendLine('Date: 2026-04-16')
[void]$builder.AppendLine('')
[void]$builder.AppendLine('## Purpose')
[void]$builder.AppendLine('- Lightweight map for locating functions, types, and components by name.')
[void]$builder.AppendLine('- Docs/tools only. No runtime code changes.')
[void]$builder.AppendLine('')
[void]$builder.AppendLine('## How To Use')
[void]$builder.AppendLine('- Run: `powershell -ExecutionPolicy Bypass -File .tools/generate_symbol_map.ps1`')
[void]$builder.AppendLine('- Output: `docs/2026-04-16/03_SYMBOL_MAP.md`')
[void]$builder.AppendLine('- Start from `index.ts` barrel files before opening feature internals.')
[void]$builder.AppendLine('')
[void]$builder.AppendLine('## Public Entry Points')
[void]$builder.AppendLine('- `src/App.tsx` -> app shell entry')
[void]$builder.AppendLine('- `src/apps/desktop-builder/index.ts` -> desktop-builder route boundary')
[void]$builder.AppendLine('- `src/apps/mobile-quiz/index.ts` -> mobile-quiz route boundary')
[void]$builder.AppendLine('- `src/features/study/session/index.ts` -> study-session public API')
[void]$builder.AppendLine('')
[void]$builder.AppendLine('## Exported Symbols')
foreach ($group in $grouped) {
  $relative = $group.Name
  if ($relative.StartsWith($basePath)) {
    $relative = $relative.Substring($basePath.Length)
  }
  $relative = $relative -replace '\\', '/'
  [void]$builder.AppendLine(('### ' + $relative))
  foreach ($entry in ($group.Group | Sort-Object Kind, Name)) {
    [void]$builder.AppendLine(('- `' + $entry.Kind + '` `' + $entry.Name + '`'))
  }
  [void]$builder.AppendLine('')
}

[System.IO.File]::WriteAllText($OutputPath, $builder.ToString(), $Utf8NoBom)
Write-Host ('Wrote ' + $OutputPath)
