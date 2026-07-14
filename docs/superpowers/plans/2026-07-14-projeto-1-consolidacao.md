# Projeto 1: Consolidação do ATLAS — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promover o ATLAS a sistema mãe: um audit-engine único, dado real fora do git, gatilhos de GitHub Pages eliminados, e o projeto movido para `02_AREAS/Operacoes-Recorrentes/ATLAS/`.

**Architecture:** O engine da raiz (mais evoluído) vira o engine canônico dentro do repo do ATLAS. A cópia órfã `verificacao-mensal/` e os gatilhos de Pages são deletados. A pasta do ATLAS é movida fisicamente para fora da árvore `Verificação de carteiras/`, que é rebaixada a área de staging de ingestão. Todas as referências de caminho externas são repontadas.

**Tech Stack:** Node 18+, TypeScript (audit-engine), PowerShell (operações de filesystem), git (dois repos independentes e aninhados).

**Convenções de caminho neste plano:**
- `ANTIGO` = `E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification`
- `NOVO` = `E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\ATLAS`
- `RAIZ` = `E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras`

**Referência:** spec `docs/superpowers/specs/2026-07-14-atlas-sistema-mae-design.md` (commit `00a819d`).

---

## Task 1: Baseline verde (pré-flight, sem commit)

Estabelece o ponto de partida. Nada é alterado. Se algo aqui já estiver vermelho, PARAR e reportar antes de tocar em qualquer arquivo.

**Files:** nenhum (somente leitura)

- [ ] **Step 1: Confirmar git status limpo nos dois repos**

```powershell
git -C "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras" status -s
git -C "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification" status -s
```
Esperado: repo do ATLAS limpo (vazio). A raiz pode ter modificações pendentes; anotá-las mas não commitar aqui.

- [ ] **Step 2: Baseline de teste do engine da raiz (fonte canônica)**

```powershell
npm --prefix "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\audit-engine" test
```
Esperado: PASS. `npm run build && node --test` compila o TypeScript e roda `dist/tests/*.test.js` sem falha.

- [ ] **Step 3: Baseline de teste do ATLAS**

```powershell
npm --prefix "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification" test
```
Esperado: PASS. `node tests/validate.js` conclui sem erro.

---

## Task 2: Consolidar o audit-engine no ATLAS

Substitui o engine congelado do ATLAS (cópia em bloco de 07/jul) pelo engine evoluído da raiz. Preserva a exceção offshore, o `collect_book_files()` de dois níveis e os testes que só existem na raiz.

**Files:**
- Modify (sobrescrever): `ANTIGO\audit-engine\src\` (a partir de `RAIZ\audit-engine\src\`)
- Modify (sobrescrever): `ANTIGO\audit-engine\scripts\` (a partir de `RAIZ\audit-engine\scripts\`)
- Modify (sobrescrever): `ANTIGO\audit-engine\tests\` (a partir de `RAIZ\audit-engine\tests\`)
- Modify: `ANTIGO\package.json` (script `test`)

- [ ] **Step 1: Copiar src/scripts/tests do engine da raiz sobre o do ATLAS**

Robocopy espelha `src`, `scripts` e `tests`. `/XD` exclui `node_modules`, `dist` e `__pycache__` para não arrastar artefatos.

```powershell
$src = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\audit-engine"
$dst = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification\audit-engine"
robocopy "$src\src" "$dst\src" /MIR /XD node_modules dist
robocopy "$src\scripts" "$dst\scripts" /MIR /XD __pycache__
robocopy "$src\tests" "$dst\tests" /MIR /XD node_modules dist __pycache__
# robocopy usa exit codes 0-7 como sucesso; forçar $LASTEXITCODE a 0 se <8
if ($LASTEXITCODE -lt 8) { $global:LASTEXITCODE = 0 }
```

- [ ] **Step 2: Verificar que os 5 pontos de divergência migraram**

```powershell
$dst = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification\audit-engine"
Select-String -Path "$dst\src\rules\rentabilidade.ts" -Pattern "_OFF" -Quiet          # exceção offshore -> True
Select-String -Path "$dst\scripts\extract-pdfs.py" -Pattern "collect_book_files" -Quiet # coletor 2 níveis -> True
Test-Path "$dst\tests\offshore-excecao.test.ts"                                          # -> True
Test-Path "$dst\tests\fixtures"                                                          # -> True
Test-Path "$dst\tests\parity-abril-2026.test.ts"                                         # -> True
```
Esperado: cinco `True`.

- [ ] **Step 3: Ajustar o script `test` do ATLAS para rodar as duas suítes**

Edite `ANTIGO\package.json`, linha 7. De:
```json
    "test": "node tests/validate.js",
```
Para:
```json
    "test": "node tests/validate.js && npm --prefix audit-engine test",
```

- [ ] **Step 4: Rodar a suíte consolidada do ATLAS**

```powershell
npm --prefix "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification" test
```
Esperado: PASS. Roda `validate.js`, depois compila e roda os testes do engine (incluindo `offshore-excecao` e `parity-abril-2026`).

- [ ] **Step 5: Commit**

```powershell
$atlas = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification"
git -C $atlas add audit-engine/src audit-engine/scripts audit-engine/tests package.json
git -C $atlas commit -m "feat: engine unico - engine da raiz substitui o congelado do ATLAS"
```

---

## Task 3: Deletar a cópia órfã e os gatilhos de GitHub Pages

Remove `verificacao-mensal/` (12 arquivos, zero referências), o workflow que publica o repo inteiro e o script de deploy para Pages. O destino é Cloudflare (Projeto 3), não Pages.

**Files:**
- Delete: `ANTIGO\verificacao-mensal\` (pasta inteira)
- Delete: `ANTIGO\.github\workflows\pages.yml`
- Delete: `ANTIGO\deploy-ghpages.ps1`
- Delete: `RAIZ\deploy-ghpages.ps1`

- [ ] **Step 1: Confirmar que `verificacao-mensal/` não é referenciada em lugar nenhum**

```powershell
$atlas = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification"
Get-ChildItem -Path $atlas -Recurse -File -Include *.html,*.js,*.jsx,*.json,*.md |
  Where-Object { $_.FullName -notmatch "verificacao-mensal|node_modules" } |
  Select-String -Pattern "verificacao-mensal" |
  Select-Object -First 5
```
Esperado: nenhuma saída. Se aparecer alguma referência, PARAR e reportar (a pasta não é órfã como o spec afirma).

- [ ] **Step 2: Deletar os quatro alvos**

```powershell
$atlas = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification"
$raiz  = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras"
git -C $atlas rm -r --quiet "verificacao-mensal"
git -C $atlas rm --quiet ".github/workflows/pages.yml"
git -C $atlas rm --quiet "deploy-ghpages.ps1"
git -C $raiz  rm --quiet "deploy-ghpages.ps1"
```

- [ ] **Step 3: Verificar que os testes seguem verdes**

```powershell
npm --prefix "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification" test
```
Esperado: PASS.

- [ ] **Step 4: Commit (dois repos)**

```powershell
$atlas = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification"
$raiz  = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras"
git -C $atlas commit -m "chore: remove copia orfa verificacao-mensal e gatilhos de GitHub Pages"
git -C $raiz  commit -m "chore: remove deploy-ghpages.ps1 (destino e Cloudflare, nao Pages)"
```

---

## Task 4: Dado real fora do git (repo ATLAS)

Endurece o `.gitignore` do ATLAS para os arquivos de dado gerado e remove do índice qualquer um já rastreado.

**Files:**
- Modify: `ANTIGO\.gitignore`

- [ ] **Step 1: Anexar regras de dado gerado ao `.gitignore` do ATLAS**

Acrescente ao fim de `ANTIGO\.gitignore`:
```gitignore

# Dado gerado — nunca versionar (alimenta o app; migra para R2 no Projeto 3)
data.json
data.js
historico.json
historico.js
audits/*/input/
```

- [ ] **Step 2: Remover do índice o que já estiver rastreado (mantém no disco)**

```powershell
$atlas = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification"
foreach ($f in @("data.json","data.js","historico.json","historico.js")) {
  git -C $atlas rm --cached --quiet --ignore-unmatch $f
}
git -C $atlas rm -r --cached --quiet --ignore-unmatch "audits/*/input" 2>$null
```

- [ ] **Step 3: Verificar que nenhum dado aparece mais como rastreado**

```powershell
$atlas = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification"
git -C $atlas ls-files | Select-String -Pattern "^data\.(json|js)$|^historico\.(json|js)$"
```
Esperado: nenhuma saída.

- [ ] **Step 4: Commit**

```powershell
$atlas = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification"
git -C $atlas add .gitignore
git -C $atlas commit -m "chore: dado gerado fora do git (data/historico, audits input)"
```

---

## Task 5: Mover o ATLAS para `02_AREAS/Operacoes-Recorrentes/ATLAS/`

Move físico da pasta inteira, com o `.git` próprio junto. A raiz não trackeia `Projetos/` (verificado), então o índice da raiz não é afetado.

**Files:**
- Move: `ANTIGO\` → `NOVO\`

- [ ] **Step 1: Garantir o repo do ATLAS commitado antes de mover**

```powershell
git -C "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification" status -s
```
Esperado: vazio. Se houver algo, commitar antes de prosseguir.

- [ ] **Step 2: Confirmar que o destino não existe e a raiz não trackeia Projetos/**

```powershell
Test-Path "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\ATLAS"   # -> False
git -C "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras" ls-files -- Projetos   # -> vazio
```
Esperado: `False` e saída vazia. Se o destino já existir, PARAR.

- [ ] **Step 3: Mover a pasta**

```powershell
Move-Item -Path "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\Projetos\atlas-wealth-verification" `
          -Destination "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\ATLAS"
```

- [ ] **Step 4: Verificar integridade do repo movido**

```powershell
Test-Path "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\ATLAS\.git"   # -> True
git -C "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\ATLAS" status -s  # -> vazio
git -C "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\ATLAS" remote -v  # -> origin github.com/Yan69793/atlas-wealth-verification
```
Esperado: `.git` presente, working tree limpo, remote inalterado.

- [ ] **Step 5: Rodar a suíte no novo caminho**

```powershell
npm --prefix "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\ATLAS" test
```
Esperado: PASS. (Sem commit: o move não altera o índice do repo do ATLAS, só o caminho no filesystem.)

---

## Task 6: Repontar referências de caminho externas

Atualiza os apontamentos para o caminho antigo. Critério de pronto: grep pelo caminho antigo retorna zero.

**Files:**
- Modify: `E:\Diretorio\Claude\CLAUDE.md` (se referenciar o caminho antigo)
- Modify: `C:\Users\User\.claude\skills\mirabaud-audit-engine\SKILL.md`
- Modify: `C:\Users\User\.claude\skills\verificacao-carteiras-v2\SKILL.md`
- Modify: `C:\Users\User\.claude\skills\vix-radar-audit\SKILL.md`
- Modify: `C:\Users\User\.claude\skills\awwwards-estudo\references\projetos.md`

- [ ] **Step 1: Localizar as ocorrências exatas do caminho antigo**

```powershell
$alvos = @(
  "C:\Users\User\.claude\skills\mirabaud-audit-engine\SKILL.md",
  "C:\Users\User\.claude\skills\verificacao-carteiras-v2\SKILL.md",
  "C:\Users\User\.claude\skills\vix-radar-audit\SKILL.md",
  "C:\Users\User\.claude\skills\awwwards-estudo\references\projetos.md",
  "E:\Diretorio\Claude\CLAUDE.md"
)
Select-String -Path $alvos -Pattern "atlas-wealth-verification|Verificação de carteiras" | Select-Object Path,LineNumber,Line
```
Anote cada linha. Há dois tipos de referência: (a) o projeto ATLAS, que passa a ser `...\Operacoes-Recorrentes\ATLAS`; (b) o `audit-engine`, que passa a ser `...\Operacoes-Recorrentes\ATLAS\audit-engine` (na `mirabaud-audit-engine`).

- [ ] **Step 2: Substituir caminho a caminho (Edit por ocorrência)**

Para cada ocorrência anotada, edite trocando:
- `...\Verificação de carteiras\Projetos\atlas-wealth-verification` → `...\Operacoes-Recorrentes\ATLAS`
- `...\Verificação de carteiras\audit-engine` → `...\Operacoes-Recorrentes\ATLAS\audit-engine`

Preserve o resto da linha intacto (a skill `mirabaud-audit-engine` cita o caminho na descrição do frontmatter — mantenha a frase, troque só o caminho).

- [ ] **Step 3: Verificar que nada mais aponta para o caminho antigo**

```powershell
$alvos = @(
  "C:\Users\User\.claude\skills\mirabaud-audit-engine\SKILL.md",
  "C:\Users\User\.claude\skills\verificacao-carteiras-v2\SKILL.md",
  "C:\Users\User\.claude\skills\vix-radar-audit\SKILL.md",
  "C:\Users\User\.claude\skills\awwwards-estudo\references\projetos.md",
  "E:\Diretorio\Claude\CLAUDE.md"
)
Select-String -Path $alvos -Pattern "atlas-wealth-verification"
```
Esperado: nenhuma saída.

- [ ] **Step 4: Commit (somente onde há repo)**

As skills em `C:\Users\User\.claude\skills` e o `CLAUDE.md` global podem não estar versionados. Se `E:\Diretorio\Claude` for um repo git, commitar lá:
```powershell
if (Test-Path "E:\Diretorio\Claude\.git") {
  git -C "E:\Diretorio\Claude" add CLAUDE.md
  git -C "E:\Diretorio\Claude" commit -m "chore: reaponta caminho do ATLAS pos-consolidacao"
}
```
Se não houver repo, registrar que a alteração é local e não versionada.

---

## Task 7: Rebaixar a raiz a staging de ingestão

A raiz deixa de ser sistema mas continua sendo a área de ingestão local até o R2 do Projeto 3. O engine local é removido (canônico agora é o do ATLAS) e o `ingest.ps1` é repontado. Maquetes e entregas antigas vão para `_arquivo/`. Dado gerado sai do índice (sem expurgo de histórico).

**Files:**
- Create: `RAIZ\_arquivo\` (pasta)
- Move: `RAIZ\SmartBrain\`, HTMLs de relatório → `RAIZ\_arquivo\`
- Delete: `RAIZ\audit-engine\` (engine local; canônico é o do ATLAS)
- Modify: `RAIZ\ingest.ps1` (repontar para o engine do ATLAS)
- Modify: `RAIZ\.gitignore`

- [ ] **Step 1: Ler o `ingest.ps1` atual para saber como ele chama o engine**

```powershell
Get-Content "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras\ingest.ps1"
```
Anote a linha que invoca o engine (`node ...\audit-engine\dist\src\cli.js` ou `npm --prefix audit-engine run ingest`).

- [ ] **Step 2: Repontar o `ingest.ps1` para o engine do ATLAS**

Edite `RAIZ\ingest.ps1`: troque o caminho do engine local pelo do ATLAS:
- `audit-engine` (relativo) ou `.\audit-engine` → `E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\ATLAS\audit-engine`

Mantenha a lógica de ingestão intacta; muda só o caminho do engine.

- [ ] **Step 3: Validar a ingestão repontada (fluxo real, mês de junho)**

```powershell
cd "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras"
.\ingest.ps1
```
Esperado: gera `data.json`/`data.js` sem erro, usando o engine do ATLAS. Confirme que o `data.json` resultante mantém as 94 carteiras de junho:
```powershell
node -e "const d=require('./data.json'); if(d.carteiras.length!==94) throw new Error('esperado 94, veio '+d.carteiras.length); console.log('OK 94 carteiras')"
```
Esperado: `OK 94 carteiras`. Se falhar, PARAR: o repontamento do engine quebrou a ingestão.

- [ ] **Step 4: Remover o engine local da raiz**

```powershell
git -C "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras" rm -r --quiet audit-engine
```

- [ ] **Step 5: Arquivar maquetes e entregas antigas**

```powershell
$raiz = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras"
New-Item -ItemType Directory -Force -Path "$raiz\_arquivo" | Out-Null
Move-Item -Path "$raiz\SmartBrain" -Destination "$raiz\_arquivo\SmartBrain"
Get-ChildItem -Path $raiz -Filter "*.html" | Where-Object { $_.Name -notmatch "^Verificacao Junho 2026 - Comite" } |
  ForEach-Object { Move-Item $_.FullName "$raiz\_arquivo\" }
```
(Mantém o `Comite.html` de junho na raiz por ser a entrega corrente; o resto é histórico.)

- [ ] **Step 6: Endurecer o `.gitignore` da raiz e tirar dado do índice**

Acrescente ao fim de `RAIZ\.gitignore`:
```gitignore

# Dado gerado e arquivo morto — fora do git
data.json
data.js
historico.json
historico.js
audits/*/input/
_arquivo/
```
Depois:
```powershell
$raiz = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras"
git -C $raiz rm --cached --quiet --ignore-unmatch data.json data.js
```

- [ ] **Step 7: Commit**

```powershell
$raiz = "E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Verificação de carteiras"
git -C $raiz add -A
git -C $raiz commit -m "refactor: raiz vira staging de ingestao (engine unico no ATLAS, arquivo morto separado, dado fora do git)"
```

---

## Fora de escopo (requer ordem explícita do operador)

- **Expurgo dos 436 PDFs do histórico do git da raiz.** `git rm --cached` e `.gitignore` impedem versionamento futuro, mas os PDFs seguem no histórico. Reescrever o histórico (`git filter-repo`) é irreversível; o repo é privado, então não é urgência. Fica para decisão à parte.
- **Projetos 2 e 3** (aba de Verificação nativa e plataforma Cloudflare) têm specs e planos próprios.

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** Seção A → Task 5; A2 (destino da raiz) → Task 7; A3 (refs) → Task 6; B (engine único) → Task 2; C (dado fora do git) → Tasks 4 e 7; deleção de Pages/deploy → Task 3. Restrição "OneDrive read-only" não é tocada por nenhuma task (correto: nenhuma escreve lá). Restrição "npm test verde + git status limpo" → verificada em Tasks 2, 3, 5.
- **Decisão adicionada:** engine único real (engine só no ATLAS, `ingest.ps1` da raiz repontado) — o spec dizia "um engine só" mas não resolvia o engine da raiz; Task 7 fecha isso.
- **Placeholders:** nenhum. Todo passo tem comando concreto e resultado esperado.
- **Consistência de caminhos:** `ANTIGO`/`NOVO`/`RAIZ` usados de forma uniforme; o novo caminho `...\Operacoes-Recorrentes\ATLAS` aparece igual nas Tasks 5, 6 e 7.
