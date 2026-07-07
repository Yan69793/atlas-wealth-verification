"""Collect odds from a manual CSV source."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


REQUIRED_COLUMNS = (
    "bookmaker",
    "match",
    "market",
    "selection",
    "odds_decimal",
    "timestamp",
)


@dataclass(frozen=True)
class OddRecord:
    bookmaker: str
    match: str
    market: str
    selection: str
    odds_decimal: float
    timestamp: str

    @property
    def market_key(self) -> tuple[str, str, str]:
        return (self.bookmaker, self.match, self.market)

    @property
    def selection_key(self) -> tuple[str, str, str, str]:
        return (self.bookmaker, self.match, self.market, self.selection)


def load_odds_csv(path: str | Path) -> list[OddRecord]:
    """Load odds from CSV without inventing or enriching values."""
    csv_path = Path(path)
    with csv_path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        _validate_columns(reader.fieldnames)
        return [_row_to_record(row, row_number=index + 2) for index, row in enumerate(reader)]


def group_by_market(records: Iterable[OddRecord]) -> dict[tuple[str, str, str], list[OddRecord]]:
    grouped: dict[tuple[str, str, str], list[OddRecord]] = {}
    for record in records:
        grouped.setdefault(record.market_key, []).append(record)
    return grouped


def _validate_columns(fieldnames: list[str] | None) -> None:
    if fieldnames is None:
        raise ValueError("CSV sem cabecalho.")

    missing = [column for column in REQUIRED_COLUMNS if column not in fieldnames]
    if missing:
        raise ValueError(f"CSV sem colunas obrigatorias: {', '.join(missing)}")


def _row_to_record(row: dict[str, str], row_number: int) -> OddRecord:
    try:
        odds_decimal = float(row["odds_decimal"])
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Linha {row_number}: odd decimal invalida.") from exc

    if odds_decimal <= 1:
        raise ValueError(f"Linha {row_number}: odd decimal deve ser maior que 1.")

    values = {column: (row[column] or "").strip() for column in REQUIRED_COLUMNS}
    empty_columns = [column for column, value in values.items() if not value]
    if empty_columns:
        raise ValueError(f"Linha {row_number}: campos vazios: {', '.join(empty_columns)}")

    return OddRecord(
        bookmaker=values["bookmaker"],
        match=values["match"],
        market=values["market"],
        selection=values["selection"],
        odds_decimal=odds_decimal,
        timestamp=values["timestamp"],
    )
