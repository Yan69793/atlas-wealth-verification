#!/usr/bin/env node
/**
 * gerar-credito-demo.mjs — produz platform-credito-demo.js RODANDO O MOTOR.
 *
 * Mesma disciplina do gerador do radar: o payload não é digitado à mão, sai de
 * `impactoDeCredito` sobre a mesma casa sintética que o radar usa
 * (scripts/demo-carteiras.mjs). As duas telas contam a mesma história porque
 * leem as mesmas carteiras.
 *
 * Roda DUAS datas de propósito. Sem o período anterior todo par sairia como
 * "novo" e os cinco estados não teriam como aparecer na tela.
 *
 * Eventos e emissores são inventados. Qualquer semelhança com instituição real
 * é coincidência, e nenhum deles saiu de fonte de mercado.
 *
 * Uso: node scripts/gerar-credito-demo.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'audit-engine', 'dist', 'src');
const SAIDA = path.join(ROOT, 'platform-credito-demo.js');

const { impactoDeCredito } = await import('file://' + path.join(DIST, 'intel', 'credit-events.js'));
const { THRESHOLDS } = await import('file://' + path.join(DIST, 'snapshot', 'thresholds.js'));
const { serieDemo, BASE, REF, cabecalhoDemo } = await import(
  'file://' + path.join(__dirname, 'demo-carteiras.mjs')
);

const FONTE = 'radar-de-credito-ficticio';
const ev = (issuer, event, severity, date, confidence) => ({
  issuer,
  event,
  severity,
  date,
  source: FONTE,
  confidence,
});

/* ── Período anterior ──────────────────────────────────────────────────────
   Três eventos. O do atraso de pagamento some no período seguinte, e é ele que
   vira 'encerrado'.                                                          */
const EVENTOS_BASE = [
  ev('Banco Zeta S.A.', 'noticia negativa na imprensa', 'baixa', BASE, 0.5),
  ev('Banco Omega S.A.', 'downgrade de rating pela agencia', 'media', BASE, 0.85),
  ev('Gestora di-alfa', 'atraso de pagamento de juros', 'media', BASE, 0.7),
  ev('Gestora multi-beta', 'covenant quebrado', 'media', BASE, 0.75),
];

/* ── Período de referência ─────────────────────────────────────────────────
   Cada linha existe para provar uma regra:                                   */
const EVENTOS_REF = [
  // AGRAVADO pela severidade, mesmo com a posição encolhendo 22%. É o caso que
  // mostra por que a severidade manda sobre a exposição no julgamento do
  // estado: o risco piorou embora o cliente tenha menos dinheiro ali.
  ev('Banco Zeta S.A.', 'noticia negativa na imprensa', 'alta', REF, 0.6),

  // NOVO, e é o evento de crédito crítico que faltava na Entrega A.
  ev('Banco Zeta S.A.', 'default confirmado', 'alta', REF, 0.95),

  // ACOMPANHAMENTO: nada mudou desde o período anterior.
  ev('Banco Omega S.A.', 'downgrade de rating pela agencia', 'media', REF, 0.85),

  // MELHORADO: mesma severidade, mas a carteira encolheu 22% e a exposição
  // caiu junto. É o contraponto do caso de cima, e mostra que exposição sozinha
  // move o estado quando a severidade não muda.
  ev('Gestora multi-beta', 'covenant quebrado', 'media', REF, 0.75),

  // Perda confirmada ABAIXO de 2% do PL mas acima do piso em reais: R$ 60 mil
  // em DUNAS_CAP é 1,5% do patrimônio e mesmo assim vira impacto médio.
  ev('Metalurgica Aurora', 'pedido de recuperacao judicial', 'alta', REF, 0.9),

  // Emissor que NINGUÉM carrega: prova que a tela distingue "ninguém exposto"
  // de "nada apurado".
  ev('Banco Que Ninguem Carrega', 'downgrade de rating', 'media', REF, 0.8),

  // Fonte fraca sobre carteira 100% coberta: a confiança do insight NÃO sobe.
  ev('Gestora di-bravo', 'noticia negativa', 'media', REF, 0.2),

  // Registro imprestável: sem emissor. Entra na contagem de descartados em vez
  // de virar linha órfã apontando para carteira nenhuma.
  ev('   ', 'default', 'alta', REF, 0.9),
];

const [snapBase, snapRef] = serieDemo();

const anterior = impactoDeCredito(snapBase, EVENTOS_BASE);
const resultado = impactoDeCredito(snapRef, EVENTOS_REF, { anterior });

const payload = {
  sintetico: true,
  schema: 'credito/v1',
  data: REF,
  periodo: 'diario',
  tenantId: 'demo',
  geradoEm: null, // sintético: sem carimbo de produção, igual aos demais demos
  engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
  baseData: BASE,
  fonteEventos: FONTE,
  limiares: {
    creditoPerdaConfirmada: THRESHOLDS.creditoPerdaConfirmada,
    creditoPerdaConfirmadaMinAbs: THRESHOLDS.creditoPerdaConfirmadaMinAbs,
    creditoPisoExposicao: THRESHOLDS.creditoPisoExposicao,
    creditoVariacaoMaterialPct: THRESHOLDS.creditoVariacaoMaterialPct,
    coberturaAfirmaMin: THRESHOLDS.coberturaAfirmaMin,
    coberturaRessalvaMin: THRESHOLDS.coberturaRessalvaMin,
    severidade: THRESHOLDS.severidade,
  },
  ...resultado,
};

const cabecalho = cabecalhoDemo(
  'platform-credito-demo.js',
  'ATLAS_CREDITO_DATA',
  'scripts/gerar-credito-demo.mjs',
  'Eventos de credito ficticios cruzados com as carteiras da casa sintetica.\n   Roda duas datas para os cinco estados (novo, acompanhamento, agravado,\n   melhorado, encerrado) aparecerem na tela.'
);

fs.writeFileSync(SAIDA, cabecalho + JSON.stringify(payload, null, 2) + ';\n})();\n', 'utf8');

/* ── Relatório: o que o demo prova ─────────────────────────────────────────── */
const pares = resultado.impactos.flatMap((i) => i.atingidas.map((a) => ({ i, a })));
const porEstado = new Map();
for (const { a } of pares) porEstado.set(a.estado, (porEstado.get(a.estado) ?? 0) + 1);

console.log(
  `[credito-demo] ${resultado.impactos.length} evento(s), ${pares.length} par(es), ` +
    `${resultado.encerrados.length} encerrado(s), ${resultado.descartados} descartado(s) -> ${path.basename(SAIDA)}`
);
console.log(`  base ${BASE} -> referencia ${REF}`);
console.log(`  carteiras avaliaveis: ${resultado.carteirasAvaliaveis}/${resultado.carteiras}`);
for (const [estado, n] of [...porEstado].sort()) console.log(`  estado ${estado}: ${n}`);
console.log('');
for (const { i, a } of pares) {
  console.log(
    `  [${a.estado.padEnd(14)}] ${i.evento.emissorNome.padEnd(24)} ${i.evento.tipo.padEnd(21)} ` +
      `${a.carteira.padEnd(11)} ${(a.fracaoPl * 100).toFixed(1).padStart(5)}% impacto ${a.severidadeImpacto.padEnd(5)} confianca ${a.confianca}`
  );
}
for (const e of resultado.encerrados) {
  console.log(
    `  [encerrado     ] ${e.emissorNome.padEnd(24)} ${e.tipo.padEnd(21)} ${e.carteira.padEnd(11)} motivo: ${e.motivo}`
  );
}
