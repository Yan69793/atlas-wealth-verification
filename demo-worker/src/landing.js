// Camada de apresentacao da tela de acesso do demo (demo.multi-assets.com).
//
// Vive separada de src/index.js de proposito: aquele arquivo e o portao
// (cadastro, login, sessao, hash de senha) e nao deve ser reaberto para mexer
// em pixel. Aqui nao existe nenhuma decisao de autenticacao, so o HTML e o CSS
// que o portao devolve quando falta cookie. Quem quiser reaproveitar esta
// mesma landing em outro Worker importa `paginaLogin` daqui e passa as rotas
// dos forms, sem arrastar junto o codigo de sessao.
//
// Familia visual: os tokens (dourado #C4A46A, texto #E8E4D9, apagado #8B93A0,
// tracking 0.14em, botao mono caixa-alta de 48px, canto reto) sao os mesmos do
// multi-assets.com, lidos do CSS de producao dele em 2026-09-01. O titulo usa
// Georgia, que e o proprio fallback declarado la para a Playfair Display: liga
// as duas telas sem pedir fonte externa, o que a CSP desta pagina nao permite.
//
// Movimento: o hero do multi-assets.com faz a aproximacao dentro de um video.
// Aqui nao ha video (o plano da conta Higgsfield recusa modelo de video), e a
// mesma sensacao e reproduzida em CSS com translateZ sob perspectiva, que e
// aproximacao de camera de verdade e nao um scale achatado. So transform e
// opacity, sem biblioteca, sem JavaScript (a CSP nao tem script-src).
//
// O fundo e arte sintetica gerada no Higgsfield, nunca captura de tela: nao ha
// dado de carteira nenhum dentro dela. Duas composicoes distintas, a de celular
// foi enquadrada com as velas no topo e no rodape e uma faixa central vazia,
// que e onde o formulario cai. Nao e o desktop cortado.

const BG_DESKTOP = '/atlas-bg-desktop.webp';
const BG_MOBILE = '/atlas-bg-mobile.webp';

const ERROS = {
  credenciais: 'Email ou senha incorretos.',
  'email-existe': 'Este email já está cadastrado. Entre com sua senha.',
  'email-invalido': 'Email inválido.',
  'senha-curta': 'A senha precisa de pelo menos 8 caracteres.',
  'senha-longa': 'Senha muito longa (máx. 128 caracteres).',
  'nome-vazio': 'Informe seu nome.',
  'payload-grande': 'Requisição inválida.',
  'erro-interno': 'Erro interno. Tente de novo em instantes.',
};

const CSS = `
*, *::before, *::after { box-sizing: border-box; }

:root {
  --bg: #0A1420;
  --tinta: #060C14;
  --ouro: #C4A46A;
  --ouro-claro: #D8BC84;
  --texto: #E8E4D9;
  --apagado: #8B93A0;
  --linha: rgba(232, 228, 217, 0.10);
  --alerta: #E27D60;
  --tracking: 0.14em;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --serif: Georgia, "Times New Roman", serif;

  /* Amplitude da aproximacao. Celular entra com metade do curso do desktop:
     em tela pequena o mesmo deslocamento vira enjoo, nao sofisticacao. */
  --z-inicio: -70px;
  --escala-inicio: 1.10;
  --dolly: 16s;
}

@media (min-width: 768px) {
  :root { --z-inicio: -170px; --escala-inicio: 1.20; --dolly: 22s; }
}

html { overflow-x: hidden; -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  overflow-x: hidden;
  background: var(--bg);
  color: var(--texto);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.5;
}

/* ---------- Cena de fundo ----------
   position:fixed em vez de absolute: no celular a barra de endereco entra e
   sai durante o scroll e muda a altura da viewport. Com absolute o fundo
   redimensiona junto e a imagem "respira" a cada toque. */
.cena {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  perspective: 1400px;
}

.cena picture { display: block; position: absolute; inset: 0; }

.cena__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  transform: translate3d(0, 0, var(--z-inicio)) scale(var(--escala-inicio));
  will-change: transform;
  /* Só transform, sem fade de entrada de propósito. O fundo é o maior elemento
     da tela, então é ele que marca o LCP, e uma rampa de opacity a partir do
     zero adia essa marca pelo tempo inteiro da rampa (medido: 900ms de fade
     custavam ~2,1s de LCP). Sem o fade a imagem pinta assim que chega, e a
     troca do navy sólido do body para a arte quase não se percebe, porque a
     arte é navy também. A entrada continua existindo, ela é o movimento. */
  animation: dolly var(--dolly) cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* A escala final e 1.02 e nao 1: sob perspectiva o translateZ negativo encolhe
   o elemento, e a margem garante que nenhuma borda do fundo apareca em momento
   nenhum do percurso, em qualquer proporcao de tela. */
@keyframes dolly {
  from { transform: translate3d(0, 0.8%, var(--z-inicio)) scale(var(--escala-inicio)); }
  to   { transform: translate3d(0, 0, 0) scale(1.02); }
}

/* ---------- Veu de leitura ----------
   Escurece o miolo onde o cartao cai. No celular o gradiente e mais fechado
   porque o formulario ocupa quase toda a tela. */
.veu {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(120% 52% at 50% 50%, rgba(6, 12, 20, 0.82) 0%, rgba(6, 12, 20, 0.46) 52%, rgba(6, 12, 20, 0.12) 100%),
    linear-gradient(180deg, rgba(6, 12, 20, 0.42) 0%, rgba(6, 12, 20, 0.14) 26%, rgba(6, 12, 20, 0.14) 74%, rgba(6, 12, 20, 0.50) 100%);
}

@media (min-width: 768px) {
  .veu {
    background:
      radial-gradient(78% 72% at 50% 50%, rgba(6, 12, 20, 0.88) 0%, rgba(6, 12, 20, 0.46) 55%, rgba(6, 12, 20, 0.10) 100%),
      linear-gradient(180deg, rgba(6, 12, 20, 0.48) 0%, rgba(6, 12, 20, 0.14) 40%, rgba(6, 12, 20, 0.58) 100%);
  }
}

/* ---------- Palco ---------- */
.palco {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px max(14px, env(safe-area-inset-right)) 16px max(14px, env(safe-area-inset-left));
  padding-top: max(16px, env(safe-area-inset-top));
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}

/* Tela baixa (paisagem no celular, notebook curto): o cartao passa a ancorar
   no topo. Centralizado, o que nao cabe some para cima e fica inalcancavel,
   porque nao ha como rolar para antes do inicio do fluxo. */
@media (max-height: 720px) {
  .palco { align-items: flex-start; }
}

/* ---------- Cartao ---------- */
/* No celular o cartao e translucido de proposito, com degrade: mais aberto em
   cima, onde a arte tem as velas, e mais fechado embaixo, onde cai o texto
   longo de LGPD e o contraste precisa ser garantido. Cartao opaco aqui viraria
   uma caixa preta cobrindo a tela inteira e a arte sumiria, que e exatamente o
   que faz o celular parecer versao pobre do desktop. */
.cartao {
  width: 100%;
  max-width: 400px;
  padding: 20px 18px;
  border: 1px solid var(--linha);
  background: linear-gradient(180deg, rgba(9, 15, 24, 0.72) 0%, rgba(9, 15, 24, 0.90) 100%);
  animation: sobe 700ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both;
}

@keyframes sobe {
  from { opacity: 0; transform: translate3d(0, 14px, 0); }
  to   { opacity: 1; transform: none; }
}

/* Desfoque so a partir do tablet. Em celular fraco backdrop-filter em tela
   cheia derruba o scroll e o foco dos campos, e o ganho visual e pequeno
   sobre um fundo que ja esta escuro. */
@media (min-width: 768px) {
  .cartao {
    max-width: 420px;
    padding: 34px 32px;
    background: rgba(9, 15, 24, 0.62);
    backdrop-filter: blur(16px) saturate(118%);
    -webkit-backdrop-filter: blur(16px) saturate(118%);
    box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.85);
  }
}

.marca {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: var(--tracking);
  text-transform: uppercase;
  color: var(--ouro);
  margin: 0 0 14px;
}

.titulo {
  font-family: var(--serif);
  font-weight: 400;
  font-size: 18px;
  line-height: 1.3;
  margin: 0 0 10px;
  color: var(--texto);
}

.alerta {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-left: 2px solid var(--alerta);
  background: rgba(226, 125, 96, 0.10);
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--alerta);
}

label {
  display: block;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: var(--tracking);
  text-transform: uppercase;
  color: var(--apagado);
  margin: 10px 0 5px;
}

/* 16px fixo em toda tela: abaixo disso o iOS aplica zoom ao focar o campo,
   o que reposiciona a pagina inteira e joga o botao para fora da viewport. */
input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--linha);
  border-radius: 0;
  color: var(--texto);
  font-family: inherit;
  font-size: 16px;
  transition: border-color 0.2s, background 0.2s;
}

input:focus {
  outline: none;
  border-color: var(--ouro);
  background: rgba(255, 255, 255, 0.06);
}

button[type="submit"] {
  width: 100%;
  min-height: 48px;
  margin-top: 16px;
  padding: 13px 18px;
  background: var(--ouro);
  border: 1px solid var(--ouro);
  border-radius: 0;
  color: #0A1420;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--tracking);
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

button[type="submit"]:hover { background: var(--ouro-claro); border-color: var(--ouro-claro); }

button[type="submit"]:focus-visible,
input:focus-visible { outline: 2px solid var(--ouro-claro); outline-offset: 2px; }

.divisor {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 14px;
}

.divisor::before, .divisor::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--linha);
}

.divisor span {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: var(--tracking);
  text-transform: uppercase;
  color: var(--apagado);
}

.lgpd {
  margin: 16px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--linha);
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--apagado);
}

/* A partir do tablet o espaco volta a ser generoso. O bloco vive junto para
   nao ficar caçando override espalhado quando alguem for ajustar o ritmo. */
@media (min-width: 768px) {
  .palco {
    padding: 24px max(16px, env(safe-area-inset-right)) 24px max(16px, env(safe-area-inset-left));
    padding-top: max(24px, env(safe-area-inset-top));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
  }
  .marca { margin-bottom: 20px; }
  .titulo { font-size: 19px; margin-bottom: 14px; }
  label { margin: 14px 0 6px; }
  button[type="submit"] { margin-top: 20px; }
  .divisor { margin: 24px 0 20px; }
  .lgpd { margin-top: 22px; padding-top: 16px; font-size: 12px; line-height: 1.6; }
}

/* Ajuste por ALTURA, deliberadamente depois do bloco de largura para vencer
   sobre ele. Pega os dois casos que estouravam: celular de 800px de altura
   (Android comum) e notebook de 768px, que com o respiro de desktop nao cabia.
   A regra e por altura porque o problema e de altura, nao de largura: o mesmo
   1366 de largura cabe folgado num monitor de 1080. */
@media (max-height: 860px) {
  .cartao { padding: 16px 18px; }
  .marca { margin-bottom: 12px; }
  .titulo { margin-bottom: 9px; }
  label { margin: 9px 0 5px; }
  button[type="submit"] { margin-top: 14px; }
  .divisor { margin: 14px 0 12px; }
  .lgpd { margin-top: 14px; padding-top: 10px; font-size: 11.5px; line-height: 1.5; }
}

/* Notebook: largura sobrando e altura faltando.
   Em 1366x768 os dois formularios empilhados nao cabem por ~30px, e apertar
   mais o respiro so deixaria a tela sufocada. Aqui a solucao vem da largura,
   que existe de sobra: os dois blocos entram lado a lado e o separador vira
   vertical. Corta quase metade da altura sem tirar nada de ninguem.
   Nao vale para 1920x1080, onde a coluna unica cabe e fica melhor centrada,
   nem para tablet em pe (768 de largura por 1024 de altura), que tem altura de
   sobra. O limiar de 720px de largura tambem pega celular deitado, onde a
   coluna unica obrigava a rolar quase o dobro da tela. */
@media (min-width: 720px) and (max-height: 900px) {
  .cartao { max-width: 720px; }
  .colunas {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0 26px;
    align-items: start;
  }
  .divisor { flex-direction: column; margin: 0; height: 100%; gap: 10px; }
  .divisor::before, .divisor::after { width: 1px; height: auto; flex: 1; }
  .titulo { margin-top: 0; }
}

/* Tela muito baixa: aperta o respiro vertical antes de deixar rolar. */
@media (max-height: 620px) {
  .cartao { padding: 20px 18px; }
  .marca { margin-bottom: 14px; }
  .divisor { margin: 18px 0 14px; }
  .lgpd { margin-top: 16px; padding-top: 12px; }
  label { margin-top: 10px; }
  button[type="submit"] { margin-top: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .cena__img {
    animation: none;
    transform: scale(1.02);
    opacity: 1;
    will-change: auto;
  }
  .cartao {
    animation: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/**
 * HTML da tela de acesso.
 *
 * @param {object} opcoes
 * @param {string|null} opcoes.erro          codigo de erro vindo da querystring
 * @param {string} opcoes.cadastrarPath      action do form de cadastro
 * @param {string} opcoes.loginPath          action do form de login
 */
export function paginaLogin({ erro, cadastrarPath, loginPath }) {
  const msgErro = ERROS[erro] || '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<meta name="theme-color" content="#0A1420" />
<title>ATLAS — Acesso ao demo</title>
<link rel="preload" as="image" href="${BG_MOBILE}" media="(max-width: 767px)" />
<link rel="preload" as="image" href="${BG_DESKTOP}" media="(min-width: 768px)" />
<style>${CSS}</style>
</head>
<body>
  <div class="cena" aria-hidden="true">
    <picture>
      <source media="(max-width: 767px)" srcset="${BG_MOBILE}" width="828" height="1472" />
      <img class="cena__img" src="${BG_DESKTOP}" alt="" width="1920" height="1080"
           decoding="async" fetchpriority="high" />
    </picture>
  </div>
  <div class="veu" aria-hidden="true"></div>

  <main class="palco">
    <section class="cartao">
      <p class="marca">ATLAS</p>
      ${msgErro ? `<p class="alerta" role="alert">${escapar(msgErro)}</p>` : ''}

      <div class="colunas">
        <div class="coluna">
          <h1 class="titulo">Crie seu acesso</h1>
          <form method="POST" action="${cadastrarPath}">
            <label for="nome">Seu nome</label>
            <input type="text" id="nome" name="nome" autocomplete="name" required />
            <label for="email-criar">Seu email</label>
            <input type="email" id="email-criar" name="email" autocomplete="email" required />
            <label for="senha-criar">Crie sua senha</label>
            <input type="password" id="senha-criar" name="senha" autocomplete="new-password" minlength="8" required />
            <button type="submit">Criar e entrar</button>
          </form>
        </div>

        <div class="divisor"><span>ou</span></div>

        <div class="coluna">
          <h2 class="titulo">Já tenho acesso</h2>
          <form method="POST" action="${loginPath}">
            <label for="email-entrar">Email</label>
            <input type="email" id="email-entrar" name="email" autocomplete="email" required />
            <label for="senha-entrar">Senha</label>
            <input type="password" id="senha-entrar" name="senha" autocomplete="current-password" required />
            <button type="submit">Entrar</button>
          </form>
        </div>
      </div>

      <p class="lgpd">Seus dados (nome e email) são usados só para liberar o acesso ao demo e para avisar o dono do novo cadastro. Podem ser apagados quando você pedir. O demo contém apenas dados sintéticos; nenhum dado seu aparece nele.</p>
    </section>
  </main>
</body>
</html>`;
}
