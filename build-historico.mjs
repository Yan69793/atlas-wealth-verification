/* Agrega audits/<mes>/audit.json num historico.json compacto para a aba
   Tendencia do dashboard e para o relatorio do comite.

   Rodar: node build-historico.mjs [--root <dir>] [--meses 12]

   --root: raiz dos dados (onde vive audits/). Sem ele, usa ATLAS_DATA_ROOT ou
   o diretorio do script. Precisa ser externa: consumido como submodule, o dado
   real vive no repo da instancia do cliente e nunca nesta arvore, que e o
   produto. Mesma precedencia do audit-engine/pipeline-all.mjs.

   Os meses sao DESCOBERTOS em audits/, nao fixos: a lista estava cravada em
   fev-jun/2026 e ja ignorava silenciosamente os outros 32 meses ingeridos. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const ROOT_ARG = args.includes('--root') ? args[args.indexOf('--root') + 1] : null;
const ROOT = path.resolve(ROOT_ARG || process.env.ATLAS_DATA_ROOT || __dirname);

/* --meses N: mantem so os N meses mais recentes. O historico.js e embutido no
   browser; 37 meses x ~110 carteiras cresce o suficiente para pesar no load.
   Sem o flag, usa tudo o que existir. */
const LIMITE = args.includes('--meses') ? Number(args[args.indexOf('--meses') + 1]) : null;

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const rotulo = (mes) => {
  const [a, m] = mes.split('-');
  return `${NOMES_MES[Number(m) - 1]}/${a.slice(2)}`;
};

const AUDITS_DIR = path.join(ROOT, 'audits');
if (!fs.existsSync(AUDITS_DIR)) {
  console.error(`audits/ nao encontrado em ${AUDITS_DIR}`);
  console.error('Use --root para apontar a raiz dos dados.');
  process.exit(1);
}

let MESES = fs
  .readdirSync(AUDITS_DIR)
  .filter((d) => /^\d{4}-\d{2}$/.test(d))
  .filter((d) => fs.existsSync(path.join(AUDITS_DIR, d, 'audit.json')))
  .sort();
if (LIMITE && MESES.length > LIMITE) MESES = MESES.slice(-LIMITE);

if (MESES.length === 0) {
  console.error(`Nenhum audit.json encontrado em ${AUDITS_DIR}`);
  process.exit(1);
}

const LABELS = Object.fromEntries(MESES.map((m) => [m, rotulo(m)]));

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

/* historico.json/platform-historico.js sao lidos pelo SPA a partir de __dirname
   (onde este script e o index.html vivem) -- nao de ROOT, que so aponta a raiz
   dos audits/ quando ela e externa (--root/ATLAS_DATA_ROOT). Escrever em ROOT
   deixaria o arquivo na raiz de dados, onde o app rodando de core/ nunca o ve. */
const OUT_DIR = __dirname;

/* historico.json: artefato de dados, para o relatorio do comite e consumo fora
   do browser. */
fs.writeFileSync(path.join(OUT_DIR, 'historico.json'), JSON.stringify(out));

/* platform-historico.js: e o arquivo que o index.html carrega de fato
   (window.HISTORICO_DATA, lido por platform-tendencia.jsx).

   Antes escrevia-se `historico.js`, que NINGUEM le: o app so referencia
   platform-historico.js, e a ponte entre os dois era uma copia manual nao
   documentada. Resultado observado: a aba Tendencia mostrava 5 meses
   (fev-jun/2026) enquanto 37 ja estavam ingeridos. O gerador passa a escrever
   o nome que o app carrega, e a ponte deixa de existir. */
const js = 'window.HISTORICO_DATA = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(OUT_DIR, 'platform-historico.js'), js);

console.log(`Raiz dos dados: ${ROOT}`);
console.log(`Saida (historico.json/platform-historico.js): ${OUT_DIR}`);
console.log(`historico.json + platform-historico.js gerados: ${MESES.length} meses (${MESES[0]} a ${MESES[MESES.length - 1]}), ${Object.keys(carteiras).length} carteiras unicas, ${recorrentes.length} achados recorrentes rastreados.`);
console.log('Top 5 recorrencias:', recorrentes.slice(0, 5).map(r => `${r.nome} (${r.categoria}, ${r.mesesConsecutivos}m, desde ${r.desdeMes})`).join(' | '));
