/* platform-import.jsx — Importar Extratos (PDF + CSV + Excel) */
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

  // pdf.js 3.11.174 (última linha UMD) — cdnjs, SRI publicado pela API do cdnjs.
  const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_SRI = 'sha512-q+4liFwdPC/bNdhUpZx6aXDx/h77yEQtn4I1slHydcbZK34nLaR3cAeYSJshoxIOq3mjEf7xJE8YWIUHMn+oCQ==';
  // Worker carregado como script clássico (com SRI): define globalThis.pdfjsWorker
  // e o pdf.js processa no main thread (fake worker) — nenhum fetch sem SRI.
  const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const PDFJS_WORKER_SRI = 'sha512-BbrZ76UNZq5BhH7LL7pn9A4TKQpQeNCHOo65/akfelcIBbcVvYWOFQKPXIrykE3qZxYjmDX573oa4Ywsc7rpTw==';

  let _pdfjsPromise = null;

  function loadScriptSRI(src, sri) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.integrity = sri;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Falha ao carregar ' + src));
      document.head.appendChild(script);
    });
  }

  function _withTimeout(promise, ms, label) {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(label + ': timeout após ' + ms + 'ms')), ms)
    );
    return Promise.race([promise, timeout]);
  }

  // Lazy-load do pdf.js (worker primeiro, depois a lib).
  function loadPdfJs() {
    if (window.pdfjsLib && window.pdfjsWorker) return Promise.resolve(window.pdfjsLib);
    if (_pdfjsPromise) return _pdfjsPromise;

    _pdfjsPromise = _withTimeout(
      Promise.all([
        window.pdfjsWorker ? Promise.resolve() : loadScriptSRI(PDFJS_WORKER_URL, PDFJS_WORKER_SRI),
        window.pdfjsLib ? Promise.resolve() : loadScriptSRI(PDFJS_URL, PDFJS_SRI),
      ]).then(() => {
        if (!window.pdfjsLib) throw new Error('pdfjsLib não disponível após carga.');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        return window.pdfjsLib;
      }),
      15000, 'pdf.js CDN'
    ).catch((err) => {
      _pdfjsPromise = null;
      throw err;
    });
    return _pdfjsPromise;
  }

  function Importar() {
    const { useMonth, useToast } = window.AtlasContexts;
    const { setSelectedMonth } = useMonth();
    const { addToast } = useToast();

    const P = window.AtlasParsers;
    const D = window.AtlasData;

    const [dragging, setDragging] = useState(false);
    const [parsed, setParsed] = useState(null);   // { portfolios, errors, warnings, review?, source? }
    const [fileName, setFileName] = useState('');
    const [busy, setBusy] = useState(false);
    const [pdfPreviews, setPdfPreviews] = useState([]);   // [{ fileName, pages: [[linha]] }]
    const [perfilOverrides, setPerfilOverrides] = useState({});  // code -> perfil
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

    // --- PDF (books Mirabaud) ---

    // Extrai o texto de um PDF página a página e interpreta o layout do book.
    function parsePdfFile(pdfjsLib, file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const data = new Uint8Array(reader.result);
          pdfjsLib.getDocument({ data }).promise.then(doc => {
            const pagePromises = [];
            for (let n = 1; n <= doc.numPages; n++) {
              pagePromises.push(
                doc.getPage(n).then(page => page.getTextContent()).then(tc => {
                  const items = tc.items.map(it => ({
                    str: it.str,
                    x: it.transform[4],
                    y: it.transform[5],
                    rot: Math.atan2(it.transform[1], it.transform[0]),
                  }));
                  return P.reconstructPdfLines(items);
                })
              );
            }
            return Promise.all(pagePromises);
          }).then(pagesLines => {
            const res = P.parseMirabaudBook(pagesLines, {
              validMonths: D.MONTHS, fileName: file.name,
            });
            resolve({ fileName: file.name, pages: pagesLines, res });
          }).catch(reject);
        };
        reader.onerror = () => reject(new Error('Falha ao ler ' + file.name));
        reader.readAsArrayBuffer(file);
      });
    }

    function handlePDFs(files) {
      loadPdfJs().then(pdfjsLib => {
        return Promise.all(files.map(f => parsePdfFile(pdfjsLib, f)));
      }).then(results => {
        // Merge: 1 book = 1 carteira/1 mês; mesmo código em arquivos
        // diferentes agrega meses na mesma carteira.
        const byCode = {};
        const order = [];
        const errors = [];
        const warnings = [];
        const review = [];

        results.forEach(r => {
          r.res.warnings.forEach(w => warnings.push(w));
          r.res.errors.forEach(e => {
            if (/revisão manual necessária/i.test(e)) review.push(e);
            else errors.push(e);
          });
          const pf = r.res.portfolio;
          if (!pf) return;
          if (byCode[pf.code]) {
            Object.keys(pf.months).forEach(mes => {
              if (byCode[pf.code].months[mes]) {
                warnings.push(r.fileName + ': mês ' + mes + ' duplicado para a carteira ' +
                  pf.code + '; usando o último arquivo.');
              }
              byCode[pf.code].months[mes] = pf.months[mes];
            });
          } else {
            byCode[pf.code] = pf;
            order.push(pf.code);
          }
        });

        const result = {
          portfolios: order.map(c => byCode[c]),
          errors,
          warnings,
          review,
          source: 'pdf',
        };
        setParsed(result);
        setPdfPreviews(results.map(r => ({ fileName: r.fileName, pages: r.pages })));
        setBusy(false);

        if (errors.length > 0) {
          addToast(errors.length + ' erro(s) de validação. Corrija antes de importar.', 'error');
        } else if (review.length > 0 && result.portfolios.length === 0) {
          addToast('Nenhum book importável: revisão manual necessária.', 'error');
        } else if (result.portfolios.length > 0) {
          addToast(result.portfolios.length + ' carteira(s) prontas para confirmação.', 'info');
        }
      }).catch(() => {
        addToast('Falha ao processar o PDF. Verifique o arquivo ou use CSV/XLSX.', 'error');
        setBusy(false);
      });
    }

    function handleFiles(fileList) {
      const files = Array.prototype.slice.call(fileList || []);
      if (files.length === 0) return;
      setParsed(null);
      setPdfPreviews([]);
      setPerfilOverrides({});

      const exts = files.map(f => {
        const m = f.name.toLowerCase().match(/\.(csv|xlsx|pdf)$/);
        return m ? m[1] : '?';
      });

      const allPdf = exts.every(x => x === 'pdf');
      if (files.length > 1 && !allPdf) {
        addToast('Seleção múltipla apenas para PDFs. CSV/XLSX: um arquivo por vez.', 'error');
        return;
      }

      setFileName(files.length === 1 ? files[0].name : files.length + ' arquivos PDF');
      setBusy(true);

      if (allPdf) {
        handlePDFs(files);
      } else if (exts[0] === 'csv') {
        handleCSV(files[0]);
      } else if (exts[0] === 'xlsx') {
        handleXLSX(files[0]);
      } else {
        setBusy(false);
        addToast('Formato não suportado. Use PDF, CSV ou XLSX.', 'error');
      }
    }

    function handleDrop(e) {
      e.preventDefault();
      setDragging(false);
      const files = e.dataTransfer ? e.dataTransfer.files : (e.target ? e.target.files : null);
      if (files && files.length > 0) handleFiles(files);
    }

    function handleInputChange(e) {
      const files = e.target.files;
      if (files && files.length > 0) handleFiles(files);
      e.target.value = '';
    }

    function handleDragOver(e) { e.preventDefault(); setDragging(true); }
    function handleDragLeave() { setDragging(false); }

    // --- Confirmação da importação ---

    function handleConfirm() {
      // Aplica os perfis ajustados na pré-visualização (importação de PDF).
      const toImport = {
        portfolios: parsed.portfolios.map(pf => (
          perfilOverrides[pf.code] ? { ...pf, risk: perfilOverrides[pf.code] } : pf
        )),
        errors: parsed.errors,
        warnings: parsed.warnings,
      };
      const res = D.importPortfolioData(toImport);
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
            Carregue books em PDF (ou CSV/Excel) para substituir o conjunto exibido nos painéis
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
              borderRadius: 'var(--r-md)',
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
              Formatos suportados: PDF (books mensais — vários de uma vez), CSV, XLSX
            </div>
            {fileName && (
              <div style={{ marginTop: 12, fontSize: '0.786rem', color: 'var(--navy)', fontFamily: 'var(--font-mono)' }}>
                {busy ? 'Processando ' : 'Arquivo: '}{fileName}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.pdf"
              multiple
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
          </div>

          {/* Formatos aceitos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { fmt: 'PDF', tag: 'beta', desc: 'Books mensais (Relatório Mensal). Aceita vários arquivos de uma vez.' },
              { fmt: 'CSV', desc: 'Dados tabulares (UTF-8, separador vírgula).' },
              { fmt: 'XLSX', desc: 'Planilha Excel — lê a primeira aba.' },
            ].map(f => (
              <div key={f.fmt} style={{
                padding: '12px 14px',
                background: 'var(--paper-mid)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--r-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.857rem', color: 'var(--navy)' }}>
                    .{f.fmt}
                  </span>
                  {f.tag && (
                    <span style={{
                      fontSize: '0.643rem', fontWeight: 600, letterSpacing: '0.04em',
                      color: 'var(--amber)', border: '1px solid var(--amber)',
                      borderRadius: 'var(--r-sm)', padding: '0 5px', textTransform: 'uppercase',
                    }}>
                      {f.tag}
                    </span>
                  )}
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

        {/* Bloco de REVISÃO MANUAL (books de PDF com baixa confiança) */}
        {parsed && parsed.review && parsed.review.length > 0 && (
          <div className="card" style={{
            maxWidth: 760, marginBottom: 24,
            border: '1px solid var(--amber)', background: 'var(--amber-bg)',
          }}>
            <div style={{ fontWeight: 600, fontSize: '0.929rem', color: 'var(--amber)', marginBottom: 6 }}>
              Revisão manual necessária
            </div>
            <div style={{ fontSize: '0.786rem', color: 'var(--body)', marginBottom: 10 }}>
              Os arquivos abaixo não atingiram a confiança mínima de extração e ficaram fora
              desta importação. Confira o texto extraído ou use o formato CSV/XLSX.
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.786rem', color: 'var(--body)' }}>
              {parsed.review.map((r, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Prévia do texto extraído dos PDFs (auditável antes de confirmar) */}
        {pdfPreviews.length > 0 && (
          <div className="card" style={{ maxWidth: 760, marginBottom: 24 }}>
            <div style={{ fontWeight: 600, fontSize: '0.929rem', color: 'var(--heading)', marginBottom: 4 }}>
              Texto extraído dos PDFs
            </div>
            <div style={{ fontSize: '0.786rem', color: 'var(--muted)', marginBottom: 12 }}>
              Conferência do que foi lido de cada arquivo, página a página, antes da conversão.
            </div>
            {pdfPreviews.map(pv => (
              <details key={pv.fileName} style={{ marginBottom: 8 }}>
                <summary style={{
                  cursor: 'pointer', fontSize: '0.786rem', fontWeight: 600,
                  color: 'var(--navy)', fontFamily: 'var(--font-mono)',
                }}>
                  {pv.fileName} — {pv.pages.length} página(s)
                </summary>
                <pre style={{
                  margin: '8px 0 0', padding: '10px 12px',
                  background: 'var(--paper-mid)', border: '1px solid var(--rule)',
                  borderRadius: 'var(--r-sm)', maxHeight: 280, overflow: 'auto',
                  fontSize: '0.679rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {pv.pages.map((pg, i) =>
                    '--- página ' + (i + 1) + ' ---\n' + pg.join('\n')
                  ).join('\n\n')}
                </pre>
              </details>
            ))}
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
                      <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
                        {parsed.source === 'pdf' ? (
                          <select
                            className="filter-select"
                            style={{ minHeight: 30, fontSize: '0.786rem' }}
                            value={perfilOverrides[r.code] || r.risk}
                            onChange={e => setPerfilOverrides(o => ({ ...o, [r.code]: e.target.value }))}
                          >
                            {P.VALID_PERFIS.map(pf => <option key={pf} value={pf}>{pf}</option>)}
                          </select>
                        ) : r.risk}
                      </td>
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
          nenhum servidor. PDFs são processados localmente (pdf.js); nada sai da máquina. Atualizar a
          página recarrega o conjunto demo. NNM (captação) e taxa de administração não são capturados
          no formato de importação e aparecem zerados/uniformes nos painéis de Receitas.
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Importar = Importar;
})();
