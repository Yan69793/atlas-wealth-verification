/**
 * src/intel/estado.ts — a máquina de estado temporal, uma só para toda a camada.
 *
 * Nasceu dentro do adapter de crédito (Entrega B) e saiu de lá na B.2, quando o
 * radar precisou da mesma coisa. Duas cópias da mesma regra divergem sozinhas, e
 * o dia em que divergirem a tela de eventos vai chamar de "agravado" o que a
 * tela do radar chama de "acompanhamento" sobre o mesmo movimento.
 *
 * ── Por que estado existe ────────────────────────────────────────────────────
 * Medido no dado real da casa em 2026-08-24, sobre 37 meses: o radar produzia
 * 292,9 alertas por mês, acendia 97% das carteiras, e **apenas 13% dos alertas
 * de cada mês eram novos**. Uma tela que repete 87% do conteúdo da semana
 * passada ensina o assessor a não abri-la. Cortando por novidade, os mesmos
 * dados viram 15,5 alertas por mês e 13% das carteiras. O corte por estado vale
 * mais que todos os ajustes de limiar somados.
 *
 * ── A regra ─────────────────────────────────────────────────────────────────
 * A SEVERIDADE manda: é o julgamento do motor e muda de faixa por razões que o
 * assessor entende. A exposição só decide quando a severidade empata, e só além
 * do limiar de variação material, senão oscilação de marcação a mercado marcaria
 * tudo como agravado todo dia.
 *
 * Puro e determinístico: sem IO, sem Date.now.
 */

import type { Severidade } from '../snapshot/types.js';

export type EstadoTemporal = 'novo' | 'acompanhamento' | 'agravado' | 'melhorado' | 'encerrado';

/** Ordem de urgência. É por ela que as telas abrem: o que mudou vem primeiro. */
export const PESO_ESTADO: Record<EstadoTemporal, number> = {
  agravado: 5,
  novo: 4,
  acompanhamento: 3,
  melhorado: 2,
  encerrado: 1,
};

export const PESO_SEVERIDADE: Record<Severidade, number> = { baixa: 1, media: 2, alta: 3 };

/** O par medido num período: o julgamento e o tamanho. */
export interface MedidaTemporal {
  severidade: Severidade;
  valor: number;
}

export function estadoTemporal(
  atual: MedidaTemporal,
  anterior: MedidaTemporal | undefined,
  variacaoMaterial: number
): EstadoTemporal {
  if (!anterior) return 'novo';
  if (PESO_SEVERIDADE[atual.severidade] > PESO_SEVERIDADE[anterior.severidade]) return 'agravado';
  if (PESO_SEVERIDADE[atual.severidade] < PESO_SEVERIDADE[anterior.severidade]) return 'melhorado';
  // Base zero não permite calcular variação relativa. Severidade empatada com
  // base zero é acompanhamento, não movimento inventado.
  if (anterior.valor <= 0) return 'acompanhamento';
  const variacao = (atual.valor - anterior.valor) / anterior.valor;
  if (variacao >= variacaoMaterial) return 'agravado';
  if (variacao <= -variacaoMaterial) return 'melhorado';
  return 'acompanhamento';
}

/** O estado mais urgente de um conjunto. Vazio = null, que não é 'acompanhamento'. */
export function estadoAgregado(estados: EstadoTemporal[]): EstadoTemporal | null {
  if (!estados.length) return null;
  return estados.reduce((a, b) => (PESO_ESTADO[b] > PESO_ESTADO[a] ? b : a));
}
