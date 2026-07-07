import type { AuditFinding, CarteiraRaw } from '../schema.js';

export interface RuleContext {
  mes: string;
  baseline: string;
  toleranciaPL: number;
}

export interface Rule {
  id: string;
  run(carteira: CarteiraRaw, ctx: RuleContext): AuditFinding[];
}