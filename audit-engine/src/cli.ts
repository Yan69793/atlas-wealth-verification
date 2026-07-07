#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enrichAll } from './ai/enrich.js';
import { runEngine } from './engine.js';
import { ingestFile } from './parsers/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      positional.push(a);
    }
  }

  return { args, positional };
}

function defaultBaseline(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function writeOutputs(outDir: string, mes: string, dashboard: object, full: object) {
  const auditDir = path.join(outDir, 'audits', mes);
  const inputDir = path.join(auditDir, 'input');
  await fs.mkdir(inputDir, { recursive: true });

  const auditPath = path.join(auditDir, 'audit.json');
  const dataJsonPath = path.join(outDir, 'data.json');
  const dataJsPath = path.join(outDir, 'data.js');

  await fs.writeFile(auditPath, JSON.stringify(full, null, 2), 'utf-8');
  await fs.writeFile(dataJsonPath, JSON.stringify(dashboard, null, 2), 'utf-8');
  await fs.writeFile(dataJsPath, `window.AUDIT_DATA = ${JSON.stringify(dashboard)};`, 'utf-8');

  return { auditPath, dataJsonPath, dataJsPath };
}

async function main() {
  const { args, positional } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  if (command !== 'ingest') {
    console.log('Uso: node cli.js ingest <arquivo.xlsx> --mes 2026-04 [--baseline 2026-03] [--out ..] [--enrich]');
    process.exit(1);
  }

  const arquivo = path.resolve(positional[1] ?? '');
  const mes = String(args.mes ?? '2026-04');
  const baseline = String(args.baseline ?? defaultBaseline(mes));
  const outDir = path.resolve(String(args.out ?? path.join(__dirname, '..', '..')));
  const enrich = Boolean(args.enrich);

  if (!arquivo) throw new Error('Arquivo nao informado');

  const carteiras = await ingestFile({ arquivo, mes, baseline });

  const meta = {
    mes,
    baseline,
    arquivo: path.basename(arquivo),
    processadoEm: new Date().toISOString(),
  };

  let output = runEngine(carteiras, { meta });

  if (enrich) {
    const enrichments = await enrichAll(output.results);
    for (const [nome, items] of enrichments) {
      const detail = output.dashboard.details[nome];
      if (!detail) continue;
      const extra = Object.values(items).map((e) => `${e.confianca}: ${e.explicacao}`).join(' | ');
      detail.achadosText = `${detail.achadosText} | ${extra}`;
    }
  }

  const arquivoStat = await fs.stat(arquivo);
  const inputCopy = path.join(outDir, 'audits', mes, 'input', path.basename(arquivo));
  await fs.mkdir(path.dirname(inputCopy), { recursive: true });
  if (arquivoStat.isDirectory()) {
    await fs.cp(arquivo, inputCopy, { recursive: true });
  } else {
    await fs.copyFile(arquivo, inputCopy);
  }

  const paths = await writeOutputs(outDir, mes, output.dashboard, output);

  console.log(`Carteiras processadas: ${carteiras.length}`);
  console.log(`Liberar: ${output.dashboard.summary.totals.liberar}`);
  console.log(`Alerta: ${output.dashboard.summary.totals.alerta}`);
  console.log(`Corrigir: ${output.dashboard.summary.totals.corrigir}`);
  console.log(`audit.json → ${paths.auditPath}`);
  console.log(`data.json  → ${paths.dataJsonPath}`);
  console.log(`data.js    → ${paths.dataJsPath}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});