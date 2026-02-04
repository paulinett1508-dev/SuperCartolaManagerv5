/**
 * Consolidação Page - Consolidação manual de rodadas
 */

import API from '../api.js';
import { showLoading, showError, showToast } from '../app.js';

let ligaSelecionada = null;
let rodadaSelecionada = null;
let consolidando = false;

export async function render(params = {}) {
  const container = document.getElementById('page-content');

  // Esconde FAB
  document.getElementById('fab').classList.add('hidden');

  // Se veio com ligaId, seleciona automaticamente
  if (params.ligaId) {
    ligaSelecionada = parseInt(params.ligaId);
  }

  await loadConsolidacaoPage(container);
}

async function loadConsolidacaoPage(container) {
  showLoading(container);

  try {
    // Busca ligas disponíveis
    const response = await API.getLigas();
    // Suporta tanto array direto quanto { ligas: [] }
    const ligas = Array.isArray(response) ? response : (response.ligas || []);

    renderConsolidacaoPage(container, ligas);

    // Se tem liga selecionada, carrega histórico
    if (ligaSelecionada) {
      await carregarHistorico(ligaSelecionada);
    }
  } catch (error) {
    console.error('Erro ao carregar página de consolidação:', error);
    showError(container, error.message || 'Erro ao carregar página.');
  }
}

function renderConsolidacaoPage(container, ligas) {
  container.innerHTML = `
    <div class="container">
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--spacing-md);">
        <button onclick="window.router.navigate('/')" class="btn btn-ghost btn-sm" style="min-width: 44px; padding: 8px;">
          ←
        </button>
        <div style="flex: 1;">
          <h2 class="card-title" style="margin: 0; font-size: 20px;">⚙️ Operações</h2>
          <p class="text-muted" style="margin: 0; font-size: 14px;">Consolidação e ferramentas administrativas</p>
        </div>
      </div>

      <!-- Acesso Rápido -->
      <div class="card" style="margin-bottom: var(--spacing-md); background: linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%); border: 1px solid rgba(251, 146, 60, 0.2);">
        <h3 class="card-title" style="font-size: 14px; margin-bottom: 12px; color: #fb923c;">🔧 Ferramentas Administrativas</h3>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <a
            href="/admin/operacoes/notificador.html"
            target="_blank"
            class="btn btn-secondary"
            style="flex: 1; min-width: 140px; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px;"
          >
            📢 Notificador
          </a>
          <button
            class="btn btn-ghost"
            style="flex: 1; min-width: 140px; font-size: 13px; opacity: 0.5; cursor: not-allowed;"
            disabled
          >
            🔜 Em breve
          </button>
        </div>
      </div>

      <!-- Formulário de Consolidação -->
      <div class="card">
        <h3 class="card-title" style="font-size: 16px; margin-bottom: var(--spacing-md);">Nova Consolidação</h3>

        <!-- Liga Selector -->
        <div style="margin-bottom: 16px;">
          <label class="text-muted" style="font-size: 13px; display: block; margin-bottom: 4px;">Liga</label>
          <select id="liga-select" class="form-input" style="width: 100%; padding: 12px; font-size: 14px;">
            <option value="">Selecione uma liga...</option>
            ${ligas.map(liga => `
              <option value="${liga.id}" ${ligaSelecionada === liga.id ? 'selected' : ''}>
                ${liga.nome} (${liga.temporada})
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Rodada Selector -->
        <div style="margin-bottom: 16px;">
          <label class="text-muted" style="font-size: 13px; display: block; margin-bottom: 4px;">Rodada</label>
          <input
            type="number"
            id="rodada-input"
            class="form-input"
            style="width: 100%; padding: 12px; font-size: 14px;"
            min="1"
            max="38"
            placeholder="Digite o número da rodada (1-38)"
            value="${rodadaSelecionada || ''}"
          >
        </div>

        <!-- Forçar Reconsolidação -->
        <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="forcar-checkbox" style="width: 20px; height: 20px;">
          <label for="forcar-checkbox" style="font-size: 14px; cursor: pointer;">
            Forçar reconsolidação (mesmo se já consolidada)
          </label>
        </div>

        <!-- Botão Consolidar -->
        <button
          id="btn-consolidar"
          class="btn btn-primary"
          style="width: 100%;"
          onclick="window.consolidarRodadaManual()"
          disabled
        >
          ⚙️ Consolidar Rodada
        </button>

        <!-- Status de Consolidação -->
        <div id="consolidacao-status" style="margin-top: 16px; display: none;">
          <div style="padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div class="spinner" id="consolidacao-spinner" style="display: none;"></div>
              <p id="status-text" class="text-muted" style="font-size: 13px; margin: 0;">Aguardando...</p>
            </div>
            <div class="progress-bar" style="display: none;" id="consolidacao-progress">
              <div class="progress-fill" id="progress-fill"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Histórico de Consolidações -->
      <div id="historico-container">
        <!-- Será preenchido dinamicamente -->
      </div>
    </div>
  `;

  // Setup event listeners
  setupEventListeners();
}

function setupEventListeners() {
  const ligaSelect = document.getElementById('liga-select');
  const rodadaInput = document.getElementById('rodada-input');
  const btnConsolidar = document.getElementById('btn-consolidar');

  ligaSelect.addEventListener('change', async (e) => {
    ligaSelecionada = e.target.value ? parseInt(e.target.value) : null;
    rodadaSelecionada = null;
    rodadaInput.value = '';
    validateForm();

    if (ligaSelecionada) {
      await carregarHistorico(ligaSelecionada);
    } else {
      document.getElementById('historico-container').innerHTML = '';
    }
  });

  rodadaInput.addEventListener('input', (e) => {
    rodadaSelecionada = e.target.value ? parseInt(e.target.value) : null;
    validateForm();
  });

  // Expor função globalmente para onclick
  window.consolidarRodadaManual = consolidarRodadaManual;
}

function validateForm() {
  const btnConsolidar = document.getElementById('btn-consolidar');
  const isValid = ligaSelecionada && rodadaSelecionada && rodadaSelecionada >= 1 && rodadaSelecionada <= 38;
  btnConsolidar.disabled = !isValid || consolidando;
}

async function consolidarRodadaManual() {
  if (!ligaSelecionada || !rodadaSelecionada || consolidando) return;

  consolidando = true;
  validateForm();

  const forcar = document.getElementById('forcar-checkbox').checked;
  const statusContainer = document.getElementById('consolidacao-status');
  const statusText = document.getElementById('status-text');
  const spinner = document.getElementById('consolidacao-spinner');
  const progressBar = document.getElementById('consolidacao-progress');
  const progressFill = document.getElementById('progress-fill');

  // Mostra status
  statusContainer.style.display = 'block';
  spinner.style.display = 'block';
  progressBar.style.display = 'block';
  progressFill.style.width = '0%';
  statusText.textContent = 'Iniciando consolidação...';
  statusText.className = 'text-muted';

  try {
    // Fase 1: Iniciando (10%)
    progressFill.style.width = '10%';
    statusText.textContent = 'Validando dados...';

    // Chama API de consolidação
    const result = await API.consolidarRodada(ligaSelecionada, rodadaSelecionada, forcar);

    // Fase 2: Processando (50%)
    progressFill.style.width = '50%';
    statusText.textContent = 'Consolidando rodada...';

    // Aguarda um pouco para dar feedback visual
    await sleep(500);

    // Fase 3: Verificando resultado (80%)
    progressFill.style.width = '80%';
    statusText.textContent = 'Finalizando...';

    await sleep(300);

    // Fase 4: Completo (100%)
    progressFill.style.width = '100%';

    if (result.success) {
      if (result.jaConsolidada) {
        statusText.textContent = '✅ Rodada já estava consolidada';
        statusText.className = 'text-warning';
        showToast('Rodada já consolidada anteriormente', 'warning');
      } else {
        statusText.textContent = '✅ Consolidação concluída com sucesso!';
        statusText.className = 'text-success';
        showToast('Rodada consolidada com sucesso!', 'success');
      }

      // Atualiza histórico após consolidação
      await sleep(1000);
      await carregarHistorico(ligaSelecionada);

      // Limpa formulário
      document.getElementById('rodada-input').value = '';
      document.getElementById('forcar-checkbox').checked = false;
      rodadaSelecionada = null;
    } else {
      throw new Error(result.error || 'Erro desconhecido na consolidação');
    }
  } catch (error) {
    console.error('Erro ao consolidar rodada:', error);
    progressFill.style.width = '100%';
    progressFill.style.background = 'var(--accent-danger)';
    statusText.textContent = '❌ Erro: ' + error.message;
    statusText.className = 'text-danger';
    showToast('Erro ao consolidar: ' + error.message, 'error');
  } finally {
    consolidando = false;
    spinner.style.display = 'none';
    validateForm();

    // Esconde status após 5 segundos
    setTimeout(() => {
      statusContainer.style.display = 'none';
      progressFill.style.width = '0%';
      progressFill.style.background = '';
    }, 5000);
  }
}

async function carregarHistorico(ligaId) {
  const historicoContainer = document.getElementById('historico-container');

  try {
    historicoContainer.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div class="spinner"></div>
        <p class="text-muted" style="margin-top: 12px; font-size: 13px;">Carregando histórico...</p>
      </div>
    `;

    const historico = await API.getConsolidacaoHistorico(ligaId);

    renderHistorico(historicoContainer, historico);
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    historicoContainer.innerHTML = `
      <div class="card">
        <p class="text-danger" style="margin: 0; font-size: 14px;">❌ Erro ao carregar histórico</p>
      </div>
    `;
  }
}

function renderHistorico(container, historico) {
  const { ligaNome, temporada, totalConsolidadas, rodadaAtual, rodadasPendentes, historico: items } = historico;

  if (totalConsolidadas === 0) {
    container.innerHTML = `
      <div class="empty-state" style="margin-top: var(--spacing-lg);">
        <div class="empty-state-icon">📋</div>
        <h3 class="empty-state-title">Nenhuma rodada consolidada</h3>
        <p class="empty-state-text">Consolide a primeira rodada acima</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="margin-top: var(--spacing-xl);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-md);">
        <h3 class="card-title" style="font-size: 16px; margin: 0;">📊 Histórico - ${ligaNome}</h3>
        <span class="badge badge-primary">${totalConsolidadas} consolidadas</span>
      </div>

      ${rodadasPendentes.length > 0 ? `
        <div class="card" style="margin-bottom: var(--spacing-md); background: var(--bg-tertiary); border: 1px solid var(--accent-warning);">
          <p class="text-warning" style="font-size: 13px; margin: 0;">
            ⚠️ ${rodadasPendentes.length} rodada${rodadasPendentes.length > 1 ? 's' : ''} pendente${rodadasPendentes.length > 1 ? 's' : ''}:
            ${rodadasPendentes.slice(0, 5).join(', ')}${rodadasPendentes.length > 5 ? '...' : ''}
          </p>
        </div>
      ` : ''}

      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${items.map(item => renderHistoricoItem(item)).join('')}
      </div>
    </div>
  `;
}

function renderHistoricoItem(item) {
  const { rodada, dataConsolidacao, totalParticipantes, campeaoRodada, liderGeral, mito, mico, versaoSchema } = item;

  const dataFormatada = new Date(dataConsolidacao).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const versaoBadge = versaoSchema >= 2 ?
    '<span class="badge badge-success" style="font-size: 10px;">v2</span>' :
    '<span class="badge badge-warning" style="font-size: 10px;">v1</span>';

  return `
    <div class="card" style="padding: 12px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h4 style="font-size: 16px; font-weight: 700; margin: 0; font-family: var(--font-mono);">Rodada ${rodada}</h4>
          ${versaoBadge}
        </div>
        <p class="text-muted" style="font-size: 11px; margin: 0;">${dataFormatada}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
        ${campeaoRodada ? `
          <div>
            <p class="text-muted" style="font-size: 11px; margin: 0;">🏆 Campeão</p>
            <p style="font-size: 13px; font-weight: 600; margin: 2px 0 0 0;">${campeaoRodada.nome}</p>
            <p class="text-success" style="font-size: 12px; font-weight: 600; margin: 0; font-family: var(--font-mono);">
              ${campeaoRodada.pontos.toFixed(2)} pts
            </p>
          </div>
        ` : '<div></div>'}

        ${liderGeral ? `
          <div>
            <p class="text-muted" style="font-size: 11px; margin: 0;">👑 Líder Geral</p>
            <p style="font-size: 13px; font-weight: 600; margin: 2px 0 0 0;">${liderGeral.nome}</p>
            <p class="text-primary" style="font-size: 12px; font-weight: 600; margin: 0; font-family: var(--font-mono);">
              ${liderGeral.pontos.toFixed(2)} pts
            </p>
          </div>
        ` : '<div></div>'}
      </div>

      ${mito || mico ? `
        <div style="display: flex; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">
          ${mito ? `
            <span class="badge badge-success" style="flex: 1; justify-content: center; font-size: 11px;">
              🔥 ${mito.nome_time || mito.nome}
            </span>
          ` : ''}
          ${mico ? `
            <span class="badge badge-danger" style="flex: 1; justify-content: center; font-size: 11px;">
              💩 ${mico.nome_time || mico.nome}
            </span>
          ` : ''}
        </div>
      ` : ''}

      <p class="text-muted" style="font-size: 11px; margin: 8px 0 0 0;">
        ${totalParticipantes} participantes
      </p>
    </div>
  `;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
