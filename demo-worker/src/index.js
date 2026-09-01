// Cadastro proprio do demo comercial (demo.multi-assets.com).
//
// Roda antes do binding ASSETS (run_worker_first=true no wrangler.toml) e so
// libera passagem para os arquivos estaticos com um cookie de sessao valido.
// Diferenca de proposito para a senha que existia no produto real e foi
// removida: aquela rodava so no navegador e nao segurava nada de verdade,
// o HTML/JS ja tinha ido inteiro para o cliente antes da checagem. Aqui a
// checagem roda no Worker, e sem cookie valido o Worker nunca chama
// env.ASSETS.fetch, entao o conteudo real nao sai do edge. Ainda assim nao e
// Access: nao existe dado real no pacote (ver wrangler.toml), o unico
// objetivo e nao deixar o link do demo aberto pra qualquer um que o ache.
//
// Desde 2026-09-01 o acesso e por conta propria (nome, email, senha), no
// lugar da senha unica compartilhada. Senha nunca em claro: hash
// PBKDF2-SHA256 com salt por usuario, formato versionavel
// (pbkdf2$<salt hex>$<iter>$<hash hex>). O cookie de sessao carrega o email
// assinado por HMAC (stateless: o gate nao le o D1 por request, cada asset
// serve rapido). Trade-off deliberado: sem revogacao individual de sessao;
// exclusao de cadastro a pedido (LGPD) deixa a sessao residual ativa ate o
// Max-Age de 30 dias. O demo so contem dado sintetico, e trocar o secret
// DEMO_SENHA invalida todas as sessoes abertas.
//
// Cadastro, login e a lista de quem entrou vivem no D1 atlas-demo-cadastros
// (binding DB). Nome e email sao dado pessoal LGPD: nunca logar, nunca
// colocar em commit, nunca refletir em pagina. O caminho de exclusao a pedido
// do cadastrado e um DELETE documentado no ESTADO/ESTADO-ATUAL.md, rodado via
// `npx wrangler d1 execute atlas-demo-cadastros --remote --command "DELETE
// FROM cadastros WHERE email = '<email>'"`.
//
// Secrets, por CONTA (nunca em argumento de linha de comando, o wrangler
// secret put le de stdin):
//   npx wrangler secret put DEMO_SENHA        -- chave de assinatura da sessao
//   npx wrangler secret put RESEND_API_KEY    -- aviso de novo cadastro (Resend)
//   npx wrangler secret put DEMO_EMAIL        -- destinatario do aviso (o dono)

import { paginaLogin } from './landing.js';

const COOKIE_NAME = 'atlas_demo_sessao';
const TOKEN_INFO = 'atlas-demo-sessao-v1';
const LOGIN_PATH = '/entrar';
const CADASTRAR_PATH = '/cadastrar';

// Arquivos servidos ANTES da checagem de sessao. Sao tres decoracoes sem dado
// nenhum dentro: o cartao de previa do link e as duas artes de fundo da tela de
// acesso, todas sinteticas (o cartao sai do gera-card-social.py, os fundos do
// Higgsfield). Nenhuma le carteira, e nenhuma revela o que existe atras do
// portao.
//
// Por que precisa existir: com run_worker_first=true o Worker responde a TODO
// caminho, e sem cookie ele devolvia o HTML da tela de acesso ate para
// /atlas-card.png. Resultado, o cartao de previa do link comercial chegava
// quebrado no WhatsApp e no LinkedIn, 200 com HTML no lugar da imagem, sem 404
// e sem sintoma nenhum de dentro. Conferido em producao em 2026-09-01: o
// endereco do cartao e a raiz devolviam os mesmos 3990 bytes.
//
// Set com igualdade exata e so GET, nunca prefixo nem curinga. Prefixo aqui
// viraria buraco no portao: /assets/ liberado serviria o bundle inteiro do app.
const PUBLICOS = new Set([
  '/atlas-card.png',
  '/atlas-bg-desktop.webp',
  '/atlas-bg-mobile.webp',
]);

// Iteracoes do PBKDF2-SHA256. 60.000 porque o limite de CPU do plano free do
// Workers e 10 ms por request (100k mede ~11 ms e fica em cima do cap, 60k
// fica ~7 ms). O numero fica versionado dentro do hash armazenado: subir a
// constante nao invalida hash antigo, so passa a valer para senhas novas.
const ITERACOES = 60000;
const SALT_BYTES = 16;

// Sender verificado no Resend. Precisa ser dominio verificado na conta do
// Resend, senao a API responde 403. Ajustar aqui uma unica vez.
const EMAIL_FROM = 'ATLAS Demo <demo@multi-assets.com>';

export default {
  async fetch(request, env) {
    if (!env.DEMO_SENHA) {
      return new Response(
        'Configuracao ausente: defina o secret DEMO_SENHA neste Worker antes de publicar.',
        { status: 500 }
      );
    }

    const url = new URL(request.url);

    // POST de autenticacao roteado aqui, ANTES do ASSETS. O fallback de SPA
    // (not_found_handling = single-page-application) nao pode engolir POST:
    // sem este roteamento previo, env.ASSETS.fetch serviria o index.
    if (request.method === 'POST') {
      if (url.pathname === CADASTRAR_PATH) return handleCadastrar(request, env, url);
      if (url.pathname === LOGIN_PATH) return handleEntrar(request, env, url);
    }

    // Decoracao publica (cartao de previa e fundos da tela). Vem antes da
    // checagem porque o robo do WhatsApp e do LinkedIn nunca tera cookie, e a
    // propria tela de acesso precisa da imagem para desenhar.
    if (request.method === 'GET' && PUBLICOS.has(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    if (await estaAutenticado(request, env)) {
      return env.ASSETS.fetch(request);
    }

    return paginaResposta(url.searchParams.get('erro'));
  },
};

async function handleCadastrar(request, env, url) {
  if (!env.DB) return redirectComErro(url, 'erro-interno');
  if (bodyGrande(request)) return redirectComErro(url, 'payload-grande');

  const form = await request.formData();
  const nome = String(form.get('nome') || '').trim().slice(0, 120);
  const email = String(form.get('email') || '').trim().toLowerCase();
  const senha = String(form.get('senha') || '');

  const erro = validarCadastro(nome, email, senha);
  if (erro) return redirectComErro(url, erro);

  const hash = await hashSenha(senha);
  const r = await env.DB.prepare(
    'INSERT OR IGNORE INTO cadastros (nome, email, senha_hash) VALUES (?, ?, ?)'
  ).bind(nome, email, hash).run();

  // INSERT OR IGNORE sem SELECT previo: sem corrida de checar-e-gravar. Se o
  // email ja existe, nada muda e o cadastro nao entra de novo.
  if (r.meta.changes === 0) {
    return redirectComErro(url, 'email-existe');
  }

  // Aviso ao dono, nao bloqueia o cadastro: falha sozinha em dev ou ausencia.
  notificarCadastro(env, { nome, email }).catch((e) => {
    console.error('notificarCadastro falhou (nao bloqueia cadastro):', e);
  });

  return respostaComCookie(url, await assinarCookie(email, env.DEMO_SENHA));
}

async function handleEntrar(request, env, url) {
  if (!env.DB) return redirectComErro(url, 'erro-interno');
  if (bodyGrande(request)) return redirectComErro(url, 'payload-grande');

  const form = await request.formData();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const senha = String(form.get('senha') || '');

  const linha = await env.DB.prepare('SELECT senha_hash FROM cadastros WHERE email = ?')
    .bind(email).first();

  if (!linha || !(await verificarSenha(senha, linha.senha_hash))) {
    // Email inexistente e senha errada caem na mesma resposta, para nao
    // revelar qual dos dois falhou. O sleep dura tempo de parede, nao CPU.
    await sleep(400);
    return redirectComErro(url, 'credenciais');
  }

  return respostaComCookie(url, await assinarCookie(email, env.DEMO_SENHA));
}

function validarCadastro(nome, email, senha) {
  if (!nome) return 'nome-vazio';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'email-invalido';
  if (senha.length < 8) return 'senha-curta';
  if (senha.length > 128) return 'senha-longa';
  return null;
}

function bodyGrande(request) {
  const len = Number(request.headers.get('content-length') || 0);
  return len > 16384;
}

// ----- Sessao (cookie assinado por HMAC, stateless) -----

async function hmacHex(segredo, mensagem) {
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const assinatura = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(mensagem));
  return [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Cookie = <email>:<hex64 do HMAC de email + '\n' + TOKEN_INFO>. Email nao
// contem ':', entao lastIndexOf separa sem ambiguidade.
async function assinarCookie(email, segredo) {
  return `${email}:${await hmacHex(segredo, email + '\n' + TOKEN_INFO)}`;
}

async function validarCookie(valor, segredo) {
  if (!valor) return null;
  const i = valor.lastIndexOf(':');
  if (i <= 0) return null;
  const email = valor.slice(0, i);
  const assinatura = valor.slice(i + 1);
  if (assinatura.length !== 64) return null; // hex de HMAC-SHA256, tamanho fixo
  const esperado = await hmacHex(segredo, email + '\n' + TOKEN_INFO);
  return (await compararSeguro(assinatura, esperado)) ? email : null;
}

async function estaAutenticado(request, env) {
  const cabecalho = request.headers.get('Cookie') || '';
  const par = cabecalho.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE_NAME}=`));
  if (!par) return false;
  const valor = par.slice(COOKIE_NAME.length + 1);
  return (await validarCookie(valor, env.DEMO_SENHA)) !== null;
}

function cookieHeader(token, url) {
  // Secure exige https: em wrangler dev local (http) o navegador descartaria
  // o cookie inteiro se o atributo viesse fixo.
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=2592000`;
}

function respostaComCookie(url, token) {
  const headers = new Headers({ Location: '/' });
  headers.append('Set-Cookie', cookieHeader(token, url));
  return new Response(null, { status: 303, headers });
}

function redirectComErro(url, codigo) {
  return Response.redirect(new URL(`/?erro=${codigo}`, url), 303);
}

// ----- Hash de senha (PBKDF2-SHA256) -----

const bufHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

function hexParaBuf(hex) {
  const par = String(hex || '').match(/[\da-f]{2}/gi);
  if (!par) return null;
  return new Uint8Array(par.map((h) => parseInt(h, 16)));
}

async function chavePBKDF2(senha) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
}

async function hashSenha(senha) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERACOES, hash: 'SHA-256' },
    await chavePBKDF2(senha),
    256
  );
  return `pbkdf2$${bufHex(salt)}$${ITERACOES}$${bufHex(bits)}`;
}

async function verificarSenha(senha, armazenado) {
  const [algo, saltHex, iterStr, hashHex] = String(armazenado || '').split('$');
  if (algo !== 'pbkdf2' || !saltHex || !iterStr || !hashHex) return false;
  const salt = hexParaBuf(saltHex);
  const iter = parseInt(iterStr, 10);
  if (!salt || !Number.isInteger(iter) || iter <= 0) return false;
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    await chavePBKDF2(senha),
    256
  );
  return compararSeguro(bufHex(bits), hashHex);
}

// ----- Comparacao em tempo constante -----

async function compararSeguro(a, b) {
  const enc = new TextEncoder();
  const bufA = await crypto.subtle.digest('SHA-256', enc.encode(a));
  const bufB = await crypto.subtle.digest('SHA-256', enc.encode(b));
  const arrA = new Uint8Array(bufA);
  const arrB = new Uint8Array(bufB);
  let diff = 0;
  for (let i = 0; i < arrA.length; i++) diff |= arrA[i] ^ arrB[i];
  return diff === 0;
}

// ----- Email de aviso ao dono (Resend, nao bloqueante) -----

async function notificarCadastro(env, { nome, email }) {
  if (!env.RESEND_API_KEY || !env.DEMO_EMAIL) {
    console.warn('notificarCadastro: RESEND_API_KEY/DEMO_EMAIL ausentes; email nao enviado');
    return;
  }
  const corpo = [
    'Novo cadastro no demo ATLAS',
    '',
    `Nome: ${nome}`,
    `Email: ${email}`,
    `Data: ${new Date().toISOString()}`,
  ].join('\n');

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: env.DEMO_EMAIL,
      subject: 'Novo cadastro no demo ATLAS',
      text: corpo,
    }),
  });
  if (!resp.ok) {
    console.error('notificarCadastro: Resend respondeu', resp.status, await resp.text().catch(() => ''));
  }
}

const sleep = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// ----- Resposta da tela de entrada -----
//
// O HTML e o CSS vivem em ./landing.js. Aqui fica so o envelope HTTP, para que
// mexer no visual nunca signifique reabrir o arquivo do portao.
//
// CSP: default-src 'none' continua valendo para todo o resto, e a unica folga
// nova e img-src 'self', que cobre as duas artes de fundo e nada alem. Segue
// sem script-src (a pagina nao tem JavaScript nenhum, os dois forms ficam
// empilhados em vez de virar aba), sem media-src, sem connect-src e sem
// font-src. data: e blob: continuam fora, entao nem imagem embutida passa.
// base-uri e frame-ancestors entram fechados: sem eles um <base> injetado
// reescreveria o destino dos forms, e a tela podia ser posta em iframe.
function paginaResposta(erro) {
  const html = paginaLogin({
    erro,
    cadastrarPath: CADASTRAR_PATH,
    loginPath: LOGIN_PATH,
  });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy':
        "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
