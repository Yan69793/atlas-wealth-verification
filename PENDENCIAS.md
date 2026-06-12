# PENDENCIAS.md — ATLAS Wealth Verification

Primeira auditoria. Gerado em 2026-06-12.

---

## Modelo Mental da Arquitetura

SPA estático sem etapa de build. Doze arquivos JSX/JS carregados em ordem via `<script>` no `index.html`. Babel Standalone transpila JSX no browser em runtime. Cada arquivo é um IIFE que publica seu namespace em `window` (`window.AtlasData`, `window.AtlasUtils`, `window.AtlasCharts`, `window.AtlasUI`, `window.AtlasIcons`, `window.AtlasParsers`, `window.AtlasContexts`, `window.AtlasPages`). `platform-app.jsx` — carregado por último — monta o ReactDOM e roteia via hash.

O `platform-data.js` (1521 LOC) é a camada de dados inteira: geração de demo, injeção de dados reais, cálculo de métricas, Radar de Risco, cache de composição. É o único arquivo sem JSX e o de maior churn (8 commits). Todos os outros arquivos consomem `window.AtlasData` diretamente.

Dados demo são gerados deterministicamente via seed no carregamento. Dados reais ficam em `platform-data-real.js` (gitignored, LGPD). Importação de CSV/XLSX/PDF substitui o dataset inteiro em memória via `importPortfolioData()`. Nenhum dado persiste além do localStorage de autenticação e observações de analista.

Autenticação é cosmética (localStorage, senha demo `atlas2026`). Documentado no README como intencional.

---

## Síntese

- Codebase funcionalmente estável. Sem erros de runtime críticos em produção.
- A maior dívida técnica está concentrada em `platform-data.js` (god file, 1521 LOC, 14 responsabilidades).
- Dois bugs de CSS silenciosos afetam aparência em produção: `var(--font-mono)` não definida e `var(--r)` inválida.
- `ScoreBar` renderiza barra invisível sem aviso se `score` for `null` — defensável mas silencioso.
- CDI tem três fallbacks diferentes dependendo do contexto de chamada — fonte de inconsistência calculatória.
- `loadPdfJs()` não tem timeout, pode deixar UI pendurada indefinidamente com CDN lento.
- Seis usos de `var(--font-mono)` em JSX recebem monospace genérico do browser em vez de JetBrains Mono.
- Acessibilidade básica ausente em elementos interativos chave (`<tr>` como botão, textarea sem label).
- `linePath` exportada para dois namespaces e nunca consumida — dead code.
- `platform-data.js` mistura dados inventados (achados fictícios) com dados importados — comportamento inesperado no modo real.

---

## Tabela de Achados

| ID | Categoria | Arquivo:Linha | Severidade | Esforço | Status | Descrição | Recomendação |
|---|---|---|---|---|---|---|---|
| P01 | CSS / Variável | platform-styles.css:6-37, platform-import.jsx:421,449,529,600,642, platform-carteira.jsx:72 | Alto | P | RESOLVIDO | `var(--font-mono)` referenciada em 6 pontos JSX mas não definida em `:root`. Fallback silencioso para monospace genérico do browser. JetBrains Mono não carrega nesses elementos. | `--font-mono` adicionado ao `:root`; 10 literais CSS substituídos por `var(--font-mono)` |
| P02 | CSS / Variável | platform-import.jsx:403 | Médio | P | RESOLVIDO | `borderRadius: 'var(--r)'` referencia variável inexistente. CSS define apenas `--r-sm`, `--r-md`, `--r-lg`. Botão fica com cantos quadrados. | Trocado por `'var(--r-md)'` |
| P03 | Segurança | platform-data.js:477-508 | Médio | M | ABERTO | `randomFinding()` gera narrativas com classes e percentuais **inventados** (`cls1`, `pct1`, `pct2` são aleatórios, não vêm da composição real da carteira). Em modo demo é aceitável; em modo importado, achados continuam usando dados fictícios misturados com PL real. | Para modo `imported`, inibir ou adaptar achados de mudança de alocação para usar `getComposition()` real |
| P04 | Dados / Contrato | platform-data.js:488 vs 706 vs 1266 | Médio | P | RESOLVIDO | CDI tinha três fallbacks diferentes (0.009, 0, sem guard). | Função `getCDI(month)` criada com fallback único `\|\| 0`; 3 call sites unificados |
| P05 | Dados / Contrato | platform-data.js:745 | Médio | P | ABERTO | `getRow()` retorna objeto com campo `plPrev` que na verdade é `reportedPlPrev` (PL reportado, possivelmente ajustado). Valor real está em `plPrevTrue`. Consumidores que calculam variação usando `row.plPrev` recebem PL distorcido. | Renomear `plPrev` para `plPrevReported` no objeto retornado, ou adicionar nota de campo |
| P06 | Dados / Guard | platform-risco.jsx:31-42 | Médio | P | RESOLVIDO | `ScoreBar` sem guard para null/NaN produzia barra invisível. | `Number.isFinite(score)` + clamp 0-100; exibe `'—'` quando inválido |
| P07 | UX / Empty State | platform-risco.jsx:336-442 | Médio | P | RESOLVIDO | `RiscoHeatmap` sem empty state quando `carteiras=[]`. | `<EmptyState>` adicionado antes do useMemo/tabela |
| P08 | PDF / Segurança | platform-import.jsx:57-76 | Médio | M | RESOLVIDO | `loadPdfJs()` sem timeout deixava UI pendente com CDN lento. | `_withTimeout(promise, 15000)` via `Promise.race` |
| P09 | Arquitetura | platform-data.js:1-1521 | Médio | G | ABERTO | God file: 1521 LOC, 14 responsabilidades distintas (geração demo, injeção real, cache, métricas, risco, stress, importação, achados, receita, limpas, getters). Maior arquivo + 8 commits nos últimos 6 meses. | Decompor em módulos: `atlas-data-core.js`, `atlas-data-risk.js`, `atlas-data-import.js`. Não reescrever — extrair por responsabilidade |
| P10 | Arquitetura | platform-report.jsx:119-372 | Médio | M | ABERTO | `buildReportHTML()` tem ~253 linhas misturando cálculos financeiros (TWR, CDI, histórico) e geração de HTML por concatenação de template string. Difícil de testar e manter isoladamente. | Separar em duas funções: `calcReportData(code, month)` (puro, retorna objeto) e `renderReportHTML(data)` (geração DOM) |
| P11 | Dados / Sync | platform-data.js:50-65 | Médio | P | RESOLVIDO | `MONTHS` e `MONTH_LABELS` sem validação de sincronismo. | Assert `MONTHS.length === MONTH_LABELS.length` adicionado à função `validate()` + check em `tests/validate.js` |
| P12 | PDF / UX | platform-import.jsx:169-199 | Médio | G | ABERTO | Processamento de PDF (`getDocument`, `getPage`, `getTextContent`) roda no main thread. PDFs com muitas páginas travam UI durante extração. Sem barra de progresso por página. | Documentado no README como limitação; adicionar pelo menos progresso `Página X de N` durante loop de extração |
| P13 | Dados / Config | platform-data.js:119-122 | Médio | M | ABERTO | `MANAGERS` usa `CATALOG.slice(0,14)`, `slice(14,26)`, `slice(26,35)`, `slice(35,40)` — índices hardcoded vinculados à ordem exata das 40 carteiras demo. Qualquer reordenação do CATALOG (ex: nova carteira demo no meio) invalida todos os managers silenciosamente. | Substituir slices por filtro por faixa de código: `CATALOG.filter(p => p.code.startsWith('AXIOM'))` ou propriedade `manager` no objeto de catálogo |
| P14 | Acessibilidade | platform-carteira.jsx:99, platform-risco.jsx:420 | Médio | P | ABERTO | `<tr onClick={...}>` sem `role="button"`, sem `aria-expanded`, sem `aria-label`. Leitores de tela não identificam a linha como elemento interativo. | Adicionar `role="button" tabIndex={0} aria-label={`${item.name} — clique para detalhes`} aria-expanded={isExpanded}` e handler `onKeyDown` para Enter/Space |
| P15 | Acessibilidade | platform-carteira.jsx:541-549 | Baixo | P | ABERTO | `<textarea>` de observação do analista sem `<label>` associada via `htmlFor`/`id`. Contexto visual ("Observação do Analista") existe como `.section-title`, não como elemento `<label>`. | Converter título em `<label htmlFor="obs-textarea">`, adicionar `id="obs-textarea"` no textarea |
| P16 | Dados / Edge | platform-data.js:1399-1422 | Baixo | P | RESOLVIDO | `riskStress()` caía silenciosamente para `'combinado'` com cenário inválido. | `console.warn` adicionado quando `scenario` não existe em `STRESS_SHOCKS` |
| P17 | Dead Code | platform-utils.jsx:215-225 | Baixo | P | RESOLVIDO | `linePath` exportada para dois namespaces e nunca consumida. | Removida de `window.AtlasUtils` e `window.AtlasCharts` |
| P18 | Dados / Contrato | platform-data.js:692-762 | Baixo | P | ABERTO | `getRow()` retorna `null` quando `plCurr ≤ 0`. `getComposition()` retorna `[]` (array vazio) para o mesmo cenário. Callers tratam null e [] de formas diferentes — inconsistência de contrato que causa bugs silenciosos em consumidores que não testam ambos. | Documentar contratos explicitamente em comentário acima de cada função; considerar padronizar para sempre retornar `null` quando não há dados |
| P19 | Performance | platform-carteira.jsx:26-30 | Baixo | P | RESOLVIDO | `clsMap` e `hbarItems` recalculados a cada render de `TabComposicao`. Com `comp` estável, desnecessário. | `hbarItems` envolvido em `useMemo([comp])` |
| P20 | Performance | platform-carteira.jsx:640-646 | Baixo | P | RESOLVIDO | Array `TABS` (com label dinâmica de achados) reconstruído a cada render de `Carteira`. | `TABS` envolvido em `useMemo([row && row.nAchados])` |
| P21 | PDF / Ciclo de vida | platform-import.jsx:202-257 | Baixo | P | ABERTO | `handlePDFs()` inicia chain async via `loadPdfJs()`. Se componente desmontar antes de resolver (usuário navega para outra página durante upload), `setParsed()` e `setPdfPreviews()` são chamadas em componente desmontado — gera warning React e potencial memory leak. | Usar `AbortController` ou flag `isMounted` para cancelar updates após desmount |
| P22 | Dados / Semântica | platform-data.js:488 (contexto randomFinding) | Baixo | P | ABERTO | `randomFinding()` usa `CDI[month] \|\| 0.009` como fallback — único lugar com fallback `0.009`. Se esse valor fosse 0 (padrão das outras funções), achados de underperformance seriam gerados com CDI zero, produzindo achados fictícios diferentes. Inconsistência não afeta produção mas confunde debug. | Usar `getCDI(month)` centralizado (do P04) |
| P23 | Biblioteca | index.html:43-47 (Recharts 2.12.7) | Baixo | M | ABERTO | Recharts 2.12.7 gera warnings `defaultProps will be removed` em todos os gráficos com React 18.3.1. Sem impacto funcional imediato, mas indício de incompatibilidade futura. | Acompanhar release do Recharts 3.x; por ora aceitar warnings ou suprimir com workaround oficial |
| P24 | CSS / Higiene | platform-styles.css:640,816,1022,1030,1092,1111,1127,1149,1168,1181 | Baixo | P | RESOLVIDO | `font-family: 'JetBrains Mono', monospace` literal em 10+ regras CSS em vez de `var(--font-mono)`. Junto com P01 (variável não definida nos JSX), a fonte monospace tem duas formas de referência: literal no CSS, variável indefinida nos JSX. | `--font-mono` definido em `:root` (P01) e 10 literais CSS substituídos por `var(--font-mono)` |
| P25 | Recharts / Render | platform-dashboard.jsx:277, platform-carteira.jsx:225 | Baixo | P | ABERTO | `ResponsiveContainer width="100%"` em gráficos de linha no dashboard e tab Histórico — potencial render inicial em branco (Recharts precisa medir container antes de renderizar). O pie chart já foi corrigido com dimensões fixas (commit 1857fce). | Para gráficos de linha: adicionar `debounce={50}` ao ResponsiveContainer ou trocar `width="100%"` por `width="99%"` para forçar re-medição |

---

## Top 5 Prioridades Absolutas

### 1. Definir `--font-mono` no CSS (P01 + P24)

6 elementos no app atual renderizam com fonte genérica. Fix em uma linha:

```css
/* platform-styles.css — bloco :root, após linha 37 */
--font-mono: 'JetBrains Mono', monospace;
```

Depois substituir os 10 literais `font-family: 'JetBrains Mono', monospace` no CSS por `var(--font-mono)`.

---

### 2. Centralizar acesso ao CDI (P04)

Três funções com fallbacks diferentes. Extrair uma função em platform-data.js:

```js
function getCDI(month) {
  return CDI[month] || 0;
}
```

Substituir:
- linha 488: `CDI[month] || 0.009` → `getCDI(month)` (e remover o fallback 0.009 que inventa CDI)
- linha 706: `CDI[month] || 0` → `getCDI(month)`
- linha 1266: `CDI[MONTHS[j]] || 0` → `getCDI(MONTHS[j])`

---

### 3. Guard em `ScoreBar` (P06)

```jsx
// platform-risco.jsx:31
function ScoreBar({ score }) {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const color = safeScore >= 70 ? 'var(--red)' : safeScore >= 40 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'var(--rule)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width: safeScore + '%', height:'100%', background:color, borderRadius:3 }} />
      </div>
      <span style={{ fontSize:'0.857rem', fontWeight:600, color, minWidth:28, textAlign:'right' }}>
        {Number.isFinite(score) ? score : '—'}
      </span>
    </div>
  );
}
```

---

### 4. Timeout no carregamento de PDF.js (P08)

```js
// platform-import.jsx — substituir loadScriptSRI call em loadPdfJs():
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('CDN timeout após ' + ms + 'ms')), ms)
  );
  return Promise.race([promise, timeout]);
}
// Envolver: withTimeout(loadScriptSRI(PDFJS_URL, PDFJS_SRI), 15000)
```

---

### 5. Corrigir `var(--r)` inválido (P02)

```jsx
// platform-import.jsx:403 — trocar:
borderRadius: 'var(--r)',
// por:
borderRadius: 'var(--r-sm)',
```

---

## Ganhos Rápidos

Esforço P com severidade Média ou maior:

- [x] P01: Definir `--font-mono` em `:root` do CSS — 1 linha
- [x] P02: Trocar `var(--r)` por `var(--r-md)` em platform-import.jsx:403 — 1 linha
- [x] P04: Centralizar acesso ao CDI via `getCDI(month)` — 3 call sites unificados
- [x] P06: Guard `Number.isFinite(score)` em ScoreBar — 2 linhas
- [x] P07: Empty state quando `carteiras=[]` em RiscoHeatmap — 3 linhas
- [x] P08: Timeout 15s em loadPdfJs via `Promise.race` — 1 função helper
- [x] P11: Assert `MONTHS.length === MONTH_LABELS.length` em validate() + check em tests/validate.js
- [x] P16: `console.warn` em `riskStress()` quando cenário não existe — 1 linha
- [x] P17: Remover `linePath` das duas exportações — 2 linhas deletadas
- [x] P19: `hbarItems` em `useMemo([comp])` em TabComposicao
- [x] P20: `TABS` em `useMemo([row && row.nAchados])` em Carteira
- [x] P24: 10 literais CSS `'JetBrains Mono', monospace` substituídos por `var(--font-mono)`

---

## Parece ruim mas está OK

**1. Divisão com operador `\` em vez de `/` (falso alarme).**
Três chamadas reportadas pelo agente de análise (linhas 710, 810, 1372) como erro sintático. Leitura direta do código confirma que os três pontos usam `/` corretamente. O agente produziu artefato de formatação markdown (barra invertida em vez de barra) que não existe no código real.

**2. `_compCache` não invalidado ao importar dados.**
`importPortfolioData()` na linha 1605 executa `Object.keys(_compCache).forEach(k => delete _compCache[k])`. Cache é devidamente invalidado. `_importCompositions` também é reinicializado (linha 1602-1603). O risco de composição antiga persistindo não existe no fluxo atual.

**3. `materialize()` em IIFE irrecuperável.**
Reportado como problema por impossibilitar re-seeding. Na prática `restoreDemo()` restaura snapshot (`_demoSnapshot`) gerado no IIFE — state management adequado para os casos de uso do sistema. Re-materialização com seed alternativo não é requisito.

**4. `injectMirabaud()` não-idempotente.**
Reportado como risco de duplicação de MANAGERS. `restoreDemo()` restaura de snapshot, não chama `injectMirabaud()` — fluxo demo→import→demo está correto. MANAGERS duplicados não ocorrem no fluxo implementado.

**5. `MANAGERS.slice()` hardcoded como fragil.**
O achado P13 é real como risco de manutenção, mas em produção é inerte: quando dados reais são importados, o array MANAGERS inteiro é substituído por `[{ id: 'IMPORTADAS', ... }]` (linha 1608). Os slices só operam no modo demo onde o CATALOG nunca muda em runtime.

**6. `limpas()` retorna `row` sem composição.**
Reportado como incompletude. A função serve exclusivamente ao dashboard de status (contagem de carteiras OK) — nenhum caller precisa de composição a partir dela. O nome é descritivo do critério (sem achados, status LIBERAR), não de um objeto rico.

**7. `randomFinding()` com dados fictícios.**
Achados com percentuais inventados são design intencional do modo demo. A plataforma importa dados reais que sobrescrevem o dataset inteiro; não há mistura de achados fictícios com dados reais porque `importPortfolioData()` substitui tanto `_portfolioData` quanto `_importCompositions`. O risco de P03 existe se o usuário importar dados parciais mas não substituir o dataset demo.

---

## Perguntas Abertas para o Mantenedor

1. **P03 — Achados no modo importado:** Quando dados reais são importados, os achados de "mudança de alocação" devem usar a composição real importada ou continuar sendo suprimidos/fictícios? O fluxo atual não tem distinção.

2. **P09 — Decomposição de platform-data.js:** Existe plano para decompor ou o modelo de IIFE único é intencional para evitar dependências de módulo no contexto sem bundler?

3. **P13 — Managers demo:** Existe previsão de adicionar carteiras ao demo (o que quebraria os slices)? Se sim, qual critério de agrupamento deve substituir os índices?

4. **Autenticação:** O sistema será exposto à internet ou permanece em rede interna? Isso define se a autenticação cosmética é aceitável indefinidamente ou se há prazo para implementação real.

5. **PDF em Web Worker:** Existe limite de tamanho de PDF no fluxo atual? Um book Mirabaud típico tem quantas páginas?
