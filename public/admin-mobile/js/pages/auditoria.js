/**
 * Auditoria Page - Auditoria de extratos financeiros
 */

import API from '../api.js';
import { showLoading, showError, showToast } from '../app.js';

let ligaSelecionada = null;

export async function render(params = {}) {
  const container = document.getElementById('page-content');
  updateTopBar('Auditoria', 'Extratos financeiros');

  showLoading(container);

  try {
    const response = await API.getLigas();
    const ligas = Array.isArray(response) ? response : (response.ligas || []);
    renderPage(container, ligas);
  } catch (error) {
    console.error('Erro ao carregar auditoria:', error);
    showError(container, error.message || 'Erro ao carregar pagina.');
  }
}

function updateTopBar(title, subtitle) {
  const titleEl = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');
  const backBtn = document.getElementById('btn-back');
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle || '';
  if (backBtn) backBtn.classList.remove('hidden');
}

function renderPage(container, ligas) {
  container.innerHTML = `
    <div class="container">
      <!-- Liga Selector -->
      <div class="card">
        <h3 style="font-size:16px;font-family:var(--font-russo);margin-bottom:var(--spacing-md);">Auditar Liga</h3>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" style="font-size:13px;">Selecione a Liga</label>
          <select id="audit-liga-select" class="form-input" style="font-size:14px;">
            <option value="">Selecione...</option>
            ${ligas.map(l => `<option value="${l.id}">${l.nome} (${l.temporada})</option>`).join('')}
          </select>
        </div>

        <div style="display:flex;gap:8px;">
          <button id="btn-audit" class="btn btn-primary" style="flex:1;font-size:14px;" onclick="window.runAudit(false)" disabled>
            Auditar
          </button>
          <button id="btn-audit-detail" class="btn btn-ghost" style="flex:1;font-size:14px;" onclick="window.runAudit(true)" disabled>
            Detalhado
          </button>
        </div>
      </div>

      <!-- Resultado -->
      <div id="audit-result"></div>

      <!-- Link web -->
      <div style="margin-top:var(--spacing-lg);text-align:center;">
        <button class="btn btn-ghost btn-sm" onclick="window.open('/auditoria-extratos.html','_blank')">
          Auditoria completa (Web)
        </button>
      </div>
    </div>
  `;

  document.getElementById('audit-liga-select').addEventListener('change', (e) => {
    ligaSelecionada = e.target.value || null;
    document.getElementById('btn-audit').disabled = !ligaSelecionada;
    document.getElementById('btn-audit-detail').disabled = !ligaSelecionada;
    document.getElementById('audit-result').innerHTML = '';
  });
}

window.runAudit = async function(detalhado) {
  if (!ligaSelecionada) return;

  const resultContainer = document.getElementById('audit-result');
  const btn = document.getElementById(detalhado ? 'btn-audit-detail' : 'btn-audit');
  btn.disabled = true;
  btn.textContent = 'Auditando...';

  resultContainer.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <div class="spinner"></div>
      <p class="text-muted" style="margin-top:12px;font-size:13px;">Executando auditoria...</p>
    </div>
  `;

  try {
    const url = `/api/admin/auditoria/extratos/${ligaSelecionada}${detalhado ? '?detalhado=true' : ''}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Falha na auditoria');
    const data = await resp.json();

    renderAuditResult(resultContainer, data, detalhado);
    showToast('Auditoria concluida!', 'success');
  } catch (err) {
    resultContainer.innerHTML = `
      <div class="card" style="margin-top:12px;border:1px solid var(--accent-danger);">
        <p style="color:var(--accent-danger);font-size:14px;margin:0;">Erro: ${err.message}</p>
      </div>
    `;
    showToast('Erro na auditoria', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = detalhado ? 'Detalhado' : 'Auditar';
  }
};

function renderAuditResult(container, data, detalhado) {
  const resultado = data.resultado || data;
  const totalParticipantes = resultado.totalParticipantes || resultado.total || 0;
  const discrepancias = resultado.discrepancias || resultado.erros || [];
  const saudavel = discrepancias.length === 0;

  let html = `
    <div style="margin-top:var(--spacing-md);">
      <!-- Resumo -->
      <div class="card" style="border:1px solid ${saudavel ? 'var(--accent-success)' : 'var(--accent-danger)'};">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="material-icons" style="font-size:32px;color:${saudavel ? 'var(--accent-success)' : 'var(--accent-danger)'};">${saudavel ? 'verified' : 'warning'}</span>
          <div>
            <div style="font-size:16px;font-weight:700;color:${saudavel ? 'var(--accent-success)' : 'var(--accent-danger)'};">
              ${saudavel ? 'Extratos Saudaveis' : `${discrepancias.length} Discrepancia(s)`}
            </div>
            <div style="font-size:13px;color:var(--text-muted);">${totalParticipantes} participantes auditados</div>
          </div>
        </div>
      </div>
  `;

  if (discrepancias.length > 0) {
    html += `
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
        ${discrepancias.slice(0, 20).map(d => `
          <div class="card" style="padding:12px;">
            <div style="font-size:13px;font-weight:600;color:var(--accent-danger);margin-bottom:4px;">
              ${d.nomeTime || d.nome || d.timeId || 'Participante'}
            </div>
            <div style="font-size:12px;color:var(--text-muted);">
              ${d.descricao || d.motivo || d.mensagem || JSON.stringify(d).substring(0, 120)}
            </div>
            ${d.diferenca != null ? `
              <div style="font-size:13px;font-family:var(--font-mono);font-weight:600;color:var(--accent-warning);margin-top:4px;">
                Diferenca: R$ ${Number(d.diferenca).toFixed(2)}
              </div>
            ` : ''}
          </div>
        `).join('')}
        ${discrepancias.length > 20 ? `<p class="text-muted" style="text-align:center;font-size:12px;">...e mais ${discrepancias.length - 20}</p>` : ''}
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}
