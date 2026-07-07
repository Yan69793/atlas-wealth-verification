import type {
  AuditData,
  AuditResult,
  CarteiraRaw,
  IngestMeta,
  PeriodoRef,
} from '../schema.js';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function mesLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MESES[m]} ${y}`;
}

function comeCotasNote(mes: string): string {
  const m = Number(mes.split('-')[1]);
  if (m === 5 || m === 11) {
    return `Come-cotas se aplica em ${MESES[m].toLowerCase()} — verificar impostos pagos em fundos.`;
  }
  return `Come-cotas nao se aplica em ${MESES[m]?.toLowerCase() ?? mes}, ocorre apenas em maio e novembro.`;
}

function achadosResumo(result: AuditResult): string {
  const n = result.erros.length + result.alertas.length;
  if (n === 0) return 'Sem ressalvas';
  if (result.erros.length > 0) return `${result.erros.length} erro(s)`;
  return `${result.alertas.length} alerta(s)`;
}

function joinFindings(items: string[]): string {
  return items.length > 0 ? items.join(' | ') : '-';
}

function achadosText(result: AuditResult): string {
  const parts: string[] = [];
  for (const e of result.erros) parts.push(`ERRO, ${e}`);
  for (const a of result.alertas) parts.push(`ALERTA, ${a}`);
  for (const l of result.limitacoes) parts.push(`LIMITACAO, ${l}`);
  if (parts.length === 0) return 'Sem ressalvas, conciliacao dentro da tolerancia.';
  return parts.join(' | ');
}

export function toDashboard(
  carteiras: CarteiraRaw[],
  results: AuditResult[],
  periodo: PeriodoRef,
  meta: IngestMeta,
): AuditData {
  const resultMap = new Map(results.map((r) => [r.nome, r]));

  const totals = { total: results.length, liberar: 0, alerta: 0, corrigir: 0 };
  for (const r of results) {
    if (r.status === 'LIBERAR') totals.liberar++;
    else if (r.status === 'LIBERAR COM ALERTA') totals.alerta++;
    else totals.corrigir++;
  }

  const dashboardCarteiras = carteiras.map((c) => {
    const r = resultMap.get(c.nome)!;
    return {
      nome: c.nome,
      status: r.status,
      plBase: c.plBase,
      plRef: c.plRef,
      varRS: c.varRS,
      varPct: c.varPct,
      rentRef: c.rentRef,
      achados: achadosResumo(r),
      score: r.score,
    };
  });

  const conciliacao = carteiras.map((c) => {
    const r = resultMap.get(c.nome)!;
    return {
      nome: c.nome,
      status: r.status,
      plBase: c.plBase,
      plRef: c.plRef,
      varPct: c.varPct,
      continuidade: c.continuidade,
      somaVsTotal: c.somaVsTotal,
      perfImplicita: c.perfImplicita,
      rentReportada: c.rentRef,
      nAtivosBase: c.nAtivosBase,
      nAtivosRef: c.nAtivosRef,
    };
  });

  const achados = results.map((r) => ({
    nome: r.nome,
    status: r.status,
    erros: joinFindings(r.erros),
    alertas: joinFindings(r.alertas),
    limitacoes: joinFindings(r.limitacoes),
  }));

  const details: AuditData['details'] = {};
  for (const c of carteiras) {
    const r = resultMap.get(c.nome)!;
    details[c.nome] = {
      nome: c.nome,
      status: `Status, ${r.status}`,
      periodo: `Extrato ${periodo.baselineLabel} → ${periodo.referenciaLabel}`,
      plBase: c.plBase,
      plRef: c.plRef,
      varRS: c.varRS,
      varPct: c.varPct,
      rentRef: c.rentRef,
      continuidade: c.continuidade,
      somaVsTotal: c.somaVsTotal,
      perfImplicita: c.perfImplicita,
      eventos: c.eventos,
      impostos: c.impostos,
      achadosText: achadosText(r),
      total: c.total,
      ativos: c.ativos,
      score: r.score,
    };
  }

  return {
    summary: {
      title: 'VERIFICAÇÃO MENSAL DE CARTEIRAS',
      subtitle1: `${mesLabel(periodo.referencia)} verificado contra ${mesLabel(periodo.baseline)} como baseline. Tolerância de conciliação 0,3% do Patrimônio Líquido.`,
      subtitle2: comeCotasNote(periodo.referencia),
      periodo,
      totals,
    },
    carteiras: dashboardCarteiras,
    conciliacao,
    achados,
    details,
    meta,
  };
}