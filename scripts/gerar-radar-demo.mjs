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

/* Carteiras, emissores e a serie vem do modulo comum, para o Radar e a tela de
   Eventos & Impacto mostrarem a MESMA casa. Duas copias de fixture divergem
   sozinhas e ninguem percebe. */
const { serieDemo, BASE, REF, cabecalhoDemo } = await import(
  'file://' + path.join(__dirname, 'demo-carteiras.mjs')
);

const serie = serieDemo();

/* Roda DUAS datas de propósito, igual ao demo de crédito. Sem o período
   anterior todo sinal sairia como 'novo' e a tela demonstraria exatamente o
   problema que a Entrega B.2 corrigiu: lista que não distingue o que mudou do
   que já estava lá. */
const [snapBase] = serie;
const resultadoBase = radarCruzado([snapBase]);
const resultado = radarCruzado(serie, { anterior: resultadoBase });

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
    radarVariacaoMaterialPct: THRESHOLDS.radarVariacaoMaterialPct,
  },
  baseEstado: BASE,
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

const porEstado = new Map();
for (const c of resultado.carteiras) {
  for (const s of c.sinais) porEstado.set(s.estado, (porEstado.get(s.estado) ?? 0) + 1);
}
console.log(`  base de estado: ${BASE}`);
for (const [estado, n] of [...porEstado].sort()) console.log(`  estado ${estado}: ${n}`);
console.log(`  encerrados: ${resultado.encerrados.length}`);
for (const c of resultado.cobertura) {
  console.log(`  cobertura ${c.carteira}: ${(c.fracaoMedia * 100).toFixed(1)}% (${c.faixaGlobal})`);
}
