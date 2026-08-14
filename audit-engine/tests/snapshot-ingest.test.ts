/**
 * Testes de ingestão do snapshot EOD — idempotência, hash, reingestão,
 * validação e name-map. Fixtures 100% sintéticas em mkdtemp.
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { carregarSnapshotDoDisco, ingestSnapshot } from '../src/snapshot/ingest.js';

const DATA = '2026-08-13';
const FONTE = 'teste-sintetico';

const tmpDirs: string[] = [];
function tmpRoot(): { root: string; arquivo: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-snap-ingest-'));
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

function sha256Arquivo(p: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

describe('ingestSnapshot', () => {
  it('cria ingestion.json e snapshot.json com hash e basename', async () => {
    const { root, arquivo } = tmpRoot();
    const res = await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root });

    assert.equal(res.status, 'criado');
    const ingestion = JSON.parse(fs.readFileSync(res.caminhos.ingestion, 'utf8'));
    assert.equal(ingestion.sha256, sha256Arquivo(arquivo));
    assert.match(ingestion.sha256, /^[0-9a-f]{64}$/);
    assert.equal(ingestion.arquivo, 'diario.csv');
    assert.equal(ingestion.formato, 'csv');
    assert.deepEqual(ingestion.historico, []);

    const snap = JSON.parse(fs.readFileSync(res.caminhos.snapshot, 'utf8'));
    assert.equal(snap.schema, 'snapshot/v1');
    assert.equal(snap.carteiras[0].plTotal, 1_000_000); // derivado: soma das posições
    assert.equal(snap.carteiras[0].nome, 'Teste Alfa');
  });

  it('segunda execução com mesmo arquivo pula (status skip) e nada muda', async () => {
    const { root, arquivo } = tmpRoot();
    await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root });
    const snapAntes = fs.readFileSync(path.join(root, 'audits', DATA, 'snapshot.json'), 'utf8');

    const res = await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root });
    assert.equal(res.status, 'skip');
    const snapDepois = fs.readFileSync(path.join(root, 'audits', DATA, 'snapshot.json'), 'utf8');
    assert.equal(snapAntes, snapDepois);
  });

  it('reingestão com hash diferente arquiva o anterior e registra histórico', async () => {
    const { root, arquivo } = tmpRoot();
    await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root });
    const hash1 = sha256Arquivo(arquivo);

    const v2 = path.join(root, 'diario-v2.csv');
    fs.writeFileSync(
      v2,
      'carteira,ativo,classe,valor,vencimento,quantidade\nTeste Alfa,Caixa Geral,Liquidez,110000,,\nTeste Alfa,Fundo XYZ,Renda Fixa,900000,2027-03-01,1000\n',
      'utf8'
    );
    const res = await ingestSnapshot({ arquivo: v2, data: DATA, fonte: FONTE, formato: 'csv', root });

    assert.equal(res.status, 'reingerido');
    const dir = path.join(root, 'audits', DATA);
    const arquivado = path.join(dir, `snapshot.${hash1.slice(0, 8)}.json`);
    assert.ok(fs.existsSync(arquivado), 'snapshot anterior arquivado');
    const arquivadoSnap = JSON.parse(fs.readFileSync(arquivado, 'utf8'));
    assert.equal(arquivadoSnap.carteiras[0].posicoes[0].valor, 100_000);

    const ingestion = JSON.parse(fs.readFileSync(path.join(dir, 'ingestion.json'), 'utf8'));
    assert.equal(ingestion.historico.length, 1);
    assert.equal(ingestion.historico[0].sha256, hash1);

    const snapNovo = JSON.parse(fs.readFileSync(path.join(dir, 'snapshot.json'), 'utf8'));
    assert.equal(snapNovo.carteiras[0].posicoes[0].valor, 110_000);
  });

  it('formato desconhecido gera erro listando os suportados', async () => {
    const { root, arquivo } = tmpRoot();
    const estranho = path.join(root, 'arquivo.xyz');
    fs.writeFileSync(estranho, 'x');
    await assert.rejects(
      () => ingestSnapshot({ arquivo: estranho, data: DATA, fonte: FONTE, root }),
      /Formato desconhecido/
    );
    await assert.rejects(
      () => ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'foo' as never, root }),
      /Formato desconhecido/
    );
  });

  it('snapshot sem carteiras não grava nada', async () => {
    const { root } = tmpRoot();
    const vazio = path.join(root, 'vazio.csv');
    fs.writeFileSync(vazio, 'carteira,ativo,valor\n', 'utf8');
    await assert.rejects(() => ingestSnapshot({ arquivo: vazio, data: DATA, fonte: FONTE, formato: 'csv', root }));
    assert.ok(!fs.existsSync(path.join(root, 'audits', DATA)));
  });

  it('name-map.local.json da instância renomeia a carteira', async () => {
    const { root, arquivo } = tmpRoot();
    fs.writeFileSync(
      path.join(root, 'name-map.local.json'),
      JSON.stringify({ mappings: { 'Teste Alfa': 'TESTE-ALFA' } }),
      'utf8'
    );
    await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root });
    const snap = carregarSnapshotDoDisco(root, DATA)!;
    assert.equal(snap.carteiras[0].nome, 'TESTE-ALFA');
  });

  it('--force reprocessa mesmo com o mesmo hash', async () => {
    const { root, arquivo } = tmpRoot();
    await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root });
    const res = await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root, force: true });
    assert.equal(res.status, 'criado'); // com force, anterior é ignorado
  });

  it('data inválida e fonte com separador de path são rejeitadas', async () => {
    const { root, arquivo } = tmpRoot();
    await assert.rejects(
      () => ingestSnapshot({ arquivo, data: '2026-13-99', fonte: FONTE, formato: 'csv', root }),
      /Data invalida/
    );
    await assert.rejects(
      () => ingestSnapshot({ arquivo, data: DATA, fonte: 'a/b', formato: 'csv', root }),
      /Fonte invalida/
    );
  });

  it('ingestion.json corrompido não derruba a reingestão (recupera como ausente)', async () => {
    const { root, arquivo } = tmpRoot();
    await ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root });

    fs.writeFileSync(path.join(root, 'audits', DATA, 'ingestion.json'), '{quebrado', 'utf8');
    const v2 = path.join(root, 'diario-v2.csv');
    fs.writeFileSync(
      v2,
      'carteira,ativo,classe,valor,vencimento,quantidade\nTeste Alfa,Caixa Geral,Liquidez,110000,,\nTeste Alfa,Fundo XYZ,Renda Fixa,900000,2027-03-01,1000\n',
      'utf8'
    );
    const res = await ingestSnapshot({ arquivo: v2, data: DATA, fonte: FONTE, formato: 'csv', root });
    assert.equal(res.status, 'reingerido');
    const ingestion = JSON.parse(fs.readFileSync(path.join(root, 'audits', DATA, 'ingestion.json'), 'utf8'));
    assert.equal(ingestion.historico.length, 0); // histórico recomeçou (o anterior era ilegível)
  });

  it('--root dentro do repo do produto é recusado', async () => {
    const { root, arquivo } = tmpRoot();
    fs.writeFileSync(path.join(root, 'platform-app.jsx'), '// assinatura do produto', 'utf8');
    await assert.rejects(
      () => ingestSnapshot({ arquivo, data: DATA, fonte: FONTE, formato: 'csv', root }),
      /repo do produto/
    );
  });

  it('vencimento malformado e ativo duplicado são rejeitados na normalização', async () => {
    const { root } = tmpRoot();
    const vencRuim = path.join(root, 'venc-ruim.csv');
    fs.writeFileSync(
      vencRuim,
      'carteira,ativo,classe,valor,vencimento,quantidade\nTeste Alfa,Fundo XYZ,Renda Fixa,900000,13/08/2026,1000\n',
      'utf8'
    );
    await assert.rejects(
      () => ingestSnapshot({ arquivo: vencRuim, data: DATA, fonte: FONTE, formato: 'csv', root }),
      /vencimento malformado/
    );

    const dup = path.join(root, 'dup.csv');
    fs.writeFileSync(
      dup,
      'carteira,ativo,classe,valor,vencimento,quantidade\nTeste Alfa,Fundo XYZ,Renda Fixa,400000,,\nTeste Alfa,Fundo XYZ,Renda Fixa,500000,,\n',
      'utf8'
    );
    await assert.rejects(
      () => ingestSnapshot({ arquivo: dup, data: DATA, fonte: FONTE, formato: 'csv', root }),
      /ativo duplicado/
    );
  });

  it('.xls binário é rejeitado com mensagem própria', async () => {
    const { root } = tmpRoot();
    const xls = path.join(root, 'antigo.xls');
    fs.writeFileSync(xls, 'binary');
    await assert.rejects(
      () => ingestSnapshot({ arquivo: xls, data: DATA, fonte: FONTE, root }),
      /\.xls \(binario\) nao suportado/
    );
  });

  it('modo mensal: --data AAAA-MM grava snapshot com periodo mensal', async () => {
    const { root, arquivo } = tmpRoot();
    const res = await ingestSnapshot({ arquivo, data: '2026-06', fonte: FONTE, formato: 'csv', root });
    assert.equal(res.status, 'criado');
    const snap = JSON.parse(fs.readFileSync(path.join(root, 'audits', '2026-06', 'snapshot.json'), 'utf8'));
    assert.equal(snap.periodo, 'mensal');
    assert.equal(snap.data, '2026-06');
  });

  it('modo mensal: mês inválido é rejeitado', async () => {
    const { root, arquivo } = tmpRoot();
    await assert.rejects(
      () => ingestSnapshot({ arquivo, data: '2026-13', fonte: FONTE, formato: 'csv', root }),
      /Data invalida/
    );
  });
});
