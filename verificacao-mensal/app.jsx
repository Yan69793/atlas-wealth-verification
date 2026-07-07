/* Main app shell: masthead + tabnav + view + drawer + tweaks */

const { useState: useStateApp, useEffect: useEffectApp } = React;

const APP_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "editorial",
  "showRomanNumerals": true,
  "compactDensity": false,
  "headlineStyle": "italic"
}/*EDITMODE-END*/;

function formatMesLabel(periodo) {
  if (!periodo) return { ref: '—', base: '—' };
  const ref = periodo.referenciaLabel || periodo.referencia || '—';
  const base = periodo.baselineLabel || periodo.baseline || '—';
  const refShort = ref.split(' ')[0] || ref;
  return { ref, base, refShort };
}

function App() {
  const [tab, setTab] = useStateApp('resumo');
  const [openCarteira, setOpenCarteira] = useStateApp(null);
  const [uploading, setUploading] = useStateApp(false);
  const [uploadMsg, setUploadMsg] = useStateApp('');
  const [t, setTweak] = window.useTweaks(APP_DEFAULTS);

  useEffectApp(() => {
    document.documentElement.dataset.theme = t.theme;
  }, [t.theme]);

  useEffectApp(() => {
    const p = D.summary?.periodo;
    if (p?.referenciaLabel) document.title = `Verificação Mensal · ${p.referenciaLabel}`;
  }, [D]);

  const D = window.AUDIT_DATA;
  const mes = formatMesLabel(D.summary?.periodo);
  const tabs = [
    { id: 'resumo', label: 'Resumo', n: 'I' },
    { id: 'conciliacao', label: 'Conciliação', n: 'II' },
    { id: 'achados', label: 'Achados', n: 'III' },
  ];

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xlsm') {
      setUploadMsg('Formato em breve. Use .xlsx por enquanto.');
      return;
    }

    setUploading(true);
    setUploadMsg('Processando…');

    const mesRef = D.summary?.periodo?.referencia || '';
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`http://localhost:3456/api/ingest?mes=${mesRef}`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload');
      setUploadMsg(`${data.carteiras} carteiras · ${data.totals.liberar} liberar · ${data.totals.alerta} alerta · ${data.totals.corrigir} corrigir`);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setUploadMsg(err.message || 'Servidor offline. Rode: npm --prefix audit-engine run server');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-l">
          <div className="masthead-eyebrow">
            <span className="dot" />
            <span>Verificação mensal de carteiras</span>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span style={{ color: 'var(--ink-4)' }}>Mirabaud · Uso interno</span>
          </div>
          <h1 className="masthead-title">
            {t.headlineStyle === 'italic' ? (
              <>Auditoria <em>{mes.refShort}</em></>
            ) : (
              <>Auditoria {mes.ref}</>
            )}
          </h1>
        </div>
        <div className="masthead-r">
          <div className="masthead-period">Baseline · {mes.base}</div>
          <div className="masthead-stamp">Tolerância 0,30% PL · {D.summary?.totals?.total ?? D.carteiras.length} carteiras</div>
          <label className="upload-btn">
            <input type="file" accept=".xlsx,.xlsm,.csv,.pdf" onChange={handleUpload} disabled={uploading} hidden />
            {uploading ? 'Processando…' : 'Carregar relatório'}
          </label>
          {uploadMsg && <div className="upload-msg">{uploadMsg}</div>}
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
          <span>audit-engine</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span>{D.meta?.mes ?? mes.ref}</span>
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

      {/* Tweaks panel */}
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
