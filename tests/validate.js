/**
 * Testes mínimos de integridade — ATLAS Wealth Verification
 * Roda em Node.js >= 18, sem framework externo.
 * Uso: node tests/validate.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');

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

// ─── Resultado ──────────────────────────────────────────────────────────────

const total = pass + fail;
process.stdout.write(`\n${pass}/${total} checks OK`);
if (fail > 0) {
  process.stderr.write(` — ${fail} falhou(aram)\n`);
  process.exit(1);
} else {
  process.stdout.write(' — todos os checks passaram\n');
}
