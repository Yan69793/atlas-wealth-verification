/**
 * gerar-dataset-demo.mjs — gera o conjunto sintético do demo para o Worker.
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * Até esta rodada, o conjunto de 40 carteiras do demo era gerado dentro do
 * navegador, por platform-data.js, no carregamento da página. Funcionava
 * enquanto o demo não tinha controle de acesso. Com papéis, deixou de
 * funcionar por um motivo de fundo: não adianta o Worker decidir o que cada
 * perfil pode ver se o dado inteiro já chegou junto com o código. Quem recebe
 * o bundle recebe as 40 carteiras, com ou sem menu.
 *
 * Então o gerador saiu do bundle (vite.config.mjs define __ATLAS_GERAR_DEMO__
 * como false e o ramo morre na minificação) e virou isto aqui: uma etapa de
 * build que roda o MESMO platform-data.js com a flag ligada e serializa o
 * resultado. Mesma fonte, mesmo PRNG, mesmos números. Nada foi reimplementado,
 * porque duas implementações do mesmo gerador divergem no dia em que alguém
 * ajusta uma só.
 *
 * O arquivo gerado NÃO é servido inteiro. O Worker filtra por organização, por
 * atribuição e por projeção de papel antes de responder (demo-worker/src/
 * authz.js e o GET /api/dados). Este módulo é a fonte, não a resposta.
 *
 * Uso:  node scripts/gerar-dataset-demo.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(AQUI, '..');
const FONTE = path.join(ROOT, 'platform-data.js');
const DESTINO = path.join(ROOT, 'demo-worker', 'src', 'dataset.js');

const src = fs.readFileSync(FONTE, 'utf8');

// Sandbox mínima: o módulo é um IIFE clássico que só precisa destes globais.
// Nenhum overlay entra aqui, então nenhum dado real pode vazar para o arquivo
// gerado, mesmo que a instância esteja com overlay no disco.
const janela = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  console,
};

let D;
try {
  new Function('window', 'document', 'localStorage', '__ATLAS_GERAR_DEMO__', src)(
    janela, { addEventListener() {} }, janela.localStorage, true);
  D = janela.AtlasData;
} catch (e) {
  console.error('[dataset] platform-data.js não carregou:', e.message);
  process.exit(1);
}

if (!D || !D._internal || !D._internal.gerouDemo) {
  console.error('[dataset] o gerador não rodou. O dataset sairia vazio e a demo quebraria.');
  process.exit(1);
}

const carteiras = D._internal._portfolioData;
const statusScript = D._internal.STATUS_SCRIPT;
const codes = D.CATALOG.map((p) => p.code);
const compositions = {};
for (const code of codes) {
  for (const month of D.MONTHS) {
    const rows = D.getComposition(code, month);
    if (Array.isArray(rows) && rows.length > 0) compositions[code + '|' + month] = rows;
  }
}
const faltando = codes.filter((c) => !carteiras[c]);
if (faltando.length) {
  console.error('[dataset] sem série para:', faltando.join(', '));
  process.exit(1);
}

// Impede que uma carteira sem nenhum PL no mês de abertura entre no conjunto:
// seria uma carteira que o demo mostra vazia, e o conjunto é lido como material
// comercial.
const idxAbertura = D.MONTHS.indexOf(D.OPENING_MONTH);
const semPl = codes.filter((c) => !(carteiras[c].plArr[idxAbertura] > 0));
if (semPl.length) {
  console.error('[dataset] sem PL no mês de abertura:', semPl.join(', '));
  process.exit(1);
}

const pacote = {
  fonte: 'platform-data.js',
  fonteSha256: crypto.createHash('sha256').update(src).digest('hex').slice(0, 16),
  meses: D.MONTHS,
  mesesLabel: D.MONTH_LABELS,
  cdi: D.CDI,
  ipca: D.IPCA,
  ibov: D.IBOV,
  mesCorrente: D.CURRENT_MONTH,
  mesAbertura: D.OPENING_MONTH,
  catalogo: D.CATALOG.map((p) => ({ code: p.code, name: p.name, risk: p.risk, inception: p.inception, mgr: p.mgr })),
  gestores: D.MANAGERS.map((m) => ({ id: m.id, name: m.name, codes: m.codes.slice(), roaTarget: m.roaTarget })),
  ativos: D.ASSETS,
  statusScript,
  compositions,
  carteiras,
};

const corpo = [
  '/* GERADO POR scripts/gerar-dataset-demo.mjs — NÃO EDITAR À MÃO.',
  ` * Fonte: platform-data.js (sha256 ${pacote.fonteSha256}).`,
  ' * Conjunto SINTÉTICO do demo. Nunca contém dado de cliente.',
  ' * O Worker filtra e projeta antes de responder: este arquivo não sai inteiro.',
  ' */',
  '',
  'export const DATASET = ' + JSON.stringify(pacote) + ';',
  '',
  'export const POOL_DEMO = ' + JSON.stringify(codes) + ';',
  '',
].join('\n');

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, corpo, 'utf8');

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('[dataset] gerado ' + path.relative(ROOT, DESTINO).replace(/\\/g, '/'));
console.log('[dataset] ' + codes.length + ' carteiras, ' + D.MONTHS.length + ' meses, ' + kb(Buffer.byteLength(corpo)) + ', fonte ' + pacote.fonteSha256);
