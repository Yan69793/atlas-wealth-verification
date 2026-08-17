# Estado do projeto — ATLAS

Última atualização: 2026-08-17 (agente: Claude Code)

Leia este arquivo antes de começar qualquer trabalho, seja qual for o agente.
Atualize a data e os itens abertos ao fechar uma sessão que mudou o estado.
Não duplique conteúdo do CLAUDE.md nem do README.md: aqui fica só o ponto de
partida com os ponteiros.

## O que é

ATLAS é a plataforma de verificação mensal de carteiras de investimento
(Meridian Advisory), produto cujo repo privado é
`Yan69793/atlas-wealth-verification`. App React/JSX buildado com Vite, sem
autenticação no cliente: o perímetro é Cloudflare Access + Worker validando
JWT. A instância do cliente vive em `verificacao-carteiras/`, fora do git do
produto.

## Estado em 2026-08-17

Pronto conforme o CLAUDE.md: build Vite fechado (`npm run build` gera
`dist-app/`, ordem de import travada por `tests/validate.js`), repo privado
criado no GitHub e cadeia dos 3 repos (gitlinks) fechada em 2026-08-15.
Perímetro da instância fechado: `workers_dev = false` deployado, a URL técnica
saiu do ar e `atlas.szuchmacher.com.br` é servido via Access. Chave Cloudflare
exposta revogada pelo dono, credencial do git no github.com via keyring do
`gh`. Thresholds do snapshot calibrados pelo dono em 2026-08-14 (tudo
percentual) e Fase 4 publicada no demo. Suíte registrada após a última rodada:
352/352 checks + 101/101 testes.

Pendências abertas registradas no CLAUDE.md, uma linha por item (detalhe no
CLAUDE.md): separação de conta Cloudflare (domínio novo + conta dedicada,
caminho decidido, sem data, checklist em `docs/separacao-cloudflare.md`); e
dependência pontual de CDN no demo, que restou só na importação de planilha
(sheetjs) e no analytics. Quando o custodiante mandar o primeiro arquivo
diário real, ele entra como dado de instância normal, sem pendência de produto.

## Como verificar

O portão de aceite do projeto:

```
npm test
```

Cole a saída real antes de declarar qualquer tarefa concluída. Se falhar ou
não puder executar, diga explicitamente.

## Onde está o resto

- `CLAUDE.md` — regras do projeto e pendências com detalhe
- `README.md` — visão geral; descreve a arquitetura pré-Vite (Babel
  Standalone, sem build), que o CLAUDE.md superou com o build Vite. A lista
  de documentação desatualizada está em `ESTADO/MAPA.md`
- `ESTADO/` — fonte canônica própria do projeto: `LEIA-PRIMEIRO.md`,
  `ESTADO-ATUAL.md`, `MAPA.md`. Se divergir do CLAUDE.md, o `ESTADO-ATUAL.md`
  ganha
- `src/` (app), `scripts/` (deploy e verificação), `docs/`, `tests/`,
  `audit-engine/`, `daily/`
- `verificacao-carteiras/` — instância do cliente, fora do git do produto
- `SyncIA/` — dossiê de inteligência competitiva, fora do git

## Itens abertos

- Separação de conta Cloudflare (domínio novo + conta dedicada), sem data — detalhe no CLAUDE.md
- Dependência pontual de CDN no demo (sheetjs na importação, analytics) — detalhe no CLAUDE.md
