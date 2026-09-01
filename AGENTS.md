# AGENTS.md — Instruções obrigatórias para agentes

Estas regras valem para qualquer agente que trabalhe neste repositório.

## Estado do projeto

Antes de qualquer trabalho, leia `ESTADO/LEIA-PRIMEIRO.md` e `ESTADO/ESTADO-ATUAL.md`
(fonte única de estado; se divergirem do CLAUDE.md, o ESTADO ganha). O estado do
produto, pendências e decisões em aberto vivem lá, não aqui.

## Segurança de dados (LGPD)

- Este repositório é o **produto**. Dado de cliente e pasta de instância ficam fora do git.
- Nunca versionar pastas de instância (`Verificação Mensal de Carteiras*`, `Verificação de carteiras/`) nem PDFs, DOCX, XLSX, ZIPs ou qualquer dado real/LGPD
- Overlays LGPD/instância: `platform-data-real.js`, `platform-data-audit.js`, `platform-historico.js`, `platform-brand.js`, `platform-radar/demo.js`, `platform-credito/demo.js`, `platform-oportunidades/vencimentos/caixa-parado/receita-drop` (os `-demo` são o fallback sintético; os sem sufixo são o overlay real da instância) — todos no `.gitignore`
- Nome de carteira, apelido de família, código real e caminho de pasta de cliente não entram em teste, doc de produto nem config versionada
- Se essas pastas/arquivos aparecerem em `git status`, investigar e corrigir o `.gitignore` antes de prosseguir

## Arquitetura (build Vite, pós-fusão)

SPA com hash-rotas. Build: `vite build` → `dist-app/` a partir de `src/main.jsx`.
React 18.3.1 + Recharts 2.12.7 + Chart.js 4.4.0, empacotados no bundle (React/ReactDOM/
Recharts viraram globals via `globalThis` no topo).

### Ordem de carregamento — `src/main.jsx` É o contrato
`tokens → parsers → dados(demo + overlays) → utils → páginas → shell`. Import fora
de ordem quebra em tela branca (as páginas leem window.* no topo do módulo).
`tests/validate.js` trava essa ordem.

1. `platform-tokens.js` (window.AtlasTokens) — design tokens
2. `platform-parsers.js` (window.AtlasParsers) — importação CSV/Excel
3. `platform-data.js` (demo), `platform-data-risk.js`, e os fallbacks `-demo.js`
   (historico/oportunidades/vencimentos/caixa-parado/receita-drop/radar/credito)
4. `platform-consolidado.js` — decisão cruzada (lê radar+crédito)
5. `platform-utils.jsx` (AtlasUtils, AtlasIcons, AtlasCharts, AtlasUI)
6. Páginas — **lazy-load por rota** via `PAGE_LOADERS` em `platform-app.jsx`
   (cada `platform-X.jsx` registra `window.AtlasPages.*` e só baixa na visita/hover)
7. `platform-app.jsx` shell (monta ReactDOM) — **ÚLTIMO**

### Overlays de dado real (sempre for a do bundle)
Overlays são scripts clássicos de runtime, NUNCA entram no bundle. O Vite retira as
tags deles no build (`vite.config.mjs`), senão quebra a compilação (não existem no repo
do produto). Quem reinjeta: em produção o Worker da instância (no HTML servido, rota
autenticada do R2); localmente `scripts/gen-index.mjs` da instância.

### Namespaces
AtlasData, AtlasParsers, AtlasUtils, AtlasIcons, AtlasCharts, AtlasUI, AtlasContexts,
AtlasPages, AtlasTokens, HISTORICO_DATA (+ AUDIT_DATA).

### Comandos npm
- `npm run dev` — Vite com HMR (`npm run serve` = `vite preview`, porta 7821)
- `npm run build` — Vite → `dist-app/` (produção; overlay não entra)
- `npm test` — `node tests/validate.js` + audit-engine tests (pré-commit obrigatório)
- `npm run lint` — sinônimo de `tests/validate.js`
- `npm run build-historico` — `node build-historico.mjs` (gera historico.json)
- `npm run pipeline` — `node audit-engine/pipeline-all.mjs` (ingestão batch)
- `npm run seed:demo` — `node scripts/seed-snapshot-demo.mjs`
- Publicação demo: `npm run build`, depois `scripts/deploy-cf.ps1 -Target worker`
  (bloqueada se `dist-app/` contiver overlay/binário/marca dev — `scripts/verify-build.mjs`)

## Autenticação

- Este app não autentica. Não há tela de login, senha nem sessão, por desenho
- A senha fixa `atlas2026` foi removida: ficava no bundle e no README, então
  sinalizava proteção sem proteger. `tests/validate.js` falha se ela voltar
- O perímetro é do deploy: Cloudflare Access na frente, e o Worker validando o
  JWT por conta própria antes de servir dado
- Não reintroduzir gate no cliente. Comparar credencial no navegador é teatro

## Antes de finalizar qualquer mudança

1. Rodar `git status` — working tree deve estar limpo (exceto pelas mudanças intencionais)
2. Rodar `npm test` — todos os checks devem passar antes do commit
3. Para alterações não triviais, delegar a revisão final ao subagente `code-reviewer` (`.claude/agents/code-reviewer.md`). O agente implementador não pode substituir essa revisão por uma simples releitura própria. Após receber o parecer, corrigir todos os problemas materiais e rodar de novo as validações

## Testes

- Não criar features novas sem manter `tests/validate.js` atualizado quando aplicável
- Checks de integridade estrutural são mínimos; não removê-los sem aprovação explícita do operador
- `tests/validate.js` trava: ordem de import do `main.jsx`, presença das páginas em `PAGE_LOADERS`, ausência da string `atlas2026`

## Encoding

- Todos os arquivos devem estar em UTF-8 sem BOM
- Não usar encoding alternativo (Latin-1, Windows-1252)
- Verificar ausência de mojibake após qualquer reescrita de arquivo

## Notes

- Projeto viaja com 3 repos git (produto + estável `verificacao-carteiras/` + `core/`,
  gitlinks). Dado real sempre fora do git do produto.
- Contexto completo do sistema e do motor de auditoria: skills `atlas-sistema` e
  `atlas-audit-engine`.

