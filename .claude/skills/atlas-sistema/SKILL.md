---
name: atlas-sistema
description: >
  Orientação de sistema do ATLAS (produto de verificação de carteiras vendido para escritórios
  de gestão de patrimônio). Use ao ABRIR qualquer sessão de trabalho no ATLAS, antes de mexer
  em código, e sempre que a pergunta for sobre o sistema como um todo: o que o produto é e para
  quem, onde termina o produto e começa o dado do cliente, quais repositórios viajam juntos,
  o que já está construído contra o que ainda falta, qual o portão de verificação, por que uma
  tela quebrou depois de mudar import, ou qual a próxima prioridade. Acionar também em
  "estado do ATLAS", "o que falta no ATLAS", "onde fica X no ATLAS", "posso commitar isso",
  "isso vaza dado de cliente". NÃO usar para ingerir um mês nem debugar parser (use
  atlas-audit-engine) nem para conferir uma carteira à mão (use verificacao-carteiras-v2).
---

# ATLAS, orientação de sistema

## Onde a verdade mora

Este arquivo cobre identidade de produto e as regras que quebram coisa. Tudo o que muda com o
tempo vive na pasta `ESTADO/` na raiz do projeto, que é a fonte única:

| Arquivo | Conteúdo |
|---|---|
| `ESTADO/LEIA-PRIMEIRO.md` | orientação para quem chega sem contexto |
| `ESTADO/ESTADO-ATUAL.md` | **fonte única do estado.** Pendência, prioridade, decisão em aberto, número de teste, deriva de gitlink, o que é código morto |
| `ESTADO/MAPA.md` | onde encontrar cada coisa, comandos, vocabulário, documentação com rot confirmado |

Regra do projeto, um assunto, um arquivo, zero cópia. Este arquivo não repete estado, aponta.
Se algo aqui divergir de `ESTADO/ESTADO-ATUAL.md`, o de lá ganha.

Exceção deliberada: as regras da seção seguinte aparecem também em `ESTADO/LEIA-PRIMEIRO.md`.
São trilho de segurança, e ponteiro que o agente pode não seguir é pior que duplicata.

## As três regras que quebram coisa de verdade

### 1. Fronteira entre produto e dado de cliente (LGPD)

Este repositório é o produto. Dado de cliente vive na instância, fora do git do produto.

Nunca versionar: pasta de instância (`Verificação Mensal de Carteiras*`), PDF, DOCX, XLSX,
ZIP com dado real. Os overlays `platform-data-real.js`, `platform-data-audit.js` e
`platform-historico.js` estão no `.gitignore` e é lá que ficam.

Nome de carteira, apelido, código real e caminho de pasta de cliente não entram em teste,
em documentação versionada, em mensagem de commit nem em resposta colada em ticket
externo. Mensagem de erro do motor cita nome de carteira e ativo no stderr por desenho,
então essa saída não sai da máquina.

Se algo suspeito aparecer em `git status`, pare e conserte o `.gitignore` antes de seguir.

### 2. Contrato de inicialização do build

O app é buildado com Vite. `npm run build` gera `dist-app/` a partir de `src/main.jsx`.

A ordem de import em `src/main.jsx` É o contrato: tokens, parsers, dados, utils, páginas,
shell. Fora de ordem o app abre em tela branca. `tests/validate.js` trava essa ordem, e é
por isso que ele existe.

Overlay de dado real é script clássico em runtime e nunca entra no bundle. O build os
retira do HTML. Quem reinjeta: em produção o Worker da instância, localmente o
`scripts/gen-index.mjs` da instância. Importar overlay como módulo quebra esse contrato,
e `scripts/verify-build.mjs` recusa publicação se overlay, binário ou marca de build de
desenvolvimento aparecer em `dist-app/`.

### 3. Portão de verificação

```
npm test
```

Roda `tests/validate.js` mais a suíte do audit-engine. Nada é declarado pronto sem a saída
real colada na resposta. Se falhar ou não puder rodar, dizer explicitamente. Proibido
declarar "funcionando" sem saída colada. Contagem de referência em `ESTADO/ESTADO-ATUAL.md`.

Autenticação tem trava própria: a senha fixa que existia no cliente foi removida e
`tests/validate.js` falha se ela voltar. Não reintroduzir gate no cliente, o perímetro é
do deploy.

## O que o produto é

Camada independente de conferência de carteira. Recebe o book mensal do custodiante,
compara com o mês base, aplica sete regras e classifica cada carteira em LIBERAR,
LIBERAR COM ALERTA ou CORRIGIR. A conta que sustenta tudo:

```
PL esperado = PL base + compras − vendas + eventos − impostos
```

A frase de posicionamento que o próprio time cunhou: "Não mostre o patrimônio. Prove o
número." Cada achado carrega o número que o gerou, nunca um rótulo solto. É isso que o
comprador está pagando, e é a coisa mais fácil de destruir sem perceber.

Vendido para escritório de gestão de patrimônio (asset sob CVM 21, consultoria e family
office sob CVM 19, assessoria sob CVM 178). Usuário é gente de retaguarda, CIO, gestor,
compliance, risco, operações, no ritual mensal de fechamento.

## O que o produto não é, de propósito

Não é consolidador de investidor final (Gorila, SmartBrain, Comdinheiro). Não é CRM de
venda. Não é plataforma operacional de escritório (AAWZ Hub). Não é contabilidade de fundo
(Britech). Não tem, e foi decidido não ter, trilha de curso, comunidade pública nem
gamificação.

Essa exclusão não é lacuna, é identidade. Proposta que empurre o ATLAS para qualquer uma
dessas quatro categorias está diluindo o produto, não expandindo. Decisão registrada em
`docs/estrategia-produto-icp.md` e reafirmada pelo dono em agosto de 2026.

## Topologia, três repositórios aninhados

O projeto vive em `E:\Diretorio\Claude\FREQUENTE\ATLAS` desde 14 de agosto de 2026 (antes
em `OCASIONAL\ATLAS`). Não existe caminho absoluto no código, os launch.json usam
`${workspaceFolder}` e os scripts Python derivam a raiz do próprio arquivo.

| Camada | Onde | O que é |
|---|---|---|
| Produto | raiz | `Yan69793/atlas-wealth-verification`, o sistema |
| Instância | `verificacao-carteiras/` | cliente real, fora do git do produto, consome o produto como dependência versionada |
| Corte | `verificacao-carteiras/core/` | outro checkout do mesmo repo do produto, pinado no commit do corte Vite |

Gitlink move em cadeia. Mexer no `core/` obriga a avançar o gitlink da instância, que
obriga a avançar o do produto. Hash corrente e deriva aberta em `ESTADO/ESTADO-ATUAL.md`.

`git submodule status` não funciona aqui, são gitlink sem entrada em `.gitmodules`. Use
`git ls-tree HEAD <caminho>`.

Cuidado operacional de push: a variável `GH_TOKEN` do ambiente sombreia o token do keyring
do `gh`. Antes de qualquer push:

```powershell
$env:GH_TOKEN=$null; $env:GITHUB_TOKEN=$null
```

## Onde procurar cada coisa

Mapa completo em `ESTADO/MAPA.md`, incluindo comandos e vocabulário do projeto. O essencial:

| Preciso de | Vá para |
|---|---|
| Ingerir mês, debugar parser, schema, regra, score, snapshot diário | skill `atlas-audit-engine` |
| Conferir uma carteira à mão, gerar PDF de achados | skill `verificacao-carteiras-v2` |
| Estado, pendência, prioridade, decisão em aberto | `ESTADO/ESTADO-ATUAL.md` |
| As cinco fases de inteligência de agosto de 2026 | `ESTADO/ESTADO-ATUAL.md` |
| Documentação que já se provou desatualizada | `ESTADO/MAPA.md` |

## Leia o código antes de citar o documento

Neste projeto a documentação de produto atrasa em relação ao código, e atrasa exatamente nos
pontos que mais interessam para decidir prioridade. Isso foi medido, não é hipótese. A lista
de rot confirmado está em `ESTADO/MAPA.md`.

Consequência prática: quando a pergunta for "o que falta" ou "isso já existe", abra o código.
Estrutura de diretório não é prova de comportamento, um `auth/` e um `server.ts` no lugar
certo podem ser esqueleto que nunca rodou. Aconteceu, está registrado no log de
`ESTADO/ESTADO-ATUAL.md`.

## Manutenção

Os gatilhos que obrigam a atualizar o estado, os comandos que colhem o estado do disco e a
regra de registrar erro em vez de apagar em silêncio vivem em `ESTADO/ESTADO-ATUAL.md`, na
seção "Como atualizar este arquivo". Não duplicar aqui.
