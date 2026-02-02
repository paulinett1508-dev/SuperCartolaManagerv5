/**
 * Ligas Page - Detalhes de uma liga específica
 */

import API from '../api.js';
import { showLoading, showError, showToast } from '../app.js';

export async function render(params = {}) {
  const container = document.getElementById('page-content');
  const { ligaId } = params;

  if (!ligaId) {
    container.innerHTML = '<div class="empty-state"><p>Liga não especificada</p></div>';
    return;
  }

  // Esconde FAB
  document.getElementById('fab').classList.add('hidden');

  showLoading(container);

  try {
    const liga = await API.getLiga(ligaId);
    renderLigaDetalhes(container, liga);
  } catch (error) {
    console.error('Erro ao carregar liga:', error);
    showError(container, error.message || 'Erro ao carregar detalhes da liga.');
  }
}

function renderLigaDetalhes(container, liga) {
  const saldoClass = liga.saldoTotal >= 0 ? 'text-success' : 'text-danger';
  const consolidacaoStatus = liga.ultimaConsolidacao
    ? `Rodada ${liga.ultimaConsolidacao.rodada} consolidada ✅`
    : 'Nenhuma consolidação ainda';

  container.innerHTML = `
    <div class="container">
      <!-- Header com botão voltar -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--spacing-md);">
        <button onclick="window.router.navigate('/')" class="btn btn-ghost btn-sm" style="min-width: 44px; padding: 8px;">
          ←
        </button>
        <div style="flex: 1;">
          <h2 class="card-title" style="margin: 0; font-size: 20px;">${liga.nome}</h2>
          <p class="text-muted" style="margin: 0; font-size: 14px;">Temporada ${liga.temporada}</p>
        </div>
      </div>

      <!-- Info Geral -->
      <div class="card">
        <h3 class="card-title" style="font-size: 16px; margin-bottom: var(--spacing-md);">ℹ️ Informações Gerais</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div>
            <p class="text-muted" style="font-size: 13px; margin: 0;">Participantes</p>
            <p style="font-size: 24px; font-weight: 700; margin: 4px 0 0 0; font-family: var(--font-mono);">
              ${liga.participantesAtivos}/${liga.participantesTotais}
            </p>
          </div>
          <div>
            <p class="text-muted" style="font-size: 13px; margin: 0;">Rodada Atual</p>
            <p style="font-size: 24px; font-weight: 700; margin: 4px 0 0 0; font-family: var(--font-mono);">
              ${liga.rodadaAtual}
            </p>
          </div>
        </div>

        <div style="padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 12px;">
          <p class="text-muted" style="font-size: 13px; margin: 0 0 4px 0;">Saldo Total</p>
          <p class="${saldoClass}" style="font-size: 28px; font-weight: 700; margin: 0; font-family: var(--font-mono);">
            R$ ${liga.saldoTotal.toFixed(2).replace('.', ',')}
          </p>
          ${liga.inadimplentes > 0 ? `
            <span class="badge badge-warning" style="margin-top: 8px;">
              ${liga.inadimplentes} inadimplente${liga.inadimplentes > 1 ? 's' : ''}
            </span>
          ` : ''}
        </div>

        <p class="text-muted" style="font-size: 13px; margin: 0;">
          <span style="margin-right: 8px;">⏱️</span>
          ${consolidacaoStatus}
        </p>
      </div>

      <!-- Estatísticas -->
      <div class="card">
        <h3 class="card-title" style="font-size: 16px; margin-bottom: var(--spacing-md);">📊 Estatísticas</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <p class="text-muted" style="font-size: 12px; margin: 0;">Total Pagamentos</p>
            <p style="font-size: 18px; font-weight: 600; margin: 4px 0 0 0; font-family: var(--font-mono); color: var(--accent-success);">
              R$ ${liga.estatisticas.totalPagamentos.toFixed(2)}
            </p>
          </div>
          <div>
            <p class="text-muted" style="font-size: 12px; margin: 0;">Total Premiações</p>
            <p style="font-size: 18px; font-weight: 600; margin: 4px 0 0 0; font-family: var(--font-mono); color: var(--accent-danger);">
              R$ ${liga.estatisticas.totalPremiacoes.toFixed(2)}
            </p>
          </div>
          <div>
            <p class="text-muted" style="font-size: 12px; margin: 0;">Média Pontos</p>
            <p style="font-size: 18px; font-weight: 600; margin: 4px 0 0 0; font-family: var(--font-mono);">
              ${liga.estatisticas.mediaPontos.toFixed(2)}
            </p>
          </div>
          <div>
            <p class="text-muted" style="font-size: 12px; margin: 0;">Média Patrimônio</p>
            <p style="font-size: 18px; font-weight: 600; margin: 4px 0 0 0; font-family: var(--font-mono);">
              C$ ${liga.estatisticas.mediaPatrimonio.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <!-- Módulos Ativos -->
      <div class="card">
        <h3 class="card-title" style="font-size: 16px; margin-bottom: var(--spacing-md);">🎮 Módulos</h3>

        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${renderModulos(liga.modulosAtivos)}
        </div>
      </div>

      <!-- Participantes -->
      <h3 class="card-title" style="font-size: 16px; margin: var(--spacing-lg) 0 var(--spacing-md) 0;">👥 Participantes (${liga.participantes.length})</h3>

      ${liga.participantes.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3 class="empty-state-title">Nenhum participante</h3>
          <p class="empty-state-text">Adicione participantes para começar</p>
        </div>
      ` : `
        <!-- Scroll horizontal de participantes -->
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -16px; padding: 0 16px;">
          <div style="display: flex; gap: 12px; min-width: min-content;">
            ${liga.participantes.map(p => renderParticipanteCard(p)).join('')}
          </div>
        </div>

        <!-- Lista completa (accordion) -->
        <div style="margin-top: var(--spacing-lg);">
          ${liga.participantes.map((p, idx) => renderParticipanteListItem(p, idx)).join('')}
        </div>
      `}

      <!-- Ações -->
      <div style="margin-top: var(--spacing-xl); display: flex; gap: 12px;">
        <button onclick="window.router.navigate('/consolidacao', { ligaId: ${liga.id} })" class="btn btn-primary" style="flex: 1;">
          ⚙️ Consolidar
        </button>
        <button onclick="window.router.navigate('/financeiro', { ligaId: ${liga.id} })" class="btn btn-secondary" style="flex: 1;">
          💰 Acertos
        </button>
      </div>
    </div>
  `;
}

function renderModulos(modulosAtivos) {
  const modulos = {
    top10: { nome: 'Top 10', cor: '#3b82f6' },
    melhormes: { nome: 'Melhor Mês', cor: '#8b5cf6' },
    artilheiro: { nome: 'Artilheiro', cor: '#22c55e' },
    luva: { nome: 'Luva de Ouro', cor: '#ffd700' },
    campinho: { nome: 'Campinho', cor: '#06b6d4' },
    dicas: { nome: 'Dicas', cor: '#f59e0b' },
    pontoscorridos: { nome: 'Pontos Corridos', cor: '#ec4899' },
    matamata: { nome: 'Mata-Mata', cor: '#ef4444' }
  };

  return Object.entries(modulos).map(([key, modulo]) => {
    const ativo = modulosAtivos[key];
    const badge = ativo ? 'badge-success' : 'badge';
    const icon = ativo ? '✅' : '⚪';

    return `
      <span class="badge ${badge}" style="display: flex; align-items: center; gap: 4px;">
        ${icon} ${modulo.nome}
      </span>
    `;
  }).join('');
}

function renderParticipanteCard(p) {
  const saldoClass = p.saldo >= 0 ? 'text-success' : 'text-danger';
  const statusBadge = p.ativo
    ? '<span class="badge badge-success" style="font-size: 10px;">Ativo</span>'
    : '<span class="badge" style="font-size: 10px;">Inativo</span>';

  return `
    <div class="card" style="min-width: 200px; max-width: 200px; padding: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <img
          src="/escudos/${p.escudo}.png"
          alt="${p.nome}"
          style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;"
          onerror="this.src='/escudos/default.png'"
        >
        <div style="flex: 1; min-width: 0;">
          <p style="font-weight: 600; font-size: 13px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${p.nome}
          </p>
          ${statusBadge}
        </div>
      </div>

      <p class="text-muted" style="font-size: 11px; margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${p.nomeTime}
      </p>

      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">
        <p class="text-muted" style="font-size: 10px; margin: 0;">Saldo</p>
        <p class="${saldoClass}" style="font-size: 16px; font-weight: 700; margin: 2px 0 0 0; font-family: var(--font-mono);">
          R$ ${p.saldo.toFixed(2)}
        </p>
      </div>

      ${p.posicao ? `
        <div style="margin-top: 8px;">
          <p class="text-muted" style="font-size: 10px; margin: 0;">Posição / Pontos</p>
          <p style="font-size: 14px; font-weight: 600; margin: 2px 0 0 0; font-family: var(--font-mono);">
            ${p.posicao}º • ${p.pontos.toFixed(2)}
          </p>
        </div>
      ` : ''}
    </div>
  `;
}

function renderParticipanteListItem(p, idx) {
  const saldoClass = p.saldo >= 0 ? 'text-success' : 'text-danger';

  return `
    <div class="list-item" style="margin-bottom: 8px;">
      <div class="list-item-avatar">
        <img
          src="/escudos/${p.escudo}.png"
          alt="${p.nome}"
          style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
          onerror="this.src='/escudos/default.png'"
        >
      </div>

      <div class="list-item-content">
        <div class="list-item-title">${p.nome}</div>
        <div class="list-item-subtitle">${p.nomeTime}</div>
      </div>

      <div style="text-align: right;">
        <p class="${saldoClass}" style="font-size: 14px; font-weight: 600; margin: 0; font-family: var(--font-mono);">
          R$ ${p.saldo.toFixed(2)}
        </p>
        ${p.posicao ? `
          <p class="text-muted" style="font-size: 11px; margin: 2px 0 0 0;">
            ${p.posicao}º • ${p.pontos.toFixed(1)} pts
          </p>
        ` : ''}
      </div>
    </div>
  `;
}
