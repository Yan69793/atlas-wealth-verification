"""Build platform-data-real.js from audit.json files (30 meses) with rentRef real."""
import json
import re
import os

def fix_mojibake(s):
    try:
        return s.encode('latin-1').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
        return s

def js_str(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")

# Raiz dos dados (onde vive audits/). Mesma convencao do pipeline-all.mjs:
# quando core/ e consumido como instancia separada da raiz de dados, o dado
# real fica um nivel acima. Precedencia: ATLAS_DATA_ROOT > diretorio-pai.
CORE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.environ.get('ATLAS_DATA_ROOT', CORE_DIR)

# 30 meses: 2024-01 a 2026-06
months_order = []
for y in range(2024, 2027):
    end = 6 if y == 2026 else 12
    for m in range(1, end + 1):
        months_order.append(f'{y}-{m:02d}')

# Carrega name map
name_map = {}
map_path = os.path.join(CORE_DIR, 'audit-engine', 'name-map.json')
if os.path.exists(map_path):
    with open(map_path, 'r', encoding='utf-8') as f:
        name_map = json.load(f).get('mappings', {})
    print(f'Name map: {len(name_map)} entradas')

def canonical_name(nome):
    return name_map.get(nome, nome)

# Carrega todos os audit.json
all_data = {}
for m in months_order:
    path = os.path.join(ROOT, 'audits', m, 'audit.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            all_data[m] = json.load(f)

# Master portfolio list (union, canonical names)
all_codes = set()
for m in months_order:
    if m in all_data:
        for c in all_data[m]['carteiras']:
            all_codes.add(canonical_name(c['nome']))
all_codes = sorted(all_codes)

# PL and rentRef per month (canonical name)
pl_by_code = {}
rent_by_code = {}
inception_by_code = {}
for code in all_codes:
    pl_by_code[code] = {}
    rent_by_code[code] = {}
    inception_by_code[code] = '2026-06'
    for m in months_order:
        if m not in all_data:
            continue
        for c in all_data[m]['carteiras']:
            cn = canonical_name(c['nome'])
            if cn == code:
                # Se ja existe entrada (merge de nomes), soma PL? Nao — pega a de maior PL
                existing = pl_by_code[code].get(m, 0)
                if c['plBase'] > existing:
                    pl_by_code[code][m] = round(c['plBase'], 2)
                    # rentRef: None para offshore (mantido), valor real para os demais
                    rr = c.get('rentRef')
                    rent_by_code[code][m] = rr  # None ou float
                if m < inception_by_code[code]:
                    inception_by_code[code] = m
                break

# Compositions — latest available per portfolio
comps = {}
for code in all_codes:
    best_comp = None
    best_month = None
    for m in reversed(months_order):
        if m not in all_data:
            continue
        for c in all_data[m]['carteiras']:
            if canonical_name(c['nome']) == code:
                ativos = [a for a in c.get('ativos', []) if a.get('type') == 'ativo']
                if ativos:
                    best_comp = ativos
                    best_month = m
                break
        if best_comp:
            break
    if best_comp:
        key = f'{code}|{best_month}'
        comps[key] = []
        for a in best_comp:
            nome = fix_mojibake(a.get('nome', ''))
            classe = fix_mojibake(a.get('classe', ''))
            inst = fix_mojibake(a.get('instituicao', ''))
            vencto = a.get('vencto')
            if vencto:
                vencto = fix_mojibake(vencto)
            comps[key].append({
                'name': nome,
                'cls': classe,
                'inst': inst,
                'vencto': vencto,
                'saldoFinal': round(a.get('plRef', a.get('plBase', 0)), 2)
            })

# CDI from BC API (30 meses, anualizado → mensal)
CDI_ANNUAL = {
    '2024-01': 11.65, '2024-02': 11.15, '2024-03': 10.65, '2024-04': 10.65,
    '2024-05': 10.40, '2024-06': 10.40, '2024-07': 10.40, '2024-08': 10.40,
    '2024-09': 10.65, '2024-10': 10.65, '2024-11': 11.15, '2024-12': 12.15,
    '2025-01': 13.15, '2025-02': 13.15, '2025-03': 14.15, '2025-04': 14.15,
    '2025-05': 14.65, '2025-06': 14.90, '2025-07': 14.90, '2025-08': 14.90,
    '2025-09': 14.90, '2025-10': 14.90, '2025-11': 14.90, '2025-12': 14.90,
    '2026-01': 14.90, '2026-02': 14.90, '2026-03': 14.65, '2026-04': 14.40,
    '2026-05': 14.40, '2026-06': 14.15,
}
cdi_rates = {}
for m, annual in CDI_ANNUAL.items():
    cdi_rates[m] = round((1 + annual / 100) ** (1 / 12) - 1, 4)

# Build JS output
lines = []
lines.append('/* =============================================================')
lines.append('   DADOS REAIS — LGPD — ARQUIVO LOCAL, NAO VERSIONAR')
lines.append('   Reconstruido a partir dos audit.json (2024-01 a 2026-06).')
lines.append('   Inclui rentRef real por carteira/mes e name-map aplicado.')
lines.append('   Este arquivo e ignorado pelo git (.gitignore).')
lines.append('============================================================= */')
lines.append('')
lines.append('window._AtlasRealData = {')
lines.append('')
lines.append('  mfee: 0.0004,')
lines.append('  cdiRates: {')
cdi_lines = []
for m in months_order:
    if m in cdi_rates:
        cdi_lines.append(f"    '{m}': {cdi_rates[m]}")
lines.append(',\n'.join(cdi_lines))
lines.append('  },')
lines.append('')
lines.append('  statusScript: {},')
lines.append('')

# Portfolios with plByMonth and rentByMonth
lines.append('  portfolios: [')
for i, code in enumerate(all_codes):
    pl_month = pl_by_code[code]
    rent_month = rent_by_code[code]
    inception = inception_by_code.get(code, '2024-01')
    latest_pl = max((v for v in pl_month.values()), default=0)
    comma = ',' if i < len(all_codes) - 1 else ''
    lines.append(
        f"    {{ code:'{js_str(code)}', name:'{js_str(code)}', "
        f"risk:'moderado', inception:'{inception}', pl:{latest_pl}, "
        f"plByMonth:{json.dumps(pl_month)}, "
        f"rentByMonth:{json.dumps(rent_month)} }}{comma}"
    )
lines.append('  ],')
lines.append('')

# Compositions
lines.append('  compositions: {')
comp_keys = sorted(comps.keys())
for i, ck in enumerate(comp_keys):
    parts = ck.split('|')
    ccode = js_str(parts[0])
    cmes = parts[1]
    lines.append(f"    '{ccode}|{cmes}': [")
    items = comps[ck]
    for j, a in enumerate(items):
        vencto_str = 'null' if a['vencto'] is None else f"'{js_str(a['vencto'])}'"
        item_comma = ',' if j < len(items) - 1 else ''
        lines.append(
            f"      {{ name:'{js_str(a['name'])}', cls:'{js_str(a['cls'])}', "
            f"inst:'{js_str(a['inst'])}', vencto:{vencto_str}, "
            f"saldoFinal:{a['saldoFinal']} }}{item_comma}"
        )
    key_comma = ',' if i < len(comp_keys) - 1 else ''
    lines.append(f'    ]{key_comma}')
lines.append('  }')
lines.append('')
lines.append('};')

output = '\n'.join(lines) + '\n'

out_path = os.path.join(CORE_DIR, 'platform-data-real.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(output)

# Verifica
mojibake_hits = len(list(re.finditer(b'\xc3\x83\xc2', output.encode('utf-8'))))

# Estatisticas
total_rent_null = 0
total_rent_present = 0
for code in all_codes:
    for m, v in rent_by_code[code].items():
        if v is None:
            total_rent_null += 1
        else:
            total_rent_present += 1

print(f'Generated {out_path}')
print(f'  Portfolios: {len(all_codes)}')
print(f'  Compositions: {len(comps)}')
print(f'  Months: {len(months_order)}')
print(f'  CDI rates: {len(cdi_rates)}')
print(f'  rentRef: {total_rent_present} presentes, {total_rent_null} null (offshore)')
print(f'  Size: {len(output):,} chars')
print(f'  Mojibake: {mojibake_hits}')
