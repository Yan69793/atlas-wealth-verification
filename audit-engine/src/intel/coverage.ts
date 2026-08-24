/**
 * src/intel/coverage.ts — quanto do patrimônio o motor CONSEGUIU avaliar.
 *
 * Existe por causa de um modo de falha específico e caro: sem esta medida,
 * "esta carteira não tem exposição a câmbio" é indistinguível de "não sei
 * classificar 60% desta carteira". A primeira é conclusão, a segunda é buraco
 * de dado, e as duas produzem exatamente a mesma tela silenciosa.
 *
 * A revisão de agosto de 2026 encontrou doze defeitos de número com a suíte
 * verde. Todos tinham a mesma forma: a tela afirmava com confiança sobre dado
 * que não sustentava a afirmação. A cobertura é a trava estrutural contra isso.
 *
 * Regras:
 * - cobertura é medida em FRAÇÃO DO PL, não em contagem de posições. Uma
 *   carteira com 40 posições pequenas classificadas e uma posição gigante sem
 *   classificar não está 97% coberta, está mal coberta.
 * - o corte é do dono (2026-08-24): >= 70% afirma, >= 40% afirma com ressalva,
 *   abaixo disso não conclui. Os dois números vivem em thresholds.ts.
 * - PL <= 0 na carteira devolve fração 0 e faixa 'insuficiente'. Dividir por
 *   zero aqui produziria NaN, que na tela vira "—" e passa por "sem risco".
 * - pura e determinística: sem IO, sem Date.now.
 */

import { atributosDe } from '../snapshot/normalize.js';
import { THRESHOLDS } from '../snapshot/thresholds.js';
import type { AtributosAtivo, Snapshot, SnapshotCarteira } from '../snapshot/types.js';

/** O que a tela pode fazer com o resultado do motor. */
export type FaixaCobertura = 'afirma' | 'ressalva' | 'insuficiente';

/**
 * Atributos que os motores desta camada realmente consomem. `taxaContratada` e
 * `cobertoFGC` ficam de fora de propósito: são rótulo de apoio, nenhum motor
 * decide nada com eles hoje, e medir cobertura do que ninguém usa só derruba o
 * número agregado sem melhorar decisão nenhuma.
 */
export const ATRIBUTOS_MEDIDOS = [
  'classeCanonica',
  'indexador',
  'emissorId',
  'moeda',
  'regiao',
  'prazoAnos',
  'liquidezDias',
] as const;

export type AtributoMedido = (typeof ATRIBUTOS_MEDIDOS)[number];

export interface CoberturaAtributo {
  atributo: AtributoMedido;
  plCoberto: number;
  plTotal: number;
  /** 0..1; 0 quando plTotal <= 0 */
  fracao: number;
  faixa: FaixaCobertura;
}

export interface CoberturaCarteira {
  carteira: string;
  plTotal: number;
  posicoes: number;
  atributos: CoberturaAtributo[];
  /** pior faixa entre os atributos: é o teto do que a carteira permite afirmar */
  faixaGlobal: FaixaCobertura;
  /** média simples das frações; serve para ranquear buraco, não para afirmar */
  fracaoMedia: number;
}

export interface CoberturaCasa {
  plTotal: number;
  carteiras: number;
  atributos: CoberturaAtributo[];
  faixaGlobal: FaixaCobertura;
}

/** Faixa a partir da fração coberta. Único lugar que compara com os limiares. */
export function faixaDeCobertura(fracao: number): FaixaCobertura {
  if (!Number.isFinite(fracao)) return 'insuficiente';
  if (fracao >= THRESHOLDS.coberturaAfirmaMin) return 'afirma';
  if (fracao >= THRESHOLDS.coberturaRessalvaMin) return 'ressalva';
  return 'insuficiente';
}

/** Atalho de leitura: o motor pode concluir alguma coisa com esta cobertura? */
export function podeAfirmar(fracao: number): boolean {
  return faixaDeCobertura(fracao) !== 'insuficiente';
}

const ORDEM_FAIXA: Record<FaixaCobertura, number> = {
  insuficiente: 0,
  ressalva: 1,
  afirma: 2,
};

/** A pior das faixas. Vazio = 'insuficiente', porque nada medido não é permissão. */
export function piorFaixa(faixas: FaixaCobertura[]): FaixaCobertura {
  let pior: FaixaCobertura = 'afirma';
  if (!faixas.length) return 'insuficiente';
  for (const f of faixas) if (ORDEM_FAIXA[f] < ORDEM_FAIXA[pior]) pior = f;
  return pior;
}

function preenchido(a: AtributosAtivo, atributo: AtributoMedido): boolean {
  const v = a[atributo];
  // `false` em booleano e 0 em número SÃO valores conhecidos. Só null/undefined
  // é buraco. Um `!v` aqui contaria liquidezDias = 0 (D+0) como desconhecido,
  // que é o inverso da verdade: D+0 é a liquidez mais bem conhecida que existe.
  return v !== null && v !== undefined;
}

/** Cobertura de uma carteira, atributo a atributo. */
export function coberturaDaCarteira(c: SnapshotCarteira): CoberturaCarteira {
  const plTotal = c.plTotal;
  const atributos: CoberturaAtributo[] = ATRIBUTOS_MEDIDOS.map((atributo) => {
    let plCoberto = 0;
    for (const p of c.posicoes) {
      if (preenchido(atributosDe(p), atributo)) plCoberto += p.valor;
    }
    const fracao = plTotal > 0 ? plCoberto / plTotal : 0;
    return { atributo, plCoberto, plTotal, fracao, faixa: faixaDeCobertura(fracao) };
  });

  const fracaoMedia = atributos.reduce((a, x) => a + x.fracao, 0) / atributos.length;

  return {
    carteira: c.nome,
    plTotal,
    posicoes: c.posicoes.length,
    atributos,
    faixaGlobal: piorFaixa(atributos.map((a) => a.faixa)),
    fracaoMedia,
  };
}

/**
 * Cobertura de um atributo numa carteira. É o número que cada motor cola no
 * insight que produz, para a tela poder dizer "por que estou vendo isso".
 */
export function coberturaDoAtributo(c: SnapshotCarteira, atributo: AtributoMedido): number {
  if (c.plTotal <= 0) return 0;
  let plCoberto = 0;
  for (const p of c.posicoes) {
    if (preenchido(atributosDe(p), atributo)) plCoberto += p.valor;
  }
  return plCoberto / c.plTotal;
}

/**
 * Cobertura agregada da casa. Soma R$ coberto sobre R$ total de TODAS as
 * carteiras, não média das frações: uma carteira de R$ 50 mil perfeitamente
 * classificada não pode maquiar uma de R$ 50 milhões sem classificação.
 */
export function coberturaDaCasa(snap: Snapshot): CoberturaCasa {
  const plTotal = snap.carteiras.reduce((a, c) => a + c.plTotal, 0);
  const atributos: CoberturaAtributo[] = ATRIBUTOS_MEDIDOS.map((atributo) => {
    let plCoberto = 0;
    for (const c of snap.carteiras) {
      for (const p of c.posicoes) {
        if (preenchido(atributosDe(p), atributo)) plCoberto += p.valor;
      }
    }
    const fracao = plTotal > 0 ? plCoberto / plTotal : 0;
    return { atributo, plCoberto, plTotal, fracao, faixa: faixaDeCobertura(fracao) };
  });

  return {
    plTotal,
    carteiras: snap.carteiras.length,
    atributos,
    faixaGlobal: piorFaixa(atributos.map((a) => a.faixa)),
  };
}

/** Cobertura de todas as carteiras, pior primeiro (é a fila de trabalho do mapa). */
export function coberturaPorCarteira(snap: Snapshot): CoberturaCarteira[] {
  return snap.carteiras
    .map(coberturaDaCarteira)
    .sort((a, b) => a.fracaoMedia - b.fracaoMedia || a.carteira.localeCompare(b.carteira));
}
