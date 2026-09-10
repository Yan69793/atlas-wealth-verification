-- 0003_rbac.sql — controle de acesso institucional (owner / manager / client)
--
-- Aditiva. `cadastros` NÃO é reescrita nem apagada: ela continua sendo a
-- tabela que o cadastro público e o login usam, e passa a ser espelhada em
-- `usuarios`. O backfill no fim desta migration transforma cada linha já
-- existente em OWNER de uma organização própria, que é a leitura correta do
-- que ela sempre foi: cada prospect que se cadastrou era dono do próprio
-- acesso, não membro do acesso de outro.
--
-- Duas tabelas de propósito, e a diferença é jurídica, não técnica:
--
--   `eventos`   é contador agregado. Não tem coluna de pessoa, e seis checks
--               em tests/validate.js travam essa ausência. Continua intacta.
--   `auditoria` liga AÇÃO a PESSOA. É dado pessoal sob LGPD, com finalidade
--               declarada (rastrear acesso e alteração de permissão), base
--               legal de legítimo interesse do controlador, e retenção de
--               12 meses a contar do `dia`. Nunca recebe senha, hash de
--               senha, token, cookie nem e-mail em texto claro: a
--               correlação com a pessoa é por `usuario_id`, e o e-mail só é
--               alcançável por quem já administra a organização, via JOIN.
--               Não pode virar analítica de produto: para isso existe
--               `eventos`, que é anônima por desenho.
--
-- Nenhuma destas tabelas guarda dado de carteira. O conjunto do demo é
-- sintético e vive no Worker (`dataset.js`, gerado em build), filtrado e
-- projetado na resposta.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- organizações

CREATE TABLE IF NOT EXISTS organizacoes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------------- usuários

-- `email` é UNIQUE global, e não por organização, porque o login é feito só
-- pelo e-mail: com unicidade por organização, o mesmo endereço existiria em
-- duas e o login não teria como escolher. Consequência aceita no demo: um
-- OWNER não consegue convidar para a própria organização um e-mail que já
-- pertence a outra.
CREATE TABLE IF NOT EXISTS usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  organizacao_id INTEGER NOT NULL REFERENCES organizacoes(id),
  nome           TEXT NOT NULL,
  email          TEXT NOT NULL COLLATE NOCASE UNIQUE,
  senha_hash     TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('owner','manager','client')),
  ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  -- Só faz sentido para role='client': identifica o cliente no mundo do
  -- escritório. No demo, coincide com o código da carteira própria.
  cliente_id     TEXT,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_org  ON usuarios(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(organizacao_id, role);

-- ------------------------------------------------- carteiras de cada organização

-- Quais carteiras pertencem a qual organização. É o primeiro eixo de
-- isolamento: o OWNER vê a organização inteira, e "a organização inteira" é
-- exatamente o que está aqui. Organização sem linha aqui vê conjunto VAZIO,
-- nunca o conjunto todo. Fail-closed: o default é nada.
CREATE TABLE IF NOT EXISTS organizacoes_carteiras (
  organizacao_id INTEGER NOT NULL REFERENCES organizacoes(id),
  carteira_code  TEXT NOT NULL,
  PRIMARY KEY (organizacao_id, carteira_code)
);

-- --------------------------------------------------- atribuições por usuário

-- Segundo eixo, por pessoa: quais carteiras da organização ESTE usuário
-- enxerga. O MANAGER fica restrito às dele. O CLIENT tem exatamente uma, a
-- própria. O OWNER não depende desta tabela, mas também pode ter linhas aqui
-- sem que isso amplie nada.
CREATE TABLE IF NOT EXISTS atribuicoes (
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id),
  carteira_code TEXT NOT NULL,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, carteira_code)
);

CREATE INDEX IF NOT EXISTS idx_atribuicoes_carteira ON atribuicoes(carteira_code);

-- ------------------------------------------------------------------ auditoria

CREATE TABLE IF NOT EXISTS auditoria (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  dia            TEXT NOT NULL,
  usuario_id     INTEGER,
  role           TEXT,
  organizacao_id INTEGER,
  recurso        TEXT NOT NULL,
  acao           TEXT NOT NULL,
  resultado      TEXT NOT NULL,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auditoria_dia ON auditoria(dia);
CREATE INDEX IF NOT EXISTS idx_auditoria_org ON auditoria(organizacao_id, dia);

-- ============================================================== BACKFILL

-- `cadastros` ganha o ponteiro para a organização e o usuário que passam a
-- representá-la. As colunas ficam na tabela antiga de propósito: sem elas não
-- haveria como conferir o backfill depois, e conferir depois é o único jeito
-- de saber que ele não perdeu ninguém.
ALTER TABLE cadastros ADD COLUMN organizacao_id INTEGER;
ALTER TABLE cadastros ADD COLUMN usuario_id INTEGER;

-- Uma organização por cadastro existente. O id é o MESMO do cadastro, escrito
-- explicitamente: sem isso o vínculo dependeria da ordem de inserção, e ordem
-- de inserção não é contrato. O nome não repete o e-mail, que é dado pessoal e
-- não tem por que virar rótulo de organização.
INSERT INTO organizacoes (id, nome, criado_em)
SELECT id, 'Organização ' || id, criado_em FROM cadastros;

-- Cada cadastro vira OWNER da própria organização. O hash de senha é copiado
-- como está: a migration não recomputa, não reescreve e não enfraquece
-- parâmetro nenhum de PBKDF2.
INSERT INTO usuarios (id, organizacao_id, nome, email, senha_hash, role, ativo, cliente_id, criado_em)
SELECT id, id, nome, email, senha_hash, 'owner', 1, NULL, criado_em FROM cadastros;

UPDATE cadastros SET organizacao_id = id, usuario_id = id;

-- Toda organização existente recebe o conjunto sintético do demo. A lista é
-- literal aqui porque migration é SQL e não importa módulo. Ela precisa bater
-- exatamente com `POOL_DEMO` de demo-worker/src/dataset.js, e
-- tests/rbac-isolamento.test.mjs falha se divergir.
--
-- Isto é DECISÃO DE DEMO, e não vale para a instância: o conjunto é sintético
-- e idêntico para todo mundo, então entregar o pool inteiro a cada organização
-- não expõe dado de ninguém. O que o isolamento prova aqui é a recusa de
-- linhas fora da organização, exercitada nos testes com organizações de
-- conjuntos disjuntos. Na instância, a carteira de cada organização vem do
-- dado real dela e a atribuição é 1:1.
WITH c(code) AS (VALUES
  ('ALPHA_01'), ('ALPHA_02'), ('ALPHA_03'), ('BRAVO_FAM'), ('BRAVO_PV'),
  ('CEDRO_HLD'), ('CEDRO_CAP'), ('DUNAS_CAP'), ('DUNAS_FAM'),
  ('ESTRELA_PV'), ('ESTRELA_HLD'), ('FAROL_INV'), ('FAROL_FAM'),
  ('GAMMA_MID'), ('GAMMA_LRG'), ('HELIOS_01'), ('HELIOS_02'),
  ('INDIGO_CAP'), ('JOIA_FAM'), ('JOIA_HLD'), ('KAPPA_PV'), ('KAPPA_INV'),
  ('LUMIA_01'), ('LUMIA_02'), ('MARTE_FAM'), ('NOVA_CAP'), ('NOVA_PV'),
  ('ORION_01'), ('ORION_02'), ('PRADO_HLD'), ('PRADO_FAM'), ('QUASAR_CAP'),
  ('RIO_01'), ('RIO_02'), ('SOLAR_PV'), ('SOLAR_INV'), ('TIGRE_FAM'),
  ('UMBRA_01'), ('UMBRA_02'), ('COMETA_FAM')
)
INSERT OR IGNORE INTO organizacoes_carteiras (organizacao_id, carteira_code)
SELECT o.id, c.code FROM organizacoes o CROSS JOIN c;
