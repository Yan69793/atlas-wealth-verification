import type { AuditResult, AuditStatus, CarteiraRaw, IngestMeta } from './schema.js';
import { ALL_RULES } from './rules/index.js';
import type { RuleContext } from './rules/types.js';
import { computeScore } from './score.js';
import { toDashboard } from './output/to-dashboard.js';

export interface RunEngineOptions {
  meta: IngestMeta;
  toleranciaPL?: number;
}

export function resolveStatus(erros: string[], alertas: string[]): AuditStatus {
  if (erros.length > 0) return 'CORRIGIR';
  if (alertas.length > 0) return 'LIBERAR COM ALERTA';
  return 'LIBERAR';
}

export function auditCarteira(carteira: CarteiraRaw, ctx: RuleContext): AuditResult {
  const allFindings = ALL_RULES.flatMap((rule) => rule.run(carteira, ctx));

  const erros = allFindings.filter((f) => f.tipo === 'erro').map((f) => f.mensagem);
  const alertas = allFindings.filter((f) => f.tipo === 'alerta').map((f) => f.mensagem);
  const limitacoes = allFindings.filter((f) => f.tipo === 'limitacao').map((f) => f.mensagem);

  return {
    nome: carteira.nome,
    status: resolveStatus(erros, alertas),
    score: computeScore(carteira, allFindings),
    erros,
    alertas,
    limitacoes,
    evidencias: {
      plBase: carteira.plBase,
      plRef: carteira.plRef,
      rentRef: carteira.rentRef ?? 'null',
      continuidade: carteira.continuidade ?? 'null',
      somaVsTotal: carteira.somaVsTotal ?? 'null',
      perfImplicita: carteira.perfImplicita ?? 'null',
    },
  };
}

export function runEngine(carteiras: CarteiraRaw[], options: RunEngineOptions) {
  const ctx: RuleContext = {
    mes: options.meta.mes,
    baseline: options.meta.baseline,
    toleranciaPL: options.toleranciaPL ?? 0.003,
  };

  const results = carteiras.map((c) => auditCarteira(c, ctx));
  const periodo = carteiras[0]?.periodo ?? {
    baseline: options.meta.baseline,
    referencia: options.meta.mes,
    baselineLabel: options.meta.baseline,
    referenciaLabel: options.meta.mes,
  };

  const dashboard = toDashboard(carteiras, results, periodo, options.meta);

  return {
    meta: options.meta,
    periodo,
    carteiras,
    results,
    dashboard,
  };
}