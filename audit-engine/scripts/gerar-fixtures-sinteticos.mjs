#!/usr/bin/env node
/**
 * gerar-fixtures-sinteticos.mjs — gera fixtures 100% sintéticas do snapshot.
 *
 * Modela a ANATOMIA de formatos públicos (posição diária de custódia no
 * espírito do layout B3 802; extrato mensal no template do custodiante; book
 * mensal no layout que o parser de PDF lê; tabela HTML de posição; JSON de
 * API), SEM copiar template proprietário e SEM dado real: nomes fictícios,
 * "CUSTODIANTE SINTETICO", datas e valores fixos.
 *
 * Determinístico: rodar de novo produz byte a byte o mesmo resultado.
 * O diff da semana foi desenhado para ter o que dizer:
 *   - 11/08: liquidez de ALFA sobe 5pp (CASH_INCREASE)
 *   - 12/08: CDB de ALFA vence e é renovado (POSITION_CLOSED + NEW_POSITION),
 *            LCI nova a 7 dias (MATURITY_APPROACHING janela 7)
 *   - 13/08: saque grande em BETA (LARGE_WITHDRAWAL + CASH_DECREASE)
 *   - 14/08: concentração e alocação sobem em GAMA (CONCENTRATION_INCREASE +
 *            ALLOCATION_SHIFT)
 *   - mensal 2026-05 → 2026-06: CASH_INCREASE, NEW_POSITION e
 *     MATURITY_APPROACHING (janela 30, referência = último dia do mês)
 *
 * Uso: node audit-engine/scripts/gerar-fixtures-sinteticos.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'tests', 'fixtures-sinteticos');

/**
 * Reempacota o zip com data fixa em todas as entradas. O exceljs (via jszip)
 * carimba cada entrada com a hora atual, então o mesmo XLSX nasce com bytes
 * diferentes a cada execução. Data fixa (época DOS do zip) devolve o
 * determinismo byte a byte.
 */
async function fixarDatasZip(buffer) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);
  const FIXA = new Date(Date.UTC(1980, 0, 1));
  for (const nome of Object.keys(zip.files)) {
    zip.files[nome].date = FIXA;
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

/* ── Universo sintético (fictício) ─────────────────────────────────────── */

const LIQUIDEZ = 'Liquidez';
const RF = 'Renda Fixa';
const ACOES = 'Ações';
const FII = 'FII';
const INTER = 'Internacional';
const MM = 'Multimercado';

/* Posição: [carteira, ativo, classe, valor, vencimento?, quantidade?] */
function pos(carteira, ativo, classe, valor, vencimento = '', quantidade = '') {
  return { carteira, ativo, classe, valor, vencimento, quantidade };
}

/* Posições de ALFA por dia (vencimento do CDB em 12/08 → renovação). */
const ALFA = {
  '2026-08-10': [
    pos('ALFA', 'FUNDO SYNTH DI', LIQUIDEZ, 100000),
    pos('ALFA', 'CDB BANCO FICTICIO', RF, 300000, '2026-08-12', 3000),
    pos('ALFA', 'LTN 2027', RF, 150000, '2027-01-01', 150),
    pos('ALFA', 'ACOES SYNTH', ACOES, 200000),
    pos('ALFA', 'ETF GLOBAL X', INTER, 150000, '', 1200),
    pos('ALFA', 'FII LOG', FII, 100000),
  ],
  '2026-08-11': [
    pos('ALFA', 'FUNDO SYNTH DI', LIQUIDEZ, 150000),
    pos('ALFA', 'CDB BANCO FICTICIO', RF, 300000, '2026-08-12', 3000),
    pos('ALFA', 'LTN 2027', RF, 150000, '2027-01-01', 150),
    pos('ALFA', 'ACOES SYNTH', ACOES, 200000),
    pos('ALFA', 'ETF GLOBAL X', INTER, 150000, '', 1200),
    pos('ALFA', 'FII LOG', FII, 100000),
  ],
  '2026-08-12': [
    pos('ALFA', 'FUNDO SYNTH DI', LIQUIDEZ, 110000),
    pos('ALFA', 'CDB BANCO FICTICIO II', RF, 300000, '2027-03-01', 3000),
    pos('ALFA', 'LCI BANCO W', RF, 10000, '2026-08-19', 10),
    pos('ALFA', 'LTN 2027', RF, 150000, '2027-01-01', 150),
    pos('ALFA', 'ACOES SYNTH', ACOES, 200000),
    pos('ALFA', 'ETF GLOBAL X', INTER, 150000, '', 1200),
    pos('ALFA', 'FII LOG', FII, 100000),
  ],
  '2026-08-13': [
    pos('ALFA', 'FUNDO SYNTH DI', LIQUIDEZ, 110000),
    pos('ALFA', 'CDB BANCO FICTICIO II', RF, 300000, '2027-03-01', 3000),
    pos('ALFA', 'LCI BANCO W', RF, 10000, '2026-08-19', 10),
    pos('ALFA', 'LTN 2027', RF, 150000, '2027-01-01', 150),
    pos('ALFA', 'ACOES SYNTH', ACOES, 200000),
    pos('ALFA', 'ETF GLOBAL X', INTER, 150000, '', 1200),
    pos('ALFA', 'FII LOG', FII, 100000),
  ],
  '2026-08-14': [
    pos('ALFA', 'FUNDO SYNTH DI', LIQUIDEZ, 110000),
    pos('ALFA', 'CDB BANCO FICTICIO II', RF, 300000, '2027-03-01', 3000),
    pos('ALFA', 'LCI BANCO W', RF, 10000, '2026-08-19', 10),
    pos('ALFA', 'LTN 2027', RF, 150000, '2027-01-01', 150),
    pos('ALFA', 'ACOES SYNTH', ACOES, 200000),
    pos('ALFA', 'ETF GLOBAL X', INTER, 150000, '', 1200),
    pos('ALFA', 'FII LOG', FII, 100000),
  ],
};

const BETA_BASE = [
  pos('BETA', 'FUNDO SYNTH DI', LIQUIDEZ, 82000),
  pos('BETA', 'DEB PREFIXADO', RF, 300000, '2028-06-01', 300),
  pos('BETA', 'ACOES SYNTH', ACOES, 300000),
  pos('BETA', 'FUNDO MM', MM, 138000),
];
const BETA_SAQUE = [
  pos('BETA', 'FUNDO SYNTH DI', LIQUIDEZ, 20000),
  pos('BETA', 'DEB PREFIXADO', RF, 300000, '2028-06-01', 300),
  pos('BETA', 'ACOES SYNTH', ACOES, 300000),
];
const BETA = {
  '2026-08-10': BETA_BASE,
  '2026-08-11': BETA_BASE,
  '2026-08-12': BETA_BASE,
  '2026-08-13': BETA_SAQUE,
  '2026-08-14': BETA_SAQUE,
};

const GAMA_BASE = [
  pos('GAMA', 'FUNDO SYNTH DI', LIQUIDEZ, 64000),
  pos('GAMA', 'FUNDO SYNTH DI PREV', RF, 160000),
  pos('GAMA', 'NTN-B 2035', RF, 160000, '2035-05-15', 40),
  pos('GAMA', 'ACOES SYNTH', ACOES, 256000),
];
const GAMA_CONC = [
  pos('GAMA', 'FUNDO SYNTH DI', LIQUIDEZ, 64000),
  pos('GAMA', 'FUNDO SYNTH DI PREV', RF, 121600),
  pos('GAMA', 'NTN-B 2035', RF, 160000, '2035-05-15', 40),
  pos('GAMA', 'ACOES SYNTH', ACOES, 294400),
];
const GAMA = {
  '2026-08-10': GAMA_BASE,
  '2026-08-11': GAMA_BASE,
  '2026-08-12': GAMA_BASE,
  '2026-08-13': GAMA_BASE,
  '2026-08-14': GAMA_CONC,
};

const SEMANA = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'];

function posicoesDoDia(dia) {
  return [...ALFA[dia], ...BETA[dia], ...GAMA[dia]];
}

/* Mensal: 2026-05 = dia base; 2026-06 com os três eventos mensais.
   O CDB do mensal vence em 2027 (não herda o vencimento do fixture diário). */
const MENSAL_05 = [
  ...ALFA['2026-08-10'].map((p) =>
    p.ativo === 'CDB BANCO FICTICIO' ? { ...p, vencimento: '2027-03-01' } : p
  ),
  ...BETA_BASE,
  ...GAMA_BASE,
];
const MENSAL_06 = [
  ...ALFA['2026-08-10'].map((p) =>
    p.ativo === 'FUNDO SYNTH DI'
      ? { ...p, valor: 160000 }
      : p.ativo === 'CDB BANCO FICTICIO'
        ? { ...p, vencimento: '2027-03-01' }
        : p
  ),
  pos('ALFA', 'LCI MENSAL NOVA', RF, 20000, '2026-07-20', 20),
  ...BETA_BASE,
  ...GAMA_BASE,
];

/* ── Escrita de formatos ──────────────────────────────────────────────── */

function fmtBRL(n) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escreverCSV(arquivo, linhas) {
  const header = 'carteira,ativo,classe,valor,vencimento,quantidade';
  const corpo = linhas.map((p) =>
    [p.carteira, p.ativo, p.classe, fmtBRL(p.valor), p.vencimento, p.quantidade]
      .map((f) => (String(f).includes(',') ? `"${f}"` : f))
      .join(',')
  );
  fs.writeFileSync(arquivo, [header, ...corpo, ''].join('\r\n'), 'utf8');
}

function escreverHTML(arquivo, linhas) {
  const porCarteira = new Map();
  for (const p of linhas) {
    if (!porCarteira.has(p.carteira)) porCarteira.set(p.carteira, []);
    porCarteira.get(p.carteira).push(p);
  }
  const tabelas = [...porCarteira.entries()]
    .map(([carteira, ps]) => {
      const linhasHtml = ps
        .map(
          (p) =>
            `    <tr><td>${carteira}</td><td>${p.ativo}</td><td>${p.classe}</td><td>${fmtBRL(p.valor)}</td><td>${p.vencimento || '&mdash;'}</td></tr>`
        )
        .join('\n');
      return `  <table>\n    <tr><th>CARTEIRA</th><th>ATIVO</th><th>CLASSE</th><th>VALOR</th><th>VENCIMENTO</th></tr>\n${linhasHtml}\n  </table>`;
    })
    .join('\n');
  const html = `<html lang="pt-BR">\n<head><meta charset="utf-8"><title>Posicao diaria — CUSTODIANTE SINTETICO</title></head>\n<body>\n<h1>Posicao diaria — CUSTODIANTE SINTETICO</h1>\n${tabelas}\n</body>\n</html>\n`;
  fs.writeFileSync(arquivo, html, 'utf8');
}

function escreverJSON(arquivo, linhas, data) {
  const porCarteira = new Map();
  for (const p of linhas) {
    if (!porCarteira.has(p.carteira)) porCarteira.set(p.carteira, []);
    porCarteira.get(p.carteira).push(p);
  }
  const obj = {
    data,
    fonte: 'custodiante-sintetico',
    carteiras: [...porCarteira.entries()].map(([nome, ps]) => ({
      nome,
      posicoes: ps.map((p) => {
        const o = { ativo: p.ativo, valor: p.valor };
        if (p.classe) o.classe = p.classe;
        if (p.vencimento) o.vencimento = p.vencimento;
        if (p.quantidade !== '') o.quantidade = Number(p.quantidade);
        return o;
      }),
    })),
  };
  fs.writeFileSync(arquivo, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

async function escreverXLSX(arquivo, linhasPorDia, dia) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  // determinismo byte a byte: exceljs grava created/modified em docProps/core.xml
  wb.created = new Date('2026-06-30T12:00:00Z');
  wb.modified = new Date('2026-06-30T12:00:00Z');
  const porCarteira = new Map();
  for (const p of linhasPorDia) {
    if (!porCarteira.has(p.carteira)) porCarteira.set(p.carteira, []);
    porCarteira.get(p.carteira).push(p);
  }

  for (const [carteira, ps] of porCarteira) {
    const sheet = wb.addWorksheet(carteira);
    sheet.getCell('A1').value = `CARTEIRA ${carteira}`;
    sheet.getCell('A2').value = 'CLASSE / ATIVO';

    let linha = 3;
    let classeCorrente = null;
    for (const p of ps) {
      if (p.classe !== classeCorrente) {
        // Linha de classe carrega a soma da classe (como no book real): o
        // parser só reconhece linha de classe quando há valor numérico.
        classeCorrente = p.classe;
        const somaClasse = ps.filter((q) => q.classe === p.classe).reduce((a, q) => a + q.valor, 0);
        sheet.getCell(`A${linha}`).value = p.classe;
        sheet.getCell(`C${linha}`).value = somaClasse;
        sheet.getCell(`D${linha}`).value = somaClasse;
        linha++;
      }
      // o vencimento viaja no NOME do ativo, como no book real ('Vencto: dd/mm/aaaa')
      const nomeComVencto = p.vencimento
        ? `${p.ativo} Vencto: ${p.vencimento.slice(8, 10)}/${p.vencimento.slice(5, 7)}/${p.vencimento.slice(0, 4)}`
        : p.ativo;
      sheet.getCell(`A${linha}`).value = nomeComVencto;
      sheet.getCell(`B${linha}`).value = 'CUSTODIANTE SINTETICO';
      sheet.getCell(`C${linha}`).value = p.valor;
      sheet.getCell(`D${linha}`).value = p.valor;
      linha++;
    }
    const total = ps.reduce((a, p) => a + p.valor, 0);
    sheet.getCell(`A${linha}`).value = 'TOTAL';
    sheet.getCell(`C${linha}`).value = total;
    sheet.getCell(`D${linha}`).value = total;
  }

  const buffer = await wb.xlsx.writeBuffer();
  await fs.promises.writeFile(arquivo, await fixarDatasZip(buffer));
}

/**
 * Book mensal em PDF no LAYOUT EXATO do book real, com conteúdo fictício.
 *
 * O parser de PDF é calibrado por coordenadas (âncoras de coluna, bandas de
 * topo). O perfil estrutural do book real (layout-book-perfil.json) guarda a
 * grade: só rótulos genéricos e posições, SEM dado de cliente. Aqui cada
 * página é reconstruída nessa grade, trocando conteúdo de cliente por dados
 * fictícios. Um arquivo por carteira (como no mundo real).
 */

/* pdfkit posiciona o texto com y medido do TOPO da página. */
const yDe = (top) => top;

async function escreverBookPdf(arquivoBase, linhasPorCarteira, carteiras) {
  const { default: pdfkit } = await import('pdfkit');
  const perfil = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'layout-book-perfil.json'), 'utf8')
  ).paginas;

  for (const carteira of carteiras) {
    const ps = linhasPorCarteira.get(carteira);
    const total = ps.reduce((a, p) => a + p.valor, 0);
    const porClasse = new Map();
    for (const p of ps) porClasse.set(p.classe, (porClasse.get(p.classe) ?? 0) + p.valor);

    const doc = new pdfkit({
      size: 'A4',
      // determinismo byte a byte: pdfkit grava CreationDate/ID com new Date()
      info: { Title: 'Book sintetico ATLAS', CreationDate: new Date('2026-06-30T12:00:00Z') },
    });
    const stream = fs.createWriteStream(`${arquivoBase}_${carteira === 'ALFA' ? 'A' : carteira === 'BETA' ? 'B' : 'G'}.pdf`);
    doc.pipe(stream);

    const desenha = (linhas, pagina, preenchimento) => {
      for (const [top, slots] of linhas) {
        for (const [x, texto, generico, numerico] of slots) {
          const t = preenchimento(slots, x, texto, generico, numerico, top);
          if (t !== null && t !== '') {
            doc.fontSize(9).text(String(t), x, yDe(top));
          }
        }
      }
      doc.addPage();
      void pagina;
    };

    /* Página 1 — capa: rótulos iguais; data e código fictícios nas bandas reais */
    const p1 = perfil[0];
    desenha(p1, 1, (slots, x, texto, generico, numerico, top) => {
      if (generico) return texto;
      if (top === 352) return '30/06/2026';
      if (top === 455) return carteira === 'ALFA' ? 'TESTE_06A' : carteira === 'BETA' ? 'TESTE_06B' : 'TESTE_06G';
      return null; // nunca reproduzir texto de cliente
    });

    /* Página 2 — Asset Allocation (o extrator lê desta página) */
    const p2 = perfil[1];
    let emAlocacao = false;
    let idxClasse = -1;
    const classes = [...porClasse.entries()];
    const nomeX2 = 58.2;
    desenha(p2, 2, (slots, x, texto, generico, numerico, top) => {
      if (generico) {
        if (texto === 'AssetAllocation') emAlocacao = true;
        return texto;
      }
      if (!emAlocacao) return null;
      const slotVals = slots.filter((s) => s[3]).map((s) => s[0]);
      const iNum = slotVals.indexOf(x);
      const ehTotal = slots.some((s) => s[1] === 'TOTAL');
      if (x <= nomeX2 + 0.5) {
        if (iNum === -1) {
          idxClasse++;
          return classes[idxClasse] ? classes[idxClasse][0] : null;
        }
        return null;
      }
      if (iNum === -1) return null;
      if (ehTotal) return fmtBRL(total);
      const [classe, valor] = classes[idxClasse] ?? [null, 0];
      if (iNum === 0) return fmtBRL(valor ?? 0);
      if (iNum === 1) return fmtPct((valor ?? 0) / total);
      return null;
    });

    /* Página 3 — variação da alocação: só rótulos genéricos, sem dado */
    desenha(perfil[2], 3, (slots, x, texto, generico) => (generico ? texto : null));

    /* Página 4 — Rentabilidades Mensais: ano + valor no mês de referência */
    const p4 = perfil[3];
    let xJun = null;
    for (const [top, slots] of p4) {
      for (const [x, texto, generico] of slots) {
        if (generico && texto === 'Jun' && xJun === null) xJun = x;
      }
    }
    desenha(p4, 4, (slots, x, texto, generico, numerico, top) => {
      if (generico) return texto;
      if (top < 118) return null; // antes do cabeçalho de meses
      const naLinhaJun = slots.some((s) => s[1] === 'Jun' || (s[2] && s[1].includes('Jun')));
      if (naLinhaJun) return null; // a linha do cabeçalho em si já foi coberta
      if (x <= 48.7 && slots[0]?.[0] === x) return '2026'; // primeira coluna do ano
      if (xJun !== null && Math.abs(x - xJun) <= 2.5) return '1,25';
      return null;
    });

    /* Página 5 — tabela de ativos: cabeçalhos iguais ao book real; linhas de
       dado desenhadas nas ÂNCORAS EXATAS que o parser calcula (pontos médios
       entre os rótulos do cabeçalho — build_profile). Os topes das linhas vêm
       do perfil; os valores são fictícios. */
    const p5 = perfil[4];
    const ANCORAS = [
      [359.857, 'saldoBase'],
      [630.158, 'saldoBruto'],
      [757.033, 'saldoLiquido'],
    ];
    // topes das linhas de dado (linhas com nome na coluna 1, depois do IR+IOF)
    const topesDado = p5
      .map(([top, slots]) => [top, slots])
      .filter(([top, slots]) => top > 113 && slots.some((s) => !s[2] && s[0] < 100))
      .map(([top]) => top);
    const topTotal = p5
      .map(([top, slots]) => [top, slots])
      .find(([top, slots]) => slots.some((s) => s[1] === 'TOTAL' && s[2]))?.[0] ?? null;

    const desenhaAtivos = (paginacao) => {
      for (const [top, slots] of paginacao) {
        for (const [x, texto, generico] of slots) {
          if (generico) {
            if (texto === 'TOTAL') continue; // desenhado junto da linha de total
            doc.fontSize(9).text(texto, x, yDe(top));
          }
        }
      }
      // linhas de dado fictícias. O parser ancora os números pelo x1 (borda
      // DIREITA) da palavra — os valores reais terminam exatamente na âncora,
      // então aqui o desenho é alinhado à direita da âncora.
      const numNaAncora = (valor, ax, top) => {
        const t = fmtBRL(valor);
        // folga de 2pt à esquerda: sobreposição com a coluna vizinha funde
        // palavras no pdfplumber e o número deixa de casar o regex numérico
        doc.fontSize(9).text(t, ax - doc.widthOfString(t) - 2, yDe(top));
      };
      ps.forEach((p, i) => {
        const top = topesDado[i] ?? topesDado[topesDado.length - 1] + (i - topesDado.length + 1) * 13;
        doc.fontSize(9).text(p.ativo, 48.7, yDe(top));
        doc.fontSize(9).text('CUSTODIANTE', 222.8, yDe(top));
        for (const [ax] of ANCORAS) {
          numNaAncora(p.valor, ax, top);
        }
      });
      const topT = topTotal ?? (topesDado[topesDado.length - 1] ?? 200) + 13;
      {
        doc.fontSize(9).text('TOTAL', 48.7, yDe(topT));
        for (const [ax] of ANCORAS) {
          numNaAncora(total, ax, topT);
        }
      }
    };
    desenhaAtivos(p5);

    doc.end();
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}

function fmtPct(v) {
  return (v * 100).toFixed(2).replace('.', ',');
}

/* ── Main determinístico ──────────────────────────────────────────────── */

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'diarios'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'mensais'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'formatos'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'books'), { recursive: true });

  for (const dia of SEMANA) {
    await escreverXLSX(path.join(OUT, 'diarios', `posicao-${dia}.xlsx`), posicoesDoDia(dia), dia);
  }
  await escreverXLSX(path.join(OUT, 'mensais', 'posicao-2026-05.xlsx'), MENSAL_05, '2026-05');
  await escreverXLSX(path.join(OUT, 'mensais', 'posicao-2026-06.xlsx'), MENSAL_06, '2026-06');

  escreverCSV(path.join(OUT, 'formatos', 'diario-2026-08-13.csv'), posicoesDoDia('2026-08-13'));
  escreverHTML(path.join(OUT, 'formatos', 'diario-2026-08-13.html'), posicoesDoDia('2026-08-13'));
  escreverJSON(path.join(OUT, 'formatos', 'diario-2026-08-13.json'), posicoesDoDia('2026-08-13'), '2026-08-13');

  const porCarteira06 = new Map();
  for (const p of MENSAL_06) {
    if (!porCarteira06.has(p.carteira)) porCarteira06.set(p.carteira, []);
    porCarteira06.get(p.carteira).push(p);
  }
  await escreverBookPdf(
    path.join(OUT, 'books', 'Book_TESTE_2026_06'),
    porCarteira06,
    ['ALFA', 'BETA', 'GAMA']
  );

  const arquivos = [];
  const anda = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) anda(full);
      else arquivos.push(path.relative(OUT, full));
    }
  };
  anda(OUT);
  console.log('Fixtures sinteticos gerados em ' + OUT);
  for (const a of arquivos.sort()) console.log('  ' + a);
}

main().catch((err) => {
  console.error('gerar-fixtures-sinteticos: ' + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
