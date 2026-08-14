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
import { diffSnapshots, encontrarPeriodoAnterior, salvarEventsFile } from './diff.js';
import { vencimentosProximos, type VencimentosFile } from '../intel/maturities.js';
import { ingestSnapshot } from './ingest.js';
import { carregarSnapshot } from './state.js';
import type { FormatoEntrada } from './types.js';

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
    });
    return;
  }

  if (comando === 'diff') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const atual = carregarSnapshot(root, data);
    const anterior = encontrarPeriodoAnterior(root, data);
    const diff = diffSnapshots(atual, anterior?.snapshot ?? null);
    const p = salvarEventsFile(root, data, diff);
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
    const vencimentos = vencimentosProximos(snap);
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

  console.log(helpTexto());
  process.exit(1);
}

main().catch((err) => {
  console.error('snapshot: ' + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
