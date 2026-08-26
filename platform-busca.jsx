/* platform-busca.jsx — Rastreador de Ativos
 *
 * Era uma busca que respondia "quem tem este papel e quanto". Passa a
 * responder a pergunta que o fechamento faz de verdade: quem tem este papel,
 * que peso ele tem em cada carteira, o que mudou desde o mês anterior, e essas
 * carteiras estão limpas.
 *
 * É o elo Ativo do fluxo, e o único lugar do sistema que atravessa a casa
 * inteira a partir de um papel em vez de a partir de uma carteira.
 *
 * Nada é calculado aqui. Quem cruza é window.AtlasConsolidado.
 */
import React from 'react';

(() => {
  const { useState, useMemo, useEffect } = React;

  const { fmtCompactBRL, fmtPct, fmtMonthLabel, signClass, navigate, downloadCSV } = window.AtlasUtils;
  const { Icon } = window.AtlasIcons;
  const { Badge, EmptyState, Spinner } = window.AtlasUI;
  const D = window.AtlasData;

  function CelulaVariacao({ c }) {
    /* Sem mês base, "entrou" seria invenção: o papel pode estar ali há anos.
       Ausência de base é dita, não preenchida. */
    if (c.valorAnterior === null) {
      return <span style={{ color: 'var(--muted)' }} title="Não há mês anterior nesta série para comparar.">sem base</span>;
    }
    if (c.entrou) {
      return <span style={{ color: 'var(--navy)', fontWeight: 600 }} title="Posição não existia no mês anterior.">entrou</span>;
    }
    if (Math.abs(c.deltaBRL) < 1) return <span style={{ color: 'var(--muted)' }}>—</span>;
    return (
      <span className={signClass(c.deltaBRL)} title={'De ' + fmtCompactBRL(c.valorAnterior) + ' para ' + fmtCompactBRL(c.valor) + '.'}>
        {c.deltaBRL > 0 ? '+' : ''}{fmtCompactBRL(c.deltaBRL)}
      </span>
    );
  }

  function CelulaSituacao({ c }) {
    const partes = [];
    if (c.material) partes.push('divergência material');
    if (c.nBloqueios > 0) partes.push(c.nBloqueios + ' achado em aberto');
    if (c.noEscuro) partes.push('sem cobertura de emissor');
    const risco = c.sinais.length + c.creditos.length;
    if (risco > 0) partes.push(risco + ' sinal(is) sobre este papel');
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge status={c.status} />
        {partes.length > 0 && (
          <span style={{ fontSize: '0.714rem', color: 'var(--amber)' }}>{partes.join(' · ')}</span>
        )}
      </div>
    );
  }

  function Rastreador({ location }) {
    const { useMonth } = window.AtlasContexts;
    const { selectedMonth } = useMonth();
    const C = window.AtlasConsolidado;

    const inicial = (location && location.params && location.params.ativo) || '';
    const [query, setQuery] = useState(inicial);
    const [termo, setTermo] = useState(inicial);
    const [month, setMonth] = useState(selectedMonth);
    const [estado, setEstado] = useState({ fase: 'ocioso', grupos: [], erro: null });

    const visMonths = useMemo(() => (D.visibleMonths ? D.visibleMonths().months : D.MONTHS), []);

    useEffect(() => {
      const t = setTimeout(() => setTermo(query), 200);
      return () => clearTimeout(t);
    }, [query]);

    /* Troca de mês na topbar acompanha a tela, senão o usuário compara o papel
       de um mês com o cabeçalho de outro. */
    useEffect(() => { setMonth(selectedMonth); }, [selectedMonth]);

    useEffect(() => {
      if (termo.trim().length < 2) {
        setEstado({ fase: 'ocioso', grupos: [], erro: null });
        return;
      }
      let vivo = true;
      setEstado({ fase: 'carregando', grupos: [], erro: null });
      const id = setTimeout(() => {
        if (!vivo) return;
        try {
          const grupos = C.rastrearAtivo(termo, month);
          if (vivo) setEstado({ fase: 'pronto', grupos, erro: null });
        } catch (e) {
          if (vivo) setEstado({ fase: 'erro', grupos: [], erro: e });
        }
      }, 0);
      return () => { vivo = false; clearTimeout(id); };
    }, [termo, month]);

    const resumo = useMemo(() => {
      const carteiras = new Set();
      let valor = 0, pct = 0, comProblema = 0;
      estado.grupos.forEach(g => {
        g.carteiras.forEach(c => { carteiras.add(c.code); });
        valor += g.valorTotal;
        pct += g.pctCasa;
        comProblema += g.nCarteirasComProblema;
      });
      return { ativos: estado.grupos.length, carteiras: carteiras.size, valor, pct, comProblema };
    }, [estado.grupos]);

    function exportar() {
      const linhas = [];
      estado.grupos.forEach(g => {
        g.carteiras.forEach(c => {
          linhas.push({
            Ativo: g.ativo,
            Classe: g.cls,
            Mes: month,
            Carteira: c.code,
            Nome: c.name,
            Valor: c.valor,
            Pct_Carteira: (c.pctCarteira * 100).toFixed(4),
            Pct_Casa: (c.pctCasa * 100).toFixed(4),
            Valor_Mes_Anterior: c.valorAnterior === null ? 'sem base' : c.valorAnterior,
            Variacao: c.valorAnterior === null ? 'sem base' : c.deltaBRL,
            Status_Carteira: c.status,
            Divergencia_Material: c.material ? 'sim' : 'nao',
            Achados_Abertos: c.nBloqueios,
            Sem_Cobertura_Emissor: c.noEscuro ? 'sim' : 'nao',
            Sinais_Sobre_O_Papel: c.sinais.length + c.creditos.length,
          });
        });
      });
      downloadCSV(linhas, 'atlas_rastreador_' + month);
    }

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Exposição transversal</div>
          <h1 className="page-title">Rastreador de Ativos</h1>
          <div className="page-subtitle">
            Um papel, todas as carteiras expostas, o peso em cada uma e o que a verificação
            disse sobre elas. Apuração de {fmtMonthLabel(month)}.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label htmlFor="rastreador-q" style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Ativo ou classe
            </label>
            <input
              id="rastreador-q"
              type="search"
              className="filter-select"
              style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.857rem' }}
              placeholder='Ex: "NTN-B", "CDB", "Fundo DI"...'
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="rastreador-mes" style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Mês</label>
            <select id="rastreador-mes" className="filter-select" value={month} onChange={e => setMonth(e.target.value)}>
              {visMonths.map(m => <option key={m} value={m}>{fmtMonthLabel(m)}</option>)}
            </select>
          </div>
          {estado.fase === 'pronto' && estado.grupos.length > 0 && (
            <button className="btn btn--ghost" onClick={exportar} style={{ fontSize: '0.786rem', padding: '6px 12px' }}>
              <Icon name="export" size={14} /> Exportar CSV
            </button>
          )}
        </div>

        {estado.fase === 'ocioso' && (
          <EmptyState
            title="Digite para rastrear"
            sub='Mínimo de 2 caracteres. Tente "NTN", "CDB" ou o nome de um fundo.'
            icon="search"
          />
        )}

        {estado.fase === 'carregando' && <Spinner />}

        {estado.fase === 'erro' && (
          <div className="banner banner--red">
            <Icon name="alert" size={16} />
            <span>
              Não foi possível rastrear "{termo}" em {fmtMonthLabel(month)}.
              Detalhe: {String((estado.erro && estado.erro.message) || estado.erro)}
            </span>
          </div>
        )}

        {estado.fase === 'pronto' && estado.grupos.length === 0 && (
          <EmptyState
            title="Nenhum ativo encontrado"
            sub={'Nada com "' + termo + '" nas carteiras de ' + fmtMonthLabel(month) + '. O papel pode não existir neste mês, e isso é diferente de exposição zero.'}
            icon="search"
          />
        )}

        {estado.fase === 'pronto' && estado.grupos.length > 0 && (
          <>
            <div className="summary-bar" style={{ marginBottom: 16 }}>
              <div className="summary-item">
                <div className="summary-item-label">Ativos</div>
                <div className="summary-item-value">{resumo.ativos}</div>
              </div>
              <div className="summary-item">
                <div className="summary-item-label">Carteiras expostas</div>
                <div className="summary-item-value">{resumo.carteiras}</div>
              </div>
              <div className="summary-item">
                <div className="summary-item-label">Valor exposto</div>
                <div className="summary-item-value">{fmtCompactBRL(resumo.valor)}</div>
              </div>
              <div className="summary-item">
                <div className="summary-item-label">Do patrimônio da casa</div>
                <div className="summary-item-value">{fmtPct(resumo.pct, 2)}</div>
              </div>
              <div className="summary-item">
                <div className="summary-item-label">Carteiras com problema</div>
                <div className="summary-item-value" style={{ color: resumo.comProblema > 0 ? 'var(--amber)' : undefined }}>
                  {resumo.comProblema}
                </div>
              </div>
            </div>

            {estado.grupos.map((g, i) => (
              <div key={g.ativo + '|' + i} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)' }}>{g.ativo}</div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 2 }}>
                      {g.cls} · {g.nCarteiras} carteira(s) · maior peso {fmtPct(g.maiorPeso, 1)} numa carteira
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.857rem' }}>
                      {fmtCompactBRL(g.valorTotal)}
                    </div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 1 }}>
                      {fmtPct(g.pctCasa, 2)} do patrimônio da casa
                    </div>
                  </div>
                </div>

                {!g.intelApurada && (
                  <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginBottom: 8 }}>
                    Sinais de risco não apurados neste ambiente, então a ausência de alerta sobre
                    este papel não significa papel sem risco.
                  </div>
                )}

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 140 }}>Carteira</th>
                        <th className="num">Posição</th>
                        <th className="num">% da carteira</th>
                        <th className="num">% da casa</th>
                        <th className="num">vs mês anterior</th>
                        <th>Situação da carteira</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.carteiras.map(c => (
                        <tr key={c.code} className="clickable" onClick={() => navigate('#/carteira/' + c.code)}>
                          <td style={{ minWidth: 140 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{c.code}</div>
                            <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{c.name}</div>
                          </td>
                          <td className="num">{fmtCompactBRL(c.valor)}</td>
                          <td className="num">{fmtPct(c.pctCarteira, 2)}</td>
                          <td className="num">{fmtPct(c.pctCasa, 3)}</td>
                          <td className="num"><CelulaVariacao c={c} /></td>
                          <td><CelulaSituacao c={c} /></td>
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
  window.AtlasPages.Busca = Rastreador;
})();
