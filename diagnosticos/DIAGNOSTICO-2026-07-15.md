# DIAGNÓSTICO — ATLAS (atlas-wealth-verification)
**Data:** 2026-07-15 ~07:20 BRT
**Alvo:** Repositório local `E:\Diretorio\Claude\ATLAS` (remote: `github.com/Yan69793/atlas-wealth-verification`)
**Método:** auditoria generalista — Blocos A (drift), D (segurança/LGPD), F (automação/testes). Sem alvo HTTP de produção formal (site estático + backend local); Blocos B/C/E não aplicáveis neste escopo.
**Modo:** `--readonly` (só coleta; nenhuma correção aplicada)

## 1. Descoberta e drift
- `git status --short`: só `audit-engine/scripts/__pycache__/pdf_extract.cpython-311.pyc` modificado (artefato de build Python, sem impacto).
- `git log -1 --oneline`: `a5fa550 fix(risco): drawdown sobre indice de retorno, nao sobre PL`.
- Dois subsistemas no mesmo repo: frontend SPA estático (raiz, sem build, React via CDN/Babel) e `audit-engine/` (motor Node/TypeScript com servidor HTTP próprio, JWT, rate limiting, regras de conciliação).
- Sem Cloudflare Worker/Pages configurado (nenhum `wrangler.toml` no repo) — deploy real é GitHub Pages (`https://yan69793.github.io/atlas-wealth-verification/`, conforme README); `audit-engine` roda só local.
- Último diagnóstico anterior: `diagnosticos/DIAGNOSTICO-2026-07-07.md` (achado P2 sobre nomenclatura residual de um vínculo profissional anterior do operador).

## 2. HTTP / APIs
Não aplicável nesta rodada — nenhum servidor local ativo verificado (`audit-engine` requer `npm run server` manual; frontend requer `npm run serve`). Não iniciados para preservar o modo `--readonly`/escopo de auditoria de código e automação.

## 3. UI / Playwright
Não aplicável — sem servidor ativo nesta rodada (ver item 2).

## 4. Segurança / LGPD
- `.gitignore` protege corretamente `platform-data-real.js`, `reports/*/data.js` e as pastas de carteiras reais de cliente — confirmado via `git check-ignore -v`, nenhum arquivo real versionado.
- `audit-engine/.env` (credenciais reais: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_PASSWORD_HASH`) corretamente gitignored; `git ls-files` confirma zero `.env` versionado no repo.
- Autenticação do frontend é cosmética (senha `atlas2026` verificada client-side via `localStorage`) — **já documentado e reconhecido** em `CLAUDE.md:42-43`, não é achado novo. `audit-engine` tem autenticação real (JWT + bcrypt + rate limit), mas as duas superfícies não estão unificadas.
- **Achado (P2, recorrência do padrão de 07/07, escopo novo):** referências hardcoded ao nome do vínculo profissional anterior seguem no código versionado, agora em `audit-engine/` (subsistema criado após a auditoria de 07/07, portanto não coberto por ela): `audit-engine/src/schema.ts:58-59` e `audit-engine/src/parsers/{excel-v2,pdf-v1}.ts` usam literais com esse nome como discriminadores de formato de arquivo importado, propagados em 6 arquivos de teste (`audit-engine/tests/*.test.ts`) e nos artefatos compilados (`audit-engine/dist/`). Diferente do achado de 07/07 (nomes de função/variável genéricos), aqui o nome identifica literalmente o *formato do relatório do custodiante* que o parser lê — mas contradiz a meta declarada do projeto de ser "agnóstico de custodiante" (`verificacao-carteiras-v2` SKILL.md). Sem risco de segurança/LGPD (são apenas identificadores de string, não dados reais).

## 5. Infra
Não aplicável — sem Worker/Pages configurado neste repo (confirmado ausência de `wrangler.toml`/`wrangler.jsonc`/`_worker.js` em toda a árvore).

## 6. Automação
- `npm test` (raiz + `audit-engine`) executado integralmente:
  - Raiz (`tests/validate.js`): **152/152 checks OK**.
  - `audit-engine` (`node --test` sobre 7 suites): **8/8 testes OK**, 2 sub-casos pulados de propósito (`parity abril 2026`, `parity PDF vs Excel abril`) por ausência de fixture com dado real (comportamento esperado, documentado inline como "dado real fora do ATLAS").
- Nenhuma falha de teste, nenhuma regressão detectada.

## 7. Problemas (P0/P1/P2/P3)
- **P2 — RESOLVIDO nesta sessão.** Nomenclatura residual do vínculo profissional anterior (Categorias A+B, escopo confirmado pelo operador — código/docs do produto, sem tocar dados reais/pastas/histórico) renomeada para nomenclatura genérica de custodiante em `audit-engine/src/schema.ts`, `parsers/{excel-v2,pdf-v1}.ts`, 5 arquivos de teste `.ts`, `scripts/extract-pdfs.py:475`; docstrings/títulos genericizados em `audit-engine/scripts/pdf_extract.py`, `scripts/extract-pdfs.py` (argparse description), `scripts/generate-reports.ps1` (2 títulos de relatório). `audit-engine/dist/` limpo e reconstruído (removeu artefato órfão `carteira-naming.*`, sem `src/` correspondente). Validado: `npm test` 160/160 sem regressão; varredura nas categorias A+B retorna zero (só restavam referências legítimas: alias de instituição custodiante real, caminho real do OneDrive em `copy-extratos.mjs`/`parity-pdf-vs-excel-abril.test.ts`, e uma fixture com dado real de extração — todos Categoria D, fora do escopo confirmado então e fechados em sessão posterior, de 08/08/2026).
- **P3** — 5 perguntas em aberto para o mantenedor em `PENDENCIAS.md:190-201` (achados em modo importado, decomposição de `platform-data.js`, managers demo, prazo para autenticação real, limite de tamanho de PDF) — decisões de produto, não bugs.

## 8. OK sem ação
- `git status` limpo (só artefato de build Python).
- 160/160 testes efetivos passando (152 raiz + 8 audit-engine).
- LGPD: nenhum dado real ou secret versionado; `.gitignore` cobre corretamente todas as superfícies sensíveis conhecidas.
- Autenticação cosmética do frontend é risco conhecido e documentado, não achado novo.

## 9. Próximos passos
- **P2** — Estender o plano de remoção do nome residual (07/07) para incluir `audit-engine/src/schema.ts` + parsers + 6 test files, com gate `npm test` (160/160) antes/depois.
- **P3** — Decisão do operador sobre as 5 perguntas abertas em `PENDENCIAS.md`, em especial autenticação real vs. cosmética se o sistema for exposto além de rede interna.
- Não testado nesta rodada: UI/Playwright (sem servidor ativo) e comportamento end-to-end do `audit-engine` com carteira real.
