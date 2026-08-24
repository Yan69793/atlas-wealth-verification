/**
 * demo-carteiras.mjs — a casa sintética que alimenta TODOS os demos.
 *
 * Existe para o Radar e a tela de Eventos & Impacto mostrarem a MESMA casa.
 * Antes deste módulo cada gerador carregava sua própria cópia das carteiras, e
 * duas cópias de fixture divergem sozinhas: o assessor abriria o radar vendo
 * ALPHA_01 com R$ 4,05 mi e a tela de crédito com outro número, sem nenhum
 * erro em lugar nenhum.
 *
 * Carteiras, emissores e valores são fictícios, do catálogo demo do produto.
 * Nada de LGPD, tudo regenerável.
 */

export const VAZIO = {
  classeCanonica: null,
  indexador: null,
  taxaContratada: null,
  emissorId: null,
  emissorNome: null,
  economicGroupId: null,
  moeda: null,
  regiao: null,
  prazoAnos: null,
  liquidezDias: null,
  cobertoFGC: null,
};

export const at = (extra = {}) => ({ ...VAZIO, ...extra });

export function pos(ativo, valor, atributos, vencimento = null) {
  return { carteira: '', ativo, classe: null, valor, vencimento, quantidade: null, instituicao: null, atributos };
}

export function carteira(nome, posicoes) {
  return {
    nome,
    plTotal: posicoes.reduce((a, p) => a + p.valor, 0),
    posicoes: posicoes.map((p) => ({ ...p, carteira: nome })),
  };
}

export function snap(data, carteiras) {
  return {
    schema: 'snapshot/v1',
    data,
    periodo: 'diario',
    fonte: 'custodiante-demo',
    geradoEm: '2026-08-24T12:00:00Z',
    engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
    tenantId: 'demo',
    carteiras,
  };
}

/* ── Emissores fictícios ─────────────────────────────────────────────────── */
const zeta = (extra = {}) =>
  at({ emissorId: 'banco-zeta', emissorNome: 'Banco Zeta', moeda: 'BRL', regiao: 'brasil', ...extra });
const omega = (extra = {}) =>
  at({ emissorId: 'banco-omega', emissorNome: 'Banco Omega', moeda: 'BRL', regiao: 'brasil', ...extra });
const gest = (n, extra = {}) =>
  at({ emissorId: `gestora-${n}`, emissorNome: `Gestora ${n}`, moeda: 'BRL', regiao: 'brasil', ...extra });
/** Emissor com nome próprio, para o evento de crédito ler bem na tela. */
const nomeado = (id, nome, extra = {}) =>
  at({ emissorId: id, emissorNome: nome, moeda: 'BRL', regiao: 'brasil', ...extra });

const rf = { classeCanonica: 'credito-privado', prazoAnos: 2, liquidezDias: 720 };
const cx = { classeCanonica: 'liquidez', indexador: 'CDI', prazoAnos: 0, liquidezDias: 0 };

/**
 * Enchimento: N posições pulverizadas, cada uma de emissor próprio e abaixo de
 * qualquer limiar.
 *
 * Não é decoração. Uma carteira de wealth tem 20 a 60 papéis, e fixture com 4
 * posições faz cada emissor valer 25% do PL, disparando concentração em todas
 * elas. A demo viraria uma parede de alarme que nenhuma carteira real produz,
 * e o assessor aprenderia a ignorar a tela antes de usá-la uma vez.
 */
function pulverizado(prefixo, quantidade, valorCada, base = {}) {
  return Array.from({ length: quantidade }, (_, i) =>
    pos(
      `${prefixo} ${String(i + 1).padStart(2, '0')}`,
      valorCada,
      gest(`${prefixo.toLowerCase().replace(/\s+/g, '-')}-${i}`, { ...rf, indexador: 'CDI', ...base })
    )
  );
}

/* ── ALPHA_01: concentração ESCONDIDA por emissor ────────────────────────────
   Três papéis de nomes diferentes, mesmo banco, somando 19% do PL. Nenhum dos
   três passa de 20% sozinho, então a tela de posições não acusa nada.        */
export const alpha01 = (fator = 1) =>
  carteira('ALPHA_01', [
    pos('CDB ZETA 2027', 260_000 * fator, zeta({ ...rf, indexador: 'CDI', taxaContratada: '110% CDI', cobertoFGC: true })),
    pos('LCI ZETA 2028', 250_000 * fator, zeta({ ...rf, indexador: 'CDI', taxaContratada: '96% CDI', cobertoFGC: true })),
    pos('LF ZETA 2029', 250_000 * fator, zeta({ ...rf, indexador: 'IPCA', taxaContratada: 'IPCA+6,2%' })),
    pos('FUNDO DI ALFA', 250_000 * fator, gest('di-alfa', { ...cx })),
    pos('FUNDO MULTI BETA', 240_000 * fator, gest('multi-beta', { classeCanonica: 'multimercado', indexador: 'MULTI', prazoAnos: 0, liquidezDias: 30 })),
    ...pulverizado('DEB ALPHA', 8, 200_000 * fator, { indexador: 'IPCA' }),
    ...pulverizado('CRA ALPHA', 6, 200_000 * fator),
  ]);

/* ── BRAVO_PV: parece diversificada, está inteira no mesmo indexador ─────────
   Quatorze papéis distintos, catorze emissores distintos, nenhum concentrado.
   E 96% do PL respondendo ao CDI.                                            */
export const bravoPv = () =>
  carteira('BRAVO_PV', [
    ...pulverizado('CDB BRAVO', 6, 300_000),
    ...pulverizado('DEB BRAVO', 5, 300_000),
    ...pulverizado('CRA BRAVO', 3, 300_000),
    pos('FUNDO DI BRAVO', 400_000, gest('di-bravo', { ...cx })),
    pos('NTN-B BRAVO', 200_000, gest('ntnb-bravo', { classeCanonica: 'renda-fixa', indexador: 'IPCA', prazoAnos: 9, liquidezDias: 1 })),
  ]);

/* ── CEDRO_HLD: liquidez seca e vencimento concentrado ─────────────────────── */
export const cedroHld = () =>
  carteira('CEDRO_HLD', [
    pos('CDB OMEGA VENCE SET', 1_800_000, omega({ ...rf, indexador: 'CDI', prazoAnos: 0.05, liquidezDias: 18 }), '2026-09-11'),
    pos('LCA OMEGA VENCE SET', 900_000, omega({ ...rf, indexador: 'CDI', prazoAnos: 0.07, liquidezDias: 25 }), '2026-09-18'),
    ...pulverizado('DEB CEDRO', 10, 400_000, { indexador: 'IPCA', prazoAnos: 6, liquidezDias: 2190 }),
    pos('FII TIJOLO CEDRO', 1_000_000, gest('fii-cedro', { classeCanonica: 'imobiliario', indexador: 'MULTI', prazoAnos: 0, liquidezDias: 3 })),
    pos('CAIXA', 260_000, gest('cx-cedro', { ...cx })),
  ]);

/* ── DUNAS_CAP: risco macro comum com ALPHA_01 e BRAVO_PV (IPCA) ────────────
   Carrega também a posição minúscula da Metalurgica Aurora: 1,5% do PL, que é
   o caso que prova a regra do piso em REAIS num calote. Ver gerar-credito-demo. */
export const dunasCap = () =>
  carteira('DUNAS_CAP', [
    ...pulverizado('NTN-B DUNAS', 6, 300_000, { classeCanonica: 'renda-fixa', indexador: 'IPCA', prazoAnos: 9, liquidezDias: 1 }),
    ...pulverizado('DEB IPCA DUNAS', 7, 250_000, { indexador: 'IPCA', prazoAnos: 5 }),
    pos('DEB AURORA 2029', 60_000, nomeado('metalurgica-aurora', 'Metalurgica Aurora', { ...rf, indexador: 'IPCA', prazoAnos: 3 })),
    pos('FUNDO DI DUNAS', 350_000, gest('di-dunas', { ...cx })),
  ]);

/* ── ESTRELA_PV: cobertura BAIXA de propósito ────────────────────────────────
   Prova que o sistema diz "não sei" em vez de dizer zero. Setenta por cento do
   PL em produto que o mapa da instância ainda não classificou.               */
export const estrelaPv = () =>
  carteira('ESTRELA_PV', [
    pos('ESTRUTURADO XPTO I', 900_000, at({})),
    pos('ESTRUTURADO XPTO II', 700_000, at({})),
    pos('CARTEIRA ADMINISTRADA', 500_000, at({})),
    pos('COE INDICE', 400_000, at({})),
    ...pulverizado('CDB ESTRELA', 4, 200_000),
    pos('CAIXA', 200_000, gest('cx-estrela', { ...cx })),
  ]);

/* ── FAROL_INV: exposição cambial concentrada, que É alarme ─────────────────
   Ao contrário de BRL e Brasil, que são a linha de base e não viram sinal.   */
export const farolInv = () =>
  carteira('FAROL_INV', [
    ...pulverizado('ETF EUA FAROL', 5, 400_000, { classeCanonica: 'internacional', indexador: 'BOLSA', moeda: 'USD', regiao: 'eua', prazoAnos: 0, liquidezDias: 3 }),
    ...pulverizado('BOND USD FAROL', 4, 300_000, { classeCanonica: 'internacional', indexador: 'CAMBIO', moeda: 'USD', regiao: 'eua', prazoAnos: 4, liquidezDias: 5 }),
    ...pulverizado('CDB FAROL', 4, 200_000),
    pos('CAIXA', 300_000, gest('cx-farol', { ...cx })),
  ]);

/**
 * Série: base 30 dias antes, referência hoje.
 * ALPHA_01 encolhe 22% entre as duas datas, e é a deterioração mês a mês do
 * radar e a queda de exposição a Banco Zeta da tela de crédito. As duas telas
 * contam a mesma história porque leem a mesma casa.
 */
export const BASE = '2026-07-25';
export const REF = '2026-08-24';

export function serieDemo() {
  return [
    snap(BASE, [alpha01(1.28), bravoPv(), cedroHld(), dunasCap(), estrelaPv(), farolInv()]),
    snap(REF, [alpha01(1), bravoPv(), cedroHld(), dunasCap(), estrelaPv(), farolInv()]),
  ];
}

/** Cabeçalho padrão dos arquivos de demo gerados por script. */
export function cabecalhoDemo(nomeArquivo, globalJs, gerador, descricao) {
  return `/* ${nomeArquivo} — fallback sintetico de window.${globalJs}

   GERADO POR ${gerador}. Nao editar a mao: rode o script.

   ${descricao}

   O payload sai do proprio motor. Demo escrito a mao diverge do motor em
   silencio, e foi assim que a severidade da queda de receita ficou certa no
   demo e errada no motor por meses.

   Mesmo padrao dos demais fallbacks: so roda se o overlay real da instancia
   ainda nao populou a janela. Carteiras, emissores e valores sao ficticios.
*/
(function () {
  'use strict';
  if (window.${globalJs}) return;
  /* Instancia com dado real: nao popular sintetico. Ver ESTADO/ESTADO-ATUAL.md. */
  if (window._AtlasRealData) return;

  window.${globalJs} = `;
}
