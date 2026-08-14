/**
 * adapters/txt-b3.ts — adaptador de arquivo posicional no estilo B3.
 *
 * Modela a anatomia dos arquivos de largura fixa que a B3 define para troca
 * com participantes (manual público "ENVIAR ARQUIVOS.pdf"): header com tipo 0,
 * linhas de dados com tipo 1, datas AAAAMMDD, quantidades 9(12)v9(08) e PU
 * 9(10)v9(08). É um MODELO da convenção pública, não uma cópia de layout
 * proprietário de custodiante.
 *
 * Layout da linha (posições 1..124):
 *   1-3    sistema       "MDA"
 *   4      tipo          "0" header / "1" dados
 *   5-8    acao          "POSI"
 *   9-16   data          AAAAMMDD
 *   17-24  contaCliente  9(08)
 *   25-35  codigoAtivo   X(11)
 *   36-75  nomeAtivo     X(40)
 *   76-96  quantidade    9(12)v9(08)
 *   97-115 preco         9(10)v9(08)
 *   116-123 vencimento   AAAAMMDD ou espaços
 *   124    delimitador   "<"
 *
 * valor = quantidade × preço arredondado a 2 casas (convenção do arquivo: o
 * valor de posição é derivado das outras duas colunas, sem coluna própria).
 * A carteira vem como conta de cliente; o name-map da instância traduz.
 */

import type { RawSnapshot, SnapshotFonte } from '../types.js';
import { parseValorBR } from './valor.js';

function campo(linha: string, ini: number, fim: number): string {
  return linha.slice(ini - 1, fim).trim();
}

function dataB3(s: string): string | null {
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;
}

export function parseTxtB3(texto: string, fonte: SnapshotFonte, data: string): RawSnapshot {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) throw new Error('B3: arquivo vazio.');

  if (campo(linhas[0], 1, 3) !== 'MDA') {
    throw new Error('B3: primeira linha nao e um header "MDA" (sistema X(03)).');
  }
  const linhasDados = linhas.slice(1);
  if (!linhasDados.length) throw new Error('B3: header sem linhas de dados.');

  const carteiras = new Map<
    string,
    { nome: string; posicoes: { ativo: string; valor: number; quantidade?: number; vencimento?: string }[] }
  >();

  for (let i = 0; i < linhasDados.length; i++) {
    const linha = linhasDados[i];
    const tipo = campo(linha, 4, 4);
    if (tipo !== '1') {
      throw new Error(`B3: linha ${i + 2} com tipo "${tipo}" (esperado "1" para dados).`);
    }
    const conta = campo(linha, 17, 24);
    const ativo = campo(linha, 36, 75) || campo(linha, 25, 35);
    if (!conta || !ativo) {
      throw new Error(`B3: linha ${i + 2} sem conta de cliente ou ativo.`);
    }
    const quantidade = parseValorBR(campo(linha, 76, 96));
    const preco = parseValorBR(campo(linha, 97, 115));
    if (quantidade === null || preco === null) {
      throw new Error(`B3: linha ${i + 2} com quantidade ou preco nao numerico.`);
    }
    const valor = Math.round(quantidade * preco * 100) / 100;
    const vencimento = dataB3(campo(linha, 116, 123));

    if (!carteiras.has(conta)) carteiras.set(conta, { nome: conta, posicoes: [] });
    const posicao: { ativo: string; valor: number; quantidade?: number; vencimento?: string } = {
      ativo,
      valor,
      quantidade,
    };
    if (vencimento) posicao.vencimento = vencimento;
    carteiras.get(conta)!.posicoes.push(posicao);
  }

  if (!carteiras.size) {
    throw new Error('B3: arquivo sem nenhuma linha de posicao reconhecida.');
  }

  return { data, fonte, carteiras: [...carteiras.values()] };
}
