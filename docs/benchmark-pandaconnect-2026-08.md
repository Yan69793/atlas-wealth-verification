# PandaConnect, segunda leitura — delta sobre o benchmark de julho

Data: 2026-08-06
Fonte: `https://pandaconnect.com/family-offices-pt/` (página PT do segmento Family Offices)
Antecedente: [`benchmark-pandaconnect.md`](benchmark-pandaconnect.md) (2026-07-23)

---

## 1. O achado que domina o resto

A instância do cliente não está rodando o produto. O submodule `core/` de
`verificacao-carteiras/` está preso em `recovered-real-data-fixes` (c2fe4e7, 18/07),
que bifurcou de 7b61e89 em 15/07 e **está 36 commits atrás de `origin/master`**.

Entre os 36, o commit que fecha metade do benchmark de julho:

```
cd9d382 benchmark PandaConnect: implementa G01 G02 G03 G09 G10 G11 G16
681c476 feat(benchmark): IBOV e IPCA reais no relatorio, comparacao de periodo
```

Efeito concreto medido, 15 dos 20 arquivos de plataforma divergem:

| Recurso | ATLAS (produto) | `core/` (o que o cliente usa) |
|---|---|---|
| Benchmarks | CDI, IPCA, IBOV | só CDI |
| `riskAttribution()` | existe | não existe |
| `downloadCSV` / `downloadJSON` | existem | não existem |
| Exportar no Comparativo | `window.print()` real | toast "disponível na versão completa" |

O `.gitmodules` declara `branch = master`. Ninguém percebeu por três semanas porque
o app monta, o dashboard renderiza e nenhum erro aparece. É o mesmo modo de falha
que `sync-overlays.mjs` já documenta para os overlays, um nível acima.

**Isso não é um gap de produto, é entrega parada no meio do caminho.** Qualquer
feature nova vale menos do que fechar esses 36 commits.

### Guarda instalada

`verificacao-carteiras/scripts/verificar-core.mjs` detecta e bloqueia. Roda offline
com os refs locais, aceita `--fetch` quando há rede, e sai 1 quando `core/` está em
ramo diferente do declarado, atrás do ramo declarado, ou com working tree suja.
Ligado ao `ciclo-mensal.ps1` logo depois da checagem de presença do submodule,
com válvula `-IgnorarDriftCore` para fechamento urgente.

Uma armadilha que a guarda cobre porque quase passou batido: sem `fetch`, o clone
dizia "2 commits atrás". Depois do fetch, 36. A guarda compara a data do ref remoto
com a do HEAD e avisa quando o ref remoto é o mais velho dos dois.

---

## 2. Bug corrigido no caminho

`core/platform-data.js` tinha uma edição não commitada que anualizou o ROA e, junto,
apagou a declaração de `seg` dentro de `clientRevenueRows()`. A linha 1126 continuava
lendo `segment: seg`.

Provado por execução, não por leitura:

```
core (instancia do cliente): ReferenceError: seg is not defined   (mes 2026-05)
ATLAS (raiz do produto): OK -- 40 linhas em 2026-11
```

`platform-receitas.jsx:331` chama `D.clientRevenueRows()` dentro de um `useMemo`,
então a página Receitas & ROA quebrava no render. Linha restaurada, reexecutado,
ambos passam. As outras duas edições não commitadas (`platform-carteira.jsx` e
`platform-receitas.jsx`, rótulos a.m. → a.a.) estão coerentes e ficaram como estavam.

---

## 3. O que a página PT promete e o benchmark de julho não capturou

A leitura de julho foi feita sobre as páginas institucionais em inglês. A página PT
do segmento Family Offices repete três vezes uma promessa que não aparecia lá.

### N01 — Ativos não bancáveis (P0 de posicionamento)

> "administração completa de investimentos, abrangendo ativos financeiros e não financeiros"

Aparece no hero, no bloco de SFO e no de MFO. É a promessa central da página, não um
detalhe. O ATLAS só enxerga posição custodiada. Imóvel, participação societária,
private equity direto, obra de arte e aeronave ficam fora, e num family office
brasileiro esse pedaço costuma ser a maior fatia do patrimônio.

Consequência prática, a conciliação de PL do ATLAS concilia o pedaço bancável e
chama isso de PL. Para o cliente que enxerga o patrimônio inteiro, o número está
certo e incompleto ao mesmo tempo.

Não implementei porque exige decisão de produto sobre origem do dado. Ativo não
bancável não tem extrato mensal, tem laudo anual e marcação por evento. O schema
muda, a fórmula de conciliação muda, e a tolerância de 0,3% do PL não se aplica a
um imóvel remarcado uma vez por ano.

### N02 — Multimoeda, onshore e offshore consolidado (P0)

> "entre bancos, custodiantes, moedas e gestores"
> "todos os investimentos onshore e offshore de forma consolidada em uma única plataforma"

O ATLAS formata tudo em BRL de forma fixa. `platform-utils.jsx:19` tem
`currency: 'BRL'` hardcoded, e o mesmo em `platform-data.js:577` e
`platform-tendencia.jsx:104`.

O dado real da instância já tem posições denominadas em dólar, quatro delas
identificadas na conferência de julho de 2026. Os códigos ficam fora deste
documento de propósito: são composição de carteira de cliente, e este
repositório é o do produto. Quem precisar deles busca na instância.

**Validar antes de mexer.** Se o SmartBrain já entrega esses saldos convertidos para
BRL, o display está correto e o gap é só de exibição da moeda de origem. Se entrega
em USD, o PL consolidado está somando moedas diferentes e isso é erro de cálculo,
não de layout. Não dá para decidir isso pelo código, precisa do book.

### N03 — Desempenho do gestor (P1)

> "Visão geral aprimorada do desempenho do gerente"

O ATLAS já tem o vínculo carteira → gestor (`getManagerForCode`, `managers-from-planilha.json`,
`roaTarget` por gestor) mas usa isso só para receita e ROA. Não existe visão de
performance do gestor, que é o outro lado da mesma tabela. Quem entrega retorno
acima do benchmark, quem carrega mais risco para o mesmo retorno, quem concentra
achados recorrentes.

Custo baixo, os dados já estão todos lá. É agrupar por `managerId` o que hoje é
agrupado por carteira.

### N04 — Transparência de custo do cliente (P1)

> "Maior transparência sobre custos e despesas"

`platform-receitas.jsx` mostra receita e ROA da firma. É o espelho, não a mesma
coisa. O que a página promete é a visão do cliente, taxa de administração, taxa de
performance, corretagem, custódia, e o custo total sobre patrimônio.

Num family office a pergunta "quanto eu pago no total, somando todas as camadas" é
exatamente o que ninguém consegue responder. Vale mais como diferencial comercial do
que como feature técnica.

### N05 — Arquivo padronizado para sistema contábil (P1)

> "Seus dados contábeis serão fornecidos em arquivos padronizados, prontos para serem
> carregados em seu sistema de contabilidade"

O G09 do benchmark de julho entregou `downloadCSV` e `downloadJSON`, que exportam a
tabela que está na tela. Isso não é a mesma coisa que um arquivo de lançamento
contábil. Falta o layout de destino, e layout de destino depende de qual sistema o
cliente usa.

### N06 — Validação automática como produto, não como bastidor

> "Validação automática de depósitos, dinheiro, participações e muito mais — nosso
> sistema controla, compara e conclui dados."

Aqui o PandaConnect está vendendo exatamente o que o ATLAS faz melhor. Vale registrar
como confirmação de posicionamento, não como gap. O concorrente lista conciliação
como um bullet entre sete. No ATLAS é o produto inteiro, com scoring multidimensional,
rastreio de recidiva e fórmula de conciliação explícita. Fechar os 36 commits e
mostrar a Trilha de Auditoria (commit 1bb24a9) entrega mais argumento comercial do
que qualquer feature nova desta lista.

---

## 4. Estado dos gaps de julho

Fechados pelo cd9d382 e 681c476, presentes no produto, ausentes na instância do cliente:
G01, G02, G03, G09, G10, G11, G16.

Ainda abertos: G04 (multi-entidade), G05 (mobile), G07 (liquidez dedicada, hoje só
sub-dimensão de risco em `platform-data-risk.js:41`), G08 (ingestão automatizada),
G12 (audit log), G13 (multi-idioma), G14 (fee engine), G15 (dashboards customizáveis).
G06 saiu parcialmente com a comparação de período do 681c476.

---

## 5. O que precisa da sua decisão

Fechar o drift não é fast-forward. As duas linhagens bifurcaram em 7b61e89 e cada uma
tem trabalho que a outra não tem. `recovered-real-data-fixes` carrega 6 commits de
correção de dado real que `master` não recebeu, incluindo exclusão de extrato
consolidado de custodiante que era double count, resolução de fee e gestor por
carteira via planilha, e o fix de `statusScript` que mascarava tudo como LIBERAR.

Três caminhos, em ordem de preferência minha:

1. **Merge de `recovered-real-data-fixes` para `master`, depois realinhar o submodule.**
   Preserva os dois lados. Os 6 commits do fork mexem em geradores de overlay e
   resolução de gestor, área que o `master` também mexeu no `31e1878`. Vai dar
   conflito em `platform-data.js`, e resolver conflito ali sem os fixtures de parity
   é adivinhação. Rodar com `ATLAS_FIXTURES` apontado antes de aceitar o merge.

2. **Cherry-pick só do cd9d382 e 681c476 para dentro do fork.** Entrega as features
   ao cliente sem tocar no resto. Mais rápido, mas mantém duas linhagens vivas e o
   problema volta no mês que vem.

3. **Não fazer nada agora e deixar a guarda gritando.** Defensável só se o
   fechamento de agosto for na semana que vem e você não quiser mexer no motor antes.

Não executei nenhum dos três. Merge que reescreve o motor que produz número entregue
a cliente é decisão sua, não minha.

Sobre os gaps novos, o único que eu tocaria antes de conversar é o N03, porque os
dados já estão no sistema. O N02 depende de conferir um book real para saber se é
problema de exibição ou de soma. N01, N04 e N05 são decisão de produto.
