/* platform-usuarios.jsx — administração de acesso, só para o titular.

   Antes esta tela dizia que quem administrava acesso era o Cloudflare Access e
   não geria usuário nenhum. Isso era verdade para a instância e falso para o
   demo, que tem cadastro e sessão próprios. Agora ela administra de verdade, e
   o que ela administra é o banco: cada ação vira uma chamada de API, e é o
   servidor quem decide.

   Três coisas que esta tela NÃO faz, de propósito:
     - não decide papel. A API só aceita criar assessor ou cliente, e não existe
       rota para transformar ninguém em titular. Titular nasce com a organização.
     - não desativa o próprio acesso. O servidor recusa, e recusaria mesmo se
       esta tela oferecesse o botão.
     - não conhece carteira de outra organização. A lista de carteiras vem do
       que a API devolveu, e o servidor descarta em silêncio o código que não
       for da casa. */

import React from 'react';

(() => {
  const { useState, useEffect, useCallback } = React;
  const { Icon } = window.AtlasIcons;
  const { useToast } = window.AtlasUI;

  const ROTULO_PAPEL = { owner: 'Titular', manager: 'Gerente', client: 'Cliente' };

  async function chamar(url, opcoes) {
    const cfg = Object.assign({ credentials: 'same-origin' }, opcoes || {});
    cfg.headers = Object.assign({ Accept: 'application/json' }, cfg.headers || {});
    let r;
    try {
      r = await fetch(url, cfg);
    } catch (e) {
      return { erro: 'Não foi possível falar com o servidor.' };
    }
    if (r.status === 401 || r.status === 403) return { negado: true };
    let corpo = null;
    try {
      corpo = await r.json();
    } catch (e) {
      return { erro: 'Resposta ilegível do servidor.' };
    }
    if (!r.ok) return { erro: 'O servidor recusou a operação.' };
    return { corpo: corpo };
  }

  function post(url, dados) {
    return chamar(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados || {}),
    });
  }

  function nomeCarteira(code) {
    const D = window.AtlasData;
    if (!D || !D.CATALOG) return code;
    const p = D.CATALOG.filter((x) => x.code === code)[0];
    return p ? p.name : code;
  }

  function Usuarios() {
    const { addToast } = useToast();
    const [estado, setEstado] = useState({ situacao: 'carregando' });
    const [ocupado, setOcupado] = useState(false);
    const [novo, setNovo] = useState({ nome: '', email: '', senha: '', role: 'manager', cliente_id: '' });
    const [abrindoForm, setAbrindoForm] = useState(false);
    const [editandoAtrib, setEditandoAtrib] = useState(null);

    const carregar = useCallback(async () => {
      const r = await chamar('/api/usuarios');
      if (r.negado) { setEstado({ situacao: 'negado' }); return; }
      if (r.erro) { setEstado({ situacao: 'falha', detalhe: r.erro }); return; }
      setEstado({ situacao: 'ok', usuarios: r.corpo.usuarios || [], carteiras: r.corpo.carteiras || [] });
    }, []);

    useEffect(() => { carregar(); }, [carregar]);

    async function alternarAtivo(u) {
      setOcupado(true);
      const r = await post('/api/usuarios/' + u.id + '/status', { ativo: u.ativo ? 0 : 1 });
      setOcupado(false);
      if (r.negado) { addToast('O servidor recusou a mudança de situação.', 'error'); return; }
      if (r.erro) { addToast(r.erro, 'error'); return; }
      addToast(u.ativo ? 'Acesso desativado.' : 'Acesso reativado.', 'success');
      carregar();
    }

    async function salvarAtribuicoes(u, marcadas) {
      setOcupado(true);
      const r = await post('/api/usuarios/' + u.id + '/atribuicoes', { carteiras: marcadas });
      setOcupado(false);
      if (r.negado) { addToast('O servidor recusou a alteração das carteiras.', 'error'); return; }
      if (r.erro) { addToast(r.erro, 'error'); return; }
      setEditandoAtrib(null);
      addToast('Carteiras atualizadas.', 'success');
      carregar();
    }

    async function criar(e) {
      e.preventDefault();
      setOcupado(true);
      const corpo = { nome: novo.nome, email: novo.email, senha: novo.senha, role: novo.role };
      if (novo.role === 'client') corpo.cliente_id = novo.cliente_id;
      const r = await post('/api/usuarios', corpo);
      setOcupado(false);
      if (r.negado) { addToast('O servidor recusou o cadastro. Confira o e-mail, a senha (mínimo 8 caracteres) e a carteira escolhida.', 'error'); return; }
      if (r.erro) { addToast(r.erro, 'error'); return; }
      setNovo({ nome: '', email: '', senha: '', role: 'manager', cliente_id: '' });
      setAbrindoForm(false);
      addToast('Acesso criado.', 'success');
      carregar();
    }

    if (estado.situacao === 'carregando') {
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Configurações</div>
            <h1 className="page-title">Usuários</h1>
          </div>
          <div className="page-placeholder">Carregando…</div>
        </div>
      );
    }

    if (estado.situacao === 'negado') {
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Configurações</div>
            <h1 className="page-title">Usuários</h1>
          </div>
          <div className="page-placeholder">
            Administrar acesso é do titular da organização. O seu acesso não alcança esta área.
          </div>
        </div>
      );
    }

    if (estado.situacao === 'falha') {
      return (
        <div>
          <div className="page-header">
            <div className="page-eyebrow">Configurações</div>
            <h1 className="page-title">Usuários</h1>
          </div>
          <div className="page-placeholder">
            {estado.detalhe || 'Não foi possível carregar a lista.'}
            {' '}
            <button className="btn btn--ghost" onClick={carregar}>Tentar de novo</button>
          </div>
        </div>
      );
    }

    const usuarios = estado.usuarios;
    const carteiras = estado.carteiras;
    // A organização tem um titular só, e é quem está usando a tela, porque
    // criar outro titular não é operação que exista. O rótulo é de interface,
    // não de segurança: quem recusaria desativar o próprio acesso é o servidor.
    const meuId = (usuarios.filter((u) => u.role === 'owner')[0] || {}).id;

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Configurações</div>
          <h1 className="page-title">Usuários</h1>
          <div className="page-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span>Quem acessa as carteiras desta organização</span>
            <button className="btn btn--ghost" onClick={() => setAbrindoForm(v => !v)} style={{ fontSize: '0.786rem', padding: '6px 12px' }}>
              <Icon name="users" size={14} /> {abrindoForm ? 'Fechar' : 'Novo acesso'}
            </button>
          </div>
        </div>

        {abrindoForm && (
          <form className="card" onSubmit={criar} style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 10 }}>Novo acesso</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ fontSize: '0.786rem' }}>
                Nome
                <input
                  className="form-input" required maxLength={120}
                  value={novo.nome}
                  onChange={e => setNovo(Object.assign({}, novo, { nome: e.target.value }))}
                />
              </label>
              <label style={{ fontSize: '0.786rem' }}>
                E-mail
                <input
                  className="form-input" type="email" required
                  value={novo.email}
                  onChange={e => setNovo(Object.assign({}, novo, { email: e.target.value }))}
                />
              </label>
              <label style={{ fontSize: '0.786rem' }}>
                Senha (mínimo 8 caracteres)
                <input
                  className="form-input" type="password" required minLength={8} maxLength={128}
                  value={novo.senha}
                  onChange={e => setNovo(Object.assign({}, novo, { senha: e.target.value }))}
                />
              </label>
              <label style={{ fontSize: '0.786rem' }}>
                Papel
                <select
                  className="form-select"
                  value={novo.role}
                  onChange={e => setNovo(Object.assign({}, novo, { role: e.target.value, cliente_id: '' }))}
                >
                  <option value="manager">Gerente, vê as carteiras atribuídas a ele</option>
                  <option value="client">Cliente, vê só a própria carteira</option>
                </select>
              </label>
              {novo.role === 'client' && (
                <label style={{ fontSize: '0.786rem' }}>
                  Carteira do cliente
                  <select
                    className="form-select" required
                    value={novo.cliente_id}
                    onChange={e => setNovo(Object.assign({}, novo, { cliente_id: e.target.value }))}
                  >
                    <option value="">Escolha a carteira</option>
                    {carteiras.map((c) => (
                      <option key={c} value={c}>{c} · {nomeCarteira(c)}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" type="submit" disabled={ocupado}>
                {ocupado ? 'Criando…' : 'Criar acesso'}
              </button>
            </div>
          </form>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 180 }}>Pessoa</th>
                <th>Papel</th>
                <th>Situação</th>
                <th style={{ minWidth: 220 }}>Carteiras</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.55 }}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.857rem' }}>
                      {u.nome}{u.id === meuId ? ' · você' : ''}
                    </div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--muted)' }}>{u.email}</div>
                  </td>
                  <td style={{ fontSize: '0.857rem' }}>{ROTULO_PAPEL[u.role] || u.role}</td>
                  <td>
                    <span className={'badge ' + (u.ativo ? 'badge--green' : 'badge--muted')}>
                      {u.ativo ? 'Ativo' : 'Desativado'}
                    </span>
                  </td>
                  <td>
                    {editandoAtrib === u.id ? (
                      <FormAtribuicoes
                        usuario={u}
                        carteiras={carteiras}
                        ocupado={ocupado}
                        onCancelar={() => setEditandoAtrib(null)}
                        onSalvar={salvarAtribuicoes}
                      />
                    ) : u.role === 'owner' ? (
                      <span style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>
                        Todas as {carteiras.length} carteiras da organização
                      </span>
                    ) : (u.atribuicoes || []).length ? (
                      <span style={{ fontSize: '0.786rem' }}>
                        {(u.atribuicoes || []).length} de {carteiras.length}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>Nenhuma</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {u.role !== 'owner' && (
                      <>
                        <button
                          className="btn btn--ghost"
                          style={{ fontSize: '0.714rem', padding: '2px 8px', marginRight: 6 }}
                          onClick={() => setEditandoAtrib(editandoAtrib === u.id ? null : u.id)}
                          disabled={ocupado}
                        >
                          Carteiras
                        </button>
                        <button
                          className="btn btn--ghost"
                          style={{ fontSize: '0.714rem', padding: '2px 8px', color: u.ativo ? '#8B1A1A' : undefined }}
                          onClick={() => alternarAtivo(u)}
                          disabled={ocupado}
                        >
                          {u.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontSize: '0.714rem', color: 'var(--muted)' }}>
          O titular não pode ser desativado por esta tela, e a organização fica sem quem a administre.
        </div>

        <TrilhaDeAuditoria />
      </div>
    );
  }

  function FormAtribuicoes({ usuario, carteiras, ocupado, onCancelar, onSalvar }) {
    const [marcadas, setMarcadas] = useState(() => (usuario.atribuicoes || []).slice());

    function alternar(code) {
      setMarcadas(prev => prev.indexOf(code) >= 0 ? prev.filter(c => c !== code) : prev.concat([code]));
    }

    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {carteiras.map((c) => (
            <label key={c} style={{ display: 'block', fontSize: '0.786rem', padding: '2px 0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={marcadas.indexOf(c) >= 0}
                onChange={() => alternar(c)}
                style={{ marginRight: 6 }}
              />
              {c} · {nomeCarteira(c)}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.714rem', padding: '2px 10px' }}
            onClick={() => onSalvar(usuario, marcadas)}
            disabled={ocupado}
          >
            Salvar
          </button>
          <button
            className="btn btn--ghost"
            style={{ fontSize: '0.714rem', padding: '2px 10px' }}
            onClick={onCancelar}
            disabled={ocupado}
          >
            Cancelar
          </button>
          <span style={{ fontSize: '0.714rem', color: 'var(--muted)', alignSelf: 'center' }}>
            {marcadas.length} de {carteiras.length} marcadas
          </span>
        </div>
      </div>
    );
  }

  /* Trilha do que aconteceu, com o que a API devolve: dia, papel, recurso, ação
     e resultado. Sem nome nem e-mail, de propósito. A tabela de auditoria liga
     ação a pessoa, e é dado pessoal, então ela precisa de finalidade declarada
     e de alguém que consiga ver o que foi registrado sobre a própria casa. Sem
     esta seção, o registro seria só uma caixa-preta do fornecedor. */
  function TrilhaDeAuditoria() {
    const [eventos, setEventos] = useState(null);
    const [aberto, setAberto] = useState(false);

    useEffect(() => {
      if (!aberto || eventos) return;
      chamar('/api/auditoria').then(r => setEventos(r.corpo ? (r.corpo.eventos || []) : []));
    }, [aberto, eventos]);

    return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">Registro de acesso</div>
          <button className="btn btn--ghost" style={{ fontSize: '0.714rem', padding: '2px 10px' }} onClick={() => setAberto(v => !v)}>
            {aberto ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {aberto && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Papel</th>
                  <th>Área</th>
                  <th>Ação</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {(eventos || []).map((e, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap' }}>{e.dia}</td>
                    <td style={{ fontSize: '0.786rem' }}>{ROTULO_PAPEL[e.role] || e.role || '—'}</td>
                    <td style={{ fontSize: '0.786rem' }}>{e.recurso}</td>
                    <td style={{ fontSize: '0.786rem' }}>{e.acao}</td>
                    <td style={{ fontSize: '0.786rem' }}>{e.resultado}</td>
                  </tr>
                ))}
                {eventos && eventos.length === 0 && (
                  <tr><td colSpan={5} style={{ fontSize: '0.786rem', color: 'var(--muted)' }}>Nada registrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Usuarios = Usuarios;
})();
