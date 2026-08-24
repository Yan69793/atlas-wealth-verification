#!/usr/bin/env node
/**
 * gerar-radar-demo.mjs — produz platform-radar-demo.js RODANDO O MOTOR.
 *
 * O payload de demonstração não é digitado à mão. Ele sai de `radarCruzado`
 * sobre uma série sintética construída aqui, e é regravado por este script
 * sempre que o motor mudar.
 *
 * Isso existe por causa de um achado da Onda 2: a severidade de queda de
 * receita estava errada no motor e CERTA no demo, escrito à mão meses antes.
 * Demo e motor divergindo em silêncio é a forma mais barata de vender uma tela
 * que o produto não sabe produzir. Aqui eles não podem divergir.
 *
 * Carteiras e emissores são fictícios, do catálogo demo do produto. Nada de
 * LGPD, nada de dado real, tudo regenerável.
 *
 * Uso: node scripts/gerar-radar-demo.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'audit-engine', 'dist', 'src');
const SAIDA = path.join(ROOT, 'platform-radar-demo.js');

const { radarCruzado } = await import(
  'file://' + path.join(DIST, 'intel', 'cross-portfolio.js')
);
const { THRESHOLDS } = await import('file://' + path.join(DIST, 'snapshot', 'thresholds.js'));

const VAZIO = {
  classeCanonica: null,
  indexador: null,
  taxaContratada: null,
  emissorId: null,
  emissorNome: null,
  moeda: null,
  regiao: null,
  prazoAnos: null,
  liquidezDias: null,
  cobertoFGC: null,
};

const at = (extra = {}) => ({ ...VAZIO, ...extra });

function pos(ativo, valor, atributos, vencimento = null) {
  return { carteira: '', ativo, classe: null, valor, vencimento, quantidade: null, instituicao: null, atributos };
}

function carteira(nome, posicoes) {
  return {
    nome,
    plTotal: posicoes.reduce((a, p) => a + p.valor, 0),
    posicoes: posicoes.map((p) => ({ ...p, carteira: nome })),
  };
}

function snap(data, carteiras) {
  return {
    schema: 'snapshot/v1',
    data,
    periodo: 'diario',
    fonte: 'custodiante-demo',
    geradoEm: '2026-08-24T12:00:00Z',
    engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
    tenantId: 'demo',
    carteiras,
  };
}

/* ── Emissores fictícios ─────────────────────────────────────────────────── */
const zeta = (extra = {}) =>
  at({ emissorId: 'banco-zeta', emissorNome: 'Banco Zeta', moeda: 'BRL', regiao: 'brasil', ...extra });
const omega = (extra = {}) =>
  at({ emissorId: 'banco-omega', emissorNome: 'Banco Omega', moeda: 'BRL', regiao: 'brasil', ...extra });
const gest = (n, extra = {}) =>
  at({ emissorId: `gestora-${n}`, emissorNome: `Gestora ${n}`, moeda: 'BRL', regiao: 'brasil', ...extra });

const rf = { classeCanonica: 'credito-privado', prazoAnos: 2, liquidezDias: 720 };
const cx = { classeCanonica: 'liquidez', indexador: 'CDI', prazoAnos: 0, liquidezDias: 0 };

/**
 * Enchimento: N posições pulverizadas, cada uma de emissor próprio e abaixo de
 * qualquer limiar.
 *
 * Não é decoração. Uma carteira de wealth tem 20 a 60 papéis, e fixture com 4
 * posições faz cada emissor valer 25% do PL, disparando concentração em todas
 * elas. A demo viraria uma parede de alarme que nenhuma carteira real produz,
 * e o assessor aprenderia a ignorar a tela antes de usá-la uma vez.
 */
function pulverizado(prefixo, quantidade, valorCada, base = {}) {
  return Array.from({ length: quantidade }, (_, i) =>
    pos(
      `${prefixo} ${String(i + 1).padStart(2, '0')}`,
      valorCada,
      gest(`${prefixo.toLowerCase().replace(/\s+/g, '-')}-${i}`, { ...rf, indexador: 'CDI', ...base })
    )
  );
}

/* ── ALPHA_01: concentração ESCONDIDA por emissor ────────────────────────────
   Três papéis de nomes diferentes, mesmo banco, somando 24% do PL. Nenhum dos
   três passa de 20% sozinho, então a tela de posições não acusa nada.        */
const alpha01 = (fator = 1) =>
  carteira('ALPHA_01', [
    pos('CDB ZETA 2027', 260_000 * fator, zeta({ ...rf, indexador: 'CDI', taxaContratada: '110% CDI', cobertoFGC: true })),
    pos('LCI ZETA 2028', 250_000 * fator, zeta({ ...rf, indexador: 'CDI', taxaContratada: '96% CDI', cobertoFGC: true })),
    pos('LF ZETA 2029', 250_000 * fator, zeta({ ...rf, indexador: 'IPCA', taxaContratada: 'IPCA+6,2%' })),
    pos('FUNDO DI ALFA', 250_000 * fator, gest('di-alfa', { ...cx })),
    pos('FUNDO MULTI BETA', 240_000 * fator, gest('multi-beta', { classeCanonica: 'multimercado', indexador: 'MULTI', prazoAnos: 0, liquidezDias: 30 })),
    ...pulverizado('DEB ALPHA', 8, 200_000 * fator, { indexador: 'IPCA' }),
    ...pulverizado('CRA ALPHA', 6, 200_000 * fator),
  ]);

/* ── BRAVO_PV: parece diversificada, está inteira no mesmo indexador ─────────
   Quatorze papéis distintos, catorze emissores distintos, nenhum concentrado.
   E 88% do PL respondendo ao CDI.                                            */
const bravoPv = () =>
  carteira('BRAVO_PV', [
    ...pulverizado('CDB BRAVO', 6, 300_000),
    ...pulverizado('DEB BRAVO', 5, 300_000),
    ...pulverizado('CRA BRAVO', 3, 300_000),
    pos('FUNDO DI BRAVO', 400_000, gest('di-bravo', { ...cx })),
    pos('NTN-B BRAVO', 200_000, gest('ntnb-bravo', { classeCanonica: 'renda-fixa', indexador: 'IPCA', prazoAnos: 9, liquidezDias: 1 })),
  ]);

/* ── CEDRO_HLD: liquidez seca e vencimento concentrado ─────────────────────── */
const cedroHld = () =>
  carteira('CEDRO_HLD', [
    pos('CDB OMEGA VENCE SET', 1_800_000, omega({ ...rf, indexador: 'CDI', prazoAnos: 0.05, liquidezDias: 18 }), '2026-09-11'),
    pos('LCA OMEGA VENCE SET', 900_000, omega({ ...rf, indexador: 'CDI', prazoAnos: 0.07, liquidezDias: 25 }), '2026-09-18'),
    ...pulverizado('DEB CEDRO', 10, 400_000, { indexador: 'IPCA', prazoAnos: 6, liquidezDias: 2190 }),
    pos('FII TIJOLO CEDRO', 1_000_000, gest('fii-cedro', { classeCanonica: 'imobiliario', indexador: 'MULTI', prazoAnos: 0, liquidezDias: 3 })),
    pos('CAIXA', 260_000, gest('cx-cedro', { ...cx })),
  ]);

/* ── DUNAS_CAP: risco macro comum com ALPHA_01 e BRAVO_PV (IPCA) ──────────── */
const dunasCap = () =>
  carteira('DUNAS_CAP', [
    ...pulverizado('NTN-B DUNAS', 6, 300_000, { classeCanonica: 'renda-fixa', indexador: 'IPCA', prazoAnos: 9, liquidezDias: 1 }),
    ...pulverizado('DEB IPCA DUNAS', 7, 250_000, { indexador: 'IPCA', prazoAnos: 5 }),
    pos('FUNDO DI DUNAS', 350_000, gest('di-dunas', { ...cx })),
  ]);

/* ── ESTRELA_PV: cobertura BAIXA de propósito ────────────────────────────────
   Prova que o sistema diz "não sei" em vez de dizer zero. Setenta por cento do
   PL em produto que o mapa da instância ainda não classificou.               */
const estrelaPv = () =>
  carteira('ESTRELA_PV', [
    pos('ESTRUTURADO XPTO I', 900_000, at({})),
    pos('ESTRUTURADO XPTO II', 700_000, at({})),
    pos('CARTEIRA ADMINISTRADA', 500_000, at({})),
    pos('COE INDICE', 400_000, at({})),
    ...pulverizado('CDB ESTRELA', 4, 200_000),
    pos('CAIXA', 200_000, gest('cx-estrela', { ...cx })),
  ]);

/* ── FAROL_INV: exposição cambial concentrada, que É alarme ─────────────────
   Ao contrário de BRL e Brasil, que são a linha de base e não viram sinal.   */
const farolInv = () =>
  carteira('FAROL_INV', [
    ...pulverizado('ETF EUA FAROL', 5, 400_000, { classeCanonica: 'internacional', indexador: 'BOLSA', moeda: 'USD', regiao: 'eua', prazoAnos: 0, liquidezDias: 3 }),
    ...pulverizado('BOND USD FAROL', 4, 300_000, { classeCanonica: 'internacional', indexador: 'CAMBIO', moeda: 'USD', regiao: 'eua', prazoAnos: 4, liquidezDias: 5 }),
    ...pulverizado('CDB FAROL', 4, 200_000),
    pos('CAIXA', 300_000, gest('cx-farol', { ...cx })),
  ]);

/* ── Série: base 30 dias antes, referência hoje ───────────────────────────────
   ALPHA_01 encolhe 22% entre as duas datas: é a deterioração mês contra mês. */
const BASE = '2026-07-25';
const REF = '2026-08-24';

const serie = [
  snap(BASE, [alpha01(1.28), bravoPv(), cedroHld(), dunasCap(), estrelaPv(), farolInv()]),
  snap(REF, [alpha01(1), bravoPv(), cedroHld(), dunasCap(), estrelaPv(), farolInv()]),
];

const resultado = radarCruzado(serie);

const payload = {
  sintetico: true,
  schema: 'radar/v1',
  data: REF,
  periodo: 'diario',
  tenantId: 'demo',
  geradoEm: null, // sintético: sem carimbo de produção, igual aos demais demos
  engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
  limiares: {
    coberturaAfirmaMin: THRESHOLDS.coberturaAfirmaMin,
    coberturaRessalvaMin: THRESHOLDS.coberturaRessalvaMin,
    radarConcentracaoAtivoPct: THRESHOLDS.radarConcentracaoAtivoPct,
    radarConcentracaoEmissorPct: THRESHOLDS.radarConcentracaoEmissorPct,
    radarConcentracaoFatorPct: THRESHOLDS.radarConcentracaoFatorPct,
    radarLiquidezMinPct: THRESHOLDS.radarLiquidezMinPct,
    radarVencimentoConcentradoPct: THRESHOLDS.radarVencimentoConcentradoPct,
    radarVencimentoJanelaDias: THRESHOLDS.radarVencimentoJanelaDias,
    radarDeterioracaoPct: THRESHOLDS.radarDeterioracaoPct,
    radarDeterioracaoJanelaDias: THRESHOLDS.radarDeterioracaoJanelaDias,
  },
  motivo: resultado.baseData === null ? 'serie-curta' : null,
  ...resultado,
};

const cabecalho = `/* platform-radar-demo.js — fallback sintetico de window.ATLAS_RADAR_DATA

   GERADO POR scripts/gerar-radar-demo.mjs. Nao editar a mao: rode o script.

   O payload sai do proprio motor (radarCruzado) sobre uma serie sintetica.
   Demo escrito a mao diverge do motor em silencio, e foi assim que a severidade
   da queda de receita ficou certa no demo e errada no motor por meses.

   Mesmo padrao dos demais fallbacks: so roda se o overlay real da instancia
   (platform-radar.js, LGPD, gitignored) ainda nao populou a janela.

   Carteiras, emissores e valores sao ficticios, do catalogo demo do produto.
*/
(function () {
  'use strict';
  if (window.ATLAS_RADAR_DATA) return;
  /* Instancia com dado real: nao popular sintetico. Ver ESTADO/ESTADO-ATUAL.md. */
  if (window._AtlasRealData) return;

  window.ATLAS_RADAR_DATA = `;

fs.writeFileSync(SAIDA, cabecalho + JSON.stringify(payload, null, 2) + ';\n})();\n', 'utf8');

const porTipo = new Map();
for (const i of resultado.insights) porTipo.set(i.tipo, (porTipo.get(i.tipo) ?? 0) + 1);

console.log(`[radar-demo] ${resultado.insights.length} insight(s) em ${resultado.carteiras.length} carteira(s) -> ${path.basename(SAIDA)}`);
for (const [tipo, n] of [...porTipo].sort()) console.log(`  ${tipo}: ${n}`);
console.log(`  base de comparacao: ${resultado.baseData}`);
for (const c of resultado.cobertura) {
  console.log(`  cobertura ${c.carteira}: ${(c.fracaoMedia * 100).toFixed(1)}% (${c.faixaGlobal})`);
}
