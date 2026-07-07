import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { parseExcelV2 } from '../src/parsers/excel-v2.js';
import { parsePdfBookFolder } from '../src/parsers/pdf-v1.js';
import type { CarteiraRaw } from '../src/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');
const XLSX = path.join(ROOT, 'Verificacao_Carteiras_Abril_2026_v2.xlsx');
const BOOKS_ABRIL = path.join(
  'C:/Users/User/OneDrive - MIRABAUD (BRASIL) REPRESENTAÇÕES LTDA/Extratos Mensais/2026_04/Editados',
);

// Carteiras cujo nome canonico mudou de proposito ao adotar o nome interno do
// PDF como fonte de verdade (decisao de produto, nao divergencia de bug).
const RENOMEADAS_DE_PROPOSITO: Record<string, string> = {
  'MMR_ACRB 1 (Marta)': 'MMR 1 (Marta)',
  'MMR_ACRB 2 (Mega)': 'MMR 2 (Mega)',
  'MMR_ACRB 3 (Mae)': 'MMR 3 (Mae)',
};

// BUG CONHECIDO no parser Excel (parsePct em src/parsers/utils.ts): quando a
// rentabilidade do mes esta entre -1% e 1%, a celula guarda o numero em
// pontos percentuais (ex: 0,96) mas parsePct so divide por 100 quando
// abs(n) > 1 - entao trata 0,96 como se ja fosse fracao (96%). O valor do
// PDF (extraido de forma independente da grade "Rentabilidades Mensais") esta
// correto; o valor do Excel/dashboard atual esta errado para estas carteiras.
// Nao corrigido aqui de proposito - e uma decisao de produto (afeta numeros
// ja entregues ao cliente em abril), reportado separadamente.
const CARTEIRAS_COM_BUG_RENT_EXCEL_CONHECIDO = new Set([
  'BLH', 'BVM_LOVM', 'CMF', 'GLF', 'GLMW_MHGS', 'JBQ', 'JPRS', 'LBS',
  'LCBAVP_MAA', 'LCV', 'LOVM_JLM', 'MAA_KW', 'MH', 'OPCF_MMR', 'RAL_CFLL', 'SVR',
]);

const TOLERANCIA_PL = 0.003; // 0.3% - mesma tolerancia de conciliacao usada no motor
const TOLERANCIA_RENT = 0.0005; // 5 pontos-base

describe('parity PDF vs Excel (abril 2026, gabarito)', { timeout: 180_000 }, () => {
  it('carteiras extraidas via PDF batem com a planilha Excel ja auditada', async () => {
    const excelCarteiras = await parseExcelV2({ arquivo: XLSX, mes: '2026-04', baseline: '2026-03' });
    const pdfCarteiras = await parsePdfBookFolder({ pasta: BOOKS_ABRIL, mes: '2026-04', baseline: '2026-03' });

    const pdfByNome = new Map(pdfCarteiras.map((c) => [c.nome, c]));

    const divergencias: string[] = [];
    const bugsConhecidos: string[] = [];
    const semCorrespondente: string[] = [];
    let comparadas = 0;

    for (const excelC of excelCarteiras) {
      const nomePdf = RENOMEADAS_DE_PROPOSITO[excelC.nome] ?? excelC.nome;
      const pdfC = pdfByNome.get(nomePdf);
      if (!pdfC) {
        semCorrespondente.push(excelC.nome);
        continue;
      }
      comparadas++;
      compararCampo(excelC, pdfC, 'plBase', TOLERANCIA_PL, divergencias);
      compararCampo(excelC, pdfC, 'plRef', TOLERANCIA_PL, divergencias);
      if (excelC.rentRef !== null && pdfC.rentRef !== null) {
        const divergeRent = Math.abs(excelC.rentRef - pdfC.rentRef) > TOLERANCIA_RENT;
        if (divergeRent && CARTEIRAS_COM_BUG_RENT_EXCEL_CONHECIDO.has(excelC.nome)) {
          bugsConhecidos.push(`${excelC.nome}: rentRef excel=${excelC.rentRef} pdf=${pdfC.rentRef} (bug conhecido do parser Excel)`);
        } else if (divergeRent) {
          divergencias.push(`${excelC.nome}: rentRef excel=${excelC.rentRef} pdf=${pdfC.rentRef}`);
        }
      }
    }

    console.log(`PDF vs Excel (abril): ${comparadas}/${excelCarteiras.length} comparadas, ${semCorrespondente.length} sem correspondente, ${divergencias.length} divergencias reais, ${bugsConhecidos.length} bugs conhecidos do Excel`);
    if (semCorrespondente.length) console.log('Sem correspondente:', semCorrespondente.join(', '));
    if (bugsConhecidos.length) console.log('Bugs conhecidos (Excel, nao o parser novo):\n' + bugsConhecidos.join('\n'));
    if (divergencias.length) console.log('Divergencias reais:\n' + divergencias.join('\n'));

    assert.ok(comparadas >= excelCarteiras.length - 3, `poucas carteiras casaram por nome: ${comparadas}/${excelCarteiras.length}`);
    assert.ok(divergencias.length === 0, `${divergencias.length} divergencia(s) real(is) de valor entre PDF e Excel`);
  });
});

function compararCampo(
  excelC: CarteiraRaw,
  pdfC: CarteiraRaw,
  campo: 'plBase' | 'plRef',
  tolerancia: number,
  divergencias: string[],
): void {
  const a = excelC[campo];
  const b = pdfC[campo];
  const base = Math.abs(a) > 1 ? Math.abs(a) : 1;
  if (Math.abs(a - b) / base > tolerancia) {
    divergencias.push(`${excelC.nome}: ${campo} excel=${a} pdf=${b}`);
  }
}
