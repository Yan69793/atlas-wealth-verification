---
name: atlas-audit-engine
description: Motor de auditoria mensal de carteiras do ATLAS (audit-engine em audit-engine/; ingestao roda na instancia do cliente, fora deste repositorio). Use ao ingerir um novo mes (Excel ou PDF), debugar o parser de PDF, mexer em schema/regras/score, ou entender por que o dashboard mostra um numero especifico. Acionar tambem com "Book_*.pdf", ingestao de mes, ou pedido para atualizar o dashboard com dados novos.
---

# Atlas Audit Engine

Motor de auditoria mensal de carteiras de investimento. Compara PL, rentabilidade e ativos entre um mes baseline e um mes de referencia, aplica regras, gera dashboard estatico.

Este arquivo descreve o **produto**. Caminho de extratos, mapa de nomes e dado real ficam na **instancia** (variaveis de ambiente e arquivos locais ignorados pelo git).

## Onde fica cada coisa

- **Motor (TypeScript/Node)**: `audit-engine/src/` — compila com `tsc` para `dist/`.
- **Dashboard (React sem bundler)**: na instancia (ou demo na raiz do produto).
- **Dados do dashboard**: `data.json` / `data.js` na raiz da instancia (mes mais recente). Historico em `audits/<AAAA-MM>/audit.json`.
- **Fonte de dados brutos**: definida por `ATLAS_EXTRATOS` (pasta de extratos mensais da instancia). Dentro de cada mes, a pasta `Editados\` tem os PDFs `Book_<carteira>_<AAAA>_<MM>.pdf`. Nao confundir com extrato de conta corrente avulso na raiz do mes.

## Dois formatos de entrada, mesmo pipeline

`ingestFile()` em `audit-engine/src/parsers/registry.ts` despacha por tipo:

1. **Arquivo `.xlsx`** → `parsers/excel-v2.ts` (template `custodian-xlsx-v2`).
2. **Pasta com `Book_*.pdf`** → `parsers/pdf-v1.ts` + `audit-engine/scripts/extract-pdfs.py` (Python + pdfplumber).

Ambos produzem `CarteiraRaw[]` e passam por `runEngine()`. Comando:

```
cd audit-engine
node dist/src/cli.js ingest "<arquivo.xlsx ou pasta Editados>" --mes 2026-06 --baseline 2026-05 --out ..
```

`--out ..` e obrigatorio — sem isso o CLI escreve dentro de `audit-engine/`.

## Mapa de nomes e exclusoes (instancia)

- Mapa de equivalencia de nomes: `name-map.local.json` na raiz da instancia (gitignored). O `name-map.json` do produto fica vazio de proposito.
- Exclusao extra de arquivo (copia pessoal, padrao de sobrenome colado): `ATLAS_EXCLUDE_RE` no ambiente da instancia.
- Pasta de books para o teste de parity: `ATLAS_BOOKS`. Raiz da instancia para o XLSX: `ATLAS_FIXTURES`.

## Snapshots diarios (Fase 1)

Pipeline de snapshot EOD: cada informacao diaria do custodiante vira um retrato
oficial do dia, compara com o dia anterior e emite eventos tipados. Multi-fonte:
xlsx, csv, pdf (pasta de books), html e api-json. Formato vem de `--formato` ou
da extensao — nunca de adivinhacao por conteudo.

```
cd audit-engine
node dist/src/snapshot/cli-snapshot.js ingest <fonte> <arquivo> --data 2026-08-13 [--formato csv] --root ..
node dist/src/snapshot/cli-snapshot.js diff  --data 2026-08-13 --root ..
node dist/src/snapshot/cli-snapshot.js state --data 2026-08-13 --root ..
```

`--root` e obrigatorio na pratica (`--root > ATLAS_DATA_ROOT`): sem ele o
comando recusa, para nunca escrever na arvore do produto.

Contrato dos artefatos (na instancia, `audits/<AAAA-MM-DD>/`):

- `ingestion.json` — fonte, formato, basename do arquivo (nunca caminho
  absoluto), sha256, historico de reingestoes.
- `snapshot.json` — schema `snapshot/v1`: carteiras com posicoes canonicas e
  plTotal SEMPRE derivado da soma das posicoes.
- `events.json` — schema `events/v1`: eventos do diff contra o dia anterior
  existente. Tipos: CASH_INCREASE/DECREASE, NEW_POSITION, POSITION_CLOSED,
  MATURITY_APPROACHING (janelas 7/15/30/60/90, 1 evento por ativo por troca de
  janela), LARGE_WITHDRAWAL, ALLOCATION_SHIFT, CONCENTRATION_INCREASE.
  REVENUE_DROP e reservado para a Fase 5 e nunca e emitido.

Semantica de idempotencia: mesmo dia + mesmo hash pula (`skip`); mesmo dia +
hash diferente reingere, arquivando o snapshot anterior como
`snapshot.<8-hex>.json` e registrando o hash anterior no historico. Dias
anteriores nunca sao sobrescritos — `state` devolve o dia pedido mesmo depois
de D+1 ingerido.

Thresholds em `src/snapshot/thresholds.ts`, defaults conservadores, com teste
de contrato. Name-map da instancia e aplicado no normalize (primeiro consumidor
do `name-map.local.json`).

Regras operacionais do snapshot diario:

- Nunca ingerir o mesmo dia em paralelo (sem lock; corrida embaralha o
  historico de reingestoes). Operacao e manual e diaria.
- Ordem importa: reingestoes de D-1 DEVEM acontecer antes do diff de D; o
  events.json nao guarda o hash da base, entao reingerir a base depois deixa o
  events.json comparando contra o snapshot antigo sem aviso.
- PDF como fonte diaria tem limitacao: o parser usa o book mensal, entao todos
  os dias do mes repetem o mesmo saldo e o diff fica mudo. Validar com o
  operador antes de estrear PDF no snapshot diario.
- PDF: o aviso de extracao parcial conta QUALQUER .pdf da pasta, nao so
  Book_*.pdf (herdado do fluxo mensal).
- Erros de validacao citam nome de carteira e ativo no stderr (LGPD): nao
  colar essas saidas em tickets externos.
- O `--root` e recusado se cair dentro do repo do produto (assinatura
  `platform-app.jsx` na raiz).

## Parser de PDF (resumo)

- Nome canonico = nome interno da capa do PDF (nao o nome do arquivo).
- Nomes com espaco e parenteses tokenizam em varias palavras no pdfplumber — juntar TODAS as palavras da mesma linha.
- `plRef` usa a coluna "Saldo Bruto" da tabela de Ativos, nao "Saldo Liquido".
- Python fixo em `python` nesta maquina (pdfplumber no 3.11).

## Testes

```
cd audit-engine
npm test
```

- `parity-abril-2026.test.ts` e `parity-pdf-vs-excel-abril.test.ts` so rodam com `ATLAS_FIXTURES` (e `ATLAS_BOOKS` no de PDF). Sem isso, pulam. Codigo e caminho de cliente nao ficam fixos no produto.

## Checklist para ingerir um mes novo

1. Confirmar books do mes em `ATLAS_EXTRATOS` (ou copiar via `scripts/copy-extratos.mjs` com a var setada).
2. `npm test` no audit-engine.
3. CLI de ingestao com `--out ..`.
4. Conferir contagem de carteiras vs arquivos.
5. Subir dashboard local e checar as telas + console.
