/* Main app shell: masthead + tabnav + view + drawer + tweaks */

const { useState: useStateApp, useEffect: useEffectApp } = React;

const APP_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "editorial",
  "showRomanNumerals": true,
  "compactDensity": false,
  "headlineStyle": "italic"
}/*EDITMODE-END*/;

/* Loading screen enquanto os dados chegam */
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', gap: 16
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: 'var(--ink-4)'
      }}>
        Verificação mensal · Mirabaud
      </div>
      <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Carregando dados de auditoria…</div>
    </div>
  );
}

function ErrorScreen({ msg }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', gap: 16
    }}>
      <div style={{ color: 'var(--bad)', fontFamily: 'var(--mono)', fontSize: 13 }}>
        Erro ao carregar dados
      </div>
      <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{msg}</div>
    </div>
  );
}

function AppShell({ D }) {
  const [tab, setTab] = useStateApp('resumo');
  const [openCarteira, setOpenCarteira] = useStateApp(null);
  const [t, setTweak] = window.useTweaks(APP_DEFAULTS);

  // Expor globalmente para os outros componentes
  window.AUDIT_DATA = D;

  useEffectApp(() => {
    document.documentElement.dataset.theme = t.theme;
  }, [t.theme]);

  // Derivar título e período dos dados
  const mesAtual = D.summary.mesAtual || 'Abril';
  const anoAtual = D.summary.anoAtual || '2026';
  const mesBaseline = D.summary.mesBaseline || 'Março';
  const totalCarteiras = D.summary.totals?.total || D.carteiras?.length || 0;

  const tabs = [
    { id: 'resumo', label: 'Resumo', n: 'I' },
    { id: 'conciliacao', label: 'Conciliação', n: 'II' },
    { id: 'achados', label: 'Achados', n: 'III' },
  ];

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-l">
          <div className="masthead-eyebrow">
            <span className="dot" />
            <span>Verificação mensal de carteiras</span>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span style={{ color: 'var(--ink-4)' }}>Plataforma SmartBrain</span>
          </div>
          <h1 className="masthead-title">
            {t.headlineStyle === 'italic' ? (
              <>Auditoria <em>{mesAtual}</em> {anoAtual}</>
            ) : (
              <>Auditoria {mesAtual} {anoAtual}</>
            )}
          </h1>
        </div>
        <div className="masthead-r">
          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen();
              }
            }}
            title="Modo apresentação (F11)"
            style={{
              background: 'none', border: '1px solid var(--ink-4)', borderRadius: 'var(--r)',
              padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: 'var(--ink-3)',
              fontFamily: 'var(--mono)', letterSpacing: '0.06em',
            }}
          >
            Tela cheia
          </button>
          <div className="masthead-period">Baseline · {mesBaseline} {anoAtual}</div>
          <div className="masthead-stamp">
            Tolerância 0,30% PL · {totalCarteiras} carteiras
          </div>
        </div>
      </header>

      <nav className="tabnav">
        {tabs.map(({ id, label, n }) => (
          <button
            key={id}
            className={`tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {t.showRomanNumerals && <span className="roman">{n}.</span>}
            <span>{label}</span>
          </button>
        ))}
        <div className="tabnav-spacer" />
        <div className="tabnav-meta">
          <span>SmartBrain</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span>v. {String(mesAtual).substring(0,3).toLowerCase()}.{String(anoAtual).substring(2)}</span>
        </div>
      </nav>

      <main className="view">
        {tab === 'resumo' && <Resumo onOpen={setOpenCarteira} />}
        {tab === 'conciliacao' && <Conciliacao onOpen={setOpenCarteira} />}
        {tab === 'achados' && <Achados onOpen={setOpenCarteira} />}
      </main>

      <footer className="colophon">
        <span>© Verificação mensal · {new Date().getFullYear()}</span>
        <span>Documento confidencial · Uso interno</span>
        <span>Compilado em {new Date().toLocaleDateString('pt-BR')}</span>
      </footer>

      {openCarteira && (
        <CarteiraDetail nome={openCarteira} onClose={() => setOpenCarteira(null)} />
      )}

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Tema" />
        <window.TweakRadio
          label="Paleta"
          value={t.theme}
          options={['editorial', 'slate', 'midnight']}
          onChange={(v) => setTweak('theme', v)}
        />
        <window.TweakSection label="Tipografia" />
        <window.TweakRadio
          label="Título"
          value={t.headlineStyle}
          options={['italic', 'roman']}
          onChange={(v) => setTweak('headlineStyle', v)}
        />
        <window.TweakToggle
          label="Numerais romanos"
          value={t.showRomanNumerals}
          onChange={(v) => setTweak('showRomanNumerals', v)}
        />
      </window.TweaksPanel>
    </div>
  );
}

function App() {
  const [data, setData] = useStateApp(null);
  const [error, setError] = useStateApp(null);

  useEffectApp(() => {
    // Carregar dados do mês atual via fetch
    fetch('/data/atual.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ao buscar /data/atual.json`);
        return r.json();
      })
      .then(d => setData(d))
      .catch(e => setError(e.message));
  }, []);

  if (error) return <ErrorScreen msg={error} />;
  if (!data) return <LoadingScreen />;
  return <AppShell D={data} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
