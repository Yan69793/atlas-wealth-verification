/* platform-custos.jsx — Transparencia de Custo Total do Cliente */
(() => {
  const { useState, useMemo, useEffect } = React;

  const { fmtCompactBRL, fmtPct, fmtMonthLabel, signClass, navigate } = window.AtlasUtils;
  const { Icon }          = window.AtlasIcons;
  const { LineChart }     = window.AtlasCharts;
  const { KPITile, SeverityBadge, EmptyState, Chip } = window.AtlasUI;
  const D = window.AtlasData;

  /* ============================================================
     HELPERS
  ============================================================ */

  const TABS = [
    { id: 'gestor',   label: 'Por Gestor'     },
    { id: 'carteira', label: 'Por Carteira'    },
    { id: 'classe',   label: 'Por Classe de Ativo' },
  ];

  function fmtBRL(v) {
    if (v == null || isNaN(v)) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function fmtPctDisplay(v) {
    if (v == null || isNaN(v)) return '—';
    return (v * 100).toFixed(3) + '%';
  }

  /* ============================================================
     COMPONENTE PRINCIPAL
  ============================================================ */

  function Custos() {
    const { selectedMonth } = window.AtlasContexts ? window.AtlasContexts.useMonth() : { selectedMonth: D.CURRENT_MONTH };
    const comps = D.COST_COMPONENTS || [];

    // Estado: quais componentes estao ativos (default: todos)
    const [activeIds, setActiveIds] = useState(() => comps.map(c => c.id));

    // Alterna um componente
    function toggleComp(id) {
      setActiveIds(prev => {
        if (prev.includes(id)) {
          var next = prev.filter(x => x !== id);
          return next.length ? next : prev; // nunca deixa vazio
        }
        return [...prev, id];
      });
    }

    // Liga/desliga todos
    function toggleAll(enable) {
      if (enable) setActiveIds(comps.map(c => c.id));
      else setActiveIds([comps[0].id]); // mantem pelo menos um
    }

    var analysis = useMemo(function() {
      return D.clientCostAnalysis(selectedMonth, activeIds);
    }, [selectedMonth, activeIds]);

    var allOn = activeIds.length === comps.length;

    if (!comps.length) {
      return <EmptyState icon="revenue" title="Dados de custo indisponiveis" subtitle="COST_COMPONENTS nao encontrado em AtlasData." />;
    }

    return (
      <div>
        {/* Header: KPIs de custo total */}
        <div style={{ display: 'flex', gap: 1, marginBottom: 20, background: 'var(--border-light)', borderRadius: 6, overflow: 'hidden', flexWrap: 'wrap' }}>
          <KPITile
            label="Custo Total (Mes)"
            value={analysis ? fmtBRL(analysis.totalCost) : '—'}
            sub={analysis ? fmtPctDisplay(analysis.totalPct) + ' do AUM' : ''}
            minWidth="160px"
          />
          <KPITile
            label="Patrimonio (AUM)"
            value={analysis ? fmtBRL(analysis.totalAUM) : '—'}
            sub={analysis ? analysis.byPortfolio.filter(function(p) { return p.aum > 0; }).length + ' carteiras ativas' : ''}
            minWidth="160px"
          />
          <KPITile
            label="Custo Medio por Carteira"
            value={analysis ? fmtBRL(analysis.totalCost / Math.max(1, analysis.byPortfolio.filter(function(p) { return p.aum > 0; }).length)) : '—'}
            sub="media simples"
            minWidth="160px"
          />
          <KPITile
            label="Maior Custo %"
            value={analysis && analysis.byPortfolio.length ? fmtPctDisplay(analysis.byPortfolio[0].pct) : '—'}
            sub={analysis && analysis.byPortfolio.length ? analysis.byPortfolio[0].name : ''}
            variant={analysis && analysis.byPortfolio.length && analysis.byPortfolio[0].pct > 0.02 ? 'alert' : undefined}
            minWidth="160px"
          />
        </div>

        {/* Seletor de componentes de custo */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
              Componentes de Custo
            </span>
            <button
              onClick={() => toggleAll(!allOn)}
              style={{
                fontSize: '0.68rem', border: '1px solid var(--border-light)', borderRadius: 3,
                padding: '2px 8px', cursor: 'pointer', background: 'var(--paper-light)',
                color: 'var(--body)',
              }}
            >
              {allOn ? 'Limpar selecao' : 'Selecionar todos'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {comps.map(function(cc) {
              var active = activeIds.includes(cc.id);
              var chipStyle = active
                ? { background: 'var(--navy)', color: '#fff', borderColor: 'var(--navy)' }
                : { background: 'var(--paper-light)', color: 'var(--body)', borderColor: 'var(--border-light)' };

              return (
                <button
                  key={cc.id}
                  onClick={() => toggleComp(cc.id)}
                  title={cc.desc || ''}
                  style={{
                    fontSize: '0.73rem', fontWeight: 500, border: '1px solid', borderRadius: 16,
                    padding: '4px 14px', cursor: 'pointer', transition: 'all .15s',
                    ...chipStyle,
                  }}
                  type="button"
                >
                  {cc.label}
                  {active ? '' : ' (oculto)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabela de breakdown por componente */}
        {analysis && analysis.breakdown && analysis.breakdown.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 8 }}>
              Breakdown por Componente
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Componente</th>
                    <th className="num">Total (BRL)</th>
                    <th className="num">% do AUM</th>
                    <th style={{ width: 120 }}>Peso Relativo</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.breakdown.map(function(b) {
                    var barW = analysis.totalCost > 0 ? (b.total / analysis.totalCost) * 100 : 0;
                    return (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 500 }}>{b.label}</td>
                        <td className="num" style={{ fontFamily: 'var(--font-mono)' }}>{fmtBRL(b.total)}</td>
                        <td className="num" style={{ fontFamily: 'var(--font-mono)' }}>{fmtPctDisplay(b.pct)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: barW.toFixed(1) + '%', background: 'var(--navy)', borderRadius: 3, minWidth: barW > 0 ? 2 : 0 }} />
                            </div>
                            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', minWidth: 36, textAlign: 'right' }}>
                              {barW.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: '2px solid var(--border-light)', fontWeight: 600 }}>
                    <td>TOTAL</td>
                    <td className="num" style={{ fontFamily: 'var(--font-mono)' }}>{fmtBRL(analysis.totalCost)}</td>
                    <td className="num" style={{ fontFamily: 'var(--font-mono)' }}>{fmtPctDisplay(analysis.totalPct)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabs: Gestor / Carteira / Classe */}
        {analysis && (
          <TabbedView analysis={analysis} />
        )}
      </div>
    );
  }

  /* ============================================================
     TABBED VIEW
  ============================================================ */

  function TabbedView({ analysis }) {
    const [activeTab, setActiveTab] = useState('gestor');

    return (
      <div>
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--border-light)' }}>
          {TABS.map(function(t) {
            var active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '8px 20px', border: 'none', background: 'none',
                  fontSize: '0.78rem', fontWeight: active ? 700 : 400,
                  color: active ? 'var(--navy)' : 'var(--body)',
                  borderBottom: active ? '2px solid var(--navy)' : '2px solid transparent',
                  marginBottom: -2, cursor: 'pointer',
                }}
                type="button"
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'gestor' && <TabGestor analysis={analysis} />}
        {activeTab === 'carteira' && <TabCarteira analysis={analysis} />}
        {activeTab === 'classe' && <TabClasse analysis={analysis} />}
      </div>
    );
  }

  /* ============================================================
     TAB: POR GESTOR
  ============================================================ */

  function TabGestor({ analysis }) {
    var managers = analysis.byManager || [];
    if (!managers.length) return <EmptyState icon="revenue" title="Nenhum gestor com custo registrado" />;

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Gestor</th>
              <th className="num">AUM</th>
              <th className="num">Custo Total</th>
              <th className="num">% do AUM</th>
              <th className="num">Carteiras</th>
            </tr>
          </thead>
          <tbody>
            {managers.map(function(m) {
              return (
                <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => navigate('#/custos?manager=' + encodeURIComponent(m.id))}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)' }}>{fmtBRL(m.aum)}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)' }}>{fmtBRL(m.totalCost)}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: m.pct > 0.02 ? 'var(--red)' : 'var(--navy)' }}>
                    {fmtPctDisplay(m.pct)}
                  </td>
                  <td className="num">{m.portfolios.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  /* ============================================================
     TAB: POR CARTEIRA
  ============================================================ */

  function TabCarteira({ analysis }) {
    var portfolios = analysis.byPortfolio || [];
    if (!portfolios.length) return <EmptyState icon="revenue" title="Nenhuma carteira com custo registrado" />;

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Carteira</th>
              <th>Gestor</th>
              <th className="num">AUM</th>
              <th className="num">Custo Total</th>
              <th className="num">% do AUM</th>
              <th style={{ width: 100 }}>Nivel</th>
            </tr>
          </thead>
          <tbody>
            {portfolios.map(function(p) {
              var levelColor = p.pct > 0.03 ? 'var(--red)' : p.pct > 0.015 ? 'var(--amber)' : 'var(--green)';
              var levelLabel = p.pct > 0.03 ? 'Alto' : p.pct > 0.015 ? 'Medio' : 'Baixo';
              return (
                <tr key={p.code} style={{ cursor: 'pointer' }} onClick={() => navigate('#/carteira/' + encodeURIComponent(p.code))}>
                  <td style={{ fontWeight: 600 }}>{p.code}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{p.manager}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)' }}>{fmtBRL(p.aum)}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)' }}>{fmtBRL(p.cost)}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: levelColor }}>
                    {fmtPctDisplay(p.pct)}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 3,
                      fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase',
                      background: p.pct > 0.03 ? '#FEF2F2' : p.pct > 0.015 ? '#FFFBEB' : '#ECFDF5',
                      color: levelColor,
                    }}>
                      {levelLabel}
                    </span>
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
     TAB: POR CLASSE DE ATIVO
  ============================================================ */

  function TabClasse({ analysis }) {
    var classes = analysis.byAssetClass || [];
    if (!classes.length) return <EmptyState icon="revenue" title="Nenhuma classe de ativo com custo" />;

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Classe de Ativo</th>
              <th className="num">AUM</th>
              <th className="num">Custo Total</th>
              <th className="num">% do AUM</th>
              <th style={{ width: 140 }}>Distribuicao</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(function(c) {
              var barW = analysis.totalCost > 0 ? (c.totalCost / analysis.totalCost) * 100 : 0;
              return (
                <tr key={c.assetClass}>
                  <td style={{ fontWeight: 600 }}>{c.assetClass}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)' }}>{fmtBRL(c.aum)}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)' }}>{fmtBRL(c.totalCost)}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: c.pct > 0.02 ? 'var(--red)' : 'var(--navy)' }}>
                    {fmtPctDisplay(c.pct)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 8, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: barW.toFixed(1) + '%', background: 'var(--navy)', borderRadius: 4, minWidth: barW > 0 ? 3 : 0 }} />
                      </div>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', minWidth: 36, textAlign: 'right' }}>
                        {barW.toFixed(0)}%
                      </span>
                    </div>
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
     REGISTRO
  ============================================================ */

  window.AtlasPages.Custos = Custos;

})();
