/**
 * Testes do tenantId — rótulo do cliente dono dos artefatos (caminho
 * multi-cliente, 2026-08-21). Fixtures 100% sintéticas em mkdtemp.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { carregarSnapshotDoDisco, ingestSnapshot } from '../src/snapshot/ingest.js';
import { salvarEventsFile } from '../src/snapshot/diff.js';
import { tenantDe, validarSnapshot, validarTenant } from '../src/snapshot/pipeline.js';
import type { Snapshot } from '../src/snapshot/types.js';

const DATA = '2026-08-13';
const FONTE = 'teste-sintetico';

const tmpDirs: string[] = [];
function tmpRoot(): { root: string; arquivo: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-snap-tenant-'));
  tmpDirs.push(root);
  const arquivo = path.join(root, 'diario.csv');
  fs.writeFileSync(
    arquivo,
    [
      'carteira,ativo,classe,valor,vencimento,quantidade',
      'Teste Alfa,Caixa Geral,Liquidez,100000,,',
      'Teste Alfa,Fundo XYZ,Renda Fixa,900000,2027-03-01,1000',
    ].join('\n'),
    'utf8'
  );
  return { root, arquivo };
}
after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

describe('tenantId', () => {
  it('ingest com --tenant grava o rótulo no snapshot e no ingestion', async () => {
    const { root, arquivo } = tmpRoot();
    await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root, tenantId: 'cliente-a' });

    const snap = carregarSnapshotDoDisco(root, DATA)!;
    assert.equal(snap.tenantId, 'cliente-a');
    const ingestion = JSON.parse(fs.readFileSync(path.join(root, 'audits', DATA, 'ingestion.json'), 'utf8'));
    assert.equal(ingestion.tenantId, 'cliente-a');
  });

  it('sem --tenant grava default', async () => {
    const { root, arquivo } = tmpRoot();
    await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root });
    const snap = carregarSnapshotDoDisco(root, DATA)!;
    assert.equal(snap.tenantId, 'default');
  });

  it('tenant com separador de path é rejeitado', async () => {
    const { root, arquivo } = tmpRoot();
    await assert.rejects(
      () => ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root, tenantId: 'a/b' }),
      /Tenant invalido/
    );
    await assert.rejects(
      () => ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root, tenantId: 'a\\b' }),
      /Tenant invalido/
    );
  });

  it('tenant vazio é rejeitado', async () => {
    const { root, arquivo } = tmpRoot();
    await assert.rejects(
      () => ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root, tenantId: '   ' }),
      /Tenant vazio/
    );
  });

  it('snapshot antigo sem tenantId lê como default (compat)', () => {
    const antigo = {
      schema: 'snapshot/v1',
      data: DATA,
      periodo: 'diario',
      fonte: FONTE,
      geradoEm: '2026-08-13T00:00:00.000Z',
      engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
      carteiras: [],
    } as unknown as Snapshot;
    assert.equal(tenantDe(antigo), 'default');
    assert.equal(validarTenant('cliente-a'), 'cliente-a');
  });

  it('events.json carrega o tenant do snapshot do dia', async () => {
    const { root, arquivo } = tmpRoot();
    await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root, tenantId: 'cliente-a' });
    const snap = carregarSnapshotDoDisco(root, DATA)!;
    const p = salvarEventsFile(root, DATA, { baseData: null, eventos: [] }, tenantDe(snap));
    const events = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.equal(events.tenantId, 'cliente-a');
  });

  it('validarSnapshot pega plTotal divergente da soma', () => {
    const ruim = {
      schema: 'snapshot/v1',
      data: DATA,
      periodo: 'diario',
      fonte: FONTE,
      geradoEm: '2026-08-13T00:00:00.000Z',
      engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
      tenantId: 'cliente-a',
      carteiras: [
        {
          nome: 'Teste Alfa',
          plTotal: 1_000_001, // soma real: 1_000_000
          posicoes: [{ carteira: 'Teste Alfa', ativo: 'Caixa Geral', classe: 'Liquidez', valor: 1_000_000, vencimento: null, quantidade: null, instituicao: null }],
        },
      ],
    } as unknown as Snapshot;
    assert.throws(() => validarSnapshot(ruim), /plTotal diverge/);
  });

  it('validarSnapshot pega carteira duplicada', () => {
    const pos = [{ carteira: 'Dup', ativo: 'Caixa', classe: 'Liquidez', valor: 10, vencimento: null, quantidade: null, instituicao: null }];
    const ruim = {
      schema: 'snapshot/v1',
      data: DATA,
      periodo: 'diario',
      fonte: FONTE,
      geradoEm: '2026-08-13T00:00:00.000Z',
      engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
      tenantId: 'cliente-a',
      carteiras: [
        { nome: 'Dup', plTotal: 10, posicoes: pos },
        { nome: 'Dup', plTotal: 10, posicoes: pos },
      ],
    } as unknown as Snapshot;
    assert.throws(() => validarSnapshot(ruim), /duplicada/);
  });
});
