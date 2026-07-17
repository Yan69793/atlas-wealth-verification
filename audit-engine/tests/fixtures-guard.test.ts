import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

// Este teste existe porque as suites de parity pulavam em silencio: o XLSX
// nunca esteve no caminho que elas calculavam, e npm test ficava verde. Se
// ATLAS_FIXTURES esta setada, os fixtures TEM que estar la. Ausencia e erro,
// nunca skip. Sem a var, este teste passa e o CI e quem garante que ela existe.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('guarda dos fixtures de parity', () => {
  it('ATLAS_FIXTURES, quando setada, aponta para fixtures que existem', () => {
    const raiz = process.env.ATLAS_FIXTURES;
    if (!raiz) {
      console.warn('AVISO: ATLAS_FIXTURES ausente. As suites de parity vao pular. Isto so e aceitavel fora do CI.');
      return;
    }

    assert.ok(fs.existsSync(raiz), `ATLAS_FIXTURES aponta para diretorio inexistente: ${raiz}`);

    const xlsx = path.join(raiz, 'Verificacao_Carteiras_Abril_2026_v2.xlsx');
    assert.ok(fs.existsSync(xlsx), `XLSX de abril ausente em ${xlsx}`);
  });

  it('o gabarito anonimizado esta versionado e integro', () => {
    // __dirname aponta para dist/tests em runtime; o fixture estatico vive na
    // arvore fonte (o build tsc nao copia .json), entao subimos ate a raiz do
    // audit-engine e descemos para tests/fixtures.
    const legacy = path.resolve(__dirname, '..', '..', 'tests', 'fixtures', 'abril-2026-legacy.anon.json');
    assert.ok(fs.existsSync(legacy), `gabarito anonimizado ausente: ${legacy}`);

    const raw = JSON.parse(fs.readFileSync(legacy, 'utf-8'));
    const leg = raw.dashboard ?? raw;
    assert.equal(leg.summary.totals.total, 79);
    assert.equal(leg.summary.totals.corrigir, 1);
    assert.ok(Array.isArray(leg.carteiras) && leg.carteiras.length === 79);
    assert.ok(leg.carteiras.every((c: { plRef: unknown }) => typeof c.plRef === 'number'));
  });
});
