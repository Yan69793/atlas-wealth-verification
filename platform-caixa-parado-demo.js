/* platform-caixa-parado-demo.js — fallback sintetico de window.ATLAS_CAIXA_PARADO_DATA
   Mesmo padrao dos demais fallbacks: so roda se o overlay real da instancia
   (platform-caixa-parado.js, LGPD, gitignored) ainda nao populou a janela.

   Carteiras do catalogo demo do produto, valores e datas fixos, tudo
   ficticio. Fatos de liquidez (R$, % do PL, dias), sem julgamento de
   qualidade: a decisao sobre o caixa e do assessor.
*/
(function () {
  'use strict';
  if (window.ATLAS_CAIXA_PARADO_DATA) return;

  window.ATLAS_CAIXA_PARADO_DATA = {
    data: '2026-08-14',
    janelaDias: 90,
    limiares: { caixaParadoMinPct: 0.10, caixaParadoMinDias: 7 },
    motivo: null,
    itens: [
      {
        carteira: 'ALPHA_01',
        liquidezAtual: 250000,
        pctPlAtual: 0.125,
        diasParado: 9,
        rsDias: 2250000,
        rsDiasSequencia: 2100000,
        pico: 300000,
        inicioSequencia: '2026-08-06',
      },
      {
        carteira: 'KAPPA_PV',
        liquidezAtual: 180000,
        pctPlAtual: 0.12,
        diasParado: 15,
        rsDias: 2700000,
        rsDiasSequencia: 2520000,
        pico: 210000,
        inicioSequencia: '2026-07-31',
      },
      {
        carteira: 'BRAVO_FAM',
        liquidezAtual: 320000,
        pctPlAtual: 0.123,
        diasParado: 30,
        rsDias: 9600000,
        rsDiasSequencia: 9400000,
        pico: 380000,
        inicioSequencia: '2026-07-16',
      },
      {
        carteira: 'GAMMA_LRG',
        liquidezAtual: 410000,
        pctPlAtual: 0.14,
        diasParado: 45,
        rsDias: 18450000,
        rsDiasSequencia: 18300000,
        pico: 410000,
        inicioSequencia: '2026-07-01',
      },
    ],
    geradoEm: null, // sintetico: sem timestamp de processamento real
  };
})();
