/**
 * Notificador Management - Admin Interface
 * CRUD completo de avisos com preview em tempo real
 */

// Estado
let avisos = [];

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  carregarAvisos();

  document.getElementById('btn-novo-aviso').addEventListener('click', abrirModalNovoAviso);
});

// ============================================
// CARREGAR AVISOS
// ============================================
async function carregarAvisos() {
  try {
    const res = await fetch('/api/admin/avisos/listar');
    const data = await res.json();

    if (data.success) {
      avisos = data.avisos;
      renderizarAvisos();
    } else {
      SuperModal.toast.error('Erro ao carregar avisos');
    }
  } catch (error) {
    console.error('[NOTIFICADOR] Erro ao carregar:', error);
    SuperModal.toast.error('Erro ao carregar avisos');
  }
}

// ============================================
// RENDERIZAR AVISOS
// ============================================
function renderizarAvisos() {
  const container = document.getElementById('avisos-list');

  if (avisos.length === 0) {
    container.innerHTML = `
      <div class="notificador-empty" style="grid-column: 1 / -1;">
        <span class="material-icons notificador-empty-icon">notifications_none</span>
        <p>Nenhum aviso cadastrado</p>
        <p style="font-size: 0.875rem; margin-top: 0.5rem;">Clique em "Novo Aviso" para começar</p>
      </div>
    `;
    return;
  }

  container.innerHTML = avisos.map(aviso => {
    const categoria = aviso.categoria || 'info';
    const ativo = aviso.ativo || false;
    const sincronizado = aviso.sincronizadoComApp || false;

    const btnPublicarTexto = sincronizado ? 'Remover do App' : 'Enviar para App';
    const btnPublicarClass = sincronizado ? 'despublicar' : '';
    const btnPublicarIcon = sincronizado ? 'visibility_off' : 'send';

    // Expirado?
    const expirado = aviso.dataExpiracao && new Date(aviso.dataExpiracao) < new Date();
    const statusExpirado = expirado ? '<span style="color: var(--color-danger); font-size: 0.75rem; margin-left: 0.5rem;">⏰ Expirado</span>' : '';

    return `
      <div class="notificador-card" data-id="${aviso._id}">
        <div class="notificador-card-header">
          <div>
            <span class="notificador-card-categoria categoria-${categoria}">
              ${categoria}
            </span>
            ${statusExpirado}
          </div>
        </div>

        <h3 class="notificador-card-title">${aviso.titulo}</h3>
        <p class="notificador-card-mensagem">${aviso.mensagem}</p>

        <div class="notificador-card-footer">
          <div class="notificador-toggle">
            <div class="toggle-switch ${ativo ? 'active' : ''}"
                 data-id="${aviso._id}"
                 onclick="toggleAtivo('${aviso._id}')">
            </div>
            <span style="color: var(--text-muted); font-size: 0.875rem;">
              ${ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <button class="notificador-btn-publicar ${btnPublicarClass}"
                  onclick="togglePublicacao('${aviso._id}', ${sincronizado})"
                  ${!ativo || expirado ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <span class="material-icons" style="font-size: 1rem;">${btnPublicarIcon}</span>
            ${btnPublicarTexto}
          </button>
        </div>

        <div class="notificador-card-actions">
          <button class="notificador-btn-icon"
                  onclick="editarAviso('${aviso._id}')"
                  title="Editar">
            <span class="material-icons">edit</span>
          </button>
          <button class="notificador-btn-icon"
                  onclick="deletarAviso('${aviso._id}')"
                  title="Deletar">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// TOGGLE ATIVO/INATIVO
// ============================================
window.toggleAtivo = async function(id) {
  try {
    const res = await fetch(`/api/admin/avisos/${id}/toggle`, {
      method: 'PATCH'
    });
    const data = await res.json();

    if (data.success) {
      SuperModal.toast.success(data.message);
      carregarAvisos();
    } else {
      SuperModal.toast.error(data.error);
    }
  } catch (error) {
    console.error('[NOTIFICADOR] Erro ao toggle:', error);
    SuperModal.toast.error('Erro ao alterar estado');
  }
};

// ============================================
// TOGGLE PUBLICAÇÃO (Publicar/Despublicar)
// ============================================
window.togglePublicacao = async function(id, estaPublicado) {
  const endpoint = estaPublicado ? 'despublicar' : 'publicar';

  try {
    const res = await fetch(`/api/admin/avisos/${id}/${endpoint}`, {
      method: 'POST'
    });
    const data = await res.json();

    if (data.success) {
      SuperModal.toast.success(data.message);
      carregarAvisos();
    } else {
      SuperModal.toast.error(data.error);
    }
  } catch (error) {
    console.error('[NOTIFICADOR] Erro ao publicar/despublicar:', error);
    SuperModal.toast.error('Erro na operação');
  }
};

// ============================================
// MODAL NOVO AVISO
// ============================================
async function abrirModalNovoAviso() {
  const html = `
    <div style="min-width: 500px;">
      <h3 style="font-size: 1.5rem; margin-bottom: 1.5rem; color: var(--text-primary);">
        Novo Aviso
      </h3>

      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
            Título (max 50 caracteres)
          </label>
          <input type="text" id="aviso-titulo" maxlength="50"
                 style="width: 100%; padding: 0.75rem; background: var(--surface-card); color: var(--text-primary); border: 1px solid var(--border-subtle); border-radius: 8px;"
                 placeholder="Ex: Rodada 12 Consolidada">
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
            Mensagem (max 200 caracteres)
          </label>
          <textarea id="aviso-mensagem" maxlength="200" rows="3"
                    style="width: 100%; padding: 0.75rem; background: var(--surface-card); color: var(--text-primary); border: 1px solid var(--border-subtle); border-radius: 8px; resize: vertical;"
                    placeholder="Ex: Confira os resultados da rodada 12..."></textarea>
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
            Categoria
          </label>
          <select id="aviso-categoria"
                  style="width: 100%; padding: 0.75rem; background: var(--surface-card); color: var(--text-primary); border: 1px solid var(--border-subtle); border-radius: 8px;">
            <option value="success">Sucesso (verde)</option>
            <option value="warning">Alerta (amarelo)</option>
            <option value="info" selected>Informação (azul)</option>
            <option value="urgent">Urgente (vermelho)</option>
          </select>
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
            Preview
          </label>
          <div id="aviso-preview" style="padding: 1rem; background: var(--surface-card-elevated); border-radius: 8px; border-left: 4px solid var(--color-info);">
            <p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">Título do aviso</p>
            <p style="font-size: 0.875rem; color: var(--text-secondary);">Mensagem aparece aqui...</p>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;">
        <button onclick="SuperModal.close()"
                style="padding: 0.75rem 1.5rem; background: var(--surface-card-hover); color: var(--text-primary); border: none; border-radius: 8px; cursor: pointer;">
          Cancelar
        </button>
        <button id="btn-salvar-aviso"
                style="padding: 0.75rem 1.5rem; background: var(--gradient-primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
          Criar Aviso
        </button>
      </div>
    </div>
  `;

  SuperModal.show(html);

  // Preview em tempo real
  const tituloInput = document.getElementById('aviso-titulo');
  const mensagemInput = document.getElementById('aviso-mensagem');
  const categoriaSelect = document.getElementById('aviso-categoria');
  const preview = document.getElementById('aviso-preview');

  function atualizarPreview() {
    const titulo = tituloInput.value || 'Título do aviso';
    const mensagem = mensagemInput.value || 'Mensagem aparece aqui...';
    const categoria = categoriaSelect.value;

    const cores = {
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      info: 'var(--color-info)',
      urgent: 'var(--color-danger)'
    };

    preview.style.borderLeftColor = cores[categoria];
    preview.innerHTML = `
      <p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">${titulo}</p>
      <p style="font-size: 0.875rem; color: var(--text-secondary);">${mensagem}</p>
    `;
  }

  tituloInput.addEventListener('input', atualizarPreview);
  mensagemInput.addEventListener('input', atualizarPreview);
  categoriaSelect.addEventListener('change', atualizarPreview);

  // Salvar
  document.getElementById('btn-salvar-aviso').addEventListener('click', async () => {
    const titulo = tituloInput.value.trim();
    const mensagem = mensagemInput.value.trim();
    const categoria = categoriaSelect.value;

    if (!titulo || !mensagem) {
      SuperModal.toast.warning('Preencha todos os campos');
      return;
    }

    try {
      const res = await fetch('/api/admin/avisos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, mensagem, categoria })
      });

      const data = await res.json();

      if (data.success) {
        SuperModal.toast.success('Aviso criado com sucesso!');
        SuperModal.close();
        carregarAvisos();
      } else {
        SuperModal.toast.error(data.error);
      }
    } catch (error) {
      console.error('[NOTIFICADOR] Erro ao criar:', error);
      SuperModal.toast.error('Erro ao criar aviso');
    }
  });
}

// ============================================
// EDITAR AVISO
// ============================================
window.editarAviso = async function(id) {
  const aviso = avisos.find(a => a._id === id);
  if (!aviso) return;

  // Similar ao modal de criar, mas com PUT e dados preenchidos
  SuperModal.toast.info('Função de edição em desenvolvimento');
};

// ============================================
// DELETAR AVISO
// ============================================
window.deletarAviso = async function(id) {
  const confirmado = await SuperModal.confirm({
    message: 'Tem certeza que deseja deletar este aviso? Esta ação não pode ser desfeita.',
    confirmText: 'Deletar',
    cancelText: 'Cancelar'
  });

  if (!confirmado) return;

  try {
    const res = await fetch(`/api/admin/avisos/${id}/deletar`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.success) {
      SuperModal.toast.success('Aviso deletado com sucesso');
      carregarAvisos();
    } else {
      SuperModal.toast.error(data.error);
    }
  } catch (error) {
    console.error('[NOTIFICADOR] Erro ao deletar:', error);
    SuperModal.toast.error('Erro ao deletar aviso');
  }
};
