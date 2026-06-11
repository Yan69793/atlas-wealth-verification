/* platform-import.jsx — Importar Extratos (CSV + Excel) */
(() => {
  const { useState, useRef } = React;
  const { Icon } = window.AtlasIcons;

  const SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  // SRI computado a partir do bundle oficial xlsx-0.20.3 (sha384, base64).
  const SHEETJS_SRI = 'sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT';

  let _sheetjsPromise = null;

  // Lazy-load do leitor de Excel (SheetJS). Resolve quando window.XLSX existir.
  function loadSheetJS() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (_sheetjsPromise) return _sheetjsPromise;

    _sheetjsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SHEETJS_URL;
      script.crossOrigin = 'anonymous';
      script.integrity = SHEETJS_SRI;
      script.onload = () => {
        if (window.XLSX) resolve(window.XLSX);
        else reject(new Error('XLSX não disponível após carga.'));
      };
      script.onerror = () => {
        _sheetjsPromise = null;
        reject(new Error('Falha ao carregar SheetJS.'));
      };
      document.head.appendChild(script);
    });
    return _sheetjsPromise;
  }

  function Importar() {
    const { useMonth, useToast } = window.AtlasContexts;
    const { setSelectedMonth } = useMonth();
    const { addToast } = useToast();

    const P = window.AtlasParsers;
    const D = window.AtlasData;

    const [dragging, setDragging] = useState(false);
    const [parsed, setParsed] = useState(null);   // { portfolios, errors, warnings }
    const [fileName, setFileName] = useState('');
    const [busy, setBusy] = useState(false);
    const fileInputRef = useRef(null);

    const dataMode = D.getDataMode();

    // --- Helpers de parsing ---

    function applyParsed(rows) {
      const result = P.parseImportRows(rows, { validMonths: D.MONTHS });
      setParsed(result);
      if (result.errors.length > 0) {
        addToast(result.errors.length + ' erro(s) de validação. Corrija antes de importar.', 'error');
      } else if (result.portfolios.length > 0) {
        addToast(result.portfolios.length + ' carteira(s) prontas para confirmação.', 'info');
      }
    }

    function handleCSV(file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const rows = P.parseCSV(String(reader.result));
          applyParsed(rows);
        } catch (err) {
          addToast('Falha ao ler o CSV.', 'error');
        }
        setBusy(false);
      };
      reader.onerror = () => { addToast('Falha ao ler o arquivo.', 'error'); setBusy(false); };
      reader.readAsText(file, 'utf-8');
    }

    function handleXLSX(file) {
      loadSheetJS().then((XLSX) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = new Uint8Array(reader.result);
            const wb = XLSX.read(data, { type: 'array' });
            const firstSheet = wb.Sheets[wb.SheetNames[0]];
            const aoa = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' });

            if (!aoa || aoa.length === 0) {
              addToast('Planilha vazia.', 'error');
              setBusy(false);
              return;
            }

            const header = (aoa[0] || []).map(h => String(h == null ? '' : h).trim().toLowerCase());
            const rows = [];
            for (let r = 1; r < aoa.length; r++) {
              const cells = aoa[r] || [];
              // Ignora linhas totalmente em branco.
              const hasContent = cells.some(c => String(c == null ? '' : c).trim() !== '');
              if (!hasContent) continue;
              const obj = {};
              for (let c = 0; c < header.length; c++) {
                obj[header[c]] = String(cells[c] == null ? '' : cells[c]).trim();
              }
              rows.push(obj);
            }
            applyParsed(rows);
          } catch (err) {
            addToast('Falha ao processar a planilha Excel.', 'error');
          }
          setBusy(false);
        };
        reader.onerror = () => { addToast('Falha ao ler o arquivo.', 'error'); setBusy(false); };
        reader.readAsArrayBuffer(file);
      }).catch(() => {
        addToast('Falha ao carregar o leitor de Excel. Tente CSV.', 'error');
        setBusy(false);
      });
    }

    function handleFile(file) {
      if (!file) return;
      setParsed(null);
      setFileName(file.name);
      const lower = file.name.toLowerCase();
      setBusy(true);
      if (lower.endsWith('.csv')) {
        handleCSV(file);
      } else if (lower.endsWith('.xlsx')) {
        handleXLSX(file);
      } else {
        setBusy(false);
        addToast('Formato não suportado. Use CSV ou XLSX.', 'error');
      }
    }

    function handleDrop(e) {
      e.preventDefault();
      setDragging(false);
      const files = e.dataTransfer ? e.dataTransfer.files : (e.target ? e.target.files : null);
      if (files && files.length > 0) handleFile(files[0]);
    }

    function handleInputChange(e) {
      const files = e.target.files;
      if (files && files.length > 0) handleFile(files[0]);
      e.target.value = '';
    }

    function handleDragOver(e) { e.preventDefault(); setDragging(true); }
    function handleDragLeave() { setDragging(false); }

    // --- Confirmação da importação ---

    function handleConfirm() {
      const res = D.importPortfolioData(parsed);
      if (res.ok) {
        const lastMonth = res.meses[res.meses.length - 1];
        if (lastMonth) setSelectedMonth(lastMonth);
        window.dispatchEvent(new CustomEvent('atlas:datachange'));
        addToast(res.nCarteiras + ' carteira(s) importada(s).', 'success');
        window.location.hash = '#/dashboard';
      } else {
        addToast(res.reason || 'Falha na importação.', 'error');
      }
    }

    function handleRestoreDemo() {
      D.restoreDemo();
      window.dispatchEvent(new CustomEvent('atlas:datachange'));
      addToast('Conjunto demo restaurado.', 'success');
      window.location.hash = '#/dashboard';
    }

    const canConfirm = parsed && parsed.errors.length === 0 && parsed.portfolios.length > 0;

    // --- Preview por carteira (linhas) ---
    const previewRows = (parsed && parsed.portfolios) ? parsed.portfolios.map(pf => {
      const meses = Object.keys(pf.months).sort();
      let maxAssets = 0;
      meses.forEach(mes => {
        const n = pf.months[mes].composition ? pf.months[mes].composition.length : 0;
        if (n > maxAssets) maxAssets = n;
      });
      return { code: pf.code, name: pf.name, risk: pf.risk, meses: meses, maxAssets: maxAssets };
    }) : [];

    const REQUIRED_COLUMNS = P.REQUIRED_COLUMNS;

    const COLUMN_DOCS = [
      { col: 'codigo', desc: 'Código único da carteira.' },
      { col: 'nome', desc: 'Nome da carteira (constante entre linhas do mesmo código).' },
      { col: 'perfil', desc: 'Perfil de risco. Valores: ' + P.VALID_PERFIS.join(', ') + '.' },
      { col: 'mes', desc: 'Competência no formato AAAA-MM; deve estar entre os 16 meses suportados.' },
      { col: 'pl', desc: 'Patrimônio líquido (numérico, maior que zero; ponto decimal).' },
      { col: 'rentabilidade_pct', desc: 'Fração decimal — 0.0095 equivale a 0,95%.' },
      { col: 'status', desc: 'Status de verificação. Valores: ' + P.VALID_STATUS.join(', ') + '.' },
      { col: 'classe', desc: 'Classe do ativo. Valores: ' + P.VALID_CLASSES.join(', ') + '.' },
      { col: 'ativo', desc: 'Nome do ativo (uma linha por ativo).' },
      { col: 'pct_alocacao', desc: 'Peso do ativo na carteira (0 a 1); soma por carteira/mês ≈ 1.' },
    ];

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Entrada de Dados</div>
          <h1 className="page-title">Importar Extratos</h1>
          <div className="page-subtitle">
            Carregue carteiras em CSV ou Excel para substituir o conjunto exibido nos painéis
          </div>
        </div>

        {/* Banner de modo importado */}
        {dataMode === 'imported' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, flexWrap: 'wrap',
            marginBottom: 24, padding: '12px 16px',
            background: 'var(--amber-bg)', border: '1px solid var(--amber)',
            borderRadius: 'var(--r-sm)',
          }}>
            <div style={{ fontSize: '0.857rem', color: 'var(--body)' }}>
              Exibindo carteiras importadas (em memória).
            </div>
            <button className="btn btn--ghost" onClick={handleRestoreDemo}>
              Restaurar demo
            </button>
          </div>
        )}

        <div className="card" style={{ maxWidth: 760, marginBottom: 24 }}>
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
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <Icon name="import" size={40} style={{ color: 'var(--muted)', display: 'block', margin: '0 auto 16px' }} />
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--heading)', marginBottom: 6 }}>
              Arraste um arquivo aqui ou clique para selecionar
            </div>
            <div style={{ fontSize: '0.857rem', color: 'var(--muted)' }}>
              Formatos suportados: CSV, XLSX
            </div>
            {fileName && (
              <div style={{ marginTop: 12, fontSize: '0.786rem', color: 'var(--navy)', fontFamily: 'var(--font-mono)' }}>
                {busy ? 'Processando ' : 'Arquivo: '}{fileName}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
          </div>

          {/* Formatos aceitos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { fmt: 'CSV', desc: 'Dados tabulares (UTF-8, separador vírgula).' },
              { fmt: 'XLSX', desc: 'Planilha Excel — lê a primeira aba.' },
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

          <a
            href="docs/templates/atlas_template.csv"
            download
            className="btn btn--ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <Icon name="import" size={14} />
            Baixar template CSV
          </a>
        </div>

        {/* Bloco de ERROS */}
        {parsed && parsed.errors.length > 0 && (
          <div className="card" style={{
            maxWidth: 760, marginBottom: 24,
            border: '1px solid var(--red)', background: 'var(--red-bg)',
          }}>
            <div style={{ fontWeight: 600, fontSize: '0.929rem', color: 'var(--red)', marginBottom: 10 }}>
              Erros — corrija antes de importar
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.786rem', color: 'var(--body)' }}>
              {parsed.errors.map((e, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Bloco de WARNINGS */}
        {parsed && parsed.warnings.length > 0 && (
          <div className="card" style={{
            maxWidth: 760, marginBottom: 24,
            border: '1px solid var(--amber)', background: 'var(--amber-bg)',
          }}>
            <div style={{ fontWeight: 600, fontSize: '0.929rem', color: 'var(--amber)', marginBottom: 10 }}>
              Avisos — não bloqueiam a importação
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.786rem', color: 'var(--body)' }}>
              {parsed.warnings.map((w, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabela de PREVIEW */}
        {parsed && parsed.portfolios.length > 0 && (
          <div className="card" style={{ maxWidth: 760, marginBottom: 24 }}>
            <div style={{ fontWeight: 600, fontSize: '0.929rem', color: 'var(--heading)', marginBottom: 12 }}>
              Pré-visualização — {parsed.portfolios.length} carteira(s)
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>Perfil</th>
                    <th>Meses</th>
                    <th style={{ textAlign: 'right' }}>Ativos (maior mês)</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(r => (
                    <tr key={r.code}>
                      <td style={{ fontWeight: 600, fontSize: '0.857rem' }}>{r.code}</td>
                      <td style={{ fontSize: '0.857rem' }}>{r.name}</td>
                      <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{r.risk}</td>
                      <td style={{ fontSize: '0.786rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                        {r.meses.join(', ')}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>{r.maxAssets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn--primary"
                onClick={handleConfirm}
                disabled={!canConfirm}
              >
                Confirmar importação
              </button>
            </div>
          </div>
        )}

        {/* Formato esperado das colunas */}
        <div className="card" style={{ maxWidth: 760, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: '0.929rem', color: 'var(--heading)', marginBottom: 4 }}>
            Formato esperado
          </div>
          <div style={{ fontSize: '0.786rem', color: 'var(--muted)', marginBottom: 12 }}>
            Colunas obrigatórias no cabeçalho ({REQUIRED_COLUMNS.length}): uma linha por ativo;
            campos de carteira repetidos em cada linha do mesmo código/mês.
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Coluna</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {COLUMN_DOCS.map(d => (
                  <tr key={d.col}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.786rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {d.col}
                    </td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--body)' }}>{d.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aviso LGPD / limitações */}
        <div style={{
          maxWidth: 760, padding: '12px 16px',
          background: 'var(--paper-mid)', border: '1px solid var(--rule)',
          borderRadius: 'var(--r-sm)', fontSize: '0.786rem', color: 'var(--body)', lineHeight: 1.6,
        }}>
          Dados importados ficam apenas em memória do navegador — não são persistidos nem enviados a
          nenhum servidor. Atualizar a página recarrega o conjunto demo. NNM (captação) e taxa de
          administração não são capturados no formato de importação e aparecem zerados/uniformes nos
          painéis de Receitas.
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Importar = Importar;
})();
