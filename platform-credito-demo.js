/* platform-credito-demo.js — casca do fallback sintético de
   window.ATLAS_CREDITO_DATA.

   ESTE ARQUIVO NÃO CARREGA MAIS CARTEIRA, nem sequer por comentário. Até
   2026-09-10 ele trazia os eventos de crédito cruzados com seis carteiras do
   pool, e é importado pelo src/main.jsx, então viajava inteiro no bundle. Quem
   tinha escopo de uma carteira abria Eventos de Crédito e via as outras cinco,
   cada uma com emissor, exposição e texto de afirmação.

   Agora o conteúdo vem pelo GET /api/dados, recortado por papel, e quem aplica
   é `AtlasData.hidratarDoServidor()`. Saíram daqui as listas por carteira
   (impactos, encerrados, insights) e as contagens da casa. Ficaram só os
   metadados e os limiares, que são parâmetro de leitura.

   A instância não passa por aqui. Lá o overlay real (platform-credito.js,
   LGPD, fora do git) popula a mesma global antes, e o `_AtlasRealData` abaixo
   impede que o sintético se sobreponha a dado de cliente.
*/
(function () {
  'use strict';
  if (window.ATLAS_CREDITO_DATA) return;
  if (window._AtlasRealData) return;

  window.ATLAS_CREDITO_DATA = {
    sintetico: true,
    schema: 'credito/v1',
    data: '2026-08-24',
    periodo: 'diario',
    tenantId: 'demo',
    geradoEm: null, // sintetico: sem timestamp de processamento real
    engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
    baseData: '2026-07-25',
    fonteEventos: 'radar-de-credito-ficticio',
    limiares: {
      creditoPerdaConfirmada: { altaMin: 0.1, mediaMin: 0.02 },
      creditoPerdaConfirmadaMinAbs: 250000,
      creditoPisoExposicao: { perdaConfirmada: 0, sinalizacao: 0.02, observacao: 0.05 },
      creditoVariacaoMaterialPct: 0.2,
      coberturaAfirmaMin: 0.7,
      coberturaRessalvaMin: 0.4,
      severidade: { baixaMax: 0.1, mediaMax: 0.3 },
    },
    impactos: [],
    encerrados: [],
    insights: [],
  };
})();
