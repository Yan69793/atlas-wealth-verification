import type { Rule } from './types.js';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function mesLabel(ym: string): string {
  const [, m] = ym.split('-').map(Number);
  return MESES[m] ?? ym;
}

export const rentabilidadeRule: Rule = {
  id: 'rentabilidade',
  run(carteira, ctx) {
    const findings = [];
    const rent = carteira.rentRef;
    const mesNome = mesLabel(ctx.mes);

    if (rent === 0 || rent === null) {
      findings.push({
        tipo: 'erro' as const,
        mensagem: `Rentabilidade consolidada da carteira em ${mesNome} igual a 0,00%, requer verificacao`,
      });
    } else if (rent < -0.15) {
      findings.push({
        tipo: 'alerta' as const,
        mensagem: `Rentabilidade consolidada em ${mesNome} de ${(rent * 100).toFixed(2)}%, variacao negativa extrema, verificar eventos e composicao`,
      });
    }

    return findings;
  },
};