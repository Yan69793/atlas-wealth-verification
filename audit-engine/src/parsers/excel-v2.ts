import ExcelJS from 'exceljs';
import type { AtivoRow, CarteiraRaw, CarteiraTotal, PeriodoRef } from '../schema.js';
import {
  cellStr,
  extractCarteiraName,
  extractPeriodoLabels,
  parseBRL,
  parseNumber,
  parsePct,
  ymToLabel,
} from './utils.js';

const AGG_SHEETS = new Set(['Resumo', 'Conciliação', 'Conciliacao', 'Achados']);

function getSheetRow(sheet: ExcelJS.Worksheet, rowNum: number): unknown[] {
  const row = sheet.getRow(rowNum);
  const vals: unknown[] = [];
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    vals[col - 1] = cell.value;
  });
  return vals;
}

function getCell(row: unknown[], idx: number): unknown {
  return row[idx] ?? null;
}

function parseAtivosTable(sheet: ExcelJS.Worksheet, startRow: number): { ativos: AtivoRow[]; total?: CarteiraTotal } {
  const ativos: AtivoRow[] = [];
  let total: CarteiraTotal | undefined;
  let currentClasse = '';
  let inSaida = false;

  for (let r = startRow; r <= sheet.rowCount; r++) {
    const row = getSheetRow(sheet, r);
    const col0 = cellStr(getCell(row, 0)).toUpperCase();
    const col1 = cellStr(getCell(row, 1));

    if (!col0 && !col1) continue;

    if (col0.includes('ATIVOS SAÍDOS') || col0.includes('ATIVOS SAIDOS')) {
      inSaida = true;
      continue;
    }

    if (col0 === 'TOTAL') {
      const partVal = parsePct(getCell(row, 10));
      total = {
        plBase: parseNumber(getCell(row, 2)),
        plRef: parseNumber(getCell(row, 3)),
        diff: parseNumber(getCell(row, 4)),
        varPct: parsePct(getCell(row, 5)),
        compras: parseNumber(getCell(row, 6)) || undefined,
        vendas: parseNumber(getCell(row, 7)) || undefined,
        eventos: parseNumber(getCell(row, 8)) || undefined,
        impostos: parseNumber(getCell(row, 9)) || undefined,
        part: partVal > 0 ? partVal : 1,
      };
      break;
    }

    const plBase = parseNumber(getCell(row, 2));
    const plRef = parseNumber(getCell(row, 3));
    const diff = parseNumber(getCell(row, 4));
    const varPct = parsePct(getCell(row, 5));
    const partCol = parsePct(getCell(row, 10));

    const looksLikeClasse = !col1 && Math.abs(plBase) + Math.abs(plRef) > 0;

    if (looksLikeClasse && !inSaida) {
      currentClasse = cellStr(getCell(row, 0));
      ativos.push({
        type: 'classe',
        classe: currentClasse,
        plBase,
        plRef,
        diff,
        varPct,
        part: partCol || undefined,
      });
      continue;
    }

    if (inSaida) {
      ativos.push({
        type: 'saida',
        classe: currentClasse,
        nome: cellStr(getCell(row, 0)),
        instituicao: col1 || undefined,
        plBase,
        plRef,
        diff,
        varPct,
        compras: parseNumber(getCell(row, 6)) || undefined,
        vendas: parseNumber(getCell(row, 7)) || undefined,
        eventos: parseNumber(getCell(row, 8)) || undefined,
        impostos: parseNumber(getCell(row, 9)) || undefined,
        provIR: parseNumber(getCell(row, 10)) || undefined,
      });
      continue;
    }

    ativos.push({
      type: 'ativo',
      classe: currentClasse,
      nome: cellStr(getCell(row, 0)),
      instituicao: col1 || undefined,
      plBase,
      plRef,
      diff,
      varPct,
      compras: parseNumber(getCell(row, 6)) || undefined,
      vendas: parseNumber(getCell(row, 7)) || undefined,
      eventos: parseNumber(getCell(row, 8)) || undefined,
      impostos: parseNumber(getCell(row, 9)) || undefined,
      provIR: parseNumber(getCell(row, 10)) || undefined,
      part: partCol || undefined,
    });
  }

  return { ativos, total };
}

function findHeaderRow(sheet: ExcelJS.Worksheet): number {
  for (let r = 1; r <= Math.min(sheet.rowCount, 30); r++) {
    const col0 = cellStr(getSheetRow(sheet, r)[0]).toUpperCase();
    if (col0.includes('CLASSE / ATIVO')) return r;
  }
  return 16;
}

function parseCarteiraSheet(
  sheet: ExcelJS.Worksheet,
  arquivo: string,
  periodo: PeriodoRef,
): CarteiraRaw | null {
  const row1 = getSheetRow(sheet, 1);
  const nome = extractCarteiraName(cellStr(getCell(row1, 0)));
  if (!nome) return null;

  const kpiRow = getSheetRow(sheet, 6);
  const metricsRow = getSheetRow(sheet, 9);

  const plBase = parseNumber(getCell(kpiRow, 0));
  const plRef = parseNumber(getCell(kpiRow, 2));
  const varRS = parseNumber(getCell(kpiRow, 4));
  const varPct = parsePct(getCell(kpiRow, 6));
  const rentRaw = cellStr(getCell(kpiRow, 8));
  const rentRef = rentRaw ? parsePct(getCell(kpiRow, 8)) : null;

  const continuidade = parsePct(getCell(metricsRow, 0));
  const somaVsTotal = parsePct(getCell(metricsRow, 2));
  const perfImplicita = parsePct(getCell(metricsRow, 4));
  const eventos = parseBRL(getCell(metricsRow, 6));
  const impostos = parseBRL(getCell(metricsRow, 8));

  const headerRow = findHeaderRow(sheet);
  const { ativos, total } = parseAtivosTable(sheet, headerRow + 1);

  const nAtivosBase = ativos.filter((a) => a.type === 'ativo' && a.plBase > 0).length;
  const nAtivosRef = ativos.filter((a) => a.type === 'ativo' && a.plRef > 0).length;

  return {
    nome,
    periodo,
    plBase: total?.plBase ?? plBase,
    plRef: total?.plRef ?? plRef,
    varRS: total?.diff ?? varRS,
    varPct: total?.varPct ?? varPct,
    rentRef,
    continuidade,
    somaVsTotal,
    perfImplicita,
    eventos,
    impostos,
    ativos,
    total,
    nAtivosBase,
    nAtivosRef,
    fonte: { tipo: 'xlsx', template: 'mirabaud-v2', arquivo },
  };
}

export interface ParseExcelOptions {
  arquivo: string;
  mes: string;
  baseline: string;
}

export async function parseExcelV2(options: ParseExcelOptions): Promise<CarteiraRaw[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(options.arquivo);

  const periodo: PeriodoRef = {
    baseline: options.baseline,
    referencia: options.mes,
    baselineLabel: ymToLabel(options.baseline),
    referenciaLabel: ymToLabel(options.mes),
  };

  const resumo = workbook.getWorksheet('Resumo');
  if (resumo) {
    const row3 = getSheetRow(resumo, 3);
    const text = cellStr(getCell(row3, 0));
    if (text.includes('contra')) {
      const extracted = extractPeriodoLabels(text);
      if (extracted.baselineLabel) periodo.baselineLabel = extracted.baselineLabel;
      if (extracted.referenciaLabel) periodo.referenciaLabel = extracted.referenciaLabel;
    }
  }

  const carteiras: CarteiraRaw[] = [];

  for (const sheet of workbook.worksheets) {
    if (AGG_SHEETS.has(sheet.name)) continue;
    const parsed = parseCarteiraSheet(sheet, options.arquivo, periodo);
    if (parsed) carteiras.push(parsed);
  }

  carteiras.sort((a, b) => a.nome.localeCompare(b.nome));
  return carteiras;
}