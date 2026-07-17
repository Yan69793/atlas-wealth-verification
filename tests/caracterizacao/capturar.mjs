#!/usr/bin/env node
// Rede de caracterizacao do SPA: captura os NUMEROS renderizados por cada pagina,
// por mes, para servir de baseline. Serve para provar depois que mudancas de
// codigo (migracao Vite, re-pin do core) nao mudaram os numeros que o cliente ve.
//
// IMPORTANTE (LGPD): este arquivo e CODIGO e vive no repo ATLAS. O BASELINE que
// ele grava contem PL real de carteira de cliente e NAO pode ir para nenhum git.
// Por isso o destino padrao e a instancia do cliente (verificacao-carteiras), cujo
// .gitignore e deny-by-default e ja ignora tests/caracterizacao/baseline/.
//
// A rede so tem valor sobre o dado REAL dos meses. O app da instancia so renderiza
// os meses reais quando os overlays LGPD (platform-data-real.js etc.) estao no
// working tree. Se o app cair no demo, este script ABORTA em vez de gravar dado fake.
//
// Uso:
//   1. Servir a instancia:  cd verificacao-carteiras && npx http-server -p 8734 -c-1 .
//   2. Capturar:            node tests/caracterizacao/capturar.mjs [--out <dir>] [--base <url>]
//
// Requisito: playwright + chromium instalados no repo ATLAS. Se faltar:
//   cd ATLAS && npm install --no-save playwright && npx playwright install chromium

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Destino padrao: a instancia do cliente, fora de qualquer git (LGPD).
const DEFAULT_OUT = path.resolve(
  __dirname, '..', '..', '..', 'verificacao-carteiras', 'tests', 'caracterizacao', 'baseline'
);
const DEFAULT_BASE = 'http://127.0.0.1:8734';

// 6 meses reais. O plano sugeria 2023-06, mas AtlasData.MONTHS comeca em 2024-01
// (o dado real vai de 2024-01 a 2026-06), entao 2023-06 nao existe nem renderiza
// dado real. Trocado por 2024-01 (primeiro mes real). 2026-06 e o mes corrente.
const MESES = ['2024-01', '2024-06', '2025-06', '2025-12', '2026-04', '2026-06'];

// As 12 paginas de window.AtlasPages, cada uma com sua rota hash. As duas paginas
// com parametro (carteira, dev-relatorio) recebem um code real resolvido por mes.
const PAGINAS = [
  { id: 'dashboard',    rota: () => '#/dashboard' },
  { id: 'carteira',     rota: (code) => `#/carteira/${code}` },
  { id: 'dev-relatorio', rota: (code) => `#/dev/relatorio/${code}` },
  { id: 'achados',      rota: () => '#/achados' },
  { id: 'comparativo',  rota: () => '#/comparativo' },
  { id: 'receitas',     rota: () => '#/receitas' },
  { id: 'cadastro',     rota: () => '#/cadastro' },
  { id: 'busca',        rota: () => '#/busca' },
  { id: 'importar',     rota: () => '#/importar' },
  { id: 'usuarios',     rota: () => '#/usuarios' },
  { id: 'risco',        rota: () => '#/risco' },
  { id: 'tendencia',    rota: () => '#/tendencia' },
];

function parseArgs(argv) {
  const out = { out: DEFAULT_OUT, base: DEFAULT_BASE };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = path.resolve(argv[++i]);
    else if (argv[i] === '--base') out.base = argv[++i];
  }
  return out;
}

async function carregarPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error('ERRO: pacote "playwright" nao encontrado.');
    console.error('Instale no repo ATLAS (sem sujar o package.json):');
    console.error('  cd "E:/Diretorio/Claude/ATLAS"');
    console.error('  npm install --no-save playwright && npx playwright install chromium');
    process.exit(2);
  }
}

// Extrai SO valores numericos do conteudo da pagina (elemento <main>), incluindo
// texto de SVG (ticks/labels de graficos Recharts). Numero, nao DOM: o DOM muda
// com CSS e geraria falso positivo. Chaves sao o indice ordinal em ordem de
// documento (deterministico dado o mesmo dado), com o objeto ordenado por chave.
function extrairNumeros(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return { __sem_main: true };
    const partes = [main.innerText || ''];
    main.querySelectorAll('svg text').forEach((t) => partes.push(t.textContent || ''));
    const blob = partes.join('\n');
    // numeros no formato brasileiro: -1.234,56  84  0,920  100  (inclui % implicito via digitos)
    const nums = blob.match(/-?\d[\d.]*(?:,\d+)?/g) || [];
    const obj = {};
    nums.forEach((n, i) => { obj[String(i).padStart(4, '0')] = n; });
    return obj;
  });
}

function ordenarChaves(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

async function main() {
  const { out: OUT, base: BASE } = parseArgs(process.argv);
  const { chromium } = await carregarPlaywright();

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // 1. Estabelecer origem e autenticar (a senha e cosmetica no core pinado).
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => localStorage.setItem('atlas_platform_v1', JSON.stringify({
    v: 1, auth: { sessionUntil: Date.now() + 864e5 }, ui: { selectedMonth: '2026-06' },
  })));
  await page.goto(`${BASE}/index.html#/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1800); // compile do Babel + primeiro render

  // 2. Confirmar DADO REAL. Sem overlay, o app cai no demo e a rede nao tem valor.
  const diag = await page.evaluate(() => {
    const D = window._AtlasRealData || {};
    const A = window.AtlasData || {};
    return {
      realPortfolios: (D.portfolios || []).length,
      months: A.MONTHS || [],
      current: A.CURRENT_MONTH,
      selectExiste: !!document.querySelector('#global-month-select'),
    };
  });
  if (!diag.realPortfolios) {
    console.error('ABORTADO: dado real ausente (window._AtlasRealData vazio). O app caiu no demo.');
    console.error('Confirme que verificacao-carteiras/platform-data-real.js esta no working tree.');
    await browser.close();
    process.exit(3);
  }
  if (!diag.selectExiste) {
    console.error('ABORTADO: seletor de mes (#global-month-select) nao encontrado. App nao autenticou?');
    await browser.close();
    process.exit(3);
  }
  const mesesValidos = MESES.filter((m) => diag.months.includes(m));
  const mesesInvalidos = MESES.filter((m) => !diag.months.includes(m));
  if (mesesInvalidos.length) {
    console.error(`ABORTADO: meses ausentes em AtlasData.MONTHS: ${mesesInvalidos.join(', ')}`);
    await browser.close();
    process.exit(3);
  }
  console.log(`dado real ok: ${diag.realPortfolios} carteiras reais, ${mesesValidos.length} meses a capturar`);
  console.log(`destino: ${OUT}`);

  let escritos = 0;
  for (const mes of mesesValidos) {
    // Trocar o mes pela UI (dispara onChange do React; recarregar nao releria o mes).
    await page.selectOption('#global-month-select', mes);
    await page.waitForTimeout(1000);

    // code real deterministico: primeiro code real (ordenado) com row valido no mes.
    const code = await page.evaluate((m) => {
      const D = window.AtlasData;
      const reais = (window._AtlasRealData?.portfolios || []).map((p) => p.code).sort();
      for (const c of reais) { if (D.getRow(c, m)) return c; }
      for (const p of [...D.CATALOG].sort((a, b) => (a.code < b.code ? -1 : 1))) {
        if (D.getRow(p.code, m)) return p.code;
      }
      return null;
    }, mes);

    const dirMes = path.join(OUT, mes);
    fs.mkdirSync(dirMes, { recursive: true });

    for (const pag of PAGINAS) {
      const rota = pag.rota(code);
      // Navegar por hash (SPA ja montado; preserva o mes selecionado).
      await page.evaluate((h) => { window.location.hash = h; }, rota);
      await page.waitForTimeout(1200); // re-render + ticks de grafico

      const numeros = ordenarChaves(await extrairNumeros(page));
      const arq = path.join(dirMes, `${pag.id}.json`);
      fs.writeFileSync(arq, JSON.stringify(numeros, null, 2) + '\n');
      escritos++;
    }
    console.log(`  ${mes}: 12 paginas (code=${code})`);
  }

  await browser.close();
  console.log(`\nok: ${escritos} snapshots (${mesesValidos.length} meses x ${PAGINAS.length} paginas)`);
}

main().catch((e) => { console.error('FALHA:', e && e.message ? e.message : e); process.exit(1); });
