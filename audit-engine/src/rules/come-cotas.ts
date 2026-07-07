import type { Rule } from './types.js';

export const comeCotasRule: Rule = {
  id: 'come-cotas',
  run(carteira, ctx) {
    const month = Number(ctx.mes.split('-')[1]);
    if (month !== 5 && month !== 11) return [];

    const hasFundos = carteira.ativos.some(
      (a) => a.type === 'ativo' && a.nome && /FIRF|FIM|FIA|FIC|FIDC|CP|RF/i.test(a.nome),
    );

    if (!hasFundos) return [];

    const impostos = carteira.impostos;
    const pl = carteira.plRef;
    const ratio = pl > 0 ? impostos / pl : 0;

    if (ratio < 0.0001 && pl > 100000) {
      return [{
        tipo: 'alerta',
        mensagem: `Come-cotas esperado em ${month === 5 ? 'maio' : 'novembro'}: impostos pagos (R$ ${impostos.toFixed(2)}) parecem baixos para carteira com fundos`,
      }];
    }

    return [];
  },
};