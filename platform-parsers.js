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
        inQuotes = true;
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
     EXPORTAÇÃO (navegador + Node)
  ============================================================= */

  var API = {
    VALID_CLASSES: VALID_CLASSES,
    VALID_PERFIS: VALID_PERFIS,
    VALID_STATUS: VALID_STATUS,
    REQUIRED_COLUMNS: REQUIRED_COLUMNS,
    parseCSV: parseCSV,
    parseImportRows: parseImportRows
  };

  if (typeof window !== 'undefined') {
    window.AtlasParsers = API;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }

})();
