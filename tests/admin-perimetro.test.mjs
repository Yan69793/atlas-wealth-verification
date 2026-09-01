/**
 * Perímetro do painel do dono e contadores do funil.
 *
 * O painel é o único ramo do Worker que lê dado pessoal: ele mostra nome e
 * email de quem se cadastrou no demo. Tudo o que segura essa porta precisa de
 * teste de comportamento, não de leitura de código.
 *
 * O risco específico desta escolha de perímetro. O dono preferiu secret próprio
 * a Cloudflare Access. Secret próprio compartilha processo com o demo público,
 * então o modo de falhar é sessão de um lado valendo do outro. Por isso o teste
 * que mais importa aqui é o do cookie cruzado.
 *
 * Chama o handler direto com env de mentira, mesmo molde de
 * tests/social-preview.test.mjs. Perímetro se prova sem subir servidor.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import worker from '../demo-worker/src/index.js';

const DEMO_SENHA = 'segredo-do-demo-so-para-teste';
const ADMIN_SENHA = 'segredo-do-admin-so-para-teste';

/* D1 de mentira. Guarda o que foi gravado para o teste de contador conferir, e
   responde .all() com listas vazias para o painel renderizar. */
function bancoFalso() {
  const gravados = [];
  const db = {
    gravados,
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async run() {
          if (/INSERT INTO eventos/.test(sql)) gravados.push({ dia: args[0], evento: args[1], detalhe: args[2] });
          return { meta: { changes: 1 } };
        },
        async all() { return { results: [] }; },
        async first() { return null; },
      };
      return stmt;
    },
  };
  return db;
}

const envDe = (extra = {}) => ({
  DEMO_SENHA,
  ADMIN_SENHA,
  DB: bancoFalso(),
  ASSETS: { async fetch() { return new Response('CONTEUDO DO APP', { headers: { 'content-type': 'text/html' } }); } },
  ...extra,
});

const ctxFalso = () => {
  const pendentes = [];
  return { pendentes, waitUntil: (p) => pendentes.push(p) };
};

async function pegar(caminho, { env = envDe(), ctx = ctxFalso(), ...init } = {}) {
  const r = await worker.fetch(new Request('https://demo.multi-assets.com' + caminho, init), env, ctx);
  await Promise.all(ctx.pendentes || []);
  return { r, env, ctx };
}

/* Cookie de admin legítimo, derivado do mesmo jeito que o Worker deriva. */
async function cookieAdminValido(segredo = ADMIN_SENHA) {
  const chave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode('admin\natlas-demo-admin-v1'));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `atlas_admin_sessao=${hex}`;
}

describe('painel: porta fechada', () => {
  test('GET /admin sem cookie pede senha e não mostra dado', async () => {
    const { r } = await pegar('/admin');
    const corpo = await r.text();
    assert.equal(r.status, 200);
    assert.match(corpo, /Senha do painel/);
    assert.doesNotMatch(corpo, /Painel do demo/, 'o painel renderizou sem autenticação');
    assert.doesNotMatch(corpo, /Cadastros/, 'a lista de cadastros vazou para quem não entrou');
  });

  test('senha errada não abre e não devolve cookie', async () => {
    const { r } = await pegar('/admin/entrar', {
      method: 'POST',
      body: new URLSearchParams({ senha: 'errada' }),
    });
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('Set-Cookie'), null, 'devolveu cookie mesmo com senha errada');
    assert.match(r.headers.get('Location') || '', /erro=1/);
  });

  test('senha certa abre e o cookie fica preso a /admin', async () => {
    const { r } = await pegar('/admin/entrar', {
      method: 'POST',
      body: new URLSearchParams({ senha: ADMIN_SENHA }),
    });
    assert.equal(r.status, 303);
    const ck = r.headers.get('Set-Cookie') || '';
    assert.match(ck, /^atlas_admin_sessao=[0-9a-f]{64}/);
    assert.match(ck, /Path=\/admin/, 'cookie não está preso ao painel');
    assert.match(ck, /HttpOnly/);
    assert.match(ck, /SameSite=Strict/);
    assert.match(ck, /Max-Age=43200/, 'sessão do painel deveria durar 12h, não os 30 dias do demo');
  });

  test('cookie válido abre o painel', async () => {
    const { r } = await pegar('/admin', { headers: { Cookie: await cookieAdminValido() } });
    const corpo = await r.text();
    assert.equal(r.status, 200);
    assert.match(corpo, /Painel do demo/);
  });
});

describe('painel: os dois perímetros não se misturam', () => {
  test('cookie de sessão do DEMO não abre o painel', async () => {
    // Sessão de visitante legítima do demo, assinada com DEMO_SENHA.
    const chave = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(DEMO_SENHA), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode('a@b.com\natlas-demo-sessao-v1'));
    const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const { r } = await pegar('/admin', { headers: { Cookie: `atlas_demo_sessao=a@b.com:${hex}` } });
    const corpo = await r.text();
    assert.match(corpo, /Senha do painel/, 'sessão do demo virou sessão de admin');
  });

  test('cookie de admin assinado com o segredo do demo é recusado', async () => {
    const { r } = await pegar('/admin', { headers: { Cookie: await cookieAdminValido(DEMO_SENHA) } });
    const corpo = await r.text();
    assert.match(corpo, /Senha do painel/, 'token assinado com o segredo errado foi aceito');
  });

  test('cookie de admin NÃO abre o app do demo', async () => {
    const { r } = await pegar('/', { headers: { Cookie: await cookieAdminValido() } });
    const corpo = await r.text();
    assert.match(corpo, /Crie seu acesso/, 'cookie de admin atravessou o portão do demo');
  });

  test('/admin nunca é servido pelo binding de assets', async () => {
    const env = envDe({ ASSETS: { async fetch() { throw new Error('ASSETS foi chamado para /admin'); } } });
    const { r } = await pegar('/admin', { env });
    assert.equal(r.status, 200);
  });

  test('sem ADMIN_SENHA o painel recusa em vez de abrir', async () => {
    const env = envDe(); delete env.ADMIN_SENHA;
    const { r } = await pegar('/admin', { env });
    assert.equal(r.status, 500);
    assert.doesNotMatch(await r.text(), /Cadastros/);
  });

  test('painel não é indexável e não é cacheável', async () => {
    const { r } = await pegar('/admin', { headers: { Cookie: await cookieAdminValido() } });
    assert.match(r.headers.get('X-Robots-Tag') || '', /noindex/);
    assert.match(r.headers.get('Cache-Control') || '', /no-store/);
    const csp = r.headers.get('Content-Security-Policy') || '';
    assert.match(csp, /default-src 'none'/);
    assert.doesNotMatch(csp, /script-src/, 'o painel não tem JavaScript, script-src não deve existir');
  });
});

describe('contadores do funil', () => {
  test('documento conta uma visita', async () => {
    const { env } = await pegar('/');
    const tela = env.DB.gravados.filter((g) => g.evento === 'tela');
    assert.equal(tela.length, 1);
  });

  /* O motivo deste teste: com run_worker_first todo asset passa pelo Worker.
     Contar sem filtrar daria uma "visita" por imagem, e o funil mostraria três
     vezes mais gente do que existe. */
  test('asset da tela NÃO conta visita', async () => {
    for (const a of ['/atlas-bg-desktop.webp', '/atlas-bg-mobile.webp', '/atlas-card.png']) {
      const { env } = await pegar(a);
      assert.deepEqual(env.DB.gravados, [], `${a} incrementou o contador`);
    }
  });

  test('cadastro recusado conta o motivo, não o valor digitado', async () => {
    const { env } = await pegar('/cadastrar', {
      method: 'POST',
      body: new URLSearchParams({ nome: '', email: 'a@b.com', senha: '12345678' }),
    });
    const ev = env.DB.gravados.find((g) => g.evento === 'cadastro_erro');
    assert.ok(ev, 'não contou a recusa');
    assert.equal(ev.detalhe, 'nome-vazio');
    const tudo = JSON.stringify(env.DB.gravados);
    assert.doesNotMatch(tudo, /a@b\.com/, 'o contador gravou o email digitado');
    assert.doesNotMatch(tudo, /12345678/, 'o contador gravou a senha digitada');
  });

  test('login recusado não distingue email inexistente de senha errada', async () => {
    const { env } = await pegar('/entrar', {
      method: 'POST',
      body: new URLSearchParams({ email: 'ninguem@exemplo.com', senha: 'qualquer' }),
    });
    const ev = env.DB.gravados.find((g) => g.evento === 'login_erro');
    assert.ok(ev);
    assert.equal(ev.detalhe, 'credenciais');
  });

  test('o contador grava no caminho de fundo, não no da resposta', async () => {
    const ctx = ctxFalso();
    await pegar('/', { ctx });
    assert.ok(ctx.pendentes.length > 0, 'o incremento não foi para ctx.waitUntil e está no caminho da resposta');
  });

  test('sem banco a requisição continua respondendo', async () => {
    const env = envDe(); delete env.DB;
    const { r } = await pegar('/', { env });
    assert.equal(r.status, 200);
    assert.match(await r.text(), /Crie seu acesso/);
  });
});
