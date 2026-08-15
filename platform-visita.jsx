/* platform-visita.jsx — Visita (mobile, gerentes e assessores em visitas
   externas). Briefing de UM cliente numa rolagem so: dados do mes, achados,
   oportunidades em aberto, vencimentos, caixa parado com o custo da inacao,
   queda de receita e o valor do assessor na janela. Sintese das Fases 2-6,
   sem overlay proprio: tudo vem de AtlasData e das globals existentes.
   Nada sai do navegador.
*/
import React from 'react';
import './platform-valor-math.js';

(() => {
  const { useMemo } = React;

  const { fmtCompactBRL, fmtPct, fmtMonthLabel, navigate, storage } = window.AtlasUtils;
  const { Icon } = window.AtlasIcons;
  const { Badge, SeverityBadge, KPITile, EmptyState } = window.AtlasUI;
  const D = window.AtlasData;
  const VM = window.AtlasValorMath;
  const OP = window.ATLAS_OPORTUNIDADES_DATA;
  const VEN = window.ATLAS_VENCIMENTOS_DATA;
  const CP = window.ATLAS_CAIXA_PARADO_DATA;
  const RD = window.ATLAS_RECEITA_DROP_DATA;

  function Chip({ texto, cor }) {
    const variante = cor === 'red' ? ' visita-chip--red' : cor === 'amber' ? ' visita-chip--amber' : cor === 'navy' ? ' visita-chip--navy' : ' visita-chip--green';
    return (
      <span className={'visita-chip' + variante}>
        {texto}
      </span>
    );
  }

  function Visita({ code }) {
    const { useMonth } = window.AtlasContexts;
    const { selectedMonth } = useMonth();
    const meses = D && D.visibleMonths ? D.visibleMonths().months : [];
    const mesCorrente = selectedMonth || (meses.length ? meses[meses.length - 1] : (D && D.CURRENT_MONTH) || '');
    const p = D && D.CATALOG ? D.CATALOG.find((x) => x.code === code) : null;
    const row = D && p ? D.getRow(code, mesCorrente) : null;

    // Valor do assessor para este cliente (janela de 12 meses), mesmo cálculo
    // da Fase 6, restrito a um código.
    const linha = useMemo(() => {
      if (!D || !p || !meses.length) return null;
      const janela = VM.janelaMeses(meses, meses[meses.length - 1], 12);
      const rents = [];
      const rentsLiquidas = [];
      const cdis = [];
      let custosR$ = 0;
      let plFinal = 0;
      let ok = 0;
      for (const m of janela) {
        const r = D.getRow(code, m);
        if (!r || r.plCurr <= 0) continue;
        ok++;
        const custoMes = r.totalCost + r.revenue;
        const costPct = custoMes / r.plCurr;
        rents.push(r.rent);
        rentsLiquidas.push(VM.retornoLiquidoMensal(r.rent, costPct));
        cdis.push(r.cdi);
        custosR$ += custoMes;
        plFinal = r.plCurr;
      }
      if (!ok || plFinal <= 0) return null;
      const retLiquido = VM.acumularSerie(rentsLiquidas);
      const cdiAcc = VM.acumularSerie(cdis);
      const deltaPp = retLiquido - cdiAcc;
      return {
        retBruto: VM.acumularSerie(rents),
        retLiquido,
        cdiAcc,
        deltaPp,
        valorR$: VM.valorEmReais(deltaPp, plFinal),
        custosR$,
        plFinal,
      };
    }, [code, meses]);

    const cpMes = CP && CP.data ? CP.data.slice(0, 7) : '';
    const cdiCp = D && D.CDI && D.CDI[cpMes] ? D.CDI[cpMes] : 0;
    const itCaixa = CP && CP.itens ? CP.itens.find((i) => i.carteira === code) : null;
    const inacaoR$ = linha && itCaixa ? VM.custoInacao(itCaixa.rsDias, cdiCp) : 0;

    const oportunidades = useMemo(() => {
      const all = (OP && OP.oportunidades) || [];
      return all.filter((o) => o.cliente === code && ['Convertida', 'Perdida', 'Descartada'].indexOf(o.status) < 0);
    }, [code]);
    const vencimentos = useMemo(() => {
      const all = (VEN && VEN.vencimentos) || [];
      return all.filter((v) => v.carteira === code).sort((a, b) => a.diasRestantes - b.diasRestantes);
    }, [code]);
    const queda = RD && RD.itens ? RD.itens.find((i) => i.carteira === code) : null;
    const obs = storage && storage.getObs ? storage.getObs(code, mesCorrente) : null;

    if (!p) {
      return (
        <div>
          <EmptyState title="Cliente não encontrado" sub="O código desta carteira não existe no catálogo." icon="search" />
        </div>
      );
    }

    if (!row) {
      return (
        <div>
          <EmptyState title="Sem dados neste mês" sub="Não há extrato desta carteira no mês selecionado." icon="search" />
        </div>
      );
    }

    // Mesmas cores da tela de vencimentos (Fase 3): 7 vermelho, 15 âmbar,
    // 30 navy e 60/90 muted.
    const corJanela = (d) => (d === 7 ? 'red' : d === 15 ? 'amber' : 'navy');
    const corPrio = (pr) => (pr === 'P1' ? 'red' : pr === 'P2' ? 'amber' : 'green');
    const corSevQueda = (s) => (s === 'alta' ? 'red' : s === 'media' ? 'amber' : 'green');

    return (
      <div className="visita-stack">
        {/* Cabeçalho do cliente */}
        <div className="visita-card visita-card--full">
          <button className="visita-back" onClick={() => navigate('#/carteira/' + encodeURIComponent(code))}>
            <Icon name="chevronRight" size={14} style={{ transform: 'rotate(180deg)' }} />
            Voltar para a carteira
          </button>
          <div style={{ marginTop: 10 }}>
            <div className="page-eyebrow">{p.risk} · {p.code}</div>
            <h1 className="page-title" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600, margin: '2px 0 4px' }}>
              {p.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: '0.857rem', color: 'var(--muted)' }}>
              <Badge status={row.status} />
              <span>Extrato {fmtMonthLabel(mesCorrente)}</span>
              {row.manager && <span>· {row.manager.name}</span>}
            </div>
          </div>
        </div>

        {/* KPIs essenciais */}
        <div className="visita-card visita-card--full">
          <div className="visita-kpis">
            <KPITile label="Patrimônio" value={fmtCompactBRL(row.plCurr)} sub="PL no mês corrente" variant="navy" />
            <KPITile
              label="Rent. do mês"
              value={fmtPct(row.rent, 2)}
              sub={(row.vsCDI >= 0 ? 'acima do CDI ' : 'abaixo do CDI ') + fmtPct(row.vsCDI, 2)}
              variant={row.vsCDI >= 0 ? 'green' : 'red'}
            />
            <KPITile
              label="Valor entregue (12m)"
              value={linha ? fmtCompactBRL(linha.valorR$) : '—'}
              sub={linha ? (linha.deltaPp >= 0 ? '+' : '') + fmtPct(linha.deltaPp, 2) + ' pp vs CDI' : 'sem série'}
              variant={linha && linha.deltaPp >= 0 ? 'green' : 'red'}
            />
          </div>
        </div>

        {/* Frase do assessor */}
        <div className="visita-card visita-card--full">
          <div className="visita-card-title">Leitura da janela</div>
          <div className="visita-frase">
            {linha ? VM.frase(linha.deltaPp, inacaoR$, fmtCompactBRL) : 'Sem série suficiente na janela.'}
          </div>
          <div className="visita-note">Valor em R$ é aproximado: pontos percentuais × PL final da janela, não fluxo de caixa.</div>
        </div>

        {/* Achados do mês */}
        <div className="visita-card">
          <div className="visita-card-title">Achados do mês</div>
          {row.findings && row.findings.length ? (
            row.findings.map((f, i) => (
              <div key={i} className="visita-row" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                <SeverityBadge severity={f.severity} />
                <span style={{ fontSize: '0.857rem' }}>{f.text}</span>
              </div>
            ))
          ) : (
            <div className="visita-note" style={{ marginTop: 0 }}>Sem achados no mês.</div>
          )}
        </div>

        {/* Oportunidades em aberto */}
        <div className="visita-card">
          <div className="visita-card-title">Oportunidades em aberto</div>
          {oportunidades.length ? (
            oportunidades.map((o) => (
              <div key={o.id} className="visita-row" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                <Chip texto={o.prioridade} cor={corPrio(o.prioridade)} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.857rem' }}>{o.motivo}</div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{o.status} · prazo {o.prazo}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="visita-note" style={{ marginTop: 0 }}>Nenhuma oportunidade em aberto.</div>
          )}
        </div>

        {/* Vencimentos próximos */}
        <div className="visita-card">
          <div className="visita-card-title">Vencimentos próximos</div>
          {vencimentos.length ? (
            vencimentos.map((v) => (
              <div key={v.oportunidadeId} className="visita-row" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                <Chip texto={v.janelaDias + 'd'} cor={corJanela(v.janelaDias)} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.857rem' }}>{v.ativo}</div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>
                    {v.vencimento} · {fmtCompactBRL(v.valor)} · {fmtPct(v.pctPl, 1)} da carteira
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="visita-note" style={{ marginTop: 0 }}>Nenhum vencimento no horizonte.</div>
          )}
        </div>

        {/* Caixa parado */}
        <div className="visita-card">
          <div className="visita-card-title">Caixa parado</div>
          {itCaixa ? (
            <div className="visita-row" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
              <Chip texto={itCaixa.diasParado + 'd'} cor={itCaixa.diasParado >= 30 ? 'red' : itCaixa.diasParado >= 15 ? 'amber' : 'green'} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.857rem' }}>{fmtCompactBRL(itCaixa.liquidezAtual)} · {fmtPct(itCaixa.pctPlAtual, 1)} do PL</div>
                <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>
                  desde {itCaixa.inicioSequencia}{inacaoR$ > 0 ? ' · deixou de render ~' + fmtCompactBRL(inacaoR$) + ' (CDI)' : ''}
                </div>
              </div>
            </div>
          ) : (
            <div className="visita-note" style={{ marginTop: 0 }}>Sem caixa parado.</div>
          )}
        </div>

        {/* Queda de receita */}
        <div className="visita-card">
          <div className="visita-card-title">Queda de receita</div>
          {queda ? (
            <div className="visita-row" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
              <Chip texto={queda.severidade} cor={corSevQueda(queda.severidade)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.857rem' }}>{fmtPct(queda.quedaPct, 1)} no mês {queda.periodo}</div>
                <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>
                  {fmtCompactBRL(queda.receitaBase)} → {fmtCompactBRL(queda.receitaAtual)}
                </div>
              </div>
            </div>
          ) : (
            <div className="visita-note" style={{ marginTop: 0 }}>Sem queda de receita.</div>
          )}
        </div>

        {/* Valor do assessor */}
        <div className="visita-card visita-card--full">
          <div className="visita-card-title">Valor do assessor (12 meses)</div>
          {linha ? (
            <div className="visita-row">
              <span style={{ fontSize: '0.857rem' }}>
                Retorno líquido {fmtPct(linha.retLiquido, 2)} vs CDI {fmtPct(linha.cdiAcc, 2)}
              </span>
              <Chip texto={linha.deltaPp >= 0 ? 'ACIMA' : 'ABAIXO'} cor={linha.deltaPp >= 0 ? 'green' : 'red'} />
            </div>
          ) : (
            <div className="visita-note" style={{ marginTop: 0 }}>Sem série suficiente para o cálculo.</div>
          )}
          {linha && (
            <div className="visita-note">
              {fmtCompactBRL(linha.valorR$)} em reais na janela · custos {fmtCompactBRL(linha.custosR$)} · bruto {fmtPct(linha.retBruto, 2)}
            </div>
          )}
        </div>

        {/* Observação do analista */}
        <div className="visita-card visita-card--full">
          <div className="visita-card-title">Observação do analista</div>
          <div style={{ fontSize: '0.857rem' }}>{obs || '—'}</div>
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Visita = Visita;
})();
