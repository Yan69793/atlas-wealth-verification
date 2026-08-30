/* platform-app.jsx — shell: login, sidebar, topbar, router, contexts */
import React from 'react';
import ReactDOM from 'react-dom/client';

(() => {
  const {
    useState, useEffect, useContext, createContext,
    useCallback, useRef, useMemo,
  } = React;

  /* ============================================================
     VERIFICAÇÃO DE DEPENDÊNCIAS
  ============================================================ */

  const REQUIRED_NAMESPACES = ['AtlasData', 'AtlasUtils', 'AtlasIcons', 'AtlasCharts', 'AtlasUI'];

  function checkDeps() {
    return REQUIRED_NAMESPACES.filter(ns => !window[ns]);
  }

  /* ============================================================
     CONTEXTS
  ============================================================ */

  const AuthContext    = createContext(null);
  const MonthContext   = createContext(null);
  const ToastContext   = createContext(null);

  function useAuth()  { return useContext(AuthContext); }
  function useMonth() { return useContext(MonthContext); }
  function useToast() { return useContext(ToastContext); }

  // Expor globalmente para uso nas páginas
  window.AtlasContexts = { AuthContext, MonthContext, ToastContext, useAuth, useMonth, useToast };

  /* ============================================================
     TELA DE ERRO (dependências faltando)
  ============================================================ */

  function ErrorScreen({ missing }) {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        background:'#0A1928', color:'#E3DDD5', fontFamily:'JetBrains Mono, monospace', padding:'24px'
      }}>
        <div style={{maxWidth:480, textAlign:'center'}}>
          <div style={{fontSize:'1.2rem', fontWeight:500, marginBottom:12, color:'#C4A228'}}>
            ATLAS — Erro de inicialização
          </div>
          <div style={{fontSize:'0.857rem', color:'rgba(255,255,255,0.6)', marginBottom:16}}>
            Namespaces não carregados:
          </div>
          <ul style={{textAlign:'left', listStyle:'none', padding:0}}>
            {missing.map(ns => (
              <li key={ns} style={{padding:'4px 0', fontSize:'0.857rem'}}>
                <span style={{color:'#8B1A1A'}}>MISSING</span> — {ns}
              </li>
            ))}
          </ul>
          <div style={{marginTop:16, fontSize:'0.786rem', color:'rgba(255,255,255,0.4)'}}>
            Verifique a ordem de carregamento dos scripts e que o servidor está rodando (Babel requer XHR).
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     ERROR BOUNDARY (contém erro de render numa página só)
     Sem isto, qualquer throw em qualquer componente desmonta a
     árvore inteira do React e o app vira tela branca. Com dado real
     (formato diferente da demo) isso acontecia "toda hora". O boundary
     mantém sidebar/topbar/troca-de-mês vivos e isola a falha na área
     de conteúdo. É reinstanciado a cada navegação (key={page}), então
     trocar de página limpa o erro automaticamente.
  ============================================================ */

  function PageErrorFallback({ error }) {
    return (
      <div style={{ padding: '32px' }}>
        <div className="page-header">
          <div className="page-eyebrow" style={{ color: '#8B1A1A' }}>Erro nesta página</div>
          <h1 className="page-title">Não foi possível renderizar este conteúdo</h1>
          <div className="page-subtitle">
            O restante do sistema continua funcionando. Troque de página na barra lateral,
            ou recarregue. Se persistir, o mês ou os dados carregados podem estar num formato inesperado.
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--gold, #C4A228)',
              background: 'transparent', color: 'var(--heading)', cursor: 'pointer', fontSize: '0.857rem',
            }}
          >
            Recarregar
          </button>
          <pre style={{
            marginTop: 12, marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontFamily: 'var(--font-mono)', fontSize: '0.786rem', color: 'var(--muted)',
          }}>
            {String((error && (error.message || error)) || 'Erro desconhecido')}
          </pre>
        </div>
      </div>
    );
  }

  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
      return { error };
    }
    componentDidCatch(error, info) {
      // Loga o stack completo no console para diagnóstico; a UI mostra só a mensagem.
      if (window.console && console.error) {
        console.error('[ATLAS] Erro capturado no boundary:', error, info);
      }
    }
    render() {
      if (this.state.error) return <PageErrorFallback error={this.state.error} />;
      return this.props.children;
    }
  }

  /* ============================================================
     LOGIN
  ============================================================ */

  /* A LoginScreen foi removida junto com a senha fixa.
   *
   * Ela também exibia "Ambiente de demonstração, dados sintéticos, sem vínculo
   * com carteiras ou clientes reais". Numa instância com dado real carregado,
   * esse aviso era falso, e a tela que o mostrava era a primeira coisa que o
   * usuário via.
   */

  /* ============================================================
     MONOGRAMA / LOGO
  ============================================================ */

  /* Selo de verificacao: escudo com check. Generico de proposito, nao
     carrega inicial nem nome de casa, entao serve a qualquer instancia
     sem virar a marca de alguem. O `rect` translucido sobrevive aos tres
     temas porque --sidebar-bg e o mesmo escuro nos tres. */
  function AtlasLogo() {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="sidebar-logo-mark" aria-hidden="true">
        <rect x="0.6" y="0.6" width="30.8" height="30.8" rx="7.4"
          fill="rgba(255,255,255,0.05)" stroke="#C4A228" strokeOpacity="0.45" strokeWidth="1.2"/>
        <path d="M16 6.6 L24.4 10.1 V16 C24.4 20.6 21 23.9 16 25.6 C11 23.9 7.6 20.6 7.6 16 V10.1 Z"
          fill="none" stroke="#C4A228" strokeWidth="1.35" strokeLinejoin="round"/>
        <path d="M12.1 16 L14.9 18.9 L20.2 12.9"
          stroke="#C4A228" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  /* ============================================================
     SIDEBAR
  ============================================================ */

  const NAV_PAINEL = [
    { id:'dashboard',   label:'Dashboard',          icon:'dashboard',  path:'#/dashboard'   },
    { id:'ranking',     label:'Ranking de Criticidade', icon:'report',  path:'#/ranking'     },
    { id:'risco',       label:'Radar de Risco',      icon:'alert',      path:'#/risco'       },
    { id:'radar',       label:'Radar de Carteiras',  icon:'trend',      path:'#/radar'       },
    { id:'eventos',     label:'Eventos & Impacto',   icon:'findings',   path:'#/eventos'     },
    { id:'comparativo', label:'Comparativo',         icon:'compare',    path:'#/comparativo' },
    { id:'achados',     label:'Achados & Exceções',  icon:'findings',   path:'#/achados'     },
    { id:'oportunidades', label:'Oportunidades',      icon:'portfolios', path:'#/oportunidades' },
    { id:'vencimentos',   label:'Vencimentos',        icon:'trending_up', path:'#/vencimentos'  },
    { id:'caixa-parado',  label:'Caixa parado',       icon:'revenue',    path:'#/caixa-parado'  },
    { id:'valor-assessor', label:'Valor do assessor', icon:'star',      path:'#/valor-assessor' },
    { id:'tendencia',   label:'Tendência do Ciclo',  icon:'trend',      path:'#/tendencia'   },
    { id:'custos',      label:'Transp. de Custos',   icon:'revenue',    path:'#/custos'      },
    { id:'receitas',    label:'Receitas & ROA',      icon:'revenue',    path:'#/receitas'    },
    { id:'busca',       label:'Rastreador de Ativos', icon:'search',   path:'#/busca'       },
  ];

  const NAV_GESTAO = [
    { id:'cadastro',    label:'Cadastro & Compliance', icon:'register',  path:'#/cadastro'  },
    { id:'importar',    label:'Importar Extratos',     icon:'import',    path:'#/importar'  },
    { id:'usuarios',    label:'Usuários',              icon:'users',     path:'#/usuarios'  },
  ];

  /* ------------------------------------------------------------
     FASES 2 A 4: disponibilidade da tela depende da confianca no dado

     Estas tres telas leem overlay proprio (ATLAS_*_DATA). Em demo o payload
     sintetico e legitimo e a faixa avisa o usuario. Fora de demo, sintetico
     nao pode aparecer: seria carteira inventada ao lado de dado real de
     cliente, sem aviso, num produto que se vende por "prove o numero".

     O produtor do overlay real destas fases ainda nao existe (nao ha comando
     `oportunidades` no cli-snapshot), entao hoje elas simplesmente saem do
     menu na instancia. No dia que o overlay real chegar ele nao tera a marca
     `sintetico` e a tela volta sozinha, sem mexer aqui.
  ------------------------------------------------------------ */
  const FASE_DATA_GLOBAL = {
    oportunidades: 'ATLAS_OPORTUNIDADES_DATA',
    vencimentos: 'ATLAS_VENCIMENTOS_DATA',
    'caixa-parado': 'ATLAS_CAIXA_PARADO_DATA',
    radar: 'ATLAS_RADAR_DATA',
    eventos: 'ATLAS_CREDITO_DATA',
  };

  function faseDisponivel(id) {
    const nomeGlobal = FASE_DATA_GLOBAL[id];
    if (!nomeGlobal) return true;
    const payload = window[nomeGlobal];
    if (!payload) return false;
    const D = window.AtlasData;
    const mode = (D && D.getDataMode && D.getDataMode()) || 'demo';
    return mode === 'demo' || !payload.sintetico;
  }

  function Sidebar({ currentPage, onNavigate, open, onClose }) {
    const { Icon } = window.AtlasIcons;

    function NavItem({ item }) {
      const active = currentPage === item.id;
      return (
        <button
          className={`sidebar-item${active ? ' active' : ''}`}
          onClick={() => { onNavigate(item.path); onClose && onClose(); }}
          onMouseEnter={() => prefetchPage(item.id)}
          onFocus={() => prefetchPage(item.id)}
          title={item.label}
        >
          <Icon name={item.icon} size={16} />
          {item.label}
        </button>
      );
    }

    return (
      <>
        <nav className={`sidebar${open ? ' open' : ''}`} aria-label="Navegação principal">
          <div className="sidebar-logo">
            <AtlasLogo />
            <div>
              <div className="sidebar-logo-text">ATLAS</div>
              <div className="sidebar-logo-sub">Wealth Verification</div>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Painel</div>
            {NAV_PAINEL.filter(item => faseDisponivel(item.id))
              .map(item => <NavItem key={item.id} item={item} />)}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Gestão</div>
            {NAV_GESTAO.map(item => <NavItem key={item.id} item={item} />)}
          </div>

          {/* Sem botão de sair: não há sessão neste app para encerrar. Atrás de
              um perímetro (Cloudflare Access), quem encerra a sessão é o
              perímetro, em /cdn-cgi/access/logout, e não o app. */}
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-user-name">Administrador</div>
              {/* Sem fallback de nome de casa: instancia sem platform-brand.js
                  simplesmente nao assina o rodape. */}
              {window.AtlasBrand && window.AtlasBrand.tenant
                ? <div>{window.AtlasBrand.tenant}</div>
                : null}
            </div>
          </div>
        </nav>
        {open && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />}
      </>
    );
  }

  /* ============================================================
     TOPBAR
  ============================================================ */

  function Topbar({ title, onMenuClick }) {
    const { selectedMonth, setSelectedMonth } = useMonth();
    const { Icon } = window.AtlasIcons;
    const _vis = window.AtlasData.visibleMonths ? window.AtlasData.visibleMonths() : null;
    const months = _vis ? _vis.months : window.AtlasData.MONTHS;
    const labels = _vis ? _vis.labels : window.AtlasData.MONTH_LABELS;
    const tokens = window.AtlasTokens;
    const [theme, setThemeLocal] = useState(() => tokens ? tokens.getActiveTheme() : 'editorial');

    function handleThemeChange(name) {
      setThemeLocal(name);
      if (tokens) tokens.setTheme(name);
    }

    return (
      <header className="topbar">
        <button className="topbar-hamburger" onClick={onMenuClick} aria-label="Abrir menu">
          <Icon name="menu" size={20} />
        </button>

        <div className="topbar-title">{title}</div>

        {tokens && (
          <div className="topbar-month-select topbar-theme-select" style={{ marginRight: 12 }}>
            <label htmlFor="global-theme-select">Tema</label>
            <select
              id="global-theme-select"
              className="form-select"
              value={theme}
              onChange={e => handleThemeChange(e.target.value)}
              style={{ minWidth: 100 }}
            >
              <option value="editorial">Editorial</option>
              <option value="slate">Slate</option>
              <option value="midnight">Midnight</option>
            </select>
          </div>
        )}

        <div className="topbar-month-select">
          <label htmlFor="global-month-select">Mês</label>
          <select
            id="global-month-select"
            className="form-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ minWidth: 110 }}
          >
            {months.map((m, i) => (
              <option key={m} value={m}>{labels[i]}</option>
            ))}
          </select>
        </div>

        <button
          className="btn btn--ghost"
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          title="Modo apresentacao (F11)"
          style={{ padding: '6px 10px', minHeight: 36 }}
        >
          <Icon name="trending_up" size={16} />
          <span style={{ fontSize: '0.786rem' }}>Tela cheia</span>
        </button>
      </header>
    );
  }

  /* ============================================================
     PAGINAS PLACEHOLDER (etapas 2-8)
  ============================================================ */

  // Cada página será substituída na etapa correspondente.
  // Segue o padrão IIFE para evitar colisão de nomes globais.

  function PlaceholderPage({ title, etapa }) {
    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Em desenvolvimento</div>
          <h1 className="page-title">{title}</h1>
        </div>
        <div className="page-placeholder">
          {title} — Etapa {etapa}
        </div>
      </div>
    );
  }

  /* Tela de fase alcancada por link direto sem dado confiavel. Diz o motivo em
     vez de mostrar tabela vazia, que o usuario leria como defeito. Nunca cai
     para o payload sintetico: e exatamente isso que se esta evitando. */
  function FaseSemDado({ title }) {
    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Sem dado para este ambiente</div>
          <h1 className="page-title">{title}</h1>
        </div>
        <div className="page-placeholder">
          Esta tela precisa do arquivo de {title.toLowerCase()} gerado a partir das
          posições do custodiante. Ele ainda não é produzido para este ambiente.
          Enquanto não for, a tela fica fora do menu, em vez de exibir dado de
          demonstração ao lado das suas carteiras.
        </div>
      </div>
    );
  }

  /* ============================================================
     ROUTER / SHELL
  ============================================================ */

  function pageFromPath(path) {
    // '/login' não é mais uma página. Cai no default junto com qualquer rota
    // desconhecida; o redirect no AppRoot leva ao dashboard em seguida.
    if (path === '/dashboard') return 'dashboard';
    if (path === '/ranking') return 'ranking';
    if (path.startsWith('/carteira/')) return 'carteira';
    if (path === '/achados') return 'achados';
    if (path === '/oportunidades') return 'oportunidades';
    if (path === '/vencimentos') return 'vencimentos';
    if (path === '/caixa-parado') return 'caixa-parado';
    if (path === '/valor-assessor') return 'valor-assessor';
    if (path.startsWith('/visita/')) return 'visita';
    if (path === '/comparativo') return 'comparativo';
    if (path === '/receitas') return 'receitas';
    if (path === '/custos') return 'custos';
    if (path === '/cadastro') return 'cadastro';
    if (path === '/busca') return 'busca';
    if (path === '/risco') return 'risco';
    if (path === '/radar') return 'radar';
    if (path === '/eventos') return 'eventos';
    if (path === '/tendencia') return 'tendencia';
    if (path === '/importar') return 'importar';
    if (path === '/usuarios') return 'usuarios';
    if (path.startsWith('/dev/relatorio/')) return 'dev-relatorio';
    return 'dashboard';
  }

  const PAGE_TITLES = {
    dashboard:  'Dashboard',
    ranking:    'Ranking de Criticidade',
    carteira:   'Carteira',
    achados:    'Achados & Exceções',
    oportunidades: 'Oportunidades',
    vencimentos:   'Vencimentos',
    'caixa-parado': 'Caixa parado',
    'valor-assessor': 'Valor do assessor',
    'visita': 'Visita',
    comparativo:'Comparativo',
    receitas:   'Receitas & ROA',
    cadastro:   'Cadastro & Compliance',
    busca:      'Rastreador de Ativos',
    risco:      'Radar de Risco',
    radar:      'Radar de Carteiras',
    eventos:    'Eventos & Impacto',
    tendencia:  'Tendência do Ciclo',
    custos:     'Transparência de Custos',
    importar:   'Importar Extratos',
    usuarios:   'Usuários',
    'dev-relatorio': 'Relatório de Carteira',
  };

  /* ============================================================
     LAZY-LOAD DAS PÁGINAS
     Antes: as 21 páginas entravam estáticas em src/main.jsx (~460KB de fonte
     sempre baixados, mesmo mostrando uma por vez). Agora cada uma só carrega
     quando a rota é visitada (ou o link ganha hover/foco, ver prefetchPage).
     PAGE_LOADERS mapeia chave de rota → import() dinâmico do arquivo certo.
     PAGE_COMPONENT_NAME mapeia a mesma chave → propriedade que o arquivo seta
     em window.AtlasPages ao carregar (nomes não seguem um padrão único, ex.:
     'importar' carrega platform-import.jsx e vira pages.Importar,
     'dev-relatorio' carrega platform-report.jsx e vira pages.DevRelatorio).
  ============================================================ */

  const PAGE_LOADERS = {
    dashboard:        () => import('./platform-dashboard.jsx'),
    ranking:          () => import('./platform-ranking.jsx'),
    carteira:         () => import('./platform-carteira.jsx'),
    achados:          () => import('./platform-achados.jsx'),
    oportunidades:    () => import('./platform-oportunidades.jsx'),
    vencimentos:      () => import('./platform-vencimentos.jsx'),
    'caixa-parado':   () => import('./platform-caixa-parado.jsx'),
    'valor-assessor': () => import('./platform-valor-assessor.jsx'),
    visita:           () => import('./platform-visita.jsx'),
    comparativo:      () => import('./platform-comparativo.jsx'),
    receitas:         () => import('./platform-receitas.jsx'),
    cadastro:         () => import('./platform-cadastro.jsx'),
    busca:            () => import('./platform-busca.jsx'),
    risco:            () => import('./platform-risco.jsx'),
    radar:            () => import('./platform-radar.jsx'),
    eventos:          () => import('./platform-eventos.jsx'),
    importar:         () => import('./platform-import.jsx'),
    usuarios:         () => import('./platform-usuarios.jsx'),
    tendencia:        () => import('./platform-tendencia.jsx'),
    'dev-relatorio':  () => import('./platform-report.jsx'),
    custos:           () => import('./platform-custos.jsx'),
  };

  const PAGE_COMPONENT_NAME = {
    dashboard: 'Dashboard', ranking: 'Ranking', carteira: 'Carteira', achados: 'Achados',
    oportunidades: 'Oportunidades', vencimentos: 'Vencimentos', 'caixa-parado': 'CaixaParado',
    'valor-assessor': 'ValorAssessor', visita: 'Visita', comparativo: 'Comparativo',
    receitas: 'Receitas', cadastro: 'Cadastro', busca: 'Busca', risco: 'Risco', radar: 'Radar',
    eventos: 'Eventos', importar: 'Importar', usuarios: 'Usuarios', tendencia: 'Tendencia',
    'dev-relatorio': 'DevRelatorio', custos: 'Custos',
  };

  function paginaJaCarregada(pageKey) {
    const compName = PAGE_COMPONENT_NAME[pageKey];
    return Boolean(compName && window.AtlasPages && window.AtlasPages[compName]);
  }

  /* Best-effort: chamado no hover/foco do link de navegação (ver NavItem).
     Nunca mostra erro, se falhar a navegação de verdade tenta de novo e
     trata o erro lá. Só chamado pra páginas que faseDisponivel já filtrou
     como visíveis, então nunca baixa módulo que o usuário não pode ver. */
  function prefetchPage(pageKey) {
    if (paginaJaCarregada(pageKey)) return;
    const loader = PAGE_LOADERS[pageKey];
    if (!loader) return;
    loader().catch(() => {});
  }

  /* Estado de carregamento da página ATUAL (não das prefetchadas). Um mapa
     em ref em vez de um estado por página evita re-render de páginas que não
     mudaram; forceRender dispara o re-render preciso quando o status da
     página corrente muda. */
  function usePageLoader(page) {
    const [, forceRender] = useState(0);
    const statusRef = useRef({});

    function tentar(pageKey, retriedAgain) {
      const loader = PAGE_LOADERS[pageKey];
      if (!loader) return;
      statusRef.current[pageKey] = 'loading';
      forceRender(n => n + 1);
      loader()
        .then(() => {
          if (!paginaJaCarregada(pageKey)) {
            // Módulo baixou mas não registrou o componente esperado em
            // window.AtlasPages (typo em PAGE_COMPONENT_NAME ou no arquivo).
            // Sem esta guarda o app assentaria no placeholder pra sempre.
            console.error(`[lazy-load] "${pageKey}" carregou mas não registrou window.AtlasPages.${PAGE_COMPONENT_NAME[pageKey]}`);
            statusRef.current[pageKey] = retriedAgain ? 'error-retried' : 'error';
            forceRender(n => n + 1);
            return;
          }
          delete statusRef.current[pageKey];
          forceRender(n => n + 1); // window.AtlasPages.X já setado, só falta re-renderizar
        })
        .catch(err => {
          console.error(`[lazy-load] falha ao carregar a página "${pageKey}"${retriedAgain ? ' (nova tentativa)' : ''}:`, err && err.message ? err.message : err);
          statusRef.current[pageKey] = retriedAgain ? 'error-retried' : 'error';
          forceRender(n => n + 1);
        });
    }

    useEffect(() => {
      if (paginaJaCarregada(page)) return;
      if (statusRef.current[page]) return; // já carregando ou com erro, só via retry
      if (!PAGE_LOADERS[page]) return; // rota sem loader (ex.: desconhecida)
      tentar(page, false);
    }, [page]);

    const status = statusRef.current[page] || null;
    return {
      status,
      retry: () => {
        // Segunda falha na mesma página: alguns navegadores guardam a
        // promessa rejeitada em cache do módulo pra sempre pra essa URL,
        // mesmo com a rede de volta. Recarregar a aplicação é o único jeito
        // confiável de sair disso.
        if (status === 'error-retried') { window.location.reload(); return; }
        tentar(page, status === 'error');
      },
    };
  }

  /* Tela do intervalo entre pedir a rota e o chunk chegar. Componente próprio
     em vez de PlaceholderPage porque aquele diz "Em desenvolvimento", que numa
     conexão lenta viraria rótulo falso em tela entregue. */
  function PageLoading({ title }) {
    return (
      <div className="page-load-error" role="status" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Carregando {title ? title + '…' : '…'}</p>
      </div>
    );
  }

  function PageLoadError({ retry, tentouDeNovo }) {
    return (
      <div className="page-load-error" role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Não foi possível carregar esta página.</p>
        <button className="btn btn-primary" onClick={retry}>
          {tentouDeNovo ? 'Recarregar aplicação' : 'Tentar novamente'}
        </button>
      </div>
    );
  }

  /* ============================================================
     FAIXA DE DEMONSTRAÇÃO
  ============================================================ */

  /* Vive no shell, não nas páginas. Rota nova herda o aviso sem ninguém
   * precisar lembrar de nada, que é o modo de falha de aviso posto página a
   * página.
   *
   * Condicionada ao modo de dados por um motivo concreto: a LoginScreen antiga
   * exibia "dados sintéticos" fixo e, numa instância com dado real de cliente,
   * a frase era falsa. Ver o comentário em LOGIN, acima. Aqui, instância com
   * dado real não mostra faixa nenhuma.
   *
   * A classe no <html> é o que dá altura à faixa via CSS. Sem ela o layout
   * inteiro segue com --demo-banner-h em zero e nada se desloca.
   */
  const DEMO_BANNER_TEXT = {
    demo: 'Dados de carteiras, gestores, valores e resultados são sintéticos.',
    imported: 'Exibindo o arquivo que você importou, processado no seu próprio navegador.',
  };

  function DemoBanner() {
    const D = window.AtlasData;
    const mode = (D && D.getDataMode && D.getDataMode()) || 'demo';
    const texto = DEMO_BANNER_TEXT[mode];

    useEffect(() => {
      const root = document.documentElement;
      root.classList.toggle('atlas-demo', Boolean(texto));
      return () => root.classList.remove('atlas-demo');
    }, [texto]);

    if (!texto) return null;

    return (
      <div className="demo-banner" role="status">
        <strong>Ambiente de demonstração</strong>
        <span className="demo-banner-text">{texto}</span>
      </div>
    );
  }

  function AppShell({ children, page, onNavigate }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const title = PAGE_TITLES[page] || 'ATLAS';
    const { toasts } = useToast();
    const { ToastContainer } = window.AtlasUI;

    // Mobile: com o menu aberto, o corpo não rola por trás do overlay.
    useEffect(() => {
      document.body.style.overflow = sidebarOpen ? 'hidden' : '';
      return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

    // Mobile: girar o aparelho para largura de desktop fecha o drawer.
    useEffect(() => {
      const mq = window.matchMedia('(min-width: 768px)');
      const fechar = () => setSidebarOpen(false);
      if (mq.addEventListener) mq.addEventListener('change', fechar);
      else mq.addListener(fechar);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener('change', fechar);
        else mq.removeListener(fechar);
      };
    }, []);

    return (
      <div className="app-shell">
        <DemoBanner />
        <Sidebar
          currentPage={page}
          onNavigate={onNavigate}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <Topbar title={title} onMenuClick={() => setSidebarOpen(s => !s)} />
          <main className="main-content">
            {children}
          </main>
        </div>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  /* ============================================================
     PAGE RENDERER
     Páginas das etapas 2-8 são registradas em window.AtlasPages.*
     quando seus arquivos são carregados. Se não existir, usa placeholder.
  ============================================================ */

  function renderPage(page, location) {
    const pages = window.AtlasPages || {};

    switch (page) {
      case 'dashboard':
        return pages.Dashboard
          ? React.createElement(pages.Dashboard)
          : <PlaceholderPage title="Dashboard" etapa={2} />;

      case 'ranking':
        return pages.Ranking
          ? React.createElement(pages.Ranking)
          : <PlaceholderPage title="Ranking de Criticidade" etapa="ranking" />;

      case 'carteira': {
        const code = location.segments[1];
        return pages.Carteira
          ? React.createElement(pages.Carteira, { code, tab: location.params.tab })
          : <PlaceholderPage title={`Carteira — ${code || '—'}`} etapa={3} />;
      }

      case 'achados':
        return pages.Achados
          ? React.createElement(pages.Achados)
          : <PlaceholderPage title="Achados & Exceções" etapa={5} />;

      /* As tres proximas passam por faseDisponivel: link salvo no favorito nao
         pode contornar o filtro do menu e mostrar sintetico como dado real. */
      case 'oportunidades':
        if (!faseDisponivel('oportunidades')) return <FaseSemDado title="Oportunidades" />;
        return pages.Oportunidades
          ? React.createElement(pages.Oportunidades, { location })
          : <PlaceholderPage title="Oportunidades" etapa={5} />;

      case 'vencimentos':
        if (!faseDisponivel('vencimentos')) return <FaseSemDado title="Vencimentos" />;
        return pages.Vencimentos
          ? React.createElement(pages.Vencimentos)
          : <PlaceholderPage title="Vencimentos" etapa={5} />;

      case 'caixa-parado':
        if (!faseDisponivel('caixa-parado')) return <FaseSemDado title="Caixa parado" />;
        return pages.CaixaParado
          ? React.createElement(pages.CaixaParado)
          : <PlaceholderPage title="Caixa parado" etapa={5} />;

      case 'valor-assessor':
        return pages.ValorAssessor
          ? React.createElement(pages.ValorAssessor)
          : <PlaceholderPage title="Valor do assessor" etapa="valor-assessor" />;

      case 'visita': {
        const code = location.segments[1];
        return pages.Visita
          ? React.createElement(pages.Visita, { code })
          : <PlaceholderPage title="Visita" etapa={7} />;
      }

      case 'comparativo':
        return pages.Comparativo
          ? React.createElement(pages.Comparativo, { location })
          : <PlaceholderPage title="Comparativo" etapa={6} />;

      case 'receitas':
        return pages.Receitas
          ? React.createElement(pages.Receitas)
          : <PlaceholderPage title="Receitas & ROA" etapa={7} />;

      case 'custos':
        return pages.Custos
          ? React.createElement(pages.Custos)
          : <PlaceholderPage title="Transparência de Custos" etapa="custos" />;

      case 'cadastro':
        return pages.Cadastro
          ? React.createElement(pages.Cadastro)
          : <PlaceholderPage title="Cadastro & Compliance" etapa={8} />;

      case 'busca':
        return pages.Busca
          ? React.createElement(pages.Busca, { location })
          : <PlaceholderPage title="Rastreador de Ativos" etapa={8} />;

      case 'risco':
        return pages.Risco
          ? React.createElement(pages.Risco)
          : <PlaceholderPage title="Radar de Risco" etapa="risco" />;

      /* Passa por faseDisponivel pelo mesmo motivo das tres de cima: link
         salvo no favorito nao pode contornar o filtro do menu e mostrar
         carteira sintetica como se fosse do cliente. */
      case 'radar':
        if (!faseDisponivel('radar')) return <FaseSemDado title="Radar de Carteiras" />;
        return pages.Radar
          ? React.createElement(pages.Radar)
          : <PlaceholderPage title="Radar de Carteiras" etapa="radar" />;

      case 'eventos':
        if (!faseDisponivel('eventos')) return <FaseSemDado title="Eventos & Impacto" />;
        return pages.Eventos
          ? React.createElement(pages.Eventos)
          : <PlaceholderPage title="Eventos & Impacto" etapa="eventos" />;

      case 'importar':
        return pages.Importar
          ? React.createElement(pages.Importar)
          : <PlaceholderPage title="Importar Extratos" etapa={8} />;

      case 'usuarios':
        return pages.Usuarios
          ? React.createElement(pages.Usuarios)
          : <PlaceholderPage title="Usuários" etapa={8} />;

      case 'tendencia':
        return pages.Tendencia
          ? React.createElement(pages.Tendencia)
          : <PlaceholderPage title="Tendência do Ciclo" etapa="tendencia" />;

      case 'dev-relatorio': {
        const code = location.segments[2];
        return pages.DevRelatorio
          ? React.createElement(pages.DevRelatorio, { code })
          : <PlaceholderPage title={`Dev Relatório — ${code}`} etapa={4} />;
      }

      default:
        return <PlaceholderPage title="Página não encontrada" etapa="—" />;
    }
  }

  /* ============================================================
     APP ROOT
  ============================================================ */

  function App() {
    const missing = checkDeps();
    if (missing.length > 0) return <ErrorScreen missing={missing} />;

    const { useRouter, storage } = window.AtlasUtils;
    const { ToastContainer, useToast } = window.AtlasUI;

    const { location, navigate } = useRouter();
    const { toasts, addToast }   = useToast();

    // Re-render quando os dados mudam (import/restore demo)
    const [dataVersion, setDataVersion] = useState(0);
    useEffect(() => {
      function onDataChange() { setDataVersion(v => v + 1); }
      window.addEventListener('atlas:datachange', onDataChange);
      return () => window.removeEventListener('atlas:datachange', onDataChange);
    }, []);

    // Month state (global)
    const [selectedMonth, setSelectedMonthState] = useState(() => {
      const _m = storage.getSelectedMonth();
      const _vis = window.AtlasData.visibleMonths ? window.AtlasData.visibleMonths() : null;
      // Um mes persistido fora da faixa com dado (ex.: futuro escolhido antes deste
      // fix) cai para o mes corrente, em vez de abrir num dashboard vazio/fabricado.
      // Quem decide a aterrissagem e platform-data.js: em demo e o mes de
      // abertura roteirado, em instancia de cliente e o ultimo mes com dado.
      // Constante fixa aqui abriria dashboard vazio numa base que nao tem esse
      // mes, que e exatamente o defeito que este fallback existe para evitar.
      const _abre = window.AtlasData.landingMonth
        ? window.AtlasData.landingMonth()
        : (window.AtlasData.OPENING_MONTH || window.AtlasData.CURRENT_MONTH);
      return (_vis && _vis.months.indexOf(_m) < 0) ? _abre : _m;
    });
    const setSelectedMonth = useCallback(m => {
      setSelectedMonthState(m);
      storage.setSelectedMonth(m);
    }, []);

    // /login era a rota do portão que este app não tem mais. Quem chegar nela
    // por link antigo ou favorito vai para o dashboard.
    useEffect(() => {
      if (location.path === '/login') navigate('/dashboard');
    }, [location.path]);

    const page = pageFromPath(location.path);
    const { status: pageLoadStatus, retry: retryPageLoad } = usePageLoader(page);

    return (
      <AuthContext.Provider value={{ authed: true, logout: null }}>
        <MonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
          <ToastContext.Provider value={{ toasts, addToast }}>
            <AppShell page={page} onNavigate={path => { window.location.href = path; }}>
              <ErrorBoundary key={page + ':' + dataVersion}>
                {pageLoadStatus === 'loading'
                  ? <PageLoading title={PAGE_TITLES[page]} />
                  : (pageLoadStatus === 'error' || pageLoadStatus === 'error-retried')
                    ? <PageLoadError retry={retryPageLoad} tentouDeNovo={pageLoadStatus === 'error-retried'} />
                    : renderPage(page, location)}
              </ErrorBoundary>
            </AppShell>
          </ToastContext.Provider>
        </MonthContext.Provider>
      </AuthContext.Provider>
    );
  }

  /* ============================================================
     MOUNT
  ============================================================ */

  window.AtlasPages = window.AtlasPages || {};

  const rootEl = document.getElementById('root');
  if (rootEl) {
    // Loading estático removido
    rootEl.innerHTML = '';
    const root = ReactDOM.createRoot(rootEl);
    root.render(React.createElement(App));
  }

})();
