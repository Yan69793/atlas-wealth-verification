/* platform-radar-demo.js — fallback sintetico de window.ATLAS_RADAR_DATA

   GERADO POR scripts/gerar-radar-demo.mjs. Nao editar a mao: rode o script.

   O payload sai do proprio motor (radarCruzado) sobre uma serie sintetica.
   Demo escrito a mao diverge do motor em silencio, e foi assim que a severidade
   da queda de receita ficou certa no demo e errada no motor por meses.

   Mesmo padrao dos demais fallbacks: so roda se o overlay real da instancia
   (platform-radar.js, LGPD, gitignored) ainda nao populou a janela.

   Carteiras, emissores e valores sao ficticios, do catalogo demo do produto.
*/
(function () {
  'use strict';
  if (window.ATLAS_RADAR_DATA) return;
  /* Instancia com dado real: nao popular sintetico. Ver ESTADO/ESTADO-ATUAL.md. */
  if (window._AtlasRealData) return;

  window.ATLAS_RADAR_DATA = {
  "sintetico": true,
  "schema": "radar/v1",
  "data": "2026-08-24",
  "periodo": "diario",
  "tenantId": "demo",
  "geradoEm": null,
  "engine": {
    "nome": "atlas-audit-engine",
    "versao": "0.0.0"
  },
  "limiares": {
    "coberturaAfirmaMin": 0.7,
    "coberturaRessalvaMin": 0.4,
    "radarConcentracaoAtivoPct": 0.3,
    "radarConcentracaoEmissorPct": 0.25,
    "radarConcentracaoFatorPct": 0.7,
    "radarLiquidezMinPct": 0.05,
    "radarVencimentoConcentradoPct": 0.15,
    "radarVencimentoJanelaDias": 90,
    "radarDeterioracaoPct": 0.1,
    "radarDeterioracaoJanelaDias": 30,
    "radarVariacaoMaterialPct": 0.2
  },
  "baseEstado": "2026-07-25",
  "motivo": null,
  "baseData": "2026-07-25",
  "carteiras": [
    {
      "carteira": "FAROL_INV",
      "plTotal": 3700000,
      "sinais": [
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "media",
          "rotulo": "eua",
          "chave": "regiao:eua",
          "estado": "agravado",
          "valorAnterior": 2580000,
          "fator": "regiao",
          "valor": 3200000,
          "fracaoPl": 0.8648648648648649,
          "cobertura": 1,
          "insightId": "2026-08-24|FAROL_INV|CONCENTRACAO_FATOR|regiao:eua"
        },
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "media",
          "rotulo": "internacional",
          "chave": "classeCanonica:internacional",
          "estado": "agravado",
          "valorAnterior": 2580000,
          "fator": "classeCanonica",
          "valor": 3200000,
          "fracaoPl": 0.8648648648648649,
          "cobertura": 1,
          "insightId": "2026-08-24|FAROL_INV|CONCENTRACAO_FATOR|classeCanonica:internacional"
        },
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "media",
          "rotulo": "USD",
          "chave": "moeda:USD",
          "estado": "agravado",
          "valorAnterior": 2580000,
          "fator": "moeda",
          "valor": 3200000,
          "fracaoPl": 0.8648648648648649,
          "cobertura": 1,
          "insightId": "2026-08-24|FAROL_INV|CONCENTRACAO_FATOR|moeda:USD"
        }
      ],
      "pior": "media",
      "estado": "agravado",
      "faixaCobertura": "afirma",
      "maiorExposicao": 3200000
    },
    {
      "carteira": "ALPHA_01",
      "plTotal": 4940000,
      "sinais": [
        {
          "tipo": "DETERIORACAO_PL",
          "severidade": "media",
          "rotulo": "desde 2026-07-25",
          "chave": "",
          "estado": "novo",
          "valorAnterior": null,
          "valor": 1383200,
          "fracaoPl": -0.21875,
          "cobertura": 1,
          "insightId": "2026-08-24|ALPHA_01|DETERIORACAO_PL|2026-07-25"
        },
        {
          "tipo": "CONCENTRACAO_EMISSOR",
          "severidade": "alta",
          "rotulo": "Banco Zeta",
          "chave": "banco-zeta",
          "estado": "melhorado",
          "valorAnterior": 2112000,
          "valor": 1650000,
          "fracaoPl": 0.3340080971659919,
          "cobertura": 1,
          "insightId": "2026-08-24|ALPHA_01|CONCENTRACAO_EMISSOR|banco-zeta"
        },
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "media",
          "rotulo": "credito-privado",
          "chave": "classeCanonica:credito-privado",
          "estado": "melhorado",
          "valorAnterior": 5696000,
          "fator": "classeCanonica",
          "valor": 4450000,
          "fracaoPl": 0.9008097165991903,
          "cobertura": 1,
          "insightId": "2026-08-24|ALPHA_01|CONCENTRACAO_FATOR|classeCanonica:credito-privado"
        }
      ],
      "pior": "alta",
      "estado": "novo",
      "faixaCobertura": "afirma",
      "maiorExposicao": 4450000
    },
    {
      "carteira": "CEDRO_HLD",
      "plTotal": 9760000,
      "sinais": [
        {
          "tipo": "CONCENTRACAO_EMISSOR",
          "severidade": "alta",
          "rotulo": "Banco Omega",
          "chave": "banco-omega",
          "estado": "acompanhamento",
          "valorAnterior": 4500000,
          "valor": 4500000,
          "fracaoPl": 0.4610655737704918,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|CONCENTRACAO_EMISSOR|banco-omega"
        },
        {
          "tipo": "VENCIMENTO_CONCENTRADO",
          "severidade": "alta",
          "rotulo": "90 dias",
          "chave": "90",
          "estado": "acompanhamento",
          "valorAnterior": 4500000,
          "valor": 4500000,
          "fracaoPl": 0.4610655737704918,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|VENCIMENTO_CONCENTRADO|90"
        },
        {
          "tipo": "LIQUIDEZ_BAIXA",
          "severidade": "alta",
          "rotulo": "liquidez",
          "chave": "",
          "estado": "acompanhamento",
          "valorAnterior": 260000,
          "valor": 260000,
          "fracaoPl": 0.02663934426229508,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|LIQUIDEZ_BAIXA|"
        },
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "media",
          "rotulo": "credito-privado",
          "chave": "classeCanonica:credito-privado",
          "estado": "acompanhamento",
          "valorAnterior": 8500000,
          "fator": "classeCanonica",
          "valor": 8500000,
          "fracaoPl": 0.8709016393442623,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|CONCENTRACAO_FATOR|classeCanonica:credito-privado"
        },
        {
          "tipo": "CONCENTRACAO_ATIVO",
          "severidade": "media",
          "rotulo": "CDB OMEGA VENCE SET",
          "chave": "CDB OMEGA VENCE SET",
          "estado": "acompanhamento",
          "valorAnterior": 3600000,
          "valor": 3600000,
          "fracaoPl": 0.36885245901639346,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|CONCENTRACAO_ATIVO|CDB OMEGA VENCE SET"
        }
      ],
      "pior": "alta",
      "estado": "acompanhamento",
      "faixaCobertura": "afirma",
      "maiorExposicao": 8500000
    },
    {
      "carteira": "BRAVO_PV",
      "plTotal": 4800000,
      "sinais": [
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "alta",
          "rotulo": "CDI",
          "chave": "indexador:CDI",
          "estado": "acompanhamento",
          "valorAnterior": 4600000,
          "fator": "indexador",
          "valor": 4600000,
          "fracaoPl": 0.9583333333333334,
          "cobertura": 1,
          "insightId": "2026-08-24|BRAVO_PV|CONCENTRACAO_FATOR|indexador:CDI"
        },
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "media",
          "rotulo": "credito-privado",
          "chave": "classeCanonica:credito-privado",
          "estado": "acompanhamento",
          "valorAnterior": 4200000,
          "fator": "classeCanonica",
          "valor": 4200000,
          "fracaoPl": 0.875,
          "cobertura": 1,
          "insightId": "2026-08-24|BRAVO_PV|CONCENTRACAO_FATOR|classeCanonica:credito-privado"
        }
      ],
      "pior": "alta",
      "estado": "acompanhamento",
      "faixaCobertura": "afirma",
      "maiorExposicao": 4600000
    },
    {
      "carteira": "DUNAS_CAP",
      "plTotal": 16480000,
      "sinais": [
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "media",
          "rotulo": "IPCA",
          "chave": "indexador:IPCA",
          "estado": "acompanhamento",
          "valorAnterior": 14480000,
          "fator": "indexador",
          "valor": 14480000,
          "fracaoPl": 0.8786407766990292,
          "cobertura": 1,
          "insightId": "2026-08-24|DUNAS_CAP|CONCENTRACAO_FATOR|indexador:IPCA"
        }
      ],
      "pior": "media",
      "estado": "acompanhamento",
      "faixaCobertura": "afirma",
      "maiorExposicao": 14480000
    },
    {
      "carteira": "ESTRELA_PV",
      "plTotal": 3500000,
      "sinais": [],
      "pior": null,
      "estado": null,
      "faixaCobertura": "insuficiente",
      "maiorExposicao": 0
    }
  ],
  "encerrados": [
    {
      "carteira": "FAROL_INV",
      "tipo": "CONCENTRACAO_EMISSOR",
      "chave": "gestora-etf-eua-farol-concentrado",
      "rotulo": "Gestora etf-eua-farol-concentrado",
      "severidadeAnterior": "alta",
      "valorAnterior": 1200000,
      "motivo": "sinal-saiu"
    },
    {
      "carteira": "FAROL_INV",
      "tipo": "CONCENTRACAO_ATIVO",
      "chave": "ETF EUA FAROL CONCENTRADO",
      "rotulo": "ETF EUA FAROL CONCENTRADO",
      "severidadeAnterior": "media",
      "valorAnterior": 1200000,
      "motivo": "sinal-saiu"
    }
  ],
  "temAnterior": true,
  "emissores": [
    {
      "emissorId": "banco-omega",
      "emissorNome": "Banco Omega",
      "valor": 4500000,
      "fracaoCasa": 0.10421491431218156,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.4610655737704918,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "banco-zeta",
      "emissorNome": "Banco Zeta",
      "valor": 1650000,
      "fracaoCasa": 0.03821213524779991,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.3340080971659919,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-di-dunas",
      "emissorNome": "Gestora di-dunas",
      "valor": 2000000,
      "fracaoCasa": 0.04631773969430292,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.12135922330097088,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-ntn-b-dunas-0",
      "emissorNome": "Gestora ntn-b-dunas-0",
      "valor": 1200000,
      "fracaoCasa": 0.02779064381658175,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07281553398058252,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-ntn-b-dunas-1",
      "emissorNome": "Gestora ntn-b-dunas-1",
      "valor": 1200000,
      "fracaoCasa": 0.02779064381658175,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07281553398058252,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-ntn-b-dunas-2",
      "emissorNome": "Gestora ntn-b-dunas-2",
      "valor": 1200000,
      "fracaoCasa": 0.02779064381658175,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07281553398058252,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-ntn-b-dunas-3",
      "emissorNome": "Gestora ntn-b-dunas-3",
      "valor": 1200000,
      "fracaoCasa": 0.02779064381658175,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07281553398058252,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-ntn-b-dunas-4",
      "emissorNome": "Gestora ntn-b-dunas-4",
      "valor": 1200000,
      "fracaoCasa": 0.02779064381658175,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07281553398058252,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-ntn-b-dunas-5",
      "emissorNome": "Gestora ntn-b-dunas-5",
      "valor": 1200000,
      "fracaoCasa": 0.02779064381658175,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07281553398058252,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-0",
      "emissorNome": "Gestora deb-ipca-dunas-0",
      "valor": 1000000,
      "fracaoCasa": 0.02315886984715146,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06067961165048544,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-1",
      "emissorNome": "Gestora deb-ipca-dunas-1",
      "valor": 1000000,
      "fracaoCasa": 0.02315886984715146,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06067961165048544,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-2",
      "emissorNome": "Gestora deb-ipca-dunas-2",
      "valor": 1000000,
      "fracaoCasa": 0.02315886984715146,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06067961165048544,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-3",
      "emissorNome": "Gestora deb-ipca-dunas-3",
      "valor": 1000000,
      "fracaoCasa": 0.02315886984715146,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06067961165048544,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-4",
      "emissorNome": "Gestora deb-ipca-dunas-4",
      "valor": 1000000,
      "fracaoCasa": 0.02315886984715146,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06067961165048544,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-5",
      "emissorNome": "Gestora deb-ipca-dunas-5",
      "valor": 1000000,
      "fracaoCasa": 0.02315886984715146,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06067961165048544,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-6",
      "emissorNome": "Gestora deb-ipca-dunas-6",
      "valor": 1000000,
      "fracaoCasa": 0.02315886984715146,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06067961165048544,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-fii-cedro",
      "emissorNome": "Gestora fii-cedro",
      "valor": 1000000,
      "fracaoCasa": 0.02315886984715146,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.10245901639344263,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-cedro-0",
      "emissorNome": "Gestora deb-cedro-0",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.040983606557377046,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-cedro-1",
      "emissorNome": "Gestora deb-cedro-1",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.040983606557377046,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-cedro-2",
      "emissorNome": "Gestora deb-cedro-2",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.040983606557377046,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-cedro-3",
      "emissorNome": "Gestora deb-cedro-3",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.040983606557377046,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-cedro-4",
      "emissorNome": "Gestora deb-cedro-4",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.040983606557377046,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-cedro-5",
      "emissorNome": "Gestora deb-cedro-5",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.040983606557377046,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-cedro-6",
      "emissorNome": "Gestora deb-cedro-6",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.040983606557377046,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-cedro-7",
      "emissorNome": "Gestora deb-cedro-7",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.040983606557377046,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-cedro-8",
      "emissorNome": "Gestora deb-cedro-8",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.040983606557377046,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-cedro-9",
      "emissorNome": "Gestora deb-cedro-9",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.040983606557377046,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-di-bravo",
      "emissorNome": "Gestora di-bravo",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.08333333333333333,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-etf-eua-farol-0",
      "emissorNome": "Gestora etf-eua-farol-0",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.10810810810810811,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-etf-eua-farol-1",
      "emissorNome": "Gestora etf-eua-farol-1",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.10810810810810811,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-etf-eua-farol-2",
      "emissorNome": "Gestora etf-eua-farol-2",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.10810810810810811,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-etf-eua-farol-3",
      "emissorNome": "Gestora etf-eua-farol-3",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.10810810810810811,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-etf-eua-farol-4",
      "emissorNome": "Gestora etf-eua-farol-4",
      "valor": 400000,
      "fracaoCasa": 0.009263547938860583,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.10810810810810811,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-bond-usd-farol-0",
      "emissorNome": "Gestora bond-usd-farol-0",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.08108108108108109,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-bond-usd-farol-1",
      "emissorNome": "Gestora bond-usd-farol-1",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.08108108108108109,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-bond-usd-farol-2",
      "emissorNome": "Gestora bond-usd-farol-2",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.08108108108108109,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-bond-usd-farol-3",
      "emissorNome": "Gestora bond-usd-farol-3",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.08108108108108109,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-bravo-0",
      "emissorNome": "Gestora cdb-bravo-0",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-bravo-1",
      "emissorNome": "Gestora cdb-bravo-1",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-bravo-2",
      "emissorNome": "Gestora cdb-bravo-2",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-bravo-3",
      "emissorNome": "Gestora cdb-bravo-3",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-bravo-4",
      "emissorNome": "Gestora cdb-bravo-4",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-bravo-5",
      "emissorNome": "Gestora cdb-bravo-5",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cra-bravo-0",
      "emissorNome": "Gestora cra-bravo-0",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cra-bravo-1",
      "emissorNome": "Gestora cra-bravo-1",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cra-bravo-2",
      "emissorNome": "Gestora cra-bravo-2",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cx-farol",
      "emissorNome": "Gestora cx-farol",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.08108108108108109,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-bravo-0",
      "emissorNome": "Gestora deb-bravo-0",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-bravo-1",
      "emissorNome": "Gestora deb-bravo-1",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-bravo-2",
      "emissorNome": "Gestora deb-bravo-2",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-bravo-3",
      "emissorNome": "Gestora deb-bravo-3",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-bravo-4",
      "emissorNome": "Gestora deb-bravo-4",
      "valor": 300000,
      "fracaoCasa": 0.006947660954145438,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "metalurgica-aurora",
      "emissorNome": "Metalurgica Aurora",
      "valor": 280000,
      "fracaoCasa": 0.006484483557202408,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.01699029126213592,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cx-cedro",
      "emissorNome": "Gestora cx-cedro",
      "valor": 260000,
      "fracaoCasa": 0.006021306160259379,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.02663934426229508,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-di-alfa",
      "emissorNome": "Gestora di-alfa",
      "valor": 250000,
      "fracaoCasa": 0.005789717461787865,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.05060728744939271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-multi-beta",
      "emissorNome": "Gestora multi-beta",
      "valor": 240000,
      "fracaoCasa": 0.00555812876331635,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.048582995951417005,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-estrela-0",
      "emissorNome": "Gestora cdb-estrela-0",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ESTRELA_PV"
      ],
      "maiorFracaoEmCarteira": 0.05714285714285714,
      "carteiraMaisExposta": "ESTRELA_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-estrela-1",
      "emissorNome": "Gestora cdb-estrela-1",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ESTRELA_PV"
      ],
      "maiorFracaoEmCarteira": 0.05714285714285714,
      "carteiraMaisExposta": "ESTRELA_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-estrela-2",
      "emissorNome": "Gestora cdb-estrela-2",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ESTRELA_PV"
      ],
      "maiorFracaoEmCarteira": 0.05714285714285714,
      "carteiraMaisExposta": "ESTRELA_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-estrela-3",
      "emissorNome": "Gestora cdb-estrela-3",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ESTRELA_PV"
      ],
      "maiorFracaoEmCarteira": 0.05714285714285714,
      "carteiraMaisExposta": "ESTRELA_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cra-alpha-0",
      "emissorNome": "Gestora cra-alpha-0",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cra-alpha-1",
      "emissorNome": "Gestora cra-alpha-1",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cra-alpha-2",
      "emissorNome": "Gestora cra-alpha-2",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cra-alpha-3",
      "emissorNome": "Gestora cra-alpha-3",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cra-alpha-4",
      "emissorNome": "Gestora cra-alpha-4",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cra-alpha-5",
      "emissorNome": "Gestora cra-alpha-5",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cx-estrela",
      "emissorNome": "Gestora cx-estrela",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ESTRELA_PV"
      ],
      "maiorFracaoEmCarteira": 0.05714285714285714,
      "carteiraMaisExposta": "ESTRELA_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-alpha-0",
      "emissorNome": "Gestora deb-alpha-0",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-alpha-1",
      "emissorNome": "Gestora deb-alpha-1",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-alpha-2",
      "emissorNome": "Gestora deb-alpha-2",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-alpha-3",
      "emissorNome": "Gestora deb-alpha-3",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-alpha-4",
      "emissorNome": "Gestora deb-alpha-4",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-alpha-5",
      "emissorNome": "Gestora deb-alpha-5",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-alpha-6",
      "emissorNome": "Gestora deb-alpha-6",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-deb-alpha-7",
      "emissorNome": "Gestora deb-alpha-7",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04048582995951417,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-ntnb-bravo",
      "emissorNome": "Gestora ntnb-bravo",
      "valor": 200000,
      "fracaoCasa": 0.004631773969430292,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.041666666666666664,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-farol-0",
      "emissorNome": "Gestora cdb-farol-0",
      "valor": 50000,
      "fracaoCasa": 0.001157943492357573,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.013513513513513514,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-farol-1",
      "emissorNome": "Gestora cdb-farol-1",
      "valor": 50000,
      "fracaoCasa": 0.001157943492357573,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.013513513513513514,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-farol-2",
      "emissorNome": "Gestora cdb-farol-2",
      "valor": 50000,
      "fracaoCasa": 0.001157943492357573,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.013513513513513514,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    },
    {
      "emissorId": "gestora-cdb-farol-3",
      "emissorNome": "Gestora cdb-farol-3",
      "valor": 50000,
      "fracaoCasa": 0.001157943492357573,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.013513513513513514,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.9421028253821213
    }
  ],
  "fatores": [
    {
      "fator": "moeda",
      "valor": "BRL",
      "montante": 37480000,
      "fracaoCasa": 0.8679944418712366,
      "carteiras": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "ESTRELA_PV",
        "FAROL_INV"
      ],
      "carteirasConcentradas": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP"
      ],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "regiao",
      "valor": "brasil",
      "montante": 37480000,
      "fracaoCasa": 0.8679944418712366,
      "carteiras": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "ESTRELA_PV",
        "FAROL_INV"
      ],
      "carteirasConcentradas": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP"
      ],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "classeCanonica",
      "valor": "credito-privado",
      "montante": 25430000,
      "fracaoCasa": 0.5889300602130616,
      "carteiras": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "ESTRELA_PV",
        "FAROL_INV"
      ],
      "carteirasConcentradas": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD"
      ],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "indexador",
      "valor": "IPCA",
      "montante": 20780000,
      "fracaoCasa": 0.4812413154238073,
      "carteiras": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP"
      ],
      "carteirasConcentradas": [
        "DUNAS_CAP"
      ],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "indexador",
      "valor": "CDI",
      "montante": 15460000,
      "fracaoCasa": 0.35803612783696154,
      "carteiras": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "ESTRELA_PV",
        "FAROL_INV"
      ],
      "carteirasConcentradas": [
        "BRAVO_PV"
      ],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "classeCanonica",
      "valor": "internacional",
      "montante": 3200000,
      "fracaoCasa": 0.07410838351088467,
      "carteiras": [
        "FAROL_INV"
      ],
      "carteirasConcentradas": [
        "FAROL_INV"
      ],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "moeda",
      "valor": "USD",
      "montante": 3200000,
      "fracaoCasa": 0.07410838351088467,
      "carteiras": [
        "FAROL_INV"
      ],
      "carteirasConcentradas": [
        "FAROL_INV"
      ],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "regiao",
      "valor": "eua",
      "montante": 3200000,
      "fracaoCasa": 0.07410838351088467,
      "carteiras": [
        "FAROL_INV"
      ],
      "carteirasConcentradas": [
        "FAROL_INV"
      ],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "classeCanonica",
      "valor": "renda-fixa",
      "montante": 7400000,
      "fracaoCasa": 0.1713756368689208,
      "carteiras": [
        "BRAVO_PV",
        "DUNAS_CAP"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "classeCanonica",
      "valor": "liquidez",
      "montante": 3410000,
      "fracaoCasa": 0.07897174617878648,
      "carteiras": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "ESTRELA_PV",
        "FAROL_INV"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "indexador",
      "valor": "BOLSA",
      "montante": 2000000,
      "fracaoCasa": 0.04631773969430292,
      "carteiras": [
        "FAROL_INV"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "indexador",
      "valor": "MULTI",
      "montante": 1240000,
      "fracaoCasa": 0.02871699861046781,
      "carteiras": [
        "ALPHA_01",
        "CEDRO_HLD"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "indexador",
      "valor": "CAMBIO",
      "montante": 1200000,
      "fracaoCasa": 0.02779064381658175,
      "carteiras": [
        "FAROL_INV"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "classeCanonica",
      "valor": "imobiliario",
      "montante": 1000000,
      "fracaoCasa": 0.02315886984715146,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.9421028253821213
    },
    {
      "fator": "classeCanonica",
      "valor": "multimercado",
      "montante": 240000,
      "fracaoCasa": 0.00555812876331635,
      "carteiras": [
        "ALPHA_01"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.9421028253821213
    }
  ],
  "deterioracao": [
    {
      "carteira": "ALPHA_01",
      "plAnterior": 6323200,
      "plAtual": 4940000,
      "delta": -1383200,
      "deltaPct": -0.21875,
      "severidade": "media",
      "insightId": "2026-08-24|ALPHA_01|DETERIORACAO_PL|2026-07-25"
    }
  ],
  "cobertura": [
    {
      "carteira": "ESTRELA_PV",
      "plTotal": 3500000,
      "posicoes": 9,
      "atributos": [
        {
          "atributo": "classeCanonica",
          "plCoberto": 1000000,
          "plTotal": 3500000,
          "fracao": 0.2857142857142857,
          "faixa": "insuficiente"
        },
        {
          "atributo": "indexador",
          "plCoberto": 1000000,
          "plTotal": 3500000,
          "fracao": 0.2857142857142857,
          "faixa": "insuficiente"
        },
        {
          "atributo": "emissorId",
          "plCoberto": 1000000,
          "plTotal": 3500000,
          "fracao": 0.2857142857142857,
          "faixa": "insuficiente"
        },
        {
          "atributo": "moeda",
          "plCoberto": 1000000,
          "plTotal": 3500000,
          "fracao": 0.2857142857142857,
          "faixa": "insuficiente"
        },
        {
          "atributo": "regiao",
          "plCoberto": 1000000,
          "plTotal": 3500000,
          "fracao": 0.2857142857142857,
          "faixa": "insuficiente"
        },
        {
          "atributo": "prazoAnos",
          "plCoberto": 1000000,
          "plTotal": 3500000,
          "fracao": 0.2857142857142857,
          "faixa": "insuficiente"
        },
        {
          "atributo": "liquidezDias",
          "plCoberto": 1000000,
          "plTotal": 3500000,
          "fracao": 0.2857142857142857,
          "faixa": "insuficiente"
        }
      ],
      "faixaGlobal": "insuficiente",
      "fracaoMedia": 0.28571428571428564
    },
    {
      "carteira": "ALPHA_01",
      "plTotal": 4940000,
      "posicoes": 19,
      "atributos": [
        {
          "atributo": "classeCanonica",
          "plCoberto": 4940000,
          "plTotal": 4940000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "indexador",
          "plCoberto": 4940000,
          "plTotal": 4940000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "emissorId",
          "plCoberto": 4940000,
          "plTotal": 4940000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "moeda",
          "plCoberto": 4940000,
          "plTotal": 4940000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "regiao",
          "plCoberto": 4940000,
          "plTotal": 4940000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "prazoAnos",
          "plCoberto": 4940000,
          "plTotal": 4940000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "liquidezDias",
          "plCoberto": 4940000,
          "plTotal": 4940000,
          "fracao": 1,
          "faixa": "afirma"
        }
      ],
      "faixaGlobal": "afirma",
      "fracaoMedia": 1
    },
    {
      "carteira": "BRAVO_PV",
      "plTotal": 4800000,
      "posicoes": 16,
      "atributos": [
        {
          "atributo": "classeCanonica",
          "plCoberto": 4800000,
          "plTotal": 4800000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "indexador",
          "plCoberto": 4800000,
          "plTotal": 4800000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "emissorId",
          "plCoberto": 4800000,
          "plTotal": 4800000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "moeda",
          "plCoberto": 4800000,
          "plTotal": 4800000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "regiao",
          "plCoberto": 4800000,
          "plTotal": 4800000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "prazoAnos",
          "plCoberto": 4800000,
          "plTotal": 4800000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "liquidezDias",
          "plCoberto": 4800000,
          "plTotal": 4800000,
          "fracao": 1,
          "faixa": "afirma"
        }
      ],
      "faixaGlobal": "afirma",
      "fracaoMedia": 1
    },
    {
      "carteira": "CEDRO_HLD",
      "plTotal": 9760000,
      "posicoes": 14,
      "atributos": [
        {
          "atributo": "classeCanonica",
          "plCoberto": 9760000,
          "plTotal": 9760000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "indexador",
          "plCoberto": 9760000,
          "plTotal": 9760000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "emissorId",
          "plCoberto": 9760000,
          "plTotal": 9760000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "moeda",
          "plCoberto": 9760000,
          "plTotal": 9760000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "regiao",
          "plCoberto": 9760000,
          "plTotal": 9760000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "prazoAnos",
          "plCoberto": 9760000,
          "plTotal": 9760000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "liquidezDias",
          "plCoberto": 9760000,
          "plTotal": 9760000,
          "fracao": 1,
          "faixa": "afirma"
        }
      ],
      "faixaGlobal": "afirma",
      "fracaoMedia": 1
    },
    {
      "carteira": "DUNAS_CAP",
      "plTotal": 16480000,
      "posicoes": 15,
      "atributos": [
        {
          "atributo": "classeCanonica",
          "plCoberto": 16480000,
          "plTotal": 16480000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "indexador",
          "plCoberto": 16480000,
          "plTotal": 16480000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "emissorId",
          "plCoberto": 16480000,
          "plTotal": 16480000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "moeda",
          "plCoberto": 16480000,
          "plTotal": 16480000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "regiao",
          "plCoberto": 16480000,
          "plTotal": 16480000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "prazoAnos",
          "plCoberto": 16480000,
          "plTotal": 16480000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "liquidezDias",
          "plCoberto": 16480000,
          "plTotal": 16480000,
          "fracao": 1,
          "faixa": "afirma"
        }
      ],
      "faixaGlobal": "afirma",
      "fracaoMedia": 1
    },
    {
      "carteira": "FAROL_INV",
      "plTotal": 3700000,
      "posicoes": 14,
      "atributos": [
        {
          "atributo": "classeCanonica",
          "plCoberto": 3700000,
          "plTotal": 3700000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "indexador",
          "plCoberto": 3700000,
          "plTotal": 3700000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "emissorId",
          "plCoberto": 3700000,
          "plTotal": 3700000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "moeda",
          "plCoberto": 3700000,
          "plTotal": 3700000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "regiao",
          "plCoberto": 3700000,
          "plTotal": 3700000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "prazoAnos",
          "plCoberto": 3700000,
          "plTotal": 3700000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "liquidezDias",
          "plCoberto": 3700000,
          "plTotal": 3700000,
          "fracao": 1,
          "faixa": "afirma"
        }
      ],
      "faixaGlobal": "afirma",
      "fracaoMedia": 1
    }
  ],
  "coberturaCasa": {
    "plTotal": 43180000,
    "carteiras": 6,
    "atributos": [
      {
        "atributo": "classeCanonica",
        "plCoberto": 40680000,
        "plTotal": 43180000,
        "fracao": 0.9421028253821213,
        "faixa": "afirma"
      },
      {
        "atributo": "indexador",
        "plCoberto": 40680000,
        "plTotal": 43180000,
        "fracao": 0.9421028253821213,
        "faixa": "afirma"
      },
      {
        "atributo": "emissorId",
        "plCoberto": 40680000,
        "plTotal": 43180000,
        "fracao": 0.9421028253821213,
        "faixa": "afirma"
      },
      {
        "atributo": "moeda",
        "plCoberto": 40680000,
        "plTotal": 43180000,
        "fracao": 0.9421028253821213,
        "faixa": "afirma"
      },
      {
        "atributo": "regiao",
        "plCoberto": 40680000,
        "plTotal": 43180000,
        "fracao": 0.9421028253821213,
        "faixa": "afirma"
      },
      {
        "atributo": "prazoAnos",
        "plCoberto": 40680000,
        "plTotal": 43180000,
        "fracao": 0.9421028253821213,
        "faixa": "afirma"
      },
      {
        "atributo": "liquidezDias",
        "plCoberto": 40680000,
        "plTotal": 43180000,
        "fracao": 0.9421028253821213,
        "faixa": "afirma"
      }
    ],
    "faixaGlobal": "afirma"
  },
  "insights": [
    {
      "schema": "insight/v1",
      "id": "2026-08-24|ALPHA_01|CONCENTRACAO_EMISSOR|banco-zeta",
      "tipo": "CONCENTRACAO_EMISSOR",
      "carteira": "ALPHA_01",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "33,4% do patrimônio depende de um único emissor (Banco Zeta).",
      "evidencias": {
        "emissorId": "banco-zeta",
        "emissorNome": "Banco Zeta",
        "valor": 1650000,
        "plTotal": 4940000,
        "fracaoPl": 0.3340080971659919,
        "estado": "melhorado",
        "valorAnterior": 2112000
      },
      "regra": {
        "nome": "radarConcentracaoEmissorPct",
        "limiar": {
          "radarConcentracaoEmissorPct": 0.25
        }
      },
      "calculo": "R$ 1.650.000 / R$ 4.940.000 = 33,4%, limiar 25,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|BRAVO_PV|CONCENTRACAO_FATOR|indexador:CDI",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "BRAVO_PV",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "95,8% do patrimônio responde ao mesmo fator (indexador = CDI), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "indexador",
        "valor": "CDI",
        "montante": 4600000,
        "plTotal": 4800000,
        "fracaoPl": 0.9583333333333334,
        "estado": "acompanhamento",
        "valorAnterior": 4600000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.7
        }
      },
      "calculo": "R$ 4.600.000 / R$ 4.800.000 = 95,8%, limiar 70,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|CEDRO_HLD|CONCENTRACAO_EMISSOR|banco-omega",
      "tipo": "CONCENTRACAO_EMISSOR",
      "carteira": "CEDRO_HLD",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "46,1% do patrimônio depende de um único emissor (Banco Omega).",
      "evidencias": {
        "emissorId": "banco-omega",
        "emissorNome": "Banco Omega",
        "valor": 4500000,
        "plTotal": 9760000,
        "fracaoPl": 0.4610655737704918,
        "estado": "acompanhamento",
        "valorAnterior": 4500000
      },
      "regra": {
        "nome": "radarConcentracaoEmissorPct",
        "limiar": {
          "radarConcentracaoEmissorPct": 0.25
        }
      },
      "calculo": "R$ 4.500.000 / R$ 9.760.000 = 46,1%, limiar 25,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|CEDRO_HLD|LIQUIDEZ_BAIXA|",
      "tipo": "LIQUIDEZ_BAIXA",
      "carteira": "CEDRO_HLD",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "A carteira tem 2,7% em liquidez, abaixo do piso de 5,0%.",
      "evidencias": {
        "liquidez": 260000,
        "plTotal": 9760000,
        "fracaoPl": 0.02663934426229508,
        "deficitRelativo": 0.46721311475409844,
        "estado": "acompanhamento",
        "valorAnterior": 260000
      },
      "regra": {
        "nome": "radarLiquidezMinPct",
        "limiar": {
          "radarLiquidezMinPct": 0.05
        }
      },
      "calculo": "déficit = (5,0% − 2,7%) / 5,0% = 46,7%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|CEDRO_HLD|VENCIMENTO_CONCENTRADO|90",
      "tipo": "VENCIMENTO_CONCENTRADO",
      "carteira": "CEDRO_HLD",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "46,1% do patrimônio vence nos próximos 90 dias.",
      "evidencias": {
        "valorVencendo": 4500000,
        "plTotal": 9760000,
        "fracaoPl": 0.4610655737704918,
        "titulos": 2,
        "janelaDias": 90,
        "estado": "acompanhamento",
        "valorAnterior": 4500000
      },
      "regra": {
        "nome": "radarVencimentoConcentradoPct",
        "limiar": {
          "radarVencimentoConcentradoPct": 0.15,
          "radarVencimentoJanelaDias": 90
        }
      },
      "calculo": "R$ 4.500.000 / R$ 9.760.000 = 46,1%, limiar 15,0% em 90d",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|ALPHA_01|CONCENTRACAO_FATOR|classeCanonica:credito-privado",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "ALPHA_01",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "90,1% do patrimônio responde ao mesmo fator (classeCanonica = credito-privado), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "classeCanonica",
        "valor": "credito-privado",
        "montante": 4450000,
        "plTotal": 4940000,
        "fracaoPl": 0.9008097165991903,
        "estado": "melhorado",
        "valorAnterior": 5696000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.7
        }
      },
      "calculo": "R$ 4.450.000 / R$ 4.940.000 = 90,1%, limiar 70,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|ALPHA_01|DETERIORACAO_PL|2026-07-25",
      "tipo": "DETERIORACAO_PL",
      "carteira": "ALPHA_01",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "O patrimônio caiu 21,9% desde 2026-07-25.",
      "evidencias": {
        "plAnterior": 6323200,
        "plAtual": 4940000,
        "delta": -1383200,
        "deltaPct": -0.21875,
        "baseData": "2026-07-25",
        "diasEntre": 30,
        "estado": "novo"
      },
      "regra": {
        "nome": "radarDeterioracaoPct",
        "limiar": {
          "radarDeterioracaoPct": 0.1,
          "radarDeterioracaoJanelaDias": 30
        }
      },
      "calculo": "(R$ 4.940.000 − R$ 6.323.200) / R$ 6.323.200 = -21,9%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24",
        "serie": [
          "2026-07-25",
          "2026-08-24"
        ]
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|BRAVO_PV|CONCENTRACAO_FATOR|classeCanonica:credito-privado",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "BRAVO_PV",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "87,5% do patrimônio responde ao mesmo fator (classeCanonica = credito-privado), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "classeCanonica",
        "valor": "credito-privado",
        "montante": 4200000,
        "plTotal": 4800000,
        "fracaoPl": 0.875,
        "estado": "acompanhamento",
        "valorAnterior": 4200000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.7
        }
      },
      "calculo": "R$ 4.200.000 / R$ 4.800.000 = 87,5%, limiar 70,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|CEDRO_HLD|CONCENTRACAO_ATIVO|CDB OMEGA VENCE SET",
      "tipo": "CONCENTRACAO_ATIVO",
      "carteira": "CEDRO_HLD",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "36,9% do patrimônio da carteira está num único ativo (CDB OMEGA VENCE SET).",
      "evidencias": {
        "ativo": "CDB OMEGA VENCE SET",
        "valor": 3600000,
        "plTotal": 9760000,
        "fracaoPl": 0.36885245901639346,
        "estado": "acompanhamento",
        "valorAnterior": 3600000
      },
      "regra": {
        "nome": "radarConcentracaoAtivoPct",
        "limiar": {
          "radarConcentracaoAtivoPct": 0.3
        }
      },
      "calculo": "R$ 3.600.000 / R$ 9.760.000 = 36,9%, limiar 30,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|CEDRO_HLD|CONCENTRACAO_FATOR|classeCanonica:credito-privado",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "CEDRO_HLD",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "87,1% do patrimônio responde ao mesmo fator (classeCanonica = credito-privado), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "classeCanonica",
        "valor": "credito-privado",
        "montante": 8500000,
        "plTotal": 9760000,
        "fracaoPl": 0.8709016393442623,
        "estado": "acompanhamento",
        "valorAnterior": 8500000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.7
        }
      },
      "calculo": "R$ 8.500.000 / R$ 9.760.000 = 87,1%, limiar 70,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|DUNAS_CAP|CONCENTRACAO_FATOR|indexador:IPCA",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "DUNAS_CAP",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "87,9% do patrimônio responde ao mesmo fator (indexador = IPCA), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "indexador",
        "valor": "IPCA",
        "montante": 14480000,
        "plTotal": 16480000,
        "fracaoPl": 0.8786407766990292,
        "estado": "acompanhamento",
        "valorAnterior": 14480000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.7
        }
      },
      "calculo": "R$ 14.480.000 / R$ 16.480.000 = 87,9%, limiar 70,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|FAROL_INV|CONCENTRACAO_FATOR|classeCanonica:internacional",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "FAROL_INV",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "86,5% do patrimônio responde ao mesmo fator (classeCanonica = internacional), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "classeCanonica",
        "valor": "internacional",
        "montante": 3200000,
        "plTotal": 3700000,
        "fracaoPl": 0.8648648648648649,
        "estado": "agravado",
        "valorAnterior": 2580000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.7
        }
      },
      "calculo": "R$ 3.200.000 / R$ 3.700.000 = 86,5%, limiar 70,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|FAROL_INV|CONCENTRACAO_FATOR|moeda:USD",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "FAROL_INV",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "86,5% do patrimônio responde ao mesmo fator (moeda = USD), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "moeda",
        "valor": "USD",
        "montante": 3200000,
        "plTotal": 3700000,
        "fracaoPl": 0.8648648648648649,
        "estado": "agravado",
        "valorAnterior": 2580000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.7
        }
      },
      "calculo": "R$ 3.200.000 / R$ 3.700.000 = 86,5%, limiar 70,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|FAROL_INV|CONCENTRACAO_FATOR|regiao:eua",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "FAROL_INV",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "86,5% do patrimônio responde ao mesmo fator (regiao = eua), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "regiao",
        "valor": "eua",
        "montante": 3200000,
        "plTotal": 3700000,
        "fracaoPl": 0.8648648648648649,
        "estado": "agravado",
        "valorAnterior": 2580000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.7
        }
      },
      "calculo": "R$ 3.200.000 / R$ 3.700.000 = 86,5%, limiar 70,0%",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "alta"
    }
  ]
};
})();
