#!/usr/bin/env node
/**
 * src/snapshot/cli-snapshot.ts — CLI do snapshot EOD diário (Fase 1).
 *
 * Comandos: ingest <fonte> [<arquivo>] / diff / state / vencimentos — todos
 * com --data. Root: --root > ATLAS_DATA_ROOT; sem nenhum, ERRO (nunca
 * escrever na árvore do produto). Não chama cli.ts (fluxo mensal intocado).
 */

import fs from 'node:fs';
import path from 'node:path';
import { helpTexto, parseArgs, protegerRoot, tipoPeriodo, validarData } from './args.js';
import { THRESHOLDS } from './thresholds.js';
import { diffSnapshots, encontrarPeriodoAnterior, salvarEventsFile } from './diff.js';
import { coberturaDaCasa, coberturaPorCarteira } from '../intel/coverage.js';
import { radarCruzado, type RadarFile } from '../intel/cross-portfolio.js';
import { caixaParado, inicioDaJanela, type CaixaParadoFile } from '../intel/idle-cash.js';
import { vencimentosProximos, type VencimentosFile } from '../intel/maturities.js';
import { adicionarDias } from '../opportunities/generator.js';
import { ingestSnapshot } from './ingest.js';
import { tenantDe } from './pipeline.js';
import { listarDatasDiarias, listarSnapshotsDiarios } from './series.js';
import { carregarSnapshot } from './state.js';
import type { FormatoEntrada, Snapshot } from './types.js';

const FORMATOS = new Set<FormatoEntrada>(['xlsx', 'csv', 'pdf', 'html', 'api-json', 'txt-b3']);

function resolverRoot(args: Record<string, string | boolean>): string {
  const flag = typeof args.root === 'string' ? args.root : null;
  const env = process.env.ATLAS_DATA_ROOT;
  let root: string | null = null;
  if (flag) root = path.resolve(flag);
  else if (env) root = path.resolve(env);
  else throw new Error('Falta --root (ou ATLAS_DATA_ROOT). Nunca escrever na arvore do produto.');
  protegerRoot(root);
  return root;
}

function exigirData(args: Record<string, string | boolean>): string {
  const data = typeof args.data === 'string' ? args.data : null;
  if (!data) throw new Error('Falta --data AAAA-MM-DD.');
  validarData(data);
  return data;
}

async function main(): Promise<void> {
  const { args, positional } = parseArgs(process.argv.slice(2));
  const comando = positional[0];

  if (!comando) {
    console.log(helpTexto());
    process.exit(1);
  }

  if (comando === 'ingest') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const fonte = positional[1];
    if (!fonte) throw new Error('Falta <fonte> (rotulo logico da fonte).');
    const arquivo =
      (positional[2] as string | undefined) ??
      (typeof args.arquivo === 'string' ? args.arquivo : null);
    if (!arquivo) throw new Error('Falta o caminho do arquivo (posicional ou --arquivo).');

    const formatoArg = typeof args.formato === 'string' ? args.formato : null;
    if (formatoArg && !FORMATOS.has(formatoArg as FormatoEntrada)) {
      throw new Error(`Formato desconhecido: ${formatoArg}. Use xlsx|csv|pdf|html|api-json|txt-b3.`);
    }

    await ingestSnapshot({
      arquivo: path.resolve(arquivo),
      data,
      fonte,
      formato: formatoArg as FormatoEntrada | undefined,
      root,
      force: Boolean(args.force),
      tenantId: typeof args.tenant === 'string' ? args.tenant : undefined,
    });
    return;
  }

  if (comando === 'diff') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const atual = carregarSnapshot(root, data);
    const anterior = encontrarPeriodoAnterior(root, data);
    const diff = diffSnapshots(atual, anterior?.snapshot ?? null);
    const p = salvarEventsFile(root, data, diff, tenantDe(atual));
    console.log(
      `[diff] ${data} vs ${diff.baseData ?? '(linha de base)'}: ${diff.eventos.length} evento(s) → ${p}`
    );
    return;
  }

  if (comando === 'state') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const snap = carregarSnapshot(root, data);
    console.log(JSON.stringify(snap, null, 2));
    return;
  }

  if (comando === 'vencimentos') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const snap = carregarSnapshot(root, data);
    // datasSnapshot é só nome de diretório, sem parse: com ela o id da
    // oportunidade cai no dia REAL do cruzamento da janela, não no teórico,
    // que erra em fim de semana e feriado.
    const vencimentos = vencimentosProximos(snap, { datasSnapshot: listarDatasDiarias(root, data) });
    const arquivo = path.join(root, 'audits', data, 'vencimentos.json');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const saida: VencimentosFile = {
      schema: 'vencimentos/v1',
      data,
      periodo: tipoPeriodo(data) ?? 'diario',
      geradoEm: new Date().toISOString(),
      engine: {
        nome: 'atlas-audit-engine',
        versao: process.env.npm_package_version ?? '0.0.0',
      },
      vencimentos,
    };
    fs.writeFileSync(arquivo, JSON.stringify(saida, null, 2), 'utf8');
    console.log(`[vencimentos] ${data}: ${vencimentos.length} vencimento(s) → ${arquivo}`);
    return;
  }

  if (comando === 'caixa-parado') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    // data sem snapshot = erro, mesma regra de state/diff/vencimentos
    carregarSnapshot(root, data);
    const periodo = tipoPeriodo(data) ?? 'diario';
    const motivo = periodo !== 'diario' ? 'periodo-mensal' : null;
    // Só varre a série quando o período permite: no mensal o resultado seria
    // descartado (caixa parado é conceito de dia).
    let serie: Snapshot[] = [];
    let motivoFinal: 'serie-curta' | 'periodo-mensal' | null = motivo;
    if (motivo === null) {
      // Só a janela importa, então só a janela é lida do disco. Dia anterior a
      // ela nem chega a ser aberto: o corte é pelo nome do diretório.
      serie = listarSnapshotsDiarios(root, data, { desde: inicioDaJanela(data) });
      if (serie.length < 2) motivoFinal = 'serie-curta';
    }
    const itens = motivoFinal === null ? caixaParado(serie) : [];
    const arquivo = path.join(root, 'audits', data, 'caixa-parado.json');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const saida: CaixaParadoFile = {
      schema: 'caixa-parado/v1',
      data,
      periodo,
      geradoEm: new Date().toISOString(),
      engine: {
        nome: 'atlas-audit-engine',
        versao: process.env.npm_package_version ?? '0.0.0',
      },
      janelaDias: THRESHOLDS.caixaParadoJanelaDias,
      limiares: { caixaParadoMinPct: THRESHOLDS.caixaParadoMinPct, caixaParadoMinDias: THRESHOLDS.caixaParadoMinDias },
      motivo: motivoFinal,
      itens,
    };
    fs.writeFileSync(arquivo, JSON.stringify(saida, null, 2), 'utf8');
    console.log(
      `[caixa-parado] ${data}: ${itens.length} carteira(s) parada(s)` +
        (motivoFinal ? ` (motivo: ${motivoFinal})` : '') +
        ` → ${arquivo}`
    );
    return;
  }

  if (comando === 'cobertura') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const snap = carregarSnapshot(root, data);
    const casa = coberturaDaCasa(snap);
    const porCarteira = coberturaPorCarteira(snap);
    console.log(`[cobertura] ${data} — casa: ${casa.carteiras} carteira(s), faixa ${casa.faixaGlobal}`);
    for (const a of casa.atributos) {
      console.log(`  ${a.atributo.padEnd(16)} ${(a.fracao * 100).toFixed(1).padStart(6)}%  ${a.faixa}`);
    }
    // Pior primeiro: é a fila de trabalho de quem preenche o ativo-map.
    console.log('  --- carteiras (pior cobertura primeiro) ---');
    for (const c of porCarteira) {
      console.log(
        `  ${c.carteira.padEnd(20)} ${(c.fracaoMedia * 100).toFixed(1).padStart(6)}%  ${c.faixaGlobal}  (${c.posicoes} posicao/oes)`
      );
    }
    return;
  }

  if (comando === 'radar') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    // data sem snapshot = erro, mesma regra de state/diff/vencimentos
    carregarSnapshot(root, data);
    const periodo = tipoPeriodo(data) ?? 'diario';
    // A série só serve para a deterioração. No mensal cada snapshot já é um
    // mês, então a série mensal não é enumerável por listarSnapshotsDiarios e
    // o radar roda sobre o dia único, sem base de comparação.
    const serie =
      periodo === 'diario'
        ? listarSnapshotsDiarios(root, data, {
            desde: adicionarDias(data, -(THRESHOLDS.radarDeterioracaoJanelaDias * 2)),
          })
        : [carregarSnapshot(root, data)];
    const resultado = radarCruzado(serie);
    const arquivo = path.join(root, 'audits', data, 'radar.json');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const saida: RadarFile = {
      schema: 'radar/v1',
      data,
      periodo,
      tenantId: tenantDe(serie[serie.length - 1]),
      geradoEm: new Date().toISOString(),
      engine: {
        nome: 'atlas-audit-engine',
        versao: process.env.npm_package_version ?? '0.0.0',
      },
      limiares: {
        coberturaAfirmaMin: THRESHOLDS.coberturaAfirmaMin,
        coberturaRessalvaMin: THRESHOLDS.coberturaRessalvaMin,
        radarConcentracaoAtivoPct: THRESHOLDS.radarConcentracaoAtivoPct,
        radarConcentracaoEmissorPct: THRESHOLDS.radarConcentracaoEmissorPct,
        radarConcentracaoFatorPct: THRESHOLDS.radarConcentracaoFatorPct,
        radarLiquidezMinPct: THRESHOLDS.radarLiquidezMinPct,
        radarVencimentoConcentradoPct: THRESHOLDS.radarVencimentoConcentradoPct,
        radarVencimentoJanelaDias: THRESHOLDS.radarVencimentoJanelaDias,
        radarDeterioracaoPct: THRESHOLDS.radarDeterioracaoPct,
        radarDeterioracaoJanelaDias: THRESHOLDS.radarDeterioracaoJanelaDias,
      },
      motivo: resultado.baseData === null ? 'serie-curta' : null,
      ...resultado,
    };
    fs.writeFileSync(arquivo, JSON.stringify(saida, null, 2), 'utf8');
    console.log(
      `[radar] ${data}: ${resultado.insights.length} insight(s) em ${resultado.carteiras.length} carteira(s)` +
        `, cobertura da casa ${(coberturaMedia(resultado) * 100).toFixed(1)}% (${resultado.coberturaCasa.faixaGlobal})` +
        (resultado.baseData ? `, base ${resultado.baseData}` : ', sem base de comparacao') +
        ` → ${arquivo}`
    );
    return;
  }

  console.log(helpTexto());
  process.exit(1);
}

/** Média das frações dos atributos medidos da casa. Só para a linha de log. */
function coberturaMedia(r: { coberturaCasa: { atributos: { fracao: number }[] } }): number {
  const a = r.coberturaCasa.atributos;
  return a.length ? a.reduce((s, x) => s + x.fracao, 0) / a.length : 0;
}

main().catch((err) => {
  console.error('snapshot: ' + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
