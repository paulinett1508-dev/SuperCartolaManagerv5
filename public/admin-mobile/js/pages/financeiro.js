/**
 * Financeiro Page - Acertos financeiros e quitações
 */

import API from '../api.js';
import { showLoading, showError, showToast, showEmptyState } from '../app.js';

let ligaSelecionada = null;
let ligas = [];

export async function render(params = {}) {
  const container = document.getElementById('page-content');

  // Atualiza top bar
  const titleEl = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');
  const backBtn = document.getElementById('btn-back');
  if (titleEl) titleEl.textContent = 'Acertos Financeiros';
  if (subtitleEl) subtitleEl.textContent = 'Pagamentos e recebimentos';
  if (backBtn) backBtn.classList.remove('hidden');

  if (params.ligaId) {
    ligaSelecionada = parseInt(params.ligaId);
  }

  await loadFinanceiroPage(container);
}

async function loadFinanceiroPage(container) {
  showLoading(container);

  try {
    const response = await API.getLigas();
    ligas = Array.isArray(response) ? response : (response.ligas || []);

    renderFinanceiroPage(container);

    if (ligaSelecionada) {
      await carregarAcertos(ligaSelecionada);
    }
  } catch (error) {
    console.error('Erro ao carregar financeiro:', error);
    showError(container, error.message || 'Erro ao carregar página.');
  }
}

function renderFinanceiroPage(container) {
  container.innerHTML = `
    <div class="container">
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--spacing-md);">
        <button onclick="window.router.navigate('/')" class="btn btn-ghost btn-sm" style="min-width: 44px; padding: 8px;">
          ←
        </button>
        <div style="flex: 1;">
          <h2 class="card-title" style="margin: 0; font-size: 20px;">💰 Acertos Financeiros</h2>
          <p class="text-muted" style="margin: 0; font-size: 14px;">Registrar pagamentos e recebimentos</p>
        </div>
      </div>

      <!-- Liga Selector -->
      <div class="card">
        <label class="text-muted" style="font-size: 13px; display: block; margin-bottom: 4px;">Liga</label>
        <select id="fin-liga-select" class="form-input" style="width: 100%; padding: 12px; font-size: 14px;">
          <option value="">Selecione uma liga...</option>
          ${ligas.map(liga => `
            <option value="${liga.id}" ${ligaSelecionada === liga.id ? 'selected' : ''}>
              ${liga.nome} (${liga.temporada})
            </option>
          `).join('')}
        </select>
      </div>

      <!-- Resumo Financeiro -->
      <div id="resumo-financeiro" style="display: none;"></div>

      <!-- Formulário Novo Acerto -->
      <div id="form-acerto" style="display: none;">
        <div class="card">
          <h3 class="card-title" style="font-size: 16px; margin-bottom: var(--spacing-md);">Novo Acerto</h3>

          <div style="margin-bottom: 12px;">
            <label class="text-muted" style="font-size: 13px; display: block; margin-bottom: 4px;">Participante</label>
            <select id="fin-time-select" class="form-input" style="width: 100%; padding: 12px; font-size: 14px;">
              <option value="">Selecione...</option>
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label class="text-muted" style="font-size: 13px; display: block; margin-bottom: 4px;">Tipo</label>
            <select id="fin-tipo-select" class="form-input" style="width: 100%; padding: 12px; font-size: 14px;">
              <option value="pagamento">Pagamento (participante pagou)</option>
              <option value="recebimento">Recebimento (participante recebeu)</option>
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label class="text-muted" style="font-size: 13px; display: block; margin-bottom: 4px;">Valor (R$)</label>
            <input type="number" id="fin-valor-input" class="form-input" style="width: 100%; padding: 12px; font-size: 14px;"
              min="0.01" step="0.01" placeholder="0,00">
          </div>

          <div style="margin-bottom: 12px;">
            <label class="text-muted" style="font-size: 13px; display: block; margin-bottom: 4px;">Método</label>
            <select id="fin-metodo-select" class="form-input" style="width: 100%; padding: 12px; font-size: 14px;">
              <option value="pix">PIX</option>
              <option value="transferencia">Transferência</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div style="margin-bottom: 16px;">
            <label class="text-muted" style="font-size: 13px; display: block; margin-bottom: 4px;">Descrição (opcional)</label>
            <input type="text" id="fin-descricao-input" class="form-input" style="width: 100%; padding: 12px; font-size: 14px;"
              placeholder="Ex: Pagamento inscrição 2026">
          </div>

          <button id="btn-registrar-acerto" class="btn btn-primary" style="width: 100%;" onclick="window.registrarNovoAcerto()" disabled>
            💰 Registrar Acerto
          </button>
        </div>
      </div>

      <!-- Lista de Acertos -->
      <div id="acertos-lista"></div>
    </div>
  `;

  setupFinanceiroListeners();
}

function setupFinanceiroListeners() {
  const ligaSelect = document.getElementById('fin-liga-select');
  const timeSelect = document.getElementById('fin-time-select');
  const valorInput = document.getElementById('fin-valor-input');

  ligaSelect.addEventListener('change', async (e) => {
    ligaSelecionada = e.target.value ? parseInt(e.target.value) : null;

    if (ligaSelecionada) {
      document.getElementById('form-acerto').style.display = 'block';
      await carregarParticipantes(ligaSelecionada);
      await carregarAcertos(ligaSelecionada);
    } else {
      document.getElementById('form-acerto').style.display = 'none';
      document.getElementById('resumo-financeiro').style.display = 'none';
      document.getElementById('acertos-lista').innerHTML = '';
    }
  });

  timeSelect.addEventListener('change', validarFormAcerto);
  valorInput.addEventListener('input', validarFormAcerto);

  window.registrarNovoAcerto = registrarNovoAcerto;
}

function validarFormAcerto() {
  const timeId = document.getElementById('fin-time-select').value;
  const valor = parseFloat(document.getElementById('fin-valor-input').value);
  const btn = document.getElementById('btn-registrar-acerto');
  btn.disabled = !timeId || !valor || valor <= 0;
}

async function carregarParticipantes(ligaId) {
  try {
    const liga = await API.getLiga(ligaId);
    const timeSelect = document.getElementById('fin-time-select');

    if (liga.participantes && liga.participantes.length > 0) {
      const participantesAtivos = liga.participantes.filter(p => p.ativo);
      timeSelect.innerHTML = `
        <option value="">Selecione...</option>
        ${participantesAtivos.map(p => `
          <option value="${p.id}">${p.nome} - ${p.nomeTime}</option>
        `).join('')}
      `;
    } else {
      timeSelect.innerHTML = '<option value="">Nenhum participante encontrado</option>';
    }
  } catch (error) {
    console.error('Erro ao carregar participantes:', error);
  }
}

async function carregarAcertos(ligaId) {
  const listaContainer = document.getElementById('acertos-lista');
  const resumoContainer = document.getElementById('resumo-financeiro');

  try {
    const data = await API.getAcertos(ligaId);

    // Resumo
    if (data.resumo) {
      resumoContainer.style.display = 'block';
      resumoContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: var(--spacing-md);">
          <div class="card" style="padding: 12px; text-align: center;">
            <p class="text-muted" style="font-size: 11px; margin: 0;">Pagamentos</p>
            <p class="text-success" style="font-size: 18px; font-weight: 700; margin: 4px 0 0; font-family: var(--font-mono);">
              R$ ${data.resumo.totalPagamentos.toFixed(2)}
            </p>
          </div>
          <div class="card" style="padding: 12px; text-align: center;">
            <p class="text-muted" style="font-size: 11px; margin: 0;">Recebimentos</p>
            <p class="text-warning" style="font-size: 18px; font-weight: 700; margin: 4px 0 0; font-family: var(--font-mono);">
              R$ ${data.resumo.totalRecebimentos.toFixed(2)}
            </p>
          </div>
        </div>
      `;
    }

    // Lista de acertos
    if (!data.acertos || data.acertos.length === 0) {
      listaContainer.innerHTML = `
        <div class="empty-state" style="margin-top: var(--spacing-lg);">
          <div class="empty-state-icon">📋</div>
          <h3 class="empty-state-title">Nenhum acerto registrado</h3>
          <p class="empty-state-text">Registre o primeiro acerto acima</p>
        </div>
      `;
      return;
    }

    listaContainer.innerHTML = `
      <div style="margin-top: var(--spacing-md);">
        <h3 class="card-title" style="font-size: 16px; margin-bottom: var(--spacing-sm);">
          Histórico (${data.acertos.length})
        </h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${data.acertos.map(acerto => renderAcertoItem(acerto)).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Erro ao carregar acertos:', error);
    listaContainer.innerHTML = `
      <div class="card">
        <p class="text-danger" style="margin: 0;">Erro ao carregar acertos</p>
      </div>
    `;
  }
}

function renderAcertoItem(acerto) {
  const isPagamento = acerto.tipo === 'pagamento';
  const dataFormatada = new Date(acerto.dataAcerto || acerto.createdAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  return `
    <div class="card" style="padding: 12px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge ${isPagamento ? 'badge-success' : 'badge-warning'}" style="font-size: 11px;">
            ${isPagamento ? '↗ Pagamento' : '↙ Recebimento'}
          </span>
          <span style="font-size: 13px; font-weight: 600;">${acerto.nomeTime}</span>
        </div>
        <span style="font-size: 16px; font-weight: 700; font-family: var(--font-mono); color: ${isPagamento ? 'var(--accent-success)' : 'var(--accent-warning)'};">
          R$ ${acerto.valor.toFixed(2)}
        </span>
      </div>
      ${acerto.descricao ? `<p class="text-muted" style="font-size: 12px; margin: 4px 0 0;">${acerto.descricao}</p>` : ''}
      <div style="display: flex; justify-content: space-between; margin-top: 4px;">
        <span class="text-muted" style="font-size: 11px;">${acerto.metodoPagamento || 'pix'}</span>
        <span class="text-muted" style="font-size: 11px;">${dataFormatada}</span>
      </div>
    </div>
  `;
}

async function registrarNovoAcerto() {
  const timeId = document.getElementById('fin-time-select').value;
  const tipo = document.getElementById('fin-tipo-select').value;
  const valor = parseFloat(document.getElementById('fin-valor-input').value);
  const metodoPagamento = document.getElementById('fin-metodo-select').value;
  const descricao = document.getElementById('fin-descricao-input').value;

  if (!ligaSelecionada || !timeId || !valor || valor <= 0) return;

  const btn = document.getElementById('btn-registrar-acerto');
  btn.disabled = true;
  btn.textContent = 'Registrando...';

  try {
    await API.registrarAcerto({
      ligaId: ligaSelecionada,
      timeId,
      tipo,
      valor,
      descricao,
      metodoPagamento
    });

    showToast('Acerto registrado com sucesso!', 'success');

    // Limpa formulário
    document.getElementById('fin-valor-input').value = '';
    document.getElementById('fin-descricao-input').value = '';
    document.getElementById('fin-time-select').value = '';

    // Recarrega lista
    await carregarAcertos(ligaSelecionada);
  } catch (error) {
    console.error('Erro ao registrar acerto:', error);
    showToast('Erro: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💰 Registrar Acerto';
    validarFormAcerto();
  }
}
