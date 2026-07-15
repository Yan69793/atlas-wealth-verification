export type AuditStatus = 'LIBERAR' | 'LIBERAR COM ALERTA' | 'CORRIGIR';

export interface PeriodoRef {
  baseline: string;
  referencia: string;
  baselineLabel: string;
  referenciaLabel: string;
}

export interface AtivoRow {
  type: 'classe' | 'ativo' | 'saida';
  classe?: string;
  nome?: string;
  instituicao?: string;
  plBase: number;
  plRef: number;
  diff: number;
  varPct: number;
  compras?: number;
  vendas?: number;
  eventos?: number;
  impostos?: number;
  provIR?: number;
  part?: number;
}

export interface CarteiraTotal {
  plBase: number;
  plRef: number;
  diff: number;
  varPct: number;
  compras?: number;
  vendas?: number;
  eventos?: number;
  impostos?: number;
  provIR?: number;
  part?: number;
}

export interface CarteiraRaw {
  nome: string;
  periodo: PeriodoRef;
  plBase: number;
  plRef: number;
  varRS: number;
  varPct: number;
  rentRef: number | null;
  continuidade: number | null;
  somaVsTotal: number | null;
  perfImplicita: number | null;
  eventos: number;
  impostos: number;
  ativos: AtivoRow[];
  total?: CarteiraTotal;
  nAtivosBase: number;
  nAtivosRef: number;
  fonte:
    | { tipo: 'xlsx'; template: 'custodian-xlsx-v2'; arquivo: string }
    | { tipo: 'pdf'; template: 'custodian-pdf-v1'; arquivo: string };
}

export interface AuditFinding {
  tipo: 'erro' | 'alerta' | 'limitacao';
  mensagem: string;
}

export interface AuditResult {
  nome: string;
  status: AuditStatus;
  score: number;
  erros: string[];
  alertas: string[];
  limitacoes: string[];
  evidencias: Record<string, number | string | boolean>;
}

export interface IngestMeta {
  mes: string;
  baseline: string;
  arquivo: string;
  processadoEm: string;
}

export interface DashboardSummary {
  title: string;
  subtitle1: string;
  subtitle2: string;
  periodo: PeriodoRef;
  totals: {
    total: number;
    liberar: number;
    alerta: number;
    corrigir: number;
  };
}

export interface DashboardCarteira {
  nome: string;
  status: AuditStatus;
  plBase: number;
  plRef: number;
  varRS: number;
  varPct: number;
  rentRef: number | null;
  achados: string;
  score?: number;
}

export interface DashboardConciliacao {
  nome: string;
  status: AuditStatus;
  plBase: number;
  plRef: number;
  varPct: number;
  continuidade: number | null;
  somaVsTotal: number | null;
  perfImplicita: number | null;
  rentReportada: number | null;
  nAtivosBase: number;
  nAtivosRef: number;
}

export interface DashboardAchado {
  nome: string;
  status: AuditStatus;
  erros: string;
  alertas: string;
  limitacoes: string;
}

export interface DashboardDetail {
  nome: string;
  status: string;
  periodo: string;
  plBase: number;
  plRef: number;
  varRS: number;
  varPct: number;
  rentRef: number | null;
  continuidade: number | null;
  somaVsTotal: number | null;
  perfImplicita: number | null;
  eventos: number;
  impostos: number;
  achadosText: string;
  total?: CarteiraTotal;
  ativos: AtivoRow[];
  score?: number;
}

export interface AuditData {
  summary: DashboardSummary;
  carteiras: DashboardCarteira[];
  conciliacao: DashboardConciliacao[];
  achados: DashboardAchado[];
  details: Record<string, DashboardDetail>;
  meta: IngestMeta;
}

export interface EngineOutput {
  meta: IngestMeta;
  periodo: PeriodoRef;
  carteiras: CarteiraRaw[];
  results: AuditResult[];
  dashboard: AuditData;
}