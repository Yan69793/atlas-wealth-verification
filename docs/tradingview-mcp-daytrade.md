# MCP para TradingView / Daytrade — Maverick MCP

Guia de configuração do **[maverick-mcp](https://github.com/wshobson/maverick-mcp)**
(sucessor do arquivado `wshobson/mcp-trader`), o MCP recomendado para análise
técnica e suporte a daytrade via Claude.

## Por que o Maverick MCP

É o mais completo para daytrade: 30+ ferramentas de análise técnica, screening
de momentum, sentimento de notícias e backtesting — exatamente o ciclo
analisar → decidir que daytrade exige.

| Necessidade do daytrade | Ferramentas |
|-------------------------|-------------|
| Sinais de entrada/saída | `get_rsi_analysis`, `get_macd_analysis`, `get_support_resistance` |
| Leitura rápida do ativo | `get_full_technical_analysis`, `get_stock_chart_analysis` |
| Dados de mercado        | `fetch_stock_data`, `fetch_stock_data_batch`, `get_news_sentiment` |
| Achar setups            | `get_maverick_stocks`, `get_maverick_bear_stocks`, `get_trending_breakout_stocks` |
| Risco / posição         | `risk_adjusted_analysis`, `portfolio_correlation_analysis` |
| Validar estratégia      | `run_backtest`, `compare_strategies`, `optimize_strategy` |
| Acompanhar carteira     | `portfolio_add_position`, `portfolio_get_my_portfolio` (P&L ao vivo) |

> Para **operar dentro do TradingView** (ler suas charts ao vivo, aplicar
> indicadores, criar alertas, escrever Pine Script), combine este MCP com o
> bridge open-source para o **TradingView Desktop**. Para **execução automática
> de ordens**, use o MCP da sua corretora (ex.: Bybit, ThinkMarkets — prefira
> os que executam trades mas **não acessam fundos**).

## Instalação

```bash
# 1. Clonar o servidor
git clone https://github.com/wshobson/maverick-mcp.git
cd maverick-mcp

# 2. Dependências (uv recomendado)
uv sync
cp .env.example .env

# 3. TA-Lib (obrigatório p/ análise técnica)
#    macOS/Linux:   brew install ta-lib
#    Conda:         conda install -c conda-forge ta-lib
#    Windows/pip:   wheel de https://github.com/cgohlke/talib-build/releases
```

## Chaves de API

- `TIINGO_API_KEY` — **obrigatória**, dados de mercado (free tier em https://tiingo.com)
- Opcionais: `OPENROUTER_API_KEY`, `EXA_API_KEY`, `FRED_API_KEY`, `TAVILY_API_KEY`,
  `ADANOS_API_KEY` (sentimento: Reddit, X, News, Polymarket)

Veja `.env.example` na raiz deste repositório.

## Conectar ao Claude

O arquivo [`mcp.example.json`](../mcp.example.json) na raiz tem a config pronta
(transporte STDIO). Para usar:

1. Defina as variáveis `MAVERICK_MCP_DIR` (caminho absoluto do `maverick-mcp`
   clonado) e `TIINGO_API_KEY`.
2. Copie o conteúdo de `mcp.example.json` para a config do seu cliente:
   - **Claude Code (projeto):** copie para `.mcp.json` na raiz do projeto.
   - **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`
     (macOS) ou `%APPDATA%\Claude\claude_desktop_config.json` (Windows).

Config STDIO:

```json
{
  "mcpServers": {
    "maverick-mcp": {
      "command": "uv",
      "args": ["run", "python", "-m", "maverick_mcp.api.server", "--transport", "stdio"],
      "cwd": "${MAVERICK_MCP_DIR}",
      "env": { "TIINGO_API_KEY": "${TIINGO_API_KEY}" }
    }
  }
}
```

Alternativa via HTTP (rode `make dev` no maverick-mcp; sobe em `http://localhost:8003/mcp/`):

```json
{
  "mcpServers": {
    "maverick-mcp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:8003/mcp/"]
    }
  }
}
```

## Aviso

Ferramentas de análise não são recomendação de investimento. Daytrade tem risco
elevado de perda. Valide qualquer estratégia com `run_backtest` antes de operar
com capital real, e nunca conceda a um MCP permissão de movimentar/sacar fundos.
