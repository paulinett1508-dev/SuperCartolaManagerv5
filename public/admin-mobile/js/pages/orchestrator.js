/**
 * Orchestrator Page - Monitoramento do Round-Market Orchestrator
 * Versão mobile-friendly do admin-orchestrator.html
 */

import { showLoading, showError, showToast } from '../app.js';

const MARKET_LABELS = {
  1: 'ABERTO',
  2: 'FECHADO',
  3: 'DESBLOQUEADO',
  4: 'ENCERRADO',
  5: 'FUTURO',
  6: 'TEMPORADA ENCERRADA',
};

const FASES = [
  { id: 'aguardando', label: 'Ocioso', emoji: '⏳' },
  { id: 'coletando_dados', label: 'Coletando', emoji: '📥' },
  { id: 'atualizando_live', label: 'Live', emoji: '📡' },
  { id: 'finalizando', label: 'Finalizando', emoji: '🏁' },
  { id: 'consolidando', label: 'Consolidando', emoji: '📊' },
  { id: 'concluida', label: 'Concluida', emoji: '✅' },
];

let eventSource = null;
let refreshInterval = null;

export async function render() {
  const container = document.getElementById('page-content');

  // Esconde FAB (usamos botões inline)
  document.getElementById('fab').classList.add('hidden');

  showLoading(container);
  await loadOrchestrator(container);

  // SSE real-time
  conectarSSE(container);

  // Safety net refresh a cada 60s
  refreshInterval = setInterval(() => loadOrchestrator(container, true), 60000);
}

export function destroy() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

async function loadOrchestrator(container, silent = false) {
  try {
    const resp = await fetch('/api/orchestrator/status');
    const data = await resp.json();

    if (data.success) {
      renderPage(container, data);
    } else {
      if (!silent) showError(container, 'Orchestrator indisponivel');
    }
  } catch (err) {
    console.error('Erro ao carregar orchestrator:', err);
    if (!silent) showError(container, 'Erro ao conectar ao orchestrator');
  }
}

function conectarSSE(container) {
  if (eventSource) eventSource.close();

  eventSource = new EventSource('/api/orchestrator/stream');

  eventSource.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.tipo === 'transicao' || msg.tipo === 'mercado_abriu' || msg.tipo === 'mercado_fechou') {
        loadOrchestrator(container, true);
        showToast('Status do mercado atualizado!', 'info');
      }
    } catch (e) {
      // ignore parse errors
    }
  };

  eventSource.onerror = () => {
    setTimeout(() => conectarSSE(container), 5000);
  };
}

function renderPage(container, data) {
  const live = data.live || {};
  const db = data.persistido || {};
  const statusNum = live.statusMercado;
  const statusLabel = live.statusMercadoLabel || MARKET_LABELS[statusNum] || 'DESCONHECIDO';
  const faseAtual = live.faseRodada || 'aguardando';
  const eventos = (db.eventos || []).slice().reverse().slice(0, 20);

  // Semaforo config
  const semaforo = getSemaforoConfig(statusNum);

  // Acao necessaria
  const acao = getAcaoStatus(live);

  // Tempo desde ultima consolidacao
  const ultimaConsolidacao = db.ultima_consolidacao
    ? tempoRelativo(new Date(db.ultima_consolidacao))
    : 'Nunca';

  container.innerHTML = `
    <div class="container" style="padding-bottom: 20px;">

      <!-- Semaforo do Mercado -->
      <div class="card" style="text-align: center; padding: var(--spacing-lg);">
        <div style="
          width: 72px; height: 72px; border-radius: 50%;
          background: ${semaforo.cor};
          box-shadow: 0 0 24px ${semaforo.sombra};
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px;
          font-size: 32px;
          ${statusNum === 2 ? 'animation: pulse-glow 2s infinite;' : ''}
        ">${semaforo.emoji}</div>
        <h2 style="font-family: var(--font-russo); font-size: 22px; margin: 0;">
          Mercado ${statusLabel}
        </h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">
          Rodada <span style="font-family: var(--font-mono); color: var(--accent-primary);">${live.rodadaAtual || '?'}</span>
          &middot; Temporada <span style="font-family: var(--font-mono); color: var(--accent-primary);">${live.temporada || '?'}</span>
        </p>
      </div>

      <!-- Status da Acao -->
      <div class="card" style="
        border-left: 4px solid ${acao.cor};
        display: flex; align-items: center; gap: 12px;
      ">
        <span style="font-size: 28px;">${acao.emoji}</span>
        <div>
          <div style="font-weight: 600; font-size: 15px; color: ${acao.cor};">${acao.titulo}</div>
          <div style="color: var(--text-muted); font-size: 13px;">${acao.descricao}</div>
        </div>
      </div>

      <!-- Stats -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: var(--spacing-md);">
        ${renderStat(db.total_consolidacoes || 0, 'Consolid.')}
        ${renderStat(db.total_transicoes || 0, 'Transicoes')}
        ${renderStat(db.total_erros || 0, 'Erros')}
      </div>

      <div class="card" style="padding: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--text-muted); font-size: 13px;">Ultima consolidacao</span>
          <span style="font-family: var(--font-mono); font-size: 13px; color: var(--text-primary);">${ultimaConsolidacao}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="color: var(--text-muted); font-size: 13px;">Live updates</span>
          <span class="badge ${live.liveUpdatesAtivos ? 'badge-success' : 'badge-info'}" style="font-size: 11px;">
            ${live.liveUpdatesAtivos ? 'ATIVO' : 'INATIVO'}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="color: var(--text-muted); font-size: 13px;">Managers</span>
          <span style="font-family: var(--font-mono); font-size: 13px; color: var(--text-primary);">${(live.managers || []).length} registrados</span>
        </div>
      </div>

      <!-- Fase da Rodada -->
      <h3 style="font-family: var(--font-russo); font-size: 15px; margin-bottom: 8px;">
        Fase da Rodada
      </h3>
      <div class="card" style="padding: 12px;">
        <div style="display: flex; gap: 4px; overflow-x: auto;">
          ${FASES.map((f, i) => {
            const faseIdx = FASES.findIndex(x => x.id === faseAtual);
            let bg = 'var(--bg-tertiary)';
            let color = 'var(--text-muted)';
            if (f.id === faseAtual) {
              bg = 'rgba(59, 130, 246, 0.2)';
              color = 'var(--accent-primary)';
            } else if (i < faseIdx) {
              bg = 'rgba(34, 197, 94, 0.15)';
              color = 'var(--accent-success)';
            }
            return `<div style="
              flex: 1; min-width: 0; text-align: center;
              padding: 6px 2px; border-radius: var(--radius-md);
              background: ${bg}; color: ${color};
              font-size: 11px; font-weight: 600;
            ">
              <div style="font-size: 16px;">${f.emoji}</div>
              ${f.label}
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Acoes -->
      <h3 style="font-family: var(--font-russo); font-size: 15px; margin-bottom: 8px;">
        Acoes
      </h3>
      <div style="display: flex; gap: 8px; margin-bottom: var(--spacing-md);">
        <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="window._orchForcarVerificacao()">
          🔄 Verificar Mercado
        </button>
        <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="window._orchForcarConsolidacao()">
          🔧 Forcar Consolidacao
        </button>
      </div>

      <!-- Timeline -->
      <h3 style="font-family: var(--font-russo); font-size: 15px; margin-bottom: 8px;">
        Eventos Recentes
      </h3>
      <div class="card" style="padding: 8px 12px; max-height: 400px; overflow-y: auto;">
        ${eventos.length === 0
          ? '<p style="text-align: center; color: var(--text-muted); padding: 16px;">Nenhum evento registrado</p>'
          : eventos.map(e => renderEvento(e)).join('')
        }
      </div>

    </div>

    <style>
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 24px ${semaforo.sombra}; }
        50% { box-shadow: 0 0 40px ${semaforo.sombra}; }
      }
    </style>
  `;

  // Registrar handlers globais para os botoes
  window._orchForcarVerificacao = async () => {
    try {
      const resp = await fetch('/api/orchestrator/forcar-verificacao', { method: 'POST' });
      const result = await resp.json();
      if (result.success) {
        showToast('Verificacao do mercado disparada!', 'success');
        loadOrchestrator(container, true);
      } else {
        showToast('Erro: ' + (result.message || 'falha'), 'error');
      }
    } catch (err) {
      showToast('Erro de conexao', 'error');
    }
  };

  window._orchForcarConsolidacao = async () => {
    const rodada = prompt('Numero da rodada para consolidar (1-38):');
    if (!rodada) return;

    const num = parseInt(rodada);
    if (isNaN(num) || num < 1 || num > 38) {
      showToast('Rodada invalida', 'warning');
      return;
    }

    try {
      const resp = await fetch('/api/orchestrator/forcar-consolidacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rodada: num }),
      });
      const result = await resp.json();
      if (result.success) {
        showToast(result.message || `Consolidacao R${num} iniciada!`, 'success');
        loadOrchestrator(container, true);
      } else {
        showToast('Erro: ' + (result.message || 'falha'), 'error');
      }
    } catch (err) {
      showToast('Erro de conexao', 'error');
    }
  };
}

// ========== HELPERS ==========

function getSemaforoConfig(statusNum) {
  switch (statusNum) {
    case 1: return { cor: 'var(--accent-success)', sombra: 'rgba(34, 197, 94, 0.4)', emoji: '🟢' };
    case 2: return { cor: 'var(--accent-danger)', sombra: 'rgba(239, 68, 68, 0.4)', emoji: '🔴' };
    case 4: return { cor: 'var(--accent-warning)', sombra: 'rgba(245, 158, 11, 0.4)', emoji: '🟡' };
    case 6: return { cor: 'var(--text-muted)', sombra: 'rgba(148, 163, 184, 0.3)', emoji: '🏁' };
    default: return { cor: 'var(--bg-tertiary)', sombra: 'rgba(0,0,0,0.2)', emoji: '❓' };
  }
}

function getAcaoStatus(live) {
  const fase = live.faseRodada;

  if (fase === 'erro') {
    return {
      emoji: '🚨',
      titulo: 'Acao necessaria',
      descricao: 'Houve erro na consolidacao. Verifique os eventos e force manualmente.',
      cor: 'var(--accent-danger)',
    };
  }
  if (live.consolidandoAgora) {
    return {
      emoji: '⏳',
      titulo: 'Consolidando...',
      descricao: 'Consolidacao em andamento. Aguarde.',
      cor: 'var(--accent-warning)',
    };
  }
  if (live.statusMercado === 1 && (fase === 'concluida' || fase === 'aguardando')) {
    return {
      emoji: '✅',
      titulo: 'Tudo automatico',
      descricao: 'Mercado aberto, ultima rodada consolidada. Nenhuma acao necessaria.',
      cor: 'var(--accent-success)',
    };
  }
  if (live.statusMercado === 2) {
    return {
      emoji: '⚽',
      titulo: 'Rodada em andamento',
      descricao: 'Jogos acontecendo. Consolidacao sera automatica ao final.',
      cor: 'var(--accent-info)',
    };
  }
  if (live.statusMercado === 4) {
    return {
      emoji: '⏸️',
      titulo: 'Rodada encerrada',
      descricao: 'Aguardando mercado abrir para consolidar automaticamente.',
      cor: 'var(--accent-warning)',
    };
  }
  return {
    emoji: '📡',
    titulo: 'Monitorando',
    descricao: 'Orchestrator ativo e monitorando o mercado.',
    cor: 'var(--text-muted)',
  };
}

function renderStat(value, label) {
  return `
    <div class="card" style="text-align: center; padding: 12px 8px; margin-bottom: 0;">
      <div style="font-family: var(--font-mono); font-size: 22px; font-weight: 700; color: var(--accent-primary);">
        ${value}
      </div>
      <div style="color: var(--text-muted); font-size: 11px; margin-top: 2px;">${label}</div>
    </div>
  `;
}

function renderEvento(e) {
  let emoji = '📝';
  let borderColor = 'var(--border-color)';

  if (e.tipo.includes('transicao')) { emoji = '🔔'; borderColor = 'var(--accent-primary)'; }
  else if (e.tipo.includes('consolidacao_completa')) { emoji = '✅'; borderColor = 'var(--accent-success)'; }
  else if (e.tipo.includes('erro')) { emoji = '❌'; borderColor = 'var(--accent-danger)'; }
  else if (e.tipo.includes('rodada_encerrada')) { emoji = '🏁'; borderColor = 'var(--accent-warning)'; }

  const time = e.timestamp
    ? new Date(e.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

  return `
    <div style="
      display: flex; align-items: flex-start; gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
    ">
      <span style="font-size: 16px; flex-shrink: 0; margin-top: 2px;">${emoji}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 13px; color: var(--text-primary);">${formatEvento(e)}</div>
        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px;">${time}</div>
      </div>
    </div>
  `;
}

function formatEvento(e) {
  if (e.tipo === 'transicao_mercado') {
    return `Mercado: ${MARKET_LABELS[e.de] || e.de} → ${MARKET_LABELS[e.para] || e.para} (R${e.rodada})`;
  }
  if (e.tipo === 'consolidacao_completa') {
    return `Consolidacao R${e.rodada} completa (${e.detalhes?.ligas || '?'} ligas)`;
  }
  if (e.tipo === 'erro_consolidacao') {
    return `Erro consolidacao R${e.rodada}: ${e.detalhes?.erro || 'desconhecido'}`;
  }
  if (e.tipo === 'erro_poll') {
    return `Erro poll: ${e.detalhes?.erro || 'desconhecido'}`;
  }
  if (e.tipo === 'rodada_encerrada') {
    return `Rodada ${e.rodada} encerrada`;
  }
  return `${e.tipo} ${e.rodada ? '(R' + e.rodada + ')' : ''}`;
}

function tempoRelativo(date) {
  const agora = new Date();
  const diff = agora - date;
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1) return 'Agora mesmo';
  if (minutos < 60) return `ha ${minutos}min`;
  if (horas < 24) return `ha ${horas}h`;
  return `ha ${dias}d`;
}
