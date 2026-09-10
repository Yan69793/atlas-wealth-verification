# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ATLAS — guia do repositório

Produto de conferência de carteira de investimento, vendido para escritório de gestão de
patrimônio. Recebe o relatório mensal do custodiante, compara com o mês anterior, aplica sete
regras e diz se a carteira pode ir para o cliente ou se tem número sem explicação. O
posicionamento é "não mostre o patrimônio, prove o número", todo achado carrega a conta que o
gerou.

## Estado do projeto: comece por `ESTADO/`

Antes de qualquer trabalho, leia `ESTADO/LEIA-PRIMEIRO.md`. A pasta `ESTADO/` na raiz é a
fonte única do estado, feita para orientar quem chega sem contexto.

- `ESTADO/LEIA-PRIMEIRO.md` — orientação e as regras que quebram coisa
- `ESTADO/ESTADO-ATUAL.md` — pendência, prioridade, decisão em aberto, contagem de teste,
  cadeia de gitlink, o que é código morto. **Se este arquivo divergir do `CLAUDE.md`, ele
  ganha.**
- `ESTADO/MAPA.md` — onde achar cada coisa, comandos, vocabulário, e a lista de documentação
  que já se provou desatualizada

Regra da pasta: um assunto, um arquivo, zero cópia. Estado não se duplica aqui, se aponta.
Este `CLAUDE.md` guarda o que é estável (identidade, contrato, comandos, regras de segurança).
O que muda a cada sessão vive no `ESTADO/`.

## Como responder neste projeto (regra fixa, 2026-08-08)

Resposta curta e em português comum. O usuário é o dono do negócio, não o programador, e
respostas longas cheias de termo técnico não são lidas até o fim. Pedido explícito dele,
repetido duas vezes.

- Aplicar a skill `humanizer` em toda resposta final.
- Sem linguagem de programação no texto. Nada de nome de arquivo, número de linha, nome de
  função, comando, código de erro ou jargão de infraestrutura. Dizer o efeito no negócio, não
  o mecanismo.
- Resumir. Se não couber em poucos parágrafos, entregar a conclusão e oferecer o detalhe, em
  vez de despejar tudo.
- Conclusão primeiro. O que mudou, o que quebrou, o que falta decidir.
- Tabela só quando compara coisas de verdade. Prosa é o padrão.

Exceção: quando o usuário pedir o detalhe técnico, ou quando for um comando que ele precisa
colar, aí vai literal e sem tradução. Comando, caminho e saída de teste nunca são alterados
nem humanizados.

## Comandos

```powershell
npm install
npm run dev              # Vite com HMR
npm run build            # gera dist-app/ (obrigatório antes de publicar)
npm run preview          # serve o build local
npm test                 # portão completo, ver a seção Portão
npm run lint             # só as travas estáticas (tests/validate.js)
npm run seed:demo        # pipeline inteiro com dado sintético
npm run pipeline         # pipeline do motor de auditoria
npm run build-historico  # gera historico.json
```

Rodar um teste isolado, camada estática e de comportamento:

```powershell
node tests/validate.js
node --test tests/admin-perimetro.test.mjs
```

Camada do motor, TypeScript, precisa compilar antes de testar:

```powershell
npm --prefix audit-engine test                          # tsc + suíte inteira
npm --prefix audit-engine run build
node --test --test-concurrency=1 audit-engine/dist/tests/<arquivo>.test.js
```

Publicação do demo, sempre nesta ordem, porque o script recusa bundle velho mas não builda
sozinho:

```powershell
npm run build
scripts/deploy-cf.ps1 -Target worker
```

Antes de qualquer push, limpar o token de ambiente que sombreia o keyring do `gh`:

```powershell
$env:GH_TOKEN=$null; $env:GITHUB_TOKEN=$null
```

## Arquitetura

### Três repositórios que viajam juntos

O projeto vive em `E:\Diretorio\Claude\FREQUENTE\ATLAS`. Dentro dele há três repos git ligados
por gitlink, sem `.gitmodules`: o produto (raiz), a instância do cliente em
`verificacao-carteiras/` e um checkout pinado de `core/`. Instância e dado de cliente ficam
sempre fora do git do produto.

`git submodule status` não funciona aqui, porque são gitlink sem entrada em `.gitmodules`. Para
ler o ponteiro use `git ls-tree HEAD <caminho>`. A cadeia corrente está em `ESTADO/ESTADO-ATUAL.md`,
não aqui, os hashes derivam.

### O build e o contrato de carga

SPA React com rotas em hash, buildada com Vite para `dist-app/`. `src/main.jsx` é o ponto de
entrada e a ordem de import dele é o contrato de inicialização:

```
tokens → parsers → dados → utils → shell
```

Fora de ordem o app abre em tela branca, porque as páginas leem `window.*` no topo do módulo.
As páginas **não estão mais** nessa lista. Desde 2026-08-30 cada `platform-*.jsx` é baixado sob
demanda por rota, via `PAGE_LOADERS` em `platform-app.jsx`, com prefetch em hover e foco de
teclado. `tests/validate.js` trava as duas coisas, a ordem dos módulos estáticos por literal e
a entrada das 21 páginas em `PAGE_LOADERS` apontando para arquivo que existe.

Namespaces de runtime: `AtlasData`, `AtlasParsers`, `AtlasUtils`, `AtlasIcons`, `AtlasCharts`,
`AtlasUI`, `AtlasContexts`, `AtlasPages`, `AtlasTokens`, `HISTORICO_DATA`.

### Overlays de dado real

Overlay é script clássico de runtime, nunca entra no bundle. O Vite retira as tags deles no
build (senão quebra, os arquivos não existem no repo do produto). Quem reinjeta: em produção o
Worker da instância, no HTML servido apontando para a rota autenticada do R2. Localmente, o
`scripts/gen-index.mjs` da instância. Os `platform-*-demo.js` são o fallback sintético usado
quando o overlay real não carregou, e vários deles são gerados pelo motor, não editados à mão.

`scripts/verify-build.mjs` e `scripts/build-deploy.mjs` recusam publicar se `dist-app/` contiver
overlay, binário ou marca de build de desenvolvimento. A política de binários publicáveis mora
em `scripts/politica-binarios.mjs`, fonte única.

### Motor de auditoria, `audit-engine/`

TypeScript, compila para `dist/`, é onde vivem as regras, os parsers de Excel e PDF, o
snapshot diário, a fila de oportunidades e a camada de inteligência (`src/intel/`). Os limiares
ficam centralizados e versionados em `src/snapshot/thresholds.ts`, nunca decididos na tela.

`audit-engine/src/server.ts` e as pastas `auth/`, `middleware/`, `scheduler/` são **código
morto**, nunca rodaram uma vez. Compilam e por isso parecem prontos. Antes de reusar qualquer
coisa dali, leia a seção do backend em `ESTADO/ESTADO-ATUAL.md`.

### Worker do demo, `demo-worker/`

Worker da Cloudflare que serve `demo.multi-assets.com`. Roda antes dos assets
(`run_worker_first`), faz gate de cadastro próprio sobre D1 (tabela `cadastros`, senha em
PBKDF2, sessão por cookie HMAC), tem painel do dono e dispara aviso por email via Resend. O
demo não tem dado real, só dado sintético. O produto real não autentica no cliente, o perímetro
dele é Cloudflare Access.

### Testes

`tests/validate.js` é a camada estática, CommonJS, e é o contrato do repositório: ordem de
import, entradas de página, `.gitignore`, ausência de senha fixa, proibição de rede em páginas,
formato da tabela de eventos do demo. `tests/*.test.mjs` são os testes de comportamento, onde a
regra precisa ser importada e exercitada em vez de conferida por casamento de texto. A suíte do
motor roda à parte.

Lição registrada e que se repete neste projeto: teste verde não prova comportamento, nem número
certo. A suíte antiga validava existência de arquivo e casamento de string.

## Regras que quebram coisa de verdade

### Dado de cliente nunca entra no git do produto

Este repositório é o produto. Dado real vive na instância, em `verificacao-carteiras/`, fora do
git do produto. Nunca versionar pastas de instância (`Verificação Mensal de Carteiras*`,
`Verificação de carteiras/`), nem PDF, DOCX, XLSX, ZIP com dado real.

Overlays LGPD negados no `.gitignore`: `platform-data-real.js`, `platform-data-audit.js`,
`platform-historico.js`, `platform-brand.js`, e as versões sem sufixo de radar, crédito,
oportunidades, vencimentos, caixa parado, receita drop e cadastro. Os `-demo` são o fallback
sintético e esses são versionados.

Nome de carteira, apelido, código real e caminho de pasta de cliente não entram em teste, doc
versionada, mensagem de commit nem config. Se algo suspeito aparecer em `git status`, pare e
conserte o `.gitignore` antes de seguir. O `.gitignore` aqui é deny-by-default e já engoliu
arquivo necessário duas vezes, sempre confira `git status` antes de commitar.

### Nada é declarado pronto sem o portão

```
npm test
```

Cole a saída real na resposta. Se falhar ou não puder rodar, diga isso explicitamente. Proibido
escrever "funcionando" sem saída colada. A contagem de referência está em
`ESTADO/ESTADO-ATUAL.md`, e ela muda, não confie em número de memória.

### Teste e doc não substituem abrir o código

A documentação de produto deste projeto atrasa em relação ao código. Quando a pergunta for "o
que falta" ou "isso já existe", abra o código. A lista de rot confirmado está em `ESTADO/MAPA.md`.

### Não reintroduzir senha no cliente

A senha fixa que existia no navegador foi removida porque sinalizava proteção sem proteger.
`tests/validate.js` falha se ela voltar. O app não autentica ninguém, por desenho. O perímetro é
do deploy, Cloudflare Access na frente, com o Worker validando o JWT por conta própria antes de
responder com dado.

### Encoding

UTF-8 sem BOM, sempre. Verificar ausência de mojibake depois de reescrever arquivo.

## Antes de finalizar uma mudança

1. `git status` conferido, working tree limpo exceto pelas mudanças intencionais
2. `npm test` rodado com a saída colada
3. Mudança não trivial revisada pelo subagente `code-reviewer`, sem substituir por releitura
   própria
4. Se mexeu no sistema, atualizar `ESTADO/ESTADO-ATUAL.md` no mesmo trabalho, não depois

## Inteligência competitiva, pasta `SyncIA/`

Guarda o dossiê do concorrente SyncIA Desk (synciadesk.com.br, white-label para escritórios
BTG). Não é parte do produto, não entra em build, teste nem deploy, e está fora do git até
decisão explícita de commit.
