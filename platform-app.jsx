/* platform-app.jsx — shell: login, sidebar, topbar, router, contexts */
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

  function AtlasLogo() {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="sidebar-logo-mark" aria-hidden="true">
        <rect width="32" height="32" rx="6" fill="rgba(255,255,255,0.06)"/>
        <text x="16" y="23" textAnchor="middle" fontFamily="Cormorant Garamond, Georgia, serif"
          fontSize="18" fontWeight="600" fill="#C4A228">A</text>
      </svg>
    );
  }

  /* ============================================================
     SIDEBAR
  ============================================================ */

  const NAV_PAINEL = [
    { id:'dashboard',   label:'Dashboard',          icon:'dashboard',  path:'#/dashboard'   },
    { id:'risco',       label:'Radar de Risco',      icon:'alert',      path:'#/risco'       },
    { id:'comparativo', label:'Comparativo',         icon:'compare',    path:'#/comparativo' },
    { id:'achados',     label:'Achados & Exceções',  icon:'findings',   path:'#/achados'     },
    { id:'tendencia',   label:'Tendência do Ciclo',  icon:'trend',      path:'#/tendencia'   },
    { id:'receitas',    label:'Receitas & ROA',      icon:'revenue',    path:'#/receitas'    },
    { id:'busca',       label:'Busca por Ativo',     icon:'search',     path:'#/busca'       },
  ];

  const NAV_GESTAO = [
    { id:'cadastro',    label:'Cadastro & Compliance', icon:'register',  path:'#/cadastro'  },
    { id:'importar',    label:'Importar Extratos',     icon:'import',    path:'#/importar'  },
    { id:'usuarios',    label:'Usuários',              icon:'users',     path:'#/usuarios'  },
  ];

  function Sidebar({ currentPage, onNavigate, open, onClose }) {
    const { Icon } = window.AtlasIcons;

    function NavItem({ item }) {
      const active = currentPage === item.id;
      return (
        <button
          className={`sidebar-item${active ? ' active' : ''}`}
          onClick={() => { onNavigate(item.path); onClose && onClose(); }}
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
            {NAV_PAINEL.map(item => <NavItem key={item.id} item={item} />)}
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
              <div>{(window.AtlasBrand && window.AtlasBrand.tenant) || 'Meridian Advisory'}</div>
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

  /* ============================================================
     ROUTER / SHELL
  ============================================================ */

  function pageFromPath(path) {
    // '/login' não é mais uma página. Cai no default junto com qualquer rota
    // desconhecida; o redirect no AppRoot leva ao dashboard em seguida.
    if (path === '/dashboard') return 'dashboard';
    if (path.startsWith('/carteira/')) return 'carteira';
    if (path === '/achados') return 'achados';
    if (path === '/comparativo') return 'comparativo';
    if (path === '/receitas') return 'receitas';
    if (path === '/cadastro') return 'cadastro';
    if (path === '/busca') return 'busca';
    if (path === '/risco') return 'risco';
    if (path === '/tendencia') return 'tendencia';
    if (path === '/importar') return 'importar';
    if (path === '/usuarios') return 'usuarios';
    if (path.startsWith('/dev/relatorio/')) return 'dev-relatorio';
    return 'dashboard';
  }

  const PAGE_TITLES = {
    dashboard:  'Dashboard',
    carteira:   'Carteira',
    achados:    'Achados & Exceções',
    comparativo:'Comparativo',
    receitas:   'Receitas & ROA',
    cadastro:   'Cadastro & Compliance',
    busca:      'Busca por Ativo',
    risco:      'Radar de Risco',
    tendencia:  'Tendência do Ciclo',
    importar:   'Importar Extratos',
    usuarios:   'Usuários',
  };

  function AppShell({ children, page, onNavigate }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const title = PAGE_TITLES[page] || 'ATLAS';
    const { toasts } = useToast();
    const { ToastContainer } = window.AtlasUI;

    return (
      <div className="app-shell">
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

      case 'comparativo':
        return pages.Comparativo
          ? React.createElement(pages.Comparativo)
          : <PlaceholderPage title="Comparativo" etapa={6} />;

      case 'receitas':
        return pages.Receitas
          ? React.createElement(pages.Receitas)
          : <PlaceholderPage title="Receitas & ROA" etapa={7} />;

      case 'cadastro':
        return pages.Cadastro
          ? React.createElement(pages.Cadastro)
          : <PlaceholderPage title="Cadastro & Compliance" etapa={8} />;

      case 'busca':
        return pages.Busca
          ? React.createElement(pages.Busca)
          : <PlaceholderPage title="Busca por Ativo" etapa={8} />;

      case 'risco':
        return pages.Risco
          ? React.createElement(pages.Risco)
          : <PlaceholderPage title="Radar de Risco" etapa="risco" />;

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
      return (_vis && _vis.months.indexOf(_m) < 0) ? window.AtlasData.CURRENT_MONTH : _m;
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

    return (
      <AuthContext.Provider value={{ authed: true, logout: null }}>
        <MonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
          <ToastContext.Provider value={{ toasts, addToast }}>
            <AppShell page={page} onNavigate={path => { window.location.href = path; }}>
              <ErrorBoundary key={page + ':' + dataVersion}>
                {renderPage(page, location)}
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
