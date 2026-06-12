/* platform-data.js — ATLAS Wealth Verification
   Gerador determinístico de dados fictícios.
   Seed: 20260411  |  Não contém dados reais. */

(function () {
  'use strict';

  /* =============================================================
     1. PRNG E UTILITÁRIOS MATEMÁTICOS
  ============================================================= */

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), s | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(str) {
    var h = 0x811c9dc5 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  function subRng(key) {
    return mulberry32(hashStr(key));
  }

  // Box-Muller — par de normais
  function normal2(rng) {
    var u1 = rng() + 1e-10, u2 = rng();
    var mag = Math.sqrt(-2 * Math.log(u1));
    return [mag * Math.cos(2 * Math.PI * u2), mag * Math.sin(2 * Math.PI * u2)];
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function round2(v) { return Math.round(v * 100) / 100; }

  /* =============================================================
     2. CONSTANTES
  ============================================================= */

  var MONTHS = [
    '2025-01','2025-02','2025-03','2025-04','2025-05','2025-06',
    '2025-07','2025-08','2025-09','2025-10','2025-11','2025-12',
    '2026-01','2026-02','2026-03','2026-04'
  ];

  var MONTH_LABELS = [
    'Jan/25','Fev/25','Mar/25','Abr/25','Mai/25','Jun/25',
    'Jul/25','Ago/25','Set/25','Out/25','Nov/25','Dez/25',
    'Jan/26','Fev/26','Mar/26','Abr/26'
  ];

  var CDI = {
    '2025-01':0.0091,'2025-02':0.0088,'2025-03':0.0093,'2025-04':0.0089,
    '2025-05':0.0095,'2025-06':0.0092,'2025-07':0.0098,'2025-08':0.0101,
    '2025-09':0.0096,'2025-10':0.0099,'2025-11':0.0097,'2025-12':0.0103,
    '2026-01':0.0100,'2026-02':0.0094,'2026-03':0.0097,'2026-04':0.0091
  };

  var CURRENT_MONTH = '2026-04';

  var CATALOG = [
    // AXIOM_AM (14 carteiras)
    { code:'ALPHA_01', name:'Alpha Gestão I',          risk:'conservador',         inception:'2022-01' },
    { code:'ALPHA_02', name:'Alpha Gestão II',         risk:'moderado',            inception:'2022-03' },
    { code:'ALPHA_03', name:'Alpha Gestão III',        risk:'agressivo',           inception:'2022-06' },
    { code:'BRAVO_FAM', name:'Bravo Family Office',    risk:'moderado',            inception:'2021-07' },
    { code:'BRAVO_PV',  name:'Bravo Patrimonial',      risk:'conservador',         inception:'2023-01' },
    { code:'CEDRO_HLD', name:'Cedro Holding',          risk:'moderado-agressivo',  inception:'2020-04' },
    { code:'CEDRO_CAP', name:'Cedro Capital',          risk:'moderado',            inception:'2021-11' },
    { code:'DUNAS_CAP', name:'Dunas Capital',          risk:'moderado-agressivo',  inception:'2022-08' },
    { code:'DUNAS_FAM', name:'Dunas Family',           risk:'conservador',         inception:'2023-03' },
    { code:'ESTRELA_PV', name:'Estrela Patrimonial',   risk:'moderado',            inception:'2021-05' },
    { code:'ESTRELA_HLD', name:'Estrela Holding',      risk:'agressivo',           inception:'2020-09' },
    { code:'FAROL_INV', name:'Farol Investimentos',    risk:'moderado',            inception:'2023-06' },
    { code:'FAROL_FAM', name:'Farol Family',           risk:'conservador',         inception:'2022-11' },
    { code:'GAMMA_MID', name:'Gamma Mid-Cap',          risk:'moderado-agressivo',  inception:'2021-02' },
    // BEACON_WM (12 carteiras)
    { code:'GAMMA_LRG', name:'Gamma Large-Cap',        risk:'agressivo',           inception:'2020-11' },
    { code:'HELIOS_01', name:'Helios Patrimonial I',   risk:'moderado',            inception:'2022-04' },
    { code:'HELIOS_02', name:'Helios Patrimonial II',  risk:'moderado',            inception:'2022-04' },
    { code:'INDIGO_CAP', name:'Indigo Capital',        risk:'conservador',         inception:'2023-09' },
    { code:'JOIA_FAM',  name:'Joia Family Office',     risk:'moderado-agressivo',  inception:'2021-08' },
    { code:'JOIA_HLD',  name:'Joia Holding',           risk:'moderado',            inception:'2022-02' },
    { code:'KAPPA_PV',  name:'Kappa Patrimonial',      risk:'moderado',            inception:'2022-07' },
    { code:'KAPPA_INV', name:'Kappa Investimentos',    risk:'conservador',         inception:'2023-04' },
    { code:'LUMIA_01',  name:'Lumia Gestão I',         risk:'agressivo',           inception:'2021-10' },
    { code:'LUMIA_02',  name:'Lumia Gestão II',        risk:'moderado',            inception:'2022-09' },
    { code:'MARTE_FAM', name:'Marte Family',           risk:'conservador',         inception:'2023-07' },
    { code:'NOVA_CAP',  name:'Nova Capital',           risk:'moderado-agressivo',  inception:'2021-06' },
    // CREST_FO (9 carteiras)
    { code:'NOVA_PV',   name:'Nova Patrimonial',       risk:'moderado',            inception:'2023-02' },
    { code:'ORION_01',  name:'Orion Gestão I',         risk:'conservador',         inception:'2022-01' },
    { code:'ORION_02',  name:'Orion Gestão II',        risk:'moderado-agressivo',  inception:'2022-05' },
    { code:'PRADO_HLD', name:'Prado Holding',          risk:'moderado',            inception:'2020-12' },
    { code:'PRADO_FAM', name:'Prado Family',           risk:'conservador',         inception:'2023-05' },
    { code:'QUASAR_CAP', name:'Quasar Capital',        risk:'agressivo',           inception:'2021-03' },
    { code:'RIO_01',    name:'Rio Patrimonial I',      risk:'moderado',            inception:'2022-10' },
    { code:'RIO_02',    name:'Rio Patrimonial II',     risk:'moderado',            inception:'2023-08' },
    { code:'SOLAR_PV',  name:'Solar Patrimonial',      risk:'conservador',         inception:'2021-12' },
    // DELTA_PB (5 carteiras)
    { code:'SOLAR_INV', name:'Solar Investimentos',    risk:'moderado',            inception:'2022-06' },
    { code:'TIGRE_FAM', name:'Tigre Family Office',    risk:'moderado-agressivo',  inception:'2021-04' },
    { code:'UMBRA_01',  name:'Umbra Gestão I',         risk:'moderado',            inception:'2026-03' },
    { code:'UMBRA_02',  name:'Umbra Gestão II',        risk:'conservador',         inception:'2026-03' },
    { code:'COMETA_FAM', name:'Cometa Family',         risk:'moderado',            inception:'2026-02' },
  ];

  var MANAGERS = [
    { id:'AXIOM_AM',  name:'Axiom Asset Management',  codes:CATALOG.slice(0,14).map(function(p){return p.code;}), roaTarget:0.0052 },
    { id:'BEACON_WM', name:'Beacon Wealth Management', codes:CATALOG.slice(14,26).map(function(p){return p.code;}), roaTarget:0.0048 },
    { id:'CREST_FO',  name:'Crest Family Office',     codes:CATALOG.slice(26,35).map(function(p){return p.code;}), roaTarget:0.0055 },
    { id:'DELTA_PB',  name:'Delta Private Banking',   codes:CATALOG.slice(35,40).map(function(p){return p.code;}), roaTarget:0.0043 },
  ];

  // beta e sigma por perfil de risco
  var RISK_PARAMS = {
    'conservador':        { beta:0.20, sigma:0.0018 },
    'moderado':           { beta:0.50, sigma:0.0038 },
    'moderado-agressivo': { beta:0.85, sigma:0.0072 },
    'agressivo':          { beta:1.25, sigma:0.0120 },
  };

  // Catálogo de ativos fictícios
  var ASSETS = [
    { name:'Horizonte DI FIC FIM',               cls:'RF Pós-Fixado',  inst:'XQ Investimentos' },
    { name:'Austral FIRF Crédito Privado',        cls:'RF Pós-Fixado',  inst:'Corretora Austral' },
    { name:'Pampulha CDI Plus FIC FIM',           cls:'RF Pós-Fixado',  inst:'DTVM Pampulha' },
    { name:'NTN-B Vencto:15/05/2029',             cls:'RF Inflação',    inst:'Banco Mercantil Plus' },
    { name:'NTN-B Vencto:15/08/2026',             cls:'RF Inflação',    inst:'Banco Mercantil Plus' },
    { name:'NTN-B Vencto:15/05/2035',             cls:'RF Inflação',    inst:'Banco Mercantil Plus' },
    { name:'Meridian Inflação FIC FIRF',          cls:'RF Inflação',    inst:'XQ Investimentos' },
    { name:'CDB Banco Mercantil Plus 120% CDI',   cls:'CDB',            inst:'Banco Mercantil Plus' },
    { name:'CDB Austral 115% CDI 2Y',             cls:'CDB',            inst:'Corretora Austral' },
    { name:'Horizonte Total Return FIC FIM',      cls:'Multimercado',   inst:'XQ Investimentos' },
    { name:'Austral Global Macro FIC FIM',        cls:'Multimercado',   inst:'Corretora Austral' },
    { name:'Pampulha Long Biased FIC FIM',        cls:'Multimercado',   inst:'DTVM Pampulha' },
    { name:'Atlas Macro FIC FIM',                 cls:'Multimercado',   inst:'Banco Mercantil Plus' },
    { name:'PETR4',                               cls:'Ações',          inst:'XQ Investimentos' },
    { name:'VALE3',                               cls:'Ações',          inst:'XQ Investimentos' },
    { name:'ITUB4',                               cls:'Ações',          inst:'XQ Investimentos' },
    { name:'Meridian IBX50 ETF FIC FIA',          cls:'Ações',          inst:'Corretora Austral' },
    { name:'Austral Small Caps FIC FIA',          cls:'Ações',          inst:'Corretora Austral' },
    { name:'BRCR11',                              cls:'FII',            inst:'XQ Investimentos' },
    { name:'XPML11',                              cls:'FII',            inst:'XQ Investimentos' },
    { name:'Horizonte Logística FII',             cls:'FII',            inst:'DTVM Pampulha' },
    { name:'PGBL Horizonte Total Return',         cls:'Previdência',    inst:'XQ Investimentos' },
    { name:'BDR MSCI World ETF',                  cls:'Internacional',  inst:'XQ Investimentos' },
    { name:'Austral Global Equity FIC FIM IE',    cls:'Internacional',  inst:'Corretora Austral' },
    { name:'Caixa / Tesouraria',                  cls:'Liquidez',       inst:'Banco Mercantil Plus' },
  ];

  var CAIXA_IDX = ASSETS.length - 1; // sempre último

  /* =============================================================
     3. SCRIPT DE STATUS
  ============================================================= */

  var STATUS_SCRIPT = {};

  function setS(code, month, s) { STATUS_SCRIPT[code + '|' + month] = s; }

  // Abr/2026 — 2 CORRIGIR + 5 COM ALERTA
  setS('DUNAS_CAP',   '2026-04', 'CORRIGIR');
  setS('ESTRELA_HLD', '2026-04', 'CORRIGIR');
  setS('HELIOS_01',   '2026-04', 'COM ALERTA');
  setS('JOIA_FAM',    '2026-04', 'COM ALERTA');
  setS('KAPPA_PV',    '2026-04', 'COM ALERTA');
  setS('LUMIA_01',    '2026-04', 'COM ALERTA');
  setS('NOVA_CAP',    '2026-04', 'COM ALERTA');

  // Ago/2025 — mês de stress (5 CORRIGIR)
  setS('GAMMA_MID',   '2025-08', 'CORRIGIR');
  setS('HELIOS_01',   '2025-08', 'CORRIGIR');
  setS('INDIGO_CAP',  '2025-08', 'CORRIGIR');
  setS('JOIA_FAM',    '2025-08', 'CORRIGIR');
  setS('KAPPA_PV',    '2025-08', 'CORRIGIR');

  // 4 carteiras com recidiva >= 4 meses terminando em Abr/2026
  var RECIDIVA_CODES = ['HELIOS_01','JOIA_FAM','NOVA_CAP','KAPPA_PV'];
  var RECIDIVA_MONTHS = ['2025-11','2025-12','2026-01','2026-02','2026-03'];
  RECIDIVA_CODES.forEach(function(c) {
    RECIDIVA_MONTHS.forEach(function(m) {
      if (!STATUS_SCRIPT[c + '|' + m]) setS(c, m, 'COM ALERTA');
    });
  });

  // Alguns alertas adicionais espalhados para realismo
  setS('CEDRO_HLD',   '2025-03', 'COM ALERTA');
  setS('GAMMA_LRG',   '2025-06', 'COM ALERTA');
  setS('LUMIA_01',    '2025-09', 'COM ALERTA');
  setS('ORION_02',    '2025-05', 'CORRIGIR');
  setS('QUASAR_CAP',  '2025-10', 'COM ALERTA');
  setS('TIGRE_FAM',   '2025-07', 'COM ALERTA');
  setS('BRAVO_FAM',   '2025-11', 'COM ALERTA');
  setS('PRADO_HLD',   '2026-01', 'COM ALERTA');

  function getStatus(code, month) {
    var key = code + '|' + month;
    if (STATUS_SCRIPT[key]) return STATUS_SCRIPT[key];
    // Mês corrente: apenas os scripts definem status — demais são LIBERAR (garante contagens exatas)
    if (month === CURRENT_MONTH) return 'LIBERAR';
    var rng = subRng('status|' + key);
    var r = rng();
    if (r < 0.025) return 'CORRIGIR';
    if (r < 0.13)  return 'COM ALERTA';
    return 'LIBERAR';
  }

  /* =============================================================
     4. MATERIALIZAÇÃO DOS DADOS BASE
  ============================================================= */

  var _portfolioData = {};   // code -> { plArr, nnmArr, retArr, fee, feeArr, reportedPlPrevArr }
  var _codeMap = {};         // code -> catalog entry

  CATALOG.forEach(function(p) { _codeMap[p.code] = p; });

  (function materialize() {
    var rng0 = mulberry32(20260411);

    // 1. gerar PL inicial log-uniforme e fee para cada carteira
    var rawPl = [];
    CATALOG.forEach(function(p) {
      var logLo = Math.log(0.8e6), logHi = Math.log(95e6);
      var lv = logLo + rng0() * (logHi - logLo);
      rawPl.push(Math.exp(lv));
      var fee = 0.0003 + rng0() * 0.0005;
      _portfolioData[p.code] = { fee: fee, plArr: [], nnmArr: [], retArr: [], feeArr: [], reportedPlPrevArr: [] };
    });

    // 2. Passo 1: gerar séries completas sem rescaling
    CATALOG.forEach(function(p, ci) {
      var params = RISK_PARAMS[p.risk];
      var plInit = rawPl[ci]; // valor sem escala
      var pd = _portfolioData[p.code];
      var rngRet = subRng('ret|' + p.code);
      var rngNnm = subRng('nnm|' + p.code);
      var pl = plInit;

      for (var mi = 0; mi < MONTHS.length; mi++) {
        var month = MONTHS[mi];
        var cdi = CDI[month];

        if (month < p.inception) {
          pd.plArr.push(0);
          pd.nnmArr.push(0);
          pd.retArr.push(0);
          pd.feeArr.push(0);
          pd.reportedPlPrevArr.push(0);
          continue;
        }

        // plPrev: se mês anterior está em pd.plArr, usa; senão usa 92% do inicial
        var plPrev;
        if (mi === 0) {
          plPrev = plInit * 0.92;
        } else {
          var prevPl = pd.plArr[mi - 1];
          plPrev = (prevPl > 0) ? prevPl : plInit;
        }

        var nv = normal2(rngRet);
        var rawRet = cdi * params.beta + params.sigma * nv[0];
        var ret = clamp(rawRet, -0.02, 0.035);

        var nnm = plPrev * (0.002 + 0.012 * normal2(rngNnm)[0]);
        nnm = clamp(nnm, -0.04 * plPrev, 0.06 * plPrev);

        var status = getStatus(p.code, month);
        if (status === 'CORRIGIR') ret = 0.0001;

        var plCurr = plPrev * (1 + ret) + nnm;
        plCurr = Math.max(plCurr, 100000);

        var feeEff = pd.fee;
        if (p.code === 'DUNAS_CAP' && month === '2025-10') feeEff = pd.fee * 20;
        var revenue = feeEff * plCurr;
        if (p.code === 'COMETA_FAM' && month === '2026-02') revenue += 48500;

        var reportedPlPrev = plPrev;
        if (status === 'CORRIGIR') {
          var rngDisc = subRng('disc|' + p.code + '|' + month);
          reportedPlPrev = plPrev * (1 + 0.005 + rngDisc() * 0.008);
        }

        pd.plArr.push(plCurr);
        pd.nnmArr.push(nnm);
        pd.retArr.push(ret);
        pd.feeArr.push(revenue);
        pd.reportedPlPrevArr.push(reportedPlPrev);
        pl = plCurr;
      }
    });

    // 3. Passo 2: rescale para PL total Abr/2026 = 1.2bi
    var aprIdx = MONTHS.indexOf(CURRENT_MONTH);
    var aprTotal = 0;
    CATALOG.forEach(function(p) { aprTotal += (_portfolioData[p.code].plArr[aprIdx] || 0); });
    var scale = 1.2e9 / aprTotal;

    CATALOG.forEach(function(p) {
      var pd = _portfolioData[p.code];
      for (var mi = 0; mi < MONTHS.length; mi++) {
        pd.plArr[mi]              = (pd.plArr[mi] || 0) * scale;
        pd.nnmArr[mi]             = (pd.nnmArr[mi] || 0) * scale;
        pd.feeArr[mi]             = (pd.feeArr[mi] || 0) * scale;
        pd.reportedPlPrevArr[mi]  = (pd.reportedPlPrevArr[mi] || 0) * scale;
      }
    });
  })();

  /* =============================================================
     4b. SNAPSHOT DEMO + ESTADO DE IMPORTAÇÃO
     Captura deep-copy do dataset demo logo após materialize().
     Usado por restoreDemo() para recompor tudo in-place.
  ============================================================= */

  var _demoSnapshot = (function () {
    var snap = { catalog: [], portfolioData: {}, managers: [], statusScript: {} };
    CATALOG.forEach(function (p) {
      snap.catalog.push({ code: p.code, name: p.name, risk: p.risk, inception: p.inception });
    });
    Object.keys(_portfolioData).forEach(function (code) {
      var pd = _portfolioData[code];
      snap.portfolioData[code] = {
        fee: pd.fee,
        plArr: pd.plArr.slice(),
        nnmArr: pd.nnmArr.slice(),
        retArr: pd.retArr.slice(),
        feeArr: pd.feeArr.slice(),
        reportedPlPrevArr: pd.reportedPlPrevArr.slice()
      };
    });
    MANAGERS.forEach(function (m) {
      snap.managers.push({ id: m.id, name: m.name, codes: m.codes.slice(), roaTarget: m.roaTarget });
    });
    Object.keys(STATUS_SCRIPT).forEach(function (k) { snap.statusScript[k] = STATUS_SCRIPT[k]; });
    return snap;
  })();

  var _importCompositions = {};   // chave "code|month" -> array de linhas de composição
  var _dataMode = 'demo';

  /* =============================================================
     4c. INJETOR DE CARTEIRAS REAIS (lê window._MirabaudRealData)
     O arquivo platform-data-real.js (gitignored) define esse objeto.
     Sem ele, apenas as 40 carteiras demo ficam ativas.
  ============================================================= */

  function injectMirabaud() {
    var D = window._MirabaudRealData;
    if (!D || !D.portfolios || !D.portfolios.length) return;

    var FEV = 13, MAR = 14, ABR = 15;
    var MFEE = D.mfee || 0.0004;
    var CDI_FEV = D.cdiRates['2026-02'];
    var CDI_MAR = D.cdiRates['2026-03'];
    var CDI_ABR = D.cdiRates['2026-04'];
    var codes = D.portfolios.map(function(p) { return p.code; });

    // Limpar entradas anteriores (idempotência)
    for (var i = CATALOG.length - 1; i >= 0; i--) {
      if (codes.indexOf(CATALOG[i].code) >= 0) CATALOG.splice(i, 1);
    }
    codes.forEach(function(c) {
      delete _portfolioData[c]; delete _codeMap[c];
      if (_compCache) {
        ['2026-02','2026-03','2026-04'].forEach(function(m) { delete _compCache[c+'|'+m]; });
      }
      delete _importCompositions[c+'|2026-02'];
    });
    var ss = D.statusScript || {};
    for (var sk in ss) { if (ss.hasOwnProperty(sk)) delete STATUS_SCRIPT[sk]; }
    for (var j = MANAGERS.length - 1; j >= 0; j--) {
      if (MANAGERS[j].id === 'MIRABAUD') MANAGERS.splice(j, 1);
    }

    // CATALOG + _codeMap
    D.portfolios.forEach(function(p) {
      var entry = { code:p.code, name:p.name, risk:p.risk, inception:p.inception };
      CATALOG.push(entry); _codeMap[p.code] = entry;
    });

    MANAGERS.push({ id:'MIRABAUD', name:'Mirabaud Advisory', codes:codes.slice(), roaTarget:0.0050 });

    // _portfolioData
    function realPd(pl) {
      var n = MONTHS.length;
      var z = function() { return new Array(n).fill(0); };
      var plArr = z(); plArr[FEV]=pl; plArr[MAR]=pl; plArr[ABR]=pl;
      var retArr = z(); retArr[FEV]=CDI_FEV; retArr[MAR]=CDI_MAR; retArr[ABR]=CDI_ABR;
      var feeArr = z(); feeArr[FEV]=pl*MFEE; feeArr[MAR]=pl*MFEE; feeArr[ABR]=pl*MFEE;
      var rpp = z(); rpp[MAR]=pl; rpp[ABR]=pl;
      return { fee:MFEE, plArr:plArr, nnmArr:z(), retArr:retArr, feeArr:feeArr, reportedPlPrevArr:rpp };
    }

    D.portfolios.forEach(function(p) { _portfolioData[p.code] = realPd(p.pl); });

    // STATUS_SCRIPT
    for (var sk2 in ss) { if (ss.hasOwnProperty(sk2)) STATUS_SCRIPT[sk2] = ss[sk2]; }

    // _importCompositions
    var comps = D.compositions || {};
    var compKeys = Object.keys(comps);
    for (var ki = 0; ki < compKeys.length; ki++) {
      var ckey = compKeys[ki];
      var ccode = ckey.split('|')[0];
      var cpl = 1;
      for (var pi = 0; pi < D.portfolios.length; pi++) {
        if (D.portfolios[pi].code === ccode) { cpl = D.portfolios[pi].pl; break; }
      }
      _importCompositions[ckey] = comps[ckey].map(function(r) {
        var pct = cpl > 0 ? r.saldoFinal / cpl : 0;
        return { name:r.name, cls:r.cls, institution:r.inst, vencto:r.vencto,
                 saldoInicial:r.saldoFinal, saldoFinal:r.saldoFinal,
                 varBRL:0, retAtivo:0, contrib:0, pct:pct };
      });
    }

    // Dados injetados via window._MirabaudRealData (platform-data-real.js)

  }

  injectMirabaud();

  /* =============================================================
     5. GERADOR DE ACHADOS
  ============================================================= */

  var FINDING_TEMPLATES = {
    CORRIGIR: [
      function(ctx) {
        var diff = (ctx.reportedPlPrev - ctx.plPrev);
        var pct = Math.abs(diff / ctx.plPrev * 100).toFixed(2);
        var brl = Math.abs(diff).toLocaleString('pt-BR', {style:'currency', currency:'BRL', maximumFractionDigits:0});
        return { severity:'CORRIGIR', text:'PL anterior reportado diverge do saldo final do mês anterior em ' + pct + '% (' + brl + '). Tolerância máxima: 0,30%.' };
      },
      function() {
        return { severity:'CORRIGIR', text:'Saldo de abertura não coincide com o extrato de custódia confirmado. Solicitado reprocessamento junto ao custodiante.' };
      }
    ],
    'COM ALERTA': [
      function(ctx) {
        var cls1 = ctx.clsFrom, pct1 = ctx.pct1, pct2 = ctx.pct2;
        return { severity:'COM ALERTA', text:'Mudança de alocação na classe ' + cls1 + ', de ' + pct1 + '% para ' + pct2 + '%. Verificar alinhamento com mandato.' };
      },
      function(ctx) {
        var n = ctx.consecutiveMths || 2;
        var diff = (ctx.retPct - ctx.cdiPct).toFixed(2);
        return { severity:'COM ALERTA', text:'Rentabilidade ' + Math.abs(diff) + 'pp abaixo do CDI pelo ' + n + 'º mês consecutivo. Verificar qualidade da gestão.' };
      },
      function(ctx) {
        var pct = (Math.abs(ctx.unexplained / ctx.plPrev) * 100).toFixed(2);
        return { severity:'COM ALERTA', text:'Variação patrimonial de ' + pct + '% não completamente explicada por movimentação registrada. Aguardando confirmação de dividendos.' };
      },
      function(ctx) {
        return { severity:'COM ALERTA', text:'Ausência de extrato confirmado pelo custodiante ' + ctx.inst + '. Posição estimada com base no último extrato disponível.' };
      },
    ],
    LIBERAR: [
      function(ctx) {
        return { severity:'INFO', text:'Variação de ' + ctx.varPct + '% no mês — acima da faixa histórica da carteira. Confirmado pelo gestor como realocação tática.' };
      }
    ]
  };

  function randomFinding(status, code, month) {
    var templates = FINDING_TEMPLATES[status];
    if (!templates || !templates.length) return null;
    var rng = subRng('finding|' + code + '|' + month);
    var ti = Math.floor(rng() * templates.length);
    var pd = _portfolioData[code];
    var mi = MONTHS.indexOf(month);
    var plPrev = mi > 0 ? pd.plArr[mi-1] : pd.plArr[0] * 0.92;
    var plCurr = pd.plArr[mi] || 0;
    var ret = pd.retArr[mi] || 0;
    var rpl = pd.reportedPlPrevArr[mi] || plPrev;
    var cdi = CDI[month] || 0.009;
    var classes = ['Liquidez','RF Pós-Fixado','RF Inflação','Multimercado','Ações'];
    var clsRng = subRng('cls|' + code + '|' + month);
    var cls1 = classes[Math.floor(clsRng() * classes.length)];
    var pct1 = (10 + clsRng() * 20).toFixed(1);
    var pct2 = (parseFloat(pct1) + 3 + clsRng() * 6).toFixed(1);
    var insts = ['Banco Mercantil Plus','XQ Investimentos','DTVM Pampulha'];
    var inst = insts[Math.floor(clsRng() * insts.length)];
    var ctx = {
      plPrev: plPrev, plCurr: plCurr, ret: ret,
      reportedPlPrev: rpl,
      retPct: (ret * 100).toFixed(2),
      cdiPct: (cdi * 100).toFixed(2),
      unexplained: (plCurr - plPrev * (1 + ret) - (pd.nnmArr[mi] || 0)),
      varPct: (Math.abs(ret) * 100).toFixed(1),
      clsFrom: cls1, pct1: pct1, pct2: pct2,
      consecutiveMths: 2 + Math.floor(clsRng() * 3),
      inst: inst
    };
    try { return templates[ti](ctx); } catch(e) { return { severity: status, text: 'Verificar carteira.' }; }
  }

  // anomalia de ROA: UMBRA_01, UMBRA_02 (inception 2026-03)
  // ROA = 0 para meses antes do inception
  function roaAnomalyForLateInception(code, month) {
    var p = _codeMap[code];
    if (!p) return null;
    if (p.inception > month) return { type:'ROA_ZERO_AUM', code:code, month:month, text:'Carteira com AUM > R$ 0 e ROA = 0%: data de inicio de cálculo posterior ao mês de referência.' };
    return null;
  }

  /* =============================================================
     6. COMPOSIÇÃO (LAZY + MEMOIZADA)
  ============================================================= */

  var _compCache = {};

  function getComposition(code, month) {
    var cacheKey = code + '|' + month;
    if (_importCompositions[cacheKey]) return _importCompositions[cacheKey];
    if (_compCache[cacheKey]) return _compCache[cacheKey];

    var pd = _portfolioData[code];
    if (!pd) return [];
    var mi = MONTHS.indexOf(month);
    if (mi < 0) return [];
    var plCurr = pd.plArr[mi] || 0;
    if (plCurr <= 0) return [];

    var rng = subRng('comp|' + cacheKey);
    var p = _codeMap[code];
    var params = RISK_PARAMS[p.risk];

    // Selecionar 5-9 ativos baseado no perfil de risco
    var assetPool = ASSETS.slice(0, ASSETS.length - 1); // sem caixa
    var nAssets = 5 + Math.floor(rng() * 4);

    // Pesos brutos por classe de acordo com perfil
    // conservador: mais RF; agressivo: mais ações
    var classWeightMap = {
      'RF Pós-Fixado':  1.5 - params.beta * 0.5,
      'RF Inflação':    1.2 - params.beta * 0.3,
      'CDB':            0.8 - params.beta * 0.2,
      'Multimercado':   0.5 + params.beta * 0.3,
      'Ações':          0.2 + params.beta * 0.7,
      'FII':            0.3 + params.beta * 0.2,
      'Previdência':    0.3,
      'Internacional':  0.1 + params.beta * 0.3,
      'Liquidez':       0.2,
    };

    // Shuffled pool com peso
    var weighted = assetPool.map(function(a) {
      return { asset:a, w:(classWeightMap[a.cls] || 0.3) * (0.5 + rng()) };
    }).sort(function(a,b) { return b.w - a.w; });

    var selected = weighted.slice(0, nAssets).map(function(x) { return x.asset; });

    // Pesos aleatórios normalizados
    var rawW = selected.map(function() { return 0.1 + rng() * 0.9; });
    var sumW = rawW.reduce(function(s,v) { return s+v; }, 0);
    // reservar 3-12% para caixa
    var caixaPct = 0.03 + rng() * 0.09;
    rawW = rawW.map(function(w) { return w / sumW * (1 - caixaPct); });

    var miPrev = mi - 1;
    var plPrev = miPrev >= 0 ? pd.plArr[miPrev] || 0 : plCurr * 0.97;

    var rows = [];
    selected.forEach(function(a, i) {
      var pct = rawW[i];
      var saldoFinal = plCurr * pct;
      var saldoInicial = plPrev * pct * (0.9 + rng() * 0.2);
      var varBRL = saldoFinal - saldoInicial;
      var retAtivo = saldoInicial > 0 ? varBRL / saldoInicial : 0;
      var contrib = plPrev > 0 ? varBRL / plPrev : 0;

      // Extrair vencimento de NTN-B
      var vencto = null;
      var mVencto = a.name.match(/Vencto:\s*(\d{2}\/\d{2}\/\d{4})/);
      if (mVencto) vencto = mVencto[1];

      rows.push({
        name: a.name,
        cls: a.cls,
        institution: a.inst,
        vencto: vencto,
        saldoInicial: saldoInicial,
        saldoFinal: saldoFinal,
        varBRL: varBRL,
        retAtivo: retAtivo,
        contrib: contrib,
        pct: pct,
      });
    });

    // Caixa absorve resíduo
    var sumPct = rawW.reduce(function(s,v){return s+v;},0);
    var caixaReal = 1 - sumPct;
    rows.push({
      name: ASSETS[CAIXA_IDX].name,
      cls: ASSETS[CAIXA_IDX].cls,
      institution: ASSETS[CAIXA_IDX].inst,
      vencto: null,
      saldoInicial: plPrev * caixaReal,
      saldoFinal: plCurr * caixaReal,
      varBRL: (plCurr - plPrev) * caixaReal,
      retAtivo: 0,
      contrib: 0,
      pct: caixaReal,
    });

    // Verificação soma
    var sumFinal = rows.reduce(function(s,r){return s+r.saldoFinal;},0);
    if (sumFinal > 0) {
      var factor = plCurr / sumFinal;
      rows.forEach(function(r){r.saldoFinal *= factor; r.pct = r.saldoFinal / plCurr;});
    }

    _compCache[cacheKey] = rows;
    return rows;
  }

  /* =============================================================
     7. DADOS DE CADASTRO (~28 pendências)
  ============================================================= */

  var PENDING_TYPES = [
    'Ficha Cadastral','Doc. Identificação','Comprovante de Residência',
    'Perfil Individual','Perfil de Risco','Comprovante SRF',
    'Pesquisa de Mídia','Visita','Qualificado/Profissional','Balanço Patrimonial'
  ];

  var PENDING_STATUSES = ['Pendente','Em Análise','Aguardando Cliente','Vencido'];

  var SEGMENTS = ['Ultra','Large','Mid','Small'];

  var _registrationCache = null;

  function getRegistration() {
    if (_registrationCache) return _registrationCache;
    var rng = subRng('registration|v1');
    var rows = [];
    var usedCodes = [];

    // 28 pendências distribuídas entre carteiras
    for (var i = 0; i < 28; i++) {
      var ci = Math.floor(rng() * CATALOG.length);
      var p = CATALOG[ci];
      var typeIdx = Math.floor(rng() * PENDING_TYPES.length);
      var stIdx = Math.floor(rng() * PENDING_STATUSES.length);
      var segIdx = Math.floor(rng() * SEGMENTS.length);
      var diasAtraso = Math.floor(15 + rng() * 120);

      // Calcular 'desde' como YYYY-MM-DD fictício antes de 2026-04
      var mAtraso = Math.floor(diasAtraso / 30);
      var mIdx = MONTHS.indexOf('2026-04') - mAtraso;
      var sinceMonth = MONTHS[Math.max(0, mIdx)] || '2025-01';

      rows.push({
        code: p.code,
        name: p.name,
        segment: SEGMENTS[segIdx],
        type: PENDING_TYPES[typeIdx],
        status: PENDING_STATUSES[stIdx],
        since: sinceMonth,
        obs: stIdx === 0 ? 'Aguardando documentação atualizada' : ''
      });
    }
    _registrationCache = rows;
    return rows;
  }

  /* =============================================================
     8. SELETORES (AtlasData)
  ============================================================= */

  function getManagerForCode(code) {
    for (var i = 0; i < MANAGERS.length; i++) {
      if (MANAGERS[i].codes.indexOf(code) >= 0) return MANAGERS[i];
    }
    return MANAGERS[0];
  }

  function getRow(code, month) {
    var pd = _portfolioData[code];
    var p = _codeMap[code];
    if (!pd || !p) return null;
    var mi = MONTHS.indexOf(month);
    if (mi < 0) return null;

    var plCurr = pd.plArr[mi] || 0;
    var plPrev = mi > 0 ? pd.plArr[mi-1] : (pd.plArr[0] || 0) * 0.92;
    var reportedPlPrev = pd.reportedPlPrevArr[mi] || plPrev;
    var ret = pd.retArr[mi] || 0;
    var nnm = pd.nnmArr[mi] || 0;
    var revenue = pd.feeArr[mi] || 0;
    var status = getStatus(code, month);
    var cdi = CDI[month] || 0;

    // Continuidade: |plCurr - (reportedPlPrev*(1+ret)+nnm)| / reportedPlPrev
    var expected = reportedPlPrev * (1 + ret) + nnm;
    var continuidade = reportedPlPrev > 0 ? Math.abs(plCurr - expected) / reportedPlPrev : 0;

    // Achados
    var findings = [];
    if (status !== 'LIBERAR' || (Math.abs(ret) > 0.012 && plCurr > 0)) {
      var f = randomFinding(status === 'LIBERAR' ? 'LIBERAR' : status, code, month);
      if (f) findings.push(f);
      // segundo achado para CORRIGIR
      if (status === 'CORRIGIR') {
        var f2 = randomFinding('COM ALERTA', code, month);
        if (f2) findings.push(f2);
      }
    }

    // ROA anomaly para inception tardio
    var roaAnomaly = roaAnomalyForLateInception(code, month);
    if (roaAnomaly) findings.push({ severity:'COM ALERTA', text: roaAnomaly.text });

    // Revenue YTD
    var revenueYTD = 0;
    var yearPrefix = month.slice(0,4);
    for (var mi2 = 0; mi2 <= mi; mi2++) {
      if (MONTHS[mi2].slice(0,4) === yearPrefix) revenueYTD += pd.feeArr[mi2] || 0;
    }

    var nAtivos = plCurr > 0 ? 5 + Math.floor(hashStr(code + month) % 5) : 0;
    var nAtivosPrev = plPrev > 0 ? 5 + Math.floor(hashStr(code + (MONTHS[mi-1]||month)) % 5) : 0;

    return {
      code: code,
      name: p.name,
      risk: p.risk,
      inception: p.inception,
      manager: getManagerForCode(code),
      plCurr: plCurr,
      plPrev: reportedPlPrev,
      plPrevTrue: plPrev,
      varBRL: plCurr - reportedPlPrev,
      varPct: reportedPlPrev > 0 ? (plCurr - reportedPlPrev) / reportedPlPrev : 0,
      rent: ret,
      vsCDI: ret - cdi,
      nnm: nnm,
      status: status,
      nAchados: findings.length,
      findings: findings,
      revenue: revenue,
      revenueYTD: revenueYTD,
      fee: pd.fee,
      continuidade: continuidade,
      nAtivos: nAtivos,
      nAtivosPrev: nAtivosPrev,
      cdi: cdi,
    };
  }

  function dashboardStats(month) {
    var liberar = 0, alerta = 0, corrigir = 0, plTotal = 0;
    CATALOG.forEach(function(p) {
      var s = getStatus(p.code, month);
      if (s === 'LIBERAR')      liberar++;
      else if (s === 'COM ALERTA') alerta++;
      else if (s === 'CORRIGIR')   corrigir++;
      var mi = MONTHS.indexOf(month);
      if (mi >= 0) plTotal += (_portfolioData[p.code].plArr[mi] || 0);
    });
    return {
      total: CATALOG.length,
      liberar: liberar,
      alerta: alerta,
      corrigir: corrigir,
      plTotal: plTotal,
      cdi: CDI[month] || 0,
    };
  }

  function plTotalSeries(fromMonth, toMonth) {
    var result = [];
    MONTHS.forEach(function(m, mi) {
      if (m < fromMonth || m > toMonth) return;
      var pl = 0;
      CATALOG.forEach(function(p) { pl += (_portfolioData[p.code].plArr[mi] || 0); });
      result.push({ month: m, label: MONTH_LABELS[mi], pl: pl });
    });
    return result;
  }

  function twrAgregado(fromMonth, toMonth) {
    var result = [];
    MONTHS.forEach(function(m) {
      if (m < fromMonth || m > toMonth) return;
      var idx = MONTHS.indexOf(m);
      var totalPl = 0;
      var weightedRet = 0;
      CATALOG.forEach(function(p) {
        var d = _portfolioData[p.code];
        var weight = idx > 0 ? (d.plArr[idx - 1] || 0) : (d.plArr[idx] || 0);
        var r = d.retArr[idx] || 0;
        totalPl += weight;
        weightedRet += weight * r;
      });
      var wRet = totalPl > 0 ? weightedRet / totalPl : 0;
      result.push({ month: m, twr: wRet });
    });
    return result;
  }

  function getMovimentacoes(code, month) {
    var row = getRow(code, month);
    if (!row) return null;
    var comp = getComposition(code, month);
    var plInicio = row.plPrev;
    var plFim = row.plCurr;
    var varPatrimonial = plFim - plInicio;
    var retornoRS = plInicio * row.rent;
    var aporteLiqEst = varPatrimonial - retornoRS;
    var ativos = comp.map(function(a) {
      return {
        nome: a.name,
        classe: a.cls,
        saldoInicio: a.saldoInicial,
        saldoFim: a.saldoFinal,
        varTotal: a.varBRL,
        retAtivo: a.retAtivo,
        contrib: a.contrib,
      };
    });
    ativos.sort(function(a, b) { return b.contrib - a.contrib; });
    return {
      mes: month,
      plInicio: plInicio,
      plFim: plFim,
      rentabilidade: row.rent,
      varPatrimonial: varPatrimonial,
      retornoRS: retornoRS,
      aporteLiqEst: aporteLiqEst,
      ativos: ativos,
    };
  }

  function findings(month) {
    var result = [];
    CATALOG.forEach(function(p) {
      var row = getRow(p.code, month);
      if (!row) return;
      row.findings.forEach(function(f) {
        result.push({ code: p.code, name: p.name, month: month, finding: f });
      });
    });
    return result;
  }

  function recidivas() {
    var result = [];
    RECIDIVA_CODES.forEach(function(code) {
      var p = _codeMap[code];
      if (!p) return;
      var history = [];
      MONTHS.forEach(function(m, mi) {
        var s = getStatus(code, m);
        if (s !== 'LIBERAR') history.push({ month: m, label: MONTH_LABELS[mi], status: s });
      });
      if (history.length >= 4) result.push({ code: code, name: p.name, count: history.length, history: history });
    });
    return result;
  }

  function anomalias(month) {
    var result = [];
    CATALOG.forEach(function(p) {
      var mi = MONTHS.indexOf(month);
      if (mi < 0) return;
      var ret = _portfolioData[p.code].retArr[mi] || 0;
      var status = getStatus(p.code, month);
      if (Math.abs(ret) > 0.10 && status === 'LIBERAR') {
        result.push({
          code: p.code, name: p.name, month: month,
          ret: ret, type: 'HIGH_VAR',
          text: 'Variação de ' + (ret*100).toFixed(1) + '% no mês — acima da faixa esperada para o perfil ' + p.risk + '.'
        });
      }
    });
    // anomalia de fee (DUNAS_CAP Out/2025)
    if (month === '2025-10') {
      result.push({
        code:'DUNAS_CAP', name:'Dunas Capital', month:month,
        ret:0, type:'FEE_ANOMALY',
        text:'Taxa de administração 20× acima do padrão. Possível erro de parametrização no sistema de faturamento.'
      });
    }
    // anomalia de billing (COMETA_FAM Fev/2026)
    if (month === '2026-02') {
      result.push({
        code:'COMETA_FAM', name:'Cometa Family', month:month,
        ret:0, type:'BILLING_ADJ',
        text:'Receita com ajuste de faturamento de R$ 48.500 sem evento de movimentação correspondente.'
      });
    }
    return result;
  }

  function limpas(month) {
    return CATALOG.filter(function(p) {
      var s = getStatus(p.code, month);
      var row = getRow(p.code, month);
      return s === 'LIBERAR' && row && row.nAchados === 0;
    }).map(function(p) { return getRow(p.code, month); });
  }

  function comparative(monthA, monthB) {
    var rows = [];
    CATALOG.forEach(function(p) {
      var rA = getRow(p.code, monthA);
      var rB = getRow(p.code, monthB);
      if (!rA || !rB) return;
      rows.push({
        code: p.code, name: p.name,
        plA: rA.plCurr, plB: rB.plCurr,
        rentA: rA.rent, rentB: rB.rent,
        statusA: rA.status, statusB: rB.status,
        nAchadosA: rA.nAchados, nAchadosB: rB.nAchados,
        delta: rA.plCurr - rB.plCurr,
        deltaPct: rB.plCurr > 0 ? (rA.plCurr - rB.plCurr) / rB.plCurr : 0,
        manager: rA.manager.name,
      });
    });
    rows.sort(function(a,b){return b.delta - a.delta;});
    var rentCounterA = { pos:0, zero:0, neg:0 };
    var rentCounterB = { pos:0, zero:0, neg:0 };
    rows.forEach(function(r) {
      if (r.rentA > 0.0001) rentCounterA.pos++;
      else if (r.rentA < -0.0001) rentCounterA.neg++;
      else rentCounterA.zero++;
      if (r.rentB > 0.0001) rentCounterB.pos++;
      else if (r.rentB < -0.0001) rentCounterB.neg++;
      else rentCounterB.zero++;
    });
    var plTotalA = rows.reduce(function(s,r){return s+r.plA;},0);
    var plTotalB = rows.reduce(function(s,r){return s+r.plB;},0);
    return {
      rows: rows,
      top5Altas: rows.slice(0,5),
      top5Quedas: rows.filter(function(r){return r.plA > 0;}).reverse().slice(0,5),
      plTotalA: plTotalA, plTotalB: plTotalB,
      rentCounterA: rentCounterA, rentCounterB: rentCounterB,
    };
  }

  function revenueSeries() {
    return MONTHS.map(function(m, mi) {
      var aum = 0, revenue = 0, nnm = 0;
      CATALOG.forEach(function(p) {
        var pd = _portfolioData[p.code];
        aum += pd.plArr[mi] || 0;
        revenue += pd.feeArr[mi] || 0;
        nnm += pd.nnmArr[mi] || 0;
      });
      var roa = aum > 0 ? revenue / aum : 0;
      return { month: m, label: MONTH_LABELS[mi], aum: aum, nnm: nnm, roa: roa, clients: CATALOG.length, revenue: revenue };
    });
  }

  function managerRanking(month) {
    return MANAGERS.map(function(mgr) {
      var aum = 0, revenue = 0;
      var mi = MONTHS.indexOf(month);
      if (mi < 0) return null;
      mgr.codes.forEach(function(code) {
        var pd = _portfolioData[code];
        aum += pd.plArr[mi] || 0;
        revenue += pd.feeArr[mi] || 0;
      });
      var roa = aum > 0 ? revenue / aum : 0;
      var attainment = mgr.roaTarget > 0 ? roa / mgr.roaTarget : 0;
      var badge = attainment >= 1.0 ? 'ACIMA' : attainment >= 0.85 ? 'PROX.' : 'ABAIXO';
      return {
        managerId: mgr.id, managerName: mgr.name,
        nCarteiras: mgr.codes.length,
        aum: aum, revenue: revenue, roa: roa,
        roaTarget: mgr.roaTarget, attainment: attainment, badge: badge,
      };
    }).filter(Boolean);
  }

  function managerAnalysis(managerId, month) {
    var mgr = MANAGERS.find(function(m){return m.id===managerId;});
    if (!mgr) return null;
    var mi = MONTHS.indexOf(month);
    if (mi < 0) return null;
    var rows = mgr.codes.map(function(code) { return getRow(code, month); }).filter(Boolean);
    var totalAum = rows.reduce(function(s,r){return s+r.plCurr;},0);
    var totalRev = rows.reduce(function(s,r){return s+r.revenue;},0);
    var roa = totalAum > 0 ? totalRev / totalAum : 0;
    var attainment = mgr.roaTarget > 0 ? roa / mgr.roaTarget : 0;
    return { manager: mgr, rows: rows, totalAum: totalAum, totalRev: totalRev, roa: roa, attainment: attainment };
  }

  function clientRevenueRows(month, opts) {
    opts = opts || {};
    var rows = CATALOG.map(function(p) {
      var mi = MONTHS.indexOf(month);
      if (mi < 0) return null;
      var pd = _portfolioData[p.code];
      var pl = pd.plArr[mi] || 0;
      var revenue = pd.feeArr[mi] || 0;
      var nnm = 0;
      var yearPfx = month.slice(0,4);
      var revenueYTD = 0;
      for (var j = 0; j <= mi; j++) {
        if (MONTHS[j].slice(0,4) === yearPfx) {
          nnm += pd.nnmArr[j] || 0;
          revenueYTD += pd.feeArr[j] || 0;
        }
      }
      var roa = pl > 0 ? revenue / pl : 0;
      var seg = pl > 50e6 ? 'Ultra' : pl > 20e6 ? 'Large' : pl > 5e6 ? 'Mid' : pl > 1e6 ? 'Small' : 'Micro';
      var mgr = getManagerForCode(p.code);
      return {
        code: p.code, name: p.name, risk: p.risk,
        manager: mgr.name, managerId: mgr.id,
        segment: seg, pl: pl, nnmYTD: nnm,
        roa: roa, revenue: revenue, revenueYTD: revenueYTD,
        status: getStatus(p.code, month),
      };
    }).filter(Boolean);

    if (opts.managerId) rows = rows.filter(function(r){return r.managerId===opts.managerId;});
    if (opts.segment) rows = rows.filter(function(r){return r.segment===opts.segment;});
    if (opts.status) rows = rows.filter(function(r){return r.status===opts.status;});
    if (opts.query) {
      var q = opts.query.toLowerCase();
      rows = rows.filter(function(r){return r.code.toLowerCase().includes(q)||r.name.toLowerCase().includes(q);});
    }
    return rows;
  }

  function sizeSegmentation(month) {
    var mi = MONTHS.indexOf(month);
    if (mi < 0) return [];
    var buckets = { Ultra:[], Large:[], Mid:[], Small:[], Micro:[] };
    CATALOG.forEach(function(p) {
      var pl = _portfolioData[p.code].plArr[mi] || 0;
      var seg = pl > 50e6 ? 'Ultra' : pl > 20e6 ? 'Large' : pl > 5e6 ? 'Mid' : pl > 1e6 ? 'Small' : 'Micro';
      buckets[seg].push({ code:p.code, pl:pl });
    });
    return ['Ultra','Large','Mid','Small','Micro'].map(function(seg) {
      var items = buckets[seg];
      var totalPl = items.reduce(function(s,i){return s+i.pl;},0);
      return { segment:seg, count:items.length, totalPl:totalPl };
    });
  }

  function concentration(month) {
    var mi = MONTHS.indexOf(month);
    if (mi < 0) return { top5:[], top10:[] };
    var rows = CATALOG.map(function(p) {
      return { code:p.code, name:p.name, pl:_portfolioData[p.code].plArr[mi]||0 };
    }).sort(function(a,b){return b.pl-a.pl;});
    var totalPl = rows.reduce(function(s,r){return s+r.pl;},0);
    var top10 = rows.slice(0,10).map(function(r) {
      return { code:r.code, name:r.name, pl:r.pl, pct:totalPl>0?r.pl/totalPl:0 };
    });
    return { top5: top10.slice(0,5), top10: top10, totalPl: totalPl };
  }

  function roaAlerts(month) {
    var series = revenueSeries();
    var monthData = series.find(function(s){return s.month===month;});
    if (!monthData) return [];
    var alerts = [];

    // Regra 1: ROA < 0.3% no mês
    if (monthData.roa < 0.003) {
      alerts.push({ rule:'ROA Mês Baixo', text:'ROA do mês (' + (monthData.roa*100).toFixed(3) + '%) abaixo do piso de 0,300%.', severity:'CORRIGIR' });
    }

    // Regra 2: anomalia de fee (Out/2025)
    if (month === '2025-10') {
      alerts.push({ rule:'Fee Anômalo', text:'DUNAS_CAP: taxa de administração calculada é 20× o parâmetro contratual.', severity:'CORRIGIR' });
    }

    // Regra 3: ROA = 0 com AUM > 10k (inception tardio)
    var lateInceptions = ['UMBRA_01','UMBRA_02','COMETA_FAM'];
    lateInceptions.forEach(function(code) {
      var p = _codeMap[code];
      if (!p || p.inception > month) {
        var mi = MONTHS.indexOf(month);
        if (mi >= 0) {
          var pl = _portfolioData[code] ? (_portfolioData[code].plArr[mi]||0) : 0;
          if (pl > 10000) {
            alerts.push({ rule:'ROA Zero / AUM Ativo', text:code + ': AUM de R$ ' + Math.round(pl).toLocaleString('pt-BR') + ' com receita zero (inception: ' + (p?p.inception:'—') + ').', severity:'COM ALERTA' });
          }
        }
      }
    });

    return alerts;
  }

  function audit(month) {
    var mi = MONTHS.indexOf(month);
    if (mi < 0) return [];
    var rows = CATALOG.map(function(p) {
      var pd = _portfolioData[p.code];
      var pl = pd.plArr[mi] || 0;
      var revenue = pd.feeArr[mi] || 0;
      var expected = pl * pd.fee;
      // anomalia DUNAS_CAP Out/2025
      if (p.code === 'DUNAS_CAP' && month === '2025-10') expected = pl * pd.fee; // base correta
      var diff = revenue - expected;
      var diffPct = expected > 0 ? Math.abs(diff) / expected : 0;
      return {
        code: p.code, name: p.name,
        pl: pl, fee: pd.fee,
        expected: expected, revenue: revenue,
        diff: diff, diffPct: diffPct,
        ok: diffPct < 0.0001,
      };
    });
    return rows;
  }

  function searchAssets(query, month) {
    if (!query || query.length < 2) return [];
    var q = query.toLowerCase();
    var result = [];
    var seenAssets = {};
    CATALOG.forEach(function(p) {
      var comp = getComposition(p.code, month);
      var mi = MONTHS.indexOf(month);
      if (mi < 0) return;
      var plTotal = _portfolioData[p.code].plArr[mi] || 0;
      comp.forEach(function(row) {
        if (!row.name.toLowerCase().includes(q) && !row.cls.toLowerCase().includes(q)) return;
        var existing = seenAssets[row.name];
        if (!existing) {
          seenAssets[row.name] = { assetName:row.name, cls:row.cls, portfolios:[], totalValue:0, totalPl:0 };
          result.push(seenAssets[row.name]);
        }
        seenAssets[row.name].portfolios.push({ code:p.code, name:p.name, value:row.saldoFinal, pct:row.pct });
        seenAssets[row.name].totalValue += row.saldoFinal;
        seenAssets[row.name].totalPl += plTotal;
      });
    });
    result.sort(function(a,b){return b.totalValue-a.totalValue;});
    return result;
  }

  function portfolioReportData(code, months) {
    var p = _codeMap[code];
    if (!p) return null;
    var mgr = getManagerForCode(code);
    var rows = (months || MONTHS).map(function(m) {
      var row = getRow(code, m);
      if (!row) return null;
      var comp = getComposition(code, m);
      return { row: row, composition: comp };
    }).filter(Boolean);

    // TWR acumulado
    var twr = 1;
    var twrSeries = rows.map(function(r) {
      twr *= (1 + r.row.rent);
      return { month: r.row.code ? r.row : r, twr: twr - 1 };
    });

    return { portfolio: p, manager: mgr, rows: rows, twrSeries: twrSeries };
  }

  function exportMonthlySnapshot(month) {
    var stats = dashboardStats(month);
    var revenues = revenueSeries();
    var mData = revenues.find(function(r){return r.month===month;}) || {};
    var portfolioRows = CATALOG.map(function(p) {
      return getRow(p.code, month);
    }).filter(Boolean);
    var managerRows = managerRanking(month);
    return {
      month: month,
      label: MONTH_LABELS[MONTHS.indexOf(month)] || month,
      stats: stats,
      revenue: mData,
      portfolios: portfolioRows,
      managers: managerRows,
      generatedAt: '2026-04-30T18:00:00.000Z', // data fixa para reproducibilidade
    };
  }

  /* ================================================================
     8b. RISK SCORING
  ================================================================ */

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
    /* Dimensões e pesos máximos (soma = 100) */
    max: { mercado: 30, concentracao: 25, liquidez: 20, suitability: 15, operacional: 10 },

    /* Faixas de nível de risco (score total 0–100) */
    nivel: { alto: 70, atencao: 40 },

    /* Thresholds de ativação da fila de ação (score por dimensão) */
    filaAcao: {
      scoreMinimo:  40,  /* score total mínimo para entrar na fila */
      operacional:   6,
      mercado:      15,
      concentracao: 12,
      suitability:   8,
      liquidez:     10,
    },
  };

  function riskScore(code, month) {
    var p = _codeMap[code];
    if (!p) return null;
    var row = getRow(code, month);
    if (!row || row.plCurr <= 0) return null;
    var mi = MONTHS.indexOf(month);
    var pd = _portfolioData[code];
    var comp = getComposition(code, month);
    var classPcts = {};
    comp.forEach(function(item) { classPcts[item.cls] = (classPcts[item.cls] || 0) + item.pct; });

    // MERCADO (0-30)
    var mercado = 0;
    var last6Start = Math.max(0, mi - 5);
    var monthsBelowCDI = 0, plPeak = 0;
    for (var j = last6Start; j <= mi; j++) {
      if (MONTHS[j] < p.inception) continue;
      if ((pd.retArr[j] || 0) < (CDI[MONTHS[j]] || 0)) monthsBelowCDI++;
      var pl6 = pd.plArr[j] || 0;
      if (pl6 > plPeak) plPeak = pl6;
    }
    mercado += Math.min(18, monthsBelowCDI * 3);
    var drawdown6M = plPeak > 0 ? Math.max(0, (plPeak - row.plCurr) / plPeak) : 0;
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
    if (RECIDIVA_CODES.indexOf(code) >= 0) op += 2;
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
      manager: getManagerForCode(code),
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
    CATALOG.forEach(function(p) {
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
        { ativo: RECIDIVA_CODES.indexOf(s.code) >= 0,  peso: 1,                         motivo:'Recidiva de alertas (4+ meses)',      rec:'Escalar para comitê de risco' },
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
    var shocks = STRESS_SHOCKS[scenario] || STRESS_SHOCKS['combinado'];
    var totalLoss = 0, totalAUM = 0;
    var portfolioLosses = [];
    CATALOG.forEach(function(p) {
      var mi = MONTHS.indexOf(month);
      if (mi < 0) return;
      var plCurr = _portfolioData[p.code].plArr[mi] || 0;
      if (plCurr <= 0) return;
      totalAUM += plCurr;
      var comp = getComposition(p.code, month);
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

  function validate() {
    var errs = 0;

    // I1: 40 fictícias + N reais (depende de window._MirabaudRealData)
    var _realN = (typeof window !== 'undefined' && window._MirabaudRealData && window._MirabaudRealData.portfolios)
      ? window._MirabaudRealData.portfolios.length : 0;
    var _expectedCat = 40 + _realN;
    console.assert(CATALOG.length === _expectedCat, 'I1: esperado ' + _expectedCat + ' carteiras, obtido ' + CATALOG.length);
    if (CATALOG.length !== _expectedCat) errs++;

    // I2: PL total Abr/2026 — range adapta ao número de carteiras reais
    var stats = dashboardStats('2026-04');
    var _plMin = _realN > 0 ? 1.4e9 : 1.0e9;
    var _plMax = _realN > 0 ? 2.0e9 : 1.6e9;
    console.assert(stats.plTotal >= _plMin && stats.plTotal <= _plMax,
      'I2: PL Abr/2026 fora do intervalo: ' + (stats.plTotal/1e9).toFixed(3) + ' bi');
    if (stats.plTotal < _plMin || stats.plTotal > _plMax) errs++;

    // I3: Abr/2026 → exatamente 2 CORRIGIR, 5 COM ALERTA
    console.assert(stats.corrigir === 2, 'I3: esperado 2 CORRIGIR em Abr/2026, obtido ' + stats.corrigir);
    if (stats.corrigir !== 2) errs++;
    console.assert(stats.alerta === 5, 'I3: esperado 5 COM ALERTA em Abr/2026, obtido ' + stats.alerta);
    if (stats.alerta !== 5) errs++;

    // I4: Ago/2025 → pelo menos 5 CORRIGIR
    var statsAgo = dashboardStats('2025-08');
    console.assert(statsAgo.corrigir >= 5, 'I4: esperado >=5 CORRIGIR em Ago/2025, obtido ' + statsAgo.corrigir);
    if (statsAgo.corrigir < 5) errs++;

    // I5: >=4 recidivas
    var rec = recidivas();
    console.assert(rec.length >= 4, 'I5: esperado >=4 recidivas, obtido ' + rec.length);
    if (rec.length < 4) errs++;

    // I6: PL positivo em todos os meses para carteiras após inception
    var plFail = 0;
    CATALOG.forEach(function(p) {
      MONTHS.forEach(function(m, mi) {
        if (m < p.inception) return;
        var pl = _portfolioData[p.code].plArr[mi];
        if (pl <= 0) plFail++;
      });
    });
    console.assert(plFail === 0, 'I6: ' + plFail + ' PLs negativos ou zero após inception');
    if (plFail > 0) errs++;

    // I7: gestores — 4 fictícios + 1 Mirabaud se dados reais carregados
    var _expectedMgr = _realN > 0 ? 5 : 4;
    console.assert(MANAGERS.length === _expectedMgr, 'I7: esperado ' + _expectedMgr + ' gestores, obtido ' + MANAGERS.length);
    if (MANAGERS.length !== _expectedMgr) errs++;

    // I8: anomalia de fee presente em Out/2025
    var anomOut = anomalias('2025-10');
    var feeAnom = anomOut.some(function(a){return a.type==='FEE_ANOMALY';});
    console.assert(feeAnom, 'I8: anomalia de fee em DUNAS_CAP Out/2025 não encontrada');
    if (!feeAnom) errs++;

    // I9: ~28 pendências cadastrais
    var regs = getRegistration();
    console.assert(regs.length >= 25 && regs.length <= 32, 'I9: esperado ~28 pendências, obtido ' + regs.length);
    if (regs.length < 25 || regs.length > 32) errs++;

    if (errs === 0) {
      console.info('[AtlasData.validate] Todas as invariantes OK.');
    } else {
      console.warn('[AtlasData.validate] ' + errs + ' invariante(s) com falha.');
    }
    return errs;
  }

  /* =============================================================
     8c. INJEÇÃO DE DADOS IMPORTADOS
     Troca de dataset por MUTAÇÃO IN-PLACE das estruturas exportadas
     (CATALOG, MANAGERS, _portfolioData, STATUS_SCRIPT, _codeMap,
     _importCompositions, _compCache). NUNCA reatribui as `var`.
  ============================================================= */

  var IMPORT_FEE = 0.0004; // taxa mensal default para carteiras importadas

  // Constrói a entrada _portfolioData[code] a partir de um portfolio normalizado
  // (formato do parser: { code, name, risk, months:{ 'YYYY-MM': {pl, ret, status, composition} } }).
  function buildPortfolioEntry(portfolio) {
    var n = MONTHS.length;
    var entry = {
      fee: IMPORT_FEE,
      plArr: new Array(n).fill(0),
      nnmArr: new Array(n).fill(0),
      retArr: new Array(n).fill(0),
      feeArr: new Array(n).fill(0),
      reportedPlPrevArr: new Array(n).fill(0)
    };
    // 1ª passada: preenche todos os plArr/retArr/feeArr dos meses importados.
    Object.keys(portfolio.months).forEach(function (mes) {
      var mi = MONTHS.indexOf(mes);
      if (mi < 0) return;
      var m = portfolio.months[mes];
      entry.plArr[mi] = m.pl;
      entry.retArr[mi] = m.ret;
      entry.feeArr[mi] = m.pl * entry.fee;
    });
    // 2ª passada: reportedPlPrevArr referencia plArr[mi-1] já preenchido.
    Object.keys(portfolio.months).forEach(function (mes) {
      var mi = MONTHS.indexOf(mes);
      if (mi < 0) return;
      entry.reportedPlPrevArr[mi] = mi > 0 ? entry.plArr[mi - 1] : 0;
    });
    return entry;
  }

  // Constrói as linhas de composição (overlay) de um mês a partir de pl + composition.
  function buildCompositionRows(pl, composition) {
    return composition.map(function (c) {
      return {
        name: c.name,
        cls: c.cls,
        institution: 'Importado',
        vencto: null,
        saldoInicial: pl * c.pct,
        saldoFinal: pl * c.pct,
        varBRL: 0,
        retAtivo: 0,
        contrib: 0,
        pct: c.pct
      };
    });
  }

  function importPortfolioData(parsed) {
    if (!parsed || !Array.isArray(parsed.portfolios)) {
      return { ok: false, reason: 'Entrada inválida: estrutura parsed ausente.' };
    }
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      return { ok: false, reason: 'Importação bloqueada: há erros de validação.' };
    }
    if (parsed.portfolios.length === 0) {
      return { ok: false, reason: 'Nenhuma carteira válida para importar.' };
    }

    // --- Construção das novas estruturas em locais primeiro ---
    var newCatalog = [];
    var newPortfolioData = {};
    var newStatusScript = {};
    var newImportCompositions = {};
    var allCodes = [];
    var monthsSet = {};

    parsed.portfolios.forEach(function (pf) {
      var meses = Object.keys(pf.months).filter(function (mes) {
        return MONTHS.indexOf(mes) >= 0;
      });
      // inception = menor mês importado da carteira
      var inception = meses.slice().sort()[0] || MONTHS[0];

      newCatalog.push({ code: pf.code, name: pf.name, risk: pf.risk, inception: inception });
      newPortfolioData[pf.code] = buildPortfolioEntry(pf);
      allCodes.push(pf.code);

      meses.forEach(function (mes) {
        var m = pf.months[mes];
        newStatusScript[pf.code + '|' + mes] = m.status;
        newImportCompositions[pf.code + '|' + mes] = buildCompositionRows(m.pl, m.composition);
        monthsSet[mes] = true;
      });
    });

    // --- Aplicação IN-PLACE ---
    CATALOG.length = 0;
    newCatalog.forEach(function (e) { CATALOG.push(e); });

    Object.keys(_codeMap).forEach(function (k) { delete _codeMap[k]; });
    CATALOG.forEach(function (p) { _codeMap[p.code] = p; });

    Object.keys(STATUS_SCRIPT).forEach(function (k) { delete STATUS_SCRIPT[k]; });
    Object.keys(newStatusScript).forEach(function (k) { STATUS_SCRIPT[k] = newStatusScript[k]; });

    Object.keys(_portfolioData).forEach(function (k) { delete _portfolioData[k]; });
    Object.keys(newPortfolioData).forEach(function (k) { _portfolioData[k] = newPortfolioData[k]; });

    Object.keys(_importCompositions).forEach(function (k) { delete _importCompositions[k]; });
    Object.keys(newImportCompositions).forEach(function (k) { _importCompositions[k] = newImportCompositions[k]; });

    Object.keys(_compCache).forEach(function (k) { delete _compCache[k]; });

    MANAGERS.length = 0;
    MANAGERS.push({ id: 'IMPORTADAS', name: 'Carteiras Importadas', codes: allCodes.slice(), roaTarget: 0.0050 });

    _dataMode = 'imported';

    var mesesOrdenados = Object.keys(monthsSet).sort();
    return { ok: true, nCarteiras: parsed.portfolios.length, meses: mesesOrdenados, mode: 'imported' };
  }

  function restoreDemo() {
    CATALOG.length = 0;
    _demoSnapshot.catalog.forEach(function (e) {
      CATALOG.push({ code: e.code, name: e.name, risk: e.risk, inception: e.inception });
    });

    Object.keys(_codeMap).forEach(function (k) { delete _codeMap[k]; });
    CATALOG.forEach(function (p) { _codeMap[p.code] = p; });

    Object.keys(STATUS_SCRIPT).forEach(function (k) { delete STATUS_SCRIPT[k]; });
    Object.keys(_demoSnapshot.statusScript).forEach(function (k) {
      STATUS_SCRIPT[k] = _demoSnapshot.statusScript[k];
    });

    Object.keys(_portfolioData).forEach(function (k) { delete _portfolioData[k]; });
    Object.keys(_demoSnapshot.portfolioData).forEach(function (code) {
      var pd = _demoSnapshot.portfolioData[code];
      _portfolioData[code] = {
        fee: pd.fee,
        plArr: pd.plArr.slice(),
        nnmArr: pd.nnmArr.slice(),
        retArr: pd.retArr.slice(),
        feeArr: pd.feeArr.slice(),
        reportedPlPrevArr: pd.reportedPlPrevArr.slice()
      };
    });

    Object.keys(_importCompositions).forEach(function (k) { delete _importCompositions[k]; });
    Object.keys(_compCache).forEach(function (k) { delete _compCache[k]; });

    MANAGERS.length = 0;
    _demoSnapshot.managers.forEach(function (m) {
      MANAGERS.push({ id: m.id, name: m.name, codes: m.codes.slice(), roaTarget: m.roaTarget });
    });

    _dataMode = 'demo';
    injectMirabaud();
    return { ok: true, mode: 'demo' };
  }

  function getDataMode() { return _dataMode; }

  /* =============================================================
     9. EXPORTS
  ============================================================= */

  window.BENCHMARKS = { monthly_cdi: CDI, month_labels: MONTH_LABELS };

  window.AtlasData = {
    MONTHS: MONTHS,
    MONTH_LABELS: MONTH_LABELS,
    CDI: CDI,
    CURRENT_MONTH: CURRENT_MONTH,
    CATALOG: CATALOG,
    MANAGERS: MANAGERS,
    ASSETS: ASSETS,
    getRow: getRow,
    getComposition: getComposition,
    dashboardStats: dashboardStats,
    plTotalSeries: plTotalSeries,
    twrAgregado: twrAgregado,
    getMovimentacoes: getMovimentacoes,
    findings: findings,
    recidivas: recidivas,
    anomalias: anomalias,
    limpas: limpas,
    comparative: comparative,
    revenueSeries: revenueSeries,
    managerRanking: managerRanking,
    managerAnalysis: managerAnalysis,
    clientRevenueRows: clientRevenueRows,
    sizeSegmentation: sizeSegmentation,
    concentration: concentration,
    roaAlerts: roaAlerts,
    audit: audit,
    registration: getRegistration,
    searchAssets: searchAssets,
    portfolioReportData: portfolioReportData,
    exportMonthlySnapshot: exportMonthlySnapshot,
    STRESS_SHOCKS: STRESS_SHOCKS,
    RISK_CONFIG:   RISK_CONFIG,
    riskScore:     riskScore,
    riskDashboard: riskDashboard,
    riskStress:    riskStress,
    importPortfolioData: importPortfolioData,
    restoreDemo: restoreDemo,
    getDataMode: getDataMode,
    validate: validate,
  };

})();
