/**
 * src/intel/credit-events.ts — Entrega B: eventos de crédito e impacto.
 *
 * Recebe evento de crédito de uma fonte externa e responde a pergunta que o
 * assessor faz de verdade: "isso me pega? onde? quanto? e mudou desde ontem?".
 *
 * Cadeia: evento → emissorId → carteiras → exposição → severidade do impacto,
 * mais o estado do par contra o período anterior.
 *
 * O VIX Radar real NÃO é integrado aqui. Este módulo define o contrato de
 * entrada e o cruzamento; a fonte é injetada por quem chama, e hoje quem chama
 * é o CLI com fixture sintético.
 *
 * ── As quatro regras que fazem este módulo ser honesto ──────────────────────
 *
 * 1. "SEM EXPOSIÇÃO" E "NÃO SEI" SÃO RESPOSTAS DIFERENTES.
 *    Se a carteira não tem cobertura de emissor suficiente, o motor NÃO pode
 *    dizer que ela está limpa. Ele não sabe. As duas listas saem separadas, e
 *    a de não avaliáveis é tão importante quanto a de atingidas: é ela que diz
 *    ao assessor onde ele está no escuro num dia de evento de crédito.
 *
 * 2. A SEVERIDADE DO EVENTO NÃO É A SEVERIDADE DO IMPACTO, e perda confirmada
 *    não se mede na mesma régua de sinalização de risco. Duas escadas, ambas
 *    visíveis em thresholds.ts. Não há multiplicação virando score: isso é o
 *    Materiality Engine, é da Entrega C, e depende de pesos não calibrados.
 *
 * 3. CONFIANÇA NUNCA SOBE. A fonte declara a dela, a cobertura declara a
 *    nossa, o insight sai com a MENOR das duas.
 *
 * 4. O PISO FILTRA RUÍDO NOVO, NÃO ESCONDE MOVIMENTO NO QUE JÁ SE ACOMPANHA.
 *    Par que existia no período anterior é sempre reportado, mesmo abaixo do
 *    piso: cair abaixo do piso É a notícia, e some-lo sem dizer nada é a
 *    forma silenciosa de o assessor perder o desfecho do caso.
 *
 * Puro e determinístico: sem IO, sem Date.now, sem Math.random.
 */

import { atributosDe, emissorIdDe } from '../snapshot/normalize.js';
import { THRESHOLDS } from '../snapshot/thresholds.js';
import type { Severidade, Snapshot, SnapshotCarteira } from '../snapshot/types.js';
import { coberturaDoAtributo, faixaDeCobertura } from './coverage.js';
import {
  estadoAgregado,
  estadoTemporal,
  PESO_ESTADO,
  PESO_SEVERIDADE as PESO_SEV,
  type EstadoTemporal,
} from './estado.js';
import {
  confiancaDe,
  idInsight,
  ordenarInsights,
  severidadeDe,
  type Confianca,
  type Insight,
} from './explain.js';

/* ════════════════════════════════════════════════════════════════════════════
   Contrato de entrada

   Exatamente os seis campos que a diretriz definiu. Tipos frouxos de
   propósito: é contrato de FRONTEIRA com fonte externa, e fronteira que exige
   enum do outro lado quebra quando o outro lado muda uma string. O saneamento
   é aqui dentro.
   ══════════════════════════════════════════════════════════════════════════ */

export interface EventoCreditoEntrada {
  /** nome do emissor como a fonte escreve */
  issuer: string;
  /** tipo do evento, texto livre da fonte */
  event: string;
  /** severidade declarada pela fonte, texto livre */
  severity: string;
  /** AAAA-MM-DD */
  date: string;
  /** de onde veio (ex.: 'vix-radar') */
  source: string;
  /** 0..1 declarado pela fonte */
  confidence: number;
}

/** Tipos que o motor reconhece. Fora da lista vira OUTRO, sem perder o texto. */
export type TipoEventoCredito =
  | 'DEFAULT'
  | 'RECUPERACAO_JUDICIAL'
  | 'REBAIXAMENTO_RATING'
  | 'ATRASO_PAGAMENTO'
  | 'COVENANT_QUEBRADO'
  | 'SUSPENSAO_NEGOCIACAO'
  | 'NOTICIA_NEGATIVA'
  | 'OUTRO';

/** Como o tipo é tratado: define a escada de severidade e o piso de exposição. */
export type ClasseEvento = 'perdaConfirmada' | 'sinalizacao' | 'observacao';

/**
 * Estado do par (evento, carteira) contra o período anterior.
 * Alias de `EstadoTemporal` (intel/estado.ts): o nome local sobrevive porque é
 * o vocabulário desta tela, mas a máquina de estado é uma só na camada.
 */
export type EstadoEvento = EstadoTemporal;

/** Evento já saneado e com chave de emissor resolvida. */
export interface EventoCreditoNormalizado {
  emissorId: string;
  emissorNome: string;
  tipo: TipoEventoCredito;
  classe: ClasseEvento;
  /** o `event` cru da fonte, preservado mesmo quando o tipo cai em OUTRO */
  tipoOriginal: string;
  severidadeEvento: Severidade;
  severidadeOriginal: string;
  data: string;
  fonte: string;
  confiancaFonte: Confianca;
  confiancaOriginal: number;
}

/**
 * Classe de tratamento por tipo.
 *
 * `OUTRO` cai em sinalização, não em observação, e é decisão consciente: tipo
 * que o motor não reconheceu não é evidência de que o evento seja pequeno, e
 * o piso mais baixo reporta mais. Mesma lógica pela qual severidade não
 * reconhecida vira `media` e não `baixa`.
 */
export const CLASSE_POR_TIPO: Record<TipoEventoCredito, ClasseEvento> = {
  DEFAULT: 'perdaConfirmada',
  RECUPERACAO_JUDICIAL: 'perdaConfirmada',
  REBAIXAMENTO_RATING: 'sinalizacao',
  ATRASO_PAGAMENTO: 'sinalizacao',
  COVENANT_QUEBRADO: 'sinalizacao',
  SUSPENSAO_NEGOCIACAO: 'sinalizacao',
  OUTRO: 'sinalizacao',
  NOTICIA_NEGATIVA: 'observacao',
};

/* ── Saneamento da fronteira ─────────────────────────────────────────────── */

function chave(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function tipoEventoDe(bruto: string): TipoEventoCredito {
  const k = chave(bruto ?? '');
  if (!k) return 'OUTRO';
  if (/(default|inadimpl|calote)/.test(k)) return 'DEFAULT';
  if (/(recuperacao judicial|\brj\b|falencia|chapter 11)/.test(k)) return 'RECUPERACAO_JUDICIAL';
  if (/(rebaixamento|downgrade|corte de rating|rating cut)/.test(k)) return 'REBAIXAMENTO_RATING';
  if (/(atraso|late payment|missed payment|nao pagamento)/.test(k)) return 'ATRASO_PAGAMENTO';
  if (/(covenant|clausula quebrada|breach)/.test(k)) return 'COVENANT_QUEBRADO';
  if (/(suspensao|suspenso|halt|trading halt)/.test(k)) return 'SUSPENSAO_NEGOCIACAO';
  if (/(noticia|news|reportagem|denuncia|investigacao|watchlist)/.test(k)) return 'NOTICIA_NEGATIVA';
  return 'OUTRO';
}

/**
 * Severidade declarada pela fonte, traduzida para a escala do projeto.
 *
 * Desconhecido vira 'media', não 'baixa': fonte que não sabe classificar o
 * próprio evento não é evidência de que o evento seja pequeno, e tratar como
 * pequeno é a forma silenciosa de perder o evento que importava.
 */
export function severidadeEventoDe(bruto: string): Severidade {
  const k = chave(bruto ?? '');
  if (/(alta|high|critical|critica|severe|grave)/.test(k)) return 'alta';
  if (/(baixa|low|minor|leve|info)/.test(k)) return 'baixa';
  return 'media';
}

/** Confiança numérica da fonte para a escala do projeto. */
export function confiancaFonteDe(v: number): Confianca {
  if (!Number.isFinite(v)) return 'baixa';
  if (v >= 0.8) return 'alta';
  if (v >= 0.5) return 'media';
  return 'baixa';
}

const ORDEM_CONFIANCA: Record<Confianca, number> = { baixa: 0, media: 1, alta: 2 };

/** A menor das duas. Confiança nunca sobe por combinação. */
export function menorConfianca(a: Confianca, b: Confianca): Confianca {
  return ORDEM_CONFIANCA[a] <= ORDEM_CONFIANCA[b] ? a : b;
}

/**
 * Normaliza um evento cru. Devolve null quando o registro não tem o mínimo
 * para ser cruzado (emissor vazio ou data malformada): evento sem emissor não
 * casa com nada, e deixá-lo entrar produziria uma linha que nunca aponta para
 * carteira nenhuma.
 */
export function normalizarEvento(e: EventoCreditoEntrada): EventoCreditoNormalizado | null {
  const nome = (e?.issuer ?? '').trim();
  const emissorId = emissorIdDe(nome);
  if (!emissorId) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e?.date ?? '')) return null;

  const tipo = tipoEventoDe(e.event);
  return {
    emissorId,
    emissorNome: nome.replace(/\s+/g, ' '),
    tipo,
    classe: CLASSE_POR_TIPO[tipo],
    tipoOriginal: (e.event ?? '').trim(),
    severidadeEvento: severidadeEventoDe(e.severity),
    severidadeOriginal: (e.severity ?? '').trim(),
    data: e.date,
    fonte: (e.source ?? 'desconhecida').trim() || 'desconhecida',
    confiancaFonte: confiancaFonteDe(e.confidence),
    confiancaOriginal: Number.isFinite(e.confidence) ? e.confidence : 0,
  };
}

/* ── Tradução de evento para impacto: duas escadas ───────────────────────── */

/**
 * Matriz do CAMINHO 2, evento de sinalização e observação.
 *
 * Severidade do EVENTO × faixa de EXPOSIÇÃO = severidade do IMPACTO, sobre os
 * cortes genéricos de THRESHOLDS.severidade (10% e 30%), que é o que "alta"
 * já significa em toda outra tela do produto.
 *
 * Em uma frase: só evento grave em exposição grande é alta; grave em pequena e
 * leve em grande merecem olhada; leve em pequena é registro, não chamada.
 */
export const MATRIZ_IMPACTO_CREDITO: Record<Severidade, Record<Severidade, Severidade>> = {
  //            exposição baixa   exposição media   exposição alta
  alta: { baixa: 'media', media: 'alta', alta: 'alta' },
  media: { baixa: 'baixa', media: 'media', alta: 'alta' },
  baixa: { baixa: 'baixa', media: 'baixa', alta: 'media' },
};

/**
 * Severidade do impacto.
 *
 * CAMINHO 1, perda confirmada (default, recuperação judicial): escada própria,
 * mais sensível, porque aqui o dinheiro já foi. 10% do PL já é alto, contra
 * 30% no resto do motor. Abaixo de 2% a decisão passa por piso em REAIS, não
 * percentual: um calote de R$ 300 mil numa carteira de R$ 20 mi é 1,5% do PL e
 * continua sendo R$ 300 mil que o assessor precisa explicar ao cliente.
 *
 * CAMINHO 2, todo o resto: a matriz acima.
 */
export function severidadeDoImpacto(
  ev: Pick<EventoCreditoNormalizado, 'classe' | 'severidadeEvento'>,
  fracaoExposicao: number,
  valorExposicao: number
): Severidade {
  if (ev.classe === 'perdaConfirmada') {
    const escada = THRESHOLDS.creditoPerdaConfirmada;
    if (fracaoExposicao >= escada.altaMin) return 'alta';
    if (fracaoExposicao >= escada.mediaMin) return 'media';
    return valorExposicao >= THRESHOLDS.creditoPerdaConfirmadaMinAbs ? 'media' : 'baixa';
  }
  const faixaExposicao = severidadeDe(fracaoExposicao, THRESHOLDS.severidade);
  return MATRIZ_IMPACTO_CREDITO[ev.severidadeEvento][faixaExposicao];
}

/** Piso de exposição da classe do evento, em fração do PL. */
export function pisoDaClasse(classe: ClasseEvento, override?: Partial<Record<ClasseEvento, number>>): number {
  return override?.[classe] ?? THRESHOLDS.creditoPisoExposicao[classe];
}

/* ── Estado temporal ─────────────────────────────────────────────────────── */

/** Chave do par acompanhado entre períodos. */
export function chaveRegistro(emissorId: string, tipo: TipoEventoCredito, carteira: string): string {
  return `${emissorId}|${tipo}|${carteira}`;
}

/** O que o período anterior precisa entregar para o estado ser derivado. */
export interface RegistroAnterior {
  emissorId: string;
  emissorNome: string;
  tipo: TipoEventoCredito;
  carteira: string;
  exposicao: number;
  severidadeImpacto: Severidade;
  dataEvento: string;
}

/** Achata o resultado do período anterior na forma que o estado precisa. */
export function registrosDe(anterior: Pick<CreditoResultado, 'impactos'> | null | undefined): RegistroAnterior[] {
  const out: RegistroAnterior[] = [];
  for (const imp of anterior?.impactos ?? []) {
    for (const a of imp.atingidas ?? []) {
      out.push({
        emissorId: imp.evento.emissorId,
        emissorNome: imp.evento.emissorNome,
        tipo: imp.evento.tipo,
        carteira: a.carteira,
        exposicao: a.valor,
        severidadeImpacto: a.severidadeImpacto,
        dataEvento: imp.evento.data,
      });
    }
  }
  return out;
}

/**
 * Estado do par contra o anterior.
 *
 * Adaptador de nome de campo sobre `estadoTemporal` (intel/estado.ts), que é a
 * máquina de estado única da camada. A regra saiu daqui na Entrega B.2, quando
 * o radar passou a precisar da mesma: duas cópias divergem sozinhas, e o dia em
 * que divergirem a tela de eventos vai chamar de "agravado" o que a tela do
 * radar chama de "acompanhamento" sobre o mesmo movimento.
 */
export function estadoDoPar(
  atual: { severidade: Severidade; exposicao: number },
  anterior: { severidadeImpacto: Severidade; exposicao: number } | undefined,
  variacaoMaterial: number
): EstadoEvento {
  return estadoTemporal(
    { severidade: atual.severidade, valor: atual.exposicao },
    anterior ? { severidade: anterior.severidadeImpacto, valor: anterior.exposicao } : undefined,
    variacaoMaterial
  );
}

/* ── Cruzamento ──────────────────────────────────────────────────────────── */

export interface ExposicaoCarteira {
  carteira: string;
  valor: number;
  /** 0..1 do PL da carteira */
  fracaoPl: number;
  plTotal: number;
  /** ativos daquela carteira ligados ao emissor */
  ativos: string[];
  severidadeImpacto: Severidade;
  estado: EstadoEvento;
  /** R$ no período anterior; null quando o par é novo */
  exposicaoAnterior: number | null;
  /** variação relativa da exposição; null quando o par é novo */
  variacaoExposicao: number | null;
  severidadeAnterior: Severidade | null;
  /** o par só apareceu porque já era acompanhado, apesar de estar sob o piso */
  abaixoDoPiso: boolean;
  cobertura: number;
  confianca: Confianca;
  insightId: string;
}

export interface EncerradoItem {
  emissorId: string;
  emissorNome: string;
  tipo: TipoEventoCredito;
  carteira: string;
  exposicaoAnterior: number;
  severidadeAnterior: Severidade;
  dataEvento: string;
  motivo: 'evento-saiu-da-fonte' | 'exposicao-zerada';
}

export interface ImpactoEvento {
  evento: EventoCreditoNormalizado;
  /** carteiras com exposição ao emissor, maior fração primeiro */
  atingidas: ExposicaoCarteira[];
  /**
   * Carteiras que o motor NÃO conseguiu avaliar por falta de cobertura de
   * emissor. Não estão limpas, estão no escuro. Nunca somar com `semExposicao`.
   */
  naoAvaliaveis: string[];
  /** Carteiras avaliáveis e comprovadamente sem exposição ao emissor. */
  semExposicao: string[];
  /** R$ total da casa exposto a este emissor, só sobre carteiras avaliáveis */
  exposicaoTotal: number;
  /** 0..1 sobre o PL da casa avaliável */
  fracaoCasa: number;
  /** pior severidade de impacto entre as atingidas; null quando não atinge ninguém */
  pior: Severidade | null;
  /** estado agregado: o mais "urgente" entre os pares deste evento */
  estado: EstadoEvento | null;
}

export interface CreditoResultado {
  impactos: ImpactoEvento[];
  /** pares que sumiram desde o período anterior; nunca some sem avisar */
  encerrados: EncerradoItem[];
  insights: Insight[];
  /** eventos que não puderam sequer ser normalizados (emissor ou data ruins) */
  descartados: number;
  /** total de carteiras do snapshot */
  carteiras: number;
  /** quantas delas têm cobertura de emissor suficiente para responder */
  carteirasAvaliaveis: number;
  /** houve período anterior para comparar; false = tudo é 'novo' por definição */
  temAnterior: boolean;
}

export interface OpcoesCredito {
  /** override dos pisos por classe; default THRESHOLDS.creditoPisoExposicao */
  pisos?: Partial<Record<ClasseEvento, number>>;
  /** default THRESHOLDS.creditoVariacaoMaterialPct */
  variacaoMaterialPct?: number;
  /** resultado do período anterior, para derivar estado */
  anterior?: Pick<CreditoResultado, 'impactos'> | null;
}

function exposicaoDa(c: SnapshotCarteira, emissorId: string): { valor: number; ativos: string[] } {
  let valor = 0;
  const ativos: string[] = [];
  for (const p of c.posicoes) {
    if (atributosDe(p).emissorId !== emissorId) continue;
    valor += p.valor;
    ativos.push(p.ativo);
  }
  return { valor, ativos: ativos.sort((a, b) => a.localeCompare(b)) };
}

function pct(v: number): string {
  return (v * 100).toFixed(1).replace('.', ',') + '%';
}

function brl(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

/**
 * Cruza eventos com o snapshot de referência.
 *
 * `eventos` vem de fora (fixture hoje, VIX Radar amanhã). O motor não busca
 * nada: não faz rede, não lê disco.
 */
export function impactoDeCredito(
  snap: Snapshot,
  eventos: EventoCreditoEntrada[],
  opcoes: OpcoesCredito = {}
): CreditoResultado {
  const variacaoMaterial = opcoes.variacaoMaterialPct ?? THRESHOLDS.creditoVariacaoMaterialPct;
  const tenantId = snap.tenantId ?? 'default';

  const anteriores = registrosDe(opcoes.anterior);
  const temAnterior = anteriores.length > 0;
  const porChave = new Map(anteriores.map((r) => [chaveRegistro(r.emissorId, r.tipo, r.carteira), r]));
  const vistos = new Set<string>();

  // Cobertura de emissor por carteira, calculada uma vez: é o que separa
  // "sem exposição" de "não sei", e é consultada para cada evento.
  const coberturaPorCarteira = new Map<string, number>();
  const avaliaveis: SnapshotCarteira[] = [];
  const naoAvaliaveis: string[] = [];
  for (const c of snap.carteiras) {
    const cov = coberturaDoAtributo(c, 'emissorId');
    coberturaPorCarteira.set(c.nome, cov);
    if (faixaDeCobertura(cov) === 'insuficiente') naoAvaliaveis.push(c.nome);
    else avaliaveis.push(c);
  }
  naoAvaliaveis.sort((a, b) => a.localeCompare(b));

  const plCasaAvaliavel = avaliaveis.reduce((s, c) => s + c.plTotal, 0);

  const impactos: ImpactoEvento[] = [];
  const insights: Insight[] = [];
  let descartados = 0;
  /** tipos de evento presentes na fonte hoje, para classificar o encerramento */
  const eventosHoje = new Set<string>();

  for (const bruto of eventos) {
    const ev = normalizarEvento(bruto);
    if (!ev) {
      descartados++;
      continue;
    }
    eventosHoje.add(`${ev.emissorId}|${ev.tipo}`);

    const piso = pisoDaClasse(ev.classe, opcoes.pisos);
    const atingidas: ExposicaoCarteira[] = [];
    const semExposicao: string[] = [];
    let exposicaoTotal = 0;

    for (const c of avaliaveis) {
      if (c.plTotal <= 0) continue;
      const { valor, ativos } = exposicaoDa(c, ev.emissorId);
      const k = chaveRegistro(ev.emissorId, ev.tipo, c.nome);
      const ant = porChave.get(k);

      if (valor <= 0) {
        semExposicao.push(c.nome);
        continue;
      }
      exposicaoTotal += valor;

      const fracaoPl = valor / c.plTotal;
      const sob = fracaoPl < piso;

      // O piso filtra RUÍDO NOVO. Par que já era acompanhado passa mesmo sob
      // o piso: cair abaixo do piso É a notícia, e sumir sem dizer nada faz o
      // assessor perder o desfecho do caso que ele estava seguindo.
      if (sob && !ant) continue;

      vistos.add(k);

      const cobertura = coberturaPorCarteira.get(c.nome) ?? 0;
      const sev = severidadeDoImpacto(ev, fracaoPl, valor);
      const estado = estadoDoPar({ severidade: sev, exposicao: valor }, ant, variacaoMaterial);
      const confianca = menorConfianca(confiancaDe(cobertura), ev.confiancaFonte);
      const id = idInsight(snap.data, c.nome, 'EVENTO_CREDITO', `${ev.emissorId}|${ev.tipo}`);
      const variacao = ant && ant.exposicao > 0 ? (valor - ant.exposicao) / ant.exposicao : null;

      insights.push({
        schema: 'insight/v1',
        id,
        tipo: 'EVENTO_CREDITO',
        carteira: c.nome,
        tenantId,
        severidade: sev,
        afirmacao:
          `${ev.emissorNome} teve ${ev.tipoOriginal || ev.tipo} em ${ev.data}, ` +
          `e a carteira tem ${pct(fracaoPl)} do patrimônio nesse emissor.`,
        evidencias: {
          emissorId: ev.emissorId,
          emissorNome: ev.emissorNome,
          tipoEvento: ev.tipo,
          tipoOriginal: ev.tipoOriginal,
          classeEvento: ev.classe,
          severidadeEvento: ev.severidadeEvento,
          severidadeDeclarada: ev.severidadeOriginal,
          dataEvento: ev.data,
          fonteEvento: ev.fonte,
          confiancaFonte: ev.confiancaOriginal,
          exposicao: valor,
          plTotal: c.plTotal,
          fracaoPl,
          estado,
          ...(ant ? { exposicaoAnterior: ant.exposicao } : {}),
          ...(variacao !== null ? { variacaoExposicao: variacao } : {}),
          ...(sob ? { abaixoDoPiso: true } : {}),
          ativos: ativos.join(', '),
        },
        regra: {
          nome: ev.classe === 'perdaConfirmada' ? 'creditoPerdaConfirmada' : 'MATRIZ_IMPACTO_CREDITO',
          limiar:
            ev.classe === 'perdaConfirmada'
              ? {
                  altaMin: THRESHOLDS.creditoPerdaConfirmada.altaMin,
                  mediaMin: THRESHOLDS.creditoPerdaConfirmada.mediaMin,
                  pisoAbsoluto: THRESHOLDS.creditoPerdaConfirmadaMinAbs,
                  piso: 'sem piso (perda confirmada)',
                }
              : {
                  severidadeEvento: ev.severidadeEvento,
                  faixaExposicao: severidadeDe(fracaoPl, THRESHOLDS.severidade),
                  piso,
                },
        },
        calculo:
          `${brl(valor)} / ${brl(c.plTotal)} = ${pct(fracaoPl)} de exposicao; ` +
          (ev.classe === 'perdaConfirmada'
            ? `perda confirmada, escada ${pct(THRESHOLDS.creditoPerdaConfirmada.mediaMin)}/${pct(THRESHOLDS.creditoPerdaConfirmada.altaMin)} com piso ${brl(THRESHOLDS.creditoPerdaConfirmadaMinAbs)} = impacto ${sev}`
            : `evento ${ev.severidadeEvento} x exposicao ${severidadeDe(fracaoPl, THRESHOLDS.severidade)} = impacto ${sev}`) +
          (ant ? `; anterior ${brl(ant.exposicao)} (${ant.severidadeImpacto}) = ${estado}` : '; sem registro anterior = novo'),
        fonte: { fonte: snap.fonte, data: snap.data },
        cobertura,
        faixaCobertura: faixaDeCobertura(cobertura),
        confianca,
      });

      atingidas.push({
        carteira: c.nome,
        valor,
        fracaoPl,
        plTotal: c.plTotal,
        ativos,
        severidadeImpacto: sev,
        estado,
        exposicaoAnterior: ant ? ant.exposicao : null,
        variacaoExposicao: variacao,
        severidadeAnterior: ant ? ant.severidadeImpacto : null,
        abaixoDoPiso: sob,
        cobertura,
        confianca,
        insightId: id,
      });
    }

    atingidas.sort(
      (a, b) =>
        PESO_ESTADO[b.estado] - PESO_ESTADO[a.estado] ||
        b.fracaoPl - a.fracaoPl ||
        a.carteira.localeCompare(b.carteira)
    );
    semExposicao.sort((a, b) => a.localeCompare(b));

    impactos.push({
      evento: ev,
      atingidas,
      naoAvaliaveis,
      semExposicao,
      exposicaoTotal,
      fracaoCasa: plCasaAvaliavel > 0 ? exposicaoTotal / plCasaAvaliavel : 0,
      pior: piorDe(atingidas.map((a) => a.severidadeImpacto)),
      estado: estadoAgregado(atingidas.map((a) => a.estado)),
    });
  }

  /* Encerrados: estava no período anterior e não está mais. Sai na lista
     mesmo sem exposição atual, porque é o único jeito de a tela dizer "aquilo
     que você acompanhava saiu". Item que some sem explicação é pior do que
     item que continua aparecendo. */
  const encerrados: EncerradoItem[] = [];
  for (const r of anteriores) {
    const k = chaveRegistro(r.emissorId, r.tipo, r.carteira);
    if (vistos.has(k)) continue;
    encerrados.push({
      emissorId: r.emissorId,
      emissorNome: r.emissorNome,
      tipo: r.tipo,
      carteira: r.carteira,
      exposicaoAnterior: r.exposicao,
      severidadeAnterior: r.severidadeImpacto,
      dataEvento: r.dataEvento,
      motivo: eventosHoje.has(`${r.emissorId}|${r.tipo}`) ? 'exposicao-zerada' : 'evento-saiu-da-fonte',
    });
  }
  encerrados.sort(
    (a, b) =>
      b.exposicaoAnterior - a.exposicaoAnterior ||
      a.emissorId.localeCompare(b.emissorId) ||
      a.carteira.localeCompare(b.carteira)
  );

  // A tela abre pelo que MUDOU: estado primeiro, severidade depois, R$ por
  // ultimo. Sem isso a lista de segunda e igual a de sexta e ninguem abre.
  impactos.sort(
    (a, b) =>
      (b.estado ? PESO_ESTADO[b.estado] : 0) - (a.estado ? PESO_ESTADO[a.estado] : 0) ||
      (b.pior ? PESO_SEV[b.pior] : 0) - (a.pior ? PESO_SEV[a.pior] : 0) ||
      b.exposicaoTotal - a.exposicaoTotal ||
      b.evento.data.localeCompare(a.evento.data) ||
      a.evento.emissorId.localeCompare(b.evento.emissorId)
  );

  return {
    impactos,
    encerrados,
    insights: ordenarInsights(insights),
    descartados,
    carteiras: snap.carteiras.length,
    carteirasAvaliaveis: avaliaveis.length,
    temAnterior,
  };
}

function piorDe(sevs: Severidade[]): Severidade | null {
  if (!sevs.length) return null;
  if (sevs.includes('alta')) return 'alta';
  if (sevs.includes('media')) return 'media';
  return 'baixa';
}

/** Artefato gravado pelo CLI. Mesmo desenho de RadarFile. */
export interface CreditoFile extends CreditoResultado {
  schema: 'credito/v1';
  data: string;
  periodo: 'diario' | 'mensal';
  tenantId: string;
  geradoEm: string;
  engine: { nome: 'atlas-audit-engine'; versao: string };
  /** data do credito.json usado como base do estado; null = sem anterior */
  baseData: string | null;
  limiares: {
    creditoPerdaConfirmada: { altaMin: number; mediaMin: number };
    creditoPerdaConfirmadaMinAbs: number;
    creditoPisoExposicao: Record<ClasseEvento, number>;
    creditoVariacaoMaterialPct: number;
    coberturaAfirmaMin: number;
    coberturaRessalvaMin: number;
    severidade: { baixaMax: number; mediaMax: number };
  };
  /** rótulo da origem dos eventos, para a tela dizer de onde vieram */
  fonteEventos: string;
}
