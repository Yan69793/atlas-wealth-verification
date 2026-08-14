/**
 * src/snapshot/args.ts — parseArgs duplicado de cli.ts (cópia fiel, linhas 11-32).
 *
 * A restrição "não tocar cli.ts" vence a DRY: o parseArgs de lá é módulo-local,
 * e exportá-lo mudaria o arquivo do fluxo mensal. Duplicação de ~20 linhas,
 * contida, com esta nota apontando a origem.
 */

import fs from 'node:fs';
import path from 'node:path';

export function parseArgs(argv: string[]): {
  args: Record<string, string | boolean>;
  positional: string[];
} {
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

/** Valida 'YYYY-MM-DD' com ida e volta ao ISO (rejeita 2026-13-99 e 13/08/2026). */
export function validarData(data: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw new Error(`Data invalida: "${data}". Use o formato AAAA-MM-DD.`);
  }
  const d = new Date(data + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== data) {
    throw new Error(`Data invalida: "${data}". Use o formato AAAA-MM-DD.`);
  }
}

/**
 * Recusa root que caia dentro do repo do produto. A regra inviolável do
 * CLAUDE.md é que dado real nunca toca a árvore do produto; sem esta trava,
 * `--root .` rodado de dentro do repo gravaria audits/ com nome de carteira
 * no working tree. A assinatura do produto é a presença de platform-app.jsx.
 */
export function protegerRoot(root: string): void {
  if (fs.existsSync(path.join(root, 'platform-app.jsx'))) {
    throw new Error(
      `--root "${root}" cai dentro do repo do produto. Artefatos de snapshot nunca sao gravados la.`
    );
  }
}

export function helpTexto(): string {
  return [
    'snapshot — pipeline de snapshot EOD diario (Fase 1)',
    '',
    'Uso:',
    '  node dist/src/snapshot/cli-snapshot.js ingest <fonte> [<arquivo>] --data AAAA-MM-DD [--formato xlsx|csv|pdf|html|api-json] [--root dir] [--force]',
    '  node dist/src/snapshot/cli-snapshot.js diff  --data AAAA-MM-DD [--root dir]',
    '  node dist/src/snapshot/cli-snapshot.js state --data AAAA-MM-DD [--root dir]',
    '',
    '  ingest  le a fonte, normaliza e grava audits/<data>/ingestion.json e snapshot.json.',
    '          Mesmo dia + mesmo hash pula; mesmo dia + hash diferente reingere',
    '          (o snapshot anterior e arquivado e o hash anterior fica no historico).',
    '  diff    compara o snapshot do dia com o dia anterior existente e grava events.json.',
    '  state   imprime o snapshot daquele dia (nada e sobrescrito por dias posteriores).',
    '',
    '  <fonte>  rotulo logico da fonte (nao pode ser vazio nem conter separador de path)',
    '  --root   raiz dos artefatos (obrigatorio na pratica: nunca escrever na arvore do produto)',
    '           precedencia: --root > ATLAS_DATA_ROOT; sem nenhum, erro.',
  ].join('\n');
}
