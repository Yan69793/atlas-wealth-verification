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
     LOGIN
  ============================================================ */

  function LoginScreen({ onLogin }) {
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);
    const inputRef = useRef(null);

    useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);

    function handleSubmit(e) {
      e.preventDefault();
      if (password.length < 6) { setError('Mínimo 6 caracteres.'); return; }
      setLoading(true);
      setError('');
      setTimeout(() => {
        const ok = window.AtlasUtils.storage.login(password);
        if (ok) {
          onLogin();
        } else {
          setError('Senha incorreta.');
          setLoading(false);
        }
      }, 300);
    }

    return (
      <div className="login-screen">
        {/* Left strip */}
        <div className="login-strip" aria-hidden="true">
          <div className="login-strip-label">Meridian Advisory</div>
          <div className="login-strip-year">2026</div>
        </div>

        {/* Background watermark */}
        <div className="login-watermark" aria-hidden="true">ATLAS</div>

        {/* Main */}
        <div className="login-main">
          {/* Geometric monogram — architectural A */}
          <div className="login-monogram" aria-hidden="true">
            <svg width="56" height="50" viewBox="0 0 56 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="28,2 54,48 2,48" fill="none" stroke="#C4A228" strokeWidth="1.4" strokeLinejoin="round" />
              <line x1="12" y1="36" x2="44" y2="36" stroke="#C4A228" strokeWidth="1.4" />
            </svg>
          </div>

          <div className="login-separator" />

          <div className="login-product">Atlas</div>
          <div className="login-firm">Verificação de Carteiras · Meridian Advisory</div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div>
              <label className="login-field-label" htmlFor="atlas-pwd">Senha de acesso</label>
              <input
                id="atlas-pwd"
                ref={inputRef}
                type="password"
                className="login-field-input"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading || !password}>
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>

          <div className="login-note">
            Ambiente de demonstração · Dados sintéticos<br />
            Sem vínculo com carteiras ou clientes reais
          </div>
        </div>
      </div>
    );
  }

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
    { id:'comparativo', label:'Comparativo',         icon:'compare',    path:'#/comparativo' },
    { id:'achados',     label:'Achados & Exceções',  icon:'findings',   path:'#/achados'     },
    { id:'receitas',    label:'Receitas & ROA',      icon:'revenue',    path:'#/receitas'    },
    { id:'busca',       label:'Busca por Ativo',     icon:'search',     path:'#/busca'       },
    { id:'risco',       label:'Risco',               icon:'alert',      path:'#/risco'       },
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

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-user-name">Administrador</div>
              <div>Meridian Advisory</div>
            </div>
            <button
              className="sidebar-item"
              onClick={() => {
                window.AtlasUtils.storage.logout();
                window.location.hash = '#/login';
                window.location.reload();
              }}
            >
              <Icon name="logout" size={16} />
              Sair
            </button>
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
    const months = window.AtlasData.MONTHS;
    const labels = window.AtlasData.MONTH_LABELS;

    return (
      <header className="topbar">
        <button className="topbar-hamburger" onClick={onMenuClick} aria-label="Abrir menu">
          <Icon name="menu" size={20} />
        </button>

        <div className="topbar-title">{title}</div>

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
      </header>
    );
  }

  /* ============================================================
     PÁGINAS PLACEHOLDER (etapas 2-8)
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
    if (path === '/login') return 'login';
    if (path === '/dashboard') return 'dashboard';
    if (path.startsWith('/carteira/')) return 'carteira';
    if (path === '/achados') return 'achados';
    if (path === '/comparativo') return 'comparativo';
    if (path === '/receitas') return 'receitas';
    if (path === '/cadastro') return 'cadastro';
    if (path === '/busca') return 'busca';
    if (path === '/risco') return 'risco';
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
        <div style={{ flex:1, display:'flex', flexDirection:'column', marginLeft:'var(--sidebar-w)' }}>
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

    // Auth state
    const [authed, setAuthed] = useState(() => storage.isAuthed());

    // Month state (global)
    const [selectedMonth, setSelectedMonthState] = useState(() => storage.getSelectedMonth());
    const setSelectedMonth = useCallback(m => {
      setSelectedMonthState(m);
      storage.setSelectedMonth(m);
    }, []);

    // Redirect logic
    useEffect(() => {
      const path = location.path;
      if (!authed && path !== '/login') {
        navigate('/login');
      } else if (authed && path === '/login') {
        navigate('/dashboard');
      }
    }, [authed, location.path]);

    function handleLogin() {
      setAuthed(true);
      navigate('/dashboard');
    }

    if (!authed || location.path === '/login') {
      return (
        <MonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
          <ToastContext.Provider value={{ toasts, addToast }}>
            <LoginScreen onLogin={handleLogin} />
            <ToastContainer toasts={toasts} />
          </ToastContext.Provider>
        </MonthContext.Provider>
      );
    }

    const page = pageFromPath(location.path);

    return (
      <AuthContext.Provider value={{ authed, logout: () => { storage.logout(); setAuthed(false); } }}>
        <MonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
          <ToastContext.Provider value={{ toasts, addToast }}>
            <AppShell page={page} onNavigate={path => { window.location.href = path; }}>
              {renderPage(page, location)}
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
