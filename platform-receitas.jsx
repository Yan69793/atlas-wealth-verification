/* platform-receitas.jsx — Receitas & ROA */
(() => {
  const { useState, useMemo, useEffect } = React;

  const { fmtCompactBRL, fmtPct, fmtMonthLabel, signClass, navigate } = window.AtlasUtils;
  const { Icon }          = window.AtlasIcons;
  const { LineChart }     = window.AtlasCharts;
  const { KPITile, SeverityBadge, EmptyState } = window.AtlasUI;
  const D = window.AtlasData;

  /* ============================================================
     HELPERS
  ============================================================ */
  const TABS = [
    { id: 'serie',   label: 'Série Mensal' },
    { id: 'gestor',  label: 'Por Gestor'   },
    { id: 'cliente', label: 'Por Cliente'  },
  ];

  const SEG_ORDER = ['Ultra', 'Large', 'Mid', 'Small', 'Micro'];

  function fmtRoa(v) { return (v * 100).toFixed(3) + '%'; }

  function BadgeVsMeta({ badge }) {
    if (badge === 'ACIMA') return (
      <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem' }}>
        ACIMA
      </span>
    );
    if (badge === 'PROX.') return (
      <span style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem' }}>
        PROX.
      </span>
    );
    return (
      <span style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem' }}>
        ABAIXO
      </span>
    );
  }

  /* ============================================================
     TAB: SÉRIE MENSAL
  ============================================================ */
  function TabSerie({ series, selectedMonth }) {
    const monthData = series.find(s => s.month === selectedMonth) || series[series.length - 1];

    // LineChart: ROA% por mês
    const chartSeries = [{
      label: 'ROA % a.m.',
      color: 'var(--navy)',
      width: 2,
      data: series.map(s => ({ month: s.month, value: s.roa })),
    }];

    // ROA alerts
    const alerts = useMemo(() => D.roaAlerts(selectedMonth), [selectedMonth]);

    // Audit
    const auditRows = useMemo(() => D.audit(selectedMonth), [selectedMonth]);
    const auditFail = auditRows.filter(r => !r.ok);

    return (
      <div>
        {/* Tabela da série */}
        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 100 }}>Período</th>
                <th className="num">AUM</th>
                <th className="num">NNM</th>
                <th className="num">ROA % a.m.</th>
                <th className="num">Clientes</th>
                <th className="num">Receita</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map(s => (
                <tr key={s.month} style={{ background: s.month === selectedMonth ? 'var(--paper-mid)' : undefined }}>
                  <td style={{ fontWeight: s.month === selectedMonth ? 600 : 400 }}>{s.label}</td>
                  <td className="num">{fmtCompactBRL(s.aum)}</td>
                  <td className={`num ${signClass(s.nnm)}`}>
                    {s.nnm >= 0 ? '+' : ''}{fmtCompactBRL(s.nnm)}
                  </td>
                  <td className="num">{fmtRoa(s.roa)}</td>
                  <td className="num">{s.clients}</td>
                  <td className="num">{fmtCompactBRL(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Gráfico ROA */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)', marginBottom: 12 }}>
            Evolução do ROA mensal
          </div>
          <LineChart series={chartSeries} height={180} />
          <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 8, textAlign: 'right' }}>
            ROA = Receita / AUM do mês
          </div>
        </div>

        {/* Alertas ROA */}
        {alerts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)', marginBottom: 10 }}>
              Alertas de ROA — {fmtMonthLabel(selectedMonth)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map((a, i) => {
                const isErr = a.severity === 'CORRIGIR';
                return (
                  <div key={i} style={{
                    padding: '10px 14px',
                    background: isErr ? 'var(--red-bg)' : 'var(--amber-bg)',
                    border: '1px solid ' + (isErr ? 'var(--red)' : 'var(--amber)'),
                    borderRadius: 'var(--r-sm)',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.786rem', color: isErr ? 'var(--red)' : 'var(--amber)', marginBottom: 2 }}>
                      {a.rule}
                    </div>
                    <div style={{ fontSize: '0.786rem', color: 'var(--body)' }}>{a.text}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Auditoria */}
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)', marginBottom: 10 }}>
            Auditoria de Fee — {fmtMonthLabel(selectedMonth)}
          </div>
          {auditFail.length === 0 ? (
            <div style={{
              padding: '12px 16px',
              background: 'var(--green-bg)',
              border: '1px solid var(--green)',
              borderRadius: 'var(--r-sm)',
              fontSize: '0.857rem', color: 'var(--green)', fontWeight: 600,
            }}>
              {auditRows.length} de {auditRows.length} carteiras com fee dentro da tolerância (0,01%).
            </div>
          ) : (
            <>
              <div style={{
                padding: '10px 14px', marginBottom: 12,
                background: 'var(--red-bg)', border: '1px solid var(--red)',
                borderRadius: 'var(--r-sm)',
                fontSize: '0.857rem', color: 'var(--red)', fontWeight: 600,
              }}>
                {auditFail.length} carteira(s) com divergência de fee acima de 0,01%.
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Carteira</th>
                      <th className="num">Fee contrat.</th>
                      <th className="num">PL</th>
                      <th className="num">Esperado</th>
                      <th className="num">Lançado</th>
                      <th className="num">Dif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditFail.map(r => (
                      <tr key={r.code} style={{ background: 'var(--red-bg)' }}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{r.code}</div>
                          <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{r.name}</div>
                        </td>
                        <td className="num">{fmtPct(r.fee, 3)}</td>
                        <td className="num">{fmtCompactBRL(r.pl)}</td>
                        <td className="num">{fmtCompactBRL(r.expected)}</td>
                        <td className="num">{fmtCompactBRL(r.revenue)}</td>
                        <td className={`num ${signClass(r.diff)}`}>
                          {r.diff >= 0 ? '+' : ''}{fmtCompactBRL(r.diff)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ============================================================
     TAB: POR GESTOR
  ============================================================ */
  function TabGestor({ selectedMonth }) {
    const {
      BarChart, Bar, XAxis, YAxis, CartesianGrid,
      Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
    } = window.Recharts;

    const ranking = useMemo(() => D.managerRanking(selectedMonth), [selectedMonth]);

    const totals = useMemo(() => ({
      aum:     ranking.reduce((s, r) => s + r.aum, 0),
      revenue: ranking.reduce((s, r) => s + r.revenue, 0),
      roa:     ranking.reduce((s, r) => s + r.aum, 0) > 0
        ? ranking.reduce((s, r) => s + r.revenue, 0) / ranking.reduce((s, r) => s + r.aum, 0)
        : 0,
    }), [ranking]);

    const chartData = ranking.map(r => ({
      name:      r.managerName.split(' ')[0],
      roa:       +(r.roa * 100).toFixed(4),
      meta:      +(r.roaTarget * 100).toFixed(4),
      atingPct:  +(r.attainment * 100).toFixed(1),
    }));

    const avgTarget = ranking.length
      ? ranking.reduce((s, r) => s + r.roaTarget, 0) / ranking.length * 100
      : 0;

    return (
      <div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 150 }}>Gestor</th>
                <th className="num">Carteiras</th>
                <th className="num">AUM</th>
                <th className="num">Receita</th>
                <th className="num">ROA % a.m.</th>
                <th className="num">Meta ROA</th>
                <th className="num">Atingimento</th>
                <th>vs Meta</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map(r => (
                <tr key={r.managerId}>
                  <td style={{ fontWeight: 600, fontSize: '0.857rem' }}>{r.managerName}</td>
                  <td className="num">{r.nCarteiras}</td>
                  <td className="num">{fmtCompactBRL(r.aum)}</td>
                  <td className="num">{fmtCompactBRL(r.revenue)}</td>
                  <td className="num">{fmtRoa(r.roa)}</td>
                  <td className="num" style={{ color: 'var(--muted)' }}>{fmtRoa(r.roaTarget)}</td>
                  <td className={`num ${r.attainment >= 1 ? 'pos' : r.attainment >= 0.85 ? '' : 'neg'}`}>
                    {fmtPct(r.attainment, 1)}
                  </td>
                  <td><BadgeVsMeta badge={r.badge} /></td>
                </tr>
              ))}
              {/* TOTAL */}
              <tr style={{ borderTop: '2px solid var(--rule-strong)', fontWeight: 700 }}>
                <td>TOTAL</td>
                <td className="num">{ranking.reduce((s, r) => s + r.nCarteiras, 0)}</td>
                <td className="num">{fmtCompactBRL(totals.aum)}</td>
                <td className="num">{fmtCompactBRL(totals.revenue)}</td>
                <td className="num">{fmtRoa(totals.roa)}</td>
                <td className="num" style={{ color: 'var(--muted)' }}>—</td>
                <td className="num">—</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ROA vs Meta por gestor */}
        {chartData.length > 0 && (
          <div className="chart-wrap" style={{ marginTop: 24 }}>
            <div className="card-header">
              <div className="card-title">ROA Realizado vs Meta — por Gestor</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9A9188' }} />
                <YAxis
                  tickFormatter={v => v.toFixed(3) + '%'}
                  tick={{ fontSize: 10, fill: '#9A9188' }}
                  width={58}
                />
                <Tooltip
                  formatter={(v, name) => [v.toFixed(4) + '%', name === 'roa' ? 'ROA Realizado' : 'Meta ROA']}
                  contentStyle={{
                    fontSize: 12, borderRadius: 4,
                    border: '1px solid #E3DDD5', background: '#F9F7F4',
                  }}
                />
                <Legend
                  formatter={k => k === 'roa' ? 'ROA Realizado' : 'Meta ROA'}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
                <ReferenceLine y={avgTarget} stroke="#C4A228" strokeDasharray="4 2" strokeWidth={1.5} />
                <Bar dataKey="roa" name="roa" radius={[3, 3, 0, 0]} maxBarSize={36}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.roa >= entry.meta ? '#15803D' : '#B91C1C'} />
                  ))}
                </Bar>
                <Bar dataKey="meta" name="meta" fill="#9A9188" opacity={0.35} radius={[3, 3, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>
              Linha tracejada = meta média ponderada · Verde = acima da meta · Vermelho = abaixo da meta
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ============================================================
     TAB: POR CLIENTE
  ============================================================ */
  function TabCliente({ selectedMonth }) {
    const [managerId, setManagerId]   = useState('');
    const [segment,   setSegment]     = useState('');
    const [status,    setStatus]      = useState('');
    const [query,     setQuery]       = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
      const t = setTimeout(() => setDebouncedQuery(query), 200);
      return () => clearTimeout(t);
    }, [query]);

    const allRows = useMemo(() => D.clientRevenueRows(selectedMonth, {
      managerId: managerId || undefined,
      segment:   segment   || undefined,
      status:    status    || undefined,
      query:     debouncedQuery || undefined,
    }), [selectedMonth, managerId, segment, debouncedQuery, status]);

    const summary = useMemo(() => ({
      count:   allRows.length,
      aum:     allRows.reduce((s, r) => s + r.pl, 0),
      revenue: allRows.reduce((s, r) => s + r.revenue, 0),
    }), [allRows]);

    const segmentation = useMemo(() => D.sizeSegmentation(selectedMonth), [selectedMonth]);
    const concData     = useMemo(() => D.concentration(selectedMonth),    [selectedMonth]);

    const totalPl = concData.totalPl || 1;

    return (
      <div>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Gestor</label>
            <select className="filter-select" value={managerId} onChange={e => setManagerId(e.target.value)}>
              <option value="">Todos</option>
              {D.MANAGERS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Segmento</label>
            <select className="filter-select" value={segment} onChange={e => setSegment(e.target.value)}>
              <option value="">Todos</option>
              {SEG_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Status</label>
            <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="LIBERAR">Liberar</option>
              <option value="COM ALERTA">Com Alerta</option>
              <option value="CORRIGIR">Corrigir</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Busca</label>
            <input
              type="search"
              className="filter-select"
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="Código ou nome..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Summary bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 24, padding: '10px 16px',
          background: 'var(--paper-mid)', borderRadius: 'var(--r-sm)',
          border: '1px solid var(--rule)', marginBottom: 16,
          fontSize: '0.786rem',
        }}>
          <span><strong>{summary.count}</strong> carteiras</span>
          <span>AUM: <strong>{fmtCompactBRL(summary.aum)}</strong></span>
          <span>Receita mês: <strong>{fmtCompactBRL(summary.revenue)}</strong></span>
        </div>

        {/* Tabela clientes */}
        {allRows.length === 0 ? (
          <EmptyState title="Nenhuma carteira" sub="Ajuste os filtros para ver resultados." icon="search" />
        ) : (
          <div className="table-wrap" style={{ marginBottom: 32 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 150 }}>Carteira</th>
                  <th>Gestor</th>
                  <th>Segmento</th>
                  <th className="num">AUM</th>
                  <th className="num">NNM YTD</th>
                  <th className="num">ROA % a.m.</th>
                  <th className="num">Receita YTD</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allRows.map(r => {
                  const statusStyle = {
                    LIBERAR:      { color: 'var(--green)',  bg: 'var(--green-bg)',  bd: 'var(--green)'  },
                    'COM ALERTA': { color: 'var(--amber)',  bg: 'var(--amber-bg)',  bd: 'var(--amber)'  },
                    CORRIGIR:     { color: 'var(--red)',    bg: 'var(--red-bg)',    bd: 'var(--red)'    },
                  }[r.status] || { color: 'var(--muted)', bg: 'transparent', bd: 'var(--rule)' };
                  return (
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
                      <td>
                        <span style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{r.segment}</span>
                      </td>
                      <td className="num">{fmtCompactBRL(r.pl)}</td>
                      <td className={`num ${signClass(r.nnmYTD)}`}>
                        {r.nnmYTD >= 0 ? '+' : ''}{fmtCompactBRL(r.nnmYTD)}
                      </td>
                      <td className="num">{fmtRoa(r.roa)}</td>
                      <td className="num">{fmtCompactBRL(r.revenueYTD)}</td>
                      <td>
                        <span style={{
                          background: statusStyle.bg, color: statusStyle.color,
                          border: '1px solid ' + statusStyle.bd,
                          borderRadius: 'var(--r-sm)', padding: '2px 8px',
                          fontSize: '0.643rem', fontWeight: 600, letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                        }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Segmentação + Concentração side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Segmentação por porte */}
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)', marginBottom: 12 }}>
              Segmentação por porte
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: '0.714rem', color: 'var(--muted)', padding: '4px 0', fontWeight: 600 }}>Segmento</th>
                  <th style={{ textAlign: 'right', fontSize: '0.714rem', color: 'var(--muted)', padding: '4px 0', fontWeight: 600 }}>Carteiras</th>
                  <th style={{ textAlign: 'right', fontSize: '0.714rem', color: 'var(--muted)', padding: '4px 0', fontWeight: 600 }}>AUM</th>
                </tr>
              </thead>
              <tbody>
                {segmentation.map(s => (
                  <tr key={s.segment}>
                    <td style={{ padding: '5px 0', fontSize: '0.857rem' }}>{s.segment}</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.857rem' }}>{s.count}</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.857rem' }}>{fmtCompactBRL(s.totalPl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Concentração top 10 */}
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)', marginBottom: 4 }}>
              Concentração — Top 10
            </div>
            <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginBottom: 12 }}>
              Top 5 = {fmtPct(concData.top5.reduce((s, r) => s + r.pct, 0), 1)} do PL total
            </div>
            {concData.top10.map((r, i) => (
              <div key={r.code} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: '0.786rem' }}>
                  <span style={{ color: i < 5 ? 'var(--heading)' : 'var(--muted)', fontWeight: i < 5 ? 600 : 400 }}>
                    {r.code}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.714rem', color: 'var(--body)' }}>
                    {fmtPct(r.pct, 1)}
                  </span>
                </div>
                <div style={{
                  height: 4, background: 'var(--rule)',
                  borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: fmtPct(Math.min(r.pct / 0.15, 1), 0).replace('%', '') + '%',
                    background: i < 5 ? 'var(--navy)' : 'var(--rule-strong)',
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     RECEITAS — componente principal
  ============================================================ */
  function Receitas() {
    const { useMonth } = window.AtlasContexts;
    const { selectedMonth } = useMonth();
    const [tab, setTab] = useState('serie');

    const series  = useMemo(() => D.revenueSeries(), []);
    const yearPfx = selectedMonth.slice(0, 4);
    const monthData = series.find(s => s.month === selectedMonth) || series[series.length - 1];

    const ytd = useMemo(() => series.filter(s =>
      s.month <= selectedMonth && s.month.startsWith(yearPfx)
    ).reduce((acc, s) => ({
      revenue: acc.revenue + s.revenue,
      nnm:     acc.nnm     + s.nnm,
    }), { revenue: 0, nnm: 0 }), [series, selectedMonth, yearPfx]);

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Gestão de Receita</div>
          <h1 className="page-title">Receitas & ROA</h1>
          <div className="page-subtitle">
            {fmtMonthLabel(selectedMonth)} &middot; {D.CATALOG.length} carteiras analisadas
          </div>
        </div>

        {/* KPI strip (6 tiles) */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 24 }}>
          <KPITile
            label="AUM · Clientes"
            value={fmtCompactBRL(monthData.aum)}
            sub={monthData.clients + ' carteiras'}
          />
          <KPITile
            label="Receita mês"
            value={fmtCompactBRL(monthData.revenue)}
            sub={fmtMonthLabel(selectedMonth)}
          />
          <KPITile
            label="Receita acum."
            value={fmtCompactBRL(ytd.revenue)}
            sub={'YTD ' + yearPfx}
          />
          <KPITile
            label="ROA médio pond."
            value={fmtRoa(monthData.roa)}
            sub="Receita / AUM"
          />
          <KPITile
            label="NNM acum."
            value={(ytd.nnm >= 0 ? '+' : '') + fmtCompactBRL(ytd.nnm)}
            sub={'YTD ' + yearPfx}
            variant={ytd.nnm >= 0 ? 'green' : 'red'}
          />
          <KPITile
            label="CDI mês"
            value={fmtPct(D.CDI[selectedMonth] || 0, 3)}
            sub="Benchmark referência"
          />
        </div>

        {/* Tabs */}
        <div className="tabs" role="tablist" aria-label="Categorias de receita">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={'tab-btn' + (tab === t.id ? ' active' : '')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {tab === 'serie'   && <TabSerie   series={series} selectedMonth={selectedMonth} />}
          {tab === 'gestor'  && <TabGestor  selectedMonth={selectedMonth} />}
          {tab === 'cliente' && <TabCliente selectedMonth={selectedMonth} />}
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Receitas = Receitas;

})();
