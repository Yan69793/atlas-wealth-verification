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
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

/** Varre dir e devolve os caminhos suspeitos relativos a ele. */
export function verificarDist(dir) {
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
  console.log('dist-app/ limpo: nenhum overlay, nenhum binario.');
}
