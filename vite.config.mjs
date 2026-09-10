/**
 * vite.config.js — build de produção do ATLAS.
 *
 * O contrato de carga muda de "15 arquivos JSX compilados no browser por Babel
 * + 6 CDNs" para "1 bundle + bibliotecas embutidas". O que NÃO muda:
 *   - os overlays de dado real continuam scripts clássicos em runtime, fora do
 *     bundle (nunca compilados para dentro). No build, as tags deles são
 *     retiradas do HTML: no repo do produto os arquivos não existem, e sem a
 *     retirada o Vite tenta resolvê-los e quebra. A instância injeta os
 *     overlays dela no próprio index (scripts/gen-index.mjs da instância).
 *   - o app continua SPA de hash com namespaces window.*; a ordem de execução
 *     dos módulos é a ordem de import em src/main.jsx (espelho da ordem antiga
 *     do index.html).
 *
 * CSP: só no build, de propósito. Em dev o Vite precisa de inline/injeção
 * (HMR), e uma CSP de produção quebraria o desenvolvimento. Em produção vale
 * script-src 'self' + os hosts de telemetria/lazy-load declarados abaixo.
 */

import { defineConfig } from 'vite';

/* Overlays de dado real / marca: scripts clássicos opcionais que o produto
   não tem. A lista espelha scripts/build-deploy.mjs e o .gitignore. */
const OVERLAY_PREFIXES = [
  'platform-brand.js',
  'platform-data-real.js',
  'platform-data-audit.js',
  'platform-historico.js',
  'platform-radar.js',
  'platform-credito.js',
  'platform-oportunidades.js',
  'platform-vencimentos.js',
  'platform-caixa-parado.js',
  'platform-receita-drop.js',
  'platform-cadastro.js',
];

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://static.cloudflareinsights.com https://cdn.sheetjs.com https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://static.cloudflareinsights.com https://cloudflareinsights.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function stripOverlays(html) {
  return html.replace(
    /[ \t]*<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>[ \t]*\n?/g,
    (bloco, src) => {
      const file = src.split('?')[0];
      if (OVERLAY_PREFIXES.some((p) => file === p)) return '';
      return bloco;
    }
  );
}

export default defineConfig(({ command }) => ({
  base: './',
  esbuild: { jsx: 'automatic' },
  /* O gerador sintético do demo NÃO entra no bundle de produção. Ver a seção 0
     de platform-data.js: com o dado dentro do pacote, qualquer um lê as 40
     carteiras pelo console sem passar por autorização, e nenhum escopo no
     Worker restringe nada. Quem gera é o build (scripts/gerar-dataset-demo.mjs,
     que roda o mesmo arquivo com a flag em true) e quem serve é a API. Com
     false, o ramo inteiro vira código morto e sai na minificação.

     Em desenvolvimento a flag fica LIGADA, e isso não abre exceção nenhuma: o
     `serve` do Vite nunca é publicado, e sem ela o `npm run dev` abriria uma
     tela vazia, porque o servidor de desenvolvimento não tem o Worker nem a API
     que fornecem o conjunto. Quem manda é o `command`, não o `mode`, então
     `vite build --mode development` continua saindo sem dado.

     Consequência aceita: `npm run preview` serve o build (sem dado, sem API) e
     mostra a tela de falha de carga. Para ver o app montado localmente, o
     caminho é o Worker (`wrangler dev` em demo-worker/), que é como o demo roda
     de verdade. */
  define: {
    __ATLAS_GERAR_DEMO__: command === 'serve' ? 'true' : 'false',
  },
  build: {
    outDir: 'dist-app',
    target: 'es2018',
  },
  plugins: [
    {
      name: 'atlas-index-html',
      transformIndexHtml(html) {
        if (command === 'serve') return html;
        let out = stripOverlays(html);
        out = out.replace(
          /<meta charset="[^"]*" \/>/,
          '<meta charset="utf-8" />\n  <meta http-equiv="Content-Security-Policy" content="' + CSP + '" />'
        );
        return out;
      },
    },
  ],
}));
