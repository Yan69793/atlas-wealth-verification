// Painel do dono: funil agregado do demo.
//
// Vive separado de src/index.js pelo mesmo motivo que ./landing.js: o arquivo
// do portao decide autenticacao e nao deve ser reaberto para mexer em pixel.
// Aqui nao ha nenhuma decisao de perimetro, so leitura ja feita e HTML.
//
// O que este painel NAO mostra, de proposito:
//
//   "cadastro iniciado". Nao e observavel no servidor. Quem abre a tela e
//   digita o nome mas desiste antes de enviar nao gera requisicao nenhuma, e
//   so daria para ver com JavaScript no cliente, o que a CSP desta pagina nao
//   permite e a Fase 0 decidiu nao pagar. A tela diz isso em voz alta, porque
//   metrica ausente lida como zero e pior que metrica ausente declarada.
//
// A lista de cadastros mostra nome e email, que sao dado pessoal. Aparece so
// aqui, atras do secret de admin, e e coerente com o aviso que o formulario de
// cadastro ja da ao visitante ("para avisar o dono do novo cadastro").

const CSS = `
*, *::before, *::after { box-sizing: border-box; }

:root {
  --bg: #0A1420;
  --ouro: #C4A46A;
  --texto: #E8E4D9;
  --apagado: #8B93A0;
  --linha: rgba(232, 228, 217, 0.10);
  --alerta: #E27D60;
  --tracking: 0.14em;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --serif: Georgia, "Times New Roman", serif;
}

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--texto);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.5;
}

.folha {
  max-width: 940px;
  margin: 0 auto;
  padding: 28px max(16px, env(safe-area-inset-left)) 56px max(16px, env(safe-area-inset-right));
}

.marca {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: var(--tracking);
  text-transform: uppercase;
  color: var(--ouro);
  margin: 0 0 4px;
}

h1 {
  font-family: var(--serif);
  font-weight: 400;
  font-size: 24px;
  margin: 0 0 4px;
}

.periodo { margin: 0 0 28px; font-size: 13px; color: var(--apagado); }

h2 {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: var(--tracking);
  text-transform: uppercase;
  color: var(--ouro);
  margin: 34px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--linha);
}

/* ---------- Funil ---------- */
.funil { display: grid; gap: 10px; margin: 0; }

.etapa {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--linha);
  background: rgba(255, 255, 255, 0.02);
}

.etapa dt { font-size: 14px; color: var(--texto); }
.etapa dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  color: var(--ouro);
}
.etapa .taxa {
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--apagado);
  font-variant-numeric: tabular-nums;
}

/* ---------- Tabelas ---------- */
.rolo { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

th, td {
  text-align: left;
  padding: 9px 12px;
  border-bottom: 1px solid var(--linha);
  white-space: nowrap;
}

th {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: var(--tracking);
  text-transform: uppercase;
  color: var(--apagado);
}

td.num { font-family: var(--mono); font-variant-numeric: tabular-nums; text-align: right; }

tbody tr:hover { background: rgba(255, 255, 255, 0.02); }

.vazio { color: var(--apagado); font-size: 13.5px; padding: 14px 0; margin: 0; }

.nota {
  margin: 12px 0 0;
  padding: 12px 14px;
  border-left: 2px solid var(--ouro);
  background: rgba(196, 164, 106, 0.07);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--apagado);
}

/* ---------- Tela de senha ---------- */
.porta {
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.porta form {
  width: 100%;
  max-width: 340px;
  padding: 28px 24px;
  border: 1px solid var(--linha);
  background: rgba(255, 255, 255, 0.02);
}

label {
  display: block;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: var(--tracking);
  text-transform: uppercase;
  color: var(--apagado);
  margin: 0 0 6px;
}

input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--linha);
  border-radius: 0;
  color: var(--texto);
  font-family: inherit;
  font-size: 16px;
}

input:focus { outline: none; border-color: var(--ouro); }

button {
  width: 100%;
  min-height: 48px;
  margin-top: 18px;
  padding: 13px 18px;
  background: var(--ouro);
  border: 1px solid var(--ouro);
  border-radius: 0;
  color: #0A1420;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--tracking);
  text-transform: uppercase;
  cursor: pointer;
}

.aviso {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-left: 2px solid var(--alerta);
  background: rgba(226, 125, 96, 0.10);
  font-size: 13px;
  color: var(--alerta);
}
`;

const escapar = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const molde = (titulo, corpo) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<meta name="theme-color" content="#0A1420" />
<title>${escapar(titulo)}</title>
<style>${CSS}</style>
</head>
<body>
${corpo}
</body>
</html>`;

/** Tela de senha do painel. */
export function paginaAdminPorta({ erro, entrarPath }) {
  return molde('ATLAS — Painel', `
  <div class="porta">
    <form method="POST" action="${entrarPath}">
      <p class="marca">ATLAS</p>
      ${erro ? `<p class="aviso" role="alert">Senha incorreta.</p>` : ''}
      <label for="senha">Senha do painel</label>
      <input type="password" id="senha" name="senha" autocomplete="current-password" required autofocus />
      <button type="submit">Entrar</button>
    </form>
  </div>`);
}

const pct = (parte, todo) => (todo > 0 ? ((parte / todo) * 100).toFixed(1).replace('.', ',') + '%' : '—');

/**
 * Painel.
 *
 * @param {object} dados
 * @param {number} dados.dias          janela em dias
 * @param {object} dados.totais        { tela, cadastro_ok, app_aberto, login_ok, ... }
 * @param {Array}  dados.serie         [{ dia, evento, total }]
 * @param {Array}  dados.erros         [{ evento, detalhe, total }]
 * @param {Array}  dados.cadastros     [{ nome, email, criado_em }]
 */
export function paginaAdminPainel({ dias, totais, serie, erros, cadastros }) {
  const t = (k) => Number(totais[k] || 0);

  const funil = `
  <dl class="funil">
    <div class="etapa">
      <dt>Abriu a tela de acesso</dt>
      <dd>${t('tela')}</dd>
    </div>
    <div class="etapa">
      <dt>Criou acesso</dt>
      <dd>${t('cadastro_ok')}</dd>
      <span class="taxa">${pct(t('cadastro_ok'), t('tela'))} de quem abriu a tela</span>
    </div>
    <div class="etapa">
      <dt>Abriu o demo por dentro</dt>
      <dd>${t('app_aberto')}</dd>
      <span class="taxa">${pct(t('app_aberto'), t('cadastro_ok'))} de quem criou acesso</span>
    </div>
  </dl>
  <p class="nota">Não existe medição de "começou a preencher". Quem abre a tela, digita e
  desiste antes de enviar não gera nenhuma requisição, então esse número não é observável do
  servidor. Ele não aparece aqui em vez de aparecer errado.</p>`;

  // Série diária pivotada, uma linha por dia.
  const eventosDaSerie = ['tela', 'cadastro_ok', 'cadastro_erro', 'login_ok', 'login_erro', 'app_aberto'];
  const porDia = new Map();
  for (const l of serie) {
    if (!porDia.has(l.dia)) porDia.set(l.dia, {});
    porDia.get(l.dia)[l.evento] = (porDia.get(l.dia)[l.evento] || 0) + Number(l.total || 0);
  }
  const dias_ = [...porDia.keys()].sort().reverse();

  const tabelaSerie = dias_.length
    ? `<div class="rolo"><table>
    <thead><tr><th>Dia</th>${eventosDaSerie.map((e) => `<th>${escapar(e)}</th>`).join('')}</tr></thead>
    <tbody>${dias_.map((d) => `<tr><td>${escapar(d)}</td>${
      eventosDaSerie.map((e) => `<td class="num">${porDia.get(d)[e] || 0}</td>`).join('')
    }</tr>`).join('')}</tbody></table></div>`
    : '<p class="vazio">Nenhum evento registrado ainda.</p>';

  const tabelaErros = erros.length
    ? `<div class="rolo"><table>
    <thead><tr><th>Evento</th><th>Motivo</th><th>Total</th></tr></thead>
    <tbody>${erros.map((e) => `<tr><td>${escapar(e.evento)}</td><td>${escapar(e.detalhe || '—')}</td><td class="num">${Number(e.total || 0)}</td></tr>`).join('')}</tbody>
    </table></div>`
    : '<p class="vazio">Nenhuma recusa no período.</p>';

  const tabelaCadastros = cadastros.length
    ? `<div class="rolo"><table>
    <thead><tr><th>Nome</th><th>Email</th><th>Criado em</th></tr></thead>
    <tbody>${cadastros.map((c) => `<tr><td>${escapar(c.nome)}</td><td>${escapar(c.email)}</td><td>${escapar(c.criado_em)}</td></tr>`).join('')}</tbody>
    </table></div>`
    : '<p class="vazio">Nenhum cadastro ainda.</p>';

  return molde('ATLAS — Painel', `
  <div class="folha">
    <p class="marca">ATLAS</p>
    <h1>Painel do demo</h1>
    <p class="periodo">Funil e série dos últimos ${dias} dias. Contagem agregada, sem identificar quem fez o quê.</p>

    <h2>Funil</h2>
    ${funil}

    <h2>Por dia</h2>
    ${tabelaSerie}

    <h2>Recusas por motivo</h2>
    ${tabelaErros}

    <h2>Cadastros (${cadastros.length})</h2>
    ${tabelaCadastros}
    <p class="nota">Nome e email são dado pessoal e aparecem só aqui. Exclusão a pedido do
    cadastrado é um DELETE documentado no ESTADO/ESTADO-ATUAL.md.</p>
  </div>`);
}
