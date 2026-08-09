#!/usr/bin/env node
/**
 * build-deploy.mjs — monta o diretório a publicar, com allowlist.
 *
 * `wrangler pages deploy .` envia a árvore inteira e NÃO respeita o
 * .gitignore. Publicar a raiz sobe node_modules, .git, .playwright-mcp (que
 * guarda capturas de tela com dado real), os templates do SmartBrain e, numa
 * árvore de instância, os overlays e audits/. Foi assim que dado real de
 * cliente acabou publicado em URL de preview.
 *
 * Este script inverte a lógica: nada é publicado a menos que apareça no
 * index.html ou esteja liberado abaixo. Mesma ideia do .gitignore de negar por
 * padrão, aplicada ao deploy.
 *
 * Uso: node scripts/build-deploy.mjs [--out dist-deploy]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const OUT = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist-deploy');

/* Nunca publicar, mesmo que algo os referencie: são dado real de cliente.
   A checagem é por nome, não por extensão, porque a extensão .js é a mesma do
   código do app. */
const NUNCA = [
  /^platform-data-real\.js$/,
  /^platform-data-audit\.js$/,
  /^platform-historico\.js$/,
  /^data\.js(on)?$/,
  /^historico\.js(on)?$/,
];

/* Extras que o app usa em runtime mas não aparecem como <script>/<link>. */
const EXTRAS = ['docs/templates'];

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* A allowlist vem do próprio index.html: o que ele carrega é o que existe. */
const referenciados = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((p) => !/^(https?:)?\/\//i.test(p))
  .map((p) => p.split('?')[0]);

const bloqueados = referenciados.filter((f) => NUNCA.some((r) => r.test(f)));
const copiar = referenciados.filter((f) => !NUNCA.some((r) => r.test(f)));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

/* O index.html é reescrito no fim, depois que se sabe o que existe na saída. */
let n = 1;
const faltando = [];

for (const rel of copiar) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) { faltando.push(rel); continue; }
  const dst = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  n++;
}

for (const extra of EXTRAS) {
  const src = path.join(ROOT, extra);
  if (!fs.existsSync(src)) continue;
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    if (!fs.statSync(s).isFile()) continue;
    const d = path.join(OUT, extra, f);
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.copyFileSync(s, d);
    n++;
  }
}

/* index.html reescrito: tira as tags de script opcionais cujo arquivo não
   chegou na saída, seja porque é overlay de dado real (bloqueado acima), seja
   porque simplesmente não existe nesta árvore.

   O app já tolera a ausência via onerror="void(0)" e cai no demo sintético,
   então funcionalmente dá na mesma. O que muda é o que o prospect vê: sem
   isso, a primeira coisa no inspetor de rede de uma demonstração comercial são
   quatro 404 em vermelho, um deles chamado platform-data-real.js. Explicar
   isso ao vivo é pior do que não ter o problema.

   O critério é existência no OUT, não lista de nomes. Overlay novo criado
   depois daqui é coberto sem ninguém editar este arquivo. */
const tagsRemovidas = [];

const htmlSaida = html.replace(
  /(?:[ \t]*<!--[^]*?-->\s*\n)?[ \t]*<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>[ \t]*\n?/g,
  (bloco, src) => {
    if (/^(https?:)?\/\//i.test(src)) return bloco;          // CDN, fica
    if (!/\bonerror\s*=/.test(bloco)) return bloco;          // obrigatório, fica
    const rel = src.split('?')[0];
    if (fs.existsSync(path.join(OUT, rel))) return bloco;    // opcional presente, fica
    tagsRemovidas.push(rel);
    return '';
  }
);

fs.writeFileSync(path.join(OUT, 'index.html'), htmlSaida, 'utf8');

console.log(`Diretorio de deploy: ${OUT}`);
console.log(`  ${n} arquivos copiados`);
if (bloqueados.length) console.log(`  ${bloqueados.length} bloqueados (dado real): ${bloqueados.join(', ')}`);
if (faltando.length) console.log(`  ${faltando.length} referenciados e ausentes (ok se forem overlays): ${faltando.join(', ')}`);
if (tagsRemovidas.length) console.log(`  ${tagsRemovidas.length} tags opcionais retiradas do index (sem 404 no console): ${tagsRemovidas.join(', ')}`);

/* Trava final: varre a saída atrás de qualquer coisa que não deveria ter ido. */
const suspeitos = [];
const anda = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { anda(full); continue; }
    if (/\.(pdf|xlsx?|docx|zip|png|jpe?g)$/i.test(e.name)) suspeitos.push(path.relative(OUT, full));
    if (NUNCA.some((r) => r.test(e.name))) suspeitos.push(path.relative(OUT, full));
  }
};
anda(OUT);

if (suspeitos.length) {
  console.error('\nABORTADO: arquivos que nao podem ser publicados chegaram na saida:');
  for (const s of suspeitos) console.error('  ' + s);
  process.exit(1);
}
console.log('  varredura final: nenhum binario nem overlay de dado na saida');
