/**
 * Testes dos adaptadores do snapshot EOD — fixtures 100% sintéticas em memória.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { parseApiJson } from '../src/snapshot/adapters/api-json.js';
import { parseCsv } from '../src/snapshot/adapters/csv.js';
import { parseHtml } from '../src/snapshot/adapters/html.js';
import { parsePdf } from '../src/snapshot/adapters/pdf.js';
import { parseTxtB3 } from '../src/snapshot/adapters/txt-b3.js';
import { parseXlsx } from '../src/snapshot/adapters/xlsx.js';

const DATA = '2026-08-13';
const FONTE = 'teste-sintetico';

const tmpDirs: string[] = [];
function tmpDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-snap-adapters-'));
  tmpDirs.push(d);
  return d;
}
after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

describe('adaptador CSV', () => {
  const CSV_OK = [
    'carteira,ativo,classe,valor,vencimento,quantidade',
    'Teste Alfa,Caixa Geral,Liquidez,"100.000,00",,',
    'Teste Alfa,Fundo XYZ,Renda Fixa,"900.000,00",2027-03-01,1000',
    'Teste Beta,CDB Banco,Renda Fixa,"50.000,00",2026-09-01,',
  ].join('\n');

  it('parseia header completo com valores BR', () => {
    const snap = parseCsv(CSV_OK, FONTE, DATA);
    assert.equal(snap.carteiras.length, 2);
    const alfa = snap.carteiras.find((c) => c.nome === 'Teste Alfa')!;
    assert.equal(alfa.posicoes.length, 2);
    assert.equal(alfa.posicoes[0].valor, 100_000);
    assert.equal(alfa.posicoes[1].valor, 900_000);
    assert.equal(alfa.posicoes[1].vencimento, '2027-03-01');
    assert.equal(alfa.posicoes[1].quantidade, 1000);
  });

  it('rejeita valor nao numerico citando a linha', () => {
    const csv = 'carteira,ativo,valor\nX,A,abc\n';
    assert.throws(() => parseCsv(csv, FONTE, DATA), /linha 2/);
  });

  it('rejeita arquivo vazio e header sem carteira', () => {
    assert.throws(() => parseCsv('', FONTE, DATA), /sem nenhuma linha|obrigatoria/);
    assert.throws(() => parseCsv('ativo,valor\nA,1\n', FONTE, DATA), /obrigatoria/);
  });

  it('header com aspas (exportação comum) parseia', () => {
    const csv = [
      '"carteira","ativo","classe","valor"',
      '"Teste Alfa","Caixa Geral","Liquidez","100.000,00"',
    ].join('\n');
    const snap = parseCsv(csv, FONTE, DATA);
    assert.equal(snap.carteiras.length, 1);
    assert.equal(snap.carteiras[0].posicoes[0].valor, 100_000);
  });
});

describe('adaptador HTML', () => {
  const HTML_OK = [
    '<html><body>',
    '<table><tr><th>CARTEIRA</th><th>ATIVO</th><th>CLASSE</th><th>VALOR</th></tr>',
    '<tr><td>Teste Alfa</td><td>Caixa Geral</td><td>Liquidez</td><td>100.000,00</td></tr>',
    '<tr><td>Teste Alfa</td><td>Fundo XYZ</td><td>Renda Fixa</td><td>900.000,00</td></tr>',
    '</table></body></html>',
  ].join('\n');

  it('parseia tabela com cabeçalho reconhecido', () => {
    const snap = parseHtml(HTML_OK, FONTE, DATA);
    assert.equal(snap.carteiras.length, 1);
    assert.equal(snap.carteiras[0].posicoes.length, 2);
    assert.equal(snap.carteiras[0].posicoes[0].valor, 100_000);
    assert.equal(snap.carteiras[0].posicoes[0].classe, 'Liquidez');
  });

  it('rejeita HTML sem tabela reconhecível', () => {
    assert.throws(() => parseHtml('<html><body>nada</body></html>', FONTE, DATA), /nenhuma tabela/);
  });
});

describe('adaptador api-json', () => {
  const JSON_OK = {
    carteiras: [
      {
        nome: 'Teste Alfa',
        posicoes: [
          { ativo: 'Caixa Geral', valor: 100_000, classe: 'Liquidez' },
          { ativo: 'Fundo XYZ', valor: 900_000, vencimento: '2027-03-01', quantidade: 10 },
        ],
      },
    ],
  };

  it('parseia shape válido', () => {
    const snap = parseApiJson(JSON.stringify(JSON_OK), FONTE, DATA);
    assert.equal(snap.carteiras.length, 1);
    assert.equal(snap.carteiras[0].posicoes.length, 2);
    assert.equal(snap.carteiras[0].posicoes[1].vencimento, '2027-03-01');
  });

  it('erros nomeiam o campo', () => {
    assert.throws(() => parseApiJson('{}', FONTE, DATA), /"carteiras"/);
    assert.throws(() => parseApiJson('{"carteiras": [{"nome": "X"}]}', FONTE, DATA), /posicoes/);
    assert.throws(
      () => parseApiJson('{"carteiras": [{"nome": "X", "posicoes": [{"ativo": "A", "valor": "abc"}]}]}', FONTE, DATA),
      /valor/
    );
    assert.throws(() => parseApiJson('{inválido', FONTE, DATA), /JSON invalido/);
  });
});

describe('adaptador txt-b3 (posicional estilo B3)', () => {
  const B3_OK = [
    'MDA0POSI20260813'.padEnd(124, ' ') + '<',
    'MDA1POSI20260813' + '00000123'.padStart(8, '0') + 'LCIBW'.padEnd(11, ' ') + 'LCI BANCO W'.padEnd(40, ' ') + String(50).padStart(12, ' ') + ',00000000' + '1000,00000000'.padStart(19, ' ') + '20260819<',
    'MDA1POSI20260813' + '00000123'.padStart(8, '0') + 'CDB2'.padEnd(11, ' ') + 'CDB BANCO FICTICIO II'.padEnd(40, ' ') + String(3000).padStart(12, ' ') + ',00000000' + '100,00000000'.padStart(19, ' ') + '20270301<',
  ].join('\n');

  it('parseia header MDA e linhas de dados com valor derivado (qtd x PU)', () => {
    const snap = parseTxtB3(B3_OK, FONTE, DATA);
    assert.equal(snap.carteiras.length, 1);
    assert.equal(snap.carteiras[0].nome, '00000123');
    const lci = snap.carteiras[0].posicoes.find((p) => p.ativo === 'LCI BANCO W')!;
    assert.equal(lci.valor, 50_000, '50 x 1000');
    assert.equal(lci.vencimento, '2026-08-19');
    const cdb = snap.carteiras[0].posicoes.find((p) => p.ativo === 'CDB BANCO FICTICIO II')!;
    assert.equal(cdb.valor, 300_000, '3000 x 100');
  });

  it('rejeita arquivo sem header MDA e linha com tipo errado', () => {
    assert.throws(() => parseTxtB3('linha solta sem header', FONTE, DATA), /header "MDA"/);
    const semTipo = 'MDA0POSI20260813\nMDA9POSI2026081300000123\n';
    assert.throws(() => parseTxtB3(semTipo, FONTE, DATA), /tipo "9"/);
  });

  it('rejeita quantidade ou preço não numérico', () => {
    const ruim = 'MDA0POSI20260813\nMDA1POSI2026081300000123' + 'LCIBW'.padEnd(11, ' ') + 'LCI BANCO W'.padEnd(40, ' ') + 'ABC'.padStart(12, ' ') + '00000000,00000000'.padStart(19, ' ') + '        <';
    assert.throws(() => parseTxtB3(ruim, FONTE, DATA), /quantidade ou preco nao numerico/);
  });
});

describe('adaptador xlsx (workbook sintético no template v2)', () => {
  it('transforma linhas de ativo em posições EOD', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Carteiras');
    sheet.getCell('A1').value = 'CARTEIRA Teste Sint';
    sheet.getCell('A2').value = 'CLASSE / ATIVO';
    sheet.getCell('A3').value = 'Liquidez';
    sheet.getCell('C3').value = 100_000;
    sheet.getCell('D3').value = 100_000;
    sheet.getCell('A4').value = 'Caixa Geral';
    sheet.getCell('B4').value = 'BTG';
    sheet.getCell('C4').value = 100_000;
    sheet.getCell('D4').value = 100_000;
    sheet.getCell('A5').value = 'Renda Fixa';
    sheet.getCell('C5').value = 900_000;
    sheet.getCell('D5').value = 900_000;
    sheet.getCell('A6').value = 'Fundo XYZ';
    sheet.getCell('B6').value = 'BTG';
    sheet.getCell('C6').value = 900_000;
    sheet.getCell('D6').value = 900_000;
    sheet.getCell('A7').value = 'TOTAL';
    sheet.getCell('C7').value = 1_000_000;
    sheet.getCell('D7').value = 1_000_000;

    const arquivo = path.join(tmpDir(), 'sintetico.xlsx');
    await wb.xlsx.writeFile(arquivo);

    const snap = await parseXlsx(arquivo, DATA, FONTE);
    assert.equal(snap.carteiras.length, 1);
    const carteira = snap.carteiras[0];
    assert.equal(carteira.nome, 'Teste Sint');
    const caixa = carteira.posicoes.find((p) => p.ativo === 'Caixa Geral')!;
    assert.equal(caixa.valor, 100_000);
    assert.equal(caixa.classe, 'Liquidez');
    const fundo = carteira.posicoes.find((p) => p.ativo === 'Fundo XYZ')!;
    assert.equal(fundo.valor, 900_000);
    assert.equal(fundo.classe, 'Renda Fixa');
  });
});

describe('adaptador pdf', () => {
  it('rejeita PDF avulso com erro explícito', async () => {
    const arquivo = path.join(tmpDir(), 'avulso.pdf');
    fs.writeFileSync(arquivo, '%PDF-1.4 fake');
    await assert.rejects(() => parsePdf(arquivo, DATA, FONTE), /PDF avulso nao suportado/);
  });

  it('rejeita diretório sem books', async () => {
    const dir = tmpDir();
    await assert.rejects(() => parsePdf(dir, DATA, FONTE), /PDF avulso nao suportado|Book_/);
  });
});
