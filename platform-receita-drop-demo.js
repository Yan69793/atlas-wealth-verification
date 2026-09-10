/* platform-receita-drop-demo.js — casca do fallback sintético de
   window.ATLAS_RECEITA_DROP_DATA.

   ESTE ARQUIVO NÃO CARREGA MAIS RECEITA POR CARTEIRA, pelo mesmo motivo do
   platform-oportunidades-demo.js, e aqui o caso é o mais sensível dos seis:
   esta é a receita da casa por carteira. Ela viajava no bundle, então qualquer
   perfil conseguia ler a receita das carteiras que o escopo dele recusava.

   Quem entrega agora é o GET /api/dados, já recortado por papel, e quem aplica
   é `AtlasData.hidratarDoServidor()`. O cliente não recebe nenhuma linha, nem
   vazia: a tela dele não tem receita da casa por decisão de produto.

   A instância não passa por aqui. Lá o overlay real (platform-receita-drop.js,
   LGPD, fora do git) popula a mesma global antes, e o `_AtlasRealData` abaixo
   impede que o sintético se sobreponha a dado de cliente.
*/
(function () {
  'use strict';
  if (window.ATLAS_RECEITA_DROP_DATA) return;
  if (window._AtlasRealData) return;

  window.ATLAS_RECEITA_DROP_DATA = {
    sintetico: true,
    data: '2026-06',
    baseData: '2026-05',
    itens: [],
    geradoEm: null, // sintetico: sem timestamp de processamento real
  };
})();
