# CLAUDE.md — ATLAS (hardened 2026-07-25)

## Segurança de dados (LGPD)

- Nunca adicionar ao Git: `Verificação Mensal de Carteiras*`, PDFs, DOCX, XLSX, ZIPs com dados reais
- `platform-data-real.js`, `platform-data-audit.js`, `platform-historico.js` são LGPD e estão no .gitignore
- Se aparecerem em `git status`, investigar e corrigir o `.gitignore` antes de prosseguir

## Ordem de carregamento (index.html)

CSS → tokens → CDNs → parsers → dados → utils → páginas → shell. Fora de ordem quebra.

## Autenticação

- App não autentica no cliente. Perímetro é Cloudflare Access + Worker validando JWT.
- Senha fixa `atlas2026` foi removida. `tests/validate.js` falha se ela voltar.
- Não reintroduzir gate no cliente.

## Encoding

- UTF-8 sem BOM. Verificar ausência de mojibake após reescrita.

## Portão de verificação

Antes de declarar qualquer tarefa concluída, execute:
```
npm test
```
Cole a saída real na resposta. Se falhar ou não puder executar, diga explicitamente. Nunca declare "funcionando" sem a saída colada.
