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

  /** Um único ativo >= 30% do PL. Calibrado sobre 37 meses de dado real em
      2026-08-24 (docs/calibracao-limiares-2026-08.md): o valor antigo (20%)
      ficava ABAIXO de severidade.mediaMax (30%), então disparar já garantia
      "alta" — 2.758 alertas, nenhum "baixa". 30% corta o volume medido de
      74,5 para 56,7 alertas/mês. Como o novo valor agora EMPATA com
      mediaMax, a severidade deste sinal deixou de usar a fração bruta: passa
      a medir o EXCESSO sobre o próprio limiar (ver cross-portfolio.ts), a
      mesma lógica que LIQUIDEZ_BAIXA já usa para o déficit. */
  radarConcentracaoAtivoPct: 0.30,

  /** Um único emissor >= 25% do PL, somando ativos de nomes diferentes.
      Calibrado em 2026-08-24: o valor antigo (15%) misturava risco de
      crédito com concentração em veículo — 70% dos 4.795 alertas medidos
      eram fundo de caixa, não emissor de crédito. 25%, mais a exclusão da
      classe liquidez do alarme (ver cross-portfolio.ts), corta o volume
      medido de 129,6 para cerca de 22 alertas/mês. */
  radarConcentracaoEmissorPct: 0.25,

  /** Um único fator (indexador, moeda, região ou classe) >= 70% do PL.
      Calibrado em 2026-08-24: o valor antigo (50%) já ficava ACIMA de
      severidade.mediaMax (30%), então TODO alerta saía "alta" por
      construção — 2.974 de 2.974 medidos, nenhum "média", nenhum "baixa",
      77% deles era classe=liquidez. 70%, mais a exclusão de liquidez (mesmo
      mecanismo do FATOR_BASE) e a severidade relativa ao limiar (ver
      cross-portfolio.ts), corta o volume medido de 80,4 para cerca de 18
      alertas/mês. */
  radarConcentracaoFatorPct: 0.70,

  /** Liquidez ABAIXO de 5% do PL. Espelho invertido de caixaParadoMinPct
      (10%): lá o problema é dinheiro sobrando, aqui é dinheiro faltando.
      Medido e MANTIDO em 2026-08-24: o volume (3,3 alertas/mês) já estava
      bom; a severidade satura em "alta" (120 de 122 casos medidos) e segue
      como problema aberto, sem fórmula de correção medida ainda. */
  radarLiquidezMinPct: 0.05,

  /** >= 15% do PL vencendo dentro da janela de vencimento concentrado.
      Calibrado em 2026-08-24: com o valor antigo (20%/30 dias) o sinal
      quase não disparava, 14 alertas em 37 meses, silencioso em 26 desses
      37 — a JANELA era o gargalo, não o percentual. */
  radarVencimentoConcentradoPct: 0.15,

  /** Janela do vencimento concentrado, em dias corridos. Calibrada em
      2026-08-24: 90 dias (medido em 1,4 alerta/mês, contra 0,4 com a janela
      antiga de 30) — mesmo horizonte de caixaParadoJanelaDias e o máximo de
      maturidadeJanelas, o prazo em que dá para reinvestir com calma. */
  radarVencimentoJanelaDias: 90,

  /** Queda de PL >= 10% contra o snapshot de comparação. Mesmo valor de
      saqueGrandePct, e de propósito: a queda de um dia e a deterioração do mês
      medem a mesma coisa em horizontes diferentes. */
  radarDeterioracaoPct: 0.10,

  /** Horizonte da deterioração, em dias corridos. Lê o snapshot mais próximo
      de ref − 30 dias dentro da série, não o de exatamente 30 dias atrás, que
      cai em fim de semana em dois de cada sete casos. */
  radarDeterioracaoJanelaDias: 30,

  /** Variação relativa do sinal que separa "agravado"/"melhorado" de
      "acompanhamento" no radar. Mesmo papel e mesmo valor do equivalente do
      crédito, e o valor NÃO é chute: a calibração de 2026-08-24 mediu 36.897
      comparações de exposição entre meses consecutivos no dado real da casa e
      achou 84,3% variando menos de 5% e só 6,4% passando de 20%. Com 20%,
      `acompanhamento` é o estado dominante e `agravado` fica reservado para
      movimento de verdade. Um corte mais baixo faria todo sinal trocar de
      estado todo mês, que é o mesmo que não ter estado. */
  radarVariacaoMaterialPct: 0.20,

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
      R$ 300 mil que o assessor precisa explicar. Mesma lógica de
      saqueGrandePct + saqueGrandeMinAbs (piso + percentual combinados),
      valor próprio a partir de 2026-08-24: medido sobre 37 meses de dado
      real, R$ 50 mil promovia 389 de 1.177 pares emissor-carteira, um terço
      de toda a casa — abaixo do ruído do livro (mediana de exposição por
      par: R$ 232 mil). R$ 250 mil promove 115. */
  creditoPerdaConfirmadaMinAbs: 250_000,

  /** Piso de exposição por classe de evento, em fração do PL. O que é ruído
      num rebaixamento é informação obrigatória num calote.
      - perdaConfirmada: SEM piso. Qualquer exposição a um calote é reportada.
      - sinalizacao: rebaixamento, atraso, covenant, suspensão e tipo não
        reconhecido. Tipo que o motor não entendeu não é evidência de que o
        evento seja pequeno, então cai no piso mais baixo, que reporta mais.
      - observacao: notícia negativa. Piso maior porque é o tipo com mais
        volume e menos consequência direta.
      Valores calibrados em 2026-08-24 sobre dado real: os antigos (0,5%/1%)
      não filtravam quase nada, deixavam passar 91%/80% dos pares medidos —
      a mediana de exposição por par (2,52% do PL) já estava uma ordem de
      grandeza acima dos dois pisos antigos. 2%/5% corta para 59%/32%. */
  creditoPisoExposicao: { perdaConfirmada: 0, sinalizacao: 0.02, observacao: 0.05 },

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
