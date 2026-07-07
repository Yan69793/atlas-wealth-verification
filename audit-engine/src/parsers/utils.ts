export function cellStr(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

export function parseBRL(value: unknown): number {
  if (typeof value === 'number') return value;
  const raw = cellStr(value).replace(/−/g, '-');
  if (!raw) return 0;

  const plain = raw.replace(/[^0-9.\-]/g, '');
  if (/^-?\d+\.\d+$/.test(plain)) {
    const n = Number(plain);
    return Number.isFinite(n) ? n : 0;
  }

  const s = raw
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.\-]/g, '');
  if (!s || s === '-' || s === '.') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function parsePct(value: unknown): number {
  const raw = cellStr(value);
  const hasPercentSign = raw.includes('%');
  const s = raw
    .replace(/−/g, '-')
    .replace('%', '')
    .replace(',', '.')
    .trim();
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  // Celula com "%" literal (ex: "0.96%") sempre significa n/100, mesmo com
  // |n| <= 1 (bug historico: so dividia quando abs(n) > 1, entao "0.96%"
  // virava 0.96 = 96% em vez de 0.0096 = 0.96%).
  if (hasPercentSign || Math.abs(n) > 1) return n / 100;
  return n;
}

export function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const s = cellStr(value);
  if (!s) return 0;
  if (s.includes('%')) return parsePct(s);
  return parseBRL(s);
}

export function extractCarteiraName(row1: string): string | null {
  const m = row1.match(/^CARTEIRA\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export function extractPeriodoLabels(text: string): { baselineLabel: string; referenciaLabel: string } {
  const contra = text.match(/^(.+?)\s+verificado\s+contra\s+(.+?)\s+como\s+baseline/i);
  if (contra) {
    return { referenciaLabel: contra[1].trim(), baselineLabel: contra[2].trim() };
  }

  const parts = text.split('→').map((p) => p.trim());
  if (parts.length >= 2) {
    const baseline = parts[0].replace(/^Extrato\s+/i, '').trim();
    const referencia = parts[1].trim();
    return { baselineLabel: baseline, referenciaLabel: referencia };
  }
  return { baselineLabel: text, referenciaLabel: text };
}

export function ymToLabel(ym: string): string {
  const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [y, m] = ym.split('-').map(Number);
  return `${MESES[m]} ${y}`;
}