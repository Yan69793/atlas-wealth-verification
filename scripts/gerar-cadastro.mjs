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
 * pendência que existe no escritório.
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
];

const STATUSES = ['Pendente', 'Em Análise', 'Aguardando Cliente', 'Vencido'];

/* Janela de validade, em meses, SÓ onde existe regra de verdade. Comprovante de
   residência vale 6 meses e o perfil (suitability) é reavaliado a cada 24. Os
   demais tipos não têm prazo objetivo: a pendência deles é declarada pelo
   escritório e nunca calculada aqui. Inventar prazo para KYC ou procuração
   produziria "Vencido" que ninguém consegue provar de onde veio. */
const JANELA_MESES = {
  'Comprovante de Residência': 6,
  'Perfil de Investimento': 24,
  'Perfil de Risco': 24,
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

/* ── Validação e normalização ────────────────────────────────────────────── */

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

const erros = [];
const pendencias = [];
let calculados = 0;
let assumidos = 0;

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

  /* Status: declarado manda. Sem declaração, só a janela de validade autoriza
     dizer "Vencido", e só quando existe data. Fora disso a linha cai em
     "Pendente", que é o status neutro: a pendência foi declarada pelo
     escritório e conta no total, mas não engrossa a contagem de vencidas, que é
     a que escala a criticidade da carteira. */
  let status = declarado;
  let statusCalculado = false;
  if (!status) {
    const janela = JANELA_MESES[type];
    const idade = since ? mesesDesde(since) : null;
    if (janela && idade !== null) {
      status = idade >= janela ? 'Vencido' : 'Pendente';
      statusCalculado = true;
      calculados += 1;
    } else {
      status = 'Pendente';
      assumidos += 1;
    }
  }

  const linha = { code, type, status, since: since || null };
  if (typeof r.name === 'string' && r.name.trim()) linha.name = r.name.trim();
  if (typeof r.segment === 'string' && r.segment.trim()) linha.segment = r.segment.trim();
  linha.obs = typeof r.obs === 'string' ? r.obs : '';
  if (statusCalculado) linha.statusCalculado = true;

  pendencias.push(linha);
});

if (erros.length) {
  console.error(`\nABORTADO: ${erros.length} linha(s) inválida(s) em cadastro-pendencias.json.`);
  for (const e of erros) console.error('  ' + e);
  console.error('\n  Nada foi escrito. Gravar só as linhas boas sumiria em silêncio com');
  console.error('  pendência que existe no escritório. Corrija a lista e rode de novo.');
  process.exit(1);
}

/* ── Escrita do overlay ──────────────────────────────────────────────────── */

const payload = {
  schema: 'cadastro/v1',
  geradoEm: hojeISO,
  fonte: 'cadastro-pendencias.json',
  janelasMeses: JANELA_MESES,
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
   Nos demais tipos a pendência é declarada pelo escritório, nunca calculada. */
(function () {
  'use strict';
  window.ATLAS_CADASTRO_DATA = `;

fs.writeFileSync(SAIDA, cabecalho + JSON.stringify(payload, null, 2) + ';\n})();\n', 'utf8');

/* ── Relatório (contagens apenas, LGPD) ──────────────────────────────────── */

const porStatus = {};
for (const s of STATUSES) porStatus[s] = 0;
for (const p of pendencias) porStatus[p.status] += 1;

const carteiras = new Set(pendencias.map((p) => p.code)).size;
const tipos = new Set(pendencias.map((p) => p.type)).size;

console.log(`[cadastro] ${pendencias.length} pendência(s) em ${carteiras} carteira(s), ${tipos} tipo(s) → ${path.basename(SAIDA)}`);
console.log(`  data de referência do cálculo: ${hojeISO}`);
for (const s of STATUSES) console.log(`  ${s.padEnd(20)} ${porStatus[s]}`);
console.log(`  status calculado pela janela de validade: ${calculados}`);
console.log(`  status assumido como Pendente (sem declaração e sem janela ou sem data): ${assumidos}`);
console.log('  códigos e apelidos de carteira ficam fora do log (LGPD).');
