import type { CarteiraRaw } from '../schema.js';
import type { Rule } from './types.js';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function mesLabel(ym: string): string {
  const [, m] = ym.split('-').map(Number);
  return MESES[m] ?? ym;
}

// Books offshore (sufixo _OFF) nao trazem a tabela de rentabilidade mensal no
// formato do custodiante: rentRef vem null (dado AUSENTE na fonte, distinto de
// zero reportado). E limitacao estrutural conhecida e recorrente desde fev/2026,
// nao um erro a corrigir. Decisao de criterio (jul/2026): reclassificar como
// alerta rastreavel em vez de erro bloqueante. Importante: rentRef === 0 (zero
// LITERAL reportado no book) continua sendo erro. Quando o custodiante passar a
// incluir a tabela, rentRef deixa de ser null e a regra volta ao normal sozinha.
const OFFSHORE_SUFFIX = /_OFF$/i;

function isExcecaoOffshoreConhecida(carteira: CarteiraRaw): boolean {
  return OFFSHORE_SUFFIX.test(carteira.nome) && carteira.rentRef === null;
}

export const rentabilidadeRule: Rule = {
  id: 'rentabilidade',
  run(carteira, ctx) {
    const findings = [];
    const rent = carteira.rentRef;
    const mesNome = mesLabel(ctx.mes);

    if (isExcecaoOffshoreConhecida(carteira)) {
      findings.push({
        tipo: 'alerta' as const,
        mensagem: `Book offshore sem tabela de rentabilidade mensal em ${mesNome}, limitacao de formato conhecida e recorrente. Confirmar variacao de PL manualmente. Nao bloqueia a liberacao.`,
      });
    } else if (rent === 0 || rent === null) {
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
