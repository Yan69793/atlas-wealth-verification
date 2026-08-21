/**
 * src/snapshot/ingest.ts — orquestração da ingestão de um snapshot EOD.
 *
 * Fluxo: sha256 dos bytes brutos → detecção de formato (--formato ou extensão)
 * → adaptador → normalize → validação mínima → idempotência → gravação.
 *
 * Idempotência: chave = data + hash do conteúdo. Mesmo dia + mesmo hash pula
 * (status 'skip'); mesmo dia + hash diferente reingere: o snapshot atual é
 * arquivado como snapshot.<8-hex>.json e o hash anterior entra no histórico de
 * ingestion.json. Nada é sobrescrito em silêncio.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { adaptar, detectFormato } from './adapters/index.js';
import { protegerRoot, tipoPeriodo, validarData } from './args.js';
import { loadClassMapping, loadNameMapping, loadTaxaMapping, normalize } from './normalize.js';
import {
  enfileirarExcecao,
  reconciliar,
  TENANT_DEFAULT,
  validarSnapshot,
  validarTenant,
} from './pipeline.js';
import type { FormatoEntrada, Snapshot, SnapshotFonte } from './types.js';

export interface IngestResult {
  status: 'criado' | 'skip' | 'reingerido';
  hash: string;
  caminhos: { ingestion: string; snapshot: string };
}

/**
 * sha256 da fonte: arquivo → bytes; diretório (pasta de books) → hash dos
 * nomes ordenados + hash de cada arquivo (determinístico e estável).
 */
function sha256Arquivo(arquivo: string): string {
  const st = fs.statSync(arquivo);
  if (!st.isDirectory()) {
    return crypto.createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex');
  }
  const h = crypto.createHash('sha256');
  for (const nome of fs.readdirSync(arquivo).sort()) {
    const fp = path.join(arquivo, nome);
    if (!fs.statSync(fp).isFile()) continue;
    const fh = crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex');
    h.update(`${nome}:${fh}\n`);
  }
  return h.digest('hex');
}

export function carregarSnapshotDoDisco(root: string, data: string): Snapshot | null {
  const p = path.join(root, 'audits', data, 'snapshot.json');
  if (!fs.existsSync(p)) return null;
  try {
    const obj = JSON.parse(fs.readFileSync(p, 'utf8')) as Snapshot;
    return obj && obj.schema === 'snapshot/v1' ? obj : null;
  } catch {
    return null; // corrompido: tratado como ausente; a ingestão regrava
  }
}

export async function ingestSnapshot(opts: {
  arquivo: string;
  data: string;
  fonte: SnapshotFonte;
  formato?: FormatoEntrada;
  root: string;
  force?: boolean;
  /** Rótulo do cliente dono dos artefatos. Default 'default' (instância única). */
  tenantId?: string;
}): Promise<IngestResult> {
  const { arquivo, data, fonte, formato, root, force } = opts;

  validarData(data); // defesa em profundidade: o CLI valida, a biblioteca também
  const periodo = tipoPeriodo(data);
  if (!periodo) throw new Error(`Data invalida: "${data}".`);
  protegerRoot(path.resolve(root)); // nunca gravar dentro do repo do produto
  if (!fonte || !fonte.trim()) throw new Error('Fonte vazia. Informe o rotulo logico da fonte.');
  if (/[\\/]/.test(fonte)) {
    throw new Error(`Fonte invalida: "${fonte}". Rotulo nao pode conter separador de path.`);
  }
  if (!fs.existsSync(arquivo)) throw new Error(`Arquivo nao encontrado: ${arquivo}`);

  const tenant = validarTenant(opts.tenantId ?? TENANT_DEFAULT);
  const hash = sha256Arquivo(arquivo);
  try {
  const formatoDetectado = detectFormato(arquivo, formato);
  const raw = await adaptar({ arquivo, data, fonte, formato: formatoDetectado });
  const snapshot = normalize(raw, periodo, loadNameMapping(root), loadClassMapping(root), loadTaxaMapping(root));
  snapshot.tenantId = tenant;
  validarSnapshot(snapshot);

  const dir = path.join(root, 'audits', data);
  const caminhos = {
    ingestion: path.join(dir, 'ingestion.json'),
    snapshot: path.join(dir, 'snapshot.json'),
  };

  const anterior = carregarSnapshotDoDisco(root, data);

  if (anterior && !force) {
    // ingestion.json corrompido é tratado como ausente (mesma regra do
    // snapshot.json): a reingestão recupera em vez de morrer num JSON quebrado.
    let ingestionAnterior: { sha256?: string } | null = null;
    if (fs.existsSync(caminhos.ingestion)) {
      try {
        ingestionAnterior = JSON.parse(fs.readFileSync(caminhos.ingestion, 'utf8')) as {
          sha256?: string;
        };
      } catch {
        ingestionAnterior = null;
      }
    }

    if (ingestionAnterior?.sha256 === hash) {
      console.log(`[skip] ${data}: mesmo dia + mesmo hash — nada a fazer.`);
      return { status: 'skip', hash, caminhos };
    }

    // Reingestão: arquiva o snapshot atual e registra o hash anterior.
    fs.mkdirSync(dir, { recursive: true });
    const arquivado = path.join(dir, `snapshot.${ingestionAnterior?.sha256?.slice(0, 8) ?? 'anterior'}.json`);
    fs.copyFileSync(caminhos.snapshot, arquivado);
  }

  fs.mkdirSync(dir, { recursive: true });

  const historico: { sha256: string; arquivo: string; processadoEm: string }[] = [];
  if (anterior && fs.existsSync(caminhos.ingestion)) {
    try {
      const antigo = JSON.parse(fs.readFileSync(caminhos.ingestion, 'utf8')) as {
        sha256?: string;
        arquivo?: string;
        processadoEm?: string;
        historico?: typeof historico;
      };
      if (antigo.sha256) {
        historico.push({ sha256: antigo.sha256, arquivo: antigo.arquivo ?? '?', processadoEm: antigo.processadoEm ?? '?' });
      }
      historico.push(...(antigo.historico ?? []));
    } catch {
      // ingestion corrompido: recomeça o histórico
    }
  }

  const processadoEm = new Date().toISOString();
  const ingestion = {
    schema: 'ingestion/v1',
    data,
    tenantId: tenant,
    fonte,
    formato: formatoDetectado,
    arquivo: path.basename(arquivo), // nunca caminho absoluto da máquina do cliente
    sha256: hash,
    processadoEm,
    historico,
  };

  fs.writeFileSync(caminhos.ingestion, JSON.stringify(ingestion, null, 2) + '\n', 'utf8');
  fs.writeFileSync(caminhos.snapshot, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  const status: IngestResult['status'] = anterior && !force ? 'reingerido' : 'criado';
  console.log(
    anterior && !force
      ? `[reingerido] tenant=${tenant} ${data}: hash ${hash.slice(0, 8)} substitui ${ingestion.historico[0]?.sha256.slice(0, 8)} (anterior arquivado).`
      : `[criado] tenant=${tenant} ${data}: ${snapshot.carteiras.length} carteiras, hash ${hash.slice(0, 8)}.`
  );

  // Reconciliação é fato contra o período anterior, não gate: falha dela não
  // derruba ingestão já gravada, o aviso fica no log para auditoria.
  try {
    reconciliar(root, data, tenant, snapshot);
  } catch (err) {
    console.warn(
      `[reconciliacao] ${data}: falhou (${err instanceof Error ? err.message : String(err)}) — ingestao gravada, reconciliacao nao.`
    );
  }

  return { status, hash, caminhos };
  } catch (err) {
    // Fila de exceção: o arquivo que falhou não some, cópia e manifest ficam em
    // audits/<data>/fila-excecao/. O erro original segue, o chamador decide se
    // para (o CLI para com exit 1, que é o comportamento pretendido).
    const erro = err instanceof Error ? err : new Error(String(err));
    enfileirarExcecao({ root, data, tenantId: tenant, fonte, arquivo, hash, erro });
    throw erro;
  }
}
