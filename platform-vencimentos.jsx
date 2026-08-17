/* platform-vencimentos.jsx — Vencimentos (Fase 3).
   Lista os vencimentos futuros dentro das janelas 7/15/30/60/90, com peso na
   carteira e a oportunidade associada da Fase 2. O dado vem do demo sintetico
   (platform-vencimentos-demo.js) ou do overlay da instancia
   (platform-vencimentos.js, LGPD, gitignored). Nada sai do navegador.
*/
import React from 'react';

(() => {
  const { useState, useMemo } = React;

  const { fmtCompactBRL, fmtPct, downloadCSV, navigate, statusOportunidade } = window.AtlasUtils;
  const { Icon } = window.AtlasIcons;
  const { KPITile, EmptyState } = window.AtlasUI;
  const D = window.AtlasData;

  const COR_JANELA = {
    7: 'var(--red, #b91c1c)',
    15: 'var(--amber, #b45309)',
    30: 'var(--navy, #1e3a5f)',
    60: 'var(--muted, #64748b)',
    90: 'var(--muted, #64748b)',
  };

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

  // O nome do ativo no book carrega o vencimento colado ('...Vencto: 14/07/2026').
  // A coluna Vencimento ja mostra a data; aqui o sufixo sai so da exibicao.
  function ativoLimpo(ativo) {
    return String(ativo).replace(/\s*Vencto:?\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i, '');
  }

  /* statusOportunidade vem de AtlasUtils e olha a base E o navegador. A versao
     local desta tela lia so a base estatica da janela, onde a oportunidade
     recem-criada nunca esta: o botao nunca virava chip e cada clique criava
     outra linha. */

  function Vencimentos() {
    const base = useMemo(
      () => (window.ATLAS_VENCIMENTOS_DATA ? window.ATLAS_VENCIMENTOS_DATA.vencimentos : []),
      []
    );
    const lista = useMemo(
      () =>
        [...base].sort((a, b) => {
          if (a.vencimento !== b.vencimento) return a.vencimento < b.vencimento ? -1 : 1;
          if (a.carteira !== b.carteira) return a.carteira.localeCompare(b.carteira);
          return a.ativo.localeCompare(b.ativo);
        }),
      [base]
    );

    if (!lista.length) {
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Advisor Intelligence</div>
            <h1 className="page-title">Vencimentos</h1>
          </div>
          <EmptyState
            title="Nenhum vencimento no horizonte"
            sub="Quando os extratos trouxerem vencimentos dentro das janelas monitoradas, eles aparecem aqui."
            icon="trending_up"
          />
        </div>
      );
    }

    const em7 = lista.filter((v) => v.janelaDias === 7).length;
    const em15 = lista.filter((v) => v.janelaDias === 15).length;
    const em30 = lista.filter((v) => v.janelaDias <= 30).length;
    const valorTotal = lista.reduce((s, v) => s + v.valor, 0);

    function criarOportunidade(v) {
      const motivo = 'Vencimento de ' + ativoLimpo(v.ativo) + ' em ' + v.diasRestantes + ' dias: avaliar renovação/rotação';
      // opid = id canonico do motor (o mesmo que esta tela consulta para
      // decidir entre chip e botao). Sem ele a oportunidade criada ganhava id
      // novo a cada clique e nunca fechava o ciclo.
      navigate(
        '#/oportunidades?nova=1&carteira=' + encodeURIComponent(v.carteira) +
        '&motivo=' + encodeURIComponent(motivo) +
        '&origem=achado&periodo=' + encodeURIComponent(v.vencimento.slice(0, 7)) +
        '&opid=' + encodeURIComponent(v.oportunidadeId || '')
      );
    }

    function exportar() {
      const rows = lista.map((v) => ({
        Carteira: v.carteira,
        Assessor: nomeAssessor(assessorDe(v.carteira)),
        Ativo: ativoLimpo(v.ativo),
        Emissor: v.instituicao || '',
        Valor: v.valor,
        '% da carteira': Math.round(v.pctPl * 1000) / 10,
        Vencimento: v.vencimento,
        'Janela (dias)': v.janelaDias,
        Oportunidade: statusOportunidade(v.oportunidadeId) || 'sem acao',
      }));
      downloadCSV(rows, 'atlas_vencimentos_' + new Date().toISOString().slice(0, 10));
    }

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Advisor Intelligence</div>
          <h1 className="page-title">Vencimentos</h1>
          <div className="page-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{lista.length} vencimentos nos próximos 90 dias · {fmtCompactBRL(valorTotal)}</span>
            <button className="btn btn--ghost" onClick={exportar} style={{ fontSize: '0.786rem', padding: '6px 12px' }}>
              <Icon name="export" size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <KPITile label="Até 7 dias" value={em7} sub="Ação imediata" variant={em7 > 0 ? 'red' : undefined} />
          <KPITile label="De 8 a 15 dias" value={em15} sub="Agendar contato" variant={em15 > 0 ? 'amber' : undefined} />
          <KPITile label="Até 30 dias" value={em30} sub="Horizonte do mês" variant="navy" />
          <KPITile label="Volume total" value={fmtCompactBRL(valorTotal)} sub="Soma monitorada" />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Carteira</th>
                <th>Assessor</th>
                <th>Ativo</th>
                <th>Emissor</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'right' }}>% da carteira</th>
                <th>Vencimento</th>
                <th>Janela</th>
                <th>Oportunidade</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => {
                const status = statusOportunidade(v.oportunidadeId);
                return (
                  <tr key={v.oportunidadeId}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{v.carteira}</div>
                      <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{nomeCarteira(v.carteira)}</div>
                    </td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{nomeAssessor(assessorDe(v.carteira))}</td>
                    <td className="cell-prose" style={{ fontSize: '0.857rem', maxWidth: 340 }}>{ativoLimpo(v.ativo)}</td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{v.instituicao || '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(v.valor)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtPct(v.pctPl, 1)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {v.vencimento}
                      <span style={{ fontSize: '0.714rem', color: 'var(--muted)' }}> · +{v.diasRestantes}d</span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                        fontSize: '0.714rem', fontWeight: 600, color: COR_JANELA[v.janelaDias] || 'var(--muted)',
                        border: '1px solid ' + (COR_JANELA[v.janelaDias] || 'var(--muted)'), whiteSpace: 'nowrap',
                      }}>
                        {v.janelaDias}d
                      </span>
                    </td>
                    <td>
                      {status ? (
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                          fontSize: '0.714rem', fontWeight: 600,
                          color: status === 'Convertida' ? 'var(--green, #166534)'
                            : status === 'Perdida' || status === 'Descartada' ? 'var(--muted, #64748b)'
                            : 'var(--amber, #b45309)',
                          border: '1px solid currentColor', whiteSpace: 'nowrap',
                        }}>
                          {status}
                        </span>
                      ) : (
                        <button
                          className="btn btn--ghost"
                          title="Criar oportunidade a partir deste vencimento"
                          onClick={() => criarOportunidade(v)}
                          style={{ fontSize: '0.714rem', padding: '2px 8px', whiteSpace: 'nowrap' }}
                        >
                          Criar oportunidade
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Vencimentos = Vencimentos;
})();
