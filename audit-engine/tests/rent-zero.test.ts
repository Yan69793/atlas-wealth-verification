import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { auditCarteira } from '../src/engine.js';
import type { CarteiraRaw } from '../src/schema.js';

const base: CarteiraRaw = {
  nome: 'TEST',
  periodo: { baseline: '2026-03', referencia: '2026-04', baselineLabel: 'Março', referenciaLabel: 'Abril' },
  plBase: 1000000,
  plRef: 1001000,
  varRS: 1000,
  varPct: 0.001,
  rentRef: 0,
  continuidade: 0,
  somaVsTotal: 0,
  perfImplicita: 0.001,
  eventos: 0,
  impostos: 0,
  ativos: [],
  nAtivosBase: 1,
  nAtivosRef: 1,
  fonte: { tipo: 'xlsx', template: 'mirabaud-v2', arquivo: 'test.xlsx' },
};

describe('rent zero', () => {
  it('qualquer carteira com rent 0 e CORRIGIR', () => {
    const result = auditCarteira(base, { mes: '2026-04', baseline: '2026-03', toleranciaPL: 0.003 });
    assert.equal(result.status, 'CORRIGIR');
  });
});