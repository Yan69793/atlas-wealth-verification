# Spec — Radar de Risco: Métricas Quantitativas + Drill-down Drawer

**Data:** 2026-06-12  
**Status:** Aprovado para implementação  
**Arquivo alvo:** `platform-risco.jsx`

---

## Contexto

O Radar de Risco atual tem score heurístico 5-componentes (0–100), 4 cenários de stress, heatmap ordenável e fila de ação. O score não é auditável por um CIO porque não tem base estatística declarada. Não existe drill-down por carteira nem visualização de risco × retorno no nível agregado.

Referências pesquisadas: Riskalyze, Hidden Levers, Jacobi, Addepar, Black Diamond. O design incorpora o melhor de cada um e adiciona dois elementos que nenhuma delas oferece.

---

## Escopo

### Bloco A — Métricas Quantitativas de Mercado

Nova função pura `computeRiskMetrics(code, month)` em `platform-risco.jsx`:

- **Volatilidade realizada** = desvio-padrão dos últimos 12 retornos mensais (`rent`) × √12 (anualizada)
- **VaR 95% paramétrico** = `mean − 1.645 × stddev` sobre os retornos mensais disponíveis
- **Max Drawdown** = maior queda acumulada pico-vale sobre o array de PL histórico (`plCurr`)

Fonte de dados: `D.portfolioHistory(code, month)` — já existe, nenhuma mudança em `platform-data.js`.

O resultado é computado para todas as carteiras ativas via `useMemo` no componente `Risco()` e exposto como `metricsMap { [code]: { vol, var95, mdd } }`.

Dois novos KPI tiles adicionados ao strip existente (que mantém Risco Alto, Em Atenção, Score Médio, Perda Estimada):
- **Volatilidade Média a.a.** — desvio padrão anualizado médio ponderado por PL
- **Max Drawdown Médio** — queda máxima histórica média ponderada por PL

VaR 95% exibido individualmente no drawer (por carteira), não como agregado.

---

### Bloco B — Visualizações Novas

#### B1 — Nuvem Risco × Retorno (elemento diferencial)

SVG scatter plot com todas as carteiras ativas simultaneamente:

- **Eixo X:** score de risco (0–100)
- **Eixo Y:** TWR do período (%)
- **Tamanho do ponto:** proporcional ao PL (raio mínimo 5px, máximo 24px)
- **Cor do ponto:** verde/âmbar/vermelho conforme nível de risco
- **Tooltip ao hover:** nome, código, PL, score, TWR

Quadrantes implícitos: canto superior esquerdo = ideal (baixo risco, alto retorno); canto inferior direito = crítico (alto risco, baixo retorno). Nenhuma plataforma pesquisada faz isso para toda a base simultaneamente.

Implementação: SVG inline, sem Recharts. Componente `RiscoCloud({ carteiras })`.

#### B2 — Matriz Multi-cenário (inspirada em Hidden Levers)

Grade compacta substituindo os 4 cards sequenciais:

- **Linhas:** carteiras ordenadas por score decrescente (top 10 por padrão)
- **Colunas:** os 4 cenários de stress existentes
- **Célula:** `% perda` formatada com `fmtPct`, fundo colorido: vermelho (> 5%), âmbar (2–5%), verde/neutro (< 2%)
- Clique em célula ativa aquele cenário (estado `scenario` existente)

Componente: `MatrizCenarios({ carteiras, stressAll, scenario, onSelect })`.

#### B3 — Drawer de Detalhe por Carteira

Painel lateral deslizante (40% da largura, `position: fixed`, `right: 0`):

- **Trigger:** clique em qualquer linha do heatmap → `setSelectedCode(code)`
- **Fecha:** tecla ESC, botão X, ou clique fora do painel
- **Troca sem fechar:** clicar em outra linha substitui o conteúdo

Conteúdo do drawer:

1. **Header:** nome da carteira, código, badge de nível
2. **3 KPI tiles:** Volatilidade Realizada, VaR 95%, Max Drawdown (do `metricsMap`)
3. **Radar SVG (5 vértices):** polígono externo = score máximo do componente; polígono interno = score atual. Componente `RadarChart({ components })`.
4. **Sparkline de score** (últimos 6 meses): LineChart reutilizando `window.AtlasCharts.LineChart`
5. **Risk Contribution Waterfall:** barras horizontais mostrando contribuição percentual de cada componente para o score total. Componente `ContributionWaterfall({ components })`.
6. **Lista de drivers** (texto já existente no objeto de risco)

**Animação:** `transform: translateX(100%)` → `translateX(0)` em 200ms `ease`. Respeita `prefers-reduced-motion`.

**Linha selecionada no heatmap:** `background: var(--paper-mid)`, borda esquerda `2px solid var(--navy)`.

---

## Layout da Página (de cima para baixo)

```
[1] KPI Strip — 6 tiles (linha única desktop, 2×3 mobile):
    Risco Alto | Em Atenção | Score Médio | Perda Estimada (cenário ativo)
    Vol. Média a.a. | Max Drawdown Médio

[2] Nuvem Risco × Retorno
    SVG scatter — todas as carteiras, X=score, Y=TWR, tamanho=PL, cor=nível

[3] Matriz Multi-cenário
    Grade 10 carteiras × 4 cenários, células coloridas por % perda

[4] Heatmap + Drawer lateral
    Tabela existente melhorada (linha selecionada destacada)
    Drawer: radar + sparkline + waterfall + métricas

[5] Fila de Ação — inalterada
```

---

## Novos Componentes

| Componente | Tipo | Dependências |
|---|---|---|
| `computeRiskMetrics(code, month)` | função pura | `D.portfolioHistory` |
| `RiscoCloud({ carteiras })` | SVG inline | — |
| `MatrizCenarios({ carteiras, stressAll, scenario, onSelect })` | tabela | — |
| `RiscoDrawer({ carteira, metrics, onClose })` | painel fixed | `LineChart`, `KPITile` |
| `RadarChart({ components })` | SVG inline | — |
| `ContributionWaterfall({ components })` | SVG/div inline | — |

**Sem mudanças em:** `platform-data.js`, `platform-styles.css`, outros arquivos JSX.

---

## Cenários Brasileiros

Os 4 cenários existentes em `D.STRESS_SHOCKS` permanecem, mas os labels são atualizados para refletir o mercado brasileiro:

| Chave | Label atual | Label proposto |
|---|---|---|
| `juros200` | Juros +200 bps | Selic emergencial +300 bps |
| `bolsa15` | Bolsa -15% | Ibovespa -25% (2008) |
| `liquidez` | Crise de Liquidez | Spread crédito privado +300 bps |
| `combinado` | Cenário Combinado | Contágio externo combinado |

---

## Verificação

| Critério | Check |
|---|---|
| `computeRiskMetrics('DUNAS_CAP', '2026-04')` retorna números | vol > 0, var95 < 0, mdd > 0 |
| Nuvem renderiza sem NaN | Todos os pontos com coordenadas válidas |
| Matriz 4 colunas × ≥ 5 linhas visível | Sem células vazias |
| Drawer abre em < 200ms | Transição suave |
| ESC fecha drawer | `selectedCode === null` |
| 137/137 `npm test` | Nenhum check quebrado |
| Mobile 375px | Nuvem e matriz em scroll-x |

---

## Fora do escopo

- Workflow de ação com comentários/timestamps (Bloco C — backlog futuro)
- Integração com dados externos ou APIs externas
- Mudanças em `platform-data.js` ou qualquer outro arquivo JSX
