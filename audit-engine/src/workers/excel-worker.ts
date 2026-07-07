import { parentPort, workerData } from 'node:worker_threads';
import { ingestFile } from '../parsers/registry.js';
import { runEngine } from '../engine.js';
import fs from 'node:fs/promises';
import path from 'node:path';

interface WorkerTask {
  filePath: string;
  mes: string;
  baseline: string;
  filename: string;
  root: string;
}

interface WorkerResult {
  ok: boolean;
  totals: { liberar: number; alerta: number; corrigir: number };
  carteiras: number;
  mes: string;
  error?: string;
}

if (!parentPort) {
  throw new Error('This file must be run as a worker thread');
}

parentPort.on('message', async (task: WorkerTask) => {
  try {
    const { filePath, mes, baseline, filename, root } = task;

    // Process the Excel file
    const carteiras = await ingestFile({ arquivo: filePath, mes, baseline });
    const meta = { mes, baseline, arquivo: filename, processadoEm: new Date().toISOString() };
    const output = runEngine(carteiras, { meta });

    // Write output files
    const dataJsonPath = path.join(root, 'data.json');
    const dataJsPath = path.join(root, 'data.js');
    const auditPath = path.join(root, 'audits', mes, 'audit.json');

    await fs.mkdir(path.dirname(auditPath), { recursive: true });
    await fs.writeFile(auditPath, JSON.stringify(output, null, 2), 'utf-8');
    await fs.writeFile(dataJsonPath, JSON.stringify(output.dashboard, null, 2), 'utf-8');
    await fs.writeFile(dataJsPath, `window.AUDIT_DATA = ${JSON.stringify(output.dashboard)};`, 'utf-8');

    // Clean up uploaded file
    await fs.unlink(filePath);

    // Send result back to main thread
    const result: WorkerResult = {
      ok: true,
      totals: output.dashboard.summary.totals,
      carteiras: output.dashboard.carteiras.length,
      mes,
    };

    parentPort?.postMessage(result);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    parentPort?.postMessage({ ok: false, error });
  }
});
