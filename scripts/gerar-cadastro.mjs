#!/usr/bin/env node
/**
 * gerar-cadastro.mjs — gera platform-cadastro.js (window.ATLAS_CADASTRO_DATA)
 * na raiz da instância, a partir de cadastro-pendencias.json.
 *
 * Por que este gerador existe
 * ---------------------------
 * `AtlasData.registration()` SORTEIA as pendências cadastrais do demo. Numa
 * instância com carteira de cliente na tela, esse número sintético apareceria
 * ao lado de número real. Por isso platform-consolidado.js marca a pendência
 * como ESTIMATIVA fora do modo demonstração e a tira da ordem de criticidade:
 * número inventado que decide posição vira fato aos olhos de quem lê.
 *
 * Este arquivo é a saída da porta contrária. Com platform-cadastro.js presente,
 * `pendenciasOrigem()` devolve fonte 'overlay' com estimadas: false, a marca cai
 * sozinha e a pendência volta a ordenar. O consumidor NÃO muda: continua lendo
 * window.ATLAS_CADASTRO_DATA.pendencias, cada linha com code, type, status,
 * since e obs, mais name e segment opcionais que passam direto.
 *
 * O arquivo de entrada é o ESTADO DO CADASTRO, não uma lista de pendências
 * -----------------------------------------------------------------------
 * Isso importa e é fácil errar. Cada linha descreve um documento da carteira,
 * com a data dele quando existe. Documento em dia sai do resultado, porque não
 * é pendência. Documento vencido, sem data ou com status declarado vira linha
 * do overlay. E documento que o custodiante EXIGE e não aparece na lista sai
 * como pendência por falta. Se a lista fosse só de pendências, ausência
 * significaria "resolvido" e o cálculo por falta produziria ruído.
 *
 * A REGRA QUE NÃO PODE SER RELAXADA
 * ---------------------------------
 * Sem cadastro-pendencias.json, ou com ele vazio, este script NÃO escreve o
 * overlay. Ausência de dado não é ausência de pendência. Escrever um overlay
 * vazio faria a tela dizer "nenhuma pendência cadastral" com a autoridade de
 * dado confirmado, quando a verdade é que ninguém preencheu a lista ainda. Sem
 * o arquivo, o app fica no estado honesto de estimativa marcada, que é pior de
 * ler e certo de confiar.
 *
 * Pela mesma razão, linha inválida ABORTA a geração inteira em vez de ser
 * pulada. Gravar as linhas boas e descartar as ruins em silêncio some com
 * pendência que existe no escritório. E carteira sem custodiante conhecido não
 * recebe cálculo por falta nenhum: sem saber o que é exigido, ausência de
 * documento não prova nada.
 *
 * LGPD
 * ----
 * A saída na tela é só contagem. Código de carteira, apelido e observação nunca
 * são impressos — o log de um gerador acaba colado em ticket. O overlay gerado
 * é dado real: fica fora do git e fora de qualquer publicação, negado por nome
 * em scripts/build-deploy.mjs, scripts/verify-build.mjs, scripts/deploy-cf.ps1,
 * no .gitignore do produto e no .gitignore da instância.
 *
 * Uso:
 *   node scripts/gerar-cadastro.mjs
 *   node scripts/gerar-cadastro.mjs --dir <raiz-da-instancia>
 *   node scripts/gerar-cadastro.mjs --dir <pasta> --hoje 2026-08-26
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* Tipos de documento do escritório. Esta lista é o gêmeo de PENDING_TYPES em
   platform-data.js, que é o conjunto que o demo sintético sorteia. As duas
   precisam dizer a mesma coisa: se divergirem, o filtro "Tipo" da tela de
   Cadastro muda de conteúdo quando a instância troca de dado sintético para
   dado real, e o operador acha que perdeu documento. Mexeu aqui, mexa lá. */
const TIPOS = [
  'Ficha Cadastral',
  'KYC',
  'Perfil de Investimento',
  'Perfil de Risco',
  'Declaração de Investidor Qualificado',
  'Declaração de Investidor Profissional',
  'Comprovante de Residência',
  'Contrato de Gestão',
  'Documento de Identidade',
  'Procuração',
  'Declaração de Beneficiário Final',
  'Declaração de IR',
];

const STATUSES = ['Pendente', 'Em Análise', 'Aguardando Cliente', 'Vencido'];

/* Janela de validade, em meses, SÓ onde existe regra de verdade. Comprovante de
   residência vale 6 meses, o perfil (suitability) é reavaliado a cada 24 e a
   declaração de IR é anual. Os demais tipos não têm prazo objetivo: a pendência
   deles é declarada pelo escritório e nunca calculada aqui. Inventar prazo para
   KYC ou procuração produziria "Vencido" que ninguém consegue provar de onde
   veio. */
const JANELA_MESES = {
  'Comprovante de Residência': 6,
  'Perfil de Investimento': 24,
  'Perfil de Risco': 24,
  'Declaração de IR': 12,
};

/* ─────────────────────────────────────────────────────────────────────────
   CONJUNTO OBRIGATÓRIO POR CUSTODIANTE — PROVISÓRIO, LEIA ANTES DE USAR

   Estes conjuntos NÃO saíram do escritório. São o padrão de abertura de conta
   e suitability que a regulação brasileira desenha (cadastro, identificação,
   comprovação de residência, KYC, perfil de investimento), mais o que cada
   perfil de casa costuma pedir a mais. Servem para o modelo existir e ser
   testável, não para valer como fonte.

   O conjunto REAL de cada custodiante entra pela instância, não por aqui: o
   cadastro-pendencias.json pode trazer um bloco "custodiantes" que SUBSTITUI
   (não soma) o conjunto de quem for declarado ali. É assim que o conjunto do
   escritório vira dado de instância, fora do git, sem ninguém adivinhar nada
   dentro do produto.

   Enquanto o bloco não vier, o overlay carrega `custodiantesProvisorios: true`
   e a tela pode dizer isso. Pendência aberta no ESTADO. */
const CUSTODIANTES_PADRAO = {
  'Mirabaud': [
    'Ficha Cadastral', 'Documento de Identidade', 'Comprovante de Residência',
    'KYC', 'Perfil de Investimento', 'Perfil de Risco', 'Contrato de Gestão',
    'Procuração', 'Declaração de Beneficiário Final',
    'Declaração de Investidor Qualificado', 'Declaração de IR',
  ],
  'BTG': [
    'Ficha Cadastral', 'Documento de Identidade', 'Comprovante de Residência',
    'KYC', 'Perfil de Investimento', 'Perfil de Risco', 'Contrato de Gestão',
    'Declaração de Investidor Qualificado',
  ],
  'Bradesco Private': [
    'Ficha Cadastral', 'Documento de Identidade', 'Comprovante de Residência',
    'KYC', 'Perfil de Investimento', 'Perfil de Risco', 'Contrato de Gestão',
    'Procuração', 'Declaração de Beneficiário Final', 'Declaração de IR',
  ],
  'Órama': [
    'Ficha Cadastral', 'Documento de Identidade', 'Comprovante de Residência',
    'KYC', 'Perfil de Investimento', 'Contrato de Gestão',
  ],
};

/* ── Argumentos ──────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
function arg(nome, padrao) {
  const i = argv.indexOf(nome);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : padrao;
}

const DIR = path.resolve(ROOT, arg('--dir', 'verificacao-carteiras'));
const FONTE = path.join(DIR, 'cadastro-pendencias.json');
const SAIDA = path.join(DIR, 'platform-cadastro.js');

if (!fs.existsSync(DIR) || !fs.statSync(DIR).isDirectory()) {
  console.error(`Raiz da instância não encontrada: ${DIR}`);
  console.error('  Passe o caminho com --dir <raiz-da-instancia>.');
  process.exit(1);
}

/* Data de referência do cálculo de validade. Existe como parâmetro para o
   exemplo de docs/ produzir sempre o mesmo resultado, e não para maquiar
   vencimento: em produção roda sem --hoje. */
const hojeArg = arg('--hoje', null);
if (hojeArg && !/^\d{4}-\d{2}-\d{2}$/.test(hojeArg)) {
  console.error(`--hoje precisa ser YYYY-MM-DD, recebido: ${hojeArg}`);
  process.exit(1);
}
const hojeISO = hojeArg || new Date().toISOString().slice(0, 10);
const HOJE = {
  ano: Number(hojeISO.slice(0, 4)),
  mes: Number(hojeISO.slice(5, 7)),
  dia: Number(hojeISO.slice(8, 10)),
};

/* ── Ausência de arquivo: estado honesto, não erro ───────────────────────── */

function semLista(motivo) {
  console.log(`[cadastro] ${motivo}`);
  console.log('  Nada foi gerado, de propósito: ausência de dado não é ausência de pendência.');
  console.log('  O app continua marcando a pendência cadastral como ESTIMATIVA e a mantém');
  console.log('  fora da ordem de criticidade, que é o estado correto enquanto o cadastro');
  console.log('  real não existir neste ambiente.');
  if (fs.existsSync(SAIDA)) {
    console.log('');
    console.log('  ATENÇÃO: já existe um platform-cadastro.js na raiz da instância, de uma');
    console.log('  geração anterior. Ele NÃO foi tocado. Se a lista foi esvaziada de');
    console.log('  propósito, apague o overlay à mão — enquanto ele estiver lá, o app lê');
    console.log('  o cadastro antigo como se fosse o de hoje.');
  }
  process.exit(0);
}

if (!fs.existsSync(FONTE)) semLista(`cadastro-pendencias.json ausente em ${DIR}.`);

let bruto;
try {
  bruto = JSON.parse(fs.readFileSync(FONTE, 'utf8'));
} catch (err) {
  console.error(`cadastro-pendencias.json ilegível: ${err.message}`);
  process.exit(1);
}

/* Aceita a lista nua ou embrulhada em { pendencias: [...] }. */
const linhas = Array.isArray(bruto)
  ? bruto
  : (Array.isArray(bruto?.pendencias) ? bruto.pendencias : null);

if (!linhas) {
  console.error('cadastro-pendencias.json precisa ser um array, ou um objeto com a chave "pendencias".');
  process.exit(1);
}
if (linhas.length === 0) semLista('cadastro-pendencias.json está vazio.');

const erros = [];

/* ── Conjunto obrigatório: padrão do produto, sobrescrito pela instância ─── */

const CUSTODIANTES = {};
for (const [nome, tipos] of Object.entries(CUSTODIANTES_PADRAO)) CUSTODIANTES[nome] = tipos.slice();

const blocoCust = (!Array.isArray(bruto) && bruto?.custodiantes) || null;
let custodiantesProvisorios = true;
if (blocoCust) {
  if (typeof blocoCust !== 'object' || Array.isArray(blocoCust)) {
    erros.push('bloco "custodiantes": precisa ser um objeto de custodiante para lista de tipos.');
  } else {
    for (const [nome, tipos] of Object.entries(blocoCust)) {
      if (!Array.isArray(tipos) || tipos.length === 0) {
        erros.push(`custodiante "${nome}": precisa ser uma lista não vazia de tipos.`);
        continue;
      }
      const fora = tipos.filter((t) => !TIPOS.includes(t));
      if (fora.length) {
        erros.push(`custodiante "${nome}": tipo fora da lista do escritório — ${fora.join(', ')}.`);
        continue;
      }
      // SUBSTITUI, não soma: o conjunto do escritório é exatamente o declarado.
      CUSTODIANTES[nome] = tipos.slice();
    }
    custodiantesProvisorios = false;
  }
}

/* ── Custodiante de cada carteira ────────────────────────────────────────── */

/* Ordem de precedência, da mais explícita para a mais derivada:
     1. campo "custodiante" na própria linha
     2. mapa "carteiras" no topo do arquivo
     3. composição do platform-data-real.js, instituição de maior saldo
   Sem nenhuma das três, a carteira fica sem conjunto obrigatório e não recebe
   cálculo por falta. Chutar o custodiante inventaria exigência. */
function custodiantesDaBase() {
  const fonte = path.join(DIR, 'platform-data-real.js');
  if (!fs.existsSync(fonte)) return { mapa: {}, motivo: 'platform-data-real.js ausente' };
  const sandbox = { window: {} };
  try {
    new Function('window', fs.readFileSync(fonte, 'utf8'))(sandbox.window);
  } catch (err) {
    return { mapa: {}, motivo: 'platform-data-real.js ilegível: ' + err.message };
  }
  const real = sandbox.window._AtlasRealData || {};
  const mapa = {};

  // Forma A: a carteira já declara a instituição custodiante.
  for (const p of (Array.isArray(real.portfolios) ? real.portfolios : [])) {
    const code = typeof p?.code === 'string' ? p.code.trim() : '';
    const inst = (typeof p?.custodiante === 'string' && p.custodiante.trim())
      || (typeof p?.institution === 'string' && p.institution.trim()) || '';
    if (code && inst) mapa[code] = inst;
  }

  // Forma B: composição por carteira; custodiante é a instituição com o maior
  // saldo. Carteira dividida entre duas casas cai na de maior peso, e isso vai
  // declarado no overlay para quem ler poder discordar.
  const comps = real.compositions || real.composicoes || null;
  if (comps && typeof comps === 'object') {
    for (const [chave, linhasComp] of Object.entries(comps)) {
      if (!Array.isArray(linhasComp)) continue;
      const code = String(chave).split('|')[0].trim();
      if (!code || mapa[code]) continue;
      const soma = {};
      for (const l of linhasComp) {
        const inst = typeof l?.institution === 'string' ? l.institution.trim() : '';
        const v = typeof l?.saldoFinal === 'number' && isFinite(l.saldoFinal) ? l.saldoFinal : 0;
        if (inst) soma[inst] = (soma[inst] || 0) + v;
      }
      const top = Object.entries(soma).sort((a, b) => b[1] - a[1])[0];
      if (top) mapa[code] = top[0];
    }
  }
  return { mapa, motivo: Object.keys(mapa).length ? null : 'sem carteira com instituição legível' };
}

const mapaDeclarado = (!Array.isArray(bruto) && bruto?.carteiras) || {};
if (mapaDeclarado && (typeof mapaDeclarado !== 'object' || Array.isArray(mapaDeclarado))) {
  erros.push('bloco "carteiras": precisa ser um objeto de código de carteira para custodiante.');
}
const derivados = custodiantesDaBase();

/* ── Validação e normalização das linhas ─────────────────────────────────── */

function parseData(v) {
  if (typeof v !== 'string') return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return { ano: +m[1], mes: +m[2], dia: +m[3] };
  m = /^(\d{4})-(\d{2})$/.exec(v);
  if (m) return { ano: +m[1], mes: +m[2], dia: null };
  return null;
}

/* Meses inteiros decorridos. Com dia nos dois lados, o mês só conta quando a
   data do mês já passou; com granularidade de mês, conta o mês cheio. */
function mesesDesde(since) {
  const s = parseData(since);
  if (!s) return null;
  let m = (HOJE.ano - s.ano) * 12 + (HOJE.mes - s.mes);
  if (s.dia && HOJE.dia < s.dia) m -= 1;
  return m;
}

const pendencias = [];
const porCarteira = new Map();   // code -> { custodiante, tipos:Set, name, segment }
let calculados = 0;
let declarados = 0;
let emDia = 0;

linhas.forEach((r, i) => {
  const ref = `linha #${i + 1}`;              // índice, nunca o código (LGPD)

  if (!r || typeof r !== 'object' || Array.isArray(r)) {
    erros.push(`${ref}: não é um objeto.`);
    return;
  }

  const code = typeof r.code === 'string' ? r.code.trim() : '';
  if (!code) { erros.push(`${ref}: campo "code" obrigatório e não vazio.`); return; }

  const type = typeof r.type === 'string' ? r.type.trim() : '';
  if (!TIPOS.includes(type)) {
    erros.push(`${ref}: tipo "${type || '(vazio)'}" fora da lista de tipos do escritório.`);
    return;
  }

  const since = typeof r.since === 'string' ? r.since.trim() : '';
  if (since && !parseData(since)) {
    erros.push(`${ref}: "since" precisa ser YYYY-MM ou YYYY-MM-DD, recebido "${since}".`);
    return;
  }

  const declarado = typeof r.status === 'string' ? r.status.trim() : '';
  if (declarado && !STATUSES.includes(declarado)) {
    erros.push(`${ref}: status "${declarado}" fora de ${STATUSES.join(', ')}.`);
    return;
  }

  const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim() : null;
  const segment = typeof r.segment === 'string' && r.segment.trim() ? r.segment.trim() : null;
  const custLinha = typeof r.custodiante === 'string' && r.custodiante.trim() ? r.custodiante.trim() : null;

  if (!porCarteira.has(code)) porCarteira.set(code, { custodiante: null, tipos: new Set(), name: null, segment: null });
  const carteira = porCarteira.get(code);
  carteira.tipos.add(type);
  if (name && !carteira.name) carteira.name = name;
  if (segment && !carteira.segment) carteira.segment = segment;
  if (custLinha && !carteira.custodiante) carteira.custodiante = custLinha;

  /* Status. Declarado manda sempre. Sem declaração, só a janela de validade
     autoriza dizer "Vencido", e só quando existe data. Documento com data
     dentro da janela, ou com data e sem janela, está EM DIA e sai do
     resultado: não é pendência, e listar como pendência o que está resolvido
     é tão errado quanto esconder o que não está. */
  if (declarado) {
    declarados += 1;
    pendencias.push(linhaSaida(code, type, declarado, since, r.obs, name, segment, {}));
    return;
  }

  const janela = JANELA_MESES[type];
  const idade = since ? mesesDesde(since) : null;

  if (janela && idade !== null) {
    if (idade >= janela) {
      calculados += 1;
      pendencias.push(linhaSaida(code, type, 'Vencido', since, r.obs, name, segment, {
        statusCalculado: true,
        idadeMeses: idade,
        janelaMeses: janela,
      }));
    } else {
      emDia += 1;
    }
    return;
  }

  if (since) { emDia += 1; return; }   // documento na mão, sem prazo objetivo

  // Sem status e sem data: declarado na lista, sem evidência do documento.
  declarados += 1;
  pendencias.push(linhaSaida(code, type, 'Pendente', since, r.obs, name, segment, {}));
});

function linhaSaida(code, type, status, since, obs, name, segment, extra) {
  const l = { code, type, status, since: since || null };
  if (name) l.name = name;
  if (segment) l.segment = segment;
  l.obs = typeof obs === 'string' ? obs : '';
  return Object.assign(l, extra);
}

/* ── Pendência por falta: exigido pelo custodiante e ausente da lista ────── */

const semCustodiante = [];
const custodianteDesconhecido = new Set();
let porFalta = 0;
let completas = 0;

for (const [code, carteira] of porCarteira) {
  const cust = carteira.custodiante
    || (typeof mapaDeclarado[code] === 'string' ? mapaDeclarado[code].trim() : null)
    || derivados.mapa[code]
    || null;

  if (!cust) { semCustodiante.push(code); continue; }
  carteira.custodiante = cust;

  const exigidos = CUSTODIANTES[cust];
  if (!exigidos) { custodianteDesconhecido.add(cust); continue; }

  const faltando = exigidos.filter((t) => !carteira.tipos.has(t));
  if (!faltando.length) {
    // Todo exigido está na lista. Se além disso nada dela virou pendência, a
    // carteira está com cadastro completo.
    if (!pendencias.some((p) => p.code === code)) completas += 1;
    continue;
  }
  for (const type of faltando) {
    porFalta += 1;
    pendencias.push(linhaSaida(code, type, 'Pendente', null, '', carteira.name, carteira.segment, {
      porFalta: true,
      custodiante: cust,
      obs: `Documento exigido por ${cust} e ausente na lista de cadastro.`,
    }));
  }
}

if (erros.length) {
  console.error(`\nABORTADO: ${erros.length} problema(s) em cadastro-pendencias.json.`);
  for (const e of erros) console.error('  ' + e);
  console.error('\n  Nada foi escrito. Gravar só as linhas boas sumiria em silêncio com');
  console.error('  pendência que existe no escritório. Corrija a lista e rode de novo.');
  process.exit(1);
}

/* ── Escrita do overlay ──────────────────────────────────────────────────── */

const custodianteDaCarteira = {};
for (const [code, c] of porCarteira) if (c.custodiante) custodianteDaCarteira[code] = c.custodiante;

const payload = {
  schema: 'cadastro/v2',
  geradoEm: hojeISO,
  fonte: 'cadastro-pendencias.json',
  janelasMeses: JANELA_MESES,
  custodiantes: CUSTODIANTES,
  custodiantesProvisorios,
  custodianteDaCarteira,
  pendencias,
};

const cabecalho = `/* platform-cadastro.js — GERADO por scripts/gerar-cadastro.mjs em ${hojeISO}.
   Não editar à mão: a próxima geração sobrescreve.

   DADO REAL DE CADASTRO DA INSTÂNCIA (LGPD). Fora do git, nunca publicado.
   Script clássico de runtime, injetado no index pelo gen-index.mjs da
   instância. Nunca entra no bundle do produto.

   Consumido por platform-consolidado.js (window.ATLAS_CADASTRO_DATA.pendencias).
   Com este arquivo presente, a pendência cadastral deixa de ser estimativa e
   volta a ordenar a criticidade das carteiras.

   "Vencido" calculado só onde existe janela de validade real:
   ${Object.entries(JANELA_MESES).map(([t, m]) => `${t} ${m} meses`).join(', ')}.
   Nos demais tipos a pendência é declarada pelo escritório, nunca calculada.

   Conjunto obrigatório por custodiante: ${custodiantesProvisorios
    ? 'PROVISÓRIO, padrão do produto. O conjunto real do escritório entra pelo\n   bloco "custodiantes" do cadastro-pendencias.json e substitui este.'
    : 'declarado pela instância no bloco "custodiantes".'} */
(function () {
  'use strict';
  window.ATLAS_CADASTRO_DATA = `;

fs.writeFileSync(SAIDA, cabecalho + JSON.stringify(payload, null, 2) + ';\n})();\n', 'utf8');

/* ── Relatório (contagens apenas, LGPD) ──────────────────────────────────── */

const porStatus = {};
for (const s of STATUSES) porStatus[s] = 0;
for (const p of pendencias) porStatus[p.status] += 1;

const carteiras = new Set(pendencias.map((p) => p.code)).size;

console.log(`[cadastro] ${pendencias.length} pendência(s) em ${carteiras} carteira(s) → ${path.basename(SAIDA)}`);
console.log(`  data de referência do cálculo: ${hojeISO}`);
for (const s of STATUSES) console.log(`  ${s.padEnd(20)} ${porStatus[s]}`);
console.log('');
console.log(`  status declarado na lista:            ${declarados}`);
console.log(`  Vencido calculado pela janela:        ${calculados}`);
console.log(`  Pendente por falta no custodiante:    ${porFalta}`);
console.log(`  documentos em dia, fora do resultado: ${emDia}`);
console.log(`  carteiras na lista:                   ${porCarteira.size}`);
console.log(`  carteiras com cadastro completo:      ${completas}`);
console.log(`  conjunto por custodiante:             ${custodiantesProvisorios ? 'PROVISÓRIO (padrão do produto)' : 'declarado pela instância'}`);
if (semCustodiante.length) {
  console.log('');
  console.log(`  ${semCustodiante.length} carteira(s) sem custodiante conhecido: nenhuma pendência por falta`);
  console.log(`  foi calculada para elas. Sem saber o que o custodiante exige, ausência de`);
  console.log(`  documento não prova nada. Declare em "carteiras" ou no campo "custodiante".`);
  if (derivados.motivo) console.log(`  (derivação pela composição indisponível: ${derivados.motivo})`);
}
if (custodianteDesconhecido.size) {
  console.log('');
  console.log(`  custodiante(s) sem conjunto cadastrado: ${[...custodianteDesconhecido].join(', ')}`);
  console.log('  Declare o conjunto deles no bloco "custodiantes" do arquivo de entrada.');
}
console.log('');
console.log('  códigos e apelidos de carteira ficam fora do log (LGPD).');
