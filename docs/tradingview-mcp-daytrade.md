# MCP para TradingView / Daytrade

Stack recomendada de **3 MCPs** que cobrem o ciclo completo de daytrade:

| Camada | MCP | Função |
|--------|-----|--------|
| 1. Análise/decisão | **[maverick-mcp](https://github.com/wshobson/maverick-mcp)** | Análise técnica, screening, backtesting |
| 2. Operar no TradingView | **[tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp)** | Lê charts ao vivo, indicadores, alertas, Pine Script |
| 3. Execução de ordens | **[bybit trading-mcp](https://github.com/bybit-exchange/trading-mcp)** | Executa trades na corretora |

O [`mcp.example.json`](../mcp.example.json) já traz os três configurados.
Ative apenas os que for usar.

---

## 1. Maverick MCP — análise técnica e daytrade

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

> Para **operar dentro do TradingView**, veja a seção 2. Para **execução de
> ordens**, veja a seção 3.

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

---

## 2. TradingView Desktop bridge — operar nas suas charts

**[tradesdontlie/tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp)**
(MIT) conecta o Claude ao **TradingView Desktop** rodando localmente via Chrome
DevTools Protocol (CDP). 78 ferramentas — tudo roda local, os dados das charts
não saem da sua máquina.

**Capacidades:** mudar símbolo/timeframe, ler valores de indicadores e OHLCV,
screenshots, escrever/injetar/compilar **Pine Script** com visão da chart aberta,
desenhar (linhas, retângulos, anotações), criar/listar/apagar alertas, layouts
multi-painel e **replay mode** para treinar.

### Instalação

```bash
# 1. Clonar e instalar
git clone https://github.com/tradesdontlie/tradingview-mcp.git
cd tradingview-mcp
npm install

# 2. Abrir o TradingView Desktop com debug habilitado (porta 9222)
#    macOS:   ./scripts/launch_tv_debug_mac.sh
#    Windows: scripts\launch_tv_debug.bat
#    Linux:   ./scripts/launch_tv_debug_linux.sh
#    Manual:  /caminho/do/TradingView --remote-debugging-port=9222
```

Sem variáveis de ambiente — só o caminho do servidor no `mcp.example.json`
(`TRADINGVIEW_MCP_DIR`). Verifique a conexão com `tv_health_check` no Claude
ou `node src/cli/index.js status`.

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["${TRADINGVIEW_MCP_DIR}/src/server.js"]
    }
  }
}
```

---

## 3. Bybit — execução de ordens

MCP oficial **[bybit-exchange/trading-mcp](https://github.com/bybit-exchange/trading-mcp)**
(206 ferramentas: market data, trading, posições, conta, WebSocket). As 22
ferramentas de market data funcionam **sem chave de API**.

### Configuração

```json
{
  "mcpServers": {
    "bybit": {
      "command": "npx",
      "args": ["-y", "bybit-official-trading-server@latest"],
      "env": {
        "BYBIT_API_KEY": "${BYBIT_API_KEY}",
        "BYBIT_API_SECRET": "${BYBIT_API_SECRET}",
        "BYBIT_TESTNET": "true"
      }
    }
  }
}
```

- Alternativa ao secret: `BYBIT_API_PRIVATE_KEY_PATH` apontando para um PEM RSA.
- Comece sempre com `BYBIT_TESTNET=true` e só passe para produção depois de validar.
- **Crie a chave de API SEM permissão de saque/transferência** — execução de
  ordens não precisa disso.

> ThinkMarkets também tem MCP oficial (a IA executa trades mas **não acessa
> fundos**), uma boa alternativa se você opera CFDs/forex em vez de cripto.

---

## Aviso

Ferramentas de análise não são recomendação de investimento. Daytrade tem risco
elevado de perda. Valide qualquer estratégia com `run_backtest` antes de operar
com capital real, e nunca conceda a um MCP permissão de movimentar/sacar fundos.
