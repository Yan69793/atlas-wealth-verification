# ATLAS Wealth Verification

Plataforma de verificação mensal de carteiras de investimento.

## O problema

Todo mês o custodiante envia um book por carteira. Alguém precisa abrir cada um
e conferir se o patrimônio bate com o do mês anterior mais as movimentações, se
a rentabilidade reportada é compatível com a performance implícita, se o
come-cotas incidiu quando deveria, e se a alocação saiu do que o mandato
permite.

Com cem carteiras isso consome uma semana por mês, sempre sob prazo. O erro que
escapa chega ao cliente com a assinatura da casa.

O ATLAS faz essa conferência em minutos e mostra o que sobrou para um humano
olhar.

## O que ele faz

Recebe os books do mês, compara com o mês base, aplica sete regras de auditoria
e classifica cada carteira em três estados:

| Estado | Significado |
|---|---|
| LIBERAR | Nenhum achado. Pode seguir para o cliente. |
| LIBERAR COM ALERTA | Achado não bloqueante, ou limitação conhecida da fonte. |
| CORRIGIR | Divergência que precisa de ação antes do envio. |

A conta que sustenta tudo é a conciliação de patrimônio:

```
PL esperado = PL base + compras − vendas + eventos − impostos
```

Quando o PL reportado não bate com o esperado, há dinheiro sem explicação, e a
carteira não sai.

## As sete regras

| Regra | O que pega |
|---|---|
| Conciliação de PL | Patrimônio reportado diverge do esperado pela fórmula acima |
| Continuidade | PL de abertura não bate com o fechamento do mês anterior |
| Rentabilidade | Rentabilidade reportada ausente ou zerada onde deveria existir |
| Spread de rentabilidade | Rentabilidade reportada diverge da performance implícita |
| Cotas sem operação | Valor de cota variou sem compra, venda ou evento que justifique |
| Come-cotas | Imposto semestral não incidiu em fundo sujeito a ele |
| Alocação | Classe de ativo saiu do intervalo esperado entre um mês e outro |

Cada achado vem com o número que o gerou, e não apenas com um rótulo. Quem
recebe o alerta consegue discutir a conta.

## O que mais tem dentro

O radar de risco calcula um score por carteira em cinco dimensões: mercado,
concentração, liquidez, suitability e risco operacional. Junto vêm quatro
cenários de stress, entre eles alta de juros, queda de bolsa e crise de
liquidez.

A aba de tendência rastreia recorrência ao longo de toda a série. Isso importa
porque um achado isolado e um achado que se repete há nove meses pedem respostas
diferentes: o primeiro é uma exceção, o segundo indica que algo no processo não
foi corrigido. A ordenação é por persistência, não por gravidade pontual.

Há ainda receita por gestor e ROA, com detecção de anomalia de fee, e uma tela
de comparação que põe carteiras lado a lado por composição, rentabilidade e
risco.

A importação aceita CSV e XLSX de forma estável, e PDF em beta para books no
layout de relatório mensal. A extração roda no próprio navegador, então nenhum
dado sai da máquina.

## Como funciona por dentro

São dois componentes, com fronteira nítida.

O motor de auditoria é Node com TypeScript. Lê os books, normaliza para um
formato único, aplica as regras e escreve um arquivo de auditoria por mês. É
onde mora a inteligência do produto, e é testado como tal.

A interface é um app React que roda sem etapa de build. Abre no navegador, lê o
arquivo de auditoria e apresenta. Não há bundler nem pipeline de deploy para
manter.

O motor é agnóstico de custodiante por desenho. Cada formato de entrada tem seu
parser e todos produzem a mesma estrutura, então uma regra nova passa a valer
para todas as fontes de uma vez.

## Separação entre produto e dado

Este repositório não contém dado de cliente.

A instância que roda com dado real é um repositório separado e privado, que
consome este como dependência versionada. O dado vive lá, sob uma política de
negar por padrão: nada entra no controle de versão a menos que alguém libere
explicitamente.

Quem clona este repositório recebe o sistema completo com dados sintéticos. O
app funciona, as telas populam e as regras rodam, sem nenhuma carteira, nome ou
patrimônio real.

Os testes falham se um arquivo de dado real aparecer onde não deve, então a
fronteira é checada a cada rodada.

## Estado atual

Protótipo funcional. As regras rodam sobre dados reais em uso interno, com três
anos de histórico e mais de cem carteiras por mês.

O que falta para virar produto de prateleira:

Autenticação de verdade. A senha atual é verificada no navegador e guardada no
localStorage, o que serve para demonstrar a tela e nada além disso.

Backend. Hoje o dado é lido de arquivo local. O caminho desenhado é servir por
API autenticada, com o dado fora do bundle.

Benchmark de mercado. O motor compara a rentabilidade reportada com a
implícita, mas não contra CDI, IBOV ou IPCA. Isso exige uma fonte externa que
ainda não existe aqui.

Quantidade e preço unitário. O parser extrai valor financeiro por ativo, sem a
quantidade de cotas nem o preço. Relatório de performance por posição depende
disso.

## Rodar

```
npm run serve      # http://localhost:7821
npm test           # suíte completa
```

Sem dado real o app roda em modo demonstração, que é o comportamento esperado.
