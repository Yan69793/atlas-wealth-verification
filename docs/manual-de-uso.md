# ATLAS Wealth Verification — Manual de Utilização

**Versão:** 0.1 · **Ambiente:** Protótipo / Demo  
**Repositório:** https://github.com/Yan69793/atlas-wealth-verification  
**Acesso online (GitHub Pages):** https://yan69793.github.io/atlas-wealth-verification/

---

## 1. Visão Geral

O **ATLAS Wealth Verification** é uma plataforma de monitoramento mensal de carteiras de wealth management. Consolida, em uma interface única, as principais dimensões de verificação que uma equipe de gestão de patrimônio precisa revisar periodicamente:

- Status operacional das carteiras (LIBERAR / COM ALERTA / CORRIGIR)
- Composição e rentabilidade por carteira
- Achados e exceções relevantes
- Radar de risco multidimensional com simulação de cenários de stress
- Receitas e ROA por gestor
- Comparativo entre carteiras
- Busca por exposição a ativos específicos

**Público-alvo:**

| Perfil | Uso principal |
|---|---|
| CIO / Diretor de Investimentos | Visão consolidada, priorização, radar de risco |
| Gestor de carteiras | Status individual, achados, suitability |
| Compliance e controles internos | Achados, cadastro, audit |
| Risco | Radar de risco, cenários de stress, concentração |
| Operações | Status de liberação, correções pendentes |

> **Este é um protótipo funcional com dados sintéticos.** Não há dados reais, dados de clientes ou informações LGPD no repositório. Adequado para avaliação técnica e apresentação de conceito.

---

## 2. Como Rodar Localmente

### Pré-requisitos

- Python 3.x (para servidor local) **ou** Node.js 18+
- Navegador moderno (Chrome, Edge, Firefox, Safari)
- Git (para clonar o repositório)

### Instalação e execução

```bash
# 1. Clonar o repositório
git clone https://github.com/Yan69793/atlas-wealth-verification.git
cd atlas-wealth-verification

# 2. Iniciar o servidor local
npm run serve
# Equivalente: python -m http.server 7821

# 3. Abrir no navegador
# http://localhost:7821
```

### Acesso

- **URL:** `http://localhost:7821`
- **Senha demo:** `atlas2026`
- **Alternativa online (sem instalação):** https://yan69793.github.io/atlas-wealth-verification/

> Os dados exibidos são completamente sintéticos. Nenhuma informação real é carregada ou transmitida.

---

## 3. Fluxo Recomendado de Uso

A sequência abaixo representa o fluxo de verificação mensal completo:

1. **Dashboard** — visão geral: PL total, status das 40 carteiras, alertas ativos
2. **Selecionar o mês** — usar o seletor de mês no cabeçalho (ex: Abr/26)
3. **Revisar o status consolidado** — quantas carteiras em CORRIGIR, COM ALERTA, LIBERAR
4. **Abrir carteiras com CORRIGIR** — clicar na carteira para ver detalhes, composição e achados
5. **Revisar carteiras COM ALERTA** — idem, com foco em achados e suitability
6. **Usar o Radar de Risco** — analisar o score multidimensional e identificar carteiras prioritárias
7. **Explorar cenários de stress** — simular impacto de juros, bolsa e liquidez no portfólio total
8. **Revisar Receitas & ROA** — verificar desvios de fee e desempenho por gestor
9. **Usar o Comparativo** — posicionar carteiras entre si por PL, rentabilidade e risco
10. **Busca por ativo** — verificar exposição cruzada a um ativo específico em múltiplas carteiras
11. **Relatório** — gerar e consultar o relatório individual de carteira

---

## 4. Principais Telas

### Dashboard

Visão consolidada do mês selecionado. Exibe:
- Total de carteiras e distribuição por status
- PL total e CDI do período
- Evolução histórica do PL (gráfico de linha)
- Tabela ordenável com todas as carteiras: PL, variação, rentabilidade, vs CDI, achados, receita

### Carteira (detalhe individual)

Acessada clicando em qualquer carteira no Dashboard. Mostra:
- Composição por classe de ativo (gráfico + tabela)
- Rentabilidade histórica vs CDI
- Achados do mês
- Status e dados de verificação

### Achados & Exceções

Lista consolidada de todos os achados detectados no mês: desvios de suitability, divergências de PL, anomalias de fee, ausência de documentação. Inclui filtros por tipo e carteira.

### Radar de Risco

Score de risco multidimensional por carteira (ver seção 5). Inclui:
- Heatmap ordenável por dimensão
- Fila de ação com recomendações priorizadas
- Simulação de 4 cenários de stress
- Top 5 carteiras mais impactadas por cenário

### Receitas & ROA

Ranking de gestores por receita e ROA. Alertas de desvio de fee. Evolução mensal de receita por carteira.

### Comparativo

Posiciona múltiplas carteiras lado a lado. Permite comparar PL, rentabilidade, risco e composição ao longo do tempo.

### Busca por Ativo

Localiza todas as carteiras com exposição a um ativo ou classe específica. Útil para análise de risco concentrado em um emissor ou fundo.

### Importação de Extratos

Módulo planejado para ingestão de extratos em PDF, Excel, CSV e Markdown. **Ainda não implementado** — a especificação está definida; é a próxima etapa de desenvolvimento.

### Cadastro & Compliance

Dados cadastrais das carteiras: perfil de risco, objetivo, gestor responsável, documentação. Inclui alertas de pendências.

### Usuários

Gestão de perfis de acesso ao sistema (funcionalidade demonstrativa neste protótipo).

---

## 5. Interpretação dos Indicadores

### Status da Carteira

| Status | Significado |
|---|---|
| **LIBERAR** | Carteira dentro dos parâmetros. Pode ser aprovada para o período. |
| **COM ALERTA** | Há desvios que exigem atenção. Revisar antes de aprovar. |
| **CORRIGIR** | Há problemas bloqueantes. Não liberar sem resolução. |

### Indicadores Financeiros

| Indicador | Descrição |
|---|---|
| **PL Atual** | Patrimônio líquido da carteira no mês selecionado |
| **Variação** | Variação percentual do PL em relação ao mês anterior |
| **Rentabilidade** | Retorno da carteira no período (%) |
| **vs CDI** | Diferença entre a rentabilidade da carteira e o CDI do mês |

### Score de Risco (0–100)

O score é calculado em 5 dimensões independentes:

| Dimensão | Máx | O que mede |
|---|---|---|
| **Mercado** | 30 pts | Underperformance vs CDI, drawdown nos últimos 6 meses |
| **Concentração** | 25 pts | Concentração por classe e por ativo individual (HHI) |
| **Liquidez** | 20 pts | Proporção de ativos ilíquidos; buffer de caixa |
| **Suitability** | 15 pts | Adequação da exposição ao perfil de risco declarado |
| **Operacional** | 10 pts | Status CORRIGIR, achados recorrentes, divergências de PL |

**Níveis:**

| Score | Nível | Ação |
|---|---|---|
| 70–100 | **Alto** | Revisão imediata; ação antes da próxima verificação |
| 40–69 | **Atenção** | Monitoramento reforçado; revisar drivers dominantes |
| 0–39 | **Baixo** | Acompanhamento regular |

### Cenários de Stress

Simulam o impacto de choques de mercado sobre o PL total das carteiras:

| Cenário | Descrição |
|---|---|
| **Juros +200 bps** | Choque na curva de juros; impacta RF inflação, FII e multimercado |
| **Bolsa -15%** | Queda abrupta em renda variável; impacta ações, FII, multimercado |
| **Crise de Liquidez** | Prêmio de iliquidez generalizado; impacta todos os ativos não líquidos |
| **Cenário Combinado** | Convergência dos três fatores adversos acima |

A perda estimada é calculada pela exposição de cada carteira às classes afetadas, ponderada pelo PL.

---

## 6. Boas Práticas de Uso

1. **Comece sempre pelo Dashboard** — o status consolidado define a prioridade do dia.
2. **Carteiras CORRIGIR primeiro** — são as que bloqueiam a liberação mensal.
3. **Em seguida, COM ALERTA** — revisar achados e decidir se aprovam com ressalva ou aguardam correção.
4. **Use o Radar de Risco para priorizar** — carteiras com score alto podem não estar em CORRIGIR mas concentram risco material.
5. **Simule ao menos o cenário combinado** — é o mais conservador e revela concentrações ocultas.
6. **Receitas & ROA como controle de qualidade** — desvios de fee persistentes indicam problema operacional ou de relacionamento com o gestor.
7. **Busca por ativo antes de grandes alocações** — evita concentração inadvertida no portfólio total.
8. **Registre observações antes de aprovar** — o módulo de achados serve como trilha de decisão.

---

## 7. Limitações Atuais

| Limitação | Detalhe |
|---|---|
| Dados sintéticos | Todos os dados exibidos foram gerados algoritmicamente para fins de demonstração. Não representam carteiras reais. |
| Autenticação demonstrativa | A senha `atlas2026` é verificada apenas no lado cliente (localStorage). Não há controle de acesso real. |
| Sem backend ou persistência | O sistema é 100% estático. Alterações não são salvas. |
| Importação não implementada | O parser de PDF/Excel/CSV/Markdown está especificado mas aguarda desenvolvimento. |
| Sem controle de permissões | Todos os usuários têm acesso total no protótipo. |

> **Não usar em ambiente produtivo sem backend, autenticação real e política de dados formal (LGPD).**

---

## 8. Próximas Evoluções Recomendadas

Em ordem de prioridade para viabilizar uso produtivo:

1. **Parser de extratos** — ingestão de PDF, Excel, CSV e Markdown dos custodiantes/gestores (especificação já definida)
2. **Backend seguro** — API REST com autenticação, autorização e logs de auditoria
3. **Banco de dados** — persistência de carteiras, histórico e achados
4. **Autenticação real** — SSO corporativo ou MFA com controle por perfil
5. **Controle de permissões** — leitura/escrita por tela, segregação CIO / gestor / compliance
6. **Exportação de relatórios** — PDF e Excel por carteira e consolidado
7. **Integração com custodiante/gestor** — feed automático de dados via API ou SFTP
8. **Logs e auditoria** — rastreabilidade de aprovações e alterações

---

## 9. Checklist para Apresentação ao CIO

Use este roteiro em uma apresentação de 15–20 minutos:

- [ ] Abrir o app (online ou local)
- [ ] Fazer login com senha demo `atlas2026`
- [ ] **Dashboard** — mostrar visão consolidada: PL total, status, gráfico de evolução
- [ ] **Selecionar mês** — demonstrar navegação temporal
- [ ] **Carteira individual** — abrir uma carteira COM ALERTA, mostrar composição e achados
- [ ] **Radar de Risco** — mostrar score por carteira, heatmap e fila de ação
- [ ] **Stress test** — alternar entre cenários; mostrar perda estimada por cenário
- [ ] **Receitas & ROA** — mostrar ranking de gestores e alertas de desvio
- [ ] **Comparativo** — posicionar 3–4 carteiras lado a lado
- [ ] **Busca por ativo** — localizar exposição a um fundo ou ação específica
- [ ] Explicar que **os dados são sintéticos** e que a estrutura reflete carteiras reais de wealth
- [ ] Apresentar a **próxima etapa**: parser de extratos para eliminar entrada manual
- [ ] Discutir o roadmap para produção: backend, autenticação, integração com custodiante

---

*Documento gerado para acompanhar o envio do protótipo ao CIO. Não contém dados reais.*
