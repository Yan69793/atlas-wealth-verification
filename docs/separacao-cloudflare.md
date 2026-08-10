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
