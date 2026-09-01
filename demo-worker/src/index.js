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
import { paginaAdminPorta, paginaAdminPainel } from './admin.js';

const COOKIE_NAME = 'atlas_demo_sessao';
const TOKEN_INFO = 'atlas-demo-sessao-v1';
const LOGIN_PATH = '/entrar';
const CADASTRAR_PATH = '/cadastrar';

// Painel do dono. Secret, cookie e string de contexto do HMAC sao TODOS
// separados dos do demo, de proposito: com o mesmo segredo ou a mesma string,
// um cookie de visitante do demo passaria a valer como cookie de admin, porque
// a assinatura bateria. Separado, um token de um lado nunca valida do outro.
const ADMIN_PATH = '/admin';
const ADMIN_LOGIN_PATH = '/admin/entrar';
const ADMIN_COOKIE = 'atlas_admin_sessao';
const TOKEN_ADMIN_INFO = 'atlas-demo-admin-v1';

// Janela do painel. Fixa, porque parametro de dias na querystring so serviria
// para alguem varrer o banco com range gigante.
const ADMIN_DIAS = 30;

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
  async fetch(request, env, ctx) {
    if (!env.DEMO_SENHA) {
      return new Response(
        'Configuracao ausente: defina o secret DEMO_SENHA neste Worker antes de publicar.',
        { status: 500 }
      );
    }

    const url = new URL(request.url);

    // Painel do dono, ANTES de tudo. Nunca cai em env.ASSETS.fetch e nunca
    // entra em PUBLICOS: e o unico ramo do Worker que le dado pessoal.
    if (url.pathname === ADMIN_PATH || url.pathname === ADMIN_LOGIN_PATH) {
      return rotaAdmin(request, env, url);
    }

    // POST de autenticacao roteado aqui, ANTES do ASSETS. O fallback de SPA
    // (not_found_handling = single-page-application) nao pode engolir POST:
    // sem este roteamento previo, env.ASSETS.fetch serviria o index.
    if (request.method === 'POST') {
      if (url.pathname === CADASTRAR_PATH) return handleCadastrar(request, env, url, ctx);
      if (url.pathname === LOGIN_PATH) return handleEntrar(request, env, url, ctx);
    }

    // Decoracao publica (cartao de previa e fundos da tela). Vem antes da
    // checagem porque o robo do WhatsApp e do LinkedIn nunca tera cookie, e a
    // propria tela de acesso precisa da imagem para desenhar.
    // NAO conta evento: sao os assets da propria tela, e conta-los inflaria a
    // visita pelo numero de imagens que o navegador busca.
    if (request.method === 'GET' && PUBLICOS.has(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    if (await estaAutenticado(request, env)) {
      if (ehDocumento(url.pathname)) contar(env, ctx, 'app_aberto');
      return env.ASSETS.fetch(request);
    }

    if (ehDocumento(url.pathname)) contar(env, ctx, 'tela');
    return paginaResposta(url.searchParams.get('erro'));
  },
};

/* Documento, nao asset.
   Com run_worker_first todo arquivo passa por aqui, entao contar sem este
   filtro daria uma "visita" por imagem, por folha de estilo e por pedaco de
   bundle. So o documento conta. As rotas do app sao hash (#/dashboard), entao
   a raiz cobre a navegacao inteira de quem ja entrou. */
const ehDocumento = (pathname) => pathname === '/' || pathname === '/index.html';

async function handleCadastrar(request, env, url, ctx) {
  if (!env.DB) return redirectComErro(url, 'erro-interno');
  if (bodyGrande(request)) {
    contar(env, ctx, 'cadastro_erro', 'payload-grande');
    return redirectComErro(url, 'payload-grande');
  }

  const form = await request.formData();
  const nome = String(form.get('nome') || '').trim().slice(0, 120);
  const email = String(form.get('email') || '').trim().toLowerCase();
  const senha = String(form.get('senha') || '');

  const erro = validarCadastro(nome, email, senha);
  if (erro) {
    contar(env, ctx, 'cadastro_erro', erro);
    return redirectComErro(url, erro);
  }

  const hash = await hashSenha(senha);
  const r = await env.DB.prepare(
    'INSERT OR IGNORE INTO cadastros (nome, email, senha_hash) VALUES (?, ?, ?)'
  ).bind(nome, email, hash).run();

  // INSERT OR IGNORE sem SELECT previo: sem corrida de checar-e-gravar. Se o
  // email ja existe, nada muda e o cadastro nao entra de novo.
  if (r.meta.changes === 0) {
    contar(env, ctx, 'cadastro_erro', 'email-existe');
    return redirectComErro(url, 'email-existe');
  }

  contar(env, ctx, 'cadastro_ok');

  // Aviso ao dono, nao bloqueia o cadastro: falha sozinha em dev ou ausencia.
  notificarCadastro(env, { nome, email }).catch((e) => {
    console.error('notificarCadastro falhou (nao bloqueia cadastro):', e);
  });

  return respostaComCookie(url, await assinarCookie(email, env.DEMO_SENHA));
}

async function handleEntrar(request, env, url, ctx) {
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
    // O contador tambem nao separa os dois casos, pelo mesmo motivo: o painel
    // do dono nao precisa saber, e gravar a diferenca criaria um oraculo de
    // "este email existe" para quem tivesse acesso ao banco.
    contar(env, ctx, 'login_erro', 'credenciais');
    await sleep(400);
    return redirectComErro(url, 'credenciais');
  }

  contar(env, ctx, 'login_ok');
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

// ----- Contadores agregados do funil -----
//
// NAO e log de acesso. A tabela `eventos` nao tem coluna de pessoa, de email,
// de IP nem de sessao (ver demo-worker/migrations/0002_eventos.sql). O que se
// guarda e "no dia X o evento Y aconteceu N vezes", e mais nada. Quem
// acrescentar aqui uma coluna que ligue evento a pessoa muda a natureza
// juridica da tabela sob LGPD, nao so o schema.
//
// Roda em ctx.waitUntil, fora do caminho da resposta. O cabecalho deste
// arquivo registra que o gate e stateless de proposito, "o gate nao le o D1
// por request, cada asset serve rapido", e o PBKDF2 ja gasta ~7ms dos 10ms de
// CPU do plano free. Gravar antes de responder desfaria as duas coisas.
//
// Falha de contador nunca derruba requisicao, mesmo criterio do
// notificarCadastro. Metrica quebrada e um problema. Demo fora do ar por causa
// da metrica seria pior.

// Fuso de Sao Paulo, nao UTC. O dono le o funil no fuso dele, e um cadastro das
// 21h cairia em "amanha" no relatorio se a chave do dia fosse UTC.
const diaEm = (quando) => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(quando);
  } catch {
    return quando.toISOString().slice(0, 10);
  }
};

const diaDeHoje = () => diaEm(new Date());
const diasAtras = (n) => diaEm(new Date(Date.now() - n * 86400000));

function contar(env, ctx, evento, detalhe = '') {
  if (!env.DB) return;

  const gravar = env.DB.prepare(
    'INSERT INTO eventos (dia, evento, detalhe, total) VALUES (?, ?, ?, 1) '
    + 'ON CONFLICT(dia, evento, detalhe) DO UPDATE SET total = total + 1'
  )
    .bind(diaDeHoje(), evento, String(detalhe || '').slice(0, 40))
    .run()
    .catch((e) => console.error('contador falhou (nao bloqueia a resposta):', e));

  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(gravar);
}

// ----- Painel do dono -----
//
// Perimetro por secret proprio (escolha do dono; a recomendacao tinha sido
// Cloudflare Access, que e o que ja protege a instancia). Endurecimentos que
// vieram junto: segredo separado do demo, cookie com Path preso a /admin,
// SameSite=Strict, sessao de 12h em vez dos 30 dias do demo, comparacao em
// tempo constante e atraso na senha errada.
//
// Este e o unico ramo do Worker que le dado pessoal. Nunca chama
// env.ASSETS.fetch e nunca entra em PUBLICOS.

const assinarAdmin = (segredo) => hmacHex(segredo, 'admin\n' + TOKEN_ADMIN_INFO);

function cookieAdminHeader(token, url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  // Path preso ao painel: o cookie nem e enviado nas rotas do demo. Max-Age de
  // 12h contra os 30 dias do demo, porque aqui a sessao da acesso a nome e
  // email de quem se cadastrou, nao a um ambiente sintetico.
  return `${ADMIN_COOKIE}=${token}; Path=${ADMIN_PATH}; HttpOnly${secure}; SameSite=Strict; Max-Age=43200`;
}

async function adminAutenticado(request, env) {
  const cabecalho = request.headers.get('Cookie') || '';
  const par = cabecalho.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${ADMIN_COOKIE}=`));
  if (!par) return false;
  const valor = par.slice(ADMIN_COOKIE.length + 1);
  if (valor.length !== 64) return false; // hex de HMAC-SHA256, tamanho fixo
  return compararSeguro(valor, await assinarAdmin(env.ADMIN_SENHA));
}

function respostaAdmin(corpo, status = 200, tipo = 'text/html; charset=utf-8') {
  return new Response(corpo, {
    status,
    headers: {
      'Content-Type': tipo,
      // Sem img-src: o painel nao tem imagem nenhuma. Mais apertada que a da
      // tela de acesso de proposito.
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store, private',
    },
  });
}

async function rotaAdmin(request, env, url) {
  if (!env.ADMIN_SENHA) {
    return respostaAdmin(
      'Configuracao ausente: defina o secret ADMIN_SENHA neste Worker antes de usar o painel.',
      500,
      'text/plain; charset=utf-8'
    );
  }

  if (request.method === 'POST' && url.pathname === ADMIN_LOGIN_PATH) {
    if (bodyGrande(request)) return Response.redirect(new URL(`${ADMIN_PATH}?erro=1`, url), 303);

    const form = await request.formData();
    const senha = String(form.get('senha') || '');

    if (!(await compararSeguro(senha, env.ADMIN_SENHA))) {
      await sleep(400);
      return Response.redirect(new URL(`${ADMIN_PATH}?erro=1`, url), 303);
    }

    const headers = new Headers({ Location: ADMIN_PATH });
    headers.append('Set-Cookie', cookieAdminHeader(await assinarAdmin(env.ADMIN_SENHA), url));
    return new Response(null, { status: 303, headers });
  }

  if (request.method !== 'GET') {
    return respostaAdmin('metodo nao permitido', 405, 'text/plain; charset=utf-8');
  }

  if (!(await adminAutenticado(request, env))) {
    return respostaAdmin(paginaAdminPorta({
      erro: url.searchParams.get('erro'),
      entrarPath: ADMIN_LOGIN_PATH,
    }));
  }

  if (!env.DB) return respostaAdmin('Banco indisponivel.', 503, 'text/plain; charset=utf-8');

  return respostaAdmin(paginaAdminPainel(await lerPainel(env)));
}

async function lerPainel(env) {
  const desde = diasAtras(ADMIN_DIAS);

  const [serie, erros, cadastros] = await Promise.all([
    env.DB.prepare(
      'SELECT dia, evento, SUM(total) AS total FROM eventos WHERE dia >= ? GROUP BY dia, evento'
    ).bind(desde).all(),
    env.DB.prepare(
      "SELECT evento, detalhe, SUM(total) AS total FROM eventos "
      + "WHERE dia >= ? AND evento LIKE '%\\_erro' ESCAPE '\\' "
      + 'GROUP BY evento, detalhe ORDER BY total DESC LIMIT 30'
    ).bind(desde).all(),
    // LIMIT deliberado: o painel e para ler o funil, nao para exportar a base.
    env.DB.prepare('SELECT nome, email, criado_em FROM cadastros ORDER BY criado_em DESC LIMIT 200').all(),
  ]);

  const linhas = serie.results || [];
  const totais = {};
  for (const l of linhas) totais[l.evento] = (totais[l.evento] || 0) + Number(l.total || 0);

  return {
    dias: ADMIN_DIAS,
    totais,
    serie: linhas,
    erros: erros.results || [],
    cadastros: cadastros.results || [],
  };
}

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
