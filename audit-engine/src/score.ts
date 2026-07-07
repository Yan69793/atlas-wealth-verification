import type { AuditFinding, CarteiraRaw } from './schema.js';

export function computeScore(carteira: CarteiraRaw, findings: AuditFinding[]): number {
  let score = 100;

  const erros = findings.filter((f) => f.tipo === 'erro');
  const alertas = findings.filter((f) => f.tipo === 'alerta');

  score -= erros.length * 40;
  score -= alertas.length * 10;

  if (carteira.continuidade !== null && carteira.continuidade > 0.003) score -= 15;
  if (carteira.somaVsTotal !== null && carteira.somaVsTotal > 0.001) score -= 10;

  const rent = carteira.rentRef;
  if (rent !== null && rent !== 0 && carteira.perfImplicita !== null) {
    const spread = Math.abs(carteira.perfImplicita - rent);
    if (spread > 0.005) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}