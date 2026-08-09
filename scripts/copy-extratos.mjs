/**
 * copy-extratos.mjs — Fase 1 do plano de historico 2024-2026
 * Copia PDFs do OneDrive (read-only) para audits/<AAAA-MM>/input/Editados/
 *
 * Uso: node scripts/copy-extratos.mjs
 *
 * Propriedades:
 * - Read-only na origem (nunca escreve, renomeia ou deleta no OneDrive)
 * - Idempotente (pula arquivo ja copiado com mesmo tamanho)
 * - Verifica hidratacao (bytes reais, nao placeholder do OneDrive)
 * - Resiliente (try/catch por arquivo, acumula falhas)
 * - Reexecutavel (so tenta o que faltou)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// Caminho da arvore de extratos e da instancia, nunca fixo no produto.
// ATLAS_EXTRATOS aponta para a pasta "Extratos Mensais" (ou equivalente).
const ONEDRIVE_BASE = process.env.ATLAS_EXTRATOS;
if (!ONEDRIVE_BASE) {
  console.error('ERRO: defina ATLAS_EXTRATOS apontando para a pasta de extratos mensais.');
  console.error('Ex.: $env:ATLAS_EXTRATOS = "D:\\dados\\Extratos Mensais"');
  process.exit(1);
}

// Meses a copiar (25 meses: 2024-01 a 2026-01)
const MONTHS = [];
for (let y = 2024; y <= 2026; y++) {
  const end = (y === 2026) ? 1 : 12;
  for (let m = 1; m <= end; m++) {
    MONTHS.push(`${y}-${String(m).padStart(2, '0')}`);
  }
}

function getSourceDir(monthLabel) {
  const [year, month] = monthLabel.split('-');
  if (year === '2026') {
    // 2026_01, 2026_02 etc — direto na raiz, sem subpasta de ano
    return path.join(ONEDRIVE_BASE, `${year}_${month}`, 'Editados');
  }
  // 2024 e 2025: dentro da pasta do ano
  return path.join(ONEDRIVE_BASE, year, `${year}_${month}`, 'Editados');
}

function getDestDir(monthLabel) {
  return path.join(ROOT, 'audits', monthLabel, 'input', 'Editados');
}

function isHydrated(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return false;
    // Le o primeiro byte para garantir que nao e placeholder
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(1);
    const bytesRead = fs.readSync(fd, buf, 0, 1, 0);
    fs.closeSync(fd);
    return bytesRead === 1;
  } catch {
    return false;
  }
}

async function main() {
  console.log('=== COPIA DE EXTRATOS MENSAIS (OneDrive → ATLAS) ===');
  console.log(`Origem : ${ONEDRIVE_BASE}`);
  console.log(`Destino: ${ROOT}\\audits\\<AAAA-MM>\\input\\Editados\\`);
  console.log(`Meses : ${MONTHS.length} (${MONTHS[0]} a ${MONTHS[MONTHS.length - 1]})`);
  console.log('');

  const report = [];
  let totalCopied = 0;
  let totalSkipped = 0;
  let totalFailures = 0;

  for (const mes of MONTHS) {
    const srcDir = getSourceDir(mes);
    const dstDir = getDestDir(mes);

    if (!fs.existsSync(srcDir)) {
      report.push({ mes, status: 'SKIP', reason: 'origem nao encontrada', copied: 0, skipped: 0, failures: 0 });
      console.log(`[${mes}] Origem nao encontrada: ${srcDir} — pulando.`);
      continue;
    }

    let pdfs;
    try {
      pdfs = fs.readdirSync(srcDir).filter(f => /\.pdf$/i.test(f) && f.startsWith('Book_'));
    } catch (err) {
      report.push({ mes, status: 'ERROR', reason: err.message, copied: 0, skipped: 0, failures: 0 });
      console.error(`[${mes}] ERRO ao listar origem: ${err.message}`);
      continue;
    }

    if (pdfs.length === 0) {
      report.push({ mes, status: 'SKIP', reason: 'nenhum Book_*.pdf', copied: 0, skipped: 0, failures: 0 });
      console.log(`[${mes}] Nenhum Book_*.pdf encontrado — pulando.`);
      continue;
    }

    // Cria destino
    fs.mkdirSync(dstDir, { recursive: true });

    let copied = 0, skipped = 0, failures = 0;
    const failureList = [];

    for (const pdf of pdfs) {
      const src = path.join(srcDir, pdf);
      const dst = path.join(dstDir, pdf);

      try {
        // Idempotencia: pula se ja existe com mesmo tamanho e hidratado
        if (fs.existsSync(dst)) {
          const srcStat = fs.statSync(src);
          const dstStat = fs.statSync(dst);
          if (srcStat.size === dstStat.size && isHydrated(dst)) {
            skipped++;
            continue;
          }
          // Tamanho diferente ou nao hidratado → recopia
        }

        const srcStat = fs.statSync(src);
        fs.copyFileSync(src, dst);

        // Verifica hidratacao
        if (!isHydrated(dst)) {
          failures++;
          failureList.push(`${pdf} (hidratacao falhou)`);
          continue;
        }

        const dstStat = fs.statSync(dst);
        if (dstStat.size !== srcStat.size) {
          failures++;
          failureList.push(`${pdf} (tamanho diverge: src=${srcStat.size} dst=${dstStat.size})`);
          continue;
        }

        copied++;
      } catch (err) {
        failures++;
        failureList.push(`${pdf} (${err.message})`);
      }
    }

    const status = failures > 0 ? 'WARN' : 'OK';
    report.push({ mes, status, copied, skipped, failures, failureList });
    totalCopied += copied;
    totalSkipped += skipped;
    totalFailures += failures;

    const failDetail = failures > 0 ? ` — ${failures} FALHAS: [${failureList.join(', ')}]` : '';
    console.log(`[${mes}] ${pdfs.length} PDFs encontrados | ${copied} copiados | ${skipped} pulados${failDetail}`);
  }

  // Resumo final
  console.log('');
  console.log('=== RESUMO ===');
  console.log(`Total PDFs copiados : ${totalCopied}`);
  console.log(`Total PDFs pulados  : ${totalSkipped}`);
  console.log(`Total falhas        : ${totalFailures}`);
  console.log(`Meses processados   : ${report.filter(r => r.status !== 'SKIP').length}/${MONTHS.length}`);

  const warns = report.filter(r => r.status === 'WARN' || r.status === 'ERROR');
  if (warns.length > 0) {
    console.log('');
    console.log('=== ATENCAO — meses com falha ===');
    for (const w of warns) {
      console.log(`[${w.mes}] ${w.status}: ${w.reason || w.failureList?.join(', ')}`);
    }
  }

  if (totalFailures > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('FATAL:', err.message ?? err);
  process.exit(1);
});
