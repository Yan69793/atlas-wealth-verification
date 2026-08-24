/**
 * src/intel/cross-portfolio.ts — Radar de Carteiras (Entrega A da camada de
 * inteligência, 2026-08-24).
 *
 * Olha TODAS as carteiras de uma vez e responde o que uma tela de carteira
 * individual não consegue: qual carteira merece atenção primeiro, qual emissor
 * aparece em muita gente ao mesmo tempo, que fator manda em carteira que parece
 * diversificada, e quem piorou contra o mês passado.
 *
 * É inteligência sobre o snapshot e a série, NÃO evento EOD: o diff não é
 * tocado e nenhum EventoTipo novo é emitido. Mesmo desenho da Fase 4.
 *
 * ── Severidade e a lição de agosto ──────────────────────────────────────────
 * A escala é a mesma do motor de eventos (THRESHOLDS.severidade), calibrada
 * pelo dono. A BASE da fração é por tipo de sinal, e está escrita em cada um,
 * porque foi exatamente base errada que quebrou a queda de receita: medida
 * contra o PL, perder 99,9% da receita dava severidade "baixa".
 *
 *   CONCENTRACAO_*        base = a fração concentrada
 *   VENCIMENTO_CONCENTRADO base = a fração vencendo na janela
 *   DETERIORACAO_PL       base = |queda| / PL anterior
 *   LIQUIDEZ_BAIXA        base = (limiar − fração) / limiar, o DÉFICIT
 *                         relativo ao piso. Contra o PL seria sempre "baixa"
 *                         por construção, que é o bug de agosto de novo.
 *
 * ── Cobertura ───────────────────────────────────────────────────────────────
 * Todo sinal carrega a fração do PL que o motor conseguiu avaliar para aquela
 * afirmação. Sinal cuja cobertura cai em 'insuficiente' NÃO É EMITIDO: a tela
 * mostra o buraco de cobertura no lugar. Concentração por ativo e deterioração
 * de PL têm cobertura 1 por construção, porque só usam valor e plTotal, que
 * sempre existem.
 *
 * Puro e determinístico: sem IO, sem Date.now, sem Math.random.
 */

import { isLiquidez } from '../snapshot/normalize.js';
import { atributosDe } from '../snapshot/normalize.js';
import { THRESHOLDS } from '../snapshot/thresholds.js';
import type { Severidade, Snapshot, SnapshotCarteira } from '../snapshot/types.js';
import {
  coberturaDaCasa,
  coberturaDoAtributo,
  coberturaPorCarteira,
  faixaDeCobertura,
  type CoberturaCarteira,
  type CoberturaCasa,
  type FaixaCobertura,
} from './coverage.js';
import {
  estadoAgregado,
  estadoTemporal,
  PESO_ESTADO,
  PESO_SEVERIDADE,
  type EstadoTemporal,
} from './estado.js';
import {
  confiancaDe,
  idInsight,
  ordenarInsights,
  severidadeDe,
  type Insight,
} from './explain.js';

export type SinalTipo =
  | 'CONCENTRACAO_ATIVO'
  | 'CONCENTRACAO_EMISSOR'
  | 'CONCENTRACAO_FATOR'
  | 'LIQUIDEZ_BAIXA'
  | 'VENCIMENTO_CONCENTRADO'
  | 'DETERIORACAO_PL';

/** Dimensões que contam como "fator comum" entre ativos de nomes diferentes. */
export type Fator = 'indexador' | 'moeda' | 'regiao' | 'classeCanonica';

export interface RadarSinal {
  tipo: SinalTipo;
  severidade: Severidade;
  /** rótulo do que concentrou ("Banco X", "CDI", "USD") */
  rotulo: string;
  /**
   * Chave ESTÁVEL entre períodos, que é o que casa o sinal com o do mês
   * passado. Não é o rótulo: rótulo é texto de tela e pode mudar quando o
   * ativo-map ganha o nome bonito do emissor. Em DETERIORACAO_PL é vazia de
   * propósito, porque é um sinal por carteira e a data da base muda todo mês
   * (usar a data faria a deterioração nascer "nova" para sempre).
   */
  chave: string;
  /** o que mudou desde o período anterior; sem base de comparação, tudo é 'novo' */
  estado: EstadoTemporal;
  /** R$ do mesmo sinal no período anterior; null quando o sinal é novo */
  valorAnterior: number | null;
  /**
   * Em CONCENTRACAO_FATOR, a dimensão em bruto. A tela precisa dela para
   * escrever "Classe" em vez de "classeCanonica": nome de campo interno não
   * aparece para o assessor. O motor entrega o dado, a tela decide a palavra.
   */
  fator?: Fator;
  /** R$ envolvidos */
  valor: number;
  /**
   * 0..1. É participação no PL em todos os tipos MENOS DETERIORACAO_PL, onde é
   * a variação do patrimônio contra a base (negativa). Tipos diferentes, bases
   * diferentes, e a tela precisa rotular cada um pelo que ele é.
   */
  fracaoPl: number;
  cobertura: number;
  insightId: string;
}

export interface RadarCarteira {
  carteira: string;
  plTotal: number;
  sinais: RadarSinal[];
  /** pior severidade entre os sinais; sem sinal = null */
  pior: Severidade | null;
  /** estado mais urgente entre os sinais; sem sinal = null */
  estado: EstadoTemporal | null;
  faixaCobertura: FaixaCobertura;
  /** maior R$ entre os sinais, usado como desempate do ranking */
  maiorExposicao: number;
}

/**
 * Sinal que existia no período anterior e não existe mais.
 *
 * Sai na lista mesmo sem valor atual, pelo mesmo motivo do `encerrado` do
 * crédito: é o único jeito de a tela dizer "aquilo que você estava
 * acompanhando saiu". Item que some sem explicação é pior do que item que
 * continua aparecendo, porque o assessor nunca vê o desfecho.
 */
export interface SinalEncerrado {
  carteira: string;
  tipo: SinalTipo;
  chave: string;
  rotulo: string;
  severidadeAnterior: Severidade;
  valorAnterior: number;
  /** 'carteira-saiu' quando a carteira inteira sumiu da base; senão 'sinal-saiu' */
  motivo: 'sinal-saiu' | 'carteira-saiu';
}

/** O que o período anterior precisa entregar para o estado ser derivado. */
export interface RegistroSinalAnterior {
  carteira: string;
  tipo: SinalTipo;
  chave: string;
  rotulo: string;
  severidade: Severidade;
  valor: number;
}

/** Chave do sinal acompanhado entre períodos. */
export function chaveSinal(carteira: string, tipo: SinalTipo, chave: string): string {
  return `${carteira}|${tipo}|${chave}`;
}

/** Achata o radar do período anterior na forma que o estado precisa. */
export function registrosDeSinais(
  anterior: Pick<RadarResultado, 'carteiras'> | null | undefined
): RegistroSinalAnterior[] {
  const out: RegistroSinalAnterior[] = [];
  for (const c of anterior?.carteiras ?? []) {
    for (const s of c.sinais ?? []) {
      out.push({
        carteira: c.carteira,
        tipo: s.tipo,
        // radar.json gravado antes da Entrega B.2 não tem `chave`. Ausência vira
        // string vazia: o sinal casa por (carteira, tipo), que é o melhor
        // possível sem o campo, em vez de derrubar a leitura do arquivo antigo.
        chave: s.chave ?? '',
        rotulo: s.rotulo,
        severidade: s.severidade,
        valor: s.valor,
      });
    }
  }
  return out;
}

export interface RadarEmissor {
  emissorId: string;
  emissorNome: string;
  valor: number;
  /** 0..1 sobre o PL da casa */
  fracaoCasa: number;
  carteiras: string[];
  /** maior participação deste emissor dentro de UMA carteira */
  maiorFracaoEmCarteira: number;
  carteiraMaisExposta: string;
  cobertura: number;
}

export interface RadarFator {
  fator: Fator;
  valor: string;
  montante: number;
  fracaoCasa: number;
  carteiras: string[];
  /** carteiras em que este fator passa do limiar de concentração */
  carteirasConcentradas: string[];
  cobertura: number;
}

export interface RadarDeterioracao {
  carteira: string;
  plAnterior: number;
  plAtual: number;
  delta: number;
  /** null quando plAnterior === 0 */
  deltaPct: number | null;
  severidade: Severidade;
  insightId: string;
}

export interface RadarResultado {
  /** data do snapshot usado na comparação de deterioração; null = sem base */
  baseData: string | null;
  carteiras: RadarCarteira[];
  /** sinais que sumiram desde o período anterior; nunca somem sem avisar */
  encerrados: SinalEncerrado[];
  /** houve radar anterior para comparar; false = tudo é 'novo' por definição */
  temAnterior: boolean;
  emissores: RadarEmissor[];
  fatores: RadarFator[];
  deterioracao: RadarDeterioracao[];
  cobertura: CoberturaCarteira[];
  coberturaCasa: CoberturaCasa;
  insights: Insight[];
}

/** Artefato gravado pelo CLI. Mesmo desenho de CaixaParadoFile (Fase 4). */
export interface RadarFile extends RadarResultado {
  schema: 'radar/v1';
  data: string;
  periodo: 'diario' | 'mensal';
  tenantId: string;
  geradoEm: string;
  engine: { nome: 'atlas-audit-engine'; versao: string };
  limiares: {
    coberturaAfirmaMin: number;
    coberturaRessalvaMin: number;
    radarConcentracaoAtivoPct: number;
    radarConcentracaoEmissorPct: number;
    radarConcentracaoFatorPct: number;
    radarLiquidezMinPct: number;
    radarVencimentoConcentradoPct: number;
    radarVencimentoJanelaDias: number;
    radarDeterioracaoPct: number;
    radarDeterioracaoJanelaDias: number;
    radarVariacaoMaterialPct: number;
  };
  /** data do radar.json usado como base do ESTADO; null = sem anterior */
  baseEstado: string | null;
  /** null = rodou normal; 'serie-curta' = sem base para deterioração */
  motivo: 'serie-curta' | null;
}

export interface OpcoesRadar {
  concentracaoAtivoPct?: number;
  concentracaoEmissorPct?: number;
  concentracaoFatorPct?: number;
  liquidezMinPct?: number;
  vencimentoConcentradoPct?: number;
  vencimentoJanelaDias?: number;
  deterioracaoPct?: number;
  deterioracaoJanelaDias?: number;
  variacaoMaterialPct?: number;
  /** radar do período anterior, para derivar estado. Ausente = tudo 'novo'. */
  anterior?: Pick<RadarResultado, 'carteiras'> | null;
}

const CORTES = THRESHOLDS.severidade;

/**
 * Classes que simplesmente não têm vencimento. Sem esta lista, a cobertura de
 * vencimento de uma carteira de ações seria eternamente zero e o motor calaria
 * sobre uma carteira que ele entende perfeitamente bem.
 */
/**
 * Valor "de casa" de cada fator: o default do mercado local.
 *
 * Uma carteira brasileira estar 100% em BRL e 100% no Brasil não é achado, é a
 * linha de base. Sem esta exclusão, CONCENTRACAO_FATOR dispararia em
 * praticamente toda carteira, todo mês, nas duas dimensões, e a tela ensinaria
 * o assessor a ignorar o radar. Mesma lógica do "ruído zero é melhor que ruído
 * alto" que rege os limiares do diff.
 *
 * Isso NÃO esconde o dado: moeda e região continuam agregadas na tabela de
 * fatores da casa, onde o número informa em vez de alarmar. O que fica de fora
 * é o alarme.
 *
 * A leitura inversa, "esta carteira não tem nada fora do Brasil", é observação
 * legítima e diferente desta. É sinal próprio, com limiar próprio, e não está
 * no escopo desta entrega.
 */
const FATOR_BASE: Partial<Record<Fator, string>> = {
  moeda: 'BRL',
  regiao: 'brasil',
};

const SEM_VENCIMENTO = new Set([
  'acoes',
  'fundo',
  'multimercado',
  'imobiliario',
  'liquidez',
  'derivativos',
]);

/** Dias corridos entre duas datas AAAA-MM-DD. Determinístico. */
function diasCorridos(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/** Liquidez da carteira: classe canônica manda, rótulo livre é o fallback. */
function liquidezDa(c: SnapshotCarteira): number {
  return c.posicoes
    .filter((p) => {
      const a = atributosDe(p);
      return a.classeCanonica ? a.classeCanonica === 'liquidez' : isLiquidez(p.classe);
    })
    .reduce((s, p) => s + p.valor, 0);
}

/**
 * Cobertura da afirmação sobre vencimento: fração do PL sobre a qual dá para
 * dizer alguma coisa, seja porque o papel tem prazo conhecido, seja porque a
 * classe dele não tem prazo nenhum.
 */
function coberturaVencimento(c: SnapshotCarteira): number {
  if (c.plTotal <= 0) return 0;
  let coberto = 0;
  for (const p of c.posicoes) {
    const a = atributosDe(p);
    if (a.prazoAnos !== null || (a.classeCanonica && SEM_VENCIMENTO.has(a.classeCanonica))) {
      coberto += p.valor;
    }
  }
  return coberto / c.plTotal;
}

function novoInsight(base: {
  data: string;
  fonte: string;
  tenantId: string;
  carteira: string | null;
  tipo: SinalTipo;
  chave: string;
  severidade: Severidade;
  afirmacao: string;
  evidencias: Record<string, number | string | boolean>;
  regra: { nome: string; limiar: Record<string, number | string> };
  calculo: string;
  cobertura: number;
  derivado?: boolean;
  serie?: string[];
}): Insight {
  return {
    schema: 'insight/v1',
    id: idInsight(base.data, base.carteira, base.tipo, base.chave),
    tipo: base.tipo,
    carteira: base.carteira,
    tenantId: base.tenantId,
    severidade: base.severidade,
    afirmacao: base.afirmacao,
    evidencias: base.evidencias,
    regra: base.regra,
    calculo: base.calculo,
    fonte: { fonte: base.fonte, data: base.data, ...(base.serie ? { serie: base.serie } : {}) },
    cobertura: base.cobertura,
    faixaCobertura: faixaDeCobertura(base.cobertura),
    confianca: confiancaDe(base.cobertura, { derivado: base.derivado }),
  };
}

function pct(v: number): string {
  return (v * 100).toFixed(1).replace('.', ',') + '%';
}

function brl(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

/**
 * Escolhe o snapshot de comparação para a deterioração.
 *
 * Não é "o de exatamente 30 dias atrás": esse dia cai em fim de semana ou
 * feriado em cerca de dois de cada sete casos e simplesmente não existe no
 * disco. Pega o mais próximo do alvo, exigindo pelo menos uma semana de
 * distância (comparar com ontem não é mês contra mês) e no máximo o dobro da
 * janela de folga, senão a comparação deixa de significar o que a tela promete.
 */
export function baseDaDeterioracao(
  serie: Snapshot[],
  ref: string,
  janelaDias: number
): Snapshot | null {
  const candidatos = serie.filter((s) => {
    const d = diasCorridos(s.data, ref);
    return d >= 7 && d <= janelaDias * 2;
  });
  if (!candidatos.length) return null;
  let melhor = candidatos[0];
  let melhorDist = Math.abs(diasCorridos(melhor.data, ref) - janelaDias);
  for (const c of candidatos.slice(1)) {
    const dist = Math.abs(diasCorridos(c.data, ref) - janelaDias);
    // `<` e não `<=`: empate fica com o mais antigo da lista ascendente, ordem
    // estável e reproduzível.
    if (dist < melhorDist) {
      melhor = c;
      melhorDist = dist;
    }
  }
  return melhor;
}

/**
 * serie: snapshots ASCENDENTES por data; o último é a referência.
 * Série de um só elemento funciona: só não há deterioração para medir.
 */
export function radarCruzado(serie: Snapshot[], opcoes: OpcoesRadar = {}): RadarResultado {
  const vazio: RadarResultado = {
    baseData: null,
    carteiras: [],
    encerrados: [],
    temAnterior: false,
    emissores: [],
    fatores: [],
    deterioracao: [],
    cobertura: [],
    coberturaCasa: { plTotal: 0, carteiras: 0, atributos: [], faixaGlobal: 'insuficiente' },
    insights: [],
  };
  if (!serie.length) return vazio;

  const concAtivo = opcoes.concentracaoAtivoPct ?? THRESHOLDS.radarConcentracaoAtivoPct;
  const concEmissor = opcoes.concentracaoEmissorPct ?? THRESHOLDS.radarConcentracaoEmissorPct;
  const concFator = opcoes.concentracaoFatorPct ?? THRESHOLDS.radarConcentracaoFatorPct;
  const liqMin = opcoes.liquidezMinPct ?? THRESHOLDS.radarLiquidezMinPct;
  const vencPct = opcoes.vencimentoConcentradoPct ?? THRESHOLDS.radarVencimentoConcentradoPct;
  const vencJanela = opcoes.vencimentoJanelaDias ?? THRESHOLDS.radarVencimentoJanelaDias;
  const deterPct = opcoes.deterioracaoPct ?? THRESHOLDS.radarDeterioracaoPct;
  const deterJanela = opcoes.deterioracaoJanelaDias ?? THRESHOLDS.radarDeterioracaoJanelaDias;

  const variacaoMaterial = opcoes.variacaoMaterialPct ?? THRESHOLDS.radarVariacaoMaterialPct;

  const ref = serie[serie.length - 1];
  const tenantId = ref.tenantId ?? 'default';
  const insights: Insight[] = [];
  const carteiras: RadarCarteira[] = [];

  const ctx = { data: ref.data, fonte: ref.fonte, tenantId };

  /* Estado temporal: o corte que faz esta tela valer a abertura.
   *
   * Medido sobre 37 meses de dado real em 2026-08-24: sem estado, o radar
   * repetia 87% do conteúdo do mês anterior e acendia 97% das carteiras. Com o
   * corte por novidade, os MESMOS limiares produzem 15,5 alertas por mês e 13%
   * das carteiras acesas. */
  const anteriores = registrosDeSinais(opcoes.anterior);
  const temAnterior = anteriores.length > 0;
  const porChave = new Map(anteriores.map((r) => [chaveSinal(r.carteira, r.tipo, r.chave), r]));
  const vistos = new Set<string>();

  /** Estado do sinal e o valor anterior, marcando a chave como vista. */
  function acompanhar(
    carteira: string,
    tipo: SinalTipo,
    chave: string,
    severidade: Severidade,
    valor: number
  ): { estado: EstadoTemporal; valorAnterior: number | null } {
    const k = chaveSinal(carteira, tipo, chave);
    vistos.add(k);
    // Sem período anterior nenhum, TUDO é 'novo' por definição, e é a verdade
    // na estreia. Marcar como 'acompanhamento' fingiria um histórico que não
    // existe, e a tela abriria vazia justamente no primeiro dia.
    const ant = temAnterior ? porChave.get(k) : undefined;
    return {
      estado: estadoTemporal({ severidade, valor }, ant, variacaoMaterial),
      valorAnterior: ant ? ant.valor : null,
    };
  }

  for (const c of ref.carteiras) {
    if (c.plTotal <= 0) continue;
    const sinais: RadarSinal[] = [];

    /* ── 1. Concentração num único ativo ──────────────────────────────────
       Cobertura 1: só usa valor e plTotal, que sempre existem. */
    let maior = c.posicoes[0] ?? null;
    for (const p of c.posicoes) if (maior && p.valor > maior.valor) maior = p;
    if (maior && maior.valor / c.plTotal >= concAtivo) {
      const fracao = maior.valor / c.plTotal;
      const sev = severidadeDe(fracao, CORTES);
      const acomp = acompanhar(c.nome, 'CONCENTRACAO_ATIVO', maior.ativo, sev, maior.valor);
      const ins = novoInsight({
        ...ctx,
        carteira: c.nome,
        tipo: 'CONCENTRACAO_ATIVO',
        chave: maior.ativo,
        severidade: sev,
        afirmacao: `${pct(fracao)} do patrimônio da carteira está num único ativo (${maior.ativo}).`,
        evidencias: {
          ativo: maior.ativo,
          valor: maior.valor,
          plTotal: c.plTotal,
          fracaoPl: fracao,
          estado: acomp.estado,
          ...(acomp.valorAnterior !== null ? { valorAnterior: acomp.valorAnterior } : {}),
        },
        regra: { nome: 'radarConcentracaoAtivoPct', limiar: { radarConcentracaoAtivoPct: concAtivo } },
        calculo: `${brl(maior.valor)} / ${brl(c.plTotal)} = ${pct(fracao)}, limiar ${pct(concAtivo)}`,
        cobertura: 1,
      });
      insights.push(ins);
      sinais.push({
        tipo: 'CONCENTRACAO_ATIVO',
        severidade: sev,
        rotulo: maior.ativo,
        chave: maior.ativo,
        estado: acomp.estado,
        valorAnterior: acomp.valorAnterior,
        valor: maior.valor,
        fracaoPl: fracao,
        cobertura: 1,
        insightId: ins.id,
      });
    }

    /* ── 2. Concentração num único emissor ────────────────────────────────
       O risco que a tela de posições não mostra: três papéis de nomes
       diferentes do mesmo banco. Cobertura = fração do PL com emissor
       conhecido, que só vem do ativo-map da instância (nunca do custodiante,
       ver a nota em resolverAtributos). */
    const covEmissor = coberturaDoAtributo(c, 'emissorId');
    if (faixaDeCobertura(covEmissor) !== 'insuficiente') {
      const porEmissor = new Map<string, { nome: string; valor: number }>();
      for (const p of c.posicoes) {
        const a = atributosDe(p);
        if (!a.emissorId) continue;
        const atual = porEmissor.get(a.emissorId) ?? { nome: a.emissorNome ?? a.emissorId, valor: 0 };
        atual.valor += p.valor;
        porEmissor.set(a.emissorId, atual);
      }
      for (const [emissorId, dados] of [...porEmissor.entries()].sort(
        (a, b) => b[1].valor - a[1].valor || a[0].localeCompare(b[0])
      )) {
        const fracao = dados.valor / c.plTotal;
        if (fracao < concEmissor) continue;
        const sev = severidadeDe(fracao, CORTES);
        const acomp = acompanhar(c.nome, 'CONCENTRACAO_EMISSOR', emissorId, sev, dados.valor);
        const ins = novoInsight({
          ...ctx,
          carteira: c.nome,
          tipo: 'CONCENTRACAO_EMISSOR',
          chave: emissorId,
          severidade: sev,
          afirmacao: `${pct(fracao)} do patrimônio depende de um único emissor (${dados.nome}).`,
          evidencias: {
            emissorId,
            emissorNome: dados.nome,
            valor: dados.valor,
            plTotal: c.plTotal,
            fracaoPl: fracao,
            estado: acomp.estado,
            ...(acomp.valorAnterior !== null ? { valorAnterior: acomp.valorAnterior } : {}),
          },
          regra: {
            nome: 'radarConcentracaoEmissorPct',
            limiar: { radarConcentracaoEmissorPct: concEmissor },
          },
          calculo: `${brl(dados.valor)} / ${brl(c.plTotal)} = ${pct(fracao)}, limiar ${pct(concEmissor)}`,
          cobertura: covEmissor,
        });
        insights.push(ins);
        sinais.push({
          tipo: 'CONCENTRACAO_EMISSOR',
          severidade: sev,
          rotulo: dados.nome,
          chave: emissorId,
          estado: acomp.estado,
          valorAnterior: acomp.valorAnterior,
          valor: dados.valor,
          fracaoPl: fracao,
          cobertura: covEmissor,
          insightId: ins.id,
        });
      }
    }

    /* ── 3. Concentração num fator ────────────────────────────────────────
       O caso da carteira que parece diversificada em ativo e está inteira no
       mesmo indexador, na mesma moeda ou na mesma região. */
    for (const fator of ['indexador', 'moeda', 'regiao', 'classeCanonica'] as Fator[]) {
      const cov = coberturaDoAtributo(c, fator);
      if (faixaDeCobertura(cov) === 'insuficiente') continue;
      const porValor = new Map<string, number>();
      for (const p of c.posicoes) {
        const v = atributosDe(p)[fator];
        if (!v) continue;
        porValor.set(v, (porValor.get(v) ?? 0) + p.valor);
      }
      for (const [valor, montante] of [...porValor.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
      )) {
        // Moeda local e país local são a linha de base, não achado. Ver FATOR_BASE.
        if (FATOR_BASE[fator] === valor) continue;
        const fracao = montante / c.plTotal;
        if (fracao < concFator) continue;
        const sev = severidadeDe(fracao, CORTES);
        const chaveFator = `${fator}:${valor}`;
        const acomp = acompanhar(c.nome, 'CONCENTRACAO_FATOR', chaveFator, sev, montante);
        const ins = novoInsight({
          ...ctx,
          carteira: c.nome,
          tipo: 'CONCENTRACAO_FATOR',
          chave: chaveFator,
          severidade: sev,
          afirmacao: `${pct(fracao)} do patrimônio responde ao mesmo fator (${fator} = ${valor}), mesmo com ativos diferentes.`,
          evidencias: {
            fator,
            valor,
            montante,
            plTotal: c.plTotal,
            fracaoPl: fracao,
            estado: acomp.estado,
            ...(acomp.valorAnterior !== null ? { valorAnterior: acomp.valorAnterior } : {}),
          },
          regra: {
            nome: 'radarConcentracaoFatorPct',
            limiar: { radarConcentracaoFatorPct: concFator },
          },
          calculo: `${brl(montante)} / ${brl(c.plTotal)} = ${pct(fracao)}, limiar ${pct(concFator)}`,
          cobertura: cov,
        });
        insights.push(ins);
        sinais.push({
          tipo: 'CONCENTRACAO_FATOR',
          severidade: sev,
          rotulo: valor,
          chave: chaveFator,
          estado: acomp.estado,
          valorAnterior: acomp.valorAnterior,
          fator,
          valor: montante,
          fracaoPl: fracao,
          cobertura: cov,
          insightId: ins.id,
        });
      }
    }

    /* ── 4. Liquidez abaixo do piso ───────────────────────────────────────
       Espelho invertido do caixa parado da Fase 4. Base da severidade é o
       DÉFICIT relativo ao piso, não a fração do PL: contra o PL, faltar
       liquidez daria "baixa" sempre, por construção. */
    const covClasse = coberturaDoAtributo(c, 'classeCanonica');
    if (faixaDeCobertura(covClasse) !== 'insuficiente') {
      const liq = liquidezDa(c);
      const fracao = liq / c.plTotal;
      if (fracao < liqMin) {
        const deficit = (liqMin - fracao) / liqMin;
        const sev = severidadeDe(deficit, CORTES);
        const acomp = acompanhar(c.nome, 'LIQUIDEZ_BAIXA', '', sev, liq);
        const ins = novoInsight({
          ...ctx,
          carteira: c.nome,
          tipo: 'LIQUIDEZ_BAIXA',
          chave: '',
          severidade: sev,
          afirmacao: `A carteira tem ${pct(fracao)} em liquidez, abaixo do piso de ${pct(liqMin)}.`,
          evidencias: {
            liquidez: liq,
            plTotal: c.plTotal,
            fracaoPl: fracao,
            deficitRelativo: deficit,
            estado: acomp.estado,
            ...(acomp.valorAnterior !== null ? { valorAnterior: acomp.valorAnterior } : {}),
          },
          regra: { nome: 'radarLiquidezMinPct', limiar: { radarLiquidezMinPct: liqMin } },
          calculo: `déficit = (${pct(liqMin)} − ${pct(fracao)}) / ${pct(liqMin)} = ${pct(deficit)}`,
          cobertura: covClasse,
        });
        insights.push(ins);
        sinais.push({
          tipo: 'LIQUIDEZ_BAIXA',
          severidade: sev,
          rotulo: 'liquidez',
          chave: '',
          estado: acomp.estado,
          valorAnterior: acomp.valorAnterior,
          valor: liq,
          fracaoPl: fracao,
          cobertura: covClasse,
          insightId: ins.id,
        });
      }
    }

    /* ── 5. Vencimento concentrado na janela ──────────────────────────────
       Volume é o VALOR DO TÍTULO, não a variação do dia. Corrigido na Onda 2
       para MATURITY_APPROACHING pelo mesmo motivo: um CDB de R$ 500 mil
       rendendo R$ 137 no dia saía como volume R$ 137. */
    const covVenc = coberturaVencimento(c);
    if (faixaDeCobertura(covVenc) !== 'insuficiente') {
      let vencendo = 0;
      const ativos: string[] = [];
      for (const p of c.posicoes) {
        if (!p.vencimento) continue;
        const dias = diasCorridos(ref.data, p.vencimento);
        if (dias >= 0 && dias <= vencJanela) {
          vencendo += p.valor;
          ativos.push(p.ativo);
        }
      }
      const fracao = vencendo / c.plTotal;
      if (fracao >= vencPct) {
        const sev = severidadeDe(fracao, CORTES);
        const acomp = acompanhar(c.nome, 'VENCIMENTO_CONCENTRADO', String(vencJanela), sev, vencendo);
        const ins = novoInsight({
          ...ctx,
          carteira: c.nome,
          tipo: 'VENCIMENTO_CONCENTRADO',
          chave: String(vencJanela),
          severidade: sev,
          afirmacao: `${pct(fracao)} do patrimônio vence nos próximos ${vencJanela} dias.`,
          evidencias: {
            valorVencendo: vencendo,
            plTotal: c.plTotal,
            fracaoPl: fracao,
            titulos: ativos.length,
            janelaDias: vencJanela,
            estado: acomp.estado,
            ...(acomp.valorAnterior !== null ? { valorAnterior: acomp.valorAnterior } : {}),
          },
          regra: {
            nome: 'radarVencimentoConcentradoPct',
            limiar: {
              radarVencimentoConcentradoPct: vencPct,
              radarVencimentoJanelaDias: vencJanela,
            },
          },
          calculo: `${brl(vencendo)} / ${brl(c.plTotal)} = ${pct(fracao)}, limiar ${pct(vencPct)} em ${vencJanela}d`,
          cobertura: covVenc,
        });
        insights.push(ins);
        sinais.push({
          tipo: 'VENCIMENTO_CONCENTRADO',
          severidade: sev,
          rotulo: `${vencJanela} dias`,
          chave: String(vencJanela),
          estado: acomp.estado,
          valorAnterior: acomp.valorAnterior,
          valor: vencendo,
          fracaoPl: fracao,
          cobertura: covVenc,
          insightId: ins.id,
        });
      }
    }

    const covCarteira = coberturaPorCarteira({ ...ref, carteiras: [c] })[0];
    carteiras.push({
      carteira: c.nome,
      plTotal: c.plTotal,
      sinais,
      pior: piorSeveridade(sinais.map((s) => s.severidade)),
      estado: estadoAgregado(sinais.map((s) => s.estado)),
      faixaCobertura: covCarteira.faixaGlobal,
      maiorExposicao: sinais.reduce((m, s) => Math.max(m, s.valor), 0),
    });
  }

  /* ── 6. Deterioração mês contra mês ─────────────────────────────────────
     Cobertura 1: só usa plTotal. Carteira que não existia na base fica de
     fora, não é deterioração, é carteira nova. */
  const base = baseDaDeterioracao(serie.slice(0, -1), ref.data, deterJanela);
  const deterioracao: RadarDeterioracao[] = [];
  if (base) {
    const mapaBase = new Map(base.carteiras.map((c) => [c.nome, c]));
    for (const c of ref.carteiras) {
      const ant = mapaBase.get(c.nome);
      if (!ant || ant.plTotal <= 0) continue;
      const delta = c.plTotal - ant.plTotal;
      const deltaPct = delta / ant.plTotal;
      if (-deltaPct < deterPct) continue;
      const sev = severidadeDe(deltaPct, CORTES);
      // Chave vazia de propósito: é um sinal por carteira, e usar a data da
      // base (que muda todo período) faria a deterioração nascer 'nova' para
      // sempre, que é o mesmo que não ter estado.
      const acomp = acompanhar(c.nome, 'DETERIORACAO_PL', '', sev, Math.abs(delta));
      const ins = novoInsight({
        ...ctx,
        carteira: c.nome,
        tipo: 'DETERIORACAO_PL',
        chave: base.data,
        severidade: sev,
        afirmacao: `O patrimônio caiu ${pct(-deltaPct)} desde ${base.data}.`,
        evidencias: {
          plAnterior: ant.plTotal,
          plAtual: c.plTotal,
          delta,
          deltaPct,
          baseData: base.data,
          diasEntre: diasCorridos(base.data, ref.data),
          estado: acomp.estado,
          ...(acomp.valorAnterior !== null ? { quedaAnterior: acomp.valorAnterior } : {}),
        },
        regra: {
          nome: 'radarDeterioracaoPct',
          limiar: {
            radarDeterioracaoPct: deterPct,
            radarDeterioracaoJanelaDias: deterJanela,
          },
        },
        calculo: `(${brl(c.plTotal)} − ${brl(ant.plTotal)}) / ${brl(ant.plTotal)} = ${pct(deltaPct)}`,
        cobertura: 1,
        serie: [base.data, ref.data],
      });
      insights.push(ins);
      deterioracao.push({
        carteira: c.nome,
        plAnterior: ant.plTotal,
        plAtual: c.plTotal,
        delta,
        deltaPct,
        severidade: sev,
        insightId: ins.id,
      });
      const alvo = carteiras.find((x) => x.carteira === c.nome);
      if (alvo) {
        alvo.sinais.push({
          tipo: 'DETERIORACAO_PL',
          severidade: sev,
          rotulo: `desde ${base.data}`,
          chave: '',
          estado: acomp.estado,
          valorAnterior: acomp.valorAnterior,
          valor: Math.abs(delta),
          fracaoPl: deltaPct,
          cobertura: 1,
          insightId: ins.id,
        });
        alvo.pior = piorSeveridade(alvo.sinais.map((s) => s.severidade));
        alvo.estado = estadoAgregado(alvo.sinais.map((s) => s.estado));
        alvo.maiorExposicao = Math.max(alvo.maiorExposicao, Math.abs(delta));
      }
    }
  }
  deterioracao.sort((a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0) || a.carteira.localeCompare(b.carteira));

  /* ── 7. Agregados da casa ───────────────────────────────────────────────── */
  const plCasa = ref.carteiras.reduce((s, c) => s + c.plTotal, 0);
  const covCasa = coberturaDaCasa(ref);

  const emissores = agregarEmissores(ref, plCasa, concEmissor);
  const fatores = agregarFatores(ref, plCasa, concFator);

  /* ── 8. Encerrados ────────────────────────────────────────────────────────
     Sinal que existia no período anterior e não existe mais. Sai na lista mesmo
     sem valor atual: é o único jeito de a tela mostrar o desfecho do que o
     assessor estava acompanhando. Mesma regra do `encerrado` do crédito. */
  const nomesAtuais = new Set(carteiras.map((c) => c.carteira));
  const encerrados: SinalEncerrado[] = [];
  for (const r of anteriores) {
    if (vistos.has(chaveSinal(r.carteira, r.tipo, r.chave))) continue;
    encerrados.push({
      carteira: r.carteira,
      tipo: r.tipo,
      chave: r.chave,
      rotulo: r.rotulo,
      severidadeAnterior: r.severidade,
      valorAnterior: r.valor,
      motivo: nomesAtuais.has(r.carteira) ? 'sinal-saiu' : 'carteira-saiu',
    });
  }
  encerrados.sort(
    (a, b) =>
      PESO_SEVERIDADE[b.severidadeAnterior] - PESO_SEVERIDADE[a.severidadeAnterior] ||
      b.valorAnterior - a.valorAnterior ||
      a.carteira.localeCompare(b.carteira) ||
      a.tipo.localeCompare(b.tipo)
  );

  /* ── 9. Ranking ────────────────────────────────────────────────────────────
     Sem score 0 a 100: a escala do score de materialidade ainda é decisão
     aberta do dono, e já existe um 0 a 100 no sistema onde 100 é BOM.

     O corte PRIMÁRIO é o ESTADO, não a severidade, e isso mudou na Entrega B.2
     por medição: com ordem por severidade, a lista de segunda-feira era idêntica
     à de sexta (87% dos alertas repetidos, 97% das carteiras acesas nos 37 meses
     de dado real). Severidade continua ordenando dentro do estado, que é onde
     ela informa. Ordem total e reproduzível. */
  const pesoSev: Record<Severidade, number> = { alta: 3, media: 2, baixa: 1 };
  carteiras.sort(
    (a, b) =>
      (b.estado ? PESO_ESTADO[b.estado] : 0) - (a.estado ? PESO_ESTADO[a.estado] : 0) ||
      (b.pior ? pesoSev[b.pior] : 0) - (a.pior ? pesoSev[a.pior] : 0) ||
      b.sinais.length - a.sinais.length ||
      b.maiorExposicao - a.maiorExposicao ||
      a.carteira.localeCompare(b.carteira)
  );
  // Dentro da carteira, o que mudou primeiro, pelo mesmo motivo.
  for (const c of carteiras) {
    c.sinais.sort(
      (a, b) =>
        PESO_ESTADO[b.estado] - PESO_ESTADO[a.estado] ||
        pesoSev[b.severidade] - pesoSev[a.severidade] ||
        b.valor - a.valor ||
        a.tipo.localeCompare(b.tipo) ||
        a.rotulo.localeCompare(b.rotulo)
    );
  }

  return {
    baseData: base?.data ?? null,
    carteiras,
    encerrados,
    temAnterior,
    emissores,
    fatores,
    deterioracao,
    cobertura: coberturaPorCarteira(ref),
    coberturaCasa: covCasa,
    insights: ordenarInsights(insights),
  };
}

function piorSeveridade(sevs: Severidade[]): Severidade | null {
  if (!sevs.length) return null;
  if (sevs.includes('alta')) return 'alta';
  if (sevs.includes('media')) return 'media';
  return 'baixa';
}

/**
 * Emissores da casa inteira. `maiorFracaoEmCarteira` é o que importa de
 * verdade: um emissor com 2% do PL da casa mas 40% de uma carteira específica é
 * risco concentrado, não risco diluído, e a fração da casa esconde isso.
 */
function agregarEmissores(ref: Snapshot, plCasa: number, limiar: number): RadarEmissor[] {
  const acc = new Map<
    string,
    { nome: string; valor: number; carteiras: Map<string, number>; plCoberto: number }
  >();
  for (const c of ref.carteiras) {
    for (const p of c.posicoes) {
      const a = atributosDe(p);
      if (!a.emissorId) continue;
      const e = acc.get(a.emissorId) ?? {
        nome: a.emissorNome ?? a.emissorId,
        valor: 0,
        carteiras: new Map<string, number>(),
        plCoberto: 0,
      };
      e.valor += p.valor;
      e.plCoberto += p.valor;
      e.carteiras.set(c.nome, (e.carteiras.get(c.nome) ?? 0) + p.valor);
      acc.set(a.emissorId, e);
    }
  }

  const plPorCarteira = new Map(ref.carteiras.map((c) => [c.nome, c.plTotal]));
  const covCasa = plCasa > 0 ? [...acc.values()].reduce((s, e) => s + e.plCoberto, 0) / plCasa : 0;

  const out: RadarEmissor[] = [];
  for (const [emissorId, e] of acc) {
    let maiorFracao = 0;
    let carteiraMaisExposta = '';
    for (const [nome, valor] of [...e.carteiras.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const pl = plPorCarteira.get(nome) ?? 0;
      const f = pl > 0 ? valor / pl : 0;
      if (f > maiorFracao) {
        maiorFracao = f;
        carteiraMaisExposta = nome;
      }
    }
    out.push({
      emissorId,
      emissorNome: e.nome,
      valor: e.valor,
      fracaoCasa: plCasa > 0 ? e.valor / plCasa : 0,
      carteiras: [...e.carteiras.keys()].sort((a, b) => a.localeCompare(b)),
      maiorFracaoEmCarteira: maiorFracao,
      carteiraMaisExposta,
      cobertura: covCasa,
    });
  }

  // Relevante primeiro: quem passa do limiar em alguma carteira sobe, e dentro
  // de cada grupo ordena por R$.
  return out.sort(
    (a, b) =>
      Number(b.maiorFracaoEmCarteira >= limiar) - Number(a.maiorFracaoEmCarteira >= limiar) ||
      b.valor - a.valor ||
      a.emissorId.localeCompare(b.emissorId)
  );
}

/** Fatores comuns da casa, por dimensão e valor. */
function agregarFatores(ref: Snapshot, plCasa: number, limiar: number): RadarFator[] {
  const out: RadarFator[] = [];
  for (const fator of ['indexador', 'moeda', 'regiao', 'classeCanonica'] as Fator[]) {
    let plCoberto = 0;
    const acc = new Map<string, { montante: number; carteiras: Map<string, number> }>();
    for (const c of ref.carteiras) {
      for (const p of c.posicoes) {
        const v = atributosDe(p)[fator];
        if (!v) continue;
        plCoberto += p.valor;
        const e = acc.get(v) ?? { montante: 0, carteiras: new Map<string, number>() };
        e.montante += p.valor;
        e.carteiras.set(c.nome, (e.carteiras.get(c.nome) ?? 0) + p.valor);
        acc.set(v, e);
      }
    }
    const cov = plCasa > 0 ? plCoberto / plCasa : 0;
    const plPorCarteira = new Map(ref.carteiras.map((c) => [c.nome, c.plTotal]));
    for (const [valor, e] of acc) {
      const concentradas = [...e.carteiras.entries()]
        .filter(([nome, v]) => {
          const pl = plPorCarteira.get(nome) ?? 0;
          return pl > 0 && v / pl >= limiar;
        })
        .map(([nome]) => nome)
        .sort((a, b) => a.localeCompare(b));
      out.push({
        fator,
        valor,
        montante: e.montante,
        fracaoCasa: plCasa > 0 ? e.montante / plCasa : 0,
        carteiras: [...e.carteiras.keys()].sort((a, b) => a.localeCompare(b)),
        carteirasConcentradas: concentradas,
        cobertura: cov,
      });
    }
  }
  return out.sort(
    (a, b) =>
      b.carteirasConcentradas.length - a.carteirasConcentradas.length ||
      b.montante - a.montante ||
      a.fator.localeCompare(b.fator) ||
      a.valor.localeCompare(b.valor)
  );
}
