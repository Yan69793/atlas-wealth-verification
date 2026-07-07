import type { Rule } from './types.js';

const SPREAD_THRESHOLD = 0.005;

export const spreadRentabilidadeRule: Rule = {
  id: 'spread-rentabilidade',
  run(carteira) {
    const rent = carteira.rentRef;
    if (rent === null || rent === 0 || carteira.perfImplicita === null) return [];

    const spread = Math.abs(carteira.perfImplicita - rent);
    if (spread > SPREAD_THRESHOLD) {
      return [{
        tipo: 'alerta',
        mensagem: `Spread entre performance implicita (${(carteira.perfImplicita * 100).toFixed(2)}%) e rentabilidade reportada (${(rent * 100).toFixed(2)}%) de ${(spread * 100).toFixed(2)} pontos percentuais`,
      }];
    }
    return [];
  },
};