Verificação mensal de carteiras Mirabaud. Plataforma SmartBrain.
Os arquivos .pdf são ZIPs (JPEG + TXT). Usar zipfile.ZipFile para ler, nunca bibliotecas PDF padrão.
Tarefa mensal: comparar mês atual vs mês anterior. Identificar erros matemáticos, não riscos de mercado.
Tolerância: 0,3% do PL total. Ativo individual: 0,05%.
Fórmula de conciliação obrigatória:
PL Final = PL Anterior + Aplicações − Resgates + Eventos Financeiros − Impostos Pagos − Provisão IR+IOF
Performance de mercado já está embutida nos saldos. Não somar separadamente.
Checklist por carteira:

1 - Rentabilidade zerada sem justificativa = ERRO CRÍTICO
2 - Conciliação PL pelo fórmula acima
3 - Variações de saldo >20% por ativo
4 - Novos ativos e ativos zerados
5 - Eventos financeiros esperados (cupons, dividendos FII)
6 - Come-cotas: último dia útil de maio e novembro (15% sobre rendimentos de fundos DI e multimercado)

Comportamentos conhecidos do SmartBrain — não são erros:
Resgates de fundos de liquidez (BTG Tesouro Selic, Journey Capital) aparecem em Compras com sinal negativo. ETFs na XP com saldo diminuindo e valor em Compras = venda. FII dividendos classificados como Resgates. NTN-B coupons classificados como Resgates (GrossUp). BLC III FIM: amortizações como Resgates sem mudança de cotas. Ativo comprado no último dia útil do mês com rentabilidade zero: normal.
Defaults conhecidos — informar, não classificar como erro:
CDB Banco Master e debêntures Light marcados a zero por política da firma.
Custódias: BTG Pactual, XP Corretora, Bradesco, Itaú, ICATU, BEM, S3 Caceis.
Output: Excel com abas por carteira. Conclusão obrigatória: APROVADA, APROVADA COM RESSALVA PONTUAL, ou APROVADA COM RESSALVA — AGUARDAR CONFIRMAÇÃO.