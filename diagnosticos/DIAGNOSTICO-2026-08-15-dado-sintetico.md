# Diagnóstico — site mostra dado sintético apesar do R2 ter dado real

Data: 2026-08-15 (tarde)
Queixa do dono: atlas.szuchmacher.com.br voltou a mostrar dado sintético (demo) no lugar do dado real.

## Conclusão curta

Não é perda de dado. A infraestrutura inteira confere. O overlay real se perde em um dos quatro gates que o `onerror="void(0)"` engole em silêncio, ou o dono olhou antes do upload de hoje ao meio-dia. Verificação de 2 minutos ao final deste documento.

## O que foi verificado (tudo confere)

1. Domínio `atlas.szuchmacher.com.br` → Worker `atlas-instancia` (route custom_domain, `worker/wrangler.toml:36-38`). Deploy de hoje 10:56 BRT (deployment `5afe7348`), cujo único efeito foi `workers_dev = false`. Código deployado idêntico ao local `worker/src/index.js`.
2. `ACCESS_TEAM_DOMAIN` e `ACCESS_AUD` do wrangler.toml (`:28-34`) batem com a app Access "ATLAS — instância do cliente" (id `4192ab65`). O Access está impondo: request não autenticado responde 302 para o login.
3. R2 bucket `atlas-data`: 40 objetos, chaves exatas que o Worker pede. `overlays/platform-data-real.js` (447.101 B), `overlays/platform-data-audit.js` (538.494 B), `overlays/platform-historico.js` (411.390 B), `audits/2023-06.json` a `audits/2026-06.json`. Overlays byte-idênticos aos locais; conteúdo é dado real de cliente.
4. O HTML servido (`worker/public/index.html`) não contém as tags de overlay, por design: o Worker as injeta no voo (`worker/src/index.js:392-416`) apontando para `/platform-data-real.js` sem carimbo, e o HTML sai com `cache-control: no-cache`.

## Onde o overlay se perde

Quatro gates em `worker/src/index.js:328-361`, todos com `onerror` silencioso na tag injetada:

1. 401 sem sessão Access no browser (sem `Cf-Access-Jwt-Assertion` nem cookie `CF_Authorization`)
2. 403 JWT inválido, exp/nbf/aud/assinatura, incluindo falha no fetch de certs em `https://tapetier-pages.cloudflareaccess.com/cdn-cgi/access/certs`
3. 429 rate limit de 60 req/min por sujeito, compartilhado entre os 3 overlays e `/api/data`
4. 404 objeto ausente (descartado, o R2 tem tudo)

Linha do tempo de hoje que explica a queixa: deploy do Worker 10:56 BRT, upload do R2 concluído 12:48 BRT. Quem olhou antes das 12:48 via 404 em tudo. Depois disso, sessão Access expirada ou cache antigo mantém a mesma tela sintética.

## Verificação de 2 minutos (browser logado)

1. Logar em atlas.szuchmacher.com.br e garantir que a sessão Access está ativa.
2. Abrir `https://atlas.szuchmacher.com.br/platform-data-real.js` e ler o corpo:
   - `/* nao autenticado */` → sessão Access caiu, relogar
   - `/* token invalido */` → problema de JWT/aud/certs
   - `/* limite de requisicoes excedido */` → rate limit
   - JS real (cabeçalho "Reconstruido a partir dos audit.json...") → overlay ok, problema é outro
3. Ctrl+F5 no app e confirmar se o modo real aparece.
4. Se ainda sintético com overlay ok: `wrangler tail` no Worker filtrando `data_access` com `ok: false` (logs em `worker/src/index.js:99-102,356,363`).

## Hipóteses em ordem de probabilidade

1. Sessão Access expirada no browser do dono
2. Olhou antes do upload de 12:48 BRT
3. Cache do browser com HTML antigo

## Recomendação

Pedir ao dono o corpo exato da URL de overlay e seguir o fluxo acima. Se for 401 persistente, revisar a duração de sessão do Access. Se 403, revisar certs e aud. Considerar trocar o fallback silencioso por um aviso visível no app quando o overlay falhar, o Worker já loga `data_access` com `ok:false`, mas o usuário não vê nada.
