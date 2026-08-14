/**
 * src/snapshot/types.ts — tipos do snapshot EOD diário (Fase 1).
 *
 * Aditivos: não tocam schema.ts, que é o contrato do fluxo mensal. O snapshot
 * diário modela o estado de um DIA (posições EOD), não a comparação mensal
 * baseline vs referencia.
 */

/** Rótulo lógico da fonte (ex.: nome da casa no pipeline). Validado sem separador de path. */
export type SnapshotFonte = string;

export type FormatoEntrada = 'xlsx' | 'csv' | 'pdf' | 'html' | 'api-json';

/** Saída comum de todos os adaptadores, antes da normalização. */
export interface RawPosition {
  ativo: string;
  valor: number;
  classe?: string;
  vencimento?: string; // 'YYYY-MM-DD' quando o adaptador conseguir
  quantidade?: number;
}

export interface RawCarteira {
  nome: string;
  posicoes: RawPosition[];
}

export interface RawSnapshot {
  data: string; // 'YYYY-MM-DD'
  fonte: SnapshotFonte;
  carteiras: RawCarteira[];
}

/** Posição canônica pós-normalização (identificadores estáveis entre dias). */
export interface SnapshotPosition {
  carteira: string;
  ativo: string;
  classe: string | null;
  valor: number;
  vencimento: string | null;
  quantidade: number | null;
}

export interface SnapshotCarteira {
  nome: string;
  plTotal: number; // sempre derivado: soma das posições (fonte única de verdade)
  posicoes: SnapshotPosition[];
}

export interface Snapshot {
  schema: 'snapshot/v1';
  data: string;
  fonte: SnapshotFonte;
  geradoEm: string; // ISO
  engine: { nome: 'atlas-audit-engine'; versao: string };
  carteiras: SnapshotCarteira[];
}

export type EventoTipo =
  | 'CASH_INCREASE'
  | 'CASH_DECREASE'
  | 'NEW_POSITION'
  | 'POSITION_CLOSED'
  | 'MATURITY_APPROACHING'
  | 'LARGE_WITHDRAWAL'
  | 'ALLOCATION_SHIFT'
  | 'CONCENTRATION_INCREASE'
  | 'REVENUE_DROP'; // reservado para a Fase 5: o diff desta fase NUNCA o emite

export type Severidade = 'baixa' | 'media' | 'alta';

export interface SnapshotEvent {
  schema: 'evento/v1';
  tipo: EventoTipo;
  carteira: string;
  ativo?: string;
  valorAnterior: number;
  valorAtual: number;
  delta: number; // valorAtual - valorAnterior
  deltaPct: number | null; // null quando valorAnterior === 0
  materialidade: number | null; // |delta| / plTotalBase; null quando base 0
  severidade: Severidade;
  evidencias: Record<string, number | string | boolean>;
}

export interface EventsFile {
  data: string;
  baseData: string | null; // data do snapshot base usado no diff; null = linha de base
  geradoEm: string;
  engine: { nome: 'atlas-audit-engine'; versao: string };
  eventos: SnapshotEvent[];
}
