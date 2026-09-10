/* platform-data.js — ATLAS Wealth Verification
   Gerador determinístico de dados fictícios.
   Seed: 20260411  |  Não contém dados reais. */

(function () {
  'use strict';

  /* =============================================================
     0. DE ONDE VEM O DADO
  ============================================================= */

  /* O gerador sintético do demo NÃO roda no navegador. Esta flag existe para
     o mesmo arquivo servir a três consumidores com necessidades opostas:

       - o script de build (scripts/gerar-dataset-demo.mjs), que precisa do
         conjunto inteiro para gerar o dataset que o Worker serve;
       - tests/validate.js, que precisa do conjunto inteiro para conferir as
         invariantes do gerador;
       - o BUNDLE publicado, que NÃO pode conter o conjunto.

     O motivo é o pedido de controle de acesso. Enquanto o gerador morasse no
     bundle, qualquer um leria as 40 carteiras pelo console sem passar por
     autorização nenhuma, e nenhuma checagem no Worker restringiria coisa
     alguma. O dado precisa faltar no bundle para o escopo significar algo.

     Vite substitui o literal por false no build (`define` em vite.config.mjs),
     e o ramo morto sai na minificação. Sem o define, o `typeof` devolve
     'undefined' e o valor é false: falha fechada, nunca gera por acidente.

     Com false, o navegador fica com `_portfolioData` VAZIO e a matemática
     intacta. Quem preenche é `hidratarDoServidor()`, a partir de
     GET /api/dados, já escopado e projetado pelo papel de quem pediu. */
  var __GERAR_DEMO__ = (typeof __ATLAS_GERAR_DEMO__ !== 'undefined') ? !!__ATLAS_GERAR_DEMO__ : false;

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

  // Janela de meses. Estendida por APPEND (nunca reordenar/remover): os índices
  // dos meses existentes são o contrato com os dados reais (injectRealData mapeia
  // mês → índice). Anexar meses ao fim preserva todos os índices e valores já
  // congelados. Jul–Dez/26 foram adicionados para que o mês corrente de auditoria
  // não seja silenciosamente descartado na ingestão (o import usa D.MONTHS como
  // faixa suportada). Quando 2027 chegar, estender aqui; injectRealData avisa em
  // console.warn se um mês real cair fora desta janela, então nunca falha calado.
  var MONTHS = [
    '2024-01','2024-02','2024-03','2024-04','2024-05','2024-06',
    '2024-07','2024-08','2024-09','2024-10','2024-11','2024-12',
    '2025-01','2025-02','2025-03','2025-04','2025-05','2025-06',
    '2025-07','2025-08','2025-09','2025-10','2025-11','2025-12',
    '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
    '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'
  ];

  var MONTH_LABELS = [
    'Jan/24','Fev/24','Mar/24','Abr/24','Mai/24','Jun/24',
    'Jul/24','Ago/24','Set/24','Out/24','Nov/24','Dez/24',
    'Jan/25','Fev/25','Mar/25','Abr/25','Mai/25','Jun/25',
    'Jul/25','Ago/25','Set/25','Out/25','Nov/25','Dez/25',
    'Jan/26','Fev/26','Mar/26','Abr/26','Mai/26','Jun/26',
    'Jul/26','Ago/26','Set/26','Out/26','Nov/26','Dez/26'
  ];

  var CDI = {
    '2024-01':0.0092,'2024-02':0.0088,'2024-03':0.0085,'2024-04':0.0085,
    '2024-05':0.0083,'2024-06':0.0083,'2024-07':0.0083,'2024-08':0.0083,
    '2024-09':0.0085,'2024-10':0.0085,'2024-11':0.0088,'2024-12':0.0096,
    '2025-01':0.0103,'2025-02':0.0103,'2025-03':0.0111,'2025-04':0.0111,
    '2025-05':0.0115,'2025-06':0.0116,'2025-07':0.0116,'2025-08':0.0116,
    '2025-09':0.0116,'2025-10':0.0116,'2025-11':0.0116,'2025-12':0.0116,
    '2026-01':0.0116,'2026-02':0.0116,'2026-03':0.0115,'2026-04':0.0113,
    '2026-05':0.0113,'2026-06':0.0111,
    // Jul/26 e Ago/26 soma do CDI diario (Banco Central SGS serie 12, acumulado
    // dos dias uteis do mes), captura 2026-09-01.
    '2026-07':0.012152,'2026-08':0.010931,
  };

  // Benchmarks de mercado (retorno mensal, ratio decimal). So dado real e sourced
  // entra aqui, nunca valor inventado. Cobrem 2024-01..2026-08; mes sem serie
  // retorna 0 (getIBOV/getIPCA), entao a acumulacao no relatorio nao inventa.
  // IPCA: variacao mensal, Banco Central SGS serie 433 (IBGE), captura 2026-07-17;
  //   Agos/26 ainda nao publicado pelo IBGE em 2026-09-01, entao fica ausente.
  var IPCA = {
    '2024-01':0.0042,'2024-02':0.0083,'2024-03':0.0016,'2024-04':0.0038,'2024-05':0.0046,'2024-06':0.0021,
    '2024-07':0.0038,'2024-08':-0.0002,'2024-09':0.0044,'2024-10':0.0056,'2024-11':0.0039,'2024-12':0.0052,
    '2025-01':0.0016,'2025-02':0.0131,'2025-03':0.0056,'2025-04':0.0043,'2025-05':0.0026,'2025-06':0.0024,
    '2025-07':0.0026,'2025-08':-0.0011,'2025-09':0.0048,'2025-10':0.0009,'2025-11':0.0018,'2025-12':0.0033,
    '2026-01':0.0033,'2026-02':0.007,'2026-03':0.0088,'2026-04':0.0067,'2026-05':0.0058,'2026-06':0.0016,
    '2026-07':0.0007
  };
  // IBOV: retorno mensal do Ibovespa, Yahoo Finance ^BVSP (close mensal), captura 2026-07-17.
  //   Jul/26 e Ago/26 capturados em 2026-09-01 do mesmo close mensal (^BVSP, Yahoo Finance).
  var IBOV = {
    '2024-01':-0.047941,'2024-02':0.009925,'2024-03':-0.007084,'2024-04':-0.017033,'2024-05':-0.030383,'2024-06':0.014816,
    '2024-07':0.030224,'2024-08':0.065428,'2024-09':-0.030793,'2024-10':-0.015954,'2024-11':-0.031184,'2024-12':-0.042851,
    '2025-01':0.048652,'2025-02':-0.026448,'2025-03':0.060758,'2025-04':0.036903,'2025-05':0.014511,'2025-06':0.01334,
    '2025-07':-0.041655,'2025-08':0.062756,'2025-09':0.034047,'2025-10':0.022587,'2025-11':0.063742,'2025-12':0.012906,
    '2026-01':0.125611,'2026-02':0.040929,'2026-03':-0.007018,'2026-04':-0.000768,'2026-05':-0.07223,'2026-06':-0.01015,
    '2026-07':0.034734,'2026-08':-0.003258
  };
  function getIPCA(month) { return IPCA[month] || 0; }
  function getIBOV(month) { return IBOV[month] || 0; }

  // Último mês FECHADO (âncora do rescale demo e status default). Avançar aqui
  // reescala todos os números demo, porque a âncora do passo 2 é este mês.
  //
  // Jul/2026 é mês de ESTABILIDADE por desenho: sem roteiro de status, getStatus
  // devolve LIBERAR para todo o mês corrente, reportedPlPrev fica igual ao PL
  // anterior real, e a conta do produto fecha exata. Nenhuma carteira sai com
  // divergência material, e nenhum achado é fabricado.
  //
  // Agos/2026 segue o mesmo desenho de estabilidade (composição idêntica à de
  // julho, saldo andando só por marcação a mercado com o CDI real de agosto).
  var CURRENT_MONTH = '2026-08';

  // Mês em que o DEMO ABRE, que não é o mesmo conceito do mês corrente.
  //
  // Os dois já foram a mesma coisa, e isso custou caro: alguém avançou o mês
  // corrente sem estender o roteiro de status, o mês de abertura caiu no gerador
  // pseudoaleatório e saiu 40/40 LIBERAR. O prospect abria o demo justo na tela
  // em que o produto declara não ter encontrado nada, que é o oposto do que se
  // quer mostrar. tests/validate.js trava isso desde então.
  //
  // Com Jul/26 limpo de propósito, separar os dois é o que mantém as duas coisas
  // verdadeiras ao mesmo tempo: o último mês fechado reconciliou (e essa é a boa
  // notícia que se quer poder dizer), e a primeira tela continua sendo a de
  // Jun/26, onde o produto mostra o que acha. Quem quiser ver julho troca no
  // seletor. Esta constante governa SÓ onde o app aterrissa, nunca a extensão
  // dos dados: janela de gráfico, histórico e limite de fabricação continuam
  // olhando CURRENT_MONTH.
  var OPENING_MONTH = '2026-06';

  function getCDI(month) { return CDI[month] || 0; }

  var CATALOG = [
    // AXIOM_AM (14 carteiras)
    { code:'ALPHA_01', name:'Alpha Gestão I',          risk:'conservador',         inception:'2022-01', mgr:'AXIOM_AM' },
    { code:'ALPHA_02', name:'Alpha Gestão II',         risk:'moderado',            inception:'2022-03', mgr:'AXIOM_AM' },
    { code:'ALPHA_03', name:'Alpha Gestão III',        risk:'agressivo',           inception:'2022-06', mgr:'AXIOM_AM' },
    { code:'BRAVO_FAM', name:'Bravo Family Office',    risk:'moderado',            inception:'2021-07', mgr:'AXIOM_AM' },
    { code:'BRAVO_PV',  name:'Bravo Patrimonial',      risk:'conservador',         inception:'2023-01', mgr:'AXIOM_AM' },
    { code:'CEDRO_HLD', name:'Cedro Holding',          risk:'moderado-agressivo',  inception:'2020-04', mgr:'AXIOM_AM' },
    { code:'CEDRO_CAP', name:'Cedro Capital',          risk:'moderado',            inception:'2021-11', mgr:'AXIOM_AM' },
    { code:'DUNAS_CAP', name:'Dunas Capital',          risk:'moderado-agressivo',  inception:'2022-08', mgr:'AXIOM_AM' },
    { code:'DUNAS_FAM', name:'Dunas Family',           risk:'conservador',         inception:'2023-03', mgr:'AXIOM_AM' },
    { code:'ESTRELA_PV', name:'Estrela Patrimonial',   risk:'moderado',            inception:'2021-05', mgr:'AXIOM_AM' },
    { code:'ESTRELA_HLD', name:'Estrela Holding',      risk:'agressivo',           inception:'2020-09', mgr:'AXIOM_AM' },
    { code:'FAROL_INV', name:'Farol Investimentos',    risk:'moderado',            inception:'2023-06', mgr:'AXIOM_AM' },
    { code:'FAROL_FAM', name:'Farol Family',           risk:'conservador',         inception:'2022-11', mgr:'AXIOM_AM' },
    { code:'GAMMA_MID', name:'Gamma Mid-Cap',          risk:'moderado-agressivo',  inception:'2021-02', mgr:'AXIOM_AM' },
    // BEACON_WM (12 carteiras)
    { code:'GAMMA_LRG', name:'Gamma Large-Cap',        risk:'agressivo',           inception:'2020-11', mgr:'BEACON_WM' },
    { code:'HELIOS_01', name:'Helios Patrimonial I',   risk:'moderado',            inception:'2022-04', mgr:'BEACON_WM' },
    { code:'HELIOS_02', name:'Helios Patrimonial II',  risk:'moderado',            inception:'2022-04', mgr:'BEACON_WM' },
    { code:'INDIGO_CAP', name:'Indigo Capital',        risk:'conservador',         inception:'2023-09', mgr:'BEACON_WM' },
    { code:'JOIA_FAM',  name:'Joia Family Office',     risk:'moderado-agressivo',  inception:'2021-08', mgr:'BEACON_WM' },
    { code:'JOIA_HLD',  name:'Joia Holding',           risk:'moderado',            inception:'2022-02', mgr:'BEACON_WM' },
    { code:'KAPPA_PV',  name:'Kappa Patrimonial',      risk:'moderado',            inception:'2022-07', mgr:'BEACON_WM' },
    { code:'KAPPA_INV', name:'Kappa Investimentos',    risk:'conservador',         inception:'2023-04', mgr:'BEACON_WM' },
    { code:'LUMIA_01',  name:'Lumia Gestão I',         risk:'agressivo',           inception:'2021-10', mgr:'BEACON_WM' },
    { code:'LUMIA_02',  name:'Lumia Gestão II',        risk:'moderado',            inception:'2022-09', mgr:'BEACON_WM' },
    { code:'MARTE_FAM', name:'Marte Family',           risk:'conservador',         inception:'2023-07', mgr:'BEACON_WM' },
    { code:'NOVA_CAP',  name:'Nova Capital',           risk:'moderado-agressivo',  inception:'2021-06', mgr:'BEACON_WM' },
    // CREST_FO (9 carteiras)
    { code:'NOVA_PV',   name:'Nova Patrimonial',       risk:'moderado',            inception:'2023-02', mgr:'CREST_FO' },
    { code:'ORION_01',  name:'Orion Gestão I',         risk:'conservador',         inception:'2022-01', mgr:'CREST_FO' },
    { code:'ORION_02',  name:'Orion Gestão II',        risk:'moderado-agressivo',  inception:'2022-05', mgr:'CREST_FO' },
    { code:'PRADO_HLD', name:'Prado Holding',          risk:'moderado',            inception:'2020-12', mgr:'CREST_FO' },
    { code:'PRADO_FAM', name:'Prado Family',           risk:'conservador',         inception:'2023-05', mgr:'CREST_FO' },
    { code:'QUASAR_CAP', name:'Quasar Capital',        risk:'agressivo',           inception:'2021-03', mgr:'CREST_FO' },
    { code:'RIO_01',    name:'Rio Patrimonial I',      risk:'moderado',            inception:'2022-10', mgr:'CREST_FO' },
    { code:'RIO_02',    name:'Rio Patrimonial II',     risk:'moderado',            inception:'2023-08', mgr:'CREST_FO' },
    { code:'SOLAR_PV',  name:'Solar Patrimonial',      risk:'conservador',         inception:'2021-12', mgr:'CREST_FO' },
    // DELTA_PB (5 carteiras)
    { code:'SOLAR_INV', name:'Solar Investimentos',    risk:'moderado',            inception:'2022-06', mgr:'DELTA_PB' },
    { code:'TIGRE_FAM', name:'Tigre Family Office',    risk:'moderado-agressivo',  inception:'2021-04', mgr:'DELTA_PB' },
    { code:'UMBRA_01',  name:'Umbra Gestão I',         risk:'moderado',            inception:'2026-03', mgr:'DELTA_PB' },
    { code:'UMBRA_02',  name:'Umbra Gestão II',        risk:'conservador',         inception:'2026-03', mgr:'DELTA_PB' },
    { code:'COMETA_FAM', name:'Cometa Family',         risk:'moderado',            inception:'2026-02', mgr:'DELTA_PB' },
  ];

  var MANAGERS = [
    { id:'AXIOM_AM',  name:'Axiom Asset Management',  codes:CATALOG.filter(function(p){return p.mgr==='AXIOM_AM';}).map(function(p){return p.code;}), roaTarget:0.00052 * 12 },
    { id:'BEACON_WM', name:'Beacon Wealth Management', codes:CATALOG.filter(function(p){return p.mgr==='BEACON_WM';}).map(function(p){return p.code;}), roaTarget:0.00048 * 12 },
    { id:'CREST_FO',  name:'Crest Family Office',     codes:CATALOG.filter(function(p){return p.mgr==='CREST_FO';}).map(function(p){return p.code;}), roaTarget:0.00055 * 12 },
    { id:'DELTA_PB',  name:'Delta Private Banking',   codes:CATALOG.filter(function(p){return p.mgr==='DELTA_PB';}).map(function(p){return p.code;}), roaTarget:0.00043 * 12 },
  ];

  // beta e sigma por perfil de risco
  var RISK_PARAMS = {
    'conservador':        { beta:0.20, sigma:0.0018 },
    'moderado':           { beta:0.50, sigma:0.0038 },
    'moderado-agressivo': { beta:0.85, sigma:0.0072 },
    'agressivo':          { beta:1.25, sigma:0.0120 },
  };

  /* Catálogo de ativos.
   *
   * Instrumentos e distribuidores REAIS de propósito. Um prospect do setor
   * reconhece na hora que 'Horizonte DI FIC FIM' e 'DTVM Pampulha' não
   * existem, e isso tira a força do que o demo tenta mostrar.
   *
   * Os saldos, retornos e achados continuam sintéticos, e a faixa fixa do
   * AppShell diz isso em toda tela. O nome real aqui identifica o
   * instrumento, não afirma desempenho dele.
   *
   * A camada de GESTOR (MANAGERS, acima) segue fictícia e deve seguir. É lá
   * que o demo pendura receita, ROA contra meta e achados de auditoria, e
   * pendurar isso no nome de uma casa que existe seria atribuir desempenho
   * inventado a empresa real, num endereço público.
   *
   * A contagem por classe é a mesma de antes (3/4/2/4/5/3/1/2/1). A geração
   * de alocação depende dessa distribuição, e Liquidez tem de ser o último
   * item por causa de CAIXA_IDX logo abaixo.
   */
  var ASSETS = [
    { name:'XP Trend Pós-Fixado FIC FI RF',       cls:'RF Pós-Fixado',  inst:'XP Investimentos' },
    { name:'BTG Pactual Crédito Corporativo FIC FIRF CP', cls:'RF Pós-Fixado', inst:'BTG Pactual' },
    { name:'Itaú Referenciado DI FI RF',          cls:'RF Pós-Fixado',  inst:'Itaú Corretora' },
    { name:'NTN-B Vencto:15/05/2029',             cls:'RF Inflação',    inst:'Banco Bradesco' },
    { name:'NTN-B Vencto:15/08/2026',             cls:'RF Inflação',    inst:'Banco Bradesco' },
    { name:'NTN-B Vencto:15/05/2035',             cls:'RF Inflação',    inst:'Banco Bradesco' },
    { name:'Western Asset IMA-B Ativo FI RF',     cls:'RF Inflação',    inst:'XP Investimentos' },
    { name:'CDB Bradesco 102% CDI',               cls:'CDB',            inst:'Banco Bradesco' },
    { name:'CDB BTG Pactual 110% CDI 2A',         cls:'CDB',            inst:'BTG Pactual' },
    { name:'SPX Nimitz Structura FIC FIM',        cls:'Multimercado',   inst:'XP Investimentos' },
    { name:'Legacy Capital FIC FIM',              cls:'Multimercado',   inst:'BTG Pactual' },
    { name:'Ibiuna Hedge STH FIC FIM',            cls:'Multimercado',   inst:'Itaú Corretora' },
    { name:'Verde AM Scena FIC FIM',              cls:'Multimercado',   inst:'Banco Bradesco' },
    { name:'PETR4',                               cls:'Ações',          inst:'XP Investimentos' },
    { name:'VALE3',                               cls:'Ações',          inst:'XP Investimentos' },
    { name:'ITUB4',                               cls:'Ações',          inst:'XP Investimentos' },
    { name:'BOVA11',                              cls:'Ações',          inst:'BTG Pactual' },
    { name:'SMAL11',                              cls:'Ações',          inst:'BTG Pactual' },
    { name:'BRCR11',                              cls:'FII',            inst:'XP Investimentos' },
    { name:'XPML11',                              cls:'FII',            inst:'XP Investimentos' },
    { name:'HGLG11',                              cls:'FII',            inst:'Itaú Corretora' },
    { name:'Icatu SPX Lancer Prev FIC FIM',       cls:'Previdência',    inst:'XP Investimentos' },
    { name:'IVVB11',                              cls:'Internacional',  inst:'XP Investimentos' },
    { name:'BTG Pactual Global Equity FIC FIA IE', cls:'Internacional', inst:'BTG Pactual' },
    { name:'Caixa / Tesouraria',                  cls:'Liquidez',       inst:'Banco Bradesco' },
  ];

  var CAIXA_IDX = ASSETS.length - 1; // sempre último

  /* =============================================================
     3. SCRIPT DE STATUS
  ============================================================= */

  var STATUS_SCRIPT = {};

  function setS(code, month, s) { STATUS_SCRIPT[code + '|' + month] = s; }

  /* Jun/2026 — mês de abertura do demo (OPENING_MONTH).
   *
   * Precisa existir. Sem roteiro, o mês cai no gerador pseudoaleatório e Jun/26
   * saiu 40/40 LIBERAR, zero achado, o único mês assim em trinta. Quem abrisse
   * o demo caía justo na tela que faz o produto parecer que não encontra nada,
   * quando encontrar é o produto inteiro. Foi efeito colateral de alguém
   * avançar CURRENT_MONTH sem estender este roteiro, e tests/validate.js agora
   * falha se isso voltar a acontecer.
   *
   * Desde Jul/26 o mês de abertura deixou de ser o mês corrente: o corrente é
   * mês de estabilidade e sai limpo de propósito. Este roteiro segue amarrado a
   * OPENING_MONTH, que é onde o app aterrissa.
   *
   * A mistura é a da pitch: maioria limpa, um punhado para olhar, dois que não
   * saem antes de alguém resolver.
   */
  var RECIDIVA_CODES = ['HELIOS_01','JOIA_FAM','NOVA_CAP','KAPPA_PV'];
  var RECIDIVA_MONTHS = ['2025-11','2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];

  /* O roteiro inteiro é gerador do demo, então vive dentro do guard. A função
     existe em vez de um `if` gigante para que nada precise ser reindentado, e
     o `return` de guarda é a primeira linha: solto no bundle, ele não escreve
     nada em STATUS_SCRIPT, e o dataset que vale é o que a API mandou. */
  var _roteiroDeStatusDemo = function () {
  if (!__GERAR_DEMO__) return;

  setS('DUNAS_CAP',   '2026-06', 'CORRIGIR');
  setS('ORION_02',    '2026-06', 'CORRIGIR');
  setS('CEDRO_HLD',   '2026-06', 'COM ALERTA');
  setS('GAMMA_MID',   '2026-06', 'COM ALERTA');
  setS('QUASAR_CAP',  '2026-06', 'COM ALERTA');
  setS('TIGRE_FAM',   '2026-06', 'COM ALERTA');

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

  /* 4 carteiras com recidiva contínua terminando no mês de abertura.
     A janela ia até Mar/2026 e a página de recorrência abria vazia, porque o
     demo abre em Jun/2026. Recidiva que não alcança o mês visível não é
     recidiva para quem está olhando. */
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

  /* Jul/2026 — mês de estabilidade anterior ao corrente (mesmos ativos).
   *
   * Julho era o mês corrente quando o desenho de estabilidade nasceu, e o
   * getStatus devolvia LIBERAR para ele inteiro por ser o corrente. Com Agosto
   * assumindo o posto de mês corrente, julho voltaria para o gerador
   * pseudoaleatório e viraria 35 LIBERAR / 3 ALERTA / 2 CORRIGIR, apagando a
   * estabilidade que o produto documentou. A premissa do dono vale para julho
   * ("todas as carteiras mantiveram os MESMOS ATIVOS"): todas as 40 mantêm a
   * posição e fecham em LIBERAR, sem roteiro de divergência.
   */
  setS('ALPHA_01',    '2026-07', 'LIBERAR');
  setS('ALPHA_02',    '2026-07', 'LIBERAR');
  setS('ALPHA_03',    '2026-07', 'LIBERAR');
  setS('BRAVO_FAM',   '2026-07', 'LIBERAR');
  setS('BRAVO_PV',    '2026-07', 'LIBERAR');
  setS('CEDRO_HLD',   '2026-07', 'LIBERAR');
  setS('CEDRO_CAP',   '2026-07', 'LIBERAR');
  setS('DUNAS_CAP',   '2026-07', 'LIBERAR');
  setS('DUNAS_FAM',   '2026-07', 'LIBERAR');
  setS('ESTRELA_PV',  '2026-07', 'LIBERAR');
  setS('ESTRELA_HLD', '2026-07', 'LIBERAR');
  setS('FAROL_INV',   '2026-07', 'LIBERAR');
  setS('FAROL_FAM',   '2026-07', 'LIBERAR');
  setS('GAMMA_MID',   '2026-07', 'LIBERAR');
  setS('GAMMA_LRG',   '2026-07', 'LIBERAR');
  setS('HELIOS_01',   '2026-07', 'LIBERAR');
  setS('HELIOS_02',   '2026-07', 'LIBERAR');
  setS('INDIGO_CAP',  '2026-07', 'LIBERAR');
  setS('JOIA_FAM',    '2026-07', 'LIBERAR');
  setS('JOIA_HLD',    '2026-07', 'LIBERAR');
  setS('KAPPA_PV',    '2026-07', 'LIBERAR');
  setS('KAPPA_INV',   '2026-07', 'LIBERAR');
  setS('LUMIA_01',    '2026-07', 'LIBERAR');
  setS('LUMIA_02',    '2026-07', 'LIBERAR');
  setS('MARTE_FAM',   '2026-07', 'LIBERAR');
  setS('NOVA_CAP',    '2026-07', 'LIBERAR');
  setS('NOVA_PV',     '2026-07', 'LIBERAR');
  setS('ORION_01',    '2026-07', 'LIBERAR');
  setS('ORION_02',    '2026-07', 'LIBERAR');
  setS('PRADO_HLD',   '2026-07', 'LIBERAR');
  setS('PRADO_FAM',   '2026-07', 'LIBERAR');
  setS('QUASAR_CAP',  '2026-07', 'LIBERAR');
  setS('RIO_01',      '2026-07', 'LIBERAR');
  setS('RIO_02',      '2026-07', 'LIBERAR');
  setS('SOLAR_PV',    '2026-07', 'LIBERAR');
  setS('SOLAR_INV',   '2026-07', 'LIBERAR');
  setS('TIGRE_FAM',   '2026-07', 'LIBERAR');
  setS('UMBRA_01',    '2026-07', 'LIBERAR');
  setS('UMBRA_02',    '2026-07', 'LIBERAR');
  setS('COMETA_FAM',  '2026-07', 'LIBERAR');

  };
  _roteiroDeStatusDemo();

  function getStatus(code, month) {
    var key = code + '|' + month;
    if (STATUS_SCRIPT[key]) return STATUS_SCRIPT[key];
    // Sem dado nesse mes (vazio, futuro ou antes da inception): nao inventa status.
    // So aplica depois da materializacao completa — durante a geracao, plArr ainda
    // esta sendo preenchido (length < MONTHS.length), entao nao interfere na demo.
    var _pd = _portfolioData[code];
    /* Carteira que não está no conjunto autorizado não tem status calculável.
       Sem esta linha, o fallback pseudoaleatório abaixo devolveria o status de
       QUALQUER código pelo simples hash de `code|month`, e um CLIENT poderia
       deduzir o semáforo das carteiras que a API não lhe mandou. Status de
       carteira ausente não é "LIBERAR", é "não sei", e a tela já sabe mostrar
       ausência de dado. */
    if (!_pd) return 'LIBERAR';
    if (_pd.plArr.length === MONTHS.length) {
      var _mi = MONTHS.indexOf(month);
      if (_mi < 0 || !(_pd.plArr[_mi] > 0)) return 'LIBERAR';
    }
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

  var _portfolioData = {};   // code -> { plArr, nnmArr, retArr, fee, feeArr, reportedPlPrevArr, perfFeeArr, brokerageArr, custodyArr, fundFeeArr, fxSpreadArr, taxArr, otherArr }
  var _codeMap = {};         // code -> catalog entry

  // Componentes de custo total do cliente (N0.5). Cada entrada descreve uma
  // camada de custo que o cliente paga, com fonte de dados e default de exibicao.
  // A arquitetura de arrays espelha feeArr: um valor por mes, mesmo indice.
  var COST_COMPONENTS = [
    { id: 'taxa_adm',    label: 'Taxa de Administracao',   array: 'feeArr',       pctDefault: 0.0004, desc: 'Taxa de administracao cobrada pelo gestor/consultor' },
    { id: 'taxa_perf',   label: 'Taxa de Performance',     array: 'perfFeeArr',   pctDefault: 0,      desc: '20% do retorno acima do benchmark (CDI), quando positivo' },
    { id: 'corretagem',  label: 'Corretagem',              array: 'brokerageArr', pctDefault: 0.0005, desc: 'Custos de corretagem e emolumentos B3' },
    { id: 'custodia',    label: 'Custodia',                array: 'custodyArr',   pctDefault: 0.0002, desc: 'Taxa de custodia do agente de custodia' },
    { id: 'fundos_sub',  label: 'Taxa de Fundos Subjacente', array: 'fundFeeArr', pctDefault: 0.0015, desc: 'Taxa de administracao dos fundos investidos (custo indireto)' },
    { id: 'spread_cambio', label: 'Spread de Cambio',      array: 'fxSpreadArr',  pctDefault: 0.0001, desc: 'Custo de spread na conversao de moeda estrangeira' },
    { id: 'impostos',    label: 'Impostos (come-cotas/IOF)', array: 'taxArr',     pctDefault: 0.0003, desc: 'Come-cotas, IOF e outros impostos incidentes' },
    { id: 'outros',      label: 'Outros Custos',           array: 'otherArr',    pctDefault: 0.00005, desc: 'Taxas regulatorias, emolumentos e outros custos diversos' },
  ];

  CATALOG.forEach(function(p) { _codeMap[p.code] = p; });

  var _materializarDemo = function () {
    if (!__GERAR_DEMO__) return;
    var rng0 = mulberry32(20260411);

    // 1. gerar PL inicial log-uniforme e fee para cada carteira
    var rawPl = [];
    CATALOG.forEach(function(p) {
      var logLo = Math.log(0.8e6), logHi = Math.log(95e6);
      var lv = logLo + rng0() * (logHi - logLo);
      rawPl.push(Math.exp(lv));
      var fee = 0.0003 + rng0() * 0.0005;
      _portfolioData[p.code] = { fee: fee, plArr: [], nnmArr: [], retArr: [], feeArr: [], reportedPlPrevArr: [], perfFeeArr: [], brokerageArr: [], custodyArr: [], fundFeeArr: [], fxSpreadArr: [], taxArr: [], otherArr: [] };
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

        if (month < p.inception || month > CURRENT_MONTH) {
          // Nao fabricar dado alem do ultimo mes fechado (CURRENT_MONTH). A janela
          // MONTHS vai ate Dez/26 so para aceitar ingestao do mes corrente; a demo
          // nao deve exibir auditoria de mes que ainda nao fechou.
          pd.plArr.push(0);
          pd.nnmArr.push(0);
          pd.retArr.push(0);
          pd.feeArr.push(0);
          pd.reportedPlPrevArr.push(0);
          pd.perfFeeArr.push(0);
          pd.brokerageArr.push(0);
          pd.custodyArr.push(0);
          pd.fundFeeArr.push(0);
          pd.fxSpreadArr.push(0);
          pd.taxArr.push(0);
          pd.otherArr.push(0);
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

        // Custos do cliente (N0.5): cada camada gerada como fracao do PL com
        // parametros realistas. No modo real/importado, defaults para zero ate
        // que o dado seja configurado (overlay ou importacao de colunas extras).
        var excessRet = Math.max(0, ret - cdi);
        var perfFee = plCurr * excessRet * 0.20;          // 20% do excesso sobre CDI
        var brokerage = plCurr * 0.0005;                   // ~0.05% corretagem
        var custody = plCurr * 0.0002;                     // ~0.02% custodia
        var fundFee = plCurr * (0.001 + rng0() * 0.003);   // 0.1-0.4% taxa de fundos
        var fxSpread = plCurr * (0.00005 + rng0() * 0.00015); // 0.005-0.02% spread cambio
        var taxCost = plCurr * 0.0003;                     // ~0.03% come-cotas/IOF
        var otherCost = plCurr * (rng0() * 0.0001);        // 0-0.01% outros

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
        pd.perfFeeArr.push(perfFee);
        pd.brokerageArr.push(brokerage);
        pd.custodyArr.push(custody);
        pd.fundFeeArr.push(fundFee);
        pd.fxSpreadArr.push(fxSpread);
        pd.taxArr.push(taxCost);
        pd.otherArr.push(otherCost);
        pl = plCurr;
      }
    });

    /* 3. Passo 2: rescale para o PL total da casa fechar em R$ 1,2 bi.
       A âncora é o mês de ABERTURA, não o corrente. O número redondo existe
       para bater com o material comercial, e o material é lido ao lado da
       primeira tela que o prospect abre. Ancorar no mês corrente jogava o
       R$ 1,2 bi para uma tela que ninguém vê primeiro e deixava a de abertura
       em R$ 1,1889 bi, desencontrada do pitch. */
    var ancoraIdx = MONTHS.indexOf(OPENING_MONTH);
    var ancoraTotal = 0;
    CATALOG.forEach(function(p) { ancoraTotal += (_portfolioData[p.code].plArr[ancoraIdx] || 0); });
    var scale = 1.2e9 / ancoraTotal;

    CATALOG.forEach(function(p) {
      var pd = _portfolioData[p.code];
      for (var mi = 0; mi < MONTHS.length; mi++) {
        pd.plArr[mi]              = (pd.plArr[mi] || 0) * scale;
        pd.nnmArr[mi]             = (pd.nnmArr[mi] || 0) * scale;
        pd.feeArr[mi]             = (pd.feeArr[mi] || 0) * scale;
        pd.reportedPlPrevArr[mi]  = (pd.reportedPlPrevArr[mi] || 0) * scale;
        pd.perfFeeArr[mi]         = (pd.perfFeeArr[mi] || 0) * scale;
        pd.brokerageArr[mi]       = (pd.brokerageArr[mi] || 0) * scale;
        pd.custodyArr[mi]         = (pd.custodyArr[mi] || 0) * scale;
        pd.fundFeeArr[mi]         = (pd.fundFeeArr[mi] || 0) * scale;
        pd.fxSpreadArr[mi]        = (pd.fxSpreadArr[mi] || 0) * scale;
        pd.taxArr[mi]             = (pd.taxArr[mi] || 0) * scale;
        pd.otherArr[mi]           = (pd.otherArr[mi] || 0) * scale;
      }
    });
  };
  _materializarDemo();

  /* =============================================================
     4b. SNAPSHOT DEMO + ESTADO DE IMPORTAÇÃO
     Captura deep-copy do dataset demo logo após materialize().
     Usado por restoreDemo() para recompor tudo in-place.
  ============================================================= */

  var _demoSnapshot = null;

  /* Congela o conjunto corrente para o botão "voltar ao demo" da importação.
     Chamado duas vezes na vida do módulo, e as duas importam: depois de gerar
     (quando gera) e depois de hidratar da API. É essa segunda que faz o botão
     voltar ao conjunto AUTORIZADO da sessão, e não a um conjunto local que o
     bundle não tem mais. */
  function capturarSnapshot() {
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
        reportedPlPrevArr: pd.reportedPlPrevArr.slice(),
        perfFeeArr: pd.perfFeeArr.slice(),
        brokerageArr: pd.brokerageArr.slice(),
        custodyArr: pd.custodyArr.slice(),
        fundFeeArr: pd.fundFeeArr.slice(),
        fxSpreadArr: pd.fxSpreadArr.slice(),
        taxArr: pd.taxArr.slice(),
        otherArr: pd.otherArr.slice()
      };
    });
    MANAGERS.forEach(function (m) {
      snap.managers.push({ id: m.id, name: m.name, codes: m.codes.slice(), roaTarget: m.roaTarget });
    });
    Object.keys(STATUS_SCRIPT).forEach(function (k) { snap.statusScript[k] = STATUS_SCRIPT[k]; });
    _demoSnapshot = snap;
    return snap;
  }
  capturarSnapshot();

  var _importCompositions = {};   // chave "code|month" -> array de linhas de composição
  var _dataMode = 'demo';

  /* =============================================================
     4c. INJETOR DE CARTEIRAS REAIS (lê window._AtlasRealData)
     O arquivo platform-data-real.js (gitignored) define esse objeto.
     Sem ele, apenas as 40 carteiras demo ficam ativas.
  ============================================================= */

  function injectRealData() {
    var D = window._AtlasRealData;
    if (!D || !D.portfolios || !D.portfolios.length) return;

    var MFEE = D.mfee || 0.0004;
    var CDI_RATES = D.cdiRates || {};
    var codes = D.portfolios.map(function(p) { return p.code; });

    // Conjunto real de meses: todos os meses com dados reais (cdiRates cobre 30 meses)
    var REAL_MONTHS = Object.keys(CDI_RATES).sort();

    // Limpar TODAS as entradas demo antes de injetar dados reais.
    // O inject anterior so removia entradas cujo code batia com os reais,
    // deixando vazar dados ficticios quando os codigos nao coincidiam.
    // Isto e um superconjunto da limpeza seletiva por lista de codigos demo que
    // o fork fazia. Zerar tudo entrega o mesmo objetivo, catalogo so real quando
    // ha overlay, sem depender de essa lista estar completa.
    CATALOG.length = 0;
    MANAGERS.length = 0;
    Object.keys(_portfolioData).forEach(function(c) { delete _portfolioData[c]; });
    Object.keys(_codeMap).forEach(function(c) { delete _codeMap[c]; });
    if (_compCache) {
      Object.keys(_compCache).forEach(function(k) { delete _compCache[k]; });
    }
    Object.keys(_importCompositions).forEach(function(k) { delete _importCompositions[k]; });
    Object.keys(STATUS_SCRIPT).forEach(function(k) { delete STATUS_SCRIPT[k]; });

    // CATALOG + _codeMap
    D.portfolios.forEach(function(p) {
      var entry = { code:p.code, name:p.name, risk:p.risk, inception:p.inception };
      CATALOG.push(entry); _codeMap[p.code] = entry;
    });

    // Managers: usa dados reais se disponiveis, senao fallback unico
    if (D.managers && D.managers.length) {
      D.managers.forEach(function(m) {
        // Filtra apenas codes que existem no CATALOG
        var validCodes = m.codes.filter(function(c) { return !!_codeMap[c]; });
        if (validCodes.length > 0) {
          MANAGERS.push({
            id: m.id,
            name: m.name,
            codes: validCodes,
            roaTarget: m.roaTarget || 0.005
          });
        }
      });
    } else {
      MANAGERS.push({ id:'REAIS', name:'Carteiras Reais', codes:codes.slice(), roaTarget:0.005 });
    }

    // Mapeia mes → indice no array MONTHS
    var REAL_MONTH_IDX = {};
    var mesesForaDaJanela = [];
    REAL_MONTHS.forEach(function(rm) {
      var idx = MONTHS.indexOf(rm);
      if (idx >= 0) REAL_MONTH_IDX[rm] = idx;
      else mesesForaDaJanela.push(rm);
    });
    // Antes isto era descarte silencioso: um mês real fora de MONTHS sumia do
    // dashboard sem aviso. Agora é audível — estenda MONTHS para acomodá-lo.
    if (mesesForaDaJanela.length && window.console && console.warn) {
      console.warn('[ATLAS] Meses com dado real FORA da janela MONTHS (descartados): '
        + mesesForaDaJanela.join(', ')
        + '. Estenda MONTHS/MONTH_LABELS em platform-data.js para incluí-los.');
    }

    // _portfolioData com PL e rentabilidade reais por mes
    function realPd(p) {
      var n = MONTHS.length;
      var z = function() { return new Array(n).fill(0); };
      var plArr = z(), retArr = z(), feeArr = z(), rpp = z();
      var plByMonth = p.plByMonth;
      var rentByMonth = p.rentByMonth;
      if (plByMonth) {
        REAL_MONTHS.forEach(function(rm) {
          var idx = REAL_MONTH_IDX[rm];
          if (idx === undefined) return;
          if (plByMonth[rm] !== undefined) {
            plArr[idx] = plByMonth[rm];
            // rentRef real da carteira (null = offshore, sem dado)
            var rent = (rentByMonth && rentByMonth[rm] != null) ? rentByMonth[rm] : null;
            // Fallback para CDI quando rentRef e null (offshore)
            retArr[idx] = (rent != null) ? rent : (CDI_RATES[rm] || 0);
            // p.fee vem anual da planilha; feeArr e receita do mes.
            feeArr[idx] = plByMonth[rm] * (p.fee != null ? p.fee / 12 : MFEE);
            // rpp NAO e gravado aqui de proposito. Uma versao anterior escrevia
            //   if (idx > 0) rpp[idx] = plByMonth[rm];
            // que grava o PL do PROPRIO mes e zera a variacao. Ver o loop
            // logo abaixo, que usa plArr[k-1] (fix 8a581e5).
          }
        });
      } else {
        // Fallback: PL unico replicado (legado, nao deve acontecer com dados novos)
        var pl = p.pl || 0;
        for (var rk in REAL_MONTH_IDX) {
          if (!REAL_MONTH_IDX.hasOwnProperty(rk)) continue;
          var idx2 = REAL_MONTH_IDX[rk];
          plArr[idx2] = pl;
          retArr[idx2] = CDI_RATES[rk] || 0;
          feeArr[idx2] = pl * MFEE;
        }
      }
      // reportedPlPrev = PL de fechamento do mes anterior, mesmo contrato do demo
      // (materialize) e do import (buildPortfolioEntry): plArr[mi-1]. Antes gravava
      // o PL do proprio mes, o que zerava a variacao e disparava falsa quebra de
      // conciliacao em TODA carteira real (o dado do cliente que paga).
      for (var k = 1; k < n; k++) rpp[k] = plArr[k - 1];
      // Os 7 arrays de componente de custo (perfFeeArr...otherArr) sao exigidos
      // por COST_COMPONENTS (linha ~327): a pagina de transparencia de custo
      // le pd[component.array] genericamente para toda carteira, real ou demo.
      // Sem eles aqui, a pagina quebra ao abrir uma carteira real. Zerados de
      // proposito: nao ha decomposicao de custo real por componente ainda,
      // so o total (fee). Ver clientCostAnalysis().
      return { fee:(p.fee != null ? p.fee / 12 : MFEE), plArr:plArr, nnmArr:z(), retArr:retArr, feeArr:feeArr, reportedPlPrevArr:rpp,
               perfFeeArr:z(), brokerageArr:z(), custodyArr:z(), fundFeeArr:z(), fxSpreadArr:z(), taxArr:z(), otherArr:z() };
    }

    D.portfolios.forEach(function(p) { _portfolioData[p.code] = realPd(p); });

    // Overlay de dado real aplicado: o app nao esta em modo sintetico. Corrige o
    // relatorio e o disclaimer de risco, que diziam "sinteticos" mesmo numa
    // instancia com dado de cliente (o banner de login ja tinha sido removido pelo
    // mesmo motivo).
    _dataMode = 'real';

    // STATUS_SCRIPT
    var ss = D.statusScript || {};
    for (var sk2 in ss) { if (ss.hasOwnProperty(sk2)) STATUS_SCRIPT[sk2] = ss[sk2]; }

    // _importCompositions (usa PL do mes correspondente quando disponivel)
    var comps = D.compositions || {};
    var compKeys = Object.keys(comps);
    for (var ki = 0; ki < compKeys.length; ki++) {
      var ckey = compKeys[ki];
      var parts = ckey.split('|');
      var ccode = parts[0];
      var cmes = parts[1];
      var cpl = 1;
      for (var pi = 0; pi < D.portfolios.length; pi++) {
        if (D.portfolios[pi].code === ccode) {
          var pdata = D.portfolios[pi];
          if (pdata.plByMonth && pdata.plByMonth[cmes] !== undefined) {
            cpl = pdata.plByMonth[cmes];
          } else {
            cpl = pdata.pl || 1;
          }
          break;
        }
      }
      _importCompositions[ckey] = comps[ckey].map(function(r) {
        var pct = cpl > 0 ? r.saldoFinal / cpl : 0;
        return { name:r.name, cls:r.cls, institution:r.inst, vencto:r.vencto,
                 saldoInicial:r.saldoFinal, saldoFinal:r.saldoFinal,
                 varBRL:0, retAtivo:0, contrib:0, pct:pct };
      });
    }

    // Dados injetados via window._AtlasRealData (platform-data-real.js)

  }

  injectRealData();

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
        /* Em mês de estabilidade a composição é a MESMA do mês anterior, papel
           por papel. Dizer "realocação tática" ali seria texto contradizendo o
           comparador de posição na tela ao lado, que mostra zero entrada e zero
           saída. A observação em si continua: a variação existe e o número dela
           é verdadeiro, só a causa é outra. */
        var causa = ctx.estavel
          ? 'Composição inalterada no período: a variação vem da marcação a mercado.'
          : 'Confirmado pelo gestor como realocação tática.';
        return { severity:'INFO', text:'Variação de ' + ctx.varPct + '% no mês — acima da faixa histórica da carteira. ' + causa };
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
    var cdi = getCDI(month);
    var classes = ['Liquidez','RF Pós-Fixado','RF Inflação','Multimercado','Ações'];
    var clsRng = subRng('cls|' + code + '|' + month);
    var cls1 = classes[Math.floor(clsRng() * classes.length)];
    var pct1 = (10 + clsRng() * 20).toFixed(1);
    var pct2 = (parseFloat(pct1) + 3 + clsRng() * 6).toFixed(1);
    if (_dataMode === 'imported') {
      var realComp = getComposition(code, month);
      if (realComp && realComp.length >= 2) {
        cls1 = realComp[0].cls;
        pct1 = (realComp[0].pct * 100).toFixed(1);
        pct2 = (realComp[1].pct * 100).toFixed(1);
      }
    }
    // Lista derivada do catalogo, nao escrita a mao. Antes eram tres nomes
    // ficticios fixos aqui, que sobreviveram a troca do ASSETS e voltavam a
    // aparecer no texto dos achados.
    var insts = ASSETS.map(function(a) { return a.inst; })
      .filter(function(v, i, arr) { return arr.indexOf(v) === i; });
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
      inst: inst,
      /* Mês corrente com mês anterior existente é mês de estabilidade: a
         composição foi reaproveitada em getComposition, não sorteada. */
      estavel: (month === CURRENT_MONTH && mi > 0)
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

  // Contrato: SEMPRE retorna array (nunca null). Retorna [] quando não há dados de composição.
  // Difere de getRow() que retorna null para código/mês inválido.
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

    /* Mês corrente é mês de ESTABILIDADE: a carteira mantém exatamente os ativos
       do mês anterior e o saldo anda só por marcação a mercado do período.

       Antes disso cada mês sorteava um conjunto novo de papéis. O comparador de
       posição, aberto entre dois meses, mostrava a carteira inteira trocando de
       ativo: compra e venda que nunca aconteceram, num produto cuja frase é
       "não mostre o patrimônio, prove o número". O sorteio continua valendo para
       o histórico, onde ele nunca foi confrontado posição a posição; aqui o que
       importa é o mês que o cliente confere.

       Isto NÃO é o que faz julho sair sem divergência. A conta do produto vive
       em reportedPlPrevArr/retArr/nnmArr, na materialização, e composição não a
       alimenta. Julho fecha exato porque nenhuma carteira dele é CORRIGIR, e é
       só CORRIGIR que injeta ajuste no PL anterior reportado. */
    var miAnterior = mi - 1;
    if (month === CURRENT_MONTH && miAnterior >= 0) {
      var anterior = getComposition(code, MONTHS[miAnterior]);
      if (anterior.length) {
        var rngEst = subRng('estab|' + cacheKey);
        /* Marcação por ativo, dispersa em torno de zero. O nível do PL do mês já
           foi decidido na materialização; aqui só se distribui esse nível entre
           os mesmos papéis, então a normalização abaixo é quem fecha a soma. */
        var bruto = anterior.map(function (r) {
          return { r: r, v: r.saldoFinal * (0.985 + rngEst() * 0.03) };
        });
        var somaBruto = bruto.reduce(function (s, x) { return s + x.v; }, 0);
        var fatorEst = somaBruto > 0 ? plCurr / somaBruto : 0;
        var plAnterior = anterior.reduce(function (s, r) { return s + r.saldoFinal; }, 0);
        var estaveis = bruto.map(function (x) {
          var saldoInicial = x.r.saldoFinal;
          var saldoFinal = x.v * fatorEst;
          var varBRL = saldoFinal - saldoInicial;
          return {
            name: x.r.name,
            cls: x.r.cls,
            institution: x.r.institution,
            vencto: x.r.vencto,
            saldoInicial: saldoInicial,
            saldoFinal: saldoFinal,
            varBRL: varBRL,
            retAtivo: saldoInicial > 0 ? varBRL / saldoInicial : 0,
            contrib: plAnterior > 0 ? varBRL / plAnterior : 0,
            pct: plCurr > 0 ? saldoFinal / plCurr : 0,
          };
        });
        _compCache[cacheKey] = estaveis;
        return estaveis;
      }
    }

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

  /* Tipos de documento do escritório. Esta lista é o gêmeo de TIPOS em
     scripts/gerar-cadastro.mjs, que valida o cadastro REAL da instância. As
     duas precisam dizer a mesma coisa: se divergirem, o filtro "Tipo" da tela
     de Cadastro muda de conteúdo quando a instância troca de dado sintético
     para dado real, e o operador acha que perdeu documento. Mexeu aqui,
     mexa lá. */
  var PENDING_TYPES = [
    'Ficha Cadastral','KYC','Perfil de Investimento','Perfil de Risco',
    'Declaração de Investidor Qualificado','Declaração de Investidor Profissional',
    'Comprovante de Residência','Contrato de Gestão','Documento de Identidade',
    'Procuração','Declaração de Beneficiário Final','Declaração de IR'
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

  // Contrato: retorna null se código/mês desconhecido ou _portfolioData ausente.
  // Retorna objeto mesmo quando plCurr = 0 (carteira sem PL no mês).
  // plPrev = reportedPlPrev (PL ajustado); use plPrevTrue para PL real do array.
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
    var cdi = getCDI(month);

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

    // Custos agregados do mes (todos os componentes, em BRL)
    var totalCost = (pd.perfFeeArr[mi]||0) + (pd.brokerageArr[mi]||0) + (pd.custodyArr[mi]||0)
      + (pd.fundFeeArr[mi]||0) + (pd.fxSpreadArr[mi]||0) + (pd.taxArr[mi]||0) + (pd.otherArr[mi]||0);

    return {
      code: code,
      name: p.name,
      risk: p.risk,
      inception: p.inception,
      manager: getManagerForCode(code),
      plCurr: plCurr,
      plPrev: reportedPlPrev,         // PL reportado (pode incluir ajuste)
      plPrevReported: reportedPlPrev,  // alias explícito para clareza
      plPrevTrue: plPrev,             // PL real (plArr[mi-1])
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
      /* A conta que sustenta o produto, exposta em REAIS e nao so em fracao.
         `continuidade` ja media o mesmo desvio, mas normalizado pelo PL
         anterior, e fracao nao se soma entre carteiras nem se prioriza por
         materialidade. Quem precisa decidir onde agir precisa do R$.
         plEsperado = PL anterior reportado * (1 + rentabilidade) + movimentacao. */
      plEsperado: expected,
      divergenciaBRL: plCurr - expected,
      divergenciaAbsBRL: Math.abs(plCurr - expected),
      nAtivos: nAtivos,
      nAtivosPrev: nAtivosPrev,
      cdi: cdi,
      totalCost: totalCost,
      totalCostPct: plCurr > 0 ? totalCost / plCurr : 0,
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
    // Ate o ultimo mes com dado. Sem isso, a serie e o grafico de ROA mostravam
    // Jul-Dez/26 zerados (a janela MONTHS vai ate Dez/26 so para ingestao) e a
    // linha de ROA mergulhava para 0 no fim. Slice de 0 preserva os indices.
    return MONTHS.slice(0, latestMonthIdxWithData() + 1).map(function(m, mi) {
      var aum = 0, revenue = 0, nnm = 0;
      CATALOG.forEach(function(p) {
        var pd = _portfolioData[p.code];
        aum += pd.plArr[mi] || 0;
        revenue += pd.feeArr[mi] || 0;
        nnm += pd.nnmArr[mi] || 0;
      });
      var roa = aum > 0 ? (revenue / aum) * 12 : 0;
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
      var roa = aum > 0 ? (revenue / aum) * 12 : 0;
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
    var roa = totalAum > 0 ? (totalRev / totalAum) * 12 : 0;
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
      var roa = pl > 0 ? (revenue / pl) * 12 : 0;
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

    // Regra 1: ROA anual abaixo do piso.
    var ROA_PISO = 0.0036;
    if (monthData.roa < ROA_PISO) {
      alerts.push({ rule:'ROA Baixo', text:'ROA anual (' + (monthData.roa*100).toFixed(3) + '%) abaixo do piso de ' + (ROA_PISO*100).toFixed(3) + '% a.a.', severity:'CORRIGIR' });
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

  function validate() {
    var errs = 0;
    console.assert(MONTHS.length === MONTH_LABELS.length,
      'I0: MONTHS e MONTH_LABELS fora de sync: ' + MONTHS.length + ' vs ' + MONTH_LABELS.length);
    if (MONTHS.length !== MONTH_LABELS.length) errs++;

    // I1: com window._AtlasRealData presente, injectRealData() substitui as 40
    // ficticias pelas N reais (nao soma); sem overlay, ficam as 40 ficticias.
    var _realN = (typeof window !== 'undefined' && window._AtlasRealData && window._AtlasRealData.portfolios)
      ? window._AtlasRealData.portfolios.length : 0;
    var _expectedCat = _realN > 0 ? _realN : 40;
    console.assert(CATALOG.length === _expectedCat, 'I1: esperado ' + _expectedCat + ' carteiras, obtido ' + CATALOG.length);
    if (CATALOG.length !== _expectedCat) errs++;

    // I2-I5: invariantes calibrados sobre o STATUS_SCRIPT e o gerador
    // deterministico das 40 ficticias de demo. Com dado real presente, as
    // ficticias saem do catalogo (I1) e esses numeros fixos deixam de existir
    // -- checar seria validar contra dado que nao esta mais la, nao contra o
    // real (que nao tem valor esperado hardcoded aqui).
    if (_realN === 0) {
      // I2: PL total Abr/2026
      var stats = dashboardStats('2026-04');
      var _plMin = 1.0e9, _plMax = 1.6e9;
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
    }

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

    // I7: gestores — 4 fictícios + 1 real se dados reais carregados
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
      reportedPlPrevArr: new Array(n).fill(0),
      perfFeeArr: new Array(n).fill(0),
      brokerageArr: new Array(n).fill(0),
      custodyArr: new Array(n).fill(0),
      fundFeeArr: new Array(n).fill(0),
      fxSpreadArr: new Array(n).fill(0),
      taxArr: new Array(n).fill(0),
      otherArr: new Array(n).fill(0)
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
    MANAGERS.push({ id: 'IMPORTADAS', name: 'Carteiras Importadas', codes: allCodes.slice(), roaTarget: 0.0050 }); // roaTarget a.a.

    _dataMode = 'imported';

    var mesesOrdenados = Object.keys(monthsSet).sort();
    return { ok: true, nCarteiras: parsed.portfolios.length, meses: mesesOrdenados, mode: 'imported' };
  }

  function restoreDemo() {
    // No bundle publicado o conjunto não é local, é o que a API autorizou. Sem
    // uma hidratação anterior não existe "demo" para onde voltar, e devolver
    // tela vazia fingindo sucesso seria pior que dizer que não dá.
    if (!_demoSnapshot) return { ok: false, reason: 'Sem conjunto autorizado para restaurar.' };
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
        reportedPlPrevArr: pd.reportedPlPrevArr.slice(),
        perfFeeArr: pd.perfFeeArr.slice(),
        brokerageArr: pd.brokerageArr.slice(),
        custodyArr: pd.custodyArr.slice(),
        fundFeeArr: pd.fundFeeArr.slice(),
        fxSpreadArr: pd.fxSpreadArr.slice(),
        taxArr: pd.taxArr.slice(),
        otherArr: pd.otherArr.slice()
      };
    });

    Object.keys(_importCompositions).forEach(function (k) { delete _importCompositions[k]; });
    Object.keys(_compCache).forEach(function (k) { delete _compCache[k]; });

    MANAGERS.length = 0;
    _demoSnapshot.managers.forEach(function (m) {
      MANAGERS.push({ id: m.id, name: m.name, codes: m.codes.slice(), roaTarget: m.roaTarget });
    });

    _dataMode = 'demo';
    injectRealData();
    return { ok: true, mode: 'demo' };
  }

  function getDataMode() { return _dataMode; }

  /* =============================================================
     8d. HIDRATAÇÃO A PARTIR DA API

     É o ÚNICO caminho pelo qual o demo recebe carteira. O bundle sai sem
     `_portfolioData` (ver __GERAR_DEMO__ na seção 0), e o que preenche aqui
     já passou por autorização no Worker: só as carteiras que o papel do
     usuário alcança, e só os campos que a projeção dele permite.

     A aplicação é IN-PLACE, no mesmo contrato de importPortfolioData: as
     `var` CATALOG, MANAGERS, _portfolioData, STATUS_SCRIPT, _codeMap nunca
     são reatribuídas, só esvaziadas e repreenchidas. Reatribuir quebraria
     todo módulo que já guardou a referência.

     Duas defesas que não são decoração:
       - o catálogo e o `_portfolioData` são CRUZADOS. Carteira que vier no
         segundo sem estar no primeiro é descartada. Uma resposta que tente
         esconder uma carteira só do catálogo não cria uma carteira fantasma.
       - arrays de mês ausentes viram ZERO, nunca `undefined`. Todo o resto
         do app lê `pd.plArr[mi]` direto, e um `undefined` vazando por ali
         não vira tela vazia, vira NaN na conta que o produto mostra.
  ============================================================= */

  var CAMPOS_ARRAY_PD = [
    'plArr', 'nnmArr', 'retArr', 'feeArr', 'reportedPlPrevArr', 'perfFeeArr',
    'brokerageArr', 'custodyArr', 'fundFeeArr', 'fxSpreadArr', 'taxArr', 'otherArr'
  ];

  function arraysZerados() {
    var a = new Array(MONTHS.length);
    for (var i = 0; i < a.length; i++) a[i] = 0;
    return a;
  }

  function normalizarPd(bruto) {
    var pd = {
      fee: (bruto && typeof bruto.fee === 'number' && isFinite(bruto.fee)) ? bruto.fee : 0,
      plArr: arraysZerados(), nnmArr: arraysZerados(), retArr: arraysZerados(),
      feeArr: arraysZerados(), reportedPlPrevArr: arraysZerados(),
      perfFeeArr: arraysZerados(), brokerageArr: arraysZerados(),
      custodyArr: arraysZerados(), fundFeeArr: arraysZerados(),
      fxSpreadArr: arraysZerados(), taxArr: arraysZerados(), otherArr: arraysZerados()
    };
    if (!bruto || typeof bruto !== 'object') return pd;
    CAMPOS_ARRAY_PD.forEach(function (k) {
      var src = bruto[k];
      if (!Array.isArray(src)) return;
      var dst = pd[k];
      for (var i = 0; i < dst.length; i++) {
        var v = src[i];
        dst[i] = (typeof v === 'number' && isFinite(v)) ? v : 0;
      }
    });
    return pd;
  }

  function hidratarDoServidor(payload) {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, reason: 'Resposta sem corpo.' };
    }
    if (!Array.isArray(payload.catalogo) || !payload.portfolioData || typeof payload.portfolioData !== 'object') {
      return { ok: false, reason: 'Resposta sem catálogo ou sem carteiras.' };
    }
    // A janela de meses é contrato: os arrays chegam alinhados por índice com
    // MONTHS. Se o servidor mandar outra janela, os índices passariam a
    // apontar para meses errados e a tela mostraria número certo no mês
    // errado, que é o pior modo de falha possível neste produto.
    if (Array.isArray(payload.meses) && payload.meses.join('|') !== MONTHS.join('|')) {
      return { ok: false, reason: 'Janela de meses da resposta não bate com a do app.' };
    }

    var novoCatalogo = [];
    var novaMapa = {};
    payload.catalogo.forEach(function (e) {
      if (!e || typeof e.code !== 'string' || !e.code) return;
      var entrada = { code: e.code, name: e.name, risk: e.risk, inception: e.inception };
      if (typeof e.mgr === 'string' && e.mgr) entrada.mgr = e.mgr;
      novoCatalogo.push(entrada);
      novaMapa[e.code] = entrada;
    });

    var novoPd = {};
    Object.keys(payload.portfolioData).forEach(function (code) {
      if (!novaMapa[code]) return;
      novoPd[code] = normalizarPd(payload.portfolioData[code]);
    });

    var novoStatus = {};
    var ss = payload.statusScript && typeof payload.statusScript === 'object' ? payload.statusScript : {};
    Object.keys(ss).forEach(function (k) {
      if (novaMapa[k.split('|')[0]]) novoStatus[k] = ss[k];
    });

    var novaComposicao = {};
    var comps = payload.compositions && typeof payload.compositions === 'object' ? payload.compositions : {};
    Object.keys(comps).forEach(function (k) {
      if (novaMapa[k.split('|')[0]]) novaComposicao[k] = comps[k];
    });

    /* ---- aplicação IN-PLACE ---- */
    CATALOG.length = 0;
    novoCatalogo.forEach(function (e) { CATALOG.push(e); });

    Object.keys(_codeMap).forEach(function (k) { delete _codeMap[k]; });
    novoCatalogo.forEach(function (e) { _codeMap[e.code] = e; });

    Object.keys(STATUS_SCRIPT).forEach(function (k) { delete STATUS_SCRIPT[k]; });
    Object.keys(novoStatus).forEach(function (k) { STATUS_SCRIPT[k] = novoStatus[k]; });

    Object.keys(_portfolioData).forEach(function (k) { delete _portfolioData[k]; });
    Object.keys(novoPd).forEach(function (k) { _portfolioData[k] = novoPd[k]; });

    Object.keys(_importCompositions).forEach(function (k) { delete _importCompositions[k]; });
    Object.keys(novaComposicao).forEach(function (k) { _importCompositions[k] = novaComposicao[k]; });

    Object.keys(_compCache).forEach(function (k) { delete _compCache[k]; });

    MANAGERS.length = 0;
    var gestores = Array.isArray(payload.gestores) ? payload.gestores : [];
    gestores.forEach(function (m) {
      if (!m || !m.id) return;
      var codes = (m.codes || []).filter(function (c) { return !!novaMapa[c]; });
      if (!codes.length) return;
      MANAGERS.push({ id: m.id, name: m.name, codes: codes, roaTarget: m.roaTarget || 0 });
    });
    /* getManagerForCode() devolve MANAGERS[0] quando não acha, então lista
       vazia vira `undefined` em row.manager e qualquer tela que leia
       row.manager.name quebra. O cliente não recebe o eixo de gestor (é
       institucional), então ele ganha um gestor neutro com a própria
       carteira, que mantém a forma sem revelar nada. */
    if (!MANAGERS.length && novoCatalogo.length) {
      MANAGERS.push({
        id: '__autorizadas__',
        name: 'Carteiras',
        codes: novoCatalogo.map(function (p) { return p.code; }),
        roaTarget: 0
      });
    }

    _dataMode = payload.modo === 'real' ? 'real' : 'demo';
    capturarSnapshot();
    return { ok: true, nCarteiras: novoCatalogo.length, modo: _dataMode };
  }

  // Selo do mes (N0.4): le exclusivamente de window._AtlasSelos, overlay LGPD
  // populado pela instancia do cliente (script selar-mes). Sem overlay, retorna
  // selado=false -- nunca fabrica checksum para o modo demo.
  function getSeloInfo(month) {
    var entry = window._AtlasSelos && window._AtlasSelos.meses && window._AtlasSelos.meses[month];
    if (!entry) return { selado: false, checksum: null, sealedAt: null, sealedBy: null };
    if (typeof entry === 'string') return { selado: true, checksum: entry, sealedAt: null, sealedBy: null };
    return {
      selado: true,
      checksum: entry.checksum || null,
      sealedAt: entry.sealedAt || null,
      sealedBy: entry.sealedBy || null,
    };
  }

  // Meses que devem aparecer no seletor: ate o ultimo mes com dado real de carteira
  // (PL > 0). Em demo isso e CURRENT_MONTH; em real/importado, o ultimo mes carregado.
  // Impede o seletor de oferecer mes vazio ou futuro (auditoria fabricada na demo,
  // dashboard zerado no real).
  function latestMonthIdxWithData() {
    var last = 0;
    for (var i = 0; i < MONTHS.length; i++) {
      for (var c in _portfolioData) {
        if (_portfolioData.hasOwnProperty(c) && _portfolioData[c].plArr[i] > 0) { last = i; break; }
      }
    }
    return last;
  }
  function visibleMonths() {
    var last = latestMonthIdxWithData();
    return { months: MONTHS.slice(0, last + 1), labels: MONTH_LABELS.slice(0, last + 1) };
  }

  /* Mês em que o app deve aterrissar, decidido AQUI e não em cada tela.

     OPENING_MONTH é constante do demo sintético: é o mês roteirado, onde o
     produto mostra o que acha. Numa instância de cliente ele pode simplesmente
     não existir na base, e mandar o app para um mês sem dado abre um dashboard
     vazio, que é o defeito que o fallback original existia para evitar.

     Então a regra tem dois lados. Em demonstração, aterrissa no mês de
     abertura, desde que ele esteja na faixa com dado. Em dado real ou
     importado, aterrissa no ÚLTIMO mês com dado, que é o mês que o cliente
     acabou de fechar e o único que ele quer ver ao abrir. */
  function landingMonth() {
    var meses = visibleMonths().months || [];
    var ultimo = meses.length ? meses[meses.length - 1] : CURRENT_MONTH;
    if (_dataMode === 'demo' && meses.indexOf(OPENING_MONTH) >= 0) return OPENING_MONTH;
    return ultimo;
  }

  /* =============================================================
     8.5 CUSTO TOTAL DO CLIENTE E TRILHA DE AUDITORIA
  ============================================================= */

  // Agrega custos por componente selecionado, quebrados por gestor, carteira e classe de ativo.
  // componentIds: array de ids de COST_COMPONENTS (ex: ['taxa_adm','taxa_perf']).
  // undefined = todos os componentes.
  // Retorna { byManager, byPortfolio, byAssetClass, totalCost, totalAUM, totalPct, breakdown }.
  function clientCostAnalysis(month, componentIds) {
    var mi = MONTHS.indexOf(month);
    if (mi < 0) return null;

    var comps = componentIds && componentIds.length ? componentIds : COST_COMPONENTS.map(function(c) { return c.id; });
    var compSet = {};
    comps.forEach(function(id) { compSet[id] = true; });

    var byManager = {};     // { managerId: { name, totalCost, aum, pct, portfolios: [] } }
    var byPortfolio = [];   // [{ code, name, manager, aum, cost, pct }]
    var byAssetClass = {};  // { assetClass: { totalCost, aum, pct } }
    var totalCost = 0;
    var totalAUM = 0;

    CATALOG.forEach(function(p) {
      var pd = _portfolioData[p.code];
      if (!pd) return;
      var pl = pd.plArr[mi] || 0;
      if (pl <= 0) return;

      var cost = 0;
      COST_COMPONENTS.forEach(function(cc) {
        if (!compSet[cc.id]) return;
        cost += pd[cc.array][mi] || 0;
      });

      totalCost += cost;
      totalAUM += pl;

      var mgr = getManagerForCode(p.code) || { id: 'sem_gestor', name: 'Sem Gestor' };
      if (!byManager[mgr.id]) byManager[mgr.id] = { id: mgr.id, name: mgr.name, totalCost: 0, aum: 0, portfolios: [] };
      byManager[mgr.id].totalCost += cost;
      byManager[mgr.id].aum += pl;
      byManager[mgr.id].portfolios.push({ code: p.code, name: p.name, aum: pl, cost: cost, pct: pl > 0 ? cost / pl : 0 });

      byPortfolio.push({ code: p.code, name: p.name, manager: mgr.name, aum: pl, cost: cost, pct: pl > 0 ? cost / pl : 0 });

      var ac = p.assetClass || p.risk || 'Nao Classificado';
      if (!byAssetClass[ac]) byAssetClass[ac] = { totalCost: 0, aum: 0 };
      byAssetClass[ac].totalCost += cost;
      byAssetClass[ac].aum += pl;
    });

    // Calcula percentuais por manager e asset class
    Object.keys(byManager).forEach(function(k) {
      byManager[k].pct = byManager[k].aum > 0 ? byManager[k].totalCost / byManager[k].aum : 0;
    });
    Object.keys(byAssetClass).forEach(function(k) {
      byAssetClass[k].pct = byAssetClass[k].aum > 0 ? byAssetClass[k].totalCost / byAssetClass[k].aum : 0;
    });

    // Breakdown por componente
    var breakdown = COST_COMPONENTS.filter(function(cc) { return compSet[cc.id]; }).map(function(cc) {
      var sum = 0;
      CATALOG.forEach(function(p) {
        var pd = _portfolioData[p.code];
        if (!pd || (pd.plArr[mi]||0) <= 0) return;
        sum += pd[cc.array][mi] || 0;
      });
      return { id: cc.id, label: cc.label, total: sum, pct: totalAUM > 0 ? sum / totalAUM : 0 };
    });

    byPortfolio.sort(function(a, b) { return b.pct - a.pct; });

    return {
      byManager: Object.values(byManager).sort(function(a, b) { return b.pct - a.pct; }),
      byPortfolio: byPortfolio,
      byAssetClass: Object.keys(byAssetClass).map(function(k) { return { assetClass: k, totalCost: byAssetClass[k].totalCost, aum: byAssetClass[k].aum, pct: byAssetClass[k].pct }; }).sort(function(a, b) { return b.pct - a.pct; }),
      totalCost: totalCost,
      totalAUM: totalAUM,
      totalPct: totalAUM > 0 ? totalCost / totalAUM : 0,
      breakdown: breakdown,
    };
  }

  // Trilha de auditoria computada por carteira e mes.
  // 7 regras, cada uma com: id, nome, descricao, formula, tolerancia, valor real, threshold, status.
  // Status: PASS (dentro da tolerancia), WARN (atenuação), FAIL (fora da tolerancia).
  function computeAuditTrail(code, month) {
    var pd = _portfolioData[code];
    var p = _codeMap[code];
    if (!pd || !p) return null;
    var mi = MONTHS.indexOf(month);
    if (mi < 0) return null;

    var plCurr = pd.plArr[mi] || 0;
    var plPrev = mi > 0 ? pd.plArr[mi-1] : 0;
    var reportedPlPrev = pd.reportedPlPrevArr[mi] || plPrev;
    var ret = pd.retArr[mi] || 0;
    var nnm = pd.nnmArr[mi] || 0;
    var cdi = getCDI(month);
    var fee = pd.fee;

    // Prepara valores base para as regras
    var expected = reportedPlPrev * (1 + ret) + nnm;
    var continuidade = reportedPlPrev > 0 ? Math.abs(plCurr - expected) / reportedPlPrev : 0;

    var rules = [];

    // R1: Continuidade do PL (|PL atual - PL esperado| / PL anterior < 0.3%)
    rules.push({
      id: 'R1',
      name: 'Continuidade do PL',
      description: 'O PL reportado no mes deve ser consistente com o PL anterior, rentabilidade e movimentacoes.',
      formula: '|PL_atual - (PL_anterior_reportado * (1 + ret) + NNM)| / PL_anterior_reportado',
      tolerance: 0.003,
      actualValue: continuidade,
      threshold: 0.003,
      unit: '%',
      displayValue: (continuidade * 100).toFixed(2) + '%',
      status: continuidade <= 0.003 ? 'PASS' : continuidade <= 0.01 ? 'WARN' : 'FAIL',
    });

    // R2: Rentabilidade vs CDI (retorno mensal nao pode ficar abaixo do CDI por mais de 3 meses)
    var belowCDIStreak = 0;
    for (var j = mi; j >= 0; j--) {
      var rj = pd.retArr[j] || 0;
      var cj = CDI[MONTHS[j]] || 0;
      if (rj < cj) belowCDIStreak++; else break;
    }
    rules.push({
      id: 'R2',
      name: 'Rentabilidade vs CDI',
      description: 'Rentabilidade mensal abaixo do CDI por mais de 3 meses consecutivos indica underperformance estrutural.',
      formula: 'count(ret_mes < CDI_mes) consecutivos',
      tolerance: 3,
      actualValue: belowCDIStreak,
      threshold: 3,
      unit: 'meses',
      displayValue: belowCDIStreak + ' meses',
      status: belowCDIStreak < 3 ? 'PASS' : belowCDIStreak <= 4 ? 'WARN' : 'FAIL',
    });

    // R3: Variacao anomala de PL (|var%| > 10% dispara alerta)
    var varPct = reportedPlPrev > 0 ? Math.abs(plCurr - reportedPlPrev) / reportedPlPrev : 0;
    rules.push({
      id: 'R3',
      name: 'Variacao Anomala de PL',
      description: 'Variacao mensal de PL acima de 10% exige justificativa documentada.',
      formula: '|PL_atual - PL_anterior| / PL_anterior',
      tolerance: 0.10,
      actualValue: varPct,
      threshold: 0.10,
      unit: '%',
      displayValue: (varPct * 100).toFixed(1) + '%',
      status: varPct <= 0.10 ? 'PASS' : varPct <= 0.15 ? 'WARN' : 'FAIL',
    });

    // R4: PL registrado positivo (carteira nao pode ter PL zero ou negativo sem encerramento)
    rules.push({
      id: 'R4',
      name: 'PL Positivo',
      description: 'Carteira ativa deve manter PL positivo. PL zero ou negativo indica erro de registro ou encerramento nao comunicado.',
      formula: 'PL_atual > 0',
      tolerance: 0,
      actualValue: plCurr,
      threshold: 0,
      unit: 'BRL',
      displayValue: 'R$ ' + plCurr.toFixed(2),
      status: plCurr > 0 ? 'PASS' : 'FAIL',
    });

    // R5: Numero de ativos consistente (carteira ativa deve ter pelo menos 3 ativos)
    var nAtivos = plCurr > 0 ? 5 + Math.floor(hashStr(code + month) % 5) : 0;
    rules.push({
      id: 'R5',
      name: 'Diversificacao Minima',
      description: 'Carteira com PL > 0 deve conter pelo menos 3 ativos para diluicao de risco.',
      formula: 'count(ativos) >= 3',
      tolerance: 3,
      actualValue: nAtivos,
      threshold: 3,
      unit: 'ativos',
      displayValue: nAtivos + ' ativos',
      status: nAtivos >= 3 ? 'PASS' : nAtivos === 0 ? 'WARN' : 'FAIL',
    });

    // R6: Taxa de administracao dentro do esperado (fee declarado vs fee aplicado no mes)
    var feeApplied = pd.feeArr[mi] || 0;
    var feeExpected = plCurr * fee;
    var feeDeviation = feeExpected > 0 ? Math.abs(feeApplied - feeExpected) / feeExpected : 0;
    rules.push({
      id: 'R6',
      name: 'Taxa de Administracao Consistente',
      description: 'A taxa de administracao aplicada no mes deve corresponder ao fee contratual da carteira.',
      formula: '|fee_aplicado - (PL * fee_contratual)| / (PL * fee_contratual)',
      tolerance: 0.10,
      actualValue: feeDeviation,
      threshold: 0.10,
      unit: '%',
      displayValue: (feeDeviation * 100).toFixed(1) + '% de desvio',
      status: feeDeviation <= 0.10 ? 'PASS' : feeDeviation <= 0.25 ? 'WARN' : 'FAIL',
    });

    // R7: Cobertura de selo (se o mes tem checksum de auditoria registrado)
    var selo = getSeloInfo(month);
    var seloRuleStatus = selo.selado ? 'PASS' : 'WARN';
    rules.push({
      id: 'R7',
      name: 'Selo de Auditoria',
      description: 'O mes deve possuir checksum criptografico de auditoria (selo) registrado.',
      formula: 'selo != null',
      tolerance: 1,
      actualValue: selo.selado ? 1 : 0,
      threshold: 1,
      unit: 'booleano',
      displayValue: selo.selado ? 'Selado' : 'Nao selado',
      status: seloRuleStatus,
      checksum: selo.checksum || null,
      sealedAt: selo.sealedAt || null,
    });

    // Sumario
    var passCount = rules.filter(function(r) { return r.status === 'PASS'; }).length;
    var warnCount = rules.filter(function(r) { return r.status === 'WARN'; }).length;
    var failCount = rules.filter(function(r) { return r.status === 'FAIL'; }).length;
    var overallStatus = failCount > 0 ? 'FAIL' : warnCount > 0 ? 'WARN' : 'PASS';

    return {
      code: code,
      name: p.name,
      month: month,
      monthLabel: MONTH_LABELS[mi] || month,
      rules: rules,
      summary: {
        total: rules.length,
        pass: passCount,
        warn: warnCount,
        fail: failCount,
        overall: overallStatus,
      },
      computedAt: new Date().toISOString(),
      methodology: 'ATLAS Audit Engine v1.0 — 7 regras com tolerancias explicitas, valores observados e status computado por carteira.',
    };
  }

  /* =============================================================
     9. EXPORTS
  ============================================================= */

  window.BENCHMARKS = { monthly_cdi: CDI, monthly_ipca: IPCA, monthly_ibov: IBOV, month_labels: MONTH_LABELS };

  // G10: compila alertas do mes a partir de thresholds definidos.
  // Retorna array de { code, name, type, severity, text }.
  function getAlertas(month) {
    var alertas = [];
    var mi = MONTHS.indexOf(month);
    if (mi < 0) return alertas;

    // Thresholds (sobrescreviveis via localStorage atlas_alerts_config)
    var cfg = { varPL: 0.10, rentBelowCDI: 3, alertaStreak: 3 };
    try {
      var saved = JSON.parse(localStorage.getItem('atlas_alerts_config') || '{}');
      if (saved.varPL != null) cfg.varPL = saved.varPL;
      if (saved.rentBelowCDI != null) cfg.rentBelowCDI = saved.rentBelowCDI;
      if (saved.alertaStreak != null) cfg.alertaStreak = saved.alertaStreak;
    } catch(e) {}

    CATALOG.forEach(function(p) {
      var row = getRow(p.code, month);
      if (!row || row.plCurr <= 0) return;

      // 1. Variacao anomala de PL (> threshold)
      if (Math.abs(row.varPct) > cfg.varPL) {
        alertas.push({
          code: p.code, name: p.name, type: 'VAR_PL',
          severity: 'COM ALERTA',
          text: 'Variacao de PL de ' + (row.varPct * 100).toFixed(1) + '% no mes — acima do threshold de ' + (cfg.varPL * 100).toFixed(0) + '%.'
        });
      }

      // 2. Rentabilidade abaixo do CDI por N meses consecutivos
      var belowCount = 0;
      for (var j = mi; j >= 0 && j > mi - cfg.rentBelowCDI; j--) {
        var retJ = _portfolioData[p.code].retArr[j] || 0;
        var cdiJ = CDI[MONTHS[j]] || 0;
        if (retJ < cdiJ) belowCount++; else break;
      }
      if (belowCount >= cfg.rentBelowCDI) {
        alertas.push({
          code: p.code, name: p.name, type: 'BELOW_CDI',
          severity: 'INFO',
          text: 'Rentabilidade abaixo do CDI por ' + belowCount + ' meses consecutivos.'
        });
      }

      // 3. Status CORRIGIR novo (entrou neste mes, nao estava no anterior)
      if (row.status === 'CORRIGIR' && mi > 0) {
        var prevStatus = getStatus(p.code, MONTHS[mi - 1]);
        if (prevStatus !== 'CORRIGIR') {
          alertas.push({
            code: p.code, name: p.name, type: 'NEW_CORRIGIR',
            severity: 'CORRIGIR',
            text: 'Carteira entrou em status CORRIGIR neste mes.'
          });
        }
      }

      // 4. Sequencia de COM ALERTA >= N meses
      var alertaStreak = 0;
      for (var k = mi; k >= 0; k--) {
        if (getStatus(p.code, MONTHS[k]) === 'COM ALERTA') alertaStreak++; else break;
      }
      if (alertaStreak >= cfg.alertaStreak) {
        alertas.push({
          code: p.code, name: p.name, type: 'ALERTA_STREAK',
          severity: 'COM ALERTA',
          text: 'Carteira com status COM ALERTA ha ' + alertaStreak + ' meses consecutivos.'
        });
      }
    });

    // Ordena por severidade: CORRIGIR > COM ALERTA > INFO
    var sevOrder = { 'CORRIGIR': 0, 'COM ALERTA': 1, 'INFO': 2 };
    alertas.sort(function(a, b) { return (sevOrder[a.severity] || 9) - (sevOrder[b.severity] || 9); });
    return alertas;
  }

  window.AtlasData = {
    MONTHS: MONTHS,
    MONTH_LABELS: MONTH_LABELS,
    visibleMonths: visibleMonths,
    CDI: CDI,
    IPCA: IPCA,
    IBOV: IBOV,
    getIPCA: getIPCA,
    getIBOV: getIBOV,
    CURRENT_MONTH: CURRENT_MONTH,
    OPENING_MONTH: OPENING_MONTH,
    landingMonth: landingMonth,
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
    getCDI: getCDI,
    _internal: {
      _codeMap: _codeMap,
      _portfolioData: _portfolioData,
      RECIDIVA_CODES: RECIDIVA_CODES,
      getManagerForCode: getManagerForCode,
      // O roteiro de status só existe quando o gerador roda (seção 0). O
      // bundle publicado lê o dele da API, em STATUS_SCRIPT, já escopado.
      STATUS_SCRIPT: STATUS_SCRIPT,
      gerouDemo: __GERAR_DEMO__,
    },
    importPortfolioData: importPortfolioData,
    hidratarDoServidor: hidratarDoServidor,
    restoreDemo: restoreDemo,
    getDataMode: getDataMode,
    getSeloInfo: getSeloInfo,
    getAlertas: getAlertas,
    validate: validate,
    COST_COMPONENTS: COST_COMPONENTS,
    clientCostAnalysis: clientCostAnalysis,
    computeAuditTrail: computeAuditTrail,
  };

})();
