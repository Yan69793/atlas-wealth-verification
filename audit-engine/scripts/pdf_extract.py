#!/usr/bin/env python
"""Extrai dados estruturados de um relatorio 'Book_<carteira>_<AAAA>_<MM>.pdf' (formato custodiante/SmartBrain).

Uso: python pdf_extract.py <arquivo.pdf> --mes 2026-05

Saida: JSON no stdout com nome, asset allocation, rentabilidade do mes de referencia
e a tabela de ativos completa (linha TOTAL incluida). Nao faz nenhuma decisao de
regra de auditoria - so extrai o que esta escrito no PDF, por coordenada.

Duas variantes de layout de tabela de ativos existem no mesmo gerador:
- "normal": tem coluna Instituicao (ex: Book_ACSC_EDC)
- "consolidado": nao tem coluna Instituicao, rotulos "Rendimentos/Proventos"
  em vez de "Eventos Financeiros" (ex: Book_CABM_TMBM_Consolidado)
A deteccao e automatica pelo cabecalho da tabela na propria pagina.
"""
import sys
import json
import argparse
import re

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

try:
    import pdfplumber
except ImportError:
    print(json.dumps({"erro": "pdfplumber nao encontrado no interpretador Python usado. Rode com 'python' (3.11), nao 'python3'/'py'."}), file=sys.stderr)
    sys.exit(2)

MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

ANCHOR_TOLERANCE = 12
ROW_MERGE_GAP = 9
LINE_CLUSTER_TOLERANCE = 2.5


def build_profile(header_lines):
    """Deriva as posicoes de coluna do cabecalho REAL desta pagina/documento,
    em vez de usar constantes fixas - a posicao das colunas varia (poucos a
    ~15pt) de carteira para carteira, provavelmente por auto-ajuste do gerador
    do relatorio."""
    anchors = {}
    saldo_base_x0 = None
    inst_range = None
    for ln in header_lines:
        for w in ln['words']:
            txt = w['text']
            if 'SaldoAnterior' in txt:
                anchors['saldoBase'] = w['x1']
                saldo_base_x0 = w['x0']
            elif 'Aplica' in txt:
                anchors['aplicacoes'] = w['x1']
            elif 'Resgates' in txt:
                anchors['resgates'] = w['x1']
            elif 'Eventos' in txt or 'Rendimentos' in txt:
                anchors['eventos'] = w['x1']
            elif 'Imposto' in txt:
                anchors['imposto'] = w['x1']
            elif 'SaldoBruto' in txt:
                anchors['saldoBruto'] = w['x1']
            elif 'IR+IOF' in txt:
                anchors['provIR'] = w['x1']
            elif txt.startswith('SaldoL') and 'quido' in txt:
                anchors['saldoLiquido'] = w['x1']
            elif txt.startswith('Part') and '%' in txt:
                anchors['part'] = w['x1']
            elif 'Institui' in txt:
                inst_range = (w['x0'] - 8, w['x1'] + 30)

    if len(anchors) < 7:
        return None

    if inst_range and saldo_base_x0 is not None:
        inst_range = (inst_range[0], min(inst_range[1], saldo_base_x0 - 8))

    if inst_range:
        nome_max_x = inst_range[0] - 2
    else:
        nome_max_x = (saldo_base_x0 - 15) if saldo_base_x0 else 225

    return {
        'anchors': anchors,
        'instituicao_range': inst_range,
        'nome_max_x': nome_max_x,
        'perfil': 'normal' if inst_range else 'consolidado',
    }


def parse_num_br(text):
    """'11.225.878,75' -> 11225878.75 ; '--' / '' -> None ; '5,28' -> 5.28"""
    if text is None:
        return None
    t = text.strip().replace('−', '-')
    if t in ('', '--', '-'):
        return None
    t = t.replace('.', '').replace(',', '.')
    try:
        return float(t)
    except ValueError:
        return None


def get_lines(page, top_min=0, top_max=None):
    """Agrupa words da pagina em 'linhas de texto' por proximidade vertical."""
    words = page.extract_words()
    words = [w for w in words if w['top'] >= top_min and (top_max is None or w['top'] <= top_max)]
    words.sort(key=lambda w: (w['top'], w['x0']))
    lines = []
    for w in words:
        if lines and abs(w['top'] - lines[-1]['top']) <= LINE_CLUSTER_TOLERANCE:
            lines[-1]['words'].append(w)
            lines[-1]['top'] = (lines[-1]['top'] + w['top']) / 2
        else:
            lines.append({'top': w['top'], 'words': [w]})
    for ln in lines:
        ln['words'].sort(key=lambda w: w['x0'])
    return lines


def extract_cover_name(pdf):
    """Le o nome da carteira na capa em 3 formatos de template (2024-2026).

    Template 1 (2024-01..2024-03): nome a direita, top~373, codigo com underscore.
    Template 2 (2024-06..2025-12): nome a esquerda, top~455, nome de exibicao.
    Template 3 (2026-01..2026-06): nome a esquerda, top~455, codigo com underscore.

    Estrategia: procura em bandas progressivas, prefere palavra com underscore
    (codigo) sobre nome de exibicao; combina palavras da mesma linha para nomes
    compostos com espaco (ex: 'MMR 1 (Marta)')."""
    import re
    page = pdf.pages[0]
    words = page.extract_words()

    # Palavras que nunca sao nome de carteira
    SKIP = {'RELATORIO', 'RELATÓRIO', 'MENSAL', 'Relatório', 'Mensal'}

    def is_portfolio_word(w):
        t = w['text'].strip()
        if not t or t in SKIP:
            return False
        if re.match(r'\d{2}/\d{2}/\d{4}', t):
            return False
        # Codigo: 3+ chars, uppercase + underscore (ex: ACSC_EDC, MMR_ACRB)
        if re.match(r'^[A-Z][A-Z0-9_]{2,}$', t) and '_' in t:
            return True
        # Nome de exibicao: 3+ chars, comeca com uppercase, sem underscore
        if re.match(r'^[A-Z][a-zA-Z0-9 ]{2,}$', t):
            return True
        # Nome com parenteses (ex: "MMR 1 (Marta)")
        if re.match(r'^[A-Z][a-zA-Z0-9 ()\-]{2,}$', t):
            return True
        return False

    candidates = [w for w in words if is_portfolio_word(w)]

    if not candidates:
        # Fallback: get_lines nas duas bandas conhecidas
        for top_min, top_max in [(440, 470), (360, 420)]:
            lines = get_lines(page, top_min=top_min, top_max=top_max)
            for ln in lines:
                if ln['words']:
                    txt = ' '.join(w['text'] for w in ln['words']).strip()
                    if txt and not any(s in txt for s in ['RELAT', 'MENSAL', '/202']):
                        return txt
        return None

    # Prefere codigo (underscore) sobre display name
    with_underscore = [w for w in candidates if '_' in w['text']]
    if with_underscore:
        best = with_underscore[0]
    else:
        best = candidates[0]

    # Junta todas as palavras da mesma linha (top igual com tolerancia)
    same_line = [w for w in words if abs(w['top'] - best['top']) <= 4]
    same_line.sort(key=lambda w: w['x0'])
    return ' '.join(w['text'] for w in same_line).strip()


def extract_asset_allocation(pdf):
    for page in pdf.pages:
        lines = get_lines(page, top_min=100, top_max=250)
        header_hit = any(
            ''.join(w['text'] for w in ln['words']).replace(' ', '').startswith('AssetAllocation')
            for ln in lines
        )
        if not header_hit:
            continue
        classes = []
        total = None
        for ln in lines:
            words = sorted(ln['words'], key=lambda w: w['x0'])
            if not words or words[0]['x0'] > 100:
                continue
            nome = words[0]['text'].strip()
            if nome in ('AssetAllocation', 'Histórico', 'Asset', 'Allocation', '$', '%'):
                continue
            nums = [parse_num_br(w['text']) for w in words[1:] if re.match(r'^-?[\d.,]+$', w['text'].strip())]
            nums = [n for n in nums if n is not None]
            if len(nums) < 2:
                continue
            valor, pct = nums[0], nums[1]
            if nome.upper() == 'TOTAL':
                total = valor
            else:
                classes.append({'classe': nome, 'valor': valor, 'pct': pct})
        return classes, total
    return [], None


def extract_rentabilidade_mes(pdf, ano, mes_idx):
    """mes_idx: 1-12. Procura a grade 'Rentabilidades Mensais da Carteira'."""
    mes_abrev = MESES_ABREV[mes_idx - 1]
    for page in pdf.pages:
        text_flat = (page.extract_text() or '').replace(' ', '').replace('\n', '')
        if 'RentabilidadesMensaisdaCarteira' not in text_flat:
            continue
        lines = get_lines(page, top_min=100, top_max=250)
        header = None
        for ln in lines:
            texts = [w['text'].strip() for w in ln['words']]
            if 'Ano' in texts and mes_abrev in texts:
                header = ln
                break
        if header is None:
            return None
        col_x = next(w['x0'] for w in header['words'] if w['text'].strip() == mes_abrev)
        for ln in lines:
            words = sorted(ln['words'], key=lambda w: w['x0'])
            if not words:
                continue
            if words[0]['text'].strip() == str(ano):
                candidates = [w for w in words if abs(w['x0'] - col_x) <= ANCHOR_TOLERANCE]
                if candidates:
                    return parse_num_br(candidates[0]['text'])
                return None
        return None
    return None


def nearest_anchor(x1, anchors):
    best_key, best_dist = None, ANCHOR_TOLERANCE + 1
    for key, ax in anchors.items():
        d = abs(x1 - ax)
        if d < best_dist:
            best_key, best_dist = key, d
    return best_key if best_dist <= ANCHOR_TOLERANCE else None


def merge_rows(lines, nome_max_x):
    """Junta linhas de texto adjacentes que fazem parte da mesma linha logica da tabela
    (nome do ativo quebrado em linha separada da linha de valores, ou sufixo tipo 'GrossUp*')."""
    rows = []
    i = 0
    while i < len(lines):
        group = [lines[i]]
        j = i + 1
        while j < len(lines) and (lines[j]['top'] - group[-1]['top']) <= ROW_MERGE_GAP:
            has_numeric_group = any(
                re.match(r'^-?[\d.,]+%?$', w['text'].strip()) and w['x0'] > nome_max_x
                for ln in group for w in ln['words']
            )
            has_numeric_next = any(
                re.match(r'^-?[\d.,]+%?$', w['text'].strip()) and w['x0'] > nome_max_x
                for w in lines[j]['words']
            )
            if has_numeric_group and has_numeric_next:
                break
            group.append(lines[j])
            j += 1
        rows.append(group)
        i = j
    return rows


def extract_ativos_table(pdf, classe_names):
    classe_names_norm = {c.strip().upper() for c in classe_names}
    ativos = []
    total = None
    in_saida = False
    profile = None

    HEADER_MARKERS = ('SaldoAnterior', 'SaldoBruto', 'SaldoLíquido', 'Saldo', 'Part.%', 'Instituição', 'Provisão', 'IR+IOF')

    for page in pdf.pages:
        text_flat = (page.extract_text() or '').replace(' ', '')
        if 'SaldoAnterior' not in text_flat:
            continue

        header_lines = get_lines(page, top_min=60, top_max=145)
        header_lines = [
            ln for ln in header_lines
            if any(marker in w['text'] for w in ln['words'] for marker in HEADER_MARKERS)
        ]

        page_profile = build_profile(header_lines)
        if page_profile is not None:
            profile = page_profile
        if profile is None:
            # pagina de continuacao sem cabecalho reconhecivel e ainda sem
            # nenhum perfil calibrado anteriormente - nao da pra mapear colunas
            continue

        header_bottom = max((w['top'] for ln in header_lines for w in ln['words']), default=None)
        body_top_min = (header_bottom + 3) if header_bottom is not None else 80

        body_lines = get_lines(page, top_min=body_top_min)
        row_groups = merge_rows(body_lines, profile['nome_max_x'])

        table_done = False
        for group in row_groups:
            all_words = [w for ln in group for w in ln['words']]
            if not all_words:
                continue
            nome_words = [w for ln in group for w in ln['words'] if w['x0'] < profile['nome_max_x']]
            nome = ' '.join(w['text'] for w in nome_words).strip()
            if not nome:
                continue

            numeric_words = [
                w for w in all_words
                if re.match(r'^-?[\d.,]+$', w['text'].strip()) and w['x0'] >= profile['nome_max_x']
            ]
            if not numeric_words and nome.upper() != 'TOTAL':
                # linha isolada sem nenhum valor numerico (rodape, numero de pagina, ruido)
                continue

            nome_flat = nome.upper().replace(' ', '')
            if 'ATIVOSSAIDOS' in nome_flat.replace('Í', 'I').replace('Ã', 'A') or 'ATIVOSSAÍDOS' in nome.upper().replace(' ', ''):
                in_saida = True
                continue

            instituicao = None
            if profile['instituicao_range']:
                lo, hi = profile['instituicao_range']
                inst_words = [w for w in all_words if lo <= w['x0'] <= hi]
                if inst_words:
                    instituicao = ' '.join(w['text'] for w in inst_words).strip() or None

            values = {}
            for w in all_words:
                txt = w['text'].strip()
                if not re.match(r'^-?[\d.,]+$', txt):
                    continue
                if w['x0'] < profile['nome_max_x']:
                    continue
                if profile['instituicao_range'] and profile['instituicao_range'][0] <= w['x0'] <= profile['instituicao_range'][1]:
                    continue
                col = nearest_anchor(w['x1'], profile['anchors'])
                if col:
                    values[col] = parse_num_br(txt)

            row = {
                'nome': nome,
                'instituicao': instituicao,
                'saldoBase': values.get('saldoBase'),
                'aplicacoes': values.get('aplicacoes'),
                'resgates': values.get('resgates'),
                'eventos': values.get('eventos'),
                'imposto': values.get('imposto'),
                'saldoBruto': values.get('saldoBruto'),
                'provIR': values.get('provIR'),
                'saldoLiquido': values.get('saldoLiquido'),
                'part': values.get('part'),
            }

            if nome.upper() == 'TOTAL':
                total = row
                table_done = True
                break

            if nome_flat in classe_names_norm:
                row['type'] = 'classe'
            elif in_saida:
                row['type'] = 'saida'
            else:
                row['type'] = 'ativo'
            ativos.append(row)

        if table_done:
            break

    return ativos, total, (profile['perfil'] if profile else None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('arquivo')
    ap.add_argument('--mes', required=True, help='YYYY-MM (mes de referencia do PDF)')
    args = ap.parse_args()

    ano, mes_idx = args.mes.split('-')
    ano, mes_idx = int(ano), int(mes_idx)

    with pdfplumber.open(args.arquivo) as pdf:
        nome = extract_cover_name(pdf)
        classes, aa_total = extract_asset_allocation(pdf)
        classe_names = [c['classe'] for c in classes]
        rent_mes = extract_rentabilidade_mes(pdf, ano, mes_idx)
        ativos, total, profile_key = extract_ativos_table(pdf, classe_names)

    out = {
        'arquivo': args.arquivo,
        'mes': args.mes,
        'nome': nome,
        'perfil': profile_key,
        'assetAllocation': classes,
        'assetAllocationTotal': aa_total,
        'rentabilidadeMes': rent_mes,
        'total': total,
        'ativos': ativos,
    }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    main()
