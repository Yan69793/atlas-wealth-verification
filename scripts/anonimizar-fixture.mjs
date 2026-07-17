#!/usr/bin/env node
// Gera o gabarito de parity sem dado identificavel. O parity so le totais e
// plRef, entao nome de carteira nao precisa sobreviver. Sem isto, o gabarito
// nao pode ser versionado e o teste nunca roda em clone limpo.
import fs from 'node:fs';
import crypto from 'node:crypto';

const [, , entrada, saida] = process.argv;
if (!entrada || !saida) {
  console.error('uso: node scripts/anonimizar-fixture.mjs <audit.json> <saida.anon.json>');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(entrada, 'utf-8'));
const src = raw.dashboard ?? raw;

const anon = {
  dashboard: {
    summary: { totals: src.summary.totals },
    carteiras: src.carteiras.map((c) => ({
      nome: crypto.createHash('sha256').update(String(c.nome)).digest('hex').slice(0, 8),
      plRef: c.plRef,
    })),
  },
};

fs.writeFileSync(saida, JSON.stringify(anon, null, 2) + '\n');
console.log(`ok: ${anon.dashboard.carteiras.length} carteiras, nomes hasheados`);
