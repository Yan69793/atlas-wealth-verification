import type { AuditResult } from '../schema.js';

export interface AiEnrichment {
  explicacao: string;
  acaoRecomendada: string;
  confianca: 'CERTO' | 'PROVÁVEL' | 'HIPÓTESE';
}

export async function enrichResult(result: AuditResult): Promise<Record<string, AiEnrichment>> {
  const enrichments: Record<string, AiEnrichment> = {};

  for (const erro of result.erros) {
    enrichments[erro] = {
      explicacao: `[HIPÓTESE] ${erro}`,
      acaoRecomendada: 'Confirmar com custodiante antes de liberar o relatório.',
      confianca: 'HIPÓTESE',
    };
  }

  for (const alerta of result.alertas) {
    enrichments[alerta] = {
      explicacao: `[PROVÁVEL] ${alerta}`,
      acaoRecomendada: 'Monitorar e documentar antes do fechamento.',
      confianca: 'PROVÁVEL',
    };
  }

  return enrichments;
}

export async function enrichAll(results: AuditResult[]): Promise<Map<string, Record<string, AiEnrichment>>> {
  const map = new Map<string, Record<string, AiEnrichment>>();
  for (const r of results) {
    if (r.erros.length === 0 && r.alertas.length === 0) continue;
    map.set(r.nome, await enrichResult(r));
  }
  return map;
}