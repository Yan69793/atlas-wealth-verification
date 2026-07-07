import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { auditCarteira } from '../src/engine.js';
import type { CarteiraRaw } from '../src/schema.js';

const scCarteira: CarteiraRaw = {
  nome: 'SC',
  periodo: { baseline: '2026-03', referencia: '2026-04', baselineLabel: 'Março', referenciaLabel: 'Abril' },
  plBase: 7222731.76,
  plRef: 7221334.58,
  varRS: -1397.18,
  varPct: -0.000193,
  rentRef: 0,
  continuidade: 0,
  somaVsTotal: 0,
  perfImplicita: -0.00028,
  eventos: 882.73,
  impostos: 157.09,
  ativos: [],
  nAtivosBase: 14,
  nAtivosRef: 14,
  fonte: { tipo: 'xlsx', template: 'mirabaud-v2', arquivo: 'test.xlsx' },
};

describe('SC corrigir', () => {
  it('rentabilidade zero gera CORRIGIR', () => {
    const result = auditCarteira(scCarteira, { mes: '2026-04', baseline: '2026-03', toleranciaPL: 0.003 });
    assert.equal(result.status, 'CORRIGIR');
    assert.ok(result.erros.length > 0);
    assert.ok(result.erros[0].includes('0,00%'));
  });
});