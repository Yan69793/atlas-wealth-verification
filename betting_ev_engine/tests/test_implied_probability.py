import unittest

from betting_ev_engine.implied_probability import (
    decimal_to_implied_probability,
    normalize_market_probabilities,
)
from betting_ev_engine.odds_collector import OddRecord


class ImpliedProbabilityTest(unittest.TestCase):
    def test_decimal_to_implied_probability(self):
        self.assertAlmostEqual(decimal_to_implied_probability(2.0), 0.5)
        self.assertAlmostEqual(decimal_to_implied_probability(4.0), 0.25)

    def test_remove_market_margin_by_normalization(self):
        records = [
            OddRecord("Book", "Time A x Time B", "1X2", "Time A", 1.80, "2026-01-01T00:00:00Z"),
            OddRecord("Book", "Time A x Time B", "1X2", "Empate", 3.40, "2026-01-01T00:00:00Z"),
            OddRecord("Book", "Time A x Time B", "1X2", "Time B", 4.50, "2026-01-01T00:00:00Z"),
        ]

        normalized = normalize_market_probabilities(records)
        total = sum(item.no_margin_probability for item in normalized)

        self.assertAlmostEqual(total, 1.0)
        self.assertGreater(normalized[0].overround, 1.0)


if __name__ == "__main__":
    unittest.main()
