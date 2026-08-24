# Calibração dos limiares da camada de inteligência

> **Aplicado em 24 de agosto de 2026 (Entrega B.3).** Os 8 valores da tabela em
> §4.3 e os 2 ajustes estruturais que ela recomenda (severidade relativa ao
> limiar em `CONCENTRACAO_ATIVO`/`FATOR`, exclusão de `classeCanonica=liquidez`
> em `CONCENTRACAO_EMISSOR`/`FATOR`) foram aplicados em `thresholds.ts` e
> `cross-portfolio.ts`, publicados no demo público. Portão após a aplicação:
> `602/602 checks OK`, `278 testes, 73 suites, 278 pass, 0 fail, 0 skipped`
> (mesma contagem de antes — o passe reajusta valor dentro de teste e fixture
> já existentes, não adiciona nem remove check). Detalhe em
> `ESTADO/ESTADO-ATUAL.md`, seção "Entrega B.3". O corpo do documento abaixo
> continua sendo o registro da medição original, sem alteração.

Medição feita em 24 de agosto de 2026 sobre o histórico real da casa, 37 meses
(junho de 2023 a junho de 2026), 105 carteiras no último mês, R$ 2,04 bilhões.
Nenhum limiar foi alterado: este documento é recomendação para decisão do dono.

Sem nome de carteira, sem nome de ativo, sem nome de emissor. O detalhe
identificável está nos mapas da instância, fora do git.

---

## 1. Como o dado real chegou até o motor

> **Correção, 24/08 (mesmo dia).** A primeira versão desta seção dizia que o
> pipeline de snapshot não tinha adaptador para o book em PDF. **Está errado.**
> `audit-engine/src/snapshot/adapters/pdf.ts` existe, está registrado no
> dispatcher e reusa o extrator Python do fluxo mensal. O que estava quebrado era
> a dependência `pdfplumber`, ausente nos três interpretadores Python da máquina
> apesar de `CLAUDE.md` registrar que fora instalada em 14/08. Reinstalada, o
> caminho real roda ponta a ponta: 111 carteiras em abril e 108 em maio de 2026,
> com 87,5% de cobertura de emissor. A ponte descrita abaixo continua tendo
> serventia, porque só ela alcança os 37 meses de histórico (os PDFs no disco
> são de dois meses), mas **não é mais o único caminho para o dado real**.

Só existem PDFs de dois meses no disco. O histórico completo, 37 meses, existe
como `audits/<AAAA-MM>/audit.json`, artefato do fluxo MENSAL, com schema
diferente do snapshot. Para calibrar sobre a série inteira a medição usou uma
ponte, que roda fora da árvore do produto e não faz parte dele. Ela faz três
coisas, e as três precisam ficar registradas porque mudam a leitura dos números:

1. **Só linha de ativo entra.** O book traz subtotal por classe (`type: 'classe'`)
   junto com a posição individual (`type: 'ativo'`). Somar os dois contaria o
   patrimônio duas vezes.
2. **Cada mês vira um snapshot diário datado no último dia do mês.** O período
   mensal desliga metade do motor: a série mensal não é enumerável e o cálculo de
   dias corridos não sabe ler `AAAA-MM`. Com data de fim de mês, meses
   consecutivos ficam a 28-31 dias e a regra de deterioração roda de verdade.
3. **O vencimento sai do NOME do ativo** quando ele carrega a data escrita. Não é
   dedução, é leitura. Sem isso a regra de vencimento não teria o que medir.

O `normalize()` que produz os snapshots é o do produto, importado do `dist`.
Nenhuma lógica foi reimplementada: uma cópia mediria o comportamento da cópia.

**Limite honesto desta medição:** o histórico é mensal. Os limiares de
deterioração e de caixa foram desenhados para série diária. O que se mede aqui é
o comportamento mês a mês, que é o horizonte em que a casa efetivamente opera
hoje, mas não é idêntico ao diário.

---

## 2. Cobertura do ativo-map

O mapa foi preenchido por regra explícita e auditável, nunca por palpite. Cada
entrada preenchida carrega o campo `_origem` dizendo qual regra a escreveu.

### Números

| | valor |
|---|---|
| entradas no mapa | 1.784 (663 vivas no último mês, 1.121 aposentadas e preservadas) |
| **emissor por contagem de ativo vivo** | **577 de 663 = 87,0%** |
| **emissor por fração do PL** | **89,4%** |
| classe canônica | 94,3% dos ativos, 90,0% do PL |
| moeda | 89,7% dos ativos, 89,6% do PL |
| região | 89,3% dos ativos, 89,5% do PL |
| indexador | 67,6% dos ativos, 52,4% do PL |
| taxa contratada | 47,8% dos ativos, 14,7% do PL |
| grupo econômico | 9,4% dos ativos, 3,9% do PL |
| emissores distintos reconhecidos | 301 |
| grupos econômicos declarados | 3 |

A meta era 85% do PL, idealmente 90%. **Ficou em 89,4%.**

A cobertura se sustenta em toda a série, não só no último mês: entre 78% e 94%
nos 37 meses, porque as regras leem o nome do papel e não a data.

### Quanto do PL ficou avaliável

**98 das 105 carteiras** passam do corte de 40% de cobertura de emissor e são
avaliáveis num evento de crédito. Antes do preenchimento eram **zero**: sem mapa,
100% do PL não tinha emissor e o motor calava sobre a casa inteira.

As 7 carteiras restantes não estão limpas, estão no escuro, e é assim que a tela
as reporta.

### A decisão que move o número: cota de fundo tem emissor?

Sim, e o emissor é o próprio fundo. Fundo é pessoa jurídica com CNPJ e patrimônio
próprios, e um calote de um banco não atinge quem tem cota de fundo administrado
por ele. Deixar nulo seria declarar ignorância sobre a posição mais bem conhecida
da carteira e jogaria carteira inteira para "não avaliável" no dia do evento.

A consequência foi medida e está na seção 4: o alerta de concentração por emissor
passa a disparar em quem tem muito de um fundo só, e 70% do volume atual vem daí.
São dois achados diferentes saindo na mesma lista com o mesmo texto.

### O que ficou sem cadastro, e por quê

| fração do PL | ativos | motivo |
|---|---|---|
| 9,34% | 1 | um único veículo que o nome não identifica como fundo, papel nem ação |
| 1,11% | 67 | estruturas offshore com nome em código, veículos de private equity e venture capital, e um certificado estruturado cujo nome não diz o emissor |
| 0,11% | 18 | papel de crédito cujo identificador de emissor não está no dicionário |
| **10,56%** | **86** | **total** |

**Um único ativo responde por 88% de todo o buraco.** Ele aparece em duas
carteiras, uma delas inteiramente nele. Resolvido esse item, a cobertura vai de
89,4% para 98,7%. É a pergunta de maior retorno para o dono responder.

Nenhum desses 86 recebeu emissor deduzido. O caso mais claro do porquê: dois
papéis diferentes na carteira carregam a palavra "Tietê" no nome e são de
empresas distintas. Chutar ligaria evento de crédito a carteira alheia.

### Grupo econômico

Preenchido em 62 ativos, três grupos, todos por relação de controle documentada.
Um caso conhecido de duas empresas que já foram o mesmo grupo e hoje são riscos
separados ficou **de fora de propósito**: agrupar seria pior do que não agrupar.

### Preservação do trabalho humano, provado

Marcamos uma entrada com quatro coisas que costumam sumir num "regenerar": um
valor que substitui o da regra, um booleano `false`, um número `0` e uma chave
que o motor nem conhece. Rodamos `snapshot ativo-map` de novo:

```
  OK   emissorNome = "TESOURO NACIONAL (conferido a mao)"
  OK   cobertoFGC = false
  OK   liquidezDias = 0
  OK   revisadoPor = "dono-2026-08-24"
entradas antes 1784, depois 1784
PRESERVACAO OK
```

---

## 3. Dois defeitos encontrados no caminho

### 3.1 O mesmo papel escrito de dois jeitos

O extrator do book ora cola as palavras, ora preserva os espaços. São o mesmo
papel, e para o motor são dois ativos e dois emissores.

**783 grafias duplicadas ao longo da série, para 617 papéis canônicos. No último
mês isolado, 60 papéis com grafia dupla somando 29% do PL da casa.** O maior deles
tinha 7,58% do PL numa grafia e 1,54% na outra: a concentração real de 9,12%
aparecia partida em duas linhas menores.

**O efeito é sempre o mesmo: concentração SUBESTIMADA.** Toda a calibração da
seção 4 seria inválida sem corrigir isto antes.

Corrigido com o `name-map` que o `normalize` já aplica a nome de ativo. Nenhum
código do produto mudou. O critério de fusão é igualdade da sequência
alfanumérica, não semelhança: ou os dois nomes têm exatamente os mesmos
caracteres significativos na mesma ordem, ou não se fundem.

### 3.2 O `ativo-map` se reseta em silêncio quando o arquivo perde a chave `mappings`

Descoberto por acidente, e da pior maneira: um arquivo gravado com estrutura
errada mas JSON válido fez o comando regenerar tudo do zero. Ele relatou
`663 novo(s), 0 com emissor` e saiu com sucesso. O trabalho de preenchimento
inteiro tinha ido embora, com mensagem verde.

A trava existente cobre arquivo **ilegível** (`nao e JSON valido`), não arquivo
que parseia e está estruturalmente errado. São coisas diferentes, e a segunda é a
que acontece na prática, porque quem edita o mapa à mão usa uma ferramenta que
reescreve o arquivo inteiro.

Correção proposta, fora do escopo desta entrega: se o arquivo existe, parseia, e
não tem `mappings` como objeto, **abortar** em vez de regenerar. Nunca tratar
"não achei o que esperava" como "então começo do zero".

**Nota operacional relacionada:** o `ativo-map` contém chaves que diferem apenas
por caixa. Isso é JSON legal e o motor lê sem problema, mas o `ConvertFrom-Json`
do PowerShell recusa. **Não editar o mapa por PowerShell.**

### 3.3 `_ausenteDesde` nunca é limpo

Ativo que sai da base fica marcado com a data em que sumiu. Se ele voltar no mês
seguinte, a marca permanece. O campo é ignorado pelo motor, então não quebra
nada, mas mente para quem lê o arquivo.

---

## 4. Os 12 limiares medidos

### 4.1 O que o radar produz hoje, sobre dado real

37 meses, todas as carteiras, limiares atuais:

| sinal | alertas | por mês | % das carteiras acesas no mês | baixa / média / alta | duração mediana | pares acesos em ≥ 30 dos 37 meses |
|---|---|---|---|---|---|---|
| CONCENTRACAO_ATIVO | 2.758 | 74,5 | 80% | 0 / 659 / 2.099 | 5 meses | 26 |
| CONCENTRACAO_EMISSOR | 4.795 | 129,6 | 143% | 0 / 2.564 / 2.231 | 9 meses | 35 |
| CONCENTRACAO_FATOR | 2.974 | 80,4 | 81% | **0 / 0 / 2.974** | 12 meses | 42 |
| LIQUIDEZ_BAIXA | 122 | 3,3 | 4% | 1 / 1 / 120 | 11 meses | 0 |
| VENCIMENTO_CONCENTRADO | 14 | 0,4 | 0% | 0 / 8 / 6 | 1 mês | 0 |
| DETERIORACAO_PL | 174 | 4,7 | 3% | 0 / 96 / 78 | 1 mês | 0 |

**O número que resume tudo: 292,9 alertas por mês, 97% das carteiras acesas, e
apenas 13% dos alertas de cada mês são novos.** Uma tela que acende 101 de 105
carteiras e repete 87% do conteúdo do mês passado não ordena nada. O assessor
para de abrir em três semanas.

### 4.2 De onde vem o volume

**Concentração por emissor, 4.795 alertas:**

| origem | alertas | % |
|---|---|---|
| fundo de liquidez / caixa | 3.366 | 70% |
| renda fixa (título público) | 784 | 16% |
| crédito privado | 203 | 4% |
| previdência, multimercado, ações, outros | 442 | 9% |

**Só 21% do volume é risco de crédito.** Os outros 79% são concentração em
veículo, e a maior fatia é caixa. Dizer "80% do patrimônio depende de um único
emissor" sobre carteira parada em fundo de liquidez é tecnicamente verdade e
operacionalmente ruído.

**Concentração por fator, 2.974 alertas:** 2.299 (77%) são `classe = liquidez`.
Estar em caixa não é concentração de fator, e já existe regra própria para caixa
parado.

### 4.3 A tabela de recomendação

| limiar atual | comportamento observado | problema | sugerido | justificativa |
|---|---|---|---|---|
| `coberturaAfirmaMin` = 0,70 | emissor 89%, classe 90%, moeda e região 90% passam. Mas `prazoAnos` fica em 27,9% e `liquidezDias` em 0%, e como a faixa global é a PIOR das sete, ela é `insuficiente` em 100% dos meses, em toda carteira | o número está certo, o conjunto medido é que está errado. Fundo não tem vencimento e prazo de resgate não está no book: os dois atributos são inalcançáveis por construção | **manter 0,70.** Tirar `liquidezDias` de `ATRIBUTOS_MEDIDOS` (nenhum motor o consome hoje, mesma razão de `taxaContratada` e `cobertoFGC`) e medir `prazoAnos` com a mesma lógica de `coberturaVencimento`, que já dá por coberta a classe sem vencimento | indicador global que fica vermelho para sempre não informa nada. As duas correções são de medição, não de limiar |
| `coberturaRessalvaMin` = 0,40 | 98 de 105 carteiras passam; as 7 que ficam abaixo são genuinamente opacas. Em 37 meses a cobertura da casa nunca caiu abaixo de 78% | nenhum | **manter 0,40** | o corte faz exatamente o que promete: separa carteira que o motor lê de carteira que ele não lê |
| `radarConcentracaoAtivoPct` = 0,20 | 74,5 alertas/mês, 80% das carteiras. Nunca produziu severidade "baixa" em 2.758 alertas. 26 pares acesos em quase toda a série | o limiar de 20% fica acima do corte de severidade baixa (10%), então a faixa é inalcançável. E o sinal é estado permanente, não evento | **0,30**, e severidade relativa ao próprio limiar em vez dos cortes genéricos | a 30% o volume cai para 56,7/mês sem perder caso relevante. A escada precisa de três degraus dentro da faixa em que a regra dispara, senão só diz "alta" |
| `radarConcentracaoEmissorPct` = 0,15 | 129,6 alertas/mês, mais de um por carteira por mês. 70% em fundo de caixa. 35 pares permanentes | mistura risco de crédito com concentração em veículo, e o caixa domina | **0,25**, e **excluir a classe `liquidez`** da regra, com o mesmo mecanismo do `FATOR_BASE` que já tira BRL e Brasil | só excluir liquidez leva de 129,6 para 38,6/mês. Com 0,25 fica perto de 22/mês. E separa duas decisões que hoje saem com o mesmo texto |
| `radarConcentracaoFatorPct` = 0,50 | 80,4 alertas/mês. **Os 2.974 alertas saíram "alta". Nenhum "baixa", nenhum "média".** 77% são `classe = liquidez` | a severidade usa os cortes genéricos (10% e 30%) e a regra só dispara acima de 50%: é matematicamente impossível sair outra coisa. Uma escala de três degraus que só produz um não informa | **0,70**, excluir `classe = liquidez`, e severidade relativa ao limiar | a 70% o volume vai a 55,4/mês; sem liquidez, a 18,2/mês. O defeito de severidade é independente do número e precisa ser corrigido de qualquer forma |
| `radarLiquidezMinPct` = 0,05 | 3,3 alertas/mês, 9 carteiras distintas em 37 meses, duração mediana de 11 meses. 120 de 122 saíram "alta" | volume está bom. A severidade satura: carteira com 0% de liquidez dá déficit de 100%, e quase todo caso vira "alta" | **manter 0,05**, corrigir a saturação da severidade e tratar como estado permanente e não como alerta novo todo mês | a casa tem muito caixa por perfil, então o piso raramente é rompido, e quando é, é situação estrutural. Mudar o número não resolve o que incomoda |
| `radarVencimentoConcentradoPct` = 0,20 com janela de 30 dias | 14 alertas em 37 meses. Em 26 dos 37 meses a regra não disse nada | quase muda. A janela é o gargalo, não o percentual | **0,15 com janela de 90 dias** | medido: 20%/30d dá 0,4/mês; 15%/90d dá 1,4/mês; 10%/90d dá 2,5/mês. 90 dias é o mesmo horizonte de `caixaParadoJanelaDias` e o máximo de `maturidadeJanelas`, e é o prazo em que dá para reinvestir com calma |
| `radarDeterioracaoPct` = 0,10 com janela de 30 dias | 4,7 alertas/mês, 67 carteiras distintas, duração mediana de 1 mês, **zero pares permanentes** | nenhum | **manter 0,10 / 30 dias** | é a regra mais bem comportada do conjunto: acende, resolve, não repete. É o padrão que as outras deveriam imitar |
| `creditoPerdaConfirmada` = 10% alta / 2% média | simulação de calote no maior emissor de crédito da casa: 51 carteiras reportadas, 43 alta, 8 média. No segundo e terceiro emissores mais espalhados: 30 e 25 carteiras, quase todas média | nenhum, para o uso a que serve | **manter 10% / 2%** | num calote o dinheiro já foi e ser barulhento é o comportamento certo. A escada separa bem os três casos simulados. Foi decisão explícita do dono e a medição não a contradiz |
| `creditoPerdaConfirmadaMinAbs` = R$ 50.000 | promove 389 de 1.177 pares de baixa para média, ou seja **um terço de toda a casa** | está abaixo do piso de ruído deste livro. A posição mediana por par emissor-carteira é de R$ 232 mil | **R$ 250.000** | medido: R$ 50 mil promove 389 pares, R$ 100 mil promove 299, R$ 250 mil promove 115, R$ 500 mil promove 56. R$ 250 mil deixa a regra fazendo o que foi desenhada para fazer, resgatar o caso que o percentual silencia, sem promover a terça parte do livro |
| `creditoPisoExposicao` = 0 / 0,5% / 1% | o piso de 0,5% deixa passar 91% dos pares; o de 1% deixa passar 80% | os pisos não filtram nada. Um rebaixamento de rating atingiria 10 dos 11 emissores médios de cada carteira | **0 / 2% / 5%** | medido sobre a distribuição real: 2% do PL corta para 59% dos pares, 5% para 32%. Perda confirmada continua sem piso, como decidido. A mediana da exposição por par é 2,52% do PL, então um piso de 0,5% está uma ordem de grandeza abaixo do que o livro considera posição |
| `creditoVariacaoMaterialPct` = 0,20 | 36.897 comparações mês a mês: 84,3% dos pares variam menos de 5%, e só 6,4% passam de 20% | nenhum | **manter 0,20** | o limiar deixa `acompanhamento` ser o estado dominante e reserva `agravado` e `melhorado` para movimento de verdade. Um valor mais baixo faria todo evento acompanhado trocar de estado todo mês e mataria a distinção |

### 4.4 O que a mudança produz junta

| cenário | alertas/mês | carteiras acesas |
|---|---|---|
| hoje | 292,9 | 97% |
| hoje, sem a classe liquidez | 139,8 | 90% |
| limiares propostos | 194,3 | 80% |
| propostos + sem liquidez | 94,5 | 70% |
| **propostos + sem liquidez + só o que mudou** | **15,5** | **13%** |

Composição do último cenário: 7,9 concentração em ativo, 3,3 deterioração de PL,
2,2 concentração por emissor, 1,3 concentração por fator, 0,4 vencimento, 0,3
liquidez. Distribuído entre as seis regras, sem nenhuma dominando.

**O corte por novidade vale mais que todos os limiares somados.** Sozinho ele
leva de 94,5 para 15,5. É a mesma lição da Entrega B, onde a tela de eventos abre
pelo que mudou: o radar precisa do mesmo estado temporal que o crédito já tem.

---

## 5. Pendências reais

1. **Um único ativo, 9,34% do PL, sem identificação.** Resolver leva a cobertura
   de 89,4% para 98,7%. Só o dono pode dizer o que ele é.
2. **`liquidezDias` não é preenchível a partir do book.** Prazo de resgate sai do
   regulamento do fundo ou do campo D+ do custodiante, e não temos nenhum dos
   dois. Enquanto não vier, o atributo fica em 0% e não deve pesar na cobertura.
3. **`pdfplumber` some do ambiente e a suíte não acusa.** O adaptador de PDF
   existe e funciona, mas depende de um pacote Python instalado à mão na
   máquina. Ele havia sumido, e o efeito era silencioso: a suíte de parity PDF
   contra Excel passava a ser PULADA, e o portão continuava relatando "todos os
   testes passaram" com um teste a menos. Vale prender a versão num
   `requirements.txt` e falhar em vez de pular quando a dependência não estiver
   lá.
4. **A dedução de emissor é de nome, não de cadastro.** Funciona porque o
   custodiante escreve o emissor no nome do papel. Custodiante novo com outra
   convenção derruba a cobertura sem avisar. Vale um teste que acuse queda de
   cobertura entre meses.
5. **Os defeitos da seção 3** não foram corrigidos: são mudança de produto e
   ficam para decisão.
6. Este documento **não alterou nenhum limiar**. `thresholds.ts` está como estava.
