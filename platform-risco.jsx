/* platform-risco.jsx — Radar de Risco: scoring multidimensional por carteira */
(() => {
  const { useState, useMemo, useEffect } = React;
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
     DRAWER DE DETALHE — abre ao clicar em linha do heatmap
  ============================================================ */
  function DrawerDetalhe({ code, month, onClose }) {
    const rs = useMemo(() => D.riskScore(code, month), [code, month]);

    const scoreHistory = useMemo(() => {
      const mi = D.MONTHS.indexOf(month);
      if (mi < 0 || !rs) return [];
      const start = Math.max(0, mi - 5);
      return D.MONTHS.slice(start, mi + 1).map(m => {
        const s = D.riskScore(code, m);
        return s ? { month: m, score: s.score } : null;
      }).filter(Boolean);
    }, [code, month]);

    if (!rs) return null;

    const dims = [
      { key: 'mercado',      label: 'Mercado',   max: 30 },
      { key: 'concentracao', label: 'Concent.',   max: 25 },
      { key: 'liquidez',     label: 'Liquidez',   max: 20 },
      { key: 'suitability',  label: 'Suitab.',    max: 15 },
      { key: 'operacional',  label: 'Op.',         max: 10 },
    ];

    function radarPts(ratios, cx, cy, r) {
      return ratios.map((ratio, i) => {
        const ang = (i * 72 - 90) * Math.PI / 180;
        return `${(cx + r * ratio * Math.cos(ang)).toFixed(2)},${(cy + r * ratio * Math.sin(ang)).toFixed(2)}`;
      }).join(' ');
    }

    const ratios    = dims.map(d => (rs.components[d.key] || 0) / d.max);
    const dataPts   = radarPts(ratios, 80, 80, 60);
    const guides    = [0.33, 0.67, 1.0];

    const sparkW = 120, sparkH = 28;
    const sparkScores = scoreHistory.map(h => h.score);
    const minS = Math.min(...sparkScores), maxS = Math.max(...sparkScores);
    const sparkRange = (maxS - minS) || 1;
    const sparkPath = sparkScores.length > 1
      ? sparkScores.map((s, i) => {
          const x = (i / (sparkScores.length - 1)) * sparkW;
          const y = sparkH - ((s - minS) / sparkRange) * sparkH * 0.8 - sparkH * 0.1;
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ')
      : '';

    return (
      <>
        <div onClick={onClose} style={{
          position:'fixed', top:0, right:0, bottom:0, left:0, zIndex:999,
          background:'rgba(0,0,0,0.35)',
        }} />
        <div style={{
          position:'fixed', right:0, top:0, height:'100vh',
          width:'40%', minWidth:360, zIndex:1000,
          background:'var(--paper)', borderLeft:'1px solid var(--rule)',
          boxShadow:'-4px 0 24px rgba(0,0,0,0.18)',
          overflowY:'auto', padding:'24px',
          display:'flex', flexDirection:'column', gap:20,
        }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:'0.714rem', fontWeight:600, color:'var(--muted)',
                marginBottom:4, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                {rs.code}
              </div>
              <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--heading)',
                marginBottom:6, lineHeight:1.3 }}>
                {rs.name}
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <NivelBadge nivel={rs.nivel} />
                <span style={{ fontSize:'0.714rem', color:'var(--muted)' }}>Score {rs.score}/100</span>
              </div>
            </div>
            <button onClick={onClose} style={{
              background:'transparent', border:'none', cursor:'pointer',
              padding:'4px 8px', color:'var(--muted)', fontSize:'1.2rem', lineHeight:1,
            }}>×</button>
          </div>

          {/* 5 tiles de dimensao */}
          <div>
            <div style={{ fontSize:'0.714rem', fontWeight:600, color:'var(--muted)',
              marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Scores por Dimensao
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {dims.map(d => {
                const v = rs.components[d.key] || 0;
                const ratio = v / d.max;
                const color = ratio > 0.67 ? 'var(--red)' : ratio > 0.33 ? 'var(--amber)' : 'var(--green)';
                const bg    = ratio > 0.67 ? 'var(--red-bg)' : ratio > 0.33 ? 'var(--amber-bg)' : 'var(--green-bg)';
                return (
                  <div key={d.key} style={{
                    padding:'8px 10px', borderRadius:'var(--r-md)', background:bg,
                    flex:'1 1 68px', textAlign:'center',
                  }}>
                    <div style={{ fontSize:'0.643rem', color:'var(--muted)', marginBottom:3 }}>{d.label}</div>
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontWeight:700,
                      fontSize:'0.857rem', color }}>{v}/{d.max}</div>
                    <div style={{ marginTop:4, height:3, borderRadius:2,
                      background:'var(--rule)', overflow:'hidden' }}>
                      <div style={{ width:(ratio*100)+'%', height:'100%', background:color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Radar + Sparkline */}
          <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
            <div style={{ flex:'0 0 160px' }}>
              <div style={{ fontSize:'0.714rem', fontWeight:600, color:'var(--muted)',
                marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Radar
              </div>
              <svg viewBox="0 0 160 160" width={160} height={160}>
                {guides.map((gr, gi) => (
                  <polygon key={gi} points={radarPts([gr,gr,gr,gr,gr], 80, 80, 60)}
                    fill="none" stroke="var(--rule)" strokeWidth={gi === 2 ? 1 : 0.5} />
                ))}
                {dims.map((d, i) => {
                  const ang = (i * 72 - 90) * Math.PI / 180;
                  return <line key={d.key} x1={80} y1={80}
                    x2={(80 + 60 * Math.cos(ang)).toFixed(2)}
                    y2={(80 + 60 * Math.sin(ang)).toFixed(2)}
                    stroke="var(--rule)" strokeWidth={0.5} />;
                })}
                <polygon points={dataPts}
                  fill="var(--navy)" fillOpacity={0.25}
                  stroke="var(--navy)" strokeWidth={1.5} />
                {ratios.map((r, i) => {
                  const ang = (i * 72 - 90) * Math.PI / 180;
                  return <circle key={i}
                    cx={(80 + 60 * r * Math.cos(ang)).toFixed(2)}
                    cy={(80 + 60 * r * Math.sin(ang)).toFixed(2)}
                    r={3} fill="var(--navy)" />;
                })}
                {dims.map((d, i) => {
                  const ang = (i * 72 - 90) * Math.PI / 180;
                  return <text key={d.key}
                    x={(80 + 76 * Math.cos(ang)).toFixed(2)}
                    y={(80 + 76 * Math.sin(ang)).toFixed(2)}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={8} fill="var(--muted)">{d.label}</text>;
                })}
              </svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'0.714rem', fontWeight:600, color:'var(--muted)',
                marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Score 6 Meses
              </div>
              {sparkPath ? (
                <div>
                  <svg viewBox={`0 0 ${sparkW} ${sparkH}`} width="100%" height={sparkH}
                    style={{ overflow:'visible', display:'block' }}>
                    <polyline points={sparkPath} fill="none"
                      stroke="var(--gold)" strokeWidth={1.5} />
                    {sparkScores.map((s, i) => {
                      const x = (i / (sparkScores.length - 1)) * sparkW;
                      const y = sparkH - ((s - minS) / sparkRange) * sparkH * 0.8 - sparkH * 0.1;
                      return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={2.5} fill="var(--gold)" />;
                    })}
                  </svg>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    fontSize:'0.571rem', color:'var(--muted)', marginTop:3 }}>
                    {scoreHistory.map(h => <span key={h.month}>{h.month.slice(5)}</span>)}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize:'0.714rem', color:'var(--muted)' }}>Dados insuficientes</div>
              )}
              <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:4,
                fontSize:'0.714rem', color:'var(--muted)' }}>
                <span>Drawdown 6M: <strong style={{ color: rs.drawdown6M > 0.02 ? 'var(--red)' : 'var(--body)' }}>
                  {fmtPct(rs.drawdown6M, 1)}
                </strong></span>
                <span>Meses abaixo CDI: <strong style={{ color:'var(--body)' }}>{rs.monthsBelowCDI}</strong></span>
                <span>PL: <strong style={{ color:'var(--body)' }}>{fmtCompactBRL(rs.plCurr)}</strong></span>
                <span>Perfil: <strong style={{ color:'var(--body)' }}>{rs.risk}</strong></span>
              </div>
            </div>
          </div>

          {/* Barras de contribuicao */}
          <div>
            <div style={{ fontSize:'0.714rem', fontWeight:600, color:'var(--muted)',
              marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Contribuicao por Dimensao
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {dims.map(d => {
                const v = rs.components[d.key] || 0;
                const ratio = v / d.max;
                const color = ratio > 0.67 ? 'var(--red)' : ratio > 0.33 ? 'var(--amber)' : 'var(--green)';
                return (
                  <div key={d.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:64, fontSize:'0.714rem', color:'var(--muted)',
                      flexShrink:0, textAlign:'right' }}>{d.label}</div>
                    <div style={{ flex:1, height:8, background:'var(--rule)',
                      borderRadius:4, overflow:'hidden' }}>
                      <div style={{ width:(ratio*100)+'%', height:'100%',
                        background:color, borderRadius:4 }} />
                    </div>
                    <div style={{ width:36, textAlign:'right', fontSize:'0.714rem',
                      fontFamily:'JetBrains Mono, monospace', color }}>{v}/{d.max}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drivers */}
          {rs.drivers.length > 0 && (
            <div>
              <div style={{ fontSize:'0.714rem', fontWeight:600, color:'var(--muted)',
                marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Principais Drivers
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {rs.drivers.map(d => (
                  <span key={d} style={{
                    padding:'3px 10px', borderRadius:'var(--r-sm)',
                    background:'var(--paper-mid)', border:'1px solid var(--rule)',
                    fontSize:'0.714rem', fontWeight:600, color:'var(--body)',
                  }}>{d}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
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
    const meta = SCENARIO_META[id] || { label: id, desc: '—' };
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
            <div style={{ fontSize:'0.714rem', color:'var(--red)' }}>
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
  function RiscoHeatmap({ carteiras, selectedCode, onSelect }) {
    const [sortKey, setSortKey] = useState('score');
    const [asc, setAsc]         = useState(false);

    const sorted = useMemo(() => {
      const arr = [...carteiras];
      arr.sort((a, b) => {
        const compKeys = { mercado:1, concentracao:1, liquidez:1, suitability:1, operacional:1 };
        let va = compKeys[sortKey] ? a.components[sortKey] : a[sortKey];
        let vb = compKeys[sortKey] ? b.components[sortKey] : b[sortKey];
        if (va == null) va = asc ? Infinity : -Infinity;
        if (vb == null) vb = asc ? Infinity : -Infinity;
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
              <tr key={s.code}
                onClick={() => onSelect(s.code)}
                style={{
                  cursor:'pointer',
                  background: s.code === selectedCode ? 'var(--paper-mid)' : undefined,
                  borderLeft: s.code === selectedCode ? '2px solid var(--gold)' : '2px solid transparent',
                  transition:'background 0.1s',
                }}>
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
    const [scenario,      setScenario]      = useState('bolsa15');
    const [selectedCode,  setSelectedCode]  = useState(null);

    useEffect(() => {
      function onKey(e) { if (e.key === 'Escape') setSelectedCode(null); }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []);

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
            sub={(SCENARIO_META[scenario] || { label: scenario }).label}
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
            {Object.keys(D.STRESS_SHOCKS).map(id => (
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
              Top 5 mais impactadas &mdash; {(SCENARIO_META[scenario] || { label: scenario }).label}
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
          <RiscoHeatmap
            carteiras={dash.carteiras}
            selectedCode={selectedCode}
            onSelect={setSelectedCode}
          />
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

        {/* Drawer de detalhe por carteira */}
        {selectedCode && (
          <DrawerDetalhe
            code={selectedCode}
            month={selectedMonth}
            onClose={() => setSelectedCode(null)}
          />
        )}
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Risco = Risco;
})();
