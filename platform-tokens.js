/* platform-tokens.js -- Design system com 3 paletas de tema
   Carregado ANTES do CSS para aplicar data-theme antes do primeiro paint.
   Publica em window.AtlasTokens.
*/

(function () {
  'use strict';

  var TOKENS = {
    /* ============================================================
       PALETAS (3 temas)
       Mapeiam para as variaveis CSS em platform-styles.css
       ============================================================ */
    palettes: {
      /* Tema default -- Editorial (paper + navy + gold) */
      editorial: {
        '--paper':       '#F9F7F4',
        '--paper-mid':   '#F2EEE8',
        '--rule':        '#E3DDD5',
        '--rule-strong': '#C8C0B5',
        '--muted':       '#9A9188',
        '--body':        '#3C3830',
        '--heading':     '#0D1520',
        '--navy':        '#05305F',
        '--navy-2':      '#04275A',
        '--sidebar-bg':  '#0A1928',
        '--gold':        '#C4A228',
        '--gold-2':      '#A8881E',
        '--green':       '#1A6B3A',
        '--green-bg':    '#EBF5EF',
        '--amber':       '#8B5A00',
        '--amber-bg':    '#FEF4E0',
        '--red':         '#8B1A1A',
        '--red-bg':      '#FDEAEA',
      },

      /* Slate -- cinza azulado mais frio */
      slate: {
        '--paper':       '#EEF1F4',
        '--paper-mid':   '#E4E9EE',
        '--rule':        '#D5DDE3',
        '--rule-strong': '#ADBCC7',
        '--muted':       '#8A9CAA',
        '--body':        '#1E2D3A',
        '--heading':     '#0D1A26',
        '--navy':        '#05305F',
        '--navy-2':      '#04275A',
        '--sidebar-bg':  '#0A1928',
        '--gold':        '#B7985D',
        '--gold-2':      '#9A7D3E',
        '--green':       '#17724F',
        '--green-bg':    '#E5F5ED',
        '--amber':       '#96702F',
        '--amber-bg':    '#FDF4E0',
        '--red':         '#9A2D2D',
        '--red-bg':      '#FDEAEA',
      },

      /* Midnight -- dark navy profundo */
      midnight: {
        '--paper':       '#001A2E',
        '--paper-mid':   '#002440',
        '--rule':        '#143550',
        '--rule-strong': '#2A4D68',
        '--muted':       '#5A7185',
        '--body':        '#EAF1F6',
        '--heading':     '#FFFFFF',
        '--navy':        '#6BA8D9',
        '--navy-2':      '#5590C4',
        '--sidebar-bg':  '#00101E',
        '--gold':        '#B7985D',
        '--gold-2':      '#CCAE7C',
        '--green':       '#6BE6B0',
        '--green-bg':    'rgba(107,230,176,0.12)',
        '--amber':       '#D4A657',
        '--amber-bg':    'rgba(212,166,87,0.12)',
        '--red':         '#E08585',
        '--red-bg':      'rgba(224,133,133,0.12)',
      },
    },

    /* ============================================================
       DESIGN TOKENS (camada JS)
       ============================================================ */
    typography: {
      fontFamily: {
        serif: "'Cormorant Garamond', Georgia, serif",
        sans:  "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        mono:  "'JetBrains Mono', 'SF Mono', Menlo, monospace",
      },
      fontSize: {
        xs:   '0.714rem',
        sm:   '0.786rem',
        base: '0.857rem',
        md:   '1rem',
        lg:   '1.15rem',
        xl:   '1.85rem',
        '2xl':'2rem',
      },
    },

    spacing: {
      0:  '0',
      1:  '4px',
      2:  '8px',
      3:  '12px',
      4:  '16px',
      5:  '20px',
      6:  '24px',
      8:  '32px',
      10: '40px',
      12: '48px',
    },

    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      full: '9999px',
    },

    shadows: {
      card:  '0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.06)',
      popup: '0 4px 16px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.06)',
    },
  };

  /* ============================================================
     TEMA ATIVO
     Le de localStorage, aplica no <html data-theme>, persiste.
     ============================================================ */

  function getActiveTheme() {
    try {
      var stored = JSON.parse(localStorage.getItem('atlas_platform_v1'));
      return (stored && stored.ui && stored.ui.theme && TOKENS.palettes[stored.ui.theme])
        ? stored.ui.theme
        : 'editorial';
    } catch (_) {
      return 'editorial';
    }
  }

  function applyTheme(name) {
    if (!TOKENS.palettes[name]) return;
    var vars = TOKENS.palettes[name];
    var root = document.documentElement;
    var keys = Object.keys(vars);
    for (var i = 0; i < keys.length; i++) {
      root.style.setProperty(keys[i], vars[keys[i]]);
    }
    root.dataset.theme = name;
  }

  function setTheme(name) {
    if (!TOKENS.palettes[name]) return;
    applyTheme(name);
    // Persistir no storage existente (compartilha com AtlasUtils.storage)
    try {
      var data = JSON.parse(localStorage.getItem('atlas_platform_v1') || '{}');
      if (!data.ui) data.ui = {};
      data.ui.theme = name;
      localStorage.setItem('atlas_platform_v1', JSON.stringify(data));
    } catch (_) {}
  }

  // Aplicar tema imediatamente (antes do CSS pintar)
  applyTheme(getActiveTheme());

  /* ============================================================
     PUBLICAR
     ============================================================ */
  TOKENS.getActiveTheme = getActiveTheme;
  TOKENS.applyTheme = applyTheme;
  TOKENS.setTheme = setTheme;

  window.AtlasTokens = TOKENS;

  /* ============================================================
     BRAND (white-label): nome do produto e do tenant num unico
     lugar. Trocar aqui troca a sidebar, o relatorio exportado e o
     <title> de uma vez, sem cacar string hardcoded pelo codigo.
     Um platform-brand-real.js (LGPD, gitignored) pode sobrescrever
     window.AtlasBrand antes deste script no futuro, como ja e feito
     com os dados reais.
     ============================================================ */
  var BRAND = window.AtlasBrand || {
    product: 'ATLAS Wealth Verification',
    tenant: 'Meridian Advisory',
    reportLabel: 'Relatório de Carteira',
    confidentiality: 'Uso Interno',
  };
  window.AtlasBrand = BRAND;
  try { document.title = BRAND.product + ' · ' + BRAND.tenant; } catch (_) {}

})();
