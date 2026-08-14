# deploy-cf.ps1 — publica o demo publico do ATLAS.
#
# Este roteiro NAO decide o que entra no pacote. Ate 08/08/2026 ele carregava a
# propria lista de arquivos, escrita a mao, e a lista envelheceu:
# platform-custos.jsx, a pagina de transparencia de custo entregue em 07/08,
# ficou de fora e teria sumido do demo em silencio, sem erro nenhum.
#
# A montagem e do scripts/build-deploy.mjs, que deriva a lista do proprio
# index.html, recusa por nome os overlays de dado real, retira do index as tags
# opcionais cujo arquivo nao existe e aborta se qualquer binario chegar na
# saida. Pagina nova passa a ser publicada sozinha.
#
# Uso:
#   ./scripts/deploy-cf.ps1 -Target worker [-DryRun] [-SkipDeploy]
#   ./scripts/deploy-cf.ps1 -Target pages -ProjectName <projeto> [-DryRun]
#
# -Target worker  publica como Worker de assets estaticos, configurado em
#                 demo-worker/wrangler.toml. O nome do Worker vem de la, nao
#                 daqui, para nao existirem dois lugares dizendo o nome.
#                 Funciona com o token de Workers que ja esta em uso.
#
# -Target pages   publica no Cloudflare Pages. Exige -ProjectName e um token
#                 com "Account > Cloudflare Pages > Edit". Em 08/08/2026 o
#                 token em uso respondia HTTP 403 nesse escopo, e por isso o
#                 caminho padrao virou o Worker.
#
# -ProjectName nao tem default de proposito. O projeto antigo (atlas-wealth)
# nao e assumido aqui: material comercial vai para destino novo, e default
# silencioso e exatamente como se publica no lugar errado.

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('worker', 'pages')]
  [string]$Target,

  [string]$ProjectName,

  [switch]$DryRun,
  [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

if ($Target -eq 'pages' -and -not $ProjectName) {
  Write-Error "-Target pages exige -ProjectName."
  return
}

# Cada alvo le os assets de um lugar diferente, entao o pacote e montado no
# lugar que o alvo espera em vez de ser copiado depois.
if ($Target -eq 'worker') {
  $outRel = "demo-worker/public"
  $workerDir = Join-Path $root "demo-worker"
  if (-not (Test-Path (Join-Path $workerDir "wrangler.toml"))) {
    Write-Error "demo-worker/wrangler.toml ausente. Nada foi publicado."
    return
  }
} else {
  $outRel = "dist-deploy"
}
$out = Join-Path $root $outRel

Write-Host "Montando o pacote com build-deploy.mjs..." -ForegroundColor Cyan

Push-Location $root
try {
  node scripts/build-deploy.mjs --out $outRel
  if ($LASTEXITCODE -ne 0) {
    Write-Error "build-deploy.mjs abortou. Nada foi publicado."
    return
  }
} finally {
  Pop-Location
}

# Rede de seguranca independente da varredura do build-deploy.mjs. Custa nada e
# cobre o caso de alguem liberar um overlay la e esquecer aqui.
$proibidos = @('platform-data-real.js', 'platform-data-audit.js', 'platform-historico.js', 'platform-brand.js', 'platform-oportunidades.js', 'platform-vencimentos.js', 'platform-caixa-parado.js', 'platform-receita-drop.js', 'data.js', 'historico.js')
$achados = Get-ChildItem -Recurse -File $out | Where-Object { $proibidos -contains $_.Name }
if ($achados) {
  Write-Error ("Dado real no pacote, publicacao cancelada: " + ($achados.Name -join ', '))
  return
}

$count = (Get-ChildItem -Recurse -File $out).Count
Write-Host "Pacote pronto: $count arquivos em $out" -ForegroundColor Green

if ($DryRun) {
  Write-Host "Dry run concluido. Nada foi publicado." -ForegroundColor Yellow
  return
}

if ($SkipDeploy) {
  Write-Host "SkipDeploy ativo. Pacote pronto em $out" -ForegroundColor Yellow
  return
}

if ($Target -eq 'worker') {
  Write-Host "`nPublicando como Worker (demo-worker/wrangler.toml)..." -ForegroundColor Cyan
  Push-Location $workerDir
  try {
    npx wrangler deploy
    if ($LASTEXITCODE -eq 0) {
      Write-Host "`nPublicado. O endereco workers.dev sai impresso acima." -ForegroundColor Green
    } else {
      Write-Error "Publicacao falhou com codigo $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
} else {
  Write-Host "`nPublicando no Cloudflare Pages, projeto '$ProjectName'..." -ForegroundColor Cyan
  Push-Location $root
  try {
    npx wrangler pages deploy $out --project-name=$ProjectName --commit-dirty=true
    if ($LASTEXITCODE -eq 0) {
      Write-Host "`nPublicado. Confira o endereco impresso acima." -ForegroundColor Green
    } else {
      Write-Error "Publicacao falhou com codigo $LASTEXITCODE. Se for permissao, o token precisa de Cloudflare Pages:Edit."
    }
  } finally {
    Pop-Location
  }
}
