"""Build platform-data-real.js from audit.json files with correct UTF-8 encoding."""
import json
import re
import os

def fix_mojibake(s):
    """Fix double-encoded UTF-8 (UTF-8 bytes interpreted as Latin-1 then re-encoded as UTF-8)."""
    try:
        return s.encode('latin-1').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
        return s

def js_str(s):
    """Escape string for JS single-quoted string literal."""
    return s.replace('\\', '\\\\').replace("'", "\\'")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
months_order = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06']

# Load all audit data
all_data = {}
for m in months_order:
    path = os.path.join(ROOT, 'audits', m, 'audit.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            all_data[m] = json.load(f)

# Master portfolio list (union across all months)
all_codes = set()
for m in months_order:
    if m in all_data:
        for c in all_data[m]['carteiras']:
            all_codes.add(c['nome'])
all_codes = sorted(all_codes)

# PL per month
pl_by_code = {}
inception_by_code = {}
for code in all_codes:
    pl_by_code[code] = {}
    inception_by_code[code] = '2026-06'
    for m in months_order:
        if m not in all_data:
            continue
        for c in all_data[m]['carteiras']:
            if c['nome'] == code:
                pl_by_code[code][m] = round(c['plBase'], 2)
                if m < inception_by_code[code]:
                    inception_by_code[code] = m
                break

# Compositions - latest available per portfolio
comps = {}
for code in all_codes:
    best_comp = None
    best_month = None
    for m in reversed(months_order):
        if m not in all_data:
            continue
        for c in all_data[m]['carteiras']:
            if c['nome'] == code:
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

# Generate JS output
lines = []
lines.append('/* =============================================================')
lines.append('   DADOS REAIS — LGPD — ARQUIVO LOCAL, NAO VERSIONAR')
lines.append('   Reconstruido a partir dos audit.json (Fev-Jun/2026).')
lines.append('   Este arquivo e ignorado pelo git (.gitignore).')
lines.append('   Sem ele, a plataforma exibe apenas as 40 carteiras demo.')
lines.append('============================================================= */')
lines.append('')
lines.append('window._AtlasRealData = {')
lines.append('')
lines.append('  mfee: 0.0004,')
lines.append('  cdiRates: {')
lines.append("    '2026-02': 0.0094, '2026-03': 0.0097, '2026-04': 0.0091,")
lines.append("    '2026-05': 0.0093, '2026-06': 0.0089")
lines.append('  },')
lines.append('')
lines.append('  statusScript: {},')
lines.append('')

# Portfolios
lines.append('  portfolios: [')
for i, code in enumerate(all_codes):
    pl_month = pl_by_code[code]
    inception = inception_by_code.get(code, '2026-02')
    latest_pl = max((v for v in pl_month.values()), default=0)
    comma = ',' if i < len(all_codes) - 1 else ''
    lines.append(
        f"    {{ code:'{js_str(code)}', name:'{js_str(code)}', "
        f"risk:'moderado', inception:'{inception}', pl:{latest_pl}, "
        f"plByMonth:{json.dumps(pl_month)} }}{comma}"
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

out_path = os.path.join(ROOT, 'platform-data-real.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(output)

# Verify no mojibake in output
mojibake_hits = len(list(re.finditer(b'\xc3\x83\xc2', output.encode('utf-8'))))
print(f'Generated {out_path}')
print(f'  Portfolios: {len(all_codes)}')
print(f'  Compositions: {len(comps)}')
print(f'  Size: {len(output):,} chars')
print(f'  Mojibake sequences: {mojibake_hits}')
