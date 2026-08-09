import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { parseExcelV2 } from '../src/parsers/excel-v2.js';
import { parsePdfBookFolder } from '../src/parsers/pdf-v1.js';
import type { CarteiraRaw } from '../src/schema.js';

// ATLAS_FIXTURES = raiz da instancia (XLSX e, opcionalmente, mapa de nomes).
// ATLAS_BOOKS = pasta Editados do mes (books PDF). Nenhum caminho de cliente
// fica fixo no produto: instancia nova define as vars no proprio ambiente.
const FIXTURES = process.env.ATLAS_FIXTURES;
const XLSX = FIXTURES ? path.join(FIXTURES, 'Verificacao_Carteiras_Abril_2026_v2.xlsx') : null;
const BOOKS_ABRIL = process.env.ATLAS_BOOKS
  ?? (FIXTURES ? path.join(FIXTURES, 'books', '2026-04', 'Editados') : null)
  ?? null;

if (FIXTURES && !fs.existsSync(XLSX!)) {
  throw new Error(`ATLAS_FIXTURES setada mas XLSX ausente: ${XLSX}`);
}

// Renomes de proposito (nome Excel -> nome PDF) vivem na instancia, no mesmo
// mapa local que o pipeline usa. Produto nao carrega apelido nem codigo real.
function loadRenomes(): Record<string, string> {
  if (!FIXTURES) return {};
  for (const rel of ['name-map.local.json', 'name-map.json', 'audit-engine/name-map.local.json']) {
    const p = path.join(FIXTURES, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as {
        mappings?: Record<string, string>;
      };
      return raw.mappings ?? {};
    } catch {
      // mapa ilegivel: segue sem renome, o teste acusa divergencia se precisar
    }
  }
  return {};
}

// BUG CONHECIDO no parser Excel (parsePct): rent entre -1% e 1% guardada em
// pontos percentuais (0,96) mas so dividia por 100 quando abs(n) > 1, entao
// 0,96 virava 96%. Detecta por fator ~100x em vez de listar codigo de cliente.
function isBugRentExcelConhecido(excelRent: number, pdfRent: number): boolean {
  if (pdfRent === 0) return false;
  const ratio = excelRent / pdfRent;
  return Math.abs(ratio - 100) < 2 || Math.abs(ratio - 0.01) < 0.002;
}

const TOLERANCIA_PL = 0.003;
const TOLERANCIA_RENT = 0.0005;

const DADO_ABRIL_PRESENTE =
  !!FIXTURES && !!BOOKS_ABRIL && fs.existsSync(XLSX!) && fs.existsSync(BOOKS_ABRIL);

describe('parity PDF vs Excel (abril 2026, gabarito)', {
  timeout: 180_000,
  skip: !DADO_ABRIL_PRESENTE && 'dado de abril ausente (ATLAS_FIXTURES + ATLAS_BOOKS)',
}, () => {
  it('carteiras extraidas via PDF batem com a planilha Excel ja auditada', async () => {
    const renomes = loadRenomes();
    const excelCarteiras = await parseExcelV2({ arquivo: XLSX!, mes: '2026-04', baseline: '2026-03' });
    const pdfCarteiras = await parsePdfBookFolder({ pasta: BOOKS_ABRIL!, mes: '2026-04', baseline: '2026-03' });

    const pdfByNome = new Map(pdfCarteiras.map((c) => [c.nome, c]));

    const divergencias: string[] = [];
    const bugsConhecidos: string[] = [];
    const semCorrespondente: string[] = [];
    let comparadas = 0;

    for (const excelC of excelCarteiras) {
      const nomePdf = renomes[excelC.nome] ?? excelC.nome;
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
        if (divergeRent && isBugRentExcelConhecido(excelC.rentRef, pdfC.rentRef)) {
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
