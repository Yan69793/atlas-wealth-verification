/**
 * normalize.test.ts — Fase 5: fonte da receita (taxa-map).
 *
 * Receita da casa por carteira = PL × taxa anual / 12, calculada no normalize
 * SOMENTE no período mensal, com a taxa vinda do mapa da instância
 * (taxa-map.local.json sobre taxa-map.json, mesmo padrão do class-map).
 * Rentabilidade do cliente (rentRef) é outra métrica e não passa por aqui.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { loadTaxaMapping, normalize } from '../src/snapshot/normalize.js';
import type { RawCarteira, RawSnapshot } from '../src/snapshot/types.js';

function rawSnapshot(
  data: string,
  carteiras: Array<{ nome: string; posicoes: Array<{ ativo: string; valor: number; classe?: string }>; receita?: number }>
): RawSnapshot {
  return {
    data,
    fonte: 'teste',
    carteiras: carteiras.map((c) => {
      const carteira: RawCarteira = {
        nome: c.nome,
        posicoes: c.posicoes.map((p) => ({ ativo: p.ativo, valor: p.valor, classe: p.classe })),
      };
      if (c.receita !== undefined) carteira.receita = c.receita;
      return carteira;
    }),
  };
}

function posFixa(valor: number) {
  return { ativo: 'Fundo XYZ', valor, classe: 'Renda Fixa' };
}

const tmpDirs: string[] = [];
function tmpRoot(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-normalize-'));
  tmpDirs.push(d);
  return d;
}
after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

describe('receita da casa no normalize (Fase 5)', () => {
  it('mensal calcula receita via taxa-map: PL x taxa anual / 12, arredondado em centavos', () => {
    const raw = rawSnapshot('2026-06', [
      { nome: 'ALFA', posicoes: [posFixa(1_000_000)] },
      { nome: 'GAMA', posicoes: [posFixa(640_000)] },
    ]);
    const snap = normalize(raw, 'mensal', {}, {}, { ALFA: 0.0048, GAMA: 0.006 });
    assert.equal(snap.carteiras.find((c) => c.nome === 'ALFA')!.receita, 400);
    assert.equal(snap.carteiras.find((c) => c.nome === 'GAMA')!.receita, 320);
  });

  it('diário nunca tem receita, mesmo com taxa-map e mesmo com raw.receita', () => {
    const raw = rawSnapshot('2026-08-13', [
      { nome: 'ALFA', posicoes: [posFixa(1_000_000)], receita: 999.99 },
    ]);
    const snap = normalize(raw, 'diario', {}, {}, { ALFA: 0.0048 });
    assert.equal(snap.carteiras[0].receita, undefined);
  });

  it('raw.receita tem prioridade sobre taxa-map no mensal', () => {
    const raw = rawSnapshot('2026-06', [{ nome: 'ALFA', posicoes: [posFixa(1_000_000)], receita: 999.99 }]);
    const snap = normalize(raw, 'mensal', {}, {}, { ALFA: 0.0048 });
    assert.equal(snap.carteiras[0].receita, 999.99);
  });

  it('a chave do taxa-map é o nome canônico (pós name-map)', () => {
    const raw = rawSnapshot('2026-06', [
      { nome: 'X', posicoes: [posFixa(1_000_000)] },
      { nome: 'Y', posicoes: [posFixa(500_000)] },
    ]);
    const snap = normalize(raw, 'mensal', { X: 'ALFA' }, {}, { ALFA: 0.0048 });
    const alfa = snap.carteiras.find((c) => c.nome === 'ALFA')!;
    assert.equal(alfa.receita, 400, 'renomeada para ALFA, calcula pela taxa de ALFA');
    const y = snap.carteiras.find((c) => c.nome === 'Y')!;
    assert.equal(y.receita, undefined, 'sem taxa no mapa, sem receita');
  });

  it('loadTaxaMapping: local vence o produto; arquivo ilegível vira mapa vazio', () => {
    const root = tmpRoot();
    fs.writeFileSync(
      path.join(root, 'taxa-map.json'),
      JSON.stringify({ mappings: { ALFA: 0.0099, BETA: 0.008 } }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(root, 'taxa-map.local.json'),
      JSON.stringify({ mappings: { ALFA: 0.0048 } }),
      'utf8'
    );
    assert.deepEqual(loadTaxaMapping(root), { ALFA: 0.0048 }, 'local sobrepõe o produto');

    const sujo = tmpRoot();
    fs.writeFileSync(path.join(sujo, 'taxa-map.json'), '{quebrado', 'utf8');
    assert.deepEqual(loadTaxaMapping(sujo), {}, 'ilegível não quebra');
  });
});
