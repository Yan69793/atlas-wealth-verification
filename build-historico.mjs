/* Agrega audits/<mes>/audit.json (fev-jun 2026) num historico.json compacto
   para a aba Tendencia do dashboard e para o relatorio do comite.
   Rodar: node build-historico.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MESES = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
const LABELS = { '2026-02': 'Fev', '2026-03': 'Mar', '2026-04': 'Abr', '2026-05': 'Mai', '2026-06': 'Jun' };

function bucket(msg) {
  if (/Conciliacao de PL/i.test(msg)) return 'pl-conciliacao';
  if (/variacao de saldo/i.test(msg)) return 'cotas-sem-operacao';
  if (/aloca(c|ç)ao/i.test(msg)) return 'alocacao';
  if (/come-cotas/i.test(msg)) return 'come-cotas';
  // Rentabilidade ausente na fonte: a mensagem de ERRO antiga (pré-reclassificacao,
  // "Rentabilidade consolidada ... 0,00%") e a de ALERTA nova ("Book offshore sem
  // tabela de rentabilidade") descrevem a MESMA limitacao estrutural. Unificar num
  // bucket so, para a recorrencia rastrear atraves da mudanca de criterio (jul/2026).
  if (/offshore sem tabela|Rentabilidade consolidada/i.test(msg)) return 'rentabilidade-ausente';
  return 'outro';
}

const agregados = {};
const carteiras = {};

for (const mes of MESES) {
  const p = path.join(ROOT, 'audits', mes, 'audit.json');
  if (!fs.existsSync(p)) continue;
  const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const dash = d.dashboard ?? d;
  agregados[mes] = dash.summary.totals;

  for (const r of d.results) {
    const c = d.carteiras.find((x) => x.nome === r.nome);
    if (!carteiras[r.nome]) carteiras[r.nome] = { porMes: {} };
    const categorias = [...new Set([...(r.erros || []), ...(r.alertas || [])].map(bucket))];
    const categoriasErro = [...new Set((r.erros || []).map(bucket))];
    carteiras[r.nome].porMes[mes] = {
      status: r.status,
      plRef: c?.plRef ?? null,
      categorias,
      categoriasErro,
    };
  }
}

// Recorrencia da limitacao estrutural (rentabilidade ausente na fonte, tipicamente
// books offshore/consolidados). Para cada carteira que hoje carrega essa categoria
// — agora reclassificada de erro bloqueante para excecao/alerta — andar para tras
// enquanto a mesma limitacao persistir em meses consecutivos. Usa `categorias`
// (inclui alertas), nao `categoriasErro`, para rastrear atraves da mudanca de
// criterio (jul/2026): a limitacao e a mesma, mudou so como e classificada.
const CAT_RECORRENTE = 'rentabilidade-ausente';
const ULTIMO = MESES[MESES.length - 1];
const recorrentes = [];
for (const [nome, c] of Object.entries(carteiras)) {
  const atual = c.porMes[ULTIMO];
  if (!atual || !atual.categorias.includes(CAT_RECORRENTE)) continue;
  let consecutivos = 0;
  let desdeMes = ULTIMO;
  for (let i = MESES.length - 1; i >= 0; i--) {
    const m = MESES[i];
    const dado = c.porMes[m];
    if (dado && dado.categorias.includes(CAT_RECORRENTE)) {
      consecutivos++;
      desdeMes = m;
    } else {
      break;
    }
  }
  recorrentes.push({ nome, categoria: CAT_RECORRENTE, desdeMes, mesesConsecutivos: consecutivos, statusAtual: atual.status });
}
recorrentes.sort((a, b) => b.mesesConsecutivos - a.mesesConsecutivos);

const out = {
  meses: MESES,
  mesesLabel: MESES.map((m) => LABELS[m]),
  agregados,
  carteiras,
  recorrentes,
  geradoEm: d_stamp(),
};

function d_stamp() {
  const last = JSON.parse(fs.readFileSync(path.join(ROOT, 'audits', ULTIMO, 'audit.json'), 'utf-8'));
  return last.meta.processadoEm;
}

fs.writeFileSync(path.join(ROOT, 'historico.json'), JSON.stringify(out));
fs.writeFileSync(path.join(ROOT, 'historico.js'), 'window.HISTORICO_DATA = ' + JSON.stringify(out) + ';\n');

console.log(`historico.json/.js gerados: ${MESES.length} meses, ${Object.keys(carteiras).length} carteiras unicas, ${recorrentes.length} achados recorrentes (erro) rastreados.`);
console.log('Top 5 recorrencias:', recorrentes.slice(0, 5).map(r => `${r.nome} (${r.categoria}, ${r.mesesConsecutivos}m, desde ${r.desdeMes})`).join(' | '));
