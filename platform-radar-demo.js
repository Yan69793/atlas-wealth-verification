/* platform-radar-demo.js — casca do fallback sintético de window.ATLAS_RADAR_DATA.

   ESTE ARQUIVO NÃO CARREGA MAIS CARTEIRA, nem sequer por comentário. Até
   2026-09-10 ele trazia o instantâneo do radar do motor para seis carteiras do
   pool, e ele é importado pelo src/main.jsx, então viajava inteiro no bundle. O
   gestor atribuído a uma só carteira abria o Radar de Carteiras e via as outras
   cinco, com sinal, emissor e valor.

   Agora o conteúdo vem pelo GET /api/dados, recortado por papel, e quem aplica
   é `AtlasData.hidratarDoServidor()`. Saíram daqui as listas por carteira
   (carteiras, encerrados, emissores, fatores, deterioracao, cobertura,
   insights) e também o resumo da casa (`coberturaCasa`, que trazia o PL
   consolidado do escritório). Ficaram só os metadados e os limiares, que são
   parâmetro de leitura e não fato de carteira.

   A instância não passa por aqui. Lá o overlay real (platform-radar.js, LGPD,
   fora do git) popula a mesma global antes, e o `_AtlasRealData` abaixo impede
   que o sintético se sobreponha a dado de cliente.
*/
(function () {
  'use strict';
  if (window.ATLAS_RADAR_DATA) return;
  if (window._AtlasRealData) return;

  window.ATLAS_RADAR_DATA = {
    sintetico: true,
    schema: 'radar/v1',
    data: '2026-08-24',
    periodo: 'diario',
    tenantId: 'demo',
    geradoEm: null, // sintetico: sem timestamp de processamento real
    engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
    limiares: {
      coberturaAfirmaMin: 0.7,
      coberturaRessalvaMin: 0.4,
      radarConcentracaoAtivoPct: 0.3,
      radarConcentracaoEmissorPct: 0.25,
      radarConcentracaoFatorPct: 0.7,
      radarLiquidezMinPct: 0.05,
      radarVencimentoConcentradoPct: 0.15,
      radarVencimentoJanelaDias: 90,
      radarDeterioracaoPct: 0.1,
      radarDeterioracaoJanelaDias: 30,
      radarVariacaoMaterialPct: 0.2,
    },
    baseEstado: '2026-07-25',
    motivo: null,
    baseData: '2026-07-25',
    carteiras: [],
    encerrados: [],
    emissores: [],
    fatores: [],
    deterioracao: [],
    cobertura: [],
    insights: [],
  };
})();
