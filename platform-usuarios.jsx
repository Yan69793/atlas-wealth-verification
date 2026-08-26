/* platform-usuarios.jsx — Gestão de Usuários */
import React from 'react';

(() => {
  function Usuarios() {
    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Configurações</div>
          <h1 className="page-title">Usuários</h1>
          <div className="page-subtitle">
            Quem acessa este ambiente
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--heading)', marginBottom: 10 }}>
            Gerenciado pelo Cloudflare Access
          </div>
          <p style={{ fontSize: '0.857rem', color: 'var(--body)', lineHeight: 1.6, margin: '0 0 10px' }}>
            O acesso a este ambiente é controlado pelo Cloudflare Access, na frente do sistema.
            Quem pode entrar é decidido lá, não aqui.
          </p>
          <p style={{ fontSize: '0.857rem', color: 'var(--body)', lineHeight: 1.6, margin: 0 }}>
            Liberar ou remover o acesso de alguém é tarefa do administrador da conta. Esta tela
            não gerencia usuário nenhum.
          </p>
        </div>
      </div>
    );
  }

  window.AtlasPages = window.AtlasPages || {};
  window.AtlasPages.Usuarios = Usuarios;
})();
