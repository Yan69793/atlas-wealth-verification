/**
 * coverage.test.ts — a regra transversal da camada de inteligência.
 *
 * Cobertura é a trava contra o modo de falha que produziu os doze defeitos de
 * agosto: tela confiante sobre dado que não a sustenta. Sem ela, "esta
 * carteira não tem exposição a câmbio" e "não sei classificar 60% desta
 * carteira" produzem exatamente a mesma tela.
 *
 * O que estes testes travam:
 * - cobertura é medida em FRAÇÃO DO PL, não em contagem de posições;
 * - os cortes são os do dono (70% afirma, 40% ressalva) e vivem em thresholds;
 * - PL zero não vira NaN, que na tela viraria "—" e passaria por "sem risco";
 * - a agregação da casa é R$ sobre R$, não média de frações.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  coberturaDaCarteira,
  coberturaDaCasa,
  coberturaDoAtributo,
  coberturaPorCarteira,
  faixaDeCobertura,
  piorFaixa,
  podeAfirmar,
} from '../src/intel/coverage.js';
import { THRESHOLDS } from '../src/snapshot/thresholds.js';
import type { AtributosAtivo, Snapshot, SnapshotCarteira } from '../src/snapshot/types.js';

const VAZIO: AtributosAtivo = {
  classeCanonica: null,
  indexador: null,
  taxaContratada: null,
  emissorId: null,
  emissorNome: null,
  moeda: null,
  regiao: null,
  prazoAnos: null,
  liquidezDias: null,
  cobertoFGC: null,
};

function pos(ativo: string, valor: number, attrs: Partial<AtributosAtivo> = {}) {
  return {
    carteira: 'ALFA',
    ativo,
    classe: null,
    valor,
    vencimento: null,
    quantidade: null,
    instituicao: null,
    atributos: { ...VAZIO, ...attrs },
  };
}

function carteira(nome: string, posicoes: ReturnType<typeof pos>[]): SnapshotCarteira {
  return {
    nome,
    plTotal: posicoes.reduce((a, p) => a + p.valor, 0),
    posicoes: posicoes.map((p) => ({ ...p, carteira: nome })),
  };
}

function snapshot(carteiras: SnapshotCarteira[]): Snapshot {
  return {
    schema: 'snapshot/v1',
    data: '2026-08-24',
    periodo: 'diario',
    fonte: 'teste',
    geradoEm: '2026-08-24T12:00:00Z',
    engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
    carteiras,
  };
}

describe('faixas de cobertura', () => {
  it('os cortes são os que o dono fechou em 2026-08-24', () => {
    assert.equal(THRESHOLDS.coberturaAfirmaMin, 0.7);
    assert.equal(THRESHOLDS.coberturaRessalvaMin, 0.4);
  });

  it('bordas são inclusivas para cima, igual ao resto do motor', () => {
    assert.equal(faixaDeCobertura(0.7), 'afirma');
    assert.equal(faixaDeCobertura(0.6999), 'ressalva');
    assert.equal(faixaDeCobertura(0.4), 'ressalva');
    assert.equal(faixaDeCobertura(0.3999), 'insuficiente');
    assert.equal(faixaDeCobertura(1), 'afirma');
    assert.equal(faixaDeCobertura(0), 'insuficiente');
  });

  it('NaN é insuficiente, nunca permissão', () => {
    assert.equal(faixaDeCobertura(NaN), 'insuficiente');
    assert.equal(podeAfirmar(NaN), false);
  });

  it('nada medido não é permissão para afirmar', () => {
    assert.equal(piorFaixa([]), 'insuficiente');
  });

  it('a pior faixa manda no conjunto', () => {
    assert.equal(piorFaixa(['afirma', 'afirma', 'ressalva']), 'ressalva');
    assert.equal(piorFaixa(['afirma', 'insuficiente']), 'insuficiente');
    assert.equal(piorFaixa(['afirma', 'afirma']), 'afirma');
  });
});

describe('cobertura é fração do PL, não contagem de posições', () => {
  it('muitas posições pequenas classificadas não maquiam uma gigante sem classe', () => {
    // 40 posições de R$ 1.000 com indexador + 1 posição de R$ 960.000 sem.
    const pequenas = Array.from({ length: 40 }, (_, i) => pos(`P${i}`, 1_000, { indexador: 'CDI' }));
    const c = carteira('ALFA', [...pequenas, pos('GIGANTE', 960_000)]);

    const porPosicao = 40 / 41; // o que uma contagem ingênua diria: 97,6%
    const fracao = coberturaDoAtributo(c, 'indexador');

    assert.ok(porPosicao > 0.97);
    assert.equal(fracao, 40_000 / 1_000_000);
    assert.equal(faixaDeCobertura(fracao), 'insuficiente');
  });

  it('carteira toda classificada dá 100%', () => {
    const c = carteira('ALFA', [
      pos('A', 500_000, { indexador: 'CDI' }),
      pos('B', 500_000, { indexador: 'IPCA' }),
    ]);
    assert.equal(coberturaDoAtributo(c, 'indexador'), 1);
  });

  it('PL zero devolve 0 e insuficiente, nunca NaN', () => {
    const c = carteira('VAZIA', []);
    assert.equal(c.plTotal, 0);
    assert.equal(coberturaDoAtributo(c, 'indexador'), 0);
    const cob = coberturaDaCarteira(c);
    assert.equal(cob.faixaGlobal, 'insuficiente');
    for (const a of cob.atributos) {
      assert.ok(Number.isFinite(a.fracao), `${a.atributo} virou ${a.fracao}`);
      assert.equal(a.fracao, 0);
    }
  });
});

describe('liquidezDias 0 conta como conhecido', () => {
  it('D+0 é o papel mais líquido que existe e não pode virar buraco', () => {
    const c = carteira('ALFA', [pos('CAIXA', 100_000, { liquidezDias: 0 })]);
    assert.equal(coberturaDoAtributo(c, 'liquidezDias'), 1);
  });
});

describe('cobertura por carteira', () => {
  it('faixa global é a pior entre os atributos, não a média', () => {
    const c = carteira('ALFA', [
      pos('A', 1_000_000, {
        classeCanonica: 'renda-fixa',
        indexador: 'CDI',
        emissorId: 'x',
        moeda: 'BRL',
        regiao: 'brasil',
        prazoAnos: 2,
        // liquidezDias fica null: um atributo furado derruba a faixa global
      }),
    ]);
    const cob = coberturaDaCarteira(c);
    assert.equal(cob.faixaGlobal, 'insuficiente');
    assert.ok(cob.fracaoMedia > 0.8, 'a media segue alta, e por isso ela nao decide');
  });

  it('a lista sai com a pior cobertura primeiro, que é a fila de trabalho do mapa', () => {
    const boa = carteira('BOA', [
      pos('A', 100, {
        classeCanonica: 'acoes',
        indexador: 'BOLSA',
        emissorId: 'x',
        moeda: 'BRL',
        regiao: 'brasil',
        prazoAnos: 0,
        liquidezDias: 1,
      }),
    ]);
    const ruim = carteira('RUIM', [pos('B', 100)]);
    const ordem = coberturaPorCarteira(snapshot([boa, ruim])).map((c) => c.carteira);
    assert.deepEqual(ordem, ['RUIM', 'BOA']);
  });
});

describe('cobertura da casa', () => {
  it('soma R$ sobre R$, não média de frações', () => {
    // Carteira minúscula perfeita + carteira enorme vazia.
    const perfeita = carteira('PEQUENA', [pos('A', 50_000, { indexador: 'CDI' })]);
    const vazia = carteira('GRANDE', [pos('B', 50_000_000)]);
    const casa = coberturaDaCasa(snapshot([perfeita, vazia]));
    const indexador = casa.atributos.find((a) => a.atributo === 'indexador')!;

    // Média das frações diria 50%. A verdade é ~0,1%.
    assert.ok(indexador.fracao < 0.002, `veio ${indexador.fracao}`);
    assert.equal(indexador.faixa, 'insuficiente');
    assert.equal(casa.plTotal, 50_050_000);
    assert.equal(casa.carteiras, 2);
  });

  it('casa sem carteira nenhuma não quebra', () => {
    const casa = coberturaDaCasa(snapshot([]));
    assert.equal(casa.plTotal, 0);
    assert.equal(casa.faixaGlobal, 'insuficiente');
  });
});
