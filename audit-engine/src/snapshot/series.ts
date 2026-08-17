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
export interface OpcoesSerie {
  /**
   * Data mínima (AAAA-MM-DD). Dia anterior a ela nem chega a ser lido do
   * disco: o corte é pelo NOME do diretório, antes de qualquer parse.
   */
  desde?: string;
}

export function listarSnapshotsDiarios(root: string, ate: string, opcoes: OpcoesSerie = {}): Snapshot[] {
  const out: Snapshot[] = [];
  for (const nome of nomesDeDiretorioDiario(root, ate, opcoes.desde)) {
    const snap = carregarSnapshotDoDisco(root, nome);
    if (snap && snap.periodo === 'diario' && snap.data <= ate) out.push(snap);
  }
  out.sort((a, b) => a.data.localeCompare(b.data));
  return out;
}

/**
 * Datas candidatas a snapshot diário (nomes de diretório AAAA-MM-DD <= ate),
 * ASC. NÃO lê nem faz parse de nenhum snapshot: é só o nome do diretório.
 *
 * Serve a quem precisa saber em que dias houve ingestão sem pagar o custo de
 * carregar a série. A Fase 3 usa isto para descobrir o dia REAL em que um
 * vencimento cruzou a janela: o cruzamento teórico cai em fim de semana ou
 * feriado em cerca de dois de cada sete casos, e nesses dias não há arquivo do
 * custodiante, então o evento nasce no próximo dia útil.
 */
export function listarDatasDiarias(root: string, ate: string): string[] {
  return nomesDeDiretorioDiario(root, ate).sort((a, b) => a.localeCompare(b));
}

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function nomesDeDiretorioDiario(root: string, ate: string, desde?: string): string[] {
  try {
    return fs
      .readdirSync(path.join(root, 'audits'))
      .filter((nome) => DIA.test(nome) && nome <= ate && (desde === undefined || nome >= desde));
  } catch {
    return []; // root sem audits/ ainda: série vazia
  }
}
