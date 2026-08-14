/**
 * src/opportunities/prioritize.ts — score transparente e determinístico.
 *
 * score = pesoPrioridade × fatorVolume × fatorPrazo, com cada fator em faixas
 * nomeadas para o assessor entender a ordem da fila:
 *   - pesoPrioridade: P1=3, P2=2, P3=1
 *   - fatorVolume: < 5 mil = 1; ≥ 5 mil = 2; ≥ 100 mil = 3; ≥ 500 mil = 4
 *   - fatorPrazo: > 30d = 1; ≤ 30d = 2; ≤ 15d = 3; ≤ 7d ou vencido = 4
 *
 * Sem Date.now nem Math.random: o mesmo dado produz a mesma fila, sempre.
 */

import type { Oportunidade, PrioridadeOportunidade } from './types.js';

export const PESO_PRIORIDADE: Record<PrioridadeOportunidade, number> = { P1: 3, P2: 2, P3: 1 };

export function fatorVolume(volume: number): number {
  if (volume >= 500_000) return 4;
  if (volume >= 100_000) return 3;
  if (volume >= 5_000) return 2;
  return 1;
}

export function fatorPrazo(prazo: string, hoje: string): number {
  const ms = Date.parse(prazo) - Date.parse(hoje);
  if (!Number.isFinite(ms)) return 1;
  const dias = Math.ceil(ms / 86_400_000);
  if (dias <= 7) return 4; // inclui vencido: urgência máxima
  if (dias <= 15) return 3;
  if (dias <= 30) return 2;
  return 1;
}

export function pontuarOportunidade(op: Oportunidade, hoje: string): number {
  return PESO_PRIORIDADE[op.prioridade] * fatorVolume(op.volume) * fatorPrazo(op.prazo, hoje);
}

/**
 * Devolve cópia ordenada por score decrescente; empate: prazo mais próximo,
 * depois id (ordem total estável).
 */
export function priorizarOportunidades(ops: Oportunidade[], hoje: string): Oportunidade[] {
  return [...ops].sort((a, b) => {
    const sa = pontuarOportunidade(a, hoje);
    const sb = pontuarOportunidade(b, hoje);
    if (sa !== sb) return sb - sa;
    if (a.prazo !== b.prazo) return a.prazo < b.prazo ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}
