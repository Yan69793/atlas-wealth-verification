# CLAUDE.md — ATLAS (hardened 2026-07-25, atualizado 2026-08-15)

## Localização e repos aninhados

O projeto vive em `E:\Diretorio\Claude\FREQUENTE\ATLAS` desde 2026-08-14
(antes `OCASIONAL\ATLAS`). Não existe caminho absoluto no código: os
launch.json usam `${workspaceFolder}` e os scripts Python derivam a raiz do
próprio arquivo. Três repos git viajam juntos na pasta: o ATLAS
(`Yan69793/atlas-wealth-verification`) → `verificacao-carteiras/` (gitlink em
c0ad7b4) → `core/` (gitlink em d33ee42, branch `fix/paths-bom-pos-mudanca`).
`core/` é outro checkout do mesmo repo do ATLAS, pinado no commit do corte
Vite. Instância do cliente em `verificacao-carteiras/`, fora do git do produto.

## Como responder neste projeto (regra fixa, 2026-08-08)

Resposta curta e em português comum. O usuário é o dono do negócio, não o
programador, e respostas longas cheias de termo técnico não são lidas até o fim.
Pedido explícito dele, repetido duas vezes.

- Aplicar a skill `humanizer` em toda resposta final.
- Sem linguagem de programação no texto: nada de nome de arquivo, número de
  linha, nome de função, comando, código de erro ou jargão de infraestrutura.
  Dizer o efeito no negócio, não o mecanismo.
- Resumir. Se não couber em poucos parágrafos, entregar a conclusão e oferecer o
  detalhe, em vez de despejar tudo.
- Conclusão primeiro. O que mudou, o que quebrou, o que falta decidir.
- Tabela só quando compara coisas de verdade. Prosa é o padrão.

Exceção: quando o usuário pedir o detalhe técnico, ou quando for um comando que
ele precisa colar, aí vai literal e sem tradução. Comando, caminho e saída de
teste nunca são alterados nem humanizados.

## Segurança de dados (LGPD)

- Este repositório é o produto. Instância e dado de cliente ficam fora do git.
- Nunca versionar: pastas de instância (`Verificação Mensal de Carteiras*`), PDFs, DOCX, XLSX, ZIPs com dados reais
- `platform-data-real.js`, `platform-data-audit.js`, `platform-historico.js` são LGPD e estão no .gitignore
- Nome de carteira, apelido, código real e caminho de pasta de cliente não entram em teste nem doc versionada
- Se aparecerem em `git status`, investigar e corrigir o `.gitignore` antes de prosseguir

## Inteligência competitiva (pasta `SyncIA/`)

A pasta `SyncIA/` guarda o dossiê do concorrente SyncIA Desk
(synciadesk.com.br, white-label para escritórios BTG): relatório OSINT e
snapshots do site capturados em 2026-08-14. Não é parte do produto, não entra
em build, teste nem deploy. Está fora do git até decisão explícita de commit.
O material da SYNC TECNOLOGIA (syncai.com.br, site de consultoria) ficou
arquivado em `SyncIA/SYNC-TECNOLOGIA/` e foi descartado como alvo pelo dono.
O gap de features em comparação com o ATLAS está na memória do workspace.

## Ordem de carregamento (build Vite)

O app é buildado com Vite: `npm run build` gera `dist-app/` a partir de
`src/main.jsx`. A ordem de import em `src/main.jsx` É o contrato de
inicialização: tokens → parsers → dados → utils → páginas → shell. Fora de
ordem quebra em tela branca. `tests/validate.js` trava esse contrato.

- Overlays de dado real (`platform-data-real.js`, `platform-data-audit.js`,
  `platform-historico.js`, `platform-brand.js`, e os das fases de inteligência
  `platform-oportunidades.js`, `platform-vencimentos.js`, `platform-caixa-parado.js`)
  são scripts clássicos em runtime, NUNCA entram no bundle. O build os retira
  do HTML. Quem reinjeta: em produção, o Worker da instância (no HTML que ele
  serve, apontando para a rota autenticada do R2); localmente, o
  `scripts/gen-index.mjs` da instância.
- Desenvolvimento: `npm run dev` (Vite com HMR). Publicação do demo: primeiro
  `npm run build`, depois `scripts/deploy-cf.ps1 -Target worker`.
- `scripts/verify-build.mjs` e `scripts/build-deploy.mjs` recusam publicação
  se `dist-app/` contiver overlay, binário ou marca de build dev.

## Autenticação

- App não autentica no cliente. Perímetro é Cloudflare Access + Worker validando JWT.
- Senha fixa `atlas2026` foi removida. `tests/validate.js` falha se ela voltar.
- Não reintroduzir gate no cliente.

## Encoding

- UTF-8 sem BOM. Verificar ausência de mojibake após reescrita.

## Portão de verificação

Antes de declarar qualquer tarefa concluída, execute:
```
npm test
```
Cole a saída real na resposta. Se falhar ou não puder executar, diga explicitamente. Nunca declare "funcionando" sem a saída colada.

## Pendências abertas

Revistas em 2026-08-14, ao fim da sessão das Fases 5-7:

1. **Revogar chave Cloudflare exposta**: o valor circulou em texto numa
   conversa em 2026-08-10 e segue ATIVO em 2026-08-14 (conferido por API, id
   `6a8d3ce39ed73eb9d71088e35b1a9187`). Não é revogável pelos tokens via MCP
   (sem permissão de gerir chaves, erro 9109 nos dois servidores). Ação manual
   do dono em <https://dash.cloudflare.com/profile/api-tokens>. O valor também
   está gravado em texto nas memórias do workspace, a sanitizar depois.
2. **Perímetro da instância**: `atlas-instancia.prospects-intel.workers.dev`
   serve sem Access, com dupla tranca documentada no Worker (401 + bypass por
   cookie). `workers_dev = true` é deliberado, é a URL de diretor usada em
   teste no telefone. Fechar custa uma linha e um redeploy, e derruba o canal
   de teste. Decisão do dono: manter como está ou fechar (ver
   `docs/separacao-cloudflare.md`).
3. **Separação de conta Cloudflare**: domínio novo + conta dedicada para o
   ATLAS segue como caminho decidido, sem data (ver
   `docs/separacao-cloudflare.md`).
4. **CDN do demo**: o risco de página em branco morreu com o build Vite (CSP
   do demo não referencia unpkg/jsdelivr). Resta dependência pontual de CDN
   só na importação de planilha (sheetjs) e no analytics.

Quando o custodiante mandar o primeiro arquivo diário real, ele entra como
dado de instância normal, sem pendência de produto.

### Resolvidas em 2026-08-14

- **Publicar no GitHub**: repo privado `Yan69793/atlas-wealth-verification` criado;
  branch `feat/vite-migration` publicada até 217d1c4 (hash local = remoto, conferido
  em 2026-08-14). Cuidado operacional: a variável `GH_TOKEN` do ambiente sombreia o
  token do keyring do `gh`. Antes de qualquer push, rodar
  `$env:GH_TOKEN=$null; $env:GITHUB_TOKEN=$null`.

- **pdfplumber ausente**: instalada via pip no interpretador padrão. Era o que fazia
  a parity PDF vs Excel falhar; com ela, as suítes de parity rodam com dado real.
- **Corte da instância para o build Vite**: submodule no commit fecbe17, gen-index e
  build-worker-assets consumindo core/dist-app, CSP do worker no contrato novo,
  injeção de overlays no HTML servido + no-cache. Validado no fluxo diário do dono.

- **Primeira fonte real (dono)**: substituída pelo arquivo modelo da convenção B3
  (autorizado pelo dono em 2026-08-14). Entregues o adaptador de arquivo posicional
  estilo B3 e o mapa de classes da instância; a estreia do acompanhamento diário foi
  provada com a série sintética de 5 dias (eventos idênticos aos desenhados). O
  primeiro arquivo real do custodiante entra como dado de instância normal.

- **Thresholds do snapshot (dono)**: confirmados e calibrados pelo dono em 2026-08-14,
  tudo percentual (posição nova/encerrada 3% do PL, liquidez parada 10% do PL com
  mínimo de 7 dias, janela de 90 dias; os demais limiares seguem a calibração do
  diff). Fase 4 aprovada e publicada no demo com esses valores.

### Resolvidas em 2026-08-15

- **Publicação pendente + cadeia de gitlinks**: autorizado pelo dono. Os 2 commits
  locais foram publicados na `feat/vite-migration` e a cadeia dos 3 repos foi
  fechada: as mesmas 5 correções de caminho/BOM foram commitadas no `core/` na
  branch `fix/paths-bom-pos-mudanca` (d33ee42), o gitlink do
  `verificacao-carteiras/` avançou para c0ad7b4 e o do ATLAS para 810f0d9. Não
  mergear a branch do core na `feat/vite-migration`: os mesmos ajustes já vivem lá
  como 466cb7a. Suíte após tudo: 352/352 checks + 101/101 testes.
- **Credencial do git para GitHub**: `gh auth setup-git` configurado; o git passa a
  usar o keyring do `gh` (conta Yan69793) como credencial no github.com. Antes valia
  só para o repo do ATLAS, agora vale para os três.
