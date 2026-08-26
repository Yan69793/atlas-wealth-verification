/* platform-dashboard.jsx — Dashboard: KPIs, banner, chips, tabela, LineChart */
import React from 'react';

(() => {
  const { useState, useMemo, useEffect } = React;

  // AtlasData/Utils/Icons/Charts/UI carregam antes das páginas — safe no IIFE.
  // AtlasContexts é definido por platform-app.jsx (último) — acessar só dentro do componente.
  const { fmtCompactBRL, fmtPct, fmtMonthLabel, signClass, navigate, downloadCSV } = window.AtlasUtils;
  const { Icon }      = window.AtlasIcons;
  const { Badge, Chip, KPITile, EmptyState, SeloChip } = window.AtlasUI;
  const D = window.AtlasData;

  /* ============================================================
     RESUMO DA CASA — a leitura de segundos, no topo

     Ordem fixa e deliberada, é a pergunta do ritual mensal na sequência em
     que ela é feita: patrimônio verificado, carteiras analisadas, o corte
     LIBERAR / ALERTA / CORRIGIR, divergência material em reais, e onde agir.

     Os números vêm de window.AtlasConsolidado, o mesmo que alimenta o ranking.
     Painel e ranking discordando sobre quantas carteiras exigem ação seria o
     defeito clássico deste projeto, duas telas decidindo o mesmo número.
  ============================================================ */
  function ResumoCasa({ month }) {
    const C = window.AtlasConsolidado;
    const [estado, setEstado] = useState({ fase: 'carregando', dados: null, erro: null });

    useEffect(() => {
      let vivo = true;
      setEstado({ fase: 'carregando', dados: null, erro: null });
      const id = setTimeout(() => {
        if (!vivo) return;
        try {
          const dados = C.resumoCasa(month);
          if (vivo) setEstado({ fase: 'pronto', dados, erro: null });
        } catch (e) {
          if (vivo) setEstado({ fase: 'erro', dados: null, erro: e });
        }
      }, 0);
      return () => { vivo = false; clearTimeout(id); };
    }, [month]);

    if (estado.fase === 'carregando') {
      return <div className="card" style={{ marginBottom: 16, color: 'var(--muted)', fontSize: '0.786rem' }}>Apurando o mês...</div>;
    }
    if (estado.fase === 'erro') {
      return (
        <div className="banner banner--red" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={16} />
          <span>Não foi possível apurar o resumo de {fmtMonthLabel(month)}. Detalhe: {String((estado.erro && estado.erro.message) || estado.erro)}</span>
        </div>
      );
    }
    const r = estado.dados;
    if (!r || r.carteiras.total === 0) {
      return (
        <EmptyState
          title="Sem carteiras neste mês"
          sub={'Nenhuma carteira da casa existia em ' + fmtMonthLabel(month) + '.'}
          icon="search"
        />
      );
    }

    const semDado = r.carteiras.semDado;
    const conc = r.concentracao;

    function Bloco({ titulo, children, aviso, link }) {
      return (
        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: '0.714rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {titulo}
            </div>
            {link && (
              <button
                onClick={link.onClick}
                style={{ background: 'none', border: 'none', color: 'var(--navy)', cursor: 'pointer', fontSize: '0.714rem', padding: 0 }}
              >
                {link.label}
              </button>
            )}
          </div>
          {children}
          {aviso && <div style={{ fontSize: '0.714rem', color: 'var(--amber)', marginTop: 8 }}>{aviso}</div>}
        </div>
      );
    }

    function Linha({ rotulo, valor, cor, titulo }) {
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0', fontSize: '0.786rem' }} title={titulo}>
          <span style={{ color: 'var(--muted)' }}>{rotulo}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: cor || 'var(--heading)' }}>{valor}</span>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: 20 }}>
        {/* 1 e 2: patrimônio verificado e carteiras analisadas */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <KPITile
            label="Patrimônio apurado"
            value={fmtCompactBRL(r.patrimonio.total)}
            sub={r.carteiras.comDado + ' carteira(s) com extrato'}
          />
          <KPITile
            label="Liberado"
            value={fmtCompactBRL(r.patrimonio.liberado)}
            sub={fmtPct(r.patrimonio.pctLiberado, 0) + ' do apurado · ' + r.carteiras.liberar + ' carteira(s)'}
            variant="green"
            onClick={() => navigate('#/ranking')}
          />
          <KPITile
            label="Em alerta"
            value={fmtCompactBRL(r.patrimonio.emAlerta)}
            sub={r.carteiras.alerta + ' carteira(s)'}
            variant={r.carteiras.alerta > 0 ? 'amber' : undefined}
          />
          <KPITile
            label="Bloqueado"
            value={fmtCompactBRL(r.patrimonio.bloqueado)}
            sub={r.carteiras.corrigir + ' carteira(s) em CORRIGIR'}
            variant={r.carteiras.corrigir > 0 ? 'red' : undefined}
          />
          <KPITile
            label="Divergência material"
            value={fmtCompactBRL(r.divergencias.valorAbsTotal)}
            sub={r.divergencias.nMateriais + ' acima de ' + fmtPct(r.divergencias.toleranciaPct, 2) + ' do PL anterior'}
            variant={r.divergencias.nMateriais > 0 ? 'amber' : undefined}
            onClick={() => navigate('#/ranking')}
          />
        </div>

        {/* Ausência de extrato nunca fica escondida atrás de um agregado. */}
        {semDado > 0 && (
          <div className="banner banner--amber" style={{ marginTop: 12 }}>
            <Icon name="alert" size={16} />
            <span>
              {semDado} carteira(s) sem extrato com patrimônio em {fmtMonthLabel(month)}
              {' ('}{r.carteiras.semDadoCodigos.slice(0, 5).join(', ')}
              {r.carteiras.semDadoCodigos.length > 5 ? ' e mais ' + (r.carteiras.semDadoCodigos.length - 5) : ''}
              {'). '}
              Não entram no patrimônio apurado e não podem ser liberadas.
            </span>
          </div>
        )}

        {/* 3: custos, concentração, instituições */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <Bloco titulo="Custos identificados" link={{ label: 'Ver detalhamento →', onClick: () => navigate('#/custos') }}>
            <Linha rotulo="Total no mês" valor={fmtCompactBRL(r.custos.total)} />
            <Linha rotulo="Sobre o patrimônio" valor={fmtPct(r.custos.pctPl, 2)} />
          </Bloco>

          <Bloco titulo="Concentração" link={{ label: 'Detalhamento (Top 10) →', onClick: () => navigate('#/receitas') }}>
            {conc ? (
              <>
                <Linha rotulo="Top 5 carteiras" valor={fmtPct(conc.top5Pct, 1)} />
                {conc.top1 && <Linha rotulo={conc.top1.code} valor={fmtPct(conc.top1.pct, 1)} titulo={conc.top1.name} />}
                {conc.top5.slice(1, 3).map(c => (
                  <Linha key={c.code} rotulo={c.code} valor={fmtPct(c.pct, 1)} cor="var(--muted)" titulo={c.name} />
                ))}
              </>
            ) : <div style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>Não apurada neste mês.</div>}
          </Bloco>

          <Bloco titulo="Instituições">
            <Linha rotulo="Distintas" valor={String(r.instituicoes.total)} />
            {r.instituicoes.maiores.slice(0, 3).map(i => (
              <Linha
                key={i.instituicao}
                rotulo={i.instituicao.length > 22 ? i.instituicao.slice(0, 21) + '…' : i.instituicao}
                valor={fmtPct(i.pct, 1)}
                cor="var(--muted)"
                titulo={i.instituicao + ' · ' + i.nCarteiras + ' carteira(s) · ' + fmtCompactBRL(i.valor)}
              />
            ))}
          </Bloco>

          <Bloco titulo="Pendências" link={{ label: 'Ver em Cadastro & Compliance →', onClick: () => navigate('#/cadastro') }}>
            <Linha
              rotulo={r.pendencias.estimadas ? 'Pendências (estimativa)' : 'Pendências vencidas'}
              valor={(r.pendencias.estimadas ? '~' : '') + r.pendencias.vencidas}
              cor={r.pendencias.estimadas ? 'var(--muted)' : (r.pendencias.vencidas > 0 ? 'var(--amber)' : undefined)}
              titulo={r.pendencias.estimadas
                ? 'Este ambiente não tem cadastro de compliance carregado. O número é estimativa e não decide prioridade.'
                : r.pendencias.total + ' pendência(s) em ' + r.pendencias.carteiras + ' carteira(s).'}
            />
            {!r.pendencias.estimadas && (
              <Linha rotulo="Carteiras com pendência" valor={String(r.pendencias.carteiras)} />
            )}
          </Bloco>
        </div>

        {/* 4: onde agir */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <div className="card-title">Onde agir</div>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('#/ranking')}>
              Ver ranking completo
            </button>
          </div>
          {r.ondeAgir.length === 0 ? (
            <div style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
              Nenhuma carteira reprovou, ficou sem extrato, passou da tolerância de divergência,
              tem achado em aberto ou acendeu risco alto em {fmtMonthLabel(month)}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {r.ondeAgir.map(l => (
                <div
                  key={l.code}
                  className="clickable"
                  onClick={() => navigate('#/carteira/' + l.code)}
                  title={l.motivos.join('\n')}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'baseline', padding: '6px 10px',
                    border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)',
                    cursor: 'pointer', fontSize: '0.786rem',
                  }}
                >
                  <Badge status={l.status} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0 }}>{l.code}</span>
                  <span style={{ color: 'var(--body)', flex: 1 }}>{l.motivos[0] || l.name}</span>
                  {l.material && (
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)', flexShrink: 0 }}>
                      {fmtCompactBRL(l.divergenciaBRL)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ============================================================
     RANGE helpers
  ============================================================ */
  const RANGES = ['3M', '6M', '1A', '2A', 'Máx'];

  function rangeMonths(range) {
    const allM = D.MONTHS;
    const last = allM.indexOf(D.CURRENT_MONTH);
    const map = { '3M': 3, '6M': 6, '1A': 12, '2A': 24, 'Máx': allM.length };
    const n = map[range] || 6;
    const from = Math.max(0, last - n + 1);
    return allM.slice(from, last + 1);
  }

  /* ============================================================
     BANNER DE BLOQUEADAS
  ============================================================ */
  function BlockedBanner({ rows, onNavigate }) {
    const corrigir = rows.filter(r => r.status === 'CORRIGIR');
    if (!corrigir.length) return null;

    const MAX_CODES = 4;
    const shown = corrigir.slice(0, MAX_CODES);
    const extra = corrigir.length - MAX_CODES;

    return (
      <div className="banner banner--red" style={{ flexWrap: 'wrap', gap: 8 }}>
        <Icon name="alert" size={16} style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 600, marginRight: 4 }}>
          {corrigir.length === 1
            ? '1 carteira com erros bloqueantes:'
            : `${corrigir.length} carteiras com erros bloqueantes:`}
        </span>
        {shown.map(r => (
          <button
            key={r.code}
            onClick={() => navigate('#/carteira/' + r.code)}
            style={{
              background: 'none', border: '1px solid var(--red)', borderRadius: 'var(--r-sm)',
              color: 'var(--red)', padding: '1px 8px', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.786rem', fontWeight: 500,
            }}
          >
            {r.code}
          </button>
        ))}
        {extra > 0 && (
          <span
            style={{ cursor: 'pointer', textDecoration: 'underline', fontSize: '0.786rem' }}
            onClick={() => onNavigate('CORRIGIR')}
          >
            e mais {extra} →
          </span>
        )}
      </div>
    );
  }

  /* ============================================================
     ALERTAS SECTION (G10)
  ============================================================ */
  function AlertsSection({ month, onNavigate }) {
    const alertas = useMemo(() => (D.getAlertas ? D.getAlertas(month) : []), [month]);
    const [showAll, setShowAll] = useState(false);

    if (!alertas.length) return null;

    const sevStyle = {
      'CORRIGIR':    { bg: 'var(--red-bg)', border: 'rgba(139,26,26,0.2)', icon: 'alert' },
      'COM ALERTA':  { bg: 'var(--amber-bg)', border: 'rgba(139,90,0,0.2)', icon: 'info' },
      'INFO':        { bg: 'rgba(5,48,95,0.04)', border: 'rgba(5,48,95,0.1)', icon: 'info' },
    };

    const displayed = showAll ? alertas : alertas.slice(0, 4);

    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Icon name="alert" size={14} style={{ color: 'var(--amber)' }} />
          <span style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)' }}>
            Alertas do mes ({alertas.length})
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {displayed.map((a, i) => {
            var s = sevStyle[a.severity] || sevStyle['INFO'];
            return (
              <div
                key={a.code + '_' + i}
                onClick={() => onNavigate(a.code)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px',
                  background: s.bg, borderRadius: 'var(--r-sm)', border: '1px solid ' + s.border,
                  cursor: 'pointer', fontSize: '0.786rem', lineHeight: 1.4,
                }}
              >
                <Icon name={s.icon} size={12} style={{ flexShrink: 0, marginTop: 2, color: 'var(--muted)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.714rem', flexShrink: 0 }}>
                  {a.code}
                </span>
                <span style={{ color: 'var(--body)', flex: 1 }}>{a.text}</span>
              </div>
            );
          })}
        </div>
        {alertas.length > 4 && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              background: 'none', border: 'none', color: 'var(--navy)', cursor: 'pointer',
              fontSize: '0.714rem', padding: '4px 0', marginTop: 4,
            }}
          >
            {showAll ? 'Mostrar menos' : 'Mostrar todos (' + alertas.length + ')'}
          </button>
        )}
      </div>
    );
  }

  /* ============================================================
     TOOLBAR — chips + busca
  ============================================================ */
  function Toolbar({ filter, onFilter, search, onSearch, rows, month }) {
    const statusFilters = [
      { label: 'Todos', value: 'todos' },
      { label: 'Liberar', value: 'LIBERAR', variant: 'green' },
      { label: 'Com Alerta', value: 'COM ALERTA', variant: 'amber' },
      { label: 'Corrigir', value: 'CORRIGIR', variant: 'red' },
    ];

    return (
      <div className="toolbar">
        <div className="chip-group">
          {statusFilters.map(f => (
            <Chip
              key={f.value}
              label={f.label}
              active={filter === f.value}
              variant={f.variant}
              onClick={() => onFilter(f.value)}
            />
          ))}
        </div>
        <div className="toolbar-spacer" />
        <button className="btn btn--ghost" onClick={() => {
          var csvRows = rows.map(r => ({
            Carteira: r.code, Nome: r.name, Status: r.status,
            PL_Atual: r.plCurr, Variacao_Pct: r.varPct != null ? (r.varPct * 100).toFixed(2) : '',
            Rentabilidade_Pct: r.rent != null ? (r.rent * 100).toFixed(2) : '',
            vs_CDI_Pct: r.vsCDI != null ? (r.vsCDI * 100).toFixed(2) : '',
            Gestor: (r.manager && r.manager.name) || '',
            Achados: r.nAchados || 0, Receita: r.revenue || 0
          }));
          downloadCSV(csvRows, 'atlas_carteiras_' + month);
        }} style={{ fontSize: '0.786rem', padding: '6px 12px', whiteSpace: 'nowrap' }}>
          <Icon name="export" size={14} /> Exportar CSV
        </button>
        <div className="search-wrap">
          <Icon name="search" size={14} />
          <input
            type="search"
            className="search-input"
            placeholder="Buscar carteira..."
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
      </div>
    );
  }

  /* ============================================================
     TABELA DE CARTEIRAS
  ============================================================ */
  const PORTFOLIO_PREVIEW_CAP = 8;

  function PortfolioTable({ rows, sortKey, sortDir, onSort, month }) {
    const [showAll, setShowAll] = useState(false);

    if (!rows.length) {
      return <EmptyState title="Nenhuma carteira encontrada" sub="Ajuste os filtros ou a busca." icon="search" />;
    }

    const displayRows = showAll ? rows : rows.slice(0, PORTFOLIO_PREVIEW_CAP);

    function ThSort({ col, label, className }) {
      const active = sortKey === col;
      const dir = active ? sortDir : null;
      return (
        <th
          className={`sortable${active ? (dir === 'asc' ? ' sort-asc' : ' sort-desc') : ''}${className ? ' ' + className : ''}`}
          onClick={() => onSort(col)}
        >
          {label}
          <span className="th-sort-icon">{active ? (dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}</span>
        </th>
      );
    }

    return (
      <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <ThSort col="code"    label="Carteira"   className="sticky-col" />
              <ThSort col="status"  label="Status"     />
              <ThSort col="plCurr"  label="PL Atual"   className="num" />
              <ThSort col="varPct"  label="Variação"   className="num" />
              <ThSort col="plPrev"  label="PL Anterior" className="num" />
              <ThSort col="rent"    label="Rent."      className="num" />
              <ThSort col="vsCDI"   label="vs CDI"     className="num" />
              <th>Gestor</th>
              <ThSort col="nAchados" label="Achados"   className="num" />
              <ThSort col="revenue"  label="Receita"   className="num" />
            </tr>
          </thead>
          <tbody>
            {displayRows.map(r => (
              <tr
                key={r.code}
                className="clickable"
                onClick={() => navigate('#/carteira/' + r.code)}
              >
                <td className="sticky-col" style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{r.code}</div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{r.name}</div>
                </td>
                <td><Badge status={r.status} /></td>
                <td className="num">{fmtCompactBRL(r.plCurr)}</td>
                <td className={`num ${signClass(r.varPct)}`}>
                  {r.varPct > 0 ? '+' : ''}{fmtPct(r.varPct, 2)}
                </td>
                <td className="num">{fmtCompactBRL(r.plPrev)}</td>
                <td className={`num ${signClass(r.rent)}`}>{fmtPct(r.rent, 2)}</td>
                <td className={`num ${signClass(r.vsCDI)}`}>
                  {r.vsCDI > 0 ? '+' : ''}{fmtPct(r.vsCDI, 2)}
                </td>
                <td
                  className="cell-truncate"
                  style={{ fontSize: '0.786rem', color: 'var(--muted)', maxWidth: 140 }}
                  title={r.manager ? r.manager.name : undefined}
                >
                  {r.manager ? r.manager.name : '—'}
                </td>
                <td className="num">
                  {r.nAchados > 0
                    ? <span style={{ color: r.nAchados > 1 ? 'var(--red)' : 'var(--amber)', fontWeight: 600 }}>{r.nAchados}</span>
                    : <span style={{ color: 'var(--muted)' }}>—</span>
                  }
                </td>
                <td className="num">{fmtCompactBRL(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > PORTFOLIO_PREVIEW_CAP && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            background: 'none', border: 'none', color: 'var(--navy)', cursor: 'pointer',
            fontSize: '0.714rem', padding: '4px 0', marginTop: 4,
          }}
        >
          {showAll ? 'Mostrar menos' : 'Mostrar todas as carteiras (' + rows.length + ')'}
        </button>
      )}
      </>
    );
  }

  /* ============================================================
     PL TOTAL CHART — Recharts AreaChart
  ============================================================ */
  const BENCHMARKS = { CDI: { label: 'CDI', color: '#9A9188', dash: '5 3', get: m => D.CDI[m] || 0 },
    IPCA: { label: 'IPCA', color: '#276749', dash: '3 3', get: m => D.getIPCA ? D.getIPCA(m) : 0 },
    IBOV: { label: 'IBOV', color: '#C05621', dash: '2 2', get: m => D.getIBOV ? D.getIBOV(m) : 0 } };

  function PlChart({ range, onRange, month }) {
    const {
      AreaChart, Area, XAxis, YAxis,
      CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    } = window.Recharts;

    const [bench, setBench] = useState(() => {
      try { return JSON.parse(localStorage.getItem('atlas_platform_v1') || '{}')?.ui?.plBench || 'CDI'; } catch { return 'CDI'; }
    });

    useEffect(() => {
      try {
        var d = JSON.parse(localStorage.getItem('atlas_platform_v1') || '{}');
        d.ui = d.ui || {};
        d.ui.plBench = bench;
        localStorage.setItem('atlas_platform_v1', JSON.stringify(d));
      } catch {}
    }, [bench]);

    var months    = rangeMonths(range);
    var twrSeries = D.twrAgregado(months[0], months[months.length - 1]);
    var bk = BENCHMARKS[bench] || BENCHMARKS['CDI'];

    var twrRun = 1;
    var bkAcc = 1;
    var chartData = months.map(function(m, i) {
      var pl  = +((twrRun - 1) * 100).toFixed(3);
      var bv  = +((bkAcc - 1) * 100).toFixed(3);
      twrRun *= (1 + (twrSeries[i] ? twrSeries[i].twr : 0));
      bkAcc  *= (1 + bk.get(m));
      return {
        label: D.MONTH_LABELS[D.MONTHS.indexOf(m)] || m.slice(5),
        pl: pl,
        bk: bv,
      };
    });

    var tickInterval = months.length > 8 ? Math.ceil(months.length / 7) : 0;
    var fmtY  = function(v) { return v.toFixed(1) + '%'; };
    var fmtTT = function(value, name) { return [value.toFixed(2) + '%', name === 'pl' ? 'Retorno TWR' : bk.label + ' acum.']; };

    return (
      <div className="chart-wrap" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">Retorno TWR vs {bk.label}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="filter-select"
              value={bench}
              onChange={function(e) { setBench(e.target.value); }}
              style={{ fontSize: '0.714rem', padding: '3px 24px 3px 8px', minHeight: 28 }}
            >
              {Object.keys(BENCHMARKS).map(function(k) {
                return <option key={k} value={k}>{BENCHMARKS[k].label}</option>;
              })}
            </select>
            <div className="chart-range-btns" style={{ marginBottom: 0 }}>
              {RANGES.map(function(r) {
                return (
                  <button key={r} className={'range-btn' + (range === r ? ' active' : '')} onClick={function() { onRange(r); }}>
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240} debounce={50}>
          <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="dashGradPL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#05305F" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#05305F" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dashGradBK" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={bk.color} stopOpacity={0.10} />
                <stop offset="95%" stopColor={bk.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD5" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9A9188' }} interval={tickInterval} />
            <YAxis tickFormatter={fmtY} tick={{ fontSize: 11, fill: '#9A9188' }} width={46} />
            <Tooltip
              formatter={fmtTT}
              contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #E3DDD5', background: '#F9F7F4' }}
            />
            <Legend
              formatter={function(name) { return name === 'pl' ? 'Retorno TWR' : bk.label + ' acum.'; }}
              iconType="line"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Area type="monotone" dataKey="pl"
              stroke="#05305F" strokeWidth={2} fill="url(#dashGradPL)"
              dot={false} activeDot={{ r: 4, fill: '#05305F' }} />
            <Area type="monotone" dataKey="bk"
              stroke={bk.color} strokeWidth={1.5} strokeDasharray={bk.dash}
              fill="url(#dashGradBK)" dot={false} activeDot={{ r: 4, fill: bk.color }} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>
          Variacao % acumulada no periodo selecionado
          {month && D.CDI[month] != null ? ' · CDI de ' + fmtMonthLabel(month) + ': ' + fmtPct(D.CDI[month], 3) : ''}
        </div>
      </div>
    );
  }

  /* ============================================================
     DASHBOARD PAGE
  ============================================================ */
  function Dashboard() {
    const { useMonth } = window.AtlasContexts;
    const { selectedMonth } = useMonth();
    const [filter, setFilter]   = useState('todos');
    const [search, setSearch]   = useState('');
    const [sortKey, setSortKey] = useState('plCurr');
    const [sortDir, setSortDir] = useState('desc');
    const [range, setRange]     = useState(() => {
      try { return JSON.parse(localStorage.getItem('atlas_platform_v1') || '{}')?.ui?.plRange || '6M'; } catch { return '6M'; }
    });

    // Persistir range
    useEffect(() => {
      try {
        const d = JSON.parse(localStorage.getItem('atlas_platform_v1') || '{}');
        d.ui = d.ui || {};
        d.ui.plRange = range;
        localStorage.setItem('atlas_platform_v1', JSON.stringify(d));
      } catch {}
    }, [range]);

    const allRows = useMemo(() => {
      return D.CATALOG.map(p => D.getRow(p.code, selectedMonth)).filter(Boolean);
    }, [selectedMonth]);

    const filteredRows = useMemo(() => {
      let rows = allRows;
      if (filter !== 'todos') rows = rows.filter(r => r.status === filter);
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        rows = rows.filter(r =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.manager && r.manager.name.toLowerCase().includes(q))
        );
      }
      // ordenar
      rows = [...rows].sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va == null) va = sortDir === 'asc' ? Infinity : -Infinity;
        if (vb == null) vb = sortDir === 'asc' ? Infinity : -Infinity;
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
      return rows;
    }, [allRows, filter, search, sortKey, sortDir]);

    function handleSort(col) {
      if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSortKey(col); setSortDir('desc'); }
    }

    function handleFilterChange(f) {
      setFilter(f === filter ? 'todos' : f);
    }

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Verificação Mensal</div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>{fmtMonthLabel(selectedMonth)} · {D.CATALOG.length} carteiras</span>
            <SeloChip month={selectedMonth} />
          </div>
        </div>

        <ResumoCasa month={selectedMonth} />

        <BlockedBanner
          rows={allRows}
          onNavigate={f => setFilter(f)}
        />

        <AlertsSection month={selectedMonth} onNavigate={code => navigate('#/carteira/' + code)} />

        <PlChart range={range} onRange={setRange} month={selectedMonth} />

        <Toolbar
          filter={filter}
          onFilter={handleFilterChange}
          search={search}
          onSearch={setSearch}
          rows={filteredRows}
          month={selectedMonth}
        />

        <PortfolioTable
          rows={filteredRows}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          month={selectedMonth}
        />
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Dashboard = Dashboard;

})();
