#!/usr/bin/env node
/**
 * gerar-icones.mjs — desenha os ícones do atalho de tela de início.
 *
 * Por que um gerador e não um PNG solto no repo: o ícone é o mesmo selo de
 * verificação que a sidebar desenha em SVG (AtlasLogo, em platform-app.jsx).
 * Guardar só o binário significa que, no dia em que a marca mudar, o ícone do
 * atalho continua o antigo e ninguém percebe — o iPad não recarrega ícone de
 * atalho já instalado. Com o desenho descrito aqui, mudar a marca é mudar as
 * coordenadas e rodar de novo.
 *
 * Sem dependência de imagem instalada. O PNG é escrito à mão (zlib do próprio
 * Node) e o traço é rasterizado por distância até a linha, com uma borda de um
 * pixel de suavização. Isso evita colocar sharp/canvas na árvore só para gerar
 * quatro arquivos que mudam uma vez por ano.
 *
 * Uso: node scripts/gerar-icones.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'icons');

/* Cores: as mesmas do tema, sem inventar tom novo.
   O fundo é --sidebar-bg do tema editorial, que é idêntico nos três temas, e o
   traço é --gold. O ícone fica coerente com a tela que ele abre. */
const FUNDO = [0x0a, 0x19, 0x28];
const OURO  = [0xc4, 0xa2, 0x28];

/* ── Geometria (mesmo viewBox 32x32 do SVG da sidebar) ───────────────────── */

/* Escudo: contorno fechado, com as duas curvas de baixo achatando na ponta. */
const ESCUDO = [
  { t: 'M', p: [16, 6.6] },
  { t: 'L', p: [24.4, 10.1] },
  { t: 'L', p: [24.4, 16] },
  { t: 'C', p: [24.4, 20.6, 21, 23.9, 16, 25.6] },
  { t: 'C', p: [11, 23.9, 7.6, 20.6, 7.6, 16] },
  { t: 'L', p: [7.6, 10.1] },
  { t: 'Z', p: [] },
];
const ESCUDO_TRACO = 1.35;

/* Check dentro do escudo. */
const CHECK = [[12.1, 16], [14.9, 18.9], [20.2, 12.9]];
const CHECK_TRACO = 2.1;

/* ── Achatamento de curva ────────────────────────────────────────────────── */

function cubica(p0, c1, c2, p1, passos = 24) {
  const pts = [];
  for (let i = 1; i <= passos; i++) {
    const t = i / passos, u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
    ]);
  }
  return pts;
}

function achatar(comandos) {
  const pts = [];
  let atual = null, inicio = null;
  for (const cmd of comandos) {
    if (cmd.t === 'M') { atual = [cmd.p[0], cmd.p[1]]; inicio = atual; pts.push(atual); }
    else if (cmd.t === 'L') { atual = [cmd.p[0], cmd.p[1]]; pts.push(atual); }
    else if (cmd.t === 'C') {
      const fim = [cmd.p[4], cmd.p[5]];
      for (const p of cubica(atual, [cmd.p[0], cmd.p[1]], [cmd.p[2], cmd.p[3]], fim)) pts.push(p);
      atual = fim;
    } else if (cmd.t === 'Z') { pts.push(inicio); atual = inicio; }
  }
  return pts;
}

/* ── Distância até a polilinha ───────────────────────────────────────────── */

function distSegmento(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const len2 = vx * vx + vy * vy;
  let t = len2 === 0 ? 0 : (wx * vx + wy * vy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = px - (ax + t * vx), dy = py - (ay + t * vy);
  return Math.sqrt(dx * dx + dy * dy);
}

function distPolilinha(px, py, pts) {
  let min = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const d = distSegmento(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    if (d < min) min = d;
  }
  return min;
}

/* ── PNG ─────────────────────────────────────────────────────────────────── */

const TABELA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo, dados) {
  const t = Buffer.from(tipo, 'ascii');
  const corpo = Buffer.concat([t, dados]);
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corpo), 0);
  return Buffer.concat([tam, corpo, crc]);
}

/* Cor verdadeira sem canal alfa (tipo 2). O ícone é opaco de ponta a ponta:
   quem recorta o canto é o próprio sistema. */
function png(lado, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8;   // bits por canal
  ihdr[9] = 2;   // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const linha = lado * 3;
  const cru = Buffer.alloc((linha + 1) * lado);
  for (let y = 0; y < lado; y++) {
    cru[y * (linha + 1)] = 0; // sem filtro
    rgb.copy(cru, y * (linha + 1) + 1, y * linha, (y + 1) * linha);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', zlib.deflateSync(cru, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

/* ── Desenho ─────────────────────────────────────────────────────────────── */

/**
 * @param {number} lado   pixels
 * @param {number} escala tamanho do selo dentro do quadro (1 = como no SVG)
 */
function desenhar(lado, escala) {
  const escudo = achatar(ESCUDO);
  const rgb = Buffer.alloc(lado * lado * 3);

  const unidade = 32 / lado;          // unidades de viewBox por pixel
  const suave = unidade;              // largura da borda suavizada
  const meioEscudo = ESCUDO_TRACO / 2;
  const meioCheck = CHECK_TRACO / 2;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      /* Centro do pixel, trazido de volta ao viewBox e desescalado em torno
         do centro — desenhar maior é olhar o desenho de mais perto. */
      const vx = 16 + ((x + 0.5) * unidade - 16) / escala;
      const vy = 16 + ((y + 0.5) * unidade - 16) / escala;

      const d = Math.min(
        distPolilinha(vx, vy, escudo) - meioEscudo,
        distPolilinha(vx, vy, CHECK) - meioCheck,
      );

      /* d < 0 dentro do traço, > 0 fora. A faixa de um pixel vira a antisserrilha. */
      let a = 0.5 - d / suave;
      a = a < 0 ? 0 : a > 1 ? 1 : a;

      const i = (y * lado + x) * 3;
      rgb[i]     = Math.round(FUNDO[0] + (OURO[0] - FUNDO[0]) * a);
      rgb[i + 1] = Math.round(FUNDO[1] + (OURO[1] - FUNDO[1]) * a);
      rgb[i + 2] = Math.round(FUNDO[2] + (OURO[2] - FUNDO[2]) * a);
    }
  }

  return png(lado, rgb);
}

/* Escala 1.12 no ícone comum: o selo do SVG ocupa pouco mais da metade do
   quadro, e ícone de tela de início pede o desenho um pouco mais cheio.
   O maskable é o mesmo desenho menor, porque o Android recorta a moldura em
   círculo e come a borda. */
const ARQUIVOS = [
  { nome: 'atlas-icon-180.png',          lado: 180, escala: 1.12 },
  { nome: 'atlas-icon-192.png',          lado: 192, escala: 1.12 },
  { nome: 'atlas-icon-512.png',          lado: 512, escala: 1.12 },
  { nome: 'atlas-icon-maskable-512.png', lado: 512, escala: 0.86 },
];

fs.mkdirSync(OUT, { recursive: true });
for (const { nome, lado, escala } of ARQUIVOS) {
  const buf = desenhar(lado, escala);
  fs.writeFileSync(path.join(OUT, nome), buf);
  console.log(`  ${nome} — ${lado}x${lado}, ${(buf.length / 1024).toFixed(1)} kB`);
}
console.log(`\n${ARQUIVOS.length} icones gravados em ${path.relative(ROOT, OUT)}/`);
