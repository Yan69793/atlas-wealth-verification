# Plano: Fase 2 — Oportunidades + CRM-lite

## Contexto

Aprovado no plano mestre (base SyncIA, 2026-08-14). É a primeira entrega
visível do ATLAS como Advisor Intelligence & Operating System. A base já
existe: os eventos/achados da Fase 1 (snapshot EOD multi-fonte + diff) viram
oportunidades de ação comercial com ciclo de status. A Fase 1 está completa e
verde (182 checks + 56 testes do motor), com fixtures sintéticos publicados no
GitHub (commit 217d1c4).

## Escopo aprovado

Evento/achado → **oportunidade** (cliente, assessor, motivo, volume, prioridade
P1–P3, prazo, status, último/próximo contato, canal, observação, resultado,
origem com id do evento/achado e evidências, createdAt/updatedAt) → ciclo
`Nova → Contatar → Em andamento → Convertida → Perdida → Descartada`.

Princípios aprovados: regras declarativas e desligáveis, sem heurística mágica;
score transparente (volume × prioridade × prazo) para ordenar a fila; decisão
do assessor sempre visível. CRM-lite: sem automação de email, export CSV como
saída oficial, armazenamento JSON local na instância enquanto a piloto tiver 1
assessor (D1 quando houver 2+).

## Entregas

### 1. Motor (audit-engine, fundação primeiro)

- `audit-engine/src/opportunities/types.ts` — `Opportunity`,
  `StatusOportunidade`, `RegraOportunidade`; mapa de transições válidas do
  ciclo.
- `audit-engine/src/opportunities/generator.ts` — regras declarativas de
  evento → oportunidade. Cada regra tem nome, gatilho, texto e prioridade
  padrão, e pode ser desligada. Regras iniciais:
  - `MATURITY_APPROACHING` + ativo com resgate → "renovação/rotação"
  - `CASH_DECREASE` grande → "avaliar aporte"
  - `CONCENTRATION_INCREASE` → "diversificação"
  - `LARGE_WITHDRAWAL` → "repor caixa"
  - `POSITION_CLOSED` → "reinvestimento"
- `audit-engine/src/opportunities/prioritize.ts` — score determinístico
  (volume × peso da prioridade × fator de prazo) que ordena a fila.
- `audit-engine/tests/opportunities.test.ts` — cada regra com fixture em
  memória; transições permitidas e negadas do ciclo; score determinístico;
  geração a partir dos eventos da semana sintética.

### 2. Tela no produto

- `platform-oportunidades.jsx` — página nova, registra
  `window.AtlasPages.Oportunidades`, rota `#/oportunidades`.
- `platform-oportunidades-demo.js` — dados demo sintéticos (mesmo padrão do
  `platform-historico-demo.js`), sem nome real.
- Alterar `platform-app.jsx` — menu, `pageFromPath`, `renderPage`.
- Alterar `platform-achados.jsx` — ação "criar oportunidade" pré-preenchida
  com a origem do achado.

### 3. Contrato e seed

- `tests/validate.js` — seção nova: página registrada, rota presente, demo
  carregado, sem marca de dado real no demo.
- Seed do demo — oportunidades coerentes com os eventos sintéticos da semana
  2026-08-10..14 e do mensal 2026-06 (carteiras ALFA/BETA/GAMA).

## O que NÃO fazer

- Nada de email automático, multi-usuário nem backend de escrita na instância.
- Nenhum nome real de cliente ou assessor no produto, nos testes ou no demo.
- Não tocar nos adaptadores nem no diff da Fase 1.

## Ordem de execução

1. Motor com teste vermelho antes do verde (cada regra e transição).
2. Dados demo e seed.
3. Tela + wiring no shell + ação nos achados.
4. Seção nova em `tests/validate.js`.
5. `npm test` e `npm run build` verdes, saída colada.
6. Revisão do code-reviewer.
7. Checkpoint do dono. Publicar o demo é decisão dele, não é automática.

## Riscos e rollback

- Rollback trivial: remover menu e rota restaura o app, sem migração de dado.
- LGPD: demo sempre sintético; overlay da instância fica fora do repo.
- Determinismo: score sem `Date.now` nem `Math.random`, datas fixas no demo.

## Pendências do dono (não bloqueiam)

- Primeira fonte real diária/mensal para validar um adaptador na instância.
- Confirmação dos thresholds antes da estreia na instância.
