param(
  [string]$SourceRoot = 'C:\quiz_app\src',
  [string]$OutputMdPath = 'C:\quiz_app\docs\2026-04-16\03_SYMBOL_MAP.md',
  [string]$OutputJsonPath = 'C:\quiz_app\docs\2026-04-16\03_SYMBOL_MAP.json'
)

Set-StrictMode -Version Latest
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function ConvertTo-RelativePath {
  param([string]$Path)

  $basePath = 'C:\quiz_app\'
  $relative = $Path
  if ($relative.StartsWith($basePath)) {
    $relative = $relative.Substring($basePath.Length)
  }
  return ($relative -replace '\\', '/')
}

function Get-ExportSymbols {
  param([string]$FilePath)

  $content = Get-Content -Raw -LiteralPath $FilePath
  $symbols = New-Object System.Collections.Generic.List[object]

  foreach ($match in [regex]::Matches($content, '(?m)^export\s+(?<kind>function|const|class|interface|type|enum)\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)')) {
    $symbols.Add([pscustomobject]@{
      Kind = $match.Groups['kind'].Value
      Name = $match.Groups['name'].Value
      File = $FilePath
    })
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
        $symbols.Add([pscustomobject]@{
          Kind = 're-export'
          Name = $symbol
          File = $FilePath
        })
      }
    }
  }

  return $symbols
}

$files = Get-ChildItem -LiteralPath $SourceRoot -Recurse -File -Include *.ts, *.tsx | Sort-Object FullName
$symbols = foreach ($file in $files) { Get-ExportSymbols -FilePath $file.FullName }
$grouped = $symbols | Group-Object File | Sort-Object Name

$jsonPayload = [ordered]@{
  status = 'generated'
  generatedAt = (Get-Date).ToString('yyyy-MM-dd')
  sourceRoot = $SourceRoot
  publicEntryPoints = @(
    @{ path = 'src/App.tsx'; purpose = 'app shell entry' }
    @{ path = 'src/apps/desktop-builder/index.ts'; purpose = 'desktop-builder route boundary' }
    @{ path = 'src/apps/mobile-quiz/index.ts'; purpose = 'mobile-quiz route boundary' }
    @{ path = 'src/features/study/session/index.ts'; purpose = 'study-session public API' }
  )
  files = @()
  symbolIndex = [ordered]@{}
}

foreach ($group in $grouped) {
  $entry = [ordered]@{
    path = ConvertTo-RelativePath $group.Name
    symbols = @()
  }

  foreach ($symbol in ($group.Group | Sort-Object Kind, Name)) {
    $entry.symbols += [ordered]@{
      kind = $symbol.Kind
      name = $symbol.Name
    }

    if (-not $jsonPayload.symbolIndex.Contains($symbol.Name)) {
      $jsonPayload.symbolIndex[$symbol.Name] = @()
    }
    $jsonPayload.symbolIndex[$symbol.Name] += @{
      kind = $symbol.Kind
      path = ConvertTo-RelativePath $group.Name
    }
  }

  $jsonPayload.files += $entry
}

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
[void]$builder.AppendLine('- Output MD: `docs/2026-04-16/03_SYMBOL_MAP.md`')
[void]$builder.AppendLine('- Output JSON: `docs/2026-04-16/03_SYMBOL_MAP.json`')
[void]$builder.AppendLine('- Start from `index.ts` barrel files before opening feature internals.')
[void]$builder.AppendLine('- JSON is the machine-readable source for other Codex runs.')
[void]$builder.AppendLine('')
[void]$builder.AppendLine('## Public Entry Points')
foreach ($entryPoint in $jsonPayload.publicEntryPoints) {
  [void]$builder.AppendLine(('- `' + $entryPoint.path + '` -> ' + $entryPoint.purpose))
}
[void]$builder.AppendLine('')
[void]$builder.AppendLine('## Exported Symbols')
foreach ($fileEntry in $jsonPayload.files) {
  [void]$builder.AppendLine('### ' + $fileEntry.path)
  foreach ($symbol in $fileEntry.symbols) {
    [void]$builder.AppendLine(('- `' + $symbol.kind + '` `' + $symbol.name + '`'))
  }
  [void]$builder.AppendLine('')
}

[System.IO.File]::WriteAllText($OutputMdPath, $builder.ToString(), $Utf8NoBom)
[System.IO.File]::WriteAllText($OutputJsonPath, ($jsonPayload | ConvertTo-Json -Depth 8), $Utf8NoBom)
Write-Host ('Wrote ' + $OutputMdPath)
Write-Host ('Wrote ' + $OutputJsonPath)
