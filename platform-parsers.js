/* platform-parsers.js — ATLAS Wealth Verification
   Camada de parser puro do módulo de importação.
   JavaScript puro: sem JSX, sem React, sem DOM.
   Carregável no navegador (window.AtlasParsers) e em Node.js (module.exports). */

(function () {
  'use strict';

  /* =============================================================
     CONSTANTES
  ============================================================= */

  var VALID_CLASSES = [
    'RF Pós-Fixado', 'RF Inflação', 'CDB', 'Multimercado', 'Ações',
    'FII', 'Previdência', 'Internacional', 'Liquidez'
  ];

  var VALID_PERFIS = ['conservador', 'moderado', 'moderado-agressivo', 'agressivo'];

  var VALID_STATUS = ['LIBERAR', 'COM ALERTA', 'CORRIGIR'];

  var REQUIRED_COLUMNS = [
    'codigo', 'nome', 'perfil', 'mes', 'pl', 'rentabilidade_pct',
    'status', 'classe', 'ativo', 'pct_alocacao'
  ];

  /* =============================================================
     parseCSV — tokenizador RFC4180-ish
  ============================================================= */

  // Retorna array de arrays (linhas de campos), preservando o conteúdo
  // literal de campos entre aspas (vírgulas e quebras de linha internas).
  function tokenize(text) {
    var rows = [];
    var field = '';
    var row = [];
    var inQuotes = false;
    var i = 0;
    var n = text.length;

    while (i < n) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {     // aspas escapadas ""
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;              // fecha aspas
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }

      // fora de aspas
      if (ch === '"') {
        // RFC4180: aspas só são especiais no INÍCIO do campo (campo ainda vazio).
        // Uma aspa no meio de um campo não-quoted é um caractere LITERAL.
        if (field === '') {
          inQuotes = true;
          i++;
          continue;
        }
        field += '"';
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      }
      if (ch === '\r') {
        // trata \r\n e \r isolado como fim de linha
        row.push(field);
        rows.push(row);
        field = '';
        row = [];
        if (text[i + 1] === '\n') i += 2; else i++;
        continue;
      }
      if (ch === '\n') {
        row.push(field);
        rows.push(row);
        field = '';
        row = [];
        i++;
        continue;
      }
      field += ch;
      i++;
    }

    // último campo/linha (se houver conteúdo pendente)
    row.push(field);
    rows.push(row);
    return rows;
  }

  function parseCSV(text) {
    if (text == null) return [];
    var str = String(text);

    // remove BOM no início
    if (str.charCodeAt(0) === 0xFEFF) str = str.slice(1);

    var raw = tokenize(str);

    // descarta linhas totalmente em branco
    var lines = raw.filter(function (cells) {
      return cells.some(function (c) { return String(c).trim() !== ''; });
    });

    if (lines.length === 0) return [];

    var headers = lines[0].map(function (h) {
      return String(h).trim().toLowerCase();
    });

    var out = [];
    for (var r = 1; r < lines.length; r++) {
      var cells = lines[r];
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        var val = c < cells.length ? cells[c] : '';
        obj[headers[c]] = String(val).trim();
      }
      out.push(obj);
    }
    return out;
  }

  /* =============================================================
     parseImportRows — normalização e validação
  ============================================================= */

  // Parsing numérico estrito: ponto decimal apenas (sem vírgula pt-BR).
  // Excel/CSV em pt-BR às vezes usa vírgula decimal; isso está fora de
  // escopo por decisão de projeto — valores com vírgula falharão como NaN.
  function toNumber(value) {
    if (value == null) return NaN;
    var s = String(value).trim();
    if (s === '') return NaN;
    var num = Number(s);
    return Number.isFinite(num) ? num : NaN;
  }

  // Contrato: retorna { portfolios, errors, warnings }.
  // IMPORTANTE: se `errors` NÃO estiver vazio, NÃO use `portfolios` — pode
  // conter dados parciais/inválidos. O consumidor deve bloquear a importação
  // quando errors.length > 0. `warnings` é não-bloqueante (normalização, etc.).
  function parseImportRows(rows, options) {
    options = options || {};
    var validMonths = options.validMonths || null;

    var errors = [];
    var warnings = [];

    rows = Array.isArray(rows) ? rows : [];

    // ── Verificação de cabeçalho ──────────────────────────────
    // Os headers presentes são as chaves do primeiro objeto-linha.
    var presentCols = rows.length > 0 ? Object.keys(rows[0]) : [];
    var presentSet = {};
    presentCols.forEach(function (k) { presentSet[k] = true; });

    var missing = REQUIRED_COLUMNS.filter(function (col) {
      return !presentSet[col];
    });

    if (missing.length > 0) {
      errors.push(
        'Colunas obrigatórias ausentes no cabeçalho: ' + missing.join(', ') + '.'
      );
      return { portfolios: [], errors: errors, warnings: warnings };
    }

    // ── Agrupamento por codigo + mes ──────────────────────────
    var groups = {};       // chave -> { code, mes, rows: [] }
    var order = [];        // mantém ordem de aparição

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var code = String(row.codigo == null ? '' : row.codigo).trim();
      var mes = String(row.mes == null ? '' : row.mes).trim();
      var key = code + '||' + mes;
      if (!groups[key]) {
        groups[key] = { code: code, mes: mes, rows: [] };
        order.push(key);
      }
      groups[key].rows.push(row);
    }

    // ── Montagem por carteira (agregando meses) ───────────────
    var portfolioByCode = {};   // code -> objeto portfolio
    var portfolioOrder = [];

    for (var g = 0; g < order.length; g++) {
      var grp = groups[order[g]];
      var first = grp.rows[0];
      var ref = 'carteira ' + grp.code + ' (mês ' + grp.mes + ')';

      // --- Campos de carteira (da primeira linha) ---
      var nome = String(first.nome == null ? '' : first.nome).trim();
      var perfilRaw = String(first.perfil == null ? '' : first.perfil).trim();
      var statusRaw = String(first.status == null ? '' : first.status).trim();

      // perfil canônico (case-insensitive)
      var perfilCanon = null;
      var perfilLower = perfilRaw.toLowerCase();
      for (var p = 0; p < VALID_PERFIS.length; p++) {
        if (VALID_PERFIS[p] === perfilLower) { perfilCanon = VALID_PERFIS[p]; break; }
      }
      if (!perfilCanon) {
        errors.push('Perfil inválido "' + perfilRaw + '" em ' + ref +
          '. Valores aceitos: ' + VALID_PERFIS.join(', ') + '.');
      }

      // status canônico (case-insensitive)
      var statusCanon = null;
      var statusUpper = statusRaw.toUpperCase();
      for (var s = 0; s < VALID_STATUS.length; s++) {
        if (VALID_STATUS[s] === statusUpper) { statusCanon = VALID_STATUS[s]; break; }
      }
      if (!statusCanon) {
        errors.push('Status inválido "' + statusRaw + '" em ' + ref +
          '. Valores aceitos: ' + VALID_STATUS.join(', ') + '.');
      }

      // --- mes ---
      if (!/^\d{4}-\d{2}$/.test(grp.mes)) {
        errors.push('Mês inválido "' + grp.mes + '" em ' + ref +
          '. Formato esperado AAAA-MM.');
      } else if (validMonths && validMonths.indexOf(grp.mes) === -1) {
        errors.push('Mês "' + grp.mes + '" fora da faixa suportada em ' + ref +
          '. Meses suportados: ' + validMonths.join(', ') + '.');
      }

      // --- pl ---
      var pl = toNumber(first.pl);
      if (!Number.isFinite(pl) || pl <= 0) {
        errors.push('PL inválido "' + String(first.pl) + '" em ' + ref +
          '. Deve ser numérico e maior que zero.');
      }

      // --- rentabilidade_pct ---
      var ret = toNumber(first.rentabilidade_pct);
      if (!Number.isFinite(ret)) {
        errors.push('Rentabilidade inválida "' + String(first.rentabilidade_pct) +
          '" em ' + ref + '. Deve ser numérica.');
      } else if (Math.abs(ret) > 1) {
        warnings.push('Rentabilidade ' + ret + ' em ' + ref +
          ' parece estar em pontos percentuais; esperado fração decimal (ex.: 0.0095 = 0,95%).');
      }

      // --- divergência de campos de carteira entre linhas ---
      for (var d = 1; d < grp.rows.length; d++) {
        var rr = grp.rows[d];
        var divs = [];
        if (String(rr.nome == null ? '' : rr.nome).trim() !== nome) divs.push('nome');
        if (String(rr.perfil == null ? '' : rr.perfil).trim() !== perfilRaw) divs.push('perfil');
        if (String(rr.pl == null ? '' : rr.pl).trim() !== String(first.pl == null ? '' : first.pl).trim()) divs.push('pl');
        if (String(rr.rentabilidade_pct == null ? '' : rr.rentabilidade_pct).trim() !==
            String(first.rentabilidade_pct == null ? '' : first.rentabilidade_pct).trim()) divs.push('rentabilidade_pct');
        if (String(rr.status == null ? '' : rr.status).trim() !== statusRaw) divs.push('status');
        if (divs.length > 0) {
          warnings.push('Divergência nos campos de carteira (' + divs.join(', ') +
            ') na linha ' + (d + 1) + ' do grupo ' + ref +
            '; usando os valores da primeira linha.');
        }
      }

      // --- composição (uma entrada por linha) ---
      var composition = [];
      var sumPct = 0;
      var pctValid = true;

      for (var c = 0; c < grp.rows.length; c++) {
        var cr = grp.rows[c];
        var clsRaw = String(cr.classe == null ? '' : cr.classe).trim();
        var ativo = String(cr.ativo == null ? '' : cr.ativo).trim();

        if (VALID_CLASSES.indexOf(clsRaw) === -1) {
          errors.push('Classe inválida "' + clsRaw + '" em ' + ref +
            ' (ativo "' + ativo + '"). Classes aceitas: ' + VALID_CLASSES.join(', ') + '.');
        }

        var pct = toNumber(cr.pct_alocacao);
        if (!Number.isFinite(pct)) {
          errors.push('pct_alocacao inválido "' + String(cr.pct_alocacao) +
            '" em ' + ref + ' (ativo "' + ativo + '"). Deve ser numérico.');
          pctValid = false;
        } else if (pct <= 0 || pct > 1) {
          errors.push('pct_alocacao "' + pct + '" fora do intervalo (0, 1] em ' +
            ref + ' (ativo "' + ativo + '").');
          pctValid = false;
        } else {
          sumPct += pct;
        }

        composition.push({ cls: clsRaw, name: ativo, pct: pct });
      }

      // --- normalização da soma de pct (apenas se todos válidos) ---
      if (pctValid && composition.length > 0) {
        if (Math.abs(sumPct - 1) > 0.01) {
          warnings.push('Soma das alocações em ' + ref + ' é ' +
            sumPct.toFixed(4) + ' (esperado ~1); normalizando automaticamente.');
          if (sumPct > 0) {
            for (var k = 0; k < composition.length; k++) {
              composition[k].pct = composition[k].pct / sumPct;
            }
          }
        }
      }

      // --- registra no portfolio (agrega meses) ---
      var pf = portfolioByCode[grp.code];
      if (!pf) {
        pf = {
          code: grp.code,
          name: nome,
          risk: perfilCanon || perfilRaw,
          months: {}
        };
        portfolioByCode[grp.code] = pf;
        portfolioOrder.push(grp.code);
      }

      pf.months[grp.mes] = {
        pl: pl,
        ret: ret,
        status: statusCanon || statusRaw,
        composition: composition
      };
    }

    var portfolios = portfolioOrder.map(function (code) {
      return portfolioByCode[code];
    });

    return { portfolios: portfolios, errors: errors, warnings: warnings };
  }

  /* =============================================================
     PDF — books mensais Mirabaud (SmartBrain)
     Funções puras: recebem texto/itens já extraídos (pdf.js roda na UI).
  ============================================================= */

  // Mapa classe-do-book -> classe ATLAS (VALID_CLASSES).
  var PDF_CLASS_MAP = {
    'Liquidez': 'Liquidez',
    'Pós-Fixado': 'RF Pós-Fixado',
    'Pos-Fixado': 'RF Pós-Fixado',
    'Prefixado': 'CDB',
    'Inflação': 'RF Inflação',
    'Inflacao': 'RF Inflação',
    'Ações': 'Ações',
    'Acoes': 'Ações',
    'Multimercados': 'Multimercado',
    'Multimercado': 'Multimercado',
    'FIIs': 'FII',
    'FII': 'FII',
    'RV Global': 'Internacional',
    'Internacional': 'Internacional',
    'Previdência': 'Previdência',
    'Previdencia': 'Previdência'
  };

  // Mapeamentos sem equivalente direto no ATLAS — geram warning informativo.
  var PDF_CLASS_MAP_LOSSY = { 'Prefixado': true, 'RV Global': true };

  // Sufixos de custodiante na coluna Instituição (removidos do nome do ativo).
  var PDF_CUSTODY_SUFFIXES = [
    'BTG CORRETORA', 'XP CORRETORA', 'S3 CACEIS',
    'BTG', 'XP', 'BRADESCO', 'ITAU', 'ITAÚ', 'ICATU', 'BEM', 'S3'
  ];

  // Número em formato pt-BR ("1.234,56", "-3,54"). "--", vazio ou lixo -> null.
  function parseBRNumber(value) {
    if (value == null) return null;
    var s = String(value).trim();
    if (s === '' || s === '--' || s === '-') return null;
    if (!/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) return null;
    return Number(s.replace(/\./g, '').replace(',', '.'));
  }

  // Reconstrói linhas visuais a partir dos itens de texto de UMA página.
  // items: [{ str, x, y, rot }] — x/y = transform[4]/[5] do getTextContent,
  // rot = atan2(transform[1], transform[0]) (radianos). Páginas dos books têm
  // matriz de rotação 90°; des-rotaciona pelo quarto de volta dominante,
  // agrupa por linha (tolerância 2.5pt) e ordena pela direção de leitura.
  function reconstructPdfLines(items) {
    var valid = (Array.isArray(items) ? items : []).filter(function (it) {
      return it && String(it.str == null ? '' : it.str).trim() !== '';
    });
    if (valid.length === 0) return [];

    var counts = {};
    valid.forEach(function (it) {
      var q = Math.round((it.rot || 0) / (Math.PI / 2));
      q = ((q % 4) + 4) % 4;
      counts[q] = (counts[q] || 0) + 1;
    });
    var domQ = 0, best = -1;
    Object.keys(counts).forEach(function (k) {
      if (counts[k] > best) { best = counts[k]; domQ = Number(k); }
    });

    function unrot(x, y) {
      switch (domQ) {
        case 1:  return { u: y,  v: -x };
        case 2:  return { u: -x, v: -y };
        case 3:  return { u: -y, v: x };
        default: return { u: x,  v: y };
      }
    }

    var rows = [];
    valid.forEach(function (it) {
      var pt = unrot(it.x || 0, it.y || 0);
      var row = null;
      for (var i = 0; i < rows.length; i++) {
        if (Math.abs(rows[i].v - pt.v) <= 2.5) { row = rows[i]; break; }
      }
      if (!row) { row = { v: pt.v, items: [] }; rows.push(row); }
      row.items.push({ u: pt.u, str: String(it.str).trim() });
    });

    rows.sort(function (a, b) { return b.v - a.v; });
    return rows.map(function (r) {
      r.items.sort(function (a, b) { return a.u - b.u; });
      return r.items.map(function (i) { return i.str; }).join(' ');
    });
  }

  // Divide uma linha em prefixo textual + números pt-BR no final.
  function tokenizeBookLine(line) {
    var parts = String(line == null ? '' : line).trim().split(/\s+/).filter(function (t) { return t !== ''; });
    var nums = [];
    var i = parts.length - 1;
    while (i >= 0) {
      var v = parseBRNumber(parts[i]);
      if (v == null) break;
      nums.unshift(v);
      i--;
    }
    return { text: parts.slice(0, i + 1).join(' '), nums: nums };
  }

  // Parser do layout dos books mensais (SmartBrain / Mirabaud).
  // pagesLines: array de páginas, cada uma um array de linhas (reconstruídas).
  // options: { validMonths, fileName }
  // Saída: { portfolio|null, errors, warnings, confidence: 'alta'|'baixa' }.
  // Baixa confiança => portfolio null e erro "revisão manual necessária".
  function parseMirabaudBook(pagesLines, options) {
    options = options || {};
    var validMonths = options.validMonths || null;
    var fileName = options.fileName || '';
    var label = fileName || 'PDF';

    var errors = [];
    var warnings = [];
    var reasons = [];

    pagesLines = Array.isArray(pagesLines) ? pagesLines : [];
    var p, l;

    // ── código da carteira (capa; fallback: nome do arquivo) ──
    var code = null;
    var cover = pagesLines[0] || [];
    for (l = 0; l < cover.length; l++) {
      var ln = String(cover[l]).trim();
      if (!ln) continue;
      if (/relat[óo]rio\s+mensal/i.test(ln)) continue;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(ln)) continue;
      if (ln.length > 40) continue;
      code = ln.replace(/\s+/g, '_').toUpperCase();
      break;
    }
    if (!code) {
      var fm = fileName.match(/book[_\s-]+([A-Za-z0-9]+)/i);
      if (fm) code = fm[1].toUpperCase();
    }
    if (!code) reasons.push('código da carteira não identificado (capa/nome do arquivo)');

    // ── mês de referência ("Data Extrato: DD/MM/AAAA"; fallback: data da capa) ──
    var mes = null;
    for (p = 0; p < pagesLines.length && !mes; p++) {
      for (l = 0; l < pagesLines[p].length; l++) {
        var dm = String(pagesLines[p][l]).match(/Data\s+(?:do\s+)?Extrato:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
        if (dm) { mes = dm[3] + '-' + dm[2]; break; }
      }
    }
    if (!mes) {
      for (l = 0; l < cover.length; l++) {
        var cdm = String(cover[l]).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (cdm) { mes = cdm[3] + '-' + cdm[2]; break; }
      }
    }
    if (!mes) {
      reasons.push('mês de referência não identificado ("Data Extrato")');
    } else if (validMonths && validMonths.indexOf(mes) === -1) {
      errors.push(label + ': mês "' + mes + '" fora da faixa suportada. Meses suportados: ' +
        validMonths.join(', ') + '.');
    }

    // ── PL total + alocação por classe (seção Asset Allocation) ──
    // Linha "TOTAL <pl> 100,00" (2 números, segundo ~100).
    var pl = null;
    var classAlloc = [];
    for (p = 0; p < pagesLines.length && pl == null; p++) {
      var page = pagesLines[p];
      var hasAA = page.some(function (s) { return /Asset\s+Allocation/i.test(s); });
      if (!hasAA) continue;
      var pageAlloc = [];
      for (l = 0; l < page.length; l++) {
        var tk = tokenizeBookLine(page[l]);
        if (tk.nums.length !== 2) continue;
        if (/^TOTAL$/i.test(tk.text) && Math.abs(tk.nums[1] - 100) <= 0.5) {
          pl = tk.nums[0];
          classAlloc = pageAlloc;
          break;
        }
        if (PDF_CLASS_MAP[tk.text] !== undefined) {
          pageAlloc.push({ cls: tk.text, valor: tk.nums[0], pct: tk.nums[1] });
        }
      }
    }
    if (pl == null || !(pl > 0)) {
      reasons.push('PL total não identificado (linha TOTAL do Asset Allocation)');
    }

    // ── rentabilidade do mês (seção "Rentabilidades Mensais da Carteira") ──
    var ret = 0;
    var retFound = false;
    if (mes) {
      var ano = mes.slice(0, 4);
      var mnum = parseInt(mes.slice(5, 7), 10);
      for (p = 0; p < pagesLines.length && !retFound; p++) {
        var hasRM = pagesLines[p].some(function (s) { return /Rentabilidades\s+Mensais/i.test(s); });
        if (!hasRM) continue;
        for (l = 0; l < pagesLines[p].length; l++) {
          var parts = String(pagesLines[p][l]).trim().split(/\s+/);
          if (parts[0] !== ano) continue;
          var rv = parseBRNumber(parts[mnum]);
          if (rv != null) { ret = rv / 100; retFound = true; }
          break;
        }
      }
    }
    if (!retFound) {
      warnings.push(label + ': rentabilidade do mês não localizada no book; aplicada 0%.');
    }

    // ── composição por ativo (seção de conciliação: "Saldo Anterior ... Part.%") ──
    var SKIP_RE = /Saldo\s+Anterior|Compras\s+Vendas|IR\+IOF|Provis[ãa]o|Ativos\s+Institui|Saldo\s+Bruto|Custodiante|Powered\s+by|Data\s+(?:do\s+)?Extrato|GrossUp\*\s+ativos|Cálculos\s+de|Títulos\s+com|Este\s+relatório|administradoras/i;
    var composition = [];
    var sumPart = 0;
    var sumSaldo = 0;
    var lossyWarned = {};
    var skippedNoClass = false;

    // A seção de conciliação atravessa páginas: um grupo de classe aberto no
    // fim de uma página vale para os ativos no início da seguinte. Por isso o
    // estado persiste entre as páginas da seção (o TOTAL geral o encerra).
    var currentCls = null;
    var pending = [];
    var lastAsset = null;

    for (p = 0; p < pagesLines.length; p++) {
      var cpage = pagesLines[p];
      var isConc = cpage.some(function (s) { return /Saldo\s+Anterior/i.test(s); }) &&
                   cpage.some(function (s) { return /Part\.?\s*%/i.test(s); });
      if (!isConc) continue;

      for (l = 0; l < cpage.length; l++) {
        var cline = String(cpage[l]).trim();
        if (!cline) continue;
        if (SKIP_RE.test(cline)) { pending = []; continue; }

        var ct = tokenizeBookLine(cline);

        if (ct.nums.length >= 8) {
          if (/^TOTAL$/i.test(ct.text)) { currentCls = null; pending = []; lastAsset = null; continue; }
          if (PDF_CLASS_MAP[ct.text] !== undefined) {
            // linha de grupo (classe)
            currentCls = ct.text;
            if (PDF_CLASS_MAP_LOSSY[ct.text] && !lossyWarned[ct.text]) {
              lossyWarned[ct.text] = true;
              warnings.push(label + ': classe "' + ct.text + '" do book mapeada para "' +
                PDF_CLASS_MAP[ct.text] + '".');
            }
            pending = [];
            lastAsset = null;
            continue;
          }
          // linha de ativo: [saldoAnt, aplic, resg, eventos, imposto, saldoBruto, provisao, saldoLiq, part]
          var nums = ct.nums;
          var part = nums[nums.length - 1];
          var saldoBruto = nums.length >= 4 ? nums[nums.length - 4] : null;
          var name = (pending.join(' ') + ' ' + ct.text).trim();
          pending = [];

          var upper = name.toUpperCase();
          for (var s2 = 0; s2 < PDF_CUSTODY_SUFFIXES.length; s2++) {
            var suf = PDF_CUSTODY_SUFFIXES[s2];
            if (upper === suf) { name = ''; break; }
            if (upper.lastIndexOf(' ' + suf) === upper.length - suf.length - 1 && upper.length > suf.length) {
              name = name.slice(0, name.length - suf.length - 1).trim();
              break;
            }
          }

          if (part == null || part <= 0) { lastAsset = null; continue; }  // zerado/vendido
          if (!currentCls) { skippedNoClass = true; lastAsset = null; continue; }

          var asset = {
            cls: PDF_CLASS_MAP[currentCls],
            name: name || ('Ativo ' + (composition.length + 1)),
            pct: part / 100
          };
          composition.push(asset);
          lastAsset = asset;
          sumPart += part;
          if (saldoBruto != null) sumSaldo += saldoBruto;
          continue;
        }

        if (ct.nums.length === 0) {
          // fragmento de nome (quebra de linha do book)
          if (lastAsset && pending.length === 0 && /^(Vencto|GrossUp|\d{2}\/\d{2}\/\d{4})/i.test(cline)) {
            lastAsset.name = (lastAsset.name + ' ' + cline).trim();
          } else {
            pending.push(cline);
          }
          continue;
        }

        // 1-7 números: linha de tabela auxiliar (índices, custodiante etc.)
        pending = [];
        lastAsset = null;
      }
    }

    if (skippedNoClass) {
      warnings.push(label + ': linhas de ativo fora de um grupo de classe foram ignoradas.');
    }

    // Fallback: sem ativos individuais, usa a alocação por classe.
    if (composition.length === 0 && classAlloc.length > 0) {
      classAlloc.forEach(function (ca) {
        if (!(ca.pct > 0)) return;
        composition.push({ cls: PDF_CLASS_MAP[ca.cls], name: ca.cls, pct: ca.pct / 100 });
        sumPart += ca.pct;
        sumSaldo += ca.valor;
      });
      if (composition.length > 0) {
        warnings.push(label + ': composição por ativo não extraída; usando alocação por classe.');
      }
    }

    // ── confiança ──
    if (composition.length === 0) {
      reasons.push('nenhum ativo extraído da seção de conciliação');
    } else {
      if (Math.abs(sumPart - 100) > 2) {
        reasons.push('participações somam ' + sumPart.toFixed(2) + '% (esperado ~100%)');
      }
      if (pl > 0 && sumSaldo > 0 && Math.abs(sumSaldo - pl) / pl > 0.02) {
        reasons.push('soma dos saldos dos ativos diverge do PL total em mais de 2%');
      }
    }

    if (reasons.length > 0) {
      errors.push(label + ': revisão manual necessária — ' + reasons.join('; ') + '.');
      return { portfolio: null, errors: errors, warnings: warnings, confidence: 'baixa' };
    }
    if (errors.length > 0) {
      return { portfolio: null, errors: errors, warnings: warnings, confidence: 'alta' };
    }

    // ── normalização da soma de pct (mesma regra do CSV) ──
    var sumPct = 0;
    composition.forEach(function (cmp) { sumPct += cmp.pct; });
    if (composition.length > 0 && Math.abs(sumPct - 1) > 0.01 && sumPct > 0) {
      warnings.push(label + ': soma das alocações é ' + sumPct.toFixed(4) +
        ' (esperado ~1); normalizando automaticamente.');
      composition.forEach(function (cmp) { cmp.pct = cmp.pct / sumPct; });
    }

    warnings.push(label + ': status não consta no PDF; aplicado COM ALERTA.');
    warnings.push(label + ': perfil de risco não consta no PDF; aplicado "moderado" (ajuste na pré-visualização).');

    var portfolio = { code: code, name: code, risk: 'moderado', months: {} };
    portfolio.months[mes] = {
      pl: pl,
      ret: ret,
      status: 'COM ALERTA',
      composition: composition
    };

    return { portfolio: portfolio, errors: errors, warnings: warnings, confidence: 'alta' };
  }

  /* =============================================================
     EXPORTAÇÃO (navegador + Node)
  ============================================================= */

  var API = {
    VALID_CLASSES: VALID_CLASSES,
    VALID_PERFIS: VALID_PERFIS,
    VALID_STATUS: VALID_STATUS,
    REQUIRED_COLUMNS: REQUIRED_COLUMNS,
    PDF_CLASS_MAP: PDF_CLASS_MAP,
    parseCSV: parseCSV,
    parseImportRows: parseImportRows,
    parseBRNumber: parseBRNumber,
    reconstructPdfLines: reconstructPdfLines,
    parseMirabaudBook: parseMirabaudBook
  };

  if (typeof window !== 'undefined') {
    window.AtlasParsers = API;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }

})();
