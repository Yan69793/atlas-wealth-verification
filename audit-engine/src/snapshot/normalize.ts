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

/** class-map: class-map.local.json (instância) sobre class-map.json (produto, vazio).
   Arquivos diários de custódia não trazem a classe do ativo (o book mensal
   traz, o arquivo posicional não). O mapa da instância classifica por ativo,
   mesmo papel do name-map para nomes. Sem ele, eventos por classe
   (liquidez, alocação) viram ruído no diário. */
export function loadClassMapping(root: string): Record<string, string> {
  for (const rel of ['class-map.local.json', 'class-map.json']) {
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
      // mapa ilegível: segue sem classe; eventos por classe degradam, não param
    }
  }
  return {};
}

/** taxa-map: taxa-map.local.json (instância) sobre taxa-map.json (produto, vazio).
   Fonte da receita da casa (Fase 5): chave = nome canônico da carteira
   (pós name-map), valor = taxa ANUAL (ex. 0.0048). O normalize deriva a
   receita mensal (PL x taxa / 12) só no período mensal. Valores que não
   sejam números finitos são ignorados; mapa ilegível vira vazio. */
export function loadTaxaMapping(root: string): Record<string, number> {
  for (const rel of ['taxa-map.local.json', 'taxa-map.json']) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
        mappings?: Record<string, number>;
      };
      if (raw && typeof raw === 'object' && raw.mappings && typeof raw.mappings === 'object') {
        const limpos: Record<string, number> = {};
        for (const [k, v] of Object.entries(raw.mappings)) {
          if (typeof v === 'number' && Number.isFinite(v) && v >= 0) limpos[k] = v;
        }
        return limpos;
      }
    } catch {
      // mapa ilegível: segue sem taxa; a receita fica ausente e o diff ignora
    }
  }
  return {};
}

export function normalize(
  raw: RawSnapshot,
  periodo: 'diario' | 'mensal',
  mapping?: Record<string, string>,
  classMapping?: Record<string, string>,
  taxaMapping?: Record<string, number>
): Snapshot {
  const mapa = mapping ?? {};
  const mapaClasse = classMapping ?? {};
  const mapaTaxa = taxaMapping ?? {};

  const carteiras: SnapshotCarteira[] = raw.carteiras.map((rawC) => {
    const nome = normalizarIdentificador(mapa[rawC.nome] ?? rawC.nome);
    if (!nome) throw new Error(`Snapshot: carteira com nome vazio após normalização.`);

    // Mesmo ativo em mais de um custodiante (ex.: NTN-B parte no BTG, parte
    // no XPM) vem como duas linhas no book, e o próprio book consolida
    // somando. Rejeitar derrubaria o snapshot inteiro de um dado real comum.
    // Política: soma valor (e quantidade quando numérica), mantém a primeira
    // classe/vencimento. A ordem do mapa = primeira ocorrência, determinística.
    const porAtivo = new Map<string, SnapshotPosition>();
    for (const rawP of rawC.posicoes) {
      if (!Number.isFinite(rawP.valor)) {
        throw new Error(`Snapshot: valor nao finito na carteira "${nome}", ativo "${rawP.ativo}".`);
      }
      const ativo = normalizarIdentificador(mapa[rawP.ativo] ?? rawP.ativo);
      if (rawP.vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(rawP.vencimento)) {
        throw new Error(
          `Snapshot: vencimento malformado "${rawP.vencimento}" (carteira "${nome}", ativo "${ativo}"). Use AAAA-MM-DD.`
        );
      }
      const existente = porAtivo.get(ativo);
      if (existente) {
        existente.valor += rawP.valor;
        if (rawP.quantidade != null) {
          existente.quantidade = (existente.quantidade ?? 0) + rawP.quantidade;
        }
      } else {
        porAtivo.set(ativo, {
          carteira: nome,
          ativo,
          classe: rawP.classe
            ? normalizarIdentificador(rawP.classe)
            : mapaClasse[ativo]
              ? normalizarIdentificador(mapaClasse[ativo])
              : null,
          valor: rawP.valor,
          vencimento: rawP.vencimento || null,
          quantidade: rawP.quantidade ?? null,
          instituicao: rawP.instituicao ? normalizarIdentificador(rawP.instituicao) : null,
        });
      }
    }
    const posicoes = [...porAtivo.values()];

    const plTotal = posicoes.reduce((acc, p) => acc + p.valor, 0);

    // Receita da casa (Fase 5): conceito mensal. No diário o campo fica
    // ausente de propósito, o diff de receita ignora. Fonte: raw.receita
    // (adaptador futuro) com prioridade; senão taxa-map × PL / 12.
    let receita: number | undefined;
    if (periodo === 'mensal') {
      if (rawC.receita !== undefined && Number.isFinite(rawC.receita)) {
        receita = rawC.receita;
      } else if (typeof mapaTaxa[nome] === 'number') {
        receita = Math.round((plTotal * (mapaTaxa[nome] / 12)) * 100) / 100;
      }
    }

    return { nome, plTotal, ...(receita !== undefined ? { receita } : {}), posicoes };
  });

  if (!carteiras.length) {
    throw new Error('Snapshot: nenhuma carteira reconhecida. Nada foi gravado.');
  }

  return {
    schema: 'snapshot/v1',
    data: raw.data,
    periodo,
    fonte: raw.fonte,
    geradoEm: new Date().toISOString(),
    engine: {
      nome: 'atlas-audit-engine',
      versao: process.env.npm_package_version ?? '0.0.0',
    },
    carteiras,
  };
}
