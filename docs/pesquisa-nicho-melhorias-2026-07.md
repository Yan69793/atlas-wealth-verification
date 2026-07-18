# Pesquisa de nicho e melhorias do ATLAS

Data: 2026-07-18. Autoria: Szuchmacher Consultoria. Escopo: o que o ICP
(Assets CVM 21, MFO/wealth CVM 19, Assessorias CVM 178) realmente precisa, e
como evoluir o ATLAS sem virar consolidador genérico.

Cruzamento: pesquisa web 2025–2026 (family office tech, RIA multi-custody,
document AI, Open Finance BR, CVM/ANBIMA), `estrategia-produto-icp.md`,
`produto.md`, `pesquisa-marca-2026-07-18.md`, teste ao vivo do SPA em
2026-07-18, e plano `2026-07-17-fase-0-seguranca-e-rede.md`.

Convenção: `[Fato]`, `[Hipótese]`, `[Risco]`, `[Recomendação]`, `[Validar]`.

Plano executável derivado: `docs/superpowers/plans/2026-07-18-p0-melhorias-nicho.md`.

---

## 1. Tese

`[Fato]` O mercado não paga por mais um consolidador com dashboard. Paga por
**confiança no número**, **processo auditável** e **tempo de middle office de
volta**.

`[Fato]` O ATLAS já ocupa o ângulo correto: verificação do book mensal com
achados numerados, classificação LIBERAR / ALERTA / CORRIGIR, radar de risco,
compliance documental e relatório com trilha de auditoria. A categoria
"auditoria independente de carteira empacotada como software" continua rarefeita
no Brasil.

`[Recomendação]` Não expandir para CRM, consolidador B2C ou contabilidade de
fundo. Fechar perímetro e workflow de exceção, matar fricção de ingestão,
empacotar prova regulatória e ROI em FTE.

---

## 2. Jobs to be done do ICP

| Job | Evidência de mercado | Implicação de produto |
|---|---|---|
| Confiar no número | 65% dos family offices ainda com processo manual em reporting/agregação (Campden Wealth + RBC 2025, via Aleta 2026); erro e segurança em planilha | Conciliação, selo, trilha, mês imutável |
| Multi-fonte sem planilha | Multi-custódia é norma em firmas grandes de advisory (fontes RIA EUA: dezenas % do mercado; 72% acima de US$1B AUM em fontes setoriais) | Parsers + normalização + reconciliação |
| Processar documento não estruturado | Alternativos geram capital call, NAV, K-1; AI que corta 15–20h/mês de processamento vira critério de compra (Aleta, document AI 2025–2026) | PDF/IA com revisão humana (HITL) |
| Exceção, não volume | Middle office escala por outliers | Fila LIBERAR/ALERTA/CORRIGIR com dono e SLA |
| Prova regulatória / fiduciária | CVM 19 / 21 / 178; códigos ANBIMA AGRT e Distribuição (atualizações 2025) | Export de evidência, log de liberação, suitability |
| Entregar ao cliente | Reporting automatizado em FO: 69%, de 46% no ano anterior (Campden/RBC) | Relatório white-label + portal + PDF estável |

`[Fato]` Relatório Simple Family Office Software & Technology 2025: integração e
qualidade de dado passaram à frente de "visual de relatório" como prioridade.

---

## 3. Evidência global (síntese)

### 3.1 Family office

- Planilha continua o risco operacional nº 1 (integridade, segurança, conhecimento
  preso a uma pessoa).
- Três pilares de plataforma "next-gen" (Aleta 2026): (1) consolidação total de
  wealth, (2) automação AI de private markets, (3) arquitetura aberta (API/MCP).
- AI em FO triplicou adoção em medições recentes (~34% em Simple 2025); barreira
  comum é privacidade e confiança no output (PwC), não só preço.
- UBS GFO 2025: expectativa alta de AI em reporting/visualização; só funciona com
  fundação de dado limpo.

### 3.2 RIA / multi-custody

- Multi-custódia fragmenta formatos, horários e completude; quebra fee billing,
  compliance e reporting sem camada de normalização.
- Advisors citam **data** como dor dominante do dia a dia em pesquisas de
  connected wealth.

### 3.3 Barra institucional (Addepar e pares)

- Fundação de dado reconciliado antes de analytics/IA.
- Alternativos e private markets como diferencial (benchmarks PE, look-through).
- AI operacional = extração e validação de documento, não chatbot genérico.
- Open architecture; lock-in é rejeitado por FO sofisticado.

`[Recomendação]` Não copiar Addepar. Posicionar ATLAS como **camada que valida
o book e o output do consolidador**, com trilha que esses players não vendem
como produto de auditoria.

---

## 4. Evidência Brasil

### 4.1 Categorias (inalteradas em substância)

1. Consolidador (Gorila, SmartBrain, Mais Retorno, Quantum, Comdinheiro)
2. Ops do escritório (AAWZ Hub: CRM + BPO + middle; vizinho: reconciliação D+1)
3. Contabilidade / portfolio fund (Britech, incl. Atlas PAS)
4. **ATLAS:** auditoria do book com achados numerados

### 4.2 Dinâmica de mercado

- Consolidação de wealth (Fami, Azimut, fusões multi-FO) aumenta carteiras por
  casa e pressiona middle office.
- AAWZ (fonte primária já no `estrategia-produto-icp.md`): ~1,2 FTE/mês em
  reconciliação manual num escritório de 10 AAIs.

### 4.3 Open Finance

- Ecossistema regulado maduro; investimentos no escopo de compartilhamento.
- `[Recomendação]` Médio prazo: feed consentido como **segunda fonte** de
  reconciliação (book vs feed). Curto prazo: book PDF/Excel + regras continua
  o núcleo.

### 4.4 Regulatório que vende feature

| Norma | Perfil | Ângulo ATLAS |
|---|---|---|
| CVM 19 | Consultoria fee-based | Diligência e suitability documentadas |
| CVM 178 | Assessor (ex-AAI) | Processo de conferência antes do cliente |
| CVM 21 | Gestão / admin de carteira | Prova ao admin fiduciário e alocador |
| ANBIMA AGRT / Distribuição (2025) | Autorregulação | Evidência de controles na auditoria |

ATLAS não exerce consultoria nem gestão: vende ferramenta de verificação.

### 4.5 Marca

`[Risco]` Nome ATLAS colide (Britech Atlas PAS BR, AtlasFive EUA, Holland
Mountain ATLAS EU). Shortlist em `pesquisa-marca-2026-07-18.md`. Decisão do
operador bloqueia Fase 1 comercial.

---

## 5. Estado ATLAS vs necessidade do nicho

Verificado em teste ao vivo 2026-07-18 (demo, `localhost:7821`): 40 carteiras,
R$ 1,20 bi, Radar com stress, Achados com recidiva, Comparativo/Busca sem meses
futuros vazios (fix `72186ae`), Relatório TIGRE_FAM com TWR/CDI/IBOV/IPCA e
Trilha de Auditoria. Console: só 404 de overlays LGPD + P23 Recharts.

| Necessidade | ATLAS hoje | Gap |
|---|---|---|
| Conciliação PL + regras com número | 7 regras no motor | Regras BR edge (offshore, multi-moeda, IR) |
| Classificação LIBERAR/ALERTA/CORRIGIR | Dashboard + Achados | Fila com dono, prazo, reabertura |
| Recidiva | Tendência (+ fallback demo historico) | Alerta proativo e playbook |
| Stress / risco | Radar 5D + 4 cenários | Ligar a mandate/suitability real |
| Benchmarks | CDI/IBOV/IPCA no relatório | Fonte estável + política de atraso |
| White-label | `window.AtlasBrand` | Overlay tenant, logo, domínio |
| PDF multi-layout | Beta layout único | IA multi-custodiante + HITL |
| Auth / multi-tenant / API | Perímetro incompleto na instância | Bloqueio de venda enterprise |
| Portal cliente | Relatório exportável | Link assinado, versões |
| Qtd / preço unitário | Só valor financeiro | Atribuição e controle de cota |
| Alternativos | Fraco | NAV as-of, capital call |
| Integração | Import local | API, webhook mês fechado |
| Segurança / LGPD | Separação produto/dado no git | RBAC, log, retenção, DPA |

---

## 6. Roadmap de produto (resumo)

### P0 — Condição de venda

1. Perímetro de segurança (Access + JWT fail-closed, sem bypass). Ver Fase 0.
2. Workflow de exceção (fila, responsável, bloqueio de liberação com CORRIGIR).
3. Selo do mês + imutabilidade visível na UI e no relatório.
4. Decisão de marca (Task 9 da Fase 0).

### P1 — Alavancas em 0–6 meses

5. Ingestão multi-fonte com score de confiança e HITL.
6. Parsers por custodiante prioritário BR (a partir do book real da instância).
7. Suitability / mandato como regra de auditoria.
8. Portal de entrega + white-label por tenant.
9. KPI de ROI na UI (auto-LIBERAR %, horas estimadas, recidivas abertas).

### P2 — Diferenciação 6–18 meses

10. Quantidade, PU e atribuição de performance.
11. Alternativos + upsell VIX Radar (crédito privado).
12. Open Finance / ANBIMA Data / B3 como segunda fonte.
13. API aberta + webhooks.
14. IA com citação (extração e sugestão de causa; nunca liberação opaca).

### Fora do caminho crítico

- Migração Vite / React 19 / Recharts 3 / TypeScript full.
- CRM, consolidador B2C, contabilidade RCVM 175.
- Chat genérico sobre portfólio sem fundação de dado.

---

## 7. Mensagem comercial

**Evitar:** "plataforma de consolidação patrimonial com analytics".

**Usar:** "camada de verificação do book mensal: concilia PL, gera achados com
conta aberta, classifica o que pode ir ao cliente e deixa trilha pronta para
auditoria".

| Player | Job |
|---|---|
| SmartBrain / Gorila | Mostrar patrimônio |
| AAWZ | Rodar o escritório |
| ATLAS (novo nome) | Provar que o número e o processo estão certos antes do envio |

---

## 8. Experimentos de validação (30 dias)

1. Shadow month: ATLAS em paralelo à planilha; contar divergências e tempo.
2. Cinco entrevistas com middle office: "o que impede liberar o book na sexta?"
3. Checklist ANBIMA → mapear cada item a artefato do sistema.
4. A/B de relatório: só números vs números + trilha.
5. Parser coverage: % de books do mês sem re-digitação.

---

## 9. Fontes

### Internas

- `docs/estrategia-produto-icp.md` (2026-07-17)
- `docs/produto.md`
- `docs/pesquisa-marca-2026-07-18.md`
- `docs/superpowers/plans/2026-07-17-fase-0-seguranca-e-rede.md`
- Teste ao vivo SPA 2026-07-18 (demo)

### Externas (amostra)

- Aleta, Family Office Technology Guide 2026 (spreadsheet liability 65%; pilares
  consolidação / AI / open architecture): https://aleta.io/knowledge-hub/family-office-technology-guide
- Campden Wealth + RBC, North America Family Office Report 2025 (via Aleta/RBC)
- Simple, Family Office Software & Technology Report 2025
- UBS Global Family Office Report 2025
- Addepar, private markets / Private Fund Benchmarks (fundação de dado, alts)
- Open Finance Brasil / BCB (ecossistema e investimentos)
- ANBIMA, Código de Administração e Gestão de Recursos de Terceiros; Código de
  Distribuição (vigências 2025)
- CVM Resoluções 19, 21, 178
- AAWZ, plataforma e materiais de compliance CVM 19 / 178
- Fontes RIA multi-custody (WealthManagement.com, Advisor360, ETNA Soft et al.)
- Document AI / statement extraction (Investipal, V7, Cardo AI, Unstract 2025–2026)

---

## 10. Próximo passo

Executar `docs/superpowers/plans/2026-07-18-p0-melhorias-nicho.md` em paralelo
com o fechamento residual da Fase 0 de segurança. Não abrir Fase 1 comercial
sem: perímetro fechado, marca decidida, e pelo menos um design partner em
shadow month.
