import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cotasSemOperacaoRule } from '../src/rules/cotas-sem-operacao.js';
import type { CarteiraRaw } from '../src/schema.js';

describe('cotas sem operacao', () => {
  it('variacao de ativo sem operacao gera alerta', () => {
    // Fixture sintetica. Codigo de carteira e ticker reais nao moram no produto.
    const carteira: CarteiraRaw = {
      nome: 'CART_DEMO',
      periodo: { baseline: '2026-03', referencia: '2026-04', baselineLabel: 'Março', referenciaLabel: 'Abril' },
      plBase: 1_000_000,
      plRef: 980_000,
      varRS: -20_000,
      varPct: -0.02,
      rentRef: 0.01,
      continuidade: 0,
      somaVsTotal: 0,
      perfImplicita: 0.01,
      eventos: 0,
      impostos: 0,
      ativos: [
        {
          type: 'ativo',
          nome: 'TICKER_X',
          plBase: 100_000,
          plRef: 121_400,
          diff: 21_400,
          varPct: 0.214,
        },
      ],
      nAtivosBase: 1,
      nAtivosRef: 1,
      fonte: { tipo: 'xlsx', template: 'custodian-xlsx-v2', arquivo: 'test.xlsx' },
    };

    const findings = cotasSemOperacaoRule.run(carteira, { mes: '2026-04', baseline: '2026-03', toleranciaPL: 0.003 });
    assert.ok(findings.some((f) => f.mensagem.includes('TICKER_X')));
  });
});