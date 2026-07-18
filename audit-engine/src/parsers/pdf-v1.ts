import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AtivoRow, CarteiraRaw, CarteiraTotal, PeriodoRef } from '../schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname, '..', '..', '..', 'scripts');
const PYTHON = findPython();

interface PdfIngestOptions {
  pasta: string;
  mes: string;
  baseline: string;
}

interface PythonOutput {
  meta: { mes: string; baseline: string; processadoEm: string };
  carteiras: any[];
}

function findPython(): string {
  const candidates = ['python', 'python3', 'py'];
  for (const cmd of candidates) {
    try {
      const r = spawnSync(cmd, ['--version'], { timeout: 5000, encoding: 'utf-8' });
      if (r.status === 0) return cmd;
    } catch { /* try next */ }
  }
  return 'python';
}

function mapAtivoRow(raw: any): AtivoRow {
  return {
    type: raw.type ?? 'ativo',
    classe: raw.classe ?? undefined,
    nome: raw.nome ?? undefined,
    instituicao: raw.instituicao ?? undefined,
    plBase: raw.plBase ?? 0,
    plRef: raw.plRef ?? 0,
    diff: raw.diff ?? (raw.plRef - raw.plBase),
    varPct: raw.varPct ?? 0,
    compras: raw.compras ?? undefined,
    vendas: raw.vendas ?? undefined,
    eventos: raw.eventos ?? undefined,
    impostos: raw.impostos ?? undefined,
    provIR: raw.provIR ?? undefined,
    part: raw.part ?? undefined,
  };
}

function mapTotalRow(raw: any): CarteiraTotal | undefined {
  if (!raw) return undefined;
  return {
    plBase: raw.plBase ?? 0,
    plRef: raw.plRef ?? 0,
    diff: raw.diff ?? (raw.plRef - raw.plBase),
    varPct: raw.varPct ?? 0,
    compras: raw.compras ?? undefined,
    vendas: raw.vendas ?? undefined,
    eventos: raw.eventos ?? undefined,
    impostos: raw.impostos ?? undefined,
    provIR: raw.provIR ?? undefined,
    part: raw.part ?? undefined,
  };
}

export async function parsePdfBookFolder(options: PdfIngestOptions): Promise<CarteiraRaw[]> {
  const scriptPath = path.join(SCRIPTS_DIR, 'extract-pdfs.py');

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script de extracao nao encontrado: ${scriptPath}`);
  }

  const pastaAbs = path.resolve(options.pasta);
  if (!fs.existsSync(pastaAbs)) {
    throw new Error(`Pasta nao encontrada: ${pastaAbs}`);
  }

  const args = [
    scriptPath,
    '--pasta', pastaAbs,
    '--mes', options.mes,
    '--baseline', options.baseline,
  ];

  const proc = spawnSync(PYTHON, args, {
    timeout: 300_000,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    windowsHide: true,
  });

  if (proc.error) {
    throw new Error(`Erro ao executar Python (${PYTHON}): ${proc.error.message}`);
  }

  if (proc.status !== 0) {
    const stderr = (proc.stderr ?? '').trim();
    throw new Error(`Script Python falhou (exit ${proc.status})${stderr ? `: ${stderr}` : ''}`);
  }

  const stdout = proc.stdout ?? '';
  if (!stdout.trim()) {
    throw new Error('Script Python nao produziu saida JSON');
  }

  let parsed: PythonOutput;
  try {
    parsed = JSON.parse(stdout.trim()) as PythonOutput;
  } catch (e) {
    const preview = stdout.slice(0, 500);
    throw new Error(
      `JSON invalido do script Python: ${(e as Error).message}\nPrimeiros 500 chars: ${preview}`,
    );
  }

  if (!parsed.carteiras || parsed.carteiras.length === 0) {
    throw new Error('Nenhuma carteira extraida dos PDFs');
  }

  // Extracao PARCIAL nao pode passar calada: antes, se o Python pulava uma
  // carteira (cabecalho fora do padrao), ela sumia do relatorio do cliente e o
  // mes saia "OK". O Python ja avisa no stderr, mas na linha 98-101 o stderr so
  // e lido em FALHA (exit != 0). No sucesso com carteira pulada, o exit e 0 e o
  // aviso era descartado. Aqui tornamos audivel, sem derrubar a ingestao:
  const stderrAvisos = (proc.stderr ?? '').trim();
  if (stderrAvisos) {
    console.warn(`[audit-engine] Avisos do extrator Python (pasta ${path.basename(pastaAbs)}):\n${stderrAvisos}`);
  }
  // Contagem: 1 book PDF = 1 carteira. Se vierem menos carteiras que PDFs, algum
  // book foi descartado. Aviso (nao throw): a premissa 1:1 nao esta coberta por
  // fixture real, entao um throw poderia bloquear um mes valido. Suba para erro
  // duro assim que a contagem esperada for confirmada contra os books reais.
  const pdfCount = fs.readdirSync(pastaAbs).filter((f) => /\.pdf$/i.test(f)).length;
  if (pdfCount > 0 && parsed.carteiras.length < pdfCount) {
    console.warn(
      `[audit-engine] EXTRACAO PARCIAL: ${parsed.carteiras.length} carteira(s) extraida(s) de ${pdfCount} PDF(s) na pasta ${path.basename(pastaAbs)}. ` +
      `Faltam ${pdfCount - parsed.carteiras.length} — revise os avisos acima antes de entregar o relatorio.`,
    );
  }

  const results: CarteiraRaw[] = parsed.carteiras.map((raw: any) => {
    const periodo: PeriodoRef = raw.periodo ?? {
      baseline: options.baseline,
      referencia: options.mes,
      baselineLabel: options.baseline,
      referenciaLabel: options.mes,
    };

    return {
      nome: raw.nome ?? 'DESCONHECIDA',
      periodo,
      plBase: raw.plBase ?? 0,
      plRef: raw.plRef ?? 0,
      varRS: raw.varRS ?? (raw.plRef - raw.plBase),
      varPct: raw.varPct ?? 0,
      rentRef: raw.rentRef ?? null,
      continuidade: raw.continuidade ?? null,
      somaVsTotal: raw.somaVsTotal ?? null,
      perfImplicita: raw.perfImplicita ?? null,
      eventos: raw.eventos ?? 0,
      impostos: raw.impostos ?? 0,
      ativos: (raw.ativos ?? []).map(mapAtivoRow),
      total: mapTotalRow(raw.total),
      nAtivosBase: raw.nAtivosBase ?? 0,
      nAtivosRef: raw.nAtivosRef ?? 0,
      fonte: {
        tipo: 'pdf',
        template: 'custodian-pdf-v1',
        arquivo: raw.fonte?.arquivo ?? '',
      },
    };
  });

  return results;
}
