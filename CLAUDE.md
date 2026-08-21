# CLAUDE.md — ATLAS (hardened 2026-07-25, atualizado 2026-08-19)

## Estado do projeto: comece por `ESTADO/`

Antes de qualquer trabalho, leia `ESTADO/LEIA-PRIMEIRO.md`. A pasta `ESTADO/` na
raiz é a fonte única do estado do projeto, feita para orientar quem chega sem
contexto:

- `ESTADO/LEIA-PRIMEIRO.md` — orientação e as regras que quebram coisa
- `ESTADO/ESTADO-ATUAL.md` — pendência, prioridade, decisão em aberto, número de
  teste, o que é código morto. **Se este arquivo divergir do `CLAUDE.md`, ele ganha.**
- `ESTADO/MAPA.md` — onde achar cada coisa, comandos, e a lista de documentação
  que já se provou desatualizada

Regra: um assunto, um arquivo, zero cópia. Estado não é duplicado aqui, é
apontado. Os hashes de gitlink citados abaixo são de 2026-08-15 e já derivaram,
o valor corrente está em `ESTADO/ESTADO-ATUAL.md`.

## Localização e repos aninhados

O projeto vive em `E:\Diretorio\Claude\FREQUENTE\ATLAS` desde 2026-08-14
(antes `OCASIONAL\ATLAS`). Não existe caminho absoluto no código: os
launch.json usam `${workspaceFolder}` e os scripts Python derivam a raiz do
próprio arquivo. Três repos git viajam juntos na pasta: o ATLAS
(`Yan69793/atlas-wealth-verification`) → `verificacao-carteiras/` (gitlink em
c0ad7b4) → `core/` (gitlink em d33ee42, branch `fix/paths-bom-pos-mudanca`).
`core/` é outro checkout do mesmo repo do ATLAS, pinado no commit do corte
Vite. Instância do cliente em `verificacao-carteiras/`, fora do git do produto.

## Como responder neste projeto (regra fixa, 2026-08-08)

Resposta curta e em português comum. O usuário é o dono do negócio, não o
programador, e respostas longas cheias de termo técnico não são lidas até o fim.
Pedido explícito dele, repetido duas vezes.

- Aplicar a skill `humanizer` em toda resposta final.
- Sem linguagem de programação no texto: nada de nome de arquivo, número de
  linha, nome de função, comando, código de erro ou jargão de infraestrutura.
  Dizer o efeito no negócio, não o mecanismo.
- Resumir. Se não couber em poucos parágrafos, entregar a conclusão e oferecer o
  detalhe, em vez de despejar tudo.
- Conclusão primeiro. O que mudou, o que quebrou, o que falta decidir.
- Tabela só quando compara coisas de verdade. Prosa é o padrão.

Exceção: quando o usuário pedir o detalhe técnico, ou quando for um comando que
ele precisa colar, aí vai literal e sem tradução. Comando, caminho e saída de
teste nunca são alterados nem humanizados.

## Segurança de dados (LGPD)

- Este repositório é o produto. Instância e dado de cliente ficam fora do git.
- Nunca versionar: pastas de instância (`Verificação Mensal de Carteiras*`), PDFs, DOCX, XLSX, ZIPs com dados reais
- `platform-data-real.js`, `platform-data-audit.js`, `platform-historico.js` são LGPD e estão no .gitignore
- Nome de carteira, apelido, código real e caminho de pasta de cliente não entram em teste nem doc versionada
- Se aparecerem em `git status`, investigar e corrigir o `.gitignore` antes de prosseguir

## Inteligência competitiva (pasta `SyncIA/`)

A pasta `SyncIA/` guarda o dossiê do concorrente SyncIA Desk
(synciadesk.com.br, white-label para escritórios BTG): relatório OSINT e
snapshots do site capturados em 2026-08-14. Não é parte do produto, não entra
em build, teste nem deploy. Está fora do git até decisão explícita de commit.
O material da SYNC TECNOLOGIA (syncai.com.br, site de consultoria) ficou
arquivado em `SyncIA/SYNC-TECNOLOGIA/` e foi descartado como alvo pelo dono.
O gap de features em comparação com o ATLAS está na memória do workspace.

## Ordem de carregamento (build Vite)

O app é buildado com Vite: `npm run build` gera `dist-app/` a partir de
`src/main.jsx`. A ordem de import em `src/main.jsx` É o contrato de
inicialização: tokens → parsers → dados → utils → páginas → shell. Fora de
ordem quebra em tela branca. `tests/validate.js` trava esse contrato.

- Overlays de dado real (`platform-data-real.js`, `platform-data-audit.js`,
  `platform-historico.js`, `platform-brand.js`, e os das fases de inteligência
  `platform-oportunidades.js`, `platform-vencimentos.js`, `platform-caixa-parado.js`)
  são scripts clássicos em runtime, NUNCA entram no bundle. O build os retira
  do HTML. Quem reinjeta: em produção, o Worker da instância (no HTML que ele
  serve, apontando para a rota autenticada do R2); localmente, o
  `scripts/gen-index.mjs` da instância.
- Desenvolvimento: `npm run dev` (Vite com HMR). Publicação do demo: primeiro
  `npm run build`, depois `scripts/deploy-cf.ps1 -Target worker`.
- `scripts/verify-build.mjs` e `scripts/build-deploy.mjs` recusam publicação
  se `dist-app/` contiver overlay, binário ou marca de build dev.

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

## Pendências abertas

Nenhuma registrada aqui. Pendências e decisões em aberto do projeto vivem em
`ESTADO/ESTADO-ATUAL.md` (fonte única de estado, precedência declarada acima).

### Resolvidas em 2026-08-14

- **Publicar no GitHub**: repo privado `Yan69793/atlas-wealth-verification` criado;
  branch `feat/vite-migration` publicada até 217d1c4 (hash local = remoto, conferido
  em 2026-08-14). Cuidado operacional: a variável `GH_TOKEN` do ambiente sombreia o
  token do keyring do `gh`. Antes de qualquer push, rodar
  `$env:GH_TOKEN=$null; $env:GITHUB_TOKEN=$null`.

- **pdfplumber ausente**: instalada via pip no interpretador padrão. Era o que fazia
  a parity PDF vs Excel falhar; com ela, as suítes de parity rodam com dado real.
- **Corte da instância para o build Vite**: submodule no commit fecbe17, gen-index e
  build-worker-assets consumindo core/dist-app, CSP do worker no contrato novo,
  injeção de overlays no HTML servido + no-cache. Validado no fluxo diário do dono.

- **Primeira fonte real (dono)**: substituída pelo arquivo modelo da convenção B3
  (autorizado pelo dono em 2026-08-14). Entregues o adaptador de arquivo posicional
  estilo B3 e o mapa de classes da instância; a estreia do acompanhamento diário foi
  provada com a série sintética de 5 dias (eventos idênticos aos desenhados). O
  primeiro arquivo real do custodiante entra como dado de instância normal.

- **Thresholds do snapshot (dono)**: confirmados e calibrados pelo dono em 2026-08-14,
  tudo percentual (posição nova/encerrada 3% do PL, liquidez parada 10% do PL com
  mínimo de 7 dias, janela de 90 dias; os demais limiares seguem a calibração do
  diff). Fase 4 aprovada e publicada no demo com esses valores.

### Resolvidas em 2026-08-15

- **Publicação pendente + cadeia de gitlinks**: autorizado pelo dono. Os 2 commits
  locais foram publicados na `feat/vite-migration` e a cadeia dos 3 repos foi
  fechada: as mesmas 5 correções de caminho/BOM foram commitadas no `core/` na
  branch `fix/paths-bom-pos-mudanca` (d33ee42), o gitlink do
  `verificacao-carteiras/` avançou para c0ad7b4 e o do ATLAS para 810f0d9. Não
  mergear a branch do core na `feat/vite-migration`: os mesmos ajustes já vivem lá
  como 466cb7a. Suíte após tudo: 352/352 checks + 101/101 testes.
- **Credencial do git para GitHub**: `gh auth setup-git` configurado; o git passa a
  usar o keyring do `gh` (conta Yan69793) como credencial no github.com. Antes valia
  só para o repo do ATLAS, agora vale para os três.
- **Chave Cloudflare exposta revogada**: o dono revogou no painel em
  2026-08-15. Registro preservado: id `6a8d3ce39ed73eb9d71088e35b1a9187`,
  final `c17`, exposta em 2026-08-10, revogada em 2026-08-15. Cópias textuais
  do valor sanitizadas e verificadas: zero ocorrências restantes no workspace
  e nas memórias operacionais (claude-mem e logs).
- **Perímetro da instância fechado**: `workers_dev = false` deployado em
  2026-08-15 (versão 4f0caf1f). A URL técnica
  `atlas-instancia.prospects-intel.workers.dev` saiu do ar (404) e
  `atlas.szuchmacher.com.br` segue servido pelo Access (302 sem JWT). O
  teste do diretor passa a ser pelo domínio próprio com Access.

### Resolvidas em 2026-08-19

- **Separação de conta Cloudflare**: suspensa pelo dono em 2026-08-15. A conta
  nova chegou a ser criada e recebeu o demo, que foi removido em seguida; o demo
  segue publicado só na conta antiga (`demo.multi-assets.com`). Plano, inventário
  canônico e checklist de 11 passos seguem em `docs/separacao-cloudflare.md`, e o
  item fica fora da fila em `ESTADO/ESTADO-ATUAL.md`, pronto para reabrir se a
  decisão mudar. As branches `feat/separacao-cloudflare` e `fix/workers-dev-off`
  ficam no GitHub como histórico do plano.
- **CDN do demo**: risco de página em branco morto com o build Vite, CSP do demo
  não referencia unpkg/jsdelivr. A dependência pontual de CDN que resta (sheetjs
  na importação de planilha, analytics) é de produto, não pendência.

### Resolvidas em 2026-08-21

- **Servidor morto, decidido não rodar nem remover**: marcado como protótipo não
  funcional com banner no topo de `audit-engine/src/server.ts`, listando os sete
  buracos e apontando para `ESTADO/ESTADO-ATUAL.md`. Detalhe no ESTADO.
- **Segunda cópia de dado real (LGPD)**: movida de `.archive\Verificacao-carteiras-legacy\`
  para `verificacao-carteiras\.archive\Verificacao-carteiras-legacy\`. Os quatro arquivos
  de dado (`data.js`, `data.json`, `historico.js`, `historico.json`) saíram do repo do
  produto; a casca de código ficou no lugar. `.gitignore` deny-by-default da instância já
  cobria os nomes, nada de dado entrou no git.
- **Push dos três repos**: autorizado pelo dono, executado em 2026-08-21 (produto,
  instância e core).
- **Caminho multi-cliente (decisão 2026-08-21)**: pesquisa de tendências 2025-2026 +
  análise do sistema aprovada pelo dono. Instância por cliente segue para o cliente
  atual e o próximo, rung 2 da escada Cloudflare (um Worker, D1 ou Durable Object por
  cliente) quando o 2º cliente assinar, instância física vira tier premium de venda.
  Executado no motor: `tenantId` no modelo de dados, validação pós-normalização, fila
  de exceção e reconciliação na ingestão. Detalhe no `ESTADO/ESTADO-ATUAL.md`.
