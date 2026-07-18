# Padrão de mercado (wealth/fintech B2B) e stack criativo

Data: 2026-07-18. Autoria: Szuchmacher Consultoria. Modo: godmode.

Base: Addepar, Aleta, Masttro-class positioning; pesquisas FO 2025–2026;
pesquisa de nicho ATLAS (`pesquisa-nicho-melhorias-2026-07.md`).

---

## 1. Como o mercado top comunica (padrão fechado)

| Elemento | O que Addepar / Aleta / peers fazem | O que NÃO fazem |
|---|---|---|
| Headline | Ativa o dado / prova / clareza fiduciária | "IA revolucionária", feature dump |
| Visual | Navy profundo, ouro contido, negativo, produto como prova | Stock de aperto de mão, neon crypto |
| Prova | AUM na plataforma, custódias, certificações, tempo de implementação | Screenshots com número inventado ilegível |
| Hierarquia | Uma promessa → 3 pilares → demo | 12 features iguais |
| Tom | Institucional quiet luxury | Startup hype |
| White-label | "sua marca, nossa infraestrutura" | Empurrar marca do vendor no cliente final |
| Diferenciação | Fundação de dado + reconciliação + open architecture | Só dashboard bonito |

**Mensagem ATLAS alinhada ao padrão (e distinta):**

> Camada de verificação do book mensal. Concilia PL, gera achados com conta
> aberta, classifica o que pode ir ao cliente e deixa trilha pronta para auditoria.

Não: consolidação patrimonial. Sim: **provar o número antes do envio**.

---

## 2. Ranking de geradores (o que usar para o quê)

| Prioridade | Ferramenta | Uso correto | Evitar |
|---|---|---|---|
| 1 | **HTML/CSS real** (artefato / landing) | Copy exata, KPIs reais, layout de pitch | Dashboard fake em IA com número errado |
| 2 | **Imagine (xAI)** image_gen / image_edit | Hero, metáfora, mood, LinkedIn abstract | Texto longo na imagem |
| 3 | **Imagine** image_to_video | Motion de hero 6s institucional | Cena complexa multi-ação |
| 4 | **Higgsfield** GPT Image 2 / Marketing Studio | Ads UGC, avatar+produto, volume de criativo | Sem auth; sessão expirada em 2026-07-18 |
| 5 | **Higgsfield** Seedance 2.0 | Vídeo de produto sério 4–15s | Explainer com número exato na tela |
| 6 | **Higgsfield** Virality Predictor | Score de criativo acabado | Substituir estratégia |
| 7 | **Higgsfield** video-explainer workflow | Explainer narrado estilizado | Photoreal com atores |
| 8 | Figma / design system (humano) | Tokens finais, logo pós-marca | Antes da decisão de marca |

**Regra de ouro (Imagine skill):** número, rótulo e dashboard verdadeiros =
código. Atmosfera e marca = gerador de imagem.

**Bloqueio atual:** `higgsfield auth login` necessário para Marketing Studio /
Seedance no CLI e no MCP.

---

## 3. Sistema visual ATLAS (interim, pré-renomeação)

| Token | Valor | Uso |
|---|---|---|
| Navy | `#0A1928` | Fundo primário (já no SPA) |
| Gold | `#C4A228` | Acento único, selo, CTA fino |
| Off-white | `#E8E4D9` | Texto primário em dark |
| Muted | `#8B9AAB` | Secundário |
| Tipografia mood | Inter / system para web; mono só para checksum | Evitar display gimmick |

**Proibido no criativo:** logo de custodiante, nome de cliente real, PL real
em asset público, emoji, gradiente neon, 3D genérico de “AI brain”.

---

## 4. Assets gerados

Pasta: `docs/go-to-market/assets/`

### 4.1 Imagine (xAI) — rodada anterior

| Arquivo | Função |
|---|---|
| `hero-glass-panels.jpg` | Hero 16:9 (baseline) |
| `hero-verification.jpg` | Ad quadrado |
| `metaphor-data-foundation.jpg` | Multi-fonte → nó |
| `proof-report-seal.jpg` | Relatório + selo |
| `hero-cinematic.mp4` | Motion 6s |

### 4.2 Higgsfield Nano Banana 2 (`nano_banana_2`) — 2026-07-18

Conta free, 10 créditos. GPT Image 2 high e Seedance exigem plano pago /
créditos além do saldo. Modelo usado: **Nano Banana 2k** (2 cr/imagem).

| Arquivo | Formato | Job |
|---|---|---|
| `hf-hero-glass.png` | 16:9 2k | `c934ab90-…` |
| `hf-linkedin-icon.png` | 1:1 2k | `92e35cb4-…` |
| `hf-proof-seal.png` | 3:2 2k | `9b328c2b-…` |
| `hf-data-foundation.png` | 16:9 2k | `f752e5e4-…` |

Metadados: `hf-job-*.json`. Saldo ao fim: **0 créditos**.

Landing com números e copy exatos (código):

- `docs/go-to-market/pitch-institucional.html` (galeria HF + KPIs demo)

---

## 5. Playbook de produção (ordem ótima)

1. Fixar mensagem (esta doc + `pesquisa-nicho-melhorias`).
2. Decidir marca final (shortlist Confere/Atesta/Senda…).
3. HTML pitch com KPI demo ou reais (código).
4. 3–4 stills de atmosfera (Imagine / GPT Image 2).
5. 1 motion hero 6s.
6. Só então volume de ads (Higgsfield Marketing Studio) com product id.
7. Virality Predictor no cut final de vídeo.
8. Design partner: PDF one-pager impresso + demo live.

---

## 6. Critério de “melhor possível”

Não é o modelo mais caro. É a combinação:

1. **Verdade factual** no que é número (código).
2. **Restrição visual** no que é marca (mercado institucional).
3. **Posicionamento** que o ICP compra (verificação, não consolidador).
4. **Perímetro** (nada de LGPD em asset público).

Qualquer gerador fora dessa ordem produz “fintech genérico” e destrói trust.
