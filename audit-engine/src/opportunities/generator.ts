/**
 * src/opportunities/generator.ts — regras declarativas evento → oportunidade.
 *
 * Cada regra tem nome, gatilho, texto, prioridade padrão e prazo, e pode ser
 * desligada. Sem heurística mágica: a decisão final é sempre do assessor, o
 * motor só coloca a ação na fila com uma leitura transparente do evento.
 *
 * Determinístico: ids e timestamps derivam do período, nunca de Date.now.
 */

import type { EventoTipo, SnapshotEvent } from '../snapshot/types.js';
import type { ConsequenciaOportunidade, Oportunidade, RegraOportunidade, VolumeEspecie } from './types.js';

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

/**
 * Eventos cujo volume é o TAMANHO DA POSIÇÃO, não o movimento do dia.
 *
 * MATURITY_APPROACHING é sobre um título que vai vencer: o que está em jogo é o
 * valor do título, não quanto ele rendeu de um dia para o outro. Antes esta
 * função caía no `Math.abs(delta)` porque o delta só é zero por acidente, e em
 * arquivo diário de custódia título de renda fixa se move todo dia por accrual.
 * Um CDB de R$ 500.000 que rendia R$ 137 no dia em que cruzou a janela de 30
 * chegava na tela do assessor como volume de R$ 137, e o score caía de 16 para
 * 4, ou seja, do topo da fila para o fundo.
 */
const VOLUME_E_POSICAO: ReadonlySet<EventoTipo> = new Set<EventoTipo>([
  'MATURITY_APPROACHING',
]);

/** volume em reais: tamanho da posição quando o evento é sobre a posição;
 *  caso contrário o módulo do movimento, e sem movimento o valor atual. */
function volumeDoEvento(e: SnapshotEvent): number {
  if (VOLUME_E_POSICAO.has(e.tipo)) return e.valorAtual;
  if (e.delta !== 0) return Math.abs(e.delta);
  return e.valorAtual;
}

/** REVENUE_DROP mede receita MENSAL da casa; todo o resto mede patrimônio. */
const VOLUME_E_RECEITA: ReadonlySet<EventoTipo> = new Set<EventoTipo>(['REVENUE_DROP']);

function especieDoVolume(e: SnapshotEvent): VolumeEspecie {
  return VOLUME_E_RECEITA.has(e.tipo) ? 'receita' : 'patrimonio';
}

/**
 * Família "movimento de patrimônio": eventos que, dentro da MESMA carteira e do
 * MESMO período, descrevem um único fato de negócio visto de ângulos
 * diferentes. Ordem = poder explicativo, do que explica os outros para o que é
 * explicado por eles.
 *
 * O defeito que isto fecha: um saque de R$ 950 mil na BETA gerava quatro linhas
 * na fila (saque grande, liquidez caiu, posição encerrada, concentração subiu),
 * cada uma pedindo uma ação comercial diferente pelo mesmo motivo, e o
 * indicador "Volume na fila" somava R$ 3,85 milhões para um saque de R$ 950
 * mil. No mensal entrava ainda a queda de receita, chegando a cinco.
 *
 * MATURITY_APPROACHING fica de fora de propósito: um vencimento é fato próprio
 * de um título, não consequência de movimento de caixa, e dois vencimentos na
 * mesma carteira são duas conversas de renovação diferentes.
 */
export const PRECEDENCIA_CAUSA_RAIZ: readonly EventoTipo[] = [
  'LARGE_WITHDRAWAL',
  'REVENUE_DROP',
  'CASH_DECREASE',
  'CONCENTRATION_INCREASE',
  'POSITION_CLOSED',
];

const ROTULO_CONSEQUENCIA: Partial<Record<EventoTipo, string>> = {
  LARGE_WITHDRAWAL: 'saque grande',
  REVENUE_DROP: 'receita caiu',
  CASH_DECREASE: 'liquidez caiu',
  CONCENTRATION_INCREASE: 'concentracao subiu',
  POSITION_CLOSED: 'posicao encerrada',
};

function textoConsequencias(cs: ConsequenciaOportunidade[]): string {
  if (!cs.length) return '';
  const partes = cs.map((c) => {
    const rotulo = ROTULO_CONSEQUENCIA[c.tipo as EventoTipo] ?? c.tipo;
    return c.ativo ? `${rotulo} (${c.ativo})` : rotulo;
  });
  return ` (no mesmo movimento: ${partes.join(', ')})`;
}

export interface ContextoOportunidade {
  periodo: string; // 'YYYY-MM-DD' ou 'YYYY-MM'
  assessor: string;
}

/**
 * Aplica as regras aos eventos e devolve uma oportunidade por
 * (carteira, tipo, ativo) — o mesmo evento repetido não duplica a fila.
 *
 * Depois da geração vem a supressão por causa raiz: dentro de uma carteira, os
 * eventos da PRECEDENCIA_CAUSA_RAIZ descrevem um só fato, então sobra a
 * oportunidade de maior poder explicativo e as demais viram `consequencias`
 * dela. Nada é perdido, o motivo passa a citá-las.
 */
export function gerarOportunidades(
  eventos: SnapshotEvent[],
  contexto: ContextoOportunidade,
  regras: RegraOportunidade[] = REGRAS_PADRAO
): Oportunidade[] {
  const ref = dataReferenciaPeriodo(contexto.periodo);
  const createdAt = `${ref}T12:00:00Z`;
  const vistos = new Set<string>();
  const candidatos: Array<{ op: Oportunidade; tipo: EventoTipo; ativo: string | null }> = [];

  for (const evento of eventos) {
    for (const regra of regras) {
      if (!regra.ligada || !regra.gatilho(evento)) continue;
      const id = idOportunidade(contexto.periodo, evento.carteira, evento.tipo, evento.ativo);
      if (vistos.has(id)) continue;
      vistos.add(id);

      const prazoDias = typeof regra.prazoDias === 'function' ? regra.prazoDias(evento) : regra.prazoDias;
      candidatos.push({
        tipo: evento.tipo,
        ativo: evento.ativo ?? null,
        op: {
          id,
          cliente: evento.carteira,
          assessor: contexto.assessor,
          motivo: regra.texto(evento),
          volume: volumeDoEvento(evento),
          volumeEspecie: especieDoVolume(evento),
          consequencias: [],
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
        },
      });
    }
  }

  // causa raiz por carteira: menor índice na precedência ganha
  const precedencia = (t: EventoTipo) => PRECEDENCIA_CAUSA_RAIZ.indexOf(t);
  const raizPorCarteira = new Map<string, number>();
  for (let i = 0; i < candidatos.length; i++) {
    const prec = precedencia(candidatos[i].tipo);
    if (prec < 0) continue; // fora da família: independente
    const atual = raizPorCarteira.get(candidatos[i].op.cliente);
    if (atual === undefined || prec < precedencia(candidatos[atual].tipo)) {
      raizPorCarteira.set(candidatos[i].op.cliente, i);
    }
  }

  const ops: Oportunidade[] = [];
  for (let i = 0; i < candidatos.length; i++) {
    const { op, tipo, ativo } = candidatos[i];
    if (precedencia(tipo) < 0) {
      ops.push(op);
      continue;
    }
    const raiz = raizPorCarteira.get(op.cliente);
    if (raiz === i) ops.push(op);
    else if (raiz !== undefined) candidatos[raiz].op.consequencias.push({ tipo, ativo });
  }

  for (const op of ops) op.motivo += textoConsequencias(op.consequencias);

  return ops;
}
