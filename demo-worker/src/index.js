// Gate de senha do demo comercial (demo.multi-assets.com).
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
// Segredo unico, DEMO_SENHA, nunca commitado:
//   npx wrangler secret put DEMO_SENHA --name app-verificacao-carteiras-atlas

const COOKIE_NAME = 'atlas_demo_sessao';
const TOKEN_INFO = 'atlas-demo-sessao-v1';
const LOGIN_PATH = '/entrar';

export default {
  async fetch(request, env) {
    if (!env.DEMO_SENHA) {
      return new Response(
        'Configuracao ausente: defina o secret DEMO_SENHA neste Worker antes de publicar.',
        { status: 500 }
      );
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === LOGIN_PATH) {
      return handleLogin(request, env, url);
    }

    if (await estaAutenticado(request, env)) {
      return env.ASSETS.fetch(request);
    }

    return paginaLogin({ erro: url.searchParams.get('erro') === '1' });
  },
};

async function handleLogin(request, env, url) {
  const form = await request.formData();
  const senha = String(form.get('senha') || '');

  if (!(await compararSeguro(senha, env.DEMO_SENHA))) {
    return Response.redirect(new URL('/?erro=1', url), 303);
  }

  const token = await assinar(env.DEMO_SENHA);
  // Secure exige https: em wrangler dev local (http) o navegador descartaria
  // o cookie inteiro se o atributo viesse fixo.
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  const headers = new Headers({ Location: '/' });
  headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=2592000`);
  return new Response(null, { status: 303, headers });
}

async function estaAutenticado(request, env) {
  const cabecalho = request.headers.get('Cookie') || '';
  const par = cabecalho.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE_NAME}=`));
  if (!par) return false;

  const valor = par.slice(COOKIE_NAME.length + 1);
  const esperado = await assinar(env.DEMO_SENHA);
  return compararSeguro(valor, esperado);
}

// Token deriva da propria senha: trocar o secret invalida toda sessao aberta
// sem precisar de lista de revogacao.
async function assinar(segredo) {
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const assinatura = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(TOKEN_INFO));
  return [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Compara hash em vez do valor cru: tempo constante de verdade (nunca sai do
// laco cedo) e sem vazar tamanho da senha por comprimento da string.
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

function paginaLogin({ erro }) {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>ATLAS — Acesso ao demo</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0A1928;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #E8EDF2;
  }
  .card {
    width: min(360px, 90vw);
    padding: 2.5rem 2rem;
    border: 1px solid rgba(196, 162, 40, 0.25);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.02);
  }
  .marca {
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 0.8rem;
    letter-spacing: 0.15em;
    color: #C4A228;
    margin: 0 0 1.75rem;
  }
  label {
    display: block;
    font-size: 0.85rem;
    color: #9AA7B4;
    margin-bottom: 0.5rem;
  }
  input {
    width: 100%;
    padding: 0.65rem 0.75rem;
    background: #0F2337;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    color: #E8EDF2;
    font-size: 0.95rem;
  }
  input:focus { outline: none; border-color: #C4A228; }
  button {
    width: 100%;
    margin-top: 1.25rem;
    padding: 0.7rem;
    background: #C4A228;
    border: none;
    border-radius: 3px;
    color: #0A1928;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
  }
  button:hover { background: #D4B23A; }
  .aviso {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: #E27D60;
  }
</style>
</head>
<body>
  <div class="card">
    <p class="marca">ATLAS</p>
    ${erro ? '<p class="aviso">Senha incorreta.</p>' : ''}
    <form method="POST" action="${LOGIN_PATH}">
      <label for="senha">Senha de acesso ao demo</label>
      <input type="password" id="senha" name="senha" autofocus required />
      <button type="submit">Entrar</button>
    </form>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: erro ? 401 : 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
