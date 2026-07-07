import type { Rule } from './types.js';

const ALOC_THRESHOLD = 0.05;

export const alocacaoRule: Rule = {
  id: 'alocacao',
  run(carteira) {
    const findings = [];
    const classes = carteira.ativos.filter((a) => a.type === 'classe');

    for (const cls of classes) {
      if (!cls.classe || carteira.plBase <= 0 || carteira.plRef <= 0) continue;

      const partMar = cls.plBase / carteira.plBase;
      const partAbr = cls.plRef / carteira.plRef;
      const delta = partAbr - partMar;

      if (Math.abs(delta) >= ALOC_THRESHOLD) {
        const sinal = delta >= 0 ? '+' : '';
        findings.push({
          tipo: 'alerta' as const,
          mensagem: `Mudanca de alocacao na classe ${cls.classe}, de ${(partMar * 100).toFixed(2)}% para ${(partAbr * 100).toFixed(2)}%, variacao de ${sinal}${(delta * 100).toFixed(1)} pontos percentuais`,
        });
      }
    }

    return findings;
  },
};