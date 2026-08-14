/**
 * Round-trip dos fixtures sintéticos: o gerador produz, os adaptadores leem e
 * o diff enxerga os eventos desenhados. Se um adaptador mudar de contrato e
 * quebrar o formato, este teste acusa — os fixtures são a fonte comum.
 *
 * Os fixtures são 100% sintéticos (nada de LGPD): o gerador é determinístico,
 * então o teste roda o gerador uma vez se a pasta não existir e usa os
 * arquivos versionados caso existam.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { diffSnapshots } from '../src/snapshot/diff.js';
import { carregarSnapshotDoDisco, ingestSnapshot } from '../src/snapshot/ingest.js';
import type { SnapshotEvent } from '../src/snapshot/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '..', '..', 'tests', 'fixtures-sinteticos');
const GERADOR = path.resolve(__dirname, '..', '..', 'scripts', 'gerar-fixtures-sinteticos.mjs');

const tmpDirs: string[] = [];
function tmpRoot(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-snap-fixtures-'));
  tmpDirs.push(d);
  return d;
}
after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

/** Python com pdfplumber disponível? O round-trip de PDF depende dele. */
function temPythonComPdfplumber(): boolean {
  try {
    execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', 'import pdfplumber'], {
      encoding: 'utf8',
      timeout: 15_000,
    });
    return true;
  } catch {
    return false;
  }
}

const PYTHON_OK = temPythonComPdfplumber();

before(() => {
  // o gerador é determinístico: regenerar sempre garante que os fixtures
  // versionados estão em sincronia com o código (e os bytes não mudam)
  execFileSync(process.execPath, [GERADOR], { encoding: 'utf8' });
});

function tipos(eventos: SnapshotEvent[]): string[] {
  return eventos.map((e) => e.tipo);
}

describe('fixtures sintéticos — semana diária', () => {
  it('semana ingere 5 dias e diffs emitem os eventos desenhados', async () => {
    const root = tmpRoot();
    const dias = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'];

    for (const dia of dias) {
      const arquivo = path.join(FIXTURES, 'diarios', `posicao-${dia}.xlsx`);
      const res = await ingestSnapshot({ arquivo, data: dia, fonte: 'custodiante-sintetico', formato: 'xlsx', root });
      assert.equal(res.status, 'criado');
    }

    const snap10 = carregarSnapshotDoDisco(root, '2026-08-10')!;
    assert.equal(snap10.carteiras.length, 3, 'ALFA, BETA e GAMA');
    const alfa10 = snap10.carteiras.find((c) => c.nome === 'ALFA')!;
    assert.equal(alfa10.plTotal, 1_000_000);

    const ev11 = diffSnapshots(carregarSnapshotDoDisco(root, '2026-08-11')!, carregarSnapshotDoDisco(root, '2026-08-10')!).eventos;
    assert.ok(tipos(ev11).includes('CASH_INCREASE'), '11/08: liquidez +5pp');
    const cash = ev11.find((e) => e.tipo === 'CASH_INCREASE')!;
    assert.equal(cash.carteira, 'ALFA');
    assert.equal(cash.delta, 50_000);

    const ev12 = diffSnapshots(carregarSnapshotDoDisco(root, '2026-08-12')!, carregarSnapshotDoDisco(root, '2026-08-11')!).eventos;
    assert.ok(tipos(ev12).includes('POSITION_CLOSED'), '12/08: CDB venceu');
    assert.ok(tipos(ev12).includes('NEW_POSITION'), '12/08: CDB renovado + LCI');
    const mat12 = ev12.find((e) => e.tipo === 'MATURITY_APPROACHING')!;
    assert.ok(mat12, '12/08: LCI a 7 dias');
    assert.ok(mat12.ativo?.includes('LCI BANCO W'), `ativo: ${mat12.ativo}`);
    assert.equal(mat12.evidencias.janelaDias, 7);

    const ev13 = diffSnapshots(carregarSnapshotDoDisco(root, '2026-08-13')!, carregarSnapshotDoDisco(root, '2026-08-12')!).eventos;
    assert.ok(tipos(ev13).includes('LARGE_WITHDRAWAL'), '13/08: saque grande em BETA');
    assert.ok(tipos(ev13).includes('CASH_DECREASE'), '13/08: liquidez de BETA cai');
    const saque = ev13.find((e) => e.tipo === 'LARGE_WITHDRAWAL')!;
    assert.equal(saque.carteira, 'BETA');
    assert.equal(saque.severidade, 'alta');

    const ev14 = diffSnapshots(carregarSnapshotDoDisco(root, '2026-08-14')!, carregarSnapshotDoDisco(root, '2026-08-13')!).eventos;
    assert.ok(tipos(ev14).includes('CONCENTRATION_INCREASE'), '14/08: concentração em GAMA');
    assert.ok(tipos(ev14).includes('ALLOCATION_SHIFT'), '14/08: alocação em GAMA');
    const conc = ev14.find((e) => e.tipo === 'CONCENTRATION_INCREASE')!;
    assert.equal(conc.carteira, 'GAMA');
  });
});

describe('fixtures sintéticos — mensal', () => {
  it('2026-05 → 2026-06 emite os eventos mensais desenhados', async () => {
    const root = tmpRoot();
    // taxa-map da instância: fonte da receita da casa no mensal (Fase 5).
    fs.copyFileSync(path.join(FIXTURES, 'taxa-map.json'), path.join(root, 'taxa-map.local.json'));
    await ingestSnapshot({ arquivo: path.join(FIXTURES, 'mensais', 'posicao-2026-05.xlsx'), data: '2026-05', fonte: 'custodiante-sintetico', formato: 'xlsx', root });
    await ingestSnapshot({ arquivo: path.join(FIXTURES, 'mensais', 'posicao-2026-06.xlsx'), data: '2026-06', fonte: 'custodiante-sintetico', formato: 'xlsx', root });

    const ev = diffSnapshots(carregarSnapshotDoDisco(root, '2026-06')!, carregarSnapshotDoDisco(root, '2026-05')!).eventos;
    assert.ok(tipos(ev).includes('CASH_INCREASE'), 'mensal: liquidez +6%');
    assert.ok(tipos(ev).includes('NEW_POSITION'), 'mensal: LCI nova');
    const mat = ev.find((e) => e.tipo === 'MATURITY_APPROACHING' && e.ativo?.includes('LCI MENSAL NOVA'))!;
    assert.ok(mat, 'mensal: vencimento na janela 30 (referência = fim do mês)');
    assert.equal(mat.evidencias.janelaDias, 30);

    // Fase 5: exatamente um REVENUE_DROP, desenhado em GAMA (PL -6,25% com
    // taxa fixa 0,006 → receita 320,00 → 300,00, queda 6,25%).
    const drops = ev.filter((e) => e.tipo === 'REVENUE_DROP');
    assert.equal(drops.length, 1, 'um unico REVENUE_DROP');
    const drop = drops[0];
    assert.equal(drop.carteira, 'GAMA');
    assert.equal(drop.valorAnterior, 320);
    assert.equal(drop.valorAtual, 300);
    assert.equal(drop.delta, -20);
    assert.equal(drop.deltaPct, -0.0625);
    assert.equal(drop.severidade, 'baixa');
    assert.deepEqual(drop.evidencias, { receitaBase: 320, receitaAtual: 300, queda: 20 });
  });
});

describe('fixtures sintéticos — formatos do dia 13', () => {
  it('csv, html e json produzem o mesmo retrato do xlsx do mesmo dia', async () => {
    const rootXlsx = tmpRoot();
    await ingestSnapshot({ arquivo: path.join(FIXTURES, 'diarios', 'posicao-2026-08-13.xlsx'), data: '2026-08-13', fonte: 'custodiante-sintetico', formato: 'xlsx', root: rootXlsx });
    const ref = carregarSnapshotDoDisco(rootXlsx, '2026-08-13')!;

    for (const formato of ['csv', 'html', 'api-json'] as const) {
      const rootF = tmpRoot();
      const arquivo = path.join(FIXTURES, 'formatos', `diario-2026-08-13.${formato === 'api-json' ? 'json' : formato}`);
      await ingestSnapshot({ arquivo, data: '2026-08-13', fonte: 'custodiante-sintetico', formato, root: rootF });
      const snap = carregarSnapshotDoDisco(rootF, '2026-08-13')!;

      assert.equal(snap.carteiras.length, ref.carteiras.length, `formatos ${formato}: mesmas carteiras`);
      const alfaF = snap.carteiras.find((c) => c.nome === 'ALFA')!;
      const alfaRef = ref.carteiras.find((c) => c.nome === 'ALFA')!;
      assert.equal(alfaF.plTotal, alfaRef.plTotal, `formatos ${formato}: mesmo plTotal de ALFA`);
      assert.equal(alfaF.posicoes.length, alfaRef.posicoes.length, `formatos ${formato}: mesmas posições de ALFA`);
    }

    // B3 posicional: as carteiras vêm como conta de cliente (8 dígitos); o
    // name-map da instância mapeia conta → nome canônico, e o class-map
    // classifica o ativo (o arquivo posicional não carrega classe). O mesmo
    // fluxo real, com os dois mapas lado a lado.
    const rootB3 = tmpRoot();
    fs.writeFileSync(
      path.join(rootB3, 'name-map.local.json'),
      JSON.stringify({ mappings: { '00000123': 'ALFA', '00000456': 'BETA', '00000789': 'GAMA' } }),
      'utf8'
    );
    fs.copyFileSync(
      path.join(FIXTURES, 'formatos', 'class-map-b3.json'),
      path.join(rootB3, 'class-map.local.json')
    );
    await ingestSnapshot({
      arquivo: path.join(FIXTURES, 'formatos', 'diario-2026-08-13-b3.txt'),
      data: '2026-08-13',
      fonte: 'custodiante-sintetico',
      formato: 'txt-b3',
      root: rootB3,
    });
    const snapB3 = carregarSnapshotDoDisco(rootB3, '2026-08-13')!;
    assert.equal(snapB3.carteiras.length, ref.carteiras.length, 'txt-b3: mesmas carteiras');
    const alfaB3 = snapB3.carteiras.find((c) => c.nome === 'ALFA')!;
    const alfaRef2 = ref.carteiras.find((c) => c.nome === 'ALFA')!;
    assert.equal(alfaB3.plTotal, alfaRef2.plTotal, 'txt-b3: mesmo plTotal de ALFA');
    assert.equal(alfaB3.posicoes.length, alfaRef2.posicoes.length, 'txt-b3: mesmas posições de ALFA');
    assert.deepEqual(
      alfaB3.posicoes.map((p) => p.classe).sort(),
      alfaRef2.posicoes.map((p) => p.classe).sort(),
      'txt-b3: mesmas classes via class-map'
    );
  });

  it('book PDF (mes 06) produz o mesmo retrato do xlsx mensal (round-trip)', { skip: !PYTHON_OK && 'python+pdfplumber indisponiveis' }, async () => {
    const rootXlsx = tmpRoot();
    await ingestSnapshot({ arquivo: path.join(FIXTURES, 'mensais', 'posicao-2026-06.xlsx'), data: '2026-06', fonte: 'custodiante-sintetico', formato: 'xlsx', root: rootXlsx });
    const ref = carregarSnapshotDoDisco(rootXlsx, '2026-06')!;

    const rootPdf = tmpRoot();
    // name-map da instância: o nome da capa do book (código) mapeia para o
    // nome canônico da carteira — o mesmo fluxo do mundo real.
    fs.writeFileSync(
      path.join(rootPdf, 'name-map.local.json'),
      JSON.stringify({ mappings: { TESTE_06A: 'ALFA', TESTE_06B: 'BETA', TESTE_06G: 'GAMA' } }),
      'utf8'
    );
    const books = path.join(FIXTURES, 'books');
    await ingestSnapshot({ arquivo: books, data: '2026-06', fonte: 'custodiante-sintetico', formato: 'pdf', root: rootPdf });
    const snapPdf = carregarSnapshotDoDisco(rootPdf, '2026-06')!;

    const alfaRef = ref.carteiras.find((c) => c.nome === 'ALFA')!;
    const alfaPdf = snapPdf.carteiras.find((c) => c.nome === 'ALFA')!;
    assert.ok(alfaPdf, 'PDF: ALFA presente');
    assert.equal(alfaPdf.plTotal, alfaRef.plTotal, 'PDF: mesmo plTotal de ALFA');
    assert.equal(alfaPdf.posicoes.length, alfaRef.posicoes.length, 'PDF: mesmas posições de ALFA');
  });
});
