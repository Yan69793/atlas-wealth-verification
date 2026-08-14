/**
 * maturities.test.ts — Fase 3: vencimentos próximos.
 *
 * Bordas das janelas (D+7 exato entra na janela 7, D+8 cai na 15), vencido e
 * além da janela máxima ficam de fora, pctPl exato, emissor opcional e
 * determinismo. Fixtures em memória, nada de LGPD.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { vencimentosProximos } from '../src/intel/maturities.js';
import type { Snapshot } from '../src/snapshot/types.js';

function mkSnapshot(data: string, posicoes: Array<{ carteira: string; ativo: string; valor: number; vencimento?: string; instituicao?: string | null }>): Snapshot {
  const porCarteira = new Map<string, typeof posicoes>();
  for (const p of posicoes) {
    if (!porCarteira.has(p.carteira)) porCarteira.set(p.carteira, []);
    porCarteira.get(p.carteira)!.push(p);
  }
  return {
    schema: 'snapshot/v1',
    data,
    periodo: 'diario',
    fonte: 'teste',
    geradoEm: '2026-08-14T12:00:00Z',
    engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
    carteiras: [...porCarteira.entries()].map(([nome, ps]) => ({
      nome,
      plTotal: ps.reduce((a, p) => a + p.valor, 0),
      posicoes: ps.map((p) => ({
        carteira: nome,
        ativo: p.ativo,
        classe: null,
        valor: p.valor,
        vencimento: p.vencimento ?? null,
        quantidade: null,
        instituicao: p.instituicao ?? null,
      })),
    })),
  };
}

const HOJE = '2026-08-14';

describe('vencimentos próximos', () => {
  it('D+7 exato entra na janela 7; D+8 cai na janela 15 e não na 7', () => {
    const snap = mkSnapshot(HOJE, [
      { carteira: 'A', ativo: 'LCI 7 dias', valor: 30_000, vencimento: '2026-08-21' }, // +7
      { carteira: 'A', ativo: 'LCI 8 dias', valor: 40_000, vencimento: '2026-08-22' }, // +8
    ]);
    const lista = vencimentosProximos(snap, { dataReferencia: HOJE });
    const sete = lista.find((v) => v.ativo === 'LCI 7 dias')!;
    const oito = lista.find((v) => v.ativo === 'LCI 8 dias')!;
    assert.ok(sete, 'D+7 aparece');
    assert.equal(sete.janelaDias, 7);
    assert.ok(oito, 'D+8 aparece');
    assert.equal(oito.janelaDias, 15, 'D+8 cai na janela 15, não na 7');
  });

  it('vencido e além de 90 dias ficam de fora', () => {
    const snap = mkSnapshot(HOJE, [
      { carteira: 'A', ativo: 'Vencido', valor: 10_000, vencimento: '2026-08-13' }, // -1
      { carteira: 'A', ativo: 'Longe', valor: 20_000, vencimento: '2027-08-14' },    // +365
      { carteira: 'A', ativo: 'Na janela', valor: 30_000, vencimento: '2026-09-13' }, // +30
    ]);
    const lista = vencimentosProximos(snap, { dataReferencia: HOJE });
    assert.ok(!lista.some((v) => v.ativo === 'Vencido'), 'vencido não aparece');
    assert.ok(!lista.some((v) => v.ativo === 'Longe'), 'além de 90 dias não aparece');
    assert.equal(lista.find((v) => v.ativo === 'Na janela')!.janelaDias, 30);
  });

  it('pctPl exato: valor / plTotal da carteira', () => {
    const snap = mkSnapshot(HOJE, [
      { carteira: 'A', ativo: 'Fixo', valor: 970_000 },
      { carteira: 'A', ativo: 'LCI', valor: 30_000, vencimento: '2026-08-21' },
    ]);
    const item = vencimentosProximos(snap, { dataReferencia: HOJE })[0];
    assert.equal(item.pctPl, 0.03);
    assert.equal(item.valor, 30_000);
  });

  it('emissor vem do snapshot quando o adaptador fornece, senão null', () => {
    const snap = mkSnapshot(HOJE, [
      { carteira: 'A', ativo: 'NTN-B', valor: 50_000, vencimento: '2026-08-21', instituicao: 'BTG' },
      { carteira: 'A', ativo: 'CDB', valor: 60_000, vencimento: '2026-08-28', instituicao: null },
    ]);
    const lista = vencimentosProximos(snap, { dataReferencia: HOJE });
    assert.equal(lista.find((v) => v.ativo === 'NTN-B')!.instituicao, 'BTG');
    assert.equal(lista.find((v) => v.ativo === 'CDB')!.instituicao, null);
  });

  it('oportunidadeId ancora no dia do cruzamento da janela, não no dia da lista', () => {
    // Vencimento +8d, janela 15: o evento da Fase 2 nasce em 2026-08-07
    // (vencimento - janela), mesmo a lista sendo gerada hoje (2026-08-14).
    const snap = mkSnapshot(HOJE, [
      { carteira: 'A', ativo: 'LCI', valor: 30_000, vencimento: '2026-08-22' },
    ]);
    const a = vencimentosProximos(snap, { dataReferencia: HOJE });
    const b = vencimentosProximos(snap, { dataReferencia: HOJE });
    assert.equal(a[0].janelaDias, 15);
    assert.equal(a[0].oportunidadeId, '2026-08-07|A|MATURITY_APPROACHING|LCI');
    assert.deepEqual(a, b, 'mesma entrada, mesma saída');
  });

  it('sem dataReferencia na entrada, usa a data do próprio snapshot', () => {
    const snap = mkSnapshot(HOJE, [
      { carteira: 'A', ativo: 'LCI', valor: 30_000, vencimento: '2026-08-21' },
    ]);
    const lista = vencimentosProximos(snap);
    assert.equal(lista.length, 1);
    assert.equal(lista[0].janelaDias, 7);
  });
});
