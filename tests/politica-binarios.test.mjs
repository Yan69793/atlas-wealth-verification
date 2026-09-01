/**
 * Contrato da allowlist de binários publicáveis.
 *
 * A regra vive em scripts/politica-binarios.mjs e é pura de propósito: recebe
 * os predicados de ambiente (existe no disco, git conhece, chegou na saída) em
 * vez de ir ao disco sozinha. É isso que deixa este arquivo exercitar os
 * caminhos de REPROVAÇÃO sem precisar de repositório git falso, sem mexer no
 * .gitignore de verdade e sem montar árvore de arquivo temporária.
 *
 * Os casos de reprovação importam mais que os de aprovação. Cada um deles já
 * aconteceu ou quase aconteceu neste repositório:
 *
 *   - não versionado: os dois .webp da tela de acesso, 2026-09-01. Existiam no
 *     disco, funcionavam localmente, e teriam sumido do commit.
 *   - ausente da saída: o cartão de prévia, que ficava respondendo o HTML do
 *     demo com status 200 no lugar da imagem.
 *   - extensão fora da política: nunca aconteceu, e é justamente por isso que
 *     precisa de teste. Liberar um .zip "só desta vez" é como a lista morre.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import {
  EXTRAS_BINARIO,
  ASSETS_PUBLICOS,
  ASSETS_SOCIAIS,
  ASSINATURA,
  ehBinarioBarrado,
  ehExtensaoLiberavel,
  problemasDosExtras,
  suspeitosNaSaida,
} from '../scripts/politica-binarios.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const tudoOk = { existe: () => true, versionado: () => true, naSaida: () => true };

describe('política de binários: aprovação', () => {
  test('a allowlist de verdade passa com o ambiente íntegro', () => {
    assert.deepEqual(problemasDosExtras(EXTRAS_BINARIO, tudoOk), []);
  });

  test('todo item da allowlist usa extensão liberável', () => {
    for (const { para } of EXTRAS_BINARIO) {
      assert.ok(ehExtensaoLiberavel(para), `${para} está na allowlist com extensão fora da política`);
    }
  });

  test('todo item da allowlist existe no disco e está versionado', () => {
    const problemas = problemasDosExtras(EXTRAS_BINARIO, {
      existe: (rel) => fs.existsSync(path.join(ROOT, rel)),
      versionado: (rel) => {
        try {
          execFileSync('git', ['ls-files', '--error-unmatch', '--', rel],
            { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] });
          return true;
        } catch { return false; }
      },
    });
    assert.deepEqual(problemas, [], problemas.map((p) => `${p.de}: ${p.problema}`).join('\n'));
  });

  /* O .gitignore deste repo nega tudo por padrão (`*`), então arquivo novo
     nasce ignorado e some do commit em silêncio. O build já aborta nesse caso,
     mas o erro aparece só na hora de publicar. Este teste antecipa. */
  test('todo item da allowlist tem linha de exceção no .gitignore', () => {
    const linhas = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => l.trim());
    for (const { de } of EXTRAS_BINARIO) {
      assert.ok(linhas.includes(`!/${de}`),
        `${de} não tem a linha "!/${de}" no .gitignore. Sem ela o arquivo nasce ignorado e não entra no commit.`);
    }
  });

  test('todo item da allowlist tem tamanho plausível no disco', () => {
    for (const { de, para } of EXTRAS_BINARIO) {
      const bytes = fs.statSync(path.join(ROOT, de)).size;
      const minimo = ASSINATURA[path.extname(para).toLowerCase()].minimo;
      assert.ok(bytes >= minimo, `${de} tem ${bytes} bytes, abaixo do mínimo de ${minimo}`);
    }
  });

  test('saída só com binário declarado não gera suspeita', () => {
    const saida = ['index.html', 'assets/app-abc123.js', ...EXTRAS_BINARIO.map((e) => e.para)];
    assert.deepEqual(suspeitosNaSaida(saida, EXTRAS_BINARIO.map((e) => e.para)), []);
  });

  test('os caminhos públicos derivam da allowlist, não de lista paralela', () => {
    assert.deepEqual(ASSETS_PUBLICOS, EXTRAS_BINARIO.map((e) => '/' + e.para));
    assert.ok(ASSETS_SOCIAIS.length > 0, 'nenhum asset social declarado');
    for (const p of ASSETS_SOCIAIS) assert.ok(ASSETS_PUBLICOS.includes(p), `${p} social mas não público`);
  });
});

describe('política de binários: reprovação', () => {
  test('reprova arquivo que não existe no disco', () => {
    const problemas = problemasDosExtras(
      [{ de: 'docs/go-to-market/sumiu.png', para: 'sumiu.png' }],
      { ...tudoOk, existe: () => false }
    );
    assert.equal(problemas.length, 1);
    assert.match(problemas[0].problema, /não existe no disco/);
  });

  test('reprova arquivo que existe mas não está versionado no git', () => {
    const problemas = problemasDosExtras(
      [{ de: 'docs/go-to-market/novo.webp', para: 'novo.webp' }],
      { ...tudoOk, versionado: () => false }
    );
    assert.equal(problemas.length, 1);
    assert.match(problemas[0].problema, /versionado no git/);
    assert.match(problemas[0].problema, /deny-by-default/);
  });

  test('reprova arquivo declarado que não chegou na saída', () => {
    const problemas = problemasDosExtras(
      [{ de: 'docs/go-to-market/atlas-card.png', para: 'atlas-card.png' }],
      { ...tudoOk, naSaida: () => false }
    );
    assert.equal(problemas.length, 1);
    assert.match(problemas[0].problema, /ausente da saída/);
  });

  for (const proibida of ['pacote.zip', 'planilha.xlsx', 'relatorio.pdf', 'doc.docx', 'foto.gif', 'video.mov']) {
    test(`reprova extensão fora da política de liberação (${proibida})`, () => {
      const problemas = problemasDosExtras([{ de: `docs/${proibida}`, para: proibida }], tudoOk);
      assert.equal(problemas.length, 1);
      assert.match(problemas[0].problema, /fora da política de liberação/);
    });
  }

  test('extensão proibida reprova mesmo com arquivo presente e versionado', () => {
    const problemas = problemasDosExtras(
      [{ de: 'docs/carteiras.xlsx', para: 'carteiras.xlsx' }],
      tudoOk
    );
    assert.equal(problemas.length, 1);
    assert.match(problemas[0].problema, /fora da política/);
  });

  test('acumula um problema por item, sem parar no primeiro', () => {
    const problemas = problemasDosExtras([
      { de: 'a.png', para: 'a.png' },
      { de: 'b.webp', para: 'b.webp' },
    ], { ...tudoOk, versionado: () => false });
    assert.equal(problemas.length, 2);
  });
});

describe('deny-by-default da saída', () => {
  // Os seis formatos que o pedido manda preservar, mais os que já existiam.
  for (const nome of ['print.png', 'foto.jpg', 'foto.jpeg', 'arte.webp', 'arte.avif', 'clipe.mp4', 'clipe.webm']) {
    test(`binário não declarado aborta a publicação (${nome})`, () => {
      assert.ok(ehBinarioBarrado(nome), `${nome} não é reconhecido como binário`);
      assert.deepEqual(suspeitosNaSaida([nome], EXTRAS_BINARIO.map((e) => e.para)), [nome]);
    });
  }

  test('carteira em PDF ou planilha continua barrada', () => {
    const saida = ['book.pdf', 'carteiras.xlsx', 'entrega.zip'];
    assert.deepEqual(suspeitosNaSaida(saida, EXTRAS_BINARIO.map((e) => e.para)), saida);
  });

  test('nome liberado em subpasta NÃO vale: a comparação é pelo caminho', () => {
    const infiltrado = path.join('capturas', 'atlas-card.png').replace(/\\/g, '/');
    assert.deepEqual(
      suspeitosNaSaida([infiltrado], EXTRAS_BINARIO.map((e) => e.para)),
      [infiltrado]
    );
  });

  test('texto e código do app não são tocados pela trava de binário', () => {
    const saida = ['index.html', 'assets/app-abc.js', 'assets/app-abc.css', 'docs/templates/modelo.csv'];
    assert.deepEqual(suspeitosNaSaida(saida, []), []);
  });
});

describe('assinatura dos formatos liberáveis', () => {
  test('todo formato liberável tem assinatura e content-type declarados', () => {
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.mp4', '.webm']) {
      assert.ok(ASSINATURA[ext], `sem assinatura para ${ext}`);
      assert.ok(ASSINATURA[ext].contentType, `sem content-type para ${ext}`);
      assert.ok(ASSINATURA[ext].minimo > 0, `sem tamanho mínimo para ${ext}`);
    }
  });

  test('assinatura rejeita HTML disfarçado de imagem', () => {
    const html = Buffer.from('<!doctype html><html><head><title>ATLAS</title>');
    for (const ext of ['.png', '.jpg', '.webp', '.avif', '.mp4', '.webm']) {
      assert.equal(ASSINATURA[ext].confere(html), false, `${ext} aceitou HTML como conteúdo válido`);
    }
  });

  test('assinatura aceita os arquivos reais da allowlist', () => {
    for (const { de, para } of EXTRAS_BINARIO) {
      const ext = path.extname(para).toLowerCase();
      const buf = fs.readFileSync(path.join(ROOT, de));
      assert.ok(ASSINATURA[ext].confere(buf), `${de} não bate com a assinatura de ${ext}`);
      assert.ok(buf.length >= ASSINATURA[ext].minimo,
        `${de} tem ${buf.length} bytes, abaixo do mínimo plausível de ${ASSINATURA[ext].minimo}`);
    }
  });
});
