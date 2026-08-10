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

/* Extras que o app usa em runtime mas não aparecem como <script>/<link>.
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

const extrasAusentes = [];
for (const { de, para } of [...EXTRAS_ARQUIVO, ...EXTRAS_BINARIO]) {
  const s = path.join(ROOT, de);
  if (!fs.existsSync(s)) { extrasAusentes.push(de); continue; }
  const d = path.join(OUT, para);
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.copyFileSync(s, d);
  n++;
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

/* Só a tag, sem tentar levar o comentário junto.
 *
 * A versão anterior tinha um grupo opcional `(?:<!--[^]*?-->\s*\n)?` na frente,
 * para remover também o comentário que explicava o script. Foi um erro caro: o
 * `[^]*?` atravessa quebra de linha, então o motor casava do PRIMEIRO comentário
 * do <head> até o `-->` do comentário do script, e apagava tudo que estava no
 * meio. Em 08/08/2026 isso engoliu o bloco de meta tags e a linha do
 * platform-styles.css, e o demo foi publicado sem formatação nenhuma.
 *
 * O comentário órfão que sobra é feio e é inofensivo. Apagar linha de HTML por
 * expressão regular que cruza linhas não vale o risco.
 */
const htmlSaida = html.replace(
  /[ \t]*<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>[ \t]*\n?/g,
  (bloco, src) => {
    if (/^(https?:)?\/\//i.test(src)) return bloco;          // CDN, fica
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
  { nome: 'folha de estilo', re: /<link[^>]+platform-styles\.css/ },
  { nome: 'tokens de design', re: /<script[^>]+platform-tokens\.js/ },
  { nome: 'camada de dados', re: /<script[^>]+platform-data\.js/ },
  { nome: 'shell do app', re: /<script[^>]+platform-app\.jsx/ },
  { nome: 'raiz do React', re: /id="root"/ },
];
const perdidos = ESSENCIAIS.filter(e => !e.re.test(htmlSaida)).map(e => e.nome);
if (perdidos.length) {
  console.error('\nABORTADO: o index reescrito perdeu parte essencial:');
  for (const p of perdidos) console.error('  ' + p);
  console.error('\n  A reescrita das tags opcionais comeu conteudo que devia ficar.');
  process.exit(1);
}

fs.writeFileSync(path.join(OUT, 'index.html'), htmlSaida, 'utf8');

console.log(`Diretorio de deploy: ${OUT}`);
console.log(`  ${n} arquivos copiados`);
if (bloqueados.length) console.log(`  ${bloqueados.length} bloqueados (dado real): ${bloqueados.join(', ')}`);
if (faltando.length) console.log(`  ${faltando.length} referenciados e ausentes (ok se forem overlays): ${faltando.join(', ')}`);
if (tagsRemovidas.length) console.log(`  ${tagsRemovidas.length} tags opcionais retiradas do index (sem 404 no console): ${tagsRemovidas.join(', ')}`);

/* Trava final: varre a saída atrás de qualquer coisa que não deveria ter ido.
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
