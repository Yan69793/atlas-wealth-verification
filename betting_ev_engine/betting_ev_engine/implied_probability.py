"""Implied probability and market margin calculations."""

from __future__ import annotations

from dataclasses import dataclass

from .odds_collector import OddRecord, group_by_market


@dataclass(frozen=True)
class MarketProbability:
    odd: OddRecord
    implied_probability: float
    no_margin_probability: float
    overround: float


def decimal_to_implied_probability(odds_decimal: float) -> float:
    if odds_decimal <= 1:
        raise ValueError("Odd decimal deve ser maior que 1.")
    return 1 / odds_decimal


def normalize_market_probabilities(records: list[OddRecord]) -> list[MarketProbability]:
    """Remove bookmaker margin by normalizing implied probabilities per market."""
    normalized: list[MarketProbability] = []

    for market_records in group_by_market(records).values():
        implied_values = [decimal_to_implied_probability(record.odds_decimal) for record in market_records]
        overround = sum(implied_values)
        if overround <= 0:
            raise ValueError("Mercado com soma de probabilidades invalida.")

        for record, implied in zip(market_records, implied_values):
            normalized.append(
                MarketProbability(
                    odd=record,
                    implied_probability=implied,
                    no_margin_probability=implied / overround,
                    overround=overround,
                )
            )

    return normalized
