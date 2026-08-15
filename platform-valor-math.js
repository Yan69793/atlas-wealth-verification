/* platform-valor-math.js — matematica pura da Fase 6 (Valor do assessor).
   Sem dependencias, sem globals alem do proprio registro: o mesmo molde de
   platform-parsers.js. Consumido pela pagina (window.AtlasValorMath) e pelos
   testes do contrato (module.exports, roda em Node).

   Convencoes: retornos e taxas em decimal (0.01 = 1%). Mes sem taxa na serie
   vira fator 1 (nao inventa retorno). Funcoes puras e deterministicas.
*/
(function () {
  'use strict';

  // Produtorio (1+t) - 1. Entradas null/undefined/nao-finitas viram fator 1.
  function acumularSerie(taxasMensais) {
    var acc = 1;
    for (var i = 0; i < taxasMensais.length; i++) {
      var t = taxasMensais[i];
      if (typeof t === 'number' && isFinite(t)) acc *= 1 + t;
    }
    return acc - 1;
  }

  // Retorno liquido do mes: (1+rent) x (1-costPct) - 1.
  function retornoLiquidoMensal(rent, costPct) {
    var r = typeof rent === 'number' && isFinite(rent) ? rent : 0;
    var c = typeof costPct === 'number' && isFinite(costPct) ? costPct : 0;
    return (1 + r) * (1 - c) - 1;
  }

  // Custo da inacao: R$-dias parados x CDI mensal / 30 (mes de 30 dias).
  // CDI ausente, nao-finito ou zero devolve 0: sem taxa, sem inventar renda.
  function custoInacao(rsDias, cdiMensal) {
    var d = typeof rsDias === 'number' && isFinite(rsDias) ? rsDias : 0;
    var c = typeof cdiMensal === 'number' && isFinite(cdiMensal) && cdiMensal > 0 ? cdiMensal : 0;
    return d * (c / 30);
  }

  // Valor em reais do excesso: deltaPp x PL final (aproximacao declarada).
  function valorEmReais(deltaPp, plFinal) {
    var d = typeof deltaPp === 'number' && isFinite(deltaPp) ? deltaPp : 0;
    var pl = typeof plFinal === 'number' && isFinite(plFinal) ? plFinal : 0;
    return d * pl;
  }

  // Ultimos N meses da serie ordenada terminando em dataFim.
  // N null/undefined ou maior que a serie = serie completa ('desde o inicio').
  // N <= 0 ou dataFim fora da serie = [].
  function janelaMeses(serie, dataFim, N) {
    var fim = serie.lastIndexOf(dataFim);
    if (fim < 0) return [];
    if (N === null || N === undefined || N > fim + 1) return serie.slice(0, fim + 1);
    if (N <= 0) return [];
    return serie.slice(fim - N + 1, fim + 1);
  }

  function ppTxt(pp) {
    return (pp * 100).toFixed(1).replace('.', ',') + ' pp';
  }

  // Frase da janela do valor do assessor. Fonte única das duas telas que a
  // exibem. fmt e um formatador de moeda opcional (AtlasUtils.fmtCompactBRL);
  // sem ele, usa formatacao pura inline (o modulo segue sem globals).
  function frase(deltaPp, inacaoR$, fmt) {
    const pp = ppTxt(Math.abs(deltaPp));
    let base;
    if (deltaPp >= 0.01) base = 'Entregou +' + pp + ' acima do CDI na janela — a tese agregou.';
    else if (deltaPp >= 0) base = 'Empatou com o CDI (' + pp + ' de diferença) — dentro da margem de gestao.';
    else if (deltaPp >= -0.01) base = 'Ficou ' + pp + ' abaixo do CDI — agendar conversa sobre a tese.';
    else base = 'Deixou ' + pp + ' na mesa versus CDI — revisao de alocacao recomendada.';
    if (inacaoR$ > 0) {
      const moeda = typeof fmt === 'function'
        ? fmt(inacaoR$)
        : 'R$ ' + Math.round(inacaoR$).toLocaleString('pt-BR');
      base += ' · E ' + moeda + ' em caixa parado deixaram de render na janela.';
    }
    return base;
  }

  var API = {
    acumularSerie: acumularSerie,
    retornoLiquidoMensal: retornoLiquidoMensal,
    custoInacao: custoInacao,
    valorEmReais: valorEmReais,
    janelaMeses: janelaMeses,
    frase: frase,
  };
  if (typeof window !== 'undefined') window.AtlasValorMath = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
