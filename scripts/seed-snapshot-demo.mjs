#!/usr/bin/env node
/**
 * seed-snapshot-demo.mjs — popula o pipeline de snapshot com os fixtures
 * sintéticos: uma semana diária (2026-08-10..14), dois meses (2026-05/06) e
 * os quatro formatos de entrada do dia 13, cada um no seu root.
 *
 * Tudo sintético (nada de LGPD): a pasta de destino é gitignored e pode ser
 * recriada a qualquer momento.
 *
 * Uso: node scripts/seed-snapshot-demo.mjs [--root <dir>]
 *      default: snapshot-demo-data/ na raiz do produto
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const base = path.resolve(ROOT, args.includes('--root') ? args[args.indexOf('--root') + 1] : 'snapshot-demo-data');

const CLI = path.join(ROOT, 'audit-engine', 'dist', 'src', 'snapshot', 'cli-snapshot.js');
const GERADOR = path.join(ROOT, 'audit-engine', 'scripts', 'gerar-fixtures-sinteticos.mjs');
const FIXTURES = path.join(ROOT, 'audit-engine', 'tests', 'fixtures-sinteticos');

function run(cmd, argsList) {
  return execFileSync(cmd, argsList, { encoding: 'utf8', cwd: ROOT }).trim();
}

function snapshot(...a) {
  const out = run(process.execPath, [CLI, ...a]);
  console.log('  ' + out.split('\n')[0]);
  return out;
}

function main() {
  // clone limpo: dist/ do audit-engine é gitignored; se o CLI não existe,
  // compila antes (a mensagem de ENOENT não orienta ninguém)
  if (!fs.existsSync(CLI)) {
    console.log('dist do audit-engine ausente. Compilando (npm --prefix audit-engine run build)...');
    run('npm', ['--prefix', path.join(ROOT, 'audit-engine'), 'run', 'build']);
  }

  console.log('Gerando fixtures sinteticos...');
  run(process.execPath, [GERADOR]);

  const diarioRoot = path.join(base, 'diario');
  const mensalRoot = path.join(base, 'mensal');
  const formatoCsv = path.join(base, 'formatos', 'csv');
  const formatoHtml = path.join(base, 'formatos', 'html');
  const formatoJson = path.join(base, 'formatos', 'json');
  const formatoPdf = path.join(base, 'formatos', 'pdf');
  const formatoB3 = path.join(base, 'formatos', 'b3');
  for (const d of [diarioRoot, mensalRoot, formatoCsv, formatoHtml, formatoJson, formatoPdf, formatoB3]) {
    fs.rmSync(d, { recursive: true, force: true });
    fs.mkdirSync(d, { recursive: true });
  }

  console.log('\n— Semana diaria (xlsx) —');
  const dias = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'];
  for (const dia of dias) {
    snapshot('ingest', 'custodiante-sintetico', path.join(FIXTURES, 'diarios', `posicao-${dia}.xlsx`), '--data', dia, '--root', diarioRoot);
  }
  for (const dia of dias.slice(1)) {
    snapshot('diff', '--data', dia, '--root', diarioRoot);
  }
  // Caixa parado (Fase 4): com 5 dias de serie e o default de 7 dias parados
  // a lista sai vazia (comportamento correto); o comando exercita o calculo e
  // grava o artefato com schema valido.
  snapshot('caixa-parado', '--data', '2026-08-14', '--root', diarioRoot);

  console.log('\n— Mensal (xlsx) —');
  snapshot('ingest', 'custodiante-sintetico', path.join(FIXTURES, 'mensais', 'posicao-2026-05.xlsx'), '--data', '2026-05', '--root', mensalRoot);
  snapshot('ingest', 'custodiante-sintetico', path.join(FIXTURES, 'mensais', 'posicao-2026-06.xlsx'), '--data', '2026-06', '--root', mensalRoot);
  snapshot('diff', '--data', '2026-06', '--root', mensalRoot);

  console.log('\n— Formatos do dia 13 (um root por formato) —');
  snapshot('ingest', 'custodiante-sintetico', path.join(FIXTURES, 'formatos', 'diario-2026-08-13.csv'), '--data', '2026-08-13', '--root', formatoCsv);
  snapshot('ingest', 'custodiante-sintetico', path.join(FIXTURES, 'formatos', 'diario-2026-08-13.html'), '--data', '2026-08-13', '--root', formatoHtml);
  snapshot('ingest', 'custodiante-sintetico', path.join(FIXTURES, 'formatos', 'diario-2026-08-13.json'), '--data', '2026-08-13', '--root', formatoJson);
  snapshot('ingest', 'custodiante-sintetico', path.join(FIXTURES, 'books'), '--data', '2026-06', '--formato', 'pdf', '--root', formatoPdf);

  // Posicional estilo B3: carteiras chegam como conta de cliente, o name-map
  // da instância traduz para o nome canônico e o class-map classifica o ativo
  // (o arquivo posicional não carrega classe). Mesmo fluxo do mundo real.
  fs.writeFileSync(
    path.join(formatoB3, 'name-map.local.json'),
    JSON.stringify({ mappings: { '00000123': 'ALFA', '00000456': 'BETA', '00000789': 'GAMA' } }),
    'utf8'
  );
  fs.copyFileSync(
    path.join(FIXTURES, 'formatos', 'class-map-b3.json'),
    path.join(formatoB3, 'class-map.local.json')
  );
  snapshot('ingest', 'custodiante-sintetico', path.join(FIXTURES, 'formatos', 'diario-2026-08-13-b3.txt'), '--data', '2026-08-13', '--formato', 'txt-b3', '--root', formatoB3);
  // 1 snapshot apenas: exercita o caminho serie-curta (itens [] + motivo).
  snapshot('caixa-parado', '--data', '2026-08-13', '--root', formatoB3);

  console.log('\nArtefatos em ' + base);
}

try {
  main();
} catch (err) {
  console.error('seed-snapshot-demo: ' + (err.stderr || err.message || String(err)));
  process.exit(1);
}
