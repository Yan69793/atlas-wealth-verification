import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { runEngine } from '../src/engine.js';
import { parseExcelV2 } from '../src/parsers/excel-v2.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');
const XLSX = path.join(ROOT, 'Verificacao_Carteiras_Abril_2026_v2.xlsx');
// Snapshot congelado do audit.json Excel-only de abril (commit 45a3f79), imune a
// reingestoes posteriores que sobrescrevem audits/2026-04/audit.json com outra fonte.
// Referenciado a partir da arvore fonte (nao dist/), pois e um fixture estatico
// que o build tsc nao copia.
const LEGACY = path.join(ROOT, 'audit-engine', 'tests', 'fixtures', 'abril-2026-legacy.json');

// Pula quando o XLSX de abril não está presente (dado real fora do ATLAS).
describe('parity abril 2026', { skip: !fs.existsSync(XLSX) && 'fixture XLSX de abril ausente (dado real fora do ATLAS)' }, () => {
  it('processa 79 carteiras com 1 CORRIGIR (SC)', async () => {
    const carteiras = await parseExcelV2({ arquivo: XLSX, mes: '2026-04', baseline: '2026-03' });
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
    const carteiras = await parseExcelV2({ arquivo: XLSX, mes: '2026-04', baseline: '2026-03' });
    const raw = JSON.parse(fs.readFileSync(LEGACY, 'utf-8'));
    const leg = raw.dashboard ?? raw;

    const plNew = carteiras.reduce((s, c) => s + c.plRef, 0);
    const plOld = leg.carteiras.reduce((s: number, c: { plRef: number }) => s + c.plRef, 0);
    const diff = Math.abs(plNew - plOld) / plOld;

    assert.ok(diff < 0.0001);
  });
});