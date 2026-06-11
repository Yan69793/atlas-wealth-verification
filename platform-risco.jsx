/* platform-risco.jsx — Radar de Risco: scoring multidimensional por carteira */
(() => {
  const { useState, useMemo } = React;
  const { fmtCompactBRL, fmtPct, fmtMonthLabel } = window.AtlasUtils;
  const { KPITile, EmptyState } = window.AtlasUI;
  const D = window.AtlasData;

  /* ============================================================
     BADGE DE NIVEL
  ============================================================ */
  function NivelBadge({ nivel }) {
    const map = {
      'Alto':    { background:'var(--red-bg)',   color:'var(--red)'   },
      'Atenção': { background:'var(--amber-bg)', color:'var(--amber)' },
      'Baixo':   { background:'var(--green-bg)', color:'var(--green)' },
    };
    const s = map[nivel] || {};
    return (
      <span style={{
        display:'inline-block', padding:'2px 8px', borderRadius:'var(--r-sm)',
        fontSize:'0.714rem', fontWeight:600, letterSpacing:'0.04em', ...s,
      }}>
        {nivel}
      </span>
    );
  }

  /* ============================================================
     BARRA DE SCORE
  ============================================================ */
  function ScoreBar({ score }) {
    const color = score >= 70 ? 'var(--red)' : score >= 40 ? 'var(--amber)' : 'var(--green)';
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ flex:1, height:6, background:'var(--rule)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ width:score + '%', height:'100%', background:color, borderRadius:3 }} />
        </div>
        <span style={{ fontSize:'0.857rem', fontWeight:600, color, minWidth:28, textAlign:'right' }}>
          {score}
        </span>
      </div>
    );
  }

  /* ============================================================
     CARDS DE CENARIO DE STRESS
  ============================================================ */
  const SCENARIO_META = {
    juros200:  { label:'Juros +200 bps',      desc:'Choque na curva de juros' },
    bolsa15:   { label:'Bolsa -15%',          desc:'Queda abrupta em renda variavel' },
    liquidez:  { label:'Crise de Liquidez',   desc:'Premio de iliquidez generalizado' },
    combinado: { label:'Cenario Combinado',   desc:'Convergencia de fatores adversos' },
  };

  function ScenarioCard({ id, active, onSelect, stressData }) {
    const meta = SCENARIO_META[id];
    const loss    = stressData ? stressData.totalLoss    : 0;
    const lossPct = stressData ? stressData.totalLossPct : 0;
    return (
      <button
        onClick={() => onSelect(id)}
        style={{
          flex:1, minWidth:150, padding:'12px 14px', borderRadius:'var(--r-md)', cursor:'pointer',
          border: active ? '1.5px solid var(--gold)' : '1px solid var(--rule)',
          background: active ? 'rgba(196,162,40,0.06)' : 'var(--paper)',
          textAlign:'left', transition:'border .12s, background .12s',
          boxShadow:'var(--shadow-card)',
        }}
      >
        <div style={{ fontSize:'0.786rem', fontWeight:600, marginBottom:2,
          color: active ? 'var(--gold-2)' : 'var(--heading)' }}>
          {meta.label}
        </div>
        <div style={{ fontSize:'0.714rem', color:'var(--muted)', marginBottom:8 }}>
          {meta.desc}
        </div>
        {stressData && (
          <>
            <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--red)', fontFamily:'JetBrains Mono, monospace' }}>
              {fmtCompactBRL(loss)}
            </div>
            <div style={{ fontSize:'0.714rem', color:'var(--muted)' }}>
              {fmtPct(lossPct, 1)} do AUM total
            </div>
          </>
        )}
      </button>
    );
  }

  /* ============================================================
     HEATMAP — tabela de scores por carteira (ordenavel)
  ============================================================ */
  function RiscoHeatmap({ carteiras }) {
    const [sortKey, setSortKey] = useState('score');
    const [asc, setAsc]         = useState(false);

    const sorted = useMemo(() => {
      const arr = [...carteiras];
      arr.sort((a, b) => {
        const compKeys = { mercado:1, concentracao:1, liquidez:1, suitability:1, operacional:1 };
        let va = compKeys[sortKey] ? a.components[sortKey] : a[sortKey];
        let vb = compKeys[sortKey] ? b.components[sortKey] : b[sortKey];
        if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        return asc ? va - vb : vb - va;
      });
      return arr;
    }, [carteiras, sortKey, asc]);

    function toggleSort(key) {
      if (sortKey === key) setAsc(a => !a);
      else { setSortKey(key); setAsc(false); }
    }

    const thStyle = {
      padding:'8px 12px', fontSize:'0.714rem', fontWeight:600, cursor:'pointer',
      color:'var(--muted)', textAlign:'left', whiteSpace:'nowrap', userSelect:'none',
    };

    function heatCell(v, max) {
      const ratio = max > 0 ? v / max : 0;
      const bg = ratio > 0.67 ? 'var(--red-bg)' : ratio > 0.33 ? 'var(--amber-bg)' : 'transparent';
      return (
        <td style={{ padding:'8px 12px', textAlign:'center', background:bg,
          fontSize:'0.786rem', fontFamily:'JetBrains Mono, monospace' }}>
          {v}/{max}
        </td>
      );
    }

    const arrow = key => sortKey === key ? (asc ? ' ▲' : ' ▼') : '';

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sortable" style={thStyle} onClick={() => toggleSort('name')}>
                Carteira{arrow('name')}
              </th>
              <th className="sortable" style={{...thStyle, minWidth:130}} onClick={() => toggleSort('score')}>
                Score{arrow('score')}
              </th>
              <th style={{...thStyle, cursor:'default'}}>Nivel</th>
              <th className="sortable" style={thStyle} onClick={() => toggleSort('mercado')}>
                Mercado/30{arrow('mercado')}
              </th>
              <th className="sortable" style={thStyle} onClick={() => toggleSort('concentracao')}>
                Concent./25{arrow('concentracao')}
              </th>
              <th className="sortable" style={thStyle} onClick={() => toggleSort('liquidez')}>
                Liquidez/20{arrow('liquidez')}
              </th>
              <th style={{...thStyle, textAlign:'center', cursor:'default'}}>Suit./15</th>
              <th style={{...thStyle, textAlign:'center', cursor:'default'}}>Op./10</th>
              <th className="sortable" style={{...thStyle, textAlign:'right'}} onClick={() => toggleSort('plCurr')}>
                PL{arrow('plCurr')}
              </th>
              <th style={{...thStyle, cursor:'default'}}>Drivers</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr key={s.code}>
                <td style={{ padding:'8px 12px' }}>
                  <div style={{ fontWeight:600, fontSize:'0.857rem' }}>{s.code}</div>
                  <div style={{ fontSize:'0.714rem', color:'var(--muted)' }}>{s.name}</div>
                </td>
                <td style={{ padding:'8px 12px', minWidth:130 }}>
                  <ScoreBar score={s.score} />
                </td>
                <td style={{ padding:'8px 12px' }}><NivelBadge nivel={s.nivel} /></td>
                {heatCell(s.components.mercado,      30)}
                {heatCell(s.components.concentracao, 25)}
                {heatCell(s.components.liquidez,     20)}
                {heatCell(s.components.suitability,  15)}
                {heatCell(s.components.operacional,  10)}
                <td style={{ padding:'8px 12px', textAlign:'right',
                  fontFamily:'JetBrains Mono, monospace', fontSize:'0.786rem' }}>
                  {fmtCompactBRL(s.plCurr)}
                </td>
                <td style={{ padding:'8px 12px', fontSize:'0.714rem', color:'var(--muted)',
                  maxWidth:180, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {s.drivers.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ============================================================
     FILA DE ACAO
  ============================================================ */
  function FilaAcao({ filaAcao }) {
    if (!filaAcao.length) {
      return (
        <EmptyState
          title="Nenhuma acao necessaria"
          sub="Todas as carteiras estao dentro dos limites de risco."
          icon="check"
        />
      );
    }
    const thS = { padding:'8px 12px', fontSize:'0.714rem', fontWeight:600, color:'var(--muted)' };
    const tdS = { padding:'8px 12px', fontSize:'0.857rem', verticalAlign:'middle' };
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={thS}>Carteira</th>
              <th style={{...thS, textAlign:'center'}}>Score</th>
              <th style={{...thS, textAlign:'center'}}>Nivel</th>
              <th style={thS}>Motivo principal</th>
              <th style={thS}>Recomendacao</th>
            </tr>
          </thead>
          <tbody>
            {filaAcao.map(item => (
              <tr key={item.code}>
                <td style={tdS}>
                  <div style={{ fontWeight:600 }}>{item.code}</div>
                  <div style={{ fontSize:'0.714rem', color:'var(--muted)' }}>{item.name}</div>
                </td>
                <td style={{...tdS, textAlign:'center', fontFamily:'JetBrains Mono, monospace',
                  fontWeight:700, color: item.nivel === 'Alto' ? 'var(--red)' : 'var(--amber)' }}>
                  {item.score}
                </td>
                <td style={{...tdS, textAlign:'center'}}>
                  <NivelBadge nivel={item.nivel} />
                </td>
                <td style={{...tdS, maxWidth:240, fontSize:'0.786rem'}}>{item.motivo}</td>
                <td style={{...tdS, fontSize:'0.786rem', color:'var(--muted)'}}>{item.recomendacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ============================================================
     PAGINA PRINCIPAL
  ============================================================ */
  function Risco() {
    const { useMonth } = window.AtlasContexts;
    const { selectedMonth } = useMonth();
    const [scenario, setScenario] = useState('bolsa15');

    const dash = useMemo(() => D.riskDashboard(selectedMonth), [selectedMonth]);

    const stressAll = useMemo(() => ({
      juros200:  D.riskStress(selectedMonth, 'juros200'),
      bolsa15:   D.riskStress(selectedMonth, 'bolsa15'),
      liquidez:  D.riskStress(selectedMonth, 'liquidez'),
      combinado: D.riskStress(selectedMonth, 'combinado'),
    }), [selectedMonth]);

    const activeStress = stressAll[scenario];

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Monitoramento Prudencial</div>
          <h1 className="page-title">Radar de Risco</h1>
          <div className="page-subtitle">
            {fmtMonthLabel(selectedMonth)} &middot; {D.CATALOG.length} carteiras avaliadas
          </div>
        </div>

        {/* KPI strip */}
        <div className="kpi-grid" style={{ marginBottom:24 }}>
          <KPITile
            label="Risco Alto"
            value={dash.kpis.alto}
            sub={dash.kpis.alto > 0 ? 'Requerem acao imediata' : 'Nenhuma'}
            variant={dash.kpis.alto > 0 ? 'red' : undefined}
          />
          <KPITile
            label="Em Atencao"
            value={dash.kpis.atencao}
            sub={dash.kpis.atencao > 0 ? 'Monitoramento reforcado' : 'Nenhuma'}
            variant={dash.kpis.atencao > 0 ? 'amber' : undefined}
          />
          <KPITile
            label="Score Medio"
            value={dash.kpis.scoreMedia + '/100'}
            sub="Media entre carteiras ativas"
          />
          <KPITile
            label="Perda Estimada"
            value={fmtCompactBRL(activeStress.totalLoss)}
            sub={SCENARIO_META[scenario].label}
            variant="navy"
          />
        </div>

        {/* Cenarios de stress */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:'0.714rem', fontWeight:600, color:'var(--muted)',
            marginBottom:10, textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Cenarios de Stress — clique para ativar
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {['juros200','bolsa15','liquidez','combinado'].map(id => (
              <ScenarioCard
                key={id}
                id={id}
                active={scenario === id}
                onSelect={setScenario}
                stressData={stressAll[id]}
              />
            ))}
          </div>
        </div>

        {/* Top 5 mais impactadas */}
        <div className="card" style={{ marginBottom:24 }}>
          <div className="card-header">
            <span className="card-title">
              Top 5 mais impactadas &mdash; {SCENARIO_META[scenario].label}
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Carteira</th>
                  <th className="num">PL Atual</th>
                  <th className="num">Perda Estimada</th>
                  <th className="num">% Perda</th>
                </tr>
              </thead>
              <tbody>
                {activeStress.top5Stressed.map(r => (
                  <tr key={r.code}>
                    <td>
                      <div style={{ fontWeight:600, fontSize:'0.857rem' }}>{r.code}</div>
                      <div style={{ fontSize:'0.714rem', color:'var(--muted)' }}>{r.name}</div>
                    </td>
                    <td className="num">{fmtCompactBRL(r.plCurr)}</td>
                    <td className="num num--neg">{fmtCompactBRL(r.loss)}</td>
                    <td className="num num--neg">{fmtPct(r.lossPct, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Heatmap geral */}
        <div className="card" style={{ marginBottom:24 }}>
          <div className="card-header">
            <span className="card-title">
              Heatmap de Risco &mdash; {fmtMonthLabel(selectedMonth)}
            </span>
          </div>
          <RiscoHeatmap carteiras={dash.carteiras} />
        </div>

        {/* Fila de acao */}
        <div className="card" style={{ marginBottom:24 }}>
          <div className="card-header">
            <span className="card-title">
              Fila de Acao ({dash.filaAcao.length} carteiras)
            </span>
          </div>
          <FilaAcao filaAcao={dash.filaAcao} />
        </div>

        {/* Disclaimer */}
        <div style={{
          padding:'12px 16px', borderRadius:'var(--r-md)',
          background:'var(--paper-mid)', border:'1px solid var(--rule)',
          fontSize:'0.714rem', color:'var(--muted)', lineHeight:1.7,
        }}>
          <strong style={{ color:'var(--body)' }}>Nota metodologica:</strong>{' '}
          Score calculado sobre dados sinteticos com finalidade exclusivamente demonstrativa.
          Framework baseado em FINRA Rule 2111 (suitability), FINRA Notice 12-03 (risk monitoring),
          IOSCO Principles of Liquidity Risk Management e BIS BCBS 239 (risk data aggregation).
          Nao constitui recomendacao de investimento nem substitui analise de risco regulatoria formal.
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Risco = Risco;
})();
