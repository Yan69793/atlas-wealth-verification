#!/usr/bin/env python3
"""
deploy.py  —  Deploy mensal das carteiras Mirabaud para Cloudflare Pages
=========================================================================
Uso (o Claude roda isso todo mês após gerar o data.json):

    python deploy.py --mes maio --ano 2026 --data caminho/para/data.json

O script:
1. Copia o data.json para dist/data/<mes>_<ano>.json e dist/data/atual.json
2. Roda: npx wrangler pages deploy dist --project-name=carteiras-mirabaud
3. Imprime a URL do deploy

Credenciais (definir como variáveis de ambiente antes de rodar):
    CLOUDFLARE_API_TOKEN   — token com permissão Cloudflare Pages Edit
    CLOUDFLARE_ACCOUNT_ID  — 7ac79fb1030e4e81115ef33c21a9b070

=========================================================================
"""

import argparse, json, os, shutil, subprocess, sys
from pathlib import Path

BASE_DIR = Path(__file__).parent
DIST_DIR = BASE_DIR / "dist"

MESES_PT = {
    "janeiro": "Janeiro", "fevereiro": "Fevereiro", "marco": "Março",
    "março": "Março", "abril": "Abril", "maio": "Maio", "junho": "Junho",
    "julho": "Julho", "agosto": "Agosto", "setembro": "Setembro",
    "outubro": "Outubro", "novembro": "Novembro", "dezembro": "Dezembro",
}
MESES_ORD = ["janeiro","fevereiro","março","abril","maio","junho",
             "julho","agosto","setembro","outubro","novembro","dezembro"]


def enrich_data(data: dict, mes: str, ano: str) -> dict:
    mes_lower = mes.lower()
    idx = MESES_ORD.index(mes_lower) if mes_lower in MESES_ORD else -1
    mes_anterior = MESES_PT.get(MESES_ORD[idx - 1], "Mês anterior") if idx > 0 else "Mês anterior"
    data["summary"]["mesAtual"] = MESES_PT.get(mes_lower, mes.capitalize())
    data["summary"]["anoAtual"] = ano
    data["summary"]["mesBaseline"] = mes_anterior
    return data


def main():
    parser = argparse.ArgumentParser(description="Deploy mensal carteiras Mirabaud")
    parser.add_argument("--mes", required=True, help="ex: maio")
    parser.add_argument("--ano", required=True, help="ex: 2026")
    parser.add_argument("--data", required=True, help="caminho para o data.json gerado pelo Claude")
    args = parser.parse_args()

    data_path = Path(args.data).expanduser().resolve()
    if not data_path.exists():
        print(f"ERRO: arquivo não encontrado: {data_path}")
        sys.exit(1)

    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "7ac79fb1030e4e81115ef33c21a9b070")
    if not token:
        print("ERRO: defina CLOUDFLARE_API_TOKEN antes de rodar.")
        sys.exit(1)

    print(f"\nDeploy mensal · {args.mes.capitalize()} {args.ano}")
    print("=" * 50)

    print("  Carregando data.json...")
    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)
    data = enrich_data(data, args.mes, args.ano)
    totals = data["summary"]["totals"]
    print(f"  {totals['total']} carteiras: {totals['liberar']} liberar / "
          f"{totals['alerta']} alerta / {totals['corrigir']} corrigir")

    # Atualizar dist/data/
    data_dir = DIST_DIR / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    json_str = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    mes_lower = args.mes.lower()

    out_mensal = data_dir / f"{mes_lower}_{args.ano}.json"
    out_atual  = data_dir / "atual.json"
    out_mensal.write_text(json_str, encoding="utf-8")
    shutil.copy2(out_mensal, out_atual)
    print(f"  Dados gravados: {out_mensal.name} + atual.json")

    # Rodar wrangler
    print("  Rodando wrangler pages deploy...")
    env = {**os.environ, "CLOUDFLARE_API_TOKEN": token, "CLOUDFLARE_ACCOUNT_ID": account}
    result = subprocess.run(
        ["npx", "wrangler", "pages", "deploy", str(DIST_DIR),
         "--project-name=carteiras-mirabaud", "--branch=main"],
        cwd=str(BASE_DIR),
        env=env,
        capture_output=True,
        text=True
    )
    print(result.stdout)
    if result.returncode != 0:
        print("STDERR:", result.stderr)
        sys.exit(1)

    print("=" * 50)
    print("DEPLOY CONCLUÍDO")
    print("URL: https://carteiras-mirabaud.pages.dev")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    main()
