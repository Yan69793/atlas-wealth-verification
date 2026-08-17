/**
 * src/intel/maturities.ts — Fase 3: vencimentos próximos.
 *
 * Lista os vencimentos futuros de um snapshot dentro das janelas dos
 * thresholds.ts (7/15/30/60/90), cada um com o peso na carteira e o id da
 * oportunidade associada. As janelas NÃO são redefinidas aqui: fonte única é
 * thresholds.ts (confirmado pelo dono na calibração de 2026-08-14), e a
 * semântica de borda é a mesma do diff (janelaPara: D+7 exato = janela 7,
 * D+8 = janela 15, vencido e além de 90 ficam de fora).
 */

import { adicionarDias, idOportunidade } from '../opportunities/generator.js';
import { diasAte, janelaPara } from '../snapshot/diff.js';
import { tipoPeriodo } from '../snapshot/args.js';
import type { Snapshot } from '../snapshot/types.js';

export interface VencimentoItem {
  carteira: string;
  ativo: string;
  instituicao: string | null;
  valor: number;
  pctPl: number;
  vencimento: string;
  diasRestantes: number;
  janelaDias: number;
  oportunidadeId: string;
}

export interface VencimentosFile {
  schema: 'vencimentos/v1';
  data: string;
  periodo: 'diario' | 'mensal';
  geradoEm: string;
  engine: { nome: 'atlas-audit-engine'; versao: string };
  vencimentos: VencimentoItem[];
}

export interface OpcoesVencimentos {
  /** default: data do próprio snapshot (no mensal, diasAte ancora no fim do mês) */
  dataReferencia?: string;
  /**
   * Datas em que existe snapshot diário (ASC), de `listarDatasDiarias`. Sem
   * elas o id da oportunidade é montado com a data TEÓRICA do cruzamento da
   * janela, que erra sempre que essa data cai em dia sem arquivo do
   * custodiante: fim de semana e feriado, cerca de dois em cada sete casos.
   * Nesses dias o evento do diff nasce no próximo dia com snapshot, e o link
   * vencimento → oportunidade apontava para um id que a fila não tem.
   */
  datasSnapshot?: string[];
}

/**
 * Primeira data com snapshot em que o vencimento já estava dentro da janela.
 * É onde o diff emite o MATURITY_APPROACHING de verdade. Sem lista de datas,
 * devolve o cruzamento teórico (comportamento anterior).
 */
function dataRealDoCruzamento(cruzamentoTeorico: string, datas: string[] | undefined): string {
  if (!datas || !datas.length) return cruzamentoTeorico;
  for (const d of datas) if (d >= cruzamentoTeorico) return d;
  return cruzamentoTeorico;
}

export function vencimentosProximos(snapshot: Snapshot, opcoes: OpcoesVencimentos = {}): VencimentoItem[] {
  const referencia = opcoes.dataReferencia ?? snapshot.data;
  const itens: VencimentoItem[] = [];

  for (const c of snapshot.carteiras) {
    for (const p of c.posicoes) {
      if (!p.vencimento) continue;
      const dias = diasAte(p.vencimento, referencia);
      const janela = janelaPara(dias);
      if (janela === null) continue; // vencido ou além da janela máxima
      // A oportunidade da Fase 2 nasce no dia em que o vencimento CRUZA a
      // borda da janela (vencimento - janela), não no dia em que a lista é
      // gerada. Mas o diff só roda em dia com arquivo do custodiante: se o
      // cruzamento cai em sábado, domingo ou feriado, o evento nasce no próximo
      // dia com snapshot, e é essa data que compõe o id da fila. No mensal o
      // período do evento é o próprio mês.
      const periodoDoEvento =
        tipoPeriodo(snapshot.data) === 'mensal'
          ? snapshot.data
          : dataRealDoCruzamento(adicionarDias(p.vencimento, -janela), opcoes.datasSnapshot);
      itens.push({
        carteira: c.nome,
        ativo: p.ativo,
        instituicao: p.instituicao ?? null,
        valor: p.valor,
        pctPl: c.plTotal > 0 ? p.valor / c.plTotal : 0,
        vencimento: p.vencimento,
        diasRestantes: dias,
        janelaDias: janela,
        oportunidadeId: idOportunidade(periodoDoEvento, c.nome, 'MATURITY_APPROACHING', p.ativo),
      });
    }
  }

  // vencimento mais próximo primeiro; empates em ordem estável (carteira, ativo)
  itens.sort(
    (a, b) =>
      a.vencimento.localeCompare(b.vencimento) ||
      a.carteira.localeCompare(b.carteira) ||
      a.ativo.localeCompare(b.ativo)
  );
  return itens;
}
