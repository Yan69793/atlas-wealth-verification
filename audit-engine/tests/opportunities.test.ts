/**
 * opportunities.test.ts — Fase 2: motor de oportunidades.
 *
 * Cobre as três peças: regras declarativas (evento → oportunidade, com
 * desligamento), ciclo de status (transições permitidas/negadas) e score
 * determinístico de priorização. Fixtures em memória, nada de LGPD.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { gerarOportunidades, REGRAS_PADRAO } from '../src/opportunities/generator.js';
import { fatorPrazo, fatorVolume, pontuarOportunidade, priorizarOportunidades } from '../src/opportunities/prioritize.js';
import { transicaoPermitida } from '../src/opportunities/types.js';
import type { Oportunidade, StatusOportunidade } from '../src/opportunities/types.js';
import type { SnapshotEvent } from '../src/snapshot/types.js';

function evento(parcial: Partial<SnapshotEvent> & { tipo: SnapshotEvent['tipo']; carteira: string }): SnapshotEvent {
  return {
    schema: 'evento/v1',
    valorAnterior: 0,
    valorAtual: 0,
    delta: 0,
    deltaPct: null,
    materialidade: null,
    severidade: 'baixa',
    evidencias: {},
    ...parcial,
  };
}

const CTX = { periodo: '2026-08-13', assessor: '' };

describe('regras declarativas evento → oportunidade', () => {
  it('MATURITY_APPROACHING gera renovação/rotação com prazo = janela do evento', () => {
    const ev = evento({
      tipo: 'MATURITY_APPROACHING',
      carteira: 'ALFA',
      ativo: 'CDB BANCO W',
      valorAtual: 50_000,
      evidencias: { janelaDias: 7 },
    });
    const ops = gerarOportunidades([ev], CTX);
    assert.equal(ops.length, 1);
    assert.equal(ops[0].cliente, 'ALFA');
    assert.equal(ops[0].motivo.includes('CDB BANCO W'), true, `motivo: ${ops[0].motivo}`);
    assert.equal(ops[0].prazo, '2026-08-20', 'prazo = data do evento + 7 dias');
    assert.equal(ops[0].volume, 50_000, 'sem delta usa o valor atual');
    assert.equal(ops[0].prioridade, 'P2');
    assert.equal(ops[0].status, 'Nova');
  });

  it('CASH_DECREASE gera avaliar aporte; CONCENTRATION e LARGE_WITHDRAWAL são P1; POSITION_CLOSED é P3', () => {
    const casos: Array<{ ev: SnapshotEvent; prioridade: Oportunidade['prioridade'] }> = [
      { ev: evento({ tipo: 'CASH_DECREASE', carteira: 'BETA', delta: -120_000 }), prioridade: 'P2' },
      { ev: evento({ tipo: 'CONCENTRATION_INCREASE', carteira: 'GAMA' }), prioridade: 'P1' },
      { ev: evento({ tipo: 'LARGE_WITHDRAWAL', carteira: 'BETA', delta: -200_000 }), prioridade: 'P1' },
      { ev: evento({ tipo: 'POSITION_CLOSED', carteira: 'ALFA', ativo: 'CDB VENCIDO', delta: -40_000 }), prioridade: 'P3' },
    ];
    for (const { ev, prioridade } of casos) {
      const ops = gerarOportunidades([ev], CTX);
      assert.equal(ops.length, 1, `${ev.tipo} gera exatamente uma`);
      assert.equal(ops[0].prioridade, prioridade, ev.tipo);
      assert.ok(ops[0].motivo.length > 10, 'motivo explicativo presente');
    }
  });

  it('volume usa o módulo do delta quando há movimento', () => {
    const ops = gerarOportunidades([evento({ tipo: 'CASH_DECREASE', carteira: 'BETA', delta: -120_000 })], CTX);
    assert.equal(ops[0].volume, 120_000);
  });

  it('tipos sem regra aprovada não geram nada (CASH_INCREASE, NEW_POSITION, ALLOCATION_SHIFT, REVENUE_DROP)', () => {
    const tipos = ['CASH_INCREASE', 'NEW_POSITION', 'ALLOCATION_SHIFT', 'REVENUE_DROP'] as const;
    for (const tipo of tipos) {
      const ops = gerarOportunidades([evento({ tipo, carteira: 'ALFA' })], CTX);
      assert.equal(ops.length, 0, tipo);
    }
  });

  it('regra desligada não gera; regras personalizadas substituem o padrão', () => {
    const ev = evento({ tipo: 'CASH_DECREASE', carteira: 'BETA', delta: -10_000 });
    const desligada = REGRAS_PADRAO.map((r) => (r.nome === 'caixa-aporte' ? { ...r, ligada: false } : r));
    assert.equal(gerarOportunidades([ev], CTX, desligada).length, 0);
    assert.equal(gerarOportunidades([ev], CTX).length, 1, 'padrão continua gerando');
  });

  it('mesmo evento duas vezes gera uma oportunidade só (dedup por carteira+tipo+ativo)', () => {
    const ev = evento({ tipo: 'MATURITY_APPROACHING', carteira: 'ALFA', ativo: 'LCI X', evidencias: { janelaDias: 7 } });
    const ops = gerarOportunidades([ev, ev], CTX);
    assert.equal(ops.length, 1);
  });

  it('determinismo: createdAt/updatedAt derivam do período, sem hora atual; mensal usa fim do mês', () => {
    const diaria = gerarOportunidades([evento({ tipo: 'CASH_DECREASE', carteira: 'BETA', delta: -10_000 })], CTX)[0];
    assert.equal(diaria.createdAt, '2026-08-13T12:00:00Z');
    assert.equal(diaria.updatedAt, diaria.createdAt);

    const mensal = gerarOportunidades(
      [evento({ tipo: 'MATURITY_APPROACHING', carteira: 'ALFA', ativo: 'LCI MENSAL', evidencias: { janelaDias: 30 } })],
      { periodo: '2026-06', assessor: '' }
    )[0];
    assert.equal(mensal.createdAt, '2026-06-30T12:00:00Z', 'mensal ancora no último dia do mês');
    assert.equal(mensal.prazo, '2026-07-30');
  });
});

describe('ciclo de status (CRM-lite)', () => {
  const caso = (de: StatusOportunidade, para: StatusOportunidade, esperado: boolean) => {
    assert.equal(transicaoPermitida(de, para), esperado, `${de} → ${para}`);
  };

  it('caminho feliz: Nova → Contatar → Em andamento → Convertida', () => {
    caso('Nova', 'Contatar', true);
    caso('Contatar', 'Em andamento', true);
    caso('Em andamento', 'Convertida', true);
  });

  it('saídas laterais: Descartada de qualquer estado ativo; Perdida de Contatar e Em andamento', () => {
    caso('Nova', 'Descartada', true);
    caso('Contatar', 'Descartada', true);
    caso('Em andamento', 'Descartada', true);
    caso('Contatar', 'Perdida', true);
    caso('Em andamento', 'Perdida', true);
  });

  it('negações: pular etapa, andar para trás e sair de terminal', () => {
    caso('Nova', 'Em andamento', false);
    caso('Nova', 'Convertida', false);
    caso('Contatar', 'Nova', false);
    caso('Em andamento', 'Contatar', false);
    caso('Em andamento', 'Nova', false);
    caso('Convertida', 'Perdida', false);
    caso('Convertida', 'Contatar', false);
    caso('Perdida', 'Nova', false);
    caso('Descartada', 'Nova', false);
  });
});

describe('priorização (score transparente e determinístico)', () => {
  function op(parcial: Partial<Oportunidade> & { id: string }): Oportunidade {
    return {
      cliente: 'ALFA',
      assessor: '',
      motivo: 'motivo',
      volume: 0,
      prioridade: 'P3',
      prazo: '2026-12-31',
      status: 'Nova',
      ultimoContato: null,
      proximoContato: null,
      observacao: '',
      resultado: null,
      origem: { tipo: 'evento', id: parcial.id, periodo: '2026-08-13' },
      createdAt: '2026-08-13T12:00:00Z',
      updatedAt: '2026-08-13T12:00:00Z',
      ...parcial,
    };
  }

  it('faixas de volume e urgência nos pontos exatos', () => {
    assert.equal(fatorVolume(4_999), 1);
    assert.equal(fatorVolume(5_000), 2);
    assert.equal(fatorVolume(99_999), 2);
    assert.equal(fatorVolume(100_000), 3);
    assert.equal(fatorVolume(500_000), 4);
    assert.equal(fatorPrazo('2026-08-20', '2026-08-13'), 4, '7 dias');
    assert.equal(fatorPrazo('2026-08-28', '2026-08-13'), 3, '15 dias');
    assert.equal(fatorPrazo('2026-08-29', '2026-08-13'), 2, '16 dias cai na faixa de 30');
    assert.equal(fatorPrazo('2026-09-12', '2026-08-13'), 2, '30 dias');
  });

  it('ordena P1 com volume alto e prazo curto na frente; mesma entrada, mesma ordem sempre', () => {
    const ops = [
      op({ id: 'a', prioridade: 'P3', volume: 1_000_000, prazo: '2026-08-20' }),
      op({ id: 'b', prioridade: 'P1', volume: 1_000_000, prazo: '2026-08-20' }),
      op({ id: 'c', prioridade: 'P1', volume: 10_000, prazo: '2026-12-31' }),
      op({ id: 'd', prioridade: 'P1', volume: 10_000, prazo: '2026-08-20' }),
    ];
    const hoje = '2026-08-13';
    const ordenadas = priorizarOportunidades(ops, hoje).map((o) => o.id);
    // score multiplicativo aprovado: b=48, d=24, a=16, c=6. O P3 de R$ 1 mi a
    // 7 dias (a) vence o P1 de R$ 10 mil sem prazo (c): volume × prazo pesam
    // junto com a prioridade, por desenho.
    assert.deepEqual(ordenadas, ['b', 'd', 'a', 'c']);

    // determinismo: três execuções, mesma ordem
    for (let i = 0; i < 2; i++) {
      assert.deepEqual(priorizarOportunidades(ops, hoje).map((o) => o.id), ordenadas);
    }

    // monotonicidade: com mesma prioridade e prazo, volume maior pontua mais
    const rica = op({ id: 'x', prioridade: 'P2', volume: 500_000, prazo: '2026-08-20' });
    const pobre = op({ id: 'y', prioridade: 'P2', volume: 5_000, prazo: '2026-08-20' });
    assert.ok(pontuarOportunidade(rica, hoje) > pontuarOportunidade(pobre, hoje));
  });
});
