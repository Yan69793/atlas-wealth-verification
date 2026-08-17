/* platform-caixa-parado.jsx — Caixa parado (Fase 4).
   Mostra a liquidez parada por carteira: quanto, ha quantos dias e o acumulado
   de valor × tempo (R$ × dias) na janela de 90 dias. O dado vem do demo
   sintetico (platform-caixa-parado-demo.js) ou do overlay da instancia
   (platform-caixa-parado.js, LGPD, gitignored). Fatos, sem julgamento de
   qualidade: a decisao sobre o caixa e do assessor. Nada sai do navegador.
*/
import React from 'react';

(() => {
  const { useMemo } = React;

  const { fmtCompactBRL, fmtPct, downloadCSV, navigate, statusOportunidade } = window.AtlasUtils;
  const { Icon } = window.AtlasIcons;
  const { KPITile, EmptyState } = window.AtlasUI;
  const D = window.AtlasData;

  // Faixas de duracao sao escala de apresentacao do tempo parado, nao nota de
  // qualidade da carteira.
  function corDias(dias) {
    if (dias >= 30) return 'var(--red, #b91c1c)';
    if (dias >= 15) return 'var(--amber, #b45309)';
    return 'var(--navy, #1e3a5f)';
  }

  function nomeAssessor(id) {
    /* MANAGERS em caixa alta: com `managers` o guard caia sempre e a coluna
       Assessor mostrava o codigo interno em vez do nome. */
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

  /* "R$ x dias" e reais multiplicado por dias, nao um saldo. Formatar com
     fmtCompactBRL colocava "R$" num numero que nao e dinheiro, na mesma grade do
     "Total parado hoje", que e dinheiro de verdade. Aqui vai so a magnitude e a
     unidade fica no rotulo. O CSV continua exportando o numero cru. */
  function fmtCompactRsDias(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1e9) return sign + (abs / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bi';
    if (abs >= 1e6) return sign + (abs / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mi';
    if (abs >= 1e3) return sign + (abs / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' mil';
    return sign + abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  function CaixaParado() {
    const DATA = window.ATLAS_CAIXA_PARADO_DATA;
    /* Ordena por R$ x dias decrescente, como o motor faz em idle-cash. Nao
       confiar na ordem do arquivo: o payload vinha crescente, entao o pior caso
       da lista caia na ultima linha da tabela. */
    const base = useMemo(() => {
      const itens = DATA && DATA.itens ? DATA.itens.slice() : [];
      return itens.sort((a, b) => (b.rsDias || 0) - (a.rsDias || 0));
    }, []);
    const janelaDias = DATA && DATA.janelaDias ? DATA.janelaDias : 90;
    const motivo = DATA ? DATA.motivo : null;

    if (!base.length) {
      const insuficiente = motivo === 'serie-curta' || motivo === 'periodo-mensal';
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Advisor Intelligence</div>
            <h1 className="page-title">Caixa parado</h1>
          </div>
          <EmptyState
            title={insuficiente ? 'Dados insuficientes' : 'Nenhuma carteira com caixa parado'}
            sub={
              insuficiente
                ? 'A serie diaria ainda e curta demais para medir dinheiro parado. Quando houver mais dias de extratos, a analise aparece aqui.'
                : 'Quando a liquidez ficar acima de 10% do patrimonio por 7 dias ou mais, a carteira aparece aqui.'
            }
            icon="revenue"
          />
        </div>
      );
    }

    const totalParadoHoje = base.reduce((s, v) => s + v.liquidezAtual, 0);
    const totalRsDias = base.reduce((s, v) => s + v.rsDias, 0);

    function criarOportunidade(v) {
      const motivo =
        'Liquidez de ' + fmtCompactBRL(v.liquidezAtual) + ' (' + fmtPct(v.pctPlAtual, 1) +
        ' do PL) parada ha ' + v.diasParado + ' dias: avaliar alocacao';
      // opid = id canonico que o motor grava em cada item (idle-cash.ts). Sem
      // ele cada clique criava uma linha nova e o botao nunca virava chip.
      navigate(
        '#/oportunidades?nova=1&carteira=' + encodeURIComponent(v.carteira) +
        '&motivo=' + encodeURIComponent(motivo) +
        '&origem=achado&periodo=' + encodeURIComponent(((DATA && DATA.data) || '').slice(0, 7)) +
        '&opid=' + encodeURIComponent(v.oportunidadeId || '')
      );
    }

    function exportar() {
      const rows = base.map((v) => ({
        Carteira: v.carteira,
        Assessor: nomeAssessor(assessorDe(v.carteira)),
        'Liquidez hoje': v.liquidezAtual,
        '% do PL': Math.round(v.pctPlAtual * 1000) / 10,
        'Dias parado': v.diasParado,
        'R$ x dias (janela)': v.rsDias,
        'R$ x dias (sequencia)': v.rsDiasSequencia,
        Pico: v.pico,
        'Inicio da sequencia': v.inicioSequencia,
        Oportunidade: statusOportunidade(v.oportunidadeId) || 'sem acao',
      }));
      downloadCSV(rows, 'atlas_caixa_parado_' + new Date().toISOString().slice(0, 10));
    }

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Advisor Intelligence</div>
          <h1 className="page-title">Caixa parado</h1>
          <div className="page-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{base.length} carteiras com caixa parado · janela de {janelaDias} dias</span>
            <button className="btn btn--ghost" onClick={exportar} style={{ fontSize: '0.786rem', padding: '6px 12px' }}>
              <Icon name="export" size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <KPITile label="Total parado hoje" value={fmtCompactBRL(totalParadoHoje)} sub="Soma da liquidez das carteiras" variant="navy" />
          <KPITile label="R$ × dias (janela)" value={fmtCompactRsDias(totalRsDias)} sub="Valor × tempo em caixa" variant="navy" />
          <KPITile label="Carteiras na lista" value={base.length} sub="Paradas há 7 dias ou mais" />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Carteira</th>
                <th>Assessor</th>
                <th style={{ textAlign: 'right' }}>Liquidez hoje</th>
                <th style={{ textAlign: 'right' }}>% do PL</th>
                <th>Dias parado</th>
                <th style={{ textAlign: 'right' }}>R$ × dias</th>
                <th style={{ textAlign: 'right' }}>Pico</th>
                <th>Oportunidade</th>
              </tr>
            </thead>
            <tbody>
              {base.map((v) => (
                <tr key={v.carteira}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{v.carteira}</div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{nomeCarteira(v.carteira)}</div>
                  </td>
                  <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{nomeAssessor(assessorDe(v.carteira))}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(v.liquidezAtual)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtPct(v.pctPlAtual, 1)}</td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                      fontSize: '0.714rem', fontWeight: 600, color: corDias(v.diasParado),
                      border: '1px solid ' + corDias(v.diasParado), whiteSpace: 'nowrap',
                    }}>
                      {v.diasParado}d
                    </span>
                    <span style={{ fontSize: '0.714rem', color: 'var(--muted)' }}> · desde {v.inicioSequencia}</span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {fmtCompactRsDias(v.rsDias)}
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>sequência {fmtCompactRsDias(v.rsDiasSequencia)}</div>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(v.pico)}</td>
                  <td>
                    {statusOportunidade(v.oportunidadeId) ? (
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                        fontSize: '0.714rem', fontWeight: 600,
                        color: statusOportunidade(v.oportunidadeId) === 'Convertida' ? 'var(--green, #166534)'
                          : ['Perdida', 'Descartada'].indexOf(statusOportunidade(v.oportunidadeId)) >= 0 ? 'var(--muted, #64748b)'
                          : 'var(--amber, #b45309)',
                        border: '1px solid currentColor', whiteSpace: 'nowrap',
                      }}>
                        {statusOportunidade(v.oportunidadeId)}
                      </span>
                    ) : (
                      <button
                        className="btn btn--ghost"
                        title="Criar oportunidade a partir deste caixa parado"
                        onClick={() => criarOportunidade(v)}
                        style={{ fontSize: '0.714rem', padding: '2px 8px', whiteSpace: 'nowrap' }}
                      >
                        Criar oportunidade
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.CaixaParado = CaixaParado;
})();
