<#
.SYNOPSIS
  Deploy the Verificacao de Carteiras dashboard to GitHub Pages via docs/ folder.
.DESCRIPTION
  1. Builds the audit-engine (TypeScript -> dist/)
  2. Copies all static frontend files to docs/
  3. Reports total size of the docs/ folder
#>

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$docs = Join-Path $root 'docs'

Write-Host "==> Step 1: Building audit-engine..." -ForegroundColor Cyan
npm --prefix "$root/audit-engine" run build
if ($LASTEXITCODE -ne 0) { throw 'audit-engine build failed' }
Write-Host "    audit-engine build OK" -ForegroundColor Green

# Remove old docs/ so stale files don't linger
if (Test-Path $docs) {
  Remove-Item -Recurse -Force $docs
}

Write-Host "`n==> Step 2: Copying static files to docs/..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $docs | Out-Null

# List of frontend files to copy (all at repo root)
$files = @(
  'index.html'
  'styles.css'
  'data.js'
  'design-tokens.js'
  'tweaks-panel.jsx'
  'utils.jsx'
  'views.jsx'
  'detail.jsx'
  'app.jsx'
  'components.jsx'
  'charts.jsx'
)

$copied = 0
foreach ($f in $files) {
  $src = Join-Path $root $f
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination (Join-Path $docs $f)
    $copied++
    Write-Host "    + $f"
  } else {
    Write-Host "    - $f (not found, skipped)" -ForegroundColor Yellow
  }
}

# Also copy data.json if it exists (some deployments use it)
$dataJson = Join-Path $root 'data.json'
if (Test-Path $dataJson) {
  Copy-Item -Path $dataJson -Destination (Join-Path $docs 'data.json')
  $copied++
  Write-Host "    + data.json"
}

Write-Host "    $copied files copied" -ForegroundColor Green

# Report total size
Write-Host "`n==> Step 3: docs/ folder summary..." -ForegroundColor Cyan
$totalBytes = (Get-ChildItem -Recurse $docs | Measure-Object -Property Length -Sum).Sum
$totalKB = [math]::Round($totalBytes / 1KB, 1)
$totalMB = [math]::Round($totalBytes / 1MB, 2)

Write-Host "    Files : $(@(Get-ChildItem -Recurse -File $docs).Count)" -ForegroundColor White
Write-Host "    Size  : ${totalKB} KB (${totalMB} MB)" -ForegroundColor White
Write-Host "    Path  : $docs" -ForegroundColor White

Write-Host "`n==> Done. Ready for GitHub Pages." -ForegroundColor Green
Write-Host "`n===== SETUP INSTRUCTIONS =====" -ForegroundColor Yellow
Write-Host "1. Commit and push the docs/ folder to the master branch"
Write-Host "2. Go to: https://github.com/Yan69793/verificacao-carteiras/settings/pages"
Write-Host "3. Source: Deploy from a branch"
Write-Host "4. Branch: master, folder: /docs"
Write-Host "5. Save"
Write-Host "================================" -ForegroundColor Yellow
