/**
 * Isolamento entre organizações e entre papéis.
 *
 * O que este arquivo prova, e por que ele existe. Até 2026-09-10 o demo não
 * tinha nada a isolar: o conjunto de 40 carteiras era gerado dentro do bundle,
 * e quem recebia o bundle recebia as 40, com ou sem menu. Menu e guarda de
 * rota são cosméticos, e cosmético não se prova com teste.
 *
 * Agora o dado sai por `GET /api/dados`, filtrado por organização e por
 * atribuição, e projetado por papel. É isso que este arquivo ataca: chama
 * `worker.fetch` direto, com D1 de mentira e cookie assinado de verdade, e
 * confere o que voltou. Sem subir servidor, mesmo molde de
 * tests/admin-perimetro.test.mjs.
 *
 * A REGRA QUE MANDA AQUI: a recusa tem que ser indistinguível. Carteira que
 * existe na organização alheia e carteira que não existe em lugar nenhum
 * precisam devolver o mesmo status e o mesmo corpo. Se diferirem, o endpoint
 * vira um oráculo de "este código existe", e enumeração de carteira deixa de
 * custar caro.
 *
 * O conjunto é sintético e o D1 é de mentira. Nenhum nome, código ou e-mail
 * aqui é de cliente real: os códigos são os do pool do demo, que é público.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import worker from '../demo-worker/src/index.js';
import { DATASET, POOL_DEMO } from '../demo-worker/src/dataset.js';
import { CAMPOS_PROIBIDOS_CLIENTE, CAMPOS_POR_PROJECAO, PROJECOES } from '../demo-worker/src/authz.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');

const DEMO_SENHA = 'segredo-do-demo-so-para-teste';
const TOKEN_INFO = 'atlas-demo-sessao-v2';

// ------------------------------------------------------------------ cenário
//
// Duas organizações de conjuntos DISJUNTOS. É o que torna o teste capaz de
// distinguir "filtrou" de "não filtrou": com conjuntos sobrepostos, uma linha
// vazada poderia coincidir com uma linha legítima e o teste passaria.

const ORG_UM = {
  id: 1,
  carteiras: ['ALPHA_01', 'ALPHA_02', 'BRAVO_FAM'],
};
const ORG_DOIS = {
  id: 2,
  carteiras: ['CEDRO_HLD', 'CEDRO_CAP'],
};

const USUARIOS = [
  { id: 1, organizacao_id: 1, nome: 'Titular Um', email: 'um@exemplo.test', role: 'owner', ativo: 1, cliente_id: null },
  { id: 2, organizacao_id: 1, nome: 'Gestor Um', email: 'gestor.um@exemplo.test', role: 'manager', ativo: 1, cliente_id: null },
  { id: 3, organizacao_id: 1, nome: 'Cliente Um', email: 'cliente.um@exemplo.test', role: 'client', ativo: 1, cliente_id: 'ALPHA_02' },
  { id: 4, organizacao_id: 2, nome: 'Titular Dois', email: 'dois@exemplo.test', role: 'owner', ativo: 1, cliente_id: null },
  { id: 5, organizacao_id: 2, nome: 'Gestor Dois', email: 'gestor.dois@exemplo.test', role: 'manager', ativo: 1, cliente_id: null },
  { id: 6, organizacao_id: 2, nome: 'Cliente Dois', email: 'cliente.dois@exemplo.test', role: 'client', ativo: 1, cliente_id: 'CEDRO_CAP' },
  { id: 7, organizacao_id: 1, nome: 'Desativado Um', email: 'fora@exemplo.test', role: 'manager', ativo: 0, cliente_id: null },
];

const ATRIBUICOES = [
  { usuario_id: 2, carteira_code: 'ALPHA_01' },
  { usuario_id: 3, carteira_code: 'ALPHA_02' },
  { usuario_id: 5, carteira_code: 'CEDRO_HLD' },
  { usuario_id: 6, carteira_code: 'CEDRO_CAP' },
  { usuario_id: 7, carteira_code: 'ALPHA_01' },
];

/* D1 de mentira com roteamento por SQL.
 *
 * Não é um SQLite em miniatura, e não tenta ser: cada consulta que o Worker
 * faz tem um ramo aqui, e consulta que não casa nenhum ramo devolve erro alto
 * em vez de lista vazia. Ramo faltando silencioso viraria "sem dado" e o teste
 * passaria por motivo errado. */
function bancoFalso() {
  const eventos = [];
  const auditoria = [];
  const usuarios = USUARIOS.map((u) => ({ ...u }));
  const atribuicoes = ATRIBUICOES.map((a) => ({ ...a }));
  // `cadastros` existe só para o caminho de cadastro público ter onde bater na
  // regra de e-mail já usado. O Worker a mantém por compatibilidade com o
  // painel do dono, e o teste precisa dela para provar que o cadastro repetido
  // é recusado antes de criar qualquer identidade.
  const cadastros = usuarios.map((u) => ({ id: u.id, email: u.email }));
  const orgCarteiras = [
    ...ORG_UM.carteiras.map((c) => ({ organizacao_id: ORG_UM.id, carteira_code: c })),
    ...ORG_DOIS.carteiras.map((c) => ({ organizacao_id: ORG_DOIS.id, carteira_code: c })),
  ];
  let proximoId = 100;

  const normal = (s) => String(s).replace(/\s+/g, ' ').trim();

  const db = {
    eventos, auditoria, usuarios, atribuicoes, orgCarteiras, cadastros,
    prepare(sqlBruto) {
      const sql = normal(sqlBruto);
      let args = [];
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async first() {
          if (/^SELECT id, organizacao_id, nome, email, role, ativo, cliente_id FROM usuarios WHERE id = \?$/.test(sql)) {
            const u = usuarios.find((x) => x.id === Number(args[0]));
            return u ? { ...u } : null;
          }
          if (/^SELECT id, senha_hash, ativo FROM usuarios WHERE email = \?$/.test(sql)) {
            const u = usuarios.find((x) => x.email === String(args[0]).toLowerCase());
            return u ? { id: u.id, senha_hash: u.senha_hash, ativo: u.ativo } : null;
          }
          if (/^SELECT id FROM usuarios WHERE email = \?$/.test(sql)) {
            const u = usuarios.find((x) => x.email === String(args[0]).toLowerCase());
            return u ? { id: u.id } : null;
          }
          if (/^SELECT id FROM usuarios WHERE id = \? AND organizacao_id = \?$/.test(sql)) {
            const u = usuarios.find((x) => x.id === Number(args[0]) && x.organizacao_id === Number(args[1]));
            return u ? { id: u.id } : null;
          }
          throw new Error('first() sem ramo para: ' + sql);
        },
        async all() {
          if (/^SELECT carteira_code FROM atribuicoes WHERE usuario_id = \?$/.test(sql)) {
            return { results: atribuicoes.filter((a) => a.usuario_id === Number(args[0])).map((a) => ({ carteira_code: a.carteira_code })) };
          }
          if (/^SELECT carteira_code FROM organizacoes_carteiras WHERE organizacao_id = \?$/.test(sql)) {
            return { results: orgCarteiras.filter((o) => o.organizacao_id === Number(args[0])).map((o) => ({ carteira_code: o.carteira_code })) };
          }
          if (/^SELECT id, nome, email, role, ativo, cliente_id FROM usuarios WHERE organizacao_id = \? ORDER BY id$/.test(sql)) {
            return {
              results: usuarios
                .filter((u) => u.organizacao_id === Number(args[0]))
                .map((u) => ({ id: u.id, nome: u.nome, email: u.email, role: u.role, ativo: u.ativo, cliente_id: u.cliente_id })),
            };
          }
          if (/^SELECT a\.usuario_id, a\.carteira_code FROM atribuicoes a JOIN usuarios u ON u\.id = a\.usuario_id WHERE u\.organizacao_id = \?$/.test(sql)) {
            const daOrg = new Set(usuarios.filter((u) => u.organizacao_id === Number(args[0])).map((u) => u.id));
            return { results: atribuicoes.filter((a) => daOrg.has(a.usuario_id)).map((a) => ({ ...a })) };
          }
          if (/^SELECT dia, role, recurso, acao, resultado FROM auditoria WHERE organizacao_id = \? ORDER BY id DESC LIMIT 200$/.test(sql)) {
            // Projeta as colunas pedidas. Devolver o objeto inteiro faria o
            // teste do vazamento passar por mentira do banco de mentira, que é
            // o modo mais fácil de um teste de segurança não provar nada.
            return {
              results: auditoria
                .filter((l) => l.organizacao_id === Number(args[0]))
                .map((l) => ({ dia: l.dia, role: l.role, recurso: l.recurso, acao: l.acao, resultado: l.resultado }))
                .reverse(),
            };
          }
          throw new Error('all() sem ramo para: ' + sql);
        },
        async run() {
          if (/^INSERT INTO eventos/.test(sql)) {
            eventos.push({ dia: args[0], evento: args[1], detalhe: args[2] });
            return { meta: { changes: 1 } };
          }
          if (/^INSERT INTO auditoria/.test(sql)) {
            auditoria.push({
              dia: args[0], usuario_id: args[1], role: args[2],
              organizacao_id: args[3], recurso: args[4], acao: args[5], resultado: args[6],
            });
            return { meta: { changes: 1 } };
          }
          if (/^INSERT OR IGNORE INTO cadastros/.test(sql)) {
            const email = String(args[1]).toLowerCase();
            if (cadastros.some((c) => c.email === email)) return { meta: { changes: 0 } };
            const id = ++proximoId;
            cadastros.push({ id, email });
            return { meta: { changes: 1, last_row_id: id } };
          }
          // O `\(` no fim não é enfeite: sem ele este ramo engolia também
          // `INSERT OR IGNORE INTO organizacoes_carteiras`, que é outro ramo
          // deste mesmo bloco, e o teste do conjunto do demo passava a medir
          // zero por causa da ordem dos `if`, não por causa do Worker.
          if (/^INSERT OR IGNORE INTO organizacoes \(/.test(sql)) {
            return { meta: { changes: 1 } };
          }
          if (/^INSERT OR IGNORE INTO usuarios/.test(sql)) {
            usuarios.push({
              id: ++proximoId, organizacao_id: Number(args[0]), nome: args[1],
              email: String(args[2]).toLowerCase(), senha_hash: args[3], role: args[4], ativo: 1, cliente_id: args[5],
            });
            return { meta: { changes: 1 } };
          }
          if (/^INSERT OR IGNORE INTO organizacoes_carteiras/.test(sql)) {
            const ja = orgCarteiras.some((o) => o.organizacao_id === Number(args[0]) && o.carteira_code === args[1]);
            if (!ja) orgCarteiras.push({ organizacao_id: Number(args[0]), carteira_code: args[1] });
            return { meta: { changes: ja ? 0 : 1 } };
          }
          if (/^UPDATE usuarios SET ativo = \? WHERE id = \? AND organizacao_id = \?$/.test(sql)) {
            const u = usuarios.find((x) => x.id === Number(args[1]) && x.organizacao_id === Number(args[2]));
            if (!u) return { meta: { changes: 0 } };
            u.ativo = Number(args[0]);
            return { meta: { changes: 1 } };
          }
          if (/^DELETE FROM atribuicoes WHERE usuario_id = \?$/.test(sql)) {
            const antes = atribuicoes.length;
            for (let i = atribuicoes.length - 1; i >= 0; i--) {
              if (atribuicoes[i].usuario_id === Number(args[0])) atribuicoes.splice(i, 1);
            }
            return { meta: { changes: antes - atribuicoes.length } };
          }
          if (/^INSERT OR IGNORE INTO atribuicoes \(usuario_id, carteira_code\) VALUES \(\?, \?\)$/.test(sql)) {
            const ja = atribuicoes.some((a) => a.usuario_id === Number(args[0]) && a.carteira_code === args[1]);
            if (!ja) atribuicoes.push({ usuario_id: Number(args[0]), carteira_code: args[1] });
            return { meta: { changes: ja ? 0 : 1 } };
          }
          throw new Error('run() sem ramo para: ' + sql);
        },
      };
      return stmt;
    },
  };
  return db;
}

const ctxFalso = () => {
  const pendentes = [];
  return { pendentes, waitUntil: (p) => pendentes.push(p) };
};

const envDe = (banco) => ({
  DEMO_SENHA,
  ASSETS: { async fetch() { return new Response('CONTEUDO DO APP'); } },
  DB: banco || bancoFalso(),
});

/** Cookie de sessão legítimo, derivado do mesmo jeito que o Worker deriva. */
async function cookieDe(usuarioId, segredo = DEMO_SENHA) {
  const id = String(usuarioId);
  const chave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(id + '\n' + TOKEN_INFO));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${id}:${hex}`;
}

async function pedir(caminho, usuarioId, { env, metodo = 'GET', corpo, cookieForcado } = {}) {
  const e = env || envDe();
  const ctx = ctxFalso();
  const headers = {};
  if (usuarioId !== null && usuarioId !== undefined) {
    headers.Cookie = `atlas_demo_sessao=${cookieForcado !== undefined ? cookieForcado : await cookieDe(usuarioId)}`;
  } else if (cookieForcado) {
    headers.Cookie = `atlas_demo_sessao=${cookieForcado}`;
  }
  if (corpo) headers['Content-Type'] = 'application/json';
  const r = await worker.fetch(
    new Request('https://demo.multi-assets.com' + caminho, { method: metodo, headers, body: corpo }),
    e, ctx
  );
  await Promise.all(ctx.pendentes);
  return { r, env: e, ctx };
}

const jsonDe = async (r) => { try { return await r.json(); } catch { return null; } };

const codesDoPayload = (p) => (p && Array.isArray(p.catalogo) ? p.catalogo.map((c) => c.code) : []);

// ============================================================ papéis: escopo

describe('RBAC: cada papel vê exatamente o que lhe cabe', () => {
  test('1. cliente de uma carteira não recebe carteira de outro cliente', async () => {
    const { r } = await pedir('/api/dados', 3); // Cliente Um, dono de ALPHA_02
    assert.equal(r.status, 200);
    const p = await jsonDe(r);
    assert.deepEqual(codesDoPayload(p), ['ALPHA_02']);
    assert.deepEqual(Object.keys(p.portfolioData), ['ALPHA_02']);
    assert.doesNotMatch(JSON.stringify(p), /BRAVO_FAM|CEDRO_|ALPHA_01/, 'vazou carteira que não é dele');
  });

  test('1b. cliente de outra organização não recebe nada da primeira', async () => {
    const { r } = await pedir('/api/dados', 6); // Cliente Dois, dono de CEDRO_CAP
    const p = await jsonDe(r);
    assert.deepEqual(codesDoPayload(p), ['CEDRO_CAP']);
    assert.doesNotMatch(JSON.stringify(p), /ALPHA_|BRAVO_/);
  });

  test('2. gestor recebe só as carteiras atribuídas a ele, dentro da organização', async () => {
    const { r } = await pedir('/api/dados', 2); // Gestor Um, atribuição ALPHA_01
    const p = await jsonDe(r);
    assert.deepEqual(codesDoPayload(p), ['ALPHA_01']);
    assert.doesNotMatch(JSON.stringify(p), /ALPHA_02|BRAVO_FAM|CEDRO_/);
  });

  test('2b. atribuição apontando para carteira de outra organização não amplia nada', async () => {
    // O cenário mais direto de escalada: a linha de `atribuicoes` existe, a
    // carteira existe no conjunto, e mesmo assim não pode sair, porque não é
    // da organização do usuário. A interseção acontece no servidor.
    const banco = bancoFalso();
    banco.atribuicoes.push({ usuario_id: 2, carteira_code: 'CEDRO_CAP' });
    const { r } = await pedir('/api/dados', 2, { env: envDe(banco) });
    const p = await jsonDe(r);
    assert.deepEqual(codesDoPayload(p), ['ALPHA_01']);
    assert.doesNotMatch(JSON.stringify(p), /CEDRO_/);
  });

  test('5. titular vê a organização inteira e nada fora dela', async () => {
    const { r } = await pedir('/api/dados', 1);
    const p = await jsonDe(r);
    assert.deepEqual(codesDoPayload(p).sort(), ['ALPHA_01', 'ALPHA_02', 'BRAVO_FAM']);
    assert.doesNotMatch(JSON.stringify(p), /CEDRO_/, 'titular viu carteira de outra organização');
  });

  test('5b. titular da segunda organização vê só a segunda', async () => {
    const { r } = await pedir('/api/dados', 4);
    const p = await jsonDe(r);
    assert.deepEqual(codesDoPayload(p).sort(), ['CEDRO_CAP', 'CEDRO_HLD']);
  });

  test('organização sem carteira nenhuma recebe conjunto vazio, nunca o conjunto todo', async () => {
    const banco = bancoFalso();
    banco.orgCarteiras.length = 0;
    const { r } = await pedir('/api/dados', 4, { env: envDe(banco) });
    assert.equal(r.status, 200);
    const p = await jsonDe(r);
    assert.deepEqual(codesDoPayload(p), []);
    assert.deepEqual(Object.keys(p.portfolioData), []);
  });
});

// ==================================================== papéis: administração

describe('RBAC: administração é do titular, na própria organização', () => {
  test('3. cliente em endpoint de titular recebe 403', async () => {
    for (const caminho of ['/api/usuarios', '/api/auditoria']) {
      const { r } = await pedir(caminho, 3);
      assert.equal(r.status, 403, `${caminho} abriu para cliente`);
      assert.deepEqual(await jsonDe(r), { erro: 'sem-acesso' });
    }
  });

  test('4. gestor em endpoint de titular recebe 403', async () => {
    for (const caminho of ['/api/usuarios', '/api/auditoria']) {
      const { r } = await pedir(caminho, 2);
      assert.equal(r.status, 403, `${caminho} abriu para gestor`);
      assert.deepEqual(await jsonDe(r), { erro: 'sem-acesso' });
    }
  });

  test('4b. gestor não cria, não desativa e não atribui carteira', async () => {
    const acoes = [
      pedir('/api/usuarios', 2, { metodo: 'POST', corpo: JSON.stringify({ nome: 'X', email: 'x@y.test', senha: '12345678', role: 'manager' }) }),
      pedir('/api/usuarios/3/status', 2, { metodo: 'POST', corpo: JSON.stringify({ ativo: 0 }) }),
      pedir('/api/usuarios/3/atribuicoes', 2, { metodo: 'POST', corpo: JSON.stringify({ carteiras: ['ALPHA_01'] }) }),
    ];
    for (const p of await Promise.all(acoes)) {
      assert.equal(p.r.status, 403, 'gestor executou ação de administração');
    }
  });

  test('titular vê os usuários DA PRÓPRIA organização, e só os dela', async () => {
    const { r } = await pedir('/api/usuarios', 1);
    const p = await jsonDe(r);
    assert.equal(r.status, 200);
    const emails = p.usuarios.map((u) => u.email);
    assert.ok(emails.includes('gestor.um@exemplo.test'));
    assert.ok(!emails.includes('gestor.dois@exemplo.test'), 'listou usuário de outra organização');
    assert.ok(!emails.includes('dois@exemplo.test'), 'listou usuário de outra organização');
  });

  test('titular não age sobre usuário de outra organização', async () => {
    for (const caminho of ['/api/usuarios/5/status', '/api/usuarios/5/atribuicoes']) {
      const { r } = await pedir(caminho, 1, { metodo: 'POST', corpo: JSON.stringify({ ativo: 0, carteiras: [] }) });
      assert.equal(r.status, 403, `${caminho} atravessou a organização`);
    }
  });

  test('titular não se desativa, para a organização não ficar sem quem a administre', async () => {
    const banco = bancoFalso();
    const { r } = await pedir('/api/usuarios/1/status', 1, {
      env: envDe(banco), metodo: 'POST', corpo: JSON.stringify({ ativo: 0 }),
    });
    assert.equal(r.status, 403);
    assert.equal(banco.usuarios.find((u) => u.id === 1).ativo, 1, 'o titular se desativou');
  });

  test('titular cria gestor e cliente dentro da própria organização', async () => {
    const banco = bancoFalso();
    const { r } = await pedir('/api/usuarios', 1, {
      env: envDe(banco),
      metodo: 'POST',
      corpo: JSON.stringify({ nome: 'Novo Gestor', email: 'novo@exemplo.test', senha: 'senha-longa-1', role: 'manager' }),
    });
    assert.equal(r.status, 200);
    const criado = banco.usuarios.find((u) => u.email === 'novo@exemplo.test');
    assert.ok(criado, 'o usuário não foi criado');
    assert.equal(criado.organizacao_id, 1, 'criou usuário em organização que não é a dele');
    assert.equal(criado.role, 'manager');
  });

  test('titular não cria titular nem papel inventado', async () => {
    for (const role of ['owner', 'root', '', 'OWNER']) {
      const { r } = await pedir('/api/usuarios', 1, {
        metodo: 'POST',
        corpo: JSON.stringify({ nome: 'X', email: `x${role}@exemplo.test`, senha: 'senha-longa-1', role }),
      });
      assert.equal(r.status, 403, `aceitou criar papel ${JSON.stringify(role)}`);
    }
  });

  test('titular não cria cliente apontando para carteira de outra organização', async () => {
    const { r } = await pedir('/api/usuarios', 1, {
      metodo: 'POST',
      corpo: JSON.stringify({ nome: 'X', email: 'x@exemplo.test', senha: 'senha-longa-1', role: 'client', cliente_id: 'CEDRO_CAP' }),
    });
    assert.equal(r.status, 403, 'criou cliente vinculado a carteira de outra organização');
  });
});

// ================================================= organização: nunca vaza

describe('RBAC: organização é decidida no banco, nunca no que o cliente envia', () => {
  test('6. organização forjada na query não amplia nada', async () => {
    for (const q of ['?organizacao=2', '?organizacao_id=2', '?org=2', '?organizacao=2&carteira=CEDRO_CAP']) {
      const { r } = await pedir('/api/dados' + q, 1);
      if (r.status === 403) continue; // recusar também é resposta correta
      const p = await jsonDe(r);
      assert.doesNotMatch(JSON.stringify(p), /CEDRO_/, `organização forjada em ${q} ampliou o escopo`);
    }
  });

  test('6b. o cookie não carrega organização nem papel, então não há o que forjar', async () => {
    // Um cookie de OUTRA organização, assinado legitimamente para o usuário 4,
    // apresentado por quem só tem o id: o que o servidor lê é a linha 4.
    const { r } = await pedir('/api/dados', null, { cookieForcado: await cookieDe(4) });
    const p = await jsonDe(r);
    assert.deepEqual(codesDoPayload(p).sort(), ['CEDRO_CAP', 'CEDRO_HLD']);
    // E o inverso: trocar o número no cookie sem refazer a assinatura não vale.
    const forjado = (await cookieDe(1)).replace(/^1:/, '4:');
    const { r: r2 } = await pedir('/api/dados', null, { cookieForcado: forjado });
    assert.equal(r2.status, 403, 'cookie com id trocado e assinatura velha foi aceito');
  });

  test('6c. cookie de outra origem ou segredo é recusado', async () => {
    const outroSegredo = await cookieDe(1, 'outro-segredo-qualquer');
    const { r } = await pedir('/api/dados', null, { cookieForcado: outroSegredo });
    assert.equal(r.status, 403);
  });

  test('6d. cookie v1 (formato antigo, por e-mail) não vale mais', async () => {
    const chave = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(DEMO_SENHA), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode('um@exemplo.test\natlas-demo-sessao-v1'));
    const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const { r } = await pedir('/api/dados', null, { cookieForcado: `um@exemplo.test:${hex}` });
    assert.equal(r.status, 403, 'cookie do formato antigo continuou valendo');
  });

  test('6e. sem cookie, cookie vazio e cookie malformado dão o mesmo 403', async () => {
    const respostas = await Promise.all([
      pedir('/api/dados', null),
      pedir('/api/dados', null, { cookieForcado: '' }),
      pedir('/api/dados', null, { cookieForcado: 'lixo' }),
      pedir('/api/dados', null, { cookieForcado: '1:' + 'a'.repeat(64) }),
      pedir('/api/dados', null, { cookieForcado: '999999:curto' }),
    ]);
    for (const { r } of respostas) {
      assert.equal(r.status, 403);
      assert.deepEqual(await jsonDe(r), { erro: 'sem-acesso' });
    }
  });
});

// ================================================= troca de carteira e cliente

describe('RBAC: troca de carteira e de cliente devolve a mesma recusa', () => {
  test('7. carteira de outra organização e carteira inexistente dão resposta idêntica', async () => {
    const alheia = await pedir('/api/dados?carteira=CEDRO_CAP', 1);
    const inexistente = await pedir('/api/dados?carteira=NAO_EXISTE_999', 1);
    const fora = await pedir('/api/dados?carteira=ALPHA_02', 2); // existe na org, fora da atribuição
    assert.equal(alheia.r.status, 403);
    assert.equal(inexistente.r.status, 403);
    assert.equal(fora.r.status, 403);

    // Corpo lido uma vez só: Response.body é fluxo de uso único, e ler duas
    // vezes devolve erro, que aqui viraria "null" e faria o teste comparar
    // coisas diferentes sem perceber.
    const corpoAlheia = await jsonDe(alheia.r);
    const corpoInexistente = await jsonDe(inexistente.r);
    const corpoFora = await jsonDe(fora.r);

    assert.deepEqual(corpoAlheia, corpoInexistente, 'a recusa distingue "existe" de "não existe"');
    assert.deepEqual(corpoFora, corpoInexistente);
    assert.equal(alheia.r.headers.get('Content-Type'), inexistente.r.headers.get('Content-Type'));
  });

  test('7b. cliente pedindo a carteira de outro cliente é recusado', async () => {
    for (const code of ['ALPHA_01', 'BRAVO_FAM', 'CEDRO_CAP', 'NAO_EXISTE_999']) {
      const { r } = await pedir('/api/dados?carteira=' + code, 3);
      assert.equal(r.status, 403, `cliente alcançou ${code}`);
      assert.deepEqual(await jsonDe(r), { erro: 'sem-acesso' });
    }
  });

  test('7c. cliente pedindo outro cliente é recusado, mesmo com a própria carteira na URL', async () => {
    for (const q of ['?cliente=outro', '?cliente=CEDRO_CAP', '?cliente=2', '?carteira=ALPHA_02&cliente=outro']) {
      const { r } = await pedir('/api/dados' + q, 3);
      assert.equal(r.status, 403, `cliente se passou por outro em ${q}`);
    }
  });

  test('7d. cliente pedindo a própria carteira continua funcionando', async () => {
    const { r } = await pedir('/api/dados?carteira=ALPHA_02', 3);
    assert.equal(r.status, 200);
    assert.deepEqual(codesDoPayload(await jsonDe(r)), ['ALPHA_02']);
  });

  test('7e. rota sob /api/ que não existe dá 403, nunca HTML com status 200', async () => {
    for (const caminho of ['/api', '/api/', '/api/algo', '/api/dados/extra', '/api/usuarios/abc/status']) {
      const { r } = await pedir(caminho, 1);
      assert.equal(r.status, 403, `${caminho} não devolveu recusa uniforme`);
      const corpo = await r.text();
      assert.ok(!/<html/i.test(corpo), `${caminho} devolveu HTML no lugar de JSON`);
      assert.deepEqual(JSON.parse(corpo), { erro: 'sem-acesso' }, `${caminho} devolveu corpo diferente da recusa padrão`);
    }
  });
});

// ================================================================ projeção

describe('RBAC: projeção por papel', () => {
  test('9. a resposta do cliente não contém nenhum campo de receita ou custo', async () => {
    const { r } = await pedir('/api/dados', 3);
    const cru = JSON.stringify(await jsonDe(r));
    for (const campo of CAMPOS_PROIBIDOS_CLIENTE) {
      // Busca pelo NOME do campo com aspas dos dois lados, para não casar com
      // texto de outro contexto. Se aparecer, a projeção deixou passar.
      assert.ok(!cru.includes(`"${campo}"`), `a resposta do cliente contém "${campo}"`);
    }
    assert.ok(!/"mgr"/.test(cru), 'a resposta do cliente contém o eixo de gestor');
    assert.ok(!/"roaTarget"/.test(cru), 'a resposta do cliente contém meta de ROA');
  });

  test('9b. o cliente recebe só patrimônio, captação e rentabilidade', async () => {
    const { r } = await pedir('/api/dados', 3);
    const p = await jsonDe(r);
    const permitidos = new Set(CAMPOS_POR_PROJECAO[PROJECOES.CLIENTE]);
    for (const [code, serie] of Object.entries(p.portfolioData)) {
      for (const campo of Object.keys(serie)) {
        assert.ok(permitidos.has(campo), `série de ${code} trouxe campo fora da projeção: ${campo}`);
      }
    }
  });

  test('9c. o gestor e o titular recebem a projeção institucional, com custo', async () => {
    for (const id of [1, 2]) {
      const { r } = await pedir('/api/dados', id);
      const cru = JSON.stringify(await jsonDe(r));
      assert.match(cru, /"fee"/, `papel ${id} não recebeu a projeção institucional`);
    }
  });

  test('9d. nenhuma resposta de dado carrega série de carteira não autorizada', async () => {
    for (const id of [1, 2, 3, 4, 5, 6]) {
      const { r } = await pedir('/api/dados', id);
      const p = await jsonDe(r);
      const org = USUARIOS.find((u) => u.id === id).organizacao_id;
      const permitidas = org === ORG_UM.id ? ORG_UM.carteiras : ORG_DOIS.carteiras;
      for (const code of Object.keys(p.portfolioData)) {
        assert.ok(permitidas.includes(code), `usuário ${id} recebeu série de ${code}`);
      }
    }
  });

  test('9e. cliente recebe posições apenas da própria carteira, sem instituição interna', async () => {
    const { r } = await pedir('/api/dados', 3);
    const p = await jsonDe(r);
    const chaves = Object.keys(p.compositions || {});
    assert.ok(chaves.length > 0, 'cliente não recebeu posições detalhadas');
    assert.ok(chaves.every((k) => k.startsWith('ALPHA_02|')), 'cliente recebeu composição de outra carteira');
    for (const rows of Object.values(p.compositions)) {
      for (const row of rows) {
        assert.equal(Object.prototype.hasOwnProperty.call(row, 'institution'), false, 'cliente recebeu instituição interna');
      }
    }
  });

  test('9f. gestor recebe composição somente das carteiras atribuídas', async () => {
    const { r } = await pedir('/api/dados', 2);
    const p = await jsonDe(r);
    const chaves = Object.keys(p.compositions || {});
    assert.ok(chaves.length > 0, 'gestor não recebeu posições das carteiras atribuídas');
    assert.ok(chaves.every((k) => k.startsWith('ALPHA_01|')), 'gestor recebeu composição fora da atribuição');
    assert.ok(Object.values(p.compositions).flat().some((row) => row.institution), 'gestor perdeu campo institucional autorizado');
  });
});

// ==================================================== usuário desativado

describe('RBAC: desativar vale na requisição seguinte', () => {
  test('10. cookie válido de usuário desativado não abre nada', async () => {
    const banco = bancoFalso();
    const env = envDe(banco);
    const antes = await pedir('/api/dados', 2, { env });
    assert.equal(antes.r.status, 200, 'o gestor ativo deveria acessar');

    // Mesma sessão, mesmo cookie, sem novo login. Só o banco mudou.
    const titular = await pedir('/api/usuarios/2/status', 1, {
      env, metodo: 'POST', corpo: JSON.stringify({ ativo: 0 }),
    });
    assert.equal(titular.r.status, 200);

    const depois = await pedir('/api/dados', 2, { env });
    assert.equal(depois.r.status, 403, 'usuário desativado continuou acessando com o mesmo cookie');
    assert.deepEqual(await jsonDe(depois.r), { erro: 'sem-acesso' });
  });

  test('10b. usuário já desativado no banco não passa nem com cookie recém-assinado', async () => {
    const { r } = await pedir('/api/dados', 7);
    assert.equal(r.status, 403);
  });

  test('10c. desativado não abre nem a página', async () => {
    const env = envDe();
    const { r } = await pedir('/', 7, { env });
    const corpo = await r.text();
    assert.match(corpo, /Crie seu acesso/, 'usuário desativado abriu o app');
  });
});

// ================================================================ auditoria

describe('RBAC: auditoria', () => {
  test('11. operação sensível grava usuário, papel, organização, recurso, ação, resultado e dia', async () => {
    const banco = bancoFalso();
    const env = envDe(banco);
    await pedir('/api/usuarios/3/status', 1, { env, metodo: 'POST', corpo: JSON.stringify({ ativo: 0 }) });
    const linha = banco.auditoria.find((l) => l.acao === 'usuarios-status');
    assert.ok(linha, 'a operação sensível não deixou linha de auditoria');
    assert.equal(linha.usuario_id, 1);
    assert.equal(linha.role, 'owner');
    assert.equal(linha.organizacao_id, 1);
    assert.equal(linha.recurso, '/api/usuarios/:id/status');
    assert.equal(linha.resultado, 'desativado');
    assert.match(String(linha.dia), /^\d{4}-\d{2}-\d{2}$/);
  });

  test('11b. a auditoria não grava senha, hash, token nem e-mail em claro', async () => {
    const banco = bancoFalso();
    const env = envDe(banco);
    await pedir('/api/usuarios', 1, {
      env, metodo: 'POST',
      corpo: JSON.stringify({ nome: 'Novo', email: 'novo@exemplo.test', senha: 'senha-secreta-1', role: 'manager' }),
    });
    await pedir('/api/dados', 1, { env });
    const tudo = JSON.stringify(banco.auditoria);
    assert.doesNotMatch(tudo, /senha-secreta-1/, 'a auditoria gravou a senha');
    assert.doesNotMatch(tudo, /pbkdf2\$/, 'a auditoria gravou o hash da senha');
    assert.doesNotMatch(tudo, /@exemplo\.test/, 'a auditoria gravou e-mail em claro');
    assert.ok(banco.auditoria.length > 0, 'nada foi auditado');
  });

  test('11c. a recusa por fora do escopo deixa rastro', async () => {
    const banco = bancoFalso();
    await pedir('/api/dados?carteira=CEDRO_CAP', 1, { env: envDe(banco) });
    const negada = banco.auditoria.find((l) => l.resultado === 'fora-do-escopo');
    assert.ok(negada, 'a tentativa de acesso cruzado não foi registrada');
    assert.equal(negada.recurso, '/api/dados');
  });

  test('11d. a auditoria é lida só pelo titular, e só a da própria organização', async () => {
    const banco = bancoFalso();
    const env = envDe(banco);
    await pedir('/api/usuarios/3/status', 1, { env, metodo: 'POST', corpo: JSON.stringify({ ativo: 0 }) });
    const { r } = await pedir('/api/auditoria', 1, { env });
    const p = await jsonDe(r);
    assert.equal(r.status, 200);
    assert.ok(p.eventos.length > 0);
    assert.ok(!/"usuario_id"/.test(JSON.stringify(p)), 'a leitura da auditoria expõe o identificador da pessoa');
  });

  test('11e. a auditoria não vira coluna na tabela anônima de eventos', async () => {
    // `eventos` é contador agregado sem pessoa, e seis checks de
    // tests/validate.js travam essa ausência. Se uma operação de acesso
    // passasse a gravar lá, a natureza jurídica da tabela mudaria.
    const banco = bancoFalso();
    await pedir('/api/dados', 1, { env: envDe(banco) });
    assert.deepEqual(banco.eventos, [], 'a rota de dado contaminou a tabela de eventos');
  });
});

// ================================================================== entrada

describe('portão: cadastro e login pela tabela de identidade', () => {
  test('cadastro novo cria organização própria e atribui o conjunto do demo', async () => {
    const banco = bancoFalso();
    const env = envDe(banco);
    const r = await worker.fetch(new Request('https://demo.multi-assets.com/cadastrar', {
      method: 'POST',
      body: new URLSearchParams({ nome: 'Pessoa Nova', email: 'nova@exemplo.test', senha: 'senha-longa-1' }),
    }), env, ctxFalso());

    assert.equal(r.status, 303, 'o cadastro não concluiu');
    const cookie = r.headers.get('Set-Cookie') || '';
    assert.match(cookie, /^atlas_demo_sessao=\d+:[0-9a-f]{64}/, 'o cookie não carrega o id do usuário');

    const criado = banco.usuarios.find((u) => u.email === 'nova@exemplo.test');
    assert.ok(criado, 'não criou a identidade');
    assert.equal(criado.role, 'owner', 'cadastro público não virou titular de organização própria');

    const orgNova = criado.organizacao_id;
    assert.ok(![ORG_UM.id, ORG_DOIS.id].includes(orgNova), 'o cadastro entrou numa organização existente');
    const pool = banco.orgCarteiras.filter((o) => o.organizacao_id === orgNova).map((o) => o.carteira_code);
    assert.equal(pool.length, POOL_DEMO.length, 'a organização nova não recebeu o conjunto do demo');
  });

  test('cadastro repetido é recusado e não cria segunda identidade', async () => {
    const banco = bancoFalso();
    const env = envDe(banco);
    const corpo = new URLSearchParams({ nome: 'Repetido', email: 'um@exemplo.test', senha: 'senha-longa-1' });
    const r = await worker.fetch(new Request('https://demo.multi-assets.com/cadastrar', { method: 'POST', body: corpo }), env, ctxFalso());
    assert.equal(r.status, 303);
    assert.match(r.headers.get('Location') || '', /erro=email-existe/);
  });

  test('login usa `usuarios` e recusa a mesma coisa para email inexistente e senha errada', async () => {
    const banco = bancoFalso();
    const env = envDe(banco);
    // O usuário 1 existe em `usuarios`; nenhum hash válido é semeado, então toda
    // tentativa falha e o que se mede é a uniformidade da recusa.
    const inexistente = await worker.fetch(new Request('https://demo.multi-assets.com/entrar', {
      method: 'POST', body: new URLSearchParams({ email: 'ninguem@exemplo.test', senha: 'qualquer' }),
    }), env, ctxFalso());
    const existente = await worker.fetch(new Request('https://demo.multi-assets.com/entrar', {
      method: 'POST', body: new URLSearchParams({ email: 'um@exemplo.test', senha: 'qualquer' }),
    }), env, ctxFalso());

    assert.equal(inexistente.status, existente.status);
    assert.equal(inexistente.headers.get('Location'), existente.headers.get('Location'), 'a recusa distingue quem existe de quem não existe');
    assert.equal(inexistente.headers.get('Set-Cookie'), null);
    assert.equal(existente.headers.get('Set-Cookie'), null);
  });

  test('login de usuário desativado não devolve cookie', async () => {
    const banco = bancoFalso();
    const env = envDe(banco);
    const r = await worker.fetch(new Request('https://demo.multi-assets.com/entrar', {
      method: 'POST', body: new URLSearchParams({ email: 'fora@exemplo.test', senha: 'qualquer' }),
    }), env, ctxFalso());
    assert.equal(r.headers.get('Set-Cookie'), null);
    assert.match(r.headers.get('Location') || '', /erro=credenciais/);
  });
});

// ==================================================== sessão e o pool do demo

describe('sessão e conjunto', () => {
  test('GET /api/sessao devolve nome, papel e as carteiras que o papel alcança', async () => {
    const doTitular = await jsonDe((await pedir('/api/sessao', 1)).r);
    assert.equal(doTitular.role, 'owner');
    assert.equal(doTitular.nome, 'Titular Um');
    assert.deepEqual(doTitular.carteiras.slice().sort(), ['ALPHA_01', 'ALPHA_02', 'BRAVO_FAM']);

    const doCliente = await jsonDe((await pedir('/api/sessao', 3)).r);
    assert.equal(doCliente.role, 'client');
    assert.deepEqual(doCliente.carteiras, ['ALPHA_02']);
    assert.equal(doCliente.clienteId, 'ALPHA_02');

    const doGestor = await jsonDe((await pedir('/api/sessao', 2)).r);
    assert.equal(doGestor.role, 'manager');
    assert.deepEqual(doGestor.carteiras, ['ALPHA_01']);
  });

  test('a migration e o conjunto do Worker carregam exatamente o mesmo pool', () => {
    // A lista da migration 0003 é literal porque migration é SQL e não importa
    // módulo. Duas listas que precisam ser iguais e não são verificadas viram
    // duas listas diferentes na primeira vez que alguém acrescentar carteira.
    const sql = fs.readFileSync(path.join(RAIZ, 'demo-worker', 'migrations', '0003_rbac.sql'), 'utf8');
    const bloco = sql.split('WITH c(code) AS (VALUES')[1].split(')\nINSERT OR IGNORE')[0];
    const daMigracao = [...bloco.matchAll(/\('([A-Z0-9_]+)'\)/g)].map((m) => m[1]);
    assert.deepEqual(daMigracao, POOL_DEMO, 'a lista da migration divergiu de POOL_DEMO');
  });

  test('todo código do pool existe no conjunto, e todo código do conjunto está no pool', () => {
    assert.equal(POOL_DEMO.length, 40);
    const doCatalogo = DATASET.catalogo.map((c) => c.code);
    assert.deepEqual([...doCatalogo].sort(), [...POOL_DEMO].sort());
    for (const code of POOL_DEMO) {
      assert.ok(DATASET.carteiras[code], `sem série para ${code}`);
    }
  });
});
