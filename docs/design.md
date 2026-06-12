# ATLAS Wealth Verification — Design System

Fonte de verdade para tokens, regras e padrões visuais.

---

## Paleta

### Fundos (paper-first, claro)
- `--paper` `#F9F7F4` — fundo da página
- `--paper-mid` `#F2EEE8` — hover de linha, fundos secundários
- `--rule` `#E3DDD5` — divisores, bordas leves
- `--rule-strong` `#C8C0B5` — bordas de cards, th lines

### Texto
- `--heading` `#0D1520` — títulos h1-h3
- `--body` `#3C3830` — texto corrido
- `--muted` `#9A9188` — labels secundários, placeholders

### Marca
- `--navy` `#05305F` — ações primárias, links
- `--navy-2` `#04275A` — hover de navy
- `--sidebar-bg` `#0A1928` — sidebar (dark)
- `--gold` `#C4A228` — acentos seletivos (item ativo sidebar, foco, logo)
- `--gold-2` `#A8881E` — hover de gold

### Semânticas
- `--green` `#1A6B3A` / `--green-bg` `#EBF5EF`
- `--amber` `#8B5A00` / `--amber-bg` `#FEF4E0`
- `--red` `#8B1A1A` / `--red-bg` `#FDEAEA`

---

## Tipografia

| Família | Pesos | Uso |
|---------|-------|-----|
| Cormorant Garamond | 400, 600 | Headings, nome de carteira, valores institucionais grandes |
| Inter | 300, 400, 500, 600 | Todo texto de UI, labels, botões |
| JetBrains Mono | 400, 500 | **Todos os números** — `font-variant-numeric: tabular-nums; text-align: right` |

Base: `html { font-size: 14px }`. Linha base Inter, 14px/1.5.

Classe `.num` aplica mono tabular right em qualquer elemento.

---

## Layout

- Sidebar: `220px` fixa, dark (`--sidebar-bg`), drawer em `<768px`
- Topbar: `56px` sticky, fundo `--paper`, borda inferior `--rule`
- Content: `padding: 24px`, `max-width` sem restrição (scroll-x via tabela)

---

## Elevação

```
--shadow-card: 0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.06)
--shadow-popup: 0 4px 16px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.06)
```

---

## Raios

- `--r-sm: 4px` — badges, chips, inputs
- `--r-md: 8px` — cards, botões
- `--r-lg: 12px` — modais, popovers

**Máximo: 12px. Proibido pill (9999px) salvo chips de filtro pequenos.**

---

## Componentes — Regras

### Tabelas
- `scroll-x` horizontal obrigatório quando ultrapassar viewport
- Colunas sticky (esquerda): `position: sticky; left: 0; background: var(--paper); z-index: 2`
- `th` sticky topo: `position: sticky; top: 0; background: var(--paper-mid); z-index: 3`
- Coluna numérica: `.num`, `min-width: 100px`
- Hover de linha: `background: var(--paper-mid)`
- Linha clicável: `cursor: pointer`

### Status badges
- `LIBERAR` → `.badge--green`
- `COM ALERTA` → `.badge--amber`
- `CORRIGIR` → `.badge--red`

### KPI tiles
- Fundo `--paper`, sombra `--shadow-card`, raio `--r-md`
- Valor: Cormorant Garamond 600, 24px
- Label: Inter 400, 12px, `--muted`
- CORRIGIR>0: fundo `--red-bg`, borda 1px `--red`
- ALERTA>0: fundo `--amber-bg`, borda 1px `--amber`

### Botões
- Primary: navy, texto branco, raio `--r-sm`
- Ghost: borda `--rule`, fundo transparente, texto `--body`
- Touch target mínimo: 44px

### Foco (a11y)
- `outline: 2px solid var(--gold); outline-offset: 2px`

---

## Proibições absolutas

1. **Nenhum emoji ou dingbat** em qualquer arquivo — ícones semânticos (✓ ⚠ ✗) devem ser SVG inline com `aria-hidden="true"`
2. **Nenhum hex literal** em arquivo de componente — só `var(--token)` (exceção: HTML gerado para exportação, que é autossuficiente)
3. **Gradientes coloridos proibidos** — única exceção: gradiente dourado sutil no item ativo da sidebar
4. **`--gold` nunca como fundo de página** — uso restrito a acentos, bordas de foco e item ativo da sidebar
5. Cor nunca única portadora de informação — sempre texto/ícone também
6. `new Date()` sem argumento e `Date.now()` proibidos — usar array literal de meses
7. `NaN` e `undefined` nunca chegam ao DOM — formatters defensivos retornam `"—"`
8. Raio máximo `12px` — proibido `border-radius: 9999px` exceto em chips de filtro pequenos

---

## Acessibilidade

- `prefers-reduced-motion`: suspender transições `> 150ms`
- Foco visível em todos os elementos interativos
- `role="img"` e `aria-label` em gráficos SVG
- Estados vazios sempre desenhados (não string vazia, não `null`)
