# Separação do ATLAS na Cloudflare

Levantado em 2026-08-10, durante a preparação do material comercial.

Decisão pedida: separar de verdade o ATLAS do resto da conta Cloudflare, com
chaves distintas, em vez de manter tudo junto e confiar em disciplina.

Este documento existe porque o levantamento mudou o desenho do problema. A
separação não é um botão, e o caminho óbvio não funciona.

## O que está no ar hoje

Conta única: `7ac79fb1030e4e81115ef33c21a9b070`.

| Endereço | O que é | Perímetro | Dado real alcançável |
|---|---|---|---|
| `demo.multi-assets.com` | demo comercial, Worker de assets | aberto, de propósito | não existe no pacote |
| `app-verificacao-carteiras-atlas.prospects-intel.workers.dev` | mesmo Worker do demo | aberto | não existe no pacote |
| `atlas.szuchmacher.com.br` | instância do cliente | Cloudflare Access | 302 para o Access |
| `atlas-instancia.prospects-intel.workers.dev` | mesma instância, endereço técnico | **sem Access** | 401 pelo próprio Worker |
| `atlas-wealth-verification.pages.dev` | projeto legado, ainda em uso | Cloudflare Access | 302 para o Access |

`atlas-wealth` (`atlas-wealth-63u.pages.dev`) foi apagado em 2026-08-10. Era
cópia pública de julho, com nome de casa fixado no `<title>`, contradizendo a
marca neutra que o produto vende. Não continha dado real, conferido antes de
apagar.

## A falha de separação que existe hoje

A instância do cliente tem duas portas com regras diferentes. Pelo domínio
próprio o Access barra antes de a aplicação carregar. Pelo endereço
`workers.dev` a aplicação carrega, e o que segura o dado é a segunda tranca,
o 401 do próprio Worker.

Não é vazamento, é dupla trava funcionando. Mas o perímetro anunciado é o
Access, e ele simplesmente não se aplica num dos dois endereços do mesmo
Worker. Fechar isso custa uma linha (`workers_dev = false` no wrangler da
instância) e um redeploy.

## Por que mover zona não resolve

Uma zona só existe em uma conta Cloudflare. As quatro zonas da conta já
carregam site de produção que não tem relação com o ATLAS:

- `multi-assets.com` — o ápice e o `www` são a plataforma MultiAsset. O ATLAS
  mora só no subdomínio `demo`.
- `szuchmacher.com.br` — o ápice e o `www` são o site institucional. O ATLAS
  mora só no subdomínio `atlas`.
- `vixradar.com` — VIX Radar.
- `arvore.ia.br` — A Árvore das IAs.

Mover `multi-assets.com` para uma conta nova leva a plataforma MultiAsset
junto. Mover `szuchmacher.com.br` leva o site institucional junto. Nos dois
casos a separação do ATLAS é comprada derrubando vizinho que não pediu nada.

## Caminho que funciona

Domínio novo, dedicado ao ATLAS, numa conta nova. Não é migração de zona, é
zona nova, então nada existente se mexe.

1. Registrar um domínio para o produto. Neutro, sem o nome da consultoria,
   pela mesma razão que `demo.multi-assets.com` foi escolhido no lugar de
   `szuchmacher.com.br`.
2. Criar a conta Cloudflare do ATLAS e apontar o domínio novo para ela. **Só
   o dono faz isso.** Criação de conta e autenticação não são delegáveis.
3. Emitir duas chaves separadas, cada uma enxergando só a sua conta. A chave
   do produto deixa de alcançar VIX Radar, MultiAsset, tapetier e as
   instâncias de cliente.
4. Publicar o demo na conta nova com `scripts/deploy-cf.ps1 -Target worker`,
   trocando o `[[routes]]` do `demo-worker/wrangler.toml`.
5. Trocar o endereço no `og:url`, no `og:image` e no rodapé da apresentação,
   em `docs/go-to-market/apresentacao-atlas.html`, e regerar o cartão com
   `scripts/gera-card-social.py`. O portão de verificação cobre isso: se o
   `og:image` apontar para endereço que não é o publicado, `npm test` falha.
6. Aposentar `demo.multi-assets.com` com redirecionamento, não apagando. Link
   comercial já enviado continua funcionando.

Enquanto o passo 1 não acontece, o ganho barato é o passo 3 sozinho: chave
por recurso, escopo mínimo, sem mexer em domínio nenhum. Uma chave que só
publica o Worker do demo não alcança dado de cliente mesmo estando na mesma
conta.

## Por que isso também é decisão comercial

Se a venda do sistema acontecer, o comprador recebe o produto. Demo comercial
morando na mesma conta das instâncias de cliente, do VIX Radar e dos projetos
pessoais é exatamente o que não se quer na hora de entregar. Conta separada
transforma a entrega em transferência de conta, em vez de arqueologia sobre o
que pode e o que não pode sair junto.

## Higiene de credencial

Chave da Cloudflare colada em texto puro em conversa, log ou arquivo deve ser
revogada, não reaproveitada. Em 2026-08-10 uma chave com permissão de escrita
em Pages foi exposta dessa forma e precisa ser rotacionada em
https://dash.cloudflare.com/profile/api-tokens.

---

## Inventário canônico — conferido por API em 2026-08-15 (somente leitura)

O que o ATLAS usa de verdade na conta única
`7ac79fb1030e4e81115ef33c21a9b070` hoje. Fonte: Workers, R2, KV, D1, Access,
Pages e zonas da conta, lidos por API em 2026-08-15.

### Workers do ATLAS (2)

**`atlas-instancia`** (`7e229c8e624e416a9df3171fd9cf033e`) — instância do
cliente. Rota: `atlas.szuchmacher.com.br` (custom domain na zona
szuchmacher.com.br). Bindings: R2 `ATLAS_DATA` (bucket `atlas-data`), assets
`ASSETS`, variáveis `ACCESS_TEAM_DOMAIN` (`tapetier-pages.cloudflareaccess.com`)
e `ACCESS_AUD` (audience da app Access). Um secret: `DIRECTOR_KEY`. Sem KV,
sem D1, sem Durable Object, sem service binding. `workers_dev` era `true`
(canal técnico do diretor); patch de 2026-08-15 muda para `false`, aguardando
deploy autorizado.

**`app-verificacao-carteiras-atlas`** (`e159b7b6c7b34ada84ac611d95fde842`) —
demo comercial, só assets estáticos. Rota: `demo.multi-assets.com` (custom
domain na zona multi-assets.com). `workers_dev = true`, aberto de propósito
(não existe dado real no pacote). Nenhum binding, nenhum secret.

### Storage

- **R2 `atlas-data` NÃO está vazio**: 40 objetos, `audits/` com 37 JSON
  mensais (2023-06 a 2026-06) e `overlays/` com 3 arquivos JS de dado real
  (LGPD). A premissa de bucket vazio não se confirma.
- **KV**: 9 namespaces existem na conta, todos de outros projetos. Nenhum
  está vinculado aos Workers do ATLAS. Não há KV escondido do ATLAS.
- **D1**: `verificacao-db` (`57ec4a65-173d-4752-8b91-b32d288c1fc8`) existe na
  conta e **não** tem binding em nenhum Worker do ATLAS. Propriedade incerta:
  não mexer até comprovar dono. Nenhum outro storage vinculado ao ATLAS.

### Access (Zero Trust)

Três aplicações têm relação com o ATLAS:

- **ATLAS — instância do cliente** (`atlas.szuchmacher.com.br`): 3 políticas
  (Yan, gerente, e service token `atlas-verificacao-claude` com decisão
  non_identity). Este é o perímetro real da instância.
- **atlas-wealth-verification.pages.dev**: projeto Pages legado, com Access
  (acessos Fabio e Meyer).
- **atlas-wealth-verification (previews) — LGPD**: `*.pages.dev`, Access.
- Service token `atlas-verificacao-claude` (`a9c25b80-ff06-42ba-bc46-d15ed3b4c6e5`),
  expira 2027-08-06, habilitado.

### Pages

`atlas-wealth-verification.pages.dev` é o projeto legado do ATLAS, ainda em
uso, com Access. O projeto `radar-credito` (VIX Radar, `vixradar.com`) tem na
configuração de produção uma variável `CLOUDFLARE_API_TOKEN`; o valor não é
legível por API, então a dependência com a chave exposta fica NÃO COMPROVADA
até o dono conferir a máscara no painel.

### Recursos de propriedade incerta (não mexer)

- D1 `verificacao-db`.
- KV `CACHE`, `SZ_CACHE` e demais namespaces (aparência de site
  szuchmacher.com.br, sem confirmação).
- Zona `multi-assets.com` e `demo.multi-assets.com`: o subdomínio `demo` é do
  ATLAS, a zona é da plataforma MultiAsset.
- Zona `szuchmacher.com.br`: o subdomínio `atlas` é do ATLAS, a zona é do
  site institucional.

### O que a chave exposta alcança (impacto da revogação)

A chave de ID `6a8d3ce39ed73eb9d71088e35b1a9187` (final `c17`) circulou em
texto em 2026-08-10. Nenhum arquivo do repositório ATLAS referencia essa
chave, e o pipeline de deploy não depende dela (a credencial vem da variável
de ambiente `CLOUDFLARE_API_TOKEN` da máquina). O ponto cego é a variável
`CLOUDFLARE_API_TOKEN` do projeto Pages do VIX Radar: valor ilegível por API.
Revogação não quebra o deploy do ATLAS. O risco residual é exclusivamente
essa variável do Pages, a conferir no painel pela máscara.

---

## Checklist manual da conta nova (só o dono executa)

Ordem sugerida, cada item é manual e não delegável:

1. Registrar domínio neutro do produto (passo 1 do caminho decidido).
2. Criar a conta Cloudflare nova e adicionar a zona do domínio novo.
3. Emitir duas chaves, uma por conta, escopo mínimo por recurso.
4. Criar bucket R2 `atlas-data` na conta nova. A migração dos 40 objetos
   (37 audits + 3 overlays LGPD) só sobe com decisão explícita do operador.
5. Recriar a app Access "ATLAS — instância do cliente" na conta nova com as
   3 políticas (dono, gerente, service token) e emitir novo service token.
   Atenção: o `ACCESS_AUD` muda na conta nova, e o valor novo precisa entrar
   no wrangler da instância.
6. Reaplicar o secret `DIRECTOR_KEY` no worker da instância.
7. Deploy do demo na conta nova via `scripts/deploy-cf.ps1 -Target worker`,
   com `[[routes]]` do `demo-worker/wrangler.toml` apontando para o domínio
   novo, e `account_id` novo.
8. Deploy da instância na conta nova com `workers_dev = false`.
9. Atualizar `og:url`, `og:image` e rodapé da apresentação, regerar o cartão.
   `npm test` trava endereço errado.
10. Aposentar `demo.multi-assets.com` com redirecionamento, sem apagar.
11. Trocar a fonte de credencial da máquina (variável
    `CLOUDFLARE_API_TOKEN` do ambiente) junto com o `account_id` dos dois
    wrangler.toml. Enquanto o ambiente apontar para a conta antiga, nenhum
    deploy sai do lugar.

## Bloqueadores para a Fase 1

- Registro do domínio novo (decisão de marca, passo do dono, sem data).
- Revogação manual da chave exposta e conferência da variável do Pages do
  VIX Radar no painel.
- Deploy do patch `workers_dev = false` da instância aguarda autorização do
  dono (diff e testes já apresentados).
- Migração do R2 exige decisão explícita de mover dado real de cliente para
  serviço externo (LGPD).

## Progresso em 2026-08-15 (noite)

- Conta nova criada pelo dono: `6448fd4d57773e5e38cbd1a763283a90`
  (szuchmacheryan44@gmail.com), subdomínio workers.dev `atlaswealth`
  registrado.
- Token da conta nova disponível na máquina como
  `CLOUDFLARE_API_TOKEN_ATLAS`, nunca em arquivo nem em chat.
- Demo publicado na conta nova:
  `app-verificacao-carteiras-atlas.atlaswealth.workers.dev`, versão
  94a1c3bb, pacote com 6 arquivos e sem dado real. Servindo, confirmado por
  busca externa. O curl da máquina local falha no handshake TLS desse
  hostname específico (schannel), sem relação com o deploy.
- `demo-worker/wrangler.nova-conta.toml` e `scripts/deploy-nova-conta.ps1`
  commitados na branch feat/separacao-cloudflare.
- Domínio escolhido: `atlasverif.com`, disponível, US$ 10,46/ano. Registro
  tentado duas vezes via API, as duas recusadas na cobrança
  (billing_auth_failed), cartão segue sem autorizar. Reserva:
  atlasverifica.com.
- **Decisão do dono em 2026-08-15: não registrar o domínio agora.** O demo
  permanece publicado na conta nova no endereço técnico workers.dev, e o
  endereço comercial continua sendo `demo.multi-assets.com` (conta antiga),
  sem redirecionamento. `atlasverif.com` fica como candidato escolhido para
  quando a fase de domínio for retomada. Quando for: registrar, mover
  domínio e zona para a conta nova, ligar custom domain ao demo, trocar
  og:url/og:image/rodapé, regerar cartão, npm test, verificação por curl e
  redirecionamento do demo.multi-assets.com.
