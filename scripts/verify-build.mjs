#!/usr/bin/env node
/**
 * verify-build.mjs — trava do artefato buildado (dist-app/).
 *
 * O build-deploy.mjs publica a partir de dist-app/. Este script é a camada
 * que garante que dist-app/ só contenha produto: nenhum overlay de dado real
 * (que o Vite NÃO bundla, então a presença deles aqui significa que alguém
 * copiou arquivo de instância para dentro do produto), nenhum binário (mesma
 * regra da varredura de publicação: PNG/JPG/PDF/XLSX aqui foi parar onde não
 * deveria) e nenhum artefato com marca de build de desenvolvimento.
 *
 * Uso direto: node scripts/verify-build.mjs
 * Uso embutido: import { verificarDist } from './verify-build.mjs'
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* O pool de 40 códigos de carteira do demo. Nenhum deles pode aparecer em nada
   que o navegador receba ANTES da resposta autorizada do GET /api/dados.

   Até 2026-09-10 isso não se sustentava: os sete platform-*-demo.js são
   importados por src/main.jsx, entravam no bundle com registro por carteira, e
   o escopo por papel do /api/dados não os alcançava. Quem tinha uma carteira no
   escopo abria Radar, Oportunidades, Vencimentos, Caixa parado, Receita ou
   Eventos e lia as outras trinta e nove, com emissor, exposição e valor. Por
   isso a checagem é de CONTEÚDO, e não de nome de arquivo: o defeito passava
   com todos os nomes certos no lugar.

   Lido do dataset do Worker, que é onde o conjunto do demo passou a viver. */
/* dataset.js é ESM grande, e o package.json do repositório é CommonJS (herdado
   de tests/validate.js). Importá-lo direto aqui faz o Node avisar a cada
   publicação que falta `type: module`, que é justamente o que não pode ser
   feito. A leitura sai num processo filho, com o stderr descartado, igual ao
   que tests/validate.js faz para o mesmo arquivo. */
function poolDoDemo() {
  try {
    const url = pathToFileURL(path.join(ROOT, 'demo-worker', 'src', 'dataset.js')).href;
    const script = 'import { POOL_DEMO } from ' + JSON.stringify(url)
      + ';process.stdout.write(JSON.stringify(POOL_DEMO || []));';
    const bruto = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pool = JSON.parse(bruto);
    return Array.isArray(pool) ? pool : [];
  } catch {
    return [];
  }
}

/* Extensões de texto que o navegador consome. Binário não é lido: o que o
   build publica como imagem já é barrado por nome, e ler MB de PNG aqui seria
   caro para nada. */
const TEXTO = /\.(js|mjs|cjs|css|html|json|webmanifest|map)$/i;

/** Procura códigos do pool no conteúdo de dist-app. Devolve um item por arquivo. */
export function vazamentosDeCarteira(dir, pool) {
  if (!pool.length) return ['(pool de carteiras do demo não pôde ser lido)'];
  const achados = [];
  const anda = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { anda(full); continue; }
      if (!TEXTO.test(e.name)) continue;
      const texto = fs.readFileSync(full, 'utf8');
      const citados = pool.filter((c) => new RegExp('\\b' + c + '\\b').test(texto));
      if (citados.length) {
        achados.push(`${path.relative(dir, full)} cita ${citados.length} carteira(s): ${citados.join(', ')}`);
      }
    }
  };
  anda(dir);
  return achados;
}

/* Espelha a lista NUNCA de build-deploy.mjs e os overlays do .gitignore.
   Regex com `(?:\.min)?` e `i` fecha variantes que não vêm do build. */
const NUNCA = [
  /^platform-data-real(\.min)?\.js$/i,
  /^platform-data-audit(\.min)?\.js$/i,
  /^platform-historico(\.min)?\.js$/i,
  /^platform-brand(\.min)?\.js$/i,
  /^platform-oportunidades(\.min)?\.js$/i,
  /^platform-vencimentos(\.min)?\.js$/i,
  /^platform-caixa-parado(\.min)?\.js$/i,
  /^platform-radar(\.min)?\.js$/i,
  /^platform-credito(\.min)?\.js$/i,
  /^platform-receita-drop(\.min)?\.js$/i,
  /^platform-cadastro(\.min)?\.js$/i,
  /^data\.js(on)?$/i,
  /^historico\.js(on)?$/i,
];

const BINARIOS = /\.(pdf|xlsx?|docx|zip|png|jpe?g)$/i;

/* `verificarDist` é chamada por build-deploy.mjs antes de copiar qualquer
   coisa, então o conteúdo também tem que ser conferido lá, não só no uso pela
   linha de comando. O pool é lido uma vez, na avaliação do módulo. */
const POOL_DO_DEMO = poolDoDemo();

/** Varre dir e devolve os caminhos suspeitos relativos a ele. */
export function verificarDist(dir) {
  if (!fs.existsSync(dir)) return [];
  return [...verificarNomes(dir), ...vazamentosDeCarteira(dir, POOL_DO_DEMO)];
}

function verificarNomes(dir) {
  const suspeitos = [];
  const anda = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { anda(full); continue; }
      const rel = path.relative(dir, full);
      if (NUNCA.some((r) => r.test(e.name))) suspeitos.push(rel);
      if (BINARIOS.test(e.name)) suspeitos.push(rel);
    }
  };
  anda(dir);

  const indexHtml = path.join(dir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    const html = fs.readFileSync(indexHtml, 'utf8');
    /* `(?!x)` no cadastro: platform-cadastro.jsx é a PÁGINA de Cadastro &
       Compliance, produto que entra no bundle. Sem a exclusão, o nome do
       overlay casaria como prefixo do nome da página. */
    if (/platform-data-real\.js|platform-data-audit\.js|platform-historico\.js|platform-oportunidades\.js|platform-vencimentos\.js|platform-caixa-parado\.js|platform-radar\.js|platform-credito\.js|platform-receita-drop\.js|platform-cadastro\.js(?!x)/.test(html)) {
      suspeitos.push('index.html (tag de overlay presente no HTML buildado)');
    }
  }
  return suspeitos;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const dist = path.join(ROOT, 'dist-app');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('dist-app/index.html ausente. Rode npm run build primeiro.');
    process.exit(1);
  }
  const suspeitos = verificarDist(dist);
  if (suspeitos.length) {
    console.error('\nABORTADO: artefato buildado contem o que nao pode ser publicado:');
    for (const s of suspeitos) console.error('  ' + s);
    process.exit(1);
  }
  console.log(`dist-app/ limpo: nenhum overlay, nenhum binario, nenhuma das ${POOL_DO_DEMO.length} carteiras do pool.`);
}
