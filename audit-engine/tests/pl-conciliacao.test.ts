/**
 * Testes diretos de plConciliacaoRule — antes só coberta indiretamente por um
 * teste de parity que fica pulado sem dado real de cliente (ATLAS_FIXTURES).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plConciliacaoRule } from '../src/rules/pl-conciliacao.js';
import type { CarteiraRaw } from '../src/schema.js';
import type { RuleContext } from '../src/rules/types.js';

const ctx: RuleContext = { mes: '2026-04', baseline: '2026-03', toleranciaPL: 0.003 };

const base: CarteiraRaw = {
  nome: 'TEST',
  periodo: { baseline: '2026-03', referencia: '2026-04', baselineLabel: 'Março', referenciaLabel: 'Abril' },
  plBase: 1000000,
  plRef: 1000000,
  varRS: 0,
  varPct: 0,
  rentRef: 0,
  continuidade: 0,
  somaVsTotal: 0,
  perfImplicita: 0,
  eventos: 0,
  impostos: 0,
  ativos: [],
  nAtivosBase: 1,
  nAtivosRef: 1,
  fonte: { tipo: 'xlsx', template: 'custodian-xlsx-v2', arquivo: 'test.xlsx' },
};

describe('pl-conciliacao', () => {
  it('sem total, nenhum finding', () => {
    const c: CarteiraRaw = { ...base, total: undefined };
    assert.deepEqual(plConciliacaoRule.run(c, ctx), []);
  });

  it('diff dentro da tolerância, nenhum finding', () => {
    const c: CarteiraRaw = {
      ...base,
      plRef: 1001500,
      total: { plBase: 1000000, plRef: 1001500, diff: 1500, varPct: 0.0015, compras: 0, vendas: 0, eventos: 0, impostos: 0 },
    };
    assert.deepEqual(plConciliacaoRule.run(c, ctx), []);
  });

  it('diff acima da tolerância dispara alerta', () => {
    const c: CarteiraRaw = {
      ...base,
      plRef: 1010000,
      total: { plBase: 1000000, plRef: 1010000, diff: 10000, varPct: 0.01, compras: 0, vendas: 0, eventos: 0, impostos: 0 },
    };
    const findings = plConciliacaoRule.run(c, ctx);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].tipo, 'alerta');
    assert.match(findings[0].mensagem, /Conciliacao de PL nao fecha/);
  });

  it('plRef <= 0 nunca dispara, mesmo com diff grande', () => {
    const c: CarteiraRaw = {
      ...base,
      plBase: 1000000,
      plRef: 0,
      total: { plBase: 1000000, plRef: 0, diff: -1000000, varPct: -1, compras: 0, vendas: 0, eventos: 0, impostos: 0 },
    };
    assert.deepEqual(plConciliacaoRule.run(c, ctx), []);
  });

  it('plRef negativo também não dispara (o <= 0 cobre os dois lados)', () => {
    const c: CarteiraRaw = {
      ...base,
      plBase: 1000000,
      plRef: -50000,
      total: { plBase: 1000000, plRef: -50000, diff: -1050000, varPct: -1.05, compras: 0, vendas: 0, eventos: 0, impostos: 0 },
    };
    assert.deepEqual(plConciliacaoRule.run(c, ctx), []);
  });

  it('campos individuais ausentes no total usam default 0 na conta', () => {
    // sem compras/vendas/eventos/impostos: se o `?? 0` quebrar vira NaN, a
    // comparação NaN > tolAbs é sempre falsa e o alerta esperado não dispara.
    const c: CarteiraRaw = {
      ...base,
      plBase: 1000000,
      plRef: 900000,
      total: { plBase: 1000000, plRef: 900000, diff: -100000, varPct: -0.1 },
    };
    const findings = plConciliacaoRule.run(c, ctx);
    assert.equal(findings.length, 1, 'defaulting quebrado produziria NaN e nenhum finding');
    assert.equal(findings[0].tipo, 'alerta');
  });
});
