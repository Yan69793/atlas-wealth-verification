#!/usr/bin/env node
// Compara duas capturas da rede de caracterizacao (baseline vs atual) e falha se
// qualquer numero renderizado mudou. E o portao: uma mudanca de codigo que altere
// o que o cliente ve num mes ja entregue passa a gritar, em vez do silencio que o
// docs/operacao.md chama de modo de falha mais perigoso.
//
// Uso: node tests/caracterizacao/comparar.mjs <baselineDir> <atualDir>
// Sai 0 se diff zero; sai 1 se qualquer snapshot divergir, sumir ou aparecer.

import fs from 'node:fs';
import path from 'node:path';

const [, , BASELINE, ATUAL] = process.argv;
if (!BASELINE || !ATUAL) {
  console.error('uso: node tests/caracterizacao/comparar.mjs <baselineDir> <atualDir>');
  process.exit(2);
}
for (const d of [BASELINE, ATUAL]) {
  if (!fs.existsSync(d)) { console.error(`diretorio inexistente: ${d}`); process.exit(2); }
}

// Lista relativa de todos os <mes>/<pagina>.json sob uma raiz.
function listarSnapshots(raiz) {
  const set = new Set();
  for (const mes of fs.readdirSync(raiz)) {
    const dirMes = path.join(raiz, mes);
    if (!fs.statSync(dirMes).isDirectory()) continue;
    for (const arq of fs.readdirSync(dirMes)) {
      if (arq.endsWith('.json')) set.add(`${mes}/${arq}`);
    }
  }
  return set;
}

function carregar(raiz, rel) {
  return JSON.parse(fs.readFileSync(path.join(raiz, rel), 'utf-8'));
}

const snapsBase = listarSnapshots(BASELINE);
const snapsAtual = listarSnapshots(ATUAL);

let problemas = 0;
const todos = new Set([...snapsBase, ...snapsAtual]);

for (const rel of [...todos].sort()) {
  if (!snapsAtual.has(rel)) { console.error(`FALTA no atual: ${rel}`); problemas++; continue; }
  if (!snapsBase.has(rel)) { console.error(`NOVO no atual (sem baseline): ${rel}`); problemas++; continue; }

  const a = carregar(BASELINE, rel);
  const b = carregar(ATUAL, rel);
  const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of [...chaves].sort()) {
    if (a[k] !== b[k]) {
      console.error(`DIFF ${rel} [${k}]: baseline=${JSON.stringify(a[k])} atual=${JSON.stringify(b[k])}`);
      problemas++;
    }
  }
}

const n = snapsBase.size;
if (problemas) {
  console.error(`\n${problemas} divergencia(s) em ${n} snapshots de baseline. Numero renderizado mudou.`);
  process.exit(1);
}
console.log(`ok: ${n} snapshots, diff zero`);
