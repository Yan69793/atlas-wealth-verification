"""Bankroll allocation for positive EV opportunities."""

from __future__ import annotations

from dataclasses import replace

from .ev_model import ValueOpportunity, calculate_ev


PROFILE_EXPOSURE = {
    "conservador": 0.20,
    "balanceado": 0.50,
    "agressivo": 1.00,
}

RISK_MULTIPLIER = {
    "baixo": 1.00,
    "medio": 0.70,
    "alto": 0.40,
}


def allocate_stakes(
    opportunities: list[ValueOpportunity],
    profile: str,
    bankroll: float = 100.0,
) -> list[ValueOpportunity]:
    if bankroll <= 0:
        raise ValueError("Banca deve ser positiva.")
    if profile not in PROFILE_EXPOSURE:
        valid = ", ".join(PROFILE_EXPOSURE)
        raise ValueError(f"Perfil invalido. Use: {valid}.")

    positive = [item for item in opportunities if item.ev > 0]
    total_budget = bankroll * PROFILE_EXPOSURE[profile]
    weights = [_weight(item) for item in positive]
    weight_sum = sum(weights)

    allocated: list[ValueOpportunity] = []
    for item in opportunities:
        stake = 0.0
        if item.ev > 0 and weight_sum > 0:
            stake = total_budget * (_weight(item) / weight_sum)

        allocated.append(
            replace(
                item,
                stake=stake,
                ev=calculate_ev(item.estimated_probability, item.odds_decimal, stake),
            )
        )

    return allocated


def _weight(item: ValueOpportunity) -> float:
    edge = max(item.estimated_probability - item.market_probability.no_margin_probability, 0)
    ev_unit = max(item.ev / item.stake, 0) if item.stake > 0 else 0
    return (edge + ev_unit) * RISK_MULTIPLIER[item.risk_label]
