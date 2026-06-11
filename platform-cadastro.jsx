/* platform-cadastro.jsx — Cadastro & Compliance */
(() => {
  const { useState, useMemo } = React;
  const { fmtMonthLabel } = window.AtlasUtils;
  const { EmptyState }    = window.AtlasUI;
  const D = window.AtlasData;

  const STATUS_STYLE = {
    Pendente:           { bg: 'var(--red-bg)',    fg: 'var(--red)',    bd: 'var(--red)'    },
    'Em Análise':       { bg: 'var(--amber-bg)',  fg: 'var(--amber)',  bd: 'var(--amber)'  },
    'Aguardando Cliente':{ bg: 'var(--amber-bg)', fg: 'var(--amber)',  bd: 'var(--amber)'  },
    Vencido:            { bg: 'var(--red-bg)',    fg: 'var(--red)',    bd: 'var(--red)'    },
  };

  function StatusPill({ status }) {
    const s = STATUS_STYLE[status] || { bg: 'var(--paper-mid)', fg: 'var(--muted)', bd: 'var(--rule)' };
    return (
      <span style={{
        background: s.bg, color: s.fg, border: '1px solid ' + s.bd,
        borderRadius: 'var(--r-sm)', padding: '2px 8px',
        fontSize: '0.643rem', fontWeight: 600, whiteSpace: 'nowrap',
      }}>
        {status}
      </span>
    );
  }

  function Cadastro() {
    const allRows = useMemo(() => D.registration(), []);

    const [typeFilter,   setTypeFilter]   = useState('');
    const [segFilter,    setSegFilter]    = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filtered = useMemo(() => {
      return allRows.filter(r =>
        (!typeFilter   || r.type    === typeFilter)   &&
        (!segFilter    || r.segment === segFilter)    &&
        (!statusFilter || r.status  === statusFilter)
      );
    }, [allRows, typeFilter, segFilter, statusFilter]);

    // Contadores por status
    const counters = useMemo(() => {
      const c = { Pendente: 0, 'Em Análise': 0, 'Aguardando Cliente': 0, Vencido: 0 };
      allRows.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
      return c;
    }, [allRows]);

    const allTypes    = useMemo(() => [...new Set(allRows.map(r => r.type))].sort(), [allRows]);
    const allSegments = ['Ultra', 'Large', 'Mid', 'Small'];
    const allStatuses = ['Pendente', 'Em Análise', 'Aguardando Cliente', 'Vencido'];

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Compliance</div>
          <h1 className="page-title">Cadastro & Compliance</h1>
          <div className="page-subtitle">
            {allRows.length} pendências cadastrais em aberto
          </div>
        </div>

        {/* Contadores por status */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          {allStatuses.map(s => {
            const isRed = s === 'Pendente' || s === 'Vencido';
            return (
              <div
                key={s}
                className="card"
                style={{
                  padding: '14px 16px', cursor: 'pointer',
                  background: statusFilter === s ? (isRed ? 'var(--red-bg)' : 'var(--amber-bg)') : undefined,
                  border: statusFilter === s ? ('1px solid ' + (isRed ? 'var(--red)' : 'var(--amber)')) : undefined,
                }}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              >
                <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginBottom: 4 }}>{s}</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.5rem',
                  color: isRed ? 'var(--red)' : 'var(--amber)',
                }}>
                  {counters[s]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Tipo</label>
            <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">Todos</option>
              {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Segmento</label>
            <select className="filter-select" value={segFilter} onChange={e => setSegFilter(e.target.value)}>
              <option value="">Todos</option>
              {allSegments.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Status</label>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {(typeFilter || segFilter || statusFilter) && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn--ghost"
                onClick={() => { setTypeFilter(''); setSegFilter(''); setStatusFilter(''); }}
                style={{ fontSize: '0.786rem', padding: '6px 12px' }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Tabela */}
        {filtered.length === 0 ? (
          <EmptyState
            title="Nenhuma pendência encontrada"
            sub="Ajuste os filtros ou selecione outro status."
            icon="check"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 150 }}>Carteira</th>
                  <th>Segmento</th>
                  <th>Tipo de Pendência</th>
                  <th>Status</th>
                  <th>Desde</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.code + '|' + i}>
                    <td style={{ minWidth: 150 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{r.code}</div>
                      <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{r.name}</div>
                    </td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{r.segment}</td>
                    <td style={{ fontSize: '0.857rem' }}>{r.type}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {r.since}
                    </td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
                      {r.obs || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Cadastro = Cadastro;
})();
