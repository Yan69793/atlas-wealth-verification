/**
 * Trava o contrato dos thresholds: valores exatos documentados e isLiquidez.
 * Qualquer ajuste de default passa por aqui e pelo dono antes de estrear.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isLiquidez } from '../src/snapshot/normalize.js';
import { CASH_CLASSES, THRESHOLDS } from '../src/snapshot/thresholds.js';

describe('contrato dos thresholds do snapshot', () => {
  it('valores exatos documentados', () => {
    assert.equal(THRESHOLDS.cashMovimentoPct, 0.05);
    assert.equal(THRESHOLDS.novaPosicaoMinPct, 0.03);
    assert.equal(THRESHOLDS.posicaoEncerradaMinPct, 0.03);
    assert.deepEqual([...THRESHOLDS.maturidadeJanelas], [7, 15, 30, 60, 90]);
    assert.equal(THRESHOLDS.saqueGrandePct, 0.10);
    assert.equal(THRESHOLDS.saqueGrandeMinAbs, 50_000);
    assert.equal(THRESHOLDS.alocacaoShiftPp, 0.05);
    assert.equal(THRESHOLDS.concentracaoShiftPp, 0.05);
    assert.equal(THRESHOLDS.concentracaoNivelMin, 0.30);
    assert.equal(THRESHOLDS.severidade.baixaMax, 0.10);
    assert.equal(THRESHOLDS.severidade.mediaMax, 0.30);
    assert.equal(THRESHOLDS.caixaParadoMinPct, 0.10);
    assert.equal(THRESHOLDS.caixaParadoMinDias, 7);
    assert.equal(THRESHOLDS.caixaParadoJanelaDias, 90);
    assert.equal(THRESHOLDS.revenueDropPct, 0.05);
  });

  it('CASH_CLASSES tem os rótulos esperados', () => {
    assert.deepEqual(CASH_CLASSES, ['liquidez', 'caixa', 'disponibilidades', 'disponivel']);
  });

  it('isLiquidez normaliza acento e caixa', () => {
    assert.equal(isLiquidez('Liquidez'), true);
    assert.equal(isLiquidez('  LIQUIDEZ  '), true);
    assert.equal(isLiquidez('Caixa'), true);
    assert.equal(isLiquidez('RENDA FIXA'), false);
    assert.equal(isLiquidez(null), false);
    assert.equal(isLiquidez(''), false);
  });
});
