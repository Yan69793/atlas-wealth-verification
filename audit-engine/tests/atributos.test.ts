/**
 * atributos.test.ts — Fase 0 da camada de inteligência: atributos por posição.
 *
 * O que estes testes travam, e por quê:
 *
 * 1. Desconhecido é `null`, nunca zero. Um motor que lê 0 onde o dado falta
 *    afirma "sem exposição" quando a verdade é "não sei classificar". É a
 *    forma exata dos doze defeitos de agosto: tela confiante sobre dado que
 *    não a sustenta.
 * 2. `liquidezDias: 0` (D+0) é valor CONHECIDO e não pode ser confundido com
 *    ausência. Um `!v` no lugar de `!= null` inverteria a verdade justamente
 *    no papel mais líquido da carteira.
 * 3. Valor fora do enum é ignorado em silêncio. Um indexador escrito errado
 *    viraria fator fantasma agrupando sozinho, e a cobertura já denuncia o
 *    buraco.
 * 4. A derivação de classe canônica é conservadora de propósito: adivinhar
 *    produz cobertura de 100% com classificação errada, que é pior do que
 *    buraco declarado.
 *
 * Fixtures em memória e um root temporário. Nada de LGPD.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  ATRIBUTOS_VAZIOS,
  atributosDe,
  classeCanonicaDe,
  emissorIdDe,
  loadAtivoMapping,
  normalize,
  resolverAtributos,
} from '../src/snapshot/normalize.js';
import type { RawSnapshot, SnapshotPosition } from '../src/snapshot/types.js';

function rootTemporario(conteudo: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-ativo-map-'));
  for (const [nome, texto] of Object.entries(conteudo)) {
    fs.writeFileSync(path.join(dir, nome), texto, 'utf8');
  }
  return dir;
}

function raw(posicoes: Array<Partial<RawSnapshot['carteiras'][0]['posicoes'][0]>>): RawSnapshot {
  return {
    data: '2026-08-24',
    fonte: 'teste',
    carteiras: [
      {
        nome: 'ALFA',
        posicoes: posicoes.map((p) => ({ ativo: 'X', valor: 100, ...p })) as never,
      },
    ],
  };
}

describe('atributos: desconhecido é null, nunca zero', () => {
  it('posição sem mapa e sem nada derivável tem todos os atributos null', () => {
    const a = resolverAtributos({
      ativo: 'FUNDO OPACO',
      classe: null,
      vencimento: null,
      instituicao: null,
      dataSnapshot: '2026-08-24',
      mapa: {},
    });
    assert.equal(a.indexador, null);
    assert.equal(a.moeda, null);
    assert.equal(a.regiao, null);
    assert.equal(a.prazoAnos, null);
    assert.equal(a.liquidezDias, null);
    assert.equal(a.cobertoFGC, null);
    assert.equal(a.classeCanonica, null);
    assert.equal(a.emissorId, null);
    // O ponto do teste: nenhum atributo virou 0, '' ou false por descuido.
    for (const v of Object.values(a)) {
      assert.ok(v === null, `atributo caiu em valor falsy nao-null: ${JSON.stringify(v)}`);
    }
  });

  it('snapshot antigo sem o campo `atributos` lê como tudo desconhecido (compat)', () => {
    const antiga = {
      carteira: 'ALFA',
      ativo: 'X',
      classe: null,
      valor: 100,
      vencimento: null,
      quantidade: null,
      instituicao: null,
    } as SnapshotPosition;
    assert.deepEqual(atributosDe(antiga), ATRIBUTOS_VAZIOS);
  });

  it('liquidezDias 0 é D+0, valor conhecido, e sobrevive ao mapa', () => {
    const root = rootTemporario({
      'ativo-map.json': JSON.stringify({ mappings: { X: { liquidezDias: 0 } } }),
    });
    const mapa = loadAtivoMapping(root);
    assert.equal(mapa['X'].liquidezDias, 0);
    const a = resolverAtributos({
      ativo: 'X',
      classe: null,
      vencimento: null,
      instituicao: null,
      dataSnapshot: '2026-08-24',
      mapa,
    });
    assert.equal(a.liquidezDias, 0, 'D+0 nao pode virar null');
  });

  it('cobertoFGC false é resposta, não ausência', () => {
    const root = rootTemporario({
      'ativo-map.json': JSON.stringify({ mappings: { X: { cobertoFGC: false } } }),
    });
    const a = resolverAtributos({
      ativo: 'X',
      classe: null,
      vencimento: null,
      instituicao: null,
      dataSnapshot: '2026-08-24',
      mapa: loadAtivoMapping(root),
    });
    assert.equal(a.cobertoFGC, false);
  });
});

describe('ativo-map: carregamento e saneamento', () => {
  it('local sobrepõe o do produto, mesmo padrão de name-map/class-map', () => {
    const root = rootTemporario({
      'ativo-map.json': JSON.stringify({ mappings: { X: { indexador: 'CDI' } } }),
      'ativo-map.local.json': JSON.stringify({ mappings: { X: { indexador: 'IPCA' } } }),
    });
    assert.equal(loadAtivoMapping(root)['X'].indexador, 'IPCA');
  });

  it('mapa ilegível vira vazio sem derrubar a ingestão', () => {
    const root = rootTemporario({ 'ativo-map.json': '{ nao e json' });
    assert.deepEqual(loadAtivoMapping(root), {});
  });

  it('root sem mapa nenhum devolve vazio', () => {
    assert.deepEqual(loadAtivoMapping(rootTemporario({})), {});
  });

  it('valor fora do enum é ignorado, não vira fator fantasma', () => {
    const root = rootTemporario({
      'ativo-map.json': JSON.stringify({
        mappings: {
          X: { indexador: 'cdi', moeda: 'REAL', regiao: 'Brasil', classeCanonica: 'renda fixa' },
        },
      }),
    });
    const m = loadAtivoMapping(root)['X'];
    // minúscula, nome por extenso e rótulo com espaço não são o enum
    assert.equal(m?.indexador, undefined);
    assert.equal(m?.moeda, undefined);
    assert.equal(m?.regiao, undefined);
    assert.equal(m?.classeCanonica, undefined);
  });

  it('número não finito e prazo/liquidez inválidos caem fora', () => {
    const root = rootTemporario({
      'ativo-map.json': JSON.stringify({
        mappings: { X: { prazoAnos: 'dois', liquidezDias: -5 } },
      }),
    });
    const m = loadAtivoMapping(root)['X'];
    assert.equal(m, undefined, 'entrada sem nenhum campo valido nao entra no mapa');
  });

  it('emissorId sai do emissorNome quando o mapa não dá a chave', () => {
    const root = rootTemporario({
      'ativo-map.json': JSON.stringify({ mappings: { X: { emissorNome: 'BANCO ZETA S.A.' } } }),
    });
    assert.equal(loadAtivoMapping(root)['X'].emissorId, 'banco-zeta');
  });
});

describe('derivações gratuitas', () => {
  it('prazoAnos sai do vencimento e da data do snapshot, sem Date.now', () => {
    const a = resolverAtributos({
      ativo: 'CDB',
      classe: null,
      vencimento: '2027-08-24',
      instituicao: null,
      dataSnapshot: '2026-08-24',
      mapa: {},
    });
    assert.ok(a.prazoAnos !== null);
    assert.ok(Math.abs(a.prazoAnos! - 1) < 0.01, `esperava ~1 ano, veio ${a.prazoAnos}`);
    // Determinismo: mesma dupla, mesmo número, sempre.
    const b = resolverAtributos({
      ativo: 'CDB',
      classe: null,
      vencimento: '2027-08-24',
      instituicao: null,
      dataSnapshot: '2026-08-24',
      mapa: {},
    });
    assert.equal(a.prazoAnos, b.prazoAnos);
  });

  it('papel já vencido dá prazoAnos negativo, não null nem zero', () => {
    const a = resolverAtributos({
      ativo: 'LCI',
      classe: null,
      vencimento: '2026-02-24',
      instituicao: null,
      dataSnapshot: '2026-08-24',
      mapa: {},
    });
    assert.ok(a.prazoAnos !== null && a.prazoAnos < 0);
  });

  it('CUSTODIANTE NAO VIRA EMISSOR: instituicao nao alimenta emissorId', () => {
    // Regressao cara, achada em 2026-08-24 rodando o motor contra os fixtures
    // sinteticos. `instituicao` e a coluna 1 do book, que ali e o custodiante.
    // Derivar emissor dela produzia, em TODA carteira, "100% do patrimonio
    // depende de um unico emissor (CUSTODIANTE SINTETICO)", com cobertura
    // reportada em 100%. Alerta critico falso e cobertura mentirosa ao mesmo
    // tempo, que e exatamente o que esta camada existe para impedir.
    const a = resolverAtributos({
      ativo: 'CDB BANCO ZETA',
      classe: null,
      vencimento: null,
      instituicao: 'CUSTODIANTE SINTETICO',
      dataSnapshot: '2026-08-24',
      mapa: {},
    });
    assert.equal(a.emissorId, null, 'custodiante nao pode virar emissor');
    assert.equal(a.emissorNome, null);
    // O campo cru continua no snapshot, para quem quiser olhar. So nao vira
    // emissor por conta propria.
  });

  it('emissor vem do ativo-map, e so dele', () => {
    const a = resolverAtributos({
      ativo: 'CDB',
      classe: null,
      vencimento: null,
      instituicao: 'CUSTODIANTE SINTETICO',
      dataSnapshot: '2026-08-24',
      mapa: { CDB: { emissorNome: 'Banco  Zeta SA' } },
    });
    assert.equal(a.emissorNome, 'Banco Zeta SA', 'espaco duplo normalizado, senao vira duas linhas na lista');
    assert.equal(a.emissorId, 'banco-zeta');
  });

  it('a mesma casa escrita de jeitos diferentes cai na mesma chave', () => {
    assert.equal(emissorIdDe('BANCO X S.A.'), emissorIdDe('Banco  X SA'));
    assert.equal(emissorIdDe('BANCO X S.A.'), emissorIdDe('banco x ltda'));
  });

  it('CNPJ no nome vira chave de raiz, que é o que casa com evento de crédito', () => {
    assert.equal(emissorIdDe('BANCO X 60.746.948/0001-12'), 'cnpj:60746948');
    assert.equal(emissorIdDe('60746948'), 'cnpj:60746948');
  });

  it('mapa manda sobre derivação', () => {
    const a = resolverAtributos({
      ativo: 'CDB',
      classe: 'Liquidez',
      vencimento: '2027-08-24',
      instituicao: 'Custodiante Alfa',
      dataSnapshot: '2026-08-24',
      mapa: {
        CDB: { emissorNome: 'Banco Emissor', emissorId: 'banco-emissor', prazoAnos: 5, classeCanonica: 'credito-privado' },
      },
    });
    // Emitido por um, custodiado por outro: o mapa corrige a derivação.
    assert.equal(a.emissorId, 'banco-emissor');
    assert.equal(a.prazoAnos, 5);
    assert.equal(a.classeCanonica, 'credito-privado');
  });
});

describe('classe canônica: conservadora de propósito', () => {
  it('rótulos inequívocos viram classe', () => {
    assert.equal(classeCanonicaDe('Liquidez'), 'liquidez');
    assert.equal(classeCanonicaDe('RENDA FIXA'), 'renda-fixa');
    assert.equal(classeCanonicaDe('Debênture'), 'credito-privado');
    assert.equal(classeCanonicaDe('Ações'), 'acoes');
    assert.equal(classeCanonicaDe('FII'), 'imobiliario');
    assert.equal(classeCanonicaDe('Offshore'), 'internacional');
  });

  it('rótulo ambíguo ou desconhecido fica null em vez de virar "outros"', () => {
    assert.equal(classeCanonicaDe('Estruturado XPTO'), null);
    assert.equal(classeCanonicaDe('Alternativos'), null);
    assert.equal(classeCanonicaDe(''), null);
    assert.equal(classeCanonicaDe(null), null);
  });
});

describe('normalize grava os atributos na posição', () => {
  it('posição normalizada carrega atributos derivados e do mapa', () => {
    const snap = normalize(
      raw([{ ativo: 'CDB ZETA 2027', valor: 500_000, classe: 'Renda Fixa', vencimento: '2027-08-24' }]),
      'diario',
      {},
      {},
      {},
      { 'CDB ZETA 2027': { indexador: 'CDI', emissorNome: 'Banco Zeta', moeda: 'BRL' } }
    );
    const p = snap.carteiras[0].posicoes[0];
    assert.equal(p.atributos?.indexador, 'CDI');
    assert.equal(p.atributos?.emissorId, 'banco-zeta');
    assert.equal(p.atributos?.moeda, 'BRL');
    assert.equal(p.atributos?.classeCanonica, 'renda-fixa');
    assert.ok(p.atributos?.prazoAnos !== null);
    // Não inventou o que ninguém disse.
    assert.equal(p.atributos?.regiao, null);
    assert.equal(p.atributos?.liquidezDias, null);
  });

  it('sem ativo-map o snapshot continua válido, só com menos atributo', () => {
    const snap = normalize(raw([{ ativo: 'X', valor: 100 }]), 'diario');
    const p = snap.carteiras[0].posicoes[0];
    assert.ok(p.atributos, 'atributos sempre presentes na gravacao nova');
    assert.equal(p.atributos?.indexador, null);
  });

  it('mesmo ativo em dois custodiantes soma valor e mantém um jogo de atributos', () => {
    const snap = normalize(
      raw([
        { ativo: 'NTN-B 2035', valor: 300_000, classe: 'Renda Fixa' },
        { ativo: 'NTN-B 2035', valor: 200_000, classe: 'Renda Fixa' },
      ]),
      'diario',
      {},
      {},
      {},
      { 'NTN-B 2035': { indexador: 'IPCA' } }
    );
    const posicoes = snap.carteiras[0].posicoes;
    assert.equal(posicoes.length, 1);
    assert.equal(posicoes[0].valor, 500_000);
    assert.equal(posicoes[0].atributos?.indexador, 'IPCA');
  });
});
