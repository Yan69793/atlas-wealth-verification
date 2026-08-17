/* platform-oportunidades-demo.js — fallback sintetico de window.ATLAS_OPORTUNIDADES_DATA
   Mesmo padrao do platform-historico-demo.js: so roda se o overlay real da
   instancia (platform-oportunidades.js, LGPD, gitignored) ainda nao populou
   a janela.

   As historias espelham a semana sintetica do motor (audit-engine, fixtures
   2026-08-10..14 + mensal 06) com os codigos do catalogo demo do produto:
     ALFA  -> ALPHA_01   (CDB vence e renova, LCI a 7 dias)
     BETA  -> BRAVO_FAM  (saque grande + liquidez caindo)
     GAMA  -> GAMMA_LRG  (concentracao subindo)
   Datas e valores fixos, nenhum nome real: tudo sintetico.
*/
(function () {
  'use strict';
  if (window.ATLAS_OPORTUNIDADES_DATA) return;
  /* Instancia com dado real de cliente: nao popular sintetico. O overlay real
     desta fase ainda nao tem produtor (nao existe comando `oportunidades` no
     cli-snapshot), entao aqui fica sem dado e a tela sai do menu, em vez de
     exibir carteira inventada ao lado de dado real. Ver ESTADO/ESTADO-ATUAL.md. */
  if (window._AtlasRealData) return;

  window.ATLAS_OPORTUNIDADES_DATA = {
    /* Marca o payload como sintetico. A tela e o menu recusam sintetico fora do
       modo demo, o que tambem cobre o modo `imported` (importacao acontece depois
       deste script rodar). Overlay real nao traz esta marca. */
    sintetico: true,
    oportunidades: [
      {
        id: '2026-08-12|ALPHA_01|MATURITY_APPROACHING|LCI BANCO W',
        cliente: 'ALPHA_01',
        assessor: 'AXIOM_AM',
        motivo: 'Vencimento de LCI BANCO W em 7 dias: avaliar renovação/rotação',
        volume: 50000,
        volumeEspecie: 'patrimonio',
        consequencias: [],
        prioridade: 'P2',
        prazo: '2026-08-19',
        status: 'Em andamento',
        ultimoContato: { data: '2026-08-13', canal: 'Telefone', observacao: 'Cliente pediu comparativo de taxas.' },
        proximoContato: '2026-08-17',
        observacao: '',
        resultado: null,
        origem: { tipo: 'evento', id: '2026-08-12|ALPHA_01|MATURITY_APPROACHING|LCI BANCO W', periodo: '2026-08-12' },
        createdAt: '2026-08-12T12:00:00Z',
        updatedAt: '2026-08-13T12:00:00Z',
      },
      {
        /* O saque e a causa raiz: a queda de liquidez do mesmo dia na mesma
           carteira e consequencia dele, e antes entrava como segunda linha da
           fila. Duas acoes comerciais para um fato so, e o indicador de volume
           somava os dois numeros. Ver PRECEDENCIA_CAUSA_RAIZ no motor. */
        id: '2026-08-13|BRAVO_FAM|LARGE_WITHDRAWAL|',
        cliente: 'BRAVO_FAM',
        assessor: 'AXIOM_AM',
        motivo: 'Saque grande detectado: alinhar reposição de caixa (no mesmo movimento: liquidez caiu)',
        volume: 200000,
        volumeEspecie: 'patrimonio',
        consequencias: [{ tipo: 'CASH_DECREASE', ativo: null }],
        prioridade: 'P1',
        prazo: '2026-08-20',
        status: 'Nova',
        ultimoContato: null,
        proximoContato: null,
        observacao: '',
        resultado: null,
        origem: { tipo: 'evento', id: '2026-08-13|BRAVO_FAM|LARGE_WITHDRAWAL|', periodo: '2026-08-13' },
        createdAt: '2026-08-13T12:00:00Z',
        updatedAt: '2026-08-13T12:00:00Z',
      },
      {
        id: '2026-08-14|GAMMA_LRG|CONCENTRATION_INCREASE|',
        cliente: 'GAMMA_LRG',
        assessor: 'BEACON_WM',
        motivo: 'Concentração subiu: conversar sobre diversificação',
        volume: 320000,
        volumeEspecie: 'patrimonio',
        consequencias: [],
        prioridade: 'P1',
        prazo: '2026-09-13',
        status: 'Nova',
        ultimoContato: null,
        proximoContato: null,
        observacao: '',
        resultado: null,
        origem: { tipo: 'evento', id: '2026-08-14|GAMMA_LRG|CONCENTRATION_INCREASE|', periodo: '2026-08-14' },
        createdAt: '2026-08-14T12:00:00Z',
        updatedAt: '2026-08-14T12:00:00Z',
      },
      {
        id: '2026-08-12|ALPHA_01|POSITION_CLOSED|CDB BANCO FICTICIO',
        cliente: 'ALPHA_01',
        assessor: 'AXIOM_AM',
        motivo: 'Posição encerrada (CDB BANCO FICTICIO): discutir reinvestimento',
        volume: 40000,
        volumeEspecie: 'patrimonio',
        consequencias: [],
        prioridade: 'P3',
        prazo: '2026-09-11',
        status: 'Contatar',
        ultimoContato: { data: '2026-08-13', canal: 'WhatsApp', observacao: 'Respondeu, quer agenda na próxima semana.' },
        proximoContato: '2026-08-18',
        observacao: '',
        resultado: null,
        origem: { tipo: 'evento', id: '2026-08-12|ALPHA_01|POSITION_CLOSED|CDB BANCO FICTICIO', periodo: '2026-08-12' },
        createdAt: '2026-08-12T12:00:00Z',
        updatedAt: '2026-08-13T12:00:00Z',
      },
      {
        id: '2026-06|JOIA_FAM|MATURITY_APPROACHING|LCI MENSAL NOVA',
        cliente: 'JOIA_FAM',
        assessor: 'BEACON_WM',
        motivo: 'Vencimento de LCI MENSAL NOVA em 30 dias: avaliar renovação/rotação',
        volume: 80000,
        volumeEspecie: 'patrimonio',
        consequencias: [],
        prioridade: 'P2',
        prazo: '2026-07-30',
        status: 'Convertida',
        ultimoContato: { data: '2026-07-10', canal: 'Reunião', observacao: 'Aceitou a proposta de renovação.' },
        proximoContato: null,
        observacao: '',
        resultado: 'Renovação fechada em 2026-07-12, taxa mantida.',
        origem: { tipo: 'evento', id: '2026-06|JOIA_FAM|MATURITY_APPROACHING|LCI MENSAL NOVA', periodo: '2026-06' },
        createdAt: '2026-06-30T12:00:00Z',
        updatedAt: '2026-07-12T12:00:00Z',
      },
      {
        id: '2026-08-13|KAPPA_PV|CASH_DECREASE|',
        cliente: 'KAPPA_PV',
        assessor: 'BEACON_WM',
        motivo: 'Liquidez caiu: avaliar necessidade de aporte de caixa',
        volume: 65000,
        volumeEspecie: 'patrimonio',
        consequencias: [],
        prioridade: 'P2',
        prazo: '2026-08-31',
        status: 'Descartada',
        ultimoContato: { data: '2026-08-14', canal: 'Telefone', observacao: 'Prefere manter o caixa atual.' },
        proximoContato: null,
        observacao: '',
        resultado: 'Sem interesse no momento.',
        origem: { tipo: 'evento', id: '2026-08-13|KAPPA_PV|CASH_DECREASE|', periodo: '2026-08-13' },
        createdAt: '2026-08-13T12:00:00Z',
        updatedAt: '2026-08-14T12:00:00Z',
      },
    ],
    geradoEm: null, // sintetico: sem timestamp de processamento real
  };
})();
