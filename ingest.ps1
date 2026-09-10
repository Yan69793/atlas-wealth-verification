param(
    [Parameter(Mandatory = $true)]
    [string]$Arquivo,

    [Parameter(Mandatory = $true)]
    [string]$Mes,

    [string]$Baseline = "",
    [switch]$Enrich
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Push-Location $Root
try {
    if (-not (Test-Path "audit-engine\node_modules")) {
        Write-Host "Instalando dependencias..."
        npm --prefix audit-engine install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Instalacao das dependencias falhou com codigo $LASTEXITCODE."
            exit 1
        }
    }

    Write-Host "Compilando audit-engine..."
    npm --prefix audit-engine run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Compilacao do audit-engine falhou com codigo $LASTEXITCODE."
        exit 1
    }

    $args = @("ingest", (Resolve-Path $Arquivo).Path, "--mes", $Mes, "--out", $Root)
    if ($Baseline) { $args += @("--baseline", $Baseline) }
    if ($Enrich) { $args += "--enrich" }

    node audit-engine\dist\src\cli.js @args
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Ingestao falhou com codigo $LASTEXITCODE."
        exit 1
    }
}
finally {
    Pop-Location
}

exit 0
