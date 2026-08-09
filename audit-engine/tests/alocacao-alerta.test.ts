import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alocacaoRule } from '../src/rules/alocacao.js';
import type { CarteiraRaw } from '../src/schema.js';

describe('alocacao alerta', () => {
  it('mudanca liquidez > 5pp gera alerta', () => {
    const carteira: CarteiraRaw = {
      nome: 'TESTE_ALOC',
      periodo: { baseline: '2026-03', referencia: '2026-04', baselineLabel: 'Março', referenciaLabel: 'Abril' },
      plBase: 5009446,
      plRef: 5058557,
      varRS: 49111,
      varPct: 0.01,
      rentRef: 0.0104,
      continuidade: 0,
      somaVsTotal: 0,
      perfImplicita: 0.00276,
      eventos: 0,
      impostos: 0,
      ativos: [
        { type: 'classe', classe: 'Liquidez', plBase: 954000, plRef: 1218000, diff: 264000, varPct: 0.027 },
      ],
      nAtivosBase: 1,
      nAtivosRef: 1,
      fonte: { tipo: 'xlsx', template: 'custodian-xlsx-v2', arquivo: 'test.xlsx' },
    };

    const findings = alocacaoRule.run(carteira, { mes: '2026-04', baseline: '2026-03', toleranciaPL: 0.003 });
    assert.ok(findings.length > 0);
    assert.ok(findings[0].mensagem.includes('Liquidez'));
  });
});