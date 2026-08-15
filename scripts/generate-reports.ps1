# generate-reports.ps1
<#
.SYNOPSIS
  Gera relatorios HTML estaticos por mes a partir dos audits/*/audit.json
.DESCRIPTION
  - Le audits/*/audit.json e extrai o dashboard de cada mes
  - Cria reports/<mes>/index.html + data.js para cada mes
  - Cria reports/index.html como pagina de entrada com tabela de todos os meses
  - Usa o index.html raiz como template, ajustando paths e titulo
#>

$ErrorActionPreference = 'Stop'
$ROOT = Resolve-Path "$PSScriptRoot/.."
$AUDITS_DIR = "$ROOT/audits"
$REPORTS_DIR = "$ROOT/reports"
$TEMPLATE = "$ROOT/index.html"

# --- helpers ---
# Windows PowerShell 5.x: -Encoding UTF8 grava BOM (EF BB BF) e quebra JS no browser.
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
function Write-TextNoBom([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

function Get-MonthLabel($ym) {
    $parts = $ym -split '-'
    $y = [int]$parts[0]
    $m = [int]$parts[1]
    $MESES = '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
             'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    return "$($MESES[$m]) $y"
}

function Get-MonthSlug($ym) {
    # "2026-05" -> "2026-05"
    return $ym
}

function New-PerMonthReport($monthDir, $dashboardJson, $periodo) {
    Write-Host "  -> $monthDir"

    # Garantir diretorio
    $null = New-Item -ItemType Directory -Path $monthDir -Force

    # Gravar data.js local com o dashboard do mes
    $dataJs = "window.AUDIT_DATA = $dashboardJson;"
    Write-TextNoBom "$monthDir/data.js" $dataJs

    # Ler template, ajustar paths e titulo
    $html = Get-Content $TEMPLATE -Raw -Encoding UTF8

    $refLabel = $periodo.referenciaLabel
    $pageTitle = "Verificação Mensal de Carteiras · $refLabel"

    # Atualizar titulo
    $html = $html -replace '<title>[^<]+</title>', "<title>$pageTitle</title>"

    # Ajustar paths relativos ,  estando em reports/<mes>/, subimos um nivel
    # styles.css -> ../styles.css, data.js fica local, demais .js/.jsx -> ../
    $html = $html -replace 'src="(?!https?://)([^"]+)"', 'src="../$1"'
    $html = $html -replace 'href="(?!https?://)([^"]+)"', 'href="../$1"'

    # data.js deve ficar local (ja esta no mesmo diretorio)
    $html = $html -replace 'src="\.\./data\.js"', 'src="data.js"'

    Write-TextNoBom "$monthDir/index.html" $html
}

function New-LandingPage($months) {
    Write-Host "Criando reports/index.html..."

    $rows = ''
    foreach ($m in $months) {
        $slug = Get-MonthSlug $m.mes
        $label = Get-MonthLabel $m.mes
        $link = "<a href=`"$slug/`">$label</a>"

        $rows += @"
            <tr>
              <td>$link</td>
              <td class="num">$($m.totals.total)</td>
              <td class="num status-liberar">$($m.totals.liberar)</td>
              <td class="num status-alerta">$($m.totals.alerta)</td>
              <td class="num status-corrigir">$($m.totals.corrigir)</td>
            </tr>
"@
    }

    $html = @"
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Verificação de Carteiras · Relatórios Mensais</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f5f5f7;
      color: #1d1d1f;
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container {
      max-width: 820px;
      width: 100%;
    }
    header {
      margin-bottom: 2rem;
    }
    header h1 {
      font-size: 1.6rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: #1d1d1f;
    }
    header p {
      font-size: 0.9rem;
      color: #6e6e73;
      margin-top: 0.3rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #e8e8ed;
    }
    th {
      background: #f5f5f7;
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #6e6e73;
    }
    td {
      font-size: 0.9rem;
    }
    td.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    td a {
      color: #0071e3;
      text-decoration: none;
      font-weight: 500;
    }
    td a:hover { text-decoration: underline; }
    .status-liberar { color: #30a74e; }
    .status-alerta { color: #b86500; }
    .status-corrigir { color: #c41e3a; }
    footer {
      margin-top: 2rem;
      font-size: 0.8rem;
      color: #8e8e93;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Relatórios Mensais</h1>
      <p>Verificação de carteiras</p>
    </header>
    <table>
      <thead>
        <tr>
          <th>Mês</th>
          <th class="num">Carteiras</th>
          <th class="num">Liberar</th>
          <th class="num">Alerta</th>
          <th class="num">Corrigir</th>
        </tr>
      </thead>
      <tbody>
$rows
      </tbody>
    </table>
    <footer>
      <a href="../">Abrir dashboard principal</a>
    </footer>
  </div>
</body>
</html>
"@

    Write-TextNoBom "$REPORTS_DIR/index.html" $html
}

# --- Main ---
Write-Host ""
Write-Host "=== Gerador de Relatorios Mensais ==="
Write-Host ""

# Coletar todos os meses disponiveis
$auditFiles = Get-ChildItem -Path "$AUDITS_DIR/*/audit.json" -Recurse
Write-Host "Encontrados $($auditFiles.Count) arquivos de audit"

$months = @()

foreach ($af in $auditFiles) {
    $mes = $af.Directory.Name
    Write-Host "Processando $mes..."

    $json = Get-Content $af.FullName -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 15

    $dashboardJson = Get-Content $af.FullName -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 15
    $dashboard = $dashboardJson.dashboard

    if (-not $dashboard) {
        Write-Warning "  audit.json sem dashboard ,  pulando $mes"
        continue
    }

    $monthDir = "$REPORTS_DIR/$mes"

    New-PerMonthReport $monthDir ($dashboardJson.dashboard | ConvertTo-Json -Depth 10 -Compress) $dashboard.summary.periodo

    $months += [PSCustomObject]@{
        mes    = $mes
        label  = $dashboard.summary.periodo.referenciaLabel
        totals = $dashboard.summary.totals
    }
}

# Ordenar meses (mais recente primeiro na tabela)
$months = $months | Sort-Object mes -Descending

# Landing page
New-LandingPage $months

Write-Host ""
Write-Host "=== Concluído ==="
Write-Host "$($months.Count) meses processados"
foreach ($m in $months) {
    Write-Host "  $($m.label) → reports/$($m.mes)/"
}
