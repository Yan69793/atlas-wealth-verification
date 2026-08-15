# DIAGNÓSTICO — ATLAS Wealth Verification
**Data:** 2026-07-30
**Alvo:** https://atlas.szuchmacher.com.br / https://atlas-instancia.prospects-intel.workers.dev
**Método:** auditoria generalista (blocos A–F)
**Motivo:** Abas não funcionando após deploy com correção de fee/ROA

## 1. Descoberta e drift

- Working tree: 3 arquivos modificados (platform-data.js, platform-receitas.jsx, platform-carteira.jsx) — mudanças intencionais de correção fee/ROA
- Último commit: `592c263 chore: hardening CLAUDE.md`
- Worker deploy: versão `936409d6` (último)
- Pages deploy: FALHOU — token Cloudflare sem permissão Pages:Edit

## 2. HTTP / APIs

- `GET /` → Cloudflare Access (custom domain) pede auth — esperado
- `GET /` via workers.dev → 200 OK, SPA carrega
- 9/9 assets estáticos → 200 OK, sem BOM

## 3. UI / Playwright

Não executado (Python venv ausente). Verificação alternativa:

- `platform-data.js` deployado SEM BOM (primeiro byte `2F` = `/`)
- Todos os 9 JS/JSX/CSS carregam com status 200
- Cache da Cloudflare: MISS nos assets (conteúdo fresco)

## 4. Problemas

### P0 — RESOLVIDO: BOM em platform-data.js
- **Causa:** Arquivo platform-data.js tinha BOM UTF-8 (EF BB BF) no início
- **Efeito:** Navegador falha ao parsear a IIFE `(function() { ... })()` — JavaScript inteiro não executa
- **Evidência:** Primeiro byte do arquivo era `EF` em vez de `2F` (`/` do `/*`)
- **Correção:** BOM removido com `[IO.File]::WriteAllBytes` + redeploy Worker
- **Pós-correção:** Arquivo começa com `/*`, Content-Length reduziu de 73595 para 73592 (-3 bytes do BOM)

### P1 — Pages deploy falhou
- O token em uso tem permissão Workers mas não Pages (prefixo omitido deste registro de propósito)
- Demo público (`atlas-wealth-63u.pages.dev`) está desatualizado
- Necessário token com permissão `Cloudflare Pages:Edit`

## 5. OK sem ação

- 153/153 checks do validate.js passando
- 10/10 testes do audit-engine passando
- Sem mojibake em nenhum arquivo
- npm test limpo

## 6. Automação

- `npm test` → passa (153 checks + 10 tests)
- `npm run serve` → python http.server na porta 7821
- Deploy Worker: `npx wrangler deploy` em `verificacao-carteiras/worker/`

## 7. Próximos passos

1. Testar abas no navegador (forçar cache refresh: Ctrl+Shift+R)
2. Obter token Cloudflare com Pages:Edit e rodar `scripts/deploy-cf.ps1`
