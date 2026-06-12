/* platform-achados.jsx — Achados & Exceções: página global de findings */
(() => {
  const { useState, useMemo } = React;

  const { fmtCompactBRL, fmtPct, fmtMonthLabel, signClass, navigate } = window.AtlasUtils;
  const { Icon }                                = window.AtlasIcons;
  const { Badge, SeverityBadge, KPITile, EmptyState } = window.AtlasUI;
  const D = window.AtlasData;

  /* ============================================================
     KPI STRIP — 5 tiles
  ============================================================ */
  function KpiStrip({ stats, findingsArr, recidivas, anomalias, limpas }) {
    return (
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <KPITile
          label="Erros bloqueantes"
          value={stats.corrigir}
          sub="Impede liberação"
          variant={stats.corrigir > 0 ? 'red' : undefined}
        />
        <KPITile
          label="Com Alerta"
          value={stats.alerta}
          sub={stats.alerta > 0 ? 'Monitorar' : 'Nenhuma'}
          variant={stats.alerta > 0 ? 'amber' : undefined}
        />
        <KPITile
          label="Recidiva"
          value={recidivas.length}
          sub="Histórico irregular"
          variant={recidivas.length > 0 ? 'navy' : undefined}
        />
        <KPITile
          label="Anomalias"
          value={anomalias.length}
          sub="|Var%| > 10% LIBERAR"
          variant={anomalias.length > 0 ? 'amber' : undefined}
        />
        <KPITile
          label="Sem ressalvas"
          value={limpas.length}
          sub={fmtPct(limpas.length / stats.total, 0) + ' do total'}
          variant={limpas.length > 0 ? 'green' : undefined}
        />
      </div>
    );
  }

  /* ============================================================
     TAB: MÊS ATUAL — todos os achados ordenados por severidade
  ============================================================ */
  const SEV_ORDER = { CORRIGIR: 0, 'COM ALERTA': 1, INFO: 2 };

  function TabMesAtual({ findingsArr, month }) {
    if (!findingsArr.length) {
      return (
        <EmptyState
          title="Nenhum achado no mês"
          sub="Todas as carteiras foram liberadas sem ressalvas."
          icon="check"
        />
      );
    }

    const sorted = [...findingsArr].sort((a, b) => {
      const sa = SEV_ORDER[a.finding.severity] ?? 99;
      const sb = SEV_ORDER[b.finding.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 150 }}>Carteira</th>
              <th>Severidade</th>
              <th>Achado</th>
              <th>Gestor</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => {
              const row = D.getRow(f.code, month);
              return (
                <tr
                  key={f.code + '|' + i}
                  className="clickable"
                  onClick={() => navigate('#/carteira/' + f.code + '?tab=achados')}
                >
                  <td style={{ minWidth: 150 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{f.code}</div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{f.name}</div>
                  </td>
                  <td><SeverityBadge severity={f.finding.severity} /></td>
                  <td style={{ fontSize: '0.857rem', color: 'var(--body)', maxWidth: 460, wordBreak: 'break-word' }}>
                    {f.finding.text}
                  </td>
                  <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
                    {row && row.manager ? row.manager.name : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  /* ============================================================
     TAB: RECIDIVA — carteiras com histórico irregular
  ============================================================ */
  function TabRecidiva({ recidivas }) {
    if (!recidivas.length) {
      return (
        <EmptyState
          title="Nenhuma recidiva detectada"
          sub="Nenhuma carteira com 4 ou mais meses com alerta."
          icon="check"
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {recidivas.map(r => (
          <div
            key={r.code}
            className="card clickable"
            onClick={() => navigate('#/carteira/' + r.code + '?tab=achados')}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)' }}>{r.code}</div>
                <div style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{r.name}</div>
              </div>
              <span style={{
                background: 'var(--amber-bg)', color: 'var(--amber)',
                border: '1px solid var(--amber)', borderRadius: 'var(--r-sm)',
                padding: '2px 10px', fontSize: '0.714rem', fontWeight: 600,
                letterSpacing: '0.04em', whiteSpace: 'nowrap',
              }}>
                RECIDIVA &middot; {r.count}&times;
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r.history.map(h => {
                const isCorrigir = h.status === 'CORRIGIR';
                return (
                  <span
                    key={h.month}
                    style={{
                      padding: '2px 8px',
                      background: isCorrigir ? 'var(--red-bg)' : 'var(--amber-bg)',
                      color: isCorrigir ? 'var(--red)' : 'var(--amber)',
                      border: '1px solid ' + (isCorrigir ? 'var(--red)' : 'var(--amber)'),
                      borderRadius: 'var(--r-sm)',
                      fontSize: '0.714rem',
                    }}
                  >
                    {h.label} &mdash; {h.status}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ============================================================
     TAB: ANOMALIAS — variações extremas e fee/billing anômalos
  ============================================================ */
  const ANOMALY_LABELS = {
    HIGH_VAR:    'VARIAÇÃO EXTREMA',
    FEE_ANOMALY: 'FEE ANÔMALO',
    BILLING_ADJ: 'RECEITA FANTASMA',
  };

  function TabAnomalias({ anomalias }) {
    if (!anomalias.length) {
      return (
        <EmptyState
          title="Nenhuma anomalia no mês"
          sub="Nenhuma carteira LIBERAR com variação superior a 10%."
          icon="check"
        />
      );
    }

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 150 }}>Carteira</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th className="num">Var.</th>
            </tr>
          </thead>
          <tbody>
            {anomalias.map((a, i) => (
              <tr
                key={a.code + '|' + i}
                className="clickable"
                onClick={() => navigate('#/carteira/' + a.code + '?tab=achados')}
              >
                <td style={{ minWidth: 150 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{a.code}</div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{a.name}</div>
                </td>
                <td>
                  <span style={{
                    background: 'var(--amber-bg)', color: 'var(--amber)',
                    border: '1px solid var(--amber)', borderRadius: 'var(--r-sm)',
                    padding: '2px 8px', fontSize: '0.714rem', fontWeight: 600,
                  }}>
                    {ANOMALY_LABELS[a.type] || a.type}
                  </span>
                </td>
                <td style={{ fontSize: '0.857rem', color: 'var(--body)' }}>{a.text}</td>
                <td className={`num ${a.ret !== 0 ? signClass(a.ret) : ''}`}>
                  {a.ret !== 0 ? (a.ret > 0 ? '+' : '') + fmtPct(a.ret, 2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ============================================================
     TAB: SEM RESSALVAS — carteiras limpas
  ============================================================ */
  function TabLimpas({ limpas }) {
    if (!limpas.length) {
      return (
        <EmptyState
          title="Nenhuma carteira sem ressalvas"
          sub="Todas as carteiras do mês têm pelo menos um achado."
          icon="findings"
        />
      );
    }

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 150 }}>Carteira</th>
              <th>Gestor</th>
              <th className="num">PL Atual</th>
              <th className="num">Rent.</th>
              <th className="num">vs CDI</th>
            </tr>
          </thead>
          <tbody>
            {limpas.map(r => (
              <tr
                key={r.code}
                className="clickable"
                onClick={() => navigate('#/carteira/' + r.code)}
              >
                <td style={{ minWidth: 150 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{r.code}</div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{r.name}</div>
                </td>
                <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
                  {r.manager ? r.manager.name : '—'}
                </td>
                <td className="num">{fmtCompactBRL(r.plCurr)}</td>
                <td className={`num ${signClass(r.rent)}`}>{fmtPct(r.rent, 2)}</td>
                <td className={`num ${signClass(r.vsCDI)}`}>
                  {r.vsCDI > 0 ? '+' : ''}{fmtPct(r.vsCDI, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ============================================================
     ACHADOS — componente principal
  ============================================================ */
  const TABS = [
    { id: 'mes',       label: 'Mês atual'     },
    { id: 'recidiva',  label: 'Recidiva'      },
    { id: 'anomalias', label: 'Anomalias'     },
    { id: 'limpas',    label: 'Sem ressalvas' },
  ];

  function Achados() {
    const { useMonth } = window.AtlasContexts;
    const { selectedMonth } = useMonth();
    const [tab, setTab] = useState('mes');

    const stats      = useMemo(() => D.dashboardStats(selectedMonth), [selectedMonth]);
    const findingsArr = useMemo(() => D.findings(selectedMonth),      [selectedMonth]);
    const recidivas  = useMemo(() => D.recidivas(),                   []);
    const anomalias  = useMemo(() => D.anomalias(selectedMonth),      [selectedMonth]);
    const limpas     = useMemo(() => D.limpas(selectedMonth),         [selectedMonth]);

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Verificação Global</div>
          <h1 className="page-title">Achados & Exceções</h1>
          <div className="page-subtitle">
            {fmtMonthLabel(selectedMonth)} &middot; {D.CATALOG.length} carteiras analisadas
          </div>
        </div>

        <KpiStrip
          stats={stats}
          findingsArr={findingsArr}
          recidivas={recidivas}
          anomalias={anomalias}
          limpas={limpas}
        />

        <div className="tabs" role="tablist" aria-label="Categorias de achados">
          {TABS.map(t => {
            const count =
              t.id === 'mes'       ? findingsArr.length :
              t.id === 'recidiva'  ? recidivas.length   :
              t.id === 'anomalias' ? anomalias.length   : 0;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={'tab-btn' + (tab === t.id ? ' active' : '')}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {count > 0 && <span className="tab-badge" style={{ marginLeft: 6 }}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          {tab === 'mes'       && <TabMesAtual   findingsArr={findingsArr} month={selectedMonth} />}
          {tab === 'recidiva'  && <TabRecidiva   recidivas={recidivas}     />}
          {tab === 'anomalias' && <TabAnomalias  anomalias={anomalias}     />}
          {tab === 'limpas'    && <TabLimpas     limpas={limpas}           />}
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Achados = Achados;

})();
