# Validação do plano P0/P1, camada de exploração e decisão

Revisão independente do plano, feita no papel, sem alterar o produto. Data: 2026-08-26.
O plano propõe uma camada que responde "por onde eu começo o fechamento deste mês" e
encurta a cadeia Cliente → Carteira → Problema → Ativo → Divergência → Fonte → Ação.

## Veredito

O plano é aprovado para implementar, com quatro correções obrigatórias e uma condição
de aceite. Sem as correções, ele entrega telas que parecem funcionar mas enganam, o
que é pior que não entregar nada.

## O que o plano acerta

A decisão de não criar nota de 0 a 100 é correta. Já existe uma escala dessas no motor,
onde 100 é bom, e criar outra com o mesmo nome diria o oposto. A ordem por fato
observável, primeiro o status da verificação, depois o valor da divergência, depois o
achado bloqueante, depois o risco, é a ordem que um humano de retaguarda usaria na hora
de decidir.

A tolerância de divergência em 0,30% do patrimônio anterior é a mesma da regra de
continuidade que o produto já usa. Uma medida, uma régua, sem inventar segunda.

Distinguir carteira "limpa" de carteira "não avaliável" é o ponto mais importante do
plano. No fechamento mensal, não saber avaliar não é o mesmo que estar saudável, e o
plano trata os dois como coisas diferentes.

## O que a auditoria encontrou e o plano não previa

Quatro defeitos objetivos, cada um vira exigência para a implementação:

1. A camada pode ser construída inteira e não aparecer em lugar nenhum. Se não houver
   porta de entrada verificável, o sistema passa nos testes e o usuário não vê nada.
   Exigência: cada tela nova precisa ter acesso comprovado antes de ser declarada pronta.
2. Comparar dois meses onde um não tem extrato fabrica movimento de posição. Sem os
   dois extratos não existe o que comparar, e a tela não pode inventar entrada e saída.
   Exigência: mês sem dado em um dos lados significa comparação indisponível, com o
   motivo escrito, nunca movimento calculado.
3. Tratar carteira que ainda não existia no mês como "sem dado" suja o ranking. Uma
   carteira criada em maio não reprova em fevereiro. Exigência: o histórico respeita a
   data de criação da carteira.
4. Atalho que leva a lugar errado é pior que não ter atalho. Um botão de comparar que
   abre uma tela que ignora o pedido precisa sair até a comparação existir de verdade.

## O que ainda não está no plano executado

O plano previa quatro frentes que não foram construídas: o resumo da casa no painel
principal, a comparação entre meses por carteira, a busca cruzando dados e a aba de
fontes. O que existe hoje é a base de cálculo dessas quatro, exercitada por teste, mas
sem tela consumindo. A ordem sugerida de implementação: resumo da casa primeiro, pois
é o que o ritual mensal abre, depois a busca, depois a comparação por carteira, e a aba
de fontes por último.

## Isolamento e segurança

A camada não cruza dado de cliente. O cálculo vive em uma fonte única e as telas
consomem dessa fonte, então não há caminho de vazamento entre clientes por construção.
O modo de demonstração usa dados sintéticos, e o modo real só carrega dado real, nunca
os dois juntos. Nome de carteira, apelido e dado de cliente continuam fora do versionamento.

## Riscos que ficam mesmo depois das correções

A tela nova passou por build e por simulação de dados, não por uso real em navegador.
Vale abrir a rota nova no ambiente de demonstração antes de publicar.

A disponibilidade da inteligência é decidida por duas fontes. Se uma chegar sem a
outra, o que falta parece zero em vez de "não apurado". No fluxo real as duas são
geradas pelo mesmo processo, risco baixo, mas registrado.

A marcação de "não avaliável" depende de uma lista que hoje vive na tela de crédito.
Se essa lista mudar de critério, a marcação anda junto. É a mesma fonte para os dois
ambientes, a garantia é essa.

## Condição de aceite

Portão de verificação verde com saída real colada, e a rota nova aberta em navegador no
ambiente de demonstração antes de qualquer publicação.
