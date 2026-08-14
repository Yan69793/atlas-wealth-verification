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

  /** NEW_POSITION só para posição nova com valor >= R$ 5.000 */
  novaPosicaoMinValor: 5000,

  /** POSITION_CLOSED só para posição que valia >= R$ 5.000 em D-1 */
  posicaoEncerradaMinValor: 5000,

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

  /** Reservado Fase 5 — regra desativada nesta fase (constante documentada, não usada) */
  revenueDropPct: 0.05,
} as const;
