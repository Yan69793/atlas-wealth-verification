import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { runEngine } from '../src/engine.js';
import { parseExcelV2 } from '../src/parsers/excel-v2.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ATLAS_FIXTURES aponta para onde o dado real vive (a instancia do cliente).
// Nao derivar por path.resolve a partir de __dirname: isso responde coisas
// diferentes conforme rode do dist, da fonte, do repo produto ou do submodule,
// e foi assim que esta suite passou meses pulando sem ninguem notar.
const FIXTURES = process.env.ATLAS_FIXTURES;
const XLSX = FIXTURES ? path.join(FIXTURES, 'Verificacao_Carteiras_Abril_2026_v2.xlsx') : null;
const LEGACY = path.resolve(__dirname, '..', '..', 'tests', 'fixtures', 'abril-2026-legacy.anon.json');

// Sem ATLAS_FIXTURES, pula (dev local sem dado real). Com a var setada e o
// arquivo ausente, e ERRO: silencio aqui e o mesmo modo de falha que o
// docs/operacao.md chama de mais perigoso.
if (FIXTURES && !fs.existsSync(XLSX!)) {
  throw new Error(`ATLAS_FIXTURES setada mas XLSX ausente: ${XLSX}`);
}

describe('parity abril 2026', { skip: !FIXTURES && 'ATLAS_FIXTURES ausente (rode com a raiz da instancia)' }, () => {
  it('processa 79 carteiras com 1 CORRIGIR (SC)', async () => {
    const carteiras = await parseExcelV2({ arquivo: XLSX!, mes: '2026-04', baseline: '2026-03' });
    assert.equal(carteiras.length, 79);

    const output = runEngine(carteiras, {
      meta: { mes: '2026-04', baseline: '2026-03', arquivo: 'Verificacao_Carteiras_Abril_2026_v2.xlsx', processadoEm: new Date().toISOString() },
    });

    assert.equal(output.dashboard.summary.totals.total, 79);
    assert.equal(output.dashboard.summary.totals.corrigir, 1);

    const sc = output.results.find((r) => r.nome === 'SC');
    assert.equal(sc?.status, 'CORRIGIR');

    const raw = JSON.parse(fs.readFileSync(LEGACY, 'utf-8'));
    const leg = raw.dashboard ?? raw;
    assert.equal(leg.summary.totals.corrigir, 1);
    assert.equal(leg.summary.totals.total, 79);
  });

  it('PL total dentro de 0.01% do legacy', async () => {
    const carteiras = await parseExcelV2({ arquivo: XLSX!, mes: '2026-04', baseline: '2026-03' });
    const raw = JSON.parse(fs.readFileSync(LEGACY, 'utf-8'));
    const leg = raw.dashboard ?? raw;

    const plNew = carteiras.reduce((s, c) => s + c.plRef, 0);
    const plOld = leg.carteiras.reduce((s: number, c: { plRef: number }) => s + c.plRef, 0);
    const diff = Math.abs(plNew - plOld) / plOld;

    assert.ok(diff < 0.0001);
  });
});