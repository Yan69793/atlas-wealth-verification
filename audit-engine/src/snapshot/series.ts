/**
 * src/snapshot/series.ts — enumeração da série de snapshots de um root.
 *
 * Base da Fase 4 (caixa parado): nenhuma função enumerava os snapshots de
 * audits/&lt;data&gt;/snapshot.json.
 * state.ts é o acesso por data única; a série é conceito próprio.
 */

import fs from 'node:fs';
import path from 'node:path';
import { carregarSnapshotDoDisco } from './ingest.js';
import type { Snapshot } from './types.js';

/**
 * Snapshots diários válidos com data <= ate, ordenados ASC por data.
 * Diretório que não contenha snapshot válido, snapshot de período mensal ou
 * JSON ilegível = ausente (mesma política de carregarSnapshotDoDisco).
 * A comparação por string é segura: AAAA-MM-DD ordena lexicograficamente
 * igual a cronologicamente.
 */
export function listarSnapshotsDiarios(root: string, ate: string): Snapshot[] {
  const auditsDir = path.join(root, 'audits');
  let nomes: string[] = [];
  try {
    nomes = fs.readdirSync(auditsDir);
  } catch {
    return []; // root sem audits/ ainda: série vazia
  }
  const out: Snapshot[] = [];
  for (const nome of nomes) {
    const snap = carregarSnapshotDoDisco(root, nome);
    if (snap && snap.periodo === 'diario' && snap.data <= ate) out.push(snap);
  }
  out.sort((a, b) => a.data.localeCompare(b.data));
  return out;
}
