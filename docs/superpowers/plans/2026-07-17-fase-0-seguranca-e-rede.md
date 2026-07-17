# Fase 0: tornar o sistema seguro de mudar e seguro de vender

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o caminho público para o bucket com dado de cliente, fazer a rede de testes existir de verdade, e proteger os dois repos de produção que só existem no disco local. Nada de Fase 1 começa antes disto fechar.

**Architecture:** Nenhuma mudança arquitetural. Esta fase é remediação e instrumentação sobre o que já está de pé. Cada tarefa é independente e commitável sozinha.

**Tech Stack:** Cloudflare Workers (JS ESM), Cloudflare Access, R2, TypeScript ESM + `node:test` (audit-engine), Node 18+, PowerShell.

---

## Contexto

Três sistemas (ATLAS/verificacao-carteiras, VIX Radar, Radar Quant) devem convergir numa plataforma para family office e consultoria CVM 19, seguindo o modelo service-as-software: serviço agora, licença depois.

A pesquisa estratégica de produto (`1.pdf`, 17/07/2026) confirma o alvo e o gap de mercado ("nenhum player brasileiro combina consolidação auditada, monitoramento preditivo de crédito privado e IA explicável em um só produto") e determina que os primeiros 6 meses são para **empacotar e vender o que já existe**, não para refatorar. Esta fase não contradiz isso: ela não é refactor, é a condição para poder mexer em qualquer coisa sem quebrar 37 meses de dado já entregue ao cliente, e para fechar uma exposição ativa.

**O achado que define a prioridade:** os dois parity tests que provam que o motor de auditoria não mudou de resposta estão permanentemente pulados, e `npm test` fica verde. O `docs/operacao.md` da instância já nomeia "servir dado velho, sem erro e sem aviso" como o modo de falha mais perigoso do sistema. A rede que deveria pegar isso está fazendo exatamente isso. É o mesmo bug, duas vezes.

## Escopo

Este plano cobre **só a Fase 0**. As fases seguintes ganham planos próprios, cada uma produzindo software funcionando:

- **Fase 1** (0 a 6 meses, comercial): empacotar como vendável. Relatório white-label, portal de cliente, `/api/data/:mes` com costuras de tenant, VIX Radar como upsell. Depende da decisão de marca (Task 9).
- **Fase 2** (6 a 18 meses): pagar a dívida da ingestão manual com feeds ANBIMA Data e B3 UP2DATA, depois Área do Investidor e Open Finance.
- **Fase 3** (18 meses+): IA auditável com citação de regra, dado e fonte. Só então licenciamento multi-tenant.

Migração de stack (Vite, React 19, Recharts 3, TypeScript) **saiu do caminho crítico**. É higiene sem valor visível ao cliente. Entra quando bloquear algo concreto.

**Local final deste plano:** `E:\Diretorio\Claude\ATLAS\docs\superpowers\plans\2026-07-17-fase-0-seguranca-e-rede.md`

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `verificacao-carteiras/worker/wrangler.toml` | config do Worker da instância | Modificar: remover `workers_dev`, remover `DIRECTOR_KEY` de `[vars]` |
| `verificacao-carteiras/worker/src/index.js` | Worker: auth, R2, assets | Modificar: remover o bypass de diretor (l.123-136, 159, 208, 253-266) |
| `ATLAS/audit-engine/tests/parity-abril-2026.test.ts` | parity Excel vs gabarito | Modificar: `ROOT` posicional vira env var, skip vira erro |
| `ATLAS/audit-engine/tests/parity-pdf-vs-excel-abril.test.ts` | parity PDF vs Excel | Modificar: idem |
| `ATLAS/audit-engine/tests/fixtures-guard.test.ts` | prova que o parity não pula silenciosamente | **Criar** |
| `ATLAS/audit-engine/tests/fixtures/abril-2026-legacy.anon.json` | gabarito anonimizado, versionável | **Criar** |
| `ATLAS/scripts/anonimizar-fixture.mjs` | gera o gabarito anonimizado do audit.json real | **Criar** |
| `ATLAS/.gitignore` | deny-by-default | Modificar: liberar `/audit-engine/tests/fixtures/*.anon.json` |
| `verificacao-carteiras/scripts/selar-mes.mjs` | fecha checksum de um mês entregue | **Criar** |
| `verificacao-carteiras/scripts/verificar-selos.mjs` | falha se mês fechado mudou | **Criar** |
| `verificacao-carteiras/audits/selos.json` | checksums dos meses fechados | **Criar** (versionável, só hashes) |
| `Morning Call/.gitignore`, `Trading View/.gitignore` | deny-by-default | **Criar** antes do primeiro remote |
| `Monitoramento de Credito/.gitignore` | remover `api/v4.*.js` | Modificar |
| `Morning Call/apps/radar-quant/worker/src/index.ts` | CORS | Modificar: fail-closed |

---

## Task 1: Fechar o caminho público para o bucket de cliente

**Prioridade P0.** É a única tarefa com exposição ativa hoje.

`workers_dev = true` publica `atlas-instancia.<subdomain>.workers.dev`, servindo o mesmo binding `ATLAS_DATA` e **fora da app do Access**, que só cobre `atlas.szuchmacher.com.br`. O `DIRECTOR_KEY` pula o JWT inteiro via `?key=` na querystring, que vaza em log de proxy e header Referer, e o cookie que ele seta carrega o próprio valor da chave por 30 dias. Nenhum dos dois está commitado, mas ambos estão no working tree de um arquivo **rastreado**: um `git add worker/` publica os dois.

Isto é o incidente de 15/07 se rearmando. A causa daquele vazamento não foi `wrangler pages deploy .` ignorar `.gitignore` (isso é o mecanismo), foi **o perímetro estar preso a um hostname enquanto o artefato era alcançável por outro**.

**Files:**
- Modify: `E:\Diretorio\Claude\verificacao-carteiras\worker\wrangler.toml:3,26-27`
- Modify: `E:\Diretorio\Claude\verificacao-carteiras\worker\src\index.js:123-136,159,208,253-266`

- [ ] **Step 1: Confirmar a exposição antes de fechar**

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras"
git diff worker/wrangler.toml
curl -s -o /dev/null -w "%{http_code}\n" "https://atlas.szuchmacher.com.br/healthz"
```

Esperado: o diff mostra `+workers_dev = true` e `+DIRECTOR_KEY`. O healthz responde 200 com `directorConfigured: true`.

- [ ] **Step 2: Remover `workers_dev` e a chave do wrangler.toml**

Em `worker/wrangler.toml`, apagar a linha 3 (`workers_dev = true`) e as linhas 26-27:

```toml
# Chave de bypass para acesso diretor (sem OTP). Use como ?key=
DIRECTOR_KEY = "DIRECTOR_KEY_REDIGIDA_ROTACIONAR"
```

Adicionar, no lugar, o registro da decisão:

```toml
# Sem workers_dev: *.workers.dev e um hostname que a app do Access nao cobre,
# e este Worker serve o bucket com dado de cliente. Foi assim que a arvore
# vazou em 15/07 pelo <hash>.projeto.pages.dev. Nao reintroduzir.
```

- [ ] **Step 3: Remover o bypass do Worker**

Em `worker/src/index.js`, apagar as linhas 123-136 (o bloco `Director bypass`) e os blocos `shouldSetCookie` / `shouldClearCookie` (l.253-266).

Trocar `if (!directorValid) {` por auth incondicional nos dois pontos. Em `/api/data/:mes` (l.159-168) e no bloco de overlays (l.208-226), o corpo do `if` passa a rodar sempre. Exemplo para `/api/data/:mes`:

```js
    const m = url.pathname.match(/^\/api\/data\/(\d{4}-\d{2})$/);
    if (m) {
      if (request.method !== 'GET') return json({ erro: 'metodo nao permitido' }, 405);

      if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
        return json({ erro: 'perimetro nao configurado' }, 503);
      }

      const token =
        request.headers.get('Cf-Access-Jwt-Assertion') ||
        (request.headers.get('cookie') || '').match(/CF_Authorization=([^;]+)/)?.[1];

      if (!token) return json({ erro: 'nao autenticado' }, 401);

      const payload = await verificarJwtAccess(token, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD);
      if (!payload) return json({ erro: 'token invalido' }, 403);

      const obj = await env.ATLAS_DATA.get(`audits/${m[1]}.json`);
      if (!obj) return json({ erro: 'mes nao encontrado', mes: m[1] }, 404);
      ...
```

Em `/healthz` (l.141-148), remover `directorConfigured`, `directorCookie` e `shouldSet` do JSON. Remover também o parâmetro `cookieOpts` de onde for passado.

- [ ] **Step 4: Substituir o acesso do diretor por Access service token**

O bypass existe porque o OTP incomoda. A resposta a "auth incomoda" nunca é um segundo caminho sem auth. No painel do Cloudflare Zero Trust, criar um service token para a app `ATLAS — instancia do cliente` (id `4192ab65`) e adicionar uma policy `Service Auth` que o aceite. O cliente passa a mandar `CF-Access-Client-Id` e `CF-Access-Client-Secret`, e o Worker não muda: o Access injeta o JWT normalmente.

- [ ] **Step 5: Deploy e verificar que o hostname morreu**

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras/worker"
npx wrangler deploy
curl -s -o /dev/null -w "%{http_code}\n" "https://atlas.szuchmacher.com.br/healthz"
curl -s "https://atlas.szuchmacher.com.br/api/data/2026-06?key=DIRECTOR_KEY_REDIGIDA_ROTACIONAR"
```

Esperado: healthz 200 sem os campos `director*`. A chamada com `?key=` retorna `{"erro":"nao autenticado"}` com 401, **não** o dado.

- [ ] **Step 6: Confirmar que o subdomínio workers.dev não responde**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://atlas-instancia.prospects-intel.workers.dev/healthz"
```

Esperado: 404 ou falha de DNS. Se responder 200, o `workers_dev = false` não propagou: apagar o Worker e redeployar.

- [ ] **Step 7: Rotacionar a chave**

A chave `DIRECTOR_KEY_REDIGIDA_ROTACIONAR` já circulou em querystring, portanto está em log de proxy e possivelmente em header Referer de qualquer recurso externo que a página tenha carregado. Ela está morta no código, mas se houver qualquer outro uso dela em qualquer sistema, trocar. Verificar:

```bash
cd "E:/Diretorio/Claude"
grep -rl "DIRECTOR_KEY_REDIGIDA_ROTACIONAR" . 2>/dev/null
```

Esperado: nenhum resultado após o Step 3.

- [ ] **Step 8: Commit**

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras"
git add worker/wrangler.toml worker/src/index.js
git commit -m "fix(seguranca): remove workers_dev e o bypass de diretor

O perimetro e a app do Access em atlas.szuchmacher.com.br. workers_dev
publicava o mesmo Worker, com o mesmo binding de R2, num hostname que a
policy nao cobre. Foi essa a causa do vazamento de 15/07, nao o wrangler
ignorar o .gitignore.

A DIRECTOR_KEY pulava o JWT inteiro via ?key=, que vaza em log de proxy e
Referer, e o cookie carregava o proprio valor da chave por 30 dias. Acesso
sem OTP passa a ser Access service token.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Fazer os parity tests existirem

`parity-abril-2026.test.ts:10-11` resolve `ROOT = path.resolve(__dirname,'..','..','..')`, que a partir de `dist/tests/` aponta para `E:\Diretorio\Claude\ATLAS`. O XLSX vive em `E:\Diretorio\Claude\verificacao-carteiras\`. Consumido como submodule, `ROOT` vira `verificacao-carteiras\core` e o XLSX continua um nível acima. **Não existe diretório de onde esses testes rodem.** E `git ls-files audit-engine/tests/fixtures` volta vazio: o gabarito não está no git, então nem um clone limpo os salvaria.

**Files:**
- Modify: `E:\Diretorio\Claude\ATLAS\audit-engine\tests\parity-abril-2026.test.ts`
- Modify: `E:\Diretorio\Claude\ATLAS\audit-engine\tests\parity-pdf-vs-excel-abril.test.ts:46`
- Create: `E:\Diretorio\Claude\ATLAS\audit-engine\tests\fixtures-guard.test.ts`
- Create: `E:\Diretorio\Claude\ATLAS\scripts\anonimizar-fixture.mjs`
- Modify: `E:\Diretorio\Claude\ATLAS\.gitignore`

- [ ] **Step 1: Provar que os testes pulam hoje**

```bash
cd "E:/Diretorio/Claude/ATLAS/audit-engine"
npm test 2>&1 | grep -E "^# (skipped|pass|fail)"
```

Esperado: `# skipped 2` (ou mais) e `# fail 0`. Este é o bug: verde com as duas suítes que importam não executando.

- [ ] **Step 2: Escrever o guard que falha enquanto isso for verdade**

Criar `audit-engine/tests/fixtures-guard.test.ts`:

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

// Este teste existe porque as suites de parity pulavam em silencio: o XLSX
// nunca esteve no caminho que elas calculavam, e npm test ficava verde. Se
// ATLAS_FIXTURES esta setada, os fixtures TEM que estar la. Ausencia e erro,
// nunca skip. Sem a var, este teste passa e o CI e quem garante que ela existe.
describe('guarda dos fixtures de parity', () => {
  it('ATLAS_FIXTURES, quando setada, aponta para fixtures que existem', () => {
    const raiz = process.env.ATLAS_FIXTURES;
    if (!raiz) {
      console.warn('AVISO: ATLAS_FIXTURES ausente. As suites de parity vao pular. Isto so e aceitavel fora do CI.');
      return;
    }

    assert.ok(fs.existsSync(raiz), `ATLAS_FIXTURES aponta para diretorio inexistente: ${raiz}`);

    const xlsx = path.join(raiz, 'Verificacao_Carteiras_Abril_2026_v2.xlsx');
    assert.ok(fs.existsSync(xlsx), `XLSX de abril ausente em ${xlsx}`);
  });

  it('o gabarito anonimizado esta versionado e integro', () => {
    const legacy = path.resolve(
      path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
      '..', '..', 'tests', 'fixtures', 'abril-2026-legacy.anon.json'
    );
    assert.ok(fs.existsSync(legacy), `gabarito anonimizado ausente: ${legacy}`);

    const raw = JSON.parse(fs.readFileSync(legacy, 'utf-8'));
    const leg = raw.dashboard ?? raw;
    assert.equal(leg.summary.totals.total, 79);
    assert.equal(leg.summary.totals.corrigir, 1);
    assert.ok(Array.isArray(leg.carteiras) && leg.carteiras.length === 79);
    assert.ok(leg.carteiras.every((c: { plRef: unknown }) => typeof c.plRef === 'number'));
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
cd "E:/Diretorio/Claude/ATLAS/audit-engine"
npm test 2>&1 | grep -A3 "gabarito anonimizado"
```

Esperado: FAIL com `gabarito anonimizado ausente`. O arquivo ainda não existe.

- [ ] **Step 4: Gerar o gabarito anonimizado**

O `abril-2026-legacy.json` atual veio de um `audit.json` real e tem nome de carteira, então não pode entrar no git como está. Mas o teste só lê três coisas dele: `summary.totals.corrigir`, `summary.totals.total` e `carteiras[].plRef` (linhas 34-37 e 42-46). Nada disso precisa de identificador real.

Criar `ATLAS/scripts/anonimizar-fixture.mjs`:

```js
#!/usr/bin/env node
// Gera o gabarito de parity sem dado identificavel. O parity so le totais e
// plRef, entao nome de carteira nao precisa sobreviver. Sem isto, o gabarito
// nao pode ser versionado e o teste nunca roda em clone limpo.
import fs from 'node:fs';
import crypto from 'node:crypto';

const [, , entrada, saida] = process.argv;
if (!entrada || !saida) {
  console.error('uso: node scripts/anonimizar-fixture.mjs <audit.json> <saida.anon.json>');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(entrada, 'utf-8'));
const src = raw.dashboard ?? raw;

const anon = {
  dashboard: {
    summary: { totals: src.summary.totals },
    carteiras: src.carteiras.map((c) => ({
      nome: crypto.createHash('sha256').update(String(c.nome)).digest('hex').slice(0, 8),
      plRef: c.plRef,
    })),
  },
};

fs.writeFileSync(saida, JSON.stringify(anon, null, 2) + '\n');
console.log(`ok: ${anon.dashboard.carteiras.length} carteiras, nomes hasheados`);
```

Rodar:

```bash
cd "E:/Diretorio/Claude/ATLAS"
node scripts/anonimizar-fixture.mjs \
  "audit-engine/tests/fixtures/abril-2026-legacy.json" \
  "audit-engine/tests/fixtures/abril-2026-legacy.anon.json"
```

Esperado: `ok: 79 carteiras, nomes hasheados`.

- [ ] **Step 5: Confirmar que o anonimizado não tem dado identificável**

```bash
cd "E:/Diretorio/Claude/ATLAS"
node -e "
const j = JSON.parse(require('fs').readFileSync('audit-engine/tests/fixtures/abril-2026-legacy.anon.json','utf8'));
const d = j.dashboard;
console.log('chaves por carteira:', [...new Set(d.carteiras.flatMap(Object.keys))]);
console.log('nomes sao hash hex de 8:', d.carteiras.every(c => /^[0-9a-f]{8}\$/.test(c.nome)));
console.log('total:', d.summary.totals.total, 'corrigir:', d.summary.totals.corrigir);
"
```

Esperado: `chaves por carteira: [ 'nome', 'plRef' ]`, `nomes sao hash hex de 8: true`, `total: 79 corrigir: 1`.

- [ ] **Step 6: Liberar o anonimizado no .gitignore**

O `.gitignore` do ATLAS é deny-by-default e re-nega `/audit-engine/tests/fixtures/`. Adicionar, depois dessa regra:

```gitignore
# Gabarito de parity sem dado identificavel: so totais e plRef, nomes hasheados.
# Precisa ser versionado, senao o parity nunca roda em clone limpo, que e
# exatamente a falha que deixou as duas suites pulando em silencio.
!/audit-engine/tests/fixtures/
!/audit-engine/tests/fixtures/*.anon.json
```

Verificar que só o anonimizado entra:

```bash
cd "E:/Diretorio/Claude/ATLAS"
git check-ignore -v audit-engine/tests/fixtures/abril-2026-legacy.json
git check-ignore -v audit-engine/tests/fixtures/abril-2026-legacy.anon.json
```

Esperado: o primeiro é ignorado (mostra a regra). O segundo **não** é ignorado (sai vazio, exit 1).

- [ ] **Step 7: Apontar os parity tests para o gabarito anonimizado e para ATLAS_FIXTURES**

Em `parity-abril-2026.test.ts`, trocar as linhas 9-19 por:

```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ATLAS_FIXTURES aponta para onde o dado real vive (a instancia do cliente).
// Nao derivar por path.resolve a partir de __dirname: isso responde coisas
// diferentes conforme rode do dist, da fonte, do repo produto ou do submodule,
// e foi assim que esta suite passou meses pulando sem ninguem notar.
const FIXTURES = process.env.ATLAS_FIXTURES;
const XLSX = FIXTURES ? path.join(FIXTURES, 'Verificacao_Carteiras_Abril_2026_v2.xlsx') : null;
const LEGACY = path.resolve(__dirname, '..', '..', 'tests', 'fixtures', 'abril-2026-legacy.anon.json');

// Sem ATLAS_FIXTURES, pula (dev local sem dado real). Com a var setada e o
// arquivo ausente, e ERRO: silencio aqui e o mesmo modo de falha que o
// docs/operacao.md chama de mais perigoso.
if (FIXTURES && !fs.existsSync(XLSX!)) {
  throw new Error(`ATLAS_FIXTURES setada mas XLSX ausente: ${XLSX}`);
}

describe('parity abril 2026', { skip: !FIXTURES && 'ATLAS_FIXTURES ausente (rode com a raiz da instancia)' }, () => {
```

Trocar `XLSX` por `XLSX!` nas chamadas a `parseExcelV2` (l.21 e l.41). Aplicar a mesma mudança em `parity-pdf-vs-excel-abril.test.ts:46`.

- [ ] **Step 8: Rodar sem a var, e ver pular com aviso**

```bash
cd "E:/Diretorio/Claude/ATLAS/audit-engine"
npm test 2>&1 | grep -E "^# (skipped|pass|fail)"
```

Esperado: `# fail 0`, e o guard passa com o `AVISO: ATLAS_FIXTURES ausente`.

- [ ] **Step 9: Rodar com a var, e ver passar de verdade**

```bash
cd "E:/Diretorio/Claude/ATLAS/audit-engine"
ATLAS_FIXTURES="E:/Diretorio/Claude/verificacao-carteiras" npm test 2>&1 | grep -E "^# (skipped|pass|fail)"
```

Esperado: `# skipped 0` e `# fail 0`. **Este é o primeiro momento em que o parity de abril roda.** Se falhar, não conserte o teste: o motor mudou de resposta e isso é o achado.

- [ ] **Step 10: Provar que a var errada agora grita**

```bash
cd "E:/Diretorio/Claude/ATLAS/audit-engine"
ATLAS_FIXTURES="E:/caminho/que/nao/existe" npm test 2>&1 | grep -E "^# fail|ATLAS_FIXTURES"
```

Esperado: FAIL. Antes desta tarefa, isso passava em silêncio.

- [ ] **Step 11: Commit**

```bash
cd "E:/Diretorio/Claude/ATLAS"
git add audit-engine/tests/ scripts/anonimizar-fixture.mjs .gitignore
git commit -m "fix(test): parity deixa de pular em silencio

ROOT era derivado por path.resolve e apontava para um diretorio onde o XLSX
nunca esteve, entao as duas suites de parity pulavam e npm test ficava verde.
O gabarito tambem nao estava no git, entao nem clone limpo as salvaria.

Agora: ATLAS_FIXTURES explicita, ausencia do fixture com a var setada e erro,
e o gabarito entra versionado sem dado identificavel (so totais e plRef, nomes
hasheados, que e tudo que o teste le).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Selar os meses fechados

Há gabarito para abril/2026 e para mais nenhum dos 37 meses, e não dá para ter parity real sem 37 gabaritos. Mas há um invariante barato: **mês entregue é imutável.** Nada além do mês corrente deveria mudar de resultado, nunca. Isso ataca de frente o modo de falha que o `docs/operacao.md` nomeia.

**Files:**
- Create: `E:\Diretorio\Claude\verificacao-carteiras\scripts\selar-mes.mjs`
- Create: `E:\Diretorio\Claude\verificacao-carteiras\scripts\verificar-selos.mjs`
- Create: `E:\Diretorio\Claude\verificacao-carteiras\audits\selos.json`

- [ ] **Step 1: Escrever o verificador antes do selador**

Criar `verificacao-carteiras/scripts/verificar-selos.mjs`:

```js
#!/usr/bin/env node
// Mes entregue e imutavel. Se o audit.json de um mes selado mudou, alguem
// reingeriu por cima de um mes fechado e o cliente ja recebeu o numero antigo.
// Isso tem que gritar. Sai 1 se qualquer selo quebrou.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const RAIZ = process.argv[2] ?? '.';
const SELOS = path.join(RAIZ, 'audits', 'selos.json');

if (!fs.existsSync(SELOS)) {
  console.error(`selos.json ausente em ${SELOS}. Rode selar-mes.mjs primeiro.`);
  process.exit(1);
}

const selos = JSON.parse(fs.readFileSync(SELOS, 'utf-8'));
let quebrados = 0;

for (const [mes, esperado] of Object.entries(selos.meses)) {
  const arq = path.join(RAIZ, 'audits', mes, 'audit.json');
  if (!fs.existsSync(arq)) {
    console.error(`QUEBRADO ${mes}: audit.json sumiu (${arq})`);
    quebrados++;
    continue;
  }
  const atual = crypto.createHash('sha256').update(fs.readFileSync(arq)).digest('hex');
  if (atual !== esperado) {
    console.error(`QUEBRADO ${mes}: selado ${esperado.slice(0, 12)}, atual ${atual.slice(0, 12)}`);
    quebrados++;
  }
}

const n = Object.keys(selos.meses).length;
if (quebrados) {
  console.error(`\n${quebrados}/${n} meses fechados mudaram. Mes entregue e imutavel.`);
  process.exit(1);
}
console.log(`ok: ${n} meses selados, todos integros`);
```

- [ ] **Step 2: Rodar e ver falhar por falta de selos.json**

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras"
node scripts/verificar-selos.mjs .
```

Esperado: `selos.json ausente`, exit 1.

- [ ] **Step 3: Escrever o selador**

Criar `verificacao-carteiras/scripts/selar-mes.mjs`:

```js
#!/usr/bin/env node
// Sela um mes entregue. Depois disso, verificar-selos.mjs falha se ele mudar.
// Guarda so o hash: selos.json e versionavel, nao carrega dado.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [, , mes, raizArg] = process.argv;
const RAIZ = raizArg ?? '.';

if (!/^\d{4}-\d{2}$/.test(mes ?? '')) {
  console.error('uso: node scripts/selar-mes.mjs <AAAA-MM> [raiz]');
  process.exit(1);
}

const arq = path.join(RAIZ, 'audits', mes, 'audit.json');
if (!fs.existsSync(arq)) {
  console.error(`audit.json ausente: ${arq}`);
  process.exit(1);
}

const SELOS = path.join(RAIZ, 'audits', 'selos.json');
const selos = fs.existsSync(SELOS)
  ? JSON.parse(fs.readFileSync(SELOS, 'utf-8'))
  : { nota: 'sha256 do audit.json de cada mes entregue. Mes selado nao muda.', meses: {} };

const hash = crypto.createHash('sha256').update(fs.readFileSync(arq)).digest('hex');

if (selos.meses[mes] && selos.meses[mes] !== hash) {
  console.error(`RECUSADO ${mes}: ja selado com outro hash. Re-selar apaga a prova.`);
  console.error(`  selado: ${selos.meses[mes]}`);
  console.error(`  atual:  ${hash}`);
  console.error('Se a mudanca e intencional, apague a entrada a mao e registre por que.');
  process.exit(1);
}

selos.meses[mes] = hash;
selos.meses = Object.fromEntries(Object.entries(selos.meses).sort());
fs.writeFileSync(SELOS, JSON.stringify(selos, null, 2) + '\n');
console.log(`selado ${mes}: ${hash.slice(0, 12)}`);
```

- [ ] **Step 4: Selar os 36 meses fechados**

O mês corrente (2026-07) **não** é selado, ele ainda muda.

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras"
for d in audits/*/; do
  mes=$(basename "$d")
  [ "$mes" = "2026-07" ] && continue
  [ -f "$d/audit.json" ] || continue
  node scripts/selar-mes.mjs "$mes" .
done
node scripts/verificar-selos.mjs .
```

Esperado: uma linha `selado AAAA-MM: <hash>` por mês, e ao final `ok: 36 meses selados, todos integros`.

- [ ] **Step 5: Provar que o selo pega uma mudança**

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras"
cp audits/2026-04/audit.json /tmp/audit-backup.json
node -e "
const f='audits/2026-04/audit.json';
const j=JSON.parse(require('fs').readFileSync(f,'utf8'));
j.__teste_de_selo = true;
require('fs').writeFileSync(f, JSON.stringify(j));
"
node scripts/verificar-selos.mjs .
cp /tmp/audit-backup.json audits/2026-04/audit.json
node scripts/verificar-selos.mjs .
```

Esperado: a primeira verificação sai `QUEBRADO 2026-04` com exit 1. Após restaurar, `ok: 36 meses selados`.

- [ ] **Step 6: Ligar no ciclo mensal**

Em `scripts/ciclo-mensal.ps1`, adicionar a verificação antes da etapa de pipeline:

```powershell
node scripts/verificar-selos.mjs .
if ($LASTEXITCODE -ne 0) {
  Write-Error "Mes fechado mudou. O pipeline nao roda por cima de entrega feita."
  return
}
```

- [ ] **Step 7: Commit**

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras"
git add scripts/selar-mes.mjs scripts/verificar-selos.mjs audits/selos.json scripts/ciclo-mensal.ps1
git commit -m "feat(integridade): sela os 36 meses fechados

Nao ha gabarito para 36 dos 37 meses, mas ha um invariante: mes entregue e
imutavel. Rebuild por cima de mes fechado passa a ser erro que grita, em vez
do silencio que o docs/operacao.md chama de modo de falha mais perigoso.

selos.json guarda so sha256, nao carrega dado.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Rede de caracterização do SPA

O SPA tem zero testes: `tests/validate.js` cobre `platform-parsers.js` e nada mais, nenhuma das 12 páginas. Qualquer mudança de UI é fé. Você já construiu a ferramenta à mão em 16/07 (`diagnosticos/audit-ui-current.py`, `diagnosticos/audit-raw-20260716-183253.json`); esta tarefa a formaliza.

**Files:**
- Create: `E:\Diretorio\Claude\ATLAS\tests\caracterizacao\capturar.mjs`
- Create: `E:\Diretorio\Claude\ATLAS\tests\caracterizacao\comparar.mjs`
- Create: `E:\Diretorio\Claude\ATLAS\tests\caracterizacao\baseline\` (snapshots)
- Reuse: `E:\Diretorio\Claude\ATLAS\diagnosticos\audit-ui-current.py`

- [ ] **Step 1: Ler a ferramenta que já existe**

```bash
cd "E:/Diretorio/Claude/ATLAS"
cat diagnosticos/audit-ui-current.py
head -50 diagnosticos/audit-raw-20260716-183253.json
```

Decidir a partir dela o que capturar. **Números, não DOM**: totais por página, contagem de achados por severidade, PL consolidado, score médio. DOM muda com CSS e gera falso positivo.

- [ ] **Step 2: Escrever o capturador**

Criar `tests/caracterizacao/capturar.mjs` usando Playwright (já instalado no workspace), servindo o app com `npm run serve` na 7821. Meses a capturar: `2023-06`, `2024-06`, `2025-06`, `2026-04`, `2026-06`, e o corrente. Páginas: as 12 de `window.AtlasPages`.

Para cada par mês/página, extrair do DOM só os valores numéricos e gravar em `baseline/<mes>/<pagina>.json` ordenado por chave.

- [ ] **Step 3: Capturar a baseline com o código atual**

```bash
cd "E:/Diretorio/Claude/ATLAS"
npm run serve &
node tests/caracterizacao/capturar.mjs --out tests/caracterizacao/baseline
```

Esperado: 6 meses vezes 12 páginas de arquivos JSON.

- [ ] **Step 4: Provar que o comparador pega uma regressão**

```bash
cd "E:/Diretorio/Claude/ATLAS"
node tests/caracterizacao/capturar.mjs --out /tmp/atual
node tests/caracterizacao/comparar.mjs tests/caracterizacao/baseline /tmp/atual
```

Esperado: `ok: 72 snapshots, diff zero`.

Depois, mudar um número à mão em `/tmp/atual/2026-04/dashboard.json` e rodar de novo. Esperado: FAIL apontando o campo.

- [ ] **Step 5: Commit**

```bash
cd "E:/Diretorio/Claude/ATLAS"
git add tests/caracterizacao/
git commit -m "test(caracterizacao): congela os numeros de 6 meses x 12 paginas

O SPA nao tem teste nenhum: validate.js cobre parsers e mais nada. Sem esta
rede, migrar UI sobre 37 meses de dado ja entregue e fe. Captura numeros, nao
DOM, para nao gerar falso positivo com CSS.

Formaliza o que diagnosticos/audit-ui-current.py fazia a mao.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Deny-by-default antes do primeiro remote

`Morning Call` (produção de `radar-quant-brasil.pages.dev`) e `Trading View` não têm remote git e existem só no disco. `Morning Call` tem 20+ arquivos modificados não commitados; `Trading View` tem componentes inteiros nunca commitados.

**A ordem é contraintuitiva e importa:** `.gitignore` primeiro, remote depois. Empurrar para um remote um repo que nunca teve deny-by-default, contendo `FINNHUB_TOKEN` em `.env` texto plano, é criar o vazamento em vez de evitá-lo.

**Files:**
- Create: `E:\Diretorio\Claude\Morning Call\.gitignore` (a partir de `ATLAS/.gitignore`)
- Create: `E:\Diretorio\Claude\02_AREAS\Operacoes-Recorrentes\Trading View\.gitignore`

- [ ] **Step 1: Inventariar o que entraria no push**

```bash
cd "E:/Diretorio/Claude/Morning Call"
git status --short | head -40
git ls-files | wc -l
find . -name "*.env" -not -path "*/node_modules/*" 2>/dev/null
git ls-files | grep -iE "\.env|secret|token|\.pem|\.key$"
```

Registrar o que aparecer. Repetir para `Trading View`.

- [ ] **Step 2: Confirmar que não há segredo já rastreado**

```bash
cd "E:/Diretorio/Claude/Morning Call"
git log --all --diff-filter=A --name-only --format="" | sort -u | grep -iE "\.env|secret|token|\.pem|\.key$"
```

Esperado: vazio. Se aparecer algo, **pare**: rotacione o segredo e reescreva o histórico antes de criar qualquer remote. É a última janela barata para isso.

- [ ] **Step 3: Copiar o deny-by-default**

```bash
cp "E:/Diretorio/Claude/ATLAS/.gitignore" "E:/Diretorio/Claude/Morning Call/.gitignore"
```

Ajustar a allowlist para a stack (TS, TSX, JSON, MD, TOML, SQL das migrations, Pine). Manter a re-negação de `node_modules/`, `dist/`, `.env`.

- [ ] **Step 4: Verificar que o ignore pega o que deve**

```bash
cd "E:/Diretorio/Claude/Morning Call"
git status --short --ignored | grep "^!!" | head -20
git check-ignore -v "apps/radar-quant/worker/.dev.vars" 2>/dev/null || echo "ATENCAO: .dev.vars NAO ignorado"
git add -A --dry-run 2>&1 | grep -iE "\.env|\.dev\.vars|secret" && echo "ATENCAO: segredo entraria" || echo "ok: nenhum segredo no add"
```

Esperado: `ok: nenhum segredo no add`.

- [ ] **Step 5: Commitar o trabalho perdido**

```bash
cd "E:/Diretorio/Claude/Morning Call"
git add -A
git status --short | head -30
git commit -m "chore: adota .gitignore deny-by-default e commita sessao pendente

Este repo e a producao de radar-quant-brasil.pages.dev e existia so no disco,
sem remote, com uma sessao inteira de UI nao versionada. Ignore antes do
remote: empurrar uma arvore que nunca teve deny-by-default e criar o
vazamento, nao evita-lo.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: Criar o remote privado e empurrar**

```bash
cd "E:/Diretorio/Claude/Morning Call"
gh repo create morning-call --private --source=. --remote=origin
git push -u origin main
gh repo view --json visibility -q .visibility
```

Esperado: `PRIVATE`. Se sair `PUBLIC`, apagar o repo imediatamente.

- [ ] **Step 7: Repetir para Trading View**

Mesmos passos. Antes, decidir o destino de `dashboard/`, que está morto (a produção é `Morning Call/apps/radar-quant/`). Se for arquivar, arquive **depois** do push, para o trabalho não commitado não se perder no caminho.

---

## Task 6: VIX Radar recupera a capacidade de auditar produção

Independente do resto. `.gitignore:73` tem `api/v4.*.js`, então todo bundle nasce invisível ao git e o deploy usa `git add -f`. O drift está em quatro lugares ao mesmo tempo: wrangler aponta `v4.9.163`, o último commit deploya `v4.9.162`, `CLAUDE.md` declara `v4.9.159`, `README` declara `v4.9.143`. Não é dívida técnica, é cegueira: não dá para saber o que está em produção.

**Files:**
- Modify: `E:\Diretorio\Claude\Monitoramento de Credito\.gitignore:73`
- Modify: `E:\Diretorio\Claude\Monitoramento de Credito\CLAUDE.md`, `README.md`
- Modify: `E:\Diretorio\Claude\Monitoramento de Credito\scripts\deploy-worker.ps1`

- [ ] **Step 1: Medir o drift**

```bash
cd "E:/Diretorio/Claude/Monitoramento de Credito"
grep "^main" api/wrangler.toml
git log --oneline -1
grep -oE "v4\.9\.[0-9]+" CLAUDE.md | head -1
grep -oE "v4\.9\.[0-9]+" README.md | head -1
curl -s https://api.vixradar.com | head -c 300
```

O que a API responder é a verdade. Os outros quatro são o que se acredita.

- [ ] **Step 2: Tirar o bundle do ignore**

Em `.gitignore`, remover a linha 73 (`api/v4.*.js`) e registrar:

```gitignore
# api/v4.*.js NAO e ignorado: o bundle e o artefato deployado e precisa ser
# auditavel. Ignorar obrigava `git add -f` no deploy e produziu 8 dias de drift
# entre repo e producao. Se o repo nao sabe o que esta no ar, nao ha auditoria.
```

- [ ] **Step 3: Commitar o bundle em produção e alinhar os quatro pontos**

```bash
cd "E:/Diretorio/Claude/Monitoramento de Credito"
git add .gitignore api/v4.9.163.js api/wrangler.toml
git status --short
```

Atualizar `CLAUDE.md` e `README.md` para a versão que a API respondeu no Step 1.

- [ ] **Step 4: Tirar o `-f` do deploy**

Em `scripts/deploy-worker.ps1`, trocar `git add -f` por `git add`. Ele existia só porque o ignore escondia o bundle.

- [ ] **Step 5: Verificar que repo e produção batem**

```bash
cd "E:/Diretorio/Claude/Monitoramento de Credito"
prod=$(curl -s https://api.vixradar.com | grep -oE "v4\.9\.[0-9]+" | head -1)
repo=$(grep -oE "v4\.9\.[0-9]+" api/wrangler.toml | head -1)
echo "prod: $prod | repo: $repo"
[ "$prod" = "$repo" ] && echo "ok: sem drift" || echo "DRIFT"
```

Esperado: `ok: sem drift`.

- [ ] **Step 6: Commit**

```bash
git commit -m "fix(deploy): bundle sai do .gitignore e o drift morre

api/v4.*.js ignorado obrigava git add -f e escondia do repo o artefato que
esta em producao. Resultado: 4 versoes declaradas em 4 lugares diferentes e
8 dias de drift. Se o repo nao sabe o que esta no ar, nao ha auditoria.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: CORS fail-closed no Radar Quant

`CORS_ORIGINS` faz fallback para `"*"` se a var sumir. Hoje o Worker não tem dado sensível, mas terá se for fundido, e um deploy que perca a var abre tudo em silêncio.

**Files:**
- Modify: `E:\Diretorio\Claude\Morning Call\apps\radar-quant\worker\src\index.ts`

- [ ] **Step 1: Escrever o teste que prova o fail-open**

Em `worker/tests/`, adicionar:

```ts
import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('CORS fail-closed', () => {
  it('sem CORS_ORIGINS, nao ecoa a origem do requisitante', async () => {
    const res = await app.request('/api/health', {
      headers: { Origin: 'https://atacante.example' },
    }, { CORS_ORIGINS: undefined });

    expect(res.headers.get('access-control-allow-origin')).not.toBe('*');
    expect(res.headers.get('access-control-allow-origin')).not.toBe('https://atacante.example');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd "E:/Diretorio/Claude/Morning Call/apps/radar-quant/worker"
npx vitest run tests/cors.test.ts
```

Esperado: FAIL, porque hoje o fallback é `*`.

- [ ] **Step 3: Trocar o fallback por lista vazia**

No middleware de CORS em `src/index.ts`, o fallback de `CORS_ORIGINS` deixa de ser `'*'` e passa a ser `[]`. Sem a var, nenhuma origem é permitida.

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run tests/cors.test.ts
```

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/radar-quant/worker/src/index.ts apps/radar-quant/worker/tests/cors.test.ts
git commit -m "fix(cors): fail-closed quando CORS_ORIGINS sumir

Fallback para '*' significa que um deploy que perca a var abre o Worker para
qualquer origem, em silencio. Sem a var, nenhuma origem passa.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Re-pin do submodule

`core/` está pinado em `7b61e89`, quatro commits atrás. Re-pinar para `500e32d` atravessa `a1b0e13` (`feat!: remove a autenticacao cosmetica`), e a instância tem `index.html` e `worker/src/index.js` modificados no working tree. Meio dia, não cinco minutos.

**Depende de:** Task 1 (mexe no mesmo `worker/src/index.js`) e Task 4 (a rede é o portão).

- [ ] **Step 1: Capturar o estado antes**

```bash
cd "E:/Diretorio/Claude/ATLAS"
node tests/caracterizacao/capturar.mjs --out /tmp/antes-repin
```

- [ ] **Step 2: Ver o que muda**

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras"
git submodule status
cd core && git log --oneline 7b61e89..500e32d && cd ..
git diff HEAD -- index.html worker/src/index.js
```

`a1b0e13` removeu a tela de login do produto. O `index.html` da instância é **gerado** a partir de `core/index.html` por `scripts/gen-index.mjs`, então precisa ser regerado, não editado.

- [ ] **Step 3: Re-pinar e regerar**

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras/core"
git fetch origin && git checkout 500e32d
cd ..
node scripts/gen-index.mjs
node scripts/build-worker-assets.mjs
```

- [ ] **Step 4: Confirmar que nenhum dado real entrou nos assets**

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras"
ls worker/public/
ls worker/public/ | grep -E "platform-data-real|platform-data-audit|platform-historico" && echo "ABORTAR: dado real no diretorio de deploy" || echo "ok: so produto"
```

Esperado: `ok: so produto`. O `build-worker-assets.mjs` tem uma trava para isso; este passo confirma que ela funcionou.

- [ ] **Step 5: Portão, diff zero**

```bash
cd "E:/Diretorio/Claude/ATLAS"
node tests/caracterizacao/capturar.mjs --out /tmp/depois-repin
node tests/caracterizacao/comparar.mjs /tmp/antes-repin /tmp/depois-repin
```

Esperado: `diff zero`. Qualquer diferença aqui é `a1b0e13` ou `500e32d` mudando comportamento, e precisa ser entendida antes de commitar.

- [ ] **Step 6: Commit**

```bash
cd "E:/Diretorio/Claude/verificacao-carteiras"
git add core index.html
git commit -m "chore: re-pin do core para 500e32d

Atravessa a1b0e13 (remove auth cosmetica) e f2d1b02 (allowlist no
build-deploy). index.html regerado por gen-index.mjs, nao editado a mao.
Rede de caracterizacao: diff zero em 6 meses x 12 paginas.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Investigar candidatos de marca

Não é tarefa de código, é decisão que **bloqueia a Fase 1**. O monorepo assa o nome em cada import (`@atlas/audit-core`), e a pesquisa é direta: barato agora, caro depois. Mesma lógica das costuras de tenant.

A pesquisa registra três colisões diretas no exato segmento-alvo: **Eton Solutions AtlasFive** (ERP de family office, EUA), **Holland Mountain ATLAS** (plataforma de dados para alternativos, Europa, e já destino de entrega da Canoe) e **Britech "Atlas PAS"** (Portfolio Accounting System, **Brasil**, mesmo mercado, 400+ clientes, R$ 3 trilhões sob controle).

**Decisão do operador:** investigar candidatos agora. Esta tarefa mapeia o campo e traz uma shortlist com riscos; a escolha final do nome é do operador.

- [ ] **Step 1: Confirmar as colisões nas fontes primárias**

Buscar cada um dos três nos sites oficiais e no INPI. A pesquisa é de 17/07/2026 e cita fontes secundárias; marca exige fonte primária.

- [ ] **Step 2: Checar disponibilidade dos candidatos**

Para cada nome candidato: busca no INPI (classe 9 e 42), domínio `.com.br` e `.com`, escopo npm, handle nas redes, e busca por colisão no nicho de wealth tech internacional.

- [ ] **Step 3: Trazer a shortlist com riscos**

Consolidar 3 a 5 candidatos com o resultado da busca de disponibilidade por candidato (INPI, domínios, npm, colisão no nicho), classificados por risco. Entregar ao operador para a escolha final. A decisão de marca em si é dele; esta tarefa não a toma.

- [ ] **Step 4: Registrar a escolha (após decisão do operador)**

Gravar o nome escolhido e a justificativa em `AI_OPERATING_SYSTEM/` e no `CLAUDE.md` do projeto. Sem isto, a Fase 1 não começa.

- [ ] **Step 5: Corrigir o mapa regulatório interno**

A pesquisa aponta dois erros de briefing que precisam sair da documentação: consultoria é **CVM 19**, não CVM 21 (que é administração de carteira), e DRM/DDR é reporte prudencial do Bacen para **instituição financeira**, não para tesouraria corporativa.

## Execução

Aprovado o plano, executar por **subagente por tarefa** (subagent-driven-development): um subagente fresco por tarefa, revisão entre elas. As tarefas 1, 2, 5, 6, 7 e 9 são independentes e paralelizáveis; 8 depende de 1 e 4. Task 1 (acesso do diretor) segue com **Access service token**, conforme decisão do operador.

---

## Verificação da fase

Portão único, tudo executável:

```bash
# 1. Nenhum hostname fora do Access serve o bucket
curl -s -o /dev/null -w "%{http_code}\n" "https://atlas-instancia.prospects-intel.workers.dev/healthz"   # 404 ou DNS fail
curl -s "https://atlas.szuchmacher.com.br/api/data/2026-06?key=DIRECTOR_KEY_REDIGIDA_ROTACIONAR"          # 401

# 2. Parity roda de verdade, e grita se apontar errado
cd "E:/Diretorio/Claude/ATLAS/audit-engine"
ATLAS_FIXTURES="E:/Diretorio/Claude/verificacao-carteiras" npm test 2>&1 | grep -E "^# (skipped|pass|fail)"   # skipped 0, fail 0
ATLAS_FIXTURES="E:/nao/existe" npm test 2>&1 | grep -c "^# fail 0" || echo "ok: grita"

# 3. Mes fechado e imutavel
cd "E:/Diretorio/Claude/verificacao-carteiras" && node scripts/verificar-selos.mjs .                       # ok: 36 meses

# 4. Rede de caracterizacao congelada
cd "E:/Diretorio/Claude/ATLAS" && ls tests/caracterizacao/baseline/*/*.json | wc -l                        # 72

# 5. Repos de producao com remote privado
cd "E:/Diretorio/Claude/Morning Call" && gh repo view --json visibility -q .visibility                     # PRIVATE

# 6. VIX Radar sem drift
cd "E:/Diretorio/Claude/Monitoramento de Credito" && \
  [ "$(curl -s https://api.vixradar.com | grep -oE 'v4\.9\.[0-9]+' | head -1)" = \
    "$(grep -oE 'v4\.9\.[0-9]+' api/wrangler.toml | head -1)" ] && echo "ok"

# 7. CORS fail-closed
cd "E:/Diretorio/Claude/Morning Call/apps/radar-quant/worker" && npx vitest run

# 8. Working tree limpo nos tres repos
for r in "ATLAS" "verificacao-carteiras" "Monitoramento de Credito"; do
  echo "$r: $(cd "E:/Diretorio/Claude/$r" && git status --short | wc -l) pendencias"
done
```

## Ordem e dependências

Tasks 1, 2, 5, 6, 7 e 9 são independentes e podem correr em paralelo. Task 3 é independente mas se beneficia da 2. Task 4 depende de nada mas é **portão da 8**. Task 8 depende da 1 (mesmo arquivo) e da 4 (é o portão dela).

Ordem sugerida por dano se explorado hoje: **1** (exposição ativa), **5** (dois repos de produção sem cópia), **2**, **3**, **4**, **6**, **7**, **8**, **9**.

Ordem de grandeza: ~2 semanas.
