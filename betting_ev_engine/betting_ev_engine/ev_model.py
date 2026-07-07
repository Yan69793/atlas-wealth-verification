"""Expected value model using manually estimated probabilities."""

from __future__ import annotations

from dataclasses import dataclass

from .implied_probability import MarketProbability


@dataclass(frozen=True)
class ValueOpportunity:
    market_probability: MarketProbability
    estimated_probability: float
    probability_source: str
    stake: float
    ev: float

    @property
    def odds_decimal(self) -> float:
        return self.market_probability.odd.odds_decimal

    @property
    def profit_if_win(self) -> float:
        return self.stake * (self.odds_decimal - 1)

    @property
    def potential_return(self) -> float:
        return self.stake * self.odds_decimal

    @property
    def risk_label(self) -> str:
        probability = self.estimated_probability
        if probability >= 0.55:
            return "baixo"
        if probability >= 0.40:
            return "medio"
        return "alto"

    @property
    def recommendation(self) -> str:
        if self.ev <= 0 or self.stake <= 0:
            return "evitar"
        return "avaliar"


def calculate_ev(prob_real: float, odds_decimal: float, stake: float) -> float:
    _validate_probability(prob_real)
    if odds_decimal <= 1:
        raise ValueError("Odd decimal deve ser maior que 1.")
    if stake < 0:
        raise ValueError("Stake nao pode ser negativa.")

    profit = stake * (odds_decimal - 1)
    prob_loss = 1 - prob_real
    return (prob_real * profit) - (prob_loss * stake)


def attach_manual_probabilities(
    market_probabilities: list[MarketProbability],
    manual_probabilities: dict[tuple[str, str, str, str], float],
    stake: float = 1.0,
) -> list[ValueOpportunity]:
    opportunities: list[ValueOpportunity] = []

    for item in market_probabilities:
        key = item.odd.selection_key
        if key not in manual_probabilities:
            continue

        probability = manual_probabilities[key]
        _validate_probability(probability)
        ev = calculate_ev(probability, item.odd.odds_decimal, stake)
        opportunities.append(
            ValueOpportunity(
                market_probability=item,
                estimated_probability=probability,
                probability_source="input manual",
                stake=stake,
                ev=ev,
            )
        )

    return opportunities


def _validate_probability(value: float) -> None:
    if value < 0 or value > 1:
        raise ValueError("Probabilidade deve estar entre 0 e 1.")
