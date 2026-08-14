/**
 * src/opportunities/types.ts — Fase 2: oportunidades comerciais.
 *
 * Uma oportunidade nasce de um evento/achado da Fase 1 e segue um ciclo de
 * status controlado pelo assessor. CRM-lite: sem automação de email; a saída
 * oficial é export CSV e o armazenamento é JSON local na instância.
 */

import type { SnapshotEvent } from '../snapshot/types.js';

export type StatusOportunidade =
  | 'Nova'
  | 'Contatar'
  | 'Em andamento'
  | 'Convertida'
  | 'Perdida'
  | 'Descartada';

export type PrioridadeOportunidade = 'P1' | 'P2' | 'P3';

/**
 * Ciclo aprovado: Nova → Contatar → Em andamento → (Convertida | Perdida).
 * Descartada é saída lateral de qualquer estado ativo. Terminais não saem.
 */
export const TRANSICOES_VALIDAS: Record<StatusOportunidade, StatusOportunidade[]> = {
  Nova: ['Contatar', 'Descartada'],
  Contatar: ['Em andamento', 'Perdida', 'Descartada'],
  'Em andamento': ['Convertida', 'Perdida', 'Descartada'],
  Convertida: [],
  Perdida: [],
  Descartada: [],
};

export function transicaoPermitida(de: StatusOportunidade, para: StatusOportunidade): boolean {
  return (TRANSICOES_VALIDAS[de] ?? []).includes(para);
}

/** Origem rastreável: o evento do diff ou o achado mensal que motivou a ação. */
export interface OrigemOportunidade {
  tipo: 'evento' | 'achado';
  id: string;
  periodo: string; // 'YYYY-MM-DD' ou 'YYYY-MM'
}

export interface ContatoOportunidade {
  data: string; // YYYY-MM-DD
  canal: string;
  observacao: string;
}

export interface Oportunidade {
  id: string;
  cliente: string; // nome canônico da carteira (nome real só na instância)
  assessor: string;
  motivo: string;
  volume: number; // em reais
  prioridade: PrioridadeOportunidade;
  prazo: string; // YYYY-MM-DD, alvo para agir
  status: StatusOportunidade;
  ultimoContato: ContatoOportunidade | null;
  proximoContato: string | null; // YYYY-MM-DD
  observacao: string;
  resultado: string | null;
  origem: OrigemOportunidade;
  createdAt: string;
  updatedAt: string;
}

/**
 * Regra declarativa: nome, gatilho, texto, prioridade padrão e prazo alvo.
 * `ligada: false` tira a regra da fila sem apagar o código dela.
 */
export interface RegraOportunidade {
  nome: string;
  ligada: boolean;
  gatilho: (evento: SnapshotEvent) => boolean;
  texto: (evento: SnapshotEvent) => string;
  prioridade: PrioridadeOportunidade;
  /** dias até o prazo alvo, contados da data de referência do período */
  prazoDias: number | ((evento: SnapshotEvent) => number);
}
