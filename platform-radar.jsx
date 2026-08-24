/* platform-radar.jsx — Radar de Carteiras (visao cruzada).

   Responde o que uma tela de carteira individual nao consegue: qual carteira
   merece atencao primeiro, qual emissor aparece em muita gente ao mesmo tempo,
   que fator manda em carteira que parece diversificada, e quem piorou contra o
   mes passado.

   O dado vem do demo sintetico (platform-radar-demo.js, gerado pelo motor) ou
   do overlay da instancia (platform-radar.js, LGPD, gitignored). Nada sai do
   navegador: sem fetch, sem XHR, sem beacon.

   REGRA DA TELA: nenhum texto de explicabilidade e escrito aqui. Toda
   afirmacao, conta, regra, evidencia e cobertura vem do insight que o motor
   produziu. Se falta campo, o motor esta incompleto, nao a tela. Foi assim que
   o score da fila de oportunidades virou codigo morto em agosto: a tela tinha
   peso proprio e o motor tinha outro.
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

  /* Faixa de cobertura vira linguagem de negocio: o assessor nao precisa saber
     que existe um limiar chamado coberturaAfirmaMin. */
  const ROTULO_FAIXA = {
    afirma: 'Cobertura boa',
    ressalva: 'Cobertura parcial',
    insuficiente: 'Cobertura insuficiente',
  };
  const COR_FAIXA = {
    afirma: 'var(--green, #15803d)',
    ressalva: 'var(--amber, #b45309)',
    insuficiente: 'var(--red, #b91c1c)',
  };

  const ROTULO_TIPO = {
    CONCENTRACAO_ATIVO: 'Concentracao em um ativo',
    CONCENTRACAO_EMISSOR: 'Concentracao em um emissor',
    CONCENTRACAO_FATOR: 'Fator comum',
    LIQUIDEZ_BAIXA: 'Liquidez abaixo do piso',
    VENCIMENTO_CONCENTRADO: 'Vencimento concentrado',
    DETERIORACAO_PL: 'Queda de patrimonio',
  };

  const ROTULO_ATRIBUTO = {
    classeCanonica: 'Classe',
    indexador: 'Indexador',
    emissorId: 'Emissor',
    moeda: 'Moeda',
    regiao: 'Regiao',
    prazoAnos: 'Prazo',
    liquidezDias: 'Liquidez',
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

  /* Nome de campo interno nao aparece para o assessor. O motor entrega `fator`
     em bruto (classeCanonica, regiao) e a tela escreve a palavra. */
  function rotuloSinal(s) {
    if (s.tipo === 'CONCENTRACAO_FATOR' && s.fator) {
      return (ROTULO_ATRIBUTO[s.fator] || s.fator) + ': ' + s.rotulo;
    }
    return s.rotulo;
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

  /* Evidencia e numero cru do motor, e continua cru. Só a APRESENTACAO do
     numero e cortada: fracao vinha como 0.3391959798994975, dezesseis casas
     que ninguem le e que fazem a linha parecer erro de arredondamento. */
  function fmtEvidencia(v) {
    if (typeof v !== 'number') return String(v);
    if (!Number.isFinite(v)) return String(v);
    if (Math.abs(v) >= 1000) return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    if (Number.isInteger(v)) return String(v);
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  }

  /* "Por que estou vendo isso?": renderiza o insight cru, sem redigir nada.
     Regra, conta, evidencias, fonte, cobertura e confianca saem do motor. */
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
        <div style={{ fontWeight: 600, fontSize: '0.857rem', marginBottom: 8 }}>
          {insight.afirmacao}
        </div>

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
                <span style={{ color: 'var(--muted)' }}>{k}:</span>{' '}
                {fmtEvidencia(v)}
              </span>
            ))}
          </span>
        </div>

        <div style={linha}>
          <span style={rotulo}>Fonte</span>
          <span>
            {insight.fonte && insight.fonte.fonte} · {insight.fonte && insight.fonte.data}
            {insight.fonte && insight.fonte.serie && (
              <span style={{ color: 'var(--muted)' }}> (serie {insight.fonte.serie.join(' a ')})</span>
            )}
          </span>
        </div>

        <div style={linha}>
          <span style={rotulo}>Cobertura</span>
          <span>
            <Pill cor={COR_FAIXA[insight.faixaCobertura]}>
              {fmtPct(insight.cobertura, 1)} · {ROTULO_FAIXA[insight.faixaCobertura]}
            </Pill>
            <span style={{ color: 'var(--muted)', marginLeft: 10 }}>
              confianca {insight.confianca}
            </span>
          </span>
        </div>

        <div style={{ ...linha, color: 'var(--muted)', fontSize: '0.714rem', paddingTop: 6 }}>
          <span style={rotulo}>Identificador</span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{insight.id}</span>
        </div>
      </div>
    );
  }

  /* Faixa de cobertura da casa. Fica no topo de propósito: e a primeira coisa
     que o leitor precisa saber antes de acreditar em qualquer numero abaixo. */
  function BannerCobertura({ casa, limiares, porCarteira }) {
    if (!casa) return null;
    const faixa = casa.faixaGlobal;
    const cor = COR_FAIXA[faixa];
    const texto = {
      afirma: 'O motor classificou patrimonio suficiente para concluir em todas as dimensoes.',
      ressalva: 'Parte do patrimonio nao esta classificada. As conclusoes abaixo valem com ressalva.',
      insuficiente: 'Ha dimensao em que o motor nao classificou patrimonio suficiente para concluir. Onde faltou, ele nao afirma: mostra a cobertura no lugar.',
    }[faixa];

    /* O agregado da casa esconde carteira individual mal classificada: uma
       casa em 91% pode ter uma carteira em 28%. Dizer so "cobertura boa"
       nesse caso e a mesma classe de omissao que a regra de cobertura existe
       para impedir, um degrau acima. */
    const abaixo = (porCarteira || []).filter((c) => c.faixaGlobal !== 'afirma');

    return (
      <div style={{
        border: '1px solid ' + cor, borderLeft: '4px solid ' + cor, borderRadius: 8,
        padding: '12px 14px', marginBottom: 16, background: 'var(--bg-subtle, #f8fafc)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Icon name="alert" size={16} />
          <strong style={{ fontSize: '0.857rem' }}>{ROTULO_FAIXA[faixa]}</strong>
          <span style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{texto}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {casa.atributos.map((a) => (
            <Pill key={a.atributo} cor={COR_FAIXA[a.faixa]}>
              {ROTULO_ATRIBUTO[a.atributo] || a.atributo} {fmtPct(a.fracao, 0)}
            </Pill>
          ))}
        </div>
        {abaixo.length > 0 && (
          <div style={{ fontSize: '0.786rem', marginTop: 8, color: COR_FAIXA.ressalva }}>
            {abaixo.length === 1 ? '1 carteira nao tem' : abaixo.length + ' carteiras nao tem'} classificacao
            suficiente e o motor cala sobre parte delas: {abaixo.map((c) => c.carteira).join(', ')}.
            Veja a aba Cobertura.
          </div>
        )}
        {limiares && (
          <div style={{ fontSize: '0.714rem', color: 'var(--muted)', marginTop: 8 }}>
            Afirma a partir de {fmtPct(limiares.coberturaAfirmaMin, 0)} do patrimonio classificado;
            entre {fmtPct(limiares.coberturaRessalvaMin, 0)} e {fmtPct(limiares.coberturaAfirmaMin, 0)} afirma com ressalva;
            abaixo de {fmtPct(limiares.coberturaRessalvaMin, 0)} nao conclui.
          </div>
        )}
      </div>
    );
  }

  function Radar() {
    const DATA = window.ATLAS_RADAR_DATA;
    const [aba, setAba] = useState('carteiras');
    const [aberto, setAberto] = useState(null);

    const porId = useMemo(() => {
      const m = new Map();
      for (const i of (DATA && DATA.insights) || []) m.set(i.id, i);
      return m;
    }, [DATA]);

    if (!DATA || !DATA.carteiras || !DATA.carteiras.length) {
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Advisor Intelligence</div>
            <h1 className="page-title">Radar de Carteiras</h1>
          </div>
          <EmptyState
            title="Sem dado para o radar"
            sub="Quando houver um snapshot ingerido, a visao cruzada de todas as carteiras aparece aqui."
            icon="alert"
          />
        </div>
      );
    }

    const carteiras = DATA.carteiras;
    const comSinal = carteiras.filter((c) => c.sinais.length > 0);
    const criticas = carteiras.filter((c) => c.pior === 'alta');
    const plSobSinal = comSinal.reduce((s, c) => s + c.plTotal, 0);
    const totalInsights = (DATA.insights || []).length;
    const coberturaMedia = DATA.coberturaCasa && DATA.coberturaCasa.atributos.length
      ? DATA.coberturaCasa.atributos.reduce((s, a) => s + a.fracao, 0) / DATA.coberturaCasa.atributos.length
      : 0;

    function alternar(id) {
      setAberto(aberto === id ? null : id);
    }

    function exportar() {
      const rows = [];
      for (const c of carteiras) {
        for (const s of c.sinais) {
          const ins = porId.get(s.insightId);
          rows.push({
            Carteira: c.carteira,
            Nome: nomeCarteira(c.carteira),
            Assessor: nomeAssessor(assessorDe(c.carteira)),
            'PL da carteira': c.plTotal,
            Sinal: ROTULO_TIPO[s.tipo] || s.tipo,
            Severidade: ROTULO_SEV[s.severidade] || s.severidade,
            Item: rotuloSinal(s),
            Valor: s.valor,
            '% do PL': Math.round(s.fracaoPl * 1000) / 10,
            Cobertura: Math.round(s.cobertura * 1000) / 10,
            Afirmacao: ins ? ins.afirmacao : '',
            Conta: ins ? ins.calculo : '',
            Regra: ins && ins.regra ? ins.regra.nome : '',
            Confianca: ins ? ins.confianca : '',
          });
        }
      }
      downloadCSV(rows, 'atlas_radar_' + (DATA.data || '').slice(0, 10));
    }

    const ABAS = [
      ['carteiras', 'Carteiras', carteiras.length],
      ['emissores', 'Emissores', (DATA.emissores || []).length],
      ['fatores', 'Fatores', (DATA.fatores || []).length],
      ['deterioracao', 'Deterioracao', (DATA.deterioracao || []).length],
      ['cobertura', 'Cobertura', (DATA.cobertura || []).length],
    ];

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Advisor Intelligence</div>
          <h1 className="page-title">Radar de Carteiras</h1>
          <div className="page-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              {carteiras.length} carteiras · {totalInsights} achados · posicao de {DATA.data}
              {DATA.baseData
                ? ' · comparado com ' + DATA.baseData
                : ' · sem base de comparacao (serie curta)'}
            </span>
            <button className="btn btn--ghost" onClick={exportar} style={{ fontSize: '0.786rem', padding: '6px 12px' }}>
              <Icon name="export" size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        <BannerCobertura casa={DATA.coberturaCasa} limiares={DATA.limiares} porCarteira={DATA.cobertura} />

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <KPITile label="Carteiras criticas" value={criticas.length} sub="Com achado de severidade alta" variant={criticas.length ? 'red' : 'navy'} />
          <KPITile label="Carteiras com achado" value={comSinal.length} sub={'de ' + carteiras.length + ' analisadas'} variant="navy" />
          <KPITile label="Patrimonio sob achado" value={fmtCompactBRL(plSobSinal)} sub="PL das carteiras com algum achado" variant="navy" />
          <KPITile label="Cobertura media" value={fmtPct(coberturaMedia, 0)} sub="Do patrimonio da casa classificado" />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '18px 0 12px' }}>
          {ABAS.map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              className={'chip' + (aba === id ? ' active' : '')}
              onClick={() => { setAba(id); setAberto(null); }}
            >
              {label} ({n})
            </button>
          ))}
        </div>

        {aba === 'carteiras' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 150 }}>Carteira</th>
                  <th>Assessor</th>
                  <th style={{ textAlign: 'right' }}>Patrimonio</th>
                  <th>Pior achado</th>
                  <th>Achados</th>
                  <th>Cobertura</th>
                </tr>
              </thead>
              <tbody>
                {carteiras.map((c) => (
                  <React.Fragment key={c.carteira}>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{c.carteira}</div>
                        <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{nomeCarteira(c.carteira)}</div>
                      </td>
                      <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{nomeAssessor(assessorDe(c.carteira))}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(c.plTotal)}</td>
                      <td>
                        {c.pior
                          ? <Pill cor={COR_SEV[c.pior]}>{ROTULO_SEV[c.pior]}</Pill>
                          : <span style={{ color: 'var(--muted)', fontSize: '0.786rem' }}>nenhum</span>}
                      </td>
                      <td style={{ fontSize: '0.786rem' }}>{c.sinais.length}</td>
                      <td><Pill cor={COR_FAIXA[c.faixaCobertura]}>{ROTULO_FAIXA[c.faixaCobertura]}</Pill></td>
                    </tr>
                    {c.sinais.map((s) => (
                      <React.Fragment key={s.insightId}>
                        <tr style={{ background: 'var(--bg-subtle, #f8fafc)' }}>
                          <td style={{ paddingLeft: 24, fontSize: '0.786rem' }} colSpan={2}>
                            <Pill cor={COR_SEV[s.severidade]}>{ROTULO_SEV[s.severidade]}</Pill>{' '}
                            {ROTULO_TIPO[s.tipo] || s.tipo}
                            <span style={{ color: 'var(--muted)' }}> · {rotuloSinal(s)}</span>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.786rem' }}>{fmtCompactBRL(s.valor)}</td>
                          {/* Queda de patrimonio mede variacao contra a base, nao
                              participacao no PL: rotular igual seria mentira de
                              unidade, do mesmo tipo do "R$ x dias" formatado
                              como moeda que a Onda 1 corrigiu. */}
                          <td style={{ fontSize: '0.786rem' }} colSpan={2}>
                            {s.tipo === 'DETERIORACAO_PL'
                              ? fmtPct(s.fracaoPl, 1) + ' de variacao'
                              : fmtPct(s.fracaoPl, 1) + ' do PL'}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              style={{ fontSize: '0.714rem', padding: '4px 10px' }}
                              onClick={() => alternar(s.insightId)}
                            >
                              {aberto === s.insightId ? 'Fechar' : 'Por que estou vendo isso?'}
                            </button>
                          </td>
                        </tr>
                        {aberto === s.insightId && (
                          <tr>
                            <td colSpan={6} style={{ padding: '0 12px 12px 24px' }}>
                              <PorQue insight={porId.get(s.insightId)} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {aba === 'emissores' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Emissor</th>
                  <th style={{ textAlign: 'right' }}>Exposicao total</th>
                  <th style={{ textAlign: 'right' }}>% da casa</th>
                  <th style={{ textAlign: 'right' }}>Maior % numa carteira</th>
                  <th>Carteira mais exposta</th>
                  <th style={{ textAlign: 'right' }}>Carteiras</th>
                </tr>
              </thead>
              <tbody>
                {(DATA.emissores || []).map((e) => {
                  const concentrado = DATA.limiares
                    && e.maiorFracaoEmCarteira >= DATA.limiares.radarConcentracaoEmissorPct;
                  return (
                    <tr key={e.emissorId}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{e.emissorNome}</div>
                        <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{e.emissorId}</div>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(e.valor)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtPct(e.fracaoCasa, 1)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {concentrado
                          ? <Pill cor={COR_SEV.alta}>{fmtPct(e.maiorFracaoEmCarteira, 1)}</Pill>
                          : fmtPct(e.maiorFracaoEmCarteira, 1)}
                      </td>
                      <td style={{ fontSize: '0.786rem' }}>{e.carteiraMaisExposta}</td>
                      <td style={{ textAlign: 'right', fontSize: '0.786rem' }}>{e.carteiras.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {aba === 'fatores' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fator</th>
                  <th>Valor</th>
                  <th style={{ textAlign: 'right' }}>Montante</th>
                  <th style={{ textAlign: 'right' }}>% da casa</th>
                  <th style={{ textAlign: 'right' }}>Carteiras</th>
                  <th>Concentrado em</th>
                </tr>
              </thead>
              <tbody>
                {(DATA.fatores || []).map((f) => (
                  <tr key={f.fator + '|' + f.valor}>
                    <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{ROTULO_ATRIBUTO[f.fator] || f.fator}</td>
                    <td style={{ fontWeight: 600, fontSize: '0.857rem' }}>{f.valor}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(f.montante)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtPct(f.fracaoCasa, 1)}</td>
                    <td style={{ textAlign: 'right', fontSize: '0.786rem' }}>{f.carteiras.length}</td>
                    <td style={{ fontSize: '0.786rem' }}>
                      {f.carteirasConcentradas.length
                        ? <Pill cor={COR_SEV.media}>{f.carteirasConcentradas.join(', ')}</Pill>
                        : <span style={{ color: 'var(--muted)' }}>nenhuma</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {aba === 'deterioracao' && (
          (DATA.deterioracao || []).length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 150 }}>Carteira</th>
                    <th>Assessor</th>
                    <th style={{ textAlign: 'right' }}>Patrimonio antes</th>
                    <th style={{ textAlign: 'right' }}>Patrimonio hoje</th>
                    <th style={{ textAlign: 'right' }}>Variacao</th>
                    <th>Severidade</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {DATA.deterioracao.map((d) => (
                    <React.Fragment key={d.carteira}>
                      <tr>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{d.carteira}</div>
                          <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{nomeCarteira(d.carteira)}</div>
                        </td>
                        <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{nomeAssessor(assessorDe(d.carteira))}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(d.plAnterior)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(d.plAtual)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: COR_SEV.alta }}>
                          {d.deltaPct === null ? '—' : fmtPct(d.deltaPct, 1)}
                        </td>
                        <td><Pill cor={COR_SEV[d.severidade]}>{ROTULO_SEV[d.severidade]}</Pill></td>
                        <td>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ fontSize: '0.714rem', padding: '4px 10px' }}
                            onClick={() => alternar(d.insightId)}
                          >
                            {aberto === d.insightId ? 'Fechar' : 'Por que estou vendo isso?'}
                          </button>
                        </td>
                      </tr>
                      {aberto === d.insightId && (
                        <tr>
                          <td colSpan={7} style={{ padding: '0 12px 12px 24px' }}>
                            <PorQue insight={porId.get(d.insightId)} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={DATA.baseData ? 'Nenhuma carteira piorou no periodo' : 'Sem base de comparacao'}
              sub={DATA.baseData
                ? 'Comparado com ' + DATA.baseData + ', nenhuma carteira caiu o suficiente para entrar aqui.'
                : 'A serie ainda nao tem um periodo anterior distante o bastante para comparar mes contra mes.'}
              icon="trend"
            />
          )
        )}

        {aba === 'cobertura' && (
          <div>
            <div style={{ fontSize: '0.786rem', color: 'var(--muted)', marginBottom: 10 }}>
              Quanto do patrimonio de cada carteira tem cada atributo preenchido. Pior primeiro:
              esta e a fila de trabalho de quem completa o cadastro de ativos da instancia.
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 150 }}>Carteira</th>
                    <th style={{ textAlign: 'right' }}>Posicoes</th>
                    <th>Faixa</th>
                    {Object.keys(ROTULO_ATRIBUTO).map((a) => (
                      <th key={a} style={{ textAlign: 'right' }}>{ROTULO_ATRIBUTO[a]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(DATA.cobertura || []).map((c) => (
                    <tr key={c.carteira}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{c.carteira}</div>
                        <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{nomeCarteira(c.carteira)}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '0.786rem' }}>{c.posicoes}</td>
                      <td><Pill cor={COR_FAIXA[c.faixaGlobal]}>{ROTULO_FAIXA[c.faixaGlobal]}</Pill></td>
                      {Object.keys(ROTULO_ATRIBUTO).map((nome) => {
                        const a = c.atributos.find((x) => x.atributo === nome);
                        return (
                          <td key={nome} style={{ textAlign: 'right', whiteSpace: 'nowrap', color: a ? COR_FAIXA[a.faixa] : 'var(--muted)' }}>
                            {a ? fmtPct(a.fracao, 0) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Radar = Radar;
})();
