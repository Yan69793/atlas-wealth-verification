# LEIA PRIMEIRO

Você chegou no ATLAS sem contexto. Esta pasta existe para te orientar em poucos minutos.
Leia este arquivo inteiro antes de tocar em qualquer coisa. São três arquivos só.

| Arquivo | Para que serve |
|---|---|
| `LEIA-PRIMEIRO.md` | este, orientação e as regras que quebram coisa |
| [[ESTADO-ATUAL]] | onde o projeto está hoje, com data-base. **Fonte única.** |
| [[MAPA]] | onde encontrar cada coisa, feito para busca por texto |

## O que é o ATLAS em cinco linhas

Produto de conferência de carteira de investimento, vendido para escritório de gestão de
patrimônio. Recebe o relatório mensal do custodiante, compara com o mês anterior, aplica sete
regras e diz se a carteira pode ir para o cliente ou se tem número sem explicação.

O posicionamento é "não mostre o patrimônio, prove o número". Todo achado carrega a conta que
o gerou, nunca um rótulo solto. É isso que o comprador paga, e é a coisa mais fácil de
destruir sem perceber.

Não é consolidador de investidor final, não é CRM, não é plataforma operacional de escritório,
não é contabilidade de fundo. Essas exclusões são identidade, não lacuna.

## As quatro regras que quebram coisa de verdade

### 1. Dado de cliente nunca entra no git do produto

Este repositório é o produto. Dado real vive na instância, em `verificacao-carteiras/`, fora
do git do produto. Nome de carteira, apelido, código real e caminho de pasta de cliente não
entram em teste, em documentação, em mensagem de commit, nem em resposta colada em ticket.

Se algo suspeito aparecer em `git status`, pare e conserte o `.gitignore` antes de seguir.
Sujeito a LGPD, não é preciosismo.

### 2. A ordem de import em `src/main.jsx` é contrato

Tokens, parsers, dados, utils, páginas, shell. Fora de ordem o app abre em tela branca.
`tests/validate.js` trava isso de propósito.

Overlay de dado real é script de runtime e nunca entra no bundle. Importar overlay como
módulo quebra o contrato de build.

### 3. Nada é declarado pronto sem o portão

```
npm test
```

Cole a saída real. Se falhar ou não puder rodar, diga isso explicitamente. Proibido escrever
"funcionando" sem saída colada. Contagem de referência em [[ESTADO-ATUAL]].

### 4. Não reintroduzir senha no cliente

A senha fixa que existia no navegador foi removida porque sinalizava proteção sem proteger.
`tests/validate.js` falha se ela voltar. O perímetro é do deploy, Cloudflare Access na frente.

## Leia o código antes de citar o documento

Neste projeto a documentação de produto atrasa em relação ao código, e atrasa exatamente nos
pontos que mais interessam para decidir prioridade. Isso não é hipótese, foi medido em 17 de
agosto de 2026, quatro afirmações vencidas encontradas em documentos oficiais.

Consequência prática para você: quando a pergunta for "o que falta" ou "isso já existe", abra
o código. A lista de rot conhecido está em [[MAPA]].

Erro real cometido nesta mesma sessão, guardado como aviso. Alguém viu pastas chamadas `auth`
e `middleware` mais um `server.ts` e concluiu que havia backend com autenticação pronto,
contrariando a documentação. Estava errado. O código existe, compila, e nunca rodou uma única
vez. Estrutura de diretório não é prova de comportamento.

## Como não estragar esta pasta

Regra única e dura: **um assunto, um arquivo, zero cópia.** Se um fato vive em
[[ESTADO-ATUAL]], os outros arquivos apontam para lá em vez de repetir. O projeto já sofre de
verdade espalhada em vários lugares, e cópia é como isso começa.

Se você mudou algo no sistema, atualize [[ESTADO-ATUAL]] no mesmo trabalho, não depois. Os
gatilhos que obrigam a atualizar e os comandos que colhem o estado do disco estão lá dentro.

## Sobre Obsidian

Os arquivos são markdown comum com link em colchete duplo, então abrem como cofre do Obsidian
sem nenhuma conversão, se um humano quiser navegar pelo grafo. Mas o Obsidian não é a memória
do projeto, é só uma forma de ler. A memória é o texto. Agente acha por busca, não por grafo.
