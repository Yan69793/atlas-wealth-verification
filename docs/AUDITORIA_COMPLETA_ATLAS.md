# Auditoria Completa — ATLAS Wealth Verification

Data-base: 2026-07-25  
Versao auditada: ATLAS v4.x (SPA unificada pos-fusao 2026-07-14)  
Arquivos: 14 paginas JSX + 4 modulos de dados + CSS + parsers + motor de auditoria Node.js

---

## Sumario executivo

O ATLAS e uma SPA React 18.3.1 sem build, com 12 rotas, 40 carteiras demo deterministicas (seed PRNG), 3 temas, e um motor de auditoria Node.js separado (audit-engine/). O sistema funciona, tem cobertura de testes estruturais, protecao contra regressao de seguranca (sem senha fixa, SRI nos CDNs), e uma quantidade razoavel de tratamento de estados vazios.

Problemas criticos encontrados:

1. Calculos financeiros misturados com geracao de dados sinteticos no mesmo modulo (platform-data.js, 1752 linhas)
2. Nenhum teste para calculos financeiros (retorno, volatilidade, Sharpe, Sortino, drawdown, VaR)
3. Sistema sem consolidado patrimonial entre carteiras
4. Sem metricas de performance avancadas (Sharpe, Sortino, tracking error, information ratio)
5. Design system parcial: tokens CSS duplicados entre :root e platform-tokens.js, cores hardcoded em Recharts
6. Pagina de usuarios sem autenticacao real (localStorage apenas)
7. Motor de auditoria separado (audit-engine/) nao integrado ao frontend
8. Sem documentacao de metodologias financeiras
9. innerHTML zero (bom), mas inline styles extensivos (consistencia ruim)
10. Estados vazios presentes mas tratamento de erro poroso: boundary so cobre a area de conteudo

---

## 1. Mapa completo de rotas

| # | Path hash | ID interno | Componente | Arquivo | Sidebar |
|---|---|---|---|---|---|
| 1 | `#/dashboard` | dashboard | `AtlasPages.Dashboard` | platform-dashboard.jsx | Sim |
| 2 | `#/carteira/:code` | carteira | `AtlasPages.Carteira` | platform-carteira.jsx | Nao (via click) |
| 3 | `#/achados` | achados | `AtlasPages.Achados` | platform-achados.jsx | Sim |
| 4 | `#/comparativo` | comparativo | `AtlasPages.Comparativo` | platform-comparativo.jsx | Sim |
| 5 | `#/receitas` | receitas | `AtlasPages.Receitas` | platform-receitas.jsx | Sim |
| 6 | `#/cadastro` | cadastro | `AtlasPages.Cadastro` | platform-cadastro.jsx | Sim |
| 7 | `#/busca` | busca | `AtlasPages.Busca` | platform-busca.jsx | Sim |
| 8 | `#/risco` | risco | `AtlasPages.Risco` | platform-risco.jsx | Sim |
| 9 | `#/tendencia` | tendencia | `AtlasPages.Tendencia` | platform-tendencia.jsx | Sim |
| 10 | `#/importar` | importar | `AtlasPages.Importar` | platform-import.jsx | Sim |
| 11 | `#/usuarios` | usuarios | `AtlasPages.Usuarios` | platform-usuarios.jsx | Sim |
| 12 | `#/dev/relatorio/:code` | dev-relatorio | `AtlasPages.DevRelatorio` | platform-report.jsx | Nao (interna) |

**Rotas ausentes** (nao existem no sistema atual):
- Consolidado patrimonial entre carteiras
- Visao por instituicao
- Visao por emissor/gestor
- Pagina de configuracao (temas salvo em localStorage, mas sem painel de settings)
- Pagina de politica de investimento (SAA)
- Historico de importacoes/versoes
- API/documentacao de endpoints

**Navegacao entre paginas**: dashboard -> carteira -> dev/relatorio; achados -> carteira; comparativo -> carteira; receitas -> carteira; busca -> carteira. Fluxo hierarquico, sem breadcrumbs.

---

## 2. Mapa de componentes

### 2.1 Componentes compartilhados (platform-utils.jsx)

| Componente | Tipo | Props | Estados |
|---|---|---|---|
| `Icon` | SVG inline | name, size, className, style | 23 icones |
| `LineChart` | Recharts wrapper | series, height, showLegend | Loading (Recharts ausente), Empty |
| `HBar` | Barras horizontais | items, maxItems | Agregacao "Outros" |
| `Badge` | Presentacional | status, label | 5 variantes CSS |
| `StatusDot` | Presentacional | status | 3 cores |
| `SeverityBadge` | Presentacional | severity | CORRIGIR/COM ALERTA/INFO |
| `Chip` | Interativo | active, label, onClick, className | hover, active |
| `KPITile` | Presentacional | label, value, sub, variant, onClick, minWidth | 4 variants (red/amber/navy/green) |
| `EmptyState` | Presentacional | title, sub, icon | 4 icones |
| `Spinner` | Presentacional | nenhuma | SVG animado |
| `SeloChip` | Dados | month | Selado/Nao selado |
| `ToastContainer` | Sistema | toasts | Auto-dismiss 3.5s |

### 2.2 Componentes por pagina (principais)

**Dashboard**: KpiRow, BlockedBanner, AlertsSection, PlChart (Recharts AreaChart), Toolbar, PortfolioTable (ThSort)

**Carteira**: RiskAttributionSection, TabComposicao (PieChart + tabela expansivel), TabAchados, TabHistorico (LineChart + tabela + underwater chart), TabReceita, TabContaCorrente, ObsBlock

**Risco**: NivelBadge, ScoreBar, DrawerDetalhe (radar SVG + sparkline), ScenarioCard, RiscoHeatmap, FilaAcao

**Achados**: KpiStrip, TabMesAtual, TabRecidiva, TabAnomalias, TabLimpas, TabFilaExcecao (ExceptionNoteCell)

**Receitas**: BadgeVsMeta, TabSerie, TabGestor, TabCliente

**Tendencia**: TrendChart (Chart.js), HeatCell (React.createElement, sem JSX)

**Import**: DragDrop, pdfPreview, perfilOverrides

**DevRelatorio**: HTML gerado via string template com escH(), renderizado em iframe srcDoc

---

## 3. Fluxo de dados

```
index.html (ordem de carregamento)
  -> platform-tokens.js (tema, brand)
  -> platform-data.js (demo 40 carteiras deterministicas)
  -> platform-data-real.js (LGPD, opcional, overlay)
  -> platform-data-risk.js (risk scoring)
  -> platform-historico.js/demo.js (historico mensal)
  -> platform-utils.jsx (componentes, formatadores, router)
  -> [12 paginas JSX]
  -> platform-app.jsx (shell, contexts, mount)
```

Dados trafegam via `window.AtlasData.*` (namespace global). Nao ha gerenciamento de estado React (Context so para month, auth, toast). A cada navegacao ou mudanca de dados (evento `atlas:datachange`), o App remonta com `key={page + ':' + dataVersion}`.

**Fontes de dados**:
- Demo: PRNG deterministico (seed `20260411`), 40 carteiras, 36 meses
- Real: `window._AtlasRealData` injetado por `platform-data-real.js` (LGPD, gitignored)
- Importado: CSV/XLSX/PDF via `platform-parsers.js` -> `importPortfolioData()`

---

## 4. Modelo de dados

### 4.1 Estruturas core

**CATALOG**: Array de `{ code, name, risk, inception, mgr }` (40 demo + N reais)

**MANAGERS**: Array de `{ id, name, codes, roaTarget }` (4 demo + N reais)

**_portfolioData[code]**: `{ fee, plArr[36], nnmArr[36], retArr[36], feeArr[36], reportedPlPrevArr[36] }`

**STATUS_SCRIPT[code|month]**: `'LIBERAR' | 'COM ALERTA' | 'CORRIGIR'`

**_importCompositions[code|month]**: Array de `{ name, cls, institution, vencto, saldoInicial, saldoFinal, varBRL, retAtivo, contrib, pct }`

**_compCache[code|month]**: Memoizacao da composicao demo (mesmo schema)

**_dataMode**: `'demo' | 'real' | 'imported'`

### 4.2 Estruturas de auditoria

**FINDING_TEMPLATES**: 7 templates (2 CORRIGIR, 4 COM ALERTA, 1 INFO)

**Exceptions (localStorage)**: `{ status, assignee, note, overrideMotivo, overrideAt, updatedAt }`

### 4.3 Benchmarks (hardcoded)

- CDI: 36 meses (2024-01 a 2026-12), fonte nao documentada para 2026-07+
- IPCA: 30 meses (2024-01 a 2026-06), fonte: Banco Central SGS 433
- IBOV: 30 meses (2024-01 a 2026-06), fonte: Yahoo Finance ^BVSP

**Risco**: placeholder para Jul–Dez/2026 repete ultimo valor conhecido. Comentario no codigo diz que e placeholder para demo.

---

## 5. Funcoes financeiras

### 5.1 Implementadas (platform-data.js + platform-data-risk.js)

| Funcao | Formula | Localizacao |
|---|---|---|
| Retorno mensal (demo) | `cdi * beta + sigma * N(0,1)`, clamp [-2%, +3.5%] | materialize() L332-333 |
| Net New Money (demo) | `plPrev * (0.002 + 0.012 * N(0,1))`, clamp [-4%, +6%] | materialize() L335-336 |
| PL atual | `plPrev * (1 + ret) + nnm`, floor R$100k | materialize() L341-342 |
| Retorno real | `(plCurr - plPrev) / plPrev` | getRow() |
| TWR acumulado | `prod(1 + ret) - 1` | portfolioReportData(), twrAgregado() |
| TWR agregado | `sum(weight_i * ret_i) / sum(weight_i)` | twrAgregado() |
| Continuidade | `|plCurr - (reportedPlPrev*(1+ret)+nnm)| / reportedPlPrev` | getRow() |
| ROA | `revenue / aum` | revenueSeries() |
| Drawdown 6M | `(peak - current) / peak` sobre indice de retorno | riskScore() L78-85 |
| HHI | `sum(classPcts[cls]^2)` ex-Liquidez | riskScore() L103-106 |
| Risk Score | `mercado + concentracao + liquidez + suitability + operacional`, cap 100 | riskScore() |
| Stress loss | `sum(shocks[cls] * pct * plCurr)` | riskStress() |
| Excesso de retorno | `ret - cdi` | getRow() |
| Concentration | `code.pl / totalPl` | concentration() |
| Fee audit | `|revenue - expected| / expected` | audit() |

### 5.2 NAO implementadas (ausentes)

| Metrica | Status |
|---|---|
| Volatilidade (desvio padrao) | Nao implementada |
| Sharpe ratio | Nao implementado |
| Sortino ratio | Nao implementado |
| Tracking error | Nao implementado |
| Information ratio | Nao implementado |
| VaR historico | Nao implementado |
| Expected Shortfall (CVaR) | Nao implementado |
| Captura de alta/baixa | Nao implementado |
| Max drawdown (serie completa) | Apenas drawdown 6M no riskScore |
| Tempo de recuperacao | Nao implementado |
| Duration | Nao implementado |
| Correlacao entre ativos | Nao implementado |
| Downside deviation | Nao implementado |
| Exposicao cambial | Nao implementado |
| Exposicao a juros | Nao implementado (apenas stress scenario) |
| Exposicao a credito | Nao implementado |
| Liquidez por prazo (D+0, D+1...) | Classificacao binaria "menos liquido" apenas |
| Yield to maturity | Nao implementado |
| Duration de carteira | Nao implementado |

---

## 6. Modulos duplicados

### 6.1 Design tokens duplicados

`platform-styles.css` define tokens CSS no `:root` (L6-39) E `platform-tokens.js` define os mesmos tokens como objeto JavaScript (L15-115). Alterar uma paleta exige editar dois arquivos. `platform-tokens.js` aplica tokens inline no `documentElement.style` enquanto o CSS usa `var(--token)`. Risco de divergencia entre JS e CSS.

### 6.2 Formatadores de moeda duplicados

- `window.AtlasUtils.fmtBRL` (platform-utils.jsx) — para React
- `rFmtBRL` (platform-report.jsx) — para HTML de relatorio
- `.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})` inline em varios lugares

Mesma logica de formatacao em 3 lugares, com variacoes sutis (ex.: "R$ 1.2 mi" vs "R$ 1,2 mi").

### 6.3 Gerenciamento de localStorage

`storage` object (platform-utils.jsx) centraliza leitura/escrita, mas varias paginas leem `localStorage` diretamente (ex.: tema em Topbar, alertas config).

### 6.4 Status badge

3 implementacoes diferentes de status badge:
- `Badge` component (platform-utils.jsx) — generico
- `SeverityBadge` component (platform-utils.jsx) — para findings
- `StatusBadge` inline (platform-comparativo.jsx) — duplicado, com STATUS_STYLE proprio

### 6.5 Geracao de HTML (relatorio)

`renderReportHTML()` em platform-report.jsx gera HTML inteiro via concatenacao de string. Nao reutiliza componentes React. Duplica formatadores, estilos, e logica de apresentacao que ja existem nos componentes React.

---

## 7. Calculos inconsistentes

### 7.1 PL anterior: dois valores diferentes

`getRow()` retorna:
- `plPrev` = `reportedPlPrevArr[mi]` (PL reportado, pode divergir em CORRIGIR)
- `plPrevTrue` = `plArr[mi-1]` (PL real do mes anterior)

A maioria das paginas usa `plPrev` (reportado) para calculos de variacao, o que e correto para auditoria (mostra a divergencia). Mas o `twrAgregado()` usa `weight = plArr[mi-1]` (PL real) para ponderacao, consistente.

### 7.2 Drawdown usa indice de retorno, nao PL

`riskScore()` calcula drawdown 6M sobre indice de retorno (`idxCurr = idxCurr * (1 + retArr[j])`), nao sobre PL. Isso evita distorcao por fluxo (NNM), mas nao esta documentado. O comentario no codigo menciona "para evitar flux distortion". Correto, mas opaco.

### 7.3 ROA para carteiras com inception tardio

`roaAnomalyForLateInception()` detecta ROA = 0 para UMBRA_01, UMBRA_02, COMETA_FAM (inception 2026-02/03). A deteccao e correta, mas o ROA = 0 e um artefato do modelo de dados (feeArr = 0 antes do inception). A UI mostra esse zero sem contexto, o que pode confundir.

### 7.4 normalize de composicao so ocorre no demo

`getComposition()` no demo gera caixa como residuo e renormaliza. No modo importado/real, `buildCompositionRows()` usa `saldoFinal = pl * pct` sem renormalizacao. Se a soma dos `pct` importados != 1, a tabela de composicao fica inconsistente com o PL total.

---

## 8. Problemas de seguranca

### 8.1 CRITICO: Nenhum

Nao foram encontradas vulnerabilidades criticas. Nao ha `innerHTML`, `dangerouslySetInnerHTML`, `eval()`, ou `document.write()` no codigo React. O unico HTML gerado dinamicamente (relatorio) usa `escH()` corretamente e renderiza em iframe isolado.

### 8.2 ALTO: SRI ausente em algumas CDNs

- SheetJS e pdf.js: carregados dinamicamente com SRI (sha384). OK.
- prop-types, Recharts, Chart.js, TanStack Virtual: SRI presente no index.html. OK.
- **Google Fonts CSS**: carregado sem SRI (linha 1 do platform-styles.css: `@import url('https://fonts.googleapis.com/css2?...')`). Um CDN de fonts comprometido poderia injetar CSS malicioso. Risco: MEDIO (CSS injection tem superficie de ataque limitada).

### 8.3 MEDIO: localStorage sem criptografia

- Excecoes, observacoes, configuracoes, usuarios: tudo em localStorage sem criptografia.
- Dados sensiveis de auditoria (observacao do analista, fila de excecao) acessiveis a qualquer extensao de navegador com acesso ao DOM.
- Nomes de carteiras e valores de PL no localStorage via `atlas_platform_v1`.

### 8.4 MEDIO: Upload de PDF sem validacao de tamanho

`platform-import.jsx` processa PDFs no cliente sem limite de tamanho. Um PDF malicioso com milhões de paginas pode travar o navegador (pdf.js processamento sincrono de todas as paginas).

### 8.5 BAIXO: Google Fonts carrega de dominio externo

Potencial vazamento do IP do usuario para Google, mas e esperado em aplicacoes web. Sem SRI, o CSS pode ser modificado pelo CDN.

### 8.6 POSITIVO: Senha fixa removida

`tests/validate.js` verifica ativamente que `atlas2026` nao aparece nos fontes. Check L158-171.

---

## 9. Problemas de acessibilidade

| Problema | Severidade | Pagina(s) |
|---|---|---|
| Sem link "skip to content" | MEDIO | Todas |
| Toast sem `aria-live` | MEDIO | Todas (useToast) |
| Tabelas sem `aria-label` ou caption | BAIXO | Dashboard, Carteira, Achados |
| Tab overflow com `scrollbar-width: none` (esconde indicador de scroll) | BAIXO | Carteira, Achados, Receitas |
| `:focus-visible` global usa `var(--gold)` — OK | POSITIVO | Todas |
| `sr-only` class disponivel — OK | POSITIVO | Utils CSS |
| Rows com `role="button"`, `tabIndex={0}`, `onKeyDown` | POSITIVO | Carteira, Risco, Dashboard |
| Icones com `aria-hidden="true"` | POSITIVO | Todos |
| Tabs com `role="tablist"`, `role="tab"`, `aria-selected` | POSITIVO | Achados, Receitas |

---

## 10. Problemas de responsividade

### 10.1 Unico breakpoint

Apenas `@media (max-width: 767px)`. Nao ha breakpoint para tablets (768-1024px). O layout desktop de 220px sidebar + conteudo e mantido ate 768px, onde colapsa para drawer mobile.

### 10.2 Tabelas: scroll horizontal

Todas as tabelas usam `.table-wrap { overflow-x: auto }`. Funciona, mas a experiencia em mobile e pobre: usuario precisa scroll horizontal para ver todas as colunas. Nao ha colunas priorizadas ou collapsing.

### 10.3 KPIs: forca 2 colunas

`@media (max-width: 767px)` forca `.kpi-grid { grid-template-columns: 1fr 1fr !important }`. Funciona, mas com 6+ KPIs a densidade fica alta e os valores comprimidos.

### 10.4 Seletor de tema escondido no mobile

`.topbar-theme-select { display: none }` no mobile. Usuario mobile nao consegue trocar tema.

### 10.5 Graficos: sem adaptacao mobile

Recharts e Chart.js mantem dimensoes fixas. Nao ha resize observer ou redimensionamento responsivo. Em mobile (< 400px), graficos podem cortar.

---

## 11. Problemas de impressao

### 11.1 Estilos de impressao existentes (positivo)

`@media print` em platform-styles.css (L1520-1574): esconde chrome, forca fundo branco, `break-inside: avoid` em cards/tabelas, grid KPI de 3 colunas. Bem implementado para o basico.

### 11.2 Relatorio inline (DevRelatorio)

Gera HTML standalone com estilos inline. Nao herda CSS do tema. Usa fontes do sistema (Arial). Sem numero de pagina, sem header/footer, sem data-base, sem "confidencial".

### 11.3 Graficos em impressao

Recharts SVG imprime corretamente. Chart.js (canvas) imprime mas pode perder qualidade em impressoras de baixa resolucao.

### 11.4 Ausente: exportacao PDF

Nao ha botao "Exportar PDF". O fluxo atual e: abrir relatorio em nova aba -> imprimir como PDF (via `window.print()`). Funcional, mas pouco intuitivo.

---

## 12. Dados nao utilizados

### 12.1 Benchmark IPCA e IBOV

Presentes em `BENCHMARKS`, usados apenas no grafico TWR do dashboard. Nao sao usados em: calculo de Sharpe (nao implementado), inflation adjustment, analise de retorno real.

### 12.2 RISK_PARAMS

`beta` e `sigma` usados apenas na geracao demo (materialize). Nao sao usados no risk score (platform-data-risk.js usa composicao real, nao parametros).

### 12.3 STRESS_SHOCKS

4 cenarios definidos, mas apenas 1 (default `bolsa15`) e usado ativamente via selector. Os outros 3 sao acessiveis mas o default e fixo.

### 12.4 Catalogo de ativos (ASSETS)

25 ativos definidos, mas apenas 5-9 sao usados por carteira na geracao demo. Estrutura de dados completa mas subutilizada.

---

## 13. Telas redundantes

### 13.1 Dashboard + Comparativo: sobreposicao

Ambos mostram tabela de carteiras. Dashboard foca em status/alerta, Comparativo foca em delta entre meses. Poderiam ser consolidados com filtro de periodo.

### 13.2 Achados + Alertas (Dashboard AlertsSection)

Dashboard mostra alertas G10; Achados mostra findings do mes + recidiva + anomalias + fila de excecao. Alertas G10 e findings se sobrepoem parcialmente (ambos detectam CORRIGIR, abaixo do CDI).

### 13.3 Carteira TabReceita + Receitas TabGestor

Carteira mostra ROA individual; Receitas mostra ranking de gestores. Views complementares mas nao interligadas — nao ha link da carteira para o gestor na pagina de Receitas.

---

## 14. Lacunas analiticas

### 14.1 Consolidado patrimonial (AUSENTE)

Nao existe visao consolidada entre carteiras mostrando:
- Exposicao por emissor (somando todas as carteiras)
- Exposicao por instituicao consolidada
- Sobreposicao de posicoes (mesmo ativo em multiplas carteiras)
- Concentracao real consolidada (alem do Top 10 por PL)
- Exposicao geografica/setorial/moeda

### 14.2 Performance (PARCIAL)

Apenas retorno mensal, TWR acumulado, e comparacao com CDI. Faltam: volatilidade, Sharpe, Sortino, max drawdown completo, tracking error, information ratio, captura de alta/baixa, retorno anualizado, retorno em 12/24/36 meses.

### 14.3 Risco (PARCIAL)

Risk score 0-100 com 5 dimensoes. Faltam: VaR historico, Expected Shortfall, correlacao entre ativos, contribuicao marginal ao risco, risco de cauda, backtesting.

### 14.4 Liquidez (MINIMO)

Classificacao binaria: "menos liquido" (FII/Previdencia/Internacional) vs liquido. Faltam: prazo de liquidez (D+0, D+1, D+30...), volume medio, % da carteira por faixa de liquidez.

### 14.5 Custos (PARCIAL)

ROA e fee audit implementados. Faltam: taxa de administracao vs taxa de gestao, performance fee, corretagem, custodia, rebates, custo total em % do PL, evolucao temporal de custos.

### 14.6 Alocacao estrategica (AUSENTE)

Nao ha modelo de alocacao-alvo (SAA). O sistema mostra alocacao atual, mas nao compara com politica de investimento (min, max, alvo, desvio, rebalanceamento).

### 14.7 Atribuicao de performance (AUSENTE)

Nao e possivel decompor o retorno por: alocacao, selecao, interacao, timing.

---

## 15. Lacunas de UX

| Problema | Impacto |
|---|---|
| Sem breadcrumbs | Navegacao profunda (carteira -> relatorio) sem caminho de volta visivel |
| Sem atalhos entre alerta e origem | Achado lista o problema, mas e preciso clicar para ver o detalhe |
| Filtros nao persistentes entre paginas | Trocar de pagina perde filtro aplicado |
| Sem pesquisa global | Busca so existe na pagina Busca por Ativo |
| Sem atalhos de teclado | Navegacao 100% mouse |
| Toast generico sem acao | Toast mostra "Exportado" mas nao permite acao (ex.: abrir arquivo) |
| Sem confirmacao ao sair de pagina com alteracao | ObsBlock salva automaticamente (bom), mas sem indicacao visual de "salvo" |
| Tabela sem virtualizacao | Com 40+ carteiras e muitos meses, a performance e aceitavel, mas nao escala para 500+ |

---

## 16. Lacunas de governanca

| Problema |
|---|
| Sem changelog versionado (wrangler.toml versionado, mas sem changelog de produto) |
| Sem documentacao de API (o worker e um proxy, nao tem endpoints documentados) |
| Sem politique de retencao de dados (dados ficam em localStorage indefinidamente) |
| Sem registro de auditoria de acessos (nao ha log de quem acessou qual carteira) |
| Sem controle de versao de dados importados (nao ha como reverter uma importacao) |
| Sem documentacao de modelos financeiros (formulas implementadas sem referencia) |

---

## Classificacao consolidada

### Por criticidade

| Criticidade | Quantidade | Principais |
|---|---|---|
| CRITICO | 2 | Calculos misturados com dados sinteticos, sem testes financeiros |
| ALTO | 8 | Sem consolidado, metricas faltantes, design duplicado, sem SAA, sem nucleo de calculos puro |
| MEDIO | 15 | Acessibilidade parcial, responsividade limitada, localStorage sem criptografia, PDF sem validacao |
| BAIXO | 12 | CSS duplicate, formatadores redundantes, dados subutilizados, telas com sobreposicao |

### Por impacto

| Impacto | Principais areas |
|---|---|
| Funcional | Consolidado, metricas de performance, VaR, alocacao-alvo, liquidez detalhada, custos |
| Arquitetural | Separacao dados/calculos, modulo financeiro puro, integracao audit-engine |
| UX | Navegacao, breadcrumbs, filtros persistentes, pesquisa global, atalhos |
| Visual | Temas com cores hardcoded, tokens duplicados, consistencia graficos |
| Governanca | Documentacao, changelog, auditoria de acesso, versionamento de dados |

### Por esforco de correcao

| Esforco | Itens |
|---|---|
| Baixo (1-2h) | Consolidar tokens CSS/JS, unificar formatadores, adicionar aria-live ao toast |
| Medio (4-8h) | Criar modulo `calculations/` puro, adicionar volatilidade/Sharpe, breadcrumbs |
| Alto (1-3 dias) | Consolidado patrimonial, pagina de alocacao-alvo, metricas avancadas |
| Muito alto (1-2 semanas) | Motor de auditoria integrado, backtesting, exportacao de dados |

---

## Prioridade recomendada

1. Separar calculos financeiros em modulo puro (`calculations/`), testavel em Node.js
2. Implementar metricas basicas de performance: volatilidade, Sharpe, max drawdown completo
3. Criar consolidado patrimonial (visao cross-carteira)
4. Unificar tokens de design (CSS + JS) e remover cores hardcoded de Recharts
5. Adicionar alocacao-alvo (SAA) com bandas e desvios
6. Melhorar acessibilidade (skip link, aria-live, labels)
7. Criar documentacao de metodologias financeiras
8. Integrar motor de auditoria (audit-engine/) ao frontend
9. Adicionar exportacao multi-formato (PDF, XLSX, JSON)
10. Implementar teste para cada formula financeira

---

## Proximos passos

1. `docs/ARQUITETURA_ALVO_ATLAS.md` — arquitetura proposta
2. `docs/DESIGN_SYSTEM_ATLAS.md` — design system unificado
3. `docs/METODOLOGIAS_FINANCEIRAS.md` — formulas e referencias
4. `docs/REGRAS_DE_ALERTA.md` — motor de alertas deterministico
5. Fase 2: reorganizacao da arquitetura da informacao (6 areas)
6. Fase 3: implementacao de metricas (performance, risco, liquidez, concentracao, custos)
7. Fases 4-13: alertas, design system, visualizacoes, navegacao, responsividade, impressao, testes

---

*Documento gerado em 2026-07-25. Base: leitura completa de 18 arquivos (14 paginas JSX, dados, estilos, parsers, testes, docs, config).*
