# MAPA do ATLAS

Onde encontrar cada coisa. Feito para busca por texto, então os termos aparecem escritos por
extenso de propósito. Se você chegou aqui sem contexto, leia [[LEIA-PRIMEIRO]] antes.

Este arquivo aponta, não copia. Estado do projeto fica em [[ESTADO-ATUAL]].

## Por tarefa

| Quero | Vá para |
|---|---|
| Ingerir um mês novo, importar planilha, importar PDF, debugar parser, mexer em regra, score, schema, snapshot diário | skill `atlas-audit-engine` |
| Conferir uma carteira à mão, gerar PDF de achados, come-cotas, conciliação manual | skill `verificacao-carteiras-v2` |
| Entender o sistema como um todo, fronteira produto e instância, contrato de build, topologia | skill `atlas-sistema` |
| Saber onde o projeto está hoje, o que falta, prioridade, número de teste | [[ESTADO-ATUAL]] |
| Saber o que o produto faz e para quem é vendido | `docs/produto.md`, com rot, ver abaixo |
| Mapa de mercado, ICP, por que não somos consolidador, concorrente | `docs/estrategia-produto-icp.md` |
| Arquitetura detalhada | `docs/AUDITORIA_COMPLETA_ATLAS.md`, data-base 25/jul, não cobre as fases de agosto |
| Comparar com concorrente internacional | `docs/benchmark-pandaconnect.md` e a versão de agosto |
| Dossiê do concorrente SyncIA Desk | `SyncIA/`, fora do git, não entra em build |
| Decidir o caminho para o segundo cliente, multi-cliente, isolamento | `docs/superpowers/plans/2026-08-17-caminho-multi-cliente.md` |
| Separação de conta Cloudflare | `docs/separacao-cloudflare.md`, suspensa pelo dono |
| Material de venda, pitch | `docs/go-to-market/` |
| Plano de fase, spec de design | `docs/superpowers/plans/` e `docs/superpowers/specs/` |
| Diagnóstico de sessão anterior | `diagnosticos/` |

## Por assunto no código

| Assunto | Onde |
|---|---|
| Motor de auditoria, regras, score | `audit-engine/src/rules/`, `engine.ts`, `score.ts`, `schema.ts` |
| Parser de Excel, XLSX, CSV, PDF, registry de formato | `audit-engine/src/parsers/` |
| Snapshot diário, evento, diff, threshold, vencimento | `audit-engine/src/snapshot/` |
| Oportunidade, fila, priorização, CRM | `audit-engine/src/opportunities/` |
| Caixa parado, liquidez, vencimento (inteligência) | `audit-engine/src/intel/` |
| Servidor HTTP, autenticação, JWT, papel, limite de taxa | `audit-engine/src/server.ts`, `auth/`, `middleware/`. **Código morto, ver [[ESTADO-ATUAL]] antes de mexer** |
| Agendador de auditoria | `audit-engine/src/scheduler/`. Código morto |
| Telas do app | `platform-*.jsx` na raiz |
| Ordem de import, contrato de inicialização | `src/main.jsx` |
| Travas estáticas, proibição de senha fixa, proibição de rede nas telas | `tests/validate.js` |
| Build, verificação de build, deploy | `scripts/verify-build.mjs`, `scripts/build-deploy.mjs`, `scripts/deploy-cf.ps1` |
| Worker do demo, CSP, configuração Cloudflare | `demo-worker/` |
| Fixtures sintéticos, dado fictício, seed do demo | `audit-engine/tests/fixtures-sinteticos/`, `npm run seed:demo` |
| Casca antiga anterior ao Vite, não usar | `deploy_cf/app.jsx` e cópias em `.archive/`. Fora do bundle |

## Comandos

```powershell
npm test              # portão de verificação, obrigatório antes de declarar pronto
npm run lint          # só as travas estáticas
npm run dev           # desenvolvimento com recarga
npm run build         # gera dist-app/
npm run seed:demo     # roda o pipeline inteiro com dado sintético
npm run pipeline      # pipeline do motor
```

Antes de qualquer push, limpar o token que sombreia o keyring:

```powershell
$env:GH_TOKEN=$null; $env:GITHUB_TOKEN=$null
```

Para ler ponteiro de repositório aninhado, `git submodule status` não funciona aqui, são
gitlink sem entrada em `.gitmodules`:

```powershell
git ls-tree HEAD verificacao-carteiras
```

## Documentação com rot confirmado

Medido em 17 de agosto de 2026. Não confie nesses pontos sem abrir o código.

| Documento | O que está errado |
|---|---|
| `docs/produto.md` | diz que a interface roda sem etapa de build e que não há bundler. Falso desde o corte Vite, o app é buildado |
| `docs/produto.md` | diz que falta fechar o perímetro na instância. Foi fechado em 15/ago |
| `docs/manual-de-uso.md` | de 15/jul, ainda diz que a importação não foi implementada |
| `docs/AUDITORIA_COMPLETA_ATLAS.md` | data-base 25/jul, não menciona nenhuma das cinco fases de agosto |
| `CLAUDE.md` | os hashes de gitlink registrados descrevem 15/ago e já não batem com o disco. Ver [[ESTADO-ATUAL]] |

Achou rot novo? Registre aqui e em [[ESTADO-ATUAL]]. Não corrija em silêncio, o padrão de
atraso é informação sobre o projeto.

## Vocabulário do projeto

Termos que aparecem no código e nas conversas, para você não procurar a palavra errada.

- **Book**: o relatório mensal por carteira que o custodiante envia, normalmente PDF.
- **Instância**: a pasta com dado real de um cliente, fora do git do produto.
- **Overlay**: arquivo de dado real injetado em runtime, nunca no bundle.
- **Achado**: divergência encontrada por uma das sete regras.
- **Conciliação**: a conta do patrimônio esperado contra o reportado.
- **Come-cotas**: imposto semestral de fundo, uma das sete regras.
- **Portão**: `npm test`, a verificação obrigatória antes de declarar pronto.
- **Gitlink**: ponteiro de commit de um repositório dentro de outro, sem `.gitmodules`.
- **Fase**: uma das cinco camadas de inteligência de agosto de 2026. Ver [[ESTADO-ATUAL]].
