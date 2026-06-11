/* platform-comparativo.jsx — Comparativo de Período */
(() => {
  const { useState, useMemo, useEffect } = React;

  const { fmtCompactBRL, fmtPct, fmtMonthLabel, signClass, navigate } = window.AtlasUtils;
  const { Icon }                                                        = window.AtlasIcons;
  const { KPITile, EmptyState }                                         = window.AtlasUI;
  const D = window.AtlasData;

  /* ============================================================
     STATUS BADGE — inline para evitar conflito com SeverityBadge
  ============================================================ */
  const STATUS_STYLE = {
    LIBERAR:      { bg: 'var(--green-bg)',  fg: 'var(--green)',  bd: 'var(--green)'  },
    'COM ALERTA': { bg: 'var(--amber-bg)',  fg: 'var(--amber)',  bd: 'var(--amber)'  },
    CORRIGIR:     { bg: 'var(--red-bg)',    fg: 'var(--red)',    bd: 'var(--red)'    },
  };

  function StatusBadge({ status }) {
    const s = STATUS_STYLE[status] || { bg: 'transparent', fg: 'var(--muted)', bd: 'var(--rule)' };
    return (
      <span style={{
        background: s.bg, color: s.fg, border: '1px solid ' + s.bd,
        borderRadius: 'var(--r-sm)', padding: '2px 8px',
        fontSize: '0.643rem', fontWeight: 600, letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}>
        {status}
      </span>
    );
  }

  /* ============================================================
     TOP MOVERS CARD
  ============================================================ */
  function TopMovers({ title, rows, labelA, labelB }) {
    return (
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)', marginBottom: 12 }}>
          {title}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 120 }}>Carteira</th>
                <th className="num">{labelA}</th>
                <th className="num">{labelB}</th>
                <th className="num">Var. PL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr
                  key={r.code}
                  className="clickable"
                  onClick={() => navigate('#/carteira/' + r.code)}
                >
                  <td style={{ minWidth: 120 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{r.code}</div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{r.name}</div>
                  </td>
                  <td className="num">{fmtCompactBRL(r.plA)}</td>
                  <td className="num">{fmtCompactBRL(r.plB)}</td>
                  <td className={`num ${signClass(r.delta)}`}>
                    {r.delta >= 0 ? '+' : ''}{fmtCompactBRL(r.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ============================================================
     MOVERS BAR CHART
  ============================================================ */
  function MoversChart({ comp, labelA, labelB }) {
    const {
      BarChart, Bar, XAxis, YAxis, CartesianGrid,
      Tooltip, ReferenceLine, ResponsiveContainer, Cell,
    } = window.Recharts;

    const combined = [
      ...comp.top5Altas,
      ...comp.top5Quedas,
    ].sort((a, b) => b.delta - a.delta);

    if (!combined.length) return null;

    const data = combined.map(r => ({
      code: r.code,
      delta: r.delta,
    }));

    const fmtV = v => {
      const abs = Math.abs(v);
      if (abs >= 1e6) return (v >= 0 ? '+' : '-') + 'R$ ' + (abs / 1e6).toFixed(1) + 'mi';
      if (abs >= 1e3) return (v >= 0 ? '+' : '-') + 'R$ ' + (abs / 1e3).toFixed(0) + 'k';
      return (v >= 0 ? '+' : '') + 'R$ ' + abs.toFixed(0);
    };

    return (
      <div className="chart-wrap" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Top Movers — Variação de PL ({labelA} vs {labelB})</div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD5" vertical={false} />
            <XAxis dataKey="code" tick={{ fontSize: 10, fill: '#9A9188' }} />
            <YAxis
              tickFormatter={fmtV}
              tick={{ fontSize: 10, fill: '#9A9188' }}
              width={64}
            />
            <Tooltip
              formatter={v => [fmtCompactBRL(v), 'Var. PL']}
              contentStyle={{
                fontSize: 12, borderRadius: 4,
                border: '1px solid #E3DDD5', background: '#F9F7F4',
              }}
            />
            <ReferenceLine y={0} stroke="#9A9188" strokeWidth={1} />
            <Bar dataKey="delta" radius={[3, 3, 0, 0]} maxBarSize={40}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.delta >= 0 ? '#15803D' : '#B91C1C'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* ============================================================
     COMPARATIVO — componente principal
  ============================================================ */
  function Comparativo() {
    const { useMonth, useToast } = window.AtlasContexts;
    const { selectedMonth }      = useMonth();
    const { addToast }           = useToast();

    function getPrevMonth(month) {
      const idx = D.MONTHS.indexOf(month);
      return idx > 0 ? D.MONTHS[idx - 1] : D.MONTHS[0];
    }

    const [refMonth,      setRefMonth]      = useState(selectedMonth);
    const [baselineMonth, setBaselineMonth] = useState(getPrevMonth(selectedMonth));

    useEffect(() => {
      setRefMonth(selectedMonth);
      setBaselineMonth(getPrevMonth(selectedMonth));
    }, [selectedMonth]);

    const comp = useMemo(() => D.comparative(refMonth, baselineMonth), [refMonth, baselineMonth]);

    const statusCounts = useMemo(() => {
      const a = { LIBERAR: 0, 'COM ALERTA': 0, CORRIGIR: 0 };
      const b = { LIBERAR: 0, 'COM ALERTA': 0, CORRIGIR: 0 };
      comp.rows.forEach(r => {
        if (a[r.statusA] !== undefined) a[r.statusA]++;
        if (b[r.statusB] !== undefined) b[r.statusB]++;
      });
      return { a, b };
    }, [comp]);

    const plDelta = comp.plTotalA - comp.plTotalB;

    function handleExport(tipo) {
      addToast('Exportação ' + tipo + ' disponível na versão completa.', 'info');
    }

    const labelA = fmtMonthLabel(refMonth);
    const labelB = fmtMonthLabel(baselineMonth);

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Análise Comparativa</div>
          <h1 className="page-title">Comparativo de Período</h1>
          <div className="page-subtitle">
            {labelA} vs {labelB} &middot; {comp.rows.length} carteiras
          </div>
        </div>

        {/* Seletores de mês */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Mês de referência
            </label>
            <select
              className="filter-select"
              value={refMonth}
              onChange={e => setRefMonth(e.target.value)}
            >
              {D.MONTHS.map(m => (
                <option key={m} value={m}>{fmtMonthLabel(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Mês baseline
            </label>
            <select
              className="filter-select"
              value={baselineMonth}
              onChange={e => setBaselineMonth(e.target.value)}
            >
              {D.MONTHS.map(m => (
                <option key={m} value={m}>{fmtMonthLabel(m)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 painéis de KPI */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          <KPITile
            label={'PL ' + labelA}
            value={fmtCompactBRL(comp.plTotalA)}
            sub="Total das carteiras (ref.)"
          />
          <KPITile
            label={'PL ' + labelB}
            value={fmtCompactBRL(comp.plTotalB)}
            sub={(plDelta >= 0 ? '+' : '') + fmtCompactBRL(plDelta) + ' vs baseline'}
            variant={plDelta >= 0 ? 'green' : 'red'}
          />

          {/* Painel 3: contadores de rentabilidade do mês ref. */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginBottom: 10 }}>
              Rent. {labelA}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              {[
                { label: 'Altas',    val: comp.rentCounterA.pos,  color: 'var(--green)' },
                { label: 'Estáveis', val: comp.rentCounterA.zero, color: 'var(--muted)' },
                { label: 'Quedas',   val: comp.rentCounterA.neg,  color: 'var(--red)'   },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.2rem',
                    color: item.color, tabularNums: true,
                  }}>
                    {item.val}
                  </div>
                  <div style={{ fontSize: '0.643rem', color: 'var(--muted)', marginTop: 2 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Painel 4: contagens de status ref vs baseline */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginBottom: 10 }}>
              Status — ref. vs baseline
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { key: 'LIBERAR',      label: 'LIBERAR' },
                { key: 'COM ALERTA',   label: 'ALERTA'  },
                { key: 'CORRIGIR',     label: 'CORRIGIR'},
              ].map(s => (
                <div key={s.key} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.571rem', color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.857rem',
                    color: 'var(--heading)',
                  }}>
                    {statusCounts.a[s.key]} / {statusCounts.b[s.key]}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.571rem', color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
              ref. / baseline
            </div>
          </div>
        </div>

        <MoversChart comp={comp} labelA={labelA} labelB={labelB} />

        {/* Top movers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <TopMovers title="Top 5 — Maior crescimento de PL" rows={comp.top5Altas} labelA={labelA} labelB={labelB} />
          <TopMovers title="Top 5 — Maior queda de PL"       rows={comp.top5Quedas} labelA={labelA} labelB={labelB} />
        </div>

        {/* Tabela completa */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)' }}>
            Todas as carteiras ({comp.rows.length})
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--ghost" onClick={() => handleExport('Excel')}
              style={{ fontSize: '0.786rem', padding: '6px 14px' }}>
              Exportar Excel
            </button>
            <button className="btn btn--ghost" onClick={() => handleExport('PDF')}
              style={{ fontSize: '0.786rem', padding: '6px 14px' }}>
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 150 }}>Carteira</th>
                <th>Gestor</th>
                <th className="num">PL {labelA}</th>
                <th className="num">PL {labelB}</th>
                <th className="num">Var. PL</th>
                <th className="num">Var. %</th>
                <th className="num">Rent. {labelA}</th>
                <th className="num">Rent. {labelB}</th>
                <th>Status (ref.)</th>
                <th className="num">Achados</th>
              </tr>
            </thead>
            <tbody>
              {comp.rows.map(r => (
                <tr
                  key={r.code}
                  className="clickable"
                  onClick={() => navigate('#/carteira/' + r.code)}
                >
                  <td style={{ minWidth: 150 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{r.code}</div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{r.name}</div>
                  </td>
                  <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{r.manager}</td>
                  <td className="num">{fmtCompactBRL(r.plA)}</td>
                  <td className="num">{fmtCompactBRL(r.plB)}</td>
                  <td className={`num ${signClass(r.delta)}`}>
                    {r.delta >= 0 ? '+' : ''}{fmtCompactBRL(r.delta)}
                  </td>
                  <td className={`num ${signClass(r.deltaPct)}`}>
                    {r.deltaPct >= 0 ? '+' : ''}{fmtPct(r.deltaPct, 2)}
                  </td>
                  <td className={`num ${signClass(r.rentA)}`}>{fmtPct(r.rentA, 2)}</td>
                  <td className={`num ${signClass(r.rentB)}`}>{fmtPct(r.rentB, 2)}</td>
                  <td><StatusBadge status={r.statusA} /></td>
                  <td className="num" style={{ color: r.nAchadosA > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                    {r.nAchadosA > 0 ? r.nAchadosA : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Comparativo = Comparativo;

})();
