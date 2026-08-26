/* platform-consolidado.js — camada de decisão cruzada (window.AtlasConsolidado)
 *
 * Por que este arquivo existe
 * ---------------------------
 * Ranking, dashboard, rastreador de ativo, comparador e histórico de
 * verificação respondem perguntas diferentes sobre os MESMOS fatos: status da
 * carteira, divergência em reais, custo, pendência cadastral, sinal do radar e
 * evento de crédito. Cada tela calculando o seu por conta própria é o defeito
 * que já custou caro neste projeto duas vezes (a ordem da fila de
 * oportunidades na Onda 3, a severidade da queda de receita na Onda 2). Aqui é
 * o único lugar que decide. As telas leem e desenham.
 *
 * Três regras que este arquivo não pode quebrar
 * ---------------------------------------------
 * 1. Não existe score de 0 a 100. Decisão registrada em ESTADO/ESTADO-ATUAL.md:
 *    a escala de materialidade está aberta e já existe um 0 a 100 em score.ts
 *    do motor, onde 100 é BOM. Criticidade aqui é ORDEM LEXICOGRÁFICA sobre
 *    fato observável, o mesmo desenho que o radar já usa.
 * 2. Ausência de dado nunca vira "OK". Carteira sem extrato do mês sai como
 *    SEM DADO, nunca como LIBERAR. Carteira que o motor de crédito não
 *    consegue avaliar sai como "não avaliável", nunca como "sem exposição".
 * 3. Todo número que ordena aparece na tela junto com a conta que o gerou.
 *    "Não mostre o patrimônio, prove o número."
 *
 * Sem rede, sem dependência nova, sem estado próprio. Lê window.AtlasData e os
 * overlays (ATLAS_RADAR_DATA / ATLAS_CREDITO_DATA) em tempo de chamada — nunca
 * no topo do módulo, porque na instância real o overlay é script clássico que
 * pode ser trocado por reingestão sem recarregar o bundle.
 */
(function () {
  'use strict';

  /* Tolerância de continuidade do PL: 0,30% do PL anterior reportado. Não é
     número novo — é a tolerância da regra R1 que computeAuditTrail já aplica.
     Divergência acima disso é material; abaixo, é ruído de arredondamento. */
  var MATERIALIDADE_PCT = 0.003;

  /* Ordem de criticidade do status. SEM DADO fica acima de COM ALERTA porque
     trava o fechamento do mês, e abaixo de CORRIGIR porque não há erro
     provado, só ausência. Carteira sem dado não é carteira liberada. */
  var PESO_STATUS = { 'CORRIGIR': 4, 'SEM DADO': 3, 'COM ALERTA': 2, 'LIBERAR': 1 };

  var PESO_SEVERIDADE = { alta: 3, media: 2, baixa: 1 };

  function D() { return window.AtlasData; }

  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; }

  function mesAnterior(month) {
    var meses = D().MONTHS;
    var i = meses.indexOf(month);
    return i > 0 ? meses[i - 1] : null;
  }

  /* A divergência em reais, calculada num lugar só.

     Existia em duas cópias, uma no ranking e outra no histórico, e a segunda
     não arredondava. Resultado visível na tela: linha de histórico escrevendo
     "-R$ 0,00", que é resíduo de ponto flutuante posando de número. Dinheiro
     tem duas casas, e quem decide quantas é esta função. */
  function divergenciaDe(row) {
    if (!row) return { brl: null, abs: 0, pct: 0, material: false };
    var brl = Math.round(num(row.divergenciaBRL) * 100) / 100;
    var abs = Math.abs(brl);
    var base = num(row.plPrev);
    var pct = base > 0 ? abs / base : 0;
    return { brl: brl, abs: abs, pct: pct, material: base > 0 && pct > MATERIALIDADE_PCT };
  }

  function ultimoDiaDoMes(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return null;
    var ano = Number(month.slice(0, 4));
    var mes = Number(month.slice(5, 7));
    var d = new Date(Date.UTC(ano, mes, 0));
    return d.toISOString().slice(0, 10);
  }

  function diasEntre(isoA, isoB) {
    if (!isoA || !isoB) return null;
    var a = Date.parse(isoA + 'T00:00:00Z');
    var b = Date.parse(isoB + 'T00:00:00Z');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((a - b) / 86400000);
  }

  /* ==========================================================
     CLIENTE (tenant) — o elo que o fluxo chamava de gestor
     ==========================================================
     O motor ganhou `tenantId` em 21/08/2026 e ele viaja no snapshot, na
     ingestão, nos eventos e na reconciliação. A tela ainda falava "gestor"
     onde o fluxo de negócio diz "cliente", e são coisas diferentes: cliente é
     o escritório dono da instância, gestor é quem responde pela carteira
     dentro dele. Aqui o rótulo passa a sair do dado.

     Sem overlay e sem marca de instância, o rótulo é o do ambiente de
     demonstração. Nunca se inventa nome de casa. */
  function clienteAtual() {
    var R = window.ATLAS_RADAR_DATA;
    var C = window.ATLAS_CREDITO_DATA;
    var tenant = (R && R.tenantId) || (C && C.tenantId) || null;
    var marca = window.AtlasBrand && window.AtlasBrand.tenant ? window.AtlasBrand.tenant : null;
    var d = D();
    var modo = (d && d.getDataMode && d.getDataMode()) || 'demo';
    /* Em demo o `tenantId` do overlay vale "demo", que é rótulo de ambiente e
       não nome de casa. Imprimir isso no cabeçalho como se fosse cliente é
       ruído, e a faixa do topo já avisa que o ambiente é de demonstração.
       Só assina quem se declarou. */
    var nome = marca || (tenant && tenant !== 'default' && tenant !== 'demo' ? tenant : null);
    return {
      id: tenant || 'default',
      rotulo: nome,
      declarado: !!nome,
      modo: modo,
    };
  }

  /* ==========================================================
     AÇÃO — último elo do fluxo, e o que faltava aterrissar
     ==========================================================
     Ranking que entrega prioridade sem responsável entrega metade do valor do
     fechamento. A fila de oportunidade já existe, já tem dono, prazo, status,
     transição validada e reconciliação contra a base, e já é lida por três
     telas. O ranking não cria fila nova, ele deposita nessa.

     Sobre o formato do id. A fila trata linha salva no navegador que NÃO
     começa com `op-` como órfã, porque assume que veio do motor e sumiu numa
     reingestão: órfã fica fora da fila e fora dos indicadores. O ranking
     mensal não é feed do motor como vencimento e caixa parado são, então um id
     no formato do motor nasceria órfão e invisível. O id aqui é `op-` com
     conteúdo determinístico, o que dá as duas garantias ao mesmo tempo, a
     linha é reconhecida como legítima e dois cliques caem na mesma linha. */
  var GATILHO_ACAO = [
    { chave: 'sem-dado',      quando: function (l) { return l.semDado; },              texto: function () { return 'Extrato do mês ausente: cobrar o custodiante antes de fechar'; } },
    { chave: 'corrigir',      quando: function (l) { return l.status === 'CORRIGIR'; }, texto: function () { return 'Verificação reprovada: tratar antes de liberar para o cliente'; } },
    { chave: 'divergencia',   quando: function (l) { return l.material; },              texto: function (l) { return 'Divergência de ' + (l.divergenciaPct * 100).toFixed(2) + '% do PL anterior a explicar'; } },
    { chave: 'bloqueio',      quando: function (l) { return l.nBloqueios > 0; },        texto: function (l) { return l.nBloqueios + ' achado(s) CORRIGIR em aberto na fila de exceção'; } },
    { chave: 'risco-alto',    quando: function (l) { return (l.nSinaisAlta + l.nCreditosAlta) > 0; }, texto: function (l) { return (l.nSinaisAlta + l.nCreditosAlta) + ' sinal(is) de risco em severidade alta'; } },
    { chave: 'sem-cobertura', quando: function (l) { return l.noEscuro; },              texto: function () { return 'Sem cobertura de emissor: completar o cadastro de ativos'; } },
  ];

  function acaoDaCarteira(linha) {
    if (!linha) return null;
    var gatilho = null;
    for (var i = 0; i < GATILHO_ACAO.length; i++) {
      if (GATILHO_ACAO[i].quando(linha)) { gatilho = GATILHO_ACAO[i]; break; }
    }
    if (!gatilho) return null;

    var id = 'op-' + linha.code + '-' + linha.month + '-verificacao-' + gatilho.chave;
    var motivo = linha.name + ' (' + linha.code + '), ' + linha.month + '. ' + gatilho.texto(linha) + '.';

    return {
      id: id,
      chave: gatilho.chave,
      motivo: motivo,
      carteira: linha.code,
      periodo: linha.month,
      /* Contrato de entrada da fila, o mesmo que Vencimentos e Caixa parado
         já usam. Não inventar parâmetro novo aqui. */
      href: '#/oportunidades?nova=1'
        + '&carteira=' + encodeURIComponent(linha.code)
        + '&motivo=' + encodeURIComponent(motivo)
        + '&origem=achado'
        + '&periodo=' + encodeURIComponent(linha.month)
        + '&opid=' + encodeURIComponent(id),
    };
  }

  /* Status da ação desta carteira na fila, ou null se ainda não foi criada.
     Lê pelo mesmo helper que as outras três telas usam, base mais navegador. */
  function statusAcao(linha) {
    var acao = acaoDaCarteira(linha);
    if (!acao) return null;
    var U = window.AtlasUtils;
    if (!U || !U.statusOportunidade) return null;
    return U.statusOportunidade(acao.id);
  }

  /* ==========================================================
     INTELIGÊNCIA POR CARTEIRA — leitura única dos dois overlays
     ==========================================================
     Fonte única do que a aba Inteligência da carteira, o ranking e o
     rastreador de ativos mostram. Sem recálculo: o motor decidiu severidade,
     estado e cobertura, aqui só se filtra por carteira. */
  function intelDaCarteira(code) {
    var R = window.ATLAS_RADAR_DATA;
    var C = window.ATLAS_CREDITO_DATA;
    var alvo = (R && R.carteiras) ? R.carteiras.find(function (c) { return c.carteira === code; }) : null;
    var cobertura = (R && R.cobertura) ? R.cobertura.find(function (c) { return c.carteira === code; }) : null;
    var insights = new Map(
      ((R && R.insights) || []).concat((C && C.insights) || []).map(function (i) { return [i.id, i]; })
    );
    var creditos = [];
    var impactos = (C && C.impactos) || [];
    for (var k = 0; k < impactos.length; k++) {
      var imp = impactos[k];
      var atingidas = imp.atingidas || [];
      for (var j = 0; j < atingidas.length; j++) {
        if (atingidas[j].carteira === code) creditos.push({ evento: imp.evento, a: atingidas[j] });
      }
    }
    /* Carteira que o motor de crédito não consegue avaliar não está limpa.
       Ausência de evento numa carteira no escuro é falsa calmaria. */
    var noEscuro = !!(C && impactos.some(function (i) { return (i.naoAvaliaveis || []).indexOf(code) >= 0; }));
    return { sinais: (alvo && alvo.sinais) || [], cobertura: cobertura, insights: insights, creditos: creditos, noEscuro: noEscuro };
  }

  /* Existe overlay de inteligência neste ambiente? Sem ele, ranking e
     dashboard não dizem "sem sinal" (que soaria como carteira limpa), dizem
     "não apurado". */
  function intelDisponivel() {
    return !!(window.ATLAS_RADAR_DATA || window.ATLAS_CREDITO_DATA);
  }

  /* Data em que a posição diária foi apurada. A aba de inteligência da carteira
     precisa declarar isso porque os indicadores do topo da página vêm do
     extrato MENSAL: sem a data, o leitor vê dois patrimônios para a mesma
     carteira na mesma tela e conclui, com razão, que o sistema errou. */
  function dataApuracaoIntel() {
    var R = window.ATLAS_RADAR_DATA;
    var C = window.ATLAS_CREDITO_DATA;
    return (R && R.data) || (C && C.data) || null;
  }

  /* ==========================================================
     PENDÊNCIAS CADASTRAIS POR CARTEIRA
     ========================================================== */
  /* De onde vem a pendência cadastral, e por que isso importa.

     `AtlasData.registration()` GERA as pendências por sorteio determinístico.
     O carregamento de dado real não substitui essa função — conferido, não
     suposto. Então numa instância com carteira de cliente na tela, a coluna de
     pendência mostraria número inventado ao lado de número real, sem aviso.
     É exatamente o defeito que a Onda 1 corrigiu em agosto, e ele voltaria por
     uma porta nova.

     Decisão: fora do modo demonstração a pendência sai marcada como ESTIMATIVA
     e não participa da ordenação de criticidade. Ordenar por número inventado
     é o que transforma estimativa em fato. No dia em que existir overlay real
     de cadastro (window.ATLAS_CADASTRO_DATA), a marca cai sozinha. */
  function pendenciasOrigem() {
    if (window.ATLAS_CADASTRO_DATA && Array.isArray(window.ATLAS_CADASTRO_DATA.pendencias)) {
      return { fonte: 'overlay', estimadas: false };
    }
    var d = D();
    var modo = (d && d.getDataMode && d.getDataMode()) || 'demo';
    /* Em demo o sintético é legítimo e a faixa do topo já avisa o usuário. */
    return { fonte: 'sintetica', estimadas: modo !== 'demo' };
  }

  var _pendCache = null;
  var _pendCacheModo = null;
  function pendenciasPorCarteira() {
    var origem = pendenciasOrigem();
    /* Cache invalidado quando o modo de dados muda (importar extrato, voltar
       para demo). Cache que sobrevive à troca de modo entrega o número do modo
       anterior. */
    if (_pendCache && _pendCacheModo === origem.fonte + '|' + origem.estimadas) return _pendCache;
    var mapa = {};
    var overlay = window.ATLAS_CADASTRO_DATA;
    var linhas = (overlay && Array.isArray(overlay.pendencias))
      ? overlay.pendencias
      : ((D().registration && D().registration()) || []);
    linhas.forEach(function (r) {
      if (!mapa[r.code]) mapa[r.code] = { total: 0, vencidas: 0, tipos: [] };
      mapa[r.code].total += 1;
      if (r.status === 'Vencido') mapa[r.code].vencidas += 1;
      if (mapa[r.code].tipos.indexOf(r.type) < 0) mapa[r.code].tipos.push(r.type);
    });
    _pendCache = mapa;
    _pendCacheModo = origem.fonte + '|' + origem.estimadas;
    return mapa;
  }

  /* ==========================================================
     INSTITUIÇÕES — onde o patrimônio da casa está custodiado
     ==========================================================
     Sai da composição das carteiras, não de campo declarado. Uma instituição
     concentrando patrimônio é fato operacional, não alarme de crédito: o
     alarme de emissor é do radar e usa o ativo-map, não esta agregação. */
  function instituicoes(month) {
    var d = D();
    var mapa = {};
    var total = 0;
    d.CATALOG.forEach(function (p) {
      var comp = d.getComposition(p.code, month) || [];
      comp.forEach(function (linha) {
        var nome = linha.institution || 'Não informada';
        if (!mapa[nome]) mapa[nome] = { instituicao: nome, valor: 0, carteiras: {}, nAtivos: {} };
        mapa[nome].valor += num(linha.saldoFinal);
        mapa[nome].carteiras[p.code] = true;
        mapa[nome].nAtivos[linha.name] = true;
        total += num(linha.saldoFinal);
      });
    });
    return Object.keys(mapa).map(function (k) {
      return {
        instituicao: k,
        valor: mapa[k].valor,
        pct: total > 0 ? mapa[k].valor / total : 0,
        nCarteiras: Object.keys(mapa[k].carteiras).length,
        nAtivos: Object.keys(mapa[k].nAtivos).length,
      };
    }).sort(function (a, b) { return b.valor - a.valor; });
  }

  /* ==========================================================
     LINHA DE CRITICIDADE DE UMA CARTEIRA
     ========================================================== */
  function linhaCriticidade(code, month) {
    var d = D();
    var p = d.CATALOG.find(function (x) { return x.code === code; });
    var row = d.getRow(code, month);
    var pend = pendenciasPorCarteira()[code] || { total: 0, vencidas: 0, tipos: [] };
    var pendEstimadas = pendenciasOrigem().estimadas;
    var intel = intelDaCarteira(code);

    /* Sem linha, ou com linha e PL zerado, a carteira não tem extrato útil no
       mês. Isso não é liberação. */
    var semDado = !row || num(row.plCurr) <= 0;
    var status = semDado ? 'SEM DADO' : row.status;

    /* Fonte única do número, arredondada a centavo. Sem isso, resíduo de ponto
       flutuante decidia a posição de carteiras que a tela mostra como "sem
       divergência", e a régua que ordena ficava invisível para quem lê. */
    var div = semDado ? { brl: null, abs: 0, pct: 0, material: false } : divergenciaDe(row);
    var divergencia = div.brl;
    var divergenciaAbs = div.abs;
    var basePl = semDado ? 0 : num(row.plPrev);
    var divergenciaPct = div.pct;
    var material = !semDado && div.material;

    var bloqueios = [];
    var U = window.AtlasUtils;
    if (!semDado && U && U.getBlockingExceptions) {
      bloqueios = U.getBlockingExceptions(code, month) || [];
    }

    var sinaisAlta = intel.sinais.filter(function (s) { return s.severidade === 'alta'; }).length;
    var creditosAlta = intel.creditos.filter(function (c) { return c.a && c.a.severidadeImpacto === 'alta'; }).length;
    var sinaisNovos = intel.sinais.filter(function (s) { return s.estado === 'novo' || s.estado === 'agravado'; }).length;

    /* Maior posição da carteira: concentração interna, medida na composição do
       próprio mês. Descritiva, sem julgamento — o corte calibrado de
       concentração é do radar, e o radar já entra por outro campo. */
    var maiorPosicao = null;
    if (!semDado) {
      var comp = d.getComposition(code, month) || [];
      comp.forEach(function (linha) {
        if (!maiorPosicao || num(linha.saldoFinal) > num(maiorPosicao.saldoFinal)) maiorPosicao = linha;
      });
    }

    var motivos = [];
    if (semDado) motivos.push('Sem extrato com PL no mês. Não pode ser liberada.');
    if (status === 'CORRIGIR') motivos.push('Verificação reprovada no mês.');
    if (material) {
      motivos.push('Divergência de ' + (divergenciaPct * 100).toFixed(2) + '% do PL anterior, acima da tolerância de 0,30%.');
    }
    if (bloqueios.length) motivos.push(bloqueios.length + ' achado(s) CORRIGIR em aberto na fila de exceção.');
    if (sinaisAlta) motivos.push(sinaisAlta + ' sinal(is) de risco em severidade alta.');
    if (creditosAlta) motivos.push(creditosAlta + ' evento(s) de crédito com impacto alto.');
    if (intel.noEscuro) motivos.push('Sem cobertura de emissor: não pôde ser avaliada para crédito.');
    if (pend.vencidas) {
      motivos.push(pendEstimadas
        ? pend.vencidas + ' pendência(s) cadastral(is) vencida(s), número estimado, não confirmado pelo cadastro deste ambiente.'
        : pend.vencidas + ' pendência(s) cadastral(is) vencida(s).');
    }

    return {
      code: code,
      name: (p && p.name) || (row && row.name) || code,
      manager: row ? row.manager : null,
      risk: p ? p.risk : null,
      month: month,
      semDado: semDado,
      status: status,
      pesoStatus: PESO_STATUS[status] || 0,

      pl: semDado ? null : num(row.plCurr),
      plAnterior: semDado ? null : num(row.plPrev),
      plEsperado: semDado ? null : num(row.plEsperado),
      rent: semDado ? null : num(row.rent),
      vsCDI: semDado ? null : num(row.vsCDI),

      divergenciaBRL: divergencia,
      divergenciaAbsBRL: divergenciaAbs,
      divergenciaPct: divergenciaPct,
      material: material,

      nAchados: semDado ? 0 : num(row.nAchados),
      nBloqueios: bloqueios.length,
      bloqueios: bloqueios,

      custoBRL: semDado ? 0 : num(row.totalCost),
      custoPct: semDado ? 0 : num(row.totalCostPct),

      pendencias: pend.total,
      pendenciasVencidas: pend.vencidas,
      pendenciasTipos: pend.tipos,
      pendenciasEstimadas: pendEstimadas,
      /* Campo que a ordenação usa. Estimativa não ordena criticidade: número
         inventado que decide posição vira fato aos olhos de quem lê. */
      pendOrdenavel: pendEstimadas ? 0 : pend.total,
      pendVencidasOrdenavel: pendEstimadas ? 0 : pend.vencidas,

      intelApurada: intelDisponivel(),
      nSinais: intel.sinais.length,
      nSinaisAlta: sinaisAlta,
      nSinaisNovos: sinaisNovos,
      nCreditos: intel.creditos.length,
      nCreditosAlta: creditosAlta,
      noEscuro: intel.noEscuro,

      maiorPosicao: maiorPosicao
        ? { name: maiorPosicao.name, cls: maiorPosicao.cls, valor: num(maiorPosicao.saldoFinal), pct: num(maiorPosicao.pct) }
        : null,

      motivos: motivos,
    };
  }

  /* Ordem de criticidade. Lexicográfica sobre fato observável, nunca soma
     ponderada: peso de soma é escala inventada, e escala inventada foi
     justamente o que se decidiu não construir antes de calibrar. */
  var CRITERIOS = {
    criticidade: function (a, b) {
      return (b.pesoStatus - a.pesoStatus)
        || (b.divergenciaAbsBRL - a.divergenciaAbsBRL)
        || (b.nBloqueios - a.nBloqueios)
        || ((b.nSinaisAlta + b.nCreditosAlta) - (a.nSinaisAlta + a.nCreditosAlta))
        || ((b.nSinais + b.nCreditos) - (a.nSinais + a.nCreditos))
        || (b.pendVencidasOrdenavel - a.pendVencidasOrdenavel)
        || (b.pendOrdenavel - a.pendOrdenavel)
        || (b.custoPct - a.custoPct)
        || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
    },
    materialidade: function (a, b) {
      return (b.divergenciaAbsBRL - a.divergenciaAbsBRL) || (b.pesoStatus - a.pesoStatus)
        || (a.code < b.code ? -1 : 1);
    },
    patrimonio: function (a, b) {
      return (num(b.pl) - num(a.pl)) || (a.code < b.code ? -1 : 1);
    },
    custo: function (a, b) {
      return (b.custoPct - a.custoPct) || (b.custoBRL - a.custoBRL) || (a.code < b.code ? -1 : 1);
    },
    /* Único critério que ordena pela pendência mesmo estimada, porque foi
       pedido de propósito pelo usuário ao escolher esta visão. A tela é
       obrigada a carimbar a coluna como estimativa aqui. */
    pendencias: function (a, b) {
      return (b.pendenciasVencidas - a.pendenciasVencidas) || (b.pendencias - a.pendencias)
        || (b.pesoStatus - a.pesoStatus) || (a.code < b.code ? -1 : 1);
    },
    intel: function (a, b) {
      return ((b.nSinaisAlta + b.nCreditosAlta) - (a.nSinaisAlta + a.nCreditosAlta))
        || ((b.nSinais + b.nCreditos) - (a.nSinais + a.nCreditos))
        || (b.pesoStatus - a.pesoStatus) || (a.code < b.code ? -1 : 1);
    },
  };

  function rankingCarteiras(month, opts) {
    var o = opts || {};
    var d = D();
    if (!d || d.MONTHS.indexOf(month) < 0) return [];
    if (month > d.CURRENT_MONTH) return [];
    /* Carteira que ainda não existia no mês não é "SEM DADO" — é carteira que
       não estava na casa. Mesmo corte que historicoVerificacao usa. */
    var linhas = d.CATALOG
      .filter(function (p) { return !p.inception || p.inception <= month; })
      .map(function (p) { return linhaCriticidade(p.code, month); });
    var cmp = CRITERIOS[o.criterio] || CRITERIOS.criticidade;
    return linhas.sort(cmp);
  }

  /* ==========================================================
     RESUMO DA CASA — o que a home responde em segundos
     ==========================================================
     Ordem da leitura: patrimônio verificado, carteiras analisadas,
     LIBERAR/ALERTA/CORRIGIR, divergências materiais, onde agir. */
  function resumoCasa(month) {
    var d = D();
    if (!d || d.MONTHS.indexOf(month) < 0) return null;
    var linhas = rankingCarteiras(month);

    var comDado = linhas.filter(function (l) { return !l.semDado; });
    var semDado = linhas.filter(function (l) { return l.semDado; });

    function somaPl(arr) { return arr.reduce(function (s, l) { return s + num(l.pl); }, 0); }

    var liberar  = comDado.filter(function (l) { return l.status === 'LIBERAR'; });
    var alerta   = comDado.filter(function (l) { return l.status === 'COM ALERTA'; });
    var corrigir = comDado.filter(function (l) { return l.status === 'CORRIGIR'; });

    var materiais = comDado.filter(function (l) { return l.material; })
      .sort(function (a, b) { return b.divergenciaAbsBRL - a.divergenciaAbsBRL; });

    var custoTotal = comDado.reduce(function (s, l) { return s + l.custoBRL; }, 0);
    var plTotal = somaPl(comDado);

    var conc = d.concentration ? d.concentration(month) : null;
    var inst = instituicoes(month);

    var pendTotal = 0, pendVenc = 0, carteirasComPend = 0;
    linhas.forEach(function (l) {
      pendTotal += l.pendencias;
      pendVenc += l.pendenciasVencidas;
      if (l.pendencias > 0) carteirasComPend += 1;
    });

    return {
      month: month,
      intelApurada: intelDisponivel(),

      carteiras: {
        total: linhas.length,
        comDado: comDado.length,
        semDado: semDado.length,
        liberar: liberar.length,
        alerta: alerta.length,
        corrigir: corrigir.length,
        semDadoCodigos: semDado.map(function (l) { return l.code; }),
      },

      patrimonio: {
        total: plTotal,
        liberado: somaPl(liberar),
        emAlerta: somaPl(alerta),
        bloqueado: somaPl(corrigir),
        pctLiberado: plTotal > 0 ? somaPl(liberar) / plTotal : 0,
      },

      divergencias: {
        nMateriais: materiais.length,
        valorAbsTotal: materiais.reduce(function (s, l) { return s + l.divergenciaAbsBRL; }, 0),
        valorAbsTodas: comDado.reduce(function (s, l) { return s + l.divergenciaAbsBRL; }, 0),
        toleranciaPct: MATERIALIDADE_PCT,
        maiores: materiais.slice(0, 5),
      },

      custos: {
        total: custoTotal,
        pctPl: plTotal > 0 ? custoTotal / plTotal : 0,
        maiores: comDado.slice().sort(function (a, b) { return b.custoPct - a.custoPct; }).slice(0, 5),
      },

      concentracao: conc
        ? { top5Pct: conc.top5.reduce(function (s, r) { return s + r.pct; }, 0), top1: conc.top10[0] || null, top5: conc.top5 }
        : null,

      instituicoes: { total: inst.length, maiores: inst.slice(0, 5) },

      pendencias: {
        total: pendTotal,
        vencidas: pendVenc,
        carteiras: carteirasComPend,
        estimadas: pendenciasOrigem().estimadas,
      },

      /* Radar e crédito contados separados, e nomeados pelo que são.

         A primeira versão somava só o radar num campo chamado "sinaisAlta", e
         o ranking mostrava radar mais crédito na mesma coluna. A mesma
         carteira aparecia com 3 no painel e 4 no ranking, o que qualquer
         leitor conclui ser erro de conta. São duas fontes, então são duas
         linhas, e o total existe declarado como total. */
      intel: {
        carteirasComSinal: comDado.filter(function (l) { return (l.nSinais + l.nCreditos) > 0; }).length,
        sinaisRadar: comDado.reduce(function (s, l) { return s + l.nSinais; }, 0),
        sinaisRadarAlta: comDado.reduce(function (s, l) { return s + l.nSinaisAlta; }, 0),
        eventosCredito: comDado.reduce(function (s, l) { return s + l.nCreditos; }, 0),
        eventosCreditoAlta: comDado.reduce(function (s, l) { return s + l.nCreditosAlta; }, 0),
        totalAlta: comDado.reduce(function (s, l) { return s + l.nSinaisAlta + l.nCreditosAlta; }, 0),
        carteirasNoEscuro: linhas.filter(function (l) { return l.noEscuro; }).length,
      },

      ondeAgir: linhas.filter(function (l) {
        return l.pesoStatus >= 3 || l.material || l.nBloqueios > 0 || l.nSinaisAlta > 0 || l.nCreditosAlta > 0 || l.noEscuro;
      }).slice(0, 8),
    };
  }

  /* ==========================================================
     RASTREADOR DE ATIVO
     ==========================================================
     Pergunta que responde: "quem tem este papel, quanto, que peso, e essas
     carteiras estão limpas?". Reaproveita a busca de AtlasData e enriquece
     com status, divergência e o que o radar/crédito já disse sobre o papel. */
  function eventosDoAtivo(nomeAtivo) {
    var alvo = String(nomeAtivo || '').toLowerCase();
    if (!alvo) return { sinais: [], creditos: [] };
    var R = window.ATLAS_RADAR_DATA;
    var C = window.ATLAS_CREDITO_DATA;
    var sinais = [];
    ((R && R.carteiras) || []).forEach(function (c) {
      (c.sinais || []).forEach(function (s) {
        var rotulo = String(s.rotulo || '').toLowerCase();
        var chave = String(s.chave || '').toLowerCase();
        if (rotulo && (alvo.indexOf(rotulo) >= 0 || rotulo.indexOf(alvo) >= 0)) {
          sinais.push({ carteira: c.carteira, sinal: s });
        } else if (chave && chave.indexOf(alvo) >= 0) {
          sinais.push({ carteira: c.carteira, sinal: s });
        }
      });
    });
    var creditos = [];
    ((C && C.impactos) || []).forEach(function (imp) {
      var emissor = String((imp.evento && imp.evento.emissorNome) || '').toLowerCase();
      if (!emissor) return;
      if (alvo.indexOf(emissor) < 0 && emissor.indexOf(alvo) < 0) return;
      (imp.atingidas || []).forEach(function (a) { creditos.push({ carteira: a.carteira, evento: imp.evento, a: a }); });
    });
    return { sinais: sinais, creditos: creditos };
  }

  function rastrearAtivo(query, month) {
    var d = D();
    if (!d || !query || String(query).trim().length < 2) return [];
    if (d.MONTHS.indexOf(month) < 0) return [];

    var achados = d.searchAssets(String(query).trim(), month) || [];
    var anterior = mesAnterior(month);
    var plCasa = num((d.dashboardStats(month) || {}).plTotal);

    return achados.map(function (grupo) {
      var evt = eventosDoAtivo(grupo.assetName);

      var carteiras = (grupo.portfolios || []).map(function (pf) {
        var linha = linhaCriticidade(pf.code, month);

        /* Posição do mesmo papel no mês anterior. Ausência de mês anterior e
           posição zerada são coisas diferentes: sem mês base, `antes` é null e
           a tela escreve "sem base", não "entrou". */
        var antes = null;
        if (anterior) {
          antes = 0;
          (d.getComposition(pf.code, anterior) || []).forEach(function (linhaComp) {
            if (linhaComp.name === grupo.assetName) antes += num(linhaComp.saldoFinal);
          });
        }

        return {
          code: pf.code,
          name: pf.name,
          valor: num(pf.value),
          pctCarteira: num(pf.pct),
          pctCasa: plCasa > 0 ? num(pf.value) / plCasa : 0,
          valorAnterior: antes,
          deltaBRL: antes === null ? null : num(pf.value) - antes,
          entrou: antes !== null && antes <= 0 && num(pf.value) > 0,
          status: linha.status,
          semDado: linha.semDado,
          divergenciaBRL: linha.divergenciaBRL,
          material: linha.material,
          nAchados: linha.nAchados,
          nBloqueios: linha.nBloqueios,
          noEscuro: linha.noEscuro,
          sinais: evt.sinais.filter(function (s) { return s.carteira === pf.code; }),
          creditos: evt.creditos.filter(function (c) { return c.carteira === pf.code; }),
        };
      }).sort(function (a, b) { return b.valor - a.valor; });

      var valorTotal = carteiras.reduce(function (s, c) { return s + c.valor; }, 0);

      return {
        ativo: grupo.assetName,
        cls: grupo.cls,
        valorTotal: valorTotal,
        pctCasa: plCasa > 0 ? valorTotal / plCasa : 0,
        nCarteiras: carteiras.length,
        nCarteirasComProblema: carteiras.filter(function (c) {
          return c.status !== 'LIBERAR' || c.material || c.nBloqueios > 0;
        }).length,
        maiorPeso: carteiras.reduce(function (m, c) { return c.pctCarteira > m ? c.pctCarteira : m; }, 0),
        intelApurada: intelDisponivel(),
        nSinais: evt.sinais.length,
        nCreditos: evt.creditos.length,
        carteiras: carteiras,
      };
    });
  }

  /* ==========================================================
     COMPARADOR DE CARTEIRA — mês atual x anterior, posição a posição
     ========================================================== */
  function compararCarteira(code, mesA, mesB) {
    var d = D();
    if (!d || !code) return null;
    if (d.MONTHS.indexOf(mesA) < 0 || !mesB || d.MONTHS.indexOf(mesB) < 0) {
      return { code: code, mesA: mesA, mesB: mesB, disponivel: false, motivo: 'mes-invalido', posicoes: [] };
    }

    var a = linhaCriticidade(code, mesA);
    var b = linhaCriticidade(code, mesB);

    var compA = d.getComposition(code, mesA) || [];
    var compB = d.getComposition(code, mesB) || [];

    var mapa = {};
    function acumular(comp, lado) {
      comp.forEach(function (linha) {
        var k = linha.name;
        if (!mapa[k]) mapa[k] = { ativo: k, cls: linha.cls, institution: linha.institution, valorA: 0, valorB: 0, pctA: 0, pctB: 0 };
        mapa[k]['valor' + lado] += num(linha.saldoFinal);
        mapa[k]['pct' + lado] += num(linha.pct);
        if (!mapa[k].cls) mapa[k].cls = linha.cls;
      });
    }
    acumular(compA, 'A');
    acumular(compB, 'B');

    var posicoes = Object.keys(mapa).map(function (k) {
      var m = mapa[k];
      var mov = m.valorB <= 0 && m.valorA > 0 ? 'entrou'
        : m.valorA <= 0 && m.valorB > 0 ? 'saiu'
        : 'permaneceu';
      return {
        ativo: m.ativo,
        cls: m.cls,
        institution: m.institution,
        valorA: m.valorA,
        valorB: m.valorB,
        deltaBRL: m.valorA - m.valorB,
        pctA: m.pctA,
        pctB: m.pctB,
        deltaPeso: m.pctA - m.pctB,
        movimento: mov,
      };
    }).sort(function (x, y) { return Math.abs(y.deltaBRL) - Math.abs(x.deltaBRL); });

    /* Um dos dois meses sem dado anula a comparação posição a posição. Carteira
       que só tem um dos meses não "entrou" nem "saiu": não há o que comparar,
       e ausência de dado nunca vira movimento nem vira OK. */
    var semBase = a.semDado || b.semDado;

    return {
      code: code,
      name: a.name,
      mesA: mesA,
      mesB: mesB,
      disponivel: !semBase,
      motivo: semBase ? 'sem-dado-em-um-dos-meses' : null,
      a: a,
      b: b,
      deltaPl: semBase ? null : (num(a.pl) - num(b.pl)),
      deltaPlPct: semBase ? null : (num(b.pl) > 0 ? (num(a.pl) - num(b.pl)) / num(b.pl) : null),
      deltaCusto: semBase ? null : a.custoBRL - b.custoBRL,
      deltaAchados: semBase ? null : a.nAchados - b.nAchados,
      mudouStatus: semBase ? null : a.status !== b.status,
      entradas: semBase ? [] : posicoes.filter(function (p) { return p.movimento === 'entrou'; }),
      saidas: semBase ? [] : posicoes.filter(function (p) { return p.movimento === 'saiu'; }),
      posicoes: semBase ? [] : posicoes,
    };
  }

  /* ==========================================================
     FONTE A x FONTE B — extrato mensal contra posição diária
     ==========================================================
     A segunda fonte deste sistema é o arquivo de posição do custodiante que
     alimenta o radar. Ela é apurada em OUTRA data (diária, não fechamento de
     mês), e comparar sem dizer isso produz dois patrimônios para a mesma
     carteira na mesma tela, que qualquer leitor conclui ser erro. Por isso a
     resposta sempre carrega as duas datas.

     Sem overlay do radar, o retorno é `disponivel: false`. Nunca "confere". */
  function fontesDaCarteira(code, month) {
    var d = D();
    var linha = linhaCriticidade(code, month);
    var R = window.ATLAS_RADAR_DATA;
    var alvo = (R && R.carteiras) ? R.carteiras.find(function (c) { return c.carteira === code; }) : null;

    var base = {
      code: code,
      name: linha.name,
      fonteA: {
        rotulo: 'Extrato mensal do custodiante',
        apuradoEm: month,
        apuradoRotulo: (d.MONTH_LABELS[d.MONTHS.indexOf(month)] || month),
        pl: linha.semDado ? null : linha.pl,
      },
    };

    if (!R || !alvo) {
      return Object.assign(base, {
        disponivel: false,
        motivo: R ? 'carteira-fora-da-posicao-diaria' : 'sem-arquivo-de-posicao',
        fonteB: null,
        deltaBRL: null,
        deltaPct: null,
        conclusao: 'nao-verificavel',
      });
    }

    var plB = num(alvo.plTotal);
    var plA = linha.semDado ? null : num(linha.pl);
    var delta = (plA === null) ? null : plA - plB;
    var deltaPct = (plA === null || plB <= 0) ? null : Math.abs(delta) / plB;

    return Object.assign(base, {
      disponivel: true,
      motivo: null,
      fonteB: {
        rotulo: 'Posição diária do custodiante',
        apuradoEm: R.data || null,
        apuradoRotulo: R.data || 'data não declarada',
        pl: plB,
        sintetico: !!R.sintetico,
      },
      deltaBRL: delta,
      deltaPct: deltaPct,
      /* Sem veredito, de propósito.

         A versão anterior classificava como "aderente" quando o desvio ficava
         dentro de 0,30%. Aquela régua é a tolerância de CONTINUIDADE, que mede
         um mês contra o mês anterior da MESMA fonte. Aqui são duas fontes
         apuradas em datas diferentes por desenho, e o próprio produto já
         tropeçou nisso uma vez, quando a aba de inteligência mostrou o
         patrimônio diário embaixo do mensal e pareceu erro.

         Aplicar a régua errada produz duas mentiras simétricas: chamar de
         aderente um desvio que ninguém mediu, e chamar de divergência o que é
         só diferença de data. Enquanto o dono não calibrar régua própria, a
         tela recebe o número e as duas datas, e quem conclui é o humano. */
      conclusao: (plA === null) ? 'sem-extrato-mensal' : 'sem-regua-calibrada',
      regua: null,
      periodosDiferentes: (R.data || '').slice(0, 7) !== month,
      diasEntreApuracoes: diasEntre(R.data, ultimoDiaDoMes(month)),
    });
  }

  /* ==========================================================
     HISTÓRICO DE VERIFICAÇÃO POR CARTEIRA
     ==========================================================
     Um mês por linha: patrimônio, custo, divergência e o status que a
     verificação atribuiu. É a série que responde "isso é recorrente ou foi
     desta vez?". */
  function historicoVerificacao(code, ateMes) {
    var d = D();
    if (!d) return [];
    var p = d.CATALOG.find(function (x) { return x.code === code; });
    var inception = (p && p.inception) || d.MONTHS[0];
    var limite = d.MONTHS.indexOf(ateMes) >= 0 ? ateMes : d.CURRENT_MONTH;

    return d.MONTHS.filter(function (m) { return m >= inception && m <= limite; }).map(function (m) {
      var row = d.getRow(code, m);
      var semDado = !row || num(row.plCurr) <= 0;
      /* Mesma função que o ranking usa. Duas contas para o mesmo número foi o
         que escreveu "-R$ 0,00" nesta tabela. */
      var div = semDado ? { brl: null, abs: 0, pct: 0, material: false } : divergenciaDe(row);
      return {
        month: m,
        label: d.MONTH_LABELS[d.MONTHS.indexOf(m)] || m,
        semDado: semDado,
        status: semDado ? 'SEM DADO' : row.status,
        pl: semDado ? null : num(row.plCurr),
        plAnterior: semDado ? null : num(row.plPrev),
        plEsperado: semDado ? null : num(row.plEsperado),
        rent: semDado ? null : num(row.rent),
        cdi: semDado ? null : num(row.cdi),
        divergenciaBRL: div.brl,
        divergenciaAbsBRL: div.abs,
        divergenciaPct: div.pct,
        material: div.material,
        nAchados: semDado ? 0 : num(row.nAchados),
        custoBRL: semDado ? 0 : num(row.totalCost),
        custoPct: semDado ? 0 : num(row.totalCostPct),
      };
    });
  }

  window.AtlasConsolidado = {
    MATERIALIDADE_PCT: MATERIALIDADE_PCT,
    divergenciaDe: divergenciaDe,
    PESO_STATUS: PESO_STATUS,
    PESO_SEVERIDADE: PESO_SEVERIDADE,
    CRITERIOS: Object.keys(CRITERIOS),
    intelDaCarteira: intelDaCarteira,
    intelDisponivel: intelDisponivel,
    dataApuracaoIntel: dataApuracaoIntel,
    clienteAtual: clienteAtual,
    pendenciasOrigem: pendenciasOrigem,
    pendenciasPorCarteira: pendenciasPorCarteira,
    acaoDaCarteira: acaoDaCarteira,
    statusAcao: statusAcao,
    GATILHO_ACAO: GATILHO_ACAO.map(function (g) { return g.chave; }),
    instituicoes: instituicoes,
    linhaCriticidade: linhaCriticidade,
    rankingCarteiras: rankingCarteiras,
    resumoCasa: resumoCasa,
    eventosDoAtivo: eventosDoAtivo,
    rastrearAtivo: rastrearAtivo,
    compararCarteira: compararCarteira,
    fontesDaCarteira: fontesDaCarteira,
    historicoVerificacao: historicoVerificacao,
  };
})();
