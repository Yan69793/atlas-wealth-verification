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
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verificarDist } from './verify-build.mjs';
import {
  EXTRAS_BINARIO,
  problemasDosExtras,
  suspeitosNaSaida,
} from './politica-binarios.mjs';

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

/* A lista de binários liberados e a política de extensões vivem em
   ./politica-binarios.mjs, importadas acima. Ficavam aqui até 2026-09-01, com
   uma cópia em regex logo abaixo e uma terceira cópia em tests/validate.js que
   conferia esta por casamento de texto no fonte. Três lugares, um deles
   conferindo o outro pela aparência do código: agora é um só. */

/* Arquivo conhecido pelo git (índice ou HEAD).
   Existe porque o .gitignore deste repo é deny-by-default: arquivo novo nasce
   IGNORADO e desaparece do commit em silêncio. Já mordeu três vezes, com o
   .sql da migration e com os dois .webp da tela de acesso. Em todas, funcionava
   na máquina de quem criou e quebrava em clone limpo, que é o pior tipo de
   falha porque só aparece longe de quem pode consertar. */
const versionadoNoGit = (rel) => {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', rel], {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
};

const gitDisponivel = () => {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch {
    return false;
  }
};

/* ── 1. O build tem de existir e estar limpo antes de qualquer cópia ────── */

/* A allowlist de binários é conferida ANTES de qualquer cópia. Conferir depois
   deixaria a saída meio montada no disco quando abortasse, e a próxima rodada
   partiria de um diretório sujo. */
if (!gitDisponivel()) {
  console.error('\nABORTADO: git não respondeu na raiz do projeto.');
  console.error('  A publicação confere que todo binário liberado está versionado, e sem git');
  console.error('  essa checagem não roda. Publique a partir do repositório.');
  process.exit(1);
}

{
  const problemas = problemasDosExtras(EXTRAS_BINARIO, {
    existe: (rel) => fs.existsSync(path.join(ROOT, rel)),
    versionado: versionadoNoGit,
  });
  if (problemas.length) {
    console.error('\nABORTADO: a allowlist de binários (scripts/politica-binarios.mjs) está inconsistente:');
    for (const p of problemas) console.error(`  ${p.de} -> ${p.para}\n    ${p.problema}`);
    process.exit(1);
  }
}

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
   abortando.

   A política de extensões que decide o que é binário mora em
   politica-binarios.mjs, junto da allowlist. Ficava aqui como regex à mão, uma
   segunda escrita da mesma regra. */
const relativos = [];
const anda = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { anda(full); continue; }
    relativos.push(path.relative(OUT, full));
  }
};
anda(OUT);

const suspeitos = [
  ...suspeitosNaSaida(relativos, EXTRAS_BINARIO.map((e) => e.para)),
  ...relativos.filter((rel) => NUNCA.some((r) => r.test(path.basename(rel)))),
];

/* Declarado na allowlist mas ausente da saída. É a quarta condição da política,
   e a única que só dá para conferir depois da cópia: o arquivo existe no disco,
   está versionado, tem extensão liberada, e mesmo assim não chegou lá porque
   alguém mexeu na etapa de cópia. Sem esta checagem a publicação sai com o
   endereço respondendo o index do demo no lugar da imagem, que é exatamente o
   defeito do cartão de prévia. */
const ausentesNaSaida = problemasDosExtras(EXTRAS_BINARIO, {
  naSaida: (destino) => fs.existsSync(path.join(OUT, destino)),
});
if (ausentesNaSaida.length) {
  console.error('\nABORTADO: binário declarado não chegou na saída da publicação:');
  for (const p of ausentesNaSaida) console.error(`  ${p.para}: ${p.problema}`);
  process.exit(1);
}

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
