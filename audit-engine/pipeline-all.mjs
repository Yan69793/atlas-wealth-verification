#!/usr/bin/env node
/**
 * Pipeline completo 2024-01 a 2026-06 (30 meses):
 *   1. Extrai PDFs de cada mes (parsePdfBookFolder)
 *   2. Roda audit-engine
 *   3. Escreve audit.json por mes
 *
 * Idempotente: pula mes que ja tem audit.json valido.
 * Uso: node pipeline-all.mjs [--force] [--only 2024-03] [--root <dir>]
 *
 * --root aponta a raiz dos dados (onde vive audits/). Sem ele, usa
 * ATLAS_DATA_ROOT ou o diretorio-pai. Consumido como submodule, o dado real
 * fica no repo da instancia do cliente, fora desta arvore.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEngine } from './dist/src/engine.js';
import { parsePdfBookFolder } from './dist/src/parsers/pdf-v1.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

// Raiz dos dados. Precisa ser externa: quando o engine é consumido como
// submodule pela instância do cliente, o dado real vive no repo de fora e
// nunca dentro desta árvore, que é o produto.
// Precedência: --root > ATLAS_DATA_ROOT > diretório-pai (retrocompatível).
const ROOT_ARG = args.includes('--root') ? args[args.indexOf('--root') + 1] : null;
const ROOT = path.resolve(ROOT_ARG || process.env.ATLAS_DATA_ROOT || path.join(__dirname, '..'));
const AUDITS_DIR = path.join(ROOT, 'audits');

function generateMonths() {
  const months = [];
  for (let y = 2024; y <= 2026; y++) {
    const end = (y === 2026) ? 6 : 12;
    for (let m = 1; m <= end; m++) {
      const mes = `${y}-${String(m).padStart(2, '0')}`;
      let baseline;
      if (m === 1) {
        baseline = `${y - 1}-12`;
      } else {
        baseline = `${y}-${String(m - 1).padStart(2, '0')}`;
      }
      months.push({ mes, baseline });
    }
  }
  return months;
}

const MONTHS = ONLY
  ? [{ mes: ONLY, baseline: (() => {
      const [y, m] = ONLY.split('-').map(Number);
      if (m === 1) return `${y-1}-12`;
      return `${y}-${String(m-1).padStart(2,'0')}`;
    })() }]
  : generateMonths();

function getEditadosDir(mes) {
  return path.join(AUDITS_DIR, mes, 'input', 'Editados');
}

function getAuditPath(mes) {
  return path.join(AUDITS_DIR, mes, 'audit.json');
}

async function processMonth({ mes, baseline }) {
  const editadosDir = getEditadosDir(mes);
  const auditPath = getAuditPath(mes);

  if (!fs.existsSync(editadosDir)) {
    console.log(`[${mes}] Pasta Editados nao encontrada: ${editadosDir} — pulando.`);
    return { mes, status: 'SKIP', reason: 'sem Editados' };
  }

  const pdfs = fs.readdirSync(editadosDir).filter(f => /^Book_.*\.pdf$/i.test(f));
  if (pdfs.length === 0) {
    console.log(`[${mes}] Nenhum Book_*.pdf encontrado — pulando.`);
    return { mes, status: 'SKIP', reason: 'sem PDFs' };
  }

  // Idempotencia: pula se audit.json existe e nao estamos forcando
  if (!FORCE && fs.existsSync(auditPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
      if (existing.carteiras && existing.carteiras.length > 0) {
        console.log(`[${mes}] audit.json ja existe com ${existing.carteiras.length} carteiras — pulando.`);
        return { mes, status: 'SKIP', reason: 'ja processado' };
      }
    } catch { /* arquivo corrompido, reprocessar */ }
  }

  console.log(`[${mes}] Iniciando extracao de ${pdfs.length} PDFs...`);
  const start = Date.now();

  let carteiras;
  try {
    carteiras = await parsePdfBookFolder({
      pasta: editadosDir,
      mes,
      baseline,
    });
  } catch (err) {
    console.error(`[${mes}] ERRO na extracao PDF: ${err.message}`);
    return { mes, status: 'ERROR', reason: err.message };
  }

  const meta = {
    mes,
    baseline,
    arquivo: `Book_*_${mes.replace('-', '_')}.pdf (${pdfs.length} PDFs)`,
    processadoEm: new Date().toISOString(),
  };

  const output = runEngine(carteiras, { meta });

  // Escreve audit.json
  fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  fs.writeFileSync(auditPath, JSON.stringify(output, null, 2), 'utf-8');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const t = output.dashboard.summary.totals;
  console.log(`[${mes}] OK — ${carteiras.length} carteiras extraidas | LIBERAR ${t.liberar} | ALERTA ${t.alerta} | CORRIGIR ${t.corrigir} | ${elapsed}s`);
  console.log(`[${mes}] audit.json → ${auditPath}`);

  return { mes, status: 'OK', pdfs: pdfs.length, carteiras: carteiras.length, totals: t, elapsed };
}

async function main() {
  console.log('=== PIPELINE 2024-01 a 2026-06 ===');
  console.log(`Root: ${ROOT}`);
  console.log(`Meses: ${MONTHS.length} (${MONTHS[0].mes} a ${MONTHS[MONTHS.length-1].mes})`);
  if (FORCE) console.log('Modo: FORCE (reprocessa todos)');
  if (ONLY) console.log(`Modo: ONLY ${ONLY}`);
  console.log('');

  const results = [];
  for (const cfg of MONTHS) {
    const result = await processMonth(cfg);
    results.push(result);
  }

  // Resumo final
  console.log('');
  console.log('=== RESUMO FINAL ===');
  const ok = results.filter(r => r.status === 'OK');
  const skipped = results.filter(r => r.status === 'SKIP');
  const errors = results.filter(r => r.status === 'ERROR');

  for (const r of ok) {
    console.log(`${r.mes}: ${r.carteiras} carteiras | LIBERAR ${r.totals.liberar} | ALERTA ${r.totals.alerta} | CORRIGIR ${r.totals.corrigir} | ${r.elapsed}s`);
  }
  for (const r of skipped) {
    console.log(`${r.mes}: SKIP — ${r.reason}`);
  }
  for (const r of errors) {
    console.log(`${r.mes}: ERROR — ${r.reason}`);
  }

  console.log('');
  console.log(`Total: ${ok.length} OK, ${skipped.length} skip, ${errors.length} erro`);
  console.log('Pipeline concluido.');

  if (errors.length > 0) process.exit(1);
}

main().catch(err => {
  console.error('FATAL:', err.message ?? err);
  process.exit(1);
});
