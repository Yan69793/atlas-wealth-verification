/* platform-credito-demo.js — fallback sintetico de window.ATLAS_CREDITO_DATA

   GERADO POR scripts/gerar-credito-demo.mjs. Nao editar a mao: rode o script.

   Eventos de credito ficticios cruzados com as carteiras da casa sintetica.
   Roda duas datas para os cinco estados (novo, acompanhamento, agravado,
   melhorado, encerrado) aparecerem na tela.

   O payload sai do proprio motor. Demo escrito a mao diverge do motor em
   silencio, e foi assim que a severidade da queda de receita ficou certa no
   demo e errada no motor por meses.

   Mesmo padrao dos demais fallbacks: so roda se o overlay real da instancia
   ainda nao populou a janela. Carteiras, emissores e valores sao ficticios.
*/
(function () {
  'use strict';
  if (window.ATLAS_CREDITO_DATA) return;
  /* Instancia com dado real: nao popular sintetico. Ver ESTADO/ESTADO-ATUAL.md. */
  if (window._AtlasRealData) return;

  window.ATLAS_CREDITO_DATA = {
  "sintetico": true,
  "schema": "credito/v1",
  "data": "2026-08-24",
  "periodo": "diario",
  "tenantId": "demo",
  "geradoEm": null,
  "engine": {
    "nome": "atlas-audit-engine",
    "versao": "0.0.0"
  },
  "baseData": "2026-07-25",
  "fonteEventos": "radar-de-credito-ficticio",
  "limiares": {
    "creditoPerdaConfirmada": {
      "altaMin": 0.1,
      "mediaMin": 0.02
    },
    "creditoPerdaConfirmadaMinAbs": 50000,
    "creditoPisoExposicao": {
      "perdaConfirmada": 0,
      "sinalizacao": 0.005,
      "observacao": 0.01
    },
    "creditoVariacaoMaterialPct": 0.2,
    "coberturaAfirmaMin": 0.7,
    "coberturaRessalvaMin": 0.4,
    "severidade": {
      "baixaMax": 0.1,
      "mediaMax": 0.3
    }
  },
  "impactos": [
    {
      "evento": {
        "emissorId": "banco-zeta",
        "emissorNome": "Banco Zeta S.A.",
        "tipo": "NOTICIA_NEGATIVA",
        "classe": "observacao",
        "tipoOriginal": "noticia negativa na imprensa",
        "severidadeEvento": "alta",
        "severidadeOriginal": "alta",
        "data": "2026-08-24",
        "fonte": "radar-de-credito-ficticio",
        "confiancaFonte": "media",
        "confiancaOriginal": 0.6
      },
      "atingidas": [
        {
          "carteira": "ALPHA_01",
          "valor": 760000,
          "fracaoPl": 0.18765432098765433,
          "plTotal": 4050000,
          "ativos": [
            "CDB ZETA 2027",
            "LCI ZETA 2028",
            "LF ZETA 2029"
          ],
          "severidadeImpacto": "alta",
          "estado": "agravado",
          "exposicaoAnterior": 972800,
          "variacaoExposicao": -0.21875,
          "severidadeAnterior": "baixa",
          "abaixoDoPiso": false,
          "cobertura": 1,
          "confianca": "media",
          "insightId": "2026-08-24|ALPHA_01|EVENTO_CREDITO|banco-zeta|NOTICIA_NEGATIVA"
        }
      ],
      "naoAvaliaveis": [
        "ESTRELA_PV"
      ],
      "semExposicao": [
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "FAROL_INV"
      ],
      "exposicaoTotal": 760000,
      "fracaoCasa": 0.030315117670522536,
      "pior": "alta",
      "estado": "agravado"
    },
    {
      "evento": {
        "emissorId": "banco-zeta",
        "emissorNome": "Banco Zeta S.A.",
        "tipo": "DEFAULT",
        "classe": "perdaConfirmada",
        "tipoOriginal": "default confirmado",
        "severidadeEvento": "alta",
        "severidadeOriginal": "alta",
        "data": "2026-08-24",
        "fonte": "radar-de-credito-ficticio",
        "confiancaFonte": "alta",
        "confiancaOriginal": 0.95
      },
      "atingidas": [
        {
          "carteira": "ALPHA_01",
          "valor": 760000,
          "fracaoPl": 0.18765432098765433,
          "plTotal": 4050000,
          "ativos": [
            "CDB ZETA 2027",
            "LCI ZETA 2028",
            "LF ZETA 2029"
          ],
          "severidadeImpacto": "alta",
          "estado": "novo",
          "exposicaoAnterior": null,
          "variacaoExposicao": null,
          "severidadeAnterior": null,
          "abaixoDoPiso": false,
          "cobertura": 1,
          "confianca": "alta",
          "insightId": "2026-08-24|ALPHA_01|EVENTO_CREDITO|banco-zeta|DEFAULT"
        }
      ],
      "naoAvaliaveis": [
        "ESTRELA_PV"
      ],
      "semExposicao": [
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "FAROL_INV"
      ],
      "exposicaoTotal": 760000,
      "fracaoCasa": 0.030315117670522536,
      "pior": "alta",
      "estado": "novo"
    },
    {
      "evento": {
        "emissorId": "metalurgica-aurora",
        "emissorNome": "Metalurgica Aurora",
        "tipo": "RECUPERACAO_JUDICIAL",
        "classe": "perdaConfirmada",
        "tipoOriginal": "pedido de recuperacao judicial",
        "severidadeEvento": "alta",
        "severidadeOriginal": "alta",
        "data": "2026-08-24",
        "fonte": "radar-de-credito-ficticio",
        "confiancaFonte": "alta",
        "confiancaOriginal": 0.9
      },
      "atingidas": [
        {
          "carteira": "DUNAS_CAP",
          "valor": 60000,
          "fracaoPl": 0.015151515151515152,
          "plTotal": 3960000,
          "ativos": [
            "DEB AURORA 2029"
          ],
          "severidadeImpacto": "media",
          "estado": "novo",
          "exposicaoAnterior": null,
          "variacaoExposicao": null,
          "severidadeAnterior": null,
          "abaixoDoPiso": false,
          "cobertura": 1,
          "confianca": "alta",
          "insightId": "2026-08-24|DUNAS_CAP|EVENTO_CREDITO|metalurgica-aurora|RECUPERACAO_JUDICIAL"
        }
      ],
      "naoAvaliaveis": [
        "ESTRELA_PV"
      ],
      "semExposicao": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "FAROL_INV"
      ],
      "exposicaoTotal": 60000,
      "fracaoCasa": 0.0023932987634623054,
      "pior": "media",
      "estado": "novo"
    },
    {
      "evento": {
        "emissorId": "gestora-di-bravo",
        "emissorNome": "Gestora di-bravo",
        "tipo": "NOTICIA_NEGATIVA",
        "classe": "observacao",
        "tipoOriginal": "noticia negativa",
        "severidadeEvento": "media",
        "severidadeOriginal": "media",
        "data": "2026-08-24",
        "fonte": "radar-de-credito-ficticio",
        "confiancaFonte": "baixa",
        "confiancaOriginal": 0.2
      },
      "atingidas": [
        {
          "carteira": "BRAVO_PV",
          "valor": 400000,
          "fracaoPl": 0.08333333333333333,
          "plTotal": 4800000,
          "ativos": [
            "FUNDO DI BRAVO"
          ],
          "severidadeImpacto": "baixa",
          "estado": "novo",
          "exposicaoAnterior": null,
          "variacaoExposicao": null,
          "severidadeAnterior": null,
          "abaixoDoPiso": false,
          "cobertura": 1,
          "confianca": "baixa",
          "insightId": "2026-08-24|BRAVO_PV|EVENTO_CREDITO|gestora-di-bravo|NOTICIA_NEGATIVA"
        }
      ],
      "naoAvaliaveis": [
        "ESTRELA_PV"
      ],
      "semExposicao": [
        "ALPHA_01",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "FAROL_INV"
      ],
      "exposicaoTotal": 400000,
      "fracaoCasa": 0.015955325089748704,
      "pior": "baixa",
      "estado": "novo"
    },
    {
      "evento": {
        "emissorId": "banco-omega",
        "emissorNome": "Banco Omega S.A.",
        "tipo": "REBAIXAMENTO_RATING",
        "classe": "sinalizacao",
        "tipoOriginal": "downgrade de rating pela agencia",
        "severidadeEvento": "media",
        "severidadeOriginal": "media",
        "data": "2026-08-24",
        "fonte": "radar-de-credito-ficticio",
        "confiancaFonte": "alta",
        "confiancaOriginal": 0.85
      },
      "atingidas": [
        {
          "carteira": "CEDRO_HLD",
          "valor": 2700000,
          "fracaoPl": 0.3391959798994975,
          "plTotal": 7960000,
          "ativos": [
            "CDB OMEGA VENCE SET",
            "LCA OMEGA VENCE SET"
          ],
          "severidadeImpacto": "alta",
          "estado": "acompanhamento",
          "exposicaoAnterior": 2700000,
          "variacaoExposicao": 0,
          "severidadeAnterior": "alta",
          "abaixoDoPiso": false,
          "cobertura": 1,
          "confianca": "alta",
          "insightId": "2026-08-24|CEDRO_HLD|EVENTO_CREDITO|banco-omega|REBAIXAMENTO_RATING"
        }
      ],
      "naoAvaliaveis": [
        "ESTRELA_PV"
      ],
      "semExposicao": [
        "ALPHA_01",
        "BRAVO_PV",
        "DUNAS_CAP",
        "FAROL_INV"
      ],
      "exposicaoTotal": 2700000,
      "fracaoCasa": 0.10769844435580375,
      "pior": "alta",
      "estado": "acompanhamento"
    },
    {
      "evento": {
        "emissorId": "gestora-multi-beta",
        "emissorNome": "Gestora multi-beta",
        "tipo": "COVENANT_QUEBRADO",
        "classe": "sinalizacao",
        "tipoOriginal": "covenant quebrado",
        "severidadeEvento": "media",
        "severidadeOriginal": "media",
        "data": "2026-08-24",
        "fonte": "radar-de-credito-ficticio",
        "confiancaFonte": "media",
        "confiancaOriginal": 0.75
      },
      "atingidas": [
        {
          "carteira": "ALPHA_01",
          "valor": 240000,
          "fracaoPl": 0.05925925925925926,
          "plTotal": 4050000,
          "ativos": [
            "FUNDO MULTI BETA"
          ],
          "severidadeImpacto": "baixa",
          "estado": "melhorado",
          "exposicaoAnterior": 307200,
          "variacaoExposicao": -0.21875,
          "severidadeAnterior": "baixa",
          "abaixoDoPiso": false,
          "cobertura": 1,
          "confianca": "media",
          "insightId": "2026-08-24|ALPHA_01|EVENTO_CREDITO|gestora-multi-beta|COVENANT_QUEBRADO"
        }
      ],
      "naoAvaliaveis": [
        "ESTRELA_PV"
      ],
      "semExposicao": [
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "FAROL_INV"
      ],
      "exposicaoTotal": 240000,
      "fracaoCasa": 0.009573195053849222,
      "pior": "baixa",
      "estado": "melhorado"
    },
    {
      "evento": {
        "emissorId": "banco-que-ninguem-carrega",
        "emissorNome": "Banco Que Ninguem Carrega",
        "tipo": "REBAIXAMENTO_RATING",
        "classe": "sinalizacao",
        "tipoOriginal": "downgrade de rating",
        "severidadeEvento": "media",
        "severidadeOriginal": "media",
        "data": "2026-08-24",
        "fonte": "radar-de-credito-ficticio",
        "confiancaFonte": "alta",
        "confiancaOriginal": 0.8
      },
      "atingidas": [],
      "naoAvaliaveis": [
        "ESTRELA_PV"
      ],
      "semExposicao": [
        "ALPHA_01",
        "BRAVO_PV",
        "CEDRO_HLD",
        "DUNAS_CAP",
        "FAROL_INV"
      ],
      "exposicaoTotal": 0,
      "fracaoCasa": 0,
      "pior": null,
      "estado": null
    }
  ],
  "encerrados": [
    {
      "emissorId": "gestora-di-alfa",
      "emissorNome": "Gestora di-alfa",
      "tipo": "ATRASO_PAGAMENTO",
      "carteira": "ALPHA_01",
      "exposicaoAnterior": 320000,
      "severidadeAnterior": "baixa",
      "dataEvento": "2026-07-25",
      "motivo": "evento-saiu-da-fonte"
    }
  ],
  "insights": [
    {
      "schema": "insight/v1",
      "id": "2026-08-24|ALPHA_01|EVENTO_CREDITO|banco-zeta|DEFAULT",
      "tipo": "EVENTO_CREDITO",
      "carteira": "ALPHA_01",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "Banco Zeta S.A. teve default confirmado em 2026-08-24, e a carteira tem 18,8% do patrimônio nesse emissor.",
      "evidencias": {
        "emissorId": "banco-zeta",
        "emissorNome": "Banco Zeta S.A.",
        "tipoEvento": "DEFAULT",
        "tipoOriginal": "default confirmado",
        "classeEvento": "perdaConfirmada",
        "severidadeEvento": "alta",
        "severidadeDeclarada": "alta",
        "dataEvento": "2026-08-24",
        "fonteEvento": "radar-de-credito-ficticio",
        "confiancaFonte": 0.95,
        "exposicao": 760000,
        "plTotal": 4050000,
        "fracaoPl": 0.18765432098765433,
        "estado": "novo",
        "ativos": "CDB ZETA 2027, LCI ZETA 2028, LF ZETA 2029"
      },
      "regra": {
        "nome": "creditoPerdaConfirmada",
        "limiar": {
          "altaMin": 0.1,
          "mediaMin": 0.02,
          "pisoAbsoluto": 50000,
          "piso": "sem piso (perda confirmada)"
        }
      },
      "calculo": "R$ 760.000 / R$ 4.050.000 = 18,8% de exposicao; perda confirmada, escada 2,0%/10,0% com piso R$ 50.000 = impacto alta; sem registro anterior = novo",
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
      "id": "2026-08-24|ALPHA_01|EVENTO_CREDITO|banco-zeta|NOTICIA_NEGATIVA",
      "tipo": "EVENTO_CREDITO",
      "carteira": "ALPHA_01",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "Banco Zeta S.A. teve noticia negativa na imprensa em 2026-08-24, e a carteira tem 18,8% do patrimônio nesse emissor.",
      "evidencias": {
        "emissorId": "banco-zeta",
        "emissorNome": "Banco Zeta S.A.",
        "tipoEvento": "NOTICIA_NEGATIVA",
        "tipoOriginal": "noticia negativa na imprensa",
        "classeEvento": "observacao",
        "severidadeEvento": "alta",
        "severidadeDeclarada": "alta",
        "dataEvento": "2026-08-24",
        "fonteEvento": "radar-de-credito-ficticio",
        "confiancaFonte": 0.6,
        "exposicao": 760000,
        "plTotal": 4050000,
        "fracaoPl": 0.18765432098765433,
        "estado": "agravado",
        "exposicaoAnterior": 972800,
        "variacaoExposicao": -0.21875,
        "ativos": "CDB ZETA 2027, LCI ZETA 2028, LF ZETA 2029"
      },
      "regra": {
        "nome": "MATRIZ_IMPACTO_CREDITO",
        "limiar": {
          "severidadeEvento": "alta",
          "faixaExposicao": "media",
          "piso": 0.01
        }
      },
      "calculo": "R$ 760.000 / R$ 4.050.000 = 18,8% de exposicao; evento alta x exposicao media = impacto alta; anterior R$ 972.800 (baixa) = agravado",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "media"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|CEDRO_HLD|EVENTO_CREDITO|banco-omega|REBAIXAMENTO_RATING",
      "tipo": "EVENTO_CREDITO",
      "carteira": "CEDRO_HLD",
      "tenantId": "demo",
      "severidade": "alta",
      "afirmacao": "Banco Omega S.A. teve downgrade de rating pela agencia em 2026-08-24, e a carteira tem 33,9% do patrimônio nesse emissor.",
      "evidencias": {
        "emissorId": "banco-omega",
        "emissorNome": "Banco Omega S.A.",
        "tipoEvento": "REBAIXAMENTO_RATING",
        "tipoOriginal": "downgrade de rating pela agencia",
        "classeEvento": "sinalizacao",
        "severidadeEvento": "media",
        "severidadeDeclarada": "media",
        "dataEvento": "2026-08-24",
        "fonteEvento": "radar-de-credito-ficticio",
        "confiancaFonte": 0.85,
        "exposicao": 2700000,
        "plTotal": 7960000,
        "fracaoPl": 0.3391959798994975,
        "estado": "acompanhamento",
        "exposicaoAnterior": 2700000,
        "variacaoExposicao": 0,
        "ativos": "CDB OMEGA VENCE SET, LCA OMEGA VENCE SET"
      },
      "regra": {
        "nome": "MATRIZ_IMPACTO_CREDITO",
        "limiar": {
          "severidadeEvento": "media",
          "faixaExposicao": "alta",
          "piso": 0.005
        }
      },
      "calculo": "R$ 2.700.000 / R$ 7.960.000 = 33,9% de exposicao; evento media x exposicao alta = impacto alta; anterior R$ 2.700.000 (alta) = acompanhamento",
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
      "id": "2026-08-24|DUNAS_CAP|EVENTO_CREDITO|metalurgica-aurora|RECUPERACAO_JUDICIAL",
      "tipo": "EVENTO_CREDITO",
      "carteira": "DUNAS_CAP",
      "tenantId": "demo",
      "severidade": "media",
      "afirmacao": "Metalurgica Aurora teve pedido de recuperacao judicial em 2026-08-24, e a carteira tem 1,5% do patrimônio nesse emissor.",
      "evidencias": {
        "emissorId": "metalurgica-aurora",
        "emissorNome": "Metalurgica Aurora",
        "tipoEvento": "RECUPERACAO_JUDICIAL",
        "tipoOriginal": "pedido de recuperacao judicial",
        "classeEvento": "perdaConfirmada",
        "severidadeEvento": "alta",
        "severidadeDeclarada": "alta",
        "dataEvento": "2026-08-24",
        "fonteEvento": "radar-de-credito-ficticio",
        "confiancaFonte": 0.9,
        "exposicao": 60000,
        "plTotal": 3960000,
        "fracaoPl": 0.015151515151515152,
        "estado": "novo",
        "ativos": "DEB AURORA 2029"
      },
      "regra": {
        "nome": "creditoPerdaConfirmada",
        "limiar": {
          "altaMin": 0.1,
          "mediaMin": 0.02,
          "pisoAbsoluto": 50000,
          "piso": "sem piso (perda confirmada)"
        }
      },
      "calculo": "R$ 60.000 / R$ 3.960.000 = 1,5% de exposicao; perda confirmada, escada 2,0%/10,0% com piso R$ 50.000 = impacto media; sem registro anterior = novo",
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
      "id": "2026-08-24|ALPHA_01|EVENTO_CREDITO|gestora-multi-beta|COVENANT_QUEBRADO",
      "tipo": "EVENTO_CREDITO",
      "carteira": "ALPHA_01",
      "tenantId": "demo",
      "severidade": "baixa",
      "afirmacao": "Gestora multi-beta teve covenant quebrado em 2026-08-24, e a carteira tem 5,9% do patrimônio nesse emissor.",
      "evidencias": {
        "emissorId": "gestora-multi-beta",
        "emissorNome": "Gestora multi-beta",
        "tipoEvento": "COVENANT_QUEBRADO",
        "tipoOriginal": "covenant quebrado",
        "classeEvento": "sinalizacao",
        "severidadeEvento": "media",
        "severidadeDeclarada": "media",
        "dataEvento": "2026-08-24",
        "fonteEvento": "radar-de-credito-ficticio",
        "confiancaFonte": 0.75,
        "exposicao": 240000,
        "plTotal": 4050000,
        "fracaoPl": 0.05925925925925926,
        "estado": "melhorado",
        "exposicaoAnterior": 307200,
        "variacaoExposicao": -0.21875,
        "ativos": "FUNDO MULTI BETA"
      },
      "regra": {
        "nome": "MATRIZ_IMPACTO_CREDITO",
        "limiar": {
          "severidadeEvento": "media",
          "faixaExposicao": "baixa",
          "piso": 0.005
        }
      },
      "calculo": "R$ 240.000 / R$ 4.050.000 = 5,9% de exposicao; evento media x exposicao baixa = impacto baixa; anterior R$ 307.200 (baixa) = melhorado",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "media"
    },
    {
      "schema": "insight/v1",
      "id": "2026-08-24|BRAVO_PV|EVENTO_CREDITO|gestora-di-bravo|NOTICIA_NEGATIVA",
      "tipo": "EVENTO_CREDITO",
      "carteira": "BRAVO_PV",
      "tenantId": "demo",
      "severidade": "baixa",
      "afirmacao": "Gestora di-bravo teve noticia negativa em 2026-08-24, e a carteira tem 8,3% do patrimônio nesse emissor.",
      "evidencias": {
        "emissorId": "gestora-di-bravo",
        "emissorNome": "Gestora di-bravo",
        "tipoEvento": "NOTICIA_NEGATIVA",
        "tipoOriginal": "noticia negativa",
        "classeEvento": "observacao",
        "severidadeEvento": "media",
        "severidadeDeclarada": "media",
        "dataEvento": "2026-08-24",
        "fonteEvento": "radar-de-credito-ficticio",
        "confiancaFonte": 0.2,
        "exposicao": 400000,
        "plTotal": 4800000,
        "fracaoPl": 0.08333333333333333,
        "estado": "novo",
        "ativos": "FUNDO DI BRAVO"
      },
      "regra": {
        "nome": "MATRIZ_IMPACTO_CREDITO",
        "limiar": {
          "severidadeEvento": "media",
          "faixaExposicao": "baixa",
          "piso": 0.01
        }
      },
      "calculo": "R$ 400.000 / R$ 4.800.000 = 8,3% de exposicao; evento media x exposicao baixa = impacto baixa; sem registro anterior = novo",
      "fonte": {
        "fonte": "custodiante-demo",
        "data": "2026-08-24"
      },
      "cobertura": 1,
      "faixaCobertura": "afirma",
      "confianca": "baixa"
    }
  ],
  "descartados": 1,
  "carteiras": 6,
  "carteirasAvaliaveis": 5,
  "temAnterior": true
};
})();
