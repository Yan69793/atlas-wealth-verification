# deploy-cf.ps1 — Prepara dist/ limpo e faz deploy no Cloudflare Pages
# Uso: ./scripts/deploy-cf.ps1 [-DryRun] [-SkipDeploy]

param(
  [switch]$DryRun,
  [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$dist = Join-Path $root "dist"

# 1. Limpar dist existente
if (Test-Path $dist) {
  Write-Host "Limpando $dist..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force $dist
}
New-Item -ItemType Directory -Force $dist | Out-Null
New-Item -ItemType Directory -Force (Join-Path $dist "docs\templates") | Out-Null

# 2. Arquivos de producao — SPA core
$files = @(
  "index.html",
  "platform-styles.css",
  "platform-tokens.js",
  "platform-parsers.js",
  "platform-data.js",
  "platform-data-risk.js",
  "platform-historico-demo.js",
  "platform-utils.jsx",
  "platform-app.jsx",
  "platform-dashboard.jsx",
  "platform-carteira.jsx",
  "platform-report.jsx",
  "platform-achados.jsx",
  "platform-comparativo.jsx",
  "platform-receitas.jsx",
  "platform-cadastro.jsx",
  "platform-busca.jsx",
  "platform-import.jsx",
  "platform-usuarios.jsx",
  "platform-risco.jsx",
  "platform-tendencia.jsx",
  "docs\templates\atlas_template.csv"
)

# Opcionais LGPD (so se existirem na raiz)
$optFiles = @(
  "platform-data-real.js",
  "platform-data-audit.js",
  "platform-historico.js"
)

Write-Host "Copiando arquivos de producao..." -ForegroundColor Cyan

foreach ($f in $files) {
  $src = Join-Path $root $f
  $dst = Join-Path $dist $f
  $dstDir = Split-Path -Parent $dst
  if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Force $dstDir | Out-Null }
  if (Test-Path $src) {
    Copy-Item $src $dst
    if ($DryRun) { Write-Host "  [DRY] $f" -ForegroundColor Gray }
  } else {
    Write-Warning "Arquivo esperado nao encontrado: $f"
  }
}

foreach ($f in $optFiles) {
  $src = Join-Path $root $f
  if (Test-Path $src) {
    $dst = Join-Path $dist $f
    Copy-Item $src $dst
    Write-Host "  [LGPD] $f incluido" -ForegroundColor DarkYellow
  }
}

# 3. Contagem e sumario
$count = (Get-ChildItem -Recurse -File $dist).Count
Write-Host "Dist pronto: $count arquivos em $dist" -ForegroundColor Green

if ($DryRun) {
  Write-Host "Dry run concluido. Nenhum deploy executado." -ForegroundColor Yellow
  return
}

# 4. Deploy via wrangler
if (-not $SkipDeploy) {
  Write-Host "`nFazendo deploy para Cloudflare Pages..." -ForegroundColor Cyan
  Push-Location $root
  try {
    npx wrangler pages deploy $dist --project-name=atlas-wealth --commit-dirty=true
    if ($LASTEXITCODE -eq 0) {
      Write-Host "`nDeploy concluido: https://atlas-wealth-63u.pages.dev/" -ForegroundColor Green
    } else {
      Write-Error "Deploy falhou com codigo $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
} else {
  Write-Host "SkipDeploy ativo. Dist pronto em $dist" -ForegroundColor Yellow
}
