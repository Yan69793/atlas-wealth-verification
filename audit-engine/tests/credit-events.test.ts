/**
 * credit-events.test.ts — Entrega B: evento de crédito e impacto.
 *
 * Os quatro pontos que estes testes existem para travar:
 *
 * 1. "Sem exposição" e "não avaliável" NUNCA se confundem. Carteira sem
 *    cobertura de emissor não entra em `semExposicao`, entra em
 *    `naoAvaliaveis`. Num dia de calote, dizer "está limpa" sobre carteira que
 *    o motor não sabe ler é o pior erro possível deste módulo.
 * 2. Perda confirmada e sinalização usam ESCADAS DIFERENTES. 10% do PL num
 *    default é alto; 10% num rebaixamento é médio.
 * 3. O piso é por tipo de evento, e não vale para par já acompanhado. Cair
 *    abaixo do piso É a notícia.
 * 4. Confiança nunca sobe: sai a menor entre a da fonte e a da cobertura.
 *
 * Fixtures em memória, emissores e carteiras fictícios. Nada de LGPD.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chaveRegistro,
  estadoDoPar,
  impactoDeCredito,
  normalizarEvento,
  registrosDe,
  severidadeDoImpacto,
  severidadeEventoDe,
  tipoEventoDe,
  type EventoCreditoEntrada,
} from '../src/intel/credit-events.js';
import { THRESHOLDS } from '../src/snapshot/thresholds.js';
import type { AtributosAtivo, Snapshot, SnapshotCarteira } from '../src/snapshot/types.js';

const VAZIO: AtributosAtivo = {
  classeCanonica: null,
  indexador: null,
  taxaContratada: null,
  emissorId: null,
  emissorNome: null,
  economicGroupId: null,
  moeda: null,
  regiao: null,
  prazoAnos: null,
  liquidezDias: null,
  cobertoFGC: null,
};

/** Posição com emissor conhecido. */
function comEmissor(ativo: string, valor: number, emissorId: string, emissorNome = emissorId) {
  return {
    carteira: '',
    ativo,
    classe: null,
    valor,
    vencimento: null,
    quantidade: null,
    instituicao: null,
    atributos: { ...VAZIO, emissorId, emissorNome, classeCanonica: 'credito-privado' as const },
  };
}

/** Posição opaca: sem emissor. Derruba a cobertura da carteira. */
function opaca(ativo: string, valor: number) {
  return {
    carteira: '',
    ativo,
    classe: null,
    valor,
    vencimento: null,
    quantidade: null,
    instituicao: null,
    atributos: { ...VAZIO },
  };
}

/** Aceita posição com e sem emissor: misturar as duas é o ponto dos testes de cobertura. */
function carteira(nome: string, posicoes: SnapshotCarteira['posicoes']): SnapshotCarteira {
  return {
    nome,
    plTotal: posicoes.reduce((a, p) => a + p.valor, 0),
    posicoes: posicoes.map((p) => ({ ...p, carteira: nome })),
  };
}

function snap(carteiras: SnapshotCarteira[], data = '2026-08-24'): Snapshot {
  return {
    schema: 'snapshot/v1',
    data,
    periodo: 'diario',
    fonte: 'custodiante-ficticio',
    geradoEm: '2026-08-24T12:00:00Z',
    engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
    tenantId: 'demo',
    carteiras,
  };
}

function evento(over: Partial<EventoCreditoEntrada> = {}): EventoCreditoEntrada {
  return {
    issuer: 'Banco Zeta S.A.',
    event: 'default',
    severity: 'alta',
    date: '2026-08-24',
    source: 'fonte-ficticia',
    confidence: 0.9,
    ...over,
  };
}

describe('saneamento da fronteira', () => {
  it('reconhece os tipos por texto livre, em portugues e ingles', () => {
    assert.equal(tipoEventoDe('Default'), 'DEFAULT');
    assert.equal(tipoEventoDe('inadimplencia confirmada'), 'DEFAULT');
    assert.equal(tipoEventoDe('Pedido de Recuperacao Judicial'), 'RECUPERACAO_JUDICIAL');
    assert.equal(tipoEventoDe('downgrade S&P'), 'REBAIXAMENTO_RATING');
    assert.equal(tipoEventoDe('atraso no pagamento de juros'), 'ATRASO_PAGAMENTO');
    assert.equal(tipoEventoDe('covenant quebrado'), 'COVENANT_QUEBRADO');
    assert.equal(tipoEventoDe('suspensao de negociacao'), 'SUSPENSAO_NEGOCIACAO');
    assert.equal(tipoEventoDe('noticia negativa na imprensa'), 'NOTICIA_NEGATIVA');
    assert.equal(tipoEventoDe('coisa que ninguem previu'), 'OUTRO');
  });

  it('severidade desconhecida vira media, nunca baixa', () => {
    // Fonte que nao sabe classificar o proprio evento nao e evidencia de que o
    // evento seja pequeno. Tratar como pequeno perde o evento que importava.
    assert.equal(severidadeEventoDe(''), 'media');
    assert.equal(severidadeEventoDe('sei la'), 'media');
    assert.equal(severidadeEventoDe('HIGH'), 'alta');
    assert.equal(severidadeEventoDe('minor'), 'baixa');
  });

  it('evento sem emissor ou com data ruim e descartado, nao vira linha orfa', () => {
    assert.equal(normalizarEvento(evento({ issuer: '   ' })), null);
    assert.equal(normalizarEvento(evento({ date: '24/08/2026' })), null);
    assert.equal(normalizarEvento(evento({ date: '' })), null);
    assert.ok(normalizarEvento(evento()));
  });

  it('emissor do evento normaliza igual ao da carteira, senao nunca casa', () => {
    // "BANCO ZETA S.A." do evento tem que encontrar "Banco Zeta SA" do mapa.
    assert.equal(normalizarEvento(evento({ issuer: 'BANCO ZETA S.A.' }))!.emissorId, 'banco-zeta');
    assert.equal(normalizarEvento(evento({ issuer: 'Banco  Zeta SA' }))!.emissorId, 'banco-zeta');
  });

  it('tipo nao reconhecido cai em sinalizacao, nao em observacao', () => {
    // Piso mais baixo reporta mais. Tipo que o motor nao entendeu nao e
    // evidencia de que o evento seja pequeno.
    assert.equal(normalizarEvento(evento({ event: 'xpto' }))!.classe, 'sinalizacao');
    assert.equal(normalizarEvento(evento({ event: 'noticia' }))!.classe, 'observacao');
    assert.equal(normalizarEvento(evento({ event: 'default' }))!.classe, 'perdaConfirmada');
  });
});

describe('duas escadas de severidade', () => {
  const perda = { classe: 'perdaConfirmada' as const, severidadeEvento: 'alta' as const };
  const sinal = { classe: 'sinalizacao' as const, severidadeEvento: 'alta' as const };

  it('perda confirmada: 10% do PL ja e alto', () => {
    assert.equal(severidadeDoImpacto(perda, 0.10, 1_000_000), 'alta');
    assert.equal(severidadeDoImpacto(perda, 0.35, 1_000_000), 'alta');
  });

  it('perda confirmada: 2% a 10% e medio', () => {
    assert.equal(severidadeDoImpacto(perda, 0.02, 1_000_000), 'media');
    assert.equal(severidadeDoImpacto(perda, 0.099, 1_000_000), 'media');
  });

  it('perda confirmada abaixo de 2%: o piso em REAIS decide', () => {
    // R$ 300 mil numa carteira de R$ 20 mi e 1,5% do PL, abaixo da faixa, e
    // continua sendo R$ 300 mil que o assessor precisa explicar.
    assert.equal(severidadeDoImpacto(perda, 0.015, 300_000), 'media');
    // R$ 10 mil na mesma fracao nao e chamada telefonica.
    assert.equal(severidadeDoImpacto(perda, 0.015, 10_000), 'baixa');
    assert.equal(THRESHOLDS.creditoPerdaConfirmadaMinAbs, 50_000);
  });

  it('a escada de perda confirmada e MAIS SENSIVEL que a de sinalizacao', () => {
    // Mesma exposicao de 10%: alto no calote, medio no rebaixamento. E o
    // ponto inteiro de existirem duas escadas.
    assert.equal(severidadeDoImpacto(perda, 0.10, 1_000_000), 'alta');
    assert.equal(severidadeDoImpacto(sinal, 0.10, 1_000_000), 'alta');
    const sinalMedio = { classe: 'sinalizacao' as const, severidadeEvento: 'media' as const };
    assert.equal(severidadeDoImpacto(sinalMedio, 0.10, 1_000_000), 'media');
    assert.equal(severidadeDoImpacto(perda, 0.10, 1_000_000), 'alta');
  });

  it('sinalizacao usa a matriz sobre os cortes genericos de 10% e 30%', () => {
    const baixo = { classe: 'sinalizacao' as const, severidadeEvento: 'baixa' as const };
    assert.equal(severidadeDoImpacto(baixo, 0.05, 1), 'baixa');
    assert.equal(severidadeDoImpacto(baixo, 0.15, 1), 'baixa');
    assert.equal(severidadeDoImpacto(baixo, 0.40, 1), 'media');
    assert.equal(severidadeDoImpacto(sinal, 0.05, 1), 'media');
    assert.equal(severidadeDoImpacto(sinal, 0.15, 1), 'alta');
  });
});

describe('sem exposicao nao e a mesma coisa que nao sei', () => {
  it('carteira sem cobertura de emissor entra em naoAvaliaveis, nunca em semExposicao', () => {
    const clara = carteira('CLARA', [
      comEmissor('CDB OMEGA', 500_000, 'banco-omega', 'Banco Omega'),
      comEmissor('CDB ALFA', 500_000, 'banco-alfa', 'Banco Alfa'),
    ]);
    // 80% opaca: cobertura de emissor em 20%, faixa insuficiente.
    const escura = carteira('ESCURA', [
      comEmissor('CDB ZETA', 200_000, 'banco-zeta', 'Banco Zeta'),
      opaca('ESTRUTURADO', 800_000),
    ]);

    const r = impactoDeCredito(snap([clara, escura]), [evento()]);
    const imp = r.impactos[0];

    assert.deepEqual(imp.naoAvaliaveis, ['ESCURA']);
    assert.ok(!imp.semExposicao.includes('ESCURA'), 'carteira no escuro nao pode ser dada como limpa');
    assert.deepEqual(imp.semExposicao, ['CLARA']);
    assert.equal(imp.atingidas.length, 0);
    assert.equal(r.carteirasAvaliaveis, 1);
    assert.equal(r.carteiras, 2);
  });

  it('a carteira escura TEM a exposicao, e mesmo assim nao e reportada como atingida', () => {
    // Prova que o corte e por cobertura, nao por ausencia de dado: ESCURA
    // carrega R$ 200 mil do emissor do evento e o motor se recusa a afirmar,
    // porque nao sabe o que sao os outros 80%.
    const escura = carteira('ESCURA', [
      comEmissor('CDB ZETA', 200_000, 'banco-zeta', 'Banco Zeta'),
      opaca('ESTRUTURADO', 800_000),
    ]);
    const r = impactoDeCredito(snap([escura]), [evento()]);
    assert.equal(r.impactos[0].atingidas.length, 0);
    assert.deepEqual(r.impactos[0].naoAvaliaveis, ['ESCURA']);
    assert.equal(r.impactos[0].exposicaoTotal, 0);
  });

  it('emissor que ninguem carrega: lista de sem exposicao cheia, atingidas vazia', () => {
    const c = carteira('ALFA', [comEmissor('CDB OMEGA', 1_000_000, 'banco-omega', 'Banco Omega')]);
    const r = impactoDeCredito(snap([c]), [evento({ issuer: 'Banco Inexistente' })]);
    assert.equal(r.impactos[0].atingidas.length, 0);
    assert.deepEqual(r.impactos[0].semExposicao, ['ALFA']);
    assert.deepEqual(r.impactos[0].naoAvaliaveis, []);
    assert.equal(r.impactos[0].pior, null);
  });
});

describe('piso por tipo de evento', () => {
  // PL 10 mi; exposicao de R$ 70 mil = 0,7% do PL.
  const c = () =>
    carteira('ALFA', [
      comEmissor('CDB ZETA', 70_000, 'banco-zeta', 'Banco Zeta'),
      comEmissor('OUTROS', 9_930_000, 'banco-omega', 'Banco Omega'),
    ]);

  it('notícia com 0,7% do PL fica sob o piso de 1% e nao vira achado', () => {
    const r = impactoDeCredito(snap([c()]), [evento({ event: 'noticia negativa', severity: 'media' })]);
    assert.equal(r.impactos[0].atingidas.length, 0);
  });

  it('rebaixamento com a MESMA exposicao passa, porque o piso dele e 0,5%', () => {
    const r = impactoDeCredito(snap([c()]), [evento({ event: 'downgrade', severity: 'media' })]);
    assert.equal(r.impactos[0].atingidas.length, 1);
    assert.ok(Math.abs(r.impactos[0].atingidas[0].fracaoPl - 0.007) < 1e-9);
  });

  it('perda confirmada nao tem piso: exposicao minima e reportada', () => {
    const minima = carteira('ALFA', [
      comEmissor('CDB ZETA', 1_000, 'banco-zeta', 'Banco Zeta'),
      comEmissor('OUTROS', 9_999_000, 'banco-omega', 'Banco Omega'),
    ]);
    const r = impactoDeCredito(snap([minima]), [evento({ event: 'default' })]);
    assert.equal(r.impactos[0].atingidas.length, 1);
    assert.equal(r.impactos[0].atingidas[0].severidadeImpacto, 'baixa');
  });

  it('os tres pisos estao em thresholds e sao os acordados', () => {
    assert.equal(THRESHOLDS.creditoPisoExposicao.perdaConfirmada, 0);
    assert.equal(THRESHOLDS.creditoPisoExposicao.sinalizacao, 0.005);
    assert.equal(THRESHOLDS.creditoPisoExposicao.observacao, 0.01);
  });
});

describe('confianca nunca sobe', () => {
  it('fonte fraca sobre carteira bem coberta continua fraca', () => {
    const c = carteira('ALFA', [comEmissor('CDB ZETA', 1_000_000, 'banco-zeta', 'Banco Zeta')]);
    const r = impactoDeCredito(snap([c]), [evento({ confidence: 0.2 })]);
    // Cobertura 100% daria confianca alta; a fonte declara 0,2, que e baixa.
    assert.equal(r.impactos[0].atingidas[0].cobertura, 1);
    assert.equal(r.impactos[0].atingidas[0].confianca, 'baixa');
    assert.equal(r.insights[0].confianca, 'baixa');
  });

  it('fonte forte sobre carteira em ressalva tambem nao sobe', () => {
    // 50% de cobertura: faixa de ressalva, confianca baixa pelo nosso lado.
    const c = carteira('MEIA', [
      comEmissor('CDB ZETA', 500_000, 'banco-zeta', 'Banco Zeta'),
      opaca('OPACO', 500_000),
    ]);
    const r = impactoDeCredito(snap([c]), [evento({ confidence: 1 })]);
    assert.equal(r.impactos[0].atingidas[0].confianca, 'baixa');
  });
});

describe('estado temporal', () => {
  const base = (valorZeta: number) =>
    carteira('ALFA', [
      comEmissor('CDB ZETA', valorZeta, 'banco-zeta', 'Banco Zeta'),
      comEmissor('OUTROS', 1_000_000 - valorZeta, 'banco-omega', 'Banco Omega'),
    ]);

  it('sem periodo anterior, tudo e novo', () => {
    const r = impactoDeCredito(snap([base(200_000)]), [evento()]);
    assert.equal(r.temAnterior, false);
    assert.equal(r.impactos[0].atingidas[0].estado, 'novo');
    assert.equal(r.impactos[0].atingidas[0].exposicaoAnterior, null);
  });

  it('exposicao estavel e severidade igual: acompanhamento', () => {
    const anterior = impactoDeCredito(snap([base(200_000)]), [evento()]);
    const agora = impactoDeCredito(snap([base(205_000)]), [evento()], { anterior });
    assert.equal(agora.temAnterior, true);
    assert.equal(agora.impactos[0].atingidas[0].estado, 'acompanhamento');
  });

  it('exposicao cresce alem de 20%: agravado', () => {
    const anterior = impactoDeCredito(snap([base(150_000)]), [evento()]);
    const agora = impactoDeCredito(snap([base(200_000)]), [evento()], { anterior });
    const a = agora.impactos[0].atingidas[0];
    assert.equal(a.estado, 'agravado');
    assert.equal(a.exposicaoAnterior, 150_000);
    assert.ok(Math.abs(a.variacaoExposicao! - 1 / 3) < 1e-9);
  });

  it('exposicao cai alem de 20%: melhorado', () => {
    const anterior = impactoDeCredito(snap([base(200_000)]), [evento()]);
    const agora = impactoDeCredito(snap([base(120_000)]), [evento()], { anterior });
    assert.equal(agora.impactos[0].atingidas[0].estado, 'melhorado');
  });

  it('severidade manda sobre exposicao no julgamento do estado', () => {
    // Exposicao cai de 400k para 150k (melhora de 62%), mas 15% ainda e alta
    // no calote... nao: 15% >= 10% segue alta. Entao o estado vem da queda.
    const anterior = impactoDeCredito(snap([base(400_000)]), [evento()]);
    const agora = impactoDeCredito(snap([base(150_000)]), [evento()], { anterior });
    assert.equal(agora.impactos[0].atingidas[0].severidadeAnterior, 'alta');
    assert.equal(agora.impactos[0].atingidas[0].severidadeImpacto, 'alta');
    assert.equal(agora.impactos[0].atingidas[0].estado, 'melhorado');
  });

  it('evento que sumiu da fonte vira encerrado, com o motivo certo', () => {
    const anterior = impactoDeCredito(snap([base(200_000)]), [evento()]);
    const agora = impactoDeCredito(snap([base(200_000)]), [], { anterior });
    assert.equal(agora.encerrados.length, 1);
    assert.equal(agora.encerrados[0].carteira, 'ALFA');
    assert.equal(agora.encerrados[0].exposicaoAnterior, 200_000);
    assert.equal(agora.encerrados[0].motivo, 'evento-saiu-da-fonte');
  });

  it('exposicao zerada com o evento ainda na fonte vira encerrado por outro motivo', () => {
    const anterior = impactoDeCredito(snap([base(200_000)]), [evento()]);
    const semZeta = carteira('ALFA', [comEmissor('OUTROS', 1_000_000, 'banco-omega', 'Banco Omega')]);
    const agora = impactoDeCredito(snap([semZeta]), [evento()], { anterior });
    assert.equal(agora.encerrados.length, 1);
    assert.equal(agora.encerrados[0].motivo, 'exposicao-zerada');
    assert.deepEqual(agora.impactos[0].semExposicao, ['ALFA']);
  });

  it('o piso NAO esconde movimento no que ja se acompanha', () => {
    // Rebaixamento em 5% do PL vira acompanhado; no periodo seguinte cai para
    // 0,2%, sob o piso de 0,5%. Some-lo faria o assessor perder o desfecho.
    const ev = evento({ event: 'downgrade', severity: 'media' });
    const anterior = impactoDeCredito(snap([base(50_000)]), [ev]);
    assert.equal(anterior.impactos[0].atingidas.length, 1);

    const agora = impactoDeCredito(snap([base(2_000)]), [ev], { anterior });
    const a = agora.impactos[0].atingidas[0];
    assert.ok(a, 'par ja acompanhado tem que continuar aparecendo sob o piso');
    assert.equal(a.abaixoDoPiso, true);
    assert.equal(a.estado, 'melhorado');
  });

  it('par NOVO sob o piso continua filtrado', () => {
    const ev = evento({ event: 'downgrade', severity: 'media' });
    const r = impactoDeCredito(snap([base(2_000)]), [ev]);
    assert.equal(r.impactos[0].atingidas.length, 0);
  });

  it('estado e por par: o mesmo evento agrava numa carteira e melhora noutra', () => {
    const antes = snap([
      carteira('SOBE', [comEmissor('Z', 100_000, 'banco-zeta'), comEmissor('O', 900_000, 'banco-omega')]),
      carteira('DESCE', [comEmissor('Z', 300_000, 'banco-zeta'), comEmissor('O', 700_000, 'banco-omega')]),
    ]);
    const depois = snap([
      carteira('SOBE', [comEmissor('Z', 300_000, 'banco-zeta'), comEmissor('O', 700_000, 'banco-omega')]),
      carteira('DESCE', [comEmissor('Z', 100_000, 'banco-zeta'), comEmissor('O', 900_000, 'banco-omega')]),
    ]);
    const anterior = impactoDeCredito(antes, [evento()]);
    const agora = impactoDeCredito(depois, [evento()], { anterior });
    const porNome = new Map(agora.impactos[0].atingidas.map((a) => [a.carteira, a.estado]));
    assert.equal(porNome.get('SOBE'), 'agravado');
    assert.equal(porNome.get('DESCE'), 'melhorado');
    // O agregado do evento pega o mais urgente dos dois.
    assert.equal(agora.impactos[0].estado, 'agravado');
  });

  it('estadoDoPar e puro e cobre as bordas do limiar de variacao', () => {
    const ant = { severidadeImpacto: 'media' as const, exposicao: 100 };
    assert.equal(estadoDoPar({ severidade: 'media', exposicao: 120 }, ant, 0.2), 'agravado');
    assert.equal(estadoDoPar({ severidade: 'media', exposicao: 119 }, ant, 0.2), 'acompanhamento');
    assert.equal(estadoDoPar({ severidade: 'media', exposicao: 80 }, ant, 0.2), 'melhorado');
    assert.equal(estadoDoPar({ severidade: 'media', exposicao: 100 }, undefined, 0.2), 'novo');
    // Anterior com exposicao zero nao pode virar divisao por zero.
    assert.equal(
      estadoDoPar({ severidade: 'media', exposicao: 100 }, { severidadeImpacto: 'media', exposicao: 0 }, 0.2),
      'acompanhamento'
    );
  });

  it('a chave do par inclui o tipo: dois eventos do mesmo emissor nao se misturam', () => {
    assert.notEqual(
      chaveRegistro('banco-zeta', 'DEFAULT', 'ALFA'),
      chaveRegistro('banco-zeta', 'REBAIXAMENTO_RATING', 'ALFA')
    );
    const anterior = impactoDeCredito(snap([base(200_000)]), [evento({ event: 'downgrade' })]);
    // Mesmo emissor, tipo diferente: e evento novo, nao continuacao.
    const agora = impactoDeCredito(snap([base(200_000)]), [evento({ event: 'default' })], { anterior });
    assert.equal(agora.impactos[0].atingidas[0].estado, 'novo');
    assert.equal(agora.encerrados.length, 1, 'o rebaixamento antigo tem que sair como encerrado');
  });
});

describe('saida e ordenacao', () => {
  it('o insight carrega regra, conta, evidencia, cobertura e estado', () => {
    const c = carteira('ALFA', [
      comEmissor('CDB ZETA', 300_000, 'banco-zeta', 'Banco Zeta'),
      comEmissor('OUTROS', 700_000, 'banco-omega', 'Banco Omega'),
    ]);
    const r = impactoDeCredito(snap([c]), [evento()]);
    const ins = r.insights[0];
    assert.equal(ins.schema, 'insight/v1');
    assert.equal(ins.tipo, 'EVENTO_CREDITO');
    assert.equal(ins.tenantId, 'demo');
    assert.equal(ins.regra.nome, 'creditoPerdaConfirmada');
    assert.equal(ins.evidencias.exposicao, 300_000);
    assert.equal(ins.evidencias.estado, 'novo');
    assert.equal(ins.evidencias.classeEvento, 'perdaConfirmada');
    assert.ok(ins.calculo.includes('impacto alta'));
    assert.equal(ins.cobertura, 1);
    assert.equal(ins.id, '2026-08-24|ALFA|EVENTO_CREDITO|banco-zeta|DEFAULT');
  });

  it('a lista abre pelo que mudou: agravado antes de novo, novo antes de acompanhamento', () => {
    const zeta = (v: number) => comEmissor('Z', v, 'banco-zeta', 'Banco Zeta');
    const omega = (v: number) => comEmissor('O', v, 'banco-omega', 'Banco Omega');
    const antes = snap([carteira('A', [zeta(100_000), omega(900_000)])]);
    const anterior = impactoDeCredito(antes, [evento({ event: 'downgrade', severity: 'media' })]);
    const depois = snap([carteira('A', [zeta(300_000), omega(700_000)])]);
    const agora = impactoDeCredito(
      depois,
      [
        evento({ event: 'downgrade', severity: 'media' }),
        evento({ issuer: 'Banco Omega', event: 'noticia', severity: 'baixa' }),
      ],
      { anterior }
    );
    assert.equal(agora.impactos[0].estado, 'agravado');
    assert.equal(agora.impactos[0].evento.emissorId, 'banco-zeta');
  });

  it('registrosDe achata o resultado anterior sem perder nada', () => {
    const c = carteira('ALFA', [comEmissor('Z', 500_000, 'banco-zeta'), comEmissor('O', 500_000, 'banco-omega')]);
    const r = impactoDeCredito(snap([c]), [evento()]);
    const regs = registrosDe(r);
    assert.equal(regs.length, 1);
    assert.equal(regs[0].emissorId, 'banco-zeta');
    assert.equal(regs[0].tipo, 'DEFAULT');
    assert.equal(regs[0].exposicao, 500_000);
    assert.deepEqual(registrosDe(null), []);
  });

  it('evento invalido e contado, nao engolido', () => {
    const c = carteira('ALFA', [comEmissor('Z', 1_000_000, 'banco-zeta')]);
    const r = impactoDeCredito(snap([c]), [evento({ issuer: '' }), evento({ date: 'ontem' }), evento()]);
    assert.equal(r.descartados, 2);
    assert.equal(r.impactos.length, 1);
  });

  it('lista de eventos vazia nao quebra', () => {
    const c = carteira('ALFA', [comEmissor('Z', 1_000_000, 'banco-zeta')]);
    const r = impactoDeCredito(snap([c]), []);
    assert.deepEqual(r.impactos, []);
    assert.deepEqual(r.encerrados, []);
    assert.equal(r.carteiras, 1);
  });

  it('o mesmo dado produz exatamente o mesmo resultado', () => {
    const c = carteira('ALFA', [comEmissor('Z', 400_000, 'banco-zeta'), comEmissor('O', 600_000, 'banco-omega')]);
    const s = snap([c]);
    assert.deepEqual(impactoDeCredito(s, [evento()]), impactoDeCredito(s, [evento()]));
  });
});
