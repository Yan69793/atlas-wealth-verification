/* platform-comparativo.jsx — Comparativo de Período */
import React from 'react';

(() => {
  const { useState, useMemo, useEffect } = React;

  const { fmtCompactBRL, fmtPct, fmtMonthLabel, signClass, navigate, downloadCSV } = window.AtlasUtils;
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
                <th className="sticky-col" style={{ minWidth: 120 }}>Carteira</th>
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
                  <td className="sticky-col" style={{ minWidth: 120 }}>
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
  /* ============================================================
     COMPARADOR POR CARTEIRA — posição a posição

     O comparativo da casa responde "o que mudou no agregado". Esta parte
     responde "o que mudou DENTRO desta carteira", que é a pergunta de quem vai
     escrever a justificativa para o cliente.

     Regra dura: mês sem extrato em qualquer um dos lados anula a comparação.
     Sem os dois extratos não existe entrada nem saída de posição, existe
     ausência de dado, e preencher isso com movimento calculado seria fabricar
     fato. O consolidado devolve `disponivel: false` com o motivo, e a tela
     escreve o motivo.
  ============================================================ */
  function ComparativoCarteira({ code, mesA, mesB }) {
    const C = window.AtlasConsolidado;
    const { Badge } = window.AtlasUI;
    const [estado, setEstado] = useState({ fase: 'carregando', dados: null, fontes: null, erro: null });

    useEffect(() => {
      let vivo = true;
      setEstado({ fase: 'carregando', dados: null, fontes: null, erro: null });
      const id = setTimeout(() => {
        if (!vivo) return;
        try {
          const dados = C.compararCarteira(code, mesA, mesB);
          const fontes = C.fontesDaCarteira(code, mesA);
          if (vivo) setEstado({ fase: 'pronto', dados, fontes, erro: null });
        } catch (e) {
          if (vivo) setEstado({ fase: 'erro', dados: null, fontes: null, erro: e });
        }
      }, 0);
      return () => { vivo = false; clearTimeout(id); };
    }, [code, mesA, mesB]);

    if (estado.fase === 'carregando') {
      return <div className="card" style={{ color: 'var(--muted)', fontSize: '0.786rem' }}>Comparando...</div>;
    }
    if (estado.fase === 'erro') {
      return (
        <div className="banner banner--red">
          <Icon name="alert" size={16} />
          <span>Não foi possível comparar {code}. Detalhe: {String((estado.erro && estado.erro.message) || estado.erro)}</span>
        </div>
      );
    }

    const c = estado.dados;
    const f = estado.fontes;

    if (!c || !c.disponivel) {
      const motivo = c && c.motivo === 'sem-dado-em-um-dos-meses'
        ? 'Uma das duas pontas não tem extrato com patrimônio, então não há posição para comparar. Isso não significa que a carteira estava vazia.'
        : 'Mês fora da faixa com dado.';
      return (
        <EmptyState title={'Comparação indisponível para ' + code} sub={motivo} icon="info" />
      );
    }

    return (
      <div>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
          <KPITile label="PL atual" value={fmtCompactBRL(c.a.pl)} sub={fmtMonthLabel(c.mesA)} />
          <KPITile label="PL anterior" value={fmtCompactBRL(c.b.pl)} sub={fmtMonthLabel(c.mesB)} />
          <KPITile
            label="Variação"
            value={(c.deltaPl >= 0 ? '+' : '') + fmtCompactBRL(c.deltaPl)}
            sub={c.deltaPlPct == null ? 'sem base' : fmtPct(c.deltaPlPct, 2)}
          />
          <KPITile
            label="Custo"
            value={(c.deltaCusto >= 0 ? '+' : '') + fmtCompactBRL(c.deltaCusto)}
            sub="Diferença entre os dois meses"
          />
          <KPITile
            label="Status"
            value={c.mudouStatus ? 'Mudou' : 'Igual'}
            sub={c.b.status + ' para ' + c.a.status}
            variant={c.mudouStatus ? 'amber' : undefined}
          />
        </div>

        {/* Fonte A x Fonte B, sem veredito */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <div className="card-title">Fonte A contra fonte B</div>
          </div>
          {!f || !f.disponivel ? (
            <div style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
              {f && f.motivo === 'carteira-fora-da-posicao-diaria'
                ? 'Esta carteira não aparece no arquivo de posição diária, então não há segunda fonte para conferir. Não verificável, o que é diferente de conferido.'
                : 'Não há arquivo de posição diária neste ambiente, então não há segunda fonte para conferir. Não verificável, o que é diferente de conferido.'}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.786rem' }}>
                <div>
                  <div style={{ color: 'var(--muted)' }}>{f.fonteA.rotulo}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {f.fonteA.pl == null ? 'sem extrato' : fmtCompactBRL(f.fonteA.pl)}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.714rem' }}>apurado em {f.fonteA.apuradoRotulo}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)' }}>{f.fonteB.rotulo}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtCompactBRL(f.fonteB.pl)}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.714rem' }}>apurado em {f.fonteB.apuradoRotulo}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)' }}>Diferença</div>
                  <div className={signClass(f.deltaBRL)} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {f.deltaBRL == null ? '—' : (f.deltaBRL > 0 ? '+' : '') + fmtCompactBRL(f.deltaBRL)}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.714rem' }}>
                    {f.deltaPct == null ? '' : fmtPct(f.deltaPct, 2) + ' da posição diária'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
                As duas fontes são apuradas em datas diferentes por desenho
                {f.diasEntreApuracoes != null ? ', com ' + Math.abs(f.diasEntreApuracoes) + ' dia(s) de distância' : ''}
                . O sistema mostra a diferença e as duas datas, e não classifica o tamanho dela:
                a tolerância de 0,30% que o produto usa mede continuidade de um mês contra o
                anterior na mesma fonte, e aplicá-la aqui daria um veredito que ninguém calibrou.
              </div>
            </>
          )}
        </div>

        {/* Posição a posição */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="sticky-col" style={{ minWidth: 160 }}>Ativo</th>
                <th>Movimento</th>
                <th className="num">{fmtMonthLabel(c.mesA)}</th>
                <th className="num">{fmtMonthLabel(c.mesB)}</th>
                <th className="num">Variação</th>
                <th className="num">Peso agora</th>
                <th className="num">Δ peso</th>
              </tr>
            </thead>
            <tbody>
              {c.posicoes.map(p => (
                <tr key={p.ativo}>
                  <td className="sticky-col" style={{ minWidth: 160 }}>
                    <div style={{ fontSize: '0.857rem' }}>{p.ativo}</div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{p.cls}</div>
                  </td>
                  <td>
                    {p.movimento === 'entrou' && <span className="badge badge--navy">entrou</span>}
                    {p.movimento === 'saiu' && <span className="badge badge--muted">saiu</span>}
                    {p.movimento === 'permaneceu' && <span style={{ color: 'var(--muted)', fontSize: '0.714rem' }}>permaneceu</span>}
                  </td>
                  <td className="num">{p.valorA > 0 ? fmtCompactBRL(p.valorA) : '—'}</td>
                  <td className="num">{p.valorB > 0 ? fmtCompactBRL(p.valorB) : '—'}</td>
                  <td className={'num ' + signClass(p.deltaBRL)}>
                    {p.deltaBRL > 0 ? '+' : ''}{fmtCompactBRL(p.deltaBRL)}
                  </td>
                  <td className="num">{p.valorA > 0 ? fmtPct(p.pctA, 1) : '—'}</td>
                  <td className={'num ' + signClass(p.deltaPeso)}>
                    {(p.deltaPeso > 0 ? '+' : '') + fmtPct(p.deltaPeso, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function Comparativo({ location }) {
    const { useMonth, useToast } = window.AtlasContexts;
    const { selectedMonth }      = useMonth();
    const { addToast }           = useToast();

    function getPrevMonth(month) {
      const idx = D.MONTHS.indexOf(month);
      return idx > 0 ? D.MONTHS[idx - 1] : D.MONTHS[0];
    }

    const [refMonth,      setRefMonth]      = useState(selectedMonth);
    const [baselineMonth, setBaselineMonth] = useState(getPrevMonth(selectedMonth));

    /* #/comparativo?carteira=CODE abre direto na carteira pedida. É o destino
       do atalho do ranking: atalho que ignora o parâmetro e cai no agregado da
       casa é pior que não ter atalho. */
    const [carteira, setCarteira] = useState(
      () => (location && location.params && location.params.carteira) || ''
    );
    useEffect(() => {
      const pedida = (location && location.params && location.params.carteira) || '';
      if (pedida) setCarteira(pedida);
    }, [location && location.params && location.params.carteira]);

    // Seletores locais desta pagina nao devem oferecer mes sem dado (a janela
    // MONTHS vai ate Dez/26 so para aceitar ingestao do mes corrente).
    const visMonths = useMemo(() => (D.visibleMonths ? D.visibleMonths().months : D.MONTHS), []);

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

    function handleExportCSV() {
      var rows = comp.rows.map(function(r) {
        return {
          Carteira: r.code, Nome: r.name, Gerente: r.manager,
          PL_Ref: r.plA, PL_Baseline: r.plB, Var_PL: r.delta,
          Var_Pct: r.deltaPct != null ? (r.deltaPct * 100).toFixed(2) : '',
          Rent_Ref: r.rentA != null ? (r.rentA * 100).toFixed(2) : '',
          Rent_Baseline: r.rentB != null ? (r.rentB * 100).toFixed(2) : '',
          Status_Ref: r.statusA, Achados: r.nAchadosA || 0,
        };
      });
      downloadCSV(rows, 'atlas_comparativo_' + refMonth + '_vs_' + baselineMonth);
    }

    function handleExportPDF() {
      addToast('Gerando PDF para impressao...', 'info');
      window.print();
    }

    const labelA = fmtMonthLabel(refMonth);
    const labelB = fmtMonthLabel(baselineMonth);

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Análise Comparativa</div>
          <h1 className="page-title">Comparativo de Período</h1>
          <div className="page-subtitle">
            {labelA} vs {labelB} &middot; {carteira ? 'carteira ' + carteira : comp.rows.length + ' carteiras'}
          </div>
        </div>

        {/* Seletores de mês e de escopo */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <label htmlFor="comparativo-escopo" style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Escopo
            </label>
            <select
              id="comparativo-escopo"
              className="filter-select"
              value={carteira}
              onChange={e => setCarteira(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">Casa inteira</option>
              {D.CATALOG.map(p => (
                <option key={p.code} value={p.code}>{p.code} · {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Mês de referência
            </label>
            <select
              className="filter-select"
              value={refMonth}
              onChange={e => setRefMonth(e.target.value)}
            >
              {visMonths.map(m => (
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
              {visMonths.map(m => (
                <option key={m} value={m}>{fmtMonthLabel(m)}</option>
              ))}
            </select>
          </div>
        </div>

        {carteira && (
          <ComparativoCarteira code={carteira} mesA={refMonth} mesB={baselineMonth} />
        )}

        {!carteira && (
        <>
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
            <div className="split-3">
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
        <div className="split-2" style={{ marginBottom: 24 }}>
          <TopMovers title="Top 5 — Maior crescimento de PL" rows={comp.top5Altas} labelA={labelA} labelB={labelB} />
          <TopMovers title="Top 5 — Maior queda de PL"       rows={comp.top5Quedas} labelA={labelA} labelB={labelB} />
        </div>

        {/* Tabela completa */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)' }}>
            Todas as carteiras ({comp.rows.length})
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--ghost" onClick={handleExportCSV}
              style={{ fontSize: '0.786rem', padding: '6px 14px' }}>
              <Icon name="export" size={14} /> Exportar CSV
            </button>
            <button className="btn btn--ghost" onClick={handleExportPDF}
              style={{ fontSize: '0.786rem', padding: '6px 14px' }}>
              Imprimir PDF
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="sticky-col" style={{ minWidth: 150 }}>Carteira</th>
                <th>Gerente</th>
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
                  <td className="sticky-col" style={{ minWidth: 150 }}>
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
        </>
        )}
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Comparativo = Comparativo;

})();
