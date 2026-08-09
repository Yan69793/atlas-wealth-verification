import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { auditCarteira } from '../src/engine.js';
import type { CarteiraRaw } from '../src/schema.js';

function make(nome: string, rentRef: number | null): CarteiraRaw {
  return {
    nome,
    periodo: { baseline: '2026-05', referencia: '2026-06', baselineLabel: 'Maio', referenciaLabel: 'Junho' },
    plBase: 1000000,
    plRef: 1010000,
    varRS: 10000,
    varPct: 0.01,
    rentRef,
    continuidade: null,
    somaVsTotal: null,
    perfImplicita: null,
    eventos: 0,
    impostos: 0,
    ativos: [],
    nAtivosBase: 1,
    nAtivosRef: 1,
    fonte: { tipo: 'pdf', template: 'custodian-pdf-v1', arquivo: `Book_${nome}_2026_06.pdf` },
  };
}

const ctx = { mes: '2026-06', baseline: '2026-05', toleranciaPL: 0.003 };

describe('excecao offshore (_OFF sem rentabilidade)', () => {
  it('_OFF com rentRef null vira ALERTA, nao bloqueia', () => {
    const r = auditCarteira(make('DEMO_OFF', null), ctx);
    assert.notEqual(r.status, 'CORRIGIR');
    assert.ok(r.alertas.some((a) => a.includes('offshore')), 'deve ter alerta de book offshore');
    assert.ok(!r.erros.some((e) => e.includes('0,00%')), 'nao deve ter erro de rentabilidade zero');
  });

  it('carteira NAO-offshore com rentRef null continua ERRO bloqueante', () => {
    const r = auditCarteira(make('QUALQUER', null), ctx);
    assert.equal(r.status, 'CORRIGIR');
    assert.ok(r.erros.some((e) => e.includes('0,00%')));
  });

  it('_OFF com rentRef 0 LITERAL continua ERRO (zero reportado, nao ausente)', () => {
    const r = auditCarteira(make('XYZ_OFF', 0), ctx);
    assert.equal(r.status, 'CORRIGIR');
    assert.ok(r.erros.some((e) => e.includes('0,00%')));
  });

  it('_OFF com rentabilidade normal nao gera achado de rentabilidade', () => {
    const r = auditCarteira(make('ABC_OFF', 0.009), ctx);
    assert.ok(!r.erros.some((e) => e.includes('0,00%')));
    assert.ok(!r.alertas.some((a) => a.includes('offshore')));
  });
});
