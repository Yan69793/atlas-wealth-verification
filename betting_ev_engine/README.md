# betting_ev_engine

Ferramenta Python para analisar jogos de futebol e identificar apostas com possivel valor esperado positivo.

O projeto separa:

- Fato: odds lidas do CSV.
- Hipotese: probabilidades estimadas inseridas manualmente.
- Recomendacao: calculo de EV, stake sugerida e risco.

Aviso: isto nao e recomendacao financeira. A ferramenta apenas organiza calculos.

## Estrutura

```text
betting_ev_engine/
  betting_ev_engine/
    odds_collector.py
    implied_probability.py
    ev_model.py
    stake_allocator.py
    report_generator.py
  data/
    odds_template.csv
  tests/
```

## CSV de odds

O arquivo inicial deve ter exatamente estas colunas:

```csv
bookmaker,match,market,selection,odds_decimal,timestamp
```

Use `data/odds_template.csv` como modelo. Ele contem apenas cabecalho para nao inventar dados.

## Exemplo de uso

```python
from betting_ev_engine.odds_collector import load_odds_csv
from betting_ev_engine.implied_probability import normalize_market_probabilities
from betting_ev_engine.ev_model import attach_manual_probabilities
from betting_ev_engine.stake_allocator import allocate_stakes
from betting_ev_engine.report_generator import generate_markdown_report, generate_excel_report

odds = load_odds_csv("data/odds_template.csv")
market_rows = normalize_market_probabilities(odds)

manual_inputs = {
    # chave: (bookmaker, match, market, selection)
    # valor: probabilidade estimada manualmente entre 0 e 1
}

opportunities = attach_manual_probabilities(market_rows, manual_inputs, stake=1.0)
allocated = allocate_stakes(opportunities, profile="balanceado", bankroll=100.0)

generate_markdown_report(allocated, "reports/ev_report.md")
generate_excel_report(allocated, "reports/ev_report.xlsx")
```

## Perfis de banca

A banca padrao e R$100:

- `conservador`: usa ate 20% da banca em apostas com EV positivo.
- `balanceado`: usa ate 50% da banca em apostas com EV positivo.
- `agressivo`: usa ate 100% da banca em apostas com EV positivo.

Se nenhuma aposta tiver EV positivo, a stake sugerida sera zero.

## Testes

```powershell
python -m unittest discover -s tests
```

Ou, dentro da pasta do projeto:

```powershell
python -m unittest discover
```
