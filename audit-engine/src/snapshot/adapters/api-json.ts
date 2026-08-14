/**
 * adapters/api-json.ts — adaptador de JSON de API para o snapshot EOD.
 *
 * Shape declarado e validado campo a campo (erros nomeiam o campo):
 * {
 *   data?, fonte?,
 *   carteiras: [
 *     { nome: string, posicoes: [ { ativo: string, valor: number,
 *         classe?, vencimento?, quantidade? } ] }
 *   ]
 * }
 */

import type { RawSnapshot, SnapshotFonte } from '../types.js';

export function parseApiJson(texto: string, fonte: SnapshotFonte, data: string): RawSnapshot {
  let obj: unknown;
  try {
    obj = JSON.parse(texto);
  } catch {
    throw new Error('api-json: JSON invalido.');
  }

  if (typeof obj !== 'object' || obj === null) {
    throw new Error('api-json: esperado objeto na raiz.');
  }
  const raiz = obj as Record<string, unknown>;

  if (!Array.isArray(raiz.carteiras)) {
    throw new Error('api-json: campo "carteiras" ausente ou nao-array.');
  }

  const carteiras: { nome: string; posicoes: { ativo: string; valor: number; classe?: string; vencimento?: string; quantidade?: number }[] }[] = [];

  for (const [i, c] of raiz.carteiras.entries()) {
    if (typeof c !== 'object' || c === null) {
      throw new Error(`api-json: carteiras[${i}] nao e objeto.`);
    }
    const carteira = c as Record<string, unknown>;
    if (typeof carteira.nome !== 'string' || !carteira.nome.trim()) {
      throw new Error(`api-json: carteiras[${i}].nome ausente ou vazio.`);
    }
    if (!Array.isArray(carteira.posicoes)) {
      throw new Error(`api-json: carteiras[${i}].posicoes ausente ou nao-array.`);
    }

    const posicoes: { ativo: string; valor: number; classe?: string; vencimento?: string; quantidade?: number }[] = [];
    for (const [j, p] of carteira.posicoes.entries()) {
      if (typeof p !== 'object' || p === null) {
        throw new Error(`api-json: carteiras[${i}].posicoes[${j}] nao e objeto.`);
      }
      const pos = p as Record<string, unknown>;
      if (typeof pos.ativo !== 'string' || !pos.ativo.trim()) {
        throw new Error(`api-json: carteiras[${i}].posicoes[${j}].ativo ausente ou vazio.`);
      }
      if (typeof pos.valor !== 'number' || !Number.isFinite(pos.valor)) {
        throw new Error(`api-json: carteiras[${i}].posicoes[${j}].valor ausente ou nao numerico.`);
      }
      const posicao: { ativo: string; valor: number; classe?: string; vencimento?: string; quantidade?: number } = { ativo: pos.ativo, valor: pos.valor };
      if (typeof pos.classe === 'string' && pos.classe) posicao.classe = pos.classe;
      if (typeof pos.vencimento === 'string' && pos.vencimento) posicao.vencimento = pos.vencimento;
      if (typeof pos.quantidade === 'number' && Number.isFinite(pos.quantidade)) posicao.quantidade = pos.quantidade;
      posicoes.push(posicao);
    }
    carteiras.push({ nome: carteira.nome, posicoes });
  }

  if (!carteiras.length) {
    throw new Error('api-json: nenhuma carteira reconhecida.');
  }

  return { data, fonte, carteiras };
}
