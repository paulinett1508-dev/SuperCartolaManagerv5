/**
 * Participante Avisos - Módulo de Avisos In-App
 * Renderiza cards de avisos na home com scroll horizontal
 */

// ============================================
// RENDERIZAR AVISOS
// ============================================
export async function renderizarAvisos(ligaId, timeId) {
  try {
    // Buscar avisos
    const res = await fetch(`/api/avisos?ligaId=${ligaId}&timeId=${timeId}`);
    const data = await res.json();

    if (!data.success || !data.avisos || data.avisos.length === 0) {
      // Sem avisos - não renderizar nada
      return;
    }

    const avisos = data.avisos;

    // Container (inserir após saudação)
    const container = document.getElementById('boas-vindas-container');
    if (!container) return;

    const saudacao = container.querySelector('.px-4.pb-4');
    if (!saudacao) return;

    // HTML dos cards
    const html = `
      <div class="avisos-container mx-4 mb-4">
        <div class="avisos-header flex items-center justify-between mb-2">
          <h3 class="text-sm font-bold text-white/90 uppercase tracking-wide">Avisos</h3>
          <span class="text-xs text-white/50">${avisos.length} novo${avisos.length > 1 ? 's' : ''}</span>
        </div>
        <div class="avisos-scroll flex gap-3 overflow-x-auto hide-scrollbar pb-2" style="scroll-snap-type: x mandatory;">
          ${avisos.map(aviso => renderizarCardAviso(aviso, timeId)).join('')}
        </div>
      </div>
    `;

    saudacao.insertAdjacentHTML('afterend', html);

    // Atualizar badge de não lidos no header (se existir)
    atualizarBadgeNaoLidos(avisos.length);

  } catch (error) {
    console.error('[AVISOS] Erro ao renderizar:', error);
  }
}

// ============================================
// RENDERIZAR CARD INDIVIDUAL
// ============================================
function renderizarCardAviso(aviso, timeId) {
  const categorias = {
    success: { cor: 'var(--app-success)', icon: 'check_circle' },
    warning: { cor: 'var(--app-amber)', icon: 'warning' },
    info: { cor: 'var(--app-info)', icon: 'info' },
    urgent: { cor: 'var(--app-danger)', icon: 'error' }
  };

  const cat = categorias[aviso.categoria] || categorias.info;
  const lido = (aviso.leitoPor || []).includes(String(timeId));
  const opacidade = lido ? 'opacity-60' : '';

  return `
    <div class="aviso-card ${opacidade}"
         data-id="${aviso._id}"
         onclick="marcarAvisoComoLido('${aviso._id}', '${timeId}')"
         style="min-width: 240px; max-width: 280px; scroll-snap-align: start; background: rgba(26, 26, 26, 0.9); border-radius: 12px; padding: 1rem; border-left: 4px solid ${cat.cor}; cursor: pointer; transition: all 0.2s;">
      <div class="flex items-start gap-2 mb-2">
        <span class="material-icons" style="color: ${cat.cor}; font-size: 1.25rem;">${cat.icon}</span>
        <div class="flex-1">
          <p class="text-sm font-semibold text-white leading-tight">${aviso.titulo}</p>
        </div>
        ${!lido ? '<span class="w-2 h-2 rounded-full" style="background: ' + cat.cor + ';"></span>' : ''}
      </div>
      <p class="text-xs text-white/70 leading-relaxed">${aviso.mensagem}</p>
    </div>
  `;
}

// ============================================
// MARCAR COMO LIDO
// ============================================
window.marcarAvisoComoLido = async function(avisoId, timeId) {
  try {
    const res = await fetch(`/api/avisos/${avisoId}/marcar-lido`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeId })
    });

    if (res.ok) {
      // Atualizar UI - adicionar opacidade
      const card = document.querySelector(`.aviso-card[data-id="${avisoId}"]`);
      if (card) {
        card.classList.add('opacity-60');
        const badge = card.querySelector('.w-2.h-2');
        if (badge) badge.remove();
      }

      // Atualizar contador
      const avisos = document.querySelectorAll('.aviso-card:not(.opacity-60)');
      atualizarBadgeNaoLidos(avisos.length);
    }
  } catch (error) {
    console.error('[AVISOS] Erro ao marcar como lido:', error);
  }
};

// ============================================
// ATUALIZAR BADGE NO HEADER
// ============================================
function atualizarBadgeNaoLidos(count) {
  // Badge no ícone de notificações do header (implementar conforme necessário)
  const badgeEl = document.getElementById('avisos-badge');
  if (badgeEl) {
    if (count > 0) {
      badgeEl.textContent = count;
      badgeEl.style.display = 'flex';
    } else {
      badgeEl.style.display = 'none';
    }
  }
}

export default {
  renderizarAvisos
};
