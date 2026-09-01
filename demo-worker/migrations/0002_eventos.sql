-- Contadores agregados do funil do demo.
--
-- NAO e log de acesso. Nao existe coluna de pessoa, de email, de IP, de user
-- agent nem de sessao, e essa ausencia e deliberada: e ela que mantem esta
-- tabela fora de tratamento de dado pessoal sob LGPD. Quem inserir aqui uma
-- coluna que ligue evento a pessoa muda a natureza juridica da tabela, nao so
-- o schema.
--
-- Chave composta (dia, evento, detalhe) com UPSERT no lugar de uma linha por
-- ocorrencia: o volume fica constante no numero de dias, nao no numero de
-- visitas, e nao ha nada para expurgar depois.
--
-- `detalhe` guarda o codigo do erro em cadastro_erro e login_erro (nome-vazio,
-- credenciais, email-existe...). Vazio nos eventos de sucesso. Nunca guarda o
-- valor digitado, so o codigo da regra que barrou.

CREATE TABLE IF NOT EXISTS eventos (
  dia     TEXT NOT NULL,
  evento  TEXT NOT NULL,
  detalhe TEXT NOT NULL DEFAULT '',
  total   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, evento, detalhe)
);

-- O painel le sempre por faixa de dias, entao o indice segue a ordem da
-- consulta. A PK ja cobre (dia, evento, detalhe); este e para o corte por
-- evento dentro da faixa, usado no agrupamento de erros.
CREATE INDEX IF NOT EXISTS idx_eventos_evento_dia ON eventos (evento, dia);
