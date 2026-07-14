#!/usr/bin/env node
/**
 * Pipeline completo Fev-Mai/2026:
 *   1. Extrai PDFs de cada mês (parsePdfBookFolder)
 *   2. Roda audit-engine
 *   3. Escreve audit.json por mês
 *   4. Gera data.js / data.json multi-mês (dashboard)
 *
 * Uso: node pipeline-all.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEngine } from './dist/src/engine.js';
import { parsePdfBookFolder } from './dist/src/parsers/pdf-v1.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const AUDITS_DIR = path.join(ROOT, 'audits');

const MONTHS = [
  { mes: '2026-02', baseline: '2026-01' },
  { mes: '2026-03', baseline: '2026-02' },
  { mes: '2026-04', baseline: '2026-03' },
  { mes: '2026-05', baseline: '2026-04' },
];

function getEditadosDir(mes) {
  return path.join(AUDITS_DIR, mes, 'input', 'Editados');
}

async function processMonth({ mes, baseline }) {
  const editadosDir = getEditadosDir(mes);
  if (!fs.existsSync(editadosDir)) {
    console.log(`[${mes}] Pasta Editados nao encontrada: ${editadosDir} — pulando.`);
    return null;
  }

  const pdfs = fs.readdirSync(editadosDir).filter(f => /^Book_.*\.pdf$/i.test(f));
  if (pdfs.length === 0) {
    console.log(`[${mes}] Nenhum PDF encontrado em ${editadosDir} — pulando.`);
    return null;
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
    return null;
  }

  const meta = {
    mes,
    baseline,
    arquivo: `Book_*_${mes.replace('-', '_')}.pdf (${carteiras.length} PDFs)`,
    processadoEm: new Date().toISOString(),
  };

  const output = runEngine(carteiras, { meta });

  // Escreve audit.json
  const auditDir = path.join(AUDITS_DIR, mes);
  fs.mkdirSync(auditDir, { recursive: true });
  const auditPath = path.join(auditDir, 'audit.json');
  fs.writeFileSync(auditPath, JSON.stringify(output, null, 2), 'utf-8');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[${mes}] OK — ${carteiras.length} carteiras | LIBERAR ${output.dashboard.summary.totals.liberar} | ALERTA ${output.dashboard.summary.totals.alerta} | CORRIGIR ${output.dashboard.summary.totals.corrigir} | ${elapsed}s`);
  console.log(`[${mes}] audit.json → ${auditPath}`);

  return { mes, output };
}

function buildMultiMonthDashboard(allResults) {
  // Pega o último mês como base principal para o dashboard
  const valid = allResults.filter(Boolean);
  if (valid.length === 0) throw new Error('Nenhum mes processado com sucesso');

  const last = valid[valid.length - 1];
  const dashboard = last.output.dashboard;

  // Adiciona navegação entre meses
  dashboard.multiMonth = {
    available: valid.map(v => v.mes),
    current: last.mes,
  };

  // Sumário multi-mês: para cada mês, totais agregados
  dashboard.multiMonthSummary = valid.map(v => {
    const s = v.output.dashboard.summary;
    return {
      mes: v.mes,
      label: s.periodo.referenciaLabel,
      total: s.totals.total,
      liberar: s.totals.liberar,
      alerta: s.totals.alerta,
      corrigir: s.totals.corrigir,
    };
  });

  // Para cada carteira no dashboard, adiciona série temporal se disponível
  const historicalPL = {};
  for (const v of valid) {
    for (const c of v.output.carteiras) {
      if (!historicalPL[c.nome]) historicalPL[c.nome] = [];
      historicalPL[c.nome].push({
        mes: v.mes,
        label: v.output.periodo.referenciaLabel,
        plRef: c.plRef,
        rentRef: c.rentRef,
        status: (v.output.results.find(r => r.nome === c.nome) || {}).status,
      });
    }
  }
  dashboard.historicalPL = historicalPL;

  return dashboard;
}

async function main() {
  console.log('=== PIPELINE FEV-MAI/2026 ===');
  console.log(`Root: ${ROOT}`);
  console.log('');

  const allResults = [];
  for (const cfg of MONTHS) {
    const result = await processMonth(cfg);
    allResults.push(result);
  }

  const valid = allResults.filter(Boolean);
  if (valid.length === 0) {
    console.error('NENHUM MES PROCESSADO. Abortando.');
    process.exit(1);
  }

  // Dashboard multi-mês
  console.log('');
  console.log('=== GERANDO DASHBOARD MULTI-MES ===');
  const dashboard = buildMultiMonthDashboard(allResults);

  const dataJsonPath = path.join(ROOT, 'data.json');
  const dataJsPath = path.join(ROOT, 'data.js');

  fs.writeFileSync(dataJsonPath, JSON.stringify(dashboard, null, 2), 'utf-8');
  fs.writeFileSync(dataJsPath, `window.AUDIT_DATA = ${JSON.stringify(dashboard)};`, 'utf-8');

  console.log(`data.json → ${dataJsonPath}`);
  console.log(`data.js  → ${dataJsPath}`);

  // Resumo final
  console.log('');
  console.log('=== RESUMO FINAL ===');
  for (const v of valid) {
    const t = v.output.dashboard.summary.totals;
    console.log(`${v.mes}: ${t.total} carteiras | LIBERAR ${t.liberar} | ALERTA ${t.alerta} | CORRIGIR ${t.corrigir}`);
  }
  console.log('');
  console.log('Pipeline concluído.');
}

main().catch(err => {
  console.error('FATAL:', err.message ?? err);
  process.exit(1);
});
