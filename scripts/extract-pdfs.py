#!/usr/bin/env python3
"""
Extract portfolio data from custodian "Book" PDFs.

Usage:
    python scripts/extract-pdfs.py --pasta CAMINHO --mes 2026-05 --baseline 2026-04
    python scripts/extract-pdfs.py --pasta "Editados" --mes 2026-05 --baseline 2026-04

Output: JSON array of CarteiraRaw objects to stdout.
"""

import argparse
import json
import os
import re
import sys
from collections import OrderedDict

import pdfplumber


# ── helpers ──────────────────────────────────────────────────────────────────

MES_ABR = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
           'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dec']

MES_NOME = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

INST_ALIAS = frozenset({'BTG', 'ICATU', 'BTGCORRETORA', 'MIRABAUD', 'ITAU',
                        'BRADESCO', 'SANTANDER', 'CREDITSUISSE', 'XP', 'EASYNV'})

# Regex: strip hyphenated surname/house suffixes colados no nome do arquivo
NAME_SUFFIX_HYPHEN = re.compile(
    r'[-–—][A-ZÀ-Ü]{2,}(?:\s+[A-ZÀ-Ü]{2,})*$'
)

# Regex: strip trailing NOVO/OLD markers
NAME_NOVO_OLD = re.compile(
    r'\s+(NOVO|OLD)\s*$',
    re.IGNORECASE
)


def parse_rent_pct(raw: str) -> float:
    """Parse rentabilidade percent value: '1,53' -> 0.0153, '0,33' -> 0.0033.
    Rentabilidade is always displayed as x.xx% so always divide by 100."""
    if not raw or raw in ('-', '—', '–', '', ' ', '--', '%'):
        return 0.0
    s = raw.strip().replace('%', '').replace(',', '.').strip()
    try:
        return float(s) / 100.0
    except ValueError:
        return 0.0


def parse_brl(raw: str) -> float:
    """Parse Brazilian-formatted number e.g. '1.234,56' -> 1234.56."""
    if not raw or raw in ('-', '—', '–', '', ' ', '--'):
        return 0.0
    s = raw.strip()
    s = s.replace('R$', '').replace('$', '').replace('%', '').strip()
    if re.match(r'^-?\d+(\.\d+)?(,\d+)?$', s):
        s = s.replace('.', '').replace(',', '.')
        return float(s)
    if re.match(r'^-?\d{1,3}(\.\d{3})+(,\d+)?$', s):
        s = s.replace('.', '').replace(',', '.')
        return float(s)
    try:
        s = s.replace('.', '').replace(',', '.')
        return float(s)
    except ValueError:
        return 0.0


def parse_pct(raw: str) -> float:
    """Parse percentage: '1,53' -> 0.0153, '30,53' -> 0.3053."""
    if not raw or raw in ('-', '—', '–', '', ' ', '--'):
        return 0.0
    s = raw.strip().replace('%', '').replace(',', '.').strip()
    try:
        n = float(s)
        if abs(n) > 1:
            return n / 100.0
        return n
    except ValueError:
        return 0.0


def is_data_row(texts: list[str]) -> bool:
    """Heuristic: row is a data row if it has >=3 cells and at least 2 look like BRL numbers."""
    if len(texts) < 3:
        return False
    numeric_count = 0
    for t in texts[2:]:
        t = t.strip().replace('R$', '').replace('.', '').replace(',', '').strip()
        if re.match(r'^-?\d+$', t):
            numeric_count += 1
    return numeric_count >= 5


def is_total_row(text: str) -> bool:
    return text.strip().upper() == 'TOTAL'


def looks_like_inst(text: str) -> bool:
    t = text.strip().upper().replace(' ', '')
    for alias in INST_ALIAS:
        if alias in t:
            return True
    return False


def looks_like_brl(text: str) -> bool:
    """Check if text looks like a Brazilian-formatted number."""
    if not text or text.strip() in ('-', '—', '–', '', ' ', '--', '0,00'):
        return False
    s = text.strip().replace('R$', '').replace('$', '').replace('%', '').strip()
    # Match patterns like 1.234,56 or 1234,56 or 1234
    if re.match(r'^-?\d{1,3}(\.\d{3})*(,\d+)?$', s):
        return True
    if re.match(r'^-?\d+(,\d+)?$', s):
        return True
    return False


def detect_col_shift(raw_name: str, raw_inst: str) -> bool:
    """Detect if institution column skipped: when raw_inst looks like a number, not an institution name."""
    if not raw_inst or raw_inst in ('', ' '):
        return False
    if raw_name.upper() == 'TOTAL':
        return looks_like_brl(raw_inst)
    return False


def clean_portfolio_name(raw_name: str) -> str:
    """Clean portfolio name: strip known suffixes, normalize spaces to underscores."""
    name = raw_name.strip()
    # Strip hyphenated surname/house suffixes colados no nome do arquivo
    name = NAME_SUFFIX_HYPHEN.sub('', name).strip()
    # Strip trailing "NOVO" / "OLD" markers
    name = NAME_NOVO_OLD.sub('', name).strip()
    # Uppercase and normalize whitespace to single underscores
    name = name.upper()
    name = re.sub(r'\s+', '_', name)
    name = re.sub(r'_+', '_', name)
    name = name.strip('_ ')
    return name


# ── per-pdf extraction ───────────────────────────────────────────────────────

def extract_portfolio_name(page_text: str) -> str | None:
    """Extract portfolio name from page 1."""
    lines = [l.strip() for l in page_text.split('\n') if l.strip()]
    for i, line in enumerate(lines):
        if 'RELATÓRIO' in line.upper() or 'Relat' in line:
            if i + 1 < len(lines):
                candidate = lines[i + 1].strip()
                if candidate and not re.match(r'^\d{2}/\d{2}/\d{4}', candidate):
                    return candidate
            if i + 2 < len(lines):
                candidate = lines[i + 2].strip()
                if candidate and not re.match(r'^\d{2}/\d{2}/\d{4}', candidate):
                    return candidate
    for line in lines:
        if re.match(r'^[A-Z]{2,6}(_[A-Z]{2,6})?(\(\d+\))?$', line):
            return line
        if re.match(r'^[A-Z][a-z]+_[A-Z0-9]+$', line):
            return line
    return None


def extract_rentabilidade(words: list[dict], mes_num: int) -> float | None:
    """Extract the monthly return for a given month from the rentabilidade table (page 4)."""
    rows_by_y: dict[float, list[tuple[float, str]]] = {}
    for w in words:
        y_key = round(w['top'], 0)
        if y_key not in rows_by_y:
            rows_by_y[y_key] = []
        rows_by_y[y_key].append((w['x0'], w['text']))

    sorted_y = sorted(rows_by_y.keys())

    # Find the 2026 row
    for y in sorted_y:
        cells = sorted(rows_by_y[y], key=lambda x: x[0])
        texts = [c[1] for c in cells]
        first = texts[0].strip() if texts else ''
        if first == '2026':
            # Skip the %doCDI rows by checking if the first real value is a %
            # The 2026 row has values like '1,01', '0,74', etc.
            # The %doCDI row has values like '87,0', '74,7', etc.
            if mes_num < len(texts):
                val = texts[mes_num].strip().replace('%', '')
                if val and val not in ('-', '—', '–', '--'):
                    return parse_rent_pct(val)
            return None
    return None


def parse_provisao_table(pages_words: list[list[dict]]) -> tuple[list[dict], dict | None]:
    """
    Parse the 'Provisão' table from multiple pages.
    Each page is processed separately to avoid y-coordinate collisions between pages.
    Returns (ativos, total) where total is the TOTAL row as CarteiraTotal-like dict.
    """
    all_raw_rows: list[list[str]] = []

    for page_words in pages_words:
        rows_by_y: dict[float, list[tuple[float, str]]] = {}
        for w in page_words:
            y_key = round(w['top'], 0)
            if y_key not in rows_by_y:
                rows_by_y[y_key] = []
            rows_by_y[y_key].append((w['x0'], w['text']))

        sorted_y = sorted(rows_by_y.keys())

        for y in sorted_y:
            cells = sorted(rows_by_y[y], key=lambda x: x[0])
            texts = [c[1] for c in cells]
            if is_data_row(texts):
                all_raw_rows.append(texts)

    if not all_raw_rows:
        return [], None

    # Parse rows into structured data
    ativos: list[dict] = []
    current_class = ''
    total_row = None

    for row in all_raw_rows:
        raw_name = row[0].strip() if len(row) > 0 else ''
        raw_inst = row[1].strip() if len(row) > 1 else ''

        # Detect column shift (missing institution column) and adjust
        shifted = detect_col_shift(raw_name, raw_inst)
        if shifted:
            raw_inst = ''
            vals = [parse_brl(row[i]) if i < len(row) else 0.0 for i in range(1, 10)]
        else:
            vals = [parse_brl(row[i]) if i < len(row) else 0.0 for i in range(2, 11)]

        # Pad vals to 9 elements
        while len(vals) < 9:
            vals.append(0.0)

        pl_base = vals[0]      # Saldo Anterior
        compras = vals[1]      # Compras
        vendas = vals[2]       # Vendas
        eventos = vals[3]      # Eventos Financeiros
        impostos = vals[4]     # Imposto Pago
        pl_ref = vals[5]       # Saldo Bruto
        prov_ir = vals[6]      # Provisão IR+IOF
        _saldo_liq = vals[7]   # Saldo Líquido
        part = vals[8] / 100.0 if vals[8] > 0 else 0.0  # Part.%

        diff = pl_ref - pl_base
        var_pct = diff / pl_base if pl_base != 0 else 0.0

        if raw_name.upper() == 'TOTAL':
            total_row = {
                'plBase': pl_base, 'plRef': pl_ref, 'diff': diff, 'varPct': var_pct,
                'compras': compras or None, 'vendas': vendas or None,
                'eventos': eventos or None, 'impostos': impostos or None,
                'provIR': prov_ir or None, 'part': part or 1.0,
            }
            continue

        # Determine if this is a class row or asset row
        # Class rows have the class name and empty/whitespace institution
        # Asset rows have the asset name and an institution name
        is_class = bool(raw_name) and (not raw_inst or not looks_like_inst(raw_inst)) and (
            raw_name.upper() in ('LIQUIDEZ', 'PÓS-FIXADO', 'POS-FIXADO', 'PÓS FIXADO',
                                 'POS FIXADO', 'PREFIXADO', 'INFLAÇÃO', 'INFLAcaO', 'INFLAÇÃO',
                                 'AÇÕES', 'ACOES', 'ACÕES', 'MOEDAS', 'OUTROS',
                                 'RENDA FIXA', 'RENDA VARIAVEL', 'MULTIMERCADO',
                                 'FUNDOS', 'TESOURO DIRETO', 'CDB', 'CRI', 'CRA', 'DEBENTURES',
                                 'FII', 'ETF', 'PREVIDENCIA', 'PREVIDÊNCIA')
        )

        raw_name_upper = raw_name.upper().strip()

        # More robust class detection: single word, no institution, and numeric values exist
        if (not raw_inst or raw_inst in ('', ' ')) and not is_class and not looks_like_inst(raw_name):
            is_class = True

        if is_class:
            current_class = raw_name
            ativos.append({
                'type': 'classe',
                'classe': current_class,
                'plBase': pl_base, 'plRef': pl_ref, 'diff': diff, 'varPct': var_pct,
                'part': part or None,
            })
        else:
            # Asset row
            inst = raw_inst if raw_inst and raw_inst != ' ' else None
            ativos.append({
                'type': 'ativo',
                'classe': current_class,
                'nome': raw_name,
                'instituicao': inst,
                'plBase': pl_base, 'plRef': pl_ref, 'diff': diff, 'varPct': var_pct,
                'compras': compras or None, 'vendas': vendas or None,
                'eventos': eventos or None, 'impostos': impostos or None,
                'provIR': prov_ir or None, 'part': part or None,
            })

    return ativos, total_row


def find_provisao_pages(pages_text: list[str]) -> list[int]:
    """Find all page indices containing the 'Provisão' table."""
    indices = []
    for i, text in enumerate(pages_text):
        if ('Provis' in text or 'PROVIS' in text) and 'SaldoAnterior' in text.replace(' ', ''):
            indices.append(i)
    return indices


def find_rentabilidade_page(pages_text: list[str]) -> int | None:
    """Find page index with the rentabilidade mensal table."""
    for i, text in enumerate(pages_text):
        if 'Rentabilidades Mensais' in text or 'RentabilidadesMensais' in text.replace(' ', ''):
            return i
    return None


def process_pdf(filepath: str, mes: str, baseline: str) -> dict | None:
    """Process a single Book PDF and return a CarteiraRaw-like dict."""
    _, fname = os.path.split(filepath)
    mes_num = int(mes.split('-')[1])

    try:
        doc = pdfplumber.open(filepath)
    except Exception as e:
        print(f"[WARN] Falha ao abrir {fname}: {e}", file=sys.stderr)
        return None

    pages_text = []
    pages_words = []
    for p in doc.pages:
        pages_text.append(p.extract_text() or '')
        pages_words.append(p.extract_words(keep_blank_chars=True, x_tolerance=3) or [])

    doc.close()

    if not pages_text:
        print(f"[WARN] PDF vazio: {fname}", file=sys.stderr)
        return None

    # 1. Portfolio name (page 1 = index 0)
    nome = extract_portfolio_name(pages_text[0])
    if not nome:
        print(f"[WARN] Nome nao encontrado em {fname}", file=sys.stderr)
        return None

    # Clean name: strip hyphenated suffixes, NOVO/OLD markers, normalize spacing
    nome = clean_portfolio_name(nome)

    # 2. Rentabilidade — find dynamically
    rent_ref = None
    rent_page = find_rentabilidade_page(pages_text)
    if rent_page is not None and rent_page < len(pages_words):
        rent_ref = extract_rentabilidade(pages_words[rent_page], mes_num)

    # 3. Asset table — find ALL pages containing "Provisão" and collect per-page words
    prov_pages = find_provisao_pages(pages_text)
    if not prov_pages:
        print(f"[WARN] Tabela Provisao nao encontrada em {fname}", file=sys.stderr)
        return None

    pages_words_prov = [pages_words[idx] for idx in prov_pages]

    ativos, total = parse_provisao_table(pages_words_prov)

    if total is None:
        print(f"[WARN] Linha TOTAL nao encontrada na Provisao em {fname}", file=sys.stderr)
        return None

    # 4. Compute metrics
    pl_base = total['plBase']
    pl_ref = total['plRef']
    var_rs = pl_ref - pl_base
    var_pct = var_rs / pl_base if pl_base != 0 else 0.0

    eventos_val = total.get('eventos') or 0.0
    impostos_val = total.get('impostos') or 0.0
    compras_val = total.get('compras') or 0.0
    vendas_val = total.get('vendas') or 0.0

    # perfImplicita = (pl_ref - pl_base - compras + vendas - eventos + impostos) / pl_base
    perf_implicita = ((pl_ref - pl_base - compras_val + vendas_val
                       - eventos_val + impostos_val) / pl_base) if pl_base != 0 else 0.0

    # somaVsTotal: difference between sum of asset-level plRefs and total plRef
    ativos_ref_sum = sum(a['plRef'] for a in ativos if a['type'] == 'ativo')
    somavstotal = abs(ativos_ref_sum - pl_ref) / pl_ref if pl_ref != 0 else 0.0

    # Count active assets
    n_base = sum(1 for a in ativos if a['type'] == 'ativo' and a['plBase'] > 0)
    n_ref = sum(1 for a in ativos if a['type'] == 'ativo' and a['plRef'] > 0)

    # 5. Come-cotas tracking (meses 5=Maio, 11=Novembro)
    come_cotas_esperado = mes_num in (5, 11)
    impostos_sum = impostos_val
    # Also try summing impostos from individual asset rows for cross-check
    impostos_ativos = sum(
        a.get('impostos') or 0 for a in ativos if a['type'] == 'ativo'
    )
    if impostos_ativos > impostos_sum:
        impostos_sum = impostos_ativos
    come_cotas_detectado = impostos_sum > 0.001 * pl_ref

    if come_cotas_esperado and not come_cotas_detectado:
        print(
            f"[WARN] {fname} ({nome}): come-cotas esperado (mes {mes_num}) "
            f"mas nao detectado. Impostos: R$ {impostos_sum:.2f}, "
            f"PL Ref: R$ {pl_ref:.2f}",
            file=sys.stderr,
        )

    # 6. Class allocation (alocacao)
    classes = [a for a in ativos if a['type'] == 'classe']
    alocacao = [
        {
            'classe': c['classe'],
            'plBase': c['plBase'],
            'plRef': c['plRef'],
            'partPct': round(c['part'] * 100, 2) if c.get('part') else 0.0,
        }
        for c in classes
    ]

    # 7. Consolidated flag
    consolidado = 'Consolidado' in fname

    # 8. Mes/Ano labels
    y = mes.split('-')[0]
    m = mes_num
    b_y = baseline.split('-')[0]
    b_m = int(baseline.split('-')[1])

    periodo = {
        'baseline': baseline,
        'referencia': mes,
        'baselineLabel': f"{MES_NOME[b_m]} {b_y}",
        'referenciaLabel': f"{MES_NOME[m]} {y}",
    }

    result = {
        'nome': nome,
        'periodo': periodo,
        'plBase': pl_base,
        'plRef': pl_ref,
        'varRS': var_rs,
        'varPct': var_pct,
        'rentRef': rent_ref,
        'continuidade': 0.0,
        'somaVsTotal': somavstotal,
        'perfImplicita': perf_implicita,
        'eventos': eventos_val,
        'impostos': impostos_val,
        'comeCotasEsperado': come_cotas_esperado,
        'comeCotasDetectado': come_cotas_detectado,
        'alocacao': alocacao,
        'consolidado': consolidado,
        'ativos': ativos,
        'total': total,
        'nAtivosBase': n_base,
        'nAtivosRef': n_ref,
        'fonte': {'tipo': 'pdf', 'template': 'custodian-pdf-v1', 'arquivo': fname},
    }

    return result


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Extrair dados de PDFs de carteiras (formato Book)')
    parser.add_argument('--pasta', required=True, help='Pasta com os Book_*.pdf')
    parser.add_argument('--mes', required=True, help='Mês de referência (YYYY-MM)')
    parser.add_argument('--baseline', required=True, help='Mês baseline (YYYY-MM)')
    args = parser.parse_args()

    pasta = args.pasta
    if not os.path.isdir(pasta):
        print(f'ERRO: Pasta nao encontrada: {pasta}', file=sys.stderr)
        sys.exit(1)

    # Find all Book_*.pdf files (including Consolidado — now processed with flag)
    pdfs = sorted([
        os.path.join(pasta, f)
        for f in os.listdir(pasta)
        if f.startswith('Book_') and f.lower().endswith('.pdf')
    ])

    if not pdfs:
        print(f'ERRO: Nenhum Book_*.pdf encontrado em {pasta}', file=sys.stderr)
        sys.exit(1)

    results = []
    errors = 0
    for fp in pdfs:
        r = process_pdf(fp, args.mes, args.baseline)
        if r:
            results.append(r)
        else:
            errors += 1

    if errors > 0:
        print(f'[INFO] {errors} PDF(s) ignorados', file=sys.stderr)

    output = {
        'meta': {
            'mes': args.mes,
            'baseline': args.baseline,
            'processadoEm': __import__('datetime').datetime.now().isoformat(),
        },
        'carteiras': results,
    }

    json.dump(output, sys.stdout, ensure_ascii=False, indent=2, default=str)


if __name__ == '__main__':
    main()
