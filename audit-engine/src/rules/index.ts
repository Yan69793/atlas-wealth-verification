import { alocacaoRule } from './alocacao.js';
import { comeCotasRule } from './come-cotas.js';
import { continuidadeRule } from './continuidade.js';
import { cotasSemOperacaoRule } from './cotas-sem-operacao.js';
import { plConciliacaoRule } from './pl-conciliacao.js';
import { rentabilidadeRule } from './rentabilidade.js';
import { spreadRentabilidadeRule } from './spread-rentabilidade.js';
import type { Rule } from './types.js';

export const ALL_RULES: Rule[] = [
  rentabilidadeRule,
  plConciliacaoRule,
  continuidadeRule,
  spreadRentabilidadeRule,
  alocacaoRule,
  cotasSemOperacaoRule,
  comeCotasRule,
];

export { alocacaoRule, comeCotasRule, continuidadeRule, cotasSemOperacaoRule, plConciliacaoRule, rentabilidadeRule, spreadRentabilidadeRule };