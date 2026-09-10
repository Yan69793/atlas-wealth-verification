/* platform-ranking.jsx — Ranking de Criticidade
 *
 * Responde "por onde eu começo o fechamento deste mês". Ordena por fato
 * observável, na ordem que a retaguarda usaria: status da verificação, depois
 * divergência em reais, depois achado bloqueante em aberto, depois risco alto,
 * depois pendência cadastral, depois custo.
 *
 * Três coisas que esta tela não faz, de propósito:
 *
 * 1. Não inventa nota de 0 a 100. Já existe uma escala dessas no motor onde
 *    100 é BOM. Uma segunda com o mesmo nome diria o contrário na mesma tela.
 * 2. Não calcula nada. Quem decide é window.AtlasConsolidado. Duas telas
 *    decidindo o mesmo número já custou caro aqui duas vezes.
 * 3. Não trata ausência como aprovação. Carteira sem extrato aparece como
 *    SEM DADO, acima de COM ALERTA na ordem, porque trava o fechamento.
 *
 * O último elo é Ação. O ranking não cria fila nova: deposita na fila de
 * oportunidade que já existe, com dono, prazo e status. Prioridade sem
 * responsável é metade do valor do fechamento mensal.
 */
import React from 'react';

(() => {
  const { useState, useMemo, useEffect } = React;

  const { fmtCompactBRL, fmtBRL, fmtPct, fmtMonthLabel, signClass, navigate, downloadCSV } = window.AtlasUtils;
  const { Icon } = window.AtlasIcons;
  const { Badge, Chip, KPITile, EmptyState, Spinner } = window.AtlasUI;

  const CRITERIOS = [
    { id: 'criticidade',   label: 'Criticidade',   ajuda: 'Status, depois divergência em reais, depois achado bloqueante, depois risco alto, depois pendência, depois custo.' },
    { id: 'materialidade', label: 'Materialidade', ajuda: 'Maior divergência em reais primeiro.' },
    { id: 'custo',         label: 'Custo',         ajuda: 'Maior custo sobre o patrimônio primeiro.' },
    { id: 'pendencias',    label: 'Pendências',    ajuda: 'Mais pendências cadastrais vencidas primeiro.' },
    { id: 'intel',         label: 'Risco',         ajuda: 'Mais sinais e eventos de crédito em severidade alta primeiro.' },
    { id: 'patrimonio',    label: 'Patrimônio',    ajuda: 'Maior patrimônio primeiro.' },
  ];

  const FILTROS = [
    { id: 'acao',       label: 'Exigem ação' },
    { id: 'todos',      label: 'Todas' },
    { id: 'CORRIGIR',   label: 'Corrigir',   variant: 'red' },
    { id: 'SEM DADO',   label: 'Sem dado' },
    { id: 'COM ALERTA', label: 'Com alerta', variant: 'amber' },
    { id: 'LIBERAR',    label: 'Liberar',    variant: 'green' },
  ];

  /* Mesma regra do "onde agir" do painel. Vem do consolidado para as duas
     telas não divergirem sobre o que conta como ação. */
  function exigeAcao(l) {
    return !!window.AtlasConsolidado.acaoDaCarteira(l);
  }

  function CelulaDivergencia({ linha }) {
    if (linha.semDado) return <span style={{ color: 'var(--muted)' }}>—</span>;
    /* Corte igual ao da ordenação, que é centavo. Esconder valor que decide
       posição foi o defeito pego na primeira abertura desta tela. */
    if (linha.divergenciaAbsBRL === 0) return <span style={{ color: 'var(--muted)' }}>—</span>;
    const titulo = 'PL reportado ' + fmtBRL(linha.pl)
      + ' menos PL esperado ' + fmtBRL(linha.plEsperado)
      + '. Esperado = PL anterior reportado × (1 + rentabilidade) + movimentação.';
    return (
      <span title={titulo} style={{ cursor: 'help' }}>
        <span className={signClass(linha.divergenciaBRL)} style={{ fontWeight: linha.material ? 600 : 400 }}>
          {linha.divergenciaBRL > 0 ? '+' : ''}{fmtCompactBRL(linha.divergenciaBRL)}
        </span>
        <span style={{ display: 'block', fontSize: '0.714rem', color: linha.material ? 'var(--red)' : 'var(--muted)' }}>
          {fmtPct(linha.divergenciaPct, 2)}{linha.material ? ' · material' : ''}
        </span>
      </span>
    );
  }

  function CelulaPendencias({ linha }) {
    if (!linha.pendencias) return <span style={{ color: 'var(--muted)' }}>—</span>;
    const corpo = linha.pendencias + (linha.pendenciasVencidas > 0 ? ' (' + linha.pendenciasVencidas + ' venc.)' : '');
    if (linha.pendenciasEstimadas) {
      return (
        <span
          style={{ color: 'var(--muted)', fontStyle: 'italic' }}
          title="Estimativa. Este ambiente não tem cadastro de compliance carregado, então o número não foi confirmado e não participa da ordem de criticidade."
        >
          ~{corpo}
        </span>
      );
    }
    return (
      <span style={{ color: linha.pendenciasVencidas > 0 ? 'var(--amber)' : 'var(--body)' }}>{corpo}</span>
    );
  }

  function CelulaRisco({ linha }) {
    if (!linha.intelApurada) {
      return <span style={{ color: 'var(--muted)' }} title="Sinais de risco não apurados neste ambiente. Vazio aqui é falta de apuração, não carteira limpa.">n/a</span>;
    }
    if (linha.noEscuro) {
      return <span style={{ color: 'var(--amber)' }} title="Sem cobertura de emissor: a carteira não pôde ser avaliada para crédito.">no escuro</span>;
    }
    const total = linha.nSinais + linha.nCreditos;
    const altas = linha.nSinaisAlta + linha.nCreditosAlta;
    if (!total) return <span style={{ color: 'var(--muted)' }}>—</span>;
    return (
      <span style={{ color: altas > 0 ? 'var(--red)' : 'var(--body)', fontWeight: altas > 0 ? 600 : 400 }}>
        {total}{altas > 0 ? ' (' + altas + ' alta)' : ''}
      </span>
    );
  }

  /* Ação: chip quando já está na fila, botão quando ainda não está. Mesmo
     desenho de Vencimentos e Caixa parado, para o usuário reconhecer. */
  function CelulaAcao({ linha, onCriar }) {
    const C = window.AtlasConsolidado;
    const acao = C.acaoDaCarteira(linha);
    if (!acao) return <span style={{ color: 'var(--muted)' }}>—</span>;
    const status = C.statusAcao(linha);
    if (status) {
      return (
        <span
          className="badge badge--navy"
          title={'Já está na fila de oportunidades. Motivo registrado: ' + acao.motivo}
        >
          {status}
        </span>
      );
    }
    return (
      <button
        className="btn btn--ghost btn--sm"
        title={'Criar item na fila de oportunidades. Motivo: ' + acao.motivo}
        onClick={(e) => { e.stopPropagation(); onCriar(acao); }}
      >
        Criar ação
      </button>
    );
  }

  function Ranking() {
    const { useMonth } = window.AtlasContexts;
    const { selectedMonth } = useMonth();
    const C = window.AtlasConsolidado;

    const [criterio, setCriterio] = useState('criticidade');
    const [filtro, setFiltro]     = useState('acao');
    const [busca, setBusca]       = useState('');
    const [aberto, setAberto]     = useState(null);
    const [estado, setEstado]     = useState({ fase: 'carregando', linhas: [], erro: null });

    /* Carregamento real, não decorativo. O ranking abre a composição de cada
       carteira e, numa casa com centena de carteiras, isso segura a primeira
       pintura. Ceder um quadro antes de calcular deixa o spinner aparecer. */
    useEffect(() => {
      let vivo = true;
      setEstado({ fase: 'carregando', linhas: [], erro: null });
      const id = setTimeout(() => {
        if (!vivo) return;
        try {
          const linhas = C.rankingCarteiras(selectedMonth, { criterio });
          if (vivo) setEstado({ fase: 'pronto', linhas, erro: null });
        } catch (e) {
          if (vivo) setEstado({ fase: 'erro', linhas: [], erro: e });
        }
      }, 0);
      return () => { vivo = false; clearTimeout(id); };
    }, [selectedMonth, criterio]);

    const visiveis = useMemo(() => {
      let linhas = estado.linhas;
      if (filtro === 'acao') linhas = linhas.filter(exigeAcao);
      else if (filtro !== 'todos') linhas = linhas.filter(l => l.status === filtro);
      const q = busca.trim().toLowerCase();
      if (q) {
        linhas = linhas.filter(l =>
          l.code.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) ||
          (l.manager && l.manager.name && l.manager.name.toLowerCase().includes(q))
        );
      }
      return linhas;
    }, [estado.linhas, filtro, busca]);

    const resumo = useMemo(() => {
      const linhas = estado.linhas;
      return {
        acao: linhas.filter(exigeAcao).length,
        total: linhas.length,
        semDado: linhas.filter(l => l.semDado).length,
        nMaterial: linhas.filter(l => l.material).length,
        divergenciaMaterial: linhas.filter(l => l.material).reduce((s, l) => s + l.divergenciaAbsBRL, 0),
        plBloqueado: linhas.filter(l => l.status === 'CORRIGIR').reduce((s, l) => s + (l.pl || 0), 0),
        pendenciasVencidas: linhas.reduce((s, l) => s + l.pendenciasVencidas, 0),
      };
    }, [estado.linhas]);

    const pendEstimadas = estado.linhas.some(l => l.pendenciasEstimadas);
    const cliente = C.clienteAtual();

    function exportar() {
      downloadCSV(visiveis.map((l, i) => ({
        Posicao: i + 1,
        Cliente: cliente.rotulo || cliente.id,
        Carteira: l.code,
        Nome: l.name,
        Gerente: (l.manager && l.manager.name) || '',
        Status: l.status,
        PL: l.pl == null ? '' : l.pl,
        PL_Esperado: l.plEsperado == null ? '' : l.plEsperado,
        Divergencia_BRL: l.divergenciaBRL == null ? '' : l.divergenciaBRL,
        Divergencia_Pct: l.semDado ? '' : (l.divergenciaPct * 100).toFixed(4),
        Material: l.material ? 'sim' : 'nao',
        Achados: l.nAchados,
        Bloqueios_Abertos: l.nBloqueios,
        Custo_BRL: l.custoBRL,
        Custo_Pct: (l.custoPct * 100).toFixed(4),
        Pendencias: l.pendencias,
        Pendencias_Vencidas: l.pendenciasVencidas,
        Pendencias_Origem: l.pendenciasEstimadas ? 'estimativa' : 'cadastro',
        Sinais_Risco: l.intelApurada ? l.nSinais : 'nao apurado',
        Sinais_Alta: l.intelApurada ? l.nSinaisAlta : 'nao apurado',
        Eventos_Credito: l.intelApurada ? l.nCreditos : 'nao apurado',
        Sem_Cobertura_Emissor: l.noEscuro ? 'sim' : 'nao',
        Motivos: l.motivos.join(' | '),
      })), 'atlas_ranking_' + selectedMonth);
    }

    const ajuda = (CRITERIOS.find(c => c.id === criterio) || CRITERIOS[0]).ajuda;

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Onde agir primeiro</div>
          <h1 className="page-title">Ranking de Criticidade</h1>
          <div className="page-subtitle">
            {cliente.declarado ? cliente.rotulo + ' · ' : ''}{fmtMonthLabel(selectedMonth)} · {ajuda}
          </div>
        </div>

        {estado.fase === 'erro' && (
          <div className="banner banner--red">
            <Icon name="alert" size={16} />
            <span>
              Não foi possível montar o ranking de {fmtMonthLabel(selectedMonth)}.
              Troque de mês ou recarregue. Detalhe: {String((estado.erro && estado.erro.message) || estado.erro)}
            </span>
          </div>
        )}

        {estado.fase === 'carregando' && <Spinner />}

        {estado.fase === 'pronto' && estado.linhas.length === 0 && (
          <EmptyState
            title="Nenhuma carteira neste mês"
            sub={'Nenhuma carteira da casa existia em ' + fmtMonthLabel(selectedMonth) + ', ou o mês está fora da faixa com dado.'}
            icon="search"
          />
        )}

        {estado.fase === 'pronto' && estado.linhas.length > 0 && (
          <>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <KPITile
                label="Exigem ação"
                value={resumo.acao}
                sub={'de ' + resumo.total + ' carteiras'}
                variant={resumo.acao > 0 ? 'red' : undefined}
                onClick={() => setFiltro('acao')}
              />
              <KPITile
                label="Divergência material"
                value={fmtCompactBRL(resumo.divergenciaMaterial)}
                sub={resumo.nMaterial + ' carteira(s) acima de 0,30% do PL anterior'}
                variant={resumo.nMaterial > 0 ? 'amber' : undefined}
              />
              <KPITile
                label="PL bloqueado"
                value={fmtCompactBRL(resumo.plBloqueado)}
                sub="Carteiras em CORRIGIR"
                variant={resumo.plBloqueado > 0 ? 'red' : undefined}
                onClick={() => setFiltro('CORRIGIR')}
              />
              <KPITile
                label="Sem dado no mês"
                value={resumo.semDado}
                sub={resumo.semDado > 0 ? 'Não podem ser liberadas' : 'Nenhuma'}
                variant={resumo.semDado > 0 ? 'amber' : undefined}
                onClick={() => setFiltro('SEM DADO')}
              />
              <KPITile
                label={pendEstimadas ? 'Pendências (estimativa)' : 'Pendências vencidas'}
                value={pendEstimadas ? '~' + resumo.pendenciasVencidas : resumo.pendenciasVencidas}
                sub="Cadastro e compliance"
                variant={!pendEstimadas && resumo.pendenciasVencidas > 0 ? 'amber' : undefined}
              />
            </div>

            {pendEstimadas && (
              <div className="banner banner--amber" style={{ marginTop: 12 }}>
                <Icon name="info" size={16} />
                <span>
                  As pendências cadastrais deste ambiente são estimativa, não vieram do seu
                  cadastro de compliance. Aparecem marcadas com til e ficam fora da ordem de
                  criticidade, para número não confirmado não decidir prioridade.
                </span>
              </div>
            )}

            {!C.intelDisponivel() && (
              <div className="banner banner--navy" style={{ marginTop: 12 }}>
                <Icon name="info" size={16} />
                <span>
                  Sinais de risco e eventos de crédito não foram apurados neste ambiente.
                  A coluna Risco fica como não apurada, porque vazio ali significaria carteira limpa.
                </span>
              </div>
            )}

            <div className="toolbar" style={{ marginTop: 16 }}>
              <div className="chip-group">
                {CRITERIOS.map(c => (
                  <Chip key={c.id} label={c.label} active={criterio === c.id} onClick={() => setCriterio(c.id)} />
                ))}
              </div>
              <div className="toolbar-spacer" />
              <button className="btn btn--ghost" onClick={exportar}
                style={{ fontSize: '0.786rem', padding: '6px 12px', whiteSpace: 'nowrap' }}>
                <Icon name="export" size={14} /> Exportar CSV
              </button>
            </div>

            <div className="toolbar">
              <div className="chip-group">
                {FILTROS.map(f => (
                  <Chip key={f.id} label={f.label} active={filtro === f.id} variant={f.variant}
                    onClick={() => setFiltro(f.id)} />
                ))}
              </div>
              <div className="toolbar-spacer" />
              <div className="search-wrap">
                <Icon name="search" size={14} />
                <input
                  type="search"
                  className="search-input"
                  placeholder="Buscar carteira ou gerente..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                />
              </div>
            </div>

            {visiveis.length === 0 ? (
              <EmptyState
                title={filtro === 'acao' ? 'Nenhuma carteira exige ação neste mês' : 'Nenhuma carteira encontrada'}
                sub={filtro === 'acao'
                  ? 'Nenhuma reprovou, ficou sem extrato, passou da tolerância de divergência, tem achado em aberto ou acendeu risco alto em ' + fmtMonthLabel(selectedMonth) + '.'
                  : 'Ajuste o filtro ou a busca.'}
                icon={filtro === 'acao' ? 'check' : 'search'}
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }} className="num">#</th>
                      <th className="sticky-col" style={{ minWidth: 150 }}>Carteira</th>
                      <th>Status</th>
                      <th className="num">PL</th>
                      <th className="num">Divergência</th>
                      <th className="num">Achados</th>
                      <th className="num">Custo</th>
                      <th className="num">Pendências</th>
                      <th className="num">Risco</th>
                      <th>Ação</th>
                      <th style={{ width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((l, i) => (
                      <React.Fragment key={l.code}>
                        <tr className="clickable" onClick={() => setAberto(aberto === l.code ? null : l.code)}>
                          <td className="num" style={{ color: 'var(--muted)' }}>{i + 1}</td>
                          <td className="sticky-col" style={{ minWidth: 150 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{l.code}</div>
                            <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{l.name}</div>
                          </td>
                          <td><Badge status={l.status} /></td>
                          <td className="num">{l.pl == null ? '—' : fmtCompactBRL(l.pl)}</td>
                          <td className="num"><CelulaDivergencia linha={l} /></td>
                          <td className="num">
                            {l.nAchados > 0
                              ? <span style={{ color: l.nBloqueios > 0 ? 'var(--red)' : 'var(--amber)', fontWeight: 600 }}>
                                  {l.nAchados}{l.nBloqueios > 0 ? ' (' + l.nBloqueios + ' aberto)' : ''}
                                </span>
                              : <span style={{ color: 'var(--muted)' }}>—</span>}
                          </td>
                          <td className="num">
                            {l.semDado ? '—' : (
                              <>
                                {fmtCompactBRL(l.custoBRL)}
                                <span style={{ display: 'block', fontSize: '0.714rem', color: 'var(--muted)' }}>
                                  {fmtPct(l.custoPct, 2)} do PL
                                </span>
                              </>
                            )}
                          </td>
                          <td className="num"><CelulaPendencias linha={l} /></td>
                          <td className="num"><CelulaRisco linha={l} /></td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <CelulaAcao linha={l} onCriar={(acao) => navigate(acao.href)} />
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--muted)' }}>
                            <Icon name={aberto === l.code ? 'chevronDown' : 'chevronRight'} size={14} />
                          </td>
                        </tr>
                        {aberto === l.code && (
                          <tr>
                            <td colSpan={11} style={{ padding: '0 12px 14px 20px' }}>
                              {l.motivos.length > 0 && (
                                <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: '0.786rem', color: 'var(--body)', lineHeight: 1.6 }}>
                                  {l.motivos.map((m, k) => <li key={k}>{m}</li>)}
                                </ul>
                              )}
                              {l.maiorPosicao && (
                                <div style={{ fontSize: '0.786rem', color: 'var(--muted)', marginBottom: 10 }}>
                                  Maior posição: {l.maiorPosicao.name} com {fmtCompactBRL(l.maiorPosicao.valor)}, {fmtPct(l.maiorPosicao.pct, 1)} da carteira.
                                </div>
                              )}
                              <button className="btn btn--ghost btn--sm"
                                onClick={(e) => { e.stopPropagation(); navigate('#/carteira/' + l.code); }}>
                                Abrir carteira
                              </button>
                              <button className="btn btn--ghost btn--sm" style={{ marginLeft: 8 }}
                                onClick={(e) => { e.stopPropagation(); navigate('#/comparativo?carteira=' + encodeURIComponent(l.code)); }}>
                                Comparar com o mês anterior
                              </button>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Ranking = Ranking;
})();
