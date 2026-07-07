import unittest

from betting_ev_engine.ev_model import calculate_ev


class EVModelTest(unittest.TestCase):
    def test_positive_ev(self):
        ev = calculate_ev(prob_real=0.60, odds_decimal=2.10, stake=10.0)
        self.assertAlmostEqual(ev, 2.60)

    def test_negative_ev(self):
        ev = calculate_ev(prob_real=0.40, odds_decimal=2.00, stake=10.0)
        self.assertAlmostEqual(ev, -2.00)

    def test_probability_must_be_valid(self):
        with self.assertRaises(ValueError):
            calculate_ev(prob_real=1.20, odds_decimal=2.00, stake=10.0)


if __name__ == "__main__":
    unittest.main()
