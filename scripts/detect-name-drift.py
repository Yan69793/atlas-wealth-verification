"""Fase 5: Detectar deriva de identidade de carteira entre 30 meses.
Analisa nomes canonicos extraidos dos audit.json e sinaliza:
1. Carteiras que somem/aparecem mes a mes
2. Candidatos a deriva: nome X some e nome similar Y aparece no mesmo mes
3. Caso conhecido X vs X (BR+CH): escopos diferentes, nao duplicatas
"""
import json, os
from collections import defaultdict

ROOT = r'E:\Diretorio\Claude\ATLAS'
AUDITS = os.path.join(ROOT, 'audits')

def levenshtein(s1, s2):
    """Distancia de edicao normalizada 0-1."""
    if not s1 or not s2:
        return 1.0
    if len(s1) > len(s2):
        s1, s2 = s2, s1
    distances = range(len(s1) + 1)
    for i2, c2 in enumerate(s2):
        new_distances = [i2 + 1]
        for i1, c1 in enumerate(s1):
            if c1 == c2:
                new_distances.append(distances[i1])
            else:
                new_distances.append(1 + min((distances[i1], distances[i1 + 1], new_distances[-1])))
        distances = new_distances
    return distances[-1] / max(len(s1), len(s2))

def main():
    # 1. Extrair nomes por mes
    meses = sorted(d for d in os.listdir(AUDITS) if os.path.isdir(os.path.join(AUDITS, d)) and d.startswith('20'))

    nomes_por_mes = {}
    for mes in meses:
        path = os.path.join(AUDITS, mes, 'audit.json')
        if not os.path.exists(path):
            continue
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        nomes = {c['nome'] for c in data.get('carteiras', [])}
        nomes_por_mes[mes] = nomes
        print(f'{mes}: {len(nomes)} carteiras')

    print(f'\nTotal meses: {len(nomes_por_mes)}')

    # 2. Diff mes a mes
    print('\n=== DIFF MES A MES ===')
    mes_list = sorted(nomes_por_mes.keys())
    for i in range(1, len(mes_list)):
        prev, curr = mes_list[i-1], mes_list[i]
        prev_nomes, curr_nomes = nomes_por_mes[prev], nomes_por_mes[curr]
        entraram = curr_nomes - prev_nomes
        sairam = prev_nomes - curr_nomes
        if entraram or sairam:
            print(f'\n{prev} -> {curr}:')
            if entraram:
                print(f'  Entraram ({len(entraram)}): {", ".join(sorted(entraram))}')
            if sairam:
                print(f'  Sairam ({len(sairam)}): {", ".join(sorted(sairam))}')

    # 3. Candidatos a deriva: nome X some e nome Y similar aparece no MESMO mes
    print('\n=== CANDIDATOS A DERIVA DE NOME ===')
    candidates = []
    for i in range(1, len(mes_list)):
        prev, curr = mes_list[i-1], mes_list[i]
        sairam = nomes_por_mes[prev] - nomes_por_mes[curr]
        entraram = nomes_por_mes[curr] - nomes_por_mes[prev]

        for s in sorted(sairam):
            for e in sorted(entraram):
                # Verifica similaridade
                if s == e:
                    continue
                # Caso um e prefixo do outro
                if s.startswith(e) or e.startswith(s):
                    candidates.append((prev, curr, s, e, 'prefixo'))
                    continue
                # Distancia de edicao baixa
                dist = levenshtein(s, e)
                if dist < 0.25:
                    candidates.append((prev, curr, s, e, f'edit={dist:.2f}'))

    if candidates:
        for prev, curr, s, e, reason in candidates:
            print(f'[{prev}->{curr}] "{s}" → "{e}" ({reason})')
    else:
        print('Nenhum candidato automatico encontrado.')

    # 4. Caso conhecido: X vs X (BR+CH)
    print('\n=== CASO CONHECIDO: X vs X (BR+CH) ===')
    todos_nomes = set()
    for nomes in nomes_por_mes.values():
        todos_nomes |= nomes

    brch = {n for n in todos_nomes if '(BR+CH)' in n}
    for n in sorted(brch):
        base = n.replace(' (BR+CH)', '').replace('(BR+CH)', '').strip()
        if base in todos_nomes:
            print(f'  "{base}" e "{n}" coexistem — escopos diferentes (BR vs BR+CH)')

    # 5. Nomes com underscore vs sem underscore (possivel mudanca de codigo para display name)
    print('\n=== MUDANCA DE FORMATO (codigo vs display name) ===')
    with_underscore = {n for n in todos_nomes if '_' in n and n.upper() == n}
    without_underscore = {n for n in todos_nomes if '_' not in n and not any(c.islower() for c in n) and len(n) <= 6}
    print(f'Com underscore (codigo): {len(with_underscore)} exemplos: {", ".join(sorted(list(with_underscore)[:10]))}')
    print(f'Sem underscore (sigla): {len(without_underscore)} exemplos: {", ".join(sorted(list(without_underscore)[:10]))}')

if __name__ == '__main__':
    main()
