/* platform-oportunidades.jsx — Oportunidades & CRM-lite (Fase 2).
   Fila comercial derivada dos eventos/achados. O dado vem do demo sintetico
   (platform-oportunidades-demo.js) ou do overlay da instancia
   (platform-oportunidades.js, LGPD, gitignored). As edicoes do assessor ficam
   so no navegador (localStorage): nada sai do cliente nesta fase, e o export
   CSV e a saida oficial.
*/
import React from 'react';

(() => {
  const { useState, useMemo, useEffect } = React;

  const { fmtCompactBRL, downloadCSV, navigate } = window.AtlasUtils;

  // Sufixo monotônico para ids criados pelo assessor: duas criações no mesmo
  // milissegundo não colidem.
  let contadorId = 0;
  const { Icon } = window.AtlasIcons;
  const { KPITile, EmptyState, useToast } = window.AtlasUI;
  const D = window.AtlasData;

  /* Espelho de TRANSICOES_VALIDAS do motor
     (audit-engine/src/opportunities/types.ts). Manter em sincronia. */
  const PROXIMOS = {
    'Nova': ['Contatar', 'Descartada'],
    'Contatar': ['Em andamento', 'Perdida', 'Descartada'],
    'Em andamento': ['Convertida', 'Perdida', 'Descartada'],
    'Convertida': [],
    'Perdida': [],
    'Descartada': [],
  };

  /* Espelho do score do motor
     (audit-engine/src/opportunities/prioritize.ts). Fonte unica da regra de
     ordem da fila e o motor; aqui e copia literal, e tests/validate.js roda os
     mesmos casos do teste do motor sobre este bloco para travar a coincidencia.

     Antes a tela ordenava por prioridade primeiro, com PESO_PRIORIDADE local
     { P1: 0, P2: 1, P3: 2 }, e invertia a decisao aprovada: uma oportunidade
     P3 de R$ 1 mi vencendo em 7 dias (score 16) caia ATRAS de uma P1 de
     R$ 10 mil sem prazo (score 6). O score do motor era codigo morto, nenhuma
     tela o consumia. Agora a tela consome o score e mostra a coluna. */
  // ATLAS_SCORE_INICIO
  const PESO_PRIORIDADE = { P1: 3, P2: 2, P3: 1 };

  function fatorVolume(volume) {
    if (volume >= 500000) return 4;
    if (volume >= 100000) return 3;
    if (volume >= 5000) return 2;
    return 1;
  }

  function fatorPrazo(prazo, hoje) {
    const ms = Date.parse(prazo) - Date.parse(hoje);
    if (!Number.isFinite(ms)) return 1;
    const dias = Math.ceil(ms / 86400000);
    if (dias <= 7) return 4; // inclui vencido: urgencia maxima
    if (dias <= 15) return 3;
    if (dias <= 30) return 2;
    return 1;
  }

  function pontuarOportunidade(op, hoje) {
    return (PESO_PRIORIDADE[op.prioridade] || 0) * fatorVolume(op.volume) * fatorPrazo(op.prazo, hoje);
  }

  /* Score decrescente; empate: prazo mais proximo, depois id (ordem total). */
  function priorizarOportunidades(ops, hoje) {
    return [...ops].sort((a, b) => {
      const sa = pontuarOportunidade(a, hoje);
      const sb = pontuarOportunidade(b, hoje);
      if (sa !== sb) return sb - sa;
      if (a.prazo !== b.prazo) return a.prazo < b.prazo ? -1 : 1;
      return a.id.localeCompare(b.id);
    });
  }
  // ATLAS_SCORE_FIM

  const STATUS_ATIVOS = ['Nova', 'Contatar', 'Em andamento'];

  const COR_STATUS = {
    'Nova': 'var(--navy, #1e3a5f)',
    'Contatar': 'var(--amber, #b45309)',
    'Em andamento': 'var(--amber, #b45309)',
    'Convertida': 'var(--green, #166534)',
    'Perdida': 'var(--red, #b91c1c)',
    'Descartada': 'var(--muted, #64748b)',
  };
  const COR_PRIORIDADE = {
    P1: 'var(--red, #b91c1c)',
    P2: 'var(--amber, #b45309)',
    P3: 'var(--navy, #1e3a5f)',
  };

  const STORAGE_KEY = 'atlas_oportunidades_v1';

  function carregarSalvo() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 1 && Array.isArray(parsed.oportunidades)) return parsed.oportunidades;
    } catch (e) { /* storage ilegivel: segue com a base */ }
    return null;
  }

  function salvar(lista) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, oportunidades: lista })); } catch (e) {}
  }

  function hojeISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function nomeAssessor(id) {
    /* O namespace exporta MANAGERS em caixa alta. Com `managers` o guard caia
       sempre e a coluna Assessor mostrava o codigo interno (AXIOM_AM) em vez do
       nome do gestor, na tela e em todo CSV, sem quebrar nada. */
    if (!D || !D.MANAGERS) return id || '';
    const m = D.MANAGERS.find((x) => x.id === id);
    return m ? m.name : (id || '');
  }

  function nomeCarteira(code) {
    if (!D || !D.CATALOG) return code;
    const p = D.CATALOG.find((x) => x.code === code);
    return p ? p.name : code;
  }

  function chip(texto, cor) {
    return (
      <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
        fontSize: '0.714rem', fontWeight: 600, color: cor,
        border: '1px solid ' + cor, whiteSpace: 'nowrap',
      }}>
        {texto}
      </span>
    );
  }

  function FormNova({ inicial, onSalvar, onCancelar }) {
    const [carteira, setCarteira] = useState(inicial.carteira);
    const [motivo, setMotivo] = useState(inicial.motivo);
    const [volume, setVolume] = useState(inicial.volume);
    const [prioridade, setPrioridade] = useState(inicial.prioridade);
    const [prazo, setPrazo] = useState(inicial.prazo);
    const [erro, setErro] = useState('');

    const catalogo = (D && D.CATALOG) || [];

    function submit() {
      const vol = parseFloat(String(volume).replace(',', '.'));
      if (!carteira || !motivo.trim() || !Number.isFinite(vol) || !prazo) {
        setErro('Preencha carteira, motivo, volume e prazo.');
        return;
      }
      onSalvar({ carteira, motivo: motivo.trim(), volume: vol, prioridade, prazo, origem: inicial.origem });
    }

    return (
      <div style={{ border: '1px solid var(--rule)', borderRadius: 10, padding: 16, marginBottom: 16, background: 'var(--surface-alt, transparent)' }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Nova oportunidade</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <label style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
            Carteira
            <select value={carteira} onChange={(e) => setCarteira(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
              <option value="">Selecione</option>
              {catalogo.map((p) => (
                <option key={p.code} value={p.code}>{p.code} · {p.name}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
            Prioridade
            <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </label>
          <label style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
            Volume (R$)
            <input type="number" step="any" min="0" value={volume} onChange={(e) => setVolume(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
          </label>
          <label style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
            Prazo
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
          </label>
        </div>
        <label style={{ fontSize: '0.786rem', color: 'var(--muted)', display: 'block', marginTop: 10 }}>
          Motivo
          <textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
        </label>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={submit}>Salvar</button>
          <button className="btn btn--ghost" onClick={onCancelar}>Cancelar</button>
          {erro && <span style={{ fontSize: '0.786rem', color: 'var(--red)' }}>{erro}</span>}
        </div>
      </div>
    );
  }

  function FormContato({ onSalvar, onCancelar }) {
    const [canal, setCanal] = useState('Telefone');
    const [observacao, setObservacao] = useState('');

    return (
      <div style={{ border: '1px solid var(--rule)', borderRadius: 10, padding: 16, marginBottom: 16, background: 'var(--surface-alt, transparent)' }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Registrar contato</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
            Canal
            <select value={canal} onChange={(e) => setCanal(e.target.value)} style={{ marginLeft: 6 }}>
              <option>Telefone</option>
              <option>WhatsApp</option>
              <option>E-mail</option>
              <option>Reunião</option>
            </select>
          </label>
          <input
            placeholder="Observação do contato"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <button className="btn" onClick={() => onSalvar({ canal, observacao })}>Salvar</button>
          <button className="btn btn--ghost" onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    );
  }

  function Oportunidades({ location }) {
    const { addToast } = useToast();
    const base = useMemo(
      () => (window.ATLAS_OPORTUNIDADES_DATA ? window.ATLAS_OPORTUNIDADES_DATA.oportunidades : []),
      []
    );
    const [lista, setLista] = useState(() => {
      // Fusão por id: a base (demo/overlay) é relida a cada visita, então
      // eventos novos do snapshot aparecem; as edições do assessor salvas no
      // navegador sobrescrevem; oportunidades criadas à mão, que só existem
      // no storage, sobrevivem. Sem isso a fila congelava no primeiro
      // salvamento e parava de crescer em silêncio.
      const salvas = carregarSalvo();
      if (!salvas) return base;
      const salvasPorId = new Map(salvas.map((o) => [o.id, o]));
      const basePorId = new Map(base.map((o) => [o.id, o]));
      const fundidas = base.map((o) => salvasPorId.get(o.id) ?? o);
      const soSalvas = salvas.filter((o) => !basePorId.has(o.id));
      return [...soSalvas, ...fundidas];
    });
    const [form, setForm] = useState(null); // null | { tipo:'nova', ... } | { tipo:'contato', id }

    // Fluxo "criar a partir do achado": #/oportunidades?nova=1&carteira=..&motivo=..&origem=achado&periodo=..
    // O parâmetro é consumido e a URL limpa na sequência: recarregar a página
    // não reabre o formulário pré-preenchido (sem duplicata por engano).
    useEffect(() => {
      const p = location && location.params;
      if (p && p.nova === '1') {
        setForm({
          tipo: 'nova',
          carteira: p.carteira || '',
          motivo: p.motivo || '',
          volume: '',
          prioridade: 'P2',
          prazo: '',
          origem: p.origem === 'achado'
            ? { tipo: 'achado', id: (p.periodo || '') + '|' + (p.carteira || ''), periodo: p.periodo || '' }
            : { tipo: 'achado', id: '', periodo: '' },
        });
        navigate('#/oportunidades');
      }
    }, [location]);

    const hoje = hojeISO();

    const ordenadas = useMemo(() => priorizarOportunidades(lista, hoje), [lista, hoje]);

    const fila = ordenadas.filter((o) => STATUS_ATIVOS.indexOf(o.status) >= 0);

    function aplicarTransicao(op, para) {
      const permitidos = PROXIMOS[op.status] || [];
      if (permitidos.indexOf(para) < 0) return;
      const agora = new Date().toISOString();
      const nova = lista.map((o) => (o.id === op.id ? { ...o, status: para, updatedAt: agora } : o));
      setLista(nova);
      salvar(nova);
      addToast('Status atualizado para ' + para + '.');
    }

    function registrarContato(id, dados) {
      const agora = new Date().toISOString();
      const nova = lista.map((o) => o.id === id
        ? { ...o, ultimoContato: { data: hoje, canal: dados.canal, observacao: dados.observacao }, updatedAt: agora }
        : o);
      setLista(nova);
      salvar(nova);
      setForm(null);
      addToast('Contato registrado.');
    }

    function criarOportunidade(dados) {
      const agora = new Date().toISOString();
      const cat = ((D && D.CATALOG) || []).find((p) => p.code === dados.carteira);
      const nova = {
        id: 'op-' + dados.carteira + '-' + agora + '-' + (++contadorId),
        cliente: dados.carteira,
        assessor: cat ? cat.mgr : '',
        motivo: dados.motivo,
        volume: dados.volume,
        prioridade: dados.prioridade,
        prazo: dados.prazo,
        status: 'Nova',
        ultimoContato: null,
        proximoContato: null,
        observacao: '',
        resultado: null,
        origem: dados.origem,
        createdAt: agora,
        updatedAt: agora,
      };
      const prox = [nova, ...lista];
      setLista(prox);
      salvar(prox);
      setForm(null);
      addToast('Oportunidade criada.');
    }

    function exportar() {
      // texto que começa com '=' ganha apóstrofo: planilha não interpreta
      // como fórmula (higiene de export, o vetor é o próprio assessor)
      const csvSeguro = (t) => (String(t).charAt(0) === '=' ? "'" + t : t);
      const rows = ordenadas.map((o) => ({
        Carteira: o.cliente,
        Assessor: o.assessor,
        Motivo: csvSeguro(o.motivo),
        Volume: o.volume,
        Prioridade: o.prioridade,
        Score: pontuarOportunidade(o, hoje),
        Prazo: o.prazo,
        Status: o.status,
        'Ultimo contato': o.ultimoContato ? o.ultimoContato.data : '',
      }));
      downloadCSV(rows, 'atlas_oportunidades_' + hoje);
    }

    if (!lista.length) {
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Advisor Intelligence</div>
            <h1 className="page-title">Oportunidades</h1>
          </div>
          <EmptyState
            title="Nenhuma oportunidade"
            sub="Quando os eventos do ciclo gerarem ações comerciais, elas aparecem aqui."
            icon="portfolios"
          />
        </div>
      );
    }

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Advisor Intelligence</div>
          <h1 className="page-title">Oportunidades</h1>
          <div className="page-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{fila.length} na fila · {lista.length - fila.length} fora da fila</span>
            <span style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--ghost" onClick={() => setForm({ tipo: 'nova', carteira: '', motivo: '', volume: '', prioridade: 'P2', prazo: '', origem: { tipo: 'achado', id: '', periodo: '' } })} style={{ fontSize: '0.786rem', padding: '6px 12px' }}>
                <Icon name="portfolios" size={14} /> Nova oportunidade
              </button>
              <button className="btn btn--ghost" onClick={exportar} style={{ fontSize: '0.786rem', padding: '6px 12px' }}>
                <Icon name="export" size={14} /> Exportar CSV
              </button>
            </span>
          </div>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <KPITile label="Na fila" value={fila.length} sub="Ações comerciais ativas" variant="navy" />
          <KPITile label="P1 na fila" value={fila.filter((o) => o.prioridade === 'P1').length} sub="Prioridade máxima" variant={fila.some((o) => o.prioridade === 'P1') ? 'red' : undefined} />
          <KPITile label="Volume na fila" value={fmtCompactBRL(fila.reduce((s, o) => s + o.volume, 0))} sub="Soma dos volumes" />
          <KPITile label="Convertidas" value={lista.filter((o) => o.status === 'Convertida').length} sub="Resultado do ciclo" variant="green" />
        </div>

        {form && form.tipo === 'nova' && (
          <FormNova
            inicial={form}
            onSalvar={criarOportunidade}
            onCancelar={() => setForm(null)}
          />
        )}
        {form && form.tipo === 'contato' && (
          <FormContato
            onSalvar={(dados) => registrarContato(form.id, dados)}
            onCancelar={() => setForm(null)}
          />
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Carteira</th>
                <th>Assessor</th>
                <th>Ação comercial</th>
                <th style={{ textAlign: 'right' }}>Volume</th>
                <th>Prior.</th>
                <th style={{ textAlign: 'right' }} title="Prioridade x volume x prazo, a mesma conta do motor">Score</th>
                <th>Prazo</th>
                <th>Status</th>
                <th>Último contato</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((o) => {
                const vencido = o.prazo < hoje && STATUS_ATIVOS.indexOf(o.status) >= 0;
                const permitidos = PROXIMOS[o.status] || [];
                return (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>{o.cliente}</div>
                      <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{nomeCarteira(o.cliente)}</div>
                    </td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>{nomeAssessor(o.assessor)}</td>
                    <td className="cell-prose" style={{ fontSize: '0.857rem', maxWidth: 420 }}>{o.motivo}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCompactBRL(o.volume)}</td>
                    <td>{chip(o.prioridade, COR_PRIORIDADE[o.prioridade])}</td>
                    <td
                      style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}
                      title={
                        'prioridade ' + (PESO_PRIORIDADE[o.prioridade] || 0) +
                        ' x volume ' + fatorVolume(o.volume) +
                        ' x prazo ' + fatorPrazo(o.prazo, hoje)
                      }
                    >
                      {pontuarOportunidade(o, hoje)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: vencido ? 'var(--red)' : undefined, fontWeight: vencido ? 600 : undefined }}>
                      {o.prazo}{vencido ? ' · vencido' : ''}
                    </td>
                    <td>{chip(o.status, COR_STATUS[o.status])}</td>
                    <td style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
                      {o.ultimoContato ? o.ultimoContato.data + ' · ' + o.ultimoContato.canal : '—'}
                    </td>
                    <td>
                      <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {permitidos.map((para) => (
                          <button
                            key={para}
                            className="btn btn--ghost"
                            title={'Mover para ' + para}
                            onClick={() => aplicarTransicao(o, para)}
                            style={{ fontSize: '0.714rem', padding: '2px 8px' }}
                          >
                            {para}
                          </button>
                        ))}
                        {STATUS_ATIVOS.indexOf(o.status) >= 0 && (
                          <button
                            className="btn btn--ghost"
                            title="Registrar contato"
                            onClick={() => setForm({ tipo: 'contato', id: o.id })}
                            style={{ fontSize: '0.714rem', padding: '2px 8px' }}
                          >
                            Contato
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Oportunidades = Oportunidades;
})();
