/* platform-cliente.jsx — a tela do cliente final.

   Não é o painel institucional com abas cortadas. É o extrato que o cliente
   confere: patrimônio, rentabilidade, alocação, liquidez, vencimentos e o que
   se moveu no mês. Uma carteira só, a dele.

   O que NÃO existe aqui, por decisão de produto e não por esquecimento:
   receita da casa, taxa de gestão, corretagem, custódia, spread, imposto,
   meta de ROA e comparativo entre carteiras. Esses campos nem chegam: o
   servidor projeta a resposta por papel antes de enviar, e a lista branca da
   projeção de cliente é patrimônio, movimentação e rentabilidade. A tela não
   os esconde, ela não os tem. Se algum dia um deles aparecer no payload, este
   arquivo continuaria sem mostrá-lo, porque não pergunta por ele.

   O eixo de assessor também não vem: o cliente não recebe a atribuição
   interna, e a tabela de gestores chega vazia de propósito. */

import React from 'react';

(() => {
  const { useMemo } = React;

  const { fmt, fmtBRL, fmtCompactBRL, fmtPct, fmtMonthLabel, signClass, downloadCSV } = window.AtlasUtils;
  const { Icon } = window.AtlasIcons;
  const { KPITile, EmptyState } = window.AtlasUI;
  const { LineChart } = window.AtlasCharts;
  const D = window.AtlasData;

  // Nome da conferência do mês, na linguagem de quem recebe o extrato. O
  // vocabulário interno (LIBERAR / COM ALERTA / CORRIGIR) é do escritório e
  // fala de processo, não do patrimônio do cliente.
  const ROTULO_STATUS = {
    'LIBERAR': 'Conferida',
    'COM ALERTA': 'Conferida com ressalva',
    'CORRIGIR': 'Em verificação',
  };

  /* Paleta única da alocação, a mesma do painel institucional para o mesmo
     conceito (classe de ativo) não mudar de cor entre as duas telas. */
  const ALLOC_COLORS = ['#05305F','#C4A228','#2B6CB0','#276749','#9A9188','#553C9A','#C05621','#D97706'];

  /* Evolução do patrimônio em BRL. O LineChart de AtlasCharts formata tudo em
     porcentagem (é gráfico de retorno), então aqui o eixo é Recharts puro com
     formatação de moeda. Degrada em silêncio se a biblioteca não carregou. */
  function EvolucaoPatrimonio({ dados }) {
    const R = window.Recharts;
    if (!R || !dados || dados.length < 2) return null;
    const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = R;
    const chartData = dados.map((d) => ({ label: fmtMonthLabel(d.month), pl: d.value }));
    return (
      <ResponsiveContainer width="100%" height={220} debounce={50}>
        <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cliPlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#05305F" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#05305F" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD5" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9A9188' }} />
          <YAxis tickFormatter={(v) => fmtCompactBRL(v)} tick={{ fontSize: 10, fill: '#9A9188' }} width={66} />
          <Tooltip
            formatter={(v) => [fmtBRL(v), 'Patrimônio']}
            contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #E3DDD5', background: '#F9F7F4' }}
          />
          <Area type="monotone" dataKey="pl" stroke="#05305F" strokeWidth={2} fill="url(#cliPlGrad)" dot={false} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  /* Alocação por classe em rosca, espelho do que o painel institucional mostra
     na aba Composição. Sem campo institucional: usa só classe e saldo. */
  function AlocacaoPie({ dados, total }) {
    const R = window.Recharts;
    if (!R || !dados || !dados.length) return null;
    const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = R;
    const pieData = dados.map((c) => ({ name: c.cls, value: +(((total > 0 ? c.saldo / total : 0) * 100).toFixed(2)) }));
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} innerRadius={52} outerRadius={84} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
            {pieData.map((_, i) => (<Cell key={i} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />))}
          </Pie>
          <Tooltip
            formatter={(v) => [v.toFixed(1) + '%', '']}
            contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #E3DDD5', background: '#F9F7F4' }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  /* Cliente tem uma carteira. Se a API devolver mais de uma, o certo é mostrar
     a dele, que é a que a sessão nomeia em clienteId — não a primeira da
     lista, que seria decidir por ordem de catálogo algo que é identidade.
     Sem sessão ou sem clienteId, não escolhe carteira por posição de catálogo. */
  function carteiraDoCliente() {
    if (!D || !D.CATALOG || !D.CATALOG.length) return null;
    const s = window.__ATLAS_SESSAO__;
    if (s && s.clienteId) {
      const achada = D.CATALOG.filter((p) => p.code === s.clienteId)[0];
      if (achada) return achada;
    }
    return null;
  }

  function Cliente() {
    const { useMonth } = window.AtlasContexts;
    const { selectedMonth } = useMonth();

    const carteira = useMemo(carteiraDoCliente, []);
    const code = carteira ? carteira.code : null;

    const row = useMemo(() => (code ? D.getRow(code, selectedMonth) : null), [code, selectedMonth]);
    const comp = useMemo(() => (code ? D.getComposition(code, selectedMonth) : []), [code, selectedMonth]);
    const mov = useMemo(() => (code ? D.getMovimentacoes(code, selectedMonth) : null), [code, selectedMonth]);

    // Doze meses até o selecionado, para a leitura de rentabilidade não morrer
    // no mês corrente. Fatiado por índice, e não por data, porque MONTHS é a
    // janela do conjunto e é ela que os arrays seguem.
    const janela = useMemo(() => {
      const mi = D.MONTHS.indexOf(selectedMonth);
      if (mi < 0) return [];
      const de = Math.max(0, mi - 11);
      const saida = [];
      for (let i = de; i <= mi; i++) {
        const r = code ? D.getRow(code, D.MONTHS[i]) : null;
        saida.push({ mes: D.MONTHS[i], rent: r ? r.rent : null, cdi: D.CDI[D.MONTHS[i]] });
      }
      return saida;
    }, [code, selectedMonth]);

    // Acumulado do ano corrente: composto, não somado. Somar rentabilidade
    // mensal é o erro clássico, e num extrato de cliente ele aparece como
    // número que não fecha com nada.
    const acumuladoAno = useMemo(() => {
      const ano = selectedMonth ? selectedMonth.slice(0, 4) : '';
      let cliente = 1, cdi = 1, n = 0;
      janela.forEach((m) => {
        if (m.mes.slice(0, 4) !== ano || m.rent === null) return;
        cliente *= (1 + m.rent);
        cdi *= (1 + (m.cdi || 0));
        n++;
      });
      if (!n) return null;
      return { cliente: cliente - 1, cdi: cdi - 1, meses: n };
    }, [janela, selectedMonth]);

    // Série de patrimônio da janela (para o gráfico de evolução) e série de
    // rentabilidade acumulada contra o CDI. Sai tudo do que o cliente já
    // recebe; nenhum campo institucional entra.
    const seriePatrimonio = useMemo(() => {
      const mi = D.MONTHS.indexOf(selectedMonth);
      if (mi < 0 || !code) return [];
      const de = Math.max(0, mi - 11);
      const saida = [];
      for (let i = de; i <= mi; i++) {
        const r = D.getRow(code, D.MONTHS[i]);
        saida.push({ month: D.MONTHS[i], value: r ? r.plCurr : null });
      }
      return saida;
    }, [code, selectedMonth]);

    const serieRentabilidade = useMemo(() => {
      const cliS = [], cdiS = [];
      let a = 1, b = 1;
      janela.forEach((m) => {
        if (m.rent !== null) a *= (1 + m.rent);
        b *= (1 + (m.cdi || 0));
        cliS.push({ month: m.mes, value: a - 1 });
        cdiS.push({ month: m.mes, value: b - 1 });
      });
      return [
        { label: 'Rentabilidade', color: 'var(--navy)', width: 2, data: cliS },
        { label: 'CDI', color: 'var(--muted)', dash: '4 2', width: 1.5, data: cdiS },
      ];
    }, [janela]);

    const porClasse = useMemo(() => {
      const mapa = {};
      comp.forEach((r) => {
        const k = r.cls || 'Outros';
        if (!mapa[k]) mapa[k] = { cls: k, saldo: 0, varBRL: 0 };
        mapa[k].saldo += r.saldoFinal || 0;
        mapa[k].varBRL += r.varBRL || 0;
      });
      const lista = Object.keys(mapa).map((k) => mapa[k]);
      lista.sort((a, b) => b.saldo - a.saldo);
      return lista;
    }, [comp]);

    const totalComp = porClasse.reduce((s, c) => s + c.saldo, 0);

    const posicoes = useMemo(
      () => comp.slice().sort((a, b) => (b.saldoFinal || 0) - (a.saldoFinal || 0)),
      [comp]
    );

    const liquidez = porClasse.filter((c) => c.cls === 'Liquidez')[0] || null;
    const vencimentos = useMemo(
      () => comp.filter((r) => r.vencto).sort((a, b) => {
        const [da, ma, aa] = a.vencto.split('/');
        const [db, mb, ab] = b.vencto.split('/');
        return (aa + ma + da).localeCompare(ab + mb + db);
      }),
      [comp]
    );

    if (!carteira || !row) {
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Área do cliente</div>
            <h1 className="page-title">Minha carteira</h1>
          </div>
          <EmptyState
            title="Nenhuma carteira vinculada a este acesso"
            sub="Fale com quem administra o seu acesso no escritório para vincular a sua carteira."
          />
        </div>
      );
    }

    function exportar() {
      const rows = posicoes.map((r) => ({
        Mes: fmtMonthLabel(selectedMonth),
        Carteira: carteira.name,
        Ativo: r.name,
        Classe: r.cls || '',
        Saldo: (r.saldoFinal || 0).toFixed(2),
        Variacao: (r.varBRL || 0).toFixed(2),
        Rentabilidade: (r.retAtivo * 100).toFixed(2) + '%',
        'Vencimento': r.vencto || '',
      }));
      downloadCSV(rows, 'atlas_minha_carteira_' + selectedMonth);
    }

    const nomeSessao = (window.__ATLAS_SESSAO__ && window.__ATLAS_SESSAO__.nome) || '';

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Área do cliente</div>
          <h1 className="page-title">Minha carteira</h1>
          <div className="page-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span>
              {carteira.name} · {fmtMonthLabel(selectedMonth)}
              {nomeSessao ? ' · ' + nomeSessao : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Classe de badge direto, e não o componente Badge: aquele
                  traduz o vocabulário interno por tabela fixa e este rótulo
                  precisa ser o do cliente. */}
              <span className={'badge ' + (row.status === 'LIBERAR' ? 'badge--green' : 'badge--amber')}>
                {ROTULO_STATUS[row.status] || row.status}
              </span>
              <button className="btn btn--ghost" onClick={exportar} style={{ fontSize: '0.786rem', padding: '6px 12px' }}>
                <Icon name="export" size={14} /> Exportar CSV
              </button>
            </span>
          </div>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <KPITile
            label="Patrimônio"
            value={fmtCompactBRL(row.plCurr)}
            sub={'Posição em ' + fmtMonthLabel(selectedMonth)}
            variant="navy"
          />
          <KPITile
            label="Variação no mês"
            value={fmtCompactBRL(row.varBRL)}
            sub={fmtPct(row.varPct)}
            variant={row.varBRL < 0 ? 'red' : undefined}
          />
          <KPITile
            label="Rentabilidade no mês"
            value={fmtPct(row.rent)}
            sub={row.vsCDI >= 0 ? fmtPct(row.vsCDI) + ' acima do CDI' : fmtPct(Math.abs(row.vsCDI)) + ' abaixo do CDI'}
            variant={row.rent < 0 ? 'red' : undefined}
          />
          <KPITile
            label="Rentabilidade no ano"
            value={acumuladoAno ? fmtPct(acumuladoAno.cliente) : '—'}
            sub={acumuladoAno ? 'CDI no mesmo período: ' + fmtPct(acumuladoAno.cdi) : 'Sem meses suficientes na janela'}
          />
        </div>

        {seriePatrimonio.length > 1 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Evolução do patrimônio</div>
            </div>
            <div style={{ padding: '4px 8px 12px' }}>
              <EvolucaoPatrimonio dados={seriePatrimonio} />
            </div>
          </div>
        )}

        {serieRentabilidade[0] && serieRentabilidade[0].data.length > 1 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Rentabilidade acumulada vs CDI</div>
            </div>
            <div style={{ padding: '4px 8px 12px' }}>
              <LineChart series={serieRentabilidade} height={200} />
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">Rentabilidade mês a mês</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th style={{ textAlign: 'right' }}>Rentabilidade</th>
                  <th style={{ textAlign: 'right' }}>CDI no mês</th>
                  <th style={{ textAlign: 'right' }}>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {janela.slice().reverse().map((m) => (
                  <tr key={m.mes}>
                    <td style={{ fontWeight: m.mes === selectedMonth ? 600 : 400 }}>{fmtMonthLabel(m.mes)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className={signClass(m.rent)}>{fmtPct(m.rent)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtPct(m.cdi)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className={signClass(m.rent - (m.cdi || 0))}>
                      {fmtPct(m.rent - (m.cdi || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">Como o patrimônio está alocado</div>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', padding: '4px 14px 10px' }}>
            <div style={{ width: '100%', maxWidth: 220, flexShrink: 0 }}>
              <AlocacaoPie dados={porClasse} total={totalComp} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              {porClasse.map((c, i) => (
                <div key={c.cls} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: ALLOC_COLORS[i % ALLOC_COLORS.length], flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: '0.857rem', color: 'var(--body)' }}>{c.cls}</div>
                  <div style={{ fontSize: '0.857rem', color: 'var(--muted)' }}>{fmtPct(totalComp > 0 ? c.saldo / totalComp : 0, 1)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Classe</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th style={{ textAlign: 'right' }}>% do patrimônio</th>
                  <th style={{ textAlign: 'right' }}>Variação no mês</th>
                </tr>
              </thead>
              <tbody>
                {porClasse.map((c) => (
                  <tr key={c.cls}>
                    <td style={{ fontWeight: 600, fontSize: '0.857rem' }}>{c.cls}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(c.saldo)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtPct(totalComp > 0 ? c.saldo / totalComp : 0, 1)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className={signClass(c.varBRL)}>{fmtCompactBRL(c.varBRL)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="kpi-grid" style={{ marginTop: 16, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <KPITile
            label="Disponível em liquidez"
            value={liquidez ? fmtCompactBRL(liquidez.saldo) : '—'}
            sub={liquidez && totalComp > 0 ? fmtPct(liquidez.saldo / totalComp, 1) + ' do patrimônio' : 'Sem saldo em liquidez neste mês'}
          />
          <KPITile
            label="Movimentação líquida do mês"
            value={mov ? fmtCompactBRL(mov.aporteLiqEst) : '—'}
            sub={mov && mov.aporteLiqEst >= 0 ? 'Aportes acima dos resgates' : 'Resgates acima dos aportes'}
          />
          <KPITile
            label="Ativos na carteira"
            value={posicoes.length}
            sub={vencimentos.length ? vencimentos.length + ' com data de vencimento' : 'Sem vencimento marcado'}
          />
        </div>

        {vencimentos.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Vencimentos</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ativo</th>
                    <th>Classe</th>
                    <th>Vence em</th>
                    <th style={{ textAlign: 'right' }}>Saldo hoje</th>
                  </tr>
                </thead>
                <tbody>
                  {vencimentos.map((r) => (
                    <tr key={r.name}>
                      <td style={{ fontSize: '0.857rem' }}>{r.name}</td>
                      <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{r.cls}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.vencto}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(r.saldoFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {mov && mov.ativos.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">O que se moveu no mês</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ativo</th>
                    <th>Classe</th>
                    <th style={{ textAlign: 'right' }}>Saldo no início</th>
                    <th style={{ textAlign: 'right' }}>Saldo no fim</th>
                    <th style={{ textAlign: 'right' }}>Variação</th>
                    <th style={{ textAlign: 'right' }}>Rentabilidade</th>
                  </tr>
                </thead>
                <tbody>
                  {mov.ativos.map((a) => (
                    <tr key={a.nome}>
                      <td style={{ fontSize: '0.857rem' }}>{a.nome}</td>
                      <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{a.classe}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(a.saldoInicio)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(a.saldoFim)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className={signClass(a.varTotal)}>{fmtCompactBRL(a.varTotal)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className={signClass(a.retAtivo)}>{fmtPct(a.retAtivo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">Posição detalhada</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Classe</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th style={{ textAlign: 'right' }}>% da carteira</th>
                  <th style={{ textAlign: 'right' }}>Variação no mês</th>
                </tr>
              </thead>
              <tbody>
                {posicoes.map((r) => (
                  <tr key={r.name}>
                    <td style={{ fontSize: '0.857rem' }}>{r.name}</td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{r.cls}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtBRL(r.saldoFinal)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtPct(totalComp > 0 ? (r.saldoFinal || 0) / totalComp : 0, 2)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className={signClass(r.varBRL)}>{fmtBRL(r.varBRL)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 14px', fontSize: '0.714rem', color: 'var(--muted)' }}>
            Total em {fmtMonthLabel(selectedMonth)}: {fmt(totalComp, 2, 'R$ ')} · {posicoes.length} ativos
          </div>
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Cliente = Cliente;
})();
