/**
 * src/snapshot/types.ts — tipos do snapshot EOD diário (Fase 1).
 *
 * Aditivos: não tocam schema.ts, que é o contrato do fluxo mensal. O snapshot
 * diário modela o estado de um DIA (posições EOD), não a comparação mensal
 * baseline vs referencia.
 */

/** Rótulo lógico da fonte (ex.: nome da casa no pipeline). Validado sem separador de path. */
export type SnapshotFonte = string;

export type FormatoEntrada = 'xlsx' | 'csv' | 'pdf' | 'html' | 'api-json' | 'txt-b3';

/** Saída comum de todos os adaptadores, antes da normalização. */
export interface RawPosition {
  ativo: string;
  valor: number;
  classe?: string;
  vencimento?: string; // 'YYYY-MM-DD' quando o adaptador conseguir
  quantidade?: number;
  instituicao?: string | null; // emissor/custodiante, só quando a fonte tem (PDF)
}

export interface RawCarteira {
  nome: string;
  /** Receita da casa no período (R$), quando a fonte informa; senão, o
      normalize deriva no mensal via taxa-map (PL x taxa anual / 12). */
  receita?: number;
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
  instituicao: string | null; // emissor/custodiante quando a fonte fornece
}

export interface SnapshotCarteira {
  nome: string;
  plTotal: number; // sempre derivado: soma das posições (fonte única de verdade)
  /** Receita da casa no período (R$). Só existe no mensal (normalize calcula
      via taxa-map quando a fonte não informa); no diário fica ausente. */
  receita?: number;
  posicoes: SnapshotPosition[];
}

export interface Snapshot {
  schema: 'snapshot/v1';
  data: string; // 'YYYY-MM-DD' (diario) ou 'YYYY-MM' (mensal)
  periodo: 'diario' | 'mensal';
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
  | 'REVENUE_DROP'; // Fase 5: queda >= 5% da receita mensal da carteira (receita = PL x taxa anual / 12; taxa-map da instancia)

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
  periodo: 'diario' | 'mensal';
  baseData: string | null; // data do snapshot base usado no diff; null = linha de base
  geradoEm: string;
  engine: { nome: 'atlas-audit-engine'; versao: string };
  eventos: SnapshotEvent[];
}
