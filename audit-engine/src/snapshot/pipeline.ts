/**
 * src/snapshot/pipeline.ts — guardas de integridade da ingestão (Fase 1).
 *
 * Quatro peças do caminho multi-cliente, decididas em 2026-08-21:
 *
 * - tenantId: rótulo do cliente dono dos artefatos. Campo novo com default
 *   'default', compat com snapshot.json antigo sem o campo (tenantDe).
 * - validarSnapshot: guard ANTES de gravar. O normalize valida a entrada;
 *   aqui valida o produto final, para uma regressão de derivação não gravar
 *   mentira (ex.: plTotal divergindo da soma das posições).
 * - fila de exceção: arquivo que falha no adaptar/normalizar/validar não some.
 *   Cópia e manifest ficam em audits/<data>/fila-excecao/ e o erro original é
 *   relançado, o chamador decide se para.
 * - reconciliação: fatos contra o período anterior (delta de PL por carteira
 *   em comum, carteiras novas e sumidas), sem julgamento. O diff de eventos é
 *   coisa separada e continua em diff.ts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { encontrarPeriodoAnterior } from './diff.js';
import type { Snapshot } from './types.js';

export const TENANT_DEFAULT = 'default';

export function validarTenant(tenantId: string): string {
  const t = (tenantId ?? '').trim();
  if (!t) throw new Error('Tenant vazio. Informe o rotulo do cliente com --tenant.');
  if (/[\\/]/.test(t)) {
    throw new Error(`Tenant invalido: "${t}". Rotulo nao pode conter separador de path.`);
  }
  return t;
}

/** Tenant de um snapshot lido do disco: ausente (arquivo antigo) = 'default'. */
export function tenantDe(snap: Snapshot): string {
  return snap.tenantId ?? TENANT_DEFAULT;
}

/**
 * Guard de integridade do Snapshot pronto para gravar. Não repete o normalize
 * (nome vazio, valor não finito, vencimento malformado já morrem lá), confere
 * o contrato do arquivo final: schema, carteiras presentes e únicas, plTotal
 * coerente com a soma (derivação é fonte única de verdade).
 */
export function validarSnapshot(snap: Snapshot): void {
  if (snap.schema !== 'snapshot/v1') {
    throw new Error(`Snapshot: schema "${snap.schema}" nao e snapshot/v1.`);
  }
  if (!Array.isArray(snap.carteiras) || snap.carteiras.length === 0) {
    throw new Error('Snapshot: nenhuma carteira para gravar.');
  }
  const nomes = new Set<string>();
  for (const c of snap.carteiras) {
    if (!c.nome) throw new Error('Snapshot: carteira com nome vazio.');
    if (nomes.has(c.nome)) throw new Error(`Snapshot: carteira duplicada "${c.nome}".`);
    nomes.add(c.nome);
    const soma = c.posicoes.reduce((acc, p) => acc + p.valor, 0);
    if (Math.abs(soma - c.plTotal) > 0.005) {
      throw new Error(
        `Snapshot: plTotal diverge da soma das posicoes na carteira "${c.nome}" (${c.plTotal} vs ${soma}). Nada foi gravado.`
      );
    }
  }
}

export interface ExcecaoManifest {
  schema: 'excecao/v1';
  data: string;
  tenantId: string;
  fonte: string;
  sha256: string;
  erro: string;
  arquivoOriginal: string; // basename, nunca caminho absoluto da máquina do cliente
  copia: string; // basename da cópia na fila
  processadoEm: string;
}

/**
 * Copia o arquivo que falhou e grava o manifest na fila de exceção do período.
 * Nunca lança: se até a fila falhar, o erro original segue para o chamador e
 * a falha de infra fica no console.
 */
export function enfileirarExcecao(opts: {
  root: string;
  data: string;
  tenantId: string;
  fonte: string;
  arquivo: string;
  hash: string;
  erro: Error;
}): { manifest: string; copia: string } {
  const dir = path.join(opts.root, 'audits', opts.data, 'fila-excecao');
  fs.mkdirSync(dir, { recursive: true });
  const base = path.basename(opts.arquivo);
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  const sufixo = `${opts.hash.slice(0, 8)}.${carimbo}`;
  const copia = path.join(dir, `${base}.${sufixo}.orig`);
  // Fonte pode ser diretório (pasta de books): cópia de arquivo não se aplica,
  // o manifest registra que a origem ficou no lugar. Nunca gravar caminho
  // absoluto da máquina do cliente na fila (mesma regra do ingestion.json).
  if (fs.statSync(opts.arquivo).isFile()) {
    fs.copyFileSync(opts.arquivo, copia);
  } else {
    fs.writeFileSync(copia + '.diretorio', 'diretorio: fonte preservada no lugar\n', 'utf8');
  }

  const manifest: ExcecaoManifest = {
    schema: 'excecao/v1',
    data: opts.data,
    tenantId: opts.tenantId,
    fonte: opts.fonte,
    sha256: opts.hash,
    erro: opts.erro.message,
    arquivoOriginal: base,
    copia: path.basename(copia),
    processadoEm: new Date().toISOString(),
  };
  const manifestPath = path.join(dir, `${base}.${sufixo}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return { manifest: manifestPath, copia };
}

export interface ReconciliacaoCarteira {
  carteira: string;
  plAnterior: number;
  plAtual: number;
  delta: number;
  deltaPct: number | null; // null quando plAnterior === 0
}

export interface ReconciliacaoFile {
  schema: 'reconciliacao/v1';
  data: string;
  baseData: string | null; // null = linha de base (sem período anterior)
  tenantId: string;
  geradoEm: string;
  engine: { nome: 'atlas-audit-engine'; versao: string };
  carteirasNovas: string[];
  carteirasSumidas: string[];
  carteirasEmComum: ReconciliacaoCarteira[];
}

/**
 * Fatos contra o período anterior, sem julgamento: quem sumiu, quem nasceu e
 * o delta de PL de cada carteira em comum. Sem período anterior não grava nada,
 * não existe o que reconciliar. Falha aqui não derruba a ingestão já gravada,
 * o chamador decide (o ingest loga e segue).
 */
export function reconciliar(
  root: string,
  data: string,
  tenantId: string,
  novo: Snapshot
): void {
  const anterior = encontrarPeriodoAnterior(root, data);
  if (!anterior) return;

  const mapaAnt = new Map(anterior.snapshot.carteiras.map((c) => [c.nome, c]));
  const mapaNovo = new Map(novo.carteiras.map((c) => [c.nome, c]));

  const carteirasNovas = [...mapaNovo.keys()].filter((n) => !mapaAnt.has(n)).sort();
  const carteirasSumidas = [...mapaAnt.keys()].filter((n) => !mapaNovo.has(n)).sort();
  const carteirasEmComum = [...mapaNovo.keys()]
    .filter((n) => mapaAnt.has(n))
    .sort()
    .map((nome) => {
      const plAnterior = mapaAnt.get(nome)!.plTotal;
      const plAtual = mapaNovo.get(nome)!.plTotal;
      const delta = plAtual - plAnterior;
      return {
        carteira: nome,
        plAnterior,
        plAtual,
        delta,
        deltaPct: plAnterior !== 0 ? delta / plAnterior : null,
      };
    });

  const file: ReconciliacaoFile = {
    schema: 'reconciliacao/v1',
    data,
    baseData: anterior.data,
    tenantId,
    geradoEm: new Date().toISOString(),
    engine: {
      nome: 'atlas-audit-engine',
      versao: process.env.npm_package_version ?? '0.0.0',
    },
    carteirasNovas,
    carteirasSumidas,
    carteirasEmComum,
  };
  const p = path.join(root, 'audits', data, 'reconciliacao.json');
  fs.writeFileSync(p, JSON.stringify(file, null, 2) + '\n', 'utf8');
}
