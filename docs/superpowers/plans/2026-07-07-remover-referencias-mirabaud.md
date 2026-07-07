# Remoção de Referências a Mirabaud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover todas as referências ao nome "Mirabaud" (ex-empregador) do código, comentários, testes e documentação do repositório `atlas-wealth-verification`, substituindo por nomenclatura genérica consistente com padrões já existentes no próprio código.

**Architecture:** Rename mecânico e atômico de 3 identificadores (`parseMirabaudBook`, `injectMirabaud`/`window._MirabaudRealData`, entrada `MANAGERS` com `id:'MIRABAUD'`) e de 1 nome de pasta gitignored (`Verificação Mensal de Carteiras Mirabaud/`) — cada rename atualiza definição, todos os call-sites, comentários e testes na mesma tarefa, validado por `npm test` verde ao final. Sem mudança de comportamento; apenas nomenclatura. Confirmado antes do planejamento: a pasta `Verificação Mensal de Carteiras Mirabaud/` e o arquivo `platform-data-real.js` (ambos gitignored) não existem neste checkout — não há dados reais/LGPD em risco.

**Tech Stack:** JavaScript puro ES5 (`platform-parsers.js`, `platform-data.js`) + JSX/React via CDN (`platform-import.jsx`) + Node.js `tests/validate.js` (test runner próprio via `node tests/validate.js`, sem framework externo).

---

### Task 1: Renomear `parseMirabaudBook` → `parseSmartBrainBook`

**Files:**
- Modify: `platform-parsers.js:352, 457, 462, 726`
- Modify: `platform-import.jsx:174, 199`
- Modify: `tests/validate.js:337, 339-342, 371, 416, 486, 500, 511, 525-526`

- [ ] **Step 1: Renomear definição e comentários em platform-parsers.js**

Em `platform-parsers.js:352`, trocar:
```js
     PDF — books mensais Mirabaud (SmartBrain)
```
por:
```js
     PDF — books mensais SmartBrain
```

Em `platform-parsers.js:457`, trocar:
```js
  // Parser do layout dos books mensais (SmartBrain / Mirabaud).
```
por:
```js
  // Parser do layout dos books mensais (SmartBrain).
```

Em `platform-parsers.js:462`, trocar:
```js
  function parseMirabaudBook(pagesLines, options) {
```
por:
```js
  function parseSmartBrainBook(pagesLines, options) {
```

Em `platform-parsers.js:726` (bloco de exports), trocar:
```js
    parseMirabaudBook: parseMirabaudBook
```
por:
```js
    parseSmartBrainBook: parseSmartBrainBook
```

- [ ] **Step 2: Atualizar call-site e comentário em platform-import.jsx**

Em `platform-import.jsx:174`, trocar:
```js
    // --- PDF (books Mirabaud) ---
```
por:
```js
    // --- PDF (books SmartBrain) ---
```

Em `platform-import.jsx:199`, trocar:
```js
            const res = P.parseMirabaudBook(pagesLines, {
```
por:
```js
            const res = P.parseSmartBrainBook(pagesLines, {
```

- [ ] **Step 3: Atualizar tests/validate.js (todos os call-sites e descrições)**

Em `tests/validate.js:337`, trocar:
```js
// ─── 11. platform-parsers.js — parser de PDF (books Mirabaud) ───────────────
```
por:
```js
// ─── 11. platform-parsers.js — parser de PDF (books SmartBrain) ────────────
```

Em `tests/validate.js:339-342`, trocar:
```js
ok('parseBRNumber/reconstructPdfLines/parseMirabaudBook exportados',
  typeof P.parseBRNumber === 'function' &&
  typeof P.reconstructPdfLines === 'function' &&
  typeof P.parseMirabaudBook === 'function');
```
por:
```js
ok('parseBRNumber/reconstructPdfLines/parseSmartBrainBook exportados',
  typeof P.parseBRNumber === 'function' &&
  typeof P.reconstructPdfLines === 'function' &&
  typeof P.parseSmartBrainBook === 'function');
```

Em `tests/validate.js:371`, trocar:
```js
// --- parseMirabaudBook: fixture sintética no layout real (dados fictícios) ---
```
por:
```js
// --- parseSmartBrainBook: fixture sintética no layout real (dados fictícios) ---
```

Em `tests/validate.js:416`, trocar:
```js
const bookRes = P.parseMirabaudBook(BOOK_OK, {
```
por:
```js
const bookRes = P.parseSmartBrainBook(BOOK_OK, {
```

Em `tests/validate.js:486`, trocar:
```js
const mpRes = P.parseMirabaudBook(BOOK_MULTIPAGE, {
```
por:
```js
const mpRes = P.parseSmartBrainBook(BOOK_MULTIPAGE, {
```

Em `tests/validate.js:500`, trocar:
```js
const badBook = P.parseMirabaudBook(BOOK_BAD, {
```
por:
```js
const badBook = P.parseSmartBrainBook(BOOK_BAD, {
```

Em `tests/validate.js:511`, trocar:
```js
const oorBook = P.parseMirabaudBook(BOOK_OOR, {
```
por:
```js
const oorBook = P.parseSmartBrainBook(BOOK_OOR, {
```

Em `tests/validate.js:525-526`, trocar:
```js
ok('platform-import.jsx usa parseMirabaudBook e reconstructPdfLines',
  importContent.includes('parseMirabaudBook') && importContent.includes('reconstructPdfLines'));
```
por:
```js
ok('platform-import.jsx usa parseSmartBrainBook e reconstructPdfLines',
  importContent.includes('parseSmartBrainBook') && importContent.includes('reconstructPdfLines'));
```

- [ ] **Step 4: Rodar a suíte e confirmar verde**

Run: `npm test`
Expected: todas as linhas `ok` (nenhum `FAIL`), incluindo as da seção 11 e 12.

- [ ] **Step 5: Commit**

```bash
git add platform-parsers.js platform-import.jsx tests/validate.js
git commit -m "refactor: renomear parseMirabaudBook para parseSmartBrainBook"
```

---

### Task 2: Renomear `injectMirabaud`, `window._MirabaudRealData` e gestor `MIRABAUD` em platform-data.js

**Files:**
- Modify: `platform-data.js:357, 362-363, 387, 396, 432, 436, 1436-1437, 1478, 1660`

- [ ] **Step 1: Renomear comentário e assinatura do injetor**

Em `platform-data.js:356-360`, trocar:
```js
  /* =============================================================
     4c. INJETOR DE CARTEIRAS REAIS (lê window._MirabaudRealData)
     O arquivo platform-data-real.js (gitignored) define esse objeto.
     Sem ele, apenas as 40 carteiras demo ficam ativas.
  ============================================================= */
```
por:
```js
  /* =============================================================
     4c. INJETOR DE CARTEIRAS REAIS (lê window._AtlasRealData)
     O arquivo platform-data-real.js (gitignored) define esse objeto.
     Sem ele, apenas as 40 carteiras demo ficam ativas.
  ============================================================= */
```

Em `platform-data.js:362-363`, trocar:
```js
  function injectMirabaud() {
    var D = window._MirabaudRealData;
```
por:
```js
  function injectRealData() {
    var D = window._AtlasRealData;
```

- [ ] **Step 2: Renomear referência ao id do gestor na limpeza idempotente**

Em `platform-data.js:386-388`, trocar:
```js
    for (var j = MANAGERS.length - 1; j >= 0; j--) {
      if (MANAGERS[j].id === 'MIRABAUD') MANAGERS.splice(j, 1);
    }
```
por:
```js
    for (var j = MANAGERS.length - 1; j >= 0; j--) {
      if (MANAGERS[j].id === 'REAIS') MANAGERS.splice(j, 1);
    }
```

- [ ] **Step 3: Renomear entrada do gestor injetado**

Em `platform-data.js:396`, trocar:
```js
    MANAGERS.push({ id:'MIRABAUD', name:'Mirabaud Advisory', codes:codes.slice(), roaTarget:0.0050 });
```
por:
```js
    MANAGERS.push({ id:'REAIS', name:'Carteiras Reais', codes:codes.slice(), roaTarget:0.0050 });
```

Segue o padrão já usado em `platform-data.js:1616` para dados importados via UI (`{ id: 'IMPORTADAS', name: 'Carteiras Importadas', ... }`) — mesma convenção de nome genérico e descritivo, sem referência a instituição específica.

- [ ] **Step 4: Renomear comentário e primeiro call-site do injetor**

Em `platform-data.js:432`, trocar:
```js
    // Dados injetados via window._MirabaudRealData (platform-data-real.js)
```
por:
```js
    // Dados injetados via window._AtlasRealData (platform-data-real.js)
```

Em `platform-data.js:436`, trocar:
```js
  injectMirabaud();
```
por:
```js
  injectRealData();
```

- [ ] **Step 5: Renomear referências no self-check de integridade**

Em `platform-data.js:1435-1437`, trocar:
```js
    // I1: 40 fictícias + N reais (depende de window._MirabaudRealData)
    var _realN = (typeof window !== 'undefined' && window._MirabaudRealData && window._MirabaudRealData.portfolios)
      ? window._MirabaudRealData.portfolios.length : 0;
```
por:
```js
    // I1: 40 fictícias + N reais (depende de window._AtlasRealData)
    var _realN = (typeof window !== 'undefined' && window._AtlasRealData && window._AtlasRealData.portfolios)
      ? window._AtlasRealData.portfolios.length : 0;
```

Em `platform-data.js:1478`, trocar:
```js
    // I7: gestores — 4 fictícios + 1 Mirabaud se dados reais carregados
```
por:
```js
    // I7: gestores — 4 fictícios + 1 real se dados reais carregados
```

- [ ] **Step 6: Renomear segundo call-site do injetor (dentro de restoreDemo)**

Em `platform-data.js:1660`, trocar:
```js
    injectMirabaud();
```
por:
```js
    injectRealData();
```

- [ ] **Step 7: Rodar a suíte e confirmar verde**

Run: `npm test`
Expected: todas as linhas `ok` (nenhum `FAIL`), incluindo as checagens de integridade I1 e I7.

- [ ] **Step 8: Commit**

```bash
git add platform-data.js
git commit -m "refactor: renomear injetor de dados reais e gestor MIRABAUD para nomenclatura generica"
```

---

### Task 3: Atualizar documentação e nome de pasta LGPD-gitignored

**Files:**
- Modify: `.gitignore:32`
- Modify: `CLAUDE.md:7`
- Modify: `README.md:42, 56-57`
- Modify: `PENDENCIAS.md:176-177, 200`

- [ ] **Step 1: Renomear a referência de pasta no .gitignore**

Em `.gitignore:32`, trocar:
```
Verificação Mensal de Carteiras Mirabaud/
```
por:
```
Verificação Mensal de Carteiras/
```

- [ ] **Step 2: Renomear a referência de pasta no CLAUDE.md**

Em `CLAUDE.md:7`, trocar:
```
- Nunca adicionar ao Git a pasta `Verificação Mensal de Carteiras Mirabaud/`
```
por:
```
- Nunca adicionar ao Git a pasta `Verificação Mensal de Carteiras/`
```

- [ ] **Step 3: Atualizar README.md**

Em `README.md:42`, trocar:
```
- **Dados reais ficam fora do Git**: a pasta `Verificação Mensal de Carteiras Mirabaud/` contém dados operacionais reais (PDFs, relatórios, dados de clientes / LGPD) e está explicitamente ignorada pelo `.gitignore`. Nunca deve ser commitada.
```
por:
```
- **Dados reais ficam fora do Git**: a pasta `Verificação Mensal de Carteiras/` contém dados operacionais reais (PDFs, relatórios, dados de clientes / LGPD) e está explicitamente ignorada pelo `.gitignore`. Nunca deve ser commitada.
```

Em `README.md:56-57`, trocar:
```
- **PDF** (**beta\experimental**): books mensais no layout "Relatório Mensal"
  (SmartBrain/Mirabaud). Extração de texto local via pdf.js (lazy-load com SRI,
```
por:
```
- **PDF** (**beta\experimental**): books mensais no layout "Relatório Mensal"
  (SmartBrain). Extração de texto local via pdf.js (lazy-load com SRI,
```

- [ ] **Step 4: Atualizar PENDENCIAS.md**

Em `PENDENCIAS.md:176-177`, trocar:
```
**4. `injectMirabaud()` não-idempotente.**
Reportado como risco de duplicação de MANAGERS. `restoreDemo()` restaura de snapshot, não chama `injectMirabaud()` — fluxo demo→import→demo está correto. MANAGERS duplicados não ocorrem no fluxo implementado.
```
por:
```
**4. `injectRealData()` não-idempotente.**
Reportado como risco de duplicação de MANAGERS. `restoreDemo()` restaura de snapshot, não chama `injectRealData()` — fluxo demo→import→demo está correto. MANAGERS duplicados não ocorrem no fluxo implementado.
```

Em `PENDENCIAS.md:200`, trocar:
```
5. **PDF em Web Worker:** Existe limite de tamanho de PDF no fluxo atual? Um book Mirabaud típico tem quantas páginas?
```
por:
```
5. **PDF em Web Worker:** Existe limite de tamanho de PDF no fluxo atual? Um book típico tem quantas páginas?
```

- [ ] **Step 5: Rodar a suíte e confirmar verde**

Run: `npm test`
Expected: todas as linhas `ok` (nenhum `FAIL`) — este passo não toca código, é checagem de regressão.

- [ ] **Step 6: Commit**

```bash
git add .gitignore CLAUDE.md README.md PENDENCIAS.md
git commit -m "docs: remover referencias a Mirabaud da documentacao e do .gitignore"
```

---

### Task 4: Verificação final de varredura completa

**Files:**
- Nenhum (apenas leitura/validação, sem modificação)

- [ ] **Step 1: Confirmar zero ocorrências de "mirabaud" no repositório**

Run (PowerShell, na raiz do repo):
```powershell
Get-ChildItem -Recurse -File -Exclude .git | Select-String -Pattern 'mirabaud' -CaseSensitive:$false
```
Expected: nenhuma linha retornada.

- [ ] **Step 2: Rodar a suíte completa uma última vez**

Run: `npm test`
Expected: todas as linhas `ok`, nenhum `FAIL`.

- [ ] **Step 3: Confirmar working tree limpo além dos commits das Tasks 1-3**

Run: `git status --short`
Expected: sem alterações pendentes (tudo já commitado nas tasks anteriores).

Nota: a pasta local `Verificação Mensal de Carteiras Mirabaud/` e o arquivo `platform-data-real.js` não existem neste checkout (confirmado antes do planejamento) — não há dados reais/LGPD para migrar ou renomear fisicamente no disco; a Task 3 apenas corrige a referência textual usada como convenção futura de nome de pasta.
