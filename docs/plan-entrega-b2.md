# Plano — Entrega B.2: corrigir o que a calibração encontrou

**Goal:** o radar deixa de repetir 87% do conteúdo todo mês e passa a abrir pelo que
mudou, e os dois defeitos de dado achados na B.1 param de corromper número e de
destruir trabalho humano.

**Ordem:** a definida com o dono em 24/08. A prioridade 1 daquela lista (adaptador
de PDF) saiu do plano: o adaptador já existia em `audit-engine/src/snapshot/adapters/pdf.ts`,
registrado no dispatcher. O que estava quebrado era a dependência `pdfplumber`, ausente
nos três interpretadores Python da máquina apesar do registro em `CLAUDE.md` de que fora
instalada em 14/08. Reinstalada, o caminho real foi provado ponta a ponta:

```
[criado] tenant=szuchmacher 2026-04-30: 111 carteiras, hash 60d8ff52.
[criado] tenant=szuchmacher 2026-05-31: 108 carteiras, hash 1306992c.
[cobertura] 2026-05-31 — casa: 108 carteira(s)
  emissorId   87.5%  afirma
```

## Preconditions

- `npm test` verde na abertura (580/580 checks, 243 testes).
- `pdfplumber` presente em `python` 3.11 (`python -c "import pdfplumber"`).
- Mapas instalados na instância e negados no `.gitignore` dela.
- Nenhum limiar existente é alterado neste plano. `radarVariacaoMaterialPct` é
  limiar NOVO, necessário para a funcionalidade, no valor 0,20 que a B.1 mediu
  e confirmou para a grandeza equivalente do crédito.

---

## Bloco 1 — `ativo-map` para de destruir trabalho humano

### Task 1: guarda contra reset silencioso
**File:** `audit-engine/src/snapshot/cli-snapshot.ts`
**Action:** Edit
**What to do:** No comando `ativo-map`, o bloco que lê o mapa existente hoje só
aborta quando o JSON é ilegível. Quando o arquivo parseia mas perdeu a chave
`mappings`, ou quando `mappings` não é objeto simples (é array, string, null),
ele cai no `existente = {}` e regenera tudo do zero relatando `N novo(s)` com
saída de sucesso. Trocar por `throw` com mensagem que diz o que fazer.
**Verification:** criar arquivo `{"x":1}` como `ativo-map.local.json` num root de
teste e rodar `ativo-map`; o comando deve sair com código 1 e mensagem citando
`mappings`, e o arquivo deve continuar intacto.
**Depends on:** none

### Task 2: `_ausenteDesde` limpo quando o ativo volta
**File:** `audit-engine/src/snapshot/cli-snapshot.ts`
**Action:** Edit
**What to do:** No laço que copia chaves desconhecidas da entrada anterior,
`_ausenteDesde` é copiado junto. Excluí-lo da cópia quando o ativo está presente
no snapshot atual, e contar quantos voltaram para o log.
**Verification:** rodar `ativo-map` em duas datas onde um ativo some e volta;
a entrada final não pode ter `_ausenteDesde`.
**Depends on:** none

### Task 3: testes dos dois
**File:** `audit-engine/tests/ativo-map.test.ts`
**Action:** Create
**What to do:** teste do reset silencioso (arquivo válido sem `mappings` aborta e
não sobrescreve) e teste do `_ausenteDesde` (some, volta, marca sai).
**Verification:** `npm test`
**Depends on:** 1, 2

---

## Bloco 2 — grafia dupla para de subestimar concentração

### Task 4: detector de colisão de grafia
**File:** `audit-engine/src/snapshot/normalize.ts`
**Action:** Edit
**What to do:** exportar `chaveDeGrafia(nome)` (NFD sem acento, maiúscula, só
`[A-Z0-9]`) e `colisoesDeGrafia(nomes)` devolvendo os grupos com mais de uma
grafia. Função pura, sem IO.
**Verification:** teste unitário
**Depends on:** none

### Task 5: aviso audível na ingestão
**File:** `audit-engine/src/snapshot/ingest.ts`
**Action:** Edit
**What to do:** depois do normalize, rodar o detector sobre os nomes de ativo do
snapshot e, havendo colisão, `console.warn` dizendo quantos papéis, quanto do PL
está envolvido e que a concentração está SUBESTIMADA até rodar `snapshot name-map`.
Aviso, nunca erro: mês válido não pode ser bloqueado por isto.
**Verification:** ingerir um mês real e ver o aviso.
**Depends on:** 4

### Task 6: comando `name-map`
**File:** `audit-engine/src/snapshot/cli-snapshot.ts`
**Action:** Edit
**What to do:** comando novo, mesmo espírito de `ativo-map`. Varre a série de
snapshots do root, agrupa por `chaveDeGrafia`, elege como canônica a grafia com
mais R$ SOMADO na série toda (decisão única, senão o mapa vira ciclo A→B, B→A),
e grava/atualiza `name-map.local.json` preservando toda entrada existente.
Recusa mapear chave que seja nome de carteira. `--dry-run` mostra sem escrever.
**Verification:** rodar na instância e conferir que o aviso da Task 5 some depois.
**Depends on:** 4

### Task 7: testes do bloco
**File:** `audit-engine/tests/name-map.test.ts`
**Action:** Create
**What to do:** colisão detectada, canônica eleita por R$ da série (não do mês),
entrada humana preservada, chave que é nome de carteira recusada, ausência de
ciclo.
**Verification:** `npm test`
**Depends on:** 4, 6

---

## Bloco 3 — o radar abre pelo que mudou

### Task 8: máquina de estado compartilhada
**File:** `audit-engine/src/intel/estado.ts`
**Action:** Create
**What to do:** mover o miolo de `estadoDoPar` para `estadoTemporal(atual,
anterior, variacaoMaterial)` com forma neutra `{severidade, valor}`, mais
`PESO_ESTADO` e `estadoAgregado`. Uma máquina de estado só para crédito e radar.
**Verification:** `npm test` (os testes de `estadoDoPar` não podem mudar)
**Depends on:** none

### Task 9: `estadoDoPar` passa a delegar
**File:** `audit-engine/src/intel/credit-events.ts`
**Action:** Edit
**What to do:** `estadoDoPar` vira adaptador de nome de campo sobre
`estadoTemporal`. Assinatura e comportamento idênticos.
**Verification:** `npm test`
**Depends on:** 8

### Task 10: limiar novo
**File:** `audit-engine/src/snapshot/thresholds.ts`
**Action:** Edit
**What to do:** `radarVariacaoMaterialPct: 0.20`, documentando a medição da B.1.
**Verification:** teste de contrato dos thresholds
**Depends on:** none

### Task 11: estado no radar
**File:** `audit-engine/src/intel/cross-portfolio.ts`
**Action:** Edit
**What to do:** `estado` em `RadarSinal`, `encerrados` em `RadarResultado`,
`opcoes.anterior`, `chaveSinal`, `registrosDeSinais`, e ordenação por estado
antes de severidade.
**Verification:** teste novo
**Depends on:** 8, 10

### Task 12: CLI lê o radar anterior
**File:** `audit-engine/src/snapshot/cli-snapshot.ts`
**Action:** Edit
**What to do:** `radarAnterior(root, data)` espelhando `creditoAnterior`, e
`baseEstado`/`temAnterior` no `RadarFile`.
**Verification:** rodar radar em duas datas reais e ver estados diferentes de `novo`.
**Depends on:** 11

### Task 13: tela abre pelo que mudou
**File:** `platform-radar.jsx`
**Action:** Edit
**What to do:** corte primário por estado, bloco recolhido para melhorado e
encerrado, contagem visível por estado.
**Verification:** smoke no preview
**Depends on:** 12

### Task 14: demo com duas datas
**File:** `scripts/gerar-radar-demo.mjs`
**Action:** Edit
**What to do:** gerar sobre duas datas da casa sintética para os estados
aparecerem no demo.
**Verification:** `node scripts/gerar-radar-demo.mjs` e conferir estados no payload
**Depends on:** 11

### Task 15: travas estáticas
**File:** `tests/validate.js`
**Action:** Edit
**What to do:** checks de que o payload do radar tem estado, tem encerrado, e de
que a tela mostra os grupos.
**Verification:** `npm run lint`
**Depends on:** 13, 14

---

## Fora do plano, para decisão

Os 12 limiares. A recomendação está em `docs/calibracao-limiares-2026-08.md` e
depende dos blocos 2 e 3, porque os números mudam depois deles.

## Rollback

Tudo em commits isolados por bloco. `git revert` do bloco. Os mapas da instância
são gerados e regeráveis, e o `.gitignore` da instância os mantém fora do git.
