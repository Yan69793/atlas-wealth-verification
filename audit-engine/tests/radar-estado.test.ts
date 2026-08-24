/**
 * radar-estado.test.ts — o radar passa a dizer O QUE MUDOU (Entrega B.2).
 *
 * Por que isto existe, com número: a calibração de 24/08/2026 rodou o radar
 * sobre 37 meses do dado real da casa e mediu 292,9 alertas por mês, 97% das
 * carteiras acesas, e **apenas 13% dos alertas de cada mês eram novos**. Uma
 * tela que repete 87% do conteúdo do mês passado ensina o assessor a não
 * abri-la. Com o corte por novidade, os MESMOS limiares produzem 15,5 alertas
 * por mês e 13% das carteiras. O estado vale mais que qualquer ajuste de
 * limiar, e é por isso que estes testes existem.
 *
 * Os invariantes que não podem quebrar:
 *
 * 1. Sem período anterior, TUDO é 'novo'. É a verdade na estreia, e fingir
 *    'acompanhamento' abriria a tela vazia justamente no primeiro dia.
 * 2. Sinal que sumiu vira 'encerrado' e SAI NA LISTA. Item que desaparece sem
 *    explicação é pior do que item que continua aparecendo: o assessor nunca vê
 *    o desfecho do que estava acompanhando.
 * 3. A chave que casa os períodos é ESTÁVEL. Em DETERIORACAO_PL ela é vazia de
 *    propósito: usar a data da base (que muda todo período) faria a
 *    deterioração nascer 'nova' para sempre, que é o mesmo que não ter estado.
 * 4. Oscilação abaixo do limiar de variação material NÃO é 'agravado'. Com um
 *    corte baixo demais, todo sinal trocaria de estado todo mês.
 *
 * Fixtures em memória, carteiras fictícias. Nada de LGPD.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { radarCruzado, type RadarResultado } from '../src/intel/cross-portfolio.js';
import { PESO_ESTADO } from '../src/intel/estado.js';
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

function pos(ativo: string, valor: number, attrs: AtributosAtivo) {
  return {
    carteira: '',
    ativo,
    classe: null,
    valor,
    vencimento: null,
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

/**
 * Carteira com UM ativo concentrado, mais enchimento pulverizado. `fracao` é a
 * fatia que o ativo grande ocupa; o resto é dividido em 10 papéis de emissores
 * distintos, para nenhum outro sinal disparar junto e sujar o teste.
 */
function comConcentracao(nome: string, fracao: number, pl = 1_000_000): SnapshotCarteira {
  const grande = Math.round(pl * fracao);
  const resto = pl - grande;
  const cada = Math.round(resto / 10);
  return carteira(nome, [
    pos('PAPEL GRANDE', grande, completo({ emissorId: 'emissor-grande', emissorNome: 'Emissor Grande' })),
    // liquidez suficiente para LIQUIDEZ_BAIXA não disparar junto
    pos('CAIXA', cada, completo({ classeCanonica: 'liquidez', emissorId: 'cx', liquidezDias: 0 })),
    ...Array.from({ length: 9 }, (_, i) =>
      pos(`PULV ${i}`, cada, completo({ emissorId: `pulv-${i}`, emissorNome: `Pulv ${i}` }))
    ),
  ]);
}

const sinal = (r: RadarResultado, nome: string, tipo: string) =>
  r.carteiras.find((c) => c.carteira === nome)?.sinais.find((s) => s.tipo === tipo);

/** Roda dois períodos e devolve o resultado do segundo, com estado derivado. */
function doisPeriodos(base: SnapshotCarteira[], ref: SnapshotCarteira[]): RadarResultado {
  const anterior = radarCruzado([snap('2026-07-31', base)]);
  return radarCruzado([snap('2026-08-31', ref)], { anterior });
}

describe('estreia: sem período anterior', () => {
  it('todo sinal sai novo e temAnterior é false', () => {
    const r = radarCruzado([snap('2026-08-31', [comConcentracao('A', 0.35)])]);
    assert.equal(r.temAnterior, false);
    const sinais = r.carteiras[0].sinais;
    assert.ok(sinais.length > 0);
    for (const s of sinais) assert.equal(s.estado, 'novo', `${s.tipo} deveria ser novo na estreia`);
    assert.equal(r.carteiras[0].estado, 'novo');
    assert.deepEqual(r.encerrados, []);
  });

  it('valorAnterior é null quando não há base', () => {
    const r = radarCruzado([snap('2026-08-31', [comConcentracao('A', 0.35)])]);
    for (const s of r.carteiras[0].sinais) assert.equal(s.valorAnterior, null);
  });
});

describe('estado do sinal contra o período anterior', () => {
  it('carteira idêntica nos dois períodos: acompanhamento, e nada encerrado', () => {
    const r = doisPeriodos([comConcentracao('A', 0.35)], [comConcentracao('A', 0.35)]);
    assert.equal(r.temAnterior, true);
    for (const s of r.carteiras[0].sinais) assert.equal(s.estado, 'acompanhamento');
    assert.deepEqual(r.encerrados, []);
  });

  it('severidade sobe: agravado', () => {
    // 0,25 do PL = média (>= 10%, < 30%); 0,45 = alta (>= 30%).
    const r = doisPeriodos([comConcentracao('A', 0.25)], [comConcentracao('A', 0.45)]);
    const s = sinal(r, 'A', 'CONCENTRACAO_ATIVO');
    assert.equal(s?.severidade, 'alta');
    assert.equal(s?.estado, 'agravado');
    assert.equal(r.carteiras.find((c) => c.carteira === 'A')?.estado, 'agravado');
  });

  it('severidade desce: melhorado', () => {
    const r = doisPeriodos([comConcentracao('A', 0.45)], [comConcentracao('A', 0.25)]);
    assert.equal(sinal(r, 'A', 'CONCENTRACAO_ATIVO')?.estado, 'melhorado');
  });

  it('severidade igual e exposição cresce acima do limiar: agravado', () => {
    // Mesma fração (mesma severidade), PL 40% maior: o R$ do sinal cresce 40%.
    const r = doisPeriodos([comConcentracao('A', 0.35, 1_000_000)], [comConcentracao('A', 0.35, 1_400_000)]);
    const s = sinal(r, 'A', 'CONCENTRACAO_ATIVO');
    assert.equal(s?.estado, 'agravado');
    assert.equal(s?.valorAnterior, 350_000);
  });

  it('severidade igual e exposição oscila ABAIXO do limiar: acompanhamento', () => {
    const variacao = THRESHOLDS.radarVariacaoMaterialPct / 2;
    const r = doisPeriodos(
      [comConcentracao('A', 0.35, 1_000_000)],
      [comConcentracao('A', 0.35, Math.round(1_000_000 * (1 + variacao)))]
    );
    assert.equal(sinal(r, 'A', 'CONCENTRACAO_ATIVO')?.estado, 'acompanhamento');
  });
});

describe('encerrados: o achado que sumiu não some da tela', () => {
  it('sinal deixa de passar do limiar: encerrado com motivo sinal-saiu', () => {
    const r = doisPeriodos([comConcentracao('A', 0.35)], [comConcentracao('A', 0.05)]);
    const enc = r.encerrados.find((e) => e.tipo === 'CONCENTRACAO_ATIVO');
    assert.ok(enc, 'o sinal que saiu precisa aparecer');
    assert.equal(enc?.carteira, 'A');
    assert.equal(enc?.motivo, 'sinal-saiu');
    assert.equal(enc?.severidadeAnterior, 'alta');
    assert.equal(enc?.valorAnterior, 350_000);
  });

  it('carteira inteira sai da base: encerrado com motivo carteira-saiu', () => {
    const r = doisPeriodos(
      [comConcentracao('A', 0.35), comConcentracao('B', 0.35)],
      [comConcentracao('B', 0.35)]
    );
    const enc = r.encerrados.filter((e) => e.carteira === 'A');
    assert.ok(enc.length > 0);
    for (const e of enc) assert.equal(e.motivo, 'carteira-saiu');
  });

  it('encerrado só referencia sinal que existia no período anterior', () => {
    const anterior = radarCruzado([snap('2026-07-31', [comConcentracao('A', 0.35)])]);
    const r = radarCruzado([snap('2026-08-31', [comConcentracao('A', 0.05)])], { anterior });
    const chavesAnteriores = new Set(
      anterior.carteiras.flatMap((c) => c.sinais.map((s) => `${c.carteira}|${s.tipo}|${s.chave}`))
    );
    for (const e of r.encerrados) {
      assert.ok(
        chavesAnteriores.has(`${e.carteira}|${e.tipo}|${e.chave}`),
        `encerrado ${e.tipo} de ${e.carteira} nao existia antes`
      );
    }
  });
});

describe('chave estável entre períodos', () => {
  it('DETERIORACAO_PL usa chave vazia, senão nasceria nova todo período', () => {
    // Três períodos: a base da deterioração muda de julho para agosto, e o
    // sinal precisa continuar sendo o MESMO sinal.
    const p1 = snap('2026-06-30', [comConcentracao('A', 0.35, 1_000_000)]);
    const p2 = snap('2026-07-31', [comConcentracao('A', 0.35, 800_000)]);
    const p3 = snap('2026-08-31', [comConcentracao('A', 0.35, 640_000)]);
    const r1 = radarCruzado([p1, p2]);
    const d1 = sinal(r1, 'A', 'DETERIORACAO_PL');
    assert.ok(d1, 'a queda de 20% precisa disparar');
    assert.equal(d1?.chave, '', 'chave da deterioracao e vazia de proposito');

    const r2 = radarCruzado([p2, p3], { anterior: r1 });
    const d2 = sinal(r2, 'A', 'DETERIORACAO_PL');
    assert.ok(d2);
    assert.notEqual(d2?.estado, 'novo', 'com chave estavel a deterioracao NAO renasce todo mes');
  });

  it('cada tipo carrega a chave da sua identidade', () => {
    const r = radarCruzado([snap('2026-08-31', [comConcentracao('A', 0.35)])]);
    const porTipo = new Map(r.carteiras[0].sinais.map((s) => [s.tipo, s]));
    assert.equal(porTipo.get('CONCENTRACAO_ATIVO')?.chave, 'PAPEL GRANDE');
    assert.equal(porTipo.get('CONCENTRACAO_EMISSOR')?.chave, 'emissor-grande');
    const fator = porTipo.get('CONCENTRACAO_FATOR');
    if (fator) assert.match(fator.chave, /^(indexador|moeda|regiao|classeCanonica):/);
  });

  it('radar anterior SEM o campo chave (arquivo pre-B.2) e lido em vez de derrubar', () => {
    const anterior = radarCruzado([snap('2026-07-31', [comConcentracao('A', 0.35)])]);
    // Simula o artefato antigo: apaga `chave` de todos os sinais.
    const antigo = {
      carteiras: anterior.carteiras.map((c) => ({
        ...c,
        sinais: c.sinais.map((s) => {
          const copia = { ...s } as Record<string, unknown>;
          delete copia.chave;
          return copia as unknown as typeof s;
        }),
      })),
    };
    const r = radarCruzado([snap('2026-08-31', [comConcentracao('A', 0.35)])], { anterior: antigo });
    assert.equal(r.temAnterior, true);
    // Sem `chave`, o casamento cai para (carteira, tipo). LIQUIDEZ_BAIXA e
    // DETERIORACAO_PL ja usam chave vazia, entao casam identico.
    assert.equal(sinal(r, 'A', 'LIQUIDEZ_BAIXA')?.estado ?? 'acompanhamento', 'acompanhamento');
  });
});

describe('invariantes do payload', () => {
  const r = doisPeriodos(
    [comConcentracao('A', 0.25), comConcentracao('B', 0.35), comConcentracao('C', 0.40)],
    [comConcentracao('A', 0.45), comConcentracao('B', 0.35), comConcentracao('C', 0.02)]
  );

  it('todo sinal tem estado dentro do enum', () => {
    const validos = new Set(Object.keys(PESO_ESTADO));
    for (const c of r.carteiras) {
      for (const s of c.sinais) assert.ok(validos.has(s.estado), `estado invalido: ${s.estado}`);
    }
  });

  it('o estado da carteira e o mais urgente dos sinais dela', () => {
    for (const c of r.carteiras) {
      if (!c.sinais.length) {
        assert.equal(c.estado, null);
        continue;
      }
      const maior = c.sinais.reduce((a, s) => (PESO_ESTADO[s.estado] > PESO_ESTADO[a] ? s.estado : a), c.sinais[0].estado);
      assert.equal(c.estado, maior, `carteira ${c.carteira}`);
    }
  });

  it('acompanhamento nunca esconde variacao acima do limiar', () => {
    for (const c of r.carteiras) {
      for (const s of c.sinais) {
        if (s.estado !== 'acompanhamento' || s.valorAnterior === null || s.valorAnterior <= 0) continue;
        const variacao = Math.abs(s.valor - s.valorAnterior) / s.valorAnterior;
        assert.ok(
          variacao < THRESHOLDS.radarVariacaoMaterialPct,
          `${c.carteira}/${s.tipo} em acompanhamento com variacao de ${(variacao * 100).toFixed(1)}%`
        );
      }
    }
  });

  it('a lista abre pelo que mudou, nao pela severidade', () => {
    // A agravou (severidade subiu), B esta em acompanhamento com severidade
    // alta. Ordem por severidade poria B na frente; ordem por estado poe A.
    const iA = r.carteiras.findIndex((c) => c.carteira === 'A');
    const iB = r.carteiras.findIndex((c) => c.carteira === 'B');
    assert.equal(r.carteiras[iA].estado, 'agravado');
    assert.equal(r.carteiras[iB].estado, 'acompanhamento');
    assert.ok(iA < iB, 'quem agravou vem antes de quem so continua igual');
  });

  it('C perdeu a concentracao e aparece em encerrados', () => {
    assert.ok(r.encerrados.some((e) => e.carteira === 'C' && e.tipo === 'CONCENTRACAO_ATIVO'));
  });
});
