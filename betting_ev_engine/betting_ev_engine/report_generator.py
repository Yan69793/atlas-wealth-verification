"""Generate Markdown and Excel reports."""

from __future__ import annotations

from pathlib import Path

from .ev_model import ValueOpportunity


REPORT_COLUMNS = [
    "mercado",
    "odd",
    "probabilidade_implicita",
    "probabilidade_sem_margem",
    "probabilidade_estimada",
    "fonte_probabilidade",
    "ev",
    "stake_sugerido",
    "retorno_potencial",
    "risco",
    "recomendacao",
]


def build_report_rows(opportunities: list[ValueOpportunity]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for item in opportunities:
        odd = item.market_probability.odd
        rows.append(
            {
                "mercado": f"{odd.match} | {odd.market} | {odd.selection}",
                "odd": odd.odds_decimal,
                "probabilidade_implicita": item.market_probability.implied_probability,
                "probabilidade_sem_margem": item.market_probability.no_margin_probability,
                "probabilidade_estimada": item.estimated_probability,
                "fonte_probabilidade": item.probability_source,
                "ev": item.ev,
                "stake_sugerido": item.stake,
                "retorno_potencial": item.potential_return,
                "risco": item.risk_label,
                "recomendacao": item.recommendation,
            }
        )
    return rows


def generate_markdown_report(opportunities: list[ValueOpportunity], path: str | Path) -> Path:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    rows = build_report_rows(opportunities)

    lines = [
        "# Relatorio de EV",
        "",
        "## Fatos",
        "",
        "- Todas as odds listadas foram carregadas do CSV informado.",
        "",
        "## Hipoteses",
        "",
        "- Toda probabilidade estimada foi marcada como `input manual`.",
        "",
        "## Recomendacoes",
        "",
    ]

    if not rows:
        lines.append("Nenhuma oportunidade com probabilidade manual informada.")
    else:
        lines.extend(
            [
                "| Mercado | Odd | Prob. implicita | Prob. estimada | EV | Stake | Retorno potencial | Risco | Recomendacao |",
                "|---|---:|---:|---:|---:|---:|---:|---|---|",
            ]
        )
        for row in rows:
            lines.append(
                "| {mercado} | {odd:.2f} | {impl:.2%} | {est:.2%} | {ev:.2f} | {stake:.2f} | {retorno:.2f} | {risco} | {rec} |".format(
                    mercado=row["mercado"],
                    odd=row["odd"],
                    impl=row["probabilidade_implicita"],
                    est=row["probabilidade_estimada"],
                    ev=row["ev"],
                    stake=row["stake_sugerido"],
                    retorno=row["retorno_potencial"],
                    risco=row["risco"],
                    rec=row["recomendacao"],
                )
            )

    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return output_path


def generate_excel_report(opportunities: list[ValueOpportunity], path: str | Path) -> Path:
    try:
        from openpyxl import Workbook
    except ImportError as exc:
        raise RuntimeError("Instale openpyxl para gerar Excel: pip install openpyxl") from exc

    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "EV Report"
    sheet.append(REPORT_COLUMNS)

    for row in build_report_rows(opportunities):
        sheet.append([row[column] for column in REPORT_COLUMNS])

    for cell in sheet[1]:
        cell.style = "Headline 4"

    workbook.save(output_path)
    return output_path
