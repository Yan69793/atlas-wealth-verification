/**
 * src/intel/idle-cash.ts — Fase 4: caixa parado.
 *
 * Mede liquidez parada por carteira sobre a série diária de snapshots:
 * valor × tempo em caixa (R$ × dias corridos), dias contínuos parado e o pico
 * da sequência. É inteligência sobre a série, NÃO evento EOD: o diff não é
 * tocado e nenhum EventoTipo novo é emitido.
 *
 * Regras:
 * - Caixa = isLiquidez(classe) (fonte única, normalize.ts). Classe null NÃO é
 *   caixa: arquivo diário sem class-map deixa o caixa invisível — o mecanismo
 *   de correção é o class-map da instância, que já existe.
 * - Um dia "qualifica" quando liquidez >= caixaParadoMinPct × PL do dia (EPS
 *   1e-9, mesma semântica do atingiu() do diff, que não é exportado; espelho
 *   local de propósito).
 * - Sequência ("dias parado"): anda de trás para frente na série COMPLETA
 *   enquanto o dia qualifica; diasParado = dias corridos do primeiro dia da
 *   sequência até a referência, inclusive. A sequência não é truncada pela
 *   janela. Carteira ausente num dia = liquidez 0 e quebra a sequência.
 * - R$-dias (janela): Σ liquidez(d_i) × dias corridos até o snapshot seguinte,
 *   sobre a sub-série dentro de [ref − (janelaDias − 1), ref]. O último
 *   snapshot contribui 0 (vale até o próximo, que não existe). O par que
 *   cruza a borda da janela fica de fora (filtro primeiro, pares depois).
 * - rsDiasSequencia: o mesmo somatório restrito aos pares com ambos os
 *   extremos dentro da sequência.
 * - A referência não qualificando tira a carteira da lista; PL <= 0 na
 *   referência é pulada. Filtro final: diasParado >= minDias.
 * - Determinístico: sem IO, sem Date.now; Date.UTC com argumentos explícitos.
 */

import { adicionarDias, idOportunidade } from '../opportunities/generator.js';
import { isLiquidez } from '../snapshot/normalize.js';
import { THRESHOLDS } from '../snapshot/thresholds.js';
import type { Snapshot, SnapshotCarteira } from '../snapshot/types.js';

const EPS = 1e-9;

/**
 * Rótulo do "tipo" no id de oportunidade vindo de caixa parado.
 *
 * Não é um EventoTipo: caixa parado é inteligência sobre a série, o diff não
 * emite evento para ele. Mas o botão "Criar oportunidade" da Fase 4 precisa de
 * um id ESTÁVEL na mesma convenção `periodo|carteira|tipo|ativo`, senão cada
 * clique cria uma linha nova, o botão nunca vira chip de status e a fila enche
 * de duplicata da mesma carteira.
 */
export const TIPO_OPORTUNIDADE_CAIXA_PARADO = 'IDLE_CASH';

export interface CaixaParadoItem {
  carteira: string;
  liquidezAtual: number; // R$, snapshot de referência
  pctPlAtual: number; // 0..1, liquidez / PL da referência
  diasParado: number; // dias corridos do início da sequência à referência, inclusive
  rsDias: number; // R$-dias da janela
  rsDiasSequencia: number; // R$-dias só dos pares dentro da sequência
  pico: number; // maior liquidez entre os dias da sequência
  inicioSequencia: string; // data do primeiro dia da sequência
  /** id estável da oportunidade associada, mesma convenção do motor */
  oportunidadeId: string;
}

export interface CaixaParadoFile {
  schema: 'caixa-parado/v1';
  data: string;
  periodo: 'diario' | 'mensal';
  geradoEm: string;
  engine: { nome: 'atlas-audit-engine'; versao: string };
  janelaDias: number;
  limiares: { caixaParadoMinPct: number; caixaParadoMinDias: number };
  /** null | 'serie-curta' | 'periodo-mensal' (preenchido pelo CLI) */
  motivo: 'serie-curta' | 'periodo-mensal' | null;
  itens: CaixaParadoItem[];
}

export interface OpcoesCaixaParado {
  /** default THRESHOLDS.caixaParadoJanelaDias */
  janelaDias?: number;
  /** default THRESHOLDS.caixaParadoMinPct */
  minPct?: number;
  /** default THRESHOLDS.caixaParadoMinDias */
  minDias?: number;
  /** default THRESHOLDS.caixaParadoMaxIntervaloDias — intervalo máximo entre
   *  snapshots consecutivos para a sequência de "parado" continuar valendo. */
  maxIntervaloDias?: number;
}

/** Dias corridos entre duas datas AAAA-MM-DD (de <= ate; determinístico). */
function diasCorridos(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

function carteiraDoDia(snap: Snapshot, nome: string): SnapshotCarteira | null {
  return snap.carteiras.find((c) => c.nome === nome) ?? null;
}

/** Liquidez da carteira no dia; null quando a carteira está ausente. */
function liquidezDoDia(snap: Snapshot, nome: string): number | null {
  const c = carteiraDoDia(snap, nome);
  if (!c) return null;
  return c.posicoes.filter((p) => isLiquidez(p.classe)).reduce((a, p) => a + p.valor, 0);
}

/** O dia qualifica quando liquidez >= minPct × PL do dia (com EPS). */
function qualifica(snap: Snapshot, nome: string, minPct: number): boolean {
  const c = carteiraDoDia(snap, nome);
  if (!c || c.plTotal <= 0) return false;
  const liq = liquidezDoDia(snap, nome) ?? 0;
  return liq / c.plTotal >= minPct - EPS;
}

/**
 * serie: snapshots diários ASCENDENTES; o último é a referência. Pura e
 * determinística. Sem série, devolve [] (o corte de série curta é do CLI).
 */
export function caixaParado(serie: Snapshot[], opcoes: OpcoesCaixaParado = {}): CaixaParadoItem[] {
  if (!serie.length) return [];
  const janelaDias = opcoes.janelaDias ?? THRESHOLDS.caixaParadoJanelaDias;
  const minPct = opcoes.minPct ?? THRESHOLDS.caixaParadoMinPct;
  const minDias = opcoes.minDias ?? THRESHOLDS.caixaParadoMinDias;
  const maxIntervalo = opcoes.maxIntervaloDias ?? THRESHOLDS.caixaParadoMaxIntervaloDias;
  const ref = serie[serie.length - 1];
  const inicioJanela = adicionarDias(ref.data, -(janelaDias - 1));
  const janelaSerie = serie.filter((s) => s.data >= inicioJanela);

  const itens: CaixaParadoItem[] = [];

  for (const cRef of ref.carteiras) {
    if (cRef.plTotal <= 0) continue;
    const nome = cRef.nome;
    if (!qualifica(ref, nome, minPct)) continue;

    // Sequência: de trás para frente na série completa enquanto qualifica E
    // enquanto há evidência de continuidade. Buraco na série interrompe: sem
    // snapshot no meio não se sabe se o caixa ficou parado, e afirmar que ficou
    // é inventar número. Ver THRESHOLDS.caixaParadoMaxIntervaloDias.
    let inicioIdx = serie.length - 1;
    for (let i = serie.length - 2; i >= 0; i--) {
      if (diasCorridos(serie[i].data, serie[i + 1].data) > maxIntervalo) break;
      if (!qualifica(serie[i], nome, minPct)) break;
      inicioIdx = i;
    }
    const diasParado = diasCorridos(serie[inicioIdx].data, ref.data) + 1;

    let pico = 0;
    for (let i = inicioIdx; i < serie.length; i++) {
      pico = Math.max(pico, liquidezDoDia(serie[i], nome) ?? 0);
    }

    // R$-dias da janela: liquidez do dia vale até o próximo snapshot, mas no
    // máximo maxIntervalo dias. Sem esse teto um buraco na série multiplicava a
    // liquidez pelo tamanho do buraco, inflando o número sem nenhuma evidência
    // de que o dinheiro ficou lá.
    const diasEntre = (a: string, b: string) => Math.min(diasCorridos(a, b), maxIntervalo);

    let rsDias = 0;
    for (let i = 0; i + 1 < janelaSerie.length; i++) {
      const liq = liquidezDoDia(janelaSerie[i], nome) ?? 0;
      rsDias += liq * diasEntre(janelaSerie[i].data, janelaSerie[i + 1].data);
    }

    // R$-dias da sequência: pares com ambos os extremos dentro da sequência.
    let rsDiasSequencia = 0;
    for (let i = inicioIdx; i + 1 < serie.length; i++) {
      const liq = liquidezDoDia(serie[i], nome) ?? 0;
      rsDiasSequencia += liq * diasEntre(serie[i].data, serie[i + 1].data);
    }

    if (diasParado < minDias) continue;

    itens.push({
      carteira: nome,
      liquidezAtual: liquidezDoDia(ref, nome) ?? 0,
      pctPlAtual: (liquidezDoDia(ref, nome) ?? 0) / cRef.plTotal,
      diasParado,
      rsDias,
      rsDiasSequencia,
      pico,
      inicioSequencia: serie[inicioIdx].data,
      oportunidadeId: idOportunidade(ref.data, nome, TIPO_OPORTUNIDADE_CAIXA_PARADO, ''),
    });
  }

  // R$-dias maior primeiro; empate em ordem estável por nome.
  itens.sort((a, b) => b.rsDias - a.rsDias || a.carteira.localeCompare(b.carteira));
  return itens;
}
