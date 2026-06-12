/**
 * Testes mínimos de integridade — ATLAS Wealth Verification
 * Roda em Node.js >= 18, sem framework externo.
 * Uso: node tests/validate.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const P    = require('../platform-parsers.js');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;

function ok(desc, cond, detail) {
  if (cond) {
    process.stdout.write(`  ok  ${desc}\n`);
    pass++;
  } else {
    process.stderr.write(`FAIL  ${desc}${detail ? ' — ' + detail : ''}\n`);
    fail++;
  }
}

// ─── 1. index.html ─────────────────────────────────────────────────────────

const indexPath = path.join(ROOT, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

ok('index.html existe e não está vazio', indexHtml.length > 100);
ok('charset utf-8 declarado', /charset\s*=\s*["']?utf-8/i.test(indexHtml));
ok('lang pt-BR declarado', indexHtml.includes('lang="pt-BR"'));

// Todos os scripts locais (sem CDN) devem existir como arquivo
const localScripts = [...indexHtml.matchAll(/src="([^"h][^"?]*)(?:\?[^"]*)?"/g)]
  .map(m => m[1])
  .filter(s => !s.startsWith('http'));

ok('index.html lista scripts locais', localScripts.length > 0,
  `encontrados: ${localScripts.length}`);

for (const src of localScripts) {
  const fp = path.join(ROOT, src);
  ok(`arquivo referenciado existe: ${src}`, fs.existsSync(fp));
}

// ─── 2. Encoding — sem mojibake ────────────────────────────────────────────

const MOJIBAKE = /Ã[©ª«®¡â€\xa3\xa0\xba]|Â[·»«\xa0]|â€[œ\x9d\x94\x93]|VerificaÃ|grÃ¡ficos|estÃ¡tico|ÃšLTIMO/;

const platformFiles = fs.readdirSync(ROOT)
  .filter(f => f.startsWith('platform-') || f === 'index.html');

for (const fn of platformFiles) {
  const content = fs.readFileSync(path.join(ROOT, fn), 'utf8');
  const hit = content.match(MOJIBAKE);
  ok(`sem mojibake: ${fn}`, !hit, hit ? `encontrado: "${hit[0]}"` : '');
}

// ─── 3. platform-data.js — estrutura mínima ────────────────────────────────

const dataContent = fs.readFileSync(path.join(ROOT, 'platform-data.js'), 'utf8');

ok('platform-data.js define window.AtlasData', dataContent.includes('window.AtlasData'));
ok('platform-data.js define MONTHS', dataContent.includes('MONTHS'));
ok('platform-data.js define comparative()', dataContent.includes('function comparative'));
ok('platform-data.js exporta validate', dataContent.includes('validate: validate') || dataContent.includes('validate:validate'));

// Verifica que validate() existe como função
ok('validate() é função em platform-data.js',
  /function validate\s*\(/.test(dataContent));

// ─── 4. platform-app.jsx — estrutura mínima ────────────────────────────────

const appContent = fs.readFileSync(path.join(ROOT, 'platform-app.jsx'), 'utf8');

ok('LoginScreen definida em platform-app.jsx', appContent.includes('function LoginScreen'));
ok('ReactDOM.createRoot ou render presente',
  appContent.includes('createRoot') || appContent.includes('ReactDOM.render'));

// ─── 5. platform-comparativo.jsx — Fix 1 presente ─────────────────────────

const compContent = fs.readFileSync(path.join(ROOT, 'platform-comparativo.jsx'), 'utf8');

ok('useEffect importado em platform-comparativo.jsx',
  /useEffect/.test(compContent));
ok('getPrevMonth definida em platform-comparativo.jsx',
  /function getPrevMonth/.test(compContent));
ok('useEffect sincroniza selectedMonth',
  /useEffect\s*\(\s*\(\s*\)\s*=>/.test(compContent));

// ─── 6. platform-data.js — Fix 2 (top5Quedas filtra plA>0) ────────────────

ok('top5Quedas filtra plA > 0',
  /top5Quedas.*filter.*plA\s*>\s*0/.test(dataContent.replace(/\s+/g, ' ')));

// ─── 7. index.html — SRI integrity nos scripts CDN sem SRI original ─────────

ok('prop-types tem integrity no index.html',
  /prop-types[^<]+integrity\s*=\s*"sha384-/.test(indexHtml.replace(/\s+/g, ' ')));

ok('Recharts tem integrity no index.html',
  /recharts[^<]+integrity\s*=\s*"sha384-/i.test(indexHtml.replace(/\s+/g, ' ')));

// ─── 8. README — conteúdo mínimo ────────────────────────────────────────────

const readmePath = path.join(ROOT, 'README.md');
ok('README.md existe', fs.existsSync(readmePath));

if (fs.existsSync(readmePath)) {
  const readme = fs.readFileSync(readmePath, 'utf8');
  ok('README menciona dados sintéticos/demo',
    /demo|sint[eé]tico/i.test(readme));
  ok('README menciona que dados reais\/LGPD ficam fora do Git',
    /LGPD|dados reais|fora do Git|ignorad/i.test(readme));
  ok('README menciona a senha demo atlas2026',
    /atlas2026/.test(readme));
}

// ─── 9. platform-risco.jsx — estrutura mínima ───────────────────────────────

const riscoPath = path.join(ROOT, 'platform-risco.jsx');
const riscoExists = fs.existsSync(riscoPath);
ok('platform-risco.jsx existe', riscoExists);
const riscoContent = riscoExists ? fs.readFileSync(riscoPath, 'utf8') : '';
ok('AtlasPages.Risco registrado em platform-risco.jsx',
  riscoContent.includes('AtlasPages.Risco'));
ok('rota /risco em platform-app.jsx',
  /['"]\/risco['"]/.test(appContent));
ok('navegação contém Risco em platform-app.jsx',
  /label:\s*['"]Radar de Risco['"]/.test(appContent));
ok('AtlasData.riskDashboard exportado',
  dataContent.includes('riskDashboard:'));
ok('AtlasData.riskStress exportado',
  dataContent.includes('riskStress:'));
ok('AtlasData.importPortfolioData exportado',
  dataContent.includes('importPortfolioData:'));
ok('AtlasData.restoreDemo exportado',
  dataContent.includes('restoreDemo:'));
ok('AtlasData.getDataMode exportado',
  dataContent.includes('getDataMode:'));
ok('importPortfolioData() é função em platform-data.js',
  /function importPortfolioData\s*\(/.test(dataContent));
ok('restoreDemo() é função em platform-data.js',
  /function restoreDemo\s*\(/.test(dataContent));

// ─── 9b. platform-import.jsx — UI de importação ─────────────────────────────

const importContent = fs.readFileSync(path.join(ROOT, 'platform-import.jsx'), 'utf8');

ok('platform-import.jsx referencia AtlasParsers',
  importContent.includes('AtlasParsers'));
ok('platform-import.jsx chama importPortfolioData',
  importContent.includes('importPortfolioData'));
ok('platform-app.jsx registra listener atlas:datachange',
  appContent.includes("'atlas:datachange'") || appContent.includes('"atlas:datachange"'));

// ─── 9c. Wiring — index.html carrega parsers + template CSV ─────────────────

ok('index.html carrega platform-parsers.js',
  indexHtml.includes('platform-parsers.js'));

ok('docs/templates/atlas_template.csv existe',
  fs.existsSync(path.join(ROOT, 'docs', 'templates', 'atlas_template.csv')));

// ─── 10. platform-parsers.js — parseCSV e parseImportRows ───────────────────

const VALID_MONTHS = [
  '2025-01','2025-02','2025-03','2025-04','2025-05','2025-06',
  '2025-07','2025-08','2025-09','2025-10','2025-11','2025-12',
  '2026-01','2026-02','2026-03','2026-04'
];

ok('platform-parsers.js carrega em Node', P && typeof P.parseCSV === 'function' &&
  typeof P.parseImportRows === 'function');

ok('constantes exportadas sem mojibake',
  P.VALID_CLASSES.indexOf('RF Pós-Fixado') !== -1 &&
  P.VALID_CLASSES.indexOf('Ações') !== -1 &&
  P.VALID_CLASSES.indexOf('Previdência') !== -1 &&
  P.VALID_CLASSES.indexOf('RF Inflação') !== -1);

// --- parseCSV: BOM + campo entre aspas com vírgula + quebra CRLF ---
const csvText = '﻿codigo,nome,obs\r\n' +
  'C1,"Fundo, Especial","linha1"\r\n' +
  'C2,Simples,ok\n';
const csvRows = P.parseCSV(csvText);

ok('parseCSV retorna nº de linhas correto', csvRows.length === 2,
  `obtido: ${csvRows.length}`);
ok('parseCSV remove BOM do header', Object.keys(csvRows[0]).indexOf('codigo') === 0,
  `headers: ${Object.keys(csvRows[0]).join('|')}`);
ok('parseCSV preserva vírgula dentro de aspas',
  csvRows[0].nome === 'Fundo, Especial', `obtido: "${csvRows[0].nome}"`);

// --- parseImportRows: fixture VÁLIDA (2 carteiras, uma com 2 meses) ---
const validRows = [
  // Carteira A — 2026-03, 2 ativos
  { codigo:'A1', nome:'Carteira Alfa', perfil:'moderado', mes:'2026-03', pl:'1000000',
    rentabilidade_pct:'0.0095', status:'LIBERAR', classe:'RF Pós-Fixado', ativo:'Fundo DI', pct_alocacao:'0.6' },
  { codigo:'A1', nome:'Carteira Alfa', perfil:'moderado', mes:'2026-03', pl:'1000000',
    rentabilidade_pct:'0.0095', status:'LIBERAR', classe:'Ações', ativo:'Fundo Ações', pct_alocacao:'0.4' },
  // Carteira A — 2026-04 (segundo mês), 1 ativo
  { codigo:'A1', nome:'Carteira Alfa', perfil:'moderado', mes:'2026-04', pl:'1050000',
    rentabilidade_pct:'0.012', status:'COM ALERTA', classe:'Multimercado', ativo:'Fundo MM', pct_alocacao:'1' },
  // Carteira B — 2026-04, 2 ativos
  { codigo:'B2', nome:'Carteira Beta', perfil:'agressivo', mes:'2026-04', pl:'2500000',
    rentabilidade_pct:'-0.003', status:'CORRIGIR', classe:'Internacional', ativo:'ETF Global', pct_alocacao:'0.7' },
  { codigo:'B2', nome:'Carteira Beta', perfil:'agressivo', mes:'2026-04', pl:'2500000',
    rentabilidade_pct:'-0.003', status:'CORRIGIR', classe:'FII', ativo:'FII Logística', pct_alocacao:'0.3' }
];

const okRes = P.parseImportRows(validRows, { validMonths: VALID_MONTHS });

ok('fixture válida sem erros', okRes.errors.length === 0,
  `errors: ${okRes.errors.join(' | ')}`);
ok('fixture válida gera 2 portfolios', okRes.portfolios.length === 2,
  `obtido: ${okRes.portfolios.length}`);
ok('carteira A1 tem 2 meses',
  okRes.portfolios[0] && Object.keys(okRes.portfolios[0].months).length === 2);
ok('carteira A1/2026-03 tem 2 ativos na composição',
  okRes.portfolios[0].months['2026-03'].composition.length === 2);
ok('perfil normalizado para valor canônico',
  okRes.portfolios[0].risk === 'moderado' && okRes.portfolios[1].risk === 'agressivo');
const compA = okRes.portfolios[0].months['2026-03'].composition;
const sumA = compA.reduce((acc, c) => acc + c.pct, 0);
ok('soma de pct ≈ 1 na carteira A1/2026-03', Math.abs(sumA - 1) < 1e-9,
  `soma: ${sumA}`);

// --- parseImportRows: fixture INVÁLIDA (um erro por categoria) ---
const badRows = [
  // perfil inválido
  { codigo:'X1', nome:'Ruim Perfil', perfil:'inexistente', mes:'2026-04', pl:'1000',
    rentabilidade_pct:'0.01', status:'LIBERAR', classe:'CDB', ativo:'CDB Banco', pct_alocacao:'1' },
  // classe inválida
  { codigo:'X2', nome:'Ruim Classe', perfil:'moderado', mes:'2026-04', pl:'1000',
    rentabilidade_pct:'0.01', status:'LIBERAR', classe:'Cripto', ativo:'Bitcoin', pct_alocacao:'1' },
  // status inválido
  { codigo:'X3', nome:'Ruim Status', perfil:'moderado', mes:'2026-04', pl:'1000',
    rentabilidade_pct:'0.01', status:'TALVEZ', classe:'CDB', ativo:'CDB Banco', pct_alocacao:'1' },
  // pl <= 0
  { codigo:'X4', nome:'Ruim PL', perfil:'moderado', mes:'2026-04', pl:'0',
    rentabilidade_pct:'0.01', status:'LIBERAR', classe:'CDB', ativo:'CDB Banco', pct_alocacao:'1' },
  // mes fora de faixa
  { codigo:'X5', nome:'Ruim Mes', perfil:'moderado', mes:'2030-01', pl:'1000',
    rentabilidade_pct:'0.01', status:'LIBERAR', classe:'CDB', ativo:'CDB Banco', pct_alocacao:'1' }
];

const badRes = P.parseImportRows(badRows, { validMonths: VALID_MONTHS });

ok('fixture inválida gera erros', badRes.errors.length > 0,
  `errors: ${badRes.errors.length}`);
ok('erro de perfil inválido detectado',
  badRes.errors.some(e => /Perfil inválido/i.test(e)));
ok('erro de classe inválida detectado',
  badRes.errors.some(e => /Classe inválida/i.test(e)));
ok('erro de status inválido detectado',
  badRes.errors.some(e => /Status inválido/i.test(e)));
ok('erro de PL inválido detectado',
  badRes.errors.some(e => /PL inválido/i.test(e)));
ok('erro de mês fora de faixa detectado',
  badRes.errors.some(e => /fora da faixa suportada/i.test(e)));

// --- coluna obrigatória ausente → erro único e portfolios vazio ---
const missingColRes = P.parseImportRows(
  [{ codigo:'Z1', nome:'Sem Status', perfil:'moderado', mes:'2026-04', pl:'1000',
     rentabilidade_pct:'0.01', classe:'CDB', ativo:'CDB', pct_alocacao:'1' }],
  { validMonths: VALID_MONTHS });
ok('coluna ausente → portfolios vazio e erro listando faltante',
  missingColRes.portfolios.length === 0 &&
  missingColRes.errors.some(e => /status/i.test(e)));

// --- parseCSV: aspa literal no meio de campo não-quoted (bug RFC4180) ---
const csvQuoteMid = P.parseCSV('a,b,c\nx,Tela 27" cm,z\n');
ok('parseCSV: aspa no meio de campo não engole o delimitador',
  csvQuoteMid.length === 1 && Object.keys(csvQuoteMid[0]).length === 3,
  `linhas: ${csvQuoteMid.length}, campos: ${csvQuoteMid[0] ? Object.keys(csvQuoteMid[0]).length : 0}`);
ok('parseCSV: aspa literal preservada no campo do meio',
  csvQuoteMid[0] && csvQuoteMid[0].b === 'Tela 27" cm',
  `obtido b: "${csvQuoteMid[0] ? csvQuoteMid[0].b : ''}"`);
ok('parseCSV: campo seguinte à aspa preservado',
  csvQuoteMid[0] && csvQuoteMid[0].c === 'z',
  `obtido c: "${csvQuoteMid[0] ? csvQuoteMid[0].c : ''}"`);

// aspa não-fechada no fim de campo não pode consumir a linha seguinte
const csvUnterminated = P.parseCSV('a,b\n1,2"\n3,4\n');
ok('parseCSV: aspa não-fechada não engole a linha seguinte',
  csvUnterminated.length === 2,
  `linhas de dados: ${csvUnterminated.length}`);

// --- parseImportRows: toNumber com campo só-espaço gera ERRO de PL ---
const blankPlRes = P.parseImportRows([
  { codigo:'SP1', nome:'PL Espaco', perfil:'moderado', mes:'2026-04', pl:'   ',
    rentabilidade_pct:'0.01', status:'LIBERAR', classe:'CDB', ativo:'CDB Banco', pct_alocacao:'1' }
], { validMonths: VALID_MONTHS });
ok('PL só-espaço gera erro (não passa como 0)',
  blankPlRes.errors.some(e => /PL inválido/i.test(e)),
  `errors: ${blankPlRes.errors.join(' | ')}`);

// --- parseImportRows: warning de normalização de pct (soma ≠ 1) ---
const normRes = P.parseImportRows([
  { codigo:'N1', nome:'Normaliza', perfil:'moderado', mes:'2026-04', pl:'1000',
    rentabilidade_pct:'0.01', status:'LIBERAR', classe:'CDB', ativo:'CDB A', pct_alocacao:'0.5' },
  { codigo:'N1', nome:'Normaliza', perfil:'moderado', mes:'2026-04', pl:'1000',
    rentabilidade_pct:'0.01', status:'LIBERAR', classe:'Ações', ativo:'Ação B', pct_alocacao:'0.3' }
], { validMonths: VALID_MONTHS });
ok('soma de pct ≠ 1 não gera erro mas gera warning',
  normRes.errors.length === 0 && normRes.warnings.length >= 1,
  `errors: ${normRes.errors.length}, warnings: ${normRes.warnings.length}`);
const normComp = normRes.portfolios[0] && normRes.portfolios[0].months['2026-04'].composition;
const normSum = normComp ? normComp.reduce((acc, c) => acc + c.pct, 0) : NaN;
ok('composição normalizada soma ≈ 1', Math.abs(normSum - 1) < 1e-9,
  `soma: ${normSum}`);

// --- parseImportRows: warning de divergência de campos de carteira ---
const divRes = P.parseImportRows([
  { codigo:'D1', nome:'Nome Original', perfil:'moderado', mes:'2026-04', pl:'1000',
    rentabilidade_pct:'0.01', status:'LIBERAR', classe:'CDB', ativo:'CDB A', pct_alocacao:'0.5' },
  { codigo:'D1', nome:'Nome Divergente', perfil:'moderado', mes:'2026-04', pl:'1000',
    rentabilidade_pct:'0.01', status:'LIBERAR', classe:'Ações', ativo:'Ação B', pct_alocacao:'0.5' }
], { validMonths: VALID_MONTHS });
ok('divergência de campos de carteira gera warning',
  divRes.warnings.some(w => /Divergência/i.test(w)),
  `warnings: ${divRes.warnings.join(' | ')}`);
ok('valores usados são os da primeira linha (nome)',
  divRes.portfolios[0] && divRes.portfolios[0].name === 'Nome Original',
  `name: ${divRes.portfolios[0] ? divRes.portfolios[0].name : ''}`);

// ─── 11. platform-parsers.js — parser de PDF (books Mirabaud) ───────────────

ok('parseBRNumber/reconstructPdfLines/parseMirabaudBook exportados',
  typeof P.parseBRNumber === 'function' &&
  typeof P.reconstructPdfLines === 'function' &&
  typeof P.parseMirabaudBook === 'function');

// --- parseBRNumber ---
ok('parseBRNumber: milhar + decimal pt-BR', P.parseBRNumber('1.234,56') === 1234.56);
ok('parseBRNumber: negativo', P.parseBRNumber('-3,54') === -3.54);
ok('parseBRNumber: inteiro simples', P.parseBRNumber('5') === 5);
ok('parseBRNumber: "100,00"', P.parseBRNumber('100,00') === 100);
ok('parseBRNumber: "--" → null', P.parseBRNumber('--') === null);
ok('parseBRNumber: vazio → null', P.parseBRNumber('  ') === null);
ok('parseBRNumber: texto → null', P.parseBRNumber('CDI') === null);
ok('parseBRNumber: data → null', P.parseBRNumber('12/04/2027') === null);
ok('parseBRNumber: percent com símbolo → null', P.parseBRNumber('120,00%') === null);

// --- reconstructPdfLines: página rotacionada 90° (transform real dos books) ---
const ROT = Math.PI / 2;
const pdfItems = [
  { str: 'World',  x: 100, y: 90, rot: ROT },
  { str: 'Hello',  x: 100, y: 50, rot: ROT },
  { str: 'Linha1', x: 80,  y: 50, rot: ROT },
  { str: '  ',     x: 80,  y: 70, rot: ROT },   // whitespace ignorado
];
const recLines = P.reconstructPdfLines(pdfItems);
ok('reconstructPdfLines: 2 linhas reconstruídas', recLines.length === 2,
  `obtido: ${JSON.stringify(recLines)}`);
ok('reconstructPdfLines: ordem de leitura dentro da linha',
  recLines[1] === 'Hello World', `obtido: "${recLines[1]}"`);
ok('reconstructPdfLines: ordem das linhas (topo primeiro)',
  recLines[0] === 'Linha1', `obtido: "${recLines[0]}"`);

// --- parseMirabaudBook: fixture sintética no layout real (dados fictícios) ---
const BOOK_OK = [
  // pág 1 — capa
  ['Relatório Mensal', '30/04/2026', 'XPTO'],
  // pág 2 — Asset Allocation + índices
  [
    'Data Extrato: 30/04/2026',
    'Asset Allocation $ % Histórico Asset Allocation',
    'Liquidez 500.000,00 50,00',
    'Prefixado 300.000,00 30,00',
    'RV Global 200.000,00 20,00',
    'TOTAL 1.000.000,00 100,00',
    'Índice Abr/2026 2026 12M 24M',
    'CDI 1,09 4,54 14,83 27,97',
  ],
  // pág 3 — Rentabilidades Mensais
  [
    'Data Extrato: 30/04/2026',
    'Rentabilidades Mensais da Carteira',
    'Ano Jan Fev Mar Abr Mai Jun Jul Ago Set Out Nov Dez Rent.Ano o',
    '2025 -- -- 0,50 1,00 1,00 1,00 1,00 1,00 1,00 1,00 1,00 1,00 9,90 9,90',
    '2026 1,00 1,00 1,00 1,25 -- -- -- -- -- -- -- -- 4,30 14,60',
  ],
  // pág 4 — conciliação por ativo
  [
    'Data Extrato: 30/04/2026',
    'Provisão',
    'Saldo Anterior Aplicações Resgates Eventos Imposto Saldo Líquido',
    'Ativos Instituição Saldo Bruto de Part.%',
    '(31/03/2026) Compras Vendas Financeiros Pago (30/04/2026)',
    'IR+IOF',
    'Liquidez 490.000,00 0,00 0,00 0,00 0,00 500.000,00 0,00 500.000,00 50,00',
    'FUNDO TESTE DI BTG 490.000,00 0,00 0,00 0,00 0,00 500.000,00 0,00 500.000,00 50,00',
    'Prefixado 244.000,00 0,00 51.000,00 0,00 0,00 300.000,00 0,00 300.000,00 30,00',
    'CDB BANCO FICTICIO 13,00% Vencto:',
    'BTG 295.000,00 0,00 0,00 0,00 0,00 300.000,00 0,00 300.000,00 30,00',
    '01/01/2030',
    'ATIVO ZERADO BTG 50.000,00 0,00 51.000,00 0,00 0,00 0,00 0,00 0,00 0,00',
    'RV Global 196.000,00 0,00 0,00 0,00 0,00 200.000,00 0,00 200.000,00 20,00',
    'ETF FICTICIO BTG CORRETORA 196.000,00 0,00 0,00 0,00 0,00 200.000,00 0,00 200.000,00 20,00',
    'TOTAL 981.000,00 0,00 51.000,00 0,00 0,00 1.000.000,00 0,00 1.000.000,00 100,00',
    '4 © Powered by',
  ],
];

const bookRes = P.parseMirabaudBook(BOOK_OK, {
  validMonths: VALID_MONTHS, fileName: 'Book_XPTO_2026_04.pdf'
});

ok('book sintético: confiança alta e sem erros',
  bookRes.confidence === 'alta' && bookRes.errors.length === 0,
  `confidence: ${bookRes.confidence}; errors: ${bookRes.errors.join(' | ')}`);
ok('book sintético: portfolio presente', !!bookRes.portfolio);

const bp = bookRes.portfolio || { months: {} };
ok('book sintético: code da capa', bp.code === 'XPTO', `code: ${bp.code}`);
ok('book sintético: mês 2026-04', !!bp.months['2026-04']);
const bm = bp.months['2026-04'] || {};
ok('book sintético: PL do TOTAL', bm.pl === 1000000, `pl: ${bm.pl}`);
ok('book sintético: rentabilidade do mês (1,25% → 0.0125)',
  Math.abs(bm.ret - 0.0125) < 1e-9, `ret: ${bm.ret}`);
ok('book sintético: status fixo COM ALERTA', bm.status === 'COM ALERTA');
ok('book sintético: perfil default moderado', bp.risk === 'moderado');

const bComp = bm.composition || [];
ok('book sintético: 3 ativos (zerado excluído)', bComp.length === 3,
  `ativos: ${bComp.map(c => c.name).join(' | ')}`);
ok('book sintético: soma de pct ≈ 1',
  Math.abs(bComp.reduce((a, c) => a + c.pct, 0) - 1) < 1e-9);
ok('book sintético: Prefixado mapeado para CDB',
  bComp.some(c => c.cls === 'CDB'));
ok('book sintético: RV Global mapeado para Internacional',
  bComp.some(c => c.cls === 'Internacional'));
ok('book sintético: stitching de nome multi-linha (Vencto + data)',
  bComp.some(c => c.name === 'CDB BANCO FICTICIO 13,00% Vencto: 01/01/2030'),
  `nomes: ${bComp.map(c => c.name).join(' | ')}`);
ok('book sintético: sufixo de custódia removido do nome',
  bComp.some(c => c.name === 'ETF FICTICIO') && bComp.some(c => c.name === 'FUNDO TESTE DI'),
  `nomes: ${bComp.map(c => c.name).join(' | ')}`);
ok('book sintético: warnings de status e perfil default',
  bookRes.warnings.some(w => /COM ALERTA/.test(w)) &&
  bookRes.warnings.some(w => /perfil/i.test(w)));
ok('book sintético: warning de mapeamento de classe',
  bookRes.warnings.some(w => /Prefixado/.test(w)) &&
  bookRes.warnings.some(w => /RV Global/.test(w)));

// --- book degradado (sem TOTAL nem conciliação) → revisão manual ---
const BOOK_BAD = [
  ['Relatório Mensal', '30/04/2026', 'RUIM'],
  ['Data Extrato: 30/04/2026', 'Asset Allocation $ %', 'Liquidez 1.000,00 100,00'],
];
const badBook = P.parseMirabaudBook(BOOK_BAD, {
  validMonths: VALID_MONTHS, fileName: 'Book_RUIM_2026_04.pdf'
});
ok('book degradado: confiança baixa e portfolio null',
  badBook.confidence === 'baixa' && badBook.portfolio === null);
ok('book degradado: erro pede revisão manual',
  badBook.errors.some(e => /revisão manual necessária/i.test(e)),
  `errors: ${badBook.errors.join(' | ')}`);

// --- book com mês fora da faixa suportada → erro, sem portfolio ---
const BOOK_OOR = BOOK_OK.map(pg => pg.map(s => s.replace(/30\/04\/2026/g, '31/07/2027')));
const oorBook = P.parseMirabaudBook(BOOK_OOR, {
  validMonths: VALID_MONTHS, fileName: 'Book_XPTO_2027_07.pdf'
});
ok('book com mês fora da faixa: erro e portfolio null',
  oorBook.portfolio === null &&
  oorBook.errors.some(e => /fora da faixa suportada/i.test(e)),
  `errors: ${oorBook.errors.join(' | ')}`);

// ─── 12. Importação de PDF — estrutura da UI e docs ─────────────────────────

ok('platform-import.jsx aceita .pdf no input',
  /accept="[^"]*\.pdf/.test(importContent));
ok('platform-import.jsx tem loadPdfJs com SRI (integrity)',
  importContent.includes('loadPdfJs') && /PDFJS[^]*?sha512-/.test(importContent));
ok('platform-import.jsx usa parseMirabaudBook e reconstructPdfLines',
  importContent.includes('parseMirabaudBook') && importContent.includes('reconstructPdfLines'));
ok('platform-import.jsx tem bloco de revisão manual',
  /[Rr]evisão manual/.test(importContent));
ok('platform-import.jsx tem prévia do texto extraído',
  /texto extraído/i.test(importContent));

if (fs.existsSync(readmePath)) {
  const readme2 = fs.readFileSync(readmePath, 'utf8');
  ok('README documenta PDF como beta/experimental',
    /PDF/.test(readme2) && /beta|experimental/i.test(readme2));
}

// ─── Resultado ──────────────────────────────────────────────────────────────

const total = pass + fail;
process.stdout.write(`\n${pass}/${total} checks OK`);
if (fail > 0) {
  process.stderr.write(` — ${fail} falhou(aram)\n`);
  process.exit(1);
} else {
  process.stdout.write(' — todos os checks passaram\n');
}
