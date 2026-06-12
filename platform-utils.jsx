/* platform-utils.jsx — formatters, router, icons, charts, UI primitives */
(() => {
  const { useState, useEffect, useRef, useCallback, useMemo } = React;

  /* ===========================================================
     FORMATTERS
  =========================================================== */

  function fmt(v, decimals, prefix) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return (prefix || '') + Number(v).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function fmtBRL(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  }

  function fmtCompactBRL(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1e9) return sign + 'R$ ' + (abs / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bi';
    if (abs >= 1e6) return sign + 'R$ ' + (abs / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mi';
    if (abs >= 1e3) return sign + 'R$ ' + (abs / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' mil';
    return sign + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }

  function fmtPct(v, decimals) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return (v * 100).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals !== undefined ? decimals : 2,
      maximumFractionDigits: decimals !== undefined ? decimals : 2,
    }) + '%';
  }

  function fmtPctRaw(v, decimals) {
    // v already a percentage number (e.g. 1.23 for 1.23%)
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Number(v).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals !== undefined ? decimals : 2,
      maximumFractionDigits: decimals !== undefined ? decimals : 2,
    }) + '%';
  }

  function fmtMonthLabel(month) {
    if (!month) return '—';
    const idx = (window.AtlasData && window.AtlasData.MONTHS) ? window.AtlasData.MONTHS.indexOf(month) : -1;
    if (idx >= 0 && window.AtlasData.MONTH_LABELS) return window.AtlasData.MONTH_LABELS[idx];
    // fallback
    const parts = month.split('-');
    if (parts.length !== 2) return month;
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const m = parseInt(parts[1], 10);
    return monthNames[m - 1] + '/' + parts[0].slice(2);
  }

  function signClass(v) {
    if (!v || isNaN(v)) return '';
    return v > 0 ? 'num--pos' : v < 0 ? 'num--neg' : '';
  }

  /* ===========================================================
     STORAGE (localStorage com versão)
  =========================================================== */

  const STORAGE_KEY = 'atlas_platform_v1';

  function defaultStorage() {
    return {
      v: 1,
      auth: { sessionUntil: 0 },
      ui: { selectedMonth: window.AtlasData ? window.AtlasData.CURRENT_MONTH : '2026-04', plRange: '6M', comparativo: {} },
      observations: {},
      users: [],
    };
  }

  const storage = {
    get() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultStorage();
        const parsed = JSON.parse(raw);
        if (parsed.v !== 1) return defaultStorage();
        return parsed;
      } catch(e) {
        return defaultStorage();
      }
    },
    set(data) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
    },
    update(fn) {
      const d = storage.get();
      fn(d);
      storage.set(d);
    },
    getObs(code, month) {
      const d = storage.get();
      return (d.observations && d.observations[code + '|' + month]) || '';
    },
    setObs(code, month, text) {
      storage.update(d => {
        d.observations = d.observations || {};
        d.observations[code + '|' + month] = text;
      });
    },
    isAuthed() {
      const d = storage.get();
      return d.auth && d.auth.sessionUntil > Date.now();
    },
    login(password) {
      // senha cosmética: atlas2026
      if (password !== 'atlas2026') return false;
      storage.update(d => { d.auth = { sessionUntil: Date.now() + 24 * 3600 * 1000 }; });
      return true;
    },
    logout() {
      storage.update(d => { d.auth = { sessionUntil: 0 }; });
    },
    getSelectedMonth() {
      const d = storage.get();
      return (d.ui && d.ui.selectedMonth) || (window.AtlasData ? window.AtlasData.CURRENT_MONTH : '2026-04');
    },
    setSelectedMonth(m) {
      storage.update(d => { d.ui = d.ui || {}; d.ui.selectedMonth = m; });
    },
  };

  /* ===========================================================
     HASH ROUTER
  =========================================================== */

  function parseHash() {
    const hash = window.location.hash.replace(/^#/, '') || '/dashboard';
    const [pathPart, searchPart] = hash.split('?');
    const segments = pathPart.split('/').filter(Boolean);
    const params = {};
    if (searchPart) {
      searchPart.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path: '/' + segments.join('/'), segments, params };
  }

  function navigate(path) {
    window.location.hash = '#' + path.replace(/^#/, '');
  }

  function useRouter() {
    const [location, setLocation] = useState(() => parseHash());
    useEffect(() => {
      function onHashChange() { setLocation(parseHash()); }
      window.addEventListener('hashchange', onHashChange);
      return () => window.removeEventListener('hashchange', onHashChange);
    }, []);
    return { location, navigate };
  }

  /* ===========================================================
     ICONS (SVG inline)
  =========================================================== */

  function Icon({ name, size = 16, className = '', style }) {
    const paths = {
      dashboard:   'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
      compare:     'M10 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5v2h2V1h-2v2zm0 15H5l5-6v6zm9-15h-5v2h5v13l-5-6v8h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
      findings:    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
      revenue:     'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
      portfolios:  'M20 6h-2.18c.07-.44.18-.88.18-1.33 0-2.58-2.09-4.67-4.67-4.67-1.29 0-2.4.52-3.22 1.36L9 2.67 7.88 1.36C7.07.52 5.96 0 4.67 0 2.09 0 0 2.09 0 4.67c0 .46.11.89.18 1.33H0v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z',
      search:      'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
      register:    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z',
      import:      'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
      users:       'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
      logout:      'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
      chevronDown: 'M7 10l5 5 5-5z',
      chevronRight:'M10 17l5-5-5-5v10z',
      alert:       'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
      check:       'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
      close:       'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      edit:        'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
      export:      'M19 9h-4V3H9v6H5l7 7 7-7zm-8 8v-3.17l-2.83 2.83L6.76 15.25 12 10l5.24 5.25-1.41 1.41L13 13.83V17H11z',
      filter:      'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z',
      info:        'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
      menu:        'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
      report:      'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
      trending_up: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
    };
    const d = paths[name] || paths['info'];
    return (
      <svg
        width={size} height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <path d={d} />
      </svg>
    );
  }

  /* ===========================================================
     LINE CHART (SVG puro, sem dependências)
  =========================================================== */

  // Função pura — pode ser reutilizada no relatório
  function linePath(points, w, h, padL, padR, padT, padB) {
    if (!points || points.length < 2) return '';
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
    const scaleX = p => padL + (p.x - minX) / rangeX * (w - padL - padR);
    const scaleY = p => padT + (maxY - p.y) / rangeY * (h - padT - padB);
    return points.map((p, i) => (i === 0 ? 'M' : 'L') + scaleX(p).toFixed(1) + ' ' + scaleY(p).toFixed(1)).join(' ');
  }

  function niceScale(min, max, ticks) {
    const range = max - min || 0.01;
    const step0 = range / (ticks - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const frac = step0 / mag;
    let step;
    if (frac < 1.5) step = 1 * mag;
    else if (frac < 3) step = 2 * mag;
    else if (frac < 7) step = 5 * mag;
    else step = 10 * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const result = [];
    for (let v = lo; v <= hi + step * 0.01; v += step) result.push(parseFloat(v.toPrecision(8)));
    return result;
  }

  // Resolve CSS variables to hex for Recharts SVG attributes
  const CSS_COLOR_MAP = {
    'var(--navy)':    '#05305F',
    'var(--amber)':   '#C4A228',
    'var(--red)':     '#B91C1C',
    'var(--green)':   '#15803D',
    'var(--muted)':   '#9A9188',
    'var(--body)':    '#3D3733',
    'var(--heading)': '#1A1714',
  };
  function resolveColor(c) { return CSS_COLOR_MAP[c] || c || '#05305F'; }

  function LineChart({ series, height = 220, showLegend = true }) {
    // series: [{ label, color, dash, data: [{month, value}] }]
    // value is a decimal ratio (0.0234 = 2.34%)
    const {
      LineChart: RC_LineChart, Line, XAxis, YAxis,
      CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    } = window.Recharts;

    if (!series || !series.length) {
      return <div className="empty-state" style={{ height }}>Sem dados</div>;
    }

    const allMonths = series[0].data.map(d => d.month);
    const nMonths = allMonths.length;
    const tickInterval = nMonths > 8 ? Math.ceil(nMonths / 7) : 0;

    const chartData = allMonths.map(m => {
      const row = { label: fmtMonthLabel(m) };
      series.forEach((s, i) => {
        const pt = s.data.find(d => d.month === m);
        row['v' + i] = pt !== undefined ? pt.value : null;
      });
      return row;
    });

    const fmtY  = v => (v * 100).toFixed(1) + '%';
    const fmtTT = (value, key) => {
      const idx = parseInt(key.slice(1), 10);
      return [(value * 100).toFixed(2) + '%', series[idx] ? series[idx].label : key];
    };

    return (
      <ResponsiveContainer width="100%" height={height}>
        <RC_LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD5" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9A9188' }}
            interval={tickInterval}
          />
          <YAxis
            tickFormatter={fmtY}
            tick={{ fontSize: 10, fill: '#9A9188' }}
            width={50}
          />
          <Tooltip
            formatter={fmtTT}
            contentStyle={{
              fontSize: 12, borderRadius: 4,
              border: '1px solid #E3DDD5', background: '#F9F7F4',
            }}
          />
          {showLegend && (
            <Legend
              formatter={key => {
                const idx = parseInt(key.slice(1), 10);
                return series[idx] ? series[idx].label : key;
              }}
              iconType="line"
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          )}
          {series.map((s, i) => {
            const color = resolveColor(s.color);
            return (
              <Line
                key={i}
                type="monotone"
                dataKey={'v' + i}
                name={'v' + i}
                stroke={color}
                strokeWidth={s.width || 2}
                strokeDasharray={s.dash || ''}
                dot={false}
                activeDot={{ r: 4, fill: color }}
                connectNulls
              />
            );
          })}
        </RC_LineChart>
      </ResponsiveContainer>
    );
  }

  /* ===========================================================
     HBAR — asset allocation
  =========================================================== */

  function HBar({ items, maxItems = 8 }) {
    // items: [{ label, pct (0-1), color }]
    if (!items || !items.length) return null;
    const displayed = items.slice(0, maxItems);
    const totalPct = displayed.reduce((s, i) => s + (i.pct || 0), 0);
    const other = 1 - totalPct;
    const rows = other > 0.01 ? [...displayed, { label: 'Outros', pct: other, color: 'var(--muted)' }] : displayed;

    const classColors = {
      'RF Pós-Fixado': 'var(--navy)',
      'RF Inflação':   '#2E6DA4',
      'CDB':           '#3A7DC0',
      'Multimercado':  '#6B5B95',
      'Ações':         '#C97A1F',
      'FII':           '#2A8A5B',
      'Previdência':   '#6B7280',
      'Internacional': '#B45309',
      'Liquidez':      'var(--rule-strong)',
      'Outros':        'var(--muted)',
    };

    return (
      <div>
        {rows.map(item => (
          <div className="hbar-row" key={item.label}>
            <div className="hbar-label" title={item.label}>{item.label}</div>
            <div className="hbar-track">
              <div
                className="hbar-fill"
                style={{
                  width: Math.round((item.pct || 0) * 100) + '%',
                  background: item.color || classColors[item.label] || 'var(--navy)',
                }}
              />
            </div>
            <div className="hbar-pct">{fmtPct(item.pct, 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  /* ===========================================================
     TOAST HOOK
  =========================================================== */

  function useToast() {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((msg, type = 'info') => {
      const id = Date.now() + Math.random();
      setToasts(t => [...t, { id, msg, type }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    }, []);
    return { toasts, addToast };
  }

  function ToastContainer({ toasts }) {
    return (
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
    );
  }

  /* ===========================================================
     UI PRIMITIVES
  =========================================================== */

  function Badge({ status }) {
    const map = {
      'LIBERAR':    ['badge badge--green', 'LIBERAR'],
      'COM ALERTA': ['badge badge--amber', 'COM ALERTA'],
      'CORRIGIR':   ['badge badge--red',   'CORRIGIR'],
      'ACIMA':      ['badge badge--green', 'ACIMA'],
      'PROX.':      ['badge badge--amber', 'PRÓX.'],
      'ABAIXO':     ['badge badge--red',   'ABAIXO'],
      'INFO':       ['badge badge--navy',  'INFO'],
    };
    const [cls, label] = map[status] || ['badge badge--muted', status || '—'];
    return <span className={cls}>{label}</span>;
  }

  function StatusDot({ status }) {
    const colors = { 'LIBERAR': 'var(--green)', 'COM ALERTA': 'var(--amber)', 'CORRIGIR': 'var(--red)' };
    return (
      <span style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: colors[status] || 'var(--muted)', marginRight: 6, verticalAlign: 'middle'
      }} />
    );
  }

  function SeverityBadge({ severity }) {
    const map = {
      'CORRIGIR':    'badge badge--red',
      'COM ALERTA':  'badge badge--amber',
      'INFO':        'badge badge--navy',
    };
    return <span className={map[severity] || 'badge badge--muted'}>{severity}</span>;
  }

  function Chip({ label, active, onClick, variant }) {
    const variantCls = active && variant ? ` active --${variant}` : active ? ' active' : '';
    return (
      <button className={`chip${variantCls}`} onClick={onClick} type="button">
        {label}
      </button>
    );
  }

  function KPITile({ label, value, sub, variant, onClick, minWidth }) {
    return (
      <div
        className={`kpi-tile${variant ? ' --' + variant : ''}`}
        onClick={onClick}
        style={minWidth ? { minWidth } : {}}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
      >
        <div className="kpi-label">{label}</div>
        <div className={`kpi-value${variant ? ' --' + variant : ''}`}>{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    );
  }

  function EmptyState({ title = 'Sem registros', sub = '', icon = 'search' }) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Icon name={icon} size={48} />
        </div>
        <div className="empty-state-title">{title}</div>
        {sub && <div className="empty-state-sub">{sub}</div>}
      </div>
    );
  }

  function Spinner() {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'32px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity=".2"/>
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
          </path>
        </svg>
      </div>
    );
  }

  // Tooltip wrapper simples via title nativo
  function Tooltip({ text, children }) {
    return <span title={text} style={{cursor:'help'}}>{children}</span>;
  }

  /* ===========================================================
     EXPORTS
  =========================================================== */

  window.AtlasUtils = {
    fmt, fmtBRL, fmtCompactBRL, fmtPct, fmtPctRaw, fmtMonthLabel,
    signClass, storage, navigate, useRouter, linePath,
  };

  window.AtlasIcons = { Icon };

  window.AtlasCharts = { LineChart, HBar, niceScale, linePath };

  window.AtlasUI = {
    Badge, StatusDot, SeverityBadge, Chip, KPITile,
    EmptyState, Spinner, Tooltip, ToastContainer, useToast,
  };

})();
