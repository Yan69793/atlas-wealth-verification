/**
 * adapters/xlsx.ts — adaptador Excel do snapshot EOD.
 *
 * Reusa parseExcelV2 (parsers/excel-v2.ts): o template mensal do custodiante é
 * a fonte de posições EOD de cada ativo (plRef). O mes passado ao parser é o
 * mes da data do snapshot; baseline é o proprio mes (irrelevante: o snapshot
 * usa só o lado referencia).
 */

import { parseExcelV2 } from '../../parsers/excel-v2.js';
import type { RawSnapshot, SnapshotFonte } from '../types.js';
import { carteirasRawParaRawSnapshot } from './transform-raw.js';

export async function parseXlsx(
  arquivo: string,
  data: string,
  fonte: SnapshotFonte
): Promise<RawSnapshot> {
  const mes = data.slice(0, 7);
  const raws = await parseExcelV2({ arquivo, mes, baseline: mes });
  return carteirasRawParaRawSnapshot(raws, data, fonte);
}
