/* platform-carteira.jsx — Detalhe de carteira: KPIs, tabs, observação, exportar */
(() => {
  const { useState, useMemo, useEffect } = React;

  // Safe IIFE-level destructuring (carregam antes das páginas)
  const { fmtCompactBRL, fmtPct, fmtMonthLabel, signClass, navigate, storage } = window.AtlasUtils;
  const { Icon }            = window.AtlasIcons;
  const { Badge, SeverityBadge, KPITile, EmptyState } = window.AtlasUI;
  const { LineChart } = window.AtlasCharts;
  const D = window.AtlasData;

  const OBS_DEFAULT = 'Conciliação aprovada sem ressalvas.';

  /* ============================================================
     TAB — COMPOSIÇÃO
  ============================================================ */
  function TabComposicao({ code, month, row }) {
    const comp = useMemo(() => D.getComposition(code, month), [code, month]);

    if (!comp || !comp.length || !row || row.plCurr <= 0) {
      return <EmptyState title="Sem composição" sub="Carteira sem posições neste mês." icon="search" />;
    }

    // Aggregate by class for HBar
    const clsMap = {};
    comp.forEach(a => { clsMap[a.cls] = (clsMap[a.cls] || 0) + a.pct; });
    const hbarItems = Object.entries(clsMap)
      .map(([label, pct]) => ({ label, pct }))
      .sort((a, b) => b.pct - a.pct);

    const hasVencto = comp.some(a => a.vencto);

    const {
      PieChart, Pie, Cell,
      Tooltip: PTooltip, ResponsiveContainer: PResponsive,
    } = window.Recharts;
    const ALLOC_COLORS = ['#05305F','#C4A228','#2B6CB0','#276749','#9A9188','#553C9A','#C05621','#D97706'];
    const pieData = hbarItems.map(item => ({ name: item.label, value: +((item.pct * 100).toFixed(2)) }));

    return (
      <div>
        <div className="card" style={{ marginBottom: 20, padding: '16px' }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Asset Allocation</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 220, height: 220, flexShrink: 0 }}>
              <PResponsive width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={62} outerRadius={98}
                    paddingAngle={2} dataKey="value"
                    startAngle={90} endAngle={-270}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />
                    ))}
                  </Pie>
                  <PTooltip
                    formatter={v => [v.toFixed(1) + '%', '']}
                    contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #E3DDD5', background: '#F9F7F4' }}
                  />
                </PieChart>
              </PResponsive>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              {hbarItems.map((item, i) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: ALLOC_COLORS[i % ALLOC_COLORS.length], flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: '0.857rem', color: 'var(--body)' }}>{item.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.857rem', fontWeight: 600 }}>
                    {(item.pct * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Ativo</th>
                <th>Classe</th>
                <th className="num">Part. %</th>
                <th className="num">Saldo Final</th>
                <th className="num">Var. R$</th>
                <th className="num">Rent. Ativo</th>
                <th className="num">Contrib.</th>
                <th>Custodiante</th>
                {hasVencto && <th>Vencimento</th>}
              </tr>
            </thead>
            <tbody>
              {comp.map((a, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.857rem' }}>{a.name}</div>
                  </td>
                  <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{a.cls}</td>
                  <td className="num">{fmtPct(a.pct, 1)}</td>
                  <td className="num">{fmtCompactBRL(a.saldoFinal)}</td>
                  <td className={`num ${signClass(a.varBRL)}`}>
                    {a.varBRL >= 0 ? '+' : ''}{fmtCompactBRL(a.varBRL)}
                  </td>
                  <td className={`num ${signClass(a.retAtivo)}`}>
                    {a.retAtivo > 0 ? '+' : ''}{fmtPct(a.retAtivo, 2)}
                  </td>
                  <td className={`num ${signClass(a.contrib)}`}>
                    {a.contrib > 0 ? '+' : ''}{fmtPct(a.contrib, 3)}
                  </td>
                  <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{a.institution || '—'}</td>
                  {hasVencto && <td style={{ fontSize: '0.786rem' }}>{a.vencto || '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ============================================================
     TAB — ACHADOS
  ============================================================ */
  function TabAchados({ row }) {
    if (!row || !row.findings || !row.findings.length) {
      return <EmptyState title="Nenhum achado" sub="Carteira sem ressalvas neste período." icon="check" />;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {row.findings.map((f, i) => (
          <div key={i} style={{
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--r-md)',
            padding: '12px 16px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}>
            <div style={{ flexShrink: 0, paddingTop: 2 }}>
              <SeverityBadge severity={f.severity} />
            </div>
            <p style={{ margin: 0, fontSize: '0.857rem', lineHeight: 1.6 }}>{f.text}</p>
          </div>
        ))}
      </div>
    );
  }

  /* ============================================================
     TAB — HISTÓRICO
  ============================================================ */
  function TabHistorico({ code, month }) {
    const p = useMemo(() => D.CATALOG.find(x => x.code === code), [code]);
    const inception = p ? (p.inception || D.MONTHS[0]) : D.MONTHS[0];

    const history = useMemo(() => {
      const months = D.MONTHS.filter(m => m >= inception && m <= month);
      return months.map(m => {
        const r = D.getRow(code, m);
        if (!r) return null;
        return {
          month: m,
          label: D.MONTH_LABELS[D.MONTHS.indexOf(m)] || m,
          plCurr: r.plCurr,
          plPrev: r.plPrev,
          rent: r.rent,
          cdi: r.cdi,
          varBRL: r.varBRL,
        };
      }).filter(Boolean);
    }, [code, month]);

    if (!history.length) {
      return <EmptyState title="Sem histórico" sub="Nenhum dado disponível para este período." icon="search" />;
    }

    const twr    = history.reduce((acc, r) => acc * (1 + r.rent), 1) - 1;
    const cdiAcc = history.reduce((acc, r) => acc * (1 + r.cdi),  1) - 1;
    const plFirst   = history[0].plPrev;
    const plLast    = history[history.length - 1].plCurr;
    const varPatrimonial = plFirst > 0 ? (plLast - plFirst) / plFirst : 0;

    // Accumulated series for chart
    let twrRun = 1, cdiRun = 1;
    const twrData = [], cdiData = [];
    history.forEach(r => {
      twrRun *= (1 + r.rent);
      cdiRun *= (1 + r.cdi);
      twrData.push({ month: r.month, value: twrRun - 1 });
      cdiData.push({ month: r.month, value: cdiRun - 1 });
    });

    const chartSeries = [
      { label: 'Retorno Acum.', color: 'var(--navy)',  width: 2,   data: twrData },
      { label: 'CDI Acum.',     color: 'var(--muted)', dash: '4 2', width: 1.5, data: cdiData },
    ];

    return (
      <div>
        {/* Summary */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
          <KPITile label="TWR Período"      value={fmtPct(twr, 2)}              sub={`desde ${fmtMonthLabel(inception)}`} />
          <KPITile label="CDI Período"      value={fmtPct(cdiAcc, 2)}           sub="Acumulado" />
          <KPITile label="vs CDI"           value={(twr - cdiAcc >= 0 ? '+' : '') + fmtPct(twr - cdiAcc, 2)}
            sub="TWR – CDI" variant={twr < cdiAcc ? 'amber' : undefined} />
          <KPITile label="Var. Patrimonial" value={fmtPct(varPatrimonial, 2)} sub="PL final / PL inicial - 1" />
        </div>

        {/* Chart */}
        <div className="chart-wrap" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">Retorno Acumulado vs CDI</div>
          </div>
          <LineChart series={chartSeries} height={200} />
        </div>

        {/* Monthly table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th className="num">PL Ant.</th>
                <th className="num">PL Atual</th>
                <th className="num">Rent.</th>
                <th className="num">CDI</th>
                <th className="num">vs CDI</th>
                <th className="num">Aporte/Resg. Est.</th>
              </tr>
            </thead>
            <tbody>
              {history.map(r => {
                const apResg = r.plCurr - r.plPrev - r.plPrev * r.rent;
                return (
                  <tr key={r.month}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.857rem' }}>{r.label}</td>
                    <td className="num">{fmtCompactBRL(r.plPrev)}</td>
                    <td className="num">{fmtCompactBRL(r.plCurr)}</td>
                    <td className={`num ${signClass(r.rent)}`}>{fmtPct(r.rent, 2)}</td>
                    <td className="num">{fmtPct(r.cdi, 3)}</td>
                    <td className={`num ${signClass(r.rent - r.cdi)}`}>{fmtPct(r.rent - r.cdi, 2)}</td>
                    <td className="num" style={{ color: 'var(--muted)' }}>
                      {Math.abs(apResg) < 1000 ? '—' : fmtCompactBRL(apResg)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ============================================================
     TAB — RECEITA
  ============================================================ */
  function TabReceita({ code, month }) {
    const p = D.CATALOG.find(x => x.code === code);
    const inception = p ? (p.inception || D.MONTHS[0]) : D.MONTHS[0];

    const mgr = useMemo(() => D.MANAGERS.find(m => m.codes.includes(code)), [code]);
    const roaTarget = mgr ? mgr.roaTarget : 0;

    const series = useMemo(() => {
      return D.MONTHS
        .filter(m => m >= inception && m <= month)
        .map(m => {
          const row = D.getRow(code, m);
          if (!row) return null;
          const roa = row.plCurr > 0 ? row.revenue / row.plCurr : 0;
          return {
            month: m,
            label: D.MONTH_LABELS[D.MONTHS.indexOf(m)] || m,
            revenue: row.revenue,
            pl: row.plCurr,
            fee: row.fee,
            roa,
          };
        }).filter(Boolean);
    }, [code, month]);

    if (!series.length) {
      return <EmptyState title="Sem dados de receita" sub="Nenhum dado disponível para este período." icon="search" />;
    }

    const totalRevYTD = series
      .filter(s => s.month.startsWith(month.slice(0, 4)))
      .reduce((acc, s) => acc + s.revenue, 0);

    const chartSeries = [
      { label: 'ROA Mês', color: 'var(--navy)',  width: 2,   data: series.map(s => ({ month: s.month, value: s.roa })) },
      { label: 'Meta',    color: 'var(--amber)', dash: '4 2', width: 1.5, data: series.map(s => ({ month: s.month, value: roaTarget })) },
    ];

    return (
      <div>
        {/* ROA Chart */}
        <div className="chart-wrap" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">ROA Mensal vs Meta</div>
          </div>
          <LineChart series={chartSeries} height={180} />
          <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 8, textAlign: 'right' }}>
            Meta ROA: {fmtPct(roaTarget, 4)} a.m. · Gestor: {mgr ? mgr.name : '—'}
          </div>
        </div>

        {/* Monthly table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th className="num">PL (R$)</th>
                <th className="num">Receita</th>
                <th className="num">Fee Efetivo</th>
                <th className="num">ROA Mês</th>
                <th className="num">Meta ROA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {series.map(s => {
                const badge    = s.roa >= roaTarget ? 'ACIMA' : s.roa >= roaTarget * 0.85 ? 'PROX.' : 'ABAIXO';
                const badgeCls = badge === 'ACIMA' ? 'badge badge--green' : badge === 'PROX.' ? 'badge badge--amber' : 'badge badge--red';
                return (
                  <tr key={s.month}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.857rem' }}>{s.label}</td>
                    <td className="num">{fmtCompactBRL(s.pl)}</td>
                    <td className="num">{fmtCompactBRL(s.revenue)}</td>
                    <td className="num">{fmtPct(s.fee, 4)}</td>
                    <td className="num">{fmtPct(s.roa, 4)}</td>
                    <td className="num">{fmtPct(roaTarget, 4)}</td>
                    <td><span className={badgeCls}>{badge}</span></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--rule-strong)' }}>
                <td colSpan="2" style={{ fontWeight: 600, fontSize: '0.857rem' }}>
                  Receita YTD {month.slice(0, 4)}
                </td>
                <td className="num" style={{ fontWeight: 600 }}>{fmtCompactBRL(totalRevYTD)}</td>
                <td colSpan="4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  /* ============================================================
     BLOCO DE OBSERVAÇÃO EDITÁVEL
  ============================================================ */
  function ObsBlock({ code, month }) {
    const [editing, setEditing] = useState(false);
    const [text, setText]       = useState(() => storage.getObs(code, month));

    useEffect(() => {
      setText(storage.getObs(code, month));
      setEditing(false);
    }, [code, month]);

    function save() {
      storage.setObs(code, month, text);
      setEditing(false);
    }

    function cancel() {
      setText(storage.getObs(code, month));
      setEditing(false);
    }

    const displayText = text || OBS_DEFAULT;

    return (
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--rule)' }}>
        <div style={{
          fontSize: '0.786rem', fontWeight: 600, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
        }}>
          Observação do Analista
        </div>
        {editing ? (
          <div>
            <textarea
              className="form-input"
              rows={3}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={OBS_DEFAULT}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: '0.857rem' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="btn--primary"
                style={{ fontSize: '0.786rem', padding: '5px 14px' }}
                onClick={save}
              >
                Salvar
              </button>
              <button
                className="btn--ghost"
                style={{ fontSize: '0.786rem', padding: '5px 14px' }}
                onClick={cancel}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setEditing(true)}
            onKeyDown={e => e.key === 'Enter' && setEditing(true)}
            style={{
              cursor: 'pointer',
              padding: '10px 12px',
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--r-sm)',
              fontSize: '0.857rem',
              lineHeight: 1.6,
              color: text ? 'var(--body)' : 'var(--muted)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span style={{ flex: 1 }}>{displayText}</span>
            <Icon name="edit" size={12} style={{ flexShrink: 0, opacity: 0.35, marginTop: 2 }} />
          </div>
        )}
      </div>
    );
  }

  /* ============================================================
     CARTEIRA PAGE
  ============================================================ */
  function Carteira({ code, tab: tabProp }) {
    const { useMonth } = window.AtlasContexts;
    const { selectedMonth } = useMonth();
    const [activeTab, setActiveTab] = useState(tabProp || 'composicao');

    useEffect(() => {
      if (tabProp && tabProp !== activeTab) setActiveTab(tabProp);
    }, [tabProp]);

    const p   = useMemo(() => D.CATALOG.find(x => x.code === code), [code]);
    const row = useMemo(() => D.getRow(code, selectedMonth), [code, selectedMonth]);

    if (!p) {
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Carteira</div>
            <h1 className="page-title">Código não encontrado</h1>
          </div>
          <EmptyState title="Carteira não encontrada" sub={`Código "${code}" não existe no catálogo.`} icon="search" />
        </div>
      );
    }

    const mgr         = row ? row.manager : null;
    const contOK      = !row || row.continuidade < 0.003;
    const contVariant = row && row.continuidade >= 0.003 ? 'red' : undefined;
    const prevMonthIdx = D.MONTHS.indexOf(selectedMonth) - 1;
    const prevMonthLabel = prevMonthIdx >= 0 ? fmtMonthLabel(D.MONTHS[prevMonthIdx]) : '—';

    const TABS = [
      { key: 'composicao', label: 'Composição' },
      { key: 'achados',    label: `Achados${row && row.nAchados > 0 ? ` (${row.nAchados})` : ''}` },
      { key: 'historico',  label: 'Histórico' },
      { key: 'receita',    label: 'Receita' },
    ];

    function handleExport() {
      navigate('#/dev/relatorio/' + code);
    }

    return (
      <div>
        {/* Page header */}
        <div className="page-header" style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div className="page-eyebrow">{p.risk} · {p.code}</div>
            <h1
              className="page-title"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}
            >
              {p.name}
            </h1>
            <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {row && <Badge status={row.status} />}
              <span>Extrato {fmtMonthLabel(selectedMonth)}</span>
              {mgr && <span style={{ color: 'var(--muted)' }}>· {mgr.name}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 4, flexWrap: 'wrap' }}>
            <button
              className="btn--ghost"
              onClick={() => navigate('#/dashboard')}
              style={{ fontSize: '0.786rem', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Icon name="dashboard" size={14} />
              Dashboard
            </button>
            <button
              className="btn--primary"
              onClick={handleExport}
              style={{ fontSize: '0.786rem', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Icon name="report" size={14} />
              Exportar Relatório
            </button>
          </div>
        </div>

        {/* KPI row 1 */}
        {row ? (
          <>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 10 }}>
              <KPITile label="PL Anterior"  value={fmtCompactBRL(row.plPrev)} sub={prevMonthLabel} />
              <KPITile label="PL Atual"     value={fmtCompactBRL(row.plCurr)} sub={fmtMonthLabel(selectedMonth)} />
              <KPITile
                label="Var. R$"
                value={(row.varBRL >= 0 ? '+' : '') + fmtCompactBRL(row.varBRL)}
                sub="vs mês anterior"
                variant={row.varBRL < -row.plPrev * 0.05 ? 'amber' : undefined}
              />
              <KPITile
                label="Var. %"
                value={(row.varPct >= 0 ? '+' : '') + fmtPct(row.varPct, 2)}
                sub="vs mês anterior"
                variant={row.varPct < -0.05 ? 'amber' : undefined}
              />
              <KPITile
                label="Rent. Mês"
                value={fmtPct(row.rent, 2)}
                sub={(row.vsCDI >= 0 ? '+' : '') + fmtPct(row.vsCDI, 2) + ' vs CDI'}
                variant={row.rent < 0 ? 'amber' : undefined}
              />
            </div>

            {/* KPI row 2 */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
              <KPITile
                label="Continuidade"
                value={fmtPct(row.continuidade, 3)}
                sub={contOK ? 'OK (tol. 0,30%)' : 'Fora da tolerância'}
                variant={contVariant}
              />
              <KPITile
                label="Receita YTD"
                value={fmtCompactBRL(row.revenueYTD)}
                sub={selectedMonth.slice(0, 4)}
              />
              <KPITile label="Ativos m-1" value={row.nAtivosPrev != null ? row.nAtivosPrev : '—'} sub="Posições mês anterior" />
              <KPITile label="Ativos m"   value={row.nAtivos     != null ? row.nAtivos     : '—'} sub="Posições mês atual" />
            </div>
          </>
        ) : (
          <div style={{
            padding: '16px 0 20px', fontSize: '0.857rem', color: 'var(--muted)',
          }}>
            {p.inception > selectedMonth
              ? `Carteira iniciada em ${fmtMonthLabel(p.inception)} — sem dados para ${fmtMonthLabel(selectedMonth)}.`
              : `Dados não disponíveis para ${fmtMonthLabel(selectedMonth)}.`}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'composicao' && <TabComposicao code={code} month={selectedMonth} row={row} />}
        {activeTab === 'achados'    && <TabAchados row={row} />}
        {activeTab === 'historico'  && <TabHistorico code={code} month={selectedMonth} />}
        {activeTab === 'receita'    && <TabReceita code={code} month={selectedMonth} />}

        {/* Observation block */}
        <ObsBlock code={code} month={selectedMonth} />
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Carteira = Carteira;

})();
