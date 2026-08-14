/**
 * adapters/html.ts — adaptador HTML mínimo do snapshot EOD.
 *
 * Fase 1: parser documentado sem DOM. Para cada <table>, a primeira linha cuja
 * célula contém (case-insensitive) "carteira" ou "ativo" é o cabeçalho; linhas
 * seguintes com >= 3 células são posições. O valor é a coluna de cabeçalho
 * "valor" quando existir, senão a 4ª célula. Sem tabela reconhecida: erro
 * explícito, nunca adivinhação.
 */

import type { RawSnapshot, SnapshotFonte } from '../types.js';
import { parseValorBR } from './valor.js';

function stripTags(celula: string): string {
  return celula.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').trim();
}

export function parseHtml(texto: string, fonte: SnapshotFonte, data: string): RawSnapshot {
  const tabelas = texto.match(/<table[\s\S]*?<\/table>/gi) || [];
  const carteiras = new Map<string, { nome: string; posicoes: { ativo: string; valor: number; classe?: string; vencimento?: string; quantidade?: number }[] }>();

  let tabelasUsadas = 0;

  for (const tabela of tabelas) {
    const linhas = tabela.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    let header: string[] | null = null;
    let idxValor = -1;
    let idxCarteira = -1;
    let idxAtivo = -1;

    for (const linha of linhas) {
      const celulas = [...linha.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
      if (!celulas.length) continue;

      const temCabecalho = celulas.some((c) => /carteira/i.test(c) || /ativo/i.test(c));
      if (!header && temCabecalho) {
        header = celulas.map((c) => c.toLowerCase());
        idxCarteira = header.indexOf('carteira');
        idxAtivo = header.indexOf('ativo');
        idxValor = header.indexOf('valor');
        if (idxValor === -1) idxValor = 3; // fallback documentado: 4ª célula
        tabelasUsadas++;
        continue;
      }
      if (!header) continue; // antes do cabeçalho reconhecido, ignora

      if (celulas.length < 3) continue;

      const nome = (idxCarteira >= 0 ? celulas[idxCarteira] : '') || '';
      const ativo = (idxAtivo >= 0 ? celulas[idxAtivo] : '') || '';
      if (!nome || !ativo) continue;

      const valorStr = celulas[idxValor] || '';
      const valor = parseValorBR(valorStr);
      if (valor === null || !Number.isFinite(valor)) continue; // linha de total/legenda

      if (!carteiras.has(nome)) carteiras.set(nome, { nome, posicoes: [] });
      const posicao: { ativo: string; valor: number; classe?: string; vencimento?: string; quantidade?: number } = { ativo, valor };
      if (idxValor < celulas.length && header.includes('classe')) {
        const classe = celulas[header.indexOf('classe')];
        if (classe) posicao.classe = classe;
      }
      carteiras.get(nome)!.posicoes.push(posicao);
    }
  }

  if (!tabelasUsadas || !carteiras.size) {
    throw new Error('HTML: nenhuma tabela reconhecida (esperado cabeçalho com "carteira" ou "ativo").');
  }

  return { data, fonte, carteiras: [...carteiras.values()] };
}
