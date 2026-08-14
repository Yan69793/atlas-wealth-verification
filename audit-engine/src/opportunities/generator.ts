/**
 * src/opportunities/generator.ts — regras declarativas evento → oportunidade.
 *
 * Cada regra tem nome, gatilho, texto, prioridade padrão e prazo, e pode ser
 * desligada. Sem heurística mágica: a decisão final é sempre do assessor, o
 * motor só coloca a ação na fila com uma leitura transparente do evento.
 *
 * Determinístico: ids e timestamps derivam do período, nunca de Date.now.
 */

import type { SnapshotEvent } from '../snapshot/types.js';
import type { Oportunidade, RegraOportunidade } from './types.js';

/**
 * id estável de oportunidade derivada de evento. Fonte única da convenção:
 * o intel de vencimentos (Fase 3) usa o mesmo construtor para associar
 * vencimento → oportunidade sem depender de ter gerado a fila antes.
 */
export function idOportunidade(periodo: string, carteira: string, tipo: string, ativo?: string): string {
  return `${periodo}|${carteira}|${tipo}|${ativo ?? ''}`;
}

export const REGRAS_PADRAO: RegraOportunidade[] = [
  {
    nome: 'vencimento-renovacao',
    ligada: true,
    gatilho: (e) => e.tipo === 'MATURITY_APPROACHING',
    texto: (e) =>
      `Vencimento de ${e.ativo ?? 'ativo'} em ${e.evidencias.janelaDias ?? '?'} dias: avaliar renovação/rotação`,
    prioridade: 'P2',
    // age dentro da própria janela do vencimento quando o evento a informa
    prazoDias: (e) => (typeof e.evidencias.janelaDias === 'number' ? e.evidencias.janelaDias : 15),
  },
  {
    nome: 'caixa-aporte',
    ligada: true,
    gatilho: (e) => e.tipo === 'CASH_DECREASE',
    texto: () => 'Liquidez caiu: avaliar necessidade de aporte de caixa',
    prioridade: 'P2',
    prazoDias: 15,
  },
  {
    nome: 'diversificacao',
    ligada: true,
    gatilho: (e) => e.tipo === 'CONCENTRATION_INCREASE',
    texto: () => 'Concentração subiu: conversar sobre diversificação',
    prioridade: 'P1',
    prazoDias: 30,
  },
  {
    nome: 'repor-caixa',
    ligada: true,
    gatilho: (e) => e.tipo === 'LARGE_WITHDRAWAL',
    texto: () => 'Saque grande detectado: alinhar reposição de caixa',
    prioridade: 'P1',
    prazoDias: 7,
  },
  {
    nome: 'queda-receita',
    ligada: true,
    gatilho: (e) => e.tipo === 'REVENUE_DROP',
    texto: (e) => {
      const pct = typeof e.deltaPct === 'number' ? Math.abs(e.deltaPct) : 0;
      const queda = typeof e.evidencias.queda === 'number' ? e.evidencias.queda : 0;
      const pctPt = (pct * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return `Receita da casa caiu ${pctPt}% no mes (R$ ${Math.round(queda).toLocaleString('pt-BR')}): avaliar causas da queda de patrimonio`;
    },
    // receita da casa é direta, mas o evento só nasce no fechamento do mês:
    // 15 dias dão prazo de contato dentro do ciclo sem urgência de saque
    prioridade: 'P1',
    prazoDias: 15,
  },
  {
    nome: 'reinvestimento',
    ligada: true,
    gatilho: (e) => e.tipo === 'POSITION_CLOSED',
    texto: (e) => `Posição encerrada${e.ativo ? ` (${e.ativo})` : ''}: discutir reinvestimento`,
    prioridade: 'P3',
    prazoDias: 30,
  },
];

/** Data de referência do período: dia exato no diário, último dia do mês no
 * mensal (mesma convenção do diff da Fase 1). */
export function dataReferenciaPeriodo(periodo: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodo)) return periodo;
  if (/^\d{4}-\d{2}$/.test(periodo)) {
    const [ano, mes] = periodo.split('-').map(Number);
    const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    return `${periodo}-${String(ultimoDia).padStart(2, '0')}`;
  }
  throw new Error(`periodo invalido: ${periodo}`);
}

export function adicionarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return d.toISOString().slice(0, 10);
}

/** volume em reais: módulo do movimento; sem movimento, o valor atual. */
function volumeDoEvento(e: SnapshotEvent): number {
  if (e.delta !== 0) return Math.abs(e.delta);
  return e.valorAtual;
}

export interface ContextoOportunidade {
  periodo: string; // 'YYYY-MM-DD' ou 'YYYY-MM'
  assessor: string;
}

/**
 * Aplica as regras aos eventos e devolve uma oportunidade por
 * (carteira, tipo, ativo) — o mesmo evento repetido não duplica a fila.
 */
export function gerarOportunidades(
  eventos: SnapshotEvent[],
  contexto: ContextoOportunidade,
  regras: RegraOportunidade[] = REGRAS_PADRAO
): Oportunidade[] {
  const ref = dataReferenciaPeriodo(contexto.periodo);
  const createdAt = `${ref}T12:00:00Z`;
  const vistos = new Set<string>();
  const ops: Oportunidade[] = [];

  for (const evento of eventos) {
    for (const regra of regras) {
      if (!regra.ligada || !regra.gatilho(evento)) continue;
      const id = idOportunidade(contexto.periodo, evento.carteira, evento.tipo, evento.ativo);
      if (vistos.has(id)) continue;
      vistos.add(id);

      const prazoDias = typeof regra.prazoDias === 'function' ? regra.prazoDias(evento) : regra.prazoDias;
      ops.push({
        id,
        cliente: evento.carteira,
        assessor: contexto.assessor,
        motivo: regra.texto(evento),
        volume: volumeDoEvento(evento),
        prioridade: regra.prioridade,
        prazo: adicionarDias(ref, prazoDias),
        status: 'Nova',
        ultimoContato: null,
        proximoContato: null,
        observacao: '',
        resultado: null,
        origem: { tipo: 'evento', id, periodo: contexto.periodo },
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  return ops;
}
