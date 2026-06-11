/* platform-busca.jsx — Busca por Ativo */
(() => {
  const { useState, useMemo, useEffect } = React;

  const { fmtCompactBRL, fmtPct, fmtMonthLabel, navigate } = window.AtlasUtils;
  const { EmptyState } = window.AtlasUI;
  const D = window.AtlasData;

  function Busca() {
    const { useMonth } = window.AtlasContexts;
    const { selectedMonth } = useMonth();

    const [query,         setQuery]         = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [month,         setMonth]         = useState(selectedMonth);

    useEffect(() => {
      const t = setTimeout(() => setDebouncedQuery(query), 200);
      return () => clearTimeout(t);
    }, [query]);

    const results = useMemo(() =>
      debouncedQuery.length >= 2 ? D.searchAssets(debouncedQuery, month) : [],
      [debouncedQuery, month]
    );

    // Summary
    const totalPl = useMemo(() => {
      const stats = D.dashboardStats(month);
      return stats.plTotal || 1;
    }, [month]);

    const summary = useMemo(() => {
      const carteiras = new Set();
      let valor = 0;
      results.forEach(r => {
        r.portfolios.forEach(p => carteiras.add(p.code));
        valor += r.totalValue;
      });
      return { carteiras: carteiras.size, valor, pct: valor / totalPl };
    }, [results, totalPl]);

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Pesquisa</div>
          <h1 className="page-title">Busca por Ativo</h1>
          <div className="page-subtitle">
            Localize ativos em todas as carteiras — {fmtMonthLabel(month)}
          </div>
        </div>

        {/* Barra de busca + select mês */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Ativo ou classe
            </label>
            <input
              type="search"
              className="filter-select"
              style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.857rem' }}
              placeholder='Ex: "NTN-B", "CDB", "PETR4"...'
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Mês</label>
            <select className="filter-select" value={month} onChange={e => setMonth(e.target.value)}>
              {D.MONTHS.map(m => <option key={m} value={m}>{fmtMonthLabel(m)}</option>)}
            </select>
          </div>
        </div>

        {/* Estados */}
        {debouncedQuery.length < 2 && (
          <EmptyState
            title="Digite para buscar"
            sub='Mínimo de 2 caracteres. Tente "NTN", "CDI" ou o nome de uma ação.'
            icon="search"
          />
        )}

        {debouncedQuery.length >= 2 && results.length === 0 && (
          <EmptyState
            title="Nenhum ativo encontrado"
            sub={'Nenhum resultado para "' + debouncedQuery + '" em ' + fmtMonthLabel(month) + '.'}
            icon="search"
          />
        )}

        {results.length > 0 && (
          <>
            {/* Summary bar */}
            <div style={{
              display: 'flex', gap: 24, padding: '10px 16px',
              background: 'var(--paper-mid)', borderRadius: 'var(--r-sm)',
              border: '1px solid var(--rule)', marginBottom: 16, fontSize: '0.786rem',
            }}>
              <span><strong>{results.length}</strong> ativo(s) encontrado(s)</span>
              <span><strong>{summary.carteiras}</strong> carteira(s)</span>
              <span>Valor total: <strong>{fmtCompactBRL(summary.valor)}</strong></span>
              <span>% do PL: <strong>{fmtPct(summary.pct, 2)}</strong></span>
            </div>

            {/* Resultados por ativo */}
            {results.map((r, i) => (
              <div key={r.assetName + '|' + i} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)' }}>{r.assetName}</div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 2 }}>{r.cls}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.857rem' }}>
                      {fmtCompactBRL(r.totalValue)}
                    </div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 1 }}>
                      {r.portfolios.length} carteira(s)
                    </div>
                  </div>
                </div>

                {/* Sub-tabela de carteiras */}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 130 }}>Carteira</th>
                        <th className="num">Valor</th>
                        <th className="num">% do PL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.portfolios.sort((a, b) => b.value - a.value).map(p => (
                        <tr
                          key={p.code}
                          className="clickable"
                          onClick={() => navigate('#/carteira/' + p.code)}
                        >
                          <td style={{ minWidth: 130 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{p.code}</div>
                            <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{p.name}</div>
                          </td>
                          <td className="num">{fmtCompactBRL(p.value)}</td>
                          <td className="num">{fmtPct(p.pct, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Busca = Busca;
})();
