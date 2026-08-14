/**
 * Testes do diff entre snapshots consecutivos — cada tipo de evento no limiar
 * exato (>= gera, abaixo não gera). Snapshot base com plTotal = 1.000.000.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calcularMaterialidade,
  classificarSeveridade,
  diffSnapshots,
} from '../src/snapshot/diff.js';
import type { Snapshot, SnapshotEvent } from '../src/snapshot/types.js';

const DATA_D1 = '2026-08-12';
const DATA_D = '2026-08-13';

function mkSnapshot(data: string, carteiras: { nome: string; posicoes: { ativo: string; valor: number; classe?: string | null; vencimento?: string | null }[] }[]): Snapshot {
  return {
    schema: 'snapshot/v1',
    data,
    fonte: 'teste-sintetico',
    geradoEm: new Date().toISOString(),
    engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
    carteiras: carteiras.map((c) => ({
      nome: c.nome,
      plTotal: c.posicoes.reduce((a, p) => a + p.valor, 0),
      posicoes: c.posicoes.map((p) => ({
        carteira: c.nome,
        ativo: p.ativo,
        classe: p.classe ?? null,
        valor: p.valor,
        vencimento: p.vencimento ?? null,
        quantidade: null,
      })),
    })),
  };
}

function tipos(eventos: SnapshotEvent[]): string[] {
  return eventos.map((e) => e.tipo);
}

const LIQ = { ativo: 'Caixa Geral', classe: 'Liquidez' };
const FIX = { ativo: 'Fundo XYZ', classe: 'Renda Fixa' };

describe('diffSnapshots', () => {
  it('CASH_INCREASE no limiar exato (5%) gera; abaixo não', () => {
    const base = mkSnapshot(DATA_D1, [{ nome: 'A', posicoes: [{ ...LIQ, valor: 100_000 }, { ...FIX, valor: 900_000 }] }]);
    const noLimite = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...LIQ, valor: 150_000 }, { ...FIX, valor: 900_000 }] }]);
    const abaixo = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...LIQ, valor: 149_999.99 }, { ...FIX, valor: 900_000 }] }]);

    const evsLimite = diffSnapshots(noLimite, base).eventos;
    assert.ok(evsLimite.some((e) => e.tipo === 'CASH_INCREASE'), 'gera no limiar');
    const ev = evsLimite.find((e) => e.tipo === 'CASH_INCREASE')!;
    assert.equal(ev.valorAnterior, 100_000);
    assert.equal(ev.valorAtual, 150_000);
    assert.equal(ev.delta, 50_000);
    assert.equal(ev.materialidade, 0.05);

    const evsAbaixo = diffSnapshots(abaixo, base).eventos;
    assert.ok(!tipos(evsAbaixo).includes('CASH_INCREASE'), 'não gera abaixo do limiar');
  });

  it('CASH_DECREASE gera com deltaPct; liquidez anterior 0 não quebra', () => {
    const base = mkSnapshot(DATA_D1, [{ nome: 'A', posicoes: [{ ...LIQ, valor: 150_000 }, { ...FIX, valor: 850_000 }] }]);
    const atual = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...LIQ, valor: 100_000 }, { ...FIX, valor: 850_000 }] }]);
    const evs = diffSnapshots(atual, base).eventos;
    const ev = evs.find((e) => e.tipo === 'CASH_DECREASE')!;
    assert.ok(ev);
    assert.equal(ev.delta, -50_000);
    assert.ok(ev.deltaPct !== null && Math.abs(ev.deltaPct - -1 / 3) < 1e-9);

    const baseSemLiq = mkSnapshot(DATA_D1, [{ nome: 'A', posicoes: [{ ...FIX, valor: 1_000_000 }] }]);
    const atualComLiq = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...LIQ, valor: 60_000 }, { ...FIX, valor: 940_000 }] }]);
    const ev2 = diffSnapshots(atualComLiq, baseSemLiq).eventos.find((e) => e.tipo === 'CASH_INCREASE')!;
    assert.equal(ev2.deltaPct, null); // liquidez base 0
  });

  it('NEW_POSITION no limiar de R$ 5.000; abaixo não', () => {
    const base = mkSnapshot(DATA_D1, [{ nome: 'A', posicoes: [{ ...FIX, valor: 1_000_000 }] }]);
    const noLimite = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...FIX, valor: 1_000_000 }, { ativo: 'LCI Nova', valor: 5_000, classe: 'Renda Fixa' }] }]);
    const abaixo = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...FIX, valor: 1_000_000 }, { ativo: 'LCI Nova', valor: 4_999.99, classe: 'Renda Fixa' }] }]);

    const ev = diffSnapshots(noLimite, base).eventos.find((e) => e.tipo === 'NEW_POSITION')!;
    assert.ok(ev);
    assert.equal(ev.valorAnterior, 0);
    assert.equal(ev.valorAtual, 5_000);
    assert.equal(ev.deltaPct, null);
    assert.ok(!tipos(diffSnapshots(abaixo, base).eventos).includes('NEW_POSITION'));
  });

  it('POSITION_CLOSED no limiar de R$ 5.000; abaixo não', () => {
    const base = mkSnapshot(DATA_D1, [{ nome: 'A', posicoes: [{ ...FIX, valor: 995_000 }, { ativo: 'CDB Velho', valor: 5_000, classe: 'Renda Fixa' }] }]);
    const atual = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...FIX, valor: 995_000 }] }]);
    const ev = diffSnapshots(atual, base).eventos.find((e) => e.tipo === 'POSITION_CLOSED')!;
    assert.ok(ev);
    assert.equal(ev.valorAnterior, 5_000);
    assert.equal(ev.valorAtual, 0);
    assert.equal(ev.deltaPct, -1);

    const basePequeno = mkSnapshot(DATA_D1, [{ nome: 'A', posicoes: [{ ...FIX, valor: 995_000 }, { ativo: 'CDB Velho', valor: 4_999.99, classe: 'Renda Fixa' }] }]);
    assert.ok(!tipos(diffSnapshots(atual, basePequeno).eventos).includes('POSITION_CLOSED'));
  });

  it('MATURITY_APPROACHING: troca de janela gera uma vez; fora das janelas não', () => {
    const mk = (data: string, dias: number) => {
      const venc = new Date(new Date(data + 'T00:00:00Z').getTime() + dias * 86_400_000).toISOString().slice(0, 10);
      return mkSnapshot(data, [{ nome: 'A', posicoes: [{ ...FIX, valor: 1_000_000, vencimento: venc }] }]);
    };

    // ativo novo a 7 dias → janela 7
    const baseSem = mkSnapshot(DATA_D1, [{ nome: 'A', posicoes: [{ ativo: 'Outro', classe: 'Renda Fixa', valor: 1_000_000 }] }]);
    const novo7 = mk(DATA_D, 7);
    const ev = diffSnapshots(novo7, baseSem).eventos.find((e) => e.tipo === 'MATURITY_APPROACHING')!;
    assert.ok(ev);
    assert.equal(ev.evidencias.janelaDias, 7);

    // 16 → 15 dias: cruza a fronteira 30 → 15 → evento com janela 15
    const base8 = mk(DATA_D1, 16);
    const atual8 = mk(DATA_D, 15);
    const ev8 = diffSnapshots(atual8, base8).eventos.find((e) => e.tipo === 'MATURITY_APPROACHING')!;
    assert.ok(ev8, 'cruzamento de janela gera evento');
    assert.equal(ev8.evidencias.janelaDias, 15);

    // mesma janela (15→14, ambos janela 15) → sem novo evento
    const base14 = mk(DATA_D1, 15);
    const atual14 = mk(DATA_D, 14);
    assert.ok(!tipos(diffSnapshots(atual14, base14).eventos).includes('MATURITY_APPROACHING'));

    // 91 dias → fora; vencido → ignorado
    const base91 = mk(DATA_D1, 92);
    const atual91 = mk(DATA_D, 91);
    assert.ok(!tipos(diffSnapshots(atual91, base91).eventos).includes('MATURITY_APPROACHING'));

    const vencido = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...FIX, valor: 1_000_000, vencimento: DATA_D1 }] }]);
    assert.ok(!tipos(diffSnapshots(vencido, baseSem).eventos).includes('MATURITY_APPROACHING'));
  });

  it('LARGE_WITHDRAWAL: -10% exato com queda >= 50.000 gera; -5% não', () => {
    const base = mkSnapshot(DATA_D1, [{ nome: 'A', posicoes: [{ ...FIX, valor: 1_000_000 }] }]);
    const noLimite = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...FIX, valor: 900_000 }] }]);
    const ev = diffSnapshots(noLimite, base).eventos.find((e) => e.tipo === 'LARGE_WITHDRAWAL')!;
    assert.ok(ev);
    assert.equal(ev.severidade, 'alta');

    const pctAbaixo = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...FIX, valor: 950_000 }] }]);
    assert.ok(!tipos(diffSnapshots(pctAbaixo, base).eventos).includes('LARGE_WITHDRAWAL'));
  });

  it('ALLOCATION_SHIFT: 5pp exato gera; 4,99pp não', () => {
    const mkPart = (data: string, liqValor: number, fixValor: number) =>
      mkSnapshot(data, [{ nome: 'A', posicoes: [{ ...LIQ, valor: liqValor }, { ...FIX, valor: fixValor }] }]);

    const base = mkPart(DATA_D1, 100_000, 900_000); // liquidez 10%
    const noLimite = mkPart(DATA_D, 150_000, 850_000); // liquidez 15% → +5pp (e RF -5pp)
    const ev = diffSnapshots(noLimite, base).eventos.find(
      (e) => e.tipo === 'ALLOCATION_SHIFT' && e.evidencias.partBase === 0.10
    )!;
    assert.ok(ev, 'evento de liquidez presente no limiar exato');
    assert.equal(ev.evidencias.partAtual, 0.15);

    const abaixo = mkPart(DATA_D, 149_900, 850_100); // 14,99% → +4,99pp
    assert.ok(!tipos(diffSnapshots(abaixo, base).eventos).includes('ALLOCATION_SHIFT'));
  });

  it('CONCENTRATION_INCREASE: shift >= 5pp E nível pós >= 30%', () => {
    // 2 ativos: a concentração é do MAIOR (resto). 50% → 55% gera; 54,9% não.
    const mk2 = (data: string, grandeValor: number, restoValor: number) =>
      mkSnapshot(data, [{ nome: 'A', posicoes: [{ ativo: 'Ativo Grande', classe: 'Renda Fixa', valor: grandeValor }, { ativo: 'Resto', classe: 'Ações', valor: restoValor }] }]);

    const base = mk2(DATA_D1, 500_000, 500_000); // maior = 50%
    const gera = mk2(DATA_D, 450_000, 550_000); // maior = 55% → +5pp, nível 55%
    const ev = diffSnapshots(gera, base).eventos.find((e) => e.tipo === 'CONCENTRATION_INCREASE')!;
    assert.ok(ev);
    assert.equal(ev.evidencias.partAtual, 0.55);

    const abaixoShift = mk2(DATA_D, 451_000, 549_000); // 54,9% → +4,9pp
    assert.ok(!tipos(diffSnapshots(abaixoShift, base).eventos).includes('CONCENTRATION_INCREASE'));

    // Nível pós < 30% bloqueia mesmo com shift >= 5pp: 5 ativos iguais de 20%,
    // o maior sobe para 28% (shift +8pp) mas fica abaixo de 30%.
    const mk5 = (data: string, aValor: number, outroValor: number) =>
      mkSnapshot(data, [
        { nome: 'A', posicoes: [
          { ativo: 'A1', classe: 'Renda Fixa', valor: aValor },
          { ativo: 'B2', classe: 'Ações', valor: outroValor },
          { ativo: 'C3', classe: 'Ações', valor: outroValor },
          { ativo: 'D4', classe: 'Ações', valor: outroValor },
          { ativo: 'E5', classe: 'Ações', valor: outroValor },
        ] },
      ]);

    const base5 = mk5(DATA_D1, 200_000, 200_000); // maior = 20%
    const nivelAbaixo = mk5(DATA_D, 280_000, 180_000); // maior = 28% → +8pp, nível 28% < 30%
    assert.ok(!tipos(diffSnapshots(nivelAbaixo, base5).eventos).includes('CONCENTRATION_INCREASE'));
  });

  it('REVENUE_DROP nunca é emitido nesta fase', () => {
    const base = mkSnapshot(DATA_D1, [{ nome: 'A', posicoes: [{ ...FIX, valor: 1_000_000 }] }]);
    const atual = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...FIX, valor: 1_000_000 }] }]);
    assert.ok(!tipos(diffSnapshots(atual, base).eventos).includes('REVENUE_DROP'));
  });

  it('sem base: eventos vazios e baseData null', () => {
    const atual = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...FIX, valor: 1_000_000 }] }]);
    const res = diffSnapshots(atual, null);
    assert.equal(res.baseData, null);
    assert.deepEqual(res.eventos, []);
  });

  it('diff é idempotente e determinístico', () => {
    const base = mkSnapshot(DATA_D1, [{ nome: 'A', posicoes: [{ ...LIQ, valor: 100_000 }, { ...FIX, valor: 900_000 }] }]);
    const atual = mkSnapshot(DATA_D, [{ nome: 'A', posicoes: [{ ...LIQ, valor: 150_000 }, { ...FIX, valor: 900_000 }, { ativo: 'LCI', classe: 'Renda Fixa', valor: 10_000 }] }]);
    const r1 = diffSnapshots(atual, base);
    const r2 = diffSnapshots(atual, base);
    assert.deepEqual(r1, r2);
    assert.equal(r1.baseData, DATA_D1);
  });
});

describe('materialidade e severidade', () => {
  it('limiares exatos', () => {
    assert.equal(calcularMaterialidade(0, 1_000_000), 0);
    assert.equal(calcularMaterialidade(50_000, 1_000_000), 0.05);
    assert.equal(calcularMaterialidade(50_000, 0), null);

    assert.equal(classificarSeveridade(0.05), 'baixa');
    assert.equal(classificarSeveridade(0.10), 'media'); // baixaMax inclusivo
    assert.equal(classificarSeveridade(0.30), 'alta'); // mediaMax inclusivo
    assert.equal(classificarSeveridade(0.50), 'alta');
  });
});
