import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { auditCarteira } from '../src/engine.js';
import type { CarteiraRaw } from '../src/schema.js';

// Fixture sintetica. Codigo e PL reais de cliente nao moram no produto.
const carteiraRentZero: CarteiraRaw = {
  nome: 'CART_DEMO',
  periodo: { baseline: '2026-03', referencia: '2026-04', baselineLabel: 'Março', referenciaLabel: 'Abril' },
  plBase: 1_000_000,
  plRef: 999_800,
  varRS: -200,
  varPct: -0.0002,
  rentRef: 0,
  continuidade: 0,
  somaVsTotal: 0,
  perfImplicita: -0.0002,
  eventos: 100,
  impostos: 50,
  ativos: [],
  nAtivosBase: 5,
  nAtivosRef: 5,
  fonte: { tipo: 'xlsx', template: 'custodian-xlsx-v2', arquivo: 'test.xlsx' },
};

describe('rentabilidade zero gera CORRIGIR', () => {
  it('rentabilidade zero gera CORRIGIR', () => {
    const result = auditCarteira(carteiraRentZero, { mes: '2026-04', baseline: '2026-03', toleranciaPL: 0.003 });
    assert.equal(result.status, 'CORRIGIR');
    assert.ok(result.erros.length > 0);
    assert.ok(result.erros[0].includes('0,00%'));
  });
});