/**
 * src/snapshot/normalize.ts — normaliza RawSnapshot em Snapshot canônico.
 *
 * - aplica o name-map da instância quando disponível (o MAPEAMENTO vive na
 *   instância: name-map.local.json sobre name-map.json; o código é neutro);
 * - normaliza identificadores (trim, espaços colapsados, NFC) para estabilidade
 *   entre dias;
 * - plTotal é SEMPRE a soma das posições (fonte única de verdade);
 * - valor não-finito = erro explícito.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CASH_CLASSES } from './thresholds.js';
import type {
  AtributosAtivo,
  ClasseCanonica,
  Indexador,
  Moeda,
  RawSnapshot,
  Regiao,
  Snapshot,
  SnapshotCarteira,
  SnapshotPosition,
} from './types.js';

export function isLiquidez(classe: string | null): boolean {
  if (!classe) return false;
  const norm = classe.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return CASH_CLASSES.includes(norm);
}

/** trim + colapsa espaços múltiplos + NFC (estável entre dias). */
export function normalizarIdentificador(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** name-map: name-map.local.json (instância) sobre name-map.json (produto, vazio). */
export function loadNameMapping(root: string): Record<string, string> {
  for (const rel of ['name-map.local.json', 'name-map.json']) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
        mappings?: Record<string, string>;
      };
      if (raw && typeof raw === 'object' && raw.mappings && typeof raw.mappings === 'object') {
        return raw.mappings;
      }
    } catch {
      // mapa ilegível: segue sem renome; o diff acusará divergência se precisar
    }
  }
  return {};
}

/** class-map: class-map.local.json (instância) sobre class-map.json (produto, vazio).
   Arquivos diários de custódia não trazem a classe do ativo (o book mensal
   traz, o arquivo posicional não). O mapa da instância classifica por ativo,
   mesmo papel do name-map para nomes. Sem ele, eventos por classe
   (liquidez, alocação) viram ruído no diário. */
export function loadClassMapping(root: string): Record<string, string> {
  for (const rel of ['class-map.local.json', 'class-map.json']) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
        mappings?: Record<string, string>;
      };
      if (raw && typeof raw === 'object' && raw.mappings && typeof raw.mappings === 'object') {
        return raw.mappings;
      }
    } catch {
      // mapa ilegível: segue sem classe; eventos por classe degradam, não param
    }
  }
  return {};
}

/** taxa-map: taxa-map.local.json (instância) sobre taxa-map.json (produto, vazio).
   Fonte da receita da casa (Fase 5): chave = nome canônico da carteira
   (pós name-map), valor = taxa ANUAL (ex. 0.0048). O normalize deriva a
   receita mensal (PL x taxa / 12) só no período mensal. Valores que não
   sejam números finitos são ignorados; mapa ilegível vira vazio. */
export function loadTaxaMapping(root: string): Record<string, number> {
  for (const rel of ['taxa-map.local.json', 'taxa-map.json']) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
        mappings?: Record<string, number>;
      };
      if (raw && typeof raw === 'object' && raw.mappings && typeof raw.mappings === 'object') {
        const limpos: Record<string, number> = {};
        for (const [k, v] of Object.entries(raw.mappings)) {
          if (typeof v === 'number' && Number.isFinite(v) && v >= 0) limpos[k] = v;
        }
        return limpos;
      }
    } catch {
      // mapa ilegível: segue sem taxa; a receita fica ausente e o diff ignora
    }
  }
  return {};
}

/* ════════════════════════════════════════════════════════════════════════════
   Camada de atributos (Fase 0 da inteligência, 2026-08-24)

   O arquivo do custodiante não traz indexador, emissor, moeda, região nem
   prazo de resgate. Sem esses campos, exposição a juros/inflação/câmbio,
   cruzamento de evento de crédito por emissor e sensibilidade a cenário não
   têm de onde sair, e qualquer número produzido seria inventado.

   Fonte, em ordem de precedência:
     1. ativo-map da instância (autoridade);
     2. derivação gratuita do que já está no snapshot (prazo do vencimento,
        emissor da instituicao, classe canônica de rótulos inequívocos);
     3. null.

   Nunca zero, nunca default. Ver intel/coverage.ts para o consumo.
   ══════════════════════════════════════════════════════════════════════════ */

export const ATRIBUTOS_VAZIOS: AtributosAtivo = Object.freeze({
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
});

/** Atributos de uma posição lida do disco: ausente (arquivo antigo) = tudo null. */
export function atributosDe(p: SnapshotPosition): AtributosAtivo {
  return p.atributos ?? ATRIBUTOS_VAZIOS;
}

const CLASSES_CANONICAS: ReadonlySet<string> = new Set<ClasseCanonica>([
  'liquidez',
  'renda-fixa',
  'credito-privado',
  'fundo',
  'acoes',
  'multimercado',
  'imobiliario',
  'internacional',
  'previdencia',
  'derivativos',
  'outros',
]);

const INDEXADORES: ReadonlySet<string> = new Set<Indexador>([
  'CDI',
  'SELIC',
  'IPCA',
  'IGPM',
  'PRE',
  'CAMBIO',
  'BOLSA',
  'MULTI',
]);

const MOEDAS: ReadonlySet<string> = new Set<Moeda>(['BRL', 'USD', 'EUR', 'GBP', 'CHF', 'JPY']);

const REGIOES: ReadonlySet<string> = new Set<Regiao>(['brasil', 'eua', 'global']);

/** minúscula sem acento, para casar rótulo de fonte com enum. */
function chaveNormalizada(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Classe canônica a partir do rótulo livre da fonte.
 *
 * DELIBERADAMENTE CONSERVADOR: só rótulo inequívoco vira classe. Qualquer
 * coisa fora desta lista fica null e aparece como buraco no relatório de
 * cobertura, que é o mecanismo de correção (o ativo-map da instância).
 * Adivinhar aqui produziria cobertura de 100% com classificação errada, que é
 * pior do que buraco declarado.
 */
export function classeCanonicaDe(classe: string | null): ClasseCanonica | null {
  if (!classe) return null;
  const k = chaveNormalizada(classe);
  if (!k) return null;
  if (CASH_CLASSES.includes(k)) return 'liquidez';
  if (['renda fixa', 'renda-fixa', 'rf', 'tesouro', 'titulo publico', 'titulos publicos'].includes(k))
    return 'renda-fixa';
  if (
    ['credito privado', 'credito-privado', 'debenture', 'debentures', 'cdb', 'lci', 'lca', 'cri', 'cra', 'letra financeira'].includes(k)
  )
    return 'credito-privado';
  if (['fundo', 'fundos', 'fic', 'fi'].includes(k)) return 'fundo';
  if (['acoes', 'acao', 'equity', 'renda variavel', 'renda-variavel', 'rv'].includes(k)) return 'acoes';
  if (['multimercado', 'multimercados'].includes(k)) return 'multimercado';
  if (['imobiliario', 'fii', 'fiis', 'fundo imobiliario', 'fundos imobiliarios'].includes(k))
    return 'imobiliario';
  if (['internacional', 'offshore', 'exterior', 'global'].includes(k)) return 'internacional';
  if (['previdencia', 'pgbl', 'vgbl'].includes(k)) return 'previdencia';
  if (['derivativo', 'derivativos', 'opcao', 'opcoes', 'futuro', 'futuros'].includes(k))
    return 'derivativos';
  return null;
}

/**
 * Chave estável de emissor a partir do nome. Raiz de CNPJ quando o nome carrega
 * um (14 ou 8 dígitos), senão slug do nome normalizado. É a chave que o
 * adapter de crédito vai usar para casar evento com carteira, então precisa ser
 * a MESMA para "BANCO X S.A." e "Banco  X SA".
 */
export function emissorIdDe(nome: string | null): string | null {
  if (!nome) return null;
  const digitos = nome.replace(/\D/g, '');
  if (digitos.length === 14) return 'cnpj:' + digitos.slice(0, 8);
  if (digitos.length === 8) return 'cnpj:' + digitos;
  const slug = chaveNormalizada(nome)
    .replace(/\b(s\.?\/?a\.?|ltda\.?|sa|me|epp|eireli)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
}

/** Anos corridos entre duas datas AAAA-MM-DD. Negativo = já venceu. */
function anosEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  const dias = (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000;
  return Math.round((dias / 365.25) * 10_000) / 10_000;
}

/** Entrada crua do ativo-map: campos desconhecidos e valores inválidos caem fora. */
export type AtributosParciais = Partial<AtributosAtivo>;

/**
 * ativo-map: ativo-map.local.json (instância) sobre ativo-map.json (produto,
 * vazio). Mesmo padrão de name-map/class-map/taxa-map, com um degrau a mais de
 * saneamento porque o valor aqui é objeto, não string.
 *
 * Chave = nome canônico do ativo (pós name-map). Valor fora do enum é
 * IGNORADO em silêncio, e o atributo fica null: um indexador escrito errado
 * viraria fator fantasma agrupando sozinho, e o relatório de cobertura já
 * denuncia o buraco.
 */
export function loadAtivoMapping(root: string): Record<string, AtributosParciais> {
  for (const rel of ['ativo-map.local.json', 'ativo-map.json']) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
        mappings?: Record<string, unknown>;
      };
      if (!raw || typeof raw !== 'object' || !raw.mappings || typeof raw.mappings !== 'object') {
        return {};
      }
      const limpos: Record<string, AtributosParciais> = {};
      for (const [ativo, valor] of Object.entries(raw.mappings)) {
        const sane = sanearAtributos(valor);
        if (sane) limpos[normalizarIdentificador(ativo)] = sane;
      }
      return limpos;
    } catch {
      // mapa ilegível: segue sem atributo; a cobertura cai e a tela avisa
    }
  }
  return {};
}

function sanearAtributos(valor: unknown): AtributosParciais | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const v = valor as Record<string, unknown>;
  const out: AtributosParciais = {};

  if (typeof v.classeCanonica === 'string' && CLASSES_CANONICAS.has(v.classeCanonica)) {
    out.classeCanonica = v.classeCanonica as ClasseCanonica;
  }
  if (typeof v.indexador === 'string' && INDEXADORES.has(v.indexador)) {
    out.indexador = v.indexador as Indexador;
  }
  if (typeof v.taxaContratada === 'string' && v.taxaContratada.trim()) {
    out.taxaContratada = v.taxaContratada.trim();
  }
  if (typeof v.emissorNome === 'string' && v.emissorNome.trim()) {
    out.emissorNome = normalizarIdentificador(v.emissorNome);
  }
  if (typeof v.emissorId === 'string' && v.emissorId.trim()) {
    out.emissorId = v.emissorId.trim();
  } else if (out.emissorNome) {
    out.emissorId = emissorIdDe(out.emissorNome);
  }
  // Grupo economico: aceito como veio, NUNCA derivado do emissor nem do nome
  // do ativo. Quem sabe que duas razoes sociais sao o mesmo risco e uma
  // pessoa, e adivinhar aqui ligaria evento de credito a carteira alheia.
  if (typeof v.economicGroupId === 'string' && v.economicGroupId.trim()) {
    out.economicGroupId = v.economicGroupId.trim();
  }
  if (typeof v.moeda === 'string' && MOEDAS.has(v.moeda)) out.moeda = v.moeda as Moeda;
  if (typeof v.regiao === 'string' && REGIOES.has(v.regiao)) out.regiao = v.regiao as Regiao;
  if (typeof v.prazoAnos === 'number' && Number.isFinite(v.prazoAnos)) {
    out.prazoAnos = v.prazoAnos;
  }
  if (typeof v.liquidezDias === 'number' && Number.isFinite(v.liquidezDias) && v.liquidezDias >= 0) {
    out.liquidezDias = Math.round(v.liquidezDias);
  }
  if (typeof v.cobertoFGC === 'boolean') out.cobertoFGC = v.cobertoFGC;

  return Object.keys(out).length ? out : null;
}

/**
 * Resolve os atributos de uma posição. Mapa manda; derivação preenche o que o
 * mapa não disse; o resto fica null.
 */
export function resolverAtributos(opts: {
  ativo: string;
  classe: string | null;
  vencimento: string | null;
  instituicao: string | null;
  dataSnapshot: string;
  mapa: Record<string, AtributosParciais>;
}): AtributosAtivo {
  const doMapa = opts.mapa[opts.ativo] ?? {};

  /* EMISSOR SÓ VEM DO MAPA. Não derivar de `instituicao`.
   *
   * A tentação é óbvia: o campo existe e está preenchido. Mas `instituicao` é
   * a coluna 1 do book (parsers/excel-v2.ts), que nas fontes que temos é o
   * CUSTODIANTE, não o emissor. Derivar dali foi testado contra os fixtures
   * sintéticos em 2026-08-24 e produziu, em toda carteira, "100% do patrimônio
   * depende de um único emissor (CUSTODIANTE SINTETICO)". Alerta crítico
   * falso, com cobertura reportada em 100%, que é exatamente o modo de falha
   * que esta camada existe para impedir.
   *
   * Pior ainda olhando para a frente: o adapter de crédito casa evento a
   * emissor. Casar com o custodiante ligaria um evento do Banco X a toda
   * carteira custodiada no Banco X, o que é pior do que não casar nada.
   *
   * Consequência aceita: sem ativo-map, a cobertura de emissor é 0% e o motor
   * cala sobre emissor. É a verdade, e o relatório de cobertura transforma isso
   * na fila de trabalho de quem preenche o mapa.
   */
  const emissorNome = doMapa.emissorNome ? normalizarIdentificador(doMapa.emissorNome) : null;
  const emissorId = doMapa.emissorId ?? emissorIdDe(emissorNome);

  // prazoAnos derivado exige vencimento E data do snapshot. Determinístico:
  // sem Date.now, a mesma dupla sempre dá o mesmo número.
  const prazoDerivado =
    opts.vencimento && /^\d{4}-\d{2}-\d{2}$/.test(opts.dataSnapshot)
      ? anosEntre(opts.dataSnapshot, opts.vencimento)
      : null;

  return {
    classeCanonica: doMapa.classeCanonica ?? classeCanonicaDe(opts.classe),
    indexador: doMapa.indexador ?? null,
    taxaContratada: doMapa.taxaContratada ?? null,
    emissorId,
    emissorNome,
    economicGroupId: doMapa.economicGroupId ?? null,
    moeda: doMapa.moeda ?? null,
    regiao: doMapa.regiao ?? null,
    prazoAnos: doMapa.prazoAnos ?? prazoDerivado,
    liquidezDias: doMapa.liquidezDias ?? null,
    cobertoFGC: doMapa.cobertoFGC ?? null,
  };
}

export function normalize(
  raw: RawSnapshot,
  periodo: 'diario' | 'mensal',
  mapping?: Record<string, string>,
  classMapping?: Record<string, string>,
  taxaMapping?: Record<string, number>,
  ativoMapping?: Record<string, AtributosParciais>
): Snapshot {
  const mapa = mapping ?? {};
  const mapaClasse = classMapping ?? {};
  const mapaTaxa = taxaMapping ?? {};
  const mapaAtivo = ativoMapping ?? {};

  const carteiras: SnapshotCarteira[] = raw.carteiras.map((rawC) => {
    const nome = normalizarIdentificador(mapa[rawC.nome] ?? rawC.nome);
    if (!nome) throw new Error(`Snapshot: carteira com nome vazio após normalização.`);

    // Mesmo ativo em mais de um custodiante (ex.: NTN-B parte no BTG, parte
    // no XPM) vem como duas linhas no book, e o próprio book consolida
    // somando. Rejeitar derrubaria o snapshot inteiro de um dado real comum.
    // Política: soma valor (e quantidade quando numérica), mantém a primeira
    // classe/vencimento. A ordem do mapa = primeira ocorrência, determinística.
    const porAtivo = new Map<string, SnapshotPosition>();
    for (const rawP of rawC.posicoes) {
      if (!Number.isFinite(rawP.valor)) {
        throw new Error(`Snapshot: valor nao finito na carteira "${nome}", ativo "${rawP.ativo}".`);
      }
      const ativo = normalizarIdentificador(mapa[rawP.ativo] ?? rawP.ativo);
      if (rawP.vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(rawP.vencimento)) {
        throw new Error(
          `Snapshot: vencimento malformado "${rawP.vencimento}" (carteira "${nome}", ativo "${ativo}"). Use AAAA-MM-DD.`
        );
      }
      const existente = porAtivo.get(ativo);
      if (existente) {
        existente.valor += rawP.valor;
        if (rawP.quantidade != null) {
          existente.quantidade = (existente.quantidade ?? 0) + rawP.quantidade;
        }
      } else {
        const classe = rawP.classe
          ? normalizarIdentificador(rawP.classe)
          : mapaClasse[ativo]
            ? normalizarIdentificador(mapaClasse[ativo])
            : null;
        const vencimento = rawP.vencimento || null;
        const instituicao = rawP.instituicao ? normalizarIdentificador(rawP.instituicao) : null;
        porAtivo.set(ativo, {
          carteira: nome,
          ativo,
          classe,
          valor: rawP.valor,
          vencimento,
          quantidade: rawP.quantidade ?? null,
          instituicao,
          // Primeira ocorrência manda, igual a classe e vencimento: o mesmo
          // ativo em dois custodiantes é uma linha só depois da soma, e os
          // atributos vêm do nome do ativo, que é idêntico nas duas.
          atributos: resolverAtributos({
            ativo,
            classe,
            vencimento,
            instituicao,
            dataSnapshot: raw.data,
            mapa: mapaAtivo,
          }),
        });
      }
    }
    const posicoes = [...porAtivo.values()];

    const plTotal = posicoes.reduce((acc, p) => acc + p.valor, 0);

    // Receita da casa (Fase 5): conceito mensal. No diário o campo fica
    // ausente de propósito, o diff de receita ignora. Fonte: raw.receita
    // (adaptador futuro) com prioridade; senão taxa-map × PL / 12.
    let receita: number | undefined;
    if (periodo === 'mensal') {
      if (rawC.receita !== undefined && Number.isFinite(rawC.receita)) {
        receita = rawC.receita;
      } else if (typeof mapaTaxa[nome] === 'number') {
        receita = Math.round((plTotal * (mapaTaxa[nome] / 12)) * 100) / 100;
      }
    }

    return { nome, plTotal, ...(receita !== undefined ? { receita } : {}), posicoes };
  });

  if (!carteiras.length) {
    throw new Error('Snapshot: nenhuma carteira reconhecida. Nada foi gravado.');
  }

  return {
    schema: 'snapshot/v1',
    data: raw.data,
    periodo,
    fonte: raw.fonte,
    geradoEm: new Date().toISOString(),
    engine: {
      nome: 'atlas-audit-engine',
      versao: process.env.npm_package_version ?? '0.0.0',
    },
    carteiras,
  };
}
