# CLAUDE.md — Instruções obrigatórias para agentes

Estas regras valem para qualquer agente que trabalhe neste repositório.

## Segurança de dados (LGPD)

- Nunca adicionar ao Git a pasta `Verificação Mensal de Carteiras Mirabaud/`
- Nunca adicionar ao Git a pasta `Verificação Mensal de Carteiras/`
- Nunca adicionar ao Git a pasta `Verificação de carteiras/`
- Nunca versionar PDFs, DOCX, XLSX, ZIPs ou quaisquer dados reais/LGPD
- `platform-data-real.js`, `platform-data-audit.js`, `platform-historico.js` são LGPD e estão no .gitignore
- Se esses arquivos aparecerem em `git status`, investigar e corrigir o `.gitignore` antes de prosseguir

## Arquitetura pós-fusão (2026-07-14)

SPA unificado (sem build, React 18.3.1 + Recharts 2.12.7 + Chart.js 4.4.0 + Babel Standalone).

### Ordem de carregamento (index.html)
1. CSS: `platform-styles.css` (3 temas: editorial/slate/midnight)
2. Design tokens: `platform-tokens.js` (JS puro, window.AtlasTokens)
3. CDNs: React, ReactDOM, Babel, PropTypes, Recharts, Chart.js, TanStack Virtual
4. Parsers: `platform-parsers.js` (window.AtlasParsers)
5. Dados: `platform-data-real.js` (LGPD), `platform-data.js` (demo), `platform-data-risk.js`, `platform-data-audit.js` (LGPD), `platform-historico.js` (LGPD)
6. Utils: `platform-utils.jsx` (AtlasUtils, AtlasIcons, AtlasCharts, AtlasUI)
7. Páginas (12): dashboard, carteira, report, achados, comparativo, receitas, cadastro, busca, import, usuarios, risco, tendencia
8. Shell: `platform-app.jsx` (ÚLTIMO)

### Rotas (12)
dashboard, carteira/:code, achados, comparativo, receitas, cadastro, busca, risco, tendencia, importar, usuarios, dev/relatorio/:code

### Namespaces
AtlasData, AtlasParsers, AtlasUtils, AtlasIcons, AtlasCharts, AtlasUI, AtlasContexts, AtlasPages, AtlasTokens, AUDIT_DATA, HISTORICO_DATA

### Scripts npm
- `npm test`: tests/validate.js + audit-engine tests
- `npm run serve`: http.server na porta 7821
- `npm run build-historico`: node build-historico.mjs (gera historico.json)
- `npm run pipeline`: node audit-engine/pipeline-all.mjs (ingestão batch)

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

## Encoding

- Todos os arquivos devem estar em UTF-8 sem BOM
- Não usar encoding alternativo (Latin-1, Windows-1252)
- Verificar ausência de mojibake após qualquer reescrita de arquivo
