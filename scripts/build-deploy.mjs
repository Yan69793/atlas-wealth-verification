#!/usr/bin/env node
/**
 * build-deploy.mjs — monta o diretório a publicar a partir do build (dist-app/).
 *
 * `wrangler pages deploy .` envia a árvore inteira e NÃO respeita o
 * .gitignore. Publicar a raiz sobe node_modules, .git, .playwright-mcp (que
 * guarda capturas de tela com dado real), os templates do SmartBrain e, numa
 * árvore de instância, os overlays e audits/. Foi assim que dado real de
 * cliente acabou publicado em URL de preview.
 *
 * Este script inverte a lógica: nada é publicado a menos que tenha vindo do
 * build do produto (dist-app/) ou esteja liberado abaixo. O build é montado
 * pelo Vite a partir de src/main.jsx, que não importa overlay nenhum — os
 * overlays de dado real são scripts clássicos que a instância injeta no
 * próprio index, nunca parte do bundle.
 *
 * Uso: node scripts/build-deploy.mjs [--out dist-deploy]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verificarDist } from './verify-build.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const OUT = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist-deploy');
const DIST = path.join(ROOT, 'dist-app');

/* Nunca publicar, mesmo que algo os referencie: são dado real de cliente.
   A checagem é por nome, não por extensão, porque a extensão .js é a mesma do
   código do app. O `(?:\.min)?` e o flag `i` fecham variantes (minificado,
   caixa trocada) que não vêm do build mas não custam nada bloquear. */
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

/* Extras que o app usa em runtime mas não vêm do bundle.
   Diretórios: todo arquivo direto dentro deles é copiado. */
const EXTRAS = ['docs/templates'];

/* Arquivos avulsos, com destino explícito na saída.
   Existe separado dos diretórios acima de propósito: a apresentação comercial
   mora em docs/go-to-market/, e essa pasta tem vídeo, JPG e PNG do material de
   marketing. Liberar o diretório inteiro levaria tudo isso para a saída e a
   varredura final abortaria, que é o comportamento certo dela.
   Aqui se libera o arquivo, um por vez, e nada mais entra junto. */
const EXTRAS_ARQUIVO = [
  { de: 'docs/go-to-market/apresentacao-atlas.html', para: 'apresentacao.html' },
];

/* Binários liberados, um por vez, com destino explícito.
   A varredura final aborta em qualquer PNG/JPG porque foi exatamente assim que
   captura de tela com dado real de cliente já foi parar em URL pública, e essa
   trava não muda.

   A exceção existe por um motivo só: o cartão de prévia do link precisa ser
   imagem de verdade num endereço absoluto. WhatsApp e LinkedIn ignoram data URI
   no og:image e não renderizam SVG, então não há como resolver isso dentro do
   HTML. Sem o cartão, o link comercial chega ao prospect como um retângulo de
   texto cinza.

   O que mantém isso seguro é a arte não vir de tela nenhuma: o arquivo é
   desenhado por scripts/gera-card-social.py, que não lê dado de carteira. Cada
   arquivo aqui é nominal. Binário que não esteja nesta lista continua abortando
   a publicação. */
const EXTRAS_BINARIO = [
  { de: 'docs/go-to-market/atlas-card.png', para: 'atlas-card.png' },
];

/* ── 1. O build tem de existir e estar limpo antes de qualquer cópia ────── */

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('\nABORTADO: dist-app/index.html ausente. Rode `npm run build` antes de publicar.');
  console.error('  Publicar sem build publicaria uma árvore antiga, e a falha é invisível.');
  process.exit(1);
}

const suspeitosDist = verificarDist(DIST);
if (suspeitosDist.length) {
  console.error('\nABORTADO: o artefato buildado contem o que nao pode ser publicado:');
  for (const s of suspeitosDist) console.error('  ' + s);
  process.exit(1);
}

/* Frescor: o bundle tem de ser mais novo que TODO fonte do app. Sem isso,
   quem edita uma página e roda só o deploy publica o bundle anterior, sem
   erro nenhum — o app abre, responde 200, e só parece errado para quem olha.
   A comparação é contra o index.html do build (reescrito por último pelo
   Vite). Tolerância de 2s cobre diferença de relógio de sistema de arquivo. */
{
  const ref = fs.statSync(path.join(DIST, 'index.html')).mtimeMs;
  const fontes = [];
  const colhe = (dir, base) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { colhe(full, base); continue; }
      if (/\.(jsx?|css|html|mjs)$/i.test(e.name)) fontes.push(path.relative(base, full));
    }
  };
  colhe(path.join(ROOT, 'src'), ROOT);
  for (const f of fs.readdirSync(ROOT)) {
    if (/^platform-.*\.(jsx?|css)$/i.test(f)) fontes.push(f);
  }
  fontes.push('index.html', 'vite.config.mjs');

  const velhos = fontes.filter((f) => {
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) return false;
    return fs.statSync(fp).mtimeMs > ref + 2000;
  });
  if (velhos.length) {
    console.error('\nABORTADO: fonte do app mais novo que o build. Rode `npm run build` primeiro:');
    for (const v of velhos) console.error('  ' + v);
    console.error('\n  Publicar bundle velho nao falha em lugar nenhum: o app abre com o codigo antigo.');
    process.exit(1);
  }
}

/* ── 2. Cópia do build + extras ─────────────────────────────────────────── */

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let n = 0;
const andaCopia = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const src = path.join(dir, e.name);
    const dst = path.join(OUT, path.relative(DIST, src));
    if (e.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      andaCopia(src);
    } else {
      fs.copyFileSync(src, dst);
      n++;
    }
  }
};
andaCopia(DIST);

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

const extrasAusentes = [];
for (const { de, para } of [...EXTRAS_ARQUIVO, ...EXTRAS_BINARIO]) {
  const s = path.join(ROOT, de);
  if (!fs.existsSync(s)) { extrasAusentes.push(de); continue; }
  const d = path.join(OUT, para);
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.copyFileSync(s, d);
  n++;
}

/* ── 3. index.html da saída: essenciais presentes, overlay ausente ─────── */

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

/* No contrato antigo, tags de script opcionais eram retiradas aqui quando o
   arquivo não chegava na saída. O build do Vite já entrega o HTML sem as tags
   de overlay; este passo continua existindo por defesa: se uma tag opcional
   reaparecer no HTML buildado e o arquivo não existir na saída, ela sai. */
const tagsRemovidas = [];
const htmlSaida = html.replace(
  /[ \t]*<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>[ \t]*\n?/g,
  (bloco, src) => {
    if (/^(https?:)?\/\//i.test(src)) return bloco;          // externo, fica
    if (!/\bonerror\s*=/.test(bloco)) return bloco;          // obrigatório, fica
    const rel = src.split('?')[0];
    if (fs.existsSync(path.join(OUT, rel))) return bloco;    // opcional presente, fica
    tagsRemovidas.push(rel);
    return '';
  }
);

/* O index reescrito tem de continuar carregando o essencial.
 * Reescrever HTML por expressão regular já apagou a folha de estilo uma vez, e
 * a falha foi muda: a página abre, responde 200, e só parece errada para quem
 * olha. Estas linhas transformam isso em publicação abortada. */
const ESSENCIAIS = [
  { nome: 'folha de estilo (asset com fingerprint)', re: /<link[^>]+href="\.\/assets\/[^"]+\.css"/ },
  { nome: 'bundle do app (module script)', re: /<script\b[^>]*type="module"[^>]*src="\.\/assets\/[^"]+\.js"/ },
  { nome: 'raiz do React', re: /id="root"/ },
];
const perdidos = ESSENCIAIS.filter(e => !e.re.test(htmlSaida)).map(e => e.nome);
if (perdidos.length) {
  console.error('\nABORTADO: o index reescrito perdeu parte essencial:');
  for (const p of perdidos) console.error('  ' + p);
  console.error('\n  A reescrita das tags opcionais comeu conteudo que devia ficar.');
  process.exit(1);
}

/* O `(?!x)` do cadastro não é enfeite: platform-cadastro.jsx é a PÁGINA de
   Cadastro & Compliance, código do produto que entra no bundle normalmente.
   Sem ele, "platform-cadastro.js" casaria como prefixo de "platform-cadastro.jsx"
   e uma referência legítima à página abortaria a publicação. */
if (/platform-data-real\.js|platform-data-audit\.js|platform-historico\.js|platform-brand\.js|platform-oportunidades\.js|platform-vencimentos\.js|platform-caixa-parado\.js|platform-radar\.js|platform-credito\.js|platform-receita-drop\.js|platform-cadastro\.js(?!x)/.test(htmlSaida)) {
  console.error('\nABORTADO: tag de overlay de dado real presente no index publicado.');
  process.exit(1);
}

fs.writeFileSync(path.join(OUT, 'index.html'), htmlSaida, 'utf8');

console.log(`Diretorio de deploy: ${OUT}`);
console.log(`  ${n} arquivos copiados (build dist-app + extras)`);
if (tagsRemovidas.length) console.log(`  ${tagsRemovidas.length} tags opcionais retiradas do index (sem 404 no console): ${tagsRemovidas.join(', ')}`);

/* ── 4. Trava final: varre a saída atrás de qualquer coisa indevida ───────
   A comparação é pelo caminho relativo à saída, não pelo nome do arquivo: um
   atlas-card.png que apareça numa subpasta não é o cartão declarado e continua
   abortando. */
const binariosLiberados = new Set(EXTRAS_BINARIO.map((e) => path.normalize(e.para)));
const suspeitos = [];
const anda = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { anda(full); continue; }
    const rel = path.relative(OUT, full);
    if (/\.(pdf|xlsx?|docx|zip|png|jpe?g)$/i.test(e.name) && !binariosLiberados.has(rel)) suspeitos.push(rel);
    if (NUNCA.some((r) => r.test(e.name))) suspeitos.push(rel);
  }
};
anda(OUT);

if (suspeitos.length) {
  console.error('\nABORTADO: arquivos que nao podem ser publicados chegaram na saida:');
  for (const s of suspeitos) console.error('  ' + s);
  process.exit(1);
}

/* Extra declarado e ausente aborta, nao avisa.
   O Worker responde QUALQUER caminho com o index do demo e status 200, por
   causa do fallback de app de pagina unica. Entao um arquivo que nao subiu nao
   vira erro 404: vira o demo servido no lugar da apresentacao, com o titulo do
   demo no cartao de previa do WhatsApp. Nao existe sintoma. Quem mandar o link
   so descobre pelo prospect. Por isso a falta trava a publicacao aqui. */
if (extrasAusentes.length) {
  console.error('\nABORTADO: arquivo declarado em EXTRAS_ARQUIVO nao existe:');
  for (const s of extrasAusentes) console.error('  ' + s);
  console.error('\n  Sem ele, o endereco publicado responde 200 servindo o demo,');
  console.error('  e a falha e invisivel. Gere o arquivo ou tire da lista.');
  process.exit(1);
}
const liberados = EXTRAS_BINARIO.map((e) => e.para).join(', ');
console.log(`  varredura final: nenhum overlay de dado na saida; unico binario liberado: ${liberados}`);
