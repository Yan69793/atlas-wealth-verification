/**
 * authz.js — núcleo de autorização do ATLAS.
 *
 * Módulo PURO. Não faz I/O, não lê relógio, não toca em D1 nem em Request.
 * Recebe a identidade já resolvida e devolve decisão. É importável em Node
 * puro, então os testes de isolamento exercitam a matriz sem subir servidor.
 *
 * Por que assim: a decisão de acesso é a parte que mais precisa de teste, e a
 * que menos precisa de contexto. Misturar isso com D1 dentro de uma função só
 * é o caminho clássico para a regra ficar sem prova.
 *
 * REGRA CENTRAL, e a razão de a assinatura ser esta: o `usuario` que entra
 * aqui é montado pelo Worker a partir do banco, a cada requisição. Nada dele
 * vem do navegador. O cookie assinado carrega apenas `usuario_id`, que não
 * afirma papel nem organização nenhuma, só "esta sessão pertence a esta
 * linha". Papel, `ativo`, `cliente_id`, organização e atribuições são lidos do
 * D1 toda vez. Desativar um usuário vale na requisição seguinte, e forjar
 * papel no cliente não tem onde acontecer, porque não existe campo de papel
 * no que o cliente envia.
 *
 * Tudo aqui é fail-closed: qualquer entrada que não bata exatamente com uma
 * regra conhecida termina em negação. Não existe caminho de "não sei, então
 * deixa passar".
 */

/* A sigla do cliente é a MESMA função que o navegador e o gerador do demo
 * usam (`platform-sigla.js`), importada como módulo, não copiada. Duas
 * implementações divergiriam no dia em que alguém mexesse numa delas, e a
 * divergência apareceria como o mesmo cliente com duas siglas. */
import { siglaCliente } from '../../platform-sigla.js';

export const PAPEIS = Object.freeze({
  OWNER: 'owner',
  MANAGER: 'manager',
  CLIENT: 'client',
});

export const ACOES = Object.freeze({
  SESSAO: 'sessao.ler',
  DADOS: 'dados.ler',
  USUARIOS_LISTAR: 'usuarios.listar',
  USUARIOS_CRIAR: 'usuarios.criar',
  USUARIOS_STATUS: 'usuarios.status',
  USUARIOS_ATRIBUICOES: 'usuarios.atribuicoes',
  AUDITORIA_LISTAR: 'auditoria.listar',
});

export const PROJECOES = Object.freeze({
  INSTITUCIONAL: 'institucional',
  CLIENTE: 'cliente',
});

/**
 * Campos de `_portfolioData[code]` que carregam dinheiro da casa, não do
 * cliente. O CLIENT nunca recebe nenhum deles.
 *
 * A projeção é por LISTA BRANCA (ver CAMPOS_POR_PROJECAO logo abaixo), e esta
 * lista existe para o teste poder provar o inverso: que todo campo proibido
 * está de fato fora do que a lista branca deixa passar. Lista negra sozinha
 * falha no dia em que alguém adiciona um campo novo de custo e esquece de
 * proibir. Lista branca falha fechada, que é o que se quer.
 */
export const CAMPOS_PROIBIDOS_CLIENTE = Object.freeze([
  'revenue',
  'revenueYTD',
  'fee',
  'feeArr',
  'perfFee',
  'perfFeeArr',
  'brokerage',
  'brokerageArr',
  'custody',
  'custodyArr',
  'fundFee',
  'fundFeeArr',
  'fxSpread',
  'fxSpreadArr',
  'tax',
  'taxArr',
  'totalCost',
  'totalCostPct',
  'other',
  'otherArr',
  'roaTarget',
]);

/**
 * Projeção por lista branca. O que não está aqui não sai.
 *
 * institucional: espelho da entrada de `_portfolioData` menos nada. É o que o
 * OWNER e o MANAGER recebem, restrito por linha (quais carteiras) e nunca por
 * campo, porque o produto inteiro deles é exatamente a conta de custo.
 *
 * cliente: patrimônio, movimentação e rentabilidade. Sem taxa de gestão, sem
 * custo de corretagem, sem custódia, sem spread, sem imposto, sem receita da
 * casa. Sem `reportedPlPrevArr` também, porque é ele que alimenta a conta de
 * divergência, e divergência é o produto institucional, não o extrato do
 * cliente.
 */
export const CAMPOS_POR_PROJECAO = Object.freeze({
  [PROJECOES.INSTITUCIONAL]: Object.freeze([
    'fee', 'plArr', 'nnmArr', 'retArr', 'feeArr', 'reportedPlPrevArr',
    'perfFeeArr', 'brokerageArr', 'custodyArr', 'fundFeeArr', 'fxSpreadArr',
    'taxArr', 'otherArr',
  ]),
  [PROJECOES.CLIENTE]: Object.freeze([
    'plArr', 'nnmArr', 'retArr',
  ]),
});

/**
 * Campos do catálogo que sobrevivem para cada projeção.
 *
 * `sigla` no lugar de `name`, e não é cosmético: o nome do cliente por
 * extenso existe só no conjunto interno do Worker. O que sai daqui é a
 * sigla, que é o que a interface pode mostrar. `name` não está na lista, e
 * por isso não há como ele escapar por descuido de quem acrescentar campo.
 */
export const CAMPOS_CATALOGO = Object.freeze({
  [PROJECOES.INSTITUCIONAL]: Object.freeze(['code', 'sigla', 'risk', 'inception', 'mgr']),
  [PROJECOES.CLIENTE]: Object.freeze(['code', 'sigla', 'risk', 'inception']),
});

export const CAMPOS_COMPOSICAO = Object.freeze({
  [PROJECOES.INSTITUCIONAL]: Object.freeze([
    'name', 'cls', 'institution', 'vencto', 'saldoInicial', 'saldoFinal',
    'varBRL', 'retAtivo', 'contrib', 'pct',
  ]),
  [PROJECOES.CLIENTE]: Object.freeze([
    'name', 'cls', 'vencto', 'saldoInicial', 'saldoFinal', 'varBRL',
    'retAtivo', 'contrib', 'pct',
  ]),
});

/**
 * Motivo da negação. NUNCA sai na resposta: o cliente recebe 403 uniforme,
 * sem distinguir "não existe" de "não é seu". O motivo existe só para o log
 * do Worker e para os testes, onde a diferença é exatamente o que se quer
 * enxergar.
 */
export const NEGADO = Object.freeze({
  SEM_IDENTIDADE: 'sem-identidade',
  INATIVO: 'usuario-inativo',
  PAPEL_INVALIDO: 'papel-invalido',
  SEM_ORGANIZACAO: 'sem-organizacao',
  SEM_ID: 'sem-id',
  ACAO_DESCONHECIDA: 'acao-desconhecida',
  FORA_DO_ESCOPO: 'fora-do-escopo',
  PAPEL_SEM_ACAO: 'papel-sem-acao',
});

function recusar(motivo) {
  return { ok: false, motivo };
}

function ehInteiroPositivo(v) {
  return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

function listaDeCodigos(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((c) => typeof c === 'string' && c.length > 0);
}

/**
 * Normaliza o que veio do D1 para a forma que a matriz espera, e recusa o que
 * não dá para normalizar. `ativo` chega do SQLite como 0/1; qualquer outra
 * coisa é tratada como inativo, nunca como ativo.
 */
export function normalizarUsuario(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;
  const id = Number(bruto.id);
  const organizacaoId = Number(bruto.organizacao_id);
  if (!ehInteiroPositivo(id)) return null;
  if (!ehInteiroPositivo(organizacaoId)) return null;

  const role = typeof bruto.role === 'string' ? bruto.role : '';
  if (role !== PAPEIS.OWNER && role !== PAPEIS.MANAGER && role !== PAPEIS.CLIENT) return null;

  return {
    id,
    organizacaoId,
    role,
    // `nome` não decide acesso nenhum. Está aqui porque a interface assina a
    // sessão com ele, e porque resolvê-lo junto com o resto evita uma segunda
    // ida ao banco só para escrever o cabeçalho da tela.
    nome: typeof bruto.nome === 'string' ? bruto.nome : '',
    ativo: Number(bruto.ativo) === 1,
    clienteId: typeof bruto.cliente_id === 'string' && bruto.cliente_id ? bruto.cliente_id : null,
    atribuicoes: listaDeCodigos(bruto.atribuicoes),
    carteirasOrganizacao: listaDeCodigos(bruto.carteirasOrganizacao),
  };
}

/**
 * Escopo de leitura do usuário. É o que a camada de dados usa para decidir o
 * que entra na resposta, e o que o front usa para montar menu.
 *
 * `carteiras: null` significa "todas as da organização", que é o caso do
 * OWNER. Nunca confundir com lista vazia, que significa "nenhuma".
 */
export function escopoDe(usuario) {
  if (!usuario) return null;
  if (usuario.role === PAPEIS.OWNER) {
    return {
      tipo: 'organizacao',
      organizacaoId: usuario.organizacaoId,
      carteiras: null,
      clienteId: null,
      projecao: PROJECOES.INSTITUCIONAL,
    };
  }
  if (usuario.role === PAPEIS.MANAGER) {
    // Atribuição fora da organização não vale. A interseção é feita aqui, e
    // não na consulta, porque a consulta é o lugar onde esse filtro costuma
    // ser esquecido.
    //
    // Sem ramo de escape para "organização sem carteiras cadastradas": uma
    // versão anterior usava `atribuicoes` cruas quando o conjunto da
    // organização estava vazio, e isso é fail-open. Conjunto vazio tem que dar
    // escopo vazio.
    const permitidas = usuario.atribuicoes.filter((c) => usuario.carteirasOrganizacao.includes(c));
    return {
      tipo: 'carteiras',
      organizacaoId: usuario.organizacaoId,
      carteiras: permitidas,
      clienteId: null,
      projecao: PROJECOES.INSTITUCIONAL,
    };
  }
  // CLIENT: só a própria carteira, e só pela projeção de cliente. A carteira
  // dele precisa estar no conjunto da organização; sem essa conferência, uma
  // linha de `atribuicoes` apontando para fora daria acesso fora.
  const permitidas = usuario.clienteId && usuario.carteirasOrganizacao.includes(usuario.clienteId)
    ? [usuario.clienteId]
    : [];
  return {
    tipo: 'cliente',
    organizacaoId: usuario.organizacaoId,
    carteiras: permitidas,
    clienteId: usuario.clienteId,
    projecao: PROJECOES.CLIENTE,
  };
}

/* "Organização inteira" é o conjunto REAL da organização, não "qualquer
   código". A diferença importa: sem ela, o titular da organização A passava
   pela matriz pedindo uma carteira da organização B, e a recusa só acontecia
   um degrau depois, na montagem da resposta. A decisão tem que estar inteira
   aqui, onde o teste da matriz a alcança. */
function escopoAlcanca(escopo, usuario, carteiraCode) {
  if (typeof carteiraCode !== 'string' || !carteiraCode) return true;
  if (!escopo) return false;
  if (escopo.carteiras === null) {
    return Array.isArray(usuario.carteirasOrganizacao) && usuario.carteirasOrganizacao.includes(carteiraCode);
  }
  return escopo.carteiras.includes(carteiraCode);
}

/* Todo identificador que a requisição nomeia reduz o escopo, nunca é
 * ignorado. No demo, `cliente_id` coincide com o código da carteira própria,
 * conforme a migration. Tratar os dois campos separadamente impede que um
 * gestor mantenha acesso à própria carteira enquanto tenta atravessar outra
 * pela chave alternativa. */
function alvoNoEscopo(escopo, usuario, alvo) {
  if (alvo.organizacaoId !== undefined && Number(alvo.organizacaoId) !== usuario.organizacaoId) return false;
  if (!escopoAlcanca(escopo, usuario, alvo.carteiraCode)) return false;
  if (alvo.clienteId && !escopoAlcanca(escopo, usuario, alvo.clienteId)) return false;
  if (usuario.role === PAPEIS.CLIENT) {
    if (!usuario.clienteId) return false;
    if (alvo.clienteId && alvo.clienteId !== usuario.clienteId) return false;
  }
  return true;
}

/**
 * autorizar(usuario, acao, alvo) -> { ok: true, escopo, projecao } | { ok: false, motivo }
 *
 * `usuario` é a identidade RESOLVIDA DO BANCO nesta requisição, ou null.
 * `alvo` é o que o pedido nomeia: { carteiraCode, clienteId, usuarioId, organizacaoId }.
 * Nenhum campo de `alvo` é confiado para conceder, só para RESTRINGIR: pedir
 * uma carteira fora do escopo nega, pedir uma dentro não amplia nada.
 */
export function autorizar(usuario, acao, alvo) {
  if (!usuario) return recusar(NEGADO.SEM_IDENTIDADE);
  if (!usuario.ativo) return recusar(NEGADO.INATIVO);
  if (!ehInteiroPositivo(usuario.id)) return recusar(NEGADO.SEM_ID);
  if (!ehInteiroPositivo(usuario.organizacaoId)) return recusar(NEGADO.SEM_ORGANIZACAO);
  if (usuario.role !== PAPEIS.OWNER && usuario.role !== PAPEIS.MANAGER && usuario.role !== PAPEIS.CLIENT) {
    return recusar(NEGADO.PAPEL_INVALIDO);
  }

  const a = alvo && typeof alvo === 'object' ? alvo : {};
  const escopo = escopoDe(usuario);

  switch (acao) {
    case ACOES.SESSAO:
      if (!alvoNoEscopo(escopo, usuario, a)) return recusar(NEGADO.FORA_DO_ESCOPO);
      return { ok: true, escopo, projecao: escopo.projecao };

    case ACOES.DADOS: {
      if (!alvoNoEscopo(escopo, usuario, a)) return recusar(NEGADO.FORA_DO_ESCOPO);
      return { ok: true, escopo, projecao: escopo.projecao };
    }

    case ACOES.USUARIOS_LISTAR:
    case ACOES.USUARIOS_CRIAR:
    case ACOES.USUARIOS_STATUS:
    case ACOES.USUARIOS_ATRIBUICOES:
    case ACOES.AUDITORIA_LISTAR: {
      if (usuario.role !== PAPEIS.OWNER) return recusar(NEGADO.PAPEL_SEM_ACAO);
      // Administração não ignora alvo de carteira, cliente ou organização.
      // Mesmo o titular só alcança o conjunto cadastrado da própria casa.
      if (!alvoNoEscopo(escopo, usuario, a)) return recusar(NEGADO.FORA_DO_ESCOPO);
      if (acao === ACOES.USUARIOS_ATRIBUICOES && !a.usuarioId) return recusar(NEGADO.FORA_DO_ESCOPO);
      if (acao === ACOES.USUARIOS_STATUS && !a.usuarioId) return recusar(NEGADO.FORA_DO_ESCOPO);
      return { ok: true, escopo, projecao: escopo.projecao };
    }

    default:
      return recusar(NEGADO.ACAO_DESCONHECIDA);
  }
}

/**
 * Aplica a projeção a uma entrada de `_portfolioData`. Sempre monta um objeto
 * NOVO com só os campos da lista branca. Nunca copia e depois apaga, porque
 * apagar depois é o passo que se esquece.
 */
export function projetarCarteira(projecao, pd) {
  const campos = CAMPOS_POR_PROJECAO[projecao];
  if (!campos) return null;
  if (!pd || typeof pd !== 'object') return null;
  const saida = {};
  campos.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(pd, k)) saida[k] = pd[k];
  });
  return saida;
}

/** Idem, para a entrada de CATALOG. O nome sai como sigla, nunca por extenso. */
export function projetarCatalogo(projecao, entrada) {
  const campos = CAMPOS_CATALOGO[projecao];
  if (!campos || !entrada) return null;
  const saida = {};
  campos.forEach((k) => {
    if (k === 'sigla') {
      saida.sigla = siglaCliente(entrada.name, entrada.code);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(entrada, k)) saida[k] = entrada[k];
  });
  return saida;
}

export function projetarComposicao(projecao, entrada) {
  const campos = CAMPOS_COMPOSICAO[projecao];
  if (!campos || !entrada || typeof entrada !== 'object') return null;
  const saida = {};
  campos.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(entrada, k)) saida[k] = entrada[k];
  });
  return saida;
}

/**
 * O papel que decide é o do banco, nunca o do cookie. Esta função existe para
 * o Worker poder ser explícito sobre isso em um lugar só.
 */
export function papelSeguro(usuario) {
  if (!usuario) return null;
  if (usuario.role === PAPEIS.OWNER || usuario.role === PAPEIS.MANAGER || usuario.role === PAPEIS.CLIENT) {
    return usuario.role;
  }
  return null;
}
