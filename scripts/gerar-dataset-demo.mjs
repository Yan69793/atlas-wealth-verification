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
 * OS SEIS CONJUNTOS AUXILIARES ENTRAM AQUI TAMBÉM
 * -----------------------------------------------
 * Auditoria de 2026-09-10: os seis overlays sintéticos (oportunidades,
 * vencimentos, caixa parado, receita drop, radar e crédito) continuavam
 * importados pelo src/main.jsx e viajavam inteiros no bundle, cada um com
 * registro por carteira de códigos fora do que o /api/dados entrega. O menu do
 * gestor mantinha as telas de Radar, Oportunidades, Vencimentos e Caixa parado,
 * e nelas ele via carteira que o escopo dele recusou. A premissa "o bundle não
 * tem carteira nenhuma" era falsa para esses seis.
 *
 * Agora eles são lidos da MESMA fonte sintética, serializados aqui, e servidos
 * pelo Worker com o mesmo corte por papel. Os arquivos `-demo.js` do produto
 * ficam só com a casca (global vazio, mesma forma), e quem preenche é o
 * `hidratarDoServidor()`.
 *
 * Uso:  node scripts/gerar-dataset-demo.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { sigla, siglaCliente } from '../platform-sigla.js';

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
  // A MESMA função de sigla do navegador e do Worker. Sem isto, a camada de
  // dados não teria como reduzir o nome do cliente à sigla e cairia no
  // fallback do código, apagando os nomes do conjunto gerado.
  AtlasSigla: { sigla, siglaCliente },
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

/* ------------------------------------------------------- auxiliares do demo
 *
 * Cada overlay é um IIFE que escreve uma global na janela e sai cedo se
 * `window._AtlasRealData` existir. A janela da sandbox é nova e não tem essa
 * marca, então a marca sintética é sempre a do demo, nunca a da instância.
 * A lista de códigos encontrada em cada um é conferida contra o catálogo logo
 * abaixo: um código que não existe no conjunto vira registro órfão no payload,
 * que nenhum filtro de papel alcança.
 */
const AUXILIARES = [
  { chave: 'oportunidades', arquivo: 'platform-oportunidades-demo.js', global: 'ATLAS_OPORTUNIDADES_DATA', lista: 'oportunidades', campo: 'cliente' },
  { chave: 'vencimentos', arquivo: 'platform-vencimentos-demo.js', global: 'ATLAS_VENCIMENTOS_DATA', lista: 'vencimentos', campo: 'carteira' },
  { chave: 'caixaParado', arquivo: 'platform-caixa-parado-demo.js', global: 'ATLAS_CAIXA_PARADO_DATA', lista: 'itens', campo: 'carteira' },
  { chave: 'receitaDrop', arquivo: 'platform-receita-drop-demo.js', global: 'ATLAS_RECEITA_DROP_DATA', lista: 'itens', campo: 'carteira' },
  { chave: 'radar', arquivo: 'platform-radar-demo.js', global: 'ATLAS_RADAR_DATA', lista: 'carteiras', campo: 'carteira' },
  { chave: 'credito', arquivo: 'platform-credito-demo.js', global: 'ATLAS_CREDITO_DATA', lista: 'impactos', campo: 'carteira' },
];

const auxiliares = {};
for (const a of AUXILIARES) {
  const caminho = path.join(ROOT, a.arquivo);
  const fonte = fs.readFileSync(caminho, 'utf8');
  const janelaAux = {
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    console,
  };
  try {
    new Function('window', 'document', 'localStorage', fonte)(
      janelaAux, { addEventListener() {} }, janelaAux.localStorage);
  } catch (e) {
    console.error('[dataset] ' + a.arquivo + ' não carregou: ' + e.message);
    process.exit(1);
  }
  const valor = janelaAux[a.global];
  if (!valor || !Array.isArray(valor[a.lista])) {
    console.error('[dataset] ' + a.arquivo + ' não produziu ' + a.global + '.' + a.lista);
    process.exit(1);
  }
  // Lista vazia não é caso normal, é sintoma: a fonte virou casca e o gerador
  // estaria apagando o conjunto auxiliar do arquivo gerado, em silêncio. Foi
  // exatamente o que aconteceu em 2026-09-10, quando os `platform-*-demo.js`
  // foram reduzidos a casca e continuaram sendo a entrada deste gerador.
  if (valor[a.lista].length === 0) {
    console.error('[dataset] ' + a.arquivo + ' produziu ' + a.lista + ' VAZIO. Gerar agora apagaria '
      + 'o conjunto auxiliar. Conserte a fonte antes de rodar de novo.');
    process.exit(1);
  }
  const orfaos = [];
  for (const linha of valor[a.lista]) {
    const code = linha && linha[a.campo];
    if (typeof code === 'string' && codes.indexOf(code) < 0) orfaos.push(code);
  }
  if (orfaos.length) {
    console.error('[dataset] ' + a.arquivo + ' aponta carteira fora do catálogo: ' + orfaos.join(', '));
    process.exit(1);
  }
  auxiliares[a.chave] = valor;
}

const pacote = {
  fonte: 'platform-data.js',
  fonteSha256: crypto.createHash('sha256').update(src).digest('hex').slice(0, 16),
  // Soma das seis fontes auxiliares, para o mesmo teste de deriva do dataset.
  auxiliaresSha256: crypto.createHash('sha256')
    .update(AUXILIARES.map((a) => fs.readFileSync(path.join(ROOT, a.arquivo), 'utf8')).join('\n')).digest('hex').slice(0, 16),
  meses: D.MONTHS,
  mesesLabel: D.MONTH_LABELS,
  cdi: D.CDI,
  ipca: D.IPCA,
  ibov: D.IBOV,
  mesCorrente: D.CURRENT_MONTH,
  mesAbertura: D.OPENING_MONTH,
  // `nomeInterno` é o nome do cliente por extenso: fica SÓ no conjunto do
  // Worker e nunca sai numa resposta. A interface recebe a sigla, calculada
  // em authz.js com a mesma função de platform-sigla.js.
  catalogo: D.CATALOG.map((p) => ({ code: p.code, name: p.nomeInterno || p.name, risk: p.risk, inception: p.inception, mgr: p.mgr })),
  gestores: D.MANAGERS.map((m) => ({ id: m.id, name: m.name, codes: m.codes.slice(), roaTarget: m.roaTarget })),
  ativos: D.ASSETS,
  statusScript,
  compositions,
  carteiras,
  auxiliares,
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
