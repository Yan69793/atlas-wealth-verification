/**
 * src/main.jsx — entrada única do bundle (Vite).
 *
 * A ordem de import É o contrato de inicialização, espelho exato da ordem
 * antiga do index.html: tokens → parsers → dados → utils → páginas → shell.
 * Páginas leem window.AtlasData/AtlasUtils/... no topo do módulo, então um
 * import fora de ordem quebra em tela branca. O shell (platform-app.jsx) tem
 * checkDeps() que acusa namespace faltando, mas ele só roda depois que tudo
 * já foi avaliado — a ordem aqui é a proteção real.
 *
 * Shims: Recharts é lido via window.Recharts nas páginas de gráfico (há o
 * padrão degradação graciosa quando ausente). React/ReactDOM ficam como
 * globals por compatibilidade com trechos que ainda os referenciam livres.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Recharts from 'recharts';

globalThis.React = React;
globalThis.ReactDOM = ReactDOM;
globalThis.Recharts = Recharts;

/* 0. Sigla de cliente — primeiro de tudo, porque a camada de dados já usa
   `window.AtlasSigla.sigla` para montar o catálogo que as telas leem. */
import '../platform-sigla.js';

/* 1. Design tokens — JS puro, primeiro */
import '../platform-tokens.js';

/* 2. Parser de importação (CSV/Excel) — JS puro */
import '../platform-parsers.js';

/* 3. Camada de dados (demo + overlay real opcional via window._AtlasRealData) */
import '../platform-data.js';

/* 3b. Risk scoring — depois de platform-data.js, usa window.AtlasData._internal */
import '../platform-data-risk.js';

/* 3c. Fallback sintético de HISTORICO_DATA quando o overlay real não carregou.
   O overlay (platform-historico.js) é script clássico no index.html e roda
   antes deste bundle, então window.HISTORICO_DATA já existe quando chega aqui. */
import '../platform-historico-demo.js';

/* 3d. Fallback sintético de OPORTUNIDADES (mesmo papel: só roda se o overlay
   da instância ainda não populou a janela). */
import '../platform-oportunidades-demo.js';

/* 3e. Fallback sintético de VENCIMENTOS (idem). */
import '../platform-vencimentos-demo.js';

/* 3f. Fallback sintético de CAIXA PARADO (idem). */
import '../platform-caixa-parado-demo.js';

/* 3g. Fallback sintético de QUEDA DE RECEITA (idem). */
import '../platform-receita-drop-demo.js';

/* 3h. Fallback sintético do RADAR DE CARTEIRAS (idem). Gerado pelo motor,
   ver scripts/gerar-radar-demo.mjs — não editar à mão. */
import '../platform-radar-demo.js';

/* 3i. Fallback sintético de EVENTOS DE CRÉDITO (idem). Gerado pelo motor,
   ver scripts/gerar-credito-demo.mjs — não editar à mão. */
import '../platform-credito-demo.js';

/* 3j. Camada de decisão cruzada. Depois dos overlays porque lê radar e crédito,
   antes das páginas porque ranking, dashboard, busca, comparativo e carteira
   leem dela. Não recalcula nada do motor: filtra, cruza e ordena. */
import '../platform-consolidado.js';

/* 4. Utilitários, ícones, gráficos, UI primitives */
import '../platform-utils.jsx';

/* 5. Páginas: removidas daqui em 2026-08-30 (lazy-load por rota). Cada
   platform-X.jsx (registra window.AtlasPages.*) agora só é baixado quando a
   rota é visitada ou o link ganha hover/foco, via PAGE_LOADERS em
   platform-app.jsx. tests/validate.js verifica que as 21 páginas continuam
   com entrada lá, apontando pra arquivo que existe de verdade. */

/* 6. App shell — POR ÚLTIMO (monta o ReactDOM) */
import '../platform-app.jsx';
