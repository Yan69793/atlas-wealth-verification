/* platform-historico-demo.js — fallback sintetico de window.HISTORICO_DATA
   Publica o mesmo schema que build-historico.mjs grava em platform-historico.js
   (overlay LGPD, real, gitignored). Sem overlay, a aba Tendencia ficava vazia —
   a unica das 12 paginas sem dado demo, quebrando a demonstracao do produto.
   So roda se o overlay real ainda nao populou window.HISTORICO_DATA, e reusa
   window.AtlasData.getRow() para ficar coerente com Dashboard/Achados/Radar
   (mesmo status, mesmo PL, mesma carteira).
*/
(function () {
  'use strict';
  if (window.HISTORICO_DATA) return;

  var D = window.AtlasData;
  if (!D || !D.MONTHS || !D.CATALOG || !D.getRow) return;

  // Categoria sintetica por status: aproxima a taxonomia do audit-engine
  // (pl-conciliacao, cotas-sem-operacao, ...) sem fingir precisao que a demo
  // nao tem. CORRIGIR na demo e sempre gerado por discrepancia de PL reportado
  // (materialize()), entao pl-conciliacao e fiel; COM ALERTA usa uma categoria
  // generica plausivel.
  var CATEGORIA_POR_STATUS = {
    CORRIGIR: 'pl-conciliacao',
    'COM ALERTA': 'cotas-sem-operacao',
  };

  var vis = D.visibleMonths ? D.visibleMonths() : { months: D.MONTHS, labels: D.MONTH_LABELS };
  var MESES = vis.months;
  var LABELS = vis.labels;

  var agregados = {};
  var carteiras = {};

  MESES.forEach(function (mes) {
    var liberar = 0, alerta = 0, corrigir = 0, total = 0;
    D.CATALOG.forEach(function (p) {
      var row = D.getRow(p.code, mes);
      if (!row || !(row.plCurr > 0)) return; // sem book neste mes (pre-inception)
      total++;
      if (row.status === 'CORRIGIR') corrigir++;
      else if (row.status === 'COM ALERTA') alerta++;
      else liberar++;

      if (!carteiras[p.code]) carteiras[p.code] = { porMes: {} };
      var cat = CATEGORIA_POR_STATUS[row.status];
      carteiras[p.code].porMes[mes] = {
        status: row.status,
        plRef: row.plCurr,
        categorias: cat ? [cat] : [],
        categoriasErro: row.status === 'CORRIGIR' && cat ? [cat] : [],
      };
    });
    agregados[mes] = { liberar: liberar, alerta: alerta, corrigir: corrigir, total: total };
  });

  // Recorrencia: mesma categoria em 2+ meses consecutivos ate o ultimo mes,
  // mesma logica de build-historico.mjs generalizada (o motor real trava numa
  // categoria fixa, 'rentabilidade-ausente'; a demo nao tem essa limitacao
  // estrutural, entao rastreia recorrencia de qualquer categoria persistente).
  var ULTIMO = MESES[MESES.length - 1];
  var recorrentes = [];
  Object.keys(carteiras).forEach(function (code) {
    var porMes = carteiras[code].porMes;
    var atual = porMes[ULTIMO];
    if (!atual || !atual.categorias.length) return;
    var catAlvo = atual.categorias[0];
    var consecutivos = 0, desdeMes = ULTIMO;
    for (var i = MESES.length - 1; i >= 0; i--) {
      var dado = porMes[MESES[i]];
      if (dado && dado.categorias.indexOf(catAlvo) >= 0) {
        consecutivos++;
        desdeMes = MESES[i];
      } else {
        break;
      }
    }
    if (consecutivos >= 2) {
      recorrentes.push({
        nome: code,
        categoria: catAlvo,
        desdeMes: desdeMes,
        mesesConsecutivos: consecutivos,
        statusAtual: atual.status,
      });
    }
  });
  recorrentes.sort(function (a, b) { return b.mesesConsecutivos - a.mesesConsecutivos; });

  window.HISTORICO_DATA = {
    meses: MESES,
    mesesLabel: LABELS,
    agregados: agregados,
    carteiras: carteiras,
    recorrentes: recorrentes,
    geradoEm: null, // sintetico: sem timestamp de processamento real
  };
})();
