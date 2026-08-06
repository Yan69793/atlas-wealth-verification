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

# Fee e gestor reais (LGPD, arquivos na raiz de dados, nao versionados).
# Resolucao por codigo canonico: match direto, senao por heranca de sufixo
# (mesmo catalogo de sufixos de scripts/patch-names-v2.mjs, na raiz), senao
# fallback pro MFEE global (aplicado no runtime, platform-data.js, nao aqui).
fees_map = {}
fees_path = os.path.join(ROOT, 'fees-from-planilha.json')
if os.path.exists(fees_path):
    with open(fees_path, 'r', encoding='utf-8') as f:
        fees_map = json.load(f)
    print(f'Fees da planilha: {len(fees_map)} codigos')

managers_planilha = {'gerentes': {}, 'code_to_gerente': {}}
managers_path = os.path.join(ROOT, 'managers-from-planilha.json')
if os.path.exists(managers_path):
    with open(managers_path, 'r', encoding='utf-8') as f:
        managers_planilha = json.load(f)
    print(f'Gestores da planilha: {len(managers_planilha["gerentes"])} gestores, '
          f'{len(managers_planilha["code_to_gerente"])} codigos atribuidos')

# Sufixos de variante (mesmo mandato/cliente, book de custodiante diferente por
# moeda/consolidacao). Busca por substring, nao endswith: "RIM_Consolidado
# (BR+CH)" tem o sufixo no meio da string, nao no final -- endswith sozinho
# (o que patch-names-v2.mjs usa) erra esse caso.
SUFFIXES = ['_Consolidado', '_CH', '_OFF', '_ND', '_CA', '_CAYMAN', '_ERF', '_KBV', '_CLCS']

def strip_suffix(code):
    matches = [i for i in (code.find(s) for s in SUFFIXES) if i > 0]
    if not matches:
        return None
    return code[:min(matches)]

def resolve_fee(code):
    if code in fees_map:
        return fees_map[code], 'direto'
    base = strip_suffix(code)
    if base and base in fees_map:
        return fees_map[base], 'herdado'
    return None, 'fallback'

def resolve_gerente(code):
    c2g = managers_planilha.get('code_to_gerente', {})
    if code in c2g:
        return c2g[code], 'direto'
    base = strip_suffix(code)
    if base and base in c2g:
        return c2g[base], 'herdado'
    return None, 'sem_gestor'

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

# Extratos consolidados de custodiante (sufixo _Consolidado) somam carteiras ja
# contadas em separado -- nao sao uma relacao de cliente independente, sao uma
# visao de conferencia sobre contas que ja existem. Confirmado carteira a
# carteira em 18/07/2026: RIM_Consolidado (BR+CH) = RIM + RIM_CH + Stella23,
# EFSS_Consolidado = EFSS + EFSS_ND, MMR_ACRB_Consolidado = MMR 1+2+3,
# DDA_Consolidado = DDA + MPL (achado por ultimo: dentro do proprio ativos[] do
# DDA_Consolidado o fundo MANDRILINVESTIMENTOBBFIMCP aparece duas vezes, uma
# batendo ao centavo com MPL inteira, outra com DDA inteira menos a liquidez).
# Todos batendo ao centavo, todo mes, desde o inicio do historico (2024).
# Confirma tambem: nenhum codigo _Consolidado tem fee proprio em
# fees-from-planilha.json -- a area de negocio nunca tratou "Consolidado" como
# conta faturavel. Ficam de fora do overlay (nao contam pra AUM/receita do
# dashboard nem do rollup por gestor). A conciliacao do PDF em si continua
# existindo em audits/<mes>/audit.json, isto so afeta o agregado do dashboard.
#
# EXCECAO -- mantido, NAO excluido, apesar do sufixo bater: CABM_TMBM_Consolidado.
# So 49% do valor explicado pelo par CABM_TMBM, estavel ha 2 anos. Investigado
# a fundo em 18/07/2026: cruzei cada ativo (e toda combinacao de 2-3 ativos) do
# documento contra o PL de TODAS as outras carteiras do mes -- nenhum match real,
# so coincidencia espuria esperada numa busca combinatoria desse tamanho. Ao
# contrario de RIM/EFSS/MMR_ACRB/DDA, aqui nao ha carteira irma rastreada em
# lugar nenhum do sistema que explique o residuo (~R$ 20 mi). Decisao do
# operador: manter contando ate ter o PDF de origem ou confirmacao de quem
# administra a conta -- nao excluir por semelhanca de nome sem prova.
MANTER_APESAR_DO_SUFIXO = {'CABM_TMBM_Consolidado'}
codigos_consolidado = sorted(
    c for c in all_codes if '_Consolidado' in c and c not in MANTER_APESAR_DO_SUFIXO
)
if codigos_consolidado:
    print(f'Excluidos do overlay (visao consolidada, ja contada via carteiras '
          f'individuais): {len(codigos_consolidado)}')
    for c in codigos_consolidado:
        print(f'  {c}')
    all_codes = [c for c in all_codes if c not in set(codigos_consolidado)]
mantidos = sorted(c for c in all_codes if c in MANTER_APESAR_DO_SUFIXO)
if mantidos:
    print(f'Mantidos apesar do sufixo _Consolidado (overlap nao confirmado, '
          f'ver comentario no codigo): {", ".join(mantidos)}')

# Resolve fee e gestor por codigo canonico, antes de qualquer outro processamento.
fee_by_code = {}
fee_origin = {}
gerente_by_code = {}
gerente_origin = {}
for code in all_codes:
    fv, forig = resolve_fee(code)
    if fv is not None:
        fee_by_code[code] = fv
    fee_origin[code] = forig
    gv, gorig = resolve_gerente(code)
    if gv is not None:
        gerente_by_code[code] = gv
    gerente_origin[code] = gorig

fee_diretos = [c for c in all_codes if fee_origin[c] == 'direto']
fee_herdados = [c for c in all_codes if fee_origin[c] == 'herdado']
fee_fallback = [c for c in all_codes if fee_origin[c] == 'fallback']
sem_gestor = [c for c in all_codes if gerente_origin[c] == 'sem_gestor']

print(f'Fee: {len(fee_diretos)} diretos, {len(fee_herdados)} herdados por sufixo, '
      f'{len(fee_fallback)} em fallback (MFEE global)')
print(f'Gestor: {len(all_codes) - len(sem_gestor)} atribuidos, {len(sem_gestor)} '
      f'sem gestor (nao aparecem na aba Por Gestor)')
if sem_gestor:
    print('  Sem gestor:', ', '.join(sorted(sem_gestor)))

# Status por carteira/mes vem de d['results'][].status (nao de d['carteiras']),
# no vocabulario do audit-engine ('LIBERAR', 'LIBERAR COM ALERTA', 'CORRIGIR').
# O SPA usa 'LIBERAR' / 'COM ALERTA' / 'CORRIGIR' -- mapeado abaixo.
STATUS_MAP = {
    'LIBERAR': 'LIBERAR',
    'LIBERAR COM ALERTA': 'COM ALERTA',
    'CORRIGIR': 'CORRIGIR',
}
results_status_by_nome = {}
for m in months_order:
    if m not in all_data:
        continue
    results_status_by_nome[m] = {r['nome']: r.get('status') for r in all_data[m].get('results', [])}

# PL and rentRef per month (canonical name)
pl_by_code = {}
rent_by_code = {}
inception_by_code = {}
status_by_code = {}
for code in all_codes:
    pl_by_code[code] = {}
    rent_by_code[code] = {}
    status_by_code[code] = {}
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
                    raw_status = results_status_by_nome.get(m, {}).get(c['nome'])
                    mapped = STATUS_MAP.get(raw_status)
                    if mapped:
                        status_by_code[code][m] = mapped
                if m < inception_by_code[code]:
                    inception_by_code[code] = m
                break

if fee_fallback:
    print('  Fallback (codigo: PL mais recente):')
    for c in sorted(fee_fallback):
        latest = max(pl_by_code[c].values()) if pl_by_code[c] else 0
        print(f'    {c}: R$ {latest:,.2f}')

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
lines.append('  statusScript: {')
status_entries = []
for code in all_codes:
    for m, st in status_by_code[code].items():
        status_entries.append(f"    '{js_str(code)}|{m}': '{js_str(st)}'")
lines.append(',\n'.join(status_entries))
lines.append('  },')
lines.append('')

lines.append('  managers: [')
by_gerente = {}
for code in all_codes:
    g = gerente_by_code.get(code)
    if g:
        by_gerente.setdefault(g, []).append(code)
gerente_ids = sorted(by_gerente.keys())
manager_lines = []
for gid in gerente_ids:
    ginfo = managers_planilha.get('gerentes', {}).get(gid, {})
    gname = ginfo.get('name', gid)
    groa = ginfo.get('roaTarget', 0.005)
    codes_js = ', '.join(f"'{js_str(c)}'" for c in sorted(by_gerente[gid]))
    manager_lines.append(f"    {{ id:'{js_str(gid)}', name:'{js_str(gname)}', codes:[{codes_js}], roaTarget:{groa} }}")
lines.append(',\n'.join(manager_lines))
lines.append('  ],')
lines.append('')

# Portfolios with plByMonth and rentByMonth
lines.append('  portfolios: [')
for i, code in enumerate(all_codes):
    pl_month = pl_by_code[code]
    rent_month = rent_by_code[code]
    inception = inception_by_code.get(code, '2024-01')
    latest_pl = max((v for v in pl_month.values()), default=0)
    comma = ',' if i < len(all_codes) - 1 else ''
    fee_field = f", fee:{fee_by_code[code]}" if code in fee_by_code else ""
    lines.append(
        f"    {{ code:'{js_str(code)}', name:'{js_str(code)}', "
        f"risk:'moderado', inception:'{inception}', pl:{latest_pl}, "
        f"plByMonth:{json.dumps(pl_month)}, "
        f"rentByMonth:{json.dumps(rent_month)}{fee_field} }}{comma}"
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

status_counts = {'LIBERAR': 0, 'COM ALERTA': 0, 'CORRIGIR': 0}
for code in all_codes:
    for m, st in status_by_code[code].items():
        if st in status_counts:
            status_counts[st] += 1

print(f'Generated {out_path}')
print(f'  Portfolios: {len(all_codes)}')
print(f'  Compositions: {len(comps)}')
print(f'  Months: {len(months_order)}')
print(f'  CDI rates: {len(cdi_rates)}')
print(f'  rentRef: {total_rent_present} presentes, {total_rent_null} null (offshore)')
print(f'  statusScript entries: {sum(len(v) for v in status_by_code.values())} '
      f'(LIBERAR {status_counts["LIBERAR"]}, COM ALERTA {status_counts["COM ALERTA"]}, CORRIGIR {status_counts["CORRIGIR"]})')
print(f'  Fee: {len(fee_diretos)} diretos, {len(fee_herdados)} herdados, {len(fee_fallback)} fallback')
print(f'  Managers: {len(gerente_ids)} gestores, {len(all_codes) - len(sem_gestor)} carteiras atribuidas, {len(sem_gestor)} sem gestor')
print(f'  Size: {len(output):,} chars')
print(f'  Mojibake: {mojibake_hits}')
