/**
 * Regressão do preview social quebrado (2026-08-30 a 2026-09-01).
 *
 * O QUE ACONTECEU. O Worker do demo roda com run_worker_first=true, então ele
 * responde a TODO caminho antes do binding de assets. Sem cookie de sessão ele
 * devolvia a tela de acesso, e devolvia também para /atlas-card.png. O leitor
 * de link do WhatsApp e do LinkedIn nunca tem cookie, então o og:image recebia
 * status 200 com text/html e o cartão chegava ao prospect como um retângulo
 * sem figura. Não havia 404, não havia erro no log, não havia sintoma nenhum
 * de dentro: medido em produção, o endereço do cartão e a raiz devolviam os
 * mesmos 3990 bytes. Quem mandava o link só descobriria pelo prospect.
 *
 * POR QUE ESTE TESTE EXISTE ASSIM. Conferir status 200 não pega o defeito, o
 * defeito ERA 200. Conferir só o content-type pega este caso mas não pega um
 * placeholder de 1 KB no lugar da arte. Por isso cada asset social é cobrado em
 * quatro frentes: status, content-type, assinatura de formato nos primeiros
 * bytes e tamanho mínimo plausível. E há a asserção explícita de que o corpo
 * NÃO é HTML, que é a forma direta de travar a regressão.
 *
 * O teste chama o handler do Worker direto, com um binding de assets de
 * mentira. É de propósito: o defeito era de roteamento, e roteamento se prova
 * sem subir servidor. O smoke de rede contra 127.0.0.1:8788 continua sendo
 * feito à mão antes de publicar, e cobre a outra metade.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import worker from '../demo-worker/src/index.js';
import {
  EXTRAS_BINARIO,
  ASSETS_PUBLICOS,
  ASSETS_SOCIAIS,
  ASSINATURA,
} from '../scripts/politica-binarios.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'demo-worker', 'public');

/* Onde cada destino publicado mora de verdade. Prefere a saída da publicação
   quando ela existe (é o arquivo que vai para o ar); cai para a origem quando
   não existe, para o teste continuar valendo em clone limpo sem build. */
function origemDe(destino) {
  const naSaida = path.join(PUBLIC_DIR, destino);
  if (fs.existsSync(naSaida)) return naSaida;
  const decl = EXTRAS_BINARIO.find((e) => e.para === destino);
  return decl ? path.join(ROOT, decl.de) : null;
}

/* Binding de assets de mentira, com o mesmo comportamento do de verdade:
   serve o arquivo quando existe e cai no index.html quando não existe, que é o
   not_found_handling = single-page-application do wrangler.toml. Essa queda no
   index é justamente o que tornava a falha invisível. */
const ASSETS_FALSO = {
  async fetch(request) {
    const nome = new URL(request.url).pathname.replace(/^\//, '');
    const arquivo = origemDe(nome);
    if (arquivo && fs.existsSync(arquivo)) {
      const ext = path.extname(nome).toLowerCase();
      return new Response(fs.readFileSync(arquivo), {
        status: 200,
        headers: { 'content-type': ASSINATURA[ext]?.contentType || 'application/octet-stream' },
      });
    }
    return new Response('<!doctype html><html><head><title>ATLAS</title></head><body></body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
};

const ENV = { DEMO_SENHA: 'chave-de-teste-local-sem-valor', ASSETS: ASSETS_FALSO };

const pegar = (caminho, init) =>
  worker.fetch(new Request('https://demo.multi-assets.com' + caminho, init), ENV);

const ehHtml = (buf) => /^\s*<(!doctype|html)/i.test(buf.subarray(0, 64).toString('utf8'));

describe('preview social: o Worker não pode responder HTML no lugar da imagem', () => {
  before(() => {
    assert.ok(ASSETS_SOCIAIS.length > 0, 'nenhum asset social declarado na política');
  });

  for (const rota of ASSETS_SOCIAIS) {
    const ext = path.extname(rota).toLowerCase();
    const regra = ASSINATURA[ext];

    describe(`GET ${rota} sem cookie de sessão`, () => {
      test('responde 200', async () => {
        const r = await pegar(rota);
        assert.equal(r.status, 200);
      });

      test('responde o content-type do formato, nunca text/html', async () => {
        const r = await pegar(rota);
        const ct = r.headers.get('content-type') || '';
        assert.doesNotMatch(ct, /text\/html/i,
          `${rota} respondeu ${ct}. É a regressão do cartão de prévia: o portão devolveu a tela de acesso no lugar da imagem.`);
        assert.match(ct, new RegExp(regra.contentType.replace('/', '\\/'), 'i'));
      });

      test('o corpo é o binário do formato, não uma página', async () => {
        const buf = Buffer.from(await (await pegar(rota)).arrayBuffer());
        assert.equal(ehHtml(buf), false,
          `${rota} devolveu HTML com status 200. É exatamente o defeito que este teste existe para impedir.`);
        assert.ok(regra.confere(buf),
          `${rota} não bate com a assinatura de ${ext} nos primeiros bytes`);
      });

      test('tem tamanho plausível para arte de verdade', async () => {
        const buf = Buffer.from(await (await pegar(rota)).arrayBuffer());
        assert.ok(buf.length >= regra.minimo,
          `${rota} veio com ${buf.length} bytes, abaixo do mínimo de ${regra.minimo}. Placeholder no lugar da arte chega borrado no prospect.`);
      });
    });
  }
});

describe('todos os assets públicos da landing atravessam o portão', () => {
  for (const rota of ASSETS_PUBLICOS) {
    test(`GET ${rota} sem cookie devolve binário`, async () => {
      const r = await pegar(rota);
      const buf = Buffer.from(await r.arrayBuffer());
      assert.equal(r.status, 200);
      assert.equal(ehHtml(buf), false, `${rota} devolveu HTML: a tela de acesso ficaria sem fundo`);
      const regra = ASSINATURA[path.extname(rota).toLowerCase()];
      assert.ok(regra.confere(buf), `${rota} não bate com a assinatura do formato`);
    });
  }
});

/* O Worker roda no edge e não pode importar scripts/politica-binarios.mjs, que
   é módulo de build. Então ele repete a lista como literal, e essa repetição é
   a única que sobrou. Ela não pode divergir em silêncio: aqui a lista literal é
   lida do fonte e comparada com a política, item a item. */
describe('a lista literal do Worker não pode divergir da política', () => {
  const gateJs = fs.readFileSync(path.join(ROOT, 'demo-worker', 'src', 'index.js'), 'utf8');
  const bloco = (gateJs.match(/const PUBLICOS = new Set\(\[([\s\S]*?)\]\)/) || [])[1] || '';
  const literal = [...bloco.matchAll(/'([^']+)'/g)].map((m) => m[1]);

  test('o Set do Worker é exatamente ASSETS_PUBLICOS', () => {
    assert.deepEqual([...literal].sort(), [...ASSETS_PUBLICOS].sort(),
      'a lista do Worker e a política saíram de sincronia. Um item a mais abre o portão, um a menos quebra a tela ou o cartão de prévia.');
  });
});

describe('o portão continua fechado para tudo que não está na lista', () => {
  for (const rota of ['/', '/index.html', '/assets/index-BcOWIT0P.js', '/apresentacao.html']) {
    test(`GET ${rota} sem cookie devolve a tela de acesso`, async () => {
      const r = await pegar(rota);
      const ct = r.headers.get('content-type') || '';
      assert.equal(r.status, 200);
      assert.match(ct, /text\/html/i);
      const corpo = await r.text();
      assert.match(corpo, /Crie seu acesso/,
        `${rota} não devolveu a tela de acesso. O portão do demo pode ter aberto.`);
    });
  }

  /* A liberação é por igualdade exata. Se um dia virar prefixo ou casamento por
     nome de arquivo, estes dois passam a vazar e o teste cai. */
  for (const rota of ['/sub/atlas-card.png', '/atlas-card.png.html', '/atlas-card.PNG']) {
    test(`GET ${rota} NÃO é tratado como asset público`, async () => {
      const r = await pegar(rota);
      const corpo = await r.text();
      assert.match(corpo, /Crie seu acesso/,
        `${rota} atravessou o portão. A lista pública deixou de ser por igualdade exata.`);
    });
  }

  test('método diferente de GET não atravessa pela lista pública', async () => {
    const r = await pegar('/atlas-card.png', { method: 'HEAD' });
    const ct = r.headers.get('content-type') || '';
    assert.match(ct, /text\/html/i, 'HEAD atravessou a lista pública, que é liberada só para GET');
  });
});
