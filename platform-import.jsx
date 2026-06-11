/* platform-import.jsx — Importar Extratos (stub) */
(() => {
  const { useState } = React;
  const { navigate } = window.AtlasUtils;
  const { Icon }     = window.AtlasIcons;

  function Importar() {
    const { useToast } = window.AtlasContexts;
    const { addToast } = useToast();
    const [dragging, setDragging] = useState(false);

    function handleDrop(e) {
      e.preventDefault();
      setDragging(false);
      const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
      if (files && files.length > 0) {
        addToast('Importação disponível na versão completa. (' + files.length + ' arquivo(s) recebido(s))', 'info');
      }
    }

    function handleDragOver(e) { e.preventDefault(); setDragging(true); }
    function handleDragLeave() { setDragging(false); }

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Entrada de Dados</div>
          <h1 className="page-title">Importar Extratos</h1>
          <div className="page-subtitle">
            Carregue arquivos de extrato para conciliação automática
          </div>
        </div>

        <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Zona de drag-and-drop */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: '2px dashed ' + (dragging ? 'var(--navy)' : 'var(--rule-strong)'),
              borderRadius: 'var(--r)',
              padding: '48px 32px',
              textAlign: 'center',
              background: dragging ? 'var(--paper-mid)' : 'transparent',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
              marginBottom: 24,
            }}
            onClick={() => document.getElementById('atlas-file-input').click()}
          >
            <Icon name="import" size={40} style={{ color: 'var(--muted)', display: 'block', margin: '0 auto 16px' }} />
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--heading)', marginBottom: 6 }}>
              Arraste arquivos aqui ou clique para selecionar
            </div>
            <div style={{ fontSize: '0.857rem', color: 'var(--muted)' }}>
              Formatos suportados: PDF, XLSX, CSV
            </div>
            <input
              id="atlas-file-input"
              type="file"
              multiple
              accept=".pdf,.xlsx,.csv"
              style={{ display: 'none' }}
              onChange={handleDrop}
            />
          </div>

          {/* Formatos aceitos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { fmt: 'PDF', desc: 'Extrato em PDF gerado pelo custodiante' },
              { fmt: 'XLSX', desc: 'Planilha de controle ou exportação de sistema' },
              { fmt: 'CSV', desc: 'Dados tabulares para conciliação em lote' },
            ].map(f => (
              <div key={f.fmt} style={{
                padding: '12px 14px',
                background: 'var(--paper-mid)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--r-sm)',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.857rem', color: 'var(--navy)', marginBottom: 4 }}>
                  .{f.fmt}
                </div>
                <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 24, padding: '10px 14px',
            background: 'var(--amber-bg)', border: '1px solid var(--amber)',
            borderRadius: 'var(--r-sm)', fontSize: '0.786rem', color: 'var(--body)',
          }}>
            Funcionalidade de importação disponível na versão completa da plataforma.
          </div>
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Importar = Importar;
})();
