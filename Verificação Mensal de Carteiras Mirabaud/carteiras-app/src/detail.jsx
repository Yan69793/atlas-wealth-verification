/* Carteira detail drawer */

const { useEffect } = React;


/* ── Decomposição da variação: waterfall horizontal ─────────────────────────
   Fórmula: PL Final = PL Inicial + AportesLíquidos + EventosFinanceiros
                       − ImpostosPagos + PerformanceMercado
   ─────────────────────────────────────────────────────────────────────────── */
function DecomposicaoVariacao({ d }) {
  const t = (d && d.total) ? d.total : {};

  const plInicial   = t.plMarco  || 0;
  const plFinal     = t.plAbril  || 0;
  const varTotal    = plFinal - plInicial;
  const aportes     = (t.compras || 0) - (t.vendas || 0);
  const eventos     = t.eventos  || 0;
  const impostosVal = t.impostos || 0;
  const perfMercado = varTotal - aportes - eventos + impostosVal;

  const items = [
    { label: 'PL Inicial (Março)',     value: plInicial,   tipo: 'base',  desc: 'Saldo de fechamento do mês anterior' },
    { label: 'Aportes líquidos',       value: aportes,     tipo: 'flow',  desc: aportes >= 0 ? 'Compras − vendas (entrada líquida)' : 'Vendas > compras (saída líquida)' },
    { label: 'Eventos financeiros',    value: eventos,     tipo: 'event', desc: 'Cupons, dividendos FII, amortizações' },
    { label: 'Impostos pagos',         value: -impostosVal, tipo: 'tax',  desc: 'IR, IOF e come-cotas do período' },
    { label: 'Performance de mercado', value: perfMercado, tipo: 'perf',  desc: 'Marcação a mercado + carrego implícito (residual)' },
    { label: 'PL Final (Abril)',       value: plFinal,     tipo: 'total', desc: 'Saldo de fechamento do mês corrente' },
  ];

  const drivers = items.filter(i => i.tipo !== 'base' && i.tipo !== 'total');
  const maxAbs = Math.max(...drivers.map(i => Math.abs(i.value)), 1);

  const colorPos = 'var(--ok)';
  const colorNeg = 'var(--bad)';
  const colorEvent = '#5B88C9';

  return (
    <section className="detail-section">
      <h3 className="section-title">Decomposição da variação do PL</h3>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 16, lineHeight: 1.5 }}>
        Como o patrimônio se moveu de <strong>Março</strong> para <strong>Abril</strong>, discriminando cada origem.
      </p>
      <div className="decomp-grid">
        {items.map((item, idx) => {
          const isBase  = item.tipo === 'base';
          const isTotal = item.tipo === 'total';
          const isPL    = isBase || isTotal;
          const barPct  = isPL ? 0 : Math.min(100, (Math.abs(item.value) / maxAbs) * 100);
          const positive = item.value >= 0;
          let barColor = positive ? colorPos : colorNeg;
          if (item.tipo === 'event') barColor = colorEvent;
          if (item.tipo === 'tax')   barColor = colorNeg;
          const signStr = isBase ? '' : (positive ? '+' : '−');
          const absVal  = Math.abs(item.value);

          return (
            <div key={idx} className={'decomp-row ' + item.tipo}>
              <div className="decomp-label">
                <span className="decomp-name">{item.label}</span>
                <span className="decomp-desc">{item.desc}</span>
              </div>
              <div className="decomp-bar-wrap">
                {!isPL && (
                  <div className="decomp-track">
                    <div className="decomp-fill" style={{ width: barPct + '%', background: barColor, opacity: 0.85 }} />
                  </div>
                )}
              </div>
              <div className={'decomp-value' + (isPL ? ' pl-value' : (positive ? ' pos' : ' neg'))}>
                {signStr}{fmtBRL(absVal)}
              </div>
              <div className="decomp-pct" style={{ color: positive ? colorPos : colorNeg }}>
                {isPL ? '' : ((positive ? '+' : '−') + ((absVal / (plInicial || 1)) * 100).toFixed(2) + '%')}
              </div>
            </div>
          );
        })}
      </div>
      <div className="decomp-nota">
        Rentabilidade reportada: <strong>{((d.rentAbril || 0) * 100).toFixed(2)}%</strong>
        {' · '}
        Performance implícita: <strong>{((d.perfImplicita || perfMercado / (plInicial || 1)) * 100).toFixed(2)}%</strong>
      </div>
    </section>
  );
}

function CarteiraDetail({ nome, onClose }) {
  const D = window.AUDIT_DATA;
  const d = D.details[nome];
  const achado = D.achados.find(a => a.nome === nome);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!d) return null;
  const status = d.status?.replace(/^Status,\s*/, '') || (D.carteiras.find(c => c.nome === nome)?.status);

  const erros = splitFindings(achado?.erros);
  const alertas = splitFindings(achado?.alertas);
  const lim = splitFindings(achado?.limitacoes);
  const isClean = erros.length === 0 && alertas.length === 0 && lim.length === 0;
  const achadosBlockCls = erros.length > 0 ? 'bad' : (alertas.length > 0 ? 'warn' : 'ok');

  // Group ativos
  const classGroups = [];
  let saidas = [];
  d.ativos.forEach(a => {
    if (a.type === 'classe') {
      classGroups.push({ classe: a, items: [] });
    } else if (a.type === 'ativo') {
      if (classGroups.length === 0) classGroups.push({ classe: null, items: [] });
      classGroups[classGroups.length - 1].items.push(a);
    } else if (a.type === 'saida') {
      saidas.push(a);
    }
  });

  return (
    <>
      <div className="drawer-scrim open" onClick={onClose} />
      <aside className="drawer open">
        <header className="drawer-header">
          <div>
            <div className="drawer-eyebrow">Carteira · Abril 2026</div>
            <h2 className="drawer-name">{d.nome}</h2>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
              <StatusChip status={status} />
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {d.periodo || 'Extrato Março 31/03/2026 → Abril 30/04/2026'}
              </span>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="drawer-body">
          {/* KPI grid */}
          <div className="detail-kpis">
            <div className="detail-kpi">
              <span className="detail-kpi-label">PL Março</span>
              <span className="detail-kpi-value">{fmtBRL(d.plMarco)}</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">PL Abril</span>
              <span className="detail-kpi-value serif">{fmtBRL(d.plAbril)}</span>
            </div>
            <div className={`detail-kpi ${(d.varRS || 0) >= 0 ? 'pos' : 'neg'}`}>
              <span className="detail-kpi-label">Variação R$</span>
              <span className="detail-kpi-value">{(d.varRS || 0) >= 0 ? '+' : '−'}{fmtBRL(Math.abs(d.varRS || 0))}</span>
            </div>
            <div className={`detail-kpi ${(d.varPct || 0) >= 0 ? 'pos' : 'neg'}`}>
              <span className="detail-kpi-label">Variação %</span>
              <span className="detail-kpi-value">{(d.varPct || 0) >= 0 ? '+' : '−'}{Math.abs((d.varPct || 0) * 100).toFixed(2)}%</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">Rent. Abril</span>
              <span className="detail-kpi-value">{((d.rentAbril || 0) * 100).toFixed(2)}%</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">Continuidade % PL</span>
              <span className="detail-kpi-value" style={{ color: (d.continuidade || 0) > 0.003 ? 'var(--bad)' : 'var(--ink)' }}>
                {((d.continuidade || 0) * 100).toFixed(3)}%
              </span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">Soma vs Total</span>
              <span className="detail-kpi-value">{((d.somaVsTotal || 0) * 100).toFixed(3)}%</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">Perf. implícita</span>
              <span className="detail-kpi-value">{((d.perfImplicita || 0) * 100).toFixed(2)}%</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">Eventos fin. Abr</span>
              <span className="detail-kpi-value">{d.eventos != null ? fmtBRL(d.eventos) : '—'}</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">Impostos pagos Abr</span>
              <span className="detail-kpi-value">{d.impostos != null ? fmtBRL(d.impostos) : '—'}</span>
            </div>
          </div>

          {/* Decomposição */}
          <DecomposicaoVariacao d={d} />

          {/* Achados block */}
          <section className="detail-section">
            <h3 className="section-title">Achados desta carteira</h3>
            <div className={`achados-block ${achadosBlockCls}`}>
              {isClean ? (
                <div className="achado-item">
                  <span className="achado-tag" style={{ color: 'var(--ok)' }}>Limpo</span>
                  <span>{d.achadosText || 'Sem ressalvas, conciliação dentro da tolerância.'}</span>
                </div>
              ) : (
                <>
                  {erros.map((e, i) => (
                    <div key={'e'+i} className="achado-item">
                      <span className="achado-tag bad">Erro</span>
                      <span>{e}</span>
                    </div>
                  ))}
                  {alertas.map((e, i) => (
                    <div key={'a'+i} className="achado-item">
                      <span className="achado-tag warn">Alerta</span>
                      <span>{e}</span>
                    </div>
                  ))}
                  {lim.map((e, i) => (
                    <div key={'l'+i} className="achado-item">
                      <span className="achado-tag">Limitação</span>
                      <span>{e}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>

          {/* Ativos table */}
          <section className="detail-section">
            <h3 className="section-title">Composição por classe e ativo</h3>
            <div className="tablewrap">
              <table className="ledger ativos">
                <thead>
                  <tr>
                    <th>Classe / Ativo</th>
                    <th>Instituição</th>
                    <th className="num">Saldo Março</th>
                    <th className="num">Saldo Abril</th>
                    <th className="num">Diferença</th>
                    <th className="num">Variação %</th>
                    <th className="num">Compras</th>
                    <th className="num">Vendas</th>
                    <th className="num">Eventos</th>
                    <th className="num">Impostos</th>
                    <th className="num">Part. %</th>
                  </tr>
                </thead>
                <tbody>
                  {classGroups.map((grp, gi) => (
                    <React.Fragment key={gi}>
                      {grp.classe && (
                        <tr className="classe-row">
                          <td className="name">{grp.classe.classe}</td>
                          <td></td>
                          <td className="num">{fmtBRL(grp.classe.plMarco)}</td>
                          <td className="num">{fmtBRL(grp.classe.plAbril)}</td>
                          <td className="num"><Delta value={grp.classe.diff} kind="brl" /></td>
                          <td className="num"><Delta value={grp.classe.varPct} kind="pct" /></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td className="num">{grp.classe.part != null ? (grp.classe.part * 100).toFixed(2) + '%' : '—'}</td>
                        </tr>
                      )}
                      {grp.items.map((a, i) => (
                        <tr key={i} className="ativo-row">
                          <td className="name">{a.nome}</td>
                          <td className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>{a.instituicao || '—'}</td>
                          <td className="num">{fmtBRL(a.plMarco)}</td>
                          <td className="num">{fmtBRL(a.plAbril)}</td>
                          <td className="num"><Delta value={a.diff} kind="brl" /></td>
                          <td className="num"><Delta value={a.varPct} kind="pct" /></td>
                          <td className="num">{a.compras ? fmtBRL(a.compras) : <span className="dash">—</span>}</td>
                          <td className="num">{a.vendas ? fmtBRL(a.vendas) : <span className="dash">—</span>}</td>
                          <td className="num">{a.eventos ? fmtBRL(a.eventos) : <span className="dash">—</span>}</td>
                          <td className="num">{a.impostos ? fmtBRL(a.impostos) : <span className="dash">—</span>}</td>
                          <td className="num">{a.part != null && a.part !== 0 ? (a.part * 100).toFixed(2) + '%' : <span className="dash">—</span>}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {saidas.length > 0 && (
                    <>
                      <tr className="classe-row">
                        <td className="name" colSpan={11} style={{ fontSize: 12, fontFamily: 'var(--mono)', fontStyle: 'normal', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                          Ativos saídos · presentes em Março, ausentes em Abril
                        </td>
                      </tr>
                      {saidas.map((a, i) => (
                        <tr key={'s'+i} className="ativo-row saida-row">
                          <td className="name">{a.nome}</td>
                          <td className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{a.instituicao || '—'}</td>
                          <td className="num">{fmtBRL(a.plMarco)}</td>
                          <td className="num">{fmtBRL(a.plAbril || 0)}</td>
                          <td className="num"><Delta value={a.diff} kind="brl" /></td>
                          <td className="num"><Delta value={a.varPct} kind="pct" /></td>
                          <td className="num">{a.compras ? fmtBRL(a.compras) : <span className="dash">—</span>}</td>
                          <td className="num">{a.vendas ? fmtBRL(a.vendas) : <span className="dash">—</span>}</td>
                          <td className="num">{a.eventos ? fmtBRL(a.eventos) : <span className="dash">—</span>}</td>
                          <td className="num">{a.impostos ? fmtBRL(a.impostos) : <span className="dash">—</span>}</td>
                          <td className="num"><span className="dash">—</span></td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
                {d.total && (
                  <tfoot>
                    <tr>
                      <td className="name">Total</td>
                      <td></td>
                      <td className="num">{fmtBRL(d.total.plMarco)}</td>
                      <td className="num">{fmtBRL(d.total.plAbril)}</td>
                      <td className="num"><Delta value={d.total.diff} kind="brl" /></td>
                      <td className="num"><Delta value={d.total.varPct} kind="pct" /></td>
                      <td className="num">{d.total.compras ? fmtBRL(d.total.compras) : '—'}</td>
                      <td className="num">{d.total.vendas ? fmtBRL(d.total.vendas) : '—'}</td>
                      <td className="num">{d.total.eventos ? fmtBRL(d.total.eventos) : '—'}</td>
                      <td className="num">{d.total.impostos ? fmtBRL(d.total.impostos) : '—'}</td>
                      <td className="num">100,00%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

window.CarteiraDetail = CarteiraDetail;
