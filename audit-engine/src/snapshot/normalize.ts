/**
 * src/snapshot/normalize.ts — normaliza RawSnapshot em Snapshot canônico.
 *
 * - aplica o name-map da instância quando disponível (o MAPEAMENTO vive na
 *   instância: name-map.local.json sobre name-map.json; o código é neutro);
 * - normaliza identificadores (trim, espaços colapsados, NFC) para estabilidade
 *   entre dias;
 * - plTotal é SEMPRE a soma das posições (fonte única de verdade);
 * - valor não-finito = erro explícito.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CASH_CLASSES } from './thresholds.js';
import type {
  RawSnapshot,
  Snapshot,
  SnapshotCarteira,
  SnapshotPosition,
} from './types.js';

export function isLiquidez(classe: string | null): boolean {
  if (!classe) return false;
  const norm = classe.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return CASH_CLASSES.includes(norm);
}

/** trim + colapsa espaços múltiplos + NFC (estável entre dias). */
export function normalizarIdentificador(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** name-map: name-map.local.json (instância) sobre name-map.json (produto, vazio). */
export function loadNameMapping(root: string): Record<string, string> {
  for (const rel of ['name-map.local.json', 'name-map.json']) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
        mappings?: Record<string, string>;
      };
      if (raw && typeof raw === 'object' && raw.mappings && typeof raw.mappings === 'object') {
        return raw.mappings;
      }
    } catch {
      // mapa ilegível: segue sem renome; o diff acusará divergência se precisar
    }
  }
  return {};
}

export function normalize(raw: RawSnapshot, mapping?: Record<string, string>): Snapshot {
  const mapa = mapping ?? {};

  const carteiras: SnapshotCarteira[] = raw.carteiras.map((rawC) => {
    const nome = normalizarIdentificador(mapa[rawC.nome] ?? rawC.nome);
    if (!nome) throw new Error(`Snapshot: carteira com nome vazio após normalização.`);

    const vistos = new Set<string>();
    const posicoes: SnapshotPosition[] = rawC.posicoes.map((rawP) => {
      if (!Number.isFinite(rawP.valor)) {
        throw new Error(`Snapshot: valor nao finito na carteira "${nome}", ativo "${rawP.ativo}".`);
      }
      const ativo = normalizarIdentificador(mapa[rawP.ativo] ?? rawP.ativo);
      if (vistos.has(ativo)) {
        // Duplicata de ativo somaria errado no mapa do diff (chave carteira|ativo
        // sobrescreveria silenciosamente). Erro explícito em vez de furo mudo.
        throw new Error(`Snapshot: ativo duplicado "${ativo}" na carteira "${nome}".`);
      }
      vistos.add(ativo);
      if (rawP.vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(rawP.vencimento)) {
        throw new Error(
          `Snapshot: vencimento malformado "${rawP.vencimento}" (carteira "${nome}", ativo "${ativo}"). Use AAAA-MM-DD.`
        );
      }
      return {
        carteira: nome,
        ativo,
        classe: rawP.classe ? normalizarIdentificador(rawP.classe) : null,
        valor: rawP.valor,
        vencimento: rawP.vencimento || null,
        quantidade: rawP.quantidade ?? null,
      };
    });

    const plTotal = posicoes.reduce((acc, p) => acc + p.valor, 0);
    return { nome, plTotal, posicoes };
  });

  if (!carteiras.length) {
    throw new Error('Snapshot: nenhuma carteira reconhecida. Nada foi gravado.');
  }

  return {
    schema: 'snapshot/v1',
    data: raw.data,
    fonte: raw.fonte,
    geradoEm: new Date().toISOString(),
    engine: {
      nome: 'atlas-audit-engine',
      versao: process.env.npm_package_version ?? '0.0.0',
    },
    carteiras,
  };
}
