# ESTADO ATUAL do ATLAS

**Data-base: 2026-08-26.** Colhido rodando os comandos, não de memória.

Fonte única do estado do projeto. Se outro arquivo divergir deste, este ganha. Se você chegou
sem contexto, leia [[LEIA-PRIMEIRO]] primeiro. Para achar coisa, [[MAPA]].

Se hoje passou de trinta dias desta data, ou se houve trabalho no meio que não foi registrado
aqui, trate este arquivo como suspeito e rode o refresh do fim da página.

## Portão de verificação, medido hoje

```
719/719 checks OK — todos os checks passaram
ℹ tests 278   ℹ suites 73   ℹ pass 278   ℹ fail 0   ℹ skipped 0
```

Medido em 2026-08-26, depois da Fase 2 inteira. 688 para 699 com Jul/26 como
mês de estabilidade, e 699 para 719 com o modelo de cadastro por custodiante.
Os 20 últimos incluem um teste fim a fim que roda o gerador de verdade contra
o exemplo e confere o overlay linha por linha. Ver as seções "Fase 2" e
"Overlay real de cadastro" mais abaixo.

Antes disso era 688/688, depois do overlay real de cadastro. 659 para 688, os
29 cobrindo as listas de negação do overlay, as regras do gerador e o
comportamento do consolidado com e sem cadastro real.

Antes disso era 659/659, depois da camada de exploração e decisão (ranking
de criticidade, resumo da casa, rastreador de ativos, comparador por
carteira, histórico de verificação). 602 para 659 checks, os 57 novos
travando as regras daquela Entrega. Testes do app continuam 278: as duas
camadas são cobertas pela suíte estática (`tests/validate.js`), não pela
suíte do motor.

Antes da camada de exploração era 602/602, depois das Entregas A, B, B.1,
B.2 e B.3 da camada de inteligência. Antes delas era 469/469 checks e 143
testes. A crescida: A somou 51 checks e 63 testes, B mais 60 checks e 37
testes, B.2 mais 22 checks e 35 testes. B.1 (calibração, sem código) e B.3
(aplicação dos limiares calibrados) não mudam a contagem: reajustam valor
dentro de teste e fixture já existentes.

A contagem de testes desceu de 131 para 129 de propósito: o corte de 90 dias no caixa parado
substituiu cinco testes do contrato antigo por três do contrato novo. Os checks subiram de 460
para 469 no mesmo trabalho. Em 21/08 a suíte do motor subiu de 129 para 143 testes com os 14
novos do caminho multi-cliente (tenantId, fila de exceção, reconciliação).

Contagem subiu de 352/101 (início do dia) com as correções das Ondas 1 a 5, cada uma trazendo
o teste que pegaria o próprio defeito. Ver a seção das cinco fases, abaixo.

**Zero pulados desde 24/08, e a mudança conta uma história.** O teste que ficava pulado era
a parity de PDF contra Excel, que se auto-desliga quando `pdfplumber` não está no Python da
máquina. O pacote havia sumido do ambiente, então o portão vinha relatando "todos os testes
passaram" com um teste a menos, sem avisar. Reinstalado, ele roda e passa. Dependência de
ambiente que some sem quebrar nada é a forma mais barata de perder cobertura de teste.

## Cadeia de gitlink, fechada em 17/ago

| Camada | Branch | HEAD | Registra o filho em |
|---|---|---|---|
| Produto | `feat/separacao-cloudflare` | `f8356fa` (17/ago) | instância em `019ceda` |
| Instância | `fix/workers-dev-off` | `019ceda` (17/ago) | core em `e693239` |
| Core | `fix/paths-bom-pos-mudanca` | `e693239` (15/ago) | folha |

Cada pai aponta o HEAD do filho, conferido em disco. Os três working trees estão limpos, com
a exceção conhecida do material não versionado listado adiante, que é do produto e não é
produto.

A deriva de dois níveis que existia desde 15 de agosto foi fechada de baixo para cima, core
primeiro. Eram dois commits soltos, as trocas de travessão por vírgula para PowerShell 5.1,
que já estavam commitados mas cujos pais ainda não apontavam para eles. Fechar custou dois
commits de ponteiro, sem nenhum arquivo de dado envolvido.

**Publicado em 2026-08-21, decisão do dono.** Os três branches subiram e o hash do remoto
foi conferido igual ao local: produto `97c4c49` (feat/separacao-cloudflare), instância
`019ceda` (fix/workers-dev-off), core `e693239` (fix/paths-bom-pos-mudanca).

Os hashes que o `CLAUDE.md` do projeto registra (`c0ad7b4` para a instância, `810f0d9` para
o produto, `d33ee42` para o core) descrevem o estado de 15 de agosto e não batem mais com o
disco. Agora nenhum dos três tem função, esta tabela é a fonte.

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
   apagada. Decidido. **Executado em 2026-08-21**, ver a seção de LGPD abaixo.

3. **Teto de `diasParado` no caixa parado: decidido, "parado há 90 dias ou mais basta".**
   A janela de 90 dias passou a ser o universo inteiro da medição, inclusive da sequência.
   Implementado no mesmo dia. Quando a sequência preenche a janela o item vem com
   `sequenciaTruncada` e a tela escreve "89d+" com "pelo menos desde", em vez de afirmar um
   número exato que não foi medido. O "+" é o que carrega o "ou mais", e o número mostrado é o
   primeiro dia com arquivo dentro da janela, não o limite teórico.

   Com isso o corte de leitura deixou de ser conservador: só a janela é aberta. Numa carteira
   parada o ano inteiro, `diasParado` saiu de 366 para 89+, e a leitura caiu de 262 para 65
   arquivos por execução.

4. **Servidor morto: aberto.** O dono perguntou se dá para fazê-lo rodar com dado fictício.
   Resposta: tecnicamente sim, pouco trabalho, corrigir o casamento da rota e apontar para os
   fixtures sintéticos. Recomendação registrada é **não fazer**, porque a decisão 1 fechou o
   caminho em que ele serviria, porque rodar não fecha nenhum dos sete buracos nem cria rota de
   leitura ou isolamento, e porque o app já tem modo de demonstração com dado sintético que
   mostra mais do que ele mostraria. Um servidor que liga e responde parece pronto muito mais
   do que um que nem sobe, o que agrava o risco que motivou a pergunta. **Fechado em
   2026-08-21, decisão do dono:** não rodar, marcar o código como protótipo não funcional.
   Ver a seção do backend abaixo.

## Segunda cópia de dado real de cliente no disco (LGPD)

Encontrada em 17 de agosto, de passagem. `.archive/Verificacao-carteiras-legacy/` guarda um
`data.js` de cerca de meio megabyte com resultado de auditoria real de julho, incluindo
código de carteira e valor de patrimônio.

Não há exposição no repositório, conferido: `.gitignore` cobre `.archive/` e nada ali está
versionado. O problema é outro, é uma segunda cópia de dado real de cliente parada num
diretório fácil de esquecer, fora da área de instância onde dado real deveria viver.

**Resolvido em 2026-08-21, decisão do dono: mover.** Os quatro arquivos de dado real
(`data.js`, `data.json`, `historico.js`, `historico.json`) agora vivem em
`verificacao-carteiras\.archive\Verificacao-carteiras-legacy\`, fora do repo do
produto. O `.gitignore` deny-by-default da instância já cobria os quatro nomes e
`.archive/`, conferido antes de mover, nada de dado entrou no git. Na origem ficou
só a casca de código anterior à migração Vite, que não carrega dado.

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

**Executado em 2026-08-21, decisão do dono: marcar.** Banner no topo de
`audit-engine/src/server.ts` declara o arquivo como protótipo não funcional, lista os sete
buracos e aponta para esta seção. Não removido, as primitivas boas ficam como referência.
Antes de qualquer reuso, fechar os sete buracos.

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
  abrir arquivo. Ficou conservador enquanto a sequência de "parado" podia atravessar a janela,
  e o dono resolveu isso no mesmo dia decidindo que "parado há 90 dias ou mais" basta. Ver a
  decisão 3 acima.
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

## Camada de inteligencia, Entrega A (2026-08-24)

Diretriz reescrita e aprovada pelo dono em 24/08, plano em
`C:\Users\User\.claude\plans\nifty-singing-melody.md`. Executada SO a Entrega A;
B (fatores e credito) e C (materialidade, cenario, acao) nao foram iniciadas.

**Decisoes do dono em 24/08:**

1. **Fonte externa de dado de mercado: reaberta.** Reverte a exclusao de agosto do
   benchmark contra CDI/IBOV/IPCA. Ainda nao implementada (e da Entrega C). O
   desenho aprovado e cache com degradacao em tres niveis (serie de hoje, cache com
   idade na tela, premissa fixa declarada), comecando pela API publica do Banco
   Central. Ibovespa, Nasdaq, spreads e petroleo seguem sem fonte definida.
2. **Piso de cobertura: 70% afirma, 40% ressalva.** Implementado.
3. **Central de Acao: extensao da fila de oportunidades existente**, nao fila nova.
   Nao implementada (Entrega C).

### O que entrou

- **Camada de atributos por posicao.** `SnapshotPosition.atributos` com
  classeCanonica, indexador, taxaContratada, emissorId, emissorNome, moeda, regiao,
  prazoAnos, liquidezDias, cobertoFGC. Fonte: `ativo-map.local.json` da instancia,
  mesmo padrao de name-map/class-map/taxa-map (`loadAtivoMapping` em normalize.ts).
  Campo opcional, snapshot antigo le como tudo desconhecido.
- **Regra de cobertura** (`src/intel/coverage.ts`). Medida em fracao do PL, nunca em
  contagem de posicoes. Motor com cobertura abaixo de 40% nao afirma.
- **Contrato de explicabilidade** (`src/intel/explain.ts`). Todo motor devolve
  afirmacao, evidencias, regra, calculo, fonte, cobertura e confianca. A tela le,
  nao redige.
- **Radar de Carteiras** (`src/intel/cross-portfolio.ts`, tela `platform-radar.jsx`,
  rota `#/radar`). Seis tipos de sinal, agregados de emissor e fator da casa,
  deterioracao contra o periodo anterior, e a aba de cobertura como fila de trabalho.
- **Comandos novos no CLI de snapshot:** `cobertura` e `radar`.
- **Demo gerado pelo motor** (`scripts/gerar-radar-demo.mjs`). O payload nao e
  digitado a mao, sai de `radarCruzado`. Fecha o buraco que deixou o demo certo e o
  motor errado na queda de receita ate a Onda 2.

### Dois achados que mudaram o desenho

1. **Custodiante nao e emissor.** A primeira versao derivava `emissorId` de
   `instituicao`. Rodado contra os fixtures sinteticos, isso produzia em TODA
   carteira "100% do patrimonio depende de um unico emissor (CUSTODIANTE
   SINTETICO)", com cobertura reportada em 100%. Alerta critico falso e cobertura
   mentirosa ao mesmo tempo. `instituicao` e a coluna 1 do book, que ali e o
   custodiante. Emissor passou a vir **so do ativo-map**, e sem mapa a cobertura de
   emissor e 0%, que e a verdade. Travado em teste.
2. **Moeda local e pais local sao linha de base, nao alarme.** Sem a excecao,
   concentracao de fator dispararia em moeda e regiao em praticamente toda carteira
   brasileira, todo mes. `FATOR_BASE` em cross-portfolio.ts. Moeda estrangeira
   concentrada continua alarmando.

### Limiares novos (thresholds.ts, com o resto)

`coberturaAfirmaMin` 0,70 · `coberturaRessalvaMin` 0,40 ·
`radarConcentracaoAtivoPct` 0,30 · `radarConcentracaoEmissorPct` 0,25 ·
`radarConcentracaoFatorPct` 0,70 · `radarLiquidezMinPct` 0,05 ·
`radarVencimentoConcentradoPct` 0,15 em `radarVencimentoJanelaDias` 90 ·
`radarDeterioracaoPct` 0,10 em `radarDeterioracaoJanelaDias` 30.

**Calibrados pelo dono em 2026-08-24** sobre 37 meses de dado real
(`docs/calibracao-limiares-2026-08.md`), aplicados no mesmo dia. `coberturaAfirmaMin`,
`coberturaRessalvaMin` e `radarDeterioracaoPct`/`JanelaDias` foram medidos e
confirmados como estavam, sem mudar. Junto com os quatro valores de radar que
mudaram, `CONCENTRACAO_ATIVO` e `CONCENTRACAO_FATOR` passaram a medir severidade
pelo EXCESSO sobre o proprio limiar em vez da fracao bruta (os dois novos
valores encostam ou passam do corte generico de severidade alta, e sem a
mudanca todo alerta desses dois tipos sairia "alta"), e `CONCENTRACAO_EMISSOR`
e `CONCENTRACAO_FATOR` passaram a excluir a classe liquidez do alarme (70% e
77% do volume medido, respectivamente, era fundo de caixa, nao risco de
credito; continua agregado nas tabelas informativas da casa). `radarLiquidezMinPct`
segue sem mudar: a saturacao de severidade dele (quase todo caso sai "alta")
foi medida e registrada como problema aberto, mas sem formula de correcao
medida ainda, entao nao foi tocado nesta passada.

### Nao tem score 0 a 100

De proposito. A escala do score de materialidade e decisao aberta, e ja existe um
0 a 100 em `score.ts` onde 100 e BOM. O radar classifica em `Severidade`
(baixa/media/alta), a escala que o motor de eventos ja usa e o dono ja calibrou. O
ranking ordena por fato observavel: pior severidade, quantidade de sinais, maior
R$ exposto, nome.

### Pendencias abertas desta camada

1. **Quem preenche o ativo-map** e quantos ativos distintos existem na base atual.
   Sem mapa, cobertura de indexador, moeda, regiao, liquidez e emissor e 0%.
2. **Calibrar os oito limiares novos** com o dono.
3. **Nome e escala do score de materialidade**, para nao colidir com `score.ts`.
4. **Limite de linguagem em "o que revisar"** (compliance). Bloqueia a Central de
   Acao.
5. **Fonte para Ibovespa, Nasdaq, spreads e petroleo.** Bloqueia quatro dos oito
   cenarios da Entrega C. Petroleo tem a armadilha conhecida do contrato continuo.

## Camada de inteligencia, Entrega B (2026-08-24)

Eventos de credito, bootstrap do cadastro de ativos e a inteligencia dentro da
carteira. Entrega C (mercado, materialidade, cenario, Central de Acao) nao iniciada.

**Correcao de escopo registrada:** o plano original punha "Portfolio Intelligence"
em B, mas concentracao por emissor, classe, indexador, moeda e regiao, fator comum
escondido e liquidez ja tinham sido entregues em A pelo radar. O que sobrou de B foi
o adapter de credito, a visao por carteira e a tela de eventos.

**Decisoes do dono em 24/08 sobre B:**

1. **VIX Radar: so o formato, com dado ficticio.** A fonte e injetada por quem chama.
   Integracao real fica como entrega curta separada.
2. **Escada propria para perda confirmada**, mais sensivel que os cortes genericos:
   10% do PL ja e impacto alto num calote, contra 30% no resto do motor. 2% a 10% e
   medio. Abaixo de 2%, piso em REAIS decide (R$ 50.000, mesmo valor de
   `saqueGrandeMinAbs`). Sem piso minimo de exposicao.
3. **Piso de exposicao por tipo de evento:** sem piso em perda confirmada, 0,5% em
   sinalizacao, 1% em observacao.
4. **Estado temporal do evento** (`novo`, `acompanhamento`, `agravado`, `melhorado`,
   `encerrado`), com a tela abrindo pelo que mudou.
5. **`economicGroupId` no ativo-map**, sempre null, nunca inferido, preservado em toda
   regeneracao. Rollup por grupo NAO construido nesta entrega.
6. **Bootstrap do ativo-map entra em B**, gerando esqueleto preenchivel sem adivinhar
   emissor.

### O que entrou

- **`src/intel/credit-events.ts`.** Contrato `issuer/event/severity/date/source/confidence`
  na fronteira, saneamento dentro. Duas escadas de severidade, tres pisos, estado
  temporal por par evento-carteira.
- **`snapshot credito --eventos arq.json`.** Le o `credito.json` do periodo anterior
  para derivar estado, grava `audits/<data>/credito.json`.
- **`snapshot ativo-map`.** Esqueleto ordenado por R$ decrescente com valor e % do PL
  em `_nota`. Regerar preserva tudo que foi preenchido a mao, inclusive `false`, `0` e
  chave que o motor nem conhece. Ativo fora da base fica com `_ausenteDesde`.
- **Tela `Eventos & Impacto`** (`#/eventos`), abrindo pelo que mudou.
- **Aba `Inteligencia` na carteira**, sem motor novo: filtra os overlays do radar e do
  credito pela carteira aberta.
- **`scripts/demo-carteiras.mjs`**, casa sintetica unica. Radar e credito leem a MESMA
  casa; duas copias de fixture divergem sozinhas.
- **`scripts/gerar-credito-demo.mjs`**, payload gerado pelo motor sobre duas datas.

### As quatro regras que sustentam o modulo

1. **"Sem exposicao" e "nao sei" sao respostas diferentes.** Carteira sem cobertura de
   emissor vai para `naoAvaliaveis`, nunca para `semExposicao`. Travado em teste com
   carteira que TEM a exposicao e mesmo assim nao e reportada como atingida.
2. **A severidade do evento nao e a severidade do impacto**, e perda confirmada nao se
   mede na mesma regua de sinalizacao.
3. **Confianca nunca sobe:** menor entre a da fonte e a da cobertura.
4. **O piso filtra ruido NOVO, nao esconde movimento no que ja se acompanha.** Par que
   existia no periodo anterior aparece mesmo sob o piso, porque cair abaixo do piso E
   a noticia. `encerrado` sai na lista mesmo sem exposicao atual, com o motivo separado.

### Achado de tela que vale registrar

A aba de inteligencia da carteira mostrava exposicao da posicao DIARIA logo abaixo dos
indicadores do extrato MENSAL. Dois patrimonios diferentes para a mesma carteira na
mesma tela, o que qualquer leitor conclui ser erro. Nao e: sao periodos diferentes por
desenho. A aba passou a declarar a data de apuracao e a dizer isso em uma linha.

### Limiares novos de B (thresholds.ts)

`creditoPerdaConfirmada` altaMin 0,10 e mediaMin 0,02 ·
`creditoPerdaConfirmadaMinAbs` R$ 250.000 ·
`creditoPisoExposicao` perdaConfirmada 0, sinalizacao 0,02, observacao 0,05 ·
`creditoVariacaoMaterialPct` 0,20.

**Calibrados pelo dono em 2026-08-24**, junto com os de A e do radar (ver acima).
`creditoPerdaConfirmada` e `creditoVariacaoMaterialPct` foram medidos e
confirmados como estavam. `creditoPerdaConfirmadaMinAbs` e `creditoPisoExposicao`
subiram: o piso antigo em reais promovia um terco de todos os pares
emissor-carteira medidos no dado real, abaixo do ruido do livro (mediana de
exposicao por par: R$ 232 mil); os pisos percentuais antigos deixavam passar
91% e 80% dos pares.

### Pendencias abertas desta camada

1. **Quem preenche o ativo-map.** A ferramenta gera o esqueleto; alguem tem que
   completar. Enquanto nao completar, o alerta de credito nao acha nada em producao.
   Medido no root sintetico: sem mapa, 100% do PL sem emissor e zero carteira avaliavel.
2. ~~Calibrar os limiares de A e de B com o dono.~~ **Resolvido em 2026-08-24**,
   ver Entrega B.3 abaixo.
3. **Integracao real do VIX Radar**, quando o dono quiser.
4. **Rollup por grupo economico**, com o campo ja existindo e preservado.
5. Nome e escala do score de materialidade, limite de linguagem em "o que revisar", e
   fonte para Ibovespa/Nasdaq/spreads/petroleo. Todos de C.

## Camada de inteligencia, Entrega B.1 (2026-08-24)

Cobertura real do ativo-map e calibracao dos 12 limiares sobre o historico REAL da
casa: 37 meses (jun/2023 a jun/2026), 105 carteiras no ultimo mes, R$ 2,04 bi.
**Nenhum limiar foi alterado.** `thresholds.ts` esta como estava; a recomendacao
completa, com a tabela de 12 linhas, esta em `docs/calibracao-limiares-2026-08.md`.

### Resultado

- **Emissor preenchido em 89,4% do PL** (87,0% dos ativos vivos), contra 0% antes.
  Meta era 85%, ideal 90%. Cobertura entre 78% e 94% em todos os 37 meses.
- **98 de 105 carteiras avaliaveis** num evento de credito. Antes: zero.
- Mapas gravados na instancia (`ativo-map.local.json`, `name-map.local.json`), os
  dois negados no `.gitignore` da instancia. Preenchimento humano preservado,
  provado com marca de teste que sobreviveu a regeneracao.
- **Um unico ativo responde por 88% do buraco que sobrou** (9,34% do PL). Resolvido
  ele, a cobertura vai a 98,7%. E a pergunta de maior retorno para o dono.

### Tres defeitos achados no caminho, NAO corrigidos

1. **Mesmo papel escrito de dois jeitos pelo extrator do book.** 783 grafias
   duplicadas na serie, 617 papeis canonicos; no ultimo mes, 60 papeis somando 29%
   do PL. Efeito: **concentracao SUBESTIMADA**. Contornado na calibracao pelo
   name-map (que o normalize ja aplica a nome de ativo), sem tocar codigo.
2. **`ativo-map` reseta em silencio** quando o arquivo existe, parseia, e nao tem a
   chave `mappings`. Ele relata "N novo(s)" e sai com sucesso, com o preenchimento
   inteiro perdido. A trava existente so cobre JSON ilegivel. Descoberto por
   acidente durante esta entrega, e foi exatamente assim que aconteceu.
3. **`_ausenteDesde` nunca e limpo** quando o ativo volta a base.

### O que a calibracao mostrou do radar

292,9 alertas/mes, **97% das carteiras acesas, e so 13% dos alertas sao novos**.
70% do volume de concentracao por emissor e fundo de caixa, nao risco de credito.
`CONCENTRACAO_FATOR` produziu **2.974 alertas e todos "alta"**: a regra so dispara
acima de 50% e a severidade usa cortes de 10%/30%, entao e impossivel sair outra
coisa. Com os limiares propostos + exclusao da classe liquidez + corte por
novidade: **15,5 alertas/mes e 13% das carteiras acesas**. O corte por novidade
sozinho vale mais que todos os limiares somados.

`radarDeterioracaoPct` e `creditoVariacaoMaterialPct` foram medidos e **confirmados
como estao**: a deterioracao acende, resolve e nao repete; a variacao de 20% deixa
`acompanhamento` ser o estado dominante (84,3% dos pares variam menos de 5% ao mes).

### Ponte de calibracao, fora do produto

**Correcao registrada no mesmo dia:** a primeira versao desta secao dizia que o
pipeline nao tinha adaptador para o book em PDF. Errado. `adapters/pdf.ts` existe e
esta registrado; o que faltava era `pdfplumber` no Python da maquina.

Sobra a ponte para o HISTORICO: so ha PDF de dois meses no disco, e os 37 meses
existem como `audit.json` do fluxo mensal. A ponte converte esse artefato em
snapshot, datado no ultimo dia do mes para as regras diarias funcionarem, e usa o
`normalize()` do produto importado do dist. Ela nao e produto e nao entra em build.

## Camada de inteligencia, Entrega B.2 (2026-08-24)

Executada na ordem de prioridade acordada com o dono. Corrige os dois defeitos de
dado que a B.1 encontrou e da ao radar o corte por novidade que a medicao provou
valer mais que qualquer ajuste de limiar. **Nenhum limiar existente foi alterado.**

### Prioridade 1 nao era o que eu disse que era

Eu afirmei ao dono que o adaptador de PDF nao existia e que era a maior distancia
entre "pronto" e "funciona". **Estava errado.** `audit-engine/src/snapshot/adapters/pdf.ts`
existe desde antes, registrado no dispatcher, reusando o extrator Python do fluxo
mensal. O que estava quebrado era `pdfplumber`, ausente nos tres interpretadores
Python da maquina apesar de o `CLAUDE.md` registrar a instalacao em 14/08.

Reinstalado, o caminho real foi provado ponta a ponta contra os books do cliente:

```
[criado] tenant=szuchmacher 2026-04-30: 111 carteiras, hash 60d8ff52.
[criado] tenant=szuchmacher 2026-05-31: 108 carteiras, hash 1306992c.
[cobertura] 2026-05-31 — casa: 108 carteira(s)
  emissorId   87.5%  afirma
```

**Efeito colateral que vale registrar:** a suite tinha 1 teste PULADO havia tempo,
e era a parity de PDF contra Excel, que se auto-desliga quando `pdfplumber` falta.
O portao relatava "todos os testes passaram" com um teste a menos. Agora sao 0
pulados. Dependencia de ambiente que some sem quebrar nada e a forma mais barata
de perder cobertura de teste.

### O que entrou

- **`intel/estado.ts`.** A maquina de estado temporal saiu de dentro do adapter de
  credito e virou modulo. `estadoDoPar` continua existindo como adaptador de nome
  de campo. Duas copias da mesma regra divergem sozinhas, e o dia em que
  divergirem a tela de eventos chamaria de "agravado" o que o radar chama de
  "acompanhamento" sobre o mesmo movimento.
- **Estado no radar.** `novo`, `acompanhamento`, `agravado`, `melhorado` por sinal,
  mais a lista de `encerrados`. Chave estavel por tipo, e vazia em
  `DETERIORACAO_PL` de proposito: usar a data da base faria o sinal renascer todo
  periodo. A ordenacao passa a ser por ESTADO antes de severidade.
- **`snapshot name-map`.** Funde as grafias diferentes do mesmo papel. Le a serie
  inteira numa passada; construir por data produzia ciclo A→B, B→A.
- **Aviso de grafia duplicada na ingestao.** Aviso, nunca erro, mesma politica do
  "EXTRACAO PARCIAL". No book real de maio: 57 papeis, 16,8% do PL.
- **Guarda contra reset silencioso do `ativo-map`**, agora compartilhada com o
  `name-map` em `lerMappings`.
- **`_ausenteDesde` limpo** quando o ativo volta a base.
- **Tela do radar abre pelo que mudou**, com filtro "So o que mudou", aba de
  encerrados, o estado em cada linha e o valor anterior ao lado do atual.
- **`radarVariacaoMaterialPct: 0.20`**, limiar NOVO. Nao e chute: 36.897
  comparacoes no dado real, 84,3% dos pares variando menos de 5% e so 6,4%
  passando de 20%.

### O numero que justifica a entrega

No dado real da casa, maio contra abril: **349 sinais, 19 mudaram**. Novo 17,
agravado 2, acompanhamento 318, melhorado 12, encerrado 26. A tela abre com 19
itens em vez de 349.

### Pendencias que continuam abertas

1. **O ativo de 9,34% do PL sem identificacao.** So o dono responde. Resolvido,
   a cobertura vai de 89,4% para 98,7%.
2. ~~Os 12 limiares. Nada foi aplicado.~~ **Aplicados em 2026-08-24**, ver
   Entrega B.3 abaixo.
3. **`liquidezDias` nao sai do book.** Precisa do regulamento do fundo ou do campo
   D+ do custodiante.
4. **`pdfplumber` sem versao presa.** Vale um `requirements.txt` e falhar em vez de
   pular quando faltar.
5. Rollup por grupo economico, VIX Radar real, e os itens de C.

## Camada de inteligencia, Entrega B.3 (2026-08-24)

Aplica os 8 valores calibrados que a B.1 recomendou e nao chegou a aplicar,
mais as 2 mudancas estruturais que a propria tabela de recomendacao exigia
para os valores novos nao reproduzirem o defeito que a B.1 mediu. **Este e o
primeiro `thresholds.ts` desta camada a sair do default conservador.**

### Por que nao foi so trocar numero

`CONCENTRACAO_FATOR` ja saia 100% "alta" em 2.974 de 2.974 alertas medidos: o
limiar antigo (50%) ficava ACIMA do corte generico de severidade alta (30%),
entao disparar ja garantia "alta", a escala de tres graus nunca era alcancada.
Subir `radarConcentracaoAtivoPct` de 20% para 30% criaria o MESMO problema
nele, porque 30% EMPATA com o corte de "alta". A tabela de recomendacao da B.1
ja previa isso e pedia severidade relativa ao proprio limiar para os dois.
Aplicar so o numero, sem a formula, teria entregado um limiar novo com o
mesmo defeito medido.

### Os 8 valores (`thresholds.ts`)

`radarConcentracaoAtivoPct` 0,20→0,30 · `radarConcentracaoEmissorPct`
0,15→0,25 · `radarConcentracaoFatorPct` 0,50→0,70 ·
`radarVencimentoConcentradoPct` 0,20→0,15 · `radarVencimentoJanelaDias`
30→90 · `creditoPerdaConfirmadaMinAbs` R$ 50 mil→R$ 250 mil ·
`creditoPisoExposicao.sinalizacao` 0,5%→2% · `.observacao` 1%→5%. Detalhe e
justificativa de cada um em `docs/calibracao-limiares-2026-08.md` e nos
comentarios do proprio arquivo.

### As 2 mudancas estruturais (`cross-portfolio.ts`)

- **Severidade relativa ao proprio limiar**, so em `CONCENTRACAO_ATIVO` e
  `CONCENTRACAO_FATOR` (nao em `EMISSOR`, cujo novo limiar nao colide com o
  corte generico). Mesmo desenho ja usado em `LIQUIDEZ_BAIXA` (deficit
  relativo ao piso), com excesso em vez de deficit.
- **Exclusao da classe liquidez do alarme**, em `CONCENTRACAO_EMISSOR` e
  `CONCENTRACAO_FATOR`. Medido: 70% e 77% do volume respectivo eram fundo de
  caixa, nao risco de credito. `FATOR_BASE` (mesmo mecanismo que ja excluia
  BRL/Brasil) ganhou `classeCanonica: 'liquidez'`. O dado continua agregado
  nas tabelas informativas da casa (`agregarEmissores`/`agregarFatores`), so
  o alarme fica de fora.

### O que ficou de fora, de proposito

A linha de `coberturaAfirmaMin` na tabela de recomendacao nao muda valor
(mantem 0,70): o unico texto ali e limpeza nao relacionada (tirar
`liquidezDias` de `ATRIBUTOS_MEDIDOS`, remedir `prazoAnos`), nao e troca de
limiar. A saturacao de severidade de `LIQUIDEZ_BAIXA` (quase todo caso sai
"alta", medido em 120 de 122 casos) segue como problema aberto: a B.1 mediu
o problema mas nao chegou a uma formula de correcao, e sem numero medido nao
se inventa um.

### Portao e publicacao

Sete asserções em 3 arquivos de teste tiveram que ser reajustadas (limiar
hardcoded ou fixture cuja margem sumiu com o novo corte), mais 4 fixtures da
casa sintetica (ALPHA_01, CEDRO_HLD, DUNAS_CAP, FAROL_INV) cuja razao de
existir dependia de cruzar um limiar que mudou. Toda a aritmetica foi
conferida a mao antes de editar, nao por tentativa e erro.

```
602/602 checks OK — todos os checks passaram
ℹ tests 278   ℹ suites 73   ℹ pass 278   ℹ fail 0   ℹ skipped 0
```

Mesma contagem de antes: este passe muda valor dentro de teste e fixture
existentes, nao adiciona nem remove `it()` nem check.

## Camada de exploração e decisão, P0/P1 (2026-08-26)

Pedido do dono: trazer os padrões de exploração de referência de mercado
(ranking, comparador, rastreador transversal de ativo) sem transformar o
ATLAS em portal de investimento. Fluxo alvo: Cliente → Carteira → Problema →
Ativo → Divergência → Fonte → Ação. Planejado em modo de planejamento,
validado por revisão independente antes de codificar
(`docs/validacao-plano-p0-p1.md`), construído e testado num worktree
separado (`ATLAS-sandbox/`, branch `feat/exploracao-p0-p1`) antes de portar
para o principal. O worktree segue de pé, sem commit próprio: é ambiente de
trabalho, não histórico paralelo.

### O que entrou

- **`platform-consolidado.js`** (`window.AtlasConsolidado`), módulo novo e
  fonte única de decisão cruzada. Ranking, resumo da casa, rastreador,
  comparador e histórico leem daqui, nenhum recalcula por conta própria.
  Carregado depois dos overlays de radar/crédito (lê os dois) e antes das
  páginas, em `src/main.jsx`.
- **Ranking de Criticidade** (`platform-ranking.jsx`, rota `#/ranking`, item
  novo no menu Painel). Ordena por fato observável, lexicográfico, nunca por
  soma ponderada: status, depois divergência em R$, depois achado
  bloqueante, depois risco alto, depois pendência, depois custo. Seis
  critérios alternativos. Sem nota de 0 a 100 de propósito, decisão
  registrada: já existe uma escala dessas em `score.ts` do motor onde 100 é
  BOM, uma segunda com o mesmo nome diria o oposto.
- **Resumo da casa no Dashboard** (`ResumoCasa` em `platform-dashboard.jsx`).
  Responde na ordem pedida: patrimônio apurado, corte
  liberado/alerta/bloqueado, divergência material, custos, concentração,
  instituições, risco e cadastro, "onde agir" com link. Consome o mesmo
  `resumoCasa()` que o ranking usa, para as duas telas não divergirem sobre
  quantas carteiras exigem ação.
- **Rastreador de Ativos** (`platform-busca.jsx`, mesma rota `#/busca`,
  substitui a busca antiga). Um papel, todas as carteiras expostas, peso na
  carteira e na casa, variação contra o mês anterior, e a situação de
  verificação de cada carteira exposta.
- **Comparador por carteira** (`ComparativoCarteira` em
  `platform-comparativo.jsx`). Modo novo dentro do Comparativo existente,
  posição a posição entre dois meses, mais o painel fonte A (extrato
  mensal) contra fonte B (posição diária do radar). Aceita
  `#/comparativo?carteira=CODE`, destino do atalho do ranking.
- **Histórico de verificação por carteira** (aba Histórico em
  `platform-carteira.jsx`). Ganhou status de verificação, divergência e
  custo mês a mês, além do que já tinha (patrimônio, rentabilidade,
  drawdown). Mês sem extrato aparece na tabela como tal, não desaparece nem
  vira zero na conta de retorno.
- **`getRow` em `platform-data.js`** ganhou `plEsperado`, `divergenciaBRL`,
  `divergenciaAbsBRL`. É a conta que já existia dentro de `continuidade`
  (regra R1), agora exposta em reais: fração não se soma entre carteiras
  nem prioriza por materialidade.
- **`intelDaCarteira` em `platform-carteira.jsx`** deixou de ler os overlays
  por conta própria e passou a delegar para o consolidado, mesmo padrão de
  fonte única.

### Quatro correções exigidas pela revisão antes de portar

Revisão independente (`docs/validacao-plano-p0-p1.md`) aprovou o plano com
quatro exigências, todas fechadas antes do porto para o principal:

1. **Porta de entrada.** Os dois arquivos novos entraram na ordem de import
   de `src/main.jsx`, na rota e no menu de `platform-app.jsx`, e ganharam
   55 checks novos em `tests/validate.js` (seção 30) travando cada promessa
   do plano. Sem isso o módulo passaria no portão sem nunca ser executado.
2. **Comparação com mês sem dado.** `compararCarteira` devolve
   `disponivel: false` com o motivo quando falta extrato de um dos dois
   lados, nunca fabrica entrada/saída de posição.
3. **Carteira criada depois do mês.** `rankingCarteiras` e
   `historicoVerificacao` filtram por `inception`: carteira que ainda não
   existia no mês não conta como "sem dado".
4. **Atalho para tela que ignora o parâmetro.** `Comparativo` passou a
   aceitar `?carteira=CODE` antes do atalho do ranking existir.

### Dois defeitos achados durante a construção, corrigidos no caminho

- **Resíduo de ponto flutuante decidindo posição.** A divergência em reais
  não era arredondada, então centavos de resíduo bagunçavam a ordem de
  carteiras que a tela mostra como "sem divergência", e o histórico chegou
  a escrever "-R$ 0,00". Motivo: duas contas separadas para o mesmo número,
  uma no ranking e outra no histórico. Unificadas em `divergenciaDe()`
  dentro do consolidado, arredondada a centavo, único lugar que decide.
- **Rótulo de cliente imprimindo "demo".** `clienteAtual()` lia o
  `tenantId` do overlay e imprimia como nome de casa. Em ambiente de
  demonstração esse campo vale literalmente `"demo"`, que é rótulo de
  ambiente, não identidade de cliente. Corrigido para só assinar quando há
  marca declarada (`window.AtlasBrand.tenant`) ou tenant real diferente de
  `default`/`demo`.

### Duas decisões de produto tomadas nesta entrega

1. **Pendência cadastral sintética, marcada, não corrigida de raiz.**
   `AtlasData.registration()` gera pendências por sorteio determinístico e
   o carregamento de dado real não a substitui — mesmo defeito de fundo que
   a Onda 1 corrigiu em agosto, reaberto por uma porta nova. Solução
   aplicada, a mais rápida das três que a revisão levantou: fora do modo
   demonstração a pendência sai marcada como estimativa (til no número,
   itálico na tela, faixa de aviso, origem declarada no CSV) e **não entra
   na ordenação de criticidade**. Overlay real (`window.ATLAS_CADASTRO_DATA`)
   ainda não existe; no dia em que existir, a marca cai sozinha.
2. **Comparação de fontes sem veredito.** A primeira versão classificava
   "aderente" quando o desvio entre extrato mensal e posição diária ficava
   dentro de 0,30%, reusando a tolerância de continuidade (regra R1). Essa
   régua mede um mês contra o anterior na MESMA fonte; aplicá-la a duas
   fontes apuradas em datas diferentes por desenho produziria veredito sem
   medição. `fontesDaCarteira` agora devolve o delta, as duas datas de
   apuração e os dias de distância entre elas, com a conclusão declarada
   como `sem-regua-calibrada` em vez de inventar "aderente" ou
   "divergência".

### Rastro de verificação

Construído e testado no worktree `ATLAS-sandbox/` (mesmo repositório,
branch `feat/exploracao-p0-p1`) antes de tocar o principal, para não
sobrescrever trabalho em andamento. Rota `#/ranking` e `#/dashboard`
abertas em navegador real contra o servidor de desenvolvimento (rede
confirmando os dois arquivos novos em `200 OK` na ordem certa, texto
renderizado conferido) — primeiro no sandbox, depois repetido no ambiente
de demonstração do principal (`atlas-vite-dev`) depois do porto, condição
de aceite da revisão. Porto conferido arquivo por arquivo, diff vazio entre
sandbox e principal nos 11 arquivos versionados antes de commitar.

### Pendências abertas desta camada

1. ~~Publicação ainda não verificada.~~ **Resolvida em 2026-08-26**, ver a
   seção "Publicação do demo" logo abaixo.
2. ~~Sem overlay real de cadastro.~~ **Estrutura entregue em 2026-08-26**,
   ver a seção "Overlay real de cadastro" logo abaixo. O que falta agora não
   é código, é a lista de pendências do escritório. Sem ela o app continua,
   de propósito, marcando a pendência como estimativa.
3. **`fmtCompactBRL` sem `maximumFractionDigits`** era defeito preexistente
   em `platform-utils.jsx`, achado pelo rastreador (primeira tela a exibir
   delta de posição pequeno o bastante para cair no ramo abaixo de mil).
   Corrigido de passagem, fora do escopo original do plano.
4. **Nenhum limiar novo.** A tolerância de materialidade (0,30%) e a régua
   de criticidade reusam o que o motor já tinha. Nada aqui precisa de
   calibração do dono.

### Publicação do demo (2026-08-26)

Autorizada pelo dono e executada. A camada de exploração e decisão está no ar
no demo público.

| Item | Valor |
|---|---|
| URL | `https://demo.multi-assets.com` |
| Worker | `app-verificacao-carteiras-atlas` |
| Conta | a antiga. A separação de conta segue suspensa, `deploy-nova-conta.ps1` não foi usado |
| Versão | `5d6410a3-a25d-44cb-a3fa-7f637fa0d95f` |
| Pacote | 6 arquivos, 2 novos ou modificados enviados, 4 já presentes |

Conferido no ar por rede: raiz em 200, bundle
`assets/index-B6rOFtSX.js` em 200 com 1.292.801 bytes, e quatro marcas do
código novo presentes no bundle que o domínio realmente serve
(`AtlasConsolidado`, `Ranking de Criticidade`, `Rastreador de Ativos`,
`sem-regua-calibrada`). A rota `#/ranking` renderiza com a mesma ordem do
ambiente local.

**Nota de método que vale para a próxima publicação.** Os arquivos novos
não existem soltos em produção, entram compilados no bundle único, que é o
contrato de build. Conferir "arquivo X carrega na posição Y da ordem de
carga" não se aplica ao ambiente publicado; a prova equivalente é presença
de marca dentro do bundle servido.

### Dois P0 do pre-flight, ambos fechados

O pre-flight rodou antes da publicação, como o `CLAUDE.md` exige, e travou o
voo com dois P0. Os dois foram corrigidos, cada um em commit isolado.

1. **`deploy-cf.ps1` saía sem exit code em falha.** Os quatro desfechos de
   falha terminavam em `Write-Error` seguido de `return`, e `return` não
   define o exit code do processo, então quem chama o script por `&` lê
   `LASTEXITCODE` residual e decide errado. Mesma classe de defeito já
   registrada no `CLAUDE.md` global em `run-daily-scan.ps1` (commit
   `adc9dbf`). Trocados por `exit 1`. Os `return` de `-DryRun` e
   `-SkipDeploy` ficaram como estão, são saída normal.
2. **`deploy-nova-conta.ps1` tinha travessão**, que quebra em PowerShell
   5.1 em arquivo sem BOM. Trocado por vírgula. O script segue suspenso
   junto com a separação de conta e continua fora do caminho de publicação.

### Falso positivo registrado, para não virar alarme de novo

Durante a conferência no ar, `https://demo.multi-assets.com/platform-data-real.js`
respondeu **HTTP 200**, o que parece overlay de dado real sendo servido.
**Não é.** O Worker do demo tem fallback de página única, então qualquer
rota desconhecida devolve o `index.html`. Provado por controle: a resposta
vem com `content-type: text/html` e 4.014 bytes, exatamente os mesmos que um
caminho inventado (`/xyz-nao-existe-123.js`) devolve. Nenhum overlay está no
pacote, conferido nas duas camadas independentes de trava.

Vale como lição de método, a mesma que o log já registra em 17/ago: achado
por leitura parcial merece confirmação antes de virar alarme. Testar
presença de arquivo por código de status num servidor com fallback de página
única não prova nada; o que prova é `content-type`, tamanho e um caminho de
controle.

## Fase 2, Jul/2026 como mês de estabilidade (2026-08-26)

`CURRENT_MONTH` avançou de `2026-06` para `2026-07`.

### Dois conceitos que eram um só

`CURRENT_MONTH` era ao mesmo tempo o último mês fechado e o mês em que o demo
abre. Isso já custou caro uma vez: alguém avançou o mês sem estender o roteiro
de status, a abertura caiu no gerador pseudoaleatório e saiu 40/40 LIBERAR,
com o prospect chegando pela tela em que o produto declara não ter achado
nada. Com Jul/26 limpo de propósito, os dois passam a ser separados:

| Constante | O que é | Valor |
|---|---|---|
| `CURRENT_MONTH` | último mês fechado, âncora do rescale e limite de fabricação | `2026-07` |
| `OPENING_MONTH` | onde o app aterrissa | `2026-06` |

`OPENING_MONTH` governa só aterrissagem, em três lugares (estado inicial e
fallback em `platform-utils.jsx`, fallback de mês fora da faixa em
`platform-app.jsx`). Extensão de dado continua olhando `CURRENT_MONTH`, e a
janela do gráfico do dashboard também, senão o histórico encurtaria um mês.

### O que julho é, medido e não afirmado

| | Jun/26 (abertura) | Jul/26 (corrente) |
|---|---|---|
| Status | 24 LIBERAR, 12 COM ALERTA, 4 CORRIGIR | 40 LIBERAR |
| Divergência máxima | 0,738620% do PL anterior | 0,000000% |
| Carteiras com divergência material | 4 | 0 |
| PL total | R$ 1,1889 bi | R$ 1,2000 bi |
| Composição contra o mês anterior | 40 carteiras trocaram de ativo | 40 carteiras idênticas |

Julho fecha exato por construção, não por sorte: sem roteiro de status
`getStatus` devolve LIBERAR para o mês corrente inteiro, e só CORRIGIR injeta
ajuste em `reportedPlPrev`. Sem CORRIGIR, `plEsperado = plCurr` e a
divergência é zero. Um check prende essa causa, não o efeito.

### Composição estável

O mês corrente reaproveita a composição do mês anterior, papel por papel, e o
saldo anda só por marcação a mercado. Antes cada mês sorteava um conjunto novo
de ativos, e o comparador de posição entre dois meses mostrava a carteira
inteira trocando de papel, compra e venda que nunca aconteceram. O sorteio
continua valendo para o histórico, onde nunca foi confrontado posição a
posição.

**Correção que veio junto.** A nota INFO de variação acima da faixa histórica
dizia "confirmado pelo gestor como realocação tática". Num mês de estabilidade
isso é texto contradizendo o comparador na tela ao lado, que mostra zero
entrada e zero saída. A observação ficou, o número dela é verdadeiro, só a
causa mudou para marcação a mercado. Travado por check.

### Correção de premissa que vale registrar

O pedido supunha que estabilizar a composição é o que tira a divergência de
julho. Não é. A conta do produto vive em `reportedPlPrevArr`, `retArr` e
`nnmArr`, na materialização, e composição não a alimenta, só distribui o PL
entre ativos. As duas coisas foram feitas, mas por motivos diferentes:
composição estável conserta o comparador de posição, e julho fecha exato
porque nenhuma carteira dele é CORRIGIR.

### Efeito colateral aceito

A âncora do rescale é o mês corrente, então o total de R$ 1,2 bi mudou de
junho para julho. Junho passou a somar R$ 1,1889 bi. Todos os números do demo
foram reescalados junto, o que é o comportamento correto da âncora.

### Sete notas INFO em julho, deixadas de propósito

Sete carteiras LIBERAR carregam nota INFO de variação acima da faixa
histórica. Não são achado inventado: a severidade é informativa, o número no
texto é a rentabilidade real da carteira, a divergência delas é zero e o
status não muda. Removê-las apagaria observação verdadeira.

## Overlay real de cadastro (2026-08-26)

Fecha o último número do ranking que ainda saía marcado como estimativa. O
consumidor não mudou: `platform-consolidado.js` sempre leu
`window.ATLAS_CADASTRO_DATA.pendencias`, e agora existe quem escreva esse
arquivo.

### O que entrou

- **`scripts/gerar-cadastro.mjs`**, gerador. Lê `cadastro-pendencias.json` na
  raiz da instância, valida linha por linha e escreve `platform-cadastro.js`
  lá mesmo. Aceita `--dir` (raiz da instância) e `--hoje` (data de referência
  do cálculo de validade, para o exemplo ser reproduzível).
- **Lista de tipos de documento do escritório**, doze: Ficha Cadastral, KYC,
  Perfil de Investimento, Perfil de Risco, Declaração de Investidor
  Qualificado, Declaração de Investidor Profissional, Comprovante de
  Residência, Contrato de Gestão, Documento de Identidade, Procuração,
  Declaração de Beneficiário Final, Declaração de IR. `PENDING_TYPES` em
  `platform-data.js` (o conjunto que o demo sintético sorteia) foi
  recalibrado para a mesma lista, com comentário cruzado nos dois lugares. Um
  check do portão compara as duas listas e falha se divergirem: divergência
  mudaria o filtro "Tipo" da tela de Cadastro quando a instância troca de
  sintético para real, e o operador acharia que perdeu documento.
- **Janela de validade só onde existe regra objetiva**: Comprovante de
  Residência 6 meses, Perfil de Investimento e Perfil de Risco 24,
  Declaração de IR 12. Nos outros oito tipos a pendência é declarada e nunca
  calculada. Inventar prazo para KYC ou procuração produziria "Vencido" que
  ninguém consegue provar de onde veio.
- **Conjunto obrigatório por custodiante**, quatro: Mirabaud, BTG, Bradesco
  Private e Órama. Cada carteira tem um custodiante e cada custodiante exige
  um subconjunto próprio do modelo. Documento exigido que não aparece na
  lista sai como **Pendente por falta**, com o custodiante declarado na
  linha. Ver o aviso sobre o conteúdo desses conjuntos logo abaixo.
- **Custodiante da carteira**, três caminhos, do mais explícito para o mais
  derivado: campo `custodiante` na própria linha, mapa `carteiras` no topo do
  arquivo, ou a composição do `platform-data-real.js` pela instituição de
  maior saldo. Sem nenhum dos três a carteira **não recebe cálculo por
  falta**, e o gerador diz isso no log. Sem saber o que o custodiante exige,
  ausência de documento não prova nada.
- **`docs/cadastro-pendencias.exemplo.json`**, formato documentado dentro do
  próprio arquivo, com três carteiras que provam o modelo inteiro: uma com
  comprovante vencido por data, uma com dois documentos pendentes por falta
  mais um com status declarado, e uma com cadastro completo que gera zero
  pendência. Um check confere que todo código do exemplo vem do catálogo
  sintético do demo, e um teste fim a fim roda o gerador de verdade contra
  ele e confere o overlay linha por linha.
- **Listas de negação**, cinco lugares: `scripts/build-deploy.mjs`,
  `scripts/verify-build.mjs`, `scripts/deploy-cf.ps1`, `.gitignore` do
  produto e `.gitignore` da instância. Mais a lista `OVERLAYS` do
  `scripts/gen-index.mjs` da instância, que é quem injeta a tag no index
  servido. As duas edições da instância ficaram sem commit nesta rodada,
  sobem com o próximo commit de lá.

### O arquivo de entrada é o estado do cadastro, não uma lista de pendências

Isso é fácil de errar e muda tudo. Cada linha descreve um documento da
carteira, com a data dele quando existe. Documento em dia **sai** do resultado,
porque não é pendência. Documento vencido, sem data, ou com status declarado,
vira linha do overlay. E documento exigido pelo custodiante que não aparece na
lista vira pendência por falta. Se o arquivo fosse só de pendências, ausência
significaria "resolvido" e o cálculo por falta viraria ruído.

No exemplo, 21 dos 23 documentos listados estão em dia e não aparecem no
overlay. Só 4 pendências nascem, e uma das carteiras sai com cadastro completo.

### As quatro regras que não podem ser relaxadas

1. **Arquivo ausente ou vazio não gera overlay nenhum.** Ausência de dado não
   é ausência de pendência. Overlay vazio faria a tela dizer "nenhuma
   pendência cadastral" com a autoridade de dado confirmado, quando a verdade
   é que ninguém preencheu a lista. Sem o arquivo, o app fica no estado
   honesto de estimativa marcada, que é pior de ler e certo de confiar.
2. **Linha inválida aborta a geração inteira.** Gravar as boas e descartar as
   ruins em silêncio sumiria com pendência que existe no escritório.
3. **Carteira sem custodiante conhecido não recebe pendência por falta.**
   Chutar o custodiante inventaria exigência, e exigência inventada vira
   pendência inventada, que é exatamente o defeito que este trabalho fecha.
4. **O log do gerador só imprime contagem.** Código de carteira, apelido e
   observação nunca saem na tela: log de gerador acaba colado em ticket. Erro
   de validação aponta pelo índice da linha, nunca pelo código.

### Cuidado que quase virou defeito

`platform-cadastro.jsx` é a PÁGINA de Cadastro & Compliance, produto que
entra no bundle. `platform-cadastro.js` é o overlay de dado real. Negação por
prefixo levaria a página junto e ela sumiria do bundle sem erro nenhum, então
as regras de nome são exatas e as checagens de tag no HTML usam `(?!x)`. Um
check do portão trava isso nos dois scripts.

### O que falta, e não é código

**1. A lista de cadastro do escritório.** Enquanto `cadastro-pendencias.json`
não existir na raiz da instância, o app continua marcando a pendência
cadastral como estimativa e a mantém fora da ordenação de criticidade, que é o
comportamento correto e está travado por check.

**2. O conjunto obrigatório real de cada custodiante.** Os conjuntos
embarcados em `scripts/gerar-cadastro.mjs` **não saíram do escritório**. São o
padrão de abertura de conta e suitability que a regulação brasileira desenha
(cadastro, identificação, comprovante de residência, KYC, perfil de
investimento), mais o que cada perfil de casa costuma pedir a mais. Servem
para o modelo existir e ser testável, não para valer como fonte. O código diz
isso em caixa alta, o overlay carrega `custodiantesProvisorios: true` e um
check do portão exige as duas marcas.

O conjunto real entra pela instância, não pelo produto: o
`cadastro-pendencias.json` pode trazer um bloco `custodiantes` que
**substitui** (não soma) o conjunto de quem for declarado ali. É assim que o
conjunto do Mirabaud vira dado de instância, fora do git, sem ninguém
adivinhar nada dentro do produto. Decidido com o dono em 2026-08-26, quando a
pergunta foi feita e o conjunto real não estava disponível.

### Gap adjacente, não corrigido

`scripts/deploy-nova-conta.ps1` tem a própria lista `$proibidos` e ela já
estava incompleta antes desta entrega: falta `platform-radar.js`,
`platform-credito.js` e agora `platform-cadastro.js`. Não foi mexido porque
está fora do escopo pedido e o roteiro da conta nova está suspenso, proibido
de rodar. Se a separação de conta reabrir, essa lista precisa ser fechada
antes de qualquer publicação por ali.

## Pendências, ordenadas por prioridade acordada com o dono em 17/ago

1. **Distância entre protótipo e produto vendável — decisão de arquitetura tomada em
   2026-08-21.** Pesquisa (tendências 2025-2026 + análise do sistema) entregue ao dono e
   plano aprovado: manter instância por cliente para o cliente atual e o próximo, colocar
   noção de cliente no motor agora, e subir o rung 2 da escada Cloudflare (um Worker com
   D1 ou Durable Object por cliente) quando o 2º cliente assinar. Instância física vira
   tier premium de venda, não padrão operacional. **Executado em 21/08:** `tenantId` no
   modelo de dados do motor (snapshot, ingestion, events, reconciliação, fila de exceção),
   com default `default`, compat com artefato antigo e teste que pega regressão. Falta
   gestão de usuário por cliente, que é o próximo passo concreto da pendência.
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

## Pipeline de ingestão, endurecido em 2026-08-21

Três peças novas no fluxo de ingestão do snapshot, decididas no plano multi-cliente:

- **Validação pós-normalização** (`validarSnapshot`, em `audit-engine/src/snapshot/pipeline.ts`):
  guard do arquivo final antes de gravar, plTotal coerente com a soma das posições, carteira
  única e nomeada. O normalize valida a entrada, isto valida o produto, uma regressão de
  derivação não grava mentira.
- **Fila de exceção**: arquivo que falha no adaptar/normalizar/validar não some. Cópia e
  manifest (`excecao/v1`) ficam em `audits/<data>/fila-excecao/` e o erro original é
  relançado, o CLI segue parando com exit 1. O descarte silencioso era o modo de falha do
  ciclo mensal.
- **Reconciliação** (`reconciliacao.json` por período): fatos contra o período anterior,
  delta de PL por carteira em comum, carteiras novas e sumidas. Sem julgamento, o diff de
  eventos continua em `diff.ts`. Falha de reconciliação não derruba ingestão já gravada.

`tenantId` (rótulo do cliente dono) via `--tenant`, default `default`, acompanha snapshot,
ingestion, events, reconciliação e fila de exceção. Artefato antigo sem o campo lê como
`default`.

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
  na leitura da série do caixa parado. Não era verdade no contrato de então: `diasParado`,
  `pico`, `rsDiasSequencia` e `inicioSequencia` saíam da caminhada sobre a série completa, que
  a janela não truncava. Cortar em 90 dias mudava número, então o corte entrou conservador e a
  decisão de encurtar foi levada ao dono em vez de ser tomada em silêncio dentro de uma tarefa
  de eficiência.
- **2026-08-17, demo publicado.** O dono autorizou e o demo público subiu com as cinco ondas,
  versão `960a60fe`, pacote `index-BpOTxmi3.js` no lugar de `index-DQAeG96b.js`. Conferido no
  ar por seis marcas do código novo. A primeira conferência pegou cache de borda servindo a
  página antiga, que expirou sozinho em vinte segundos; a limpeza de cache pela API falhou por
  falta de permissão no token. A instância do cliente **não** foi publicada.
- **2026-08-17, cadeia de gitlink fechada.** Dois commits de ponteiro, de baixo para cima:
  instância registra core em `e693239` (`019ceda`), produto registra instância em `019ceda`
  (`f8356fa`). Sem push. Ver a tabela no topo.
- **2026-08-17, teto de 90 dias decidido pelo dono.** "Parado há 90 dias ou mais basta." A
  janela virou o universo inteiro da medição e a premissa da revisão passou a valer, agora por
  decisão explícita. Numa carteira parada o ano inteiro, `diasParado` saiu de 366 para 89+ e a
  leitura caiu de 262 para 65 arquivos por execução, conferido com o motor. 460 → 469 checks,
  131 → 129 testes, porque cinco testes do contrato antigo deram lugar a três do novo. O demo
  de caixa parado ganhou um caso truncado para a tela exercitar o "+".
- **2026-08-21, caminho multi-cliente.** Decisão de arquitetura tomada com base em pesquisa
  (tendências 2025-2026 + análise do sistema): instância por cliente segue para o cliente
  atual e o próximo, rung 2 da escada Cloudflare quando o 2º cliente assinar. Executado no
  motor: `tenantId` no modelo de dados, validação pós-normalização, fila de exceção e
  reconciliação. Suíte do motor 129 → 143 testes, portão 469/469. Próximo passo concreto:
  gestão de usuário por cliente.
- **2026-08-21, decisões do dono.** Servidor morto marcado como protótipo não funcional
  (banner em `audit-engine/src/server.ts`, decisão de não rodar nem remover). Segunda cópia
  de dado real movida de `.archive\Verificacao-carteiras-legacy\` para
  `verificacao-carteiras\.archive\Verificacao-carteiras-legacy\` (quatro arquivos,
  `.gitignore` da instância conferido antes, nada entrou no git). Push dos três repos
  executado, hashes conferidos no remoto. Pesquisa de arquitetura multi-cliente
  (tendências 2025-2026 + análise do sistema) entregue para decisão da pendência 1.
- **2026-08-26, camada de exploração e decisão.** Ranking de Criticidade, resumo da casa no
  Dashboard, Rastreador de Ativos, comparador por carteira e histórico de verificação por
  carteira, todos sobre `platform-consolidado.js` (`window.AtlasConsolidado`), fonte única de
  decisão cruzada. Construído e testado em worktree separado (`ATLAS-sandbox/`, branch
  `feat/exploracao-p0-p1`) antes de portar, revisado de forma independente antes de codificar
  e antes de portar. Duas correções de defeito achadas no caminho: resíduo de ponto flutuante
  decidindo posição de carteira sem aparecer na tela (unificado em `divergenciaDe()`), e
  rótulo de cliente imprimindo `"demo"` como se fosse nome de casa. 602 → 659 checks, 278
  testes do app inalterados. Ver a seção "Camada de exploração e decisão, P0/P1" acima.
- **2026-08-26, demo publicado e dois P0 fechados.** Camada de exploração e decisão no ar em
  `demo.multi-assets.com`, versão `5d6410a3-a25d-44cb-a3fa-7f637fa0d95f`, Worker
  `app-verificacao-carteiras-atlas`, conta antiga. O pre-flight travou o voo antes da
  publicação e achou dois P0, os dois corrigidos em commit isolado: `deploy-cf.ps1` saindo
  sem exit code em falha, e travessão em `deploy-nova-conta.ps1`. Registrado também um falso
  positivo de segurança que quase virou alarme, o 200 em `/platform-data-real.js` que é
  fallback de página única do Worker, não overlay servido. Detalhe nas seções "Publicação do
  demo", "Dois P0 do pre-flight" e "Falso positivo registrado" acima.
- **2026-08-26, overlay real de cadastro.** Entregue a estrutura que tira a pendência
  cadastral da marca de estimativa: gerador `scripts/gerar-cadastro.mjs`, exemplo documentado
  em `docs/`, lista de onze tipos de documento do escritório espelhada em `PENDING_TYPES`, e
  `platform-cadastro.js` acrescentado às cinco listas de negação do produto mais a lista de
  overlays do `gen-index.mjs` da instância (essa última sem commit nesta rodada). Janela de
  validade só nos três tipos com regra objetiva; nos outros oito a pendência é declarada,
  nunca calculada. Lista ausente ou vazia não gera overlay de propósito, porque ausência de
  dado não é ausência de pendência. 659 → 688 checks, 278 testes do app inalterados. Ver a
  seção "Overlay real de cadastro" acima.
- **2026-08-26, Fase 2, Jul/26 vira mês de estabilidade.** `CURRENT_MONTH` avançou para
  `2026-07`, limpo por construção: 40 LIBERAR, divergência máxima 0,000000%, zero carteira
  material. Mês de abertura do demo virou constante própria (`OPENING_MONTH`, `2026-06`),
  porque abrir o demo num mês sem achado é o defeito que a trava do portão existe para
  impedir desde agosto. Composição do mês corrente passou a reaproveitar a do mês anterior,
  papel por papel, encerrando a compra e venda fabricada que o comparador de posição
  mostrava. Corrigida junto a nota INFO que alegava realocação tática num mês sem
  realocação nenhuma. 688 → 699 checks. Ver a seção "Fase 2" acima.
- **2026-08-26, Fase 2, modelo de cadastro por custodiante.** O overlay de cadastro deixou
  de ser lista de pendências e virou estado do cadastro: documento em dia sai do resultado,
  documento exigido pelo custodiante e ausente da lista vira Pendente por falta. Doze tipos
  de documento (entrou Declaração de IR, com janela de 12 meses), quatro custodiantes
  (Mirabaud, BTG, Bradesco Private, Órama), e três caminhos para descobrir o custodiante da
  carteira. Carteira sem custodiante conhecido não recebe cálculo por falta, de propósito.
  Os conjuntos obrigatórios embarcados são PROVISÓRIOS e não saíram do escritório, o real
  entra pelo bloco `custodiantes` da instância e substitui o padrão. Exemplo em `docs/`
  reescrito com três carteiras que provam o modelo inteiro, e o portão ganhou um teste fim a
  fim que roda o gerador de verdade e confere o overlay linha por linha. 699 → 719 checks.
  Ver a seção "Overlay real de cadastro" acima.
