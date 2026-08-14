/**
 * adapters/transform-raw.ts — transforma CarteiraRaw[] (fluxo mensal) em RawSnapshot.
 *
 * Compartilhado pelos adaptadores xlsx e pdf, que reusam os parsers existentes.
 * Posição EOD = plRef de cada linha 'ativo'; classe vem do contexto (linha
 * 'classe' corrente). Linhas 'saida' e posições com valor 0 são ignoradas
 * (posição zerada = posição ausente no dia, o que o diff trata como encerrada).
 */

import type { AtivoRow, CarteiraRaw } from '../../schema.js';
import type { RawSnapshot, SnapshotFonte } from '../types.js';

export function carteirasRawParaRawSnapshot(
  raws: CarteiraRaw[],
  data: string,
  fonte: SnapshotFonte
): RawSnapshot {
  const carteiras = raws.map((raw) => {
    let classeCorrente: string | null = null;
    const posicoes: { ativo: string; valor: number; classe?: string }[] = [];

    for (const linha of raw.ativos) {
      if (linha.type === 'classe') {
        classeCorrente = linha.classe ?? null;
        continue;
      }
      if (linha.type !== 'ativo') continue; // 'saida' ignorada
      const valor = linha.plRef;
      if (!Number.isFinite(valor) || valor <= 0) continue;
      const ativo = linha.nome;
      if (!ativo) continue;
      const posicao: { ativo: string; valor: number; classe?: string } = { ativo, valor };
      if (classeCorrente) posicao.classe = classeCorrente;
      posicoes.push(posicao);
    }

    return { nome: raw.nome, posicoes };
  });

  return { data, fonte, carteiras };
}
