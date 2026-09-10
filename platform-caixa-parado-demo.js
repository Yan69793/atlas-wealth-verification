/* platform-caixa-parado-demo.js — casca do fallback sintético de
   window.ATLAS_CAIXA_PARADO_DATA.

   ESTE ARQUIVO NÃO CARREGA MAIS CARTEIRA, pelo mesmo motivo do
   platform-oportunidades-demo.js: o conteúdo por carteira viajava no bundle e
   escapava do escopo por papel. Quem entrega agora é o GET /api/dados, já
   recortado, e quem aplica é `AtlasData.hidratarDoServidor()`.

   Os limiares ficam: são parâmetro de leitura, não fato de carteira, e a tela
   os usa para rotular o que chega.

   A instância não passa por aqui. Lá o overlay real (platform-caixa-parado.js,
   LGPD, fora do git) popula a mesma global antes, e o `_AtlasRealData` abaixo
   impede que o sintético se sobreponha a dado de cliente.
*/
(function () {
  'use strict';
  if (window.ATLAS_CAIXA_PARADO_DATA) return;
  if (window._AtlasRealData) return;

  window.ATLAS_CAIXA_PARADO_DATA = {
    sintetico: true,
    data: '2026-08-14',
    limiares: { caixaParadoMinPct: 0.10, caixaParadoMinDias: 7 },
    motivo: null,
    itens: [],
    geradoEm: null, // sintetico: sem timestamp de processamento real
  };
})();
