# ATLAS como sistema mãe

Data: 2026-07-14
Status: aprovado (Seções A, B, C)

## Problema

Três artefatos concorrentes cobrem o mesmo objetivo, e nenhum é completo.

| Artefato | Estado real |
|---|---|
| `SmartBrain/dashboard-maquete.html` | Maquete de 27/mar. HTML estático, sem camada de dados. Zero `fetch`, números digitados no markup. |
| Dashboard React da raiz | Onde o trabalho vive. `data.json` de junho/2026, 94 carteiras, reprocessado em 14/jul. |
| `Projetos/atlas-wealth-verification` | A plataforma. 9 abas, camada de dados própria, repo e CI próprios. Congelada em 07/jul. |

O commit `a1176a7 feat: integracao verificacao mensal de carteiras` copiou o dashboard da raiz
para `atlas-wealth-verification/verificacao-mensal/` e parou aí. A pasta tem 12 arquivos e
**zero referências** em todo o repo. Foi copy-paste apresentado como integração, e é a origem
da confusão que abriu esta sessão.

## Decisão

O ATLAS é o sistema mãe. Verificação de carteiras é uma aba dele. Tudo converge para o
diretório do ATLAS.

Execução em três projetos independentes, cada um com spec e plano próprios:

1. **Consolidação** (este spec)
2. **Aba de Verificação nativa**
3. **Plataforma privada no Cloudflare**

Ordem: **1, 3, 2**, tanto no desenho quanto na construção. O item 3 vem antes do 2 porque
define de onde `data.json` é carregado em runtime. O item 2 consome o endpoint
`GET /api/data/:mes` que o item 3 cria, então não pode ser construído antes dele sem
inventar um contrato provisório e retrabalhar depois.

---

## Projeto 1: Consolidação

### A. Onde o ATLAS mora

Hoje o sistema mãe está em `Verificação de carteiras/Projetos/atlas-wealth-verification/`,
ou seja, o filho contém o pai.

A pasta é **movida** (move físico no filesystem, não cópia) para
`02_AREAS/Operacoes-Recorrentes/ATLAS/`. Não fica duplicata na origem. O `.git` próprio do
ATLAS viaja junto, então o git remote (`github.com/Yan69793/atlas-wealth-verification`) não
muda: é por repo, não por caminho.

### A2. Destino da árvore `Verificação de carteiras/`

Depois de promover o ATLAS e consolidar o engine, a raiz deixa de ser sistema, mas **não é
deletada no Projeto 1**. Ela ainda contém o dado real e o pipeline de ingestão, que só migram
para o R2 no Projeto 3. Deletar antes disso é irreversível e sem ganho.

No Projeto 1 a raiz é rebaixada a **área de staging de ingestão**: mantém os inputs
(PDFs/Excel), o `ingest.ps1` e os `data.json`/`historico.json` locais não-versionados que
alimentam o ATLAS até o R2 existir. Maquetes e entregas antigas (`SmartBrain/`, HTMLs de
relatório) vão para uma subpasta `_arquivo/`. A raiz é reavaliada para arquivamento
definitivo ao fim do Projeto 3, quando o dado passa a vir do R2 e o `ingest` sobe para lá.

### A3. Referências de caminho a atualizar

A promoção quebra todo apontamento para o caminho antigo. É passo verificável, não nota.
Alvos confirmados em 14/jul:

| Arquivo | Referência |
|---|---|
| `CLAUDE.md` do workspace | caminho do projeto ATLAS |
| `~/.claude/skills/atlas-audit-engine/SKILL.md` | aponta direto para `.../Verificação de carteiras/audit-engine` |
| `~/.claude/skills/verificacao-carteiras-v2/SKILL.md` | caminho do projeto |
| `~/.claude/skills/vix-radar-audit/SKILL.md` | caminho do projeto |
| `~/.claude/skills/awwwards-estudo/references/projetos.md` | caminho do projeto |

Critério de pronto: `grep` recursivo pelo caminho antigo, nas skills e no workspace, retorna
zero após a atualização.

### B. Um audit-engine só

Existem dois. O do ATLAS é uma cópia em bloco de `2026-07-07 02:48` (todos os arquivos com
mtime idêntico). O da raiz evoluiu e vence em todos os pontos de divergência:

| Arquivo | Divergência |
|---|---|
| `src/rules/rentabilidade.ts` | exceção offshore (`_OFF` com `rentRef === null` vira alerta, não erro) só existe na raiz |
| `scripts/extract-pdfs.py` | `collect_book_files()` de dois níveis só existe na raiz |
| `tests/offshore-excecao.test.ts` | só existe na raiz |
| `tests/fixtures/` | só existe na raiz |
| `tests/parity-abril-2026.test.ts` | difere |

Dados: ATLAS tem `audits/` e `reports/` de 2026-02 a 2026-05. A raiz tem até 2026-06.

**O engine da raiz substitui o do ATLAS, arquivo a arquivo.** O `npm test` do ATLAS passa a
rodar a suíte do engine além do `tests/validate.js` existente.

`verificacao-mensal/` é **deletada**, não migrada. É a cópia órfã, não é fonte de nada. As
views que importam serão portadas do estado atual da raiz no Projeto 2.

### C. Dado real fora do git

Fatos apurados em 14/jul:

- Ambos os repos são **privados**. GitHub Pages está **desligado** nos dois (API retorna 404).
  Não há exposição ativa.
- `.github/workflows/pages.yml` do ATLAS publica com `path: .`, o repo inteiro, a cada push
  em `master`. Repo privado não torna o Pages privado. Gatilho armado.
- `deploy-ghpages.ps1` (idêntico nos dois) copia `data.json` para `docs/` deliberadamente e
  instrui o operador a ligar Pages a partir de `/docs`.
- O `.gitignore` da raiz não protege nada disso. **436 PDFs de books de clientes estão
  commitados no índice do repo da raiz**, junto com `data.json` e `data.js`.
- O `.gitignore` do ATLAS é rígido: ignora `*.pdf`, `*.xlsx`, `platform-data-real.js` e
  a pasta de dados reais de carteira.

Ações:

- `pages.yml` e `deploy-ghpages.ps1` são **deletados**. O destino é Cloudflare, não Pages.
  Gatilho eliminado em vez de desarmado.
- `.gitignore` do ATLAS é adotado como base e endurecido: `data.json`, `data.js`,
  `historico.json`, `historico.js` e `audits/*/input/` saem do versionamento.

**Fora de escopo:** reescrita do histórico do git para expurgar os 436 PDFs já commitados.
É irreversível e o repo é privado, então não é urgência. Requer ordem explícita do operador.

---

## Projeto 3: Plataforma privada no Cloudflare

Desenhado agora porque define o contrato de dados do Projeto 2.

### Passivo a remover

A senha `atlas2026` de hoje é teatro: comparada no cliente, guardada em `localStorage`.
Quem tem o arquivo tem o dado. Não é base para construir, é passivo. Sai fora.

### Arquitetura (opção C: Access como perímetro + Worker servindo do R2)

```
Usuário
   │
   ▼
Cloudflare Access (Zero Trust)     ← identidade: OTP de e-mail / Google
   │  emite Cf-Access-Jwt-Assertion   gratuito até 50 usuários
   ▼
Worker  (atlas.szuchmacher.com.br)
   ├── static assets: HTML, JSX, CSS   ← sem dado real no bundle
   └── GET /api/data/:mes
         │ valida o JWT do Access antes de responder
         ▼
       R2 bucket   ← data.json, historico.json
                     fora do git, fora do deploy
```

Por que C e não as alternativas:

- **Access sozinho, app estático atrás**: o `data.json` continuaria num arquivo publicado,
  protegido só pelo perímetro.
- **Worker com auth própria**: nós passaríamos a ser responsáveis por hash de senha, rotação,
  sessão, rate limit e timing attack. É onde moram as falhas.
- **C** resolve de graça um problema que o Projeto 1 teria de qualquer jeito: onde o
  `data.json` mora se não pode estar no git. A resposta é R2.

Defesa em profundidade: o Worker valida o JWT independentemente do perímetro. Quem furar o
Access não puxa carteira.

### Infraestrutura confirmada

- Conta Cloudflare: `7ac79fb1030e4e81115ef33c21a9b070` (szuchmacheryan@gmail.com)
- Zonas ativas: `arvore.ia.br`, `multi-assets.com`, `szuchmacher.com.br`, `vixradar.com`
- Hostname alvo: `atlas.szuchmacher.com.br`

### Consequência para o `ingest.ps1`

Passa a fazer upload para o R2 em vez de gravar `data.json` na árvore do projeto.

---

## Projeto 2: Aba de Verificação nativa

Desenho detalhado fica para spec próprio. O contrato já fixado pelos Projetos 1 e 3:

- `data.json` chega por `GET /api/data/:mes`, autenticado, não por arquivo local.
- A verificação **não** vira uma aba isolada com camada de dados própria. Ela injeta em
  `window.AtlasData`, como o `platform-data-real.js` já faz, e as 9 abas existentes passam a
  ver dado real. É o único caminho que evita a incoerência de a aba Verificação mostrar junho
  real enquanto o Dashboard ao lado mostra demo sintético.

Risco conhecido: `platform-data.js` tem 1521 LOC e 14 responsabilidades. É a maior dívida
técnica do projeto e o ponto de acoplamento obrigatório. O spec do Projeto 2 precisa tratar
a extração da geração de demo por seed como pré-requisito, não como refactor oportunista.

---

## Restrições permanentes

- A árvore `Extratos Mensais\<AAAA>_<MM>\` no OneDrive da instância é **read-only em todos os
  níveis**. Só ler e copiar de lá para fora. Nunca escrever, mover, renomear ou deletar.
- Dado real de cliente nunca entra no git.
- `npm test` verde e `git status` limpo antes de fechar qualquer mudança.
