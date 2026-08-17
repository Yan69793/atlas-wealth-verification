/* platform-receita-drop-demo.js — fallback sintetico de window.ATLAS_RECEITA_DROP_DATA
   Mesmo padrao dos demais fallbacks: so roda se o overlay real da instancia
   (platform-receita-drop.js, LGPD, gitignored) ainda nao populou a janela.

   Separacao das tres receitas (decisao do dono, 2026-08-14): aqui e a receita
   da casa por carteira (PL x taxa anual / 12). A receita do gerente e a soma
   das carteiras dele (corte na tela) e a receita do cliente e rentabilidade,
   outra metrica, fora deste evento. Carteiras do catalogo demo, valores fixos,
   tudo ficticio.
*/
(function () {
  'use strict';
  if (window.ATLAS_RECEITA_DROP_DATA) return;
  /* Instancia com dado real: nao popular sintetico. Ver ESTADO/ESTADO-ATUAL.md. */
  if (window._AtlasRealData) return;

  window.ATLAS_RECEITA_DROP_DATA = {
    sintetico: true,
    data: '2026-06',
    baseData: '2026-05',
    itens: [
      {
        carteira: 'ALPHA_01',
        receitaBase: 4000.00,
        receitaAtual: 3760.00,
        queda: 240.00,
        quedaPct: 0.06,
        severidade: 'baixa',
        periodo: '2026-06',
      },
      {
        carteira: 'KAPPA_PV',
        receitaBase: 2500.00,
        receitaAtual: 2200.00,
        queda: 300.00,
        quedaPct: 0.12,
        severidade: 'media',
        periodo: '2026-06',
      },
      {
        carteira: 'BRAVO_FAM',
        receitaBase: 8000.00,
        receitaAtual: 6000.00,
        queda: 2000.00,
        quedaPct: 0.25,
        severidade: 'media',
        periodo: '2026-06',
      },
      {
        carteira: 'GAMMA_LRG',
        receitaBase: 6666.67,
        receitaAtual: 4333.33,
        queda: 2333.34,
        quedaPct: 0.35,
        severidade: 'alta',
        periodo: '2026-06',
      },
    ],
    geradoEm: null, // sintetico: sem timestamp de processamento real
  };
})();
