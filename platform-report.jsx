/* platform-report.jsx — DevRelatorio: relatório exportável por carteira */
(() => {
  const { useMemo } = React;

  /* AtlasData/Utils/Icons carregam antes — safe no IIFE.
     AtlasContexts é definido por platform-app.jsx (último) — só dentro do componente. */
  const { storage, navigate } = window.AtlasUtils;
  const { Icon }              = window.AtlasIcons;
  const D                     = window.AtlasData;

  /* ============================================================
     HELPERS PURO-JS (sem React, sem CSS vars)
     Usados dentro do HTML gerado — sem acesso a window.AtlasUtils
  ============================================================ */

  function escH(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function rFmtBRL(v) {
    if (v == null || isNaN(v)) return '—';
    const abs = Math.abs(v), sgn = v < 0 ? '-' : '';
    if (abs >= 1e9) return sgn + 'R$ ' + (abs / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bi';
    if (abs >= 1e6) return sgn + 'R$ ' + (abs / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mi';
    if (abs >= 1e3) return sgn + 'R$ ' + (abs / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mil';
    return sgn + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function rFmtPct(v, dec = 2) {
    if (v == null || isNaN(v)) return '—';
    return (v * 100).toFixed(dec).replace('.', ',') + '%';
  }

  function rFmtMonth(m) {
    if (!m) return '—';
    const N = { '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
                '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez' };
    const [y, mo] = m.split('-');
    return (N[mo] || mo) + '/' + y.slice(2);
  }

  /* ============================================================
     linePath — SVG puro (string), sem legenda interna
     series: [{color, dash, width, data: [{month, value}]}]
  ============================================================ */

  function linePath(series, { w = 680, h = 190, maxLabels = 7 } = {}) {
    const P = { t: 16, r: 20, b: 28, l: 52 };
    const cW = w - P.l - P.r;
    const cH = h - P.t - P.b;

    const months = series[0] && series[0].data ? series[0].data.map(d => d.month) : [];
    if (!months.length) {
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><text x="${w / 2}" y="${h / 2}" text-anchor="middle" fill="#9A9188" font-size="11" font-family="Arial,sans-serif">Sem dados</text></svg>`;
    }

    const allVals = series.flatMap(s => s.data.map(d => d.value)).filter(v => v != null && !isNaN(v));
    const rawMin = Math.min(0, ...allVals);
    const rawMax = Math.max(...allVals, rawMin + 0.001);
    const range  = Math.max(rawMax - rawMin, 0.001);

    // Nice scale ~4 ticks
    const roughStep = range / 4;
    const mag       = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const niceStep  = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= roughStep) || (10 * mag);
    const yMin      = Math.floor((rawMin - niceStep * 0.1) / niceStep) * niceStep;
    const yMax      = Math.ceil( (rawMax + niceStep * 0.1) / niceStep) * niceStep;

    const ticks = [];
    for (let t = yMin; t <= yMax + niceStep * 0.001; t += niceStep) {
      ticks.push(Math.round(t * 1e8) / 1e8);
    }

    const xP = i => P.l + (i / Math.max(1, months.length - 1)) * cW;
    const yP = v => P.t + cH - ((v - yMin) / (yMax - yMin)) * cH;

    const stride = Math.ceil(months.length / maxLabels);

    let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Retorno acumulado">`;

    // Grid Y + labels
    ticks.forEach(t => {
      const y = yP(t).toFixed(1);
      svg += `<line x1="${P.l}" y1="${y}" x2="${P.l + cW}" y2="${y}" stroke="#DDD8D0" stroke-width="0.8"/>`;
      svg += `<text x="${P.l - 5}" y="${(yP(t) + 3.5).toFixed(1)}" text-anchor="end" fill="#9A9188" font-size="10" font-family="Arial,sans-serif">${rFmtPct(t, 1)}</text>`;
    });

    // Zero line se range cruza zero
    if (yMin < 0 && yMax > 0) {
      const y0 = yP(0).toFixed(1);
      svg += `<line x1="${P.l}" y1="${y0}" x2="${P.l + cW}" y2="${y0}" stroke="#C8C0B5" stroke-width="1.2"/>`;
    }

    // X labels (stride, sempre inclui o último)
    months.forEach((m, i) => {
      if (i % stride !== 0 && i !== months.length - 1) return;
      svg += `<text x="${xP(i).toFixed(1)}" y="${(P.t + cH + 14).toFixed(1)}" text-anchor="middle" fill="#9A9188" font-size="10" font-family="Arial,sans-serif">${rFmtMonth(m)}</text>`;
    });

    // Polylines
    series.forEach(s => {
      if (!s.data || !s.data.length) return;
      const pts = s.data.map((d, i) => `${xP(i).toFixed(1)},${yP(d.value).toFixed(1)}`).join(' ');
      const da  = s.dash ? ` stroke-dasharray="${s.dash}"` : '';
      svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="${s.width || 1.8}"${da} stroke-linejoin="round" stroke-linecap="round"/>`;
    });

    svg += '</svg>';
    return svg;
  }

  /* ============================================================
     buildReportHTML — HTML autossuficiente para popup/iframe
  ============================================================ */

  function buildReportHTML(code, month) {
    const row = D.getRow(code, month);
    if (!row) {
      return `<html><body style="font-family:Arial;padding:32px;color:#1A1A1A;">Dados não encontrados: ${escH(code)} / ${escH(month)}.</body></html>`;
    }

    const cat  = D.CATALOG.find(c => c.code === code) || {};
    const comp = D.getComposition(code, month);
    const obs  = storage.getObs(code, month);
    const DEFAULT_OBS = 'Conciliação aprovada sem ressalvas.';

    const inception  = cat.inception || D.MONTHS[0];
    const histMonths = D.MONTHS.filter(m => m >= inception && m <= month);

    const firstRow = histMonths.length ? D.getRow(code, histMonths[0]) : null;
    const plBase   = firstRow && firstRow.plPrev > 0 ? firstRow.plPrev : (firstRow ? firstRow.plCurr : 1);

    // Retorno acumulado (money-weighted aprox.): (plCurr - plBase) / plBase
    const accumData = histMonths.map(m => {
      const r = D.getRow(code, m);
      return { month: m, value: r ? (r.plCurr - plBase) / plBase : 0 };
    });

    // TWR = ∏(1 + rent) − 1
    let twrAcc = 1;
    const twrData = histMonths.map(m => {
      const r = D.getRow(code, m);
      if (r) twrAcc *= (1 + (r.rent || 0));
      return { month: m, value: twrAcc - 1 };
    });
    const twrTotal = twrAcc - 1;

    // CDI acumulado
    let cdiAcc = 1;
    const cdiData = histMonths.map(m => {
      cdiAcc *= (1 + (D.CDI[m] || 0));
      return { month: m, value: cdiAcc - 1 };
    });
    const cdiTotal = cdiAcc - 1;

    const chartSVG = linePath([
      { color: '#05305F', width: 2,   data: accumData },
      { color: '#05305F', width: 1.5, dash: '5,3', data: twrData },
      { color: '#9A9188', width: 1.5, dash: '3,3', data: cdiData },
    ], { w: 680, h: 190, maxLabels: 7 });

    const concentrated = comp.filter(a => a.pct >= 0.25).slice(0, 3);
    const hasVencto    = comp.some(a => a.vencto);

    const statusSlug  = row.status === 'COM ALERTA' ? 'alerta' : (row.status || '').toLowerCase();
    const monthLabel  = rFmtMonth(month);
    const today       = new Date().toLocaleDateString('pt-BR');
    const managerName = row.manager ? row.manager.name : '';

    // Linhas da tabela de composição
    const compRows = comp.map(a => {
      const isConc = a.pct >= 0.25;
      const rBg    = isConc ? ' style="background:#FFFBEB;"' : '';
      const cMark  = isConc ? ' <span style="font-size:10px;color:#B45309;">(!) concentração</span>' : '';
      const rc     = a.retAtivo >= 0 ? '#065F46' : '#991B1B';
      return [
        `<tr${rBg}>`,
        `<td>${escH(a.name)}${cMark}</td>`,
        `<td>${escH(a.cls)}</td>`,
        `<td style="color:#9A9188;">${escH(a.institution || '—')}</td>`,
        hasVencto ? `<td class="num">${escH(a.vencto || '—')}</td>` : '',
        `<td class="num">${rFmtBRL(a.saldoFinal)}</td>`,
        `<td class="num">${rFmtPct(a.pct)}</td>`,
        `<td class="num" style="color:${rc};">${rFmtPct(a.retAtivo)}</td>`,
        `<td class="num" style="color:${rc};">${rFmtPct(a.contrib)}</td>`,
        '</tr>',
      ].join('');
    }).join('');

    // Var. Patrimonial para o histórico
    const varPat = plBase > 0 ? (row.plCurr - plBase) / plBase : 0;

    // Seção de histórico: summary 3-col + tabela mensal
    const histRows = histMonths.map(m => {
      const r = D.getRow(code, m);
      if (!r) return '';
      const apResg = r.plCurr - r.plPrev - r.plPrev * r.rent;
      const apStr  = Math.abs(apResg) < 1000 ? '—' : rFmtBRL(apResg);
      const rc = r.rent >= 0 ? '#065F46' : '#991B1B';
      const vc = (r.rent - (r.cdi || 0)) >= 0 ? '#065F46' : '#991B1B';
      return `<tr>
        <td style="font-family:'Courier New',monospace;font-size:11px;">${rFmtMonth(m)}</td>
        <td class="num">${rFmtBRL(r.plPrev)}</td>
        <td class="num">${rFmtBRL(r.plCurr)}</td>
        <td class="num" style="color:${rc};">${rFmtPct(r.rent)}</td>
        <td class="num">${rFmtPct(r.cdi || 0, 3)}</td>
        <td class="num" style="color:${vc};">${rFmtPct(r.rent - (r.cdi || 0))}</td>
        <td class="num" style="color:#9A9188;">${apStr}</td>
      </tr>`;
    }).join('');

    const historicoHTML = histMonths.length ? `<section class="section">
<div class="section-title">Histórico mensal — desde ${rFmtMonth(histMonths[0])}</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#DDD8D0;border:1px solid #DDD8D0;border-radius:4px;overflow:hidden;margin-bottom:14px;">
  <div style="background:#fff;padding:9px 12px;">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#9A9188;margin-bottom:4px;">Var. Patrimonial</div>
    <div style="font-size:15px;font-weight:700;font-family:'Courier New',monospace;color:${varPat >= 0 ? '#065F46' : '#991B1B'};">${rFmtPct(varPat)}</div>
    <div style="font-size:10px;color:#9A9188;margin-top:2px;">PL₁ / PL₀ − 1</div>
  </div>
  <div style="background:#fff;padding:9px 12px;">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#9A9188;margin-bottom:4px;">Retorno TWR</div>
    <div style="font-size:15px;font-weight:700;font-family:'Courier New',monospace;color:${twrTotal >= 0 ? '#065F46' : '#991B1B'};">${rFmtPct(twrTotal)}</div>
    <div style="font-size:10px;color:#9A9188;margin-top:2px;">&#8719;(1+r&#8345;) &#8722; 1</div>
  </div>
  <div style="background:#fff;padding:9px 12px;">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#9A9188;margin-bottom:4px;">CDI Acumulado</div>
    <div style="font-size:15px;font-weight:700;font-family:'Courier New',monospace;color:#0D1520;">${rFmtPct(cdiTotal)}</div>
    <div style="font-size:10px;color:#9A9188;margin-top:2px;">Período inteiro</div>
  </div>
</div>
<table>
  <thead><tr>
    <th>Mês</th>
    <th class="num">PL Anterior</th>
    <th class="num">PL Atual</th>
    <th class="num">Rent.</th>
    <th class="num">CDI</th>
    <th class="num">vs CDI</th>
    <th class="num">Aporte/Resg. Est.</th>
  </tr></thead>
  <tbody>${histRows}</tbody>
</table>
</section>` : '';

    // Seção de achados
    const findingsHTML = row.findings && row.findings.length
      ? `<section class="section">
<div class="section-title">Achados (${row.findings.length})</div>
<table><thead><tr><th>Severidade</th><th>Descrição</th></tr></thead><tbody>
${row.findings.map(f => {
  const bg = f.severity === 'CORRIGIR' ? '#FEF2F2' : f.severity === 'COM ALERTA' ? '#FFFBEB' : '#EFF6FF';
  const fc = f.severity === 'CORRIGIR' ? '#991B1B' : f.severity === 'COM ALERTA' ? '#92400E' : '#1E40AF';
  return `<tr><td><span style="background:${bg};color:${fc};padding:2px 8px;border-radius:3px;font-size:10px;font-weight:600;text-transform:uppercase;">${escH(f.severity)}</span></td><td style="font-size:11px;">${escH(f.text)}</td></tr>`;
}).join('')}
</tbody></table></section>`
      : '';

    // Seção de observação (só se não-vazia e não-default)
    const obsHTML = obs && obs.trim() && obs.trim() !== DEFAULT_OBS
      ? `<section class="section">
<div class="section-title">Observação do Analista</div>
<p style="font-size:11px;color:#3C3830;line-height:1.6;padding:10px 14px;background:#F9F7F4;border-left:3px solid #C4A228;border-radius:2px;">${escH(obs)}</p>
</section>`
      : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório · ${escH(code)} · ${monthLabel}</title>
<style>
@page { margin: 18mm; size: A4; }
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1A1A1A; background: #fff; max-width: 820px; margin: 0 auto; padding: 28px 36px 48px; }
.print-btn { position: fixed; top: 16px; right: 16px; background: #05305F; color: #fff; border: none; border-radius: 4px; padding: 8px 20px; font-size: 12px; font-family: inherit; cursor: pointer; }
.print-btn:hover { background: #04275A; }
@media print { .print-btn { display: none !important; } }
.rpt-hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #05305F; padding-bottom: 12px; margin-bottom: 18px; }
.rpt-brand { font-size: 10px; color: #9A9188; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; }
.rpt-code  { font-size: 21px; font-weight: 700; color: #05305F; margin-bottom: 2px; }
.rpt-sub   { font-size: 11px; color: #9A9188; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.badge--liberar  { background: #ECFDF5; color: #065F46; }
.badge--alerta   { background: #FFFBEB; color: #92400E; }
.badge--corrigir { background: #FEF2F2; color: #991B1B; }
.kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background: #DDD8D0; border: 1px solid #DDD8D0; border-radius: 4px; overflow: hidden; margin-bottom: 18px; }
.kpi-cell { background: #fff; padding: 9px 12px; }
.kpi-lbl  { font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #9A9188; margin-bottom: 4px; }
.kpi-val  { font-size: 15px; font-weight: 700; font-family: 'Courier New', monospace; color: #0D1520; }
.kpi-val.pos { color: #065F46; }
.kpi-val.neg { color: #991B1B; }
.kpi-sub  { font-size: 10px; color: #9A9188; margin-top: 2px; }
.section  { margin-bottom: 20px; page-break-inside: avoid; }
.section-title { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #9A9188; border-bottom: 1px solid #DDD8D0; padding-bottom: 5px; margin-bottom: 10px; }
.legend   { display: flex; gap: 16px; margin-top: 7px; flex-wrap: wrap; align-items: center; }
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #3C3830; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
th { text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #9A9188; border-bottom: 1px solid #DDD8D0; padding: 4px 7px 5px; }
td { padding: 5px 7px; border-bottom: 1px solid #E3DDD5; color: #3C3830; vertical-align: top; }
.num { text-align: right; font-family: 'Courier New', monospace; }
.footnotes { font-size: 9px; color: #9A9188; line-height: 1.7; border-top: 1px solid #DDD8D0; padding-top: 8px; margin-top: 12px; }
.rpt-footer { display: flex; justify-content: space-between; border-top: 1.5px solid #05305F; margin-top: 20px; padding-top: 8px; font-size: 9px; color: #9A9188; text-transform: uppercase; letter-spacing: .06em; }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>

<div class="rpt-hdr">
  <div>
    <div class="rpt-brand">Meridian Advisory · Relatório de Carteira</div>
    <div class="rpt-code">${escH(code)}</div>
    <div class="rpt-sub">${escH(cat.name || '')}${managerName ? ' · Gestor: ' + escH(managerName) : ''}</div>
    <div class="rpt-sub" style="margin-top:2px;">Referência: ${monthLabel} · Gerado em ${today}</div>
  </div>
  <div style="padding-top:4px;"><span class="badge badge--${statusSlug}">${escH(row.status)}</span></div>
</div>

<div class="kpi-grid">
  <div class="kpi-cell"><div class="kpi-lbl">PL Anterior</div><div class="kpi-val">${rFmtBRL(row.plPrev)}</div></div>
  <div class="kpi-cell"><div class="kpi-lbl">PL Atual</div><div class="kpi-val">${rFmtBRL(row.plCurr)}</div></div>
  <div class="kpi-cell"><div class="kpi-lbl">Rent. Mês</div><div class="kpi-val ${row.rent >= 0 ? 'pos' : 'neg'}">${rFmtPct(row.rent)}</div><div class="kpi-sub">vs CDI ${row.vsCDI >= 0 ? '+' : ''}${rFmtPct(row.vsCDI, 3)}</div></div>
  <div class="kpi-cell"><div class="kpi-lbl">TWR desde ${rFmtMonth(inception)}</div><div class="kpi-val ${twrTotal >= 0 ? 'pos' : 'neg'}">${rFmtPct(twrTotal)}</div></div>
  <div class="kpi-cell"><div class="kpi-lbl">CDI mesmo período</div><div class="kpi-val">${rFmtPct(cdiTotal)}</div></div>
</div>

<section class="section">
  <div class="section-title">Retorno Acumulado — desde ${rFmtMonth(inception)}</div>
  ${chartSVG}
  <div class="legend">
    <span class="legend-item"><svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#05305F" stroke-width="2"/></svg>Retorno Acumulado</span>
    <span class="legend-item"><svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#05305F" stroke-width="1.5" stroke-dasharray="5,3"/></svg>TWR</span>
    <span class="legend-item"><svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#9A9188" stroke-width="1.5" stroke-dasharray="3,3"/></svg>CDI Acum.</span>
  </div>
</section>

<section class="section">
  <div class="section-title">Composição da Carteira (${monthLabel})</div>
  <table>
    <thead><tr>
      <th>Ativo</th><th>Classe</th><th>Custodiante</th>
      ${hasVencto ? '<th class="num">Vencimento</th>' : ''}
      <th class="num">Saldo Final</th>
      <th class="num">Part.%</th>
      <th class="num">Rent.</th>
      <th class="num">Contrib.</th>
    </tr></thead>
    <tbody>${compRows}</tbody>
  </table>
  ${concentrated.length
    ? `<p style="font-size:10px;color:#B45309;margin-top:7px;">(!) Concentração acima de 25%: ${concentrated.map(a => escH(a.name)).join(', ')}.</p>`
    : ''}
</section>

${historicoHTML}
${findingsHTML}
${obsHTML}
<div class="footnotes">
  (*) Retorno Acumulado: variação patrimonial relativa ao PL no início do período, inclui efeito de aportes e resgates.<br>
  (**) TWR: método CFA/GIPS — ∏(1 + rₙ) − 1, elimina distorções por aportes e resgates.<br>
  Dados sintéticos — ATLAS Wealth Verification · Meridian Advisory (uso interno).
</div>

<footer class="rpt-footer">
  <span>Meridian Advisory · Relatório de Carteira · Uso Interno</span>
  <span>${escH(code)} · ${monthLabel}</span>
</footer>
</body>
</html>`;
  }

  /* ============================================================
     DevRelatorio — componente React
  ============================================================ */

  function DevRelatorio({ code }) {
    const { useMonth, useToast } = window.AtlasContexts;
    const { selectedMonth }      = useMonth();
    const { addToast }           = useToast();

    const html = useMemo(
      () => code ? buildReportHTML(code, selectedMonth) : null,
      [code, selectedMonth]
    );

    if (!code) {
      return (
        <div style={{ padding: 40, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.857rem' }}>
          Nenhuma carteira selecionada. Navegue via #/dev/relatorio/CODIGO
        </div>
      );
    }

    function handleOpen() {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const w    = window.open(url, '_blank', 'width=920,height=760,scrollbars=yes,resizable=yes');
      if (!w) {
        URL.revokeObjectURL(url);
        addToast('Popup bloqueado pelo navegador. Use o preview abaixo para imprimir.', 'error');
        return;
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Relatório exportável</div>
          <h1 className="page-title">{code}</h1>
          <div className="page-subtitle">Preview do relatório &middot; {selectedMonth}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button className="btn btn--primary" onClick={handleOpen}>
            <Icon name="export" size={14} style={{ marginRight: 6 }} />
            Abrir em nova aba / Imprimir
          </button>
          <button className="btn btn--ghost" onClick={() => navigate('#/carteira/' + code)}>
            Voltar à carteira
          </button>
        </div>

        <iframe
          key={code + '|' + selectedMonth}
          srcDoc={html}
          style={{
            width: '100%',
            height: 'calc(100vh - 220px)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--r-md)',
            background: '#fff',
            display: 'block',
          }}
          title={`Relatório ${code}`}
        />
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.DevRelatorio = DevRelatorio;

})();
