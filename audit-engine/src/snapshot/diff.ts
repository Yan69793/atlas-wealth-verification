/**
 * src/snapshot/diff.ts — compara snapshot D com o dia anterior e emite eventos.
 *
 * Todas as comparações usam >= (consistente com rules/alocacao.ts). Base de
 * materialidade = plTotal do snapshot anterior. Sem dia anterior: eventos []
 * com baseData null (linha de base documentada). REVENUE_DROP é reservado
 * para a Fase 5 e NUNCA é emitido aqui.
 */

import fs from 'node:fs';
import path from 'node:path';
import { tipoPeriodo } from './args.js';
import { carregarSnapshotDoDisco } from './ingest.js';
import { isLiquidez } from './normalize.js';
import { THRESHOLDS } from './thresholds.js';
import type { Severidade, Snapshot, SnapshotEvent } from './types.js';

export interface DiffResult {
  baseData: string | null;
  eventos: SnapshotEvent[];
}

/* Tolerância de ponto flutuante para comparações de PROPORÇÃO (>= limiar):
   proporções de valores reais raramente são representáveis de forma exata
   (ex.: 150000/1000000 = 0.14999999...). Sem isto, o limiar "exato" de 5pp
   falharia por 1e-17. Limiares em DINHEIRO (5000, 50.000) não precisam. */
const EPS = 1e-9;

function atingiu(valor: number, limiar: number): boolean {
  return valor >= limiar - EPS;
}

function chave(carteira: string, ativo: string): string {
  return `${carteira}|${ativo}`;
}

function diaParaMs(data: string): number {
  return new Date(data + 'T00:00:00Z').getTime();
}

/** Menor janela >= diasRestantes; null quando > 90 ou <= 0. */
export function janelaPara(dias: number): number | null {
  if (dias <= 0 || dias > 90) return null;
  for (const janela of [...THRESHOLDS.maturidadeJanelas].sort((a, b) => a - b)) {
    if (dias <= janela) return janela;
  }
  return null;
}

export function diasAte(vencimento: string, data: string): number {
  return Math.round((diaParaMs(vencimento) - diaParaMs(dataReferencia(data))) / 86_400_000);
}

/**
 * Data de referência para janelas de vencimento: no diário, o próprio dia; no
 * mensal, o último dia do mês (um vencimento em 05/MM+1 dista ~"dias do fim do
 * mês", a referência estável do período).
 */
function dataReferencia(data: string): string {
  const periodo = tipoPeriodo(data);
  if (periodo === 'mensal') {
    const [y, m] = data.split('-').map(Number);
    const ultimoDia = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${data}-${String(ultimoDia).padStart(2, '0')}`;
  }
  return data;
}

export function calcularMaterialidade(delta: number, plBase: number): number | null {
  if (plBase === 0) return null;
  return Math.abs(delta) / plBase;
}

export function classificarSeveridade(materialidade: number): Severidade {
  if (materialidade >= THRESHOLDS.severidade.mediaMax) return 'alta';
  if (materialidade >= THRESHOLDS.severidade.baixaMax) return 'media';
  return 'baixa';
}

/**
 * Acha o período anterior com snapshot: no diário, anda para trás dia a dia
 * (limite 30 — cobre fim de semana e feriado); no mensal, mês a mês (limite 24).
 */
export function encontrarPeriodoAnterior(
  root: string,
  data: string
): { data: string; snapshot: Snapshot } | null {
  const periodo = tipoPeriodo(data);
  if (periodo === 'mensal') {
    const atual = new Date(data + '-01T00:00:00Z');
    for (let i = 1; i <= 24; i++) {
      atual.setUTCMonth(atual.getUTCMonth() - 1);
      const d = atual.toISOString().slice(0, 7);
      const snap = carregarSnapshotDoDisco(root, d);
      if (snap) return { data: d, snapshot: snap };
    }
    return null;
  }
  const dia = new Date(data + 'T00:00:00Z');
  for (let i = 1; i <= 30; i++) {
    dia.setUTCDate(dia.getUTCDate() - 1);
    const d = dia.toISOString().slice(0, 10);
    const snap = carregarSnapshotDoDisco(root, d);
    if (snap) return { data: d, snapshot: snap };
  }
  return null;
}

/** Alias de compatibilidade: o nome antigo continua valendo para o diário. */
export const encontrarDiaAnterior = encontrarPeriodoAnterior;

interface PosicaoMap {
  [key: string]: number; // carteira|ativo -> valor
}

function mapaPosicoes(snap: Snapshot): PosicaoMap {
  const m: PosicaoMap = {};
  for (const c of snap.carteiras) {
    for (const p of c.posicoes) m[chave(p.carteira, p.ativo)] = p.valor;
  }
  return m;
}

export function diffSnapshots(atual: Snapshot, anterior: Snapshot | null): DiffResult {
  if (!anterior) return { baseData: null, eventos: [] };

  const eventos: SnapshotEvent[] = [];
  const posAnterior = mapaPosicoes(anterior);
  const posAtual = mapaPosicoes(atual);

  const carteirasAnteriores = new Map(anterior.carteiras.map((c) => [c.nome, c]));
  const carteirasAtuais = new Map(atual.carteiras.map((c) => [c.nome, c]));

  const nomes = new Set([...carteirasAnteriores.keys(), ...carteirasAtuais.keys()]);

  for (const nome of nomes) {
    const cBase = carteirasAnteriores.get(nome);
    const cAtual = carteirasAtuais.get(nome);
    const plBase = cBase?.plTotal ?? 0;

    // --- liquidez (CASH_INCREASE / CASH_DECREASE) ---
    const liquidezBase = (cBase?.posicoes ?? []).filter((p) => isLiquidez(p.classe)).reduce((a, p) => a + p.valor, 0);
    const liquidezAtual = (cAtual?.posicoes ?? []).filter((p) => isLiquidez(p.classe)).reduce((a, p) => a + p.valor, 0);
    const deltaLiq = liquidezAtual - liquidezBase;
    if (plBase > 0 && atingiu(Math.abs(deltaLiq) / plBase, THRESHOLDS.cashMovimentoPct)) {
      eventos.push({
        schema: 'evento/v1',
        tipo: deltaLiq >= 0 ? 'CASH_INCREASE' : 'CASH_DECREASE',
        carteira: nome,
        valorAnterior: liquidezBase,
        valorAtual: liquidezAtual,
        delta: deltaLiq,
        deltaPct: liquidezBase !== 0 ? deltaLiq / liquidezBase : null,
        materialidade: calcularMaterialidade(deltaLiq, plBase),
        severidade: classificarSeveridade(calcularMaterialidade(deltaLiq, plBase) ?? 0),
        evidencias: { plBase, liquidezBase, liquidezAtual },
      });
    }

    // --- posições novas e encerradas ---
    const base = new Set(cBase ? cBase.posicoes.map((p) => chave(p.carteira, p.ativo)) : []);
    const atualSet = new Set(cAtual ? cAtual.posicoes.map((p) => chave(p.carteira, p.ativo)) : []);

    for (const p of cAtual?.posicoes ?? []) {
      const k = chave(p.carteira, p.ativo);
      if (!base.has(k)) {
        const mat = calcularMaterialidade(p.valor, plBase);
        if (mat === null || !atingiu(mat, THRESHOLDS.novaPosicaoMinPct)) continue;
        eventos.push({
          schema: 'evento/v1',
          tipo: 'NEW_POSITION',
          carteira: nome,
          ativo: p.ativo,
          valorAnterior: 0,
          valorAtual: p.valor,
          delta: p.valor,
          deltaPct: null,
          materialidade: mat,
          severidade: classificarSeveridade(mat ?? 0),
          evidencias: { plBase, valorNovo: p.valor },
        });
      }
    }

    for (const p of cBase?.posicoes ?? []) {
      const k = chave(p.carteira, p.ativo);
      if (!atualSet.has(k)) {
        const mat = calcularMaterialidade(-p.valor, plBase);
        if (mat === null || !atingiu(mat, THRESHOLDS.posicaoEncerradaMinPct)) continue;
        eventos.push({
          schema: 'evento/v1',
          tipo: 'POSITION_CLOSED',
          carteira: nome,
          ativo: p.ativo,
          valorAnterior: p.valor,
          valorAtual: 0,
          delta: -p.valor,
          deltaPct: -1,
          materialidade: mat,
          severidade: classificarSeveridade(mat ?? 0),
          evidencias: { plBase, valorAnterior: p.valor },
        });
      }
    }

    // --- vencimentos (MATURITY_APPROACHING) — 1 evento por ativo, na troca de janela ---
    const janelasBase = new Map<string, number | null>();
    for (const p of cBase?.posicoes ?? []) {
      if (!p.vencimento) continue;
      janelasBase.set(chave(p.carteira, p.ativo), janelaPara(diasAte(p.vencimento, anterior.data)));
    }
    for (const p of cAtual?.posicoes ?? []) {
      if (!p.vencimento) continue;
      const dias = diasAte(p.vencimento, atual.data);
      const janela = janelaPara(dias);
      const janelaAntes = janelasBase.get(chave(p.carteira, p.ativo));
      if (janela === null) continue; // vencido ou além de 90 dias
      if (janela !== janelaAntes) {
        eventos.push({
          schema: 'evento/v1',
          tipo: 'MATURITY_APPROACHING',
          carteira: nome,
          ativo: p.ativo,
          valorAnterior: posAnterior[chave(p.carteira, p.ativo)] ?? 0,
          valorAtual: p.valor,
          delta: p.valor - (posAnterior[chave(p.carteira, p.ativo)] ?? 0),
          deltaPct: null,
          materialidade: calcularMaterialidade(p.valor, plBase),
          severidade: 'baixa',
          evidencias: { diasRestantes: dias, janelaDias: janela, vencimento: p.vencimento },
        });
      }
    }

    // --- saque grande (LARGE_WITHDRAWAL) ---
    if (cBase && cAtual) {
      const queda = cBase.plTotal - cAtual.plTotal;
      if (
        queda >= THRESHOLDS.saqueGrandeMinAbs &&
        cAtual.plTotal <= cBase.plTotal * (1 - THRESHOLDS.saqueGrandePct) + EPS
      ) {
        eventos.push({
          schema: 'evento/v1',
          tipo: 'LARGE_WITHDRAWAL',
          carteira: nome,
          valorAnterior: cBase.plTotal,
          valorAtual: cAtual.plTotal,
          delta: -queda,
          deltaPct: cBase.plTotal !== 0 ? -queda / cBase.plTotal : null,
          materialidade: calcularMaterialidade(-queda, cBase.plTotal),
          severidade: 'alta',
          evidencias: { plBase: cBase.plTotal, plAtual: cAtual.plTotal, queda },
        });
      }
    }

    // --- alocação por classe (ALLOCATION_SHIFT) ---
    if (cBase && cAtual && cBase.plTotal > 0 && cAtual.plTotal > 0) {
      const part = (snap: Snapshot, carteira: string) => {
        const partes = new Map<string, number>();
        const total = snap.carteiras.find((c) => c.nome === carteira)?.plTotal ?? 0;
        for (const p of snap.carteiras.find((c) => c.nome === carteira)?.posicoes ?? []) {
          const cls = (p.classe ?? 'sem-classe').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
          partes.set(cls, (partes.get(cls) ?? 0) + p.valor);
        }
        return { partes, total };
      };
      const basePart = part(anterior, nome);
      const atualPart = part(atual, nome);
      const classes = new Set([...basePart.partes.keys(), ...atualPart.partes.keys()]);
      for (const cls of classes) {
        const pBase = (basePart.partes.get(cls) ?? 0) / basePart.total;
        const pAtual = (atualPart.partes.get(cls) ?? 0) / atualPart.total;
        if (atingiu(Math.abs(pAtual - pBase), THRESHOLDS.alocacaoShiftPp)) {
          eventos.push({
            schema: 'evento/v1',
            tipo: 'ALLOCATION_SHIFT',
            carteira: nome,
            ativo: cls,
            valorAnterior: (basePart.partes.get(cls) ?? 0),
            valorAtual: (atualPart.partes.get(cls) ?? 0),
            delta: (atualPart.partes.get(cls) ?? 0) - (basePart.partes.get(cls) ?? 0),
            deltaPct: null,
            materialidade: Math.abs(pAtual - pBase),
            severidade: 'baixa',
            evidencias: { partBase: pBase, partAtual: pAtual },
          });
        }
      }

      // --- concentração (CONCENTRATION_INCREASE) ---
      const maiorBase = Math.max(...(cBase.posicoes.map((p) => p.valor)));
      const maiorAtual = Math.max(...(cAtual.posicoes.map((p) => p.valor)));
      const partMaiorBase = maiorBase / cBase.plTotal;
      const partMaiorAtual = maiorAtual / cAtual.plTotal;
      if (
        atingiu(partMaiorAtual - partMaiorBase, THRESHOLDS.concentracaoShiftPp) &&
        atingiu(partMaiorAtual, THRESHOLDS.concentracaoNivelMin)
      ) {
        const ativoMaior = cAtual.posicoes.find((p) => p.valor === maiorAtual)?.ativo;
        eventos.push({
          schema: 'evento/v1',
          tipo: 'CONCENTRATION_INCREASE',
          carteira: nome,
          ativo: ativoMaior,
          valorAnterior: maiorBase,
          valorAtual: maiorAtual,
          delta: maiorAtual - maiorBase,
          deltaPct: null,
          materialidade: partMaiorAtual - partMaiorBase,
          severidade: 'media',
          evidencias: { partBase: partMaiorBase, partAtual: partMaiorAtual },
        });
      }
    }
  }

  return { baseData: anterior.data, eventos };
}

export function salvarEventsFile(
  root: string,
  data: string,
  diff: DiffResult
): string {
  const dir = path.join(root, 'audits', data);
  fs.mkdirSync(dir, { recursive: true });
  const file: {
    schema: string;
    data: string;
    periodo: 'diario' | 'mensal';
    baseData: string | null;
    geradoEm: string;
    engine: { nome: 'atlas-audit-engine'; versao: string };
    eventos: SnapshotEvent[];
  } = {
    schema: 'events/v1',
    data,
    periodo: tipoPeriodo(data) ?? 'diario',
    baseData: diff.baseData,
    geradoEm: new Date().toISOString(),
    engine: { nome: 'atlas-audit-engine', versao: process.env.npm_package_version ?? '0.0.0' },
    eventos: diff.eventos,
  };
  const p = path.join(dir, 'events.json');
  fs.writeFileSync(p, JSON.stringify(file, null, 2) + '\n', 'utf8');
  return p;
}
