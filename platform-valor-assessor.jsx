/* platform-valor-assessor.jsx — Valor do assessor (Fase 6).
   Sintese das Fases 1-5: quantifica em reais, carteira a carteira, o valor
   entregue pelo assessor. Tres camadas: custo da inacao (R$-dias do caixa
   parado x CDI, Fase 4), retorno liquido real vs CDI (todos os custos,
   incluindo a taxa da casa, que para o cliente e custo) e o saldo de valor
   entregue. Sem overlay proprio: le AtlasData (getRow) e
   ATLAS_CAIXA_PARADO_DATA, que as fases anteriores ja alimentam. Nada sai
   do navegador.
*/
import React from 'react';
import './platform-valor-math.js';

(() => {
  const { useMemo, useState } = React;

  const { fmtCompactBRL, fmtPct, fmtMonthLabel, downloadCSV } = window.AtlasUtils;
  const { Icon } = window.AtlasIcons;
  const { KPITile, EmptyState } = window.AtlasUI;
  const D = window.AtlasData;
  const VM = window.AtlasValorMath;
  const CP = window.ATLAS_CAIXA_PARADO_DATA;

  const JANELAS = [
    { id: 3, label: '3 meses' },
    { id: 6, label: '6 meses' },
    { id: 12, label: '12 meses' },
    { id: 24, label: '24 meses' },
    { id: null, label: 'Desde o inicio' },
  ];

  function nomeAssessor(id) {
    if (!D || !D.MANAGERS) return id || '';
    const m = D.MANAGERS.find((x) => x.id === id);
    return m ? m.name : (id || '');
  }

  function assessorDe(carteira) {
    // Fonte principal: D.MANAGERS[].codes (o caminho do dado real; o catálogo
    // montado por importPortfolioData não carrega mgr). O mgr do catálogo é o
    // fallback do demo.
    if (D && D.MANAGERS) {
      const m = D.MANAGERS.find((x) => (x.codes || []).indexOf(carteira) >= 0);
      if (m) return m.id;
    }
    if (!D || !D.CATALOG) return '';
    const p = D.CATALOG.find((x) => x.code === carteira);
    return p && p.mgr ? p.mgr : '';
  }

  function nomeCarteira(code) {
    if (!D || !D.CATALOG) return code;
    const p = D.CATALOG.find((x) => x.code === code);
    return p ? p.name : code;
  }

  // Fonte única: platform-valor-math.js (compartilhada com a tela de visita).
  const frase = (deltaPp, inacaoR$) => VM.frase(deltaPp, inacaoR$, fmtCompactBRL);

  function ValorAssessor() {
    const [janelaSel, setJanelaSel] = useState(12);
    const [filtroMgr, setFiltroMgr] = useState('');

    const meses = D && D.visibleMonths ? D.visibleMonths().months : [];
    const dataFim = meses.length ? meses[meses.length - 1] : '';
    const janela = useMemo(
      () => (meses.length ? VM.janelaMeses(meses, dataFim, janelaSel) : []),
      [meses, dataFim, janelaSel]
    );

    const cpMes = CP && CP.data ? CP.data.slice(0, 7) : '';
    const cdiCp = CP && D && D.CDI && D.CDI[cpMes] ? D.CDI[cpMes] : 0;
    const cpPorCarteira = useMemo(() => {
      const m = {};
      if (CP && CP.itens) for (const it of CP.itens) m[it.carteira] = it;
      return m;
    }, []);

    const linhas = useMemo(() => {
      if (!D || !D.CATALOG || !janela.length) return [];
      const out = [];
      for (const p of D.CATALOG) {
        const rents = [];
        const rentsLiquidas = [];
        const cdis = [];
        let custosR$ = 0;
        let plFinal = 0;
        let okMeses = 0;
        for (const m of janela) {
          const row = D.getRow(p.code, m);
          if (!row || row.plCurr <= 0) continue;
          okMeses++;
          // Custo do cliente = 7 camadas (totalCost) + taxa da casa (revenue).
          // totalCost nao inclui o feeArr; sem esta soma a taxa ficaria fora.
          const custoMes = row.totalCost + row.revenue;
          const costPct = row.plCurr > 0 ? custoMes / row.plCurr : 0;
          rents.push(row.rent);
          rentsLiquidas.push(VM.retornoLiquidoMensal(row.rent, costPct));
          cdis.push(row.cdi);
          custosR$ += custoMes;
          plFinal = row.plCurr;
        }
        if (!okMeses || plFinal <= 0) continue;
        const retBruto = VM.acumularSerie(rents);
        const retLiquido = VM.acumularSerie(rentsLiquidas);
        const cdiAcc = VM.acumularSerie(cdis);
        const deltaPp = retLiquido - cdiAcc;
        const valorR$ = VM.valorEmReais(deltaPp, plFinal);
        const it = cpPorCarteira[p.code];
        const inacaoR$ = it ? VM.custoInacao(it.rsDias, cdiCp) : 0;
        out.push({
          code: p.code,
          assessor: assessorDe(p.code),
          retBruto,
          retLiquido,
          cdiAcc,
          deltaPp,
          valorR$,
          custosR$,
          custosPct: custosR$ / plFinal,
          inacaoR$,
          plFinal,
        });
      }
      out.sort((a, b) => b.valorR$ - a.valorR$);
      return out;
    }, [janela, cpPorCarteira, cdiCp]);

    const visiveis = useMemo(
      () => (filtroMgr ? linhas.filter((v) => v.assessor === filtroMgr) : linhas),
      [linhas, filtroMgr]
    );

    if (!linhas.length) {
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Advisor Intelligence</div>
            <h1 className="page-title">Valor do assessor</h1>
          </div>
          <EmptyState
            title="Sem dados na janela"
            sub="Quando houver série de retorno e custos no período escolhido, as carteiras aparecem aqui."
            icon="search"
          />
        </div>
      );
    }

    const totalValor = visiveis.reduce((s, v) => s + v.valorR$, 0);
    const positivas = visiveis.filter((v) => v.valorR$ >= 0).length;
    const deixadoNaMesa = visiveis.reduce((s, v) => s + Math.max(0, -v.valorR$), 0);
    const totalInacao = visiveis.reduce((s, v) => s + v.inacaoR$, 0);

    function exportar() {
      const rows = visiveis.map((v) => ({
        Carteira: v.code,
        Assessor: nomeAssessor(v.assessor),
        'Retorno bruto %': Math.round(v.retBruto * 1000) / 10,
        'Custos (R$)': v.custosR$,
        'Custos (% do PL)': Math.round(v.custosPct * 1000) / 10,
        'Retorno liquido %': Math.round(v.retLiquido * 1000) / 10,
        'CDI %': Math.round(v.cdiAcc * 1000) / 10,
        'Valor entregue (R$)': v.valorR$,
        'Valor entregue (pp)': Math.round(v.deltaPp * 1000) / 10,
        'Inacao (R$)': v.inacaoR$,
        'Frase da janela': frase(v.deltaPp, v.inacaoR$),
      }));
      downloadCSV(rows, 'atlas_valor_assessor_' + new Date().toISOString().slice(0, 10));
    }

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Advisor Intelligence</div>
          <h1 className="page-title">Valor do assessor</h1>
          <div className="page-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              {visiveis.length} carteiras · janela de {janela.length} meses · até {fmtMonthLabel(dataFim)} · Custo da inação (90 dias): {fmtCompactBRL(totalInacao)}
            </span>
            <button className="btn btn--ghost" onClick={exportar} style={{ fontSize: '0.786rem', padding: '6px 12px' }}>
              <Icon name="export" size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={janelaSel === null ? 'null' : String(janelaSel)}
            onChange={(e) => setJanelaSel(e.target.value === 'null' ? null : Number(e.target.value))}
            style={{ fontSize: '0.786rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
          >
            {JANELAS.map((j) => (
              <option key={String(j.id)} value={j.id === null ? 'null' : String(j.id)}>{j.label}</option>
            ))}
          </select>
          <select
            value={filtroMgr}
            onChange={(e) => setFiltroMgr(e.target.value)}
            style={{ fontSize: '0.786rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value="">Todos os assessores</option>
            {D.MANAGERS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
          <KPITile label="Valor entregue (janela)" value={fmtCompactBRL(totalValor)} sub="Soma dos deltas líquidos vs CDI" variant={totalValor < 0 ? 'red' : 'navy'} />
          <KPITile label="Carteiras acima do CDI" value={positivas + '/' + linhas.length} sub="Retorno líquido vs CDI na janela" variant="green" />
          <KPITile label="Deixado na mesa" value={fmtCompactBRL(deixadoNaMesa)} sub="Soma dos deltas negativos vs CDI" variant="red" />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Carteira</th>
                <th>Assessor</th>
                <th style={{ textAlign: 'right' }}>Retorno bruto</th>
                <th style={{ textAlign: 'right' }}>Custos</th>
                <th style={{ textAlign: 'right' }}>Retorno líquido</th>
                <th style={{ textAlign: 'right' }}>CDI</th>
                <th style={{ textAlign: 'right' }}>Valor entregue</th>
                <th style={{ textAlign: 'right' }}>Inação R$</th>
                <th>Frase da janela</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((v) => (
                <tr key={v.code}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{v.code}</div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{nomeCarteira(v.code)}</div>
                  </td>
                  <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{nomeAssessor(v.assessor)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtPct(v.retBruto, 1)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {fmtCompactBRL(v.custosR$)}
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{fmtPct(v.custosPct, 2)} do PL final</div>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtPct(v.retLiquido, 1)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtPct(v.cdiAcc, 1)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                      fontSize: '0.714rem', fontWeight: 600,
                      color: v.valorR$ >= 0 ? 'var(--green, #166534)' : 'var(--red, #b91c1c)',
                      border: '1px solid currentColor',
                    }}>
                      {fmtCompactBRL(v.valorR$)} · {fmtPct(v.deltaPp, 2)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {v.inacaoR$ > 0 ? fmtCompactBRL(v.inacaoR$) : '—'}
                  </td>
                  <td className="cell-prose" style={{ fontSize: '0.786rem', maxWidth: 380 }}>{frase(v.deltaPp, v.inacaoR$)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: '0.786rem', color: 'var(--muted)', marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2, #f1f5f9)' }}>
          (i) O valor em R$ é aproximado: pontos percentuais de excesso × PL final da janela, não fluxo de caixa.
          (ii) No dado real, os custos além da taxa da casa estão zerados na decomposição; a coluna Custos então reflete só a taxa da casa, um piso, não o custo total.
          (iii) O valor do assessor inclui componentes comportamentais (disciplina, alocação, aversão a perdas) que este dado não mede; como na pesquisa da Vanguard, a leitura aqui é a do portfólio.
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.ValorAssessor = ValorAssessor;
})();
