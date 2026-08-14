/**
 * adapters/pdf.ts — adaptador PDF do snapshot EOD.
 *
 * Só pasta de books (Book_*.pdf), mesmo fluxo do parsePdfBookFolder — PDF
 * avulso não é suportado nesta fase (erro explícito, espelha registry.ts).
 * A extração roda no Python com pdfplumber, coberto pelos testes de parity.
 */

import fs from 'node:fs';
import { parsePdfBookFolder } from '../../parsers/pdf-v1.js';
import type { RawSnapshot, SnapshotFonte } from '../types.js';
import { carteirasRawParaRawSnapshot } from './transform-raw.js';

export async function parsePdf(
  pasta: string,
  data: string,
  fonte: SnapshotFonte
): Promise<RawSnapshot> {
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) {
    throw new Error(
      'PDF avulso nao suportado nesta fase; aponte para a pasta com os Book_*.pdf.'
    );
  }
  const books = fs.readdirSync(pasta).filter((f) => /^Book_.*\.pdf$/i.test(f));
  if (!books.length) {
    throw new Error(`Nenhum Book_*.pdf em ${pasta}.`);
  }
  const raws = await parsePdfBookFolder({ pasta, mes: data.slice(0, 7), baseline: data.slice(0, 7) });
  return carteirasRawParaRawSnapshot(raws, data, fonte);
}
