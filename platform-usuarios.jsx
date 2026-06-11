/* platform-usuarios.jsx — Gestão de Usuários */
(() => {
  const { useState } = React;
  const { storage, navigate } = window.AtlasUtils;
  const { Icon }              = window.AtlasIcons;

  const ROLES = ['Administrador', 'Analista', 'Visualizador'];

  function Usuarios() {
    const { useToast, useAuth } = window.AtlasContexts;
    const { addToast }          = useToast();
    const { logout }            = useAuth();

    const [users, setUsers] = useState(() => storage.get().users || []);

    // Form: novo usuário
    const [form, setForm] = useState({ name: '', email: '', role: ROLES[1] });
    const [formErr, setFormErr] = useState('');

    // Troca de senha
    const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' });
    const [pwErr,  setPwErr]    = useState('');

    function saveUsers(list) {
      storage.update(d => { d.users = list; });
      setUsers(list);
    }

    function handleAddUser(e) {
      e.preventDefault();
      setFormErr('');
      if (!form.name.trim()) { setFormErr('Nome obrigatório.'); return; }
      if (!form.email.trim() || !form.email.includes('@')) { setFormErr('E-mail inválido.'); return; }
      const newUser = { id: Date.now(), name: form.name.trim(), email: form.email.trim(), role: form.role };
      const updated = [...users, newUser];
      saveUsers(updated);
      setForm({ name: '', email: '', role: ROLES[1] });
      addToast('Usuário ' + newUser.name + ' adicionado.', 'info');
    }

    function handleRemove(id) {
      const updated = users.filter(u => u.id !== id);
      saveUsers(updated);
      addToast('Usuário removido.', 'info');
    }

    function handleChangePassword(e) {
      e.preventDefault();
      setPwErr('');
      if (pwForm.current !== 'atlas2026') { setPwErr('Senha atual incorreta.'); return; }
      if (pwForm.next.length < 6) { setPwErr('Nova senha deve ter no mínimo 6 caracteres.'); return; }
      if (pwForm.next !== pwForm.confirm) { setPwErr('Senhas não coincidem.'); return; }
      addToast('Senha atualizada. Faça login novamente.', 'info');
      setTimeout(() => { logout(); navigate('#/login'); }, 1200);
    }

    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Configurações</div>
          <h1 className="page-title">Usuários</h1>
          <div className="page-subtitle">
            Gerencie o acesso à plataforma
          </div>
        </div>

        <div className="usuarios-grid">
          {/* Lista de usuários */}
          <div>
            {/* Usuário admin fixo */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)', marginBottom: 12 }}>
                Usuários com acesso
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontSize: '0.714rem', color: 'var(--muted)', padding: '4px 0 8px', fontWeight: 600 }}>Nome</th>
                    <th style={{ textAlign: 'left', fontSize: '0.714rem', color: 'var(--muted)', padding: '4px 0 8px', fontWeight: 600 }}>E-mail</th>
                    <th style={{ textAlign: 'left', fontSize: '0.714rem', color: 'var(--muted)', padding: '4px 0 8px', fontWeight: 600 }}>Perfil</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {/* Linha admin (não removível) */}
                  <tr style={{ borderTop: '1px solid var(--rule)' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600, fontSize: '0.857rem' }}>Administrador</td>
                    <td style={{ padding: '10px 0', fontSize: '0.786rem', color: 'var(--muted)' }}>—</td>
                    <td style={{ padding: '10px 0' }}>
                      <span style={{
                        background: 'var(--paper-mid)', color: 'var(--navy)', border: '1px solid var(--rule)',
                        borderRadius: 'var(--r-sm)', padding: '2px 8px', fontSize: '0.714rem', fontWeight: 600,
                      }}>
                        Administrador
                      </span>
                    </td>
                    <td />
                  </tr>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--rule)' }}>
                      <td style={{ padding: '10px 0', fontWeight: 600, fontSize: '0.857rem' }}>{u.name}</td>
                      <td style={{ padding: '10px 0', fontSize: '0.786rem', color: 'var(--muted)' }}>{u.email}</td>
                      <td style={{ padding: '10px 0' }}>
                        <span style={{
                          background: 'var(--paper-mid)', color: 'var(--body)', border: '1px solid var(--rule)',
                          borderRadius: 'var(--r-sm)', padding: '2px 8px', fontSize: '0.714rem', fontWeight: 600,
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        <button
                          className="btn btn--ghost"
                          onClick={() => handleRemove(u.id)}
                          style={{ fontSize: '0.714rem', padding: '4px 10px', color: 'var(--red)' }}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Painel direito: Novo usuário + Trocar senha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Form: novo usuário */}
            <div className="card">
              <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)', marginBottom: 14 }}>
                Adicionar usuário
              </div>
              <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Nome</label>
                  <input
                    type="text"
                    className="filter-select"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>E-mail</label>
                  <input
                    type="email"
                    className="filter-select"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Perfil</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {formErr && (
                  <div style={{ fontSize: '0.786rem', color: 'var(--red)' }}>{formErr}</div>
                )}
                <button type="submit" className="btn btn--primary" style={{ marginTop: 4 }}>
                  Adicionar
                </button>
              </form>
            </div>

            {/* Troca de senha */}
            <div className="card">
              <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)', marginBottom: 14 }}>
                Trocar senha de acesso
              </div>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Senha atual</label>
                  <input
                    type="password"
                    className="filter-select"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={pwForm.current}
                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Nova senha (mín. 6 caracteres)</label>
                  <input
                    type="password"
                    className="filter-select"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={pwForm.next}
                    onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.714rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Confirmar nova senha</label>
                  <input
                    type="password"
                    className="filter-select"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                    autoComplete="new-password"
                  />
                </div>
                {pwErr && (
                  <div style={{ fontSize: '0.786rem', color: 'var(--red)' }}>{pwErr}</div>
                )}
                <button type="submit" className="btn btn--ghost" style={{ marginTop: 4 }}>
                  Atualizar senha
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Usuarios = Usuarios;
})();
