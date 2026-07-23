// platform-data-risk.js — módulo de risk scoring
// Carregado depois de platform-data.js (plain JS, sem Babel).
// Acessa estado compartilhado via window.AtlasData (D) e D._internal (I).
(function () {
  'use strict';

  var D = window.AtlasData;
  var I = D._internal;

  var LESS_LIQUID_CLS = ['FII', 'Previdência', 'Internacional'];
  var RISKY_CLS       = ['Ações', 'Multimercado', 'FII', 'Internacional'];

  var STRESS_SHOCKS = {
    juros200: {
      'RF Pós-Fixado':  0.000, 'RF Inflação':  -0.080, 'CDB':  0.000,
      'Multimercado':  -0.030, 'Ações':         -0.040, 'FII': -0.070,
      'Previdência':   -0.050, 'Internacional': -0.020, 'Liquidez': 0,
    },
    bolsa15: {
      'RF Pós-Fixado':  0.000, 'RF Inflação':  -0.010, 'CDB':  0.000,
      'Multimercado':  -0.080, 'Ações':         -0.150, 'FII': -0.080,
      'Previdência':   -0.060, 'Internacional': -0.050, 'Liquidez': 0,
    },
    liquidez: {
      'RF Pós-Fixado': -0.010, 'RF Inflação':  -0.020, 'CDB': -0.030,
      'Multimercado':  -0.050, 'Ações':         -0.070, 'FII': -0.120,
      'Previdência':   -0.080, 'Internacional': -0.060, 'Liquidez': 0,
    },
    combinado: {
      'RF Pós-Fixado': -0.010, 'RF Inflação':  -0.100, 'CDB': -0.030,
      'Multimercado':  -0.140, 'Ações':         -0.220, 'FII': -0.200,
      'Previdência':   -0.150, 'Internacional': -0.120, 'Liquidez': 0,
    },
  };

  /* ----------------------------------------------------------------
     RISK_CONFIG — parâmetros centrais do scoring de risco
     Edite este bloco para calibrar limiares sem tocar nas funções
  ---------------------------------------------------------------- */
  var RISK_CONFIG = {
    max: { mercado: 30, concentracao: 25, liquidez: 20, suitability: 15, operacional: 10 },
    nivel: { alto: 70, atencao: 40 },
    filaAcao: {
      scoreMinimo:  40,
      operacional:   6,
      mercado:      15,
      concentracao: 12,
      suitability:   8,
      liquidez:     10,
    },
  };

  function riskScore(code, month) {
    var p = I._codeMap[code];
    if (!p) return null;
    var row = D.getRow(code, month);
    if (!row || row.plCurr <= 0) return null;
    var mi = D.MONTHS.indexOf(month);
    var pd = I._portfolioData[code];
    var comp = D.getComposition(code, month);
    var classPcts = {};
    comp.forEach(function(item) { classPcts[item.cls] = (classPcts[item.cls] || 0) + item.pct; });

    // MERCADO (0-30)
    var mercado = 0;
    var last6Start = Math.max(0, mi - 5);
    var monthsBelowCDI = 0;

    // Drawdown sobre indice de retorno, nao sobre PL.
    // O PL embute captacao liquida (plCurr = plPrev * (1 + ret) + nnm), entao
    // medir queda de PL fazia resgate de cliente pontuar como risco de mercado:
    // quem sacava por motivo alheio a risco (imposto, compra de imovel) ganhava
    // ate 12 pontos sem ter perdido nada na marcacao. O indice abaixo compoe
    // apenas retArr, que e a serie de rentabilidade, imune a fluxo.
    var idxCurr = 1, idxPeak = 0;
    for (var j = last6Start; j <= mi; j++) {
      if (D.MONTHS[j] < p.inception) continue;
      if ((pd.retArr[j] || 0) < (D.CDI[D.MONTHS[j]] || 0)) monthsBelowCDI++;
      idxCurr = idxCurr * (1 + (pd.retArr[j] || 0));
      if (idxCurr > idxPeak) idxPeak = idxCurr;
    }
    mercado += Math.min(18, monthsBelowCDI * 3);
    var drawdown6M = idxPeak > 0 ? Math.max(0, (idxPeak - idxCurr) / idxPeak) : 0;
    if      (drawdown6M > 0.05) mercado += 12;
    else if (drawdown6M > 0.02) mercado += 6;
    else if (drawdown6M > 0.01) mercado += 3;
    if      (p.risk === 'agressivo'          && row.rent < -0.01)  mercado += 5;
    else if (p.risk === 'moderado-agressivo' && row.rent < -0.005) mercado += 3;
    mercado = Math.min(30, mercado);

    // CONCENTRACAO (0-25)
    var conc = 0;
    var maxClsPct = 0;
    Object.keys(classPcts).forEach(function(cls) { if (classPcts[cls] > maxClsPct) maxClsPct = classPcts[cls]; });
    if      (maxClsPct > 0.70) conc += 15;
    else if (maxClsPct > 0.60) conc += 10;
    else if (maxClsPct > 0.50) conc += 5;
    var maxAssetPct = 0;
    comp.forEach(function(item) { if (item.cls !== 'Liquidez' && item.pct > maxAssetPct) maxAssetPct = item.pct; });
    if      (maxAssetPct > 0.30) conc += 7;
    else if (maxAssetPct > 0.25) conc += 4;
    var hhi = 0;
    Object.keys(classPcts).forEach(function(cls) { if (cls !== 'Liquidez') hhi += classPcts[cls] * classPcts[cls]; });
    if      (hhi > 0.40) conc += 5;
    else if (hhi > 0.25) conc += 3;
    conc = Math.min(25, conc);

    // LIQUIDEZ (0-20)
    var liq = 0;
    var liqPct = classPcts['Liquidez'] || 0;
    var lessLiqPct = 0;
    LESS_LIQUID_CLS.forEach(function(cls) { lessLiqPct += (classPcts[cls] || 0); });
    if      (liqPct < 0.03) liq += 12;
    else if (liqPct < 0.05) liq += 7;
    else if (liqPct < 0.08) liq += 3;
    if      (lessLiqPct > 0.40) liq += 8;
    else if (lessLiqPct > 0.30) liq += 5;
    else if (lessLiqPct > 0.20) liq += 2;
    liq = Math.min(20, liq);

    // SUITABILITY (0-15)
    var suit = 0;
    var riskyPct = 0;
    RISKY_CLS.forEach(function(cls) { riskyPct += (classPcts[cls] || 0); });
    if (p.risk === 'conservador') {
      if      (riskyPct > 0.30) suit += 15;
      else if (riskyPct > 0.15) suit += 8;
      else if (riskyPct > 0.05) suit += 3;
    } else if (p.risk === 'moderado') {
      if      (riskyPct > 0.60) suit += 10;
      else if (riskyPct > 0.45) suit += 5;
    } else if (p.risk === 'moderado-agressivo') {
      if      (riskyPct > 0.80) suit += 8;
      else if (riskyPct > 0.70) suit += 3;
    }
    suit = Math.min(15, suit);

    // OPERACIONAL (0-10)
    var op = 0;
    if      (row.status === 'CORRIGIR')   op += 6;
    else if (row.status === 'COM ALERTA') op += 3;
    if      (row.nAchados >= 2) op += 2;
    else if (row.nAchados >= 1) op += 1;
    if (I.RECIDIVA_CODES.indexOf(code) >= 0) op += 2;
    if      (row.continuidade > 0.005) op += 2;
    else if (row.continuidade > 0.001) op += 1;
    op = Math.min(10, op);

    var total = Math.min(100, Math.round(mercado + conc + liq + suit + op));
    var nivel = total >= RISK_CONFIG.nivel.alto ? 'Alto' : total >= RISK_CONFIG.nivel.atencao ? 'Atenção' : 'Baixo';

    var components = [
      { label:'Mercado',      value:mercado, max:30 },
      { label:'Concentração', value:conc,    max:25 },
      { label:'Liquidez',     value:liq,     max:20 },
      { label:'Suitability',  value:suit,    max:15 },
      { label:'Operacional',  value:op,      max:10 },
    ];
    components.sort(function(a,b) { return (b.value/b.max) - (a.value/a.max); });
    var drivers = components.filter(function(c){ return c.value > 0; }).slice(0,3).map(function(c){ return c.label; });

    return {
      code:code, name:p.name, risk:p.risk,
      manager: I.getManagerForCode(code),
      score:total, nivel:nivel,
      components:{ mercado:mercado, concentracao:conc, liquidez:liq, suitability:suit, operacional:op },
      drivers:drivers,
      drawdown6M:drawdown6M, monthsBelowCDI:monthsBelowCDI,
      classPcts:classPcts, riskyPct:riskyPct, liqPct:liqPct,
      plCurr:row.plCurr, status:row.status,
    };
  }

  function riskDashboard(month) {
    var scores = [];
    D.CATALOG.forEach(function(p) {
      var s = riskScore(p.code, month);
      if (s) scores.push(s);
    });
    scores.sort(function(a,b){ return b.score - a.score; });
    var alto    = scores.filter(function(s){ return s.nivel === 'Alto'; }).length;
    var atencao = scores.filter(function(s){ return s.nivel === 'Atenção'; }).length;
    var scoreMedia = scores.length > 0
      ? Math.round(scores.reduce(function(acc,s){ return acc+s.score; },0) / scores.length) : 0;
    var filaAcao = [];
    var FA = RISK_CONFIG.filaAcao;
    scores.filter(function(s){ return s.score >= FA.scoreMinimo; }).forEach(function(s) {
      var pares = [
        { ativo: s.components.operacional  >= FA.operacional,   peso: s.components.operacional  / RISK_CONFIG.max.operacional,   motivo:'Status CORRIGIR ativo',              rec:'Bloquear liberação até resolução dos achados' },
        { ativo: s.components.mercado      >= FA.mercado,       peso: s.components.mercado      / RISK_CONFIG.max.mercado,       motivo:'Underperformance persistente vs CDI', rec:'Solicitar relatório de atribuição ao gestor' },
        { ativo: s.components.concentracao >= FA.concentracao,  peso: s.components.concentracao / RISK_CONFIG.max.concentracao,  motivo:'Concentração acima do limite',        rec:'Revisar política de diversificação' },
        { ativo: s.components.suitability  >= FA.suitability,   peso: s.components.suitability  / RISK_CONFIG.max.suitability,   motivo:'Exposição incompatível com perfil',   rec:'Análise de adequação (suitability)' },
        { ativo: s.components.liquidez     >= FA.liquidez,      peso: s.components.liquidez     / RISK_CONFIG.max.liquidez,      motivo:'Liquidez abaixo do mínimo',           rec:'Rever janela de resgate e buffer de caixa' },
        { ativo: I.RECIDIVA_CODES.indexOf(s.code) >= 0, peso: 1, motivo:'Recidiva de alertas (4+ meses)', rec:'Escalar para comitê de risco' },
      ];
      pares = pares.filter(function(p){ return p.ativo; });
      pares.sort(function(a, b){ return b.peso - a.peso; });
      var motivos = pares.map(function(p){ return p.motivo; });
      var recs    = pares.map(function(p){ return p.rec; });
      if (motivos.length === 0) { motivos.push('Score elevado (' + s.score + '/100)'); recs.push('Revisão de monitoramento mensal'); }
      filaAcao.push({
        code:s.code, name:s.name, score:s.score, nivel:s.nivel,
        motivo:motivos.slice(0,2).join('; '),
        recomendacao:recs[0] || '—',
        severidade:s.nivel === 'Alto' ? 'CORRIGIR' : 'COM ALERTA',
      });
    });
    return { kpis:{alto:alto, atencao:atencao, scoreMedia:scoreMedia}, carteiras:scores, filaAcao:filaAcao };
  }

  function riskStress(month, scenario) {
    if (scenario && !STRESS_SHOCKS[scenario]) {
      console.warn('[riskStress] cenário desconhecido "' + scenario + '", usando "combinado".');
    }
    var shocks = STRESS_SHOCKS[scenario] || STRESS_SHOCKS['combinado'];
    var totalLoss = 0, totalAUM = 0;
    var portfolioLosses = [];
    D.CATALOG.forEach(function(p) {
      var mi = D.MONTHS.indexOf(month);
      if (mi < 0) return;
      var plCurr = I._portfolioData[p.code].plArr[mi] || 0;
      if (plCurr <= 0) return;
      totalAUM += plCurr;
      var comp = D.getComposition(p.code, month);
      var loss = 0;
      comp.forEach(function(item) { loss += (shocks[item.cls] || 0) * item.pct * plCurr; });
      totalLoss += loss;
      portfolioLosses.push({ code:p.code, name:p.name, plCurr:plCurr, loss:loss, lossPct:plCurr > 0 ? loss/plCurr : 0 });
    });
    portfolioLosses.sort(function(a,b){ return a.loss - b.loss; });
    return {
      scenario:scenario, totalLoss:totalLoss,
      totalLossPct: totalAUM > 0 ? totalLoss / totalAUM : 0,
      portfolioLosses:portfolioLosses,
      top5Stressed:portfolioLosses.slice(0,5),
    };
  }

  // G03: decompoe o score de risco por classe de ativo.
  // Retorna array de { cls, pct, contribScore, concentracaoRisk, mercadoRisk, liquidezRisk }
  function riskAttribution(code, month) {
    var rs = riskScore(code, month);
    if (!rs) return null;
    var comp = D.getComposition(code, month);
    if (!comp || !comp.length) return null;

    // Agrega pct por classe
    var classPcts = {};
    comp.forEach(function(item) {
      classPcts[item.cls] = (classPcts[item.cls] || 0) + item.pct;
    });

    // Classes de risco conhecidas (alinhado com RISKY_CLS e LESS_LIQUID_CLS)
    var RISKY = { 'Acoes': true, 'Multimercado': true, 'FII': true, 'Internacional': true };
    var LESS_LIQUID = { 'FII': true, 'Previdencia': true, 'Internacional': true };

    var result = [];
    Object.keys(classPcts).forEach(function(cls) {
      var pct = classPcts[cls];
      // Contribuicao proporcional ao score de concentracao
      var concRisk = Math.min(25, pct > 0.50 ? 15 : pct > 0.35 ? 10 : pct > 0.25 ? 5 : 0);
      // Mercado: classes arriscadas contribuem mais
      var mktRisk = RISKY[cls] ? Math.round(pct * 18) : 0;
      // Liquidez: classes menos liquidas
      var liqRisk = LESS_LIQUID[cls] ? Math.round(pct * 12) : 0;
      var contrib = Math.min(rs.score, concRisk + mktRisk + liqRisk);

      result.push({
        cls: cls,
        pct: pct,
        contribScore: contrib,
        concentracaoRisk: concRisk,
        mercadoRisk: mktRisk,
        liquidezRisk: liqRisk,
      });
    });

    // Ordena por contribuicao decrescente
    result.sort(function(a, b) { return b.contribScore - a.contribScore; });

    // Normaliza para que o total nao ultrapasse o score real
    var totalContrib = result.reduce(function(s, r) { return s + r.contribScore; }, 0);
    if (totalContrib > 0 && totalContrib > rs.score) {
      var scale = rs.score / totalContrib;
      result.forEach(function(r) { r.contribScore = Math.round(r.contribScore * scale); });
    }

    return { classes: result, scoreTotal: rs.score, nivel: rs.nivel };
  }

  D.STRESS_SHOCKS = STRESS_SHOCKS;
  D.RISK_CONFIG   = RISK_CONFIG;
  D.riskScore     = riskScore;
  D.riskDashboard = riskDashboard;
  D.riskStress    = riskStress;
  D.riskAttribution = riskAttribution;

})();
