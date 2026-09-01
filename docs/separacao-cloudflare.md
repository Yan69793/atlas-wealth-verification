# Separação do ATLAS na Cloudflare

Levantado em 2026-08-10 durante a preparação do material comercial. Atualizado em 2026-09-01 com a decisão definitiva de URL do ambiente demo.

## Decisão vigente

A URL pública, comercial e canônica do ambiente demo do ATLAS é exclusivamente:

`https://demo.multi-assets.com/`

Não criar outro subdomínio para o demo. Não publicar nem divulgar endereço `pages.dev` ou `workers.dev` como alternativa. Qualquer referência antiga de teste ou demonstração deve ser substituída pela URL canônica acima.

O domínio `demo.multi-assets.com` contém somente dados sintéticos e é aberto de propósito. A instância de produção de cliente continua separada e não é objeto desta decisão.

## Isolamento do demo

O Worker do demo está em `demo-worker/wrangler.toml` com domínio customizado `demo.multi-assets.com` e `workers_dev = false`. Assim, a superfície pública do demo permanece única.

O diretório publicado é montado por `scripts/build-deploy.mjs`. Ele não aponta para a raiz do repositório, bloqueia overlays de dados reais e restringe os binários permitidos. O demo não deve ganhar dependência de dados ou endpoints da instância de cliente.

## Superfícies que devem usar a URL canônica

Aplicam-se a mesma URL em materiais comerciais, currículo, site pessoal, README, documentação, metadados Open Graph, cartões de compartilhamento, apresentações, configurações do Worker e links externos para a demonstração.

A apresentação pode usar um caminho dentro do mesmo host, como `https://demo.multi-assets.com/apresentacao`, e imagens sociais podem usar caminhos como `https://demo.multi-assets.com/atlas-card.png`. O host continua sendo sempre `demo.multi-assets.com`.

## Regra operacional

Mudanças no demo podem ser publicadas no Worker específico do ambiente demo. Não alterar a instância de produção de cliente para cumprir esta regra. Não criar nova zona, novo subdomínio ou projeto Pages para o ATLAS demo.

## Higiene de credencial

Chave da Cloudflare colada em texto puro em conversa, log ou arquivo deve ser revogada, não reaproveitada. Tokens de publicação devem ter escopo mínimo sobre o recurso do demo.
