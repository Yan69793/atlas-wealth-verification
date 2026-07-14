/* Carteira detail drawer */

const { useEffect } = React;

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
            <div className="drawer-eyebrow">Carteira · {window.AUDIT_DATA?.summary?.periodo?.referenciaLabel || '—'}</div>
            <h2 className="drawer-name">{d.nome}</h2>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
              <StatusChip status={status} />
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {d.periodo || (() => { const p = window.AUDIT_DATA?.summary?.periodo; return p ? `Extrato ${p.baselineLabel} → ${p.referenciaLabel}` : '—'; })()}
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
              <span className="detail-kpi-label">{'PL '+periodLabel(window.AUDIT_DATA,'base')}</span>
              <span className="detail-kpi-value">{fmtBRL(d.plBase)}</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">{'PL '+periodLabel(window.AUDIT_DATA,'ref')}</span>
              <span className="detail-kpi-value serif">{fmtBRL(d.plRef)}</span>
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
              <span className="detail-kpi-label">{'Rent. '+periodLabel(window.AUDIT_DATA,'ref')}</span>
              <span className="detail-kpi-value">{d.rentRef != null ? (d.rentRef * 100).toFixed(2) + '%' : '—'}</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">Continuidade % PL</span>
              <span className="detail-kpi-value" style={{ color: (d.continuidade || 0) > 0.003 ? 'var(--bad)' : 'var(--ink)' }}>
                {d.continuidade != null ? (d.continuidade * 100).toFixed(3) + '%' : '—'}
              </span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">Soma vs Total</span>
              <span className="detail-kpi-value">{d.somaVsTotal != null ? (d.somaVsTotal * 100).toFixed(3) + '%' : '—'}</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">Perf. implícita</span>
              <span className="detail-kpi-value">{d.perfImplicita != null ? (d.perfImplicita * 100).toFixed(2) + '%' : '—'}</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">{'Eventos fin. '+periodLabel(window.AUDIT_DATA,'ref')}</span>
              <span className="detail-kpi-value">{d.eventos != null ? fmtBRL(d.eventos) : '—'}</span>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-label">{'Impostos pagos '+periodLabel(window.AUDIT_DATA,'ref')}</span>
              <span className="detail-kpi-value">{d.impostos != null ? fmtBRL(d.impostos) : '—'}</span>
            </div>
          </div>

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
                    <th className="num">{'Saldo '+periodLabel(window.AUDIT_DATA,'base')}</th>
                    <th className="num">{'Saldo '+periodLabel(window.AUDIT_DATA,'ref')}</th>
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
                          <td className="num">{fmtBRL(grp.classe.plBase)}</td>
                          <td className="num">{fmtBRL(grp.classe.plRef)}</td>
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
                          <td className="num">{fmtBRL(a.plBase)}</td>
                          <td className="num">{fmtBRL(a.plRef)}</td>
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
                          {'Ativos saídos · presentes em '+periodLabel(window.AUDIT_DATA,'base')+', ausentes em '+periodLabel(window.AUDIT_DATA,'ref')}
                        </td>
                      </tr>
                      {saidas.map((a, i) => (
                        <tr key={'s'+i} className="ativo-row saida-row">
                          <td className="name">{a.nome}</td>
                          <td className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{a.instituicao || '—'}</td>
                          <td className="num">{fmtBRL(a.plBase)}</td>
                          <td className="num">{fmtBRL(a.plRef || 0)}</td>
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
                      <td className="num">{fmtBRL(d.total.plBase)}</td>
                      <td className="num">{fmtBRL(d.total.plRef)}</td>
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
