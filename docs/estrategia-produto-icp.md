# ATLAS, Estratégia de Produto para o ICP (Assets, MFO, Assessorias)

Data: 2026-07-17. Autoria: Szuchmacher Consultoria. Base: pesquisa de mercado
primária (concorrentes BR e internacionais, regulatório CVM/ANBIMA, tendências
WealthTech 2026) cruzada com o estado real do código (`produto.md`,
`PENDENCIAS.md`, plano `2026-07-17-fase-0-seguranca-e-rede.md`).

Convenção: `[Fato]` verificado em fonte, `[Hipótese]` a validar, `[Risco]`,
`[Recomendação]`, `[Validar]`. Fontes ao fim.

---

## 1. Resumo executivo

`[Fato]` O mercado brasileiro de tecnologia para gestão de patrimônio se divide
em quatro categorias que não se sobrepõem, e ATLAS não é nenhuma delas: é a
camada de **verificação e auditoria independente** do book mensal do
custodiante. Os incumbentes vendem consolidação e reporting; ninguém empacota a
auditoria com achados numerados e conciliação de PL como produto. Esse é o
espaço em aberto.

`[Recomendação]` Os próximos seis meses são para empacotar e vender o que já
existe, não refatorar. A ordem que sustenta isso: fechar a Fase 0 (segurança e
rede, plano já escrito), depois três alavancas de venda para o ICP, white-label
(entregue nesta sessão), benchmark de mercado, e trilha de auditoria visível.

---

## 2. O ICP e a dor real

`[Fato]` Três perfis compram verificação de carteira, com enquadramento distinto:

| Perfil | Enquadramento | Dor central |
|---|---|---|
| Assets / gestoras | CVM 21 (administração de carteira) | provar ao alocador e ao administrador fiduciário que o número reportado está certo |
| MFO / wealth | consultoria CVM 19 ou family office próprio | consolidar multi-custódia e responder pelo número com o nome da casa |
| Assessorias | CVM 178 (assessor de investimento) | reconciliar custódia e emitir relatório ao cliente sem uma semana de planilha |

`[Fato]` A dor é quantificada em fonte primária:
- Um escritório de 10 AAIs gasta ~1,2 FTE por mês em reconciliação manual de
  custódia e correção de planilha (AAWZ, base 2023-2025).
- 65% dos family offices ainda operam em planilha, com risco de integridade e
  segurança (Aleta, guia 2026).
- O próprio `produto.md`: conferir cem carteiras à mão consome uma semana por
  mês, sempre sob prazo, e o erro que escapa chega ao cliente com a assinatura
  da casa.

`[Fato]` O modo de falha mais perigoso, nomeado no `docs/operacao.md` da
instância, é servir dado velho ou incompleto sem erro e sem aviso. É a mesma
dor do comprador: ele precisa confiar no número, não só recebê-lo.

---

## 3. Mapa competitivo

`[Fato]` Categorias (framework validado na análise da AAWZ, player dedicado ao
setor há 8 anos):

1. **Consolidador do investidor final**: Gorila, SmartBrain, Mais Retorno
   (Retorno PRO), Hashdex, Quantum Finance, Comdinheiro. Resolvem o cliente
   final ver o patrimônio num só lugar. Não auditam o número, exibem-no.
2. **CRM de venda**: Magnet, Pipedrive, HubSpot. Pipeline comercial.
3. **Plataforma operacional do escritório**: AAWZ Hub (CRM + BPO + middle office
   + jurídico + financeiro + BI, em base única). Roda a operação da casa. O
   middle office deles faz reconciliação de custódia D+1, que é o vizinho mais
   próximo de ATLAS.
4. **Contabilidade e portfolio de fundos**: Britech (conformidade RCVM 175,
   consolidador ABS, e o "Atlas PAS", Portfolio Accounting System).

`[Fato]` Barra de features internacional (para referência de produto): Addepar
(agregação e padronização de dados fragmentados como fundação para IA e
analytics), Masttro (agregação multi-jurisdição, risco, ativos alternativos,
segurança de nível militar), Aleta (redução de tempo de processamento de
documento, US$ 100 bi sob a plataforma).

`[Fato]` ATLAS não compete de frente com nenhum: entra como a **camada de
auditoria** que valida o output de qualquer consolidador. A busca por
"auditoria independente de carteira" retorna pareceres de auditor de fundo e
manuais do CFC, não software empacotado. A categoria não existe como produto.

`[Risco]` Colisão de marca no exato segmento: Britech "Atlas PAS" (Brasil, mesmo
mercado), Eton Solutions AtlasFive (EUA), Holland Mountain ATLAS (Europa). A
decisão de marca bloqueia a Fase 1 e é do operador (Task 9 do plano Fase 0).

---

## 4. Onde ATLAS ganha, e o que falta

`[Fato]` Forças reais, hoje, no código:
- Motor de auditoria (Node/TS) com sete regras e a conciliação de PL como
  espinha: `PL esperado = PL base + compras − vendas + eventos − impostos`.
- Cada achado carrega o número que o gerou, não só um rótulo. O comprador
  consegue discutir a conta. Isso é o diferencial vendável.
- Agnóstico de custodiante por desenho (um parser por formato, uma estrutura de
  saída, uma regra vale para todas as fontes).
- Separação produto/dado com deny-by-default (LGPD), e o invariante "mês
  entregue é imutável" (selos por checksum).

`[Fato]` Lacunas para virar produto de prateleira para o ICP (cruzando o "o que
falta" do `produto.md` com a pesquisa):

| Lacuna | Por que importa para o ICP | Fonte |
|---|---|---|
| White-label do relatório e do app | vender para N casas exige tirar o nome de uma | AAWZ, Fase 1 |
| Benchmark de mercado (CDI, IBOV, IPCA) | o relatório ao cliente compara contra índice, hoje só contra o implícito | produto.md |
| Trilha de auditoria visível (selo do mês, método, quem conferiu) | é o que a auditoria ANBIMA cobra, e o que diferencia de um consolidador | AAWZ, plano |
| Autenticação real + RBAC + log de acesso | dado de cliente exige perímetro e menor privilégio | AAWZ, Fase 0 |
| Ingestão assistida por IA (books fora do padrão) | principal tendência WealthTech 2026; hoje PDF é beta e some carteira fora do layout | Aleta, Addepar |
| Quantidade e preço unitário por posição | relatório de performance por posição depende disso | produto.md |
| Portal e entrega ao cliente | experiência premium esperada pelo MFO/assessoria | Addepar, Masttro |
| Multi-tenant (costuras de tenant no `/api/data/:mes`) | licenciar para vários clientes | Fase 1 |

---

## 5. Roadmap priorizado

`[Recomendação]` Amarrado ao plano Fase 0 existente e ao modelo service-as-software
(serviço agora, licença depois). Marcados os itens que dependem de ação do
operador (deploy, chave, conta Cloudflare, GitHub).

### P0, condição para mexer e para vender (Fase 0, plano já escrito)
- Fechar caminho público ao bucket de cliente e trocar bypass por Access service
  token. **Operator-gated** (deploy wrangler, conta Cloudflare, rotação de chave).
- Parity test deixa de pular em silêncio. `[Fato]` já commitado.
- Selar os 36 meses fechados (mês entregue imutável). `[Fato]` scripts já existem
  na instância.
- Rede de caracterização do SPA. `[Fato]` ferramenta commitada; baseline pendente
  (precisa rodar na instância com dado real).
- Hardening defensivo (JWT fail-closed, SRI, ErrorBoundary, janela de meses).
  `[Fato]` entregue nesta sessão (commit `df77cab`).

### P1, empacotar e vender (0 a 6 meses)
1. **White-label** do app e do relatório. `[Fato]` entregue nesta sessão
   (`window.AtlasBrand`, commit `bda74ee`). Próximo: overlay `platform-brand-real.js`
   por tenant, e logo no cabeçalho do relatório.
2. **Benchmark de mercado** (CDI já existe no dado; adicionar IBOV e IPCA como
   série de comparação no relatório e na aba de carteira). Conecta com VIX Radar
   e Radar Quant como fonte.
3. **Trilha de auditoria visível**: estampar no relatório o selo (checksum) do
   mês, a data de fechamento e o método de conciliação. Transforma o diferencial
   invisível em prova para o cliente e para a auditoria ANBIMA.
4. **Autenticação real + RBAC leve + log de acesso** no Worker da instância.
   Parte é **operator-gated** (Cloudflare Access).
5. **Portal / entrega ao cliente** do relatório white-label.

### P2, pagar dívida e diferenciar (6 a 18 meses)
- Ingestão assistida por IA para books fora do padrão (hoje some carteira; o
  hardening desta sessão já tornou o descarte audível, é o primeiro passo).
- Feeds ANBIMA Data e B3 UP2DATA, depois Área do Investidor e Open Finance.
- Quantidade e preço unitário por posição, atribuição de performance.
- Multi-tenant com costuras de tenant, e VIX Radar (crédito privado) como upsell.

`[Hipótese]` A tríade de diferenciação do grupo (consolidação auditada + monitoramento
preditivo de crédito privado via VIX Radar + IA explicável) não é combinada por
nenhum player brasileiro num só produto. Validar com fonte primária antes de usar
em material comercial.

---

## 6. Regulatório (mapa correto)

`[Fato]` Correção do briefing (o `1.pdf` trazia CVM 21 para consultoria, o que é
erro):
- **Consultoria de valores mobiliários: Resolução CVM 19.** Dever fiduciário do
  consultor, atuar no melhor interesse do cliente.
- **Assessor de investimento (ex-agente autônomo): Resolução CVM 178.**
- **Administração de carteira (gestor e administrador fiduciário): Resolução CVM 21.**
- **Fundos: Resolução CVM 175.**
- DRM/DDR é reporte prudencial do Bacen para instituição financeira, não para
  tesouraria corporativa.

`[Recomendação]` ATLAS é ferramenta de verificação, não exerce consultoria nem
gestão, então é vendável para os três perfis sem assumir o dever fiduciário
deles. O ângulo de venda é justamente a trilha de auditoria: a casa que usa
ATLAS chega na auditoria ANBIMA com a evidência pronta, em vez de projeto de
duas semanas.

---

## 7. Executado nesta sessão

- `[Fato]` Commit `df77cab`: hardening defensivo (JWT fail-closed, SRI Chart.js
  e TanStack, ErrorBoundary por página, janela de meses até Dez/26, LineChart
  degrada sem Recharts). Verificado: `npm test` verde (151/151 SPA, audit-engine
  10/0), SRI conferido byte a byte com a CDN, smoke das 12 rotas com 0 erro.
- `[Fato]` Commit `bda74ee`: white-label via `window.AtlasBrand`. Verificado no
  Chromium: injetar tenant diferente antes do load troca title, sidebar e
  relatório (cabeçalho e rodapé) juntos, sem vazar a marca antiga, 0 erro.
- Branch `fase0/hardening-e-icp`, a partir de `master`, para revisão.

`[Validar]` Doc de produto `produto.md` (seção "Estado atual") ainda descreve a
senha cosmética que já foi removida. Atualizar quando conveniente.

---

## Fontes

- AAWZ Hub, plataforma para assessorias/consultorias CVM 19/wealths (categorias
  de mercado, dor de 1,2 FTE/mês): https://aawzpartners.com/plataforma-tecnologia-assessoria-investimento/
- Smartbrain, consolidação para family offices: https://smartbrain.com.br/family-offices-tendencias/
- Britech (RCVM 175, consolidador ABS): https://britech.global/gestao-de-portfolio/
- Comdinheiro: https://www.comdinheiro.com.br/
- Quantum Finance, consolidação: https://quantumfinance.com.br/solucao/consolidacao-carteiras/
- Mais Retorno (Retorno PRO): https://maisretorno.com/retorno-pro
- Addepar, family offices: https://addepar.com/family-offices
- Masttro (PT): https://masttro.com/pt
- Aleta, family office technology 2026 (65% em planilha): https://aleta.io/knowledge-hub/family-office-technology-guide
- Resolução CVM 19 (consultoria): https://conteudo.cvm.gov.br/legislacao/resolucoes/resol019.html
- Resolução CVM 21 (administração de carteira): https://conteudo.cvm.gov.br/export/sites/cvm/legislacao/resolucoes/anexos/001/resol021.pdf
- Tendências WealthTech 2026 (IA, private markets, client experience): https://www.financexmagazine.com/post/wealthtech-2026-the-top-10-trends-in-view-for-a-fast-moving-sector
