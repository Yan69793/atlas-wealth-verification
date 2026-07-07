import fs from 'node:fs/promises';
import path from 'node:path';
import type { CarteiraRaw } from '../schema.js';
import { parseExcelV2 } from './excel-v2.js';
import { parsePdfBookFolder } from './pdf-v1.js';

export interface IngestOptions {
  arquivo: string;
  mes: string;
  baseline: string;
}

export async function ingestFile(options: IngestOptions): Promise<CarteiraRaw[]> {
  const stat = await fs.stat(options.arquivo);

  if (stat.isDirectory()) {
    return parsePdfBookFolder({
      pasta: options.arquivo,
      mes: options.mes,
      baseline: options.baseline,
    });
  }

  const ext = path.extname(options.arquivo).toLowerCase();

  switch (ext) {
    case '.xlsx':
    case '.xlsm':
    case '.xls':
      return parseExcelV2({
        arquivo: options.arquivo,
        mes: options.mes,
        baseline: options.baseline,
      });
    case '.csv':
      throw new Error('Formato CSV ainda nao suportado. Use .xlsx por enquanto.');
    case '.pdf':
      throw new Error('PDF avulso nao suportado. Aponte para a PASTA "Editados" com os Book_*.pdf.');
    default:
      throw new Error(`Formato nao suportado: ${ext}. Use .xlsx ou uma pasta de Book_*.pdf.`);
  }
}