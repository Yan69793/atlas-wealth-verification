import type { Rule } from './types.js';

export const plConciliacaoRule: Rule = {
  id: 'pl-conciliacao',
  run(carteira, ctx) {
    const total = carteira.total;
    if (!total) return [];

    const compras = total.compras ?? 0;
    const vendas = total.vendas ?? 0;
    const eventos = total.eventos ?? 0;
    const impostos = total.impostos ?? 0;

    const esperado = carteira.plBase + compras - vendas + eventos - impostos;
    const diff = Math.abs(carteira.plRef - esperado);
    const tolAbs = carteira.plRef * ctx.toleranciaPL;

    if (diff > tolAbs && carteira.plRef > 0) {
      return [{
        tipo: 'alerta',
        mensagem: `Conciliacao de PL nao fecha: saldo final difere do calculado em R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${((diff / carteira.plRef) * 100).toFixed(3)}% do PL)`,
      }];
    }

    return [];
  },
};