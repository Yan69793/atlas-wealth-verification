#!/usr/bin/env python3
"""
Converte o atual.json de uma instancia para platform-data-real.js (ATLAS SPA).

Uso: python scripts/build-real-data.py <caminho/para/atual.json>

O caminho e obrigatorio de proposito. Antes havia um default apontando para a
pasta de um cliente especifico, o que colocava o nome dele dentro do produto e
fazia o script parecer que so servia aquela instancia. Instancia nova passa o
proprio caminho, ou define ATLAS_INSTANCIA apontando para a raiz dela.
"""
import json, sys, os
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.parent
_INSTANCIA = os.environ.get('ATLAS_INSTANCIA')
DEFAULT_INPUT = (Path(_INSTANCIA) / "carteiras-app" / "public" / "data" / "atual.json") if _INSTANCIA else None
OUTPUT = ROOT / "platform-data-real.js"

MES_PT = {
    'janeiro':'01','fevereiro':'02','marco':'03','março':'03',
    'abril':'04','maio':'05','junho':'06','julho':'07',
    'agosto':'08','setembro':'09','outubro':'10',
    'novembro':'11','dezembro':'12'
}

def nome_para_codigo(nome):
    partes = nome.strip().split()
    if len(partes) >= 2:
        return '_'.join(p[:4].upper() for p in partes[:3])
    return nome.strip().upper().replace(' ', '_')[:20]

def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    if src is None:
        print("ERRO: informe o caminho do atual.json, ou defina ATLAS_INSTANCIA")
        print("Uso: python scripts/build-real-data.py <caminho/para/atual.json>")
        sys.exit(1)
    if not src.exists():
        print(f"ERRO: {src} nao encontrado")
        sys.exit(1)

    with open(src, encoding='utf-8') as f:
        data = json.load(f)

    summary = data.get('summary', {})
    mes_nome = summary.get('mesAtual', 'Abril')
    ano = summary.get('anoAtual', '2026')
    mes_bl_nome = summary.get('mesBaseline', 'Março')
    mes_atual = f"{ano}-{MES_PT.get(mes_nome.lower(), '04')}"
    mes_bl = f"{ano}-{MES_PT.get(mes_bl_nome.lower(), '03')}"

    carteiras = data.get('carteiras', [])
    conciliacao = {c['nome']: c for c in data.get('conciliacao', [])}

    # CDI mensal — atualizar com valores reais de mercado
    cdi_rates = {mes_bl: 0.0115, mes_atual: 0.0113}

    portfolios = []
    status_script = {}
    managers_map = {}

    for c in carteiras:
        nome = c.get('nome', '')
        code = nome_para_codigo(nome)
        status = c.get('status', 'LIBERAR')
        pl_marco = c.get('plMarco', 0)
        pl_abril = c.get('plAbril', 0)
        rent = c.get('rentAbril')
        # Gestor unico por instancia. Vem do proprio dado ou da variavel de
        # ambiente, nunca fixo no produto: nome de casa nao mora aqui.
        gestor = c.get('gestor') or os.environ.get('ATLAS_GESTOR') or 'Gestor'

        if gestor not in managers_map:
            managers_map[gestor] = []
        managers_map[gestor].append(code)

        status_script[f"{code}|{mes_atual}"] = status
        conc = conciliacao.get(nome, {})
        status_script[f"{code}|{mes_bl}"] = conc.get('status', 'LIBERAR')

        portfolios.append({
            'code': code, 'name': nome, 'risk': 'moderado',
            'inception': '2024-01', 'fee': 0.0004,
            'plByMonth': {mes_bl: pl_marco, mes_atual: pl_abril},
            'rentByMonth': {mes_atual: rent},
        })

    managers = [
        {'id': f'MGR_{i}', 'name': nome, 'codes': codes, 'roaTarget': 0.0005}
        for i, (nome, codes) in enumerate(managers_map.items())
    ]

    real_data = {
        'portfolios': portfolios,
        'managers': managers,
        'cdiRates': cdi_rates,
        'statusScript': status_script,
        'mfee': 0.0004,
    }

    js = (
        "// platform-data-real.js — DADOS REAIS (LGPD, NAO VERSIONAR)\n"
        f"// Gerado: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
        f"// Fonte: {src}\n"
        "// Este arquivo esta no .gitignore. NAO COMMITAR.\n\n"
        "window._AtlasRealData = " +
        json.dumps(real_data, ensure_ascii=False, indent=2) +
        ";\n"
    )

    OUTPUT.write_text(js, encoding='utf-8')

    lib = sum(1 for p in portfolios if status_script.get(p['code']+'|'+mes_atual)=='LIBERAR')
    alt = sum(1 for p in portfolios if status_script.get(p['code']+'|'+mes_atual)=='LIBERAR COM ALERTA')
    cor = sum(1 for p in portfolios if status_script.get(p['code']+'|'+mes_atual)=='CORRIGIR')
    print(f"OK: {OUTPUT} ({len(portfolios)} carteiras: {lib} liberar, {alt} alerta, {cor} corrigir)")

if __name__ == '__main__':
    main()
