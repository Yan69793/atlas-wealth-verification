#!/usr/bin/env python
"""Ingestao em lote de uma pasta "Editados" com Book_<carteira>_<AAAA>_<MM>.pdf.

Uso: python extract-pdfs.py --pasta "<pasta Editados>" --mes 2026-05 --baseline 2026-04

Reaproveita a extracao por coordenada de pdf_extract.py (mesma pasta) e faz o
mapeamento completo para o formato CarteiraRaw usado pelo audit-engine:
nome canonico = nome interno da capa do PDF (nao o nome do arquivo); arquivos
que nao sao carteira (extrato de conta corrente avulso, copia pessoal de
trabalho) sao excluidos; duplicatas do mesmo mes que resolvem para o mesmo
nome sao desempatadas preferindo a versao "novo"/"NOVO" (reenvio corrigido).

Saida: JSON no stdout no formato {"meta": {...}, "carteiras": [CarteiraRaw...]}.
"""
import sys
import os
import re
import json
import argparse

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pdf_extract as pe

try:
    import pdfplumber
except ImportError:
    print(json.dumps({"erro": "pdfplumber nao encontrado. Rode com 'python' (3.11), nao 'python3'/'py'."}), file=sys.stderr)
    sys.exit(2)

EXCLUDE_PATTERNS = [
    re.compile(r'^Consolida[cç][aã]o CC', re.I),
    re.compile(r'YANSZUCHMACHER', re.I),
    re.compile(r'\bOLD\b', re.I),  # copias antigas marcadas (ex: "Book_SAA_2026_05 OLD.pdf")
]

MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
         'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']


def is_excluded(filename):
    return any(p.search(filename) for p in EXCLUDE_PATTERNS)


def collect_book_files(pasta):
    """Book_*.pdf da pasta curada (Editados) E do mes-pai (books soltos na raiz do
    mes, fora de Editados - ex: AVP_LBP, EVP em junho/2026). SO LEITURA, nunca
    escreve na fonte (regra do projeto: arvore de Extratos e read-only). Um nivel
    acima apenas, nao recursivo. Retorna [(full_path, filename, origem)]."""
    pasta_abs = os.path.abspath(pasta)
    pai = os.path.dirname(pasta_abs)
    resultado = []
    vistos = set()
    for d, origem in [(pasta_abs, 'editados'), (pai, 'raiz')]:
        if d in vistos or not os.path.isdir(d):
            continue
        vistos.add(d)
        for f in sorted(os.listdir(d)):
            full = os.path.join(d, f)
            if os.path.isfile(full) and re.match(r'^Book_.*\.pdf$', f, re.I) and not is_excluded(f):
                resultado.append((full, f, origem))
    return resultado


def pick_preferred_duplicate(candidatos):
    """candidatos: lista de dicts de extracao com 'arquivo' e 'origem'. Preferencia:
    1) books em 'editados' (curado) sobre 'raiz' (solto no mes);
    2) reenvio corrigido 'novo'/'NOVO';
    3) ordem alfabetica do nome de arquivo (estavel)."""
    if len(candidatos) == 1:
        return candidatos[0]
    editados = [c for c in candidatos if c.get('origem') == 'editados']
    pool = editados if editados else candidatos
    com_novo = [c for c in pool if re.search(r'\bnovo\b', c['arquivo'], re.I)]
    if com_novo:
        return sorted(com_novo, key=lambda c: len(c['arquivo']), reverse=True)[0]
    return sorted(pool, key=lambda c: c['arquivo'])[0]


def ym_to_label(ym):
    y, m = ym.split('-')
    return f'{MESES[int(m)]} {y}'


def to_pct(value):
    """Part.% na tabela de Ativos vem em pontos percentuais (ex: 30.67 = 30,67%);
    normaliza para fracao 0-1, igual ao parsePct() do parser Excel (utils.ts)."""
    return (value / 100) if value is not None else None


def to_ativo_row(raw, current_classe):
    plBase = raw.get('saldoBase') or 0
    plRef = raw.get('saldoBruto') or 0
    diff = plRef - plBase
    varPct = diff / plBase if plBase else 0

    if raw['type'] == 'classe':
        return {
            'type': 'classe',
            'classe': raw['nome'],
            'plBase': plBase,
            'plRef': plRef,
            'diff': diff,
            'varPct': varPct,
            'part': to_pct(raw.get('part')),
        }

    return {
        'type': raw['type'],
        'classe': current_classe,
        'nome': raw['nome'],
        'instituicao': raw.get('instituicao'),
        'plBase': plBase,
        'plRef': plRef,
        'diff': diff,
        'varPct': varPct,
        'compras': raw.get('aplicacoes'),
        'vendas': raw.get('resgates'),
        'eventos': raw.get('eventos'),
        'impostos': raw.get('imposto'),
        'provIR': raw.get('provIR'),
        'part': to_pct(raw.get('part')),
    }


def map_extraction(extraction, periodo):
    if not extraction.get('nome') or not extraction.get('total'):
        return None

    ativos = []
    current_classe = None
    for raw in extraction['ativos']:
        if raw['type'] == 'classe':
            current_classe = raw['nome']
        ativos.append(to_ativo_row(raw, current_classe))

    t = extraction['total']
    plBase = t.get('saldoBase') or 0
    plRef = t.get('saldoBruto') or 0
    total = {
        'plBase': plBase,
        'plRef': plRef,
        'diff': plRef - plBase,
        'varPct': (plRef - plBase) / plBase if plBase else 0,
        'compras': t.get('aplicacoes'),
        'vendas': t.get('resgates'),
        'eventos': t.get('eventos'),
        'impostos': t.get('imposto'),
        'provIR': t.get('provIR'),
        'part': to_pct(t.get('part')),
    }

    n_base = sum(1 for a in ativos if a['type'] == 'ativo' and a['plBase'] > 0)
    n_ref = sum(1 for a in ativos if a['type'] == 'ativo' and a['plRef'] > 0)
    rent = extraction.get('rentabilidadeMes')

    return {
        'nome': extraction['nome'].strip(),
        'periodo': periodo,
        'plBase': total['plBase'],
        'plRef': total['plRef'],
        'varRS': total['diff'],
        'varPct': total['varPct'],
        'rentRef': (rent / 100) if rent is not None else None,
        'continuidade': None,
        'somaVsTotal': None,
        'perfImplicita': None,
        'eventos': t.get('eventos') or 0,
        'impostos': t.get('imposto') or 0,
        'ativos': ativos,
        'total': total,
        'nAtivosBase': n_base,
        'nAtivosRef': n_ref,
        'fonte': {'tipo': 'pdf', 'template': 'custodian-pdf-v1', 'arquivo': extraction['arquivo']},
    }


def extract_one(full_path, mes):
    with pdfplumber.open(full_path) as pdf:
        nome = pe.extract_cover_name(pdf)
        classes, _aa_total = pe.extract_asset_allocation(pdf)
        classe_names = [c['classe'] for c in classes]
        ano, mes_idx = mes.split('-')
        rent = pe.extract_rentabilidade_mes(pdf, int(ano), int(mes_idx))
        ativos, total, _perfil = pe.extract_ativos_table(pdf, classe_names)
    return {'nome': nome, 'ativos': ativos, 'total': total, 'rentabilidadeMes': rent}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pasta', required=True)
    ap.add_argument('--mes', required=True)
    ap.add_argument('--baseline', required=True)
    args = ap.parse_args()

    periodo = {
        'baseline': args.baseline,
        'referencia': args.mes,
        'baselineLabel': ym_to_label(args.baseline),
        'referenciaLabel': ym_to_label(args.mes),
    }

    book_files = collect_book_files(args.pasta)

    extractions = []
    for full, filename, origem in book_files:
        try:
            data = extract_one(full, args.mes)
            data['arquivo'] = filename
            data['origem'] = origem
            extractions.append(data)
        except Exception as e:
            print(f'[extract-pdfs] falha ao extrair {filename}: {e}', file=sys.stderr)

    by_nome = {}
    for ex in extractions:
        nome = (ex.get('nome') or '').strip()
        if not nome:
            continue
        by_nome.setdefault(nome, []).append(ex)

    carteiras = []
    for nome, exs in by_nome.items():
        chosen = pick_preferred_duplicate(exs)
        if len(exs) > 1:
            descartados = [e['arquivo'] for e in exs if e is not chosen]
            print(
                f'[extract-pdfs] "{nome}": {len(exs)} arquivos, usando "{chosen["arquivo"]}" ({chosen.get("origem", "?")}) '
                f'(descartados: {", ".join(descartados)})',
                file=sys.stderr,
            )
        carteira = map_extraction(chosen, periodo)
        if carteira:
            carteiras.append(carteira)
        else:
            print(f'[extract-pdfs] extracao incompleta, pulando: {chosen["arquivo"]}', file=sys.stderr)

    # "X" e "X (BR+CH)" nao sao duplicata por nome de arquivo - sao nomes
    # internos DIFERENTES no PDF (escopos diferentes: BR sozinho vs BR+CH
    # combinado). Quando ambos aparecem, mantem so a versao combinada -
    # decisao confirmada para o caso RIM_Consolidado / RIM_Consolidado (BR+CH).
    nomes_presentes = {c['nome'] for c in carteiras}
    combinados = {n for n in nomes_presentes if re.search(r'\(BR\+CH\)\s*$', n)}
    for combinado in combinados:
        base = re.sub(r'\s*\(BR\+CH\)\s*$', '', combinado).strip()
        if base in nomes_presentes:
            print(f'[extract-pdfs] "{base}" e "{combinado}" coexistem - mantendo so "{combinado}" (escopo combinado)', file=sys.stderr)
            carteiras = [c for c in carteiras if c['nome'] != base]

    carteiras.sort(key=lambda c: c['nome'])

    out = {
        'meta': {'mes': args.mes, 'baseline': args.baseline, 'processadoEm': ''},
        'carteiras': carteiras,
    }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    main()
