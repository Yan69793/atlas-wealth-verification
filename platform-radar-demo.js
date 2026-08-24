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
    "radarConcentracaoAtivoPct": 0.2,
    "radarConcentracaoEmissorPct": 0.15,
    "radarConcentracaoFatorPct": 0.5,
    "radarLiquidezMinPct": 0.05,
    "radarVencimentoConcentradoPct": 0.2,
    "radarVencimentoJanelaDias": 30,
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
      "plTotal": 4300000,
      "sinais": [
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "alta",
          "rotulo": "eua",
          "chave": "regiao:eua",
          "estado": "agravado",
          "valorAnterior": 2580000,
          "fator": "regiao",
          "valor": 3200000,
          "fracaoPl": 0.7441860465116279,
          "cobertura": 1,
          "insightId": "2026-08-24|FAROL_INV|CONCENTRACAO_FATOR|regiao:eua"
        },
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "alta",
          "rotulo": "internacional",
          "chave": "classeCanonica:internacional",
          "estado": "agravado",
          "valorAnterior": 2580000,
          "fator": "classeCanonica",
          "valor": 3200000,
          "fracaoPl": 0.7441860465116279,
          "cobertura": 1,
          "insightId": "2026-08-24|FAROL_INV|CONCENTRACAO_FATOR|classeCanonica:internacional"
        },
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "alta",
          "rotulo": "USD",
          "chave": "moeda:USD",
          "estado": "agravado",
          "valorAnterior": 2580000,
          "fator": "moeda",
          "valor": 3200000,
          "fracaoPl": 0.7441860465116279,
          "cobertura": 1,
          "insightId": "2026-08-24|FAROL_INV|CONCENTRACAO_FATOR|moeda:USD"
        }
      ],
      "pior": "alta",
      "estado": "agravado",
      "faixaCobertura": "afirma",
      "maiorExposicao": 3200000
    },
    {
      "carteira": "CEDRO_HLD",
      "plTotal": 7960000,
      "sinais": [
        {
          "tipo": "VENCIMENTO_CONCENTRADO",
          "severidade": "alta",
          "rotulo": "30 dias",
          "chave": "30",
          "estado": "novo",
          "valorAnterior": null,
          "valor": 2700000,
          "fracaoPl": 0.3391959798994975,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|VENCIMENTO_CONCENTRADO|30"
        },
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "alta",
          "rotulo": "credito-privado",
          "chave": "classeCanonica:credito-privado",
          "estado": "acompanhamento",
          "valorAnterior": 6700000,
          "fator": "classeCanonica",
          "valor": 6700000,
          "fracaoPl": 0.8417085427135679,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|CONCENTRACAO_FATOR|classeCanonica:credito-privado"
        },
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "alta",
          "rotulo": "IPCA",
          "chave": "indexador:IPCA",
          "estado": "acompanhamento",
          "valorAnterior": 4000000,
          "fator": "indexador",
          "valor": 4000000,
          "fracaoPl": 0.5025125628140703,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|CONCENTRACAO_FATOR|indexador:IPCA"
        },
        {
          "tipo": "CONCENTRACAO_EMISSOR",
          "severidade": "alta",
          "rotulo": "Banco Omega",
          "chave": "banco-omega",
          "estado": "acompanhamento",
          "valorAnterior": 2700000,
          "valor": 2700000,
          "fracaoPl": 0.3391959798994975,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|CONCENTRACAO_EMISSOR|banco-omega"
        },
        {
          "tipo": "LIQUIDEZ_BAIXA",
          "severidade": "alta",
          "rotulo": "liquidez",
          "chave": "",
          "estado": "acompanhamento",
          "valorAnterior": 260000,
          "valor": 260000,
          "fracaoPl": 0.032663316582914576,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|LIQUIDEZ_BAIXA|"
        },
        {
          "tipo": "CONCENTRACAO_ATIVO",
          "severidade": "media",
          "rotulo": "CDB OMEGA VENCE SET",
          "chave": "CDB OMEGA VENCE SET",
          "estado": "acompanhamento",
          "valorAnterior": 1800000,
          "valor": 1800000,
          "fracaoPl": 0.22613065326633167,
          "cobertura": 1,
          "insightId": "2026-08-24|CEDRO_HLD|CONCENTRACAO_ATIVO|CDB OMEGA VENCE SET"
        }
      ],
      "pior": "alta",
      "estado": "novo",
      "faixaCobertura": "afirma",
      "maiorExposicao": 6700000
    },
    {
      "carteira": "ALPHA_01",
      "plTotal": 4050000,
      "sinais": [
        {
          "tipo": "DETERIORACAO_PL",
          "severidade": "media",
          "rotulo": "desde 2026-07-25",
          "chave": "",
          "estado": "novo",
          "valorAnterior": null,
          "valor": 1134000,
          "fracaoPl": -0.21875,
          "cobertura": 1,
          "insightId": "2026-08-24|ALPHA_01|DETERIORACAO_PL|2026-07-25"
        },
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "alta",
          "rotulo": "credito-privado",
          "chave": "classeCanonica:credito-privado",
          "estado": "melhorado",
          "valorAnterior": 4556800,
          "fator": "classeCanonica",
          "valor": 3560000,
          "fracaoPl": 0.8790123456790123,
          "cobertura": 1,
          "insightId": "2026-08-24|ALPHA_01|CONCENTRACAO_FATOR|classeCanonica:credito-privado"
        },
        {
          "tipo": "CONCENTRACAO_EMISSOR",
          "severidade": "media",
          "rotulo": "Banco Zeta",
          "chave": "banco-zeta",
          "estado": "melhorado",
          "valorAnterior": 972800,
          "valor": 760000,
          "fracaoPl": 0.18765432098765433,
          "cobertura": 1,
          "insightId": "2026-08-24|ALPHA_01|CONCENTRACAO_EMISSOR|banco-zeta"
        }
      ],
      "pior": "alta",
      "estado": "novo",
      "faixaCobertura": "afirma",
      "maiorExposicao": 3560000
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
          "severidade": "alta",
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
      "plTotal": 3960000,
      "sinais": [
        {
          "tipo": "CONCENTRACAO_FATOR",
          "severidade": "alta",
          "rotulo": "IPCA",
          "chave": "indexador:IPCA",
          "estado": "acompanhamento",
          "valorAnterior": 3610000,
          "fator": "indexador",
          "valor": 3610000,
          "fracaoPl": 0.9116161616161617,
          "cobertura": 1,
          "insightId": "2026-08-24|DUNAS_CAP|CONCENTRACAO_FATOR|indexador:IPCA"
        }
      ],
      "pior": "alta",
      "estado": "acompanhamento",
      "faixaCobertura": "afirma",
      "maiorExposicao": 3610000
    },
    {
      "carteira": "ESTRELA_PV",
      "plTotal": 3500000,
      "sinais": [
        {
          "tipo": "CONCENTRACAO_ATIVO",
          "severidade": "media",
          "rotulo": "ESTRUTURADO XPTO I",
          "chave": "ESTRUTURADO XPTO I",
          "estado": "acompanhamento",
          "valorAnterior": 900000,
          "valor": 900000,
          "fracaoPl": 0.2571428571428571,
          "cobertura": 1,
          "insightId": "2026-08-24|ESTRELA_PV|CONCENTRACAO_ATIVO|ESTRUTURADO XPTO I"
        }
      ],
      "pior": "media",
      "estado": "acompanhamento",
      "faixaCobertura": "insuficiente",
      "maiorExposicao": 900000
    }
  ],
  "encerrados": [
    {
      "carteira": "FAROL_INV",
      "tipo": "CONCENTRACAO_FATOR",
      "chave": "indexador:BOLSA",
      "rotulo": "BOLSA",
      "severidadeAnterior": "alta",
      "valorAnterior": 2100000,
      "motivo": "sinal-saiu"
    },
    {
      "carteira": "FAROL_INV",
      "tipo": "CONCENTRACAO_ATIVO",
      "chave": "ETF EUA FAROL CONCENTRADO",
      "rotulo": "ETF EUA FAROL CONCENTRADO",
      "severidadeAnterior": "alta",
      "valorAnterior": 1200000,
      "motivo": "sinal-saiu"
    },
    {
      "carteira": "FAROL_INV",
      "tipo": "CONCENTRACAO_EMISSOR",
      "chave": "gestora-etf-eua-farol-concentrado",
      "rotulo": "Gestora etf-eua-farol-concentrado",
      "severidadeAnterior": "alta",
      "valorAnterior": 1200000,
      "motivo": "sinal-saiu"
    }
  ],
  "temAnterior": true,
  "emissores": [
    {
      "emissorId": "banco-omega",
      "emissorNome": "Banco Omega",
      "valor": 2700000,
      "fracaoCasa": 0.09450472523626181,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.3391959798994975,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "banco-zeta",
      "emissorNome": "Banco Zeta",
      "valor": 760000,
      "fracaoCasa": 0.026601330066503327,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.18765432098765433,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-fii-cedro",
      "emissorNome": "Gestora fii-cedro",
      "valor": 1000000,
      "fracaoCasa": 0.03500175008750438,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.12562814070351758,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-cedro-0",
      "emissorNome": "Gestora deb-cedro-0",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.05025125628140704,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-cedro-1",
      "emissorNome": "Gestora deb-cedro-1",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.05025125628140704,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-cedro-2",
      "emissorNome": "Gestora deb-cedro-2",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.05025125628140704,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-cedro-3",
      "emissorNome": "Gestora deb-cedro-3",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.05025125628140704,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-cedro-4",
      "emissorNome": "Gestora deb-cedro-4",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.05025125628140704,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-cedro-5",
      "emissorNome": "Gestora deb-cedro-5",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.05025125628140704,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-cedro-6",
      "emissorNome": "Gestora deb-cedro-6",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.05025125628140704,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-cedro-7",
      "emissorNome": "Gestora deb-cedro-7",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.05025125628140704,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-cedro-8",
      "emissorNome": "Gestora deb-cedro-8",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.05025125628140704,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-cedro-9",
      "emissorNome": "Gestora deb-cedro-9",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.05025125628140704,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-di-bravo",
      "emissorNome": "Gestora di-bravo",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.08333333333333333,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-etf-eua-farol-0",
      "emissorNome": "Gestora etf-eua-farol-0",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.09302325581395349,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-etf-eua-farol-1",
      "emissorNome": "Gestora etf-eua-farol-1",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.09302325581395349,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-etf-eua-farol-2",
      "emissorNome": "Gestora etf-eua-farol-2",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.09302325581395349,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-etf-eua-farol-3",
      "emissorNome": "Gestora etf-eua-farol-3",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.09302325581395349,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-etf-eua-farol-4",
      "emissorNome": "Gestora etf-eua-farol-4",
      "valor": 400000,
      "fracaoCasa": 0.01400070003500175,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.09302325581395349,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-di-dunas",
      "emissorNome": "Gestora di-dunas",
      "valor": 350000,
      "fracaoCasa": 0.012250612530626532,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.08838383838383838,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-bond-usd-farol-0",
      "emissorNome": "Gestora bond-usd-farol-0",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.06976744186046512,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-bond-usd-farol-1",
      "emissorNome": "Gestora bond-usd-farol-1",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.06976744186046512,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-bond-usd-farol-2",
      "emissorNome": "Gestora bond-usd-farol-2",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.06976744186046512,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-bond-usd-farol-3",
      "emissorNome": "Gestora bond-usd-farol-3",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.06976744186046512,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-bravo-0",
      "emissorNome": "Gestora cdb-bravo-0",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-bravo-1",
      "emissorNome": "Gestora cdb-bravo-1",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-bravo-2",
      "emissorNome": "Gestora cdb-bravo-2",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-bravo-3",
      "emissorNome": "Gestora cdb-bravo-3",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-bravo-4",
      "emissorNome": "Gestora cdb-bravo-4",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-bravo-5",
      "emissorNome": "Gestora cdb-bravo-5",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cra-bravo-0",
      "emissorNome": "Gestora cra-bravo-0",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cra-bravo-1",
      "emissorNome": "Gestora cra-bravo-1",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cra-bravo-2",
      "emissorNome": "Gestora cra-bravo-2",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cx-farol",
      "emissorNome": "Gestora cx-farol",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.06976744186046512,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-bravo-0",
      "emissorNome": "Gestora deb-bravo-0",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-bravo-1",
      "emissorNome": "Gestora deb-bravo-1",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-bravo-2",
      "emissorNome": "Gestora deb-bravo-2",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-bravo-3",
      "emissorNome": "Gestora deb-bravo-3",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-bravo-4",
      "emissorNome": "Gestora deb-bravo-4",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.0625,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-ntn-b-dunas-0",
      "emissorNome": "Gestora ntn-b-dunas-0",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07575757575757576,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-ntn-b-dunas-1",
      "emissorNome": "Gestora ntn-b-dunas-1",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07575757575757576,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-ntn-b-dunas-2",
      "emissorNome": "Gestora ntn-b-dunas-2",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07575757575757576,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-ntn-b-dunas-3",
      "emissorNome": "Gestora ntn-b-dunas-3",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07575757575757576,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-ntn-b-dunas-4",
      "emissorNome": "Gestora ntn-b-dunas-4",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07575757575757576,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-ntn-b-dunas-5",
      "emissorNome": "Gestora ntn-b-dunas-5",
      "valor": 300000,
      "fracaoCasa": 0.010500525026251312,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.07575757575757576,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cx-cedro",
      "emissorNome": "Gestora cx-cedro",
      "valor": 260000,
      "fracaoCasa": 0.009100455022751138,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "maiorFracaoEmCarteira": 0.032663316582914576,
      "carteiraMaisExposta": "CEDRO_HLD",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-0",
      "emissorNome": "Gestora deb-ipca-dunas-0",
      "valor": 250000,
      "fracaoCasa": 0.008750437521876094,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06313131313131314,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-1",
      "emissorNome": "Gestora deb-ipca-dunas-1",
      "valor": 250000,
      "fracaoCasa": 0.008750437521876094,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06313131313131314,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-2",
      "emissorNome": "Gestora deb-ipca-dunas-2",
      "valor": 250000,
      "fracaoCasa": 0.008750437521876094,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06313131313131314,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-3",
      "emissorNome": "Gestora deb-ipca-dunas-3",
      "valor": 250000,
      "fracaoCasa": 0.008750437521876094,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06313131313131314,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-4",
      "emissorNome": "Gestora deb-ipca-dunas-4",
      "valor": 250000,
      "fracaoCasa": 0.008750437521876094,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06313131313131314,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-5",
      "emissorNome": "Gestora deb-ipca-dunas-5",
      "valor": 250000,
      "fracaoCasa": 0.008750437521876094,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06313131313131314,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-ipca-dunas-6",
      "emissorNome": "Gestora deb-ipca-dunas-6",
      "valor": 250000,
      "fracaoCasa": 0.008750437521876094,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.06313131313131314,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-di-alfa",
      "emissorNome": "Gestora di-alfa",
      "valor": 250000,
      "fracaoCasa": 0.008750437521876094,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.06172839506172839,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-multi-beta",
      "emissorNome": "Gestora multi-beta",
      "valor": 240000,
      "fracaoCasa": 0.00840042002100105,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.05925925925925926,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-estrela-0",
      "emissorNome": "Gestora cdb-estrela-0",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ESTRELA_PV"
      ],
      "maiorFracaoEmCarteira": 0.05714285714285714,
      "carteiraMaisExposta": "ESTRELA_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-estrela-1",
      "emissorNome": "Gestora cdb-estrela-1",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ESTRELA_PV"
      ],
      "maiorFracaoEmCarteira": 0.05714285714285714,
      "carteiraMaisExposta": "ESTRELA_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-estrela-2",
      "emissorNome": "Gestora cdb-estrela-2",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ESTRELA_PV"
      ],
      "maiorFracaoEmCarteira": 0.05714285714285714,
      "carteiraMaisExposta": "ESTRELA_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-estrela-3",
      "emissorNome": "Gestora cdb-estrela-3",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ESTRELA_PV"
      ],
      "maiorFracaoEmCarteira": 0.05714285714285714,
      "carteiraMaisExposta": "ESTRELA_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-farol-0",
      "emissorNome": "Gestora cdb-farol-0",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.046511627906976744,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-farol-1",
      "emissorNome": "Gestora cdb-farol-1",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.046511627906976744,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-farol-2",
      "emissorNome": "Gestora cdb-farol-2",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.046511627906976744,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cdb-farol-3",
      "emissorNome": "Gestora cdb-farol-3",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "FAROL_INV"
      ],
      "maiorFracaoEmCarteira": 0.046511627906976744,
      "carteiraMaisExposta": "FAROL_INV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cra-alpha-0",
      "emissorNome": "Gestora cra-alpha-0",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cra-alpha-1",
      "emissorNome": "Gestora cra-alpha-1",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cra-alpha-2",
      "emissorNome": "Gestora cra-alpha-2",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cra-alpha-3",
      "emissorNome": "Gestora cra-alpha-3",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cra-alpha-4",
      "emissorNome": "Gestora cra-alpha-4",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cra-alpha-5",
      "emissorNome": "Gestora cra-alpha-5",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-cx-estrela",
      "emissorNome": "Gestora cx-estrela",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ESTRELA_PV"
      ],
      "maiorFracaoEmCarteira": 0.05714285714285714,
      "carteiraMaisExposta": "ESTRELA_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-alpha-0",
      "emissorNome": "Gestora deb-alpha-0",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-alpha-1",
      "emissorNome": "Gestora deb-alpha-1",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-alpha-2",
      "emissorNome": "Gestora deb-alpha-2",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-alpha-3",
      "emissorNome": "Gestora deb-alpha-3",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-alpha-4",
      "emissorNome": "Gestora deb-alpha-4",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-alpha-5",
      "emissorNome": "Gestora deb-alpha-5",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-alpha-6",
      "emissorNome": "Gestora deb-alpha-6",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-deb-alpha-7",
      "emissorNome": "Gestora deb-alpha-7",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "ALPHA_01"
      ],
      "maiorFracaoEmCarteira": 0.04938271604938271,
      "carteiraMaisExposta": "ALPHA_01",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "gestora-ntnb-bravo",
      "emissorNome": "Gestora ntnb-bravo",
      "valor": 200000,
      "fracaoCasa": 0.007000350017500875,
      "carteiras": [
        "BRAVO_PV"
      ],
      "maiorFracaoEmCarteira": 0.041666666666666664,
      "carteiraMaisExposta": "BRAVO_PV",
      "cobertura": 0.912495624781239
    },
    {
      "emissorId": "metalurgica-aurora",
      "emissorNome": "Metalurgica Aurora",
      "valor": 60000,
      "fracaoCasa": 0.0021001050052502626,
      "carteiras": [
        "DUNAS_CAP"
      ],
      "maiorFracaoEmCarteira": 0.015151515151515152,
      "carteiraMaisExposta": "DUNAS_CAP",
      "cobertura": 0.912495624781239
    }
  ],
  "fatores": [
    {
      "fator": "moeda",
      "valor": "BRL",
      "montante": 22870000,
      "fracaoCasa": 0.8004900245012251,
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
      "cobertura": 0.912495624781239
    },
    {
      "fator": "regiao",
      "valor": "brasil",
      "montante": 22870000,
      "fracaoCasa": 0.8004900245012251,
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
      "cobertura": 0.912495624781239
    },
    {
      "fator": "classeCanonica",
      "valor": "credito-privado",
      "montante": 17870000,
      "fracaoCasa": 0.6254812740637031,
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
      "cobertura": 0.912495624781239
    },
    {
      "fator": "indexador",
      "valor": "IPCA",
      "montante": 9660000,
      "fracaoCasa": 0.33811690584529225,
      "carteiras": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP"
      ],
      "carteirasConcentradas": [
        "CEDRO_HLD",
        "DUNAS_CAP"
      ],
      "cobertura": 0.912495624781239
    },
    {
      "fator": "indexador",
      "valor": "CDI",
      "montante": 11970000,
      "fracaoCasa": 0.4189709485474274,
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
      "cobertura": 0.912495624781239
    },
    {
      "fator": "classeCanonica",
      "valor": "internacional",
      "montante": 3200000,
      "fracaoCasa": 0.112005600280014,
      "carteiras": [
        "FAROL_INV"
      ],
      "carteirasConcentradas": [
        "FAROL_INV"
      ],
      "cobertura": 0.912495624781239
    },
    {
      "fator": "moeda",
      "valor": "USD",
      "montante": 3200000,
      "fracaoCasa": 0.112005600280014,
      "carteiras": [
        "FAROL_INV"
      ],
      "carteirasConcentradas": [
        "FAROL_INV"
      ],
      "cobertura": 0.912495624781239
    },
    {
      "fator": "regiao",
      "valor": "eua",
      "montante": 3200000,
      "fracaoCasa": 0.112005600280014,
      "carteiras": [
        "FAROL_INV"
      ],
      "carteirasConcentradas": [
        "FAROL_INV"
      ],
      "cobertura": 0.912495624781239
    },
    {
      "fator": "classeCanonica",
      "valor": "renda-fixa",
      "montante": 2000000,
      "fracaoCasa": 0.07000350017500875,
      "carteiras": [
        "BRAVO_PV",
        "DUNAS_CAP"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.912495624781239
    },
    {
      "fator": "indexador",
      "valor": "BOLSA",
      "montante": 2000000,
      "fracaoCasa": 0.07000350017500875,
      "carteiras": [
        "FAROL_INV"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.912495624781239
    },
    {
      "fator": "classeCanonica",
      "valor": "liquidez",
      "montante": 1760000,
      "fracaoCasa": 0.0616030801540077,
      "carteiras": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "ESTRELA_PV",
        "FAROL_INV"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.912495624781239
    },
    {
      "fator": "indexador",
      "valor": "MULTI",
      "montante": 1240000,
      "fracaoCasa": 0.043402170108505424,
      "carteiras": [
        "ALPHA_01",
        "CEDRO_HLD"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.912495624781239
    },
    {
      "fator": "indexador",
      "valor": "CAMBIO",
      "montante": 1200000,
      "fracaoCasa": 0.04200210010500525,
      "carteiras": [
        "FAROL_INV"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.912495624781239
    },
    {
      "fator": "classeCanonica",
      "valor": "imobiliario",
      "montante": 1000000,
      "fracaoCasa": 0.03500175008750438,
      "carteiras": [
        "CEDRO_HLD"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.912495624781239
    },
    {
      "fator": "classeCanonica",
      "valor": "multimercado",
      "montante": 240000,
      "fracaoCasa": 0.00840042002100105,
      "carteiras": [
        "ALPHA_01"
      ],
      "carteirasConcentradas": [],
      "cobertura": 0.912495624781239
    }
  ],
  "deterioracao": [
    {
      "carteira": "ALPHA_01",
      "plAnterior": 5184000,
      "plAtual": 4050000,
      "delta": -1134000,
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
      "plTotal": 4050000,
      "posicoes": 19,
      "atributos": [
        {
          "atributo": "classeCanonica",
          "plCoberto": 4050000,
          "plTotal": 4050000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "indexador",
          "plCoberto": 4050000,
          "plTotal": 4050000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "emissorId",
          "plCoberto": 4050000,
          "plTotal": 4050000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "moeda",
          "plCoberto": 4050000,
          "plTotal": 4050000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "regiao",
          "plCoberto": 4050000,
          "plTotal": 4050000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "prazoAnos",
          "plCoberto": 4050000,
          "plTotal": 4050000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "liquidezDias",
          "plCoberto": 4050000,
          "plTotal": 4050000,
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
      "plTotal": 7960000,
      "posicoes": 14,
      "atributos": [
        {
          "atributo": "classeCanonica",
          "plCoberto": 7960000,
          "plTotal": 7960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "indexador",
          "plCoberto": 7960000,
          "plTotal": 7960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "emissorId",
          "plCoberto": 7960000,
          "plTotal": 7960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "moeda",
          "plCoberto": 7960000,
          "plTotal": 7960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "regiao",
          "plCoberto": 7960000,
          "plTotal": 7960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "prazoAnos",
          "plCoberto": 7960000,
          "plTotal": 7960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "liquidezDias",
          "plCoberto": 7960000,
          "plTotal": 7960000,
          "fracao": 1,
          "faixa": "afirma"
        }
      ],
      "faixaGlobal": "afirma",
      "fracaoMedia": 1
    },
    {
      "carteira": "DUNAS_CAP",
      "plTotal": 3960000,
      "posicoes": 15,
      "atributos": [
        {
          "atributo": "classeCanonica",
          "plCoberto": 3960000,
          "plTotal": 3960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "indexador",
          "plCoberto": 3960000,
          "plTotal": 3960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "emissorId",
          "plCoberto": 3960000,
          "plTotal": 3960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "moeda",
          "plCoberto": 3960000,
          "plTotal": 3960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "regiao",
          "plCoberto": 3960000,
          "plTotal": 3960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "prazoAnos",
          "plCoberto": 3960000,
          "plTotal": 3960000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "liquidezDias",
          "plCoberto": 3960000,
          "plTotal": 3960000,
          "fracao": 1,
          "faixa": "afirma"
        }
      ],
      "faixaGlobal": "afirma",
      "fracaoMedia": 1
    },
    {
      "carteira": "FAROL_INV",
      "plTotal": 4300000,
      "posicoes": 14,
      "atributos": [
        {
          "atributo": "classeCanonica",
          "plCoberto": 4300000,
          "plTotal": 4300000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "indexador",
          "plCoberto": 4300000,
          "plTotal": 4300000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "emissorId",
          "plCoberto": 4300000,
          "plTotal": 4300000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "moeda",
          "plCoberto": 4300000,
          "plTotal": 4300000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "regiao",
          "plCoberto": 4300000,
          "plTotal": 4300000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "prazoAnos",
          "plCoberto": 4300000,
          "plTotal": 4300000,
          "fracao": 1,
          "faixa": "afirma"
        },
        {
          "atributo": "liquidezDias",
          "plCoberto": 4300000,
          "plTotal": 4300000,
          "fracao": 1,
          "faixa": "afirma"
        }
      ],
      "faixaGlobal": "afirma",
      "fracaoMedia": 1
    }
  ],
  "coberturaCasa": {
    "plTotal": 28570000,
    "carteiras": 6,
    "atributos": [
      {
        "atributo": "classeCanonica",
        "plCoberto": 26070000,
        "plTotal": 28570000,
        "fracao": 0.912495624781239,
        "faixa": "afirma"
      },
      {
        "atributo": "indexador",
        "plCoberto": 26070000,
        "plTotal": 28570000,
        "fracao": 0.912495624781239,
        "faixa": "afirma"
      },
      {
        "atributo": "emissorId",
        "plCoberto": 26070000,
        "plTotal": 28570000,
        "fracao": 0.912495624781239,
        "faixa": "afirma"
      },
      {
        "atributo": "moeda",
        "plCoberto": 26070000,
        "plTotal": 28570000,
        "fracao": 0.912495624781239,
        "faixa": "afirma"
      },
      {
        "atributo": "regiao",
        "plCoberto": 26070000,
        "plTotal": 28570000,
        "fracao": 0.912495624781239,
        "faixa": "afirma"
      },
      {
        "atributo": "prazoAnos",
        "plCoberto": 26070000,
        "plTotal": 28570000,
        "fracao": 0.912495624781239,
        "faixa": "afirma"
      },
      {
        "atributo": "liquidezDias",
        "plCoberto": 26070000,
        "plTotal": 28570000,
        "fracao": 0.912495624781239,
        "faixa": "afirma"
      }
    ],
    "faixaGlobal": "afirma"
  },
  "insights": [
    {
      "schema": "insight/v1",
      "id": "2026-08-24|ALPHA_01|CONCENTRACAO_FATOR|classeCanonica:credito-privado",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "ALPHA_01",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "87,9% do patrimônio responde ao mesmo fator (classeCanonica = credito-privado), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "classeCanonica",
        "valor": "credito-privado",
        "montante": 3560000,
        "plTotal": 4050000,
        "fracaoPl": 0.8790123456790123,
        "estado": "melhorado",
        "valorAnterior": 4556800
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.5
        }
      },
      "calculo": "R$ 3.560.000 / R$ 4.050.000 = 87,9%, limiar 50,0%",
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
      "id": "2026-08-24|BRAVO_PV|CONCENTRACAO_FATOR|classeCanonica:credito-privado",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "BRAVO_PV",
      "tenantId": "demo",
      "severidade": "alta",
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
          "radarConcentracaoFatorPct": 0.5
        }
      },
      "calculo": "R$ 4.200.000 / R$ 4.800.000 = 87,5%, limiar 50,0%",
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
          "radarConcentracaoFatorPct": 0.5
        }
      },
      "calculo": "R$ 4.600.000 / R$ 4.800.000 = 95,8%, limiar 50,0%",
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
      "afirmacao": "33,9% do patrimônio depende de um único emissor (Banco Omega).",
      "evidencias": {
        "emissorId": "banco-omega",
        "emissorNome": "Banco Omega",
        "valor": 2700000,
        "plTotal": 7960000,
        "fracaoPl": 0.3391959798994975,
        "estado": "acompanhamento",
        "valorAnterior": 2700000
      },
      "regra": {
        "nome": "radarConcentracaoEmissorPct",
        "limiar": {
          "radarConcentracaoEmissorPct": 0.15
        }
      },
      "calculo": "R$ 2.700.000 / R$ 7.960.000 = 33,9%, limiar 15,0%",
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
      "severidade": "alta",
      "afirmacao": "84,2% do patrimônio responde ao mesmo fator (classeCanonica = credito-privado), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "classeCanonica",
        "valor": "credito-privado",
        "montante": 6700000,
        "plTotal": 7960000,
        "fracaoPl": 0.8417085427135679,
        "estado": "acompanhamento",
        "valorAnterior": 6700000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.5
        }
      },
      "calculo": "R$ 6.700.000 / R$ 7.960.000 = 84,2%, limiar 50,0%",
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
      "id": "2026-08-24|CEDRO_HLD|CONCENTRACAO_FATOR|indexador:IPCA",
      "tipo": "CONCENTRACAO_FATOR",
      "carteira": "CEDRO_HLD",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "50,3% do patrimônio responde ao mesmo fator (indexador = IPCA), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "indexador",
        "valor": "IPCA",
        "montante": 4000000,
        "plTotal": 7960000,
        "fracaoPl": 0.5025125628140703,
        "estado": "acompanhamento",
        "valorAnterior": 4000000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.5
        }
      },
      "calculo": "R$ 4.000.000 / R$ 7.960.000 = 50,3%, limiar 50,0%",
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
      "afirmacao": "A carteira tem 3,3% em liquidez, abaixo do piso de 5,0%.",
      "evidencias": {
        "liquidez": 260000,
        "plTotal": 7960000,
        "fracaoPl": 0.032663316582914576,
        "deficitRelativo": 0.34673366834170855,
        "estado": "acompanhamento",
        "valorAnterior": 260000
      },
      "regra": {
        "nome": "radarLiquidezMinPct",
        "limiar": {
          "radarLiquidezMinPct": 0.05
        }
      },
      "calculo": "déficit = (5,0% − 3,3%) / 5,0% = 34,7%",
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
      "id": "2026-08-24|CEDRO_HLD|VENCIMENTO_CONCENTRADO|30",
      "tipo": "VENCIMENTO_CONCENTRADO",
      "carteira": "CEDRO_HLD",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "33,9% do patrimônio vence nos próximos 30 dias.",
      "evidencias": {
        "valorVencendo": 2700000,
        "plTotal": 7960000,
        "fracaoPl": 0.3391959798994975,
        "titulos": 2,
        "janelaDias": 30,
        "estado": "novo"
      },
      "regra": {
        "nome": "radarVencimentoConcentradoPct",
        "limiar": {
          "radarVencimentoConcentradoPct": 0.2,
          "radarVencimentoJanelaDias": 30
        }
      },
      "calculo": "R$ 2.700.000 / R$ 7.960.000 = 33,9%, limiar 20,0% em 30d",
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
      "severidade": "alta",
      "afirmacao": "91,2% do patrimônio responde ao mesmo fator (indexador = IPCA), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "indexador",
        "valor": "IPCA",
        "montante": 3610000,
        "plTotal": 3960000,
        "fracaoPl": 0.9116161616161617,
        "estado": "acompanhamento",
        "valorAnterior": 3610000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.5
        }
      },
      "calculo": "R$ 3.610.000 / R$ 3.960.000 = 91,2%, limiar 50,0%",
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
      "severidade": "alta",
      "afirmacao": "74,4% do patrimônio responde ao mesmo fator (classeCanonica = internacional), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "classeCanonica",
        "valor": "internacional",
        "montante": 3200000,
        "plTotal": 4300000,
        "fracaoPl": 0.7441860465116279,
        "estado": "agravado",
        "valorAnterior": 2580000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.5
        }
      },
      "calculo": "R$ 3.200.000 / R$ 4.300.000 = 74,4%, limiar 50,0%",
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
      "severidade": "alta",
      "afirmacao": "74,4% do patrimônio responde ao mesmo fator (moeda = USD), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "moeda",
        "valor": "USD",
        "montante": 3200000,
        "plTotal": 4300000,
        "fracaoPl": 0.7441860465116279,
        "estado": "agravado",
        "valorAnterior": 2580000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.5
        }
      },
      "calculo": "R$ 3.200.000 / R$ 4.300.000 = 74,4%, limiar 50,0%",
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
      "severidade": "alta",
      "afirmacao": "74,4% do patrimônio responde ao mesmo fator (regiao = eua), mesmo com ativos diferentes.",
      "evidencias": {
        "fator": "regiao",
        "valor": "eua",
        "montante": 3200000,
        "plTotal": 4300000,
        "fracaoPl": 0.7441860465116279,
        "estado": "agravado",
        "valorAnterior": 2580000
      },
      "regra": {
        "nome": "radarConcentracaoFatorPct",
        "limiar": {
          "radarConcentracaoFatorPct": 0.5
        }
      },
      "calculo": "R$ 3.200.000 / R$ 4.300.000 = 74,4%, limiar 50,0%",
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
      "id": "2026-08-24|ALPHA_01|CONCENTRACAO_EMISSOR|banco-zeta",
      "tipo": "CONCENTRACAO_EMISSOR",
      "carteira": "ALPHA_01",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "18,8% do patrimônio depende de um único emissor (Banco Zeta).",
      "evidencias": {
        "emissorId": "banco-zeta",
        "emissorNome": "Banco Zeta",
        "valor": 760000,
        "plTotal": 4050000,
        "fracaoPl": 0.18765432098765433,
        "estado": "melhorado",
        "valorAnterior": 972800
      },
      "regra": {
        "nome": "radarConcentracaoEmissorPct",
        "limiar": {
          "radarConcentracaoEmissorPct": 0.15
        }
      },
      "calculo": "R$ 760.000 / R$ 4.050.000 = 18,8%, limiar 15,0%",
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
        "plAnterior": 5184000,
        "plAtual": 4050000,
        "delta": -1134000,
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
      "calculo": "(R$ 4.050.000 − R$ 5.184.000) / R$ 5.184.000 = -21,9%",
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
      "id": "2026-08-24|CEDRO_HLD|CONCENTRACAO_ATIVO|CDB OMEGA VENCE SET",
      "tipo": "CONCENTRACAO_ATIVO",
      "carteira": "CEDRO_HLD",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "22,6% do patrimônio da carteira está num único ativo (CDB OMEGA VENCE SET).",
      "evidencias": {
        "ativo": "CDB OMEGA VENCE SET",
        "valor": 1800000,
        "plTotal": 7960000,
        "fracaoPl": 0.22613065326633167,
        "estado": "acompanhamento",
        "valorAnterior": 1800000
      },
      "regra": {
        "nome": "radarConcentracaoAtivoPct",
        "limiar": {
          "radarConcentracaoAtivoPct": 0.2
        }
      },
      "calculo": "R$ 1.800.000 / R$ 7.960.000 = 22,6%, limiar 20,0%",
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
      "id": "2026-08-24|ESTRELA_PV|CONCENTRACAO_ATIVO|ESTRUTURADO XPTO I",
      "tipo": "CONCENTRACAO_ATIVO",
      "carteira": "ESTRELA_PV",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "25,7% do patrimônio da carteira está num único ativo (ESTRUTURADO XPTO I).",
      "evidencias": {
        "ativo": "ESTRUTURADO XPTO I",
        "valor": 900000,
        "plTotal": 3500000,
        "fracaoPl": 0.2571428571428571,
        "estado": "acompanhamento",
        "valorAnterior": 900000
      },
      "regra": {
        "nome": "radarConcentracaoAtivoPct",
        "limiar": {
          "radarConcentracaoAtivoPct": 0.2
        }
      },
      "calculo": "R$ 900.000 / R$ 3.500.000 = 25,7%, limiar 20,0%",
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
