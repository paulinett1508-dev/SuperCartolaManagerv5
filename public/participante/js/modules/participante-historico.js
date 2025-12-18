// =====================================================================
// PARTICIPANTE-HISTORICO.JS - v1.0 (Hall da Fama)
// Destino: /participante/js/modules/participante-historico.js
// =====================================================================
// Módulo para exibir histórico de temporadas do participante
// Consome dados do Cartório Vitalício (users_registry.json)
// =====================================================================

if (window.Log) Log.info("HISTORICO-PARTICIPANTE", "📜 Módulo v1.0 carregando...");

// Estado do módulo
let historicoData = null;
let temporadaSelecionada = null;

// Mapeamento de badges para exibição
const BADGES_CONFIG = {
    campeao: { icon: "🏆", nome: "Campeão", cor: "#ffd700" },
    campeao_2025: { icon: "🏆", nome: "Campeão 2025", cor: "#ffd700" },
    vice: { icon: "🥈", nome: "Vice-Campeão", cor: "#c0c0c0" },
    vice_2025: { icon: "🥈", nome: "Vice 2025", cor: "#c0c0c0" },
    terceiro: { icon: "🥉", nome: "3º Lugar", cor: "#cd7f32" },
    terceiro_2025: { icon: "🥉", nome: "3º Lugar 2025", cor: "#cd7f32" },
    top10_mito: { icon: "⭐", nome: "Top 10 Mito", cor: "#10b981" },
    top10_mito_2025: { icon: "⭐", nome: "Top 10 Mito 2025", cor: "#10b981" },
    top10_mico: { icon: "💀", nome: "Top 10 Mico", cor: "#ef4444" },
    top10_mico_2025: { icon: "💀", nome: "Top 10 Mico 2025", cor: "#ef4444" },
    artilheiro: { icon: "⚽", nome: "Artilheiro", cor: "#3b82f6" },
    luva_ouro: { icon: "🧤", nome: "Luva de Ouro", cor: "#f59e0b" },
    melhor_mes: { icon: "📅", nome: "Melhor do Mês", cor: "#8b5cf6" },
    mata_mata_campeao: { icon: "⚔️", nome: "Campeão Mata-Mata", cor: "#ec4899" },
    invicto: { icon: "🛡️", nome: "Invicto", cor: "#14b8a6" }
};

// =====================================================================
// FUNÇÃO PRINCIPAL - INICIALIZAR
// =====================================================================
export async function inicializarHistoricoParticipante({ participante, ligaId, timeId }) {
    if (window.Log) Log.info("HISTORICO-PARTICIPANTE", "🔄 Inicializando...", { timeId });

    if (!timeId) {
        mostrarErro("Dados inválidos para carregar histórico");
        return;
    }

    // Mostrar loading
    const container = document.getElementById("historicoDetalhe");
    if (container) {
        container.innerHTML = `
            <div class="loading-placeholder">
                <div class="spinner"></div>
                <p>Carregando seu histórico...</p>
            </div>
        `;
    }

    try {
        // Buscar histórico da API
        const response = await fetch(`/api/participante/historico/${timeId}`);

        if (!response.ok) {
            if (response.status === 404) {
                mostrarVazio();
                return;
            }
            throw new Error(`Erro ao buscar histórico: ${response.status}`);
        }

        historicoData = await response.json();

        if (!historicoData.success) {
            throw new Error(historicoData.error || "Erro desconhecido");
        }

        if (window.Log) Log.info("HISTORICO-PARTICIPANTE", "✅ Dados carregados:", {
            temporadas: historicoData.historico?.length || 0
        });

        // Renderizar tudo
        renderizarStats();
        renderizarBadges();
        renderizarTemporadas();

    } catch (error) {
        if (window.Log) Log.error("HISTORICO-PARTICIPANTE", "❌ Erro:", error);
        mostrarErro(error.message);
    }
}

// =====================================================================
// RENDERIZAR ESTATÍSTICAS AGREGADAS
// =====================================================================
function renderizarStats() {
    const stats = historicoData.stats_agregadas || {};
    const financeiro = historicoData.situacao_financeira || {};

    // Temporadas
    const elTemporadas = document.getElementById("statTemporadas");
    if (elTemporadas) {
        elTemporadas.textContent = stats.total_temporadas || 0;
    }

    // Títulos
    const elTitulos = document.getElementById("statTitulos");
    if (elTitulos) {
        elTitulos.textContent = stats.total_titulos || 0;
    }

    // Melhor Posição
    const elMelhorPos = document.getElementById("statMelhorPos");
    if (elMelhorPos) {
        const pos = stats.melhor_posicao_geral;
        elMelhorPos.textContent = pos ? `${pos}º` : "-";
    }

    // Saldo Histórico
    const elSaldo = document.getElementById("statSaldo");
    if (elSaldo) {
        const saldo = financeiro.saldo_atual || 0;
        elSaldo.textContent = formatarMoeda(saldo);
        elSaldo.classList.toggle("positivo", saldo > 0);
        elSaldo.classList.toggle("negativo", saldo < 0);
    }
}

// =====================================================================
// RENDERIZAR BADGES CONQUISTADOS
// =====================================================================
function renderizarBadges() {
    const container = document.getElementById("badgesContainer");
    const section = document.getElementById("historicoBadges");

    if (!container || !section) return;

    // Coletar todos os badges de todas as temporadas
    const todosBadges = [];

    (historicoData.historico || []).forEach(temp => {
        const badges = temp.conquistas?.badges || [];
        badges.forEach(badgeId => {
            todosBadges.push({
                id: badgeId,
                ano: temp.ano
            });
        });
    });

    if (todosBadges.length === 0) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";

    container.innerHTML = todosBadges.map(badge => {
        const config = BADGES_CONFIG[badge.id] || BADGES_CONFIG[badge.id.replace(/_\d{4}$/, '')] || {
            icon: "🎖️",
            nome: badge.id.replace(/_/g, " "),
            cor: "#9ca3af"
        };

        return `
            <div class="badge-item" style="border-color: ${config.cor}30;">
                <span class="badge-icon">${config.icon}</span>
                <span class="badge-text">${config.nome}</span>
                ${!badge.id.includes(badge.ano) ? `<span class="badge-year">${badge.ano}</span>` : ''}
            </div>
        `;
    }).join("");
}

// =====================================================================
// RENDERIZAR SELETOR DE TEMPORADAS
// =====================================================================
function renderizarTemporadas() {
    const tabsContainer = document.getElementById("temporadasTabs");
    const detalheContainer = document.getElementById("historicoDetalhe");

    if (!tabsContainer || !detalheContainer) return;

    const temporadas = historicoData.historico || [];

    if (temporadas.length === 0) {
        mostrarVazio();
        return;
    }

    // Ordenar temporadas (mais recente primeiro)
    const temporadasOrdenadas = [...temporadas].sort((a, b) => b.ano - a.ano);

    // Renderizar tabs
    tabsContainer.innerHTML = temporadasOrdenadas.map((temp, idx) => `
        <button class="temporada-tab ${idx === 0 ? 'active' : ''}"
                data-ano="${temp.ano}"
                onclick="window.selecionarTemporada(${temp.ano})">
            ${temp.ano}
        </button>
    `).join("");

    // Selecionar primeira temporada por padrão
    if (temporadasOrdenadas.length > 0) {
        temporadaSelecionada = temporadasOrdenadas[0].ano;
        renderizarDetalheTemporada(temporadasOrdenadas[0]);
    }
}

// =====================================================================
// SELECIONAR TEMPORADA (global para onclick)
// =====================================================================
window.selecionarTemporada = function(ano) {
    if (window.Log) Log.debug("HISTORICO-PARTICIPANTE", "📅 Selecionando temporada:", ano);

    temporadaSelecionada = ano;

    // Atualizar tabs
    document.querySelectorAll(".temporada-tab").forEach(tab => {
        tab.classList.toggle("active", parseInt(tab.dataset.ano) === ano);
    });

    // Buscar dados da temporada
    const temporada = historicoData.historico?.find(t => t.ano === ano);

    if (temporada) {
        renderizarDetalheTemporada(temporada);
    }
};

// =====================================================================
// RENDERIZAR DETALHE DE UMA TEMPORADA
// =====================================================================
function renderizarDetalheTemporada(temporada) {
    const container = document.getElementById("historicoDetalhe");
    if (!container) return;

    const stats = temporada.estatisticas || {};
    const financeiro = temporada.financeiro || {};
    const badges = temporada.conquistas?.badges || [];

    // Determinar classe da posição
    let posicaoClasse = "normal";
    if (stats.posicao_final === 1) posicaoClasse = "ouro";
    else if (stats.posicao_final === 2) posicaoClasse = "prata";
    else if (stats.posicao_final === 3) posicaoClasse = "bronze";

    container.innerHTML = `
        <!-- Header com Escudo e Posição -->
        <div class="detalhe-header">
            <img src="${temporada.time_escudo || '/participante/img/escudo-placeholder.png'}"
                 alt="Escudo"
                 class="detalhe-escudo"
                 onerror="this.src='/participante/img/escudo-placeholder.png'">
            <div class="detalhe-info">
                <h3>${temporada.liga_nome || 'Liga'}</h3>
                <p>Temporada ${temporada.ano}</p>
            </div>
            <div class="detalhe-posicao">
                <span class="posicao-numero ${posicaoClasse}">${stats.posicao_final || '-'}º</span>
                <span class="posicao-label">Posição Final</span>
            </div>
        </div>

        <!-- Métricas -->
        <div class="detalhe-metricas">
            <div class="metrica-item">
                <span class="metrica-valor">${formatarPontos(stats.pontos_totais)}</span>
                <span class="metrica-label">Pontos</span>
            </div>
            <div class="metrica-item">
                <span class="metrica-valor">${stats.rodadas_jogadas || 0}</span>
                <span class="metrica-label">Rodadas</span>
            </div>
            <div class="metrica-item">
                <span class="metrica-valor ${financeiro.saldo_final > 0 ? 'positivo' : financeiro.saldo_final < 0 ? 'negativo' : ''}">${formatarMoeda(financeiro.saldo_final || 0)}</span>
                <span class="metrica-label">Saldo Final</span>
            </div>
        </div>

        <!-- Detalhamento Financeiro -->
        <div class="detalhe-metricas" style="margin-top: 8px;">
            <div class="metrica-item">
                <span class="metrica-valor positivo">+${formatarMoeda(Math.abs(financeiro.total_bonus || 0))}</span>
                <span class="metrica-label">Bônus</span>
            </div>
            <div class="metrica-item">
                <span class="metrica-valor negativo">-${formatarMoeda(Math.abs(financeiro.total_onus || 0))}</span>
                <span class="metrica-label">Ônus</span>
            </div>
            <div class="metrica-item">
                <span class="metrica-valor">${calcularAproveitamento(stats)}%</span>
                <span class="metrica-label">Aproveitamento</span>
            </div>
        </div>

        ${badges.length > 0 ? `
            <!-- Badges da Temporada -->
            <div class="detalhe-badges">
                ${badges.map(badgeId => {
                    const config = BADGES_CONFIG[badgeId] || BADGES_CONFIG[badgeId.replace(/_\d{4}$/, '')] || {
                        icon: "🎖️",
                        nome: badgeId.replace(/_/g, " ")
                    };
                    return `
                        <span class="detalhe-badge">
                            ${config.icon} ${config.nome.replace(/_\d{4}$/, '')}
                        </span>
                    `;
                }).join("")}
            </div>
        ` : ''}
    `;
}

// =====================================================================
// FUNÇÕES AUXILIARES
// =====================================================================

function formatarMoeda(valor) {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatarPontos(valor) {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function calcularAproveitamento(stats) {
    // Placeholder - pode ser calculado com base em vitórias/jogos
    // Por enquanto retorna baseado na posição final
    const pos = stats.posicao_final;
    if (!pos) return 0;
    if (pos === 1) return 100;
    if (pos <= 3) return 90;
    if (pos <= 10) return 70;
    return Math.max(10, 100 - (pos * 2));
}

function mostrarVazio() {
    const container = document.getElementById("historicoDetalhe");
    const section = document.getElementById("historicoSeletor");

    if (section) section.style.display = "none";

    if (container) {
        container.innerHTML = `
            <div class="historico-vazio">
                <span class="material-symbols-outlined empty-icon">history_edu</span>
                <h3>Sem histórico ainda</h3>
                <p>Seu legado começará a ser registrado após a primeira temporada.</p>
            </div>
        `;
    }

    // Zerar stats
    document.getElementById("statTemporadas")?.textContent && (document.getElementById("statTemporadas").textContent = "0");
    document.getElementById("statTitulos")?.textContent && (document.getElementById("statTitulos").textContent = "0");
    document.getElementById("statMelhorPos")?.textContent && (document.getElementById("statMelhorPos").textContent = "-");
    document.getElementById("statSaldo")?.textContent && (document.getElementById("statSaldo").textContent = "R$ 0");
}

function mostrarErro(mensagem) {
    const container = document.getElementById("historicoDetalhe");
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1);
                        border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                <span class="material-symbols-outlined" style="font-size: 48px; color: #ef4444; margin-bottom: 16px; display: block;">error</span>
                <h3 style="color: #ef4444; margin-bottom: 12px;">Erro ao Carregar</h3>
                <p style="color: #e0e0e0; margin-bottom: 20px;">${mensagem}</p>
                <button onclick="location.reload()"
                        style="padding: 12px 24px; background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%);
                               color: white; border: none; border-radius: 8px; cursor: pointer;
                               font-weight: 600; font-size: 14px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

// =====================================================================
// EXPORTS
// =====================================================================
export function initHistoricoParticipante() {
    if (window.Log) Log.debug("HISTORICO-PARTICIPANTE", "Módulo pronto");
}

if (window.Log) Log.info("HISTORICO-PARTICIPANTE", "✅ Módulo v1.0 carregado");
