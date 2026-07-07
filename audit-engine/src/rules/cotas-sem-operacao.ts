import type { Rule } from './types.js';

const VAR_THRESHOLD = 0.05;

export const cotasSemOperacaoRule: Rule = {
  id: 'cotas-sem-operacao',
  run(carteira) {
    const findings = [];

    for (const ativo of carteira.ativos) {
      if (ativo.type !== 'ativo' || !ativo.nome) continue;

      const compras = ativo.compras ?? 0;
      const vendas = ativo.vendas ?? 0;
      const eventos = ativo.eventos ?? 0;
      const hasOps = compras !== 0 || vendas !== 0 || eventos !== 0;

      if (!hasOps && Math.abs(ativo.varPct) >= VAR_THRESHOLD && ativo.plBase > 0) {
        findings.push({
          tipo: 'alerta' as const,
          mensagem: `${ativo.nome}: variacao de saldo de ${(ativo.varPct * 100).toFixed(1)}% sem compra, venda ou evento financeiro, verificar marcacao a mercado ou quantidade de cotas`,
        });
      }
    }

    return findings;
  },
};