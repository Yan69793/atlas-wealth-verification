/* platform-oportunidades-demo.js — casca do fallback sintético de
   window.ATLAS_OPORTUNIDADES_DATA.

   ESTE ARQUIVO NÃO CARREGA MAIS CARTEIRA, nem sequer por comentário. Até
   2026-09-10 ele trazia as histórias sintéticas de cinco carteiras do pool
   escritas aqui dentro. Como ele é importado pelo src/main.jsx, viajava inteiro
   no bundle, e um gestor atribuído a uma só carteira abria esta tela e via as
   outras quatro, que o /api/dados tinha acabado de recusar entregar. O escopo
   por papel não alcançava o arquivo.

   Agora o conteúdo do demo vem pelo GET /api/dados, recortado por organização,
   por atribuição e por papel, e quem aplica é `AtlasData.hidratarDoServidor()`.
   A casca existe por dois motivos: a global precisa existir antes da resposta,
   e `faseDisponivel()` em platform-app.jsx decide se a tela entra no menu
   olhando `payload.sintetico` no modo demo.

   A instância não passa por aqui. Lá o overlay real (platform-oportunidades.js,
   LGPD, fora do git) popula a mesma global antes, e o `_AtlasRealData` abaixo
   impede que o sintético se sobreponha a dado de cliente.
*/
(function () {
  'use strict';
  if (window.ATLAS_OPORTUNIDADES_DATA) return;
  if (window._AtlasRealData) return;

  window.ATLAS_OPORTUNIDADES_DATA = {
    sintetico: true,
    oportunidades: [],
    geradoEm: null, // sintetico: sem timestamp de processamento real
  };
})();
