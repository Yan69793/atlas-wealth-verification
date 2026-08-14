/**
 * adapters/valor.ts — conversor de valor pt-BR do snapshot EOD.
 *
 * DIFERE de parsers/utils.ts parseBRL de propósito: aquele trata o primeiro
 * ponto como decimal (ex.: '100.000,00' → 100), o que serve ao fluxo mensal
 * (células de Excel), mas não a valores textuais com milhar. Este é o
 * conversor dos formatos textuais (CSV/HTML):
 *   - com vírgula: pontos são milhar → remove todos, vírgula vira ponto
 *   - sem vírgula com grupos de 3: pontos são milhar → remove
 *   - sem vírgula sem grupo de 3: número decimal puro (ex.: '0.5')
 */

export function parseValorBR(s: string): number | null {
  let v = s.trim();
  if (!v) return null;
  let negativo = false;
  if (v.startsWith('-')) {
    negativo = true;
    v = v.slice(1);
  }
  if (v.includes(',')) {
    v = v.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(v)) {
    v = v.replace(/\./g, '');
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}
