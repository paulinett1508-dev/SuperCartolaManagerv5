// =====================================================================
// MÓDULO PARCIAIS - v4.0 (Multi-Temporada)
// public/js/parciais.js
// =====================================================================

console.log("[PARCIAIS] Módulo v4.0 carregando...");

// Configuração de temporadas
const TEMPORADAS_CONFIG = {
    2025: { encerrada: true, totalRodadas: 38 },
    2026: { encerrada: false, totalRodadas: 38 }
};

/**
 * Obter temporada selecionada da URL ou contexto global
 */
function obterTemporadaSelecionada() {
    const urlParams = new URLSearchParams(window.location.search);
    const temporadaParam = urlParams.get("temporada");
    if (temporadaParam) return parseInt(temporadaParam, 10);
    if (window.temporadaAtual) return window.temporadaAtual;
    return new Date().getFullYear();
}

/**
 * Verificar se a temporada está encerrada
 */
function isTemporadaEncerrada(temporada) {
    const config = TEMPORADAS_CONFIG[temporada];
    if (config) return config.encerrada;
    // Temporadas anteriores a 2025 estão encerradas
    if (temporada < 2025) return true;
    // Temporadas futuras não estão encerradas
    return false;
}

// =====================================================================
// INICIALIZAÇÃO - COM VERIFICAÇÃO DE TEMPORADA
// =====================================================================
export async function inicializarParciais() {
    const temporada = obterTemporadaSelecionada();
    console.log(`[PARCIAIS] Inicializando para temporada ${temporada}...`);

    if (isTemporadaEncerrada(temporada)) {
        console.log(`[PARCIAIS] Temporada ${temporada} encerrada - módulo em modo standby`);

        // Parar scheduler se estiver rodando
        if (window.ParciaisScheduler?.parar) {
            window.ParciaisScheduler.parar();
            console.log("[PARCIAIS] Scheduler desativado");
        }

        // Mostrar UI de temporada encerrada
        mostrarUITemporadaEncerrada(temporada);
        return;
    }

    // Temporada ativa - carregar parciais normalmente
    console.log(`[PARCIAIS] Temporada ${temporada} ativa - carregando parciais...`);
    await carregarParciais();
}

/**
 * Mostrar UI quando temporada está encerrada
 */
function mostrarUITemporadaEncerrada(temporada) {
    const container = document.getElementById('parciais-container');
    if (!container) return;

    container.innerHTML = `
        <div class="parciais-encerrado">
            <div class="parciais-encerrado-icon">
                <span class="material-icons">emoji_events</span>
            </div>
            <h2 class="parciais-encerrado-title">Temporada ${temporada} Encerrada</h2>
            <p class="parciais-encerrado-subtitle">
                As 38 rodadas foram concluídas com sucesso
            </p>
            <div class="parciais-encerrado-stats">
                <div class="parciais-stat">
                    <span class="material-icons">flag</span>
                    <span>38 Rodadas</span>
                </div>
                <div class="parciais-stat">
                    <span class="material-icons">check_circle</span>
                    <span>Consolidado</span>
                </div>
            </div>
            <div class="parciais-encerrado-info">
                <span class="material-icons">info</span>
                <p>
                    Confira a classificação final e os premiados nos módulos de
                    Ranking e Premiações.
                </p>
            </div>
            <div class="parciais-encerrado-actions">
                <button class="parciais-btn-ranking"
                    onclick="window.orquestrador?.showModule('ranking-geral')">
                    <span class="material-icons">leaderboard</span>
                    Ver Classificação Final
                </button>
            </div>
        </div>
    `;
}

/**
 * Carregar parciais da rodada atual
 */
async function carregarParciais() {
    const temporada = obterTemporadaSelecionada();

    if (isTemporadaEncerrada(temporada)) {
        console.log(`[PARCIAIS] Temporada ${temporada} encerrada - função desabilitada`);
        mostrarUITemporadaEncerrada(temporada);
        return;
    }

    // TODO: Implementar carregamento de parciais para temporada ativa
    // Por enquanto mostrar mensagem de pré-temporada
    const container = document.getElementById('parciais-container');
    if (!container) return;

    container.innerHTML = `
        <div class="parciais-encerrado">
            <div class="parciais-encerrado-icon">
                <span class="material-icons">schedule</span>
            </div>
            <h2 class="parciais-encerrado-title">Temporada ${temporada}</h2>
            <p class="parciais-encerrado-subtitle">
                Aguardando início das rodadas
            </p>
            <div class="parciais-encerrado-info">
                <span class="material-icons">info</span>
                <p>
                    Os parciais estarão disponíveis quando as rodadas da temporada ${temporada} começarem.
                </p>
            </div>
            <div class="parciais-encerrado-actions">
                <button class="parciais-btn-ranking"
                    onclick="window.orquestrador?.voltarParaCards()">
                    <span class="material-icons">arrow_back</span>
                    Voltar aos Módulos
                </button>
            </div>
        </div>
    `;
}

function atualizarParciais() {
    const temporada = obterTemporadaSelecionada();

    if (isTemporadaEncerrada(temporada)) {
        console.log(`[PARCIAIS] Temporada ${temporada} encerrada - função desabilitada`);
        return;
    }

    // TODO: Implementar atualização de parciais
    console.log(`[PARCIAIS] Atualizando parciais temporada ${temporada}...`);
}

// Expor globalmente
window.carregarParciais = carregarParciais;
window.atualizarParciais = atualizarParciais;
window.inicializarParciais = inicializarParciais;

console.log("[PARCIAIS] Módulo v4.0 carregado - Multi-Temporada habilitado");
