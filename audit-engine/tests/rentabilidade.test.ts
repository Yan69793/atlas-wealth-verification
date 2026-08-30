/**
 * Testes diretos de rentabilidadeRule para o ramo de variação negativa
 * extrema, sem cobertura antes (só via engine, e só para rent=0 e _OFF).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rentabilidadeRule } from '../src/rules/rentabilidade.js';
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

describe('rentabilidade — variação negativa extrema', () => {
  it('rent < -0.15 dispara alerta de variação negativa extrema', () => {
    const c: CarteiraRaw = { ...base, rentRef: -0.20 };
    const findings = rentabilidadeRule.run(c, ctx);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].tipo, 'alerta');
    assert.match(findings[0].mensagem, /variacao negativa extrema/);
  });

  it('fronteira exata em -0.15 não dispara (é < estrito)', () => {
    const c: CarteiraRaw = { ...base, rentRef: -0.15 };
    assert.deepEqual(rentabilidadeRule.run(c, ctx), []);
  });

  it('caso feliz normal, fora de _OFF, sem finding', () => {
    const c: CarteiraRaw = { ...base, nome: 'CARTEIRA-NORMAL', rentRef: 0.08 };
    assert.deepEqual(rentabilidadeRule.run(c, ctx), []);
  });
});
