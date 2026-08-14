/* platform-tendencia.jsx -- Tendencia do ciclo: evolucao multi-mes,
   heatmap de status por carteira x mes, achados recorrentes.
   Depende de: window.HISTORICO_DATA (platform-historico.js), Chart.js (bundled).
   Registra-se em window.AtlasPages.Tendencia. */
import React from 'react';
import Chart from 'chart.js/auto';

(() => {
  const { useState, useMemo, useRef, useEffect } = React;

  /* ============================================================
     LABELS DE CATEGORIA
  ============================================================ */

  const CATEGORIA_LABEL = {
    'pl-conciliacao':       'Conciliacao de PL',
    'cotas-sem-operacao':   'Variacao sem operacao',
    'alocacao':             'Mudanca de alocacao',
    'come-cotas':           'Come-cotas',
    'rentabilidade-ausente':'Rentabilidade ausente na fonte',
    'rentabilidade-zero':   'Rentabilidade zero',
    'outro':                'Outro',
  };

  /* ============================================================
     GRAFICO DE BARRAS EMPILHADAS (Chart.js)
  ============================================================ */

  function TrendChart({ H }) {
    const canvasRef = useRef(null);
    const chartRef  = useRef(null);

    useEffect(() => {
      if (!canvasRef.current || typeof Chart === 'undefined') return;
      if (chartRef.current) chartRef.current.destroy();

      var ctx = canvasRef.current.getContext('2d');
      chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: H.mesesLabel,
          datasets: [
            {
              label: 'Liberar',
              data: H.meses.map(function (m) { return (H.agregados[m] && H.agregados[m].liberar) || 0; }),
              backgroundColor: '#2f6a3e',
            },
            {
              label: 'Alerta',
              data: H.meses.map(function (m) { return (H.agregados[m] && H.agregados[m].alerta) || 0; }),
              backgroundColor: '#8a6b1f',
            },
            {
              label: 'Corrigir',
              data: H.meses.map(function (m) { return (H.agregados[m] && H.agregados[m].corrigir) || 0; }),
              backgroundColor: '#8a2424',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { family: 'Inter', size: 11 },
                color: '#565d65',
                boxWidth: 9,
                usePointStyle: true,
                pointStyle: 'rect',
              },
            },
            tooltip: {
              titleFont: { family: 'Inter' },
              bodyFont: { family: 'Inter' },
            },
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#8a8f96' },
            },
            y: {
              stacked: true,
              grid: { color: '#e5e0d4' },
              ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#8a8f96', precision: 0 },
            },
          },
        },
      });
      return function () { if (chartRef.current) chartRef.current.destroy(); };
    }, [H]);

    return React.createElement('div', { style: { height: 220, position: 'relative' } },
      React.createElement('canvas', { ref: canvasRef })
    );
  }

  /* ============================================================
     CELULA DO HEATMAP
  ============================================================ */

  function HeatCell({ dado }) {
    var fmtBRL = window.AtlasUtils ? window.AtlasUtils.fmtBRL : function(v) { return v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'; };
    var fmt = window.AtlasUtils ? window.AtlasUtils.fmtBRL : function(v) { return '--'; };

    if (!dado) {
      return React.createElement('td', { className: 'num' },
        React.createElement('span', { className: 'heat-cell heat-absent', title: 'Sem book neste mes' }, '·')
      );
    }
    var cls   = dado.status === 'LIBERAR' ? 'heat-ok' : dado.status === 'CORRIGIR' ? 'heat-bad' : 'heat-warn';
    var label = dado.status === 'LIBERAR' ? 'L' : dado.status === 'CORRIGIR' ? 'C' : 'A';
    var cats  = (dado.categorias || []).map(function (c) { return CATEGORIA_LABEL[c] || c; }).join(', ');
    var tip   = dado.status + ' · PL ' + fmtBRL(dado.plRef) + (cats ? ' · ' + cats : '');

    return React.createElement('td', { className: 'num' },
      React.createElement('span', { className: 'heat-cell ' + cls, title: tip }, label)
    );
  }

  /* ============================================================
     PAGINA TENDENCIA
  ============================================================ */

  function Tendencia() {
    var H = window.HISTORICO_DATA;
    var Icon = window.AtlasIcons ? window.AtlasIcons.Icon : function() { return null; };

    var _useState1 = useState('');
    var q = _useState1[0], setQ = _useState1[1];

    var _useState2 = useState('recente');
    var sort = _useState2[0], setSort = _useState2[1];

    /* ============================================================
       EMPTY STATE -- sem dados historicos
    ============================================================ */
    if (!H || !H.meses || !H.carteiras) {
      return React.createElement('div', null,
        React.createElement('div', { className: 'page-header' },
          React.createElement('div', { className: 'page-eyebrow' }, 'Tendencia do Ciclo'),
          React.createElement('h1', { className: 'page-title' }, 'Tendencia do ciclo')
        ),
        React.createElement('div', { className: 'empty-state' },
          React.createElement('div', { className: 'empty-state-icon' },
            React.createElement(Icon, { name: 'trend', size: 48 })
          ),
          React.createElement('div', { className: 'empty-state-title' }, 'Dados historicos nao disponiveis'),
          React.createElement('div', { className: 'empty-state-sub' },
            'Carregue platform-historico.js com dados multi-mes para visualizar a tendencia.'
          )
        )
      );
    }

    var ultimoMes = H.meses[H.meses.length - 1];

    var nomes = useMemo(function () {
      var arr = Object.keys(H.carteiras);
      if (sort === 'recente') {
        var rank = { CORRIGIR: 0, 'LIBERAR COM ALERTA': 1, LIBERAR: 2, ZZZ: 3 };
        arr.sort(function (a, b) {
          var sa = (H.carteiras[a].porMes[ultimoMes] && H.carteiras[a].porMes[ultimoMes].status) || 'ZZZ';
          var sb = (H.carteiras[b].porMes[ultimoMes] && H.carteiras[b].porMes[ultimoMes].status) || 'ZZZ';
          return (rank[sa] || 3) - (rank[sb] || 3) || a.localeCompare(b);
        });
      } else {
        arr.sort(function (a, b) { return a.localeCompare(b); });
      }
      return arr;
    }, [H, sort, ultimoMes]);

    var filtered = useMemo(
      function () { return nomes.filter(function (n) { return n.toLowerCase().indexOf(q.toLowerCase()) !== -1; }); },
      [nomes, q]
    );

    var contagemMeses = H.meses.length;
    var mesInicio = H.mesesLabel[0];
    var mesFim    = H.mesesLabel[H.mesesLabel.length - 1];

    // O ano vem de H.meses, nao fixo: uma janela que cruza o virada de ano
    // (ex.: Nov a Abr) datava os dois extremos no ano final.
    var anoIni = String(H.meses[0]).slice(0, 4);
    var anoFim = String(H.meses[H.meses.length - 1]).slice(0, 4);
    var periodoLabel = anoIni === anoFim
      ? mesInicio + ' a ' + mesFim + ' de ' + anoFim
      : mesInicio + '/' + anoIni + ' a ' + mesFim + '/' + anoFim;

    return React.createElement('div', null,
      /* ---- Cabecalho ---- */
      React.createElement('div', { className: 'page-header' },
        React.createElement('div', { className: 'page-eyebrow' }, 'Analise Longitudinal'),
        React.createElement('h1', { className: 'page-title' }, 'Tendencia do ciclo'),
        React.createElement('p', { className: 'page-subtitle' },
          'Evolucao de ', periodoLabel, ' — ',
          Object.keys(H.carteiras).length, ' carteiras unicas ao longo do periodo, ',
          'comparadas mes a mes em vez de so contra o mes anterior.'
        )
      ),

      /* ---- Grafico de barras empilhadas ---- */
      React.createElement('div', { className: 'card', style: { padding: '18px 20px 8px', marginBottom: 24 } },
        React.createElement(TrendChart, { H: H })
      ),

      /* ---- Achados recorrentes ---- */
      (H.recorrentes && H.recorrentes.length > 0) ? React.createElement('section', { style: { marginBottom: 24 } },
        React.createElement('h3', { style: { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.2rem', fontWeight: 600, color: 'var(--heading)', marginBottom: 8 } },
          'Excecoes estruturais recorrentes — mesma limitacao, meses consecutivos ate ', mesFim
        ),
        React.createElement('p', { className: 'page-subtitle', style: { marginBottom: 12 } },
          'Books offshore e consolidados que nao trazem a tabela de rentabilidade na fonte, ha 2 ou mais meses ',
          'seguidos. A partir de ', mesFim, '/2026, reclassificados de erro bloqueante ',
          'para excecao conhecida e monitorada: deixam de bloquear a liberacao, mas seguem rastreados ate o ',
          'custodiante incluir o dado na origem.'
        ),
        H.recorrentes.map(function (r) {
          return React.createElement('div', {
            className: 'finding-card --amber',
            key: r.nome + r.categoria,
          },
            React.createElement('div', { className: 'finding-header' },
              React.createElement('span', { className: 'badge badge--amber' }, r.mesesConsecutivos + '/' + contagemMeses + 'm'),
              React.createElement('span', null,
                React.createElement('strong', null, r.nome),
                ' — ', CATEGORIA_LABEL[r.categoria] || r.categoria,
                ', aberto desde ', H.mesesLabel[H.meses.indexOf(r.desdeMes)], '.'
              )
            )
          );
        })
      ) : null,

      /* ---- Toolbar de busca e ordenacao ---- */
      React.createElement('div', { className: 'toolbar' },
        React.createElement('div', { className: 'search-wrap' },
          React.createElement(Icon, { name: 'search', size: 14 }),
          React.createElement('input', {
            className: 'search-input',
            placeholder: 'Buscar carteira…',
            value: q,
            onChange: function (e) { setQ(e.target.value); },
          })
        ),
        React.createElement('div', { className: 'toolbar-spacer' }),
        React.createElement('div', { className: 'chip-group' },
          React.createElement('span', { className: 'chip' + (sort === 'recente' ? ' active' : ''), style: { cursor: 'pointer' }, onClick: function () { setSort('recente'); } }, 'Mais criticas primeiro'),
          React.createElement('span', { className: 'chip' + (sort === 'az' ? ' active' : ''), style: { cursor: 'pointer' }, onClick: function () { setSort('az'); } }, 'A–Z')
        ),
        React.createElement('span', { className: 'text-sm text-muted', style: { marginLeft: 8 } }, filtered.length + ' / ' + nomes.length + ' carteiras')
      ),

      /* ---- Heatmap table ---- */
      React.createElement('div', { className: 'table-wrap' },
        React.createElement('div', { style: { overflowX: 'auto' } },
          React.createElement('table', { className: 'heatmap-table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', { style: { position: 'sticky', left: 0, zIndex: 4, background: 'var(--paper-mid)' } }, 'Carteira'),
                H.mesesLabel.map(function (lbl) {
                  return React.createElement('th', { key: lbl, className: 'num', style: { minWidth: 52 } }, lbl);
                })
              )
            ),
            React.createElement('tbody', null,
              filtered.map(function (nome) {
                return React.createElement('tr', { key: nome, className: 'clickable' },
                  React.createElement('td', { className: 'sticky-col', style: { fontWeight: 500 } }, nome),
                  H.meses.map(function (m) {
                    return React.createElement(HeatCell, { key: m, dado: H.carteiras[nome].porMes[m] });
                  })
                );
              })
            )
          )
        )
      ),

      /* ---- Legenda ---- */
      React.createElement('div', { className: 'text-xs text-muted', style: { marginTop: 16 } },
        'L = Liberar sem ressalva · A = Liberar com alerta · C = Corrigir (bloqueia liberacao) · · = carteira sem book neste mes.'
      )
    );
  }

  /* ============================================================
     REGISTRAR
  ============================================================ */

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Tendencia = Tendencia;

})();
