# deploy-nova-conta.ps1, publica o demo na conta Cloudflare nova do ATLAS.
#
# Usa o mesmo pacote e as mesmas travas do deploy normal (build-deploy.mjs +
# lista de proibidos), mas publica com demo-worker/wrangler.nova-conta.toml,
# que aponta para a conta dedicada (6448fd4d57773e5e38cbd1a763283a90).
#
# O token da conta nova NAO fica gravado em arquivo: o script le da variavel
# de ambiente CLOUDFLARE_API_TOKEN_ATLAS (escopo User ou do processo). Para
# definir, fora do chat:
#   [Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN_ATLAS','<valor>','User')
#
# Uso (o build vem antes, como no deploy normal):
#   npm run build
#   ./scripts/deploy-nova-conta.ps1 -Whoami   # valida token e conta
#   ./scripts/deploy-nova-conta.ps1 -DryRun   # monta o pacote sem publicar
#   ./scripts/deploy-nova-conta.ps1           # publica na conta nova

param(
  [switch]$Whoami,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

function Get-TokenAtlas {
  $t = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_ATLAS', 'User')
  if (-not $t) { $t = $env:CLOUDFLARE_API_TOKEN_ATLAS }
  if (-not $t) {
    Write-Error "CLOUDFLARE_API_TOKEN_ATLAS nao definida (escopo User nem do processo). Defina fora do chat e rode de novo."
    return $null
  }
  return $t
}

# O ambiente do processo volta ao padrao ao sair: a conta antiga continua
# sendo o alvo dos deploys normais.
$prevToken = $env:CLOUDFLARE_API_TOKEN
$prevAcct = $env:CLOUDFLARE_ACCOUNT_ID

try {
  $tokenAtlas = Get-TokenAtlas
  if (-not $tokenAtlas) { return }

  $env:CLOUDFLARE_API_TOKEN = $tokenAtlas
  $env:CLOUDFLARE_ACCOUNT_ID = "6448fd4d57773e5e38cbd1a763283a90"

  $workerDir = Join-Path $root "demo-worker"
  $cfg = Join-Path $workerDir "wrangler.nova-conta.toml"
  if (-not (Test-Path $cfg)) {
    Write-Error "demo-worker/wrangler.nova-conta.toml ausente. Nada foi publicado."
    return
  }

  Push-Location $workerDir
  try {
    if ($Whoami) {
      npx wrangler whoami
      if ($LASTEXITCODE -ne 0) { Write-Error "whoami falhou com codigo $LASTEXITCODE." }
      return
    }

    Write-Host "Montando o pacote com build-deploy.mjs..." -ForegroundColor Cyan
    Push-Location $root
    try {
      node scripts/build-deploy.mjs --out demo-worker/public
      if ($LASTEXITCODE -ne 0) {
        Write-Error "build-deploy.mjs abortou. Nada foi publicado."
        return
      }
    } finally {
      Pop-Location
    }

    # Rede de seguranca identica a deploy-cf.ps1: dado real nunca entra.
    $proibidos = @('platform-data-real.js', 'platform-data-audit.js', 'platform-historico.js', 'platform-brand.js', 'platform-oportunidades.js', 'platform-vencimentos.js', 'platform-caixa-parado.js', 'platform-receita-drop.js', 'data.js', 'historico.js')
    $achados = Get-ChildItem -Recurse -File (Join-Path $workerDir "public") | Where-Object { $proibidos -contains $_.Name }
    if ($achados) {
      Write-Error ("Dado real no pacote, publicacao cancelada: " + ($achados.Name -join ', '))
      return
    }
    $count = (Get-ChildItem -Recurse -File (Join-Path $workerDir "public")).Count
    Write-Host "Pacote pronto: $count arquivos" -ForegroundColor Green

    if ($DryRun) {
      Write-Host "Dry run concluido. Nada foi publicado na conta nova." -ForegroundColor Yellow
      return
    }

    Write-Host "Publicando na conta nova (wrangler.nova-conta.toml)..." -ForegroundColor Cyan
    # Trava real dos secrets (o wrangler nao tem [secrets]). Secret e por
    # CONTA: o da conta antiga nao propaga pra ca, entao a checagem usa o
    # config da conta nova.
    $secrets = npx wrangler secret list -c wrangler.nova-conta.toml 2>&1
    $faltando = @()
    if (-not ($secrets -match 'DEMO_SENHA'))     { $faltando += 'DEMO_SENHA' }
    if (-not ($secrets -match 'RESEND_API_KEY')) { $faltando += 'RESEND_API_KEY' }
    if (-not ($secrets -match 'DEMO_EMAIL'))     { $faltando += 'DEMO_EMAIL' }
    if ($LASTEXITCODE -ne 0 -or $faltando.Count -gt 0) {
      Write-Error ("Secrets ausentes na conta nova: " + ($faltando -join ', ') + ". Rode antes: npx wrangler secret put <NOME> --name app-verificacao-carteiras-atlas (com CLOUDFLARE_API_TOKEN_ATLAS no ambiente).")
      return
    }
    npx wrangler deploy -c wrangler.nova-conta.toml --no-autoconfig
    if ($LASTEXITCODE -eq 0) {
      Write-Host "`nPublicado na conta nova. O endereco workers.dev sai impresso acima." -ForegroundColor Green
    } else {
      Write-Error "Publicacao falhou com codigo $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
} finally {
  $env:CLOUDFLARE_API_TOKEN = $prevToken
  $env:CLOUDFLARE_ACCOUNT_ID = $prevAcct
}
