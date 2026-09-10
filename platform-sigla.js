/* platform-sigla.js — a ÚNICA função de sigla do produto.
 *
 * Por que existe um arquivo só para isto: sigla de cliente aparece em tela,
 * em CSV, em título, em `title` de gráfico e no relatório. Se cada um desses
 * lugares tivesse a própria regra, o mesmo cliente sairia "CAP" numa tela e
 * "CA" na outra, e a divergência só apareceria na frente do cliente. Uma
 * função, um resultado.
 *
 * Quem usa:
 *   - o navegador, via window.AtlasSigla (carregado primeiro em src/main.jsx,
 *     antes da camada de dados);
 *   - o Worker do demo, que projeta o catálogo (demo-worker/src/api.js importa
 *     este arquivo como módulo ESM, o mesmo, não uma cópia);
 *   - o gerador do conjunto do demo (scripts/gerar-dataset-demo.mjs).
 *
 * O NOME COMPLETO DO CLIENTE NÃO SAI DAQUI. Esta função recebe o nome e
 * devolve só as iniciais. Quem guarda o nome por extenso é o dado interno
 * (o conjunto do Worker, o overlay da instância), e quem exibe chama isto.
 */

/* Partículas que não são nome e não entram na sigla. Inclui a grafia
 * estrangeira porque cadastro de cliente no Brasil tem "van", "del" e "of"
 * com frequência maior do que se imagina. */
const PARTICULAS = [
  'de', 'da', 'das', 'do', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'por', 'para', 'com', 'ao', 'aos', 'a', 'as',
  'of', 'the', 'and', 'van', 'von', 'del', 'della', 'y', 'la', 'el',
];

/**
 * sigla('Carlos Alberto Pereira') -> 'CAP'
 *
 * Regras, todas de propósito:
 * - separa por espaço, hífen, barra, vírgula e ponto, então "Ana-Clara",
 *   "Ana Clara" e "Ana  Clara" (espaço duplo) dão a mesma coisa;
 * - ignora as partículas da lista acima;
 * - ignora token que não começa com letra, que é o caso do número solto que
 *   às vezes vem no fim do cadastro;
 * - aguenta espaço no começo e no fim;
 * - devolve string vazia quando não sobra nada, e quem chama decide o que
 *   fazer. Nunca inventa sigla a partir do nada, nunca devolve null.
 */
export function sigla(nome) {
  const bruto = String(nome == null ? '' : nome).trim();
  if (!bruto) return '';

  const letras = [];
  bruto.split(/[\s\-/,.;]+/).forEach((token) => {
    if (!token) return;
    if (!/^[A-Za-zÀ-ÿ]/.test(token)) return;             // número ou símbolo
    if (PARTICULAS.indexOf(token.toLowerCase()) >= 0) return;
    letras.push(token[0].toUpperCase());
  });

  if (!letras.length) return bruto[0].toUpperCase();
  return letras.join('');
}

/**
 * O que a tela pode mostrar de um cliente: a sigla, e só ela. Recebe o nome
 * por extenso e devolve a sigla; `fallback` cobre o caso de nome vazio, onde
 * a única identificação honesta é o código da carteira.
 */
export function siglaCliente(nome, fallback) {
  return sigla(nome) || String(fallback == null ? '' : fallback);
}

const AtlasSigla = { sigla, siglaCliente };

/* No navegador o módulo também se registra na janela, porque as páginas são
 * scripts que leem window.* e porque platform-data.js precisa disto antes de
 * montar o catálogo. Em Node e no Worker a atribuição não roda. */
if (typeof window !== 'undefined') window.AtlasSigla = AtlasSigla;
