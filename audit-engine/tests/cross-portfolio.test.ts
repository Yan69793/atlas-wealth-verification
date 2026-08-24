/**
 * cross-portfolio.test.ts — Radar de Carteiras (visão cruzada).
 *
 * Cada teste reproduz um caso concreto, com número, do jeito que as ondas de
 * agosto travaram as correções. Os quatro que mais importam:
 *
 * 1. Concentração ESCONDIDA: três papéis de nomes diferentes do mesmo banco.
 *    Nenhum passa do limiar sozinho, o emissor passa. É o risco que a tela de
 *    posições não mostra.
 * 2. Carteira que PARECE diversificada: cinco ativos distintos, todos no mesmo
 *    indexador. Diversificação de nome, concentração de fator.
 * 3. Severidade de liquidez baixa medida sobre o DÉFICIT, não sobre o PL.
 *    Sobre o PL seria "baixa" sempre, por construção. É a repetição exata do
 *    defeito da queda de receita corrigido na Onda 2.
 * 4. Cobertura insuficiente CALA o motor em vez de deixá-lo afirmar sobre
 *    patrimônio que ele não classificou.
 *
 * Fixtures em memória, custodiante e carteiras fictícios. Nada de LGPD.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { baseDaDeterioracao, radarCruzado } from '../src/intel/cross-portfolio.js';
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

/** Jogo completo de atributos: usado quando o teste quer cobertura cheia. */
function completo(extra: Partial<AtributosAtivo> = {}): AtributosAtivo {
  return {
    ...VAZIO,
    classeCanonica: 'renda-fixa',
    indexador: 'CDI',
    emissorId: 'generico',
    emissorNome: 'Generico',
    moeda: 'BRL',
    regiao: 'brasil',
    prazoAnos: 2,
    liquidezDias: 30,
    ...extra,
  };
}

function pos(ativo: string, valor: number, attrs: AtributosAtivo, vencimento: string | null = null) {
  return {
    carteira: '',
    ativo,
    classe: null,
    valor,
    vencimento,
    quantidade: null,
    instituicao: null,
    atributos: attrs,
  };
}

function carteira(nome: string, posicoes: ReturnType<typeof pos>[]): SnapshotCarteira {
  return {
    nome,
    plTotal: posicoes.reduce((a, p) => a + p.valor, 0),
    posicoes: posicoes.map((p) => ({ ...p, carteira: nome })),
  };
}

function snap(data: string, carteiras: SnapshotCarteira[]): Snapshot {
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

const sinaisDe = (r: ReturnType<typeof radarCruzado>, nome: string) =>
  r.carteiras.find((c) => c.carteira === nome)?.sinais ?? [];

describe('concentração escondida por emissor', () => {
  it('três papéis de nomes diferentes do mesmo banco: nenhum sozinho passa, o emissor passa', () => {
    // PL 1.000.000. Cada papel do BANCO ZETA vale 12% (abaixo dos 20% do
    // limiar de ativo). Somados dão 36%, acima dos 15% do limiar de emissor.
    const zeta = completo({ emissorId: 'banco-zeta', emissorNome: 'Banco Zeta' });
    const outro = completo({ emissorId: 'banco-omega', emissorNome: 'Banco Omega' });
    const gestora = (n: number) =>
      completo({ emissorId: `gestora-${n}`, emissorNome: `Gestora ${n}`, classeCanonica: 'liquidez' });
    const c = carteira('ALFA', [
      pos('CDB ZETA 2027', 120_000, zeta),
      pos('LCI ZETA 2028', 120_000, zeta),
      pos('LF ZETA 2029', 120_000, zeta),
      pos('CDB OMEGA A', 130_000, outro),
      pos('CDB OMEGA B', 130_000, outro),
      // O caixa vai repartido de propósito: um fundo único de R$ 380 mil seria
      // 38% do PL e dispararia CONCENTRACAO_ATIVO, embaralhando o que este
      // teste quer isolar.
      pos('FUNDO DI A', 130_000, gestora(1)),
      pos('FUNDO DI B', 130_000, gestora(2)),
      pos('FUNDO DI C', 120_000, gestora(3)),
    ]);
    const r = radarCruzado([snap('2026-08-24', [c])]);
    const sinais = sinaisDe(r, 'ALFA');

    const porAtivo = sinais.filter((s) => s.tipo === 'CONCENTRACAO_ATIVO');
    const porEmissor = sinais.filter((s) => s.tipo === 'CONCENTRACAO_EMISSOR');

    assert.equal(porAtivo.length, 0, 'nenhum ativo sozinho passa de 20%');
    const zetaSinal = porEmissor.find((s) => s.rotulo === 'Banco Zeta');
    assert.ok(zetaSinal, 'o emissor concentrado tem que aparecer');
    assert.equal(zetaSinal!.valor, 360_000);
    assert.ok(Math.abs(zetaSinal!.fracaoPl - 0.36) < 1e-9);
    assert.equal(zetaSinal!.severidade, 'alta'); // 36% >= mediaMax 30%
  });

  it('o insight carrega regra, conta, evidência e cobertura', () => {
    const zeta = completo({ emissorId: 'banco-zeta', emissorNome: 'Banco Zeta' });
    const c = carteira('ALFA', [
      pos('CDB ZETA', 400_000, zeta),
      pos('FUNDO', 600_000, completo({ emissorId: 'gestora-x', emissorNome: 'Gestora X' })),
    ]);
    const r = radarCruzado([snap('2026-08-24', [c])]);
    const ins = r.insights.find((i) => i.tipo === 'CONCENTRACAO_EMISSOR')!;

    assert.equal(ins.schema, 'insight/v1');
    assert.equal(ins.tenantId, 'demo');
    assert.equal(ins.regra.nome, 'radarConcentracaoEmissorPct');
    assert.equal(ins.regra.limiar.radarConcentracaoEmissorPct, THRESHOLDS.radarConcentracaoEmissorPct);
    assert.ok(ins.calculo.includes('/'), 'a conta precisa estar legivel');
    assert.equal(ins.evidencias.valor, 400_000);
    assert.equal(ins.evidencias.plTotal, 1_000_000);
    assert.equal(ins.cobertura, 1);
    assert.equal(ins.faixaCobertura, 'afirma');
    assert.equal(ins.fonte.fonte, 'custodiante-ficticio');
    assert.equal(ins.fonte.data, '2026-08-24');
    assert.equal(ins.id, '2026-08-24|ALFA|CONCENTRACAO_EMISSOR|banco-zeta');
  });
});

describe('carteira que parece diversificada e não é', () => {
  it('cinco ativos distintos, todos no mesmo indexador: fator concentrado', () => {
    const cdi = (n: string, v: number) =>
      pos(n, v, completo({ indexador: 'CDI', emissorId: 'e-' + n, emissorNome: 'Emissor ' + n }));
    const acao = (n: string, v: number) =>
      pos(n, v, completo({ indexador: 'BOLSA', classeCanonica: 'acoes', emissorId: 'e-' + n, emissorNome: 'Emissor ' + n }));
    // Sete papéis de 12% e dois de 8%: ninguém passa dos 20% de ativo nem dos
    // 15% de emissor. A única coisa que passa é o fator.
    const c = carteira('BETA', [
      cdi('CDB A', 120_000),
      cdi('CDB B', 120_000),
      cdi('LCI C', 120_000),
      cdi('DEB D', 120_000),
      cdi('FUNDO E', 120_000),
      cdi('LF F', 120_000),
      cdi('CRA G', 120_000),
      acao('ACAO H', 80_000),
      acao('ACAO I', 80_000),
    ]);
    const r = radarCruzado([snap('2026-08-24', [c])]);
    const sinais = sinaisDe(r, 'BETA');

    assert.equal(sinais.filter((s) => s.tipo === 'CONCENTRACAO_ATIVO').length, 0);
    assert.equal(sinais.filter((s) => s.tipo === 'CONCENTRACAO_EMISSOR').length, 0);

    const fator = sinais.find((s) => s.tipo === 'CONCENTRACAO_FATOR' && s.fator === 'indexador' && s.rotulo === 'CDI');
    assert.ok(fator, 'o fator comum tem que aparecer');
    assert.equal(fator!.valor, 840_000);
    assert.ok(Math.abs(fator!.fracaoPl - 0.84) < 1e-9);
  });

  it('estar 100% em BRL e no Brasil não vira alarme: é a linha de base', () => {
    // Sem esta regra, CONCENTRACAO_FATOR dispararia em moeda e região em
    // praticamente toda carteira brasileira, todo mês, e a tela viraria ruído.
    const c = carteira('DOMESTICA', [
      pos('A', 300_000, completo({ indexador: 'CDI', moeda: 'BRL', regiao: 'brasil', emissorId: 'e1', emissorNome: 'E1' })),
      pos('B', 300_000, completo({ indexador: 'IPCA', moeda: 'BRL', regiao: 'brasil', emissorId: 'e2', emissorNome: 'E2' })),
      pos('C', 300_000, completo({ indexador: 'PRE', moeda: 'BRL', regiao: 'brasil', emissorId: 'e3', emissorNome: 'E3' })),
      pos('CAIXA', 100_000, completo({ classeCanonica: 'liquidez', moeda: 'BRL', regiao: 'brasil', emissorId: 'e4', emissorNome: 'E4' })),
    ]);
    const r = radarCruzado([snap('2026-08-24', [c])]);
    const fatores = sinaisDe(r, 'DOMESTICA').filter((s) => s.tipo === 'CONCENTRACAO_FATOR');
    assert.equal(fatores.filter((f) => f.fator === 'moeda').length, 0);
    assert.equal(fatores.filter((f) => f.fator === 'regiao').length, 0);

    // O dado não some, só deixa de alarmar: continua na tabela da casa.
    assert.ok(r.fatores.some((f) => f.fator === 'moeda' && f.valor === 'BRL'));
  });

  it('moeda estrangeira concentrada continua sendo alarme', () => {
    // 80% em USD: calibrado em 2026-08-24 para folga de 10pp sobre o novo
    // limiar de 70% (era 60%/50%, folga de 10pp sobre o antigo).
    const c = carteira('OFFSHORE', [
      pos('A', 800_000, completo({ moeda: 'USD', regiao: 'eua', classeCanonica: 'internacional', emissorId: 'e1', emissorNome: 'E1' })),
      pos('B', 100_000, completo({ moeda: 'BRL', emissorId: 'e2', emissorNome: 'E2' })),
      pos('C', 100_000, completo({ moeda: 'BRL', emissorId: 'e3', emissorNome: 'E3' })),
    ]);
    const fatores = sinaisDe(radarCruzado([snap('2026-08-24', [c])]), 'OFFSHORE').filter(
      (s) => s.tipo === 'CONCENTRACAO_FATOR'
    );
    assert.ok(fatores.some((f) => f.fator === 'moeda' && f.rotulo === 'USD'));
    assert.ok(fatores.some((f) => f.fator === 'regiao' && f.rotulo === 'eua'));
  });

  it('rotulo do fator nao carrega nome de campo interno, quem rotula e a tela', () => {
    // O sinal entrega `fator` em bruto e `rotulo` com o valor. Concatenar
    // "classeCanonica = credito-privado" no motor vazava nome de campo para a
    // tela do assessor, e a tela nao tinha como desfazer.
    const c = carteira('X', [
      pos('A', 800_000, completo({ indexador: 'CDI', emissorId: 'e1', emissorNome: 'E1' })),
      pos('B', 200_000, completo({ indexador: 'IPCA', emissorId: 'e2', emissorNome: 'E2' })),
    ]);
    const f = sinaisDe(radarCruzado([snap('2026-08-24', [c])]), 'X').find(
      (s) => s.tipo === 'CONCENTRACAO_FATOR' && s.fator === 'indexador'
    );
    assert.ok(f);
    assert.equal(f!.rotulo, 'CDI');
    assert.ok(!f!.rotulo.includes('='), 'rotulo nao pode ser string composta');
  });

  it('fator abaixo do limiar de 50% não vira sinal', () => {
    const c = carteira('GAMA', [
      pos('A', 400_000, completo({ indexador: 'CDI' })),
      pos('B', 600_000, completo({ indexador: 'IPCA' })),
    ]);
    const sinais = sinaisDe(radarCruzado([snap('2026-08-24', [c])]), 'GAMA');
    const cdi = sinais.find((s) => s.fator === 'indexador' && s.rotulo === 'CDI');
    assert.equal(cdi, undefined, '40% esta abaixo do limiar de 50%');
  });
});

describe('liquidez baixa: severidade sobre o déficit, não sobre o PL', () => {
  it('carteira com 0,5% de liquidez é severidade alta, não baixa', () => {
    // Se a base fosse a fração do PL (0,5%), a severidade seria "baixa" por
    // construção, e uma carteira quase sem caixa apareceria como tranquila.
    // Base correta: déficit = (5% − 0,5%) / 5% = 90%.
    const c = carteira('SECA', [
      pos('CAIXA', 5_000, completo({ classeCanonica: 'liquidez' })),
      pos('ILIQUIDO', 995_000, completo({ classeCanonica: 'credito-privado' })),
    ]);
    const sinais = sinaisDe(radarCruzado([snap('2026-08-24', [c])]), 'SECA');
    const liq = sinais.find((s) => s.tipo === 'LIQUIDEZ_BAIXA');

    assert.ok(liq, 'liquidez abaixo do piso tem que virar sinal');
    assert.ok(Math.abs(liq!.fracaoPl - 0.005) < 1e-9);
    assert.equal(liq!.severidade, 'alta');

    const ins = radarCruzado([snap('2026-08-24', [c])]).insights.find(
      (i) => i.tipo === 'LIQUIDEZ_BAIXA'
    )!;
    assert.ok(Math.abs((ins.evidencias.deficitRelativo as number) - 0.9) < 1e-9);
  });

  it('liquidez logo abaixo do piso é severidade baixa, e é o comportamento certo', () => {
    // 4,8% de 5%: déficit de 4%, ruído, não emergência.
    const c = carteira('QUASE', [
      pos('CAIXA', 48_000, completo({ classeCanonica: 'liquidez' })),
      pos('RESTO', 952_000, completo({ classeCanonica: 'credito-privado' })),
    ]);
    const liq = sinaisDe(radarCruzado([snap('2026-08-24', [c])]), 'QUASE').find(
      (s) => s.tipo === 'LIQUIDEZ_BAIXA'
    );
    assert.ok(liq);
    assert.equal(liq!.severidade, 'baixa');
  });

  it('liquidez acima do piso não vira sinal', () => {
    const c = carteira('OK', [
      pos('CAIXA', 100_000, completo({ classeCanonica: 'liquidez' })),
      pos('RESTO', 900_000, completo({ classeCanonica: 'credito-privado' })),
    ]);
    const liq = sinaisDe(radarCruzado([snap('2026-08-24', [c])]), 'OK').find(
      (s) => s.tipo === 'LIQUIDEZ_BAIXA'
    );
    assert.equal(liq, undefined);
  });
});

describe('cobertura insuficiente cala o motor', () => {
  it('sem emissor conhecido em 70% do PL, nenhum sinal de emissor é emitido', () => {
    // 80% do PL sem emissor. A carteira TEM concentração de emissor no pedaço
    // conhecido (20% num só), mas o motor não pode afirmar sobre a carteira.
    const c = carteira('OPACA', [
      pos('CONHECIDO', 200_000, completo({ emissorId: 'banco-zeta', emissorNome: 'Banco Zeta' })),
      pos('OPACO', 800_000, { ...VAZIO, classeCanonica: 'fundo' }),
    ]);
    const r = radarCruzado([snap('2026-08-24', [c])]);
    const sinais = sinaisDe(r, 'OPACA');

    assert.equal(sinais.filter((s) => s.tipo === 'CONCENTRACAO_EMISSOR').length, 0);
    assert.equal(r.insights.filter((i) => i.tipo === 'CONCENTRACAO_EMISSOR').length, 0);

    // E o buraco fica visível, que é o ponto: cala, mas conta por quê.
    const cob = r.cobertura.find((x) => x.carteira === 'OPACA')!;
    const emissor = cob.atributos.find((a) => a.atributo === 'emissorId')!;
    assert.ok(Math.abs(emissor.fracao - 0.2) < 1e-9);
    assert.equal(emissor.faixa, 'insuficiente');
  });

  it('concentração por ativo funciona sem atributo nenhum, com cobertura 1', () => {
    // Só usa valor e plTotal, que sempre existem. Uma carteira totalmente
    // opaca ainda assim é avaliável nesta dimensão, e é honesto dizer isso.
    const c = carteira('OPACA', [
      pos('GIGANTE', 500_000, VAZIO),
      pos('RESTO', 500_000, VAZIO),
    ]);
    const r = radarCruzado([snap('2026-08-24', [c])]);
    const ativo = sinaisDe(r, 'OPACA').find((s) => s.tipo === 'CONCENTRACAO_ATIVO');
    assert.ok(ativo);
    assert.equal(ativo!.cobertura, 1);
    assert.equal(ativo!.severidade, 'alta'); // 50%
  });

  it('cobertura em ressalva ainda emite, mas com confiança baixa', () => {
    // 50% do PL com emissor: entre 40% e 70%, faixa de ressalva.
    const c = carteira('MEIA', [
      pos('ZETA A', 300_000, completo({ emissorId: 'banco-zeta', emissorNome: 'Banco Zeta' })),
      pos('ZETA B', 200_000, completo({ emissorId: 'banco-zeta', emissorNome: 'Banco Zeta' })),
      pos('OPACO', 500_000, VAZIO),
    ]);
    const r = radarCruzado([snap('2026-08-24', [c])]);
    const ins = r.insights.find((i) => i.tipo === 'CONCENTRACAO_EMISSOR');
    assert.ok(ins);
    assert.equal(ins!.faixaCobertura, 'ressalva');
    assert.equal(ins!.confianca, 'baixa');
  });
});

describe('vencimento concentrado', () => {
  it('20% do PL vencendo em 30 dias vira sinal, com o valor do título', () => {
    // Volume é o VALOR DO TÍTULO, não a variação do dia: é o defeito que a
    // Onda 2 corrigiu em MATURITY_APPROACHING.
    const c = carteira('VENC', [
      pos('CDB CURTO', 300_000, completo({ prazoAnos: 0.05 }), '2026-09-10'),
      pos('CDB LONGO', 700_000, completo({ prazoAnos: 3 }), '2029-08-24'),
    ]);
    const s = sinaisDe(radarCruzado([snap('2026-08-24', [c])]), 'VENC').find(
      (x) => x.tipo === 'VENCIMENTO_CONCENTRADO'
    );
    assert.ok(s);
    assert.equal(s!.valor, 300_000);
    assert.ok(Math.abs(s!.fracaoPl - 0.3) < 1e-9);
  });

  it('carteira de ações não é punida por não ter vencimento', () => {
    // Sem a lista de classes sem vencimento, a cobertura seria zero para
    // sempre e o motor calaria sobre uma carteira que entende perfeitamente.
    const c = carteira('ACOES', [
      pos('PETR4', 400_000, completo({ classeCanonica: 'acoes', indexador: 'BOLSA' })),
      pos('VALE3', 300_000, completo({ classeCanonica: 'acoes', indexador: 'BOLSA' })),
      pos('CAIXA', 300_000, completo({ classeCanonica: 'liquidez' })),
    ]);
    const r = radarCruzado([snap('2026-08-24', [c])]);
    // Não há vencimento na janela, então nenhum sinal — mas o motor chegou a
    // avaliar, o que se prova pela ausência de erro e pela presença do sinal
    // de fator (BOLSA em 70%).
    assert.equal(
      sinaisDe(r, 'ACOES').filter((s) => s.tipo === 'VENCIMENTO_CONCENTRADO').length,
      0
    );
    assert.ok(sinaisDe(r, 'ACOES').some((s) => s.fator === 'indexador' && s.rotulo === 'BOLSA'));
  });
});

describe('deterioração mês contra mês', () => {
  const mk = (data: string, pl: number) =>
    snap(data, [carteira('ALFA', [pos('UNICO', pl, completo())])]);

  it('escolhe o snapshot mais próximo de 30 dias atrás, não o de ontem', () => {
    const serie = [mk('2026-07-25', 1), mk('2026-08-10', 1), mk('2026-08-23', 1)];
    const base = baseDaDeterioracao(serie, '2026-08-24', 30);
    assert.equal(base?.data, '2026-07-25'); // 30 dias exatos
  });

  it('recusa comparação com menos de uma semana: não é mês contra mês', () => {
    const serie = [mk('2026-08-22', 1), mk('2026-08-23', 1)];
    assert.equal(baseDaDeterioracao(serie, '2026-08-24', 30), null);
  });

  it('recusa base velha demais', () => {
    const serie = [mk('2026-01-10', 1)];
    assert.equal(baseDaDeterioracao(serie, '2026-08-24', 30), null);
  });

  it('queda de 20% vira sinal e insight com a conta', () => {
    const serie = [mk('2026-07-25', 1_000_000), mk('2026-08-24', 800_000)];
    const r = radarCruzado(serie);
    assert.equal(r.baseData, '2026-07-25');
    assert.equal(r.deterioracao.length, 1);
    const d = r.deterioracao[0];
    assert.equal(d.plAnterior, 1_000_000);
    assert.equal(d.plAtual, 800_000);
    assert.ok(Math.abs(d.deltaPct! + 0.2) < 1e-9);
    assert.equal(d.severidade, 'media'); // 20%: entre 10% e 30%

    const ins = r.insights.find((i) => i.tipo === 'DETERIORACAO_PL')!;
    assert.equal(ins.cobertura, 1);
    assert.deepEqual(ins.fonte.serie, ['2026-07-25', '2026-08-24']);
    assert.equal(ins.evidencias.diasEntre, 30);
  });

  it('alta de patrimônio não é deterioração', () => {
    const r = radarCruzado([mk('2026-07-25', 800_000), mk('2026-08-24', 1_000_000)]);
    assert.equal(r.deterioracao.length, 0);
  });

  it('carteira que não existia na base é carteira nova, não deterioração', () => {
    const antes = snap('2026-07-25', [carteira('ALFA', [pos('A', 1_000_000, completo())])]);
    const agora = snap('2026-08-24', [
      carteira('ALFA', [pos('A', 1_000_000, completo())]),
      carteira('NOVA', [pos('B', 10, completo())]),
    ]);
    const r = radarCruzado([antes, agora]);
    assert.equal(r.deterioracao.find((d) => d.carteira === 'NOVA'), undefined);
  });

  it('série de um dia só roda sem base, sem quebrar', () => {
    const r = radarCruzado([mk('2026-08-24', 1_000_000)]);
    assert.equal(r.baseData, null);
    assert.equal(r.deterioracao.length, 0);
  });
});

describe('agregados da casa', () => {
  it('emissor pequeno na casa e grande numa carteira aparece como concentrado', () => {
    // 2% do PL da casa, 40% de uma carteira. A fração da casa esconde o risco;
    // maiorFracaoEmCarteira é o número que importa.
    const zeta = completo({ emissorId: 'banco-zeta', emissorNome: 'Banco Zeta' });
    // Emissor gigante em R$ e diluído em toda parte: 10 carteiras de R$ 5 mi
    // com R$ 500 mil dele cada, 10% em cada uma, abaixo do limiar de 15%.
    const dil = completo({ emissorId: 'gestora-diluida', emissorNome: 'Gestora Diluida' });
    const outros = (n: number) => completo({ emissorId: `g-${n}`, emissorNome: `G${n}` });
    const grandes = Array.from({ length: 10 }, (_, i) =>
      carteira(`G${i}`, [
        pos('FUNDO DIL', 500_000, dil),
        // Nove posições de R$ 500 mil num PL de R$ 5 mi: 10% cada, ninguém
        // concentrado. Duas de R$ 2,25 mi dariam 45% e subiriam na lista,
        // embaralhando o que este teste isola.
        ...Array.from({ length: 9 }, (_, j) => pos(`OUTRO ${j}`, 500_000, outros(i * 9 + j))),
      ])
    );
    const r = radarCruzado([
      snap('2026-08-24', [
        carteira('PEQUENA', [
          pos('CDB ZETA', 400_000, zeta),
          pos('FUNDO A', 300_000, outros(99)),
          pos('FUNDO B', 300_000, outros(98)),
        ]),
        ...grandes,
      ]),
    ]);

    const zetaAgg = r.emissores.find((e) => e.emissorId === 'banco-zeta')!;
    const dilAgg = r.emissores.find((e) => e.emissorId === 'gestora-diluida')!;

    // Zeta vale R$ 400 mil na casa; a diluída vale R$ 5 milhões.
    assert.ok(zetaAgg.valor < dilAgg.valor);
    // Mas a fração da casa esconde o risco de Zeta, e a maior fração numa
    // carteira o revela. É o número que importa.
    assert.ok(zetaAgg.fracaoCasa < 0.01, `fracao da casa veio ${zetaAgg.fracaoCasa}`);
    assert.ok(Math.abs(zetaAgg.maiorFracaoEmCarteira - 0.4) < 1e-9);
    assert.equal(zetaAgg.carteiraMaisExposta, 'PEQUENA');
    assert.ok(Math.abs(dilAgg.maiorFracaoEmCarteira - 0.1) < 1e-9);

    // Concentrado em alguma carteira sobe na lista, mesmo valendo bem menos R$.
    assert.equal(r.emissores[0].emissorId, 'banco-zeta');
    assert.ok(
      r.emissores.findIndex((e) => e.emissorId === 'gestora-diluida') >
        r.emissores.findIndex((e) => e.emissorId === 'banco-zeta')
    );
  });

  it('fator comum lista as carteiras em que ele concentra', () => {
    const cdi = completo({ indexador: 'CDI' });
    const ipca = completo({ indexador: 'IPCA' });
    const r = radarCruzado([
      snap('2026-08-24', [
        carteira('A', [pos('X', 900_000, cdi), pos('Y', 100_000, ipca)]),
        carteira('B', [pos('X', 100_000, cdi), pos('Y', 900_000, ipca)]),
      ]),
    ]);
    const fatorCdi = r.fatores.find((f) => f.fator === 'indexador' && f.valor === 'CDI')!;
    assert.deepEqual(fatorCdi.carteiras, ['A', 'B']);
    assert.deepEqual(fatorCdi.carteirasConcentradas, ['A']);
    assert.equal(fatorCdi.montante, 1_000_000);
  });
});

describe('ranking e determinismo', () => {
  it('ordena por pior severidade, depois quantidade de sinais, depois exposição', () => {
    const zeta = completo({ emissorId: 'banco-zeta', emissorNome: 'Banco Zeta' });
    const r = radarCruzado([
      snap('2026-08-24', [
        // Sem sinal nenhum, e cada dimensão foi calibrada para ficar abaixo do
        // seu limiar: 10 papéis de 10% (ativo < 20%), 10 emissores distintos
        // (< 15%), indexador no máximo em 40% e classe no máximo em 40%
        // (< 50%), caixa em 10% (>= piso de 5%).
        carteira('CALMA', [
          pos('A', 100_000, completo({ emissorId: 'e1', emissorNome: 'E1', indexador: 'CDI', classeCanonica: 'renda-fixa' })),
          pos('B', 100_000, completo({ emissorId: 'e2', emissorNome: 'E2', indexador: 'CDI', classeCanonica: 'renda-fixa' })),
          pos('C', 100_000, completo({ emissorId: 'e3', emissorNome: 'E3', indexador: 'IPCA', classeCanonica: 'renda-fixa' })),
          pos('D', 100_000, completo({ emissorId: 'e4', emissorNome: 'E4', indexador: 'IPCA', classeCanonica: 'renda-fixa' })),
          pos('E', 100_000, completo({ emissorId: 'e5', emissorNome: 'E5', indexador: 'BOLSA', classeCanonica: 'acoes' })),
          pos('F', 100_000, completo({ emissorId: 'e6', emissorNome: 'E6', indexador: 'BOLSA', classeCanonica: 'acoes' })),
          pos('G', 100_000, completo({ emissorId: 'e7', emissorNome: 'E7', indexador: 'BOLSA', classeCanonica: 'acoes' })),
          pos('H', 100_000, completo({ emissorId: 'e8', emissorNome: 'E8', indexador: 'BOLSA', classeCanonica: 'acoes' })),
          pos('I', 100_000, completo({ emissorId: 'e10', emissorNome: 'E10', indexador: 'MULTI', classeCanonica: 'fundo' })),
          pos('CAIXA', 100_000, completo({ classeCanonica: 'liquidez', emissorId: 'e11', emissorNome: 'E11', indexador: 'CDI' })),
        ]),
        // um ativo com 60% = severidade alta
        carteira('CRITICA', [pos('GIGANTE', 600_000, zeta), pos('CAIXA', 400_000, completo({ classeCanonica: 'liquidez', emissorId: 'e9', emissorNome: 'E9' }))]),
      ]),
    ]);
    assert.equal(r.carteiras[0].carteira, 'CRITICA');
    assert.equal(r.carteiras[0].pior, 'alta');
    assert.equal(r.carteiras[1].carteira, 'CALMA');
    assert.equal(r.carteiras[1].pior, null);
  });

  it('o mesmo dado produz exatamente o mesmo resultado', () => {
    const s = snap('2026-08-24', [
      carteira('A', [pos('X', 600_000, completo({ emissorId: 'z', emissorNome: 'Z' })), pos('Y', 400_000, completo({ emissorId: 'w', emissorNome: 'W' }))]),
      carteira('B', [pos('X', 500_000, completo({ emissorId: 'z', emissorNome: 'Z' })), pos('Y', 500_000, completo({ emissorId: 'w', emissorNome: 'W' }))]),
    ]);
    assert.deepEqual(radarCruzado([s]), radarCruzado([s]));
  });

  it('carteira com PL zero é pulada, não vira divisão por zero', () => {
    const r = radarCruzado([snap('2026-08-24', [carteira('VAZIA', [])])]);
    assert.equal(r.carteiras.length, 0);
    assert.equal(r.insights.length, 0);
  });

  it('série vazia devolve resultado vazio sem quebrar', () => {
    const r = radarCruzado([]);
    assert.equal(r.carteiras.length, 0);
    assert.equal(r.baseData, null);
    assert.equal(r.coberturaCasa.faixaGlobal, 'insuficiente');
  });
});
