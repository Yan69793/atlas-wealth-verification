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

// Novo contrato de carga (build Vite): a lista de scripts Babel do index.html
// virou ordem de import em src/main.jsx. Estes checks substituem a exigência
// antiga de "cada página tem sua tag de script no index.html".
ok('index.html usa entry de módulo único (sem Babel no browser)',
  /<script\b[^>]*type="module"[^>]*src="\/src\/main\.jsx"/.test(indexHtml));

ok('index.html não referencia mais Babel Standalone',
  !/text\/babel/.test(indexHtml) && !/babel\.min\.js/.test(indexHtml));

ok('index.html não depende de CDN no caminho de carga',
  !/(unpkg\.com|jsdelivr\.net|cdnjs\.cloudflare\.com|cdn\.sheetjs\.com)/.test(indexHtml));

ok('index.html não usa React de desenvolvimento',
  !/react\.development/.test(indexHtml));

ok('index.html mantém overlays opcionais com onerror tolerante',
  /platform-data-real\.js[^"]*"[^>]*onerror/.test(indexHtml) &&
  /platform-historico\.js[^"]*"[^>]*onerror/.test(indexHtml));

// Todos os scripts locais (sem CDN) devem existir como arquivo.
//
// Exceção: script declarado com onerror é overlay OPCIONAL. O dado real vive
// no repo da instância do cliente, não neste, que é o produto. Sem o overlay o
// app roda em modo demo — por isso o index.html tolera a ausência via
// onerror="void(0)". Exigir o arquivo aqui contradiz esse desenho e faz a
// suíte falhar num repo corretamente sem dado real.
const localScriptTags = [...indexHtml.matchAll(/<script\b[^>]*\bsrc="([^"h][^"?]*)(?:\?[^"]*)?"[^>]*>/g)]
  .filter(m => !m[1].startsWith('http'));

ok('index.html lista scripts locais', localScriptTags.length > 0,
  `encontrados: ${localScriptTags.length}`);

for (const m of localScriptTags) {
  const src = m[1];
  const fp = path.join(ROOT, src);
  if (/\bonerror\s*=/.test(m[0])) {
    ok(`overlay opcional tolera ausência: ${src}`, true,
      fs.existsSync(fp) ? 'presente' : 'ausente (modo demo)');
  } else {
    ok(`arquivo referenciado existe: ${src}`, fs.existsSync(fp));
  }
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

// UTF-8 BOM (EF BB BF) no início quebra JS no browser (Unexpected token).
// Windows PowerShell 5.x grava BOM com -Encoding UTF8 — trava a regressão.
function startsWithBom(absPath) {
  const buf = fs.readFileSync(absPath);
  return buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
}

const bomCandidates = [
  ...platformFiles.map(fn => path.join(ROOT, fn)),
  path.join(ROOT, 'relatorio-mensal.html'),
  path.join(ROOT, 'src', 'main.jsx'),
  path.join(ROOT, 'vite.config.mjs'),
  path.join(ROOT, 'scripts', 'generate-reports.ps1'),
].filter(p => fs.existsSync(p));

for (const abs of bomCandidates) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  ok(`sem BOM UTF-8: ${rel}`, !startsWithBom(abs));
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

// Verifica que MONTHS e MONTH_LABELS têm check de sync dentro do validate()
ok('validate() verifica sync MONTHS vs MONTH_LABELS',
  dataContent.includes('MONTHS.length === MONTH_LABELS.length'));

// Verifica que getCDI helper existe
ok('getCDI() definida em platform-data.js',
  /function getCDI\s*\(/.test(dataContent));

// ─── 4. platform-app.jsx — estrutura mínima ────────────────────────────────

const appContent = fs.readFileSync(path.join(ROOT, 'platform-app.jsx'), 'utf8');

// Antes se exigia `function LoginScreen` aqui. A tela saiu junto com a senha
// fixa: autenticação é do perímetro (Cloudflare Access), não deste app. O que
// importa checar é que o shell monta e roteia.
ok('ReactDOM.createRoot ou render presente',
  appContent.includes('createRoot') || appContent.includes('ReactDOM.render'));
ok('AppShell e roteador definidos em platform-app.jsx',
  /function AppShell/.test(appContent) && /function pageFromPath/.test(appContent));

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

// ─── 7. src/main.jsx — contrato de carga do bundle ──────────────────────────
//
// A ordem de import em src/main.jsx é o contrato de inicialização que
// substitui a lista de <script> do index.html antigo. Página lê
// window.AtlasData/AtlasUtils no topo do módulo; import fora de ordem = tela
// branca. Estes checks travam a regressão do contrato.

const mainJsxPath = path.join(ROOT, 'src', 'main.jsx');
const mainJsx = fs.existsSync(mainJsxPath) ? fs.readFileSync(mainJsxPath, 'utf8') : '';

ok('src/main.jsx existe', fs.existsSync(mainJsxPath));

const CONTRATO = [
  'platform-tokens.js',
  'platform-parsers.js',
  'platform-data.js',
  'platform-data-risk.js',
  'platform-historico-demo.js',
  'platform-oportunidades-demo.js',
  'platform-vencimentos-demo.js',
  'platform-caixa-parado-demo.js',
  'platform-receita-drop-demo.js',
  'platform-utils.jsx',
  'platform-dashboard.jsx',
  'platform-carteira.jsx',
  'platform-report.jsx',
  'platform-achados.jsx',
  'platform-oportunidades.jsx',
  'platform-vencimentos.jsx',
  'platform-caixa-parado.jsx',
  'platform-valor-assessor.jsx',
  'platform-visita.jsx',
  'platform-comparativo.jsx',
  'platform-custos.jsx',
  'platform-receitas.jsx',
  'platform-cadastro.jsx',
  'platform-busca.jsx',
  'platform-import.jsx',
  'platform-usuarios.jsx',
  'platform-risco.jsx',
  'platform-tendencia.jsx',
  'platform-app.jsx',
];

/* Busca pela instrução de import, não pelo nome solto: o cabeçalho do arquivo
   menciona nomes de módulo em comentário, e a checagem de ordem leria a
   menção como se fosse o import. */
const ordem = CONTRATO.map((f) => mainJsx.indexOf("import '../" + f + "'"));
ok('main.jsx importa todos os módulos do app',
  ordem.every((i) => i !== -1),
  CONTRATO.filter((f) => mainJsx.indexOf("import '../" + f + "'") === -1).join(', ') || 'ok');

const ordemOk = ordem.every((v, i) => i === 0 || v > ordem[i - 1]);
ok('ordem de import em main.jsx respeita o contrato (tokens antes de dados antes do shell)',
  ordemOk);

ok('shell é o último import (monta o ReactDOM)',
  mainJsx.trimEnd().endsWith("import '../platform-app.jsx';"));

ok('main.jsx faz shim de Recharts para as páginas de gráfico',
  /globalThis\.Recharts\s*=/.test(mainJsx));

ok('main.jsx não depende de CDN',
  !/(unpkg\.com|jsdelivr\.net|cdnjs\.cloudflare\.com)/.test(mainJsx));

// ─── 8. README — conteúdo mínimo ────────────────────────────────────────────

const readmePath = path.join(ROOT, 'README.md');
ok('README.md existe', fs.existsSync(readmePath));

if (fs.existsSync(readmePath)) {
  const readme = fs.readFileSync(readmePath, 'utf8');
  ok('README menciona dados sintéticos/demo',
    /demo|sint[eé]tico/i.test(readme));
  ok('README menciona que dados reais\/LGPD ficam fora do Git',
    /LGPD|dados reais|fora do Git|ignorad/i.test(readme));
}

// ─── 8b. Sem credencial fixa no código ──────────────────────────────────────
//
// O check anterior aqui EXIGIA que o README citasse a senha `atlas2026`, o que
// documentava a credencial em vez de questioná-la. A senha saiu: era comparada
// no navegador, ficava no bundle e no README, e sinalizava proteção sem
// proteger. Autenticação agora é do perímetro (Cloudflare Access).
//
// Este check é o inverso do antigo: garante que ela não volte.

const FONTES_APP = fs.readdirSync(ROOT)
  .filter(f => /^platform-.*\.(jsx|js)$/.test(f));

let comSenhaFixa = [];
for (const f of FONTES_APP) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  // Ignora linhas de comentário: os arquivos explicam por que a senha saiu.
  const codigo = src.split('\n')
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
  if (/atlas2026/.test(codigo)) comSenhaFixa.push(f);
}
ok('nenhuma senha fixa nos fontes do app', comSenhaFixa.length === 0,
  comSenhaFixa.length ? `encontrada em: ${comSenhaFixa.join(', ')}` : 'ok');

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
const riskFilePath = path.join(ROOT, 'platform-data-risk.js');
const riskFileContent = fs.existsSync(riskFilePath) ? fs.readFileSync(riskFilePath, 'utf8') : '';
ok('platform-data-risk.js existe', fs.existsSync(riskFilePath));
ok('AtlasData.riskDashboard definido em platform-data-risk.js',
  riskFileContent.includes('riskDashboard'));
ok('AtlasData.riskStress definido em platform-data-risk.js',
  riskFileContent.includes('riskStress'));
ok('AtlasData.getCDI exportado em platform-data.js',
  dataContent.includes('getCDI:'));
ok('AtlasData._internal exportado em platform-data.js',
  dataContent.includes('_internal:'));
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

// ─── 9c. Wiring — main.jsx carrega parsers + template CSV ───────────────────

ok('main.jsx importa platform-parsers.js (parser disponível no bundle)',
  mainJsx.includes('platform-parsers.js'));

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

// ─── 11. platform-parsers.js — parser de PDF (books SmartBrain) ────────────

ok('parseBRNumber/reconstructPdfLines/parseSmartBrainBook exportados',
  typeof P.parseBRNumber === 'function' &&
  typeof P.reconstructPdfLines === 'function' &&
  typeof P.parseSmartBrainBook === 'function');

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

// --- parseSmartBrainBook: fixture sintética no layout real (dados fictícios) ---
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

const bookRes = P.parseSmartBrainBook(BOOK_OK, {
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

// --- conciliação atravessando páginas: grupo no fim de uma, ativo na seguinte ---
const BOOK_MULTIPAGE = [
  ['Relatório Mensal', '30/04/2026', 'MPAG'],
  [
    'Data Extrato: 30/04/2026',
    'Asset Allocation $ % Histórico Asset Allocation',
    'Liquidez 500.000,00 50,00',
    'Ações 500.000,00 50,00',
    'TOTAL 1.000.000,00 100,00',
  ],
  [
    'Data Extrato: 30/04/2026',
    'Saldo Anterior Aplicações Resgates Eventos Imposto Saldo Líquido',
    'Ativos Instituição Saldo Bruto de Part.%',
    'IR+IOF',
    'Liquidez 490.000,00 0,00 0,00 0,00 0,00 500.000,00 0,00 500.000,00 50,00',
    'FUNDO TESTE DI BTG 490.000,00 0,00 0,00 0,00 0,00 500.000,00 0,00 500.000,00 50,00',
    // grupo abre no FIM desta página; o ativo dele vem na página seguinte
    'Ações 488.000,00 0,00 0,00 0,00 0,00 500.000,00 0,00 500.000,00 50,00',
  ],
  [
    'Data Extrato: 30/04/2026',
    'Saldo Anterior Aplicações Resgates Eventos Imposto Saldo Líquido',
    'Ativos Instituição Saldo Bruto de Part.%',
    'IR+IOF',
    'FUNDO ACOES TESTE BTG 488.000,00 0,00 0,00 0,00 0,00 500.000,00 0,00 500.000,00 50,00',
    'TOTAL 978.000,00 0,00 0,00 0,00 0,00 1.000.000,00 0,00 1.000.000,00 100,00',
  ],
];
const mpRes = P.parseSmartBrainBook(BOOK_MULTIPAGE, {
  validMonths: VALID_MONTHS, fileName: 'Book_MPAG_2026_04.pdf'
});
ok('grupo de classe persiste entre páginas da conciliação',
  mpRes.confidence === 'alta' && mpRes.portfolio &&
  mpRes.portfolio.months['2026-04'].composition.length === 2 &&
  mpRes.portfolio.months['2026-04'].composition.some(c => c.cls === 'Ações' && c.name === 'FUNDO ACOES TESTE'),
  `confidence: ${mpRes.confidence}; errors: ${mpRes.errors.join(' | ')}`);

// --- book degradado (sem TOTAL nem conciliação) → revisão manual ---
const BOOK_BAD = [
  ['Relatório Mensal', '30/04/2026', 'RUIM'],
  ['Data Extrato: 30/04/2026', 'Asset Allocation $ %', 'Liquidez 1.000,00 100,00'],
];
const badBook = P.parseSmartBrainBook(BOOK_BAD, {
  validMonths: VALID_MONTHS, fileName: 'Book_RUIM_2026_04.pdf'
});
ok('book degradado: confiança baixa e portfolio null',
  badBook.confidence === 'baixa' && badBook.portfolio === null);
ok('book degradado: erro pede revisão manual',
  badBook.errors.some(e => /revisão manual necessária/i.test(e)),
  `errors: ${badBook.errors.join(' | ')}`);

// --- book com mês fora da faixa suportada → erro, sem portfolio ---
const BOOK_OOR = BOOK_OK.map(pg => pg.map(s => s.replace(/30\/04\/2026/g, '31/07/2027')));
const oorBook = P.parseSmartBrainBook(BOOK_OOR, {
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
ok('platform-import.jsx carrega SheetJS com SRI (integrity)',
  /SHEETJS_SRI\s*=\s*'sha384-/.test(importContent));
ok('platform-import.jsx usa parseSmartBrainBook e reconstructPdfLines',
  importContent.includes('parseSmartBrainBook') && importContent.includes('reconstructPdfLines'));
ok('platform-import.jsx tem bloco de revisão manual',
  /[Rr]evisão manual/.test(importContent));
ok('platform-import.jsx tem prévia do texto extraído',
  /texto extraído/i.test(importContent));

if (fs.existsSync(readmePath)) {
  const readme2 = fs.readFileSync(readmePath, 'utf8');
  ok('README documenta PDF como beta/experimental',
    /PDF/.test(readme2) && /beta|experimental/i.test(readme2));
}

// ─── 13. Importação local — trava da afirmação comercial ────────────────────
//
// A página de importação diz ao prospect, na tela, que o arquivo dele não sai
// do navegador. Afirmação em texto apodrece: alguém acrescenta telemetria seis
// meses depois e o aviso vira mentira sem ninguém perceber. Estes checks são o
// que sustenta a frase.
//
// São duas metades porque uma sozinha dá falsa segurança. A primeira barra as
// primitivas óbvias de envio. A segunda existe porque o arquivo JÁ injeta
// script de propósito, para carregar SheetJS e pdf.js, então `script.src` com
// o dado embutido na URL é uma saída que a primeira metade não pega.

const FONTES_LOCAIS = ['platform-import.jsx', 'platform-parsers.js'];

// Descarta comentário: os arquivos citam essas palavras justamente para
// explicar por que não as usam, e o check leria a explicação como violação.
function semComentarios(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !/^\s*\/\//.test(l))
    .join('\n');
}

const comRede = [];
for (const f of FONTES_LOCAIS) {
  const codigo = semComentarios(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  if (/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/.test(codigo)) comRede.push(f);
}
ok('importação não usa primitiva de envio (fetch/XHR/sendBeacon/WebSocket/EventSource)',
  comRede.length === 0,
  comRede.length ? `encontrada em: ${comRede.join(', ')}` : 'ok');

// Toda atribuição de src tem de resolver para uma das constantes declaradas.
// URL literal nova, ou montada por concatenação, derruba o check.
const SRC_PERMITIDO = new Set(['SHEETJS_URL', 'PDFJS_URL', 'PDFJS_WORKER_URL', 'src']);
const codigoImport = semComentarios(importContent);
const atribuicoesSrc = [...codigoImport.matchAll(/\.src\s*=\s*([^;\n]+)/g)]
  .map(m => m[1].trim());
const srcForaDaLista = atribuicoesSrc.filter(v => !SRC_PERMITIDO.has(v));
ok('importação só injeta script a partir das constantes de URL declaradas',
  atribuicoesSrc.length > 0 && srcForaDaLista.length === 0,
  srcForaDaLista.length ? `fora da lista: ${srcForaDaLista.join(' | ')}`
    : `${atribuicoesSrc.length} atribuições, todas na lista`);

// `src` acima é o parâmetro de loadScriptSRI, que só é chamado com as duas
// URLs do pdf.js. Sem checar as chamadas, a lista aceitaria qualquer coisa.
const chamadasLoadSRI = [...codigoImport.matchAll(/loadScriptSRI\(\s*([A-Za-z0-9_]+)\s*,/g)]
  .map(m => m[1]);
const chamadasForaDaLista = chamadasLoadSRI.filter(v => !SRC_PERMITIDO.has(v));
ok('loadScriptSRI só é chamado com URL constante',
  chamadasLoadSRI.length > 0 && chamadasForaDaLista.length === 0,
  chamadasForaDaLista.length ? `fora da lista: ${chamadasForaDaLista.join(', ')}` : 'ok');

ok('página de importação afirma na tela que o arquivo não sai do navegador',
  /não sai do seu navegador/i.test(importContent));

ok('página de importação avisa que a leitura de PDF é calibrada para um fornecedor',
  /calibrada para o formato de um fornecedor/i.test(importContent));

// ─── 14. Faixa de demonstração — trava do aviso no layout raiz ──────────────
//
// O aviso vive no AppShell justamente para que rota nova o herde. Se ele
// voltar a ser posto página a página, ou sumir numa refatoração, o demo
// público passa a exibir número sintético sem dizer que é sintético.

// appContent já foi lido na seção 3.

ok('platform-app.jsx define DemoBanner',
  /function DemoBanner\s*\(/.test(appContent));

ok('DemoBanner é renderizado dentro do AppShell',
  /function AppShell[\s\S]*?<DemoBanner\s*\/>/.test(appContent));

ok('DemoBanner é condicionado ao modo de dados',
  /function DemoBanner[\s\S]{0,600}getDataMode/.test(appContent));

ok('faixa de demonstração diz que os dados são sintéticos',
  /Ambiente de demonstração/.test(appContent) && /são sintéticos/.test(appContent));

const cssContent = fs.readFileSync(path.join(ROOT, 'platform-styles.css'), 'utf8');

ok('CSS reserva altura da faixa via --demo-banner-h',
  /--demo-banner-h/.test(cssContent) && /\.demo-banner\s*\{/.test(cssContent));

// A lista de elementos escondidos na impressão é onde a faixa some por
// descuido: ela é chrome, e todo o resto do chrome está lá.
const blocoPrint = (cssContent.match(/@media print \{[\s\S]*$/) || [''])[0];
const regraOcultaChrome = (blocoPrint.match(/^[^{}]*\{\s*display:\s*none\s*!important/m) || [''])[0];
ok('faixa de demonstração não está na lista de itens ocultos na impressão',
  !/demo-banner/.test(regraOcultaChrome));

ok('relatório exportado carrega o aviso de demonstração',
  /rpt-demo/.test(fs.readFileSync(path.join(ROOT, 'platform-report.jsx'), 'utf8')));

// ─── 15. Mês de abertura do demo tem achado ─────────────────────────────────
//
// O demo abre em CURRENT_MONTH. Se esse mês não estiver no roteiro de status
// escrito à mão, ele cai no gerador pseudoaleatório, e já aconteceu de sair
// 40/40 LIBERAR. O prospect chega pela primeira tela e vê o produto declarando
// que não encontrou nada, o que é o oposto do que se quer mostrar.

// dataContent já foi lido antes; reaproveitado aqui.
const mesAbertura = (dataContent.match(/var CURRENT_MONTH\s*=\s*'([\d-]+)'/) || [])[1];

ok('platform-data.js declara CURRENT_MONTH', Boolean(mesAbertura), mesAbertura || 'não encontrado');

if (mesAbertura) {
  const noRoteiro = [...dataContent.matchAll(/setS\(\s*'[^']+'\s*,\s*'([\d-]+)'\s*,\s*'([^']+)'/g)]
    .filter(m => m[1] === mesAbertura);
  const corrigir = noRoteiro.filter(m => m[2] === 'CORRIGIR').length;
  const alerta = noRoteiro.filter(m => m[2] === 'COM ALERTA').length;

  ok(`mês de abertura (${mesAbertura}) tem achado no roteiro de status`,
    corrigir > 0 && alerta > 0,
    `CORRIGIR=${corrigir} COM ALERTA=${alerta}`);

  const janelaRecidiva = (dataContent.match(/var RECIDIVA_MONTHS\s*=\s*\[([^\]]+)\]/) || [])[1] || '';
  ok('janela de recidiva alcança o mês de abertura',
    janelaRecidiva.includes(mesAbertura),
    janelaRecidiva.includes(mesAbertura) ? 'ok' : `janela termina antes de ${mesAbertura}`);
}

// ─── 16. Marca neutra — o produto não assina com nome de casa ───────────────

ok('platform-tokens.js nasce com tenant vazio',
  /tenant:\s*''/.test(fs.readFileSync(path.join(ROOT, 'platform-tokens.js'), 'utf8')));

const comMarcaFixa = [];
for (const f of FONTES_APP) {
  const codigo = semComentarios(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  if (/Meridian Advisory/.test(codigo)) comMarcaFixa.push(f);
}
ok('nenhum nome de casa hardcoded nos fontes do app', comMarcaFixa.length === 0,
  comMarcaFixa.length ? `encontrado em: ${comMarcaFixa.join(', ')}` : 'ok');

ok('index.html não fixa nome de casa no <title>',
  !/Meridian Advisory/.test(indexHtml));

// ─── 17. Cartão de prévia do link comercial ────────────────────────────────
//
// O link do demo e o da apresentação circulam por WhatsApp e e-mail, e quem
// manda não vê o cartão que o outro lado recebe. Se o og:image apontar para um
// arquivo que não subiu, o Worker responde 200 servindo o HTML do demo no lugar
// da imagem: nenhum erro, nenhum 404, só um cartão sem figura do outro lado.
// A falha é invisível de dentro, então ela precisa travar aqui.

const CARD = 'docs/go-to-market/atlas-card.png';
const CARD_URL = 'https://demo.multi-assets.com/atlas-card.png';
const apresentacaoPath = path.join(ROOT, 'docs/go-to-market/apresentacao-atlas.html');
const apresentacaoHtml = fs.readFileSync(apresentacaoPath, 'utf8');

ok('cartão de prévia existe como arquivo', fs.existsSync(path.join(ROOT, CARD)), CARD);

ok('cartão tem tamanho de imagem, não de placeholder',
  fs.existsSync(path.join(ROOT, CARD)) && fs.statSync(path.join(ROOT, CARD)).size > 20_000);

for (const [nome, html] of [['index.html', indexHtml], ['apresentação', apresentacaoHtml]]) {
  const declarado = (html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/) || [])[1];

  ok(`${nome} declara og:image`, Boolean(declarado), declarado || 'ausente');

  ok(`og:image de ${nome} é URL absoluta`, /^https:\/\//.test(declarado || ''),
    'leitor de link não resolve caminho relativo');

  ok(`og:image de ${nome} aponta para o cartão publicado`, declarado === CARD_URL,
    `declarado: ${declarado}`);

  // summary_large_image sem imagem rende um cartão só de texto, que é pior do
  // que não declarar nada: promete figura grande e entrega vazio.
  const grande = /twitter:card"\s+content="summary_large_image"/.test(html);
  ok(`${nome} não promete cartão grande sem imagem`, !grande || Boolean(declarado));
}

// O build copia o cartão por declaração nominal, não porque o index o
// referencia: og:image usa content=, e a allowlist do build lê src/href.
// Se alguém tirar a declaração, o cartão some da publicação sem sintoma.
const buildDeploy = fs.readFileSync(path.join(ROOT, 'scripts/build-deploy.mjs'), 'utf8');
ok('build da publicação declara o cartão como binário liberado',
  new RegExp(`EXTRAS_BINARIO[\\s\\S]{0,400}${CARD.replace(/[./]/g, '\\$&')}`).test(buildDeploy));

// ─── 18. Artefato buildado (dist-app) — se existir, é verificado ────────────
//
// O build é opcional no portão (clone limpo não tem dist-app), mas quando
// existe ele TEM que estar limpo: é dele que scripts/build-deploy.mjs publica
// o demo. Overlay de dado real, binário ou marca de build dev aqui seria
// publicado sem que nenhum outro check visse.

const distDir = path.join(ROOT, 'dist-app');
const distIndexPath = path.join(distDir, 'index.html');

if (fs.existsSync(distIndexPath)) {
  const distHtml = fs.readFileSync(distIndexPath, 'utf8');

  ok('build: index.html gerado referencia asset com fingerprint',
    /(?:src|href)="\.\/assets\/[^"]+-[A-Za-z0-9_-]+\.(?:js|css)"/.test(distHtml));

  ok('build: sem tag de overlay no HTML gerado (dado real nunca entra no bundle)',
    !/platform-data-real\.js|platform-data-audit\.js|platform-historico\.js/.test(distHtml));

  ok('build: CSP presente e sem unsafe-eval',
    /Content-Security-Policy/.test(distHtml) && !/unsafe-eval/.test(distHtml));

  // A CSP tem de liberar exatamente o que o app usa em runtime: os lazy-loads
  // de Excel/PDF (com SRI) e as fontes do tema. CSP sem esses hosts passa no
  // check de cima e quebra a importação e a tipografia em produção.
  const cspAttr = (distHtml.match(/Content-Security-Policy"\s+content="([^"]+)"/) || [])[1] || '';
  ok('build: CSP libera os lazy-loads (SheetJS e pdf.js)',
    /cdn\.sheetjs\.com/.test(cspAttr) && /cdnjs\.cloudflare\.com/.test(cspAttr), cspAttr);
  ok('build: CSP libera Google Fonts (tema)',
    /fonts\.googleapis\.com/.test(cspAttr) && /fonts\.gstatic\.com/.test(cspAttr), cspAttr);

  ok('build: og:image absoluto sobrevive ao build',
    /<meta\s+property="og:image"\s+content="https:\/\/demo\.multi-assets\.com\/atlas-card\.png"/.test(distHtml));

  const NUNCA_ARTEFATO = ['platform-data-real.js', 'platform-data-audit.js',
    'platform-historico.js', 'platform-brand.js', 'data.js', 'data.json',
    'historico.js', 'historico.json'];
  const suspeitosArtefato = [];
  const varreArtefato = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { varreArtefato(full); continue; }
      const rel = path.relative(distDir, full);
      if (NUNCA_ARTEFATO.includes(e.name)) suspeitosArtefato.push(rel);
      if (/\.(pdf|xlsx?|docx|zip|png|jpe?g)$/i.test(e.name)) suspeitosArtefato.push(rel);
    }
  };
  varreArtefato(distDir);
  ok('build: varredura do artefato sem overlay nem binário', suspeitosArtefato.length === 0,
    suspeitosArtefato.join(', ') || 'ok');

  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const jsAssets = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    const conteudoBundle = jsAssets.map((f) =>
      fs.readFileSync(path.join(assetsDir, f), 'utf8')).join('\n');
    ok('build: bundle sem marca de React dev nem Babel runtime',
      !/react\.development/.test(conteudoBundle) && !/Babel Standalone/.test(conteudoBundle));
  }
} else {
  ok('build: dist-app ausente (ok em clone limpo; rode npm run build antes de publicar)',
    true, 'ausente');
}

// ─── 19. Fase 2 — Oportunidades & CRM-lite ─────────────────────────────────
//
// A página nova vive sob as mesmas regras das demais: demo sintético quando o
// overlay da instância não carregou, dado que não sai do navegador, ciclo de
// status espelhado do motor, rota e menu travados no shell.

const oportDemoPath = path.join(ROOT, 'platform-oportunidades-demo.js');
const oportPagePath = path.join(ROOT, 'platform-oportunidades.jsx');
const oportDemo = fs.existsSync(oportDemoPath) ? fs.readFileSync(oportDemoPath, 'utf8') : '';
const oportPage = fs.existsSync(oportPagePath) ? fs.readFileSync(oportPagePath, 'utf8') : '';

ok('platform-oportunidades-demo.js existe', fs.existsSync(oportDemoPath));
ok('platform-oportunidades.jsx existe', fs.existsSync(oportPagePath));
ok('sem mojibake: platform-oportunidades-demo.js', !MOJIBAKE.test(oportDemo));
ok('sem mojibake: platform-oportunidades.jsx', !MOJIBAKE.test(oportPage));

ok('demo de oportunidades publica window.ATLAS_OPORTUNIDADES_DATA',
  oportDemo.includes('window.ATLAS_OPORTUNIDADES_DATA'));
ok('demo de oportunidades é sintético (geradoEm null)',
  /geradoEm:\s*null/.test(oportDemo));

// O ciclo do CRM-lite vive no motor (audit-engine/src/opportunities/types.ts);
// a página mantém um espelho. Este check trava que o espelho tenha as saídas
// obrigatórias: Contatar/Descartada na Nova, Convertida no Em andamento.
ok('página registra AtlasPages.Oportunidades',
  oportPage.includes('AtlasPages.Oportunidades'));
ok('página espelha o ciclo de status do motor',
  /'Nova':\s*\[/.test(oportPage) && oportPage.includes("'Contatar', 'Descartada'")
  && oportPage.includes("'Convertida', 'Perdida', 'Descartada'"));

ok('rota /oportunidades em platform-app.jsx',
  appContent.includes("path === '/oportunidades'"));
ok('navegação contém Oportunidades em platform-app.jsx',
  appContent.includes("label:'Oportunidades'"));

const achadosContent = fs.readFileSync(path.join(ROOT, 'platform-achados.jsx'), 'utf8');
ok('achados oferece criar oportunidade a partir do achado (pré-preenchido)',
  achadosContent.includes('Criar oportunidade') && achadosContent.includes('/oportunidades?nova=1'));

// CRM-lite: nada sai do navegador nesta fase. Mesma regra da importação.
ok('página de oportunidades não usa primitiva de envio (dado fica no navegador)',
  !/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(oportPage));

// O overlay real da instância (platform-oportunidades.js) carrega dado de
// cliente e precisa estar negado no .gitignore, como os demais overlays. Sem
// essa entrada, um git add . versiona o arquivo.
const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
ok('.gitignore nega o overlay real platform-oportunidades.js',
  gitignore.split(/\r?\n/).some((l) => l.trim() === 'platform-oportunidades.js'));

// ─── 20. Fase 3 — Vencimentos ───────────────────────────────────────────────
//
// Mesmas regras da Fase 2: demo sintético, página registrada, rota e menu no
// shell, overlay real negado no .gitignore, dado que não sai do navegador.

const vencDemoPath = path.join(ROOT, 'platform-vencimentos-demo.js');
const vencPagePath = path.join(ROOT, 'platform-vencimentos.jsx');
const vencDemo = fs.existsSync(vencDemoPath) ? fs.readFileSync(vencDemoPath, 'utf8') : '';
const vencPage = fs.existsSync(vencPagePath) ? fs.readFileSync(vencPagePath, 'utf8') : '';

ok('platform-vencimentos-demo.js existe', fs.existsSync(vencDemoPath));
ok('platform-vencimentos.jsx existe', fs.existsSync(vencPagePath));
ok('sem mojibake: platform-vencimentos-demo.js', !MOJIBAKE.test(vencDemo));
ok('sem mojibake: platform-vencimentos.jsx', !MOJIBAKE.test(vencPage));

ok('demo de vencimentos publica window.ATLAS_VENCIMENTOS_DATA',
  vencDemo.includes('window.ATLAS_VENCIMENTOS_DATA'));
ok('demo de vencimentos é sintético (geradoEm null)',
  /geradoEm:\s*null/.test(vencDemo));

ok('página registra AtlasPages.Vencimentos',
  vencPage.includes('AtlasPages.Vencimentos'));
ok('rota /vencimentos em platform-app.jsx',
  appContent.includes("path === '/vencimentos'"));
ok('navegação contém Vencimentos em platform-app.jsx',
  appContent.includes("label:'Vencimentos'"));

ok('vencimentos oferecem criar oportunidade pré-preenchida (link Fase 2)',
  vencPage.includes('Criar oportunidade') && vencPage.includes('/oportunidades?nova=1'));

ok('página de vencimentos não usa primitiva de envio (dado fica no navegador)',
  !/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(vencPage));

ok('.gitignore nega o overlay real platform-vencimentos.js',
  gitignore.split(/\r?\n/).some((l) => l.trim() === 'platform-vencimentos.js'));

// ─── 21. Fase 4 — Caixa parado ──────────────────────────────────────────────
//
// Mesmas regras das Fases 2 e 3: demo sintético, página registrada, rota e
// menu no shell, overlay real negado no .gitignore, dado que não sai do
// navegador.

const caixaDemoPath = path.join(ROOT, 'platform-caixa-parado-demo.js');
const caixaPagePath = path.join(ROOT, 'platform-caixa-parado.jsx');
const caixaDemo = fs.existsSync(caixaDemoPath) ? fs.readFileSync(caixaDemoPath, 'utf8') : '';
const caixaPage = fs.existsSync(caixaPagePath) ? fs.readFileSync(caixaPagePath, 'utf8') : '';

ok('platform-caixa-parado-demo.js existe', fs.existsSync(caixaDemoPath));
ok('platform-caixa-parado.jsx existe', fs.existsSync(caixaPagePath));
ok('sem mojibake: platform-caixa-parado-demo.js', !MOJIBAKE.test(caixaDemo));
ok('sem mojibake: platform-caixa-parado.jsx', !MOJIBAKE.test(caixaPage));

ok('demo de caixa parado publica window.ATLAS_CAIXA_PARADO_DATA',
  caixaDemo.includes('window.ATLAS_CAIXA_PARADO_DATA'));
ok('demo de caixa parado é sintético (geradoEm null)',
  /geradoEm:\s*null/.test(caixaDemo));

ok('página registra AtlasPages.CaixaParado',
  caixaPage.includes('AtlasPages.CaixaParado'));
ok('rota /caixa-parado em platform-app.jsx',
  appContent.includes("path === '/caixa-parado'"));
ok('navegação contém Caixa parado em platform-app.jsx',
  appContent.includes("label:'Caixa parado'"));

ok('caixa parado oferece criar oportunidade pré-preenchida (link Fase 2)',
  caixaPage.includes('Criar oportunidade') && caixaPage.includes('/oportunidades?nova=1'));

ok('página de caixa parado não usa primitiva de envio (dado fica no navegador)',
  !/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(caixaPage));

ok('.gitignore nega o overlay real platform-caixa-parado.js',
  gitignore.split(/\r?\n/).some((l) => l.trim() === 'platform-caixa-parado.js'));

// A trava de publicacao conhece os overlays das Fases 2-4 (lacuna fechada na
// publicacao do demo de 2026-08-14): se um overlay real aparecer no build, a
// publicacao recusa em vez de subir dado de cliente.
const buildDeploySrc = fs.readFileSync(path.join(ROOT, 'scripts', 'build-deploy.mjs'), 'utf8');
const verifyBuildSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'verify-build.mjs'), 'utf8');
for (const f of ['platform-oportunidades.js', 'platform-vencimentos.js', 'platform-caixa-parado.js', 'platform-receita-drop.js']) {
  const base = f.replace(/\.js$/, '');
  ok('build-deploy.mjs proíbe o overlay ' + f, buildDeploySrc.includes(base));
  ok('verify-build.mjs proíbe o overlay ' + f, verifyBuildSrc.includes(base));
}

// ─── 22. Fase 5 — Queda de receita ──────────────────────────────────────────
//
// Aba dentro da página Receitas & ROA, sem página ou rota nova. Mesmas
// regras das fases anteriores: demo sintético, overlay real negado, dado que
// não sai do navegador. A receita aqui é a da casa (PL x taxa anual / 12);
// rentabilidade do cliente é outra métrica, fora do evento.

const rdDemoPath = path.join(ROOT, 'platform-receita-drop-demo.js');
const rdDemo = fs.existsSync(rdDemoPath) ? fs.readFileSync(rdDemoPath, 'utf8') : '';
const receitasPagePath = path.join(ROOT, 'platform-receitas.jsx');
const receitasPage = fs.existsSync(receitasPagePath) ? fs.readFileSync(receitasPagePath, 'utf8') : '';

ok('platform-receita-drop-demo.js existe', fs.existsSync(rdDemoPath));
ok('sem mojibake: platform-receita-drop-demo.js', !MOJIBAKE.test(rdDemo));
ok('demo de queda de receita publica window.ATLAS_RECEITA_DROP_DATA',
  rdDemo.includes('window.ATLAS_RECEITA_DROP_DATA'));
ok('demo de queda de receita é sintético (geradoEm null)',
  /geradoEm:\s*null/.test(rdDemo));
ok('página de receitas usa ATLAS_RECEITA_DROP_DATA',
  receitasPage.includes('ATLAS_RECEITA_DROP_DATA'));
ok('página de receitas tem a aba Queda de receita',
  receitasPage.includes("label: 'Queda de receita'"));
ok('queda de receita oferece criar oportunidade pré-preenchida (link Fase 2)',
  receitasPage.includes('Criar oportunidade') && receitasPage.includes('/oportunidades?nova=1'));
ok('aba de queda de receita não usa primitiva de envio (dado fica no navegador)',
  !/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(receitasPage));
ok('.gitignore nega o overlay real platform-receita-drop.js',
  gitignore.split(/\r?\n/).some((l) => l.trim() === 'platform-receita-drop.js'));

// ─── 23. Fase 6 — Valor do assessor ─────────────────────────────────────────
//
// Página de síntese: lê AtlasData (getRow) + ATLAS_CAIXA_PARADO_DATA, sem
// overlay próprio. A matemática vive em módulo puro importável em Node
// (precedente: platform-parsers.js).

const VM = require('../platform-valor-math.js');
const valorMathPath = path.join(ROOT, 'platform-valor-math.js');
const valorPagePath = path.join(ROOT, 'platform-valor-assessor.jsx');
const valorMath = fs.existsSync(valorMathPath) ? fs.readFileSync(valorMathPath, 'utf8') : '';
const valorPage = fs.existsSync(valorPagePath) ? fs.readFileSync(valorPagePath, 'utf8') : '';

ok('platform-valor-math.js existe', fs.existsSync(valorMathPath));
ok('platform-valor-math.js é JS puro (sem import/React/JSX)',
  !/^import\s|React|export\s+default|<\w/.test(valorMath));
ok('módulo de matemática exporta as 5 funções',
  typeof VM.acumularSerie === 'function' && typeof VM.retornoLiquidoMensal === 'function' &&
  typeof VM.custoInacao === 'function' && typeof VM.valorEmReais === 'function' &&
  typeof VM.janelaMeses === 'function');

const perto = (a, b) => Math.abs(a - b) < 1e-9;
ok('acumularSerie vazia = 0', perto(VM.acumularSerie([]), 0));
ok('acumularSerie 6x CDI 0,0116', perto(VM.acumularSerie([0.0116, 0.0116, 0.0116, 0.0116, 0.0116, 0.0116]), 0.071649891));
ok('acumularSerie 3x 1%', perto(VM.acumularSerie([0.01, 0.01, 0.01]), 0.030301));
ok('acumularSerie com mês ausente vira fator 1', perto(VM.acumularSerie([null, 0.005, undefined]), 0.005));
ok('retornoLiquidoMensal (2%, 1%)', perto(VM.retornoLiquidoMensal(0.02, 0.01), 0.0098));
ok('retornoLiquidoMensal custo 0', perto(VM.retornoLiquidoMensal(0.02, 0), 0.02));
ok('retornoLiquidoMensal retorno 0', perto(VM.retornoLiquidoMensal(0, 0.005), -0.005));
ok('custoInacao 3.000.000 x 0,0111', perto(VM.custoInacao(3000000, 0.0111), 1110));
ok('custoInacao 900.000 x 0,01', perto(VM.custoInacao(900000, 0.01), 300));
ok('custoInacao rsDias 0', perto(VM.custoInacao(0, 0.0111), 0));
ok('custoInacao CDI ausente/zero = 0',
  perto(VM.custoInacao(900000, null), 0) && perto(VM.custoInacao(900000, undefined), 0) && perto(VM.custoInacao(900000, 0), 0));
ok('valorEmReais positivo', perto(VM.valorEmReais(0.012, 5000000), 60000));
ok('valorEmReais negativo', perto(VM.valorEmReais(-0.005, 2000000), -10000));
ok('valorEmReais plFinal 0', perto(VM.valorEmReais(0.05, 0), 0));
const serie6 = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
ok('janelaMeses normal', JSON.stringify(VM.janelaMeses(serie6, '2026-06', 3)) === JSON.stringify(['2026-04', '2026-05', '2026-06']));
ok('janelaMeses maior que a série', VM.janelaMeses(serie6, '2026-06', 24).length === 6);
ok('janelaMeses desde o início', VM.janelaMeses(serie6, '2026-06', null).length === 6);
ok('janelaMeses dataFim fora', VM.janelaMeses(serie6, '2025-01', 3).length === 0);
ok('janelaMeses N=0', VM.janelaMeses(serie6, '2026-06', 0).length === 0);

ok('sem mojibake: platform-valor-math.js', !MOJIBAKE.test(valorMath));
ok('sem mojibake: platform-valor-assessor.jsx', !MOJIBAKE.test(valorPage));
ok('página registra AtlasPages.ValorAssessor', valorPage.includes('AtlasPages.ValorAssessor'));
ok('rota /valor-assessor em platform-app.jsx', appContent.includes("path === '/valor-assessor'"));
ok('navegação contém Valor do assessor em platform-app.jsx', appContent.includes("label:'Valor do assessor'"));
ok('título da página registrado', appContent.includes("'valor-assessor': 'Valor do assessor'"));
ok('main.jsx importa a página após platform-caixa-parado.jsx',
  mainJsx.indexOf("import '../platform-valor-assessor.jsx'") > mainJsx.indexOf("import '../platform-caixa-parado.jsx'"));
ok('página usa o módulo de matemática', valorPage.includes('AtlasValorMath') && valorPage.includes('acumularSerie'));
ok('página usa getRow (séries reais)', valorPage.includes('getRow'));
ok('página soma a taxa da casa ao custo (8 camadas)', valorPage.includes('totalCost') && valorPage.includes('revenue'));
ok('página lê a inação da Fase 4', valorPage.includes('ATLAS_CAIXA_PARADO_DATA'));
ok('página não usa primitiva de envio (dado fica no navegador)',
  !/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(valorPage));
ok('nota de rodapé honesta presente',
  valorPage.includes('aproximado') && valorPage.includes('taxa da casa') && valorPage.includes('Vanguard'));
ok('sem overlay novo no gitignore', !gitignore.split(/\r?\n/).some((l) => /valor/.test(l.trim())));
ok('sem mudança de motor (trava anti-escopo)', !/threshold|intel/.test(valorMath) && !/threshold|intel/.test(valorPage));

// Residuais fechados (2026-08-14): ranking do valor abre a carteira no
// clique; Receitas respeita o mês mais recente com dado; frase declara o
// horizonte da varredura de caixa (não mistura prazos).
ok('ranking do valor abre a carteira no clique', valorPage.includes('#/carteira/') && valorPage.includes('cursor'));
ok('Receitas recorta a série pelo mês mais recente com dado', receitasPage.includes('visibleMonths'));
ok('frase declara a varredura de 90 dias (horizontes separados)', valorMath.includes('varredura de 90 dias'));

// ─── 24. Visita mobile (gerentes e assessores em visita externa) ─────────────
//
// Briefing de UM cliente numa rolagem só: reusa AtlasData + as 4 fases por
// carteira + a matemática (e a frase) do valor do assessor. Sem overlay novo.

const visitaCss = fs.readFileSync(path.join(ROOT, 'platform-styles.css'), 'utf8');
const visitaPagePath = path.join(ROOT, 'platform-visita.jsx');
const visitaPage = fs.existsSync(visitaPagePath) ? fs.readFileSync(visitaPagePath, 'utf8') : '';
const carteiraPagePath = path.join(ROOT, 'platform-carteira.jsx');
const carteiraPage = fs.existsSync(carteiraPagePath) ? fs.readFileSync(carteiraPagePath, 'utf8') : '';

ok('platform-visita.jsx existe', fs.existsSync(visitaPagePath));
ok('sem mojibake: platform-visita.jsx', !MOJIBAKE.test(visitaPage));
ok('página registra AtlasPages.Visita', visitaPage.includes('AtlasPages.Visita'));
ok('rota /visita/ em platform-app.jsx', appContent.includes("startsWith('/visita/')"));
ok('título da página registrado', appContent.includes("'visita': 'Visita'"));
ok('main.jsx importa a página após platform-valor-assessor.jsx',
  mainJsx.indexOf("import '../platform-visita.jsx'") > mainJsx.indexOf("import '../platform-valor-assessor.jsx'"));
ok('página da carteira oferece Modo visita', carteiraPage.includes('Modo visita') && carteiraPage.includes('/visita/'));
ok('visita usa getRow (dados do mês)', visitaPage.includes('getRow'));
ok('visita lê oportunidades por cliente', visitaPage.includes('ATLAS_OPORTUNIDADES_DATA') && visitaPage.includes('o.cliente'));
ok('visita lê vencimentos por carteira', visitaPage.includes('ATLAS_VENCIMENTOS_DATA') && visitaPage.includes('v.carteira'));
ok('visita lê caixa parado por carteira', visitaPage.includes('ATLAS_CAIXA_PARADO_DATA') && visitaPage.includes('itens.find'));
ok('visita lê queda de receita por carteira', visitaPage.includes('ATLAS_RECEITA_DROP_DATA') && visitaPage.includes('itens.find'));
ok('visita reusa AtlasValorMath (acumularSerie + frase)',
  visitaPage.includes('acumularSerie') && visitaPage.includes('VM.frase'));
ok('visita não usa primitiva de envio (dado fica no navegador)',
  !/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(visitaPage));
ok('sem overlay novo no gitignore (visita)', !gitignore.split(/\r?\n/).some((l) => /visita/.test(l.trim())));
ok('sem mudança de motor (trava anti-escopo)', !/threshold|intel/.test(visitaPage));

// matemática: frase migrada para o módulo puro, fonte única das duas telas
ok('módulo de matemática exporta frase()', typeof VM.frase === 'function');
ok('frase() acima do CDI', VM.frase(0.02, 0).indexOf('acima do CDI') >= 0);
ok('frase() empate', VM.frase(0.004, 0).indexOf('Empatou') >= 0);
ok('frase() abaixo (agendar conversa)', VM.frase(-0.005, 0).indexOf('agendar conversa') >= 0);
ok('frase() na mesa com inação', VM.frase(-0.02, 3000).indexOf('na mesa') >= 0 && VM.frase(-0.02, 3000).indexOf('R$') >= 0);
ok('frase() aceita formatador externo', VM.frase(-0.02, 3000, (v) => 'X' + v).indexOf('X3000') >= 0);

// acabamentos do shell
ok('CSS define .split-2 e .split-3', visitaCss.includes('.split-2') && visitaCss.includes('.split-3'));
const mq767 = visitaCss.slice(visitaCss.indexOf('@media (max-width: 767px)'));
ok('CSS colapsa grids no mobile', mq767.includes('.split-2') && mq767.includes('.split-3'));
ok('kpi-value não quebra valores longos', /\.kpi-value\s*\{[^}]*overflow-wrap/.test(visitaCss));
ok('CSS da visita presente', visitaCss.includes('.visita-stack') && visitaCss.includes('.visita-card') && visitaCss.includes('.visita-kpis'));
ok('CSS da visita tem desktop 2 colunas (1024px)', /@media \(min-width: 1024px\)[\s\S]{0,900}\.visita-stack/.test(visitaCss));
ok('AppShell fecha drawer ao girar (matchMedia)', appContent.includes('matchMedia'));
ok('AppShell trava scroll do body com drawer aberto', appContent.includes('document.body.style.overflow'));
ok('viewport tem viewport-fit=cover (safe-area)', indexHtml.includes('viewport-fit=cover'));

// ─── Resultado ──────────────────────────────────────────────────────────────

const total = pass + fail;
process.stdout.write(`\n${pass}/${total} checks OK`);
if (fail > 0) {
  process.stderr.write(` — ${fail} falhou(aram)\n`);
  process.exit(1);
} else {
  process.stdout.write(' — todos os checks passaram\n');
}
