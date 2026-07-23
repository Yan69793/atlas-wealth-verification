/* The three index views: Resumo, Conciliação, Achados.
   Each one is a React component that reads from window.AUDIT_DATA. */

const { useState, useMemo } = React;

/* ====================== Status Chip ====================== */
const StatusChip = ({ status }) => {
  const cls = statusClass(status);
  return <span className={`chip ${cls}`}>{statusShort(status)}</span>;
};

/* ====================== Delta cell ====================== */
const Delta = ({ value, kind = 'pct', digits = 2, neutralWhenZero = true }) => {
  if (value == null) return <span className="dash">—</span>;
  const isZero = Math.abs(value) < 1e-9;
  const sign = value > 0 ? '+' : (value < 0 ? '−' : '');
  let cls = '';
  if (!isZero || !neutralWhenZero) {
    cls = value > 0 ? 'pos' : 'neg';
  }
  let body;
  if (kind === 'pct') body = (value * 100).toFixed(digits) + '%';
  else if (kind === 'brl') body = fmtBRL(Math.abs(value));
  else body = Math.abs(value).toFixed(digits);
  return <span className={cls}>{sign}{body}</span>;
};

/* ====================== Sortable table header ====================== */
const SortHead = ({ label, sortKey, current, setCurrent, align = 'left', className = '' }) => {
  const isActive = current.key === sortKey;
  const dir = isActive ? current.dir : null;
  const handle = () => {
    if (isActive) setCurrent({ key: sortKey, dir: dir === 'asc' ? 'desc' : 'asc' });
    else setCurrent({ key: sortKey, dir: 'desc' });
  };
  return (
    <th className={`sortable ${align === 'right' ? 'num' : ''} ${className}`} onClick={handle}>
      {label}
      <span className="sort-arrow" style={{ visibility: isActive ? 'visible' : 'hidden' }}>
        {dir === 'asc' ? '↑' : '↓'}
      </span>
    </th>
  );
};

/* ====================== ALERTS BANNER (G10) ====================== */
const AlertsBanner = ({ D }) => {
  const alertas = useMemo(() => compileAlertas(D), [D]);
  const [showAll, setShowAll] = useState(false);
  if (!alertas.length) return null;

  const displayed = showAll ? alertas : alertas.slice(0, 4);
  const sevStyle = {
    'CORRIGIR': { bg: 'var(--bad-bg)', border: 'var(--bad)', icon: 'alert' },
    'VAR_PL':   { bg: 'var(--warn-bg)', border: 'var(--warn)', icon: 'alert' },
    'RENT_ZERO':{ bg: 'var(--bad-bg)', border: 'var(--bad)', icon: 'x-circle' },
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon name="alert" size={13} />
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-1)' }}>
          Alertas do mês ({alertas.length})
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {displayed.map((a, i) => {
          const s = sevStyle[a.type] || { bg: 'transparent', border: 'var(--ink-4)' };
          return (
            <div key={a.nome + '_' + i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 6,
              padding: '6px 10px', background: s.bg,
              borderLeft: '2px solid ' + s.border,
              fontSize: 12, lineHeight: 1.4, borderRadius: 'var(--r)',
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 11, flexShrink: 0, color: 'var(--ink-1)' }}>
                {a.nome}
              </span>
              <span style={{ color: 'var(--ink-2)' }}>{a.text}</span>
            </div>
          );
        })}
      </div>
      {alertas.length > 4 && (
        <button onClick={() => setShowAll(!showAll)} style={{
          background: 'none', border: 'none', color: 'var(--ink-3)',
          cursor: 'pointer', fontSize: 11, padding: '4px 0', marginTop: 4,
        }}>
          {showAll ? 'Mostrar menos' : 'Mostrar todos (' + alertas.length + ')'}
        </button>
      )}
    </div>
  );
};

/* ============================================================
   RESUMO
   ============================================================ */
function Resumo({ onOpen }) {
  const D = window.AUDIT_DATA;
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'status', dir: 'asc' });

  // Enriquecer carteiras com fluxo líquido calculado a partir dos details
  const carteirasFull = useMemo(() => D.carteiras.map(c => {
    const det = D.details?.[c.nome];
    const t = det?.total || {};
    const fluxoLiquido = (t.compras || 0) - (t.vendas || 0);
    return { ...c, fluxoLiquido };
  }), [D]);

  const rows = useMemo(() => {
    let r = [...carteirasFull];
    if (filter === 'liberar') r = r.filter(x => x.status === 'LIBERAR');
    if (filter === 'alerta') r = r.filter(x => x.status === 'LIBERAR COM ALERTA');
    if (filter === 'corrigir') r = r.filter(x => x.status === 'CORRIGIR');
    if (filter === 'issue') r = r.filter(x => x.status !== 'LIBERAR');
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      r = r.filter(x => x.nome.toLowerCase().includes(qq));
    }
    r.sort((a, b) => {
      const k = sort.key;
      let av = a[k], bv = b[k];
      if (k === 'status') { av = statusRank(a.status); bv = statusRank(b.status); }
      if (k === 'nome') { av = a.nome.toLowerCase(); bv = b.nome.toLowerCase(); }
      if (av == null) av = -Infinity;
      if (bv == null) bv = -Infinity;
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return r;
  }, [D, filter, q, sort]);

  const totalPlAbr = D.carteiras.reduce((s, c) => s + (c.plAbril || 0), 0);
  const totalPlMar = D.carteiras.reduce((s, c) => s + (c.plMarco || 0), 0);
  const totalVar = totalPlAbr - totalPlMar;
  const totalVarPct = totalVar / totalPlMar;

  return (
    <div data-screen-label="01 Resumo">
      <div className="view-header">
        <div>
          <h2 className="view-title">Resumo executivo</h2>
          <p className="view-sub">{D.summary.subtitle1}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="openbtn" onClick={() => {
            const rows = carteirasFull.map(c => ({
              Carteira: c.nome, Status: statusShort(c.status),
              PL_Marco: c.plMarco, PL_Abril: c.plAbril,
              Variacao_RS: c.varRS, Variacao_Pct: c.varPct != null ? (c.varPct * 100).toFixed(2) + '%' : '',
              Rent_Abril: c.rentAbril != null ? (c.rentAbril * 100).toFixed(2) + '%' : '',
              Fluxo_Liquido: c.fluxoLiquido, Achados: c.achados || ''
            }));
            downloadCSV(rows, 'carteiras_mirabaud_' + (D.summary.mesAtual || 'mes').toLowerCase());
          }} style={{ padding: '6px 12px' }}>
            <Icon name="doc" size={12} /> Exportar CSV
          </button>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
            Auditoria interna · Abril 2026
          </div>
        </div>
      </div>

      <AlertsBanner D={D} />

      <div className="kpi-row">
        <div className="kpi">
          <span className="kpi-label">Patrimônio sob auditoria</span>
          <span className="kpi-value">R$ {(totalPlAbr/1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<span style={{ fontSize: 22, color: 'var(--ink-3)', marginLeft: 4 }}>M</span></span>
          <span className="kpi-foot">
            <strong>{totalVarPct >= 0 ? '+' : '−'}{Math.abs(totalVarPct*100).toFixed(2)}%</strong>
            <span>vs. Março 2026</span>
          </span>
          <span className="kpi-spark">{D.summary.totals.total} CARTEIRAS</span>
        </div>
        <div className="kpi ok">
          <span className="kpi-label">Liberar</span>
          <span className="kpi-value">{D.summary.totals.liberar}</span>
          <span className="kpi-foot"><strong>{Math.round(100*D.summary.totals.liberar/D.summary.totals.total)}%</strong> sem ressalvas</span>
        </div>
        <div className="kpi warn">
          <span className="kpi-label">Liberar c/ alerta</span>
          <span className="kpi-value">{D.summary.totals.alerta}</span>
          <span className="kpi-foot"><strong>monitorar</strong> antes do fechamento</span>
        </div>
        <div className="kpi bad">
          <span className="kpi-label">Corrigir</span>
          <span className="kpi-value">{D.summary.totals.corrigir}</span>
          <span className="kpi-foot"><strong>bloqueia</strong> a liberação</span>
        </div>
      </div>

      <div className="tablewrap">
        <div className="tabletoolbar">
          <div className="searchbox">
            <Icon name="search" size={14} />
            <input
              placeholder="Buscar carteira…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <div className="filter-grp">
            {[
              ['all', 'Todas'],
              ['issue', 'Com ressalva'],
              ['liberar', 'Liberar'],
              ['alerta', 'Alerta'],
              ['corrigir', 'Corrigir'],
            ].map(([k, label]) => (
              <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
          <span className="toolbar-stamp">{rows.length} / {D.carteiras.length}</span>
        </div>

        <table className="ledger">
          <thead>
            <tr>
              <SortHead label="Carteira" sortKey="nome" current={sort} setCurrent={setSort} />
              <SortHead label="Status" sortKey="status" current={sort} setCurrent={setSort} />
              <SortHead label="PL Março" sortKey="plMarco" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="PL Abril" sortKey="plAbril" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="Variação R$" sortKey="varRS" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="Variação %" sortKey="varPct" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="Rent. Abril" sortKey="rentAbril" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="Fluxo líquido" sortKey="fluxoLiquido" current={sort} setCurrent={setSort} align="right" />
              <th>Achados</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => {
              const rowCls = c.status === 'CORRIGIR' ? 'row-error' : (c.status === 'LIBERAR COM ALERTA' ? 'row-alert' : '');
              return (
                <tr key={c.nome} className={`clickable ${rowCls}`} onClick={() => onOpen(c.nome)}>
                  <td className="name">{c.nome}</td>
                  <td><StatusChip status={c.status} /></td>
                  <td className="num">{fmtBRL(c.plMarco)}</td>
                  <td className="num">{fmtBRL(c.plAbril)}</td>
                  <td className="num"><Delta value={c.varRS} kind="brl" /></td>
                  <td className="num"><Delta value={c.varPct} kind="pct" /></td>
                  <td className="num">{c.rentAbril != null ? <Delta value={c.rentAbril} kind="pct" digits={2} neutralWhenZero={false} /> : <span className="dash">—</span>}</td>
                  <td className="num">
                    {c.fluxoLiquido !== 0
                      ? <span style={{ color: c.fluxoLiquido > 0 ? 'var(--ok)' : 'var(--bad)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                          {c.fluxoLiquido > 0 ? '+' : '−'}{fmtBRL(Math.abs(c.fluxoLiquido))}
                        </span>
                      : <span className="dash">—</span>}
                  </td>
                  <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>{c.achados === 'Sem ressalvas' ? <span className="muted">—</span> : c.achados}</td>
                  <td><span className="openbtn">abrir <Icon name="arrow-right" size={10} /></span></td>
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
   CONCILIAÇÃO
   ============================================================ */
function Conciliacao({ onOpen }) {
  const D = window.AUDIT_DATA;
  const [sort, setSort] = useState({ key: 'continuidade', dir: 'desc' });
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    let r = [...D.conciliacao];
    if (filter === 'issue') r = r.filter(x => (x.continuidade || 0) > 0 || (x.somaVsTotal || 0) > 0);
    if (q.trim()) r = r.filter(x => x.nome.toLowerCase().includes(q.trim().toLowerCase()));
    r.sort((a, b) => {
      const k = sort.key;
      let av = a[k], bv = b[k];
      if (k === 'status') { av = statusRank(a.status); bv = statusRank(b.status); }
      if (k === 'nome') { av = a.nome.toLowerCase(); bv = b.nome.toLowerCase(); }
      if (av == null) av = -Infinity;
      if (bv == null) bv = -Infinity;
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return r;
  }, [D, sort, filter, q]);

  const TOL = 0.003; // 0.3% tolerance
  const maxCont = Math.max(...D.conciliacao.map(c => c.continuidade || 0));
  const exceeded = D.conciliacao.filter(c => (c.continuidade || 0) > TOL).length;

  // Compute spread between performance implícita and rentabilidade reportada
  const spreads = D.conciliacao.map(c => {
    if (c.perfImplicita == null || c.rentReportada == null) return null;
    return Math.abs(c.perfImplicita - c.rentReportada);
  });
  const meanSpread = spreads.filter(s => s != null).reduce((a, b) => a + b, 0) / spreads.filter(s => s != null).length;

  return (
    <div data-screen-label="02 Conciliação">
      <div className="view-header">
        <div>
          <h2 className="view-title">Conciliação do patrimônio líquido</h2>
          <p className="view-sub">{D.summary.subtitle1.replace(/^[^.]+\.\s*/, '')} Continuidade compara saldo inicial de Abril com saldo final de Março.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="openbtn" onClick={() => {
            const rows = D.conciliacao.map(c => ({
              Carteira: c.nome, Status: statusShort(c.status),
              PL_Abril: c.plAbril, Var_Pct: c.varPct != null ? (c.varPct * 100).toFixed(2) + '%' : '',
              Continuidade_Pct: c.continuidade != null ? (c.continuidade * 100).toFixed(3) + '%' : '',
              Soma_vs_Total: c.somaVsTotal != null ? (c.somaVsTotal * 100).toFixed(3) + '%' : '',
              Perf_Implicita_Pct: c.perfImplicita != null ? (c.perfImplicita * 100).toFixed(2) + '%' : '',
              Rent_Reportada_Pct: c.rentReportada != null ? (c.rentReportada * 100).toFixed(2) + '%' : '',
              Ativos_Marco: c.nAtivosMar, Ativos_Abril: c.nAtivosAbr
            }));
            downloadCSV(rows, 'conciliacao_mirabaud_' + (D.summary.mesAtual || 'mes').toLowerCase());
          }} style={{ padding: '6px 12px' }}>
            <Icon name="doc" size={12} /> Exportar CSV
          </button>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
            Tolerância 0,30%
          </div>
        </div>
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <div className="kpi">
          <span className="kpi-label">Maior descontinuidade</span>
          <span className="kpi-value mono" style={{ fontFamily: 'var(--mono)', fontSize: 38 }}>{(maxCont * 100).toFixed(3)}<span style={{ fontSize: 18, color: 'var(--ink-3)' }}>%</span></span>
          <span className="kpi-foot"><strong>{D.conciliacao.find(c => (c.continuidade || 0) === maxCont)?.nome || '—'}</strong></span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Acima da tolerância</span>
          <span className="kpi-value">{exceeded}</span>
          <span className="kpi-foot"><strong>de {D.conciliacao.length}</strong> carteiras</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Spread médio rentabilidade</span>
          <span className="kpi-value mono" style={{ fontFamily: 'var(--mono)', fontSize: 38 }}>{(meanSpread * 100).toFixed(2)}<span style={{ fontSize: 18, color: 'var(--ink-3)' }}>pp</span></span>
          <span className="kpi-foot"><strong>implícita vs reportada</strong></span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Soma vs. total</span>
          <span className="kpi-value">{D.conciliacao.filter(c => (c.somaVsTotal || 0) === 0).length}</span>
          <span className="kpi-foot"><strong>de {D.conciliacao.length}</strong> com soma exata</span>
        </div>
      </div>

      <div className="tablewrap">
        <div className="tabletoolbar">
          <div className="searchbox">
            <Icon name="search" size={14} />
            <input placeholder="Buscar carteira…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="filter-grp">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todas</button>
            <button className={filter === 'issue' ? 'active' : ''} onClick={() => setFilter('issue')}>Com descontinuidade</button>
          </div>
          <span className="toolbar-stamp">{rows.length} / {D.conciliacao.length}</span>
        </div>

        <table className="ledger">
          <thead>
            <tr>
              <SortHead label="Carteira" sortKey="nome" current={sort} setCurrent={setSort} />
              <SortHead label="Status" sortKey="status" current={sort} setCurrent={setSort} />
              <SortHead label="PL Abril" sortKey="plAbril" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="Variação" sortKey="varPct" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="Continuidade" sortKey="continuidade" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="Soma vs Total" sortKey="somaVsTotal" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="Perf. implícita" sortKey="perfImplicita" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="Rent. reportada" sortKey="rentReportada" current={sort} setCurrent={setSort} align="right" />
              <SortHead label="Ativos Mar/Abr" sortKey="nAtivosAbr" current={sort} setCurrent={setSort} align="right" />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => {
              const cont = c.continuidade || 0;
              const overTol = cont > TOL;
              const rowCls = overTol ? 'row-alert' : '';
              const barPct = Math.min(100, (cont / (TOL * 2)) * 100);
              const barCls = overTol ? 'bad' : (cont > TOL * 0.5 ? 'warn' : '');
              return (
                <tr key={c.nome} className={`clickable ${rowCls}`} onClick={() => onOpen(c.nome)}>
                  <td className="name">{c.nome}</td>
                  <td><StatusChip status={c.status} /></td>
                  <td className="num">{fmtBRL(c.plAbril)}</td>
                  <td className="num"><Delta value={c.varPct} kind="pct" /></td>
                  <td className="num">
                    <div className="bar-cell" style={{ justifyContent: 'flex-end' }}>
                      <div className="bar-track"><div className={`bar-fill ${barCls}`} style={{ width: barPct + '%' }} /></div>
                      <span style={{ minWidth: 56, textAlign: 'right', color: overTol ? 'var(--bad)' : 'var(--ink-2)' }}>{(cont * 100).toFixed(3)}%</span>
                    </div>
                  </td>
                  <td className="num">{(c.somaVsTotal != null ? (c.somaVsTotal * 100).toFixed(3) : '—')}%</td>
                  <td className="num"><Delta value={c.perfImplicita} kind="pct" neutralWhenZero={false} /></td>
                  <td className="num"><Delta value={c.rentReportada} kind="pct" neutralWhenZero={false} /></td>
                  <td className="num" style={{ color: 'var(--ink-3)' }}>{c.nAtivosMar} / {c.nAtivosAbr}{c.nAtivosAbr !== c.nAtivosMar && <span style={{ color: c.nAtivosAbr > c.nAtivosMar ? 'var(--ok)' : 'var(--bad)', marginLeft: 4 }}>{c.nAtivosAbr > c.nAtivosMar ? '↑' : '↓'}</span>}</td>
                  <td><span className="openbtn">abrir <Icon name="arrow-right" size={10} /></span></td>
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
   ACHADOS
   ============================================================ */
function Achados({ onOpen }) {
  const D = window.AUDIT_DATA;

  // Issues only: any item with non-"-" erros, alertas, or limitacoes
  const issues = D.achados.filter(a => a.erros !== '-' || a.alertas !== '-' || a.limitacoes !== '-');
  const errosCount = D.achados.filter(a => a.erros !== '-').length;
  const alertasCount = D.achados.filter(a => a.alertas !== '-').length;
  const cleanCount = D.achados.length - issues.length;

  return (
    <div data-screen-label="03 Achados">
      <div className="view-header">
        <div>
          <h2 className="view-title">Achados da auditoria</h2>
          <p className="view-sub">Detalhamento por carteira. Erros bloqueiam a liberação. Alertas não bloqueiam, mas exigem monitoramento.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="openbtn" onClick={() => {
            const rows = D.achados.map(a => ({
              Carteira: a.nome, Status: statusShort(a.status),
              Erros: a.erros, Alertas: a.alertas, Limitacoes: a.limitacoes
            }));
            downloadCSV(rows, 'achados_mirabaud_' + (D.summary.mesAtual || 'mes').toLowerCase());
          }} style={{ padding: '6px 12px' }}>
            <Icon name="doc" size={12} /> Exportar CSV
          </button>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
            {issues.length} ocorrências
          </div>
        </div>
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="kpi bad">
          <span className="kpi-label">Erros bloqueantes</span>
          <span className="kpi-value">{errosCount}</span>
          <span className="kpi-foot"><strong>impede liberação</strong> até correção</span>
        </div>
        <div className="kpi warn">
          <span className="kpi-label">Alertas a monitorar</span>
          <span className="kpi-value">{alertasCount}</span>
          <span className="kpi-foot"><strong>não bloqueiam</strong> mas exigem revisão</span>
        </div>
        <div className="kpi ok">
          <span className="kpi-label">Carteiras limpas</span>
          <span className="kpi-value">{cleanCount}</span>
          <span className="kpi-foot"><strong>{Math.round(100*cleanCount/D.achados.length)}%</strong> sem ressalvas</span>
        </div>
      </div>

      <div className="findings-grid">
        {issues.sort((a, b) => statusRank(a.status) - statusRank(b.status)).map(a => {
          const isError = a.erros !== '-';
          const cls = isError ? 'bad' : 'warn';
          const erros = splitFindings(a.erros);
          const alertas = splitFindings(a.alertas);
          const lim = splitFindings(a.limitacoes);
          return (
            <article key={a.nome} className={`finding ${cls}`}>
              <header className="finding-head">
                <span className="finding-name">{a.nome}</span>
                <StatusChip status={a.status} />
              </header>
              {erros.length > 0 && (
                <>
                  <div className="finding-sec">{erros.length} Erro{erros.length>1?'s':''} — bloqueia</div>
                  {erros.map((e, i) => <div key={i} className="finding-text">{e}</div>)}
                </>
              )}
              {alertas.length > 0 && (
                <>
                  <div className="finding-sec">{alertas.length} Alerta{alertas.length>1?'s':''} — monitorar</div>
                  {alertas.map((e, i) => <div key={i} className="finding-text">{e}</div>)}
                </>
              )}
              {lim.length > 0 && (
                <>
                  <div className="finding-sec">Limitações conhecidas</div>
                  {lim.map((e, i) => <div key={i} className="finding-text">{e}</div>)}
                </>
              )}
              <div className="finding-foot">
                <button className="openbtn" onClick={() => onOpen(a.nome)}>
                  abrir carteira <Icon name="arrow-right" size={10} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Resumo, Conciliacao, Achados, StatusChip, Delta, SortHead });
