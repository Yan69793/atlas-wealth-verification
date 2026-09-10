-- 0004_demo_contas.sql — contas de demonstração dos três papéis.
--
-- Três contas sintéticas num único escritório (org 1001) para demonstrar o
-- recorte de visibilidade de cada papel: o titular vê todas as carteiras, o
-- gerente só as atribuídas a ele, o cliente só a própria. São as contas que
-- os botões "Escritório / Gerente / Cliente" da tela de acesso usam, via
-- POST /demo/entrar. O papel vem do banco, não do botão: o parâmetro `perfil`
-- só escolhe QUAL conta entrar.
--
-- `senha_hash = 'demo'` é marcador: estas contas não fazem login por senha,
-- só pela rota de demonstração, que assina a sessão direto. O valor nunca
-- passa em verificarSenha (o formato não casa), então ninguém entra nelas
-- pelo formulário comum.
--
-- Ids fixos 1001..1003, distantes do auto-incremento real, para o vínculo
-- entre conta e atribuição ser explícito e o INSERT ser idempotente.

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO organizacoes (id, nome, criado_em) VALUES (1001, 'Demo ATLAS', datetime('now'));

INSERT OR IGNORE INTO usuarios (id, organizacao_id, nome, email, senha_hash, role, ativo, cliente_id, criado_em)
VALUES
  (1001, 1001, 'Escritório', 'demo-escritorio@exemplo.com', 'demo', 'owner', 1, NULL, datetime('now')),
  (1002, 1001, 'Gerente',    'demo-gerente@exemplo.com',    'demo', 'manager', 1, NULL, datetime('now')),
  (1003, 1001, 'Cliente',    'demo-cliente@exemplo.com',    'demo', 'client', 1, 'ALPHA_01', datetime('now'));

INSERT OR IGNORE INTO atribuicoes (usuario_id, carteira_code) VALUES
  (1002, 'ALPHA_01'), (1002, 'ALPHA_02'), (1002, 'BRAVO_FAM'),
  (1003, 'ALPHA_01');

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
SELECT 1001, c.code FROM c;
