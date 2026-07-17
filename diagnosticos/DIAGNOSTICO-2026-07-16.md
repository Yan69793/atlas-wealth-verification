# DIAGNÓSTICO — ATLAS (atlas-wealth-verification)
**Data:** 2026-07-16 18:30 BRT
**Alvo:** Repositório local `E:\Diretorio\Claude\ATLAS` + `http://localhost:7821`
**Método:** auditoria generalista (Blocos A-F), modo `--readonly`
**Raw:** diagnosticos/audit-raw-20260716-183253.json
**Screenshots:** audit-ui-desktop-20260716-183253.png, audit-ui-mobile-20260716-183253.png

## 1. Descoberta e drift

- `git status --short`: `M platform-data.js` (22 insercoes, 3 delecoes)
- `git log -1 --oneline`: `f2d1b02 feat: build-deploy monta o diretorio a publicar com allowlist`
- Branch: `main` (sem branches paralelas abertas)
- Ultimo diagnostico: `DIAGNOSTICO-2026-07-15.md` (ontem, escopo parcial sem UI ativa)
- Versao em codigo: `package.json` → `0.1.0`
- Nao ha versao em producao comparavel (deploy GitHub Pages nao verificado nesta rodada)

**Drift (P1):** `platform-data.js` tem alteracoes nao commitadas. O diff cobre:
- `injectRealData()`: remocao idempotente de managers (antes so removia `'REAIS'`, agora remove qualquer manager injetado anteriormente)
- `injectRealData()`: suporte a array `D.managers` com multiplos managers reais (nome, codes, roaTarget) em vez do fallback unico `'REAIS'`
- `injectRealData()`: fee por carteira (`p.fee != null ? p.fee : MFEE`) em vez de MFEE global fixo

Mudancas sao funcionais e ampliam cobertura de dados reais. Nao versionadas ha pelo menos 1 commit de distancia (o commit atual `f2d1b02` e de build/deploy, nao de dados).

## 2. HTTP / APIs

- Servidor: `python -m http.server 7821` (SimpleHTTP/0.6 Python/3.11.9)
- Status: 200 OK, Content-Type: text/html, 4574 bytes
- Headers: sem HSTS, CSP, X-Frame-Options (esperado para dev server local)
- Sem endpoints de API — SPA estatico, dados em memoria
- `audit-engine` nao estava ativo nesta rodada (requer `node dist/server.js` manual; nao iniciado para preservar readonly)

## 3. UI / Playwright

Resultados completos em `audit-raw-20260716-183253.json`.

**Navegacao:** 10/11 rotas OK (11 rotas testadas). A rota `#/achados` foi marcada como "ERRO" pelo script por falso positivo — o KPI tile "Erros bloqueantes" (linha 17 de platform-achados.jsx) contem a palavra "Erro", que o detector simplistico capturou. A pagina renderiza 1797 caracteres de conteudo e esta funcional.

**Console:**
- 6x `Failed to load resource: 404` — 3 arquivos LGPD gitignored (`platform-data-real.js`, `platform-data-audit.js`, `platform-historico.js`) + `favicon.ico`. Todos os 3 JS tem `onerror="void(0)"` no `<script>`. Esperado, inofensivo.
- 6x `Warning: defaultProps will be removed` — Recharts 2.12.7 com React 18.3.1. Achado P23 do PENDENCIAS.md, status ACEITO. Sem impacto funcional.

**Interacoes:**
- Dashboard: 21 elementos interativos encontrados, 10 clicaveis
- Importacao: `input[type=file]` presente
- Tabelas: nenhum `th` ou `[data-col]` encontrado nos fontes JSX (as tabelas usam markup div-based, nao HTML semantico de tabela). O teste de sort nao se aplica a este markup.

**Mobile (390px):**
- Sem overflow horizontal detectado
- Screenshot capturado, renderizacao dentro do viewport

## 4. Seguranca / LGPD

- `.gitignore`: politica deny-by-default (`*` na raiz, liberacao explicita por extensao). Robusta contra novos artefatos.
- `git check-ignore -v` confirma: 3 pastas de carteiras reais + `platform-data-real.js` + `platform-data-audit.js` + `platform-historico.js` corretamente gitignored.
- `git ls-files .env`: zero arquivos `.env` versionados (raiz e `audit-engine/`).
- Secrets scan em `platform-data.js`, `platform-app.jsx`, `platform-utils.jsx`: zero ocorrencias de `api_key`, `secret`, `token`, `password`, `senha`, `JWT_SECRET`.

> **Correcao (2026-07-17):** este scan cobriu apenas 3 arquivos de aplicacao, e a conclusao "Sem secrets versionados" (secao 8) era um falso negativo. Uma varredura ampla (`git grep` sobre todos os arquivos rastreados) encontrou a `DIRECTOR_KEY` literal em `docs/superpowers/plans/2026-07-17-fase-0-seguranca-e-rede.md`, versionada no mesmo commit deste diagnostico. A chave foi redigida antes de qualquer push e precisa ser rotacionada no Cloudflare. A varredura tambem achou fallbacks default (`your-secret-key-change-in-production`) em `audit-engine/src/auth/jwt.ts:4-5` (nao sao segredos reais, mas devem sair para variavel de ambiente sem default permissivo) e um `accountId` de Cloudflare com e-mail pessoal em `mcps/cloudflare-api/tools/execute.json`. Auditoria de segredo daqui em diante varre todos os rastreados, nao um subconjunto.
- Autenticacao: ausente por desenho (`CLAUDE.md:42-43`). Sem regressao — `tests/validate.js` confirma ausencia de senha fixa.

## 5. Infra

- Local: Python HTTP server (dev apenas)
- Deploy: GitHub Pages (`yan69793.github.io/atlas-wealth-verification/`) conforme README
- Cloudflare: sem `wrangler.toml` no repo — Worker/Pages nao configurado
- `audit-engine`: servidor Node/TypeScript独立, roda local com `npm run server`

## 6. Automacao

- `npm test` (full):
  - Raiz (`tests/validate.js`): **149/149 checks OK**
  - `audit-engine` (`node --test`): **8/8 testes OK**, 2 skipped (fixtures de dado real ausentes)
- Task Scheduler: nao verificado (sem scripts de automacao Windows identificados no repo)
- `build-deploy.mjs`: script de build para publicacao (feat do commit `f2d1b02`)
- `build-historico.mjs`: gera `historico.json` a partir de `audit-engine/audits/`
- `pipeline-all.mjs`: ingestao batch de books

## 7. Problemas (P0/P1/P2/P3)

| ID | Severidade | Descricao | Evidencia |
|----|-----------|-----------|-----------|
| P1-001 | P1 | `platform-data.js` com +22/-3 linhas nao commitadas. Mudancas em `injectRealData()`: suporte a multiplos managers, idempotencia e fee por carteira. Codigo funcional nao versionado — risco de perda em caso de checkout ou falha de disco | `git diff platform-data.js` |
| P3-001 | P3 | 3 arquivos LGPD + `favicon.ico` geram 404 no carregamento. Todos os 3 JS tem `onerror="void(0)"`. Ruido no console, sem impacto funcional | Console log: 6x 404 |
| P3-002 | P3 | Recharts 2.12.7 emite 6 warnings `defaultProps will be removed` por carregamento de pagina. Achado P23 do PENDENCIAS.md, ja classificado como ACEITO | Console log: 6x warning |

## 8. OK sem acao

- 157/157 testes passando (149 raiz + 8 audit-engine), zero regressoes
- LGPD: `.gitignore` deny-by-default, todas as superficies sensiveis cobertas
- 11 rotas de navegacao renderizam conteudo (o falso positivo em `#/achados` e inofensivo)
- Mobile sem overflow horizontal
- ~~Sem secrets versionados, sem `.env` no Git~~ **Retificado (secao 4):** havia a `DIRECTOR_KEY` versionada em `docs/`; `.env` segue ausente do Git
- Sem regressao de autenticacao (senha fixa continua ausente, validado por `tests/validate.js`)
- Importacao: input de arquivo presente e funcional
- Dashboard: 21 elementos interativos aceitaram clique sem lancar excecao (o teste nao verifica mudanca de estado, rota ou conteudo — nao prova que "respondem" no sentido funcional)

## 9. Proximos passos

1. **P1-001:** Commitar ou descartar as alteracoes em `platform-data.js`. Se forem parte de feature em progresso, avaliar se ha mais arquivos pendentes de commit.
2. **P3-001:** Adicionar `favicon.ico` ao projeto (opcional, cosmetico).
3. Proxima auditoria: testar com `audit-engine` ativo (`npm run server`) + verificar deploy no GitHub Pages (Bloco B completo em producao).
