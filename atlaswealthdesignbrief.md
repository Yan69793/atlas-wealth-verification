# Atlas Wealth — site institucional no Higgsfield

## Como retomar

- **Site já registrado no Higgsfield:** `website_id: 9e97f605-9821-4f0a-902b-9064071220e1`, `slug: atlas-wealth`, `type: website`, `category: other`.
- **Bloqueio atual:** o ambiente desta sessão nega (403, política de egress) conexões a `apps-repos.higgsfield.ai`, host necessário para `git clone`/`push` do repositório do site. Rode o restante da pipeline em um ambiente sem essa restrição.
- **Para retomar:** chamar `website_repo_access(website_id)` nesse ambiente livre — devolve URL do repo + token de acesso (não repetir o token de volta ao usuário). Clonar, colar o `design-brief.md` abaixo em `app/design-brief.md`, seguir as fases 1-6 do fluxo `website-flow.md` do Higgsfield (boards → assets → build → motion → gate → deploy), depois `deploy_website(website_id)`.
- **Publicação no feed da comunidade Higgsfield:** decisão já tomada — **não publicar**, só deploy no subdomínio.

---

## `app/design-brief.md` (pronto para colar)

**Design read.** Operações de private banking e back-offices de wealth management avaliando uma ferramenta de verificação mensal de carteiras; registro emocional: confiança institucional discreta, precisão, contenção — não energia de startup.

**Concept spine.** O site se lê como um dossiê de auditoria selado: cada seção se fecha como um lançamento verificado antes que a próxima abra.

**Delivery tier.** `editorial` (calmo/minimalista/B2B: tipografia + imagens + componentes sob medida, apenas micro-motion). Justificativa: produto financeiro institucional — qualquer efeito cinematográfico (scroll-scrub, cursor customizado) destoaria do registro de confiança.

**Locked palette** (uma única cor de destaque, tema único — sem seções claras isoladas):
- Fundo: `#0C1C30`
- Fundo alternativo (tint por seção): `#0F2238`
- Título/ink: `#F6F3EC`
- Corpo de texto: `#C9C2B0`
- Destaque único (dourado): `#C9A227`
- Hairline/borda: `#233B58`

Defesa: navy profundo + um único dourado abafado evita as quatro famílias banidas (grafite+laranja/âmbar, quase-preto+neon, beige+brass, roxo-IA), enquanto ainda lê como finanças institucionais, não SaaS genérico.

**Locked type:**
- Display (serifada): **Source Serif 4**
- Corpo (sans): **IBM Plex Sans**

Justificativa para a serifada (obrigatória pela regra de banimento de serifas por padrão): private banking é um registro de heritage genuíno — bancos privados centenários usam wordmarks serifados como convenção (Pictet, Julius Baer, Lombard Odier) — não é um "produto jovem" se apropriando de luxo.

**Tier-1 technique.** `D2 — Sticky-stack chapters` (do wow-catalog). Defesa: nível editorial, confiável, sem flash cinematográfico; capítulos se empilham e se revelam como processos de auditoria se fechando, um por etapa de verificação, encenando o spine do dossiê sem exigir vídeo de hero.

**Section plan** (6 seções, 6 famílias de layout distintas, sem repetição):
1. **Hero** — arquitetura editorial offset (chapa atmosférica + título deslocado)
2. **Por que importa** — blocos editoriais alternados (texto/imagem)
3. **Como funciona** — hover-accordion (4 etapas do processo mensal)
4. **O que é verificado** — grid off-grid assimétrico (não 3 cards iguais)
5. **Disciplina/rigor** — statement full-width + nota de margem estreita (second-read moment)
6. **Fechamento/CTA** — moldura de imagem em camadas + banner de CTA

**Asset plan:**
- Hero visual: 2 candidatas, chapa atmosférica abstrata "cofre/dossiê selado", navy+dourado, sem texto/logo.
- Chapas de seção: 2-3 texturas atmosféricas (grão de papel/vellum em grade navy, textura de linha em folha de ouro, gradiente com varredura de luz suave).
- Imagens de conteúdo: nenhuma pessoa/depoimento fictício; uma chapa arquitetônica abstrata para a seção de rigor.
- Set de ícones customizado: uma folha, 8 glifos (selo/check, calendário/mês, lupa/scan, linhas de livro-caixa, escudo, linha de tendência, pasta/dossiê, alerta-diamante), traço 2px, dourado sobre navy.
- Logo/monograma: selo serifado dourado "A" (reaproveita a marca do próprio Atlas — este site é marketing PARA o Atlas).
- OG image: card 1200×630 composto, navy+dourado, monograma + título.
- Head kit: favicon derivado do monograma (16/32/180/192/512 + variante maskable), theme-color navy.

**CTA inventory** (um único label reaproveitado, regra "one label per CTA intent"):
- **Primário** (nav, hero, banner de fechamento): "Solicitar apresentação" — componente próprio: botão com borda hairline e preenchimento dourado, tinta desloca no hover.
- **Secundário** (usado uma vez, meio da página): "Ver como funciona" — link inline sublinhado + seta, rola até a seção 3.

---

## Rascunho de copy (PT-BR, um por seção)

**1. Hero**
- Eyebrow (opcional, único da página): "Verificação de carteiras"
- Título: "Cada carteira, verificada antes de sair"
- Subtítulo: "Um processo mensal de conciliação e auditoria para operações de wealth management, antes que o relatório chegue ao cliente."
- CTA: "Solicitar apresentação"

**2. Por que importa**
- Título: "Erros de carteira custam confiança"
- Subtítulo: "Relatórios gerenciais enviados sem conferência expõem a operação a retrabalho e a perguntas incômodas do cliente."

**3. Como funciona** (4 passos do accordion)
- "Conciliação de patrimônio líquido"
- "Conferência de eventos e come-cotas"
- "Comparação mês a mês"
- "Achados classificados por severidade"

**4. O que é verificado** (itens do grid)
- "Patrimônio líquido"
- "Rentabilidade por ativo"
- "Eventos financeiros"
- "Tendência histórica"

**5. Disciplina**
- Título: "Disciplina antes de qualquer envio"
- Nota de margem: "Nenhum relatório sai sem passar pela conferência."

**6. Fechamento**
- Título: "Leve essa disciplina para sua operação"
- CTA: "Solicitar apresentação"

---

## Regras que a pipeline do Higgsfield vai cobrar no gate mecânico

- Zero em dash (—) ou en dash como separador em qualquer texto visível.
- Um único label de CTA por intenção, reaproveitado (não criar sinônimos como "Fale com a gente" em outro lugar).
- Nenhum depoimento/nome fictício, nenhuma estatística de marketing inventada (ex.: "98% de precisão") — só fatos de produto plausíveis.
- Nenhum dado real de cliente/carteira em nenhuma imagem ou texto (regra de LGPD deste projeto, mesmo fora do repositório original).
- Máximo 1 eyebrow a cada 3 seções (aqui: 1 no total, no hero).
- Nenhuma menção à marca Higgsfield na página (é `type: website`, marca própria).
