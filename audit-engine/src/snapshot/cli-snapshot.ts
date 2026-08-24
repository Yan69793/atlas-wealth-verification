#!/usr/bin/env node
/**
 * src/snapshot/cli-snapshot.ts — CLI do snapshot EOD diário (Fase 1).
 *
 * Comandos: ingest <fonte> [<arquivo>] / diff / state / vencimentos — todos
 * com --data. Root: --root > ATLAS_DATA_ROOT; sem nenhum, ERRO (nunca
 * escrever na árvore do produto). Não chama cli.ts (fluxo mensal intocado).
 */

import fs from 'node:fs';
import path from 'node:path';
import { helpTexto, parseArgs, protegerRoot, tipoPeriodo, validarData } from './args.js';
import { THRESHOLDS } from './thresholds.js';
import { diffSnapshots, encontrarPeriodoAnterior, salvarEventsFile } from './diff.js';
import { coberturaDaCasa, coberturaPorCarteira } from '../intel/coverage.js';
import {
  impactoDeCredito,
  type CreditoFile,
  type EventoCreditoEntrada,
} from '../intel/credit-events.js';
import { radarCruzado, type RadarFile } from '../intel/cross-portfolio.js';
import { caixaParado, inicioDaJanela, type CaixaParadoFile } from '../intel/idle-cash.js';
import { vencimentosProximos, type VencimentosFile } from '../intel/maturities.js';
import { adicionarDias } from '../opportunities/generator.js';
import { ingestSnapshot } from './ingest.js';
import { classeCanonicaDe } from './normalize.js';
import { tenantDe } from './pipeline.js';
import { listarDatasDiarias, listarSnapshotsDiarios } from './series.js';
import { carregarSnapshot } from './state.js';
import type { FormatoEntrada, Snapshot } from './types.js';

const FORMATOS = new Set<FormatoEntrada>(['xlsx', 'csv', 'pdf', 'html', 'api-json', 'txt-b3']);

function resolverRoot(args: Record<string, string | boolean>): string {
  const flag = typeof args.root === 'string' ? args.root : null;
  const env = process.env.ATLAS_DATA_ROOT;
  let root: string | null = null;
  if (flag) root = path.resolve(flag);
  else if (env) root = path.resolve(env);
  else throw new Error('Falta --root (ou ATLAS_DATA_ROOT). Nunca escrever na arvore do produto.');
  protegerRoot(root);
  return root;
}

function exigirData(args: Record<string, string | boolean>): string {
  const data = typeof args.data === 'string' ? args.data : null;
  if (!data) throw new Error('Falta --data AAAA-MM-DD.');
  validarData(data);
  return data;
}

async function main(): Promise<void> {
  const { args, positional } = parseArgs(process.argv.slice(2));
  const comando = positional[0];

  if (!comando) {
    console.log(helpTexto());
    process.exit(1);
  }

  if (comando === 'ingest') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const fonte = positional[1];
    if (!fonte) throw new Error('Falta <fonte> (rotulo logico da fonte).');
    const arquivo =
      (positional[2] as string | undefined) ??
      (typeof args.arquivo === 'string' ? args.arquivo : null);
    if (!arquivo) throw new Error('Falta o caminho do arquivo (posicional ou --arquivo).');

    const formatoArg = typeof args.formato === 'string' ? args.formato : null;
    if (formatoArg && !FORMATOS.has(formatoArg as FormatoEntrada)) {
      throw new Error(`Formato desconhecido: ${formatoArg}. Use xlsx|csv|pdf|html|api-json|txt-b3.`);
    }

    await ingestSnapshot({
      arquivo: path.resolve(arquivo),
      data,
      fonte,
      formato: formatoArg as FormatoEntrada | undefined,
      root,
      force: Boolean(args.force),
      tenantId: typeof args.tenant === 'string' ? args.tenant : undefined,
    });
    return;
  }

  if (comando === 'diff') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const atual = carregarSnapshot(root, data);
    const anterior = encontrarPeriodoAnterior(root, data);
    const diff = diffSnapshots(atual, anterior?.snapshot ?? null);
    const p = salvarEventsFile(root, data, diff, tenantDe(atual));
    console.log(
      `[diff] ${data} vs ${diff.baseData ?? '(linha de base)'}: ${diff.eventos.length} evento(s) → ${p}`
    );
    return;
  }

  if (comando === 'state') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const snap = carregarSnapshot(root, data);
    console.log(JSON.stringify(snap, null, 2));
    return;
  }

  if (comando === 'vencimentos') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const snap = carregarSnapshot(root, data);
    // datasSnapshot é só nome de diretório, sem parse: com ela o id da
    // oportunidade cai no dia REAL do cruzamento da janela, não no teórico,
    // que erra em fim de semana e feriado.
    const vencimentos = vencimentosProximos(snap, { datasSnapshot: listarDatasDiarias(root, data) });
    const arquivo = path.join(root, 'audits', data, 'vencimentos.json');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const saida: VencimentosFile = {
      schema: 'vencimentos/v1',
      data,
      periodo: tipoPeriodo(data) ?? 'diario',
      geradoEm: new Date().toISOString(),
      engine: {
        nome: 'atlas-audit-engine',
        versao: process.env.npm_package_version ?? '0.0.0',
      },
      vencimentos,
    };
    fs.writeFileSync(arquivo, JSON.stringify(saida, null, 2), 'utf8');
    console.log(`[vencimentos] ${data}: ${vencimentos.length} vencimento(s) → ${arquivo}`);
    return;
  }

  if (comando === 'caixa-parado') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    // data sem snapshot = erro, mesma regra de state/diff/vencimentos
    carregarSnapshot(root, data);
    const periodo = tipoPeriodo(data) ?? 'diario';
    const motivo = periodo !== 'diario' ? 'periodo-mensal' : null;
    // Só varre a série quando o período permite: no mensal o resultado seria
    // descartado (caixa parado é conceito de dia).
    let serie: Snapshot[] = [];
    let motivoFinal: 'serie-curta' | 'periodo-mensal' | null = motivo;
    if (motivo === null) {
      // Só a janela importa, então só a janela é lida do disco. Dia anterior a
      // ela nem chega a ser aberto: o corte é pelo nome do diretório.
      serie = listarSnapshotsDiarios(root, data, { desde: inicioDaJanela(data) });
      if (serie.length < 2) motivoFinal = 'serie-curta';
    }
    const itens = motivoFinal === null ? caixaParado(serie) : [];
    const arquivo = path.join(root, 'audits', data, 'caixa-parado.json');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const saida: CaixaParadoFile = {
      schema: 'caixa-parado/v1',
      data,
      periodo,
      geradoEm: new Date().toISOString(),
      engine: {
        nome: 'atlas-audit-engine',
        versao: process.env.npm_package_version ?? '0.0.0',
      },
      janelaDias: THRESHOLDS.caixaParadoJanelaDias,
      limiares: { caixaParadoMinPct: THRESHOLDS.caixaParadoMinPct, caixaParadoMinDias: THRESHOLDS.caixaParadoMinDias },
      motivo: motivoFinal,
      itens,
    };
    fs.writeFileSync(arquivo, JSON.stringify(saida, null, 2), 'utf8');
    console.log(
      `[caixa-parado] ${data}: ${itens.length} carteira(s) parada(s)` +
        (motivoFinal ? ` (motivo: ${motivoFinal})` : '') +
        ` → ${arquivo}`
    );
    return;
  }

  if (comando === 'cobertura') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const snap = carregarSnapshot(root, data);
    const casa = coberturaDaCasa(snap);
    const porCarteira = coberturaPorCarteira(snap);
    console.log(`[cobertura] ${data} — casa: ${casa.carteiras} carteira(s), faixa ${casa.faixaGlobal}`);
    for (const a of casa.atributos) {
      console.log(`  ${a.atributo.padEnd(16)} ${(a.fracao * 100).toFixed(1).padStart(6)}%  ${a.faixa}`);
    }
    // Pior primeiro: é a fila de trabalho de quem preenche o ativo-map.
    console.log('  --- carteiras (pior cobertura primeiro) ---');
    for (const c of porCarteira) {
      console.log(
        `  ${c.carteira.padEnd(20)} ${(c.fracaoMedia * 100).toFixed(1).padStart(6)}%  ${c.faixaGlobal}  (${c.posicoes} posicao/oes)`
      );
    }
    return;
  }

  if (comando === 'radar') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    // data sem snapshot = erro, mesma regra de state/diff/vencimentos
    carregarSnapshot(root, data);
    const periodo = tipoPeriodo(data) ?? 'diario';
    // A série só serve para a deterioração. No mensal cada snapshot já é um
    // mês, então a série mensal não é enumerável por listarSnapshotsDiarios e
    // o radar roda sobre o dia único, sem base de comparação.
    const serie =
      periodo === 'diario'
        ? listarSnapshotsDiarios(root, data, {
            desde: adicionarDias(data, -(THRESHOLDS.radarDeterioracaoJanelaDias * 2)),
          })
        : [carregarSnapshot(root, data)];
    const resultado = radarCruzado(serie);
    const arquivo = path.join(root, 'audits', data, 'radar.json');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const saida: RadarFile = {
      schema: 'radar/v1',
      data,
      periodo,
      tenantId: tenantDe(serie[serie.length - 1]),
      geradoEm: new Date().toISOString(),
      engine: {
        nome: 'atlas-audit-engine',
        versao: process.env.npm_package_version ?? '0.0.0',
      },
      limiares: {
        coberturaAfirmaMin: THRESHOLDS.coberturaAfirmaMin,
        coberturaRessalvaMin: THRESHOLDS.coberturaRessalvaMin,
        radarConcentracaoAtivoPct: THRESHOLDS.radarConcentracaoAtivoPct,
        radarConcentracaoEmissorPct: THRESHOLDS.radarConcentracaoEmissorPct,
        radarConcentracaoFatorPct: THRESHOLDS.radarConcentracaoFatorPct,
        radarLiquidezMinPct: THRESHOLDS.radarLiquidezMinPct,
        radarVencimentoConcentradoPct: THRESHOLDS.radarVencimentoConcentradoPct,
        radarVencimentoJanelaDias: THRESHOLDS.radarVencimentoJanelaDias,
        radarDeterioracaoPct: THRESHOLDS.radarDeterioracaoPct,
        radarDeterioracaoJanelaDias: THRESHOLDS.radarDeterioracaoJanelaDias,
      },
      motivo: resultado.baseData === null ? 'serie-curta' : null,
      ...resultado,
    };
    fs.writeFileSync(arquivo, JSON.stringify(saida, null, 2), 'utf8');
    console.log(
      `[radar] ${data}: ${resultado.insights.length} insight(s) em ${resultado.carteiras.length} carteira(s)` +
        `, cobertura da casa ${(coberturaMedia(resultado) * 100).toFixed(1)}% (${resultado.coberturaCasa.faixaGlobal})` +
        (resultado.baseData ? `, base ${resultado.baseData}` : ', sem base de comparacao') +
        ` → ${arquivo}`
    );
    return;
  }

  if (comando === 'ativo-map') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const snap = carregarSnapshot(root, data);
    const saida = path.join(root, typeof args.saida === 'string' ? args.saida : 'ativo-map.local.json');

    // Todo ativo distinto, com quanto ele vale na casa: quem preenche começa
    // pelos que movem o número, não pela ordem alfabética.
    const porAtivo = new Map<string, { valor: number; classe: string | null; carteiras: Set<string> }>();
    let plCasa = 0;
    for (const c of snap.carteiras) {
      plCasa += c.plTotal;
      for (const p of c.posicoes) {
        const e = porAtivo.get(p.ativo) ?? { valor: 0, classe: p.classe, carteiras: new Set<string>() };
        e.valor += p.valor;
        if (!e.classe && p.classe) e.classe = p.classe;
        e.carteiras.add(c.nome);
        porAtivo.set(p.ativo, e);
      }
    }

    // Lê o mapa CRU, não o saneado: preservar trabalho humano exige manter até
    // o que o motor ignora. Perder uma tarde de preenchimento de alguém porque
    // o gerador rodou de novo é o defeito que este bloco existe para impedir.
    const existente = lerMappings<Record<string, unknown>>(saida, 'ativo-map');

    const CAMPOS = [
      'classeCanonica', 'indexador', 'taxaContratada', 'emissorNome', 'emissorId',
      'economicGroupId', 'moeda', 'regiao', 'prazoAnos', 'liquidezDias', 'cobertoFGC',
    ] as const;

    const ordenados = [...porAtivo.entries()].sort(
      (a, b) => b[1].valor - a[1].valor || a[0].localeCompare(b[0])
    );

    const mappings: Record<string, Record<string, unknown>> = {};
    let novos = 0;
    let voltaram = 0;
    let preenchidos = 0;
    let plDescoberto = 0;

    for (const [ativo, info] of ordenados) {
      const anterior = existente[ativo] ?? null;
      if (!anterior) novos++;
      const entrada: Record<string, unknown> = {
        _nota:
          `${(info.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}` +
          ` · ${plCasa > 0 ? ((info.valor / plCasa) * 100).toFixed(2) : '0.00'}% do PL da casa` +
          ` · ${info.carteiras.size} carteira(s)` +
          (info.classe ? ` · fonte diz "${info.classe}"` : ''),
      };
      for (const campo of CAMPOS) {
        // Valor humano existente SEMPRE ganha, inclusive false e 0.
        if (anterior && anterior[campo] !== undefined && anterior[campo] !== null) {
          entrada[campo] = anterior[campo];
          continue;
        }
        // Unica pre-inferencia permitida: classe canonica a partir do rotulo
        // livre, e so quando ele e inequivoco. Emissor NUNCA e adivinhado:
        // emissor errado liga evento de credito a carteira alheia.
        entrada[campo] = campo === 'classeCanonica' ? classeCanonicaDe(info.classe) : null;
      }
      // Chave que o motor nao conhece (comentario do operador) tambem fica.
      // `_ausenteDesde` NAO: este laco so roda para ativo que ESTA na base
      // agora, entao a marca de ausencia mentiria para quem le o arquivo. Ate
      // 24/08/2026 ela era copiada junto e ficava para sempre, mesmo com o
      // papel de volta ha meses.
      if (anterior) {
        if (anterior._ausenteDesde !== undefined) voltaram++;
        for (const [k, v] of Object.entries(anterior)) {
          if (k !== '_nota' && k !== '_ausenteDesde' && entrada[k] === undefined) entrada[k] = v;
        }
      }
      if (entrada.emissorId || entrada.emissorNome) preenchidos++;
      else plDescoberto += info.valor;
      mappings[ativo] = entrada;
    }

    // Ativo que sumiu da base NAO e apagado: pode voltar mes que vem, e o
    // trabalho de quem preencheu vale mais que a limpeza do arquivo.
    let ausentes = 0;
    for (const [ativo, valor] of Object.entries(existente)) {
      if (mappings[ativo]) continue;
      mappings[ativo] = { ...valor, _ausenteDesde: valor._ausenteDesde ?? data };
      ausentes++;
    }

    const conteudo = {
      _leia:
        'Gerado por `snapshot ativo-map`. Regerar NUNCA apaga valor preenchido a mao. ' +
        'emissorId/emissorNome nao sao adivinhados de proposito: emissor errado liga evento ' +
        'de credito a carteira que nao tem nada a ver. economicGroupId so quando duas razoes ' +
        'sociais forem o mesmo risco. Campos _nota, _leia e _ausenteDesde sao ignorados pelo motor.',
      _geradoDe: data,
      mappings,
    };

    if (args['dry-run']) {
      console.log(`[ativo-map] dry run, nada escrito. Seriam ${Object.keys(mappings).length} entrada(s).`);
    } else {
      fs.writeFileSync(saida, JSON.stringify(conteudo, null, 2) + '\n', 'utf8');
    }
    console.log(
      `[ativo-map] ${data}: ${ordenados.length} ativo(s) distinto(s), ${novos} novo(s), ` +
        `${preenchidos} com emissor, ${ordenados.length - preenchidos} sem` +
        (voltaram ? `, ${voltaram} de volta a base` : '') +
        (ausentes ? `, ${ausentes} ausente(s) preservado(s)` : '') +
        ` → ${saida}`
    );
    if (plCasa > 0 && plDescoberto > 0) {
      console.log(
        `  falta emissor em ${((plDescoberto / plCasa) * 100).toFixed(1)}% do PL da casa. ` +
          `Sem isso o alerta de credito nao acha nada.`
      );
    }
    return;
  }

  if (comando === 'credito') {
    const data = exigirData(args);
    const root = resolverRoot(args);
    const snap = carregarSnapshot(root, data);
    const arquivoEventos = typeof args.eventos === 'string' ? args.eventos : null;
    if (!arquivoEventos) throw new Error('Falta --eventos <arquivo.json> com os eventos de credito.');

    const cru = JSON.parse(fs.readFileSync(path.resolve(arquivoEventos), 'utf8')) as unknown;
    const lista: EventoCreditoEntrada[] = Array.isArray(cru)
      ? (cru as EventoCreditoEntrada[])
      : ((cru as { eventos?: EventoCreditoEntrada[] })?.eventos ?? []);
    if (!Array.isArray(lista)) {
      throw new Error('Arquivo de eventos deve ser um array ou um objeto com a chave "eventos".');
    }

    // Estado temporal precisa do credito.json anterior. Sem ele, todo par sai
    // como 'novo', que e a verdade na estreia.
    const { anterior, baseData } = creditoAnterior(root, data);
    const resultado = impactoDeCredito(snap, lista, { anterior });

    const arquivo = path.join(root, 'audits', data, 'credito.json');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const saida: CreditoFile = {
      schema: 'credito/v1',
      data,
      periodo: tipoPeriodo(data) ?? 'diario',
      tenantId: tenantDe(snap),
      geradoEm: new Date().toISOString(),
      engine: {
        nome: 'atlas-audit-engine',
        versao: process.env.npm_package_version ?? '0.0.0',
      },
      baseData,
      limiares: {
        creditoPerdaConfirmada: THRESHOLDS.creditoPerdaConfirmada,
        creditoPerdaConfirmadaMinAbs: THRESHOLDS.creditoPerdaConfirmadaMinAbs,
        creditoPisoExposicao: THRESHOLDS.creditoPisoExposicao,
        creditoVariacaoMaterialPct: THRESHOLDS.creditoVariacaoMaterialPct,
        coberturaAfirmaMin: THRESHOLDS.coberturaAfirmaMin,
        coberturaRessalvaMin: THRESHOLDS.coberturaRessalvaMin,
        severidade: THRESHOLDS.severidade,
      },
      fonteEventos: path.basename(arquivoEventos),
      ...resultado,
    };
    fs.writeFileSync(arquivo, JSON.stringify(saida, null, 2), 'utf8');

    const atingidas = resultado.impactos.reduce((s, i) => s + i.atingidas.length, 0);
    console.log(
      `[credito] ${data}: ${resultado.impactos.length} evento(s), ${atingidas} par(es) carteira-evento, ` +
        `${resultado.encerrados.length} encerrado(s), ${resultado.descartados} descartado(s); ` +
        `${resultado.carteirasAvaliaveis}/${resultado.carteiras} carteira(s) avaliavel(is)` +
        (baseData ? `, base ${baseData}` : ', sem base (tudo novo)') +
        ` → ${arquivo}`
    );
    const naoAvaliaveis = resultado.carteiras - resultado.carteirasAvaliaveis;
    if (naoAvaliaveis > 0) {
      console.log(
        `  ATENCAO: ${naoAvaliaveis} carteira(s) sem cobertura de emissor suficiente. ` +
          `Elas nao estao limpas, estao no escuro. Rode \`ativo-map\` para preencher.`
      );
    }
    return;
  }

  console.log(helpTexto());
  process.exit(1);
}

/**
 * Lê a chave `mappings` de um mapa da instância, ou ABORTA.
 *
 * A trava óbvia (JSON ilegível) já existia. A que faltava, e é a que acontece na
 * prática, é o arquivo que PARSEIA e perdeu a estrutura: até 24/08/2026 ele caía
 * num `{}` silencioso, o comando regenerava tudo do zero, relatava "N novo(s)" e
 * saía com SUCESSO. Horas de preenchimento humano iam embora com mensagem verde.
 * Aconteceu de verdade durante a calibração da Entrega B.1, num mapa com 1.784
 * entradas e 89,4% do PL da casa já classificado.
 *
 * "Não achei o que esperava" nunca pode significar "então começo do zero" num
 * arquivo que representa trabalho humano.
 */
function lerMappings<T>(caminho: string, rotulo: string): Record<string, T> {
  if (!fs.existsSync(caminho)) return {};
  let cru: unknown;
  try {
    cru = JSON.parse(fs.readFileSync(caminho, 'utf8'));
  } catch {
    throw new Error(
      `${caminho} existe e nao e JSON valido. Nada foi escrito: corrija ou mova o arquivo antes de regerar o ${rotulo}.`
    );
  }
  const m = (cru as { mappings?: unknown } | null)?.mappings;
  if (!cru || typeof cru !== 'object' || Array.isArray(cru) || m === undefined) {
    throw new Error(
      `${caminho} existe e e JSON valido, mas nao tem a chave "mappings". Nada foi escrito: ` +
        `regerar sobre ele APAGARIA todo o preenchimento do ${rotulo}. Corrija ou mova o arquivo.`
    );
  }
  if (!m || typeof m !== 'object' || Array.isArray(m)) {
    throw new Error(
      `${caminho} tem "mappings" que nao e objeto (${Array.isArray(m) ? 'array' : typeof m}). ` +
        `Nada foi escrito: corrija ou mova o arquivo antes de regerar o ${rotulo}.`
    );
  }
  return m as Record<string, T>;
}

/**
 * credito.json mais recente ANTES da data pedida. Varre para trás pelos nomes
 * de diretório, sem abrir arquivo que não precise: mesmo cuidado do corte de
 * leitura da Fase 4.
 */
function creditoAnterior(
  root: string,
  data: string
): { anterior: { impactos: CreditoFile['impactos'] } | null; baseData: string | null } {
  const datas = listarDatasDiarias(root, data)
    .filter((d) => d < data)
    .sort((a, b) => b.localeCompare(a));
  for (const d of datas) {
    const p = path.join(root, 'audits', d, 'credito.json');
    if (!fs.existsSync(p)) continue;
    try {
      const cru = JSON.parse(fs.readFileSync(p, 'utf8')) as CreditoFile;
      if (Array.isArray(cru?.impactos)) return { anterior: { impactos: cru.impactos }, baseData: d };
    } catch {
      // arquivo ilegivel: segue para o anterior em vez de derrubar a execucao
    }
  }
  return { anterior: null, baseData: null };
}

/** Média das frações dos atributos medidos da casa. Só para a linha de log. */
function coberturaMedia(r: { coberturaCasa: { atributos: { fracao: number }[] } }): number {
  const a = r.coberturaCasa.atributos;
  return a.length ? a.reduce((s, x) => s + x.fracao, 0) / a.length : 0;
}

main().catch((err) => {
  console.error('snapshot: ' + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
