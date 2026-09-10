/**
 * api.js — endpoints de dado do demo, todos escopados por papel.
 *
 * É aqui que o controle de acesso vale de verdade. O bundle do app não tem
 * carteira nenhuma (ver a seção 0 de platform-data.js): quem entrega carteira
 * é `GET /api/dados`, e ele entrega só o que o papel de quem pediu alcança.
 * Menu e guarda de rota no cliente são conveniência de interface. Se alguém
 * apagar as duas, nenhuma linha a mais de dado aparece, porque o servidor
 * nunca mandou.
 *
 * Três decisões que valem registro.
 *
 * 1. A IDENTIDADE SAI DO BANCO, NÃO DO COOKIE. O cookie assinado carrega um
 *    `usuario_id` e mais nada. Papel, `ativo`, `cliente_id` e atribuições são
 *    lidos do D1 a cada requisição. Por isso desativar um usuário vale na
 *    requisição seguinte, e por isso não existe campo de papel que alguém
 *    possa forjar: não há onde escrever.
 *
 * 2. A RECUSA É UNIFORME. Carteira que não existe e carteira que não é sua
 *    devolvem exatamente o mesmo 403, com o mesmo corpo. Distinguir os dois
 *    transformaria o endpoint num oráculo de "esta carteira existe".
 *
 * 3. TODA NEGAÇÃO VIRA LINHA DE AUDITORIA. Um 403 recorrente é o sintoma de
 *    alguém tateando o perímetro, e esse sintoma só serve se ficar registrado.
 */

import { ACOES, autorizar, normalizarUsuario, projetarCarteira, projetarCatalogo, projetarComposicao, PROJECOES } from './authz.js';
import { DATASET, POOL_DEMO } from './dataset.js';

const CABECALHOS_JSON = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, private',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
};

/* Corpo único da recusa. Nunca diz qual das duas coisas aconteceu: que o
   recurso não existe, ou que ele existe e não é seu. */
export function respostaNegada() {
  return new Response(JSON.stringify({ erro: 'sem-acesso' }), {
    status: 403,
    headers: CABECALHOS_JSON,
  });
}

function respostaJson(dados, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: CABECALHOS_JSON });
}

/* Identificadores nunca são ignorados. Um consumidor pode chamar a carteira
 * de `carteira`, `portfolio_id` ou `client_id`, mas todos chegam à mesma
 * matriz. Dois nomes para o mesmo alvo são aceitos só se apontarem para o
 * mesmo valor, pois ambiguidade em autorização é negação, não preferência. */
function alvoDaUrl(url) {
  const unico = (nomes) => {
    const valores = nomes.flatMap((nome) => url.searchParams.getAll(nome))
      .filter((valor) => valor !== '');
    const distintos = [...new Set(valores)];
    return distintos.length <= 1 ? distintos[0] : null;
  };
  const carteiraCode = unico(['carteira', 'carteira_code', 'portfolio_id', 'portfolioId']);
  const clienteId = unico(['cliente', 'cliente_id', 'client_id', 'clientId']);
  const organizacaoId = unico(['organizacao', 'organizacao_id', 'org', 'tenant_id', 'tenantId']);
  if ([carteiraCode, clienteId, organizacaoId].includes(null)) return null;
  if (carteiraCode !== undefined && clienteId !== undefined && carteiraCode !== clienteId) return null;
  return { carteiraCode, clienteId, organizacaoId };
}

// ----- identidade -----

/* Carrega do banco a identidade completa de um usuário. Três consultas:
   a linha do usuário, as atribuições dele e o conjunto de carteiras da
   organização. Nada aqui vem do pedido. */
async function carregarUsuario(env, usuarioId) {
  const linha = await env.DB.prepare(
    'SELECT id, organizacao_id, nome, email, role, ativo, cliente_id FROM usuarios WHERE id = ?'
  ).bind(usuarioId).first();
  if (!linha) return null;

  const [atr, org] = await Promise.all([
    env.DB.prepare('SELECT carteira_code FROM atribuicoes WHERE usuario_id = ?').bind(usuarioId).all(),
    env.DB.prepare('SELECT carteira_code FROM organizacoes_carteiras WHERE organizacao_id = ?')
      .bind(linha.organizacao_id).all(),
  ]);

  return normalizarUsuario({
    id: linha.id,
    organizacao_id: linha.organizacao_id,
    role: linha.role,
    nome: linha.nome,
    ativo: linha.ativo,
    cliente_id: linha.cliente_id,
    atribuicoes: (atr.results || []).map((r) => r.carteira_code),
    carteirasOrganizacao: (org.results || []).map((r) => r.carteira_code),
  });
}

export function lerCookie(request, nome) {
  const cabecalho = request.headers.get('Cookie') || '';
  const par = cabecalho.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${nome}=`));
  return par ? par.slice(nome.length + 1) : null;
}

/* Devolve a identidade resolvida do banco, ou null.
 *
 * O cookie vale `<usuario_id>:<hmac de usuario_id + '\n' + TOKEN_INFO>`.
 * `usuario_id` é só um inteiro: ele não afirma papel, organização nem
 * cliente. Afirma "esta sessão pertence a esta linha", e a linha é lida
 * agora, do banco, com o estado que ela tem agora. */
export async function sessaoDe(request, env, { hmacHex, compararSeguro, tokenInfo, cookieName }) {
  if (!env.DEMO_SENHA || !env.DB) return null;

  const valor = lerCookie(request, cookieName);
  if (!valor) return null;
  const i = valor.lastIndexOf(':');
  if (i <= 0) return null;

  const idStr = valor.slice(0, i);
  const assinatura = valor.slice(i + 1);
  if (!/^\d{1,12}$/.test(idStr)) return null;
  if (assinatura.length !== 64) return null; // hex de HMAC-SHA256, tamanho fixo

  const esperado = await hmacHex(env.DEMO_SENHA, idStr + '\n' + tokenInfo);
  if (!(await compararSeguro(assinatura, esperado))) return null;

  return carregarUsuario(env, Number(idStr));
}

// ----- auditoria -----

const diaEmSP = (quando) => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(quando);
  } catch {
    return quando.toISOString().slice(0, 10);
  }
};

/**
 * Grava uma linha em `auditoria`. Nunca senha, nunca hash, nunca token, nunca
 * cookie, nunca e-mail em texto claro.
 *
 * O e-mail não precisa estar aqui para a linha ser útil: `usuario_id` liga a
 * ação à pessoa, e o e-mail é alcançável por JOIN por quem já administra a
 * organização. Copiá-lo para cá só multiplicaria o dado pessoal em repouso,
 * num lugar cuja finalidade é segurança de acesso, não cadastro.
 *
 * Roda em ctx.waitUntil, fora do caminho da resposta, mesmo critério do
 * contador do funil: auditoria quebrada é um problema, demo fora do ar por
 * causa da auditoria seria pior.
 */
export function auditar(env, ctx, { usuario, recurso, acao, resultado }) {
  if (!env.DB) return;
  const linha = env.DB.prepare(
    'INSERT INTO auditoria (dia, usuario_id, role, organizacao_id, recurso, acao, resultado) '
    + 'VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      diaEmSP(new Date()),
      usuario ? usuario.id : null,
      usuario ? usuario.role : null,
      usuario ? usuario.organizacaoId : null,
      String(recurso || '').slice(0, 60),
      String(acao || '').slice(0, 60),
      String(resultado || '').slice(0, 40)
    )
    .run()
    .catch((e) => console.error('auditoria falhou (nao bloqueia a resposta):', e));

  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(linha);
}

// ----- montagem do conjunto, já escopado e projetado -----

const ORDEM_CATALOGO = DATASET.catalogo.map((p) => p.code);

function carteirasPermitidas(usuario, escopo) {
  const daOrganizacao = new Set(usuario.carteirasOrganizacao);
  const base = escopo.carteiras === null
    ? usuario.carteirasOrganizacao.slice()
    : escopo.carteiras.slice();
  // Interseção com o pool real do conjunto, e ordem estável. Atribuição que
  // aponta para código que não existe no conjunto simplesmente não entra, em
  // vez de virar chave fantasma no payload.
  const validas = base.filter((c) => daOrganizacao.has(c) && DATASET.carteiras[c]);
  return ORDEM_CATALOGO.filter((c) => validas.includes(c));
}

/* Os seis conjuntos auxiliares do demo. Cada um tem a chave da carteira num
 * campo próprio, e é por ele que o recorte por escopo acontece. Sem isto, Radar,
 * Oportunidades, Vencimentos, Caixa parado, Receita e Eventos mostrariam
 * carteira que o /api/dados recusou entregar, porque essas telas liam os
 * conjuntos sintéticos direto do bundle.
 *
 * `cliente` recebe todos com lista vazia. Não é esconder na tela: são telas
 * institucionais, fora do menu dele, e o que ele recebe é a casca sem linha
 * nenhuma. */
const AUXILIARES = Object.freeze([
  'oportunidades', 'vencimentos', 'caixaParado', 'receitaDrop', 'radar', 'credito',
]);

/* Chaves que descrevem o conjunto, e não o conteúdo dele: parâmetro de leitura,
 * versão do motor, janela de datas. São as únicas que sobrevivem para o cliente.
 * O resto (contagem da casa, PL consolidado, cobertura) é fato do escritório. */
const NEUTRO_AUXILIAR = Object.freeze([
  'sintetico', 'schema', 'data', 'periodo', 'tenantId', 'geradoEm', 'engine',
  'limiares', 'baseData', 'baseEstado', 'motivo', 'fonteEventos',
]);

/* Um registro de radar ou de crédito pode citar mais de uma carteira no mesmo
 * objeto (emissor compartilhado, fator comum). A chave da carteira também não
 * está sempre no mesmo lugar: em `oportunidades` ela se chama `cliente`, nas
 * outras se chama `carteira`, e dentro de `emissores` pode aparecer só na
 * afirmação em texto. Por isso o recorte varre o registro inteiro atrás dos
 * códigos do conjunto, em vez de ler um campo fixo: campo fixo erra no dia em
 * que o motor acrescenta um. O registro só passa se TODOS os códigos que ele
 * cita estiverem no escopo. */
const RE_CODIGOS = new RegExp('\\b(' + POOL_DEMO.join('|') + ')\\b', 'g');

function codigosCitados(entrada) {
  const achados = new Set();
  const txt = JSON.stringify(entrada);
  let m;
  RE_CODIGOS.lastIndex = 0;
  while ((m = RE_CODIGOS.exec(txt)) !== null) achados.add(m[1]);
  return achados;
}

function registroNoEscopo(entrada, permitidas) {
  if (!entrada || typeof entrada !== 'object') return false;
  const citados = codigosCitados(entrada);
  // Registro que não cita carteira nenhuma é agregado do escritório. Ele não
  // identifica ninguém, e some junto quando o papel não é institucional.
  for (const code of citados) if (!permitidas.includes(code)) return false;
  return true;
}

function recortarAuxiliares(institucional, permitidas) {
  const fonte = DATASET.auxiliares || {};
  const saida = {};
  AUXILIARES.forEach((chave) => {
    const bruto = fonte[chave];
    if (!bruto) return;
    if (!institucional) {
      const neutro = {};
      Object.keys(bruto).forEach((k) => {
        if (Array.isArray(bruto[k])) neutro[k] = [];
        else if (NEUTRO_AUXILIAR.includes(k)) neutro[k] = bruto[k];
      });
      saida[chave] = neutro;
      return;
    }
    const cortado = {};
    Object.keys(bruto).forEach((k) => {
      cortado[k] = Array.isArray(bruto[k])
        ? bruto[k].filter((linha) => registroNoEscopo(linha, permitidas))
        : bruto[k];
    });
    saida[chave] = cortado;
  });
  return saida;
}

/* Monta a resposta no formato que `AtlasData.hidratarDoServidor()` consome.
 * Dois mapas separados de propósito: catálogo e série são objetos de formatos
 * diferentes, e usar um mapa só para os dois faz o segundo sobrescrever o
 * primeiro em silêncio. A tela então receberia série onde espera catálogo, o
 * que não quebra na hora e quebra depois. */
function montarPayload(escopo, permitidas) {
  const cliente = escopo.projecao === PROJECOES.CLIENTE;
  const catalogoPorCodigo = {};
  const seriePorCodigo = {};
  const statusScript = {};
  const compositions = {};

  DATASET.catalogo.forEach((p) => {
    if (!permitidas.includes(p.code)) return;
    const proj = projetarCatalogo(escopo.projecao, p);
    if (proj) catalogoPorCodigo[p.code] = proj;
  });

  permitidas.forEach((code) => {
    const proj = projetarCarteira(escopo.projecao, DATASET.carteiras[code]);
    if (proj) seriePorCodigo[code] = proj;
  });

  Object.entries(DATASET.compositions || {}).forEach(([key, rows]) => {
    const code = key.split('|')[0];
    if (!permitidas.includes(code) || !Array.isArray(rows)) return;
    compositions[key] = rows.map((row) => projetarComposicao(escopo.projecao, row)).filter(Boolean);
  });

  Object.keys(DATASET.statusScript).forEach((k) => {
    const code = k.split('|')[0];
    if (permitidas.includes(code)) statusScript[k] = DATASET.statusScript[k];
  });

  // O eixo de GESTOR é institucional: é como o escritório agrupa as carteiras,
  // quanto cada casa rende e qual a meta de ROA dela. O cliente não recebe
  // nada dele, e manda lista vazia. `hidratarDoServidor` já trata esse caso
  // criando um gestor neutro com as carteiras autorizadas, porque
  // `getManagerForCode()` devolve `MANAGERS[0]` quando não acha e uma lista
  // vazia viraria `undefined` em `row.manager`, quebrando qualquer tela que
  // leia `row.manager.name` sem conferir.
  const gestores = cliente
    ? []
    : DATASET.gestores
      .map((m) => ({
        id: m.id,
        name: m.name,
        codes: m.codes.filter((c) => permitidas.includes(c)),
        roaTarget: m.roaTarget,
      }))
      .filter((m) => m.codes.length > 0);

  return {
    modo: 'demo',
    meses: DATASET.meses,
    mesesLabel: DATASET.mesesLabel,
    cdi: DATASET.cdi,
    ipca: DATASET.ipca,
    ibov: DATASET.ibov,
    mesCorrente: DATASET.mesCorrente,
    mesAbertura: DATASET.mesAbertura,
    ativos: cliente
      ? DATASET.ativos.filter((asset) => Object.values(compositions).some((rows) => rows.some((row) => row.name === asset.name)))
      : DATASET.ativos,
    catalogo: permitidas.map((c) => catalogoPorCodigo[c]).filter(Boolean),
    portfolioData: seriePorCodigo,
    compositions,
    gestores,
    statusScript,
    auxiliares: recortarAuxiliares(!cliente, permitidas),
  };
}

// ----- rotas -----

/**
 * Ponto único de entrada das rotas /api/*.
 *
 * Devolve null quando o caminho não é da API, e aí o Worker segue o fluxo
 * normal (assets, portão, tela de acesso). Qualquer caminho sob /api/ que não
 * seja reconhecido termina em 403 uniforme, nunca no fallback de SPA: um
 * `/api/algo` servido com o index.html daria 200 e corpo HTML, que é o modo
 * mais confuso de falhar.
 */
export async function rotaApi(request, env, ctx, url, deps) {
  // `/api` sem a barra final entra junto, e não é preciosismo: fora daqui ele
  // caía no ramo de asset, que confere só a assinatura do cookie e chama o
  // ASSETS, então respondia 200 com o HTML do app. Era exatamente o modo de
  // falhar que o comentário acima diz que não pode acontecer — quem faz
  // `fetch('/api')` recebe 200 e quebra no `json()`. Medido em produção em
  // 2026-09-10, e o teste 7e não pegava porque só varria caminho sob /api/.
  if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) return null;

  const metodo = request.method;
  const p = url.pathname;

  // Leitura da sessão antes de qualquer decisão. Sem identidade válida, tudo
  // sob /api/ responde igual, inclusive caminho inexistente.
  const usuario = await sessaoDe(request, env, deps);
  if (!usuario) {
    auditar(env, ctx, { usuario: null, recurso: p, acao: metodo.toLowerCase(), resultado: 'sem-sessao' });
    return respostaNegada();
  }

  const alvo = alvoDaUrl(url);
  if (!alvo) {
    auditar(env, ctx, { usuario, recurso: p, acao: metodo.toLowerCase(), resultado: 'alvo-ambiguo' });
    return respostaNegada();
  }

  if (p === '/api/sessao' && metodo === 'GET') {
    const d = autorizar(usuario, ACOES.SESSAO, alvo);
    if (!d.ok) {
      auditar(env, ctx, { usuario, recurso: p, acao: 'sessao', resultado: d.motivo });
      return respostaNegada();
    }
    const permitidas = carteirasPermitidas(usuario, d.escopo);
    return respostaJson({
      nome: usuario.nome || '',
      role: usuario.role,
      organizacaoId: d.escopo.organizacaoId,
      clienteId: d.escopo.clienteId,
      projecao: d.escopo.projecao,
      carteiras: permitidas,
    });
  }

  if (p === '/api/dados' && metodo === 'GET') {
    const d = autorizar(usuario, ACOES.DADOS, alvo);
    if (!d.ok) {
      auditar(env, ctx, { usuario, recurso: p, acao: 'dados', resultado: d.motivo });
      return respostaNegada();
    }
    const permitidas = carteirasPermitidas(usuario, d.escopo);
    // Pedido nomeando carteira fora do escopo já foi recusado por autorizar().
    // Aqui só falta o caso de o nome apontar para carteira que não existe:
    // mesma resposta, mesmo status, mesmo corpo.
    if (alvo.carteiraCode && !permitidas.includes(alvo.carteiraCode)) {
      // Auditado apesar de `autorizar` ter aprovado: o pedido passou pela
      // matriz de papel e caiu no filtro de conjunto, que é o degrau onde uma
      // tentativa de alcançar carteira alheia aparece. Sem esta linha, o
      // ataque mais provável do demo seria o único sem rastro.
      auditar(env, ctx, { usuario, recurso: p, acao: 'dados', resultado: 'fora-do-conjunto' });
      return respostaNegada();
    }
    auditar(env, ctx, { usuario, recurso: p, acao: 'dados', resultado: 'ok' });
    return respostaJson(montarPayload(d.escopo, permitidas));
  }

  if (p === '/api/usuarios' && metodo === 'GET') {
    const d = autorizar(usuario, ACOES.USUARIOS_LISTAR, alvo);
    if (!d.ok) {
      auditar(env, ctx, { usuario, recurso: p, acao: 'usuarios-listar', resultado: d.motivo });
      return respostaNegada();
    }
    const r = await env.DB.prepare(
      'SELECT id, nome, email, role, ativo, cliente_id FROM usuarios WHERE organizacao_id = ? ORDER BY id'
    ).bind(usuario.organizacaoId).all();
    const lista = r.results || [];
    const atr = await env.DB.prepare(
      'SELECT a.usuario_id, a.carteira_code FROM atribuicoes a '
      + 'JOIN usuarios u ON u.id = a.usuario_id WHERE u.organizacao_id = ?'
    ).bind(usuario.organizacaoId).all();
    const porUsuario = {};
    (atr.results || []).forEach((l) => {
      (porUsuario[l.usuario_id] = porUsuario[l.usuario_id] || []).push(l.carteira_code);
    });
    return respostaJson({
      usuarios: lista.map((u) => ({ ...u, atribuicoes: porUsuario[u.id] || [] })),
      carteiras: usuario.carteirasOrganizacao.slice(),
    });
  }

  if (p === '/api/auditoria' && metodo === 'GET') {
    const d = autorizar(usuario, ACOES.AUDITORIA_LISTAR, alvo);
    if (!d.ok) {
      auditar(env, ctx, { usuario, recurso: p, acao: 'auditoria', resultado: d.motivo });
      return respostaNegada();
    }
    const r = await env.DB.prepare(
      'SELECT dia, role, recurso, acao, resultado FROM auditoria '
      + 'WHERE organizacao_id = ? ORDER BY id DESC LIMIT 200'
    ).bind(usuario.organizacaoId).all();
    // Sem usuario_id na projeção de leitura: a tela serve para ver o que
    // aconteceu, e o identificador da pessoa não acrescenta nada a isso.
    return respostaJson({ eventos: r.results || [] });
  }

  if (p === '/api/usuarios' && metodo === 'POST') return criarUsuario(request, env, ctx, url, usuario, deps, alvo);

  const mStatus = p.match(/^\/api\/usuarios\/(\d+)\/status$/);
  if (mStatus && metodo === 'POST') return statusUsuario(request, env, ctx, url, usuario, Number(mStatus[1]), alvo);

  const mAtr = p.match(/^\/api\/usuarios\/(\d+)\/atribuicoes$/);
  if (mAtr && metodo === 'POST') return atribuirCarteiras(request, env, ctx, url, usuario, Number(mAtr[1]), alvo);

  auditar(env, ctx, { usuario, recurso: p, acao: metodo.toLowerCase(), resultado: 'rota-desconhecida' });
  return respostaNegada();
}

async function lerJson(request) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > 16384) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function criarUsuario(request, env, ctx, url, usuario, deps, alvo) {
  const d = autorizar(usuario, ACOES.USUARIOS_CRIAR, alvo);
  if (!d.ok) {
    auditar(env, ctx, { usuario, recurso: '/api/usuarios', acao: 'usuarios-criar', resultado: d.motivo });
    return respostaNegada();
  }
  const corpo = await lerJson(request);
  if (!corpo) return respostaNegada();

  const nome = String(corpo.nome || '').trim().slice(0, 120);
  const email = String(corpo.email || '').trim().toLowerCase();
  const senha = String(corpo.senha || '');
  const role = String(corpo.role || '');
  if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respostaNegada();
  if (senha.length < 8 || senha.length > 128) return respostaNegada();
  if (role !== 'manager' && role !== 'client') return respostaNegada();
  if (role === 'client' && !String(corpo.cliente_id || '').trim()) return respostaNegada();

  const clienteId = role === 'client' ? String(corpo.cliente_id).trim().slice(0, 60) : null;
  // Carteira de cliente tem que pertencer à organização de quem cria. O
  // contrário seria o OWNER de uma organização criando acesso a carteira de
  // outra, que é exatamente o buraco que este trabalho fecha.
  if (role === 'client' && !usuario.carteirasOrganizacao.includes(clienteId)) return respostaNegada();

  const hash = await deps.hashSenha(senha);
  const r = await env.DB.prepare(
    'INSERT OR IGNORE INTO usuarios (organizacao_id, nome, email, senha_hash, role, ativo, cliente_id) '
    + 'VALUES (?, ?, ?, ?, ?, 1, ?)'
  ).bind(usuario.organizacaoId, nome, email, hash, role, clienteId).run();

  if (!r.meta || r.meta.changes === 0) {
    auditar(env, ctx, { usuario, recurso: '/api/usuarios', acao: 'usuarios-criar', resultado: 'email-existe' });
    return respostaNegada();
  }

  const novo = await env.DB.prepare('SELECT id FROM usuarios WHERE email = ?').bind(email).first();
  if (novo && role === 'client') {
    await env.DB.prepare('INSERT OR IGNORE INTO atribuicoes (usuario_id, carteira_code) VALUES (?, ?)')
      .bind(novo.id, clienteId).run();
  }

  auditar(env, ctx, { usuario, recurso: '/api/usuarios', acao: 'usuarios-criar', resultado: 'ok' });
  return respostaJson({ ok: true, id: novo ? novo.id : null });
}

/* Confere que o alvo é da MESMA organização de quem pede. É a única pergunta
   que importa aqui, e ela é feita no banco: o id vem da URL e não diz nada
   sobre a quem pertence. */
async function alvoNaOrganizacao(env, usuarioId, organizacaoId) {
  const linha = await env.DB.prepare('SELECT id FROM usuarios WHERE id = ? AND organizacao_id = ?')
    .bind(usuarioId, organizacaoId).first();
  return !!linha;
}

async function statusUsuario(request, env, ctx, url, usuario, alvoId, alvo) {
  const d = autorizar(usuario, ACOES.USUARIOS_STATUS, { ...alvo, usuarioId: alvoId });
  if (!d.ok) {
    auditar(env, ctx, { usuario, recurso: '/api/usuarios/:id/status', acao: 'usuarios-status', resultado: d.motivo });
    return respostaNegada();
  }
  if (!(await alvoNaOrganizacao(env, alvoId, usuario.organizacaoId))) return respostaNegada();
  // Desativar o próprio acesso deixaria a organização sem quem a administre,
  // e no demo não existe caminho de recuperação. Recusa explícita.
  if (alvoId === usuario.id) return respostaNegada();

  const corpo = await lerJson(request);
  if (!corpo) return respostaNegada();
  const ativo = Number(corpo.ativo) === 1 ? 1 : (Number(corpo.ativo) === 0 ? 0 : null);
  if (ativo === null) return respostaNegada();

  await env.DB.prepare('UPDATE usuarios SET ativo = ? WHERE id = ? AND organizacao_id = ?')
    .bind(ativo, alvoId, usuario.organizacaoId).run();

  auditar(env, ctx, {
    usuario,
    recurso: '/api/usuarios/:id/status',
    acao: 'usuarios-status',
    resultado: ativo ? 'ativado' : 'desativado',
  });
  return respostaJson({ ok: true, ativo: ativo === 1 });
}

async function atribuirCarteiras(request, env, ctx, url, usuario, alvoId, alvo) {
  const d = autorizar(usuario, ACOES.USUARIOS_ATRIBUICOES, { ...alvo, usuarioId: alvoId });
  if (!d.ok) {
    auditar(env, ctx, { usuario, recurso: '/api/usuarios/:id/atribuicoes', acao: 'usuarios-atribuicoes', resultado: d.motivo });
    return respostaNegada();
  }
  if (!(await alvoNaOrganizacao(env, alvoId, usuario.organizacaoId))) return respostaNegada();

  const corpo = await lerJson(request);
  if (!corpo || !Array.isArray(corpo.carteiras)) return respostaNegada();

  // Carteira fora do conjunto da organização é descartada em silêncio, e não
  // recusada em bloco: quem administra não precisa saber quais códigos
  // existem em outra organização, e dizer "esta não vale" já diria isso.
  const validas = corpo.carteiras
    .filter((c) => typeof c === 'string')
    .filter((c) => usuario.carteirasOrganizacao.includes(c));

  await env.DB.prepare('DELETE FROM atribuicoes WHERE usuario_id = ?').bind(alvoId).run();
  for (const code of validas) {
    await env.DB.prepare('INSERT OR IGNORE INTO atribuicoes (usuario_id, carteira_code) VALUES (?, ?)')
      .bind(alvoId, code).run();
  }

  auditar(env, ctx, {
    usuario,
    recurso: '/api/usuarios/:id/atribuicoes',
    acao: 'usuarios-atribuicoes',
    resultado: 'ok:' + validas.length,
  });
  return respostaJson({ ok: true, carteiras: validas });
}
