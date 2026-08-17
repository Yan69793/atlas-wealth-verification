/**
 * idle-cash.test.ts — Fase 4: caixa parado.
 *
 * Métrica valor × tempo: R$-dias acumulado por carteira sobre a série diária
 * de snapshots, dias corridos parado e bordas dos limiares. Fixtures em
 * memória, nada de LGPD.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { caixaParado, inicioDaJanela, TIPO_OPORTUNIDADE_CAIXA_PARADO } from '../src/intel/idle-cash.js';
import type { Snapshot } from '../src/snapshot/types.js';

type Pos = { carteira: string; ativo: string; valor: number; classe?: string | null };

function mkSnapshot(data: string, posicoes: Pos[]): Snapshot {
  const porCarteira = new Map<string, Pos[]>();
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
        classe: p.classe ?? null,
        valor: p.valor,
        vencimento: null,
        quantidade: null,
        instituicao: null,
      })),
    })),
  };
}

/** Carteira só com liquidez: liq = pl, pct = 1 (qualifica sempre). */
function diaCaixa(data: string, carteira: string, liq: number): Snapshot {
  return mkSnapshot(data, [{ carteira, ativo: 'Conta liquida', valor: liq, classe: 'liquidez' }]);
}

describe('caixa parado', () => {
  it('R$-dias exato: liquidez vale até o próximo snapshot, o último dia não contribui', () => {
    const serie = [
      diaCaixa('2026-08-12', 'A', 100_000),
      diaCaixa('2026-08-13', 'A', 200_000),
      diaCaixa('2026-08-14', 'A', 300_000),
    ];
    const item = caixaParado(serie, { minDias: 1 })[0];
    assert.equal(item.rsDias, 300_000); // 100k×1 + 200k×1; 300k não conta (sem próximo dia)
    assert.equal(item.rsDiasSequencia, 300_000);
    assert.equal(item.diasParado, 3);
    assert.equal(item.pico, 300_000);
  });

  it('salto de calendário conta dias corridos (fim de semana), não índices', () => {
    const serie = [diaCaixa('2026-08-13', 'A', 100_000), diaCaixa('2026-08-17', 'A', 100_000)];
    const item = caixaParado(serie, { minDias: 1 })[0];
    assert.equal(item.rsDias, 400_000); // 4 dias corridos entre os snapshots
    assert.equal(item.diasParado, 5); // 13 → 17 inclusive
  });

  it('diasParado conta dias corridos do início da sequência à referência', () => {
    const serie = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'].map((d) =>
      diaCaixa(d, 'A', 100_000)
    );
    const item = caixaParado(serie, { minDias: 5 })[0];
    assert.equal(item.diasParado, 5);
    assert.equal(item.inicioSequencia, '2026-08-10');
  });

  it('sequência quebrada no dia anterior → só a referência conta', () => {
    const serie = [
      mkSnapshot('2026-08-13', [
        { carteira: 'A', ativo: 'Renda fixa', valor: 950_000 },
        { carteira: 'A', ativo: 'Caixa', valor: 50_000, classe: 'liquidez' }, // 5%: não qualifica
      ]),
      mkSnapshot('2026-08-14', [
        { carteira: 'A', ativo: 'Renda fixa', valor: 900_000 },
        { carteira: 'A', ativo: 'Caixa', valor: 100_000, classe: 'liquidez' }, // 10%: qualifica
      ]),
    ];
    const item = caixaParado(serie, { minDias: 1 })[0];
    assert.equal(item.diasParado, 1);
    assert.equal(item.pico, 100_000);
    assert.equal(item.inicioSequencia, '2026-08-14');
    assert.equal(item.liquidezAtual, 100_000);
    assert.equal(item.pctPlAtual, 0.10);
  });

  it('referência não qualifica → fora da lista mesmo com R$-dias alto na janela', () => {
    const serie = [
      diaCaixa('2026-08-13', 'A', 500_000),
      mkSnapshot('2026-08-14', [
        { carteira: 'A', ativo: 'Renda fixa', valor: 910_000 },
        { carteira: 'A', ativo: 'Caixa', valor: 90_000, classe: 'liquidez' }, // 9%: não qualifica
      ]),
    ];
    assert.equal(caixaParado(serie, { minDias: 1 }).length, 0);
  });

  it('a janela trunca a sequência também, e o item se declara truncado', () => {
    // Contrato trocado em 2026-08-17 por decisão do dono: "parado há 90 dias ou
    // mais" basta, então a janela passou a ser o universo inteiro da medição.
    // Antes a sequência atravessava a janela e este mesmo caso dizia
    // diasParado 5 e rsDiasSequencia 400.000, medidos fora da janela.
    const serie = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'].map((d) =>
      diaCaixa(d, 'A', 100_000)
    );
    const item = caixaParado(serie, { janelaDias: 3, minDias: 1 })[0];
    assert.equal(item.rsDias, 200_000); // janela de 3 dias: só os pares 12→13 e 13→14
    assert.equal(item.rsDiasSequencia, 200_000, 'sequência não sai mais da janela');
    assert.equal(item.diasParado, 3, 'capado na janela, não 5');
    assert.equal(item.inicioSequencia, '2026-08-12');
    assert.equal(item.sequenciaTruncada, true, 'a tela lê como "3d+"');
  });

  it('classe null não conta como caixa', () => {
    const serie = [
      mkSnapshot('2026-08-13', [
        { carteira: 'A', ativo: 'Sem classe', valor: 200_000 },
        { carteira: 'B', ativo: 'Fixo', valor: 300_000, classe: null },
        { carteira: 'B', ativo: 'Caixa', valor: 100_000, classe: 'liquidez' },
      ]),
      mkSnapshot('2026-08-14', [
        { carteira: 'A', ativo: 'Sem classe', valor: 200_000 },
        { carteira: 'B', ativo: 'Fixo', valor: 300_000, classe: null },
        { carteira: 'B', ativo: 'Caixa', valor: 100_000, classe: 'liquidez' },
      ]),
    ];
    const itens = caixaParado(serie, { minDias: 1 });
    assert.ok(!itens.some((i) => i.carteira === 'A'), 'A só tem posição sem classe: caixa invisível');
    const b = itens.find((i) => i.carteira === 'B')!;
    assert.equal(b.liquidezAtual, 100_000); // null não soma
    assert.equal(b.pctPlAtual, 0.25);
  });

  it('série de 1 dia: função pura devolve item sem falhar (o corte de série curta é do CLI)', () => {
    const item = caixaParado([diaCaixa('2026-08-14', 'A', 100_000)], { minDias: 1 })[0];
    assert.equal(item.diasParado, 1);
    assert.equal(item.rsDias, 0);
    assert.equal(item.rsDiasSequencia, 0);
    assert.equal(item.pico, 100_000);
  });

  it('borda do limiar: 10% exato entra, 0,001 pp abaixo fica fora', () => {
    const serie = [
      mkSnapshot('2026-08-13', [
        { carteira: 'A', ativo: 'Fixo', valor: 900_000 },
        { carteira: 'A', ativo: 'Caixa', valor: 100_000, classe: 'liquidez' }, // 10% exato
        { carteira: 'B', ativo: 'Fixo', valor: 900_010 },
        { carteira: 'B', ativo: 'Caixa', valor: 99_990, classe: 'liquidez' }, // 9,999%
      ]),
      mkSnapshot('2026-08-14', [
        { carteira: 'A', ativo: 'Fixo', valor: 900_000 },
        { carteira: 'A', ativo: 'Caixa', valor: 100_000, classe: 'liquidez' },
        { carteira: 'B', ativo: 'Fixo', valor: 900_010 },
        { carteira: 'B', ativo: 'Caixa', valor: 99_990, classe: 'liquidez' },
      ]),
    ];
    const itens = caixaParado(serie, { minDias: 1 });
    assert.ok(itens.some((i) => i.carteira === 'A'), '10% exato qualifica (EPS)');
    assert.ok(!itens.some((i) => i.carteira === 'B'), '9,999% fica fora');
  });

  it('carteira ausente num dia conta como liquidez 0 e quebra a sequência', () => {
    const serie = [
      diaCaixa('2026-08-12', 'A', 100_000),
      diaCaixa('2026-08-13', 'B', 100_000), // A ausente
      diaCaixa('2026-08-14', 'A', 100_000),
    ];
    const item = caixaParado(serie, { minDias: 1 }).find((i) => i.carteira === 'A')!;
    assert.equal(item.diasParado, 1); // dia 13 quebrou a sequência
    assert.equal(item.inicioSequencia, '2026-08-14');
    assert.equal(item.rsDias, 100_000); // 12→13 contribui; 13→14 vale 0
  });

  it('minDias filtra a lista', () => {
    const serie = ['2026-08-12', '2026-08-13', '2026-08-14'].map((d) => diaCaixa(d, 'A', 100_000));
    assert.equal(caixaParado(serie, { minDias: 7 }).length, 0);
    assert.equal(caixaParado(serie, { minDias: 3 })[0].diasParado, 3);
  });

  it('determinismo e ordenação: rsDias desc, empate por carteira', () => {
    const serie = [
      mkSnapshot('2026-08-13', [
        { carteira: 'B', ativo: 'Caixa', valor: 100_000, classe: 'liquidez' },
        { carteira: 'A', ativo: 'Caixa', valor: 100_000, classe: 'liquidez' },
        { carteira: 'C', ativo: 'Caixa', valor: 500_000, classe: 'liquidez' },
      ]),
      mkSnapshot('2026-08-14', [
        { carteira: 'B', ativo: 'Caixa', valor: 100_000, classe: 'liquidez' },
        { carteira: 'A', ativo: 'Caixa', valor: 100_000, classe: 'liquidez' },
        { carteira: 'C', ativo: 'Caixa', valor: 500_000, classe: 'liquidez' },
      ]),
    ];
    const a = caixaParado(serie, { minDias: 1 });
    const b = caixaParado(serie, { minDias: 1 });
    assert.deepEqual(a, b);
    assert.deepEqual(
      a.map((i) => i.carteira),
      ['C', 'A', 'B'] // C tem rsDias maior; A e B empatam e ordenam por nome
    );
  });

  it('PL zero na referência é pulado, sem NaN', () => {
    const serie = [
      mkSnapshot('2026-08-13', [{ carteira: 'Z', ativo: 'Zerado', valor: 0, classe: 'liquidez' }]),
      mkSnapshot('2026-08-14', [{ carteira: 'Z', ativo: 'Zerado', valor: 0, classe: 'liquidez' }]),
    ];
    const itens = caixaParado(serie, { minDias: 1 });
    assert.equal(itens.length, 0);
    assert.ok(!itens.some((i) => i.carteira === 'Z'));
  });

  // Trava do defeito: a contagem andava para trás na série sem olhar o intervalo
  // entre snapshots, então dois arquivos a 16 dias de distância viravam "17 dias
  // parado" com chip vermelho, e R$-dias multiplicava a liquidez pelo tamanho do
  // buraco. Uma semana de férias do operador enchia a lista de número inventado.
  it('buraco na série interrompe a sequência em vez de afirmar continuidade', () => {
    const caixa = (data: string) => mkSnapshot(data, [
      { carteira: 'A', ativo: 'Caixa', valor: 150_000, classe: 'liquidez' },
      { carteira: 'A', ativo: 'CDB', valor: 850_000, classe: 'Renda Fixa' },
    ]);
    // 16 dias sem ingestão entre os dois snapshots
    const comBuraco = [caixa('2026-07-29'), caixa('2026-08-14')];
    const itens = caixaParado(comBuraco, { minDias: 1 });
    assert.equal(itens.length, 1);
    assert.equal(itens[0].diasParado, 1, 'só o dia de referência tem evidência');
    assert.equal(itens[0].inicioSequencia, '2026-08-14');

    // com o mínimo de 7 dias, a carteira nem entra na lista: não há prova
    assert.equal(caixaParado(comBuraco).length, 0);

    // série contínua de verdade (dias úteis, com salto de fim de semana) mantém
    const continua = [
      caixa('2026-08-07'), caixa('2026-08-10'), caixa('2026-08-11'),
      caixa('2026-08-12'), caixa('2026-08-13'), caixa('2026-08-14'),
    ];
    const ok = caixaParado(continua);
    assert.equal(ok.length, 1);
    assert.equal(ok[0].diasParado, 8, '07/ago a 14/ago, fim de semana não quebra');
  });

  it('R$-dias não é inflado pelo tamanho do buraco na série', () => {
    const caixa = (data: string) => mkSnapshot(data, [
      { carteira: 'A', ativo: 'Caixa', valor: 100_000, classe: 'liquidez' },
      { carteira: 'A', ativo: 'CDB', valor: 400_000, classe: 'Renda Fixa' },
    ]);
    const comBuraco = caixaParado([caixa('2026-07-29'), caixa('2026-08-14')], { minDias: 1 });
    // sem teto seriam 100.000 x 16 = 1.600.000; o teto é maxIntervalo (4 dias)
    assert.equal(comBuraco[0].rsDias, 100_000 * 4);
  });

  // Trava do defeito: o botao "Criar oportunidade" da tela montava id fora da
  // convencao do motor e sem chave estavel, entao cada clique criava linha nova
  // e o botao nunca virava chip de status.
  it('cada item carrega oportunidadeId estavel na convencao do motor', () => {
    const serie = [
      diaCaixa('2026-08-12', 'A', 100_000),
      diaCaixa('2026-08-13', 'A', 100_000),
      diaCaixa('2026-08-14', 'A', 100_000),
    ];
    const item = caixaParado(serie, { minDias: 1 })[0];
    assert.equal(item.oportunidadeId, `2026-08-14|A|${TIPO_OPORTUNIDADE_CAIXA_PARADO}|`);
    assert.equal(item.oportunidadeId.split('|').length, 4, 'convencao periodo|carteira|tipo|ativo');
    // duas execucoes, mesmo id: o botao consegue reconhecer a oportunidade
    assert.equal(caixaParado(serie, { minDias: 1 })[0].oportunidadeId, item.oportunidadeId);
  });
});

describe('janela trunca a sequencia (decisao do dono: 90 dias ou mais basta)', () => {
  const opcoes = { janelaDias: 90, maxIntervaloDias: 4 };

  /** Serie de dias uteis entre duas datas, com caixa parado o tempo todo. */
  function diasUteis(de: [number, number, number], ate: [number, number, number], pular?: (d: string) => boolean) {
    const serie: Snapshot[] = [];
    const fim = new Date(Date.UTC(ate[0], ate[1], ate[2]));
    for (const d = new Date(Date.UTC(de[0], de[1], de[2])); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue; // fim de semana sem arquivo
      const data = d.toISOString().slice(0, 10);
      if (pular && pular(data)) continue;
      serie.push(mkSnapshot(data, [
        { carteira: 'A', ativo: 'Caixa', valor: 200_000, classe: 'liquidez' },
        { carteira: 'A', ativo: 'CDB', valor: 800_000, classe: 'Renda Fixa' },
      ]));
    }
    return serie;
  }

  it('inicioDaJanela e a borda de 90 dias corridos, inclusive', () => {
    assert.equal(inicioDaJanela('2026-08-14', opcoes), '2026-05-17');
    assert.equal(inicioDaJanela('2026-08-14'), '2026-05-17', 'default dos thresholds');
  });

  it('um ano parado nao vira "365 dias": para em 90 e marca truncada', () => {
    const serie = diasUteis([2025, 7, 14], [2026, 7, 14]);
    const item = caixaParado(serie, opcoes)[0];
    assert.ok(item.diasParado <= 90, `diasParado: ${item.diasParado}`);
    assert.equal(item.sequenciaTruncada, true, 'a tela le como "90d+"');
    assert.ok(item.inicioSequencia >= inicioDaJanela('2026-08-14', opcoes));
  });

  it('o corte nao muda numero: ler so a janela da o MESMO resultado', () => {
    const completa = diasUteis([2025, 7, 14], [2026, 7, 14]);
    const janela = completa.filter((s) => s.data >= inicioDaJanela('2026-08-14', opcoes));
    assert.ok(janela.length < completa.length, `${janela.length} de ${completa.length}`);
    assert.deepEqual(caixaParado(janela, opcoes), caixaParado(completa, opcoes));
  });

  it('sequencia que acaba antes da borda nao e marcada como truncada', () => {
    const serie = [
      diaCaixa('2026-08-11', 'A', 100_000),
      diaCaixa('2026-08-12', 'A', 100_000),
      diaCaixa('2026-08-13', 'A', 100_000),
      diaCaixa('2026-08-14', 'A', 100_000),
    ];
    const item = caixaParado(serie, { ...opcoes, minDias: 1 })[0];
    assert.equal(item.diasParado, 4);
    assert.equal(item.sequenciaTruncada, false, 'a serie acabou de verdade, nao foi cortada');
  });

  it('buraco dentro da janela quebra a sequencia e ela nao sai truncada', () => {
    const serie = diasUteis([2025, 7, 14], [2026, 7, 14], (d) => d >= '2026-07-01' && d <= '2026-07-20');
    const item = caixaParado(serie, opcoes)[0];
    assert.equal(item.sequenciaTruncada, false, 'quem interrompeu foi o buraco, nao a borda');
    assert.ok(item.inicioSequencia > '2026-07-20', `inicio: ${item.inicioSequencia}`);
  });
});
