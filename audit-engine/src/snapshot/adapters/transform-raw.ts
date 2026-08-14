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

/**
 * Vencimento embutido no nome do ativo, padrão do book real:
 * '... Vencto: 15/06/2026' (aceita também 'Vencto:15/06/2026' colado).
 */
function extrairVencimentoDoNome(nome: string): { ativo: string; vencimento?: string } {
  const m = nome.match(/Vencto:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (!m) return { ativo: nome };
  const [, dd, mm, aaaa] = m;
  return {
    ativo: nome,
    vencimento: `${aaaa}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
  };
}

export function carteirasRawParaRawSnapshot(
  raws: CarteiraRaw[],
  data: string,
  fonte: SnapshotFonte
): RawSnapshot {
  const carteiras = raws.map((raw) => {
    let classeCorrente: string | null = null;
    const posicoes: { ativo: string; valor: number; classe?: string; vencimento?: string; instituicao?: string | null }[] = [];

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
      const { vencimento } = extrairVencimentoDoNome(ativo);
      const posicao: { ativo: string; valor: number; classe?: string; vencimento?: string; instituicao?: string | null } = { ativo, valor };
      if (classeCorrente) posicao.classe = classeCorrente;
      if (vencimento) posicao.vencimento = vencimento;
      if (linha.instituicao) posicao.instituicao = linha.instituicao;
      posicoes.push(posicao);
    }

    return { nome: raw.nome, posicoes };
  });

  return { data, fonte, carteiras };
}
