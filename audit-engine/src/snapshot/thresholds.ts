/**
 * src/snapshot/thresholds.ts — thresholds únicos e documentados do diff diário.
 *
 * Defaults conservadores de propósito: na estreia, ruído zero é melhor que
 * ruído alto. O dono confirma os valores antes de estrear na instância.
 * Todas as comparações do diff usam >= (consistente com rules/alocacao.ts).
 */

/** Classes tratadas como liquidez/caixa. Match normalizado (lower-case sem acento). */
export const CASH_CLASSES = ['liquidez', 'caixa', 'disponibilidades', 'disponivel'];

export const THRESHOLDS = {
  /** >= 5% do plTotal da carteira em movimento de liquidez → CASH_INCREASE/CASH_DECREASE */
  cashMovimentoPct: 0.05,

  /** NEW_POSITION: posição nova que representa >= 3% do plTotal da carteira.
      Percentual por decisão do dono (2026-08-14): o piso nominal antigo
      (R$ 5.000) disparava 329 eventos por mês no dado real de maio→junho,
      a maioria rotação rotineira. 3% pega o movimento que redefine a carteira. */
  novaPosicaoMinPct: 0.03,

  /** POSITION_CLOSED: posição encerrada que valia >= 3% do plTotal em D-1 */
  posicaoEncerradaMinPct: 0.03,

  /** Janelas de vencimento em dias corridos, inclusivas (7 exatos = janela 7) */
  maturidadeJanelas: [7, 15, 30, 60, 90],

  /** LARGE_WITHDRAWAL: queda de plTotal >= 10% num dia... */
  saqueGrandePct: 0.10,

  /** ...E queda absoluta >= R$ 50.000 (evita alerta em carteira pequena) */
  saqueGrandeMinAbs: 50_000,

  /** ALLOCATION_SHIFT: variação de participação de classe >= 5 pp (espelha ALOC_THRESHOLD) */
  alocacaoShiftPp: 0.05,

  /** CONCENTRATION_INCREASE: variação >= 5 pp no maior ativo... */
  concentracaoShiftPp: 0.05,

  /** ...E nível pós-movimento >= 30% do plTotal */
  concentracaoNivelMin: 0.30,

  /** Severidade por materialidade: [0, baixaMax) baixa, [baixaMax, mediaMax) media, >= mediaMax alta */
  severidade: { baixaMax: 0.10, mediaMax: 0.30 },

  /** Caixa parado (Fase 4): liquidez >= 10% do PL do dia conta como parada.
      Mais estrito que cashMovimentoPct (5%): movimento é evento de um dia;
      "parado" sustenta lista contínua, ruído custa mais. PL de R$ 1M →
      R$ 100k parados, material e acionável. */
  caixaParadoMinPct: 0.10,

  /** Entra na lista se parado há >= 7 dias corridos: uma semana filtra
      fim de semana e variação de fluxo corriqueira. */
  caixaParadoMinDias: 7,

  /** Janela de análise: 90 dias corridos (mesmo horizonte máximo de
      maturidadeJanelas; um trimestre é o horizonte natural de dinheiro
      parado). */
  caixaParadoJanelaDias: 90,

  /** Reservado Fase 5 — regra desativada nesta fase (constante documentada, não usada) */
  revenueDropPct: 0.05,
} as const;
