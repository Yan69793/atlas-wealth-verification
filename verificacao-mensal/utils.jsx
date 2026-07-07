/* Shared utilities: formatters, icons, helpers */

const fmtBRL = (n, opts = {}) => {
  if (n == null || isNaN(n)) return '—';
  const { compact = false, sign = false } = opts;
  const abs = Math.abs(n);
  let formatted;
  if (compact && abs >= 1_000_000) {
    formatted = (abs / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + 'M';
  } else if (compact && abs >= 1_000) {
    formatted = (abs / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + 'k';
  } else {
    formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const prefix = sign ? (n < 0 ? '−' : '+') : (n < 0 ? '−' : '');
  return prefix + formatted;
};

const fmtPct = (n, digits = 2) => {
  if (n == null || isNaN(n)) return '—';
  const v = (n * 100).toFixed(digits);
  return v + '%';
};

const fmtPctSigned = (n, digits = 2) => {
  if (n == null || isNaN(n)) return '—';
  const v = (n * 100).toFixed(digits);
  if (n > 0) return '+' + v + '%';
  if (n < 0) return '−' + Math.abs(parseFloat(v)).toFixed(digits) + '%';
  return v + '%';
};

const fmtInt = (n) => {
  if (n == null || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('pt-BR');
};

const statusClass = (s) => {
  if (s === 'LIBERAR') return 'ok';
  if (s === 'LIBERAR COM ALERTA') return 'warn';
  if (s === 'CORRIGIR') return 'bad';
  return '';
};

const statusShort = (s) => {
  if (s === 'LIBERAR') return 'Liberar';
  if (s === 'LIBERAR COM ALERTA') return 'Alerta';
  if (s === 'CORRIGIR') return 'Corrigir';
  return s;
};

const statusRank = (s) => {
  if (s === 'CORRIGIR') return 0;
  if (s === 'LIBERAR COM ALERTA') return 1;
  if (s === 'LIBERAR') return 2;
  return 3;
};

// Split a multi-finding string by " | " separator used in source
const splitFindings = (s) => {
  if (!s || s === '-') return [];
  return s.split(' | ').map(x => x.trim()).filter(Boolean);
};

// Icons (inline SVG, stroke=currentColor)
const Icon = ({ name, size = 14 }) => {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'search': return (
      <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
    );
    case 'close': return (
      <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>
    );
    case 'arrow-right': return (
      <svg {...props}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    );
    case 'chevron-up': return (
      <svg {...props}><path d="m18 15-6-6-6 6"/></svg>
    );
    case 'chevron-down': return (
      <svg {...props}><path d="m6 9 6 6 6-6"/></svg>
    );
    case 'check': return (
      <svg {...props}><path d="M20 6 9 17l-5-5"/></svg>
    );
    case 'alert': return (
      <svg {...props}><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
    );
    case 'x-circle': return (
      <svg {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
    );
    case 'doc': return (
      <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
    );
    default: return null;
  }
};

window.fmtBRL = fmtBRL;
window.fmtPct = fmtPct;
window.fmtPctSigned = fmtPctSigned;
window.fmtInt = fmtInt;
window.statusClass = statusClass;
window.statusShort = statusShort;
window.statusRank = statusRank;
window.splitFindings = splitFindings;
window.Icon = Icon;
