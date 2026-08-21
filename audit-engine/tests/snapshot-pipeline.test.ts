/**
 * Testes do pipeline de ingestão — fila de exceção e reconciliação
 * (2026-08-21). Fixtures 100% sintéticas em mkdtemp.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ingestSnapshot } from '../src/snapshot/ingest.js';
import { reconciliar } from '../src/snapshot/pipeline.js';
import { carregarSnapshotDoDisco } from '../src/snapshot/ingest.js';

const FONTE = 'teste-sintetico';

const tmpDirs: string[] = [];
function tmpRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-snap-pipeline-'));
  tmpDirs.push(root);
  return root;
}
function csv(root: string, nome: string, linhas: string[]): string {
  const p = path.join(root, nome);
  fs.writeFileSync(p, ['carteira,ativo,classe,valor,vencimento,quantidade', ...linhas].join('\n'), 'utf8');
  return p;
}
after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

describe('fila de exceção', () => {
  it('arquivo que falha vai para a fila com cópia e manifest, e o erro relança', async () => {
    const root = tmpRoot();
    const xls = path.join(root, 'antigo.xls');
    fs.writeFileSync(xls, 'binary');

    await assert.rejects(
      () => ingestSnapshot({ arquivo: xls, data: '2026-08-13', fonte: FONTE, root }),
      /\.xls \(binario\) nao suportado/
    );

    const fila = path.join(root, 'audits', '2026-08-13', 'fila-excecao');
    const arquivos = fs.readdirSync(fila);
    assert.ok(arquivos.some((f) => f.endsWith('.orig')), 'cópia do arquivo na fila');
    const manifest = arquivos.find((f) => f.endsWith('.json'));
    assert.ok(manifest, 'manifest na fila');
    const m = JSON.parse(fs.readFileSync(path.join(fila, manifest!), 'utf8'));
    assert.equal(m.schema, 'excecao/v1');
    assert.match(m.erro, /\.xls \(binario\) nao suportado/);
    assert.equal(m.arquivoOriginal, 'antigo.xls');
    assert.ok(!fs.existsSync(path.join(root, 'audits', '2026-08-13', 'snapshot.json')));
  });

  it('snapshot sem carteiras: nada gravado como snapshot, fila registra a exceção', async () => {
    const root = tmpRoot();
    const vazio = csv(root, 'vazio.csv', []);
    await assert.rejects(
      () => ingestSnapshot({ arquivo: vazio, data: '2026-08-13', fonte: FONTE, formato: 'csv', root }),
      /sem nenhuma linha de posicao/
    );
    const dir = path.join(root, 'audits', '2026-08-13');
    assert.ok(!fs.existsSync(path.join(dir, 'snapshot.json')), 'nenhum snapshot gravado');
    assert.ok(!fs.existsSync(path.join(dir, 'ingestion.json')), 'nenhum ingestion gravado');
    const fila = path.join(dir, 'fila-excecao');
    assert.ok(fs.existsSync(fila), 'fila de exceção criada');
    const manifest = fs.readdirSync(fila).find((f) => f.endsWith('.json'));
    assert.ok(manifest);
    const m = JSON.parse(fs.readFileSync(path.join(fila, manifest!), 'utf8'));
    assert.match(m.erro, /sem nenhuma linha de posicao/);
    assert.equal(m.tenantId, 'default');
  });
});

describe('reconciliação', () => {
  it('grava fatos contra o período anterior: delta de PL, novas e sumidas', async () => {
    const root = tmpRoot();
    const dia1 = csv(root, 'dia1.csv', [
      'Teste Alfa,Caixa Geral,Liquidez,100000,,',
      'Teste Beta,Caixa Geral,Liquidez,50000,,',
    ]);
    await ingestSnapshot({ arquivo: dia1, data: '2026-08-13', fonte: FONTE, formato: 'csv', root, tenantId: 'cliente-a' });

    const dia2 = csv(root, 'dia2.csv', [
      'Teste Alfa,Caixa Geral,Liquidez,120000,,',
      'Teste Gama,Caixa Geral,Liquidez,30000,,',
    ]);
    await ingestSnapshot({ arquivo: dia2, data: '2026-08-14', fonte: FONTE, formato: 'csv', root, tenantId: 'cliente-a' });

    const r = JSON.parse(fs.readFileSync(path.join(root, 'audits', '2026-08-14', 'reconciliacao.json'), 'utf8'));
    assert.equal(r.schema, 'reconciliacao/v1');
    assert.equal(r.baseData, '2026-08-13');
    assert.equal(r.tenantId, 'cliente-a');
    assert.deepEqual(r.carteirasNovas, ['Teste Gama']);
    assert.deepEqual(r.carteirasSumidas, ['Teste Beta']);
    assert.equal(r.carteirasEmComum.length, 1);
    const alfa = r.carteirasEmComum[0];
    assert.equal(alfa.carteira, 'Teste Alfa');
    assert.equal(alfa.plAnterior, 100_000);
    assert.equal(alfa.plAtual, 120_000);
    assert.equal(alfa.delta, 20_000);
    assert.equal(alfa.deltaPct, 0.2);
  });

  it('linha de base (sem período anterior) não grava reconciliacao.json', async () => {
    const root = tmpRoot();
    const dia1 = csv(root, 'dia1.csv', ['Teste Alfa,Caixa Geral,Liquidez,100000,,']);
    await ingestSnapshot({ arquivo: dia1, data: '2026-08-13', fonte: FONTE, formato: 'csv', root });
    assert.ok(!fs.existsSync(path.join(root, 'audits', '2026-08-13', 'reconciliacao.json')));
  });

  it('reconciliação direta funciona mesmo com snapshot carregado do disco', () => {
    // Cobre o caminho usado pelo ingest: encontrarPeriodoAnterior lê o disco.
    // Aqui só o contrato mínimo: sem anterior, não lança nem grava.
    const root = tmpRoot();
    const snap = {
      schema: 'snapshot/v1',
      data: '2026-08-13',
      periodo: 'diario',
      fonte: FONTE,
      geradoEm: '2026-08-13T00:00:00.000Z',
      engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
      tenantId: 'cliente-a',
      carteiras: [{ nome: 'Teste Alfa', plTotal: 100_000, posicoes: [{ carteira: 'Teste Alfa', ativo: 'Caixa', classe: 'Liquidez', valor: 100_000, vencimento: null, quantidade: null, instituicao: null }] }],
    } as Parameters<typeof reconciliar>[3];
    // Não lança sem período anterior; não grava nada.
    reconciliar(root, '2026-08-13', 'cliente-a', snap);
    assert.ok(!fs.existsSync(path.join(root, 'audits', '2026-08-13', 'reconciliacao.json')));
  });

  it('snapshot gravado com tenant lê de volta com tenantDe', async () => {
    const root = tmpRoot();
    const dia1 = csv(root, 'dia1.csv', ['Teste Alfa,Caixa Geral,Liquidez,100000,,']);
    await ingestSnapshot({ arquivo: dia1, data: '2026-08-13', fonte: FONTE, formato: 'csv', root, tenantId: 'cliente-b' });
    const snap = carregarSnapshotDoDisco(root, '2026-08-13')!;
    assert.equal(snap.tenantId, 'cliente-b');
  });
});
