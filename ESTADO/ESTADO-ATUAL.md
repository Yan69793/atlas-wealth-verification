# ESTADO ATUAL do ATLAS

**Data-base: 2026-08-17.** Colhido rodando os comandos, não de memória.

Fonte única do estado do projeto. Se outro arquivo divergir deste, este ganha. Se você chegou
sem contexto, leia [[LEIA-PRIMEIRO]] primeiro. Para achar coisa, [[MAPA]].

Se hoje passou de trinta dias desta data, ou se houve trabalho no meio que não foi registrado
aqui, trate este arquivo como suspeito e rode o refresh do fim da página.

## Portão de verificação, medido hoje

```
460/460 checks OK — todos os checks passaram
ℹ tests 131   ℹ suites 35   ℹ pass 130   ℹ fail 0   ℹ skipped 1
```

Contagem subiu de 352/101 (início do dia) com as correções das Ondas 1 a 5, cada uma trazendo
o teste que pegaria o próprio defeito. Ver a seção das cinco fases, abaixo.

O único pulado é o de parity, que só roda com `ATLAS_FIXTURES` e `ATLAS_BOOKS` apontando
para dado de instância. Pular é o comportamento correto no repo do produto.

## Cadeia de gitlink, com deriva aberta

| Camada | Branch | HEAD | Registra o filho em |
|---|---|---|---|
| Produto | `feat/separacao-cloudflare` | `0848b56` (15/ago) | instância em `95d159c` |
| Instância | `fix/workers-dev-off` | `468af8d` (15/ago) | core em `d33ee42` |
| Core | `fix/paths-bom-pos-mudanca` | `e693239` (15/ago) | folha |

Deriva não publicada em dois níveis, confirmada hoje:

1. O produto aponta a instância em `95d159c`, mas a instância está em `468af8d`. Aparece
   como `M verificacao-carteiras` em `git status`.
2. A instância aponta o core em `d33ee42`, mas o core está em `e693239`.

Os commits soltos nas duas pontas são as trocas de travessão por vírgula para PowerShell
5.1. Estão commitados localmente, mas os pais ainda não apontam para eles. Fechar a cadeia
exige avançar de baixo para cima, core primeiro.

Os hashes que o `CLAUDE.md` do projeto registra (`c0ad7b4` para a instância, `810f0d9` para
o produto, `d33ee42` para o core) descrevem o estado de 15 de agosto e já não batem com o
disco. `d33ee42` é o único que ainda tem função, é o que a instância aponta.

`git submodule status` não funciona aqui. São gitlink sem entrada em `.gitmodules`, o
comando aborta com "no submodule mapping found". Para ler o ponteiro use
`git ls-tree HEAD <caminho>`.

## Decisões do dono, tomadas em 17/ago

1. **Isolamento entre clientes: uma instância por cliente.** Decidido. Repete o modelo que já
   funciona, separação física, custo de engenharia perto de zero agora. Paga depois em trabalho
   operacional por cliente, e o palpite registrado é que aperta perto de dez clientes. A
   evolução natural, quando apertar, é separação no perímetro Cloudflare. Opções e custo em
   `docs/superpowers/plans/2026-08-17-caminho-multi-cliente.md`.

   Consequência que vale registrar: isso **fecha o servidor Node como candidato a
   multi-cliente**. Ele só era caminho na opção descartada.

2. **A segunda cópia de dado real de cliente vai ser movida** para a área de instância, não
   apagada. Decidido. Ainda **não executado**, ver a seção de LGPD abaixo.

3. **Teto de `diasParado` no caixa parado: aberto, apareceu na Onda 5.** A leitura da série de
   snapshots foi limitada ao que pode mudar o resultado, mas o corte é conservador porque a
   sequência de "parado" não é truncada pela janela de 90 dias. Consequência: num root com
   ingestão diária sem buraco nenhum, o corte não corta. Para sempre limitar a leitura à
   janela seria preciso decidir que "parado há 90 dias ou mais" basta, o que muda um número
   que a tela mostra hoje. Custo de continuar como está é leitura maior em root muito antigo,
   não número errado. Aguardando o dono.

4. **Servidor morto: aberto.** O dono perguntou se dá para fazê-lo rodar com dado fictício.
   Resposta: tecnicamente sim, pouco trabalho, corrigir o casamento da rota e apontar para os
   fixtures sintéticos. Recomendação registrada é **não fazer**, porque a decisão 1 fechou o
   caminho em que ele serviria, porque rodar não fecha nenhum dos sete buracos nem cria rota de
   leitura ou isolamento, e porque o app já tem modo de demonstração com dado sintético que
   mostra mais do que ele mostraria. Um servidor que liga e responde parece pronto muito mais
   do que um que nem sobe, o que agrava o risco que motivou a pergunta. Aguardando o dono.

## Segunda cópia de dado real de cliente no disco (LGPD)

Encontrada em 17 de agosto, de passagem. `.archive/Verificacao-carteiras-legacy/` guarda um
`data.js` de cerca de meio megabyte com resultado de auditoria real de julho, incluindo
código de carteira e valor de patrimônio.

Não há exposição no repositório, conferido: `.gitignore` cobre `.archive/` e nada ali está
versionado. O problema é outro, é uma segunda cópia de dado real de cliente parada num
diretório fácil de esquecer, fora da área de instância onde dado real deveria viver.

Pendente de decisão do dono, apagar ou mover para a área de instância. Não tocar sem
autorização explícita, é dado de cliente e a remoção não tem volta.

A mesma pasta guarda uma terceira cópia da casca de app anterior à migração Vite, com o
mesmo `fetch` sem autorização das outras duas. Nenhuma delas entra no bundle.

## Trabalho não commitado no produto

`git status` hoje mostra, além da deriva do gitlink, material não versionado que não é do
produto: `.obsidian/`, `00-JARVIS-HOME.md`, `CANAL-CODE.md`, `SyncIA/`,
`diagnosticos/DIAGNOSTICO-2026-08-15-dado-sintetico.md`, `scripts/screenshot-jarvis.py`.
`SyncIA/` é dossiê de concorrente e está fora do git por decisão. O resto não foi triado.

Esta pasta `ESTADO/` foi criada em 17 de agosto e ainda não foi commitada.

## O backend em `audit-engine/src/server.ts` é código morto

Levantado a fundo em 17 de agosto. Existe `server.ts`, `auth/jwt.ts`, `auth/middleware.ts`
com papéis, `middleware/rate-limiter.ts`, `validation/schemas.ts`, `workers/` e
`scheduler/`. Compila limpo (`npx tsc --noEmit`, exit 0) e entra no build. Nada disso roda.

O que o levantamento estabeleceu, e vale contra a leitura otimista de que "já está pronto":

- **Quatro rotas apenas**, health, login, refresh e ingest. **Nenhuma rota de leitura.**
  Não existe GET de carteira, de dashboard nem de auditoria. Logo, não é a API autenticada
  que `docs/produto.md` descreve como caminho desenhado. Nesse ponto o documento está
  certo, não desatualizado.
- **A rota de ingestão é inalcançável na forma que ela mesma anuncia.** O casamento é
  `req.url === '/api/ingest'` e no Node `req.url` carrega a query string, então
  `POST /api/ingest?mes=2026-04` cai no 404. Sem query, o mês cai num default fixo de
  2026-04. Contradição interna, nunca exercitada.
- **Nunca completou uma ingestão.** Não existe `data.json`, `data.js`, `audits/` nem
  `audit-schedules.json` dentro de `audit-engine/`. Prova material.
- **Usuário único vindo de variável de ambiente**, `ADMIN_EMAIL` e `ADMIN_PASSWORD_HASH`,
  com `TODO: Replace with actual user lookup from database` no código. Sem cadastro, sem
  banco. Dos três papéis declarados (`admin`, `auditor`, `viewer`) só `admin` chega a ser
  emitido.
- **Isolamento entre clientes não existe em nenhuma camada.** O token carrega apenas
  usuário, e-mail e papel. O modelo de dados não tem campo de dono. Os caminhos de escrita
  são globais e fixos, dois escritórios ingerindo sobrescrevem o mesmo arquivo. Categórico.
- **Nada chama esse backend.** O app React não faz rede, e `tests/validate.js` proíbe
  ativamente rede em sete páginas. O único `fetch` para ele está em `deploy_cf/app.jsx`,
  casca anterior à migração Vite, sem header de autorização, duplamente quebrada. As telas
  `platform-usuarios.jsx` e `platform-cadastro.jsx` são maquete em localStorage, com papéis
  que nem correspondem aos do backend, e a segunda não é cadastro de usuário, é pendência
  cadastral de compliance de carteira.
- **Cobertura de teste zero.** Nenhum dos 17 arquivos de teste do motor menciona server,
  auth, jwt, token, login, papel ou limite de taxa. O portão compila esse código e nunca o
  executa.
- `scheduler/audit-scheduler.ts` é código morto completo, ninguém o importa.

Buracos confirmados nesse código morto, relevantes se alguém decidir ligá-lo:

1. **Travessia de diretório com escrita arbitrária.** O nome de arquivo do upload multipart
   entra no caminho de gravação sem validação. Quem tiver token sobe um nome com `../` e
   sobrescreve o arquivo de dados que o app serve, injetando script na página.
2. **Upload sem limite de tamanho.** O corpo é acumulado inteiro em memória e duplicado na
   conversão. O schema com teto de 50MB e checagem de tipo existe e nunca é importado.
3. **Pool de worker correlaciona resultado com requisição errada.** Com dois uploads
   concorrentes, a resposta de um pedido cai no outro. Em cenário de dois escritórios isso
   é vazamento cruzado de dado de carteira, não bug de fila.
4. **Refresh sem revogação e sem limite de taxa.** Token de renovação vazado vale 7 dias e
   troca-se indefinidamente. Sem logout, sem lista de bloqueio. Trocar a senha do admin não
   invalida token nenhum.
5. **Erro interno devolvido cru no corpo da resposta**, tipicamente com caminho absoluto de
   arquivo, que inclui pasta de cliente.
6. **Oráculo de tempo no login.** E-mail errado responde em microssegundos, e-mail certo
   com senha errada paga o custo do bcrypt. Dá para descobrir o e-mail do admin.
7. **Escuta em todas as interfaces sem TLS**, e limite de taxa por IP de socket ignorando
   `X-Forwarded-For`, que atrás de proxy tranca todos juntos.

Correção de premissa registrada: a suspeita inicial era que o `Access-Control-Allow-Origin: *`
expunha dado de carteira. **Não expõe.** Nenhuma rota serve dado, a resposta do ingest traz
só contagem agregada. O `*` continua errado, torna a resposta de login legível por qualquer
site, mas não é exposição de carteira. Vale como lição de método, achado por leitura parcial
merece confirmação antes de virar alarme.

O que presta e é reaproveitável: bcrypt com custo 12, comparação de senha em tempo
constante, fail-closed no boot se faltar segredo, expiração de 15 minutos, schemas de
validação e a estrutura de papéis. Primitivas boas, servidor ruim.

**Ação barata e recomendada, pendente de decisão:** esse código é passivo justamente porque
parece terminado. Marcar explicitamente como protótipo não funcional, ou remover, antes que
alguém o ligue acreditando que está pronto.

## As cinco fases de inteligência de agosto

Construídas em 14 e 15 de agosto de 2026 em reação ao estudo do concorrente SyncIA Desk.
Recorte novo, não funcionalidade assentada. As quatro de cima alimentam a mesma fila de
oportunidade da Fase 2, de propósito: um fato não fica preso na tela dele, vira ação com dono
e prazo.

| Fase | Entrega |
|---|---|
| 1, snapshot | retrato do dia, diff contra o anterior, eventos tipados |
| 2, oportunidades | evento vira oportunidade com assessor, motivo, volume, prioridade, prazo, status |
| 3, vencimentos | vencimento futuro em janelas de 7 a 90 dias, com peso na carteira |
| 4, caixa parado | quanto está parado, há quantos dias, acumulado em 90 dias |
| 5, queda de receita | aba em Receitas, sinaliza queda relevante de receita mensal por carteira |

Threshold centralizado e versionado em `audit-engine/src/snapshot/thresholds.ts`, nunca
decisão pontual de tela. Calibração percentual confirmada pelo dono em agosto: posição nova
ou encerrada a 3% do PL, liquidez parada a 10% do PL com mínimo de 7 dias, janela de 90 dias.

A Fase 4 é deliberadamente só descritiva. A decisão sobre o caixa é do assessor, a tela
mostra fato, não julgamento. Manter assim.

### Correção em ondas, em andamento desde 17 de agosto

Onda 0 (documentação) e Onda 1 (dado sintético disfarçado de real + achados baratos)
concluídas e commitadas. **Onda 2 concluída**, quatro correções de número dentro do motor:

- **Volume de vencimento.** Usava a variação do dia (accrual), agora usa o valor do título
  para `MATURITY_APPROACHING`. Um CDB de R$ 500.000 que rendia R$ 137 no dia da janela saía
  como volume R$ 137 e score 2, agora sai como R$ 500.137 e score 8.
- **Severidade da queda de receita.** A materialidade era medida contra o PL, o que tornava
  qualquer queda "baixa" (perda de 99,9% da receita dava materialidade 0,0004). Agora é medida
  contra a receita anterior. Achado curioso, o **dado de demonstração já estava certo**, era só
  o motor que não conseguia produzir o que o demo já mostrava. Corrigido e travado num check
  que compara os dois lados.
- **Limiar de posição nova.** Media contra o PL de ontem, contra o que o próprio arquivo de
  limiares promete ("do plTotal da carteira"). Reproduzido, aporte de R$ 2 mi numa carteira de
  R$ 1 mi com R$ 40 mil num fundo novo, o fundo saía como evento de 4% "que redefine a
  carteira" e hoje é 1,33% do PL atual, sem evento. Posição encerrada continua medida contra o
  PL base de propósito, ela não existe mais hoje.
- **Continuidade do caixa parado.** A contagem andava para trás na série sem checar se havia
  snapshot no meio. Dois arquivos a 16 dias de distância viravam "17 dias parado" com chip
  vermelho. Agora um buraco maior que o intervalo normal entre ingestões (fim de semana e
  feriado incluídos, teto de 4 dias) interrompe a sequência, e R$-dias não multiplica mais pelo
  tamanho do buraco.

**Onda 3 concluída**, contrato de ordenação da fila. A tela ordenava por prioridade primeiro,
com peso local próprio, e invertia a regra aprovada. O score do motor (prioridade × volume ×
prazo) era código morto fora do teste. Decisão do plano: o score do motor ganha. A tela passou
a consumi-lo e mostra a coluna Score, com a conta no title. Caso reproduzido, hoje 13/ago:
quatro oportunidades com scores 48, 24, 16 e 6; o motor entrega `b, d, a, c` e a tela entregava
`b, d, c, a`, ou seja, uma P1 de R$ 10 mil sem prazo (score 6) na frente de uma P3 de R$ 1
milhão vencendo em 7 dias (score 16).

**Onda 4 concluída**, quatro correções de integridade da fila:

- **Um fato, uma linha.** O id inclui o tipo do evento, então um saque único entrava como
  saque, queda de caixa, posição encerrada, concentração e queda de receita. Agora existe
  `PRECEDENCIA_CAUSA_RAIZ`: dentro da mesma carteira e período, os eventos dessa família
  descrevem um fato só, sobra o de maior poder explicativo e os outros viram `consequencias`
  dele, citadas no motivo. Vencimento fica de fora de propósito. Saque de R$ 950 mil na BETA:
  4 linhas e "Volume na fila" de R$ 3.850.000 viraram 1 linha e R$ 950.000. No mensal, com a
  queda de receita junto, eram 3 linhas somando R$ 1.903.800, que misturava R$ 3.800 de receita
  mensal com R$ 950.000 de patrimônio. O campo `volumeEspecie` separa as duas unidades e a
  receita saiu da mesma célula.
- **Botão de criar oportunidade.** Montava id fora da convenção e procurava status só na base
  estática. O link passa a levar o id canônico do motor, e `idle-cash.ts` grava
  `oportunidadeId` em cada item, como `maturities.ts` já fazia. Dois cliques no mesmo
  vencimento davam 2 linhas e nenhum chip; agora dão 1 linha e o chip aparece. Caixa parado
  ganhou o chip que nunca teve.
- **Link de vencimento em fim de semana.** O id usava a data teórica do cruzamento da janela.
  Caindo em dia sem arquivo do custodiante, o evento nasce no próximo dia útil e o id não
  batia. LCI vencendo 21/set com janela 30 e cruzamento no sábado 22/ago: a fila tem
  `2026-08-24`, a tela procurava `2026-08-22`, agora procura `2026-08-24`.
- **Reconciliação do armazenamento local.** A mesclagem trocava a linha inteira pela versão
  salva. Agora fato vem da base e acompanhamento do assessor sobrevive: volume corrigido de
  R$ 137 para R$ 500.137 chega na tela sem perder o status Contatar. Evento removido numa
  reingestão vira órfã marcada, fora da fila e dos indicadores, em vez de somar R$ 120.000
  apontando para evento que não existe.

**Onda 5 concluída**, os quatro não bloqueantes mais um resto da Onda 1:

- **CSV com quebra de linha.** O export não escapava nada. Motivo com quebra de linha partia o
  registro em dois: 3 linhas viravam 4 registros e o volume caía na coluna do motivo. Agora é
  RFC 4180, com aspas e CRLF.
- **Dia exato do vencimento.** `janelaPara` juntava dias 0 com vencido, então o título sumia da
  tela justamente no dia da decisão de reinvestimento. Agora fica, marcado "vence hoje", com o
  mesmo id de oportunidade que tinha desde D-7.
- **Endereço malformado.** `decodeURIComponent` sem proteção derrubava a aplicação em tela
  branca com `%`, `%zz` ou `%E0%A4%A`. Agora o pedaço malformado fica como veio.
- **Leitura da série de snapshots.** O corte da janela passou a sair do nome do diretório, sem
  abrir arquivo. Num root com 240 dias, 4 mensais e um mês sem ingestão, caiu de 244 arquivos
  lidos por execução para 43, com resultado idêntico. **Limite honesto:** com série diária sem
  buraco nenhum o corte não corta, porque a sequência de "parado" não é truncada pela janela e
  "parado há 400 dias" é afirmação que a série inteira sustenta. Truncar em 90 dias mudaria
  `diasParado`, e isso é decisão do dono, não de código. Ver a pendência aberta abaixo.
- **Resto da Onda 1.** O CSV de oportunidades ainda exportava o código interno do gestor
  enquanto a tela já mostrava o nome.

Cada correção tem teste que reproduz o cenário exato da revisão, e o portão foi rodado antes e
depois de cada onda. Um commit isolado por onda.

### Revisão independente, 17 de agosto: estado na abertura da correção

Doze defeitos bloqueantes e seis não bloqueantes, todos passando por baixo da suíte, que está
verde. Esse é o fato mais importante desta seção: **teste verde neste projeto não prova número
certo**, porque a suíte valida existência de arquivo e casamento de string, não comportamento.
Nenhum dos doze é pego por ela.

O pior, e é de credibilidade de produto: **a instância do cliente mostra carteira fictícia como
se fosse dele, sem faixa de aviso.** Os quatro fallbacks de demonstração só checam ausência do
overlay, não o modo de dados, e o produtor do overlay das Fases 2, 3 e 4 nunca foi construído,
não existe comando `oportunidades` no CLI de snapshot. Então na instância o fallback sempre
dispara, e as telas mostram carteira inventada ao lado das páginas de dado real.

Os doze bloqueantes, resumidos. **Corrigido** marca o que já fechou nas ondas em andamento,
com o detalhe na seção "Correção em ondas" acima.

1. ~~Dado fictício exibido como real na instância, sem aviso.~~ **Corrigido, Onda 1.**
2. ~~Volume de vencimento usa a variação do dia, não o valor do título.~~ **Corrigido, Onda 2.**
3. ~~A ordem da fila na tela não é o score do motor, e inverte a regra aprovada.~~
   **Corrigido, Onda 3** — o score do motor ganhou e virou coluna na tela.
4. ~~Um mesmo fato entra até cinco vezes na fila, porque o identificador inclui o tipo de
   evento.~~ **Corrigido, Onda 4** — supressão por causa raiz, e a receita mensal saiu da mesma
   célula do patrimônio no indicador de volume.
5. ~~Severidade da queda de receita é estruturalmente sempre "baixa".~~ **Corrigido, Onda 2** —
   o dado de demonstração já estava certo, era o motor que não conseguia produzir o que o demo
   mostrava.
6. ~~Coluna Assessor mostra o código interno em vez do nome.~~ **Corrigido, Onda 1.**
7. ~~Os três indicadores da aba Queda de receita ignoram o filtro de assessor.~~ **Corrigido,
   Onda 1.**
8. ~~Botão de criar oportunidade gera duplicata sem limite e nunca vira chip de status.~~
   **Corrigido, Onda 4.**
9. ~~Link de vencimento para oportunidade quebra quando o cruzamento da janela cai em fim de
   semana ou feriado.~~ **Corrigido, Onda 4.**
10. ~~Armazenamento local congela as linhas da base.~~ **Corrigido, Onda 4** — reconciliação com
    marcação de órfã.
11. ~~Limiar de posição nova e encerrada é medido contra o patrimônio de ontem.~~ **Corrigido,
    Onda 2** — posição encerrada continua contra o PL base de propósito, ela não existe mais
    hoje.
12. ~~Caixa parado afirma dias de continuidade sem checar se houve snapshot no meio.~~
    **Corrigido, Onda 2.**

Os doze bloqueantes estão fechados. Os seis não bloqueantes também: ordem invertida no demo de
caixa parado e "R$ × dias" como moeda na Onda 1, e os outros quatro na Onda 5.

O que a revisão verificou e está limpo: LGPD sem vazamento nas cinco fases, contrato de build
intacto (nenhum overlay importado como módulo, ordem de `src/main.jsx` respeitada), nenhuma
regressão de senha fixa, e o ciclo de status da Fase 2 correto e sem transição inválida
alcançável pela interface.

Plano de correção em cinco ondas, ordem e portão definidos pelo dono, em
`C:\Users\User\.claude\plans\cosmic-skipping-anchor.md`. Portão por onda: sem regressão com
saída colada, caso concreto reproduzido mostrando número antes e depois, e um commit isolado.

## Pendências, ordenadas por prioridade acordada com o dono em 17/ago

1. **Distância entre protótipo e produto vendável.** Hoje quem opera o motor é o próprio
   time. Falta gestão de usuário por cliente e a entrada de dado depende de alguém colocar
   arquivo no lugar certo à mão. O backend existente não encurta esse caminho, ver a seção
   acima, ele é esqueleto sem rota de leitura e sem noção de cliente. A decisão que trava
   tudo é de arquitetura e é do dono. Enquanto ela não sai, construir aqui é aposta.
2. ~~**Corrigir as cinco fases de agosto.**~~ **Fechada em 17/ago.** Os doze defeitos
   bloqueantes e os seis não bloqueantes foram corrigidos nas Ondas 0 a 5, cada um com o teste
   que pegaria o defeito de volta. Sobrou uma decisão do dono, o teto de `diasParado`, na
   seção de decisões acima. Ver a seção das fases.
3. **Integração oficial com a B3.** O time chama de "pagar a dívida da ingestão manual",
   catalogada como 6 a 18 meses. O que existe hoje é adaptador para arquivo de posição
   diária no espírito do layout B3 802, ainda arquivo colocado à mão, não feed autenticado.
   Fica depois de 1 e 2 porque o escopo é feed de várias carteiras de vários clientes, não
   de um CPF.
4. **Quantidade e preço unitário por posição.** O parser extrai valor financeiro por ativo,
   sem quantidade de cota nem preço. Relatório de performance por posição depende disso.
   Encaixa junto de 2, não merece prioridade própria.

Fora da fila por decisão do dono:

- **Separação de conta Cloudflare.** Suspensa, sem data. Não tratar como pendência ativa.
  Inventário em `docs/separacao-cloudflare.md`.
- **Camada de educação, comunidade pública, gamificação.** Excluída por identidade de
  produto, decidido em 17 de agosto após analisar a P3X, plataforma B2C do Charles
  Mendlowicz. O que se aproveitou dessa análise foi confirmação de que conexão automática
  com a B3 e mostrar a tese por trás do número são coisas que o mercado valoriza.
- **Benchmark contra CDI, IBOV, IPCA.** Exige fonte externa que não existe no projeto.

## Perímetro e deploy

Fechado em 15 de agosto de 2026, versão `4f0caf1f`, `workers_dev = false`. A URL técnica
da instância saiu do ar (404) e o domínio próprio segue servido pelo Cloudflare Access,
302 sem JWT. O teste do diretor passa a ser pelo domínio próprio.

Chave Cloudflare que ficou exposta em 10 de agosto foi revogada pelo dono em 15 de agosto
(id `6a8d3ce39ed73eb9d71088e35b1a9187`, final `c17`). Cópias textuais do valor foram
sanitizadas e verificadas, zero ocorrência restante no workspace e nas memórias.

## Dado real e origem

O primeiro arquivo real do custodiante ainda não chegou. A estreia do acompanhamento diário
foi provada com série sintética de cinco dias, com eventos idênticos aos desenhados. Quando
o arquivo real chegar, entra como dado de instância normal, sem pendência de produto.

Fixtures sintéticos são 100% regeneráveis e versionados, custodiante fictício, carteiras
ALFA, BETA e GAMA. `npm run seed:demo` roda o pipeline inteiro sem tocar na instância.

## Como atualizar este arquivo

### Gatilhos obrigatórios

Atualize no mesmo trabalho, não depois, quando qualquer um acontecer:

1. Fase nova entra ou fase existente muda de escopo.
2. Pendência fecha, ou pendência nova aparece.
3. Contagem de teste muda.
4. Gitlink de qualquer um dos três repositórios avança.
5. Perímetro, autenticação ou forma de entrada de dado muda.
6. Threshold é recalibrado pelo dono.
7. Uma das decisões pendentes é resolvida.
8. Descobre-se rot novo em documento. Nesse caso registre também em [[MAPA]].

### Comandos que colhem o estado

Não escreva estado de cabeça:

```powershell
npm test
git log -1 --date=short --format="%h %cd %s"
git ls-tree HEAD verificacao-carteiras
git status --short
```

### Regra de honestidade

Não apague afirmação errada em silêncio. Se este arquivo afirmava algo que se provou falso,
registre no log abaixo com o motivo do erro. O padrão de erro é informação sobre o projeto,
e é o que impede a próxima pessoa de repetir.

## Log de mudança

- **2026-08-17.** Criado como `ESTADO.md` dentro da skill `atlas-sistema`. Portão medido em
  352 checks e 101 testes. Registrada deriva de gitlink em dois níveis e hashes vencidos no
  `CLAUDE.md`. Prioridades reordenadas com o dono.
- **2026-08-17, correção.** A primeira versão afirmou que existia backend com autenticação
  construído e que isso contrariava `docs/produto.md`. Errado nas duas pontas. O código
  existe e compila, mas é esqueleto que nunca rodou, sem rota de leitura e sem isolamento
  entre clientes, então a afirmação do documento de produto está correta. Também caiu o
  alarme de que o CORS aberto expunha dado de carteira, nenhuma rota serve dado. Ambos os
  erros vieram de concluir por leitura parcial de estrutura de diretório, antes de confirmar
  comportamento.
- **2026-08-17, mudança de lugar.** Movido para `ESTADO/ESTADO-ATUAL.md`, na raiz do
  projeto, a pedido do dono, para que qualquer agente ache sem depender de invocar skill. A
  skill `atlas-sistema` passa a apontar para cá em vez de guardar cópia.
- **2026-08-17, Onda 0.** Removido o `ESTADO.md` duplicado da pasta da skill. Adicionado
  ponteiro para `ESTADO/LEIA-PRIMEIRO.md` no topo do `CLAUDE.md` do projeto, com aviso de que
  este arquivo ganha em caso de divergência. Registradas as duas decisões do dono e o resultado
  da revisão das cinco fases, que reprovou com doze defeitos bloqueantes.
- **2026-08-17, Onda 1.** Fechados os achados 1, 6 e 7, mais os dois não bloqueantes de Caixa
  parado (ordem e formatação). 352 → 382 checks.
- **2026-08-17, Onda 2.** Fechados os achados 2, 5, 11 e 12, todos dentro do motor
  (`audit-engine/src`). 382 → 387 checks, 101 → 107 testes. Achado 5 revelou que o dado de
  demonstração já estava correto antes da correção, só o motor não conseguia produzir o que o
  demo mostrava, o que virou um check novo comparando os dois lados.
- **2026-08-17, Onda 3.** Fechado o achado 3. A tela de oportunidades passou a consumir o score
  do motor em vez de reordenar por conta própria. 387 → 400 checks, 107 testes.
- **2026-08-17, Onda 4.** Fechados os achados 4, 8, 9 e 10. 400 → 436 checks, 107 → 120 testes.
  A leitura, a mesclagem e a gravação da fila saíram das três telas e viraram uma coisa só em
  `AtlasUtils`: três leituras diferentes da mesma fila foi o que deixou o botão de criar
  oportunidade nunca virar chip.
- **2026-08-17, Onda 5.** Fechados os quatro não bloqueantes restantes, mais um resto da Onda 1
  no CSV de oportunidades. 436 → 460 checks, 120 → 131 testes. Registrada pendência nova de
  decisão do dono, o teto de `diasParado`. O plano de cinco ondas está cumprido.
- **2026-08-17, correção de premissa.** A revisão afirmou que "só a janela de 90 dias importa"
  na leitura da série do caixa parado. Não é verdade: `diasParado`, `pico`, `rsDiasSequencia` e
  `inicioSequencia` saem da caminhada sobre a série completa, que a janela não trunca. Cortar
  em 90 dias teria mudado número, então o corte implementado é conservador e a decisão de
  encurtar ficou registrada como pendência do dono, em vez de ser tomada em silêncio dentro de
  uma tarefa de eficiência.
