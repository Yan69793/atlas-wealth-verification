/* platform-eventos.jsx — Eventos & Impacto (Entrega B).

   Responde, num dia de evento de credito: isso me pega? onde? quanto? e mudou
   desde a ultima vez?

   O dado vem do demo sintetico (platform-credito-demo.js, gerado pelo motor) ou
   do overlay da instancia (platform-credito.js, LGPD, gitignored). Nada sai do
   navegador: sem fetch, sem XHR, sem beacon.

   DUAS REGRAS DE TELA QUE NAO PODEM SER AFROUXADAS:

   1. "Sem exposicao" e "nao avaliavel" aparecem SEPARADOS e com o mesmo peso
      visual. Carteira que o motor nao consegue ler nao esta limpa, esta no
      escuro, e essa e a informacao que o assessor nao sabe que precisa pedir.
   2. Nenhum texto de explicabilidade e escrito aqui. Afirmacao, conta, regra,
      evidencia e cobertura vem do insight que o motor produziu.

   A tela abre pelo QUE MUDOU. Ordenar por severidade faria a lista de segunda
   ser identica a de sexta, e o assessor pararia de abrir.
*/
import React from 'react';

(() => {
  const { useMemo, useState } = React;

  const { fmtCompactBRL, fmtPct, downloadCSV } = window.AtlasUtils;
  const { Icon } = window.AtlasIcons;
  const { KPITile, EmptyState } = window.AtlasUI;
  const D = window.AtlasData;

  const COR_SEV = {
    alta: 'var(--red, #b91c1c)',
    media: 'var(--amber, #b45309)',
    baixa: 'var(--navy, #1e3a5f)',
  };
  const ROTULO_SEV = { alta: 'Alta', media: 'Media', baixa: 'Baixa' };

  /* Estado e o corte primario da tela. As cores seguem a urgencia, nao a
     severidade: um evento que agravou merece atencao antes de um critico que
     esta igual ha tres semanas. */
  const ESTADO = {
    agravado:       { rotulo: 'Agravou',       cor: 'var(--red, #b91c1c)',    peso: 5 },
    novo:           { rotulo: 'Novo',          cor: 'var(--amber, #b45309)',  peso: 4 },
    acompanhamento: { rotulo: 'Acompanhando',  cor: 'var(--navy, #1e3a5f)',   peso: 3 },
    melhorado:      { rotulo: 'Melhorou',      cor: 'var(--green, #15803d)',  peso: 2 },
    encerrado:      { rotulo: 'Encerrado',     cor: 'var(--muted, #64748b)',  peso: 1 },
  };

  const ROTULO_TIPO = {
    DEFAULT: 'Calote',
    RECUPERACAO_JUDICIAL: 'Recuperacao judicial',
    REBAIXAMENTO_RATING: 'Rebaixamento de rating',
    ATRASO_PAGAMENTO: 'Atraso de pagamento',
    COVENANT_QUEBRADO: 'Covenant quebrado',
    SUSPENSAO_NEGOCIACAO: 'Suspensao de negociacao',
    NOTICIA_NEGATIVA: 'Noticia negativa',
    OUTRO: 'Outro',
  };

  const ROTULO_MOTIVO = {
    'evento-saiu-da-fonte': 'o evento saiu da fonte',
    'exposicao-zerada': 'a carteira zerou a posicao',
  };

  /* MANAGERS em caixa alta: com `managers` o guard cai sempre e a coluna
     Assessor mostra o codigo interno em vez do nome (defeito da Onda 1). */
  function nomeAssessor(id) {
    if (!D || !D.MANAGERS) return id || '';
    const m = D.MANAGERS.find((x) => x.id === id);
    return m ? m.name : (id || '');
  }

  function assessorDe(carteira) {
    if (!D || !D.CATALOG) return '';
    const p = D.CATALOG.find((x) => x.code === carteira);
    return p ? p.mgr : '';
  }

  function nomeCarteira(code) {
    if (!D || !D.CATALOG) return code;
    const p = D.CATALOG.find((x) => x.code === code);
    return p ? p.name : code;
  }

  function Pill({ children, cor }) {
    return (
      <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
        fontSize: '0.714rem', fontWeight: 600, color: cor,
        border: '1px solid ' + cor, whiteSpace: 'nowrap',
      }}>{children}</span>
    );
  }

  /* Evidencia e numero cru do motor e continua cru. So a APRESENTACAO do numero
     e cortada: fracao vinha com dezesseis casas decimais. */
  function fmtEvidencia(v) {
    if (typeof v !== 'number') return String(v);
    if (!Number.isFinite(v)) return String(v);
    if (Math.abs(v) >= 1000) return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    if (Number.isInteger(v)) return String(v);
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  }

  /* "Por que estou vendo isso?": renderiza o insight cru, sem redigir nada. */
  function PorQue({ insight }) {
    if (!insight) {
      return (
        <div style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
          Este item nao trouxe rastro do motor. Isso e defeito do motor, nao da tela.
        </div>
      );
    }
    const limiares = Object.entries(insight.regra && insight.regra.limiar ? insight.regra.limiar : {});
    const evid = Object.entries(insight.evidencias || {});
    const linha = { display: 'flex', gap: 8, padding: '3px 0', fontSize: '0.786rem' };
    const rotulo = { minWidth: 110, color: 'var(--muted)', flexShrink: 0 };

    return (
      <div style={{
        background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border, #e2e8f0)',
        borderRadius: 8, padding: '12px 14px', marginTop: 8,
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.857rem', marginBottom: 8 }}>{insight.afirmacao}</div>

        <div style={linha}>
          <span style={rotulo}>Conta</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>{insight.calculo}</span>
        </div>

        <div style={linha}>
          <span style={rotulo}>Regra</span>
          <span>
            {insight.regra && insight.regra.nome}
            {limiares.length > 0 && (
              <span style={{ color: 'var(--muted)' }}>
                {' '}({limiares.map(([k, v]) => k + ' = ' + v).join(', ')})
              </span>
            )}
          </span>
        </div>

        <div style={linha}>
          <span style={rotulo}>Evidencia</span>
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px' }}>
            {evid.map(([k, v]) => (
              <span key={k}>
                <span style={{ color: 'var(--muted)' }}>{k}:</span> {fmtEvidencia(v)}
              </span>
            ))}
          </span>
        </div>

        <div style={linha}>
          <span style={rotulo}>Fonte</span>
          <span>{insight.fonte && insight.fonte.fonte} · {insight.fonte && insight.fonte.data}</span>
        </div>

        <div style={linha}>
          <span style={rotulo}>Cobertura</span>
          <span>
            <Pill cor={insight.faixaCobertura === 'afirma' ? 'var(--green, #15803d)' : 'var(--amber, #b45309)'}>
              {fmtPct(insight.cobertura, 1)} de emissor conhecido
            </Pill>
            <span style={{ color: 'var(--muted)', marginLeft: 10 }}>confianca {insight.confianca}</span>
          </span>
        </div>

        <div style={{ ...linha, color: 'var(--muted)', fontSize: '0.714rem', paddingTop: 6 }}>
          <span style={rotulo}>Identificador</span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{insight.id}</span>
        </div>
      </div>
    );
  }

  /**
   * As tres listas, lado a lado e com o mesmo peso visual.
   * "Nao avaliavel" NAO e rodape: e a resposta a pergunta que o assessor nao
   * sabe que precisa fazer num dia de evento de credito.
   */
  function TresListas({ impacto }) {
    const cx = { flex: '1 1 200px', minWidth: 190 };
    const titulo = { fontSize: '0.714rem', fontWeight: 700, letterSpacing: '.04em', marginBottom: 6 };
    const corpo = { fontSize: '0.786rem', color: 'var(--muted)', lineHeight: 1.5 };

    return (
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '10px 0 4px' }}>
        <div style={cx}>
          <div style={{ ...titulo, color: COR_SEV.alta }}>ATINGIDAS ({impacto.atingidas.length})</div>
          <div style={corpo}>
            {impacto.atingidas.length
              ? impacto.atingidas.map((a) => a.carteira).join(', ')
              : 'nenhuma carteira avaliavel tem posicao neste emissor'}
          </div>
        </div>
        <div style={cx}>
          <div style={{ ...titulo, color: 'var(--green, #15803d)' }}>SEM EXPOSICAO ({impacto.semExposicao.length})</div>
          <div style={corpo}>{impacto.semExposicao.join(', ') || '—'}</div>
        </div>
        <div style={cx}>
          <div style={{ ...titulo, color: COR_SEV.media }}>NAO AVALIAVEIS ({impacto.naoAvaliaveis.length})</div>
          <div style={corpo}>
            {impacto.naoAvaliaveis.length ? (
              <>
                {impacto.naoAvaliaveis.join(', ')}
                <div style={{ fontSize: '0.714rem', marginTop: 4 }}>
                  Nao estao limpas: falta cadastro de emissor para responder sobre elas.
                </div>
              </>
            ) : '—'}
          </div>
        </div>
      </div>
    );
  }

  function Eventos() {
    const DATA = window.ATLAS_CREDITO_DATA;
    const [filtro, setFiltro] = useState('mudou');
    const [aberto, setAberto] = useState(null);
    const [verEncerrados, setVerEncerrados] = useState(false);

    const porId = useMemo(() => {
      const m = new Map();
      for (const i of (DATA && DATA.insights) || []) m.set(i.id, i);
      return m;
    }, [DATA]);

    if (!DATA || !DATA.impactos || !DATA.impactos.length) {
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Advisor Intelligence</div>
            <h1 className="page-title">Eventos & Impacto</h1>
          </div>
          <EmptyState
            title="Nenhum evento de credito no periodo"
            sub="Quando a fonte trouxer evento de credito, o cruzamento com as carteiras aparece aqui."
            icon="alert"
          />
        </div>
      );
    }

    const impactos = DATA.impactos;
    const encerrados = DATA.encerrados || [];
    const pares = impactos.flatMap((i) => i.atingidas.map((a) => ({ evento: i.evento, a })));
    const mudaram = pares.filter((p) => p.a.estado === 'novo' || p.a.estado === 'agravado');
    const criticos = pares.filter((p) => p.a.severidadeImpacto === 'alta');
    const plExposto = pares.reduce((s, p) => s + p.a.valor, 0);
    const naoAvaliaveis = DATA.carteiras - DATA.carteirasAvaliaveis;

    const FILTROS = [
      ['mudou', 'O que mudou', mudaram.length],
      ['todos', 'Todos', pares.length],
      ['acompanhamento', 'Acompanhando', pares.filter((p) => p.a.estado === 'acompanhamento').length],
      ['melhorado', 'Melhoraram', pares.filter((p) => p.a.estado === 'melhorado').length],
    ];

    function visivel(a) {
      if (filtro === 'todos') return true;
      if (filtro === 'mudou') return a.estado === 'novo' || a.estado === 'agravado';
      return a.estado === filtro;
    }

    const listaVisivel = impactos
      .map((i) => ({ ...i, atingidas: i.atingidas.filter(visivel) }))
      .filter((i) => i.atingidas.length > 0 || filtro === 'todos');

    function alternar(id) { setAberto(aberto === id ? null : id); }

    function exportar() {
      const rows = [];
      for (const i of impactos) {
        for (const a of i.atingidas) {
          const ins = porId.get(a.insightId);
          rows.push({
            Estado: ESTADO[a.estado] ? ESTADO[a.estado].rotulo : a.estado,
            Emissor: i.evento.emissorNome,
            Evento: ROTULO_TIPO[i.evento.tipo] || i.evento.tipo,
            'Data do evento': i.evento.data,
            'Fonte do evento': i.evento.fonte,
            'Severidade declarada': i.evento.severidadeEvento,
            Carteira: a.carteira,
            Nome: nomeCarteira(a.carteira),
            Gerente: nomeAssessor(assessorDe(a.carteira)),
            Exposicao: a.valor,
            '% do PL': Math.round(a.fracaoPl * 1000) / 10,
            'Exposicao anterior': a.exposicaoAnterior === null ? '' : a.exposicaoAnterior,
            'Variacao %': a.variacaoExposicao === null ? '' : Math.round(a.variacaoExposicao * 1000) / 10,
            'Impacto': a.severidadeImpacto,
            Ativos: a.ativos.join('; '),
            Cobertura: Math.round(a.cobertura * 1000) / 10,
            Confianca: a.confianca,
            Conta: ins ? ins.calculo : '',
          });
        }
      }
      for (const e of encerrados) {
        rows.push({
          Estado: 'Encerrado',
          Emissor: e.emissorNome,
          Evento: ROTULO_TIPO[e.tipo] || e.tipo,
          'Data do evento': e.dataEvento,
          Carteira: e.carteira,
          Nome: nomeCarteira(e.carteira),
          Gerente: nomeAssessor(assessorDe(e.carteira)),
          'Exposicao anterior': e.exposicaoAnterior,
          Impacto: e.severidadeAnterior,
          Conta: 'encerrado porque ' + (ROTULO_MOTIVO[e.motivo] || e.motivo),
        });
      }
      downloadCSV(rows, 'atlas_eventos_credito_' + (DATA.data || '').slice(0, 10));
    }

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Advisor Intelligence</div>
          <h1 className="page-title">Eventos & Impacto</h1>
          <div className="page-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              {impactos.length} evento(s) · posicao de {DATA.data}
              {DATA.baseData ? ' · comparado com ' + DATA.baseData : ' · primeira apuracao, tudo e novo'}
              {DATA.fonteEventos ? ' · fonte ' + DATA.fonteEventos : ''}
            </span>
            <button className="btn btn--ghost" onClick={exportar} style={{ fontSize: '0.786rem', padding: '6px 12px' }}>
              <Icon name="export" size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        {naoAvaliaveis > 0 && (
          <div style={{
            border: '1px solid ' + COR_SEV.media, borderLeft: '4px solid ' + COR_SEV.media,
            borderRadius: 8, padding: '12px 14px', marginBottom: 16, background: 'var(--bg-subtle, #f8fafc)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alert" size={16} />
              <strong style={{ fontSize: '0.857rem' }}>
                {naoAvaliaveis} de {DATA.carteiras} carteiras nao puderam ser avaliadas
              </strong>
            </div>
            <div style={{ fontSize: '0.786rem', color: 'var(--muted)', marginTop: 6 }}>
              Elas nao estao limpas, estao no escuro: falta cadastro de emissor nos ativos delas.
              Enquanto faltar, nenhuma resposta desta tela vale para essas carteiras.
            </div>
          </div>
        )}

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <KPITile label="Mudou desde a ultima" value={mudaram.length} sub="Novos e agravados" variant={mudaram.length ? 'red' : 'navy'} />
          <KPITile label="Impacto alto" value={criticos.length} sub="Pares carteira-evento" variant={criticos.length ? 'red' : 'navy'} />
          <KPITile label="Patrimonio exposto" value={fmtCompactBRL(plExposto)} sub="Soma das posicoes atingidas" variant="navy" />
          <KPITile label="Carteiras no escuro" value={naoAvaliaveis} sub={'de ' + DATA.carteiras + ' na casa'} variant={naoAvaliaveis ? 'amber' : 'navy'} />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '18px 0 12px' }}>
          {FILTROS.map(([id, label, n]) => (
            <button key={id} type="button" className={'chip' + (filtro === id ? ' active' : '')} onClick={() => { setFiltro(id); setAberto(null); }}>
              {label} ({n})
            </button>
          ))}
        </div>

        {!listaVisivel.length && (
          <EmptyState
            title="Nada nesta faixa"
            sub="Troque o filtro acima para ver os demais eventos."
            icon="filter"
          />
        )}

        {listaVisivel.map((i) => (
          <div key={i.evento.emissorId + '|' + i.evento.tipo} style={{
            border: '1px solid var(--border, #e2e8f0)', borderRadius: 10,
            padding: '14px 16px', marginBottom: 12,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {i.estado && <Pill cor={ESTADO[i.estado].cor}>{ESTADO[i.estado].rotulo}</Pill>}
              <strong style={{ fontSize: '0.929rem' }}>{i.evento.emissorNome}</strong>
              <span style={{ fontSize: '0.857rem' }}>{ROTULO_TIPO[i.evento.tipo] || i.evento.tipo}</span>
              <span style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
                {i.evento.data} · fonte diz severidade {i.evento.severidadeEvento} · confianca da fonte {i.evento.confiancaFonte}
              </span>
              {i.exposicaoTotal > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: '0.857rem', whiteSpace: 'nowrap' }}>
                  {fmtCompactBRL(i.exposicaoTotal)} na casa
                </span>
              )}
            </div>

            <TresListas impacto={i} />

            {i.atingidas.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th style={{ minWidth: 140 }}>Carteira</th>
                      <th>Gerente</th>
                      <th style={{ textAlign: 'right' }}>Exposicao</th>
                      <th style={{ textAlign: 'right' }}>% do PL</th>
                      <th style={{ textAlign: 'right' }}>Variacao</th>
                      <th>Impacto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {i.atingidas.map((a) => (
                      <React.Fragment key={a.insightId}>
                        <tr>
                          <td><Pill cor={ESTADO[a.estado].cor}>{ESTADO[a.estado].rotulo}</Pill></td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{a.carteira}</div>
                            <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{nomeCarteira(a.carteira)}</div>
                          </td>
                          <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{nomeAssessor(assessorDe(a.carteira))}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(a.valor)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {fmtPct(a.fracaoPl, 1)}
                            {a.abaixoDoPiso && (
                              <div style={{ fontSize: '0.643rem', color: 'var(--muted)' }}>sob o piso, mas ja acompanhado</div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: a.variacaoExposicao > 0 ? COR_SEV.alta : 'var(--green, #15803d)' }}>
                            {a.variacaoExposicao === null ? '—' : fmtPct(a.variacaoExposicao, 1)}
                          </td>
                          <td><Pill cor={COR_SEV[a.severidadeImpacto]}>{ROTULO_SEV[a.severidadeImpacto]}</Pill></td>
                          <td>
                            <button type="button" className="btn btn--ghost" style={{ fontSize: '0.714rem', padding: '4px 10px' }} onClick={() => alternar(a.insightId)}>
                              {aberto === a.insightId ? 'Fechar' : 'Por que estou vendo isso?'}
                            </button>
                          </td>
                        </tr>
                        {aberto === a.insightId && (
                          <tr>
                            <td colSpan={8} style={{ padding: '0 12px 12px 12px' }}>
                              <PorQue insight={porId.get(a.insightId)} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {encerrados.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <button type="button" className="btn btn--ghost" style={{ fontSize: '0.786rem' }} onClick={() => setVerEncerrados(!verEncerrados)}>
              <Icon name={verEncerrados ? 'close' : 'check'} size={14} /> Encerrados ({encerrados.length})
            </button>
            <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 4 }}>
              O que voce acompanhava e saiu. Fica listado de proposito: item que some sem
              explicacao e pior do que item que continua aparecendo.
            </div>
            {verEncerrados && (
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 150 }}>Emissor</th>
                      <th>Evento</th>
                      <th style={{ minWidth: 130 }}>Carteira</th>
                      <th style={{ textAlign: 'right' }}>Exposicao anterior</th>
                      <th>Impacto anterior</th>
                      <th>Por que saiu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {encerrados.map((e) => (
                      <tr key={e.emissorId + '|' + e.tipo + '|' + e.carteira}>
                        <td style={{ fontWeight: 600, fontSize: '0.857rem' }}>{e.emissorNome}</td>
                        <td style={{ fontSize: '0.786rem' }}>{ROTULO_TIPO[e.tipo] || e.tipo}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{e.carteira}</div>
                          <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{nomeCarteira(e.carteira)}</div>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(e.exposicaoAnterior)}</td>
                        <td><Pill cor={COR_SEV[e.severidadeAnterior]}>{ROTULO_SEV[e.severidadeAnterior]}</Pill></td>
                        <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{ROTULO_MOTIVO[e.motivo] || e.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {DATA.descartados > 0 && (
          <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 14 }}>
            {DATA.descartados} registro(s) da fonte foram descartados por nao ter emissor ou data
            utilizavel. Sao contados aqui em vez de sumirem em silencio.
          </div>
        )}
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Eventos = Eventos;
})();
