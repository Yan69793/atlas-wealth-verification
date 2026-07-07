import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cotasSemOperacaoRule } from '../src/rules/cotas-sem-operacao.js';
import type { CarteiraRaw } from '../src/schema.js';

describe('cotas sem operacao', () => {
  it('FGLC AMZO34 variacao sem operacao gera alerta', () => {
    const carteira: CarteiraRaw = {
      nome: 'FGLC',
      periodo: { baseline: '2026-03', referencia: '2026-04', baselineLabel: 'Março', referenciaLabel: 'Abril' },
      plBase: 4542731,
      plRef: 4405540,
      varRS: -137191,
      varPct: -0.03,
      rentRef: 0.0166,
      continuidade: 0,
      somaVsTotal: 0,
      perfImplicita: 0.01,
      eventos: 0,
      impostos: 0,
      ativos: [
        {
          type: 'ativo',
          nome: 'AMZO34',
          plBase: 100000,
          plRef: 121400,
          diff: 21400,
          varPct: 0.214,
        },
      ],
      nAtivosBase: 1,
      nAtivosRef: 1,
      fonte: { tipo: 'xlsx', template: 'mirabaud-v2', arquivo: 'test.xlsx' },
    };

    const findings = cotasSemOperacaoRule.run(carteira, { mes: '2026-04', baseline: '2026-03', toleranciaPL: 0.003 });
    assert.ok(findings.some((f) => f.mensagem.includes('AMZO34')));
  });
});