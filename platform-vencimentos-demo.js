/* platform-vencimentos-demo.js — fallback sintetico de window.ATLAS_VENCIMENTOS_DATA
   Mesmo padrao dos demais fallbacks: so roda se o overlay real da instancia
   (platform-vencimentos.js, LGPD, gitignored) ainda nao populou a janela.

   Historias espelhando a semana sintetica do motor, com os codigos do catalogo
   demo do produto. Datas, valores e nomes fixos, tudo ficticio. O id de
   oportunidade segue a convencao da Fase 2, entao a linha do LCI de ALPHA_01
   casa com a oportunidade existente no demo de oportunidades.
*/
(function () {
  'use strict';
  if (window.ATLAS_VENCIMENTOS_DATA) return;
  /* Instancia com dado real: nao popular sintetico. Ver ESTADO/ESTADO-ATUAL.md. */
  if (window._AtlasRealData) return;

  window.ATLAS_VENCIMENTOS_DATA = {
    sintetico: true,
    vencimentos: [
      {
        carteira: 'ALPHA_01',
        ativo: 'LCI BANCO W',
        instituicao: 'BANCO W',
        valor: 50000,
        pctPl: 0.05,
        vencimento: '2026-08-19',
        diasRestantes: 5,
        janelaDias: 7,
        oportunidadeId: '2026-08-12|ALPHA_01|MATURITY_APPROACHING|LCI BANCO W',
      },
      {
        carteira: 'KAPPA_PV',
        ativo: 'NTN-B',
        instituicao: 'BTG',
        valor: 80000,
        pctPl: 0.04,
        vencimento: '2026-08-22',
        diasRestantes: 8,
        janelaDias: 15,
        oportunidadeId: '2026-08-13|KAPPA_PV|MATURITY_APPROACHING|NTN-B',
      },
      {
        carteira: 'BRAVO_FAM',
        ativo: 'CDB PREFIXADO',
        instituicao: 'BANCO FICTICIO',
        valor: 120000,
        pctPl: 0.03,
        vencimento: '2026-08-29',
        diasRestantes: 15,
        janelaDias: 15,
        oportunidadeId: '2026-08-13|BRAVO_FAM|MATURITY_APPROACHING|CDB PREFIXADO',
      },
      {
        carteira: 'GAMMA_LRG',
        ativo: 'LCA',
        instituicao: 'BANCO W',
        valor: 90000,
        pctPl: 0.02,
        vencimento: '2026-09-13',
        diasRestantes: 30,
        janelaDias: 30,
        oportunidadeId: '2026-08-14|GAMMA_LRG|MATURITY_APPROACHING|LCA',
      },
      {
        carteira: 'JOIA_FAM',
        ativo: 'DEBENTURE SYNTEC',
        instituicao: 'CORRETORA SYNTH',
        valor: 65000,
        pctPl: 0.02,
        vencimento: '2026-10-12',
        diasRestantes: 59,
        janelaDias: 60,
        oportunidadeId: '2026-08-13|JOIA_FAM|MATURITY_APPROACHING|DEBENTURE SYNTEC',
      },
      {
        carteira: 'KAPPA_PV',
        ativo: 'CRI LOGISTICA SYNTH',
        instituicao: 'BTG',
        valor: 45000,
        pctPl: 0.02,
        vencimento: '2026-11-12',
        diasRestantes: 90,
        janelaDias: 90,
        oportunidadeId: '2026-08-13|KAPPA_PV|MATURITY_APPROACHING|CRI LOGISTICA SYNTH',
      },
    ],
    geradoEm: null, // sintetico: sem timestamp de processamento real
  };
})();
