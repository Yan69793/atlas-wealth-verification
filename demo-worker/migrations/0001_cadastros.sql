-- Cadastro proprio do demo (nome, email, senha).
-- Email UNIQUE COLLATE NOCASE: unicidade case-insensitive mesmo se o Worker
-- normalizar por engano. Senha nunca em claro: so o hash versionavel
-- (pbkdf2$<salt hex>$<iter>$<hash hex>).
CREATE TABLE IF NOT EXISTS cadastros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
