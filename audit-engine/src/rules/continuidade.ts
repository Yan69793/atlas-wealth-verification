import type { Rule } from './types.js';

export const continuidadeRule: Rule = {
  id: 'continuidade',
  run(carteira, ctx) {
    const cont = carteira.continuidade;
    if (cont === null) return [];
    if (cont > ctx.toleranciaPL) {
      return [{
        tipo: 'alerta',
        mensagem: `Descontinuidade de PL de ${(cont * 100).toFixed(3)}%, acima da tolerancia de ${(ctx.toleranciaPL * 100).toFixed(2)}%`,
      }];
    }
    return [];
  },
};