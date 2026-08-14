/**
 * adapters/csv.ts — adaptador CSV do snapshot EOD.
 *
 * Header declarado e obrigatório: carteira,ativo,classe,valor,vencimento,quantidade
 * (classe/vencimento/quantidade são opcionais; carteira/ativo/valor obrigatórios).
 * Valores via parseBRL (formato brasileiro). Erros citam a linha, nunca adivinham.
 */

import type { RawSnapshot, SnapshotFonte } from '../types.js';
import { parseValorBR } from './valor.js';

const HEADER_OBRIGATORIO = ['carteira', 'ativo', 'valor'];
const HEADER_CONHECIDO = ['carteira', 'ativo', 'classe', 'valor', 'vencimento', 'quantidade'];

/**
 * Split de linha CSV com estado: respeita campos entre aspas, incluindo
 * vírgula DENTRO das aspas (ex.: "100.000,00"). Aspa escapada ("") não é
 * suportada neste adaptador mínimo — erro explícito se aparecer.
 */
function splitLinha(linha: string): string[] {
  const campos: string[] = [];
  let atual = '';
  let emAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (emAspas) {
      if (ch === '"') {
        if (linha[i + 1] === '"') {
          throw new Error('CSV: aspa escapada ("") nao suportada neste adaptador.');
        }
        emAspas = false;
      } else {
        atual += ch;
      }
    } else if (ch === '"') {
      emAspas = true;
    } else if (ch === ',') {
      campos.push(atual);
      atual = '';
    } else {
      atual += ch;
    }
  }
  if (emAspas) throw new Error('CSV: aspa nao fechada na linha.');
  campos.push(atual);
  return campos.map((c) => c.trim());
}

export function parseCsv(texto: string, fonte: SnapshotFonte, data: string): RawSnapshot {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/);
  const cabecalho = splitLinha(linhas[0] || '').map((c) => c.trim().toLowerCase());

  const desconhecidas = cabecalho.filter((c) => c && !HEADER_CONHECIDO.includes(c));
  if (desconhecidas.length) {
    throw new Error(`CSV: colunas desconhecidas no header: ${desconhecidas.join(', ')}. Esperado: ${HEADER_CONHECIDO.join(',')}`);
  }
  for (const c of HEADER_OBRIGATORIO) {
    if (!cabecalho.includes(c)) {
      throw new Error(`CSV: coluna obrigatoria ausente: "${c}". Header esperado: ${HEADER_CONHECIDO.join(',')}`);
    }
  }

  const idx = (nome: string) => cabecalho.indexOf(nome);

  const carteiras = new Map<string, { nome: string; posicoes: { ativo: string; valor: number; classe?: string; vencimento?: string; quantidade?: number }[] }>();

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha.trim()) continue;
    const campos = splitLinha(linha);
    if (campos.length < 3) {
      throw new Error(`CSV: linha ${i + 1} com menos de 3 colunas.`);
    }

    const nome = campos[idx('carteira')] || '';
    const ativo = campos[idx('ativo')] || '';
    const valorStr = campos[idx('valor')] || '';
    const valor = parseValorBR(valorStr);
    if (!nome || !ativo) {
      throw new Error(`CSV: linha ${i + 1} sem carteira ou ativo.`);
    }
    if (valor === null || !Number.isFinite(valor)) {
      throw new Error(`CSV: linha ${i + 1} com valor nao numerico: "${valorStr}".`);
    }

    if (!carteiras.has(nome)) carteiras.set(nome, { nome, posicoes: [] });
    const pos = { ativo, valor };
    const classe = campos[idx('classe')];
    const vencimento = campos[idx('vencimento')];
    const quantidade = campos[idx('quantidade')];
    const posicao: { ativo: string; valor: number; classe?: string; vencimento?: string; quantidade?: number } = pos;
    if (classe) posicao.classe = classe;
    if (vencimento) posicao.vencimento = vencimento;
    if (quantidade && parseValorBR(quantidade) !== null) posicao.quantidade = parseValorBR(quantidade) as number;
    carteiras.get(nome)!.posicoes.push(posicao);
  }

  if (!carteiras.size) {
    throw new Error('CSV: arquivo sem nenhuma linha de posicao reconhecida.');
  }

  return { data, fonte, carteiras: [...carteiras.values()] };
}
