/**
 * src/intel/explain.ts — contrato de saída de todo motor de inteligência.
 *
 * Decidido ANTES do primeiro motor, de propósito. Explicabilidade é formato de
 * saída, não funcionalidade: se cada motor já nasce devolvendo o rastro junto
 * do resultado, sai de graça; enfiar depois é retrabalho em todo motor e em
 * toda tela. A Fase 2 já pagou essa conta uma vez, quando o score do motor era
 * código morto e a tela tinha peso próprio.
 *
 * Regra de uso: NENHUM texto de explicabilidade é escrito à mão na tela. A tela
 * lê `Insight` e renderiza. Se um campo falta, o motor está incompleto, não a
 * tela.
 *
 * O que este módulo deliberadamente NÃO faz:
 * - não pontua de 0 a 100. Existe um score 0 a 100 no sistema (score.ts, saúde
 *   da auditoria, 100 é bom) e a escala do score de materialidade ainda é
 *   decisão aberta do dono. Enquanto não fechar, a inteligência classifica em
 *   `Severidade` (baixa/media/alta), que é a escala que o motor de eventos já
 *   usa e o dono já calibrou;
 * - não chama LLM. O narrador é camada de cima e nunca altera cálculo,
 *   classificação ou ordem.
 */

import type { Severidade } from '../snapshot/types.js';
import { faixaDeCobertura, type FaixaCobertura } from './coverage.js';

export type Confianca = 'alta' | 'media' | 'baixa';

/** Valor cru que sustenta a afirmação. Sem objeto aninhado: a tela imprime direto. */
export type Evidencias = Record<string, number | string | boolean>;

export interface RegraAplicada {
  /** nome estável, casável com o arquivo de limiares */
  nome: string;
  /** os limiares que decidiram, com o nome que têm em thresholds.ts */
  limiar: Record<string, number | string>;
}

export interface FonteInsight {
  /** rótulo lógico da fonte do snapshot, nunca caminho absoluto de máquina */
  fonte: string;
  /** data do snapshot de referência */
  data: string;
  /** datas da série usadas, quando o motor lê mais de um dia */
  serie?: string[];
}

export interface Insight {
  schema: 'insight/v1';
  /** estável entre execuções: mesmo dado, mesmo id */
  id: string;
  tipo: string;
  /** null = insight da casa (visão cruzada), não de uma carteira */
  carteira: string | null;
  tenantId: string;
  severidade: Severidade;
  /** o que estou dizendo, em uma frase */
  afirmacao: string;
  /** os números crus que sustentam */
  evidencias: Evidencias;
  regra: RegraAplicada;
  /** a conta, legível por quem não abre o código */
  calculo: string;
  fonte: FonteInsight;
  /** 0..1: fração do PL que o motor conseguiu avaliar para ESTA afirmação */
  cobertura: number;
  faixaCobertura: FaixaCobertura;
  confianca: Confianca;
}

/**
 * Confiança derivada, nunca digitada.
 *
 * Sai da cobertura e de uma penalidade quando o motor teve que trabalhar com
 * atributo derivado em vez de declarado. Derivado é melhor que nada e pior que
 * mapeado: o emissor tirado do nome do custodiante acerta muito, mas erra em
 * papel emitido por um e custodiado por outro.
 */
export function confiancaDe(cobertura: number, opts: { derivado?: boolean } = {}): Confianca {
  const faixa = faixaDeCobertura(cobertura);
  if (faixa === 'insuficiente') return 'baixa';
  if (faixa === 'ressalva') return 'baixa';
  return opts.derivado ? 'media' : 'alta';
}

/**
 * Severidade a partir de uma fração de referência, na MESMA escala que o motor
 * de eventos usa (THRESHOLDS.severidade). Reusar em vez de inventar é
 * deliberado: o dono calibrou aquela escala em agosto e uma segunda escala com
 * outros cortes tornaria "alta" duas coisas diferentes na mesma tela.
 *
 * A BASE da fração é decisão de cada motor e precisa estar documentada onde ele
 * a calcula. Foi exatamente isso que quebrou a queda de receita em agosto: a
 * materialidade era medida contra o PL, então perder 99,9% da receita dava
 * severidade "baixa". Base errada, escala certa.
 */
export function severidadeDe(
  fracao: number | null,
  cortes: { baixaMax: number; mediaMax: number }
): Severidade {
  if (fracao === null || !Number.isFinite(fracao)) return 'baixa';
  const f = Math.abs(fracao);
  if (f >= cortes.mediaMax) return 'alta';
  if (f >= cortes.baixaMax) return 'media';
  return 'baixa';
}

/**
 * Id estável de insight. Mesma convenção da fila de oportunidades
 * (`periodo|carteira|tipo|chave`), para o dia em que um insight virar
 * oportunidade o casamento já existir. Carteira null vira `*` (casa).
 */
export function idInsight(
  data: string,
  carteira: string | null,
  tipo: string,
  chave: string
): string {
  return `${data}|${carteira ?? '*'}|${tipo}|${chave}`;
}

/** Ordem total estável: severidade desc, depois cobertura desc, depois id. */
export function ordenarInsights(insights: Insight[]): Insight[] {
  const peso: Record<Severidade, number> = { alta: 3, media: 2, baixa: 1 };
  return [...insights].sort(
    (a, b) =>
      peso[b.severidade] - peso[a.severidade] ||
      b.cobertura - a.cobertura ||
      a.id.localeCompare(b.id)
  );
}
