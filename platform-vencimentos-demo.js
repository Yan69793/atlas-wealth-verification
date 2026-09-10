/* platform-vencimentos-demo.js — casca do fallback sintético de
   window.ATLAS_VENCIMENTOS_DATA.

   ESTE ARQUIVO NÃO CARREGA MAIS CARTEIRA, pelo mesmo motivo do
   platform-oportunidades-demo.js: o conteúdo por carteira viajava no bundle e
   escapava do escopo por papel. Quem entrega agora é o GET /api/dados, já
   recortado, e quem aplica é `AtlasData.hidratarDoServidor()`.

   A instância não passa por aqui. Lá o overlay real (platform-vencimentos.js,
   LGPD, fora do git) popula a mesma global antes, e o `_AtlasRealData` abaixo
   impede que o sintético se sobreponha a dado de cliente.
*/
(function () {
  'use strict';
  if (window.ATLAS_VENCIMENTOS_DATA) return;
  if (window._AtlasRealData) return;

  window.ATLAS_VENCIMENTOS_DATA = {
    sintetico: true,
    vencimentos: [],
    geradoEm: null, // sintetico: sem timestamp de processamento real
  };
})();
