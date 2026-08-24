/**
 * src/snapshot/types.ts — tipos do snapshot EOD diário (Fase 1).
 *
 * Aditivos: não tocam schema.ts, que é o contrato do fluxo mensal. O snapshot
 * diário modela o estado de um DIA (posições EOD), não a comparação mensal
 * baseline vs referencia.
 */

/** Rótulo lógico da fonte (ex.: nome da casa no pipeline). Validado sem separador de path. */
export type SnapshotFonte = string;

export type FormatoEntrada = 'xlsx' | 'csv' | 'pdf' | 'html' | 'api-json' | 'txt-b3';

/** Saída comum de todos os adaptadores, antes da normalização. */
export interface RawPosition {
  ativo: string;
  valor: number;
  classe?: string;
  vencimento?: string; // 'YYYY-MM-DD' quando o adaptador conseguir
  quantidade?: number;
  instituicao?: string | null; // emissor/custodiante, só quando a fonte tem (PDF)
}

export interface RawCarteira {
  nome: string;
  /** Receita da casa no período (R$), quando a fonte informa; senão, o
      normalize deriva no mensal via taxa-map (PL x taxa anual / 12). */
  receita?: number;
  posicoes: RawPosition[];
}

export interface RawSnapshot {
  data: string; // 'YYYY-MM-DD'
  fonte: SnapshotFonte;
  carteiras: RawCarteira[];
}

/**
 * Classe canônica (enum fechado). `classe` continua string livre porque é o que
 * a fonte escreve; esta é a versão que os motores consomem. Sem isto, agrupar
 * por classe compara "Renda Fixa", "renda fixa" e "RF" como três coisas.
 */
export type ClasseCanonica =
  | 'liquidez'
  | 'renda-fixa'
  | 'credito-privado'
  | 'fundo'
  | 'acoes'
  | 'multimercado'
  | 'imobiliario'
  | 'internacional'
  | 'previdencia'
  | 'derivativos'
  | 'outros';

/** A que o papel é indexado. Base da exposição a juros, inflação e câmbio. */
export type Indexador =
  | 'CDI'
  | 'SELIC'
  | 'IPCA'
  | 'IGPM'
  | 'PRE'
  | 'CAMBIO'
  | 'BOLSA'
  | 'MULTI';

export type Moeda = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY';

export type Regiao = 'brasil' | 'eua' | 'global';

/**
 * Atributos por posição (Fase 0 da camada de inteligência, 2026-08-24).
 *
 * O arquivo do custodiante não traz nada disto. A fonte é o ativo-map da
 * instância, mesmo padrão de name-map/class-map/taxa-map, com duas derivações
 * gratuitas: `prazoAnos` sai de `vencimento` quando ele existe, e
 * `classeCanonica` sai do rótulo livre quando ele é inequívoco.
 *
 * `emissorId` NÃO é derivado de `instituicao`. Aquele campo é o custodiante nas
 * fontes que temos, e confundir custodiante com emissor produz alerta crítico
 * falso. Ver a nota em resolverAtributos (normalize.ts).
 *
 * REGRA DURA: desconhecido é `null`, nunca zero e nunca default. Um motor que
 * lê 0 onde o dado falta afirma "sem exposição a câmbio" quando a verdade é
 * "não sei classificar". Quem consome mede cobertura antes de afirmar, ver
 * intel/coverage.ts.
 */
export interface AtributosAtivo {
  classeCanonica: ClasseCanonica | null;
  indexador: Indexador | null;
  /** rótulo como está no papel ("110% CDI", "IPCA+6%"), não número calculado */
  taxaContratada: string | null;
  /** chave estável do emissor: raiz de CNPJ quando houver, senão slug do nome */
  emissorId: string | null;
  emissorNome: string | null;
  moeda: Moeda | null;
  regiao: Regiao | null;
  /** anos corridos até o vencimento, na data do snapshot; negativo = vencido */
  prazoAnos: number | null;
  /** prazo de resgate em dias (0 = D+0, null = desconhecido, não "fechado") */
  liquidezDias: number | null;
  cobertoFGC: boolean | null;
}

/** Posição canônica pós-normalização (identificadores estáveis entre dias). */
export interface SnapshotPosition {
  carteira: string;
  ativo: string;
  classe: string | null;
  valor: number;
  vencimento: string | null;
  quantidade: number | null;
  instituicao: string | null; // emissor/custodiante quando a fonte fornece
  /**
   * Opcional de propósito: snapshot.json gravado antes de 2026-08-24 não tem o
   * campo, e quem lê trata ausência como "todos os atributos desconhecidos"
   * (atributosDe, em normalize.ts). Mesma política de compat do tenantId.
   */
  atributos?: AtributosAtivo;
}

export interface SnapshotCarteira {
  nome: string;
  plTotal: number; // sempre derivado: soma das posições (fonte única de verdade)
  /** Receita da casa no período (R$). Só existe no mensal (normalize calcula
      via taxa-map quando a fonte não informa); no diário fica ausente. */
  receita?: number;
  posicoes: SnapshotPosition[];
}

export interface Snapshot {
  schema: 'snapshot/v1';
  data: string; // 'YYYY-MM-DD' (diario) ou 'YYYY-MM' (mensal)
  periodo: 'diario' | 'mensal';
  fonte: SnapshotFonte;
  geradoEm: string; // ISO
  engine: { nome: 'atlas-audit-engine'; versao: string };
  carteiras: SnapshotCarteira[];
  /**
   * Rótulo do cliente dono dos artefatos (caminho multi-cliente, 2026-08-21).
   * Obrigatório nas gravações novas, via ingest. Ausente só em snapshot.json
   * antigo no disco: quem lê trata ausência como 'default' (tenantDe, em
   * pipeline.ts). Nunca carrega separador de path (validado na ingestão).
   */
  tenantId?: string;
}

export type EventoTipo =
  | 'CASH_INCREASE'
  | 'CASH_DECREASE'
  | 'NEW_POSITION'
  | 'POSITION_CLOSED'
  | 'MATURITY_APPROACHING'
  | 'LARGE_WITHDRAWAL'
  | 'ALLOCATION_SHIFT'
  | 'CONCENTRATION_INCREASE'
  | 'REVENUE_DROP'; // Fase 5: queda >= 5% da receita mensal da carteira (receita = PL x taxa anual / 12; taxa-map da instancia)

export type Severidade = 'baixa' | 'media' | 'alta';

export interface SnapshotEvent {
  schema: 'evento/v1';
  tipo: EventoTipo;
  carteira: string;
  ativo?: string;
  valorAnterior: number;
  valorAtual: number;
  delta: number; // valorAtual - valorAnterior
  deltaPct: number | null; // null quando valorAnterior === 0
  /** Fração de referência do evento, usada para classificar a severidade.
   *  Base por tipo, porque "material" não quer dizer a mesma coisa em todos:
   *  - NEW_POSITION: |delta| / plTotal ATUAL (a posição existe hoje)
   *  - REVENUE_DROP: |delta| / receita ANTERIOR (queda de receita se mede em
   *    receita; com o PL no denominador a severidade era sempre "baixa")
   *  - todos os demais: |delta| / plTotal base
   *  null quando a base é 0. */
  materialidade: number | null;
  severidade: Severidade;
  evidencias: Record<string, number | string | boolean>;
}

export interface EventsFile {
  data: string;
  periodo: 'diario' | 'mensal';
  baseData: string | null; // data do snapshot base usado no diff; null = linha de base
  geradoEm: string;
  engine: { nome: 'atlas-audit-engine'; versao: string };
  eventos: SnapshotEvent[];
  /** Mesma semântica do tenantId do Snapshot: rótulo do cliente dono. */
  tenantId?: string;
}
