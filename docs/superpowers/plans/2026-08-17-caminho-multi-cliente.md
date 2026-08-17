# Caminho para o segundo cliente

Data: 2026-08-17. Autor: sessão de trabalho com o dono. Status: aguardando decisão do dono.

## A pergunta

O ATLAS roda hoje para um escritório. Para rodar para dois, o dado de um não pode encostar
no do outro, em nenhuma camada. Hoje essa separação não existe em lugar nenhum do código.

A decisão é onde ela vai morar. Não é uma decisão de implementação, é de arquitetura, e ela
trava tudo o mais: enquanto não sair, qualquer construção nessa direção é aposta.

## O que já é verdade hoje

O produto é monocliente por desenho, e isso é honesto, não é bug. O dado real vive numa
instância separada (`verificacao-carteiras/`), fora do git do produto, servida por um Worker
com Cloudflare Access na frente validando JWT. Perímetro fechado em 15 de agosto de 2026,
`workers_dev = false`, URL técnica fora do ar.

Ou seja, **já existe um modelo de isolamento funcionando em produção, e ele é físico**: um
cliente, uma instância, um perímetro.

O que não existe é noção de cliente dentro do sistema. O backend em
`audit-engine/src/server.ts` não tem tenant no token, não tem dono no modelo de dados, e
grava em caminho global fixo. Ele também é código morto que nunca rodou, ver
`.claude/skills/atlas-sistema/ESTADO.md`. Ele não é ponto de partida, é passivo.

## As três opções

### A. Separação dentro do servidor Node

Terminar `server.ts`, criar armazenamento de usuário de verdade, colocar tenant no token e
no modelo de dados, separar caminho de gravação por cliente, e fechar os sete buracos
levantados (travessia de diretório, upload sem limite, pool que troca resposta entre
requisições, renovação sem revogação, entre outros). Cobertura de teste começa do zero.

Contra, e é decisivo: a stack do projeto é Cloudflare Workers, que não roda API de Node.
Esse servidor precisaria de hospedagem própria, uma superfície operacional nova que hoje não
existe. E o resultado seria reconstruir controle de identidade que o Access já faz.

Custo alto. Ganho sobre as outras duas, nenhum que eu consiga defender.

### B. Separação no perímetro Cloudflare

Manter o Access como porta e ensinar o Worker a rotear por cliente, com o dado de cada um
num prefixo próprio no R2 e grupo de acesso próprio no Access. Sem servidor Node, sem banco
de usuário para manter.

A favor: reaproveita exatamente o que já está deployado e provado. Identidade continua no
Access, que é feito para isso. Cabe na stack sem abrir frente nova.

Contra: exige desenhar o roteamento por cliente e a separação de armazenamento, e um erro
de roteamento é um erro que mistura cliente. Precisa de teste que prove isolamento, não só
que prove que funciona.

Custo médio.

### C. Uma instância por cliente

Replicar o modelo de hoje. Cada escritório novo recebe seu deploy, seu perímetro, seu
armazenamento. Isolamento físico, o mais forte que existe, e nenhum bug de código consegue
cruzar cliente porque não há caminho de código entre eles.

A favor: já está provado em produção hoje. Custo de engenharia perto de zero para o segundo
e o terceiro cliente. Enquanto o produto ainda está achando o encaixe de mercado, gastar
mês de engenharia em multi-tenant que talvez nunca escale é caro.

Contra: o custo por cliente é operacional e cresce linear. Cada deploy novo é mais uma coisa
para atualizar quando o produto muda. Some com a cadeia de gitlink de três repositórios e
isso fica pesado rápido. Meu palpite é que trava em torno de dez clientes, mas é palpite, não
medição.

Custo baixo agora, dívida operacional depois.

## Recomendação

**C para chegar ao segundo e terceiro cliente, com B como evolução natural quando a conta
operacional apertar. A não deveria acontecer.**

O raciocínio: C usa o que já funciona e não gasta mês de engenharia numa aposta de escala que
o produto ainda não provou precisar. B é para onde C evolui sem jogar nada fora, porque as
duas apoiam no mesmo Access e no mesmo Worker. A abre frente de hospedagem nova para
reconstruir identidade que já se tem.

Existe uma armadilha a nomear. Ligar o app no backend atual sem resolver isolamento seria
trocar um produto de arquivo local, hoje honestamente monocliente, por um servidor que
mistura dado de clientes diferentes no mesmo arquivo. Isso é pior que a situação de hoje, não
melhor. Nenhum caminho passa por aí.

## O que fazer no dia seguinte à decisão, em qualquer cenário

Independe da escolha, e é barato:

1. Marcar `audit-engine/src/server.ts` e o `scheduler/` como protótipo não funcional, ou
   remover. Hoje eles são passivo porque parecem terminados.
2. Decidir o destino da segunda cópia de dado real de cliente em
   `.archive/Verificacao-carteiras-legacy/`, apagar ou mover para a área de instância.
3. Fechar a cadeia de gitlink dos três repositórios, de baixo para cima, e corrigir os
   hashes vencidos registrados no `CLAUDE.md`.
4. Corrigir o rot já confirmado em `docs/produto.md` e `docs/manual-de-uso.md`, listado em
   `.claude/skills/atlas-sistema/SKILL.md`.

Nada disso depende de decisão de arquitetura, e tudo reduz a chance de alguém decidir errado
por ler documento vencido.
