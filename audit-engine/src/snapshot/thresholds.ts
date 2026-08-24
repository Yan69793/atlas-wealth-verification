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

  /** Intervalo máximo entre dois snapshots consecutivos para que a sequência de
      "parado" continue valendo. Arquivo diário de custódia pula fim de semana e
      feriado, então 1 dia é o normal, sexta→segunda dá 3 e feriado colado dá 4.
      Acima disso a série tem buraco de verdade e continuidade não se sustenta:
      antes a contagem andava para trás sem olhar o intervalo, então dois
      snapshots a 16 dias de distância viravam "17 dias parado" com chip
      vermelho. Uma semana de férias do operador enchia a lista de número
      inventado. */
  caixaParadoMaxIntervaloDias: 4,

  /* ── Camada de inteligência (2026-08-24) ──────────────────────────────────
     Cobertura: fração do PL da carteira com o atributo preenchido. Decisão do
     dono em 2026-08-24: acima de 70% o motor afirma, entre 40% e 70% afirma
     com ressalva na tela, abaixo de 40% não conclui e só mostra a cobertura.
     Sem isto, "esta carteira não tem exposição a câmbio" é indistinguível de
     "não sei classificar 60% desta carteira". */
  coberturaAfirmaMin: 0.70,
  coberturaRessalvaMin: 0.40,

  /** Um único ativo >= 20% do PL. Acima do limiar de posição nova (3%) por
      ordem de grandeza: 3% é movimento que redefine a carteira, 20% é
      concentração que sobrevive à rotação. */
  radarConcentracaoAtivoPct: 0.20,

  /** Um único emissor >= 15% do PL, somando ativos de nomes diferentes. Mais
      estrito que o de ativo porque é justamente o risco que não aparece na
      tela de posições: três papéis distintos do mesmo banco. */
  radarConcentracaoEmissorPct: 0.15,

  /** Um único fator (indexador, moeda ou região) >= 50% do PL. É o caso da
      carteira que parece diversificada em ativo e está inteira no mesmo
      indexador. Metade do PL é o ponto em que o fator manda na carteira. */
  radarConcentracaoFatorPct: 0.50,

  /** Liquidez ABAIXO de 5% do PL. Espelho invertido de caixaParadoMinPct
      (10%): lá o problema é dinheiro sobrando, aqui é dinheiro faltando. */
  radarLiquidezMinPct: 0.05,

  /** >= 20% do PL vencendo dentro da janela de vencimento concentrado. */
  radarVencimentoConcentradoPct: 0.20,

  /** Janela do vencimento concentrado, em dias corridos. Igual à janela de 30
      de maturidadeJanelas: é o horizonte em que dá para reinvestir com calma. */
  radarVencimentoJanelaDias: 30,

  /** Queda de PL >= 10% contra o snapshot de comparação. Mesmo valor de
      saqueGrandePct, e de propósito: a queda de um dia e a deterioração do mês
      medem a mesma coisa em horizontes diferentes. */
  radarDeterioracaoPct: 0.10,

  /** Horizonte da deterioração, em dias corridos. Lê o snapshot mais próximo
      de ref − 30 dias dentro da série, não o de exatamente 30 dias atrás, que
      cai em fim de semana em dois de cada sete casos. */
  radarDeterioracaoJanelaDias: 30,

  /* ── Eventos de crédito (Entrega B, 2026-08-24) ───────────────────────────
     Perda confirmada e sinalização de risco não se medem na mesma régua.
     Num calote o dinheiro já foi; num rebaixamento nada foi perdido ainda.
     Por isso são duas escadas e três pisos, e não um limiar só. */

  /** Escada de impacto de PERDA CONFIRMADA (default, recuperação judicial).
      Mais sensível que os cortes genéricos de `severidade` de propósito:
      10% do PL já é alto aqui, contra 30% no resto do motor.
      Abaixo de mediaMin a decisão é do piso absoluto, ver
      creditoPerdaConfirmadaMinAbs. */
  creditoPerdaConfirmada: { altaMin: 0.10, mediaMin: 0.02 },

  /** Piso em REAIS que promove uma perda confirmada pequena de baixa para
      média. Percentual sozinho silencia caso que importa: um calote de
      R$ 300 mil numa carteira de R$ 20 mi é 1,5% do PL e continua sendo
      R$ 300 mil que o assessor precisa explicar. Mesmo valor e mesma lógica
      de saqueGrandePct + saqueGrandeMinAbs, que já combina os dois. */
  creditoPerdaConfirmadaMinAbs: 50_000,

  /** Piso de exposição por classe de evento, em fração do PL. O que é ruído
      num rebaixamento é informação obrigatória num calote.
      - perdaConfirmada: SEM piso. Qualquer exposição a um calote é reportada.
      - sinalizacao: rebaixamento, atraso, covenant, suspensão e tipo não
        reconhecido. Tipo que o motor não entendeu não é evidência de que o
        evento seja pequeno, então cai no piso mais baixo, que reporta mais.
      - observacao: notícia negativa. Piso maior porque é o tipo com mais
        volume e menos consequência direta. */
  creditoPisoExposicao: { perdaConfirmada: 0, sinalizacao: 0.005, observacao: 0.01 },

  /** Variação relativa da exposição que separa "agravado"/"melhorado" de
      "acompanhamento". Abaixo disso é oscilação de marcação a mercado, não
      movimento do assessor, e marcar como agravado encheria a tela de
      mudança que ninguém fez. */
  creditoVariacaoMaterialPct: 0.20,

  /** REVENUE_DROP: queda >= 5% da receita mensal da carteira (receita =
      PL x taxa anual / 12, taxa-map da instancia no normalize mensal).
      Percentual puro por decisao do dono (2026-08-14): sem piso absoluto —
      a receita e proporcional ao PL, piso nominal excluiria carteiras
      pequenas. */
  revenueDropPct: 0.05,
} as const;
