/**
 * adapters/index.ts — dispatcher de adaptadores do snapshot EOD.
 *
 * Formato vem de --formato ou da extensão do arquivo, NUNCA de adivinhação por
 * conteúdo (magic bytes, heurística de CSV). Formato desconhecido = erro
 * explícito listando os suportados.
 */

import fs from 'node:fs/promises';
import type { FormatoEntrada, RawSnapshot, SnapshotFonte } from '../types.js';
import { parseApiJson } from './api-json.js';
import { parseCsv } from './csv.js';
import { parseHtml } from './html.js';
import { parsePdf } from './pdf.js';
import { parseXlsx } from './xlsx.js';

export { detectFormato };

function detectFormato(arquivo: string, explicitado?: FormatoEntrada): FormatoEntrada {
  if (explicitado) return explicitado;
  const m = arquivo.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m ? m[1] : '';
  switch (ext) {
    case 'xlsx':
    case 'xlsm':
      return 'xlsx';
    case 'xls':
      throw new Error('Formato .xls (binario) nao suportado pelo leitor. Exporte como .xlsx ou CSV.');
    case 'csv':
      return 'csv';
    case 'pdf':
      return 'pdf';
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
      return 'api-json';
    default:
      throw new Error(
        `Formato desconhecido para "${arquivo}". Use --formato xlsx|csv|pdf|html|api-json.`
      );
  }
}

export async function adaptar(opts: {
  arquivo: string;
  data: string;
  fonte: SnapshotFonte;
  formato: FormatoEntrada;
}): Promise<RawSnapshot> {
  const { arquivo, data, fonte, formato } = opts;

  switch (formato) {
    case 'xlsx':
      return parseXlsx(arquivo, data, fonte);
    case 'pdf':
      return parsePdf(arquivo, data, fonte);
    case 'csv':
      return parseCsv(await fs.readFile(arquivo, 'utf8'), fonte, data);
    case 'html':
      return parseHtml(await fs.readFile(arquivo, 'utf8'), fonte, data);
    case 'api-json':
      return parseApiJson(await fs.readFile(arquivo, 'utf8'), fonte, data);
    default: {
      const nunca: never = formato;
      throw new Error(`Formato desconhecido: ${String(nunca)}. Use --formato xlsx|csv|pdf|html|api-json.`);
    }
  }
}
