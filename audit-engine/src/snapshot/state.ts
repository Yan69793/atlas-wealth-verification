/**
 * src/snapshot/state.ts — leitura de snapshot por data.
 *
 * "state" responde "qual era o estado em data X" mesmo depois de D+1 ingerido:
 * nada do pipeline sobrescreve artefatos de dias anteriores.
 */

import { carregarSnapshotDoDisco } from './ingest.js';
import type { Snapshot } from './types.js';

export function carregarSnapshot(root: string, data: string): Snapshot {
  const snap = carregarSnapshotDoDisco(root, data);
  if (!snap) {
    throw new Error(`Sem snapshot para ${data} em ${root}/audits/.`);
  }
  return snap;
}
