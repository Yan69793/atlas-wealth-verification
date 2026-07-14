/* ============================================================
   TENDÊNCIA — evolução mensal fev-jun 2026, matriz de carteiras
   e achados recorrentes (mesmo motivo, meses consecutivos).
   ============================================================ */
const { useState: useStateTend, useMemo: useMemoTend, useRef: useRefTend, useEffect: useEffectTend } = React;

const CATEGORIA_LABEL = {
  'pl-conciliacao': 'Conciliação de PL',
  'cotas-sem-operacao': 'Variação sem operação',
  'alocacao': 'Mudança de alocação',
  'come-cotas': 'Come-cotas',
  'rentabilidade-zero': 'Rentabilidade ausente',
  'outro': 'Outro',
};

function TrendChart({ H }) {
  const canvasRef = useRefTend(null);
  const chartRef = useRefTend(null);

  useEffectTend(() => {
    if (!canvasRef.current || typeof Chart === 'undefined') return;
    if (chartRef.current) chartRef.current.destroy();
    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: H.mesesLabel,
        datasets: [
          { label: 'Liberar', data: H.meses.map((m) => H.agregados[m]?.liberar ?? 0), backgroundColor: '#2f6a3e' },
          { label: 'Alerta', data: H.meses.map((m) => H.agregados[m]?.alerta ?? 0), backgroundColor: '#8a6b1f' },
          { label: 'Corrigir', data: H.meses.map((m) => H.agregados[m]?.corrigir ?? 0), backgroundColor: '#8a2424' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, color: '#565d65', boxWidth: 9, usePointStyle: true, pointStyle: 'rect' } },
          tooltip: { titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#8a8f96' } },
          y: { stacked: true, grid: { color: '#e5e0d4' }, ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#8a8f96', precision: 0 } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [H]);

  return <div style={{ height: 220, position: 'relative' }}><canvas ref={canvasRef} /></div>;
}

function HeatCell({ dado }) {
  if (!dado) {
    return <td className="heat-td"><span className="heat-cell heat-absent" title="Sem book neste mês">·</span></td>;
  }
  const cls = dado.status === 'LIBERAR' ? 'heat-ok' : dado.status === 'CORRIGIR' ? 'heat-bad' : 'heat-warn';
  const label = dado.status === 'LIBERAR' ? 'L' : dado.status === 'CORRIGIR' ? 'C' : 'A';
  const tip = `${dado.status} · PL ${fmtBRL(dado.plRef)}${dado.categorias.length ? ' · ' + dado.categorias.map((c) => CATEGORIA_LABEL[c] || c).join(', ') : ''}`;
  return (
    <td className="heat-td">
      <span className={`heat-cell ${cls}`} title={tip}>{label}</span>
    </td>
  );
}

function Tendencia({ onOpen }) {
  const H = window.HISTORICO_DATA;
  const [q, setQ] = useStateTend('');
  const [sort, setSort] = useStateTend('recente');

  const ultimoMes = H.meses[H.meses.length - 1];
  const nomes = useMemoTend(() => {
    let arr = Object.keys(H.carteiras);
    if (sort === 'recente') {
      arr = arr.sort((a, b) => {
        const sa = H.carteiras[a].porMes[ultimoMes]?.status ?? 'ZZZ';
        const sb = H.carteiras[b].porMes[ultimoMes]?.status ?? 'ZZZ';
        const rank = { CORRIGIR: 0, 'LIBERAR COM ALERTA': 1, LIBERAR: 2, ZZZ: 3 };
        return (rank[sa] ?? 3) - (rank[sb] ?? 3) || a.localeCompare(b);
      });
    } else {
      arr = arr.sort((a, b) => a.localeCompare(b));
    }
    return arr;
  }, [H, sort, ultimoMes]);

  const filtered = useMemoTend(
    () => nomes.filter((n) => n.toLowerCase().includes(q.toLowerCase())),
    [nomes, q],
  );

  const contagemMeses = H.meses.length;

  return (
    <div data-screen-label="04 Tendência">
      <div className="view-header">
        <div>
          <h2 className="view-title">Tendência do ciclo</h2>
          <p className="view-sub">
            Evolução de {H.mesesLabel[0]} a {H.mesesLabel[H.mesesLabel.length - 1]} de 2026 — {Object.keys(H.carteiras).length} carteiras
            únicas ao longo do período, comparadas mês a mês em vez de só contra o mês anterior.
          </p>
        </div>
      </div>

      <div className="tablewrap" style={{ padding: '18px 20px 8px', marginBottom: 28 }}>
        <TrendChart H={H} />
      </div>

      {H.recorrentes.length > 0 && (
        <section className="detail-section" style={{ marginBottom: 28 }}>
          <h3 className="section-title">
            Exceções estruturais recorrentes — mesma limitação, meses consecutivos até {H.mesesLabel[H.mesesLabel.length - 1]}
          </h3>
          <p className="view-sub" style={{ marginBottom: 12 }}>
            Books offshore e consolidados que não trazem a tabela de rentabilidade na fonte, há 2 ou mais meses
            seguidos. A partir de {H.mesesLabel[H.mesesLabel.length - 1]}/2026, reclassificados de erro bloqueante
            para exceção conhecida e monitorada: deixam de bloquear a liberação, mas seguem rastreados até o
            custodiante incluir o dado na origem.
          </p>
          <div className="achados-block warn">
            {H.recorrentes.map((r) => (
              <div className="achado-item" key={r.nome + r.categoria}>
                <span className="achado-tag warn">{r.mesesConsecutivos}/{contagemMeses}m</span>
                <span>
                  <strong>{r.nome}</strong> — {CATEGORIA_LABEL[r.categoria] || r.categoria}, aberto desde{' '}
                  {H.mesesLabel[H.meses.indexOf(r.desdeMes)]}.
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="tablewrap">
        <div className="tabletoolbar">
          <div className="searchbox">
            <Icon name="search" size={14} />
            <input placeholder="Buscar carteira…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="filter-grp">
            <button className={sort === 'recente' ? 'active' : ''} onClick={() => setSort('recente')}>Mais críticas primeiro</button>
            <button className={sort === 'az' ? 'active' : ''} onClick={() => setSort('az')}>A–Z</button>
          </div>
          <span className="toolbar-stamp">{filtered.length} / {nomes.length} carteiras</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ledger heatmap">
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: 'var(--bg-sunken)', zIndex: 1 }}>Carteira</th>
                {H.mesesLabel.map((lbl) => <th key={lbl} className="num heat-th">{lbl}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((nome) => (
                <tr
                  key={nome}
                  className="clickable"
                  onClick={() => H.carteiras[nome].porMes[ultimoMes] && onOpen(nome)}
                >
                  <td className="name" style={{ position: 'sticky', left: 0, background: 'var(--bg-elev)' }}>{nome}</td>
                  {H.meses.map((m) => <HeatCell key={m} dado={H.carteiras[nome].porMes[m]} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="foot" style={{ marginTop: 20, fontSize: 11, color: 'var(--ink-4)' }}>
        L = Liberar sem ressalva · A = Liberar com alerta · C = Corrigir (bloqueia liberação) · · = carteira sem book neste mês.
        Clique numa linha para abrir o detalhe de {H.mesesLabel[H.mesesLabel.length - 1]} (meses anteriores só mostram resumo ao passar o mouse).
      </div>
    </div>
  );
}

window.Tendencia = Tendencia;
