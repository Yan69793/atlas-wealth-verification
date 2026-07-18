# P0/P1: melhorias orientadas ao nicho (pós-pesquisa 2026-07-18)

> **For agentic workers:** implementar task-by-task; cada task é commitável
> sozinha. Checkboxes `- [ ]` para tracking.

**Goal:** Traduzir a pesquisa `docs/pesquisa-nicho-melhorias-2026-07.md` em
trabalho executável: o que falta para o ICP **assinar e usar todo mês**, sem
virar consolidador genérico.

**Architecture:** Nenhuma reescrita de stack. Extensões no SPA (hash router,
`window.AtlasData`), motor `audit-engine` e instância `verificacao-carteiras`
(Worker/R2). Produto e dado real permanecem separados (LGPD).

**Depends on:** Fase 0 segurança (`2026-07-17-fase-0-seguranca-e-rede.md`) para
perímetro e parity; Task 9 marca (`pesquisa-marca-2026-07-18.md`).

**Tech stack:** SPA React UMD + Babel, Node/TS audit-engine, Cloudflare Workers
(instância), PowerShell no operador.

---

## Mapa de prioridades

| ID | Tema | Camada | Esforço | Bloqueia venda? |
|---|---|---|---|---|
| N0.1 | Fechar residual Fase 0 (Access, parity, selos) | Instância + motor | M | Sim |
| N0.2 | Decisão de marca | Negócio | P | Sim (Fase 1) |
| N0.3 | Workflow de exceção (fila) | SPA | M | Sim (uso mensal) |
| N0.4 | Selo do mês na UI e no relatório | SPA + motor/instância | M | Sim (auditoria) |
| N0.5 | KPI de ROI na operação | SPA | P | Diferencia pitch |
| N1.1 | PDF multi-layout + HITL | SPA parsers | G | Escala de ingestão |
| N1.2 | Suitability / mandato como regra | Motor + SPA | M | Regulatório |
| N1.3 | Portal de entrega white-label | SPA + Worker | M | Comercial MFO |
| N1.4 | Overlay de marca por tenant | SPA | P | Multi-casa |
| N2.x | Qtd/PU, alts, Open Finance, API | Misto | G | 6–18 meses |

P0 = N0.*; P1 = N1.*; P2 = N2.* (só esboço no fim).

---

## N0.1 — Residual Fase 0 (segurança e rede)

**Por quê o nicho exige:** sem perímetro, dado de cliente não entra; sem parity,
"servir dado velho sem erro" é o modo de falha que o comprador mais teme.

**Referência:** plano `2026-07-17-fase-0-seguranca-e-rede.md` Tasks 1–8.

### Critérios de aceite

- [ ] `workers_dev` e bypass `DIRECTOR_KEY` ausentes no Worker da instância
- [ ] JWT Access fail-closed em `/api/data/:mes` e overlays
- [ ] Parity tests não pulam em silêncio quando `ATLAS_FIXTURES` está setada; com
      fixture anonimizada, CI do repo produto passa
- [ ] Meses entregues têm selo em `selos.json`; script `verificar-selos` falha se
      o audit do mês fechado mudou
- [ ] `npm test` no ATLAS verde; smoke na URL de produção com 401/403 sem token

**Owner:** operador (deploy/secrets) + agente (código/testes).

---

## N0.2 — Decisão de marca

**Por quê:** colisão ATLAS (Britech Atlas PAS e outros). Fase 1 comercial trava.

**Referência:** `docs/pesquisa-marca-2026-07-18.md` shortlist (Confere, Atesta,
Senda, Zelo, Fado).

### Critérios de aceite

- [ ] Operador escolhe 2–3 finalistas
- [ ] Busca manual INPI classes 9 e 42 documentada (print ou nota com data)
- [ ] Handles Instagram/LinkedIn e domínio preferencial checados
- [ ] Nome canônico registrado em `pesquisa-marca-2026-07-18.md` §6 e propagado
      a `CLAUDE.md` / `AGENTS.md` / `window.AtlasBrand.product` default só após
      decisão (não renomear código em massa antes do INPI)

**Owner:** operador. Agente não decide o nome.

---

## N0.3 — Workflow de exceção (fila operacional)

**Por quê:** o middle office compra fila e governança, não só score. Mercado de
RIA/FO escala por outlier.

**Files (SPA, repo produto):**

- `platform-achados.jsx` (ou nova `platform-fila.jsx` se crescer)
- `platform-data.js` (persistência de estado de workflow)
- `platform-app.jsx` (rota/nav se tela própria)
- `platform-carteira.jsx` / `platform-report.jsx` (bloqueio de export)
- `tests/validate.js` (checks estruturais mínimos)

### Comportamento desejado

1. Cada achado CORRIGIR (e opcionalmente ALERTA) entra em fila com:
   - status: `aberto` | `em_analise` | `resolvido` | `aceito_com_ressalva`
   - `assignee` (string livre na v1; RBAC depois)
   - `updatedAt`, `note` (texto do analista)
2. Persistência v1: `localStorage` namespaced por mês + modo de dado
   (`demo` / `imported`), sem enviar PII a servidor no SPA estático.
3. Botão "Exportar Relatório" / geração de PDF **bloqueado** se existir CORRIGIR
   com status `aberto` ou `em_analise` para aquela carteira/mês (override
   explícito de admin com motivo logado no mesmo store).
4. Dashboard ou Achados: contador "fila aberta" e filtro por status de workflow.

### Critérios de aceite

- [ ] Com carteira CORRIGIR em demo ou fixture, fila mostra 1+ item
- [ ] Transição de status persiste após reload da página
- [ ] Export bloqueado com mensagem clara; override exige motivo e fica no log
- [ ] `npm test` verde; smoke manual nas rotas dashboard, achados, carteira
- [ ] Documento de uso: 10 linhas em `manual-de-uso.md` ou comentário no header
      da página

### Fora de escopo N0.3

- Multi-usuário real com backend (fica N1.3 / Fase 1 API)
- Notificação e-mail/Slack

---

## N0.4 — Selo do mês na UI e no relatório

**Por quê:** diferencia de consolidador; auditoria ANBIMA pede evidência de
controle e fechamento.

**Files:**

- `platform-report.jsx` (`buildReportHTML` / trilha)
- `platform-dashboard.jsx` ou topbar (`platform-app.jsx`)
- `platform-data.js` (leitura de metadado de selo se existir no payload)
- Instância: scripts `selar-mes` / payload `audits/*.json` (Fase 0)

### Comportamento desejado

1. Se o mês tiver selo (`checksum`, `sealedAt`, `sealedBy` opcional), exibir:
   - chip no topbar ou no header do Dashboard: "Jun/26 selado"
   - bloco na Trilha de Auditoria do relatório com checksum truncado + data
2. Se não houver selo (demo local): mostrar "não selado (ambiente demo)" sem
   inventar hash.
3. Não permitir editar composição do mês selado no modo real quando a API
   expuser flag (v1: só UI read-only se `row.sealed === true`).

### Critérios de aceite

- [ ] Relatório TIGRE_FAM (ou fixture) em demo: texto de trilha permanece; chip
      demo explícito
- [ ] Com payload mock de selo injetado, UI e relatório mostram checksum
- [ ] Zero regressão no print do relatório (smoke Playwright ou checklist manual)
- [ ] `npm test` verde

---

## N0.5 — KPI de ROI operacional

**Por quê:** comprador precisa traduzir produto em FTE. Fonte de pitch: ~1,2 FTE
em reconciliação (AAWZ, escritório 10 AAIs).

**Files:** `platform-dashboard.jsx`, `platform-data.js` (`dashboardStats` ou
função nova).

### Comportamento desejado

No Dashboard, faixa "Operação do mês":

- % carteiras auto-LIBERAR (sem achado bloqueante)
- Nº CORRIGIR abertos / resolvidos (se N0.3 existir; senão só status do motor)
- Tempo estimado economizado: heurística documentada
  `(nLiberar * minutosPorCarteiraManual)` com constante editável no código e
  comentário de origem

### Critérios de aceite

- [ ] KPIs batem com `dashboardStats` (total, liberar, corrigir) no mês corrente
- [ ] Heurística documentada em comentário JS (não vender como medição real sem
      shadow month)
- [ ] `npm test` verde

---

## N1.1 — PDF multi-layout + HITL (P1)

**Por quê:** document AI é o gap nº1 entre "demo" e "roda o mês da casa".

### Critérios de aceite (resumo)

- [ ] Pipeline: extrai → `confidence` por campo crítico (PL, rent, top posições)
- [ ] Tela de revisão: campos abaixo do limiar exigem confirmação humana
- [ ] Log do que a máquina preencheu vs o que o humano alterou
- [ ] Pelo menos 2 layouts de book reais da instância (LGPD fora do git) com
      fixture anonimizada de regressão no motor/parser
- [ ] PDF continua beta no README até cobertura ≥ limiar acordado com operador

---

## N1.2 — Suitability / mandato como regra (P1)

### Critérios de aceite (resumo)

- [ ] Perfil e faixas de alocação no schema do motor (ou overlay cadastral)
- [ ] Achado com número quando classe sai da faixa do mandato
- [ ] Radar suitability deixa de ser genérico quando há mandato
- [ ] Teste unitário no audit-engine com fixture sintética

---

## N1.3 — Portal de entrega (P1)

### Critérios de aceite (resumo)

- [ ] Link assinado ou rota autenticada para PDF do mês
- [ ] Versão do relatório (v1, v2 se reemitido após correção)
- [ ] Watermark white-label (`AtlasBrand`)
- [ ] Sem PII no repo produto

---

## N1.4 — Overlay de marca por tenant (P1)

### Critérios de aceite (resumo)

- [ ] `platform-brand-real.js` (gitignored na instância) sobrescreve
      `window.AtlasBrand` antes do app
- [ ] Title, sidebar, cabeçalho e rodapé do relatório coerentes
- [ ] Teste de injeção documentado (como no commit white-label `bda74ee`)

---

## P2 (esboço, sem tasks detalhadas ainda)

| ID | Tema |
|---|---|
| N2.1 | Quantidade e preço unitário por posição |
| N2.2 | Alternativos: NAV as-of, capital call |
| N2.3 | Segunda fonte: Open Finance / ANBIMA Data / B3 |
| N2.4 | API `/api/data/:mes` multi-tenant + webhooks |
| N2.5 | IA com citação de regra/fonte (enriquecimento, não auto-liberar) |
| N2.6 | Upsell VIX Radar (crédito privado) no mesmo shell |

Plano próprio quando P0 fechar e houver design partner.

---

## Design partners e validação (paralelo, não código)

- [ ] 1 MFO + 1 assessoria + 1 asset CVM 21 em shadow month
- [ ] Métrica: horas de reconciliação antes/depois; % auto-LIBERAR; divergências
      capturadas só pelo ATLAS
- [ ] Checklist ANBIMA mapeado a telas/artefatos (planilha 1 página em `docs/`)

---

## Ordem de execução recomendada

```
N0.1 (Fase 0 residual) ─┬─ N0.2 (marca, operador)
                        │
                        ├─ N0.3 (fila) ── N0.4 (selo UI) ── N0.5 (KPI)
                        │
                        └─ N1.1 / N1.2 quando houver book real de design partner
```

Não começar N1.3 portal em produção sem N0.1.

---

## Definition of Done (wave P0)

- [ ] N0.1 a N0.5 com critérios de aceite marcados ou explicitamente
      adiados pelo operador com motivo
- [ ] `npm test` verde no ATLAS
- [ ] Pesquisa `pesquisa-nicho-melhorias-2026-07.md` linkada em
      `estrategia-produto-icp.md` (fontes)
- [ ] Nenhum dado LGPD no git

---

## Referências

- `docs/pesquisa-nicho-melhorias-2026-07.md`
- `docs/estrategia-produto-icp.md`
- `docs/superpowers/plans/2026-07-17-fase-0-seguranca-e-rede.md`
- `docs/pesquisa-marca-2026-07-18.md`
