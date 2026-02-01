// MÓDULO PARTICIPANTES - VERSÃO OTIMIZADA (Performance)
// v2.16: Centralização clubes-data.js (2026-02-01)
// v2.15: Exportar lista de participantes para PDF (2026-01-27)
// v2.14: Cache-bust fix (2026-01-22)
import { CLUBES as _CLUBES_SOURCE } from "/js/shared/clubes-data.js";

const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");
const CAMPINHO_TARGET_KEY = 'scm_campinho_target';

// ✅ DEBOUNCE: Evitar cliques duplicados
let operacaoEmAndamento = false;

// =====================================================================
// SISTEMA DE TEMPORADAS
// =====================================================================
let temporadaSelecionada = null;
let temporadasDisponiveis = [];
let temporadaLiga = null;

// Inicializa as temporadas disponíveis
async function inicializarTemporadas() {
    const tabsContainer = document.getElementById("temporada-tabs");
    if (!tabsContainer) return;

    try {
        const res = await fetch(`/api/ligas/${ligaId}/temporadas`);
        if (!res.ok) throw new Error("Erro ao buscar temporadas");

        const data = await res.json();
        temporadasDisponiveis = data.disponiveis || [];
        temporadaLiga = data.temporada_liga;

        // ✅ Multi-Temporada: verificar se tem temporada na URL ou contexto global
        const temporadaUrl = urlParams.get("temporada");
        const temporadaContexto = temporadaUrl ? parseInt(temporadaUrl, 10) : (window.temporadaAtual || null);

        // ✅ v2.2: Usar temporada do contexto se disponível e válida
        const temporadaMaisRecente = Math.max(...temporadasDisponiveis);
        if (temporadaContexto && temporadasDisponiveis.includes(temporadaContexto)) {
            temporadaSelecionada = temporadaContexto;
            console.log(`[TEMPORADAS] 📜 Usando temporada do contexto: ${temporadaContexto}`);
        } else {
            temporadaSelecionada = temporadaSelecionada || temporadaMaisRecente;
        }

        renderizarAbas();
        atualizarVisibilidadeBotaoValidar();
        console.log(`[TEMPORADAS] Disponíveis: ${temporadasDisponiveis.join(", ")}`);
    } catch (error) {
        console.warn("[TEMPORADAS] Erro ao inicializar:", error);
        tabsContainer.style.display = "none";
    }
}

function abrirCampinhoParticipante(timeId) {
    if (!timeId) return;

    const target = {
        timeId,
        ligaId,
    };

    try {
        localStorage.setItem(CAMPINHO_TARGET_KEY, JSON.stringify(target));
    } catch (error) {
        console.warn('[PARTICIPANTES] Não foi possível gravar o alvo do campinho no localStorage:', error);
    }

    const campinhoUrl = `${window.location.origin}/participante`;
    window.open(campinhoUrl, '_blank');
}

// Renderiza as abas de temporada
function renderizarAbas() {
    const container = document.getElementById("temporada-tabs");
    if (!container || temporadasDisponiveis.length === 0) return;

    // Se só tem uma temporada, não mostra abas
    if (temporadasDisponiveis.length === 1) {
        container.style.display = "none";
        return;
    }

    container.innerHTML = temporadasDisponiveis.map(temp => `
        <button class="tab-btn ${temp === temporadaSelecionada ? "active" : ""}"
                data-temporada="${temp}"
                onclick="selecionarTemporada(${temp})">
            <span class="material-icons">calendar_today</span>
            ${temp}
        </button>
    `).join("");
}

// Seleciona uma temporada e recarrega participantes
async function selecionarTemporada(temporada) {
    if (temporada === temporadaSelecionada) return;

    temporadaSelecionada = temporada;

    // Atualizar UI das abas
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("active", parseInt(btn.dataset.temporada) === temporada);
    });

    // Atualizar visibilidade do botão Validar
    atualizarVisibilidadeBotaoValidar();

    // Recarregar participantes
    await carregarParticipantesPorTemporada(temporada);
}

/**
 * Controla visibilidade do botão Validar
 * Só mostra para temporada atual ou futura (2025 já consolidado não precisa validar)
 */
function atualizarVisibilidadeBotaoValidar() {
    const btnValidar = document.getElementById("btn-validar-ids");
    if (!btnValidar) return;

    // Só mostra se temporada selecionada >= temporada da liga (atual)
    const mostrar = temporadaSelecionada >= temporadaLiga;
    btnValidar.style.display = mostrar ? "" : "none";

    if (!mostrar) {
        console.log(`[VALIDAR] Botão oculto para temporada ${temporadaSelecionada} (consolidada)`);
    }
}

// Torna função global para onclick
window.selecionarTemporada = selecionarTemporada;

// CONFIGURAÇÃO DOS BRASÕES - derivada da fonte centralizada (clubes-data.js)
const _mapeamento = {};
for (const [id, info] of Object.entries(_CLUBES_SOURCE)) {
    _mapeamento[Number(id)] = { nome: info.nome, arquivo: `${id}.png` };
}
const CLUBES_CONFIG = {
    MAPEAMENTO: _mapeamento,
    PATHS: {
        escudosLocal: "/escudos/",
        placeholder: "/escudos/placeholder.png",
        defaultImage: "/escudos/default.png",
    },
};

// Helper para obter brasões
const BrasoesHelper = {
    getTimeFantasyBrasao(timeData) {
        if (!timeData) return CLUBES_CONFIG.PATHS.defaultImage;
        return timeData.url_escudo_png || CLUBES_CONFIG.PATHS.defaultImage;
    },

    getClubeBrasao(clubeId) {
        if (!clubeId) return CLUBES_CONFIG.PATHS.placeholder;
        const clube = CLUBES_CONFIG.MAPEAMENTO[clubeId];
        if (clube) {
            return `${CLUBES_CONFIG.PATHS.escudosLocal}${clube.arquivo}`;
        }
        return CLUBES_CONFIG.PATHS.placeholder;
    },

    getNomeClube(clubeId) {
        const clube = CLUBES_CONFIG.MAPEAMENTO[clubeId];
        return clube ? clube.nome : "Não definido";
    },
};

// =====================================================================
// CARREGAMENTO POR TEMPORADA (Novo endpoint)
// =====================================================================
async function carregarParticipantesPorTemporada(temporada) {
    const container = document.getElementById("participantes-grid");
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state-full">
            <div class="loading-spinner"></div>
            <div class="loading-message">Carregando participantes ${temporada}...</div>
        </div>
    `;

    try {
        const res = await fetch(`/api/ligas/${ligaId}/participantes?temporada=${temporada}`);
        if (!res.ok) throw new Error("Erro ao buscar participantes");

        const data = await res.json();
        const participantes = data.participantes || [];
        const stats = data.stats || {};
        const isTemporadaBase = data.fonte === "liga.participantes";

        // ✅ v2.14: Log de diagnóstico para verificar dados recebidos
        console.log(`[PARTICIPANTES] Recebidos ${participantes.length} de ${temporada} (fonte: ${data.fonte})`);
        console.log(`[PARTICIPANTES] Stats:`, stats);

        // ✅ Contadores serão atualizados APÓS o filtro (v2.16)

        if (participantes.length === 0) {
            // ✅ v2.16: Zerar contadores quando não há participantes
            document.getElementById("total-participantes").textContent = 0;
            document.getElementById("participantes-ativos").textContent = 0;
            container.innerHTML = `
                <div class="participantes-empty-state">
                    <span class="material-icons" style="font-size: 48px;">group</span>
                    <div class="empty-title">Nenhum participante em ${temporada}</div>
                </div>
            `;
            return;
        }

        // Ordenar por nome
        participantes.sort((a, b) =>
            (a.nome_cartoleiro || "").localeCompare(b.nome_cartoleiro || "")
        );

        container.innerHTML = "";

        // Filtrar: quem saiu (nao_participa) não aparece em temporadas futuras
        const participantesFiltrados = isTemporadaBase
            ? participantes
            : participantes.filter(p => p.status !== "nao_participa");

        // ✅ v2.14: Log dos participantes filtrados para diagnóstico
        console.log(`[PARTICIPANTES] Após filtro: ${participantesFiltrados.length} participantes`);
        console.log(`[PARTICIPANTES] Lista:`, participantesFiltrados.map(p => `${p.nome_cartoleiro} (${p.status})`));

        // ✅ v2.16: Atualizar contadores com valores REAIS da lista visível
        // Total = participantes visíveis (exclui nao_participa)
        // Ativos = renovados + novos
        const totalVisiveis = participantesFiltrados.length;
        const ativosVisiveis = participantesFiltrados.filter(p => p.status === "renovado" || p.status === "novo").length;
        document.getElementById("total-participantes").textContent = totalVisiveis;
        document.getElementById("participantes-ativos").textContent = ativosVisiveis;

        // ✅ v2.15: Salvar para exportação PDF
        window.participantesCarregados = participantesFiltrados;
        window.participantesTemporada = temporada;

        participantesFiltrados.forEach((p, index) => {
            const estaAtivo = p.ativo !== false;
            const card = document.createElement("div");
            card.className = `participante-card ${!estaAtivo ? "card-inativo" : ""}`;
            card.id = `card-time-${p.time_id}`;
            card.setAttribute("data-time-id", p.time_id);
            card.setAttribute("data-ativo", estaAtivo);
            card.setAttribute("data-nome", (p.nome_cartoleiro || "").toLowerCase());
            card.setAttribute("data-time", (p.nome_time || "").toLowerCase());

            const temClubeCoracao = p.clube_id && CLUBES_CONFIG.MAPEAMENTO[p.clube_id];

            card.innerHTML = `
                <div class="participante-row">
                    <span class="participante-numero">${String(index + 1).padStart(2, '0')}</span>
                    ${temporadaSelecionada >= 2026 ? `
                    <input type="checkbox"
                           class="batch-checkbox"
                           data-time-id="${p.time_id}"
                           data-status="${p.status || 'pendente'}"
                           data-nome="${(p.nome_cartoleiro || '').replace(/"/g, '&quot;')}"
                           onclick="event.stopPropagation(); window.toggleSelecaoBatch(${p.time_id})">
                    ` : ''}
                    <div class="participante-avatar-mini">
                        <img src="${p.escudo || CLUBES_CONFIG.PATHS.defaultImage}"
                             alt="${p.nome_cartoleiro}"
                             onerror="this.src='${CLUBES_CONFIG.PATHS.defaultImage}'">
                        <span class="status-dot ${estaAtivo ? "status-ativo" : "status-inativo"}"></span>
                    </div>

                    <div class="participante-info-compact">
                        <span class="participante-nome-compact">${p.nome_cartoleiro || "N/D"}</span>
                        <span class="participante-time-compact">${p.nome_time || "Time N/A"}</span>
                    </div>

                    ${temClubeCoracao ? `
                    <div class="participante-clube-mini" title="${BrasoesHelper.getNomeClube(p.clube_id)}">
                        <img src="${BrasoesHelper.getClubeBrasao(p.clube_id)}"
                             alt="${BrasoesHelper.getNomeClube(p.clube_id)}"
                             onerror="this.src='${CLUBES_CONFIG.PATHS.placeholder}'">
                    </div>
                    ` : ""}

                    <div class="participante-actions-compact">
                        ${(() => {
                            // ✅ v2.8: Mostrar check verde se já foi sincronizado (tem escudo)
                            const jaSincronizado = p.escudo && p.escudo.length > 10;
                            return `
                        <button class="btn-compact btn-compact-validar ${jaSincronizado ? 'ja-validado' : ''}"
                                data-action="validar-id"
                                data-time-id="${p.time_id}"
                                data-nome="${(p.nome_cartoleiro || "").replace(/"/g, "&quot;")}"
                                data-sincronizado="${jaSincronizado}"
                                title="${jaSincronizado ? 'Já sincronizado - clique para atualizar' : 'Validar ID na API Cartola'}">
                            <span class="material-symbols-outlined" style="${jaSincronizado ? 'color: #22c55e;' : ''}">${jaSincronizado ? 'check_circle' : 'verified'}</span>
                        </button>`;
                        })()}
                        <button class="btn-compact btn-compact-status"
                                data-action="toggle-status"
                                data-time-id="${p.time_id}"
                                data-ativo="${estaAtivo}"
                                title="${estaAtivo ? "Inativar" : "Reativar"}">
                            <span class="material-symbols-outlined">${estaAtivo ? "pause_circle" : "play_circle"}</span>
                        </button>
                        <button class="btn-compact btn-compact-senha"
                                data-action="gerenciar-senha"
                                data-time-id="${p.time_id}"
                                data-nome="${(p.nome_cartoleiro || "").replace(/"/g, "&quot;")}"
                                title="Senha">
                            <span class="material-symbols-outlined">key</span>
                        </button>
                        <button class="btn-compact btn-compact-dados"
                                data-action="ver-api-cartola"
                                data-time-id="${p.time_id}"
                                data-nome="${(p.nome_cartoleiro || "").replace(/"/g, "&quot;")}"
                                data-time-nome="${(p.nome_time || "").replace(/"/g, "&quot;")}"
                                title="API Cartola">
                            <span class="material-symbols-outlined">cloud_sync</span>
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

        // Adicionar event listeners (via delegation) - ✅ v2.2: Para todas as temporadas
        container.removeEventListener("click", handleCardClick);
        container.addEventListener("click", handleCardClick);

        // Atualizar toolbar batch (sempre visível em 2026+)
        atualizarToolbarBatch();

        console.log(`[PARTICIPANTES] ${participantesFiltrados.length} participantes de ${temporada}`);
    } catch (error) {
        console.error("[PARTICIPANTES] Erro:", error);
        container.innerHTML = `
            <div class="participantes-empty-state">
                <span class="material-icons" style="font-size: 48px; color: #ef4444;">error</span>
                <div class="empty-title">Erro ao carregar participantes</div>
            </div>
        `;
    }
}

// Helper: Badge de status para temporadas futuras
function getStatusBadgeHTML(status) {
    const badges = {
        renovado: { label: "Renovado", class: "badge-success", icon: "check_circle" },
        novo: { label: "Novo", class: "badge-info", icon: "person_add" },
        pendente: { label: "Pendente", class: "badge-warning", icon: "schedule" },
        nao_participa: { label: "Saiu", class: "badge-danger", icon: "cancel" },
    };

    const badge = badges[status];
    if (!badge) return "";

    return `
        <span class="participante-status-badge ${badge.class}">
            <span class="material-icons">${badge.icon}</span>
            ${badge.label}
        </span>
    `;
}

// ==============================
// ✅ MODAL NÃO-BLOQUEANTE
// ==============================
function mostrarModal(config) {
    return new Promise((resolve) => {
        document.querySelector(".modal-custom")?.remove();

        const modal = document.createElement("div");
        modal.className = "modal-custom";
        modal.innerHTML = `
            <div class="modal-custom-overlay"></div>
            <div class="modal-custom-content">
                <div class="modal-custom-header">
                    <h3>${config.titulo || "Confirmação"}</h3>
                </div>
                <div class="modal-custom-body">
                    ${config.mensagem || ""}
                    ${
                        config.input
                            ? `
                        <div class="modal-input-group">
                            <label>${config.input.label || ""}</label>
                            <input type="${config.input.type || "text"}" 
                                   id="modal-input-value"
                                   placeholder="${config.input.placeholder || ""}"
                                   value="${config.input.value || ""}"
                                   ${config.input.min ? `min="${config.input.min}"` : ""}
                                   ${config.input.max ? `max="${config.input.max}"` : ""}>
                        </div>
                    `
                            : ""
                    }
                </div>
                <div class="modal-custom-footer">
                    <button class="btn-modal-cancel">Cancelar</button>
                    <button class="btn-modal-confirm">${config.btnConfirmar || "Confirmar"}</button>
                </div>
            </div>
        `;

        // Estilo inline
        modal.querySelector(".modal-custom-overlay").style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); z-index: 9998;
        `;
        modal.querySelector(".modal-custom-content").style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #1a1a2e; border-radius: 12px; padding: 20px;
            min-width: 320px; max-width: 90vw; z-index: 9999;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        `;
        modal.querySelector(".modal-custom-header h3").style.cssText = `
            margin: 0 0 15px 0; color: #fff; font-size: 1.1em;
        `;
        modal.querySelector(".modal-custom-body").style.cssText = `
            color: #ccc; margin-bottom: 20px; line-height: 1.5;
        `;
        if (modal.querySelector(".modal-input-group")) {
            modal.querySelector(".modal-input-group").style.cssText =
                `margin-top: 15px;`;
            modal.querySelector(".modal-input-group label").style.cssText = `
                display: block; margin-bottom: 5px; color: #aaa; font-size: 0.9em;
            `;
            modal.querySelector("#modal-input-value").style.cssText = `
                width: 100%; padding: 10px; border: 1px solid #333;
                background: #0d0d1a; color: #fff; border-radius: 6px; font-size: 1em;
            `;
        }
        modal.querySelector(".modal-custom-footer").style.cssText = `
            display: flex; gap: 10px; justify-content: flex-end;
        `;
        modal.querySelector(".btn-modal-cancel").style.cssText = `
            padding: 10px 20px; border: 1px solid #444; background: transparent;
            color: #aaa; border-radius: 6px; cursor: pointer;
        `;
        modal.querySelector(".btn-modal-confirm").style.cssText = `
            padding: 10px 20px; border: none; background: #e63946;
            color: #fff; border-radius: 6px; cursor: pointer;
        `;

        const fechar = (resultado) => {
            modal.remove();
            resolve(resultado);
        };

        modal.querySelector(".modal-custom-overlay").onclick = () =>
            fechar(null);
        modal.querySelector(".btn-modal-cancel").onclick = () => fechar(null);
        modal.querySelector(".btn-modal-confirm").onclick = () => {
            if (config.input) {
                const valor =
                    document.getElementById("modal-input-value")?.value;
                fechar(valor);
            } else {
                fechar(true);
            }
        };

        const handleEsc = (e) => {
            if (e.key === "Escape") {
                document.removeEventListener("keydown", handleEsc);
                fechar(null);
            }
        };
        document.addEventListener("keydown", handleEsc);

        document.body.appendChild(modal);

        if (config.input) {
            setTimeout(
                () => document.getElementById("modal-input-value")?.focus(),
                100,
            );
        }
    });
}

// ✅ TOAST NÃO-BLOQUEANTE
function mostrarToast(mensagem, tipo = "success") {
    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${tipo}`;
    toast.innerHTML = `
        <span class="toast-icon material-symbols-outlined">${tipo === "success" ? "check_circle" : tipo === "error" ? "cancel" : "info"}</span>
        <span class="toast-message">${mensagem}</span>
    `;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 10000;
        background: ${tipo === "success" ? "#2d5a27" : tipo === "error" ? "#8b2635" : "#1a4a6e"};
        color: #fff; padding: 12px 20px; border-radius: 8px;
        display: flex; align-items: center; gap: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==============================
// FUNÇÃO PRINCIPAL
// ==============================
export async function carregarDadosBasicos() {
    try {
        if (!ligaId) return;

        const res = await fetch(`/api/ligas/${ligaId}`);
        if (!res.ok) return;

        const liga = await res.json();
        if (!liga) return;

        await carregarParticipantesComBrasoes();
        return liga;
    } catch (err) {
        console.error("Erro ao carregar dados básicos:", err);
    }
}

// ==============================
// CARREGAR PARTICIPANTES
// ==============================
async function carregarParticipantesComBrasoes() {
    const container = document.getElementById("participantes-grid");
    if (!container) return;

    if (container.dataset.loading === "true") {
        console.log("[PARTICIPANTES] ⏸️ Carregamento já em andamento");
        return;
    }
    container.dataset.loading = "true";

    try {
        console.log(`Carregando participantes da liga: ${ligaId}`);

        // ✅ Inicializar sistema de temporadas
        await inicializarTemporadas();

        // ✅ Usar novo endpoint com temporada selecionada
        if (temporadaSelecionada) {
            container.dataset.loading = "false";
            await carregarParticipantesPorTemporada(temporadaSelecionada);
            return;
        }

        // Fallback: carregamento antigo (se temporadas não disponíveis)

        const resLiga = await fetch(`/api/ligas/${ligaId}`);
        if (!resLiga.ok) throw new Error("Erro ao buscar liga");
        const liga = await resLiga.json();

        if (!liga.participantes || liga.participantes.length === 0) {
            container.innerHTML = `
                <div class="participantes-empty-state">
                    <span class="empty-icon material-symbols-outlined" style="font-size: 48px;">group</span>
                    <div class="empty-title">Nenhum participante cadastrado</div>
                </div>
            `;
            return;
        }

        console.log(
            `[PARTICIPANTES] ⚡ ${liga.participantes.length} participantes`,
        );

        // Batch status
        const timeIds = liga.participantes.map((p) => p.time_id);
        let statusMap = {};

        try {
            const statusRes = await fetch("/api/times/batch/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timeIds }),
            });

            if (statusRes.ok) {
                const statusData = await statusRes.json();
                statusMap = statusData.status || {};
                console.log(`[PARTICIPANTES] ✅ Status batch OK`);
            }
        } catch (error) {
            console.warn("[PARTICIPANTES] ⚠️ Falha batch status");
        }

        // Processar participantes
        const timesData = liga.participantes.map((participante, index) => {
            const timeId = participante.time_id;
            const status = statusMap[timeId] || {
                ativo: true,
                rodada_desistencia: null,
            };

            return {
                id: timeId,
                nome_cartoleiro: participante.nome_cartola || "N/D",
                nome_time: participante.nome_time || "N/D",
                clube_id: participante.clube_id,
                url_escudo_png: participante.foto_time,
                ativo: status.ativo,
                rodada_desistencia: status.rodada_desistencia,
                index,
            };
        });

        const timesValidos = timesData
            .filter((t) => t !== null)
            .sort((a, b) =>
                (a.nome_cartoleiro || "").localeCompare(
                    b.nome_cartoleiro || "",
                ),
            );

        container.innerHTML = "";

        timesValidos.forEach((timeData, index) => {
            const estaAtivo = timeData.ativo !== false;
            const card = document.createElement("div");
            card.className = `participante-card ${!estaAtivo ? "card-inativo" : ""}`;
            card.id = `card-time-${timeData.id}`;
            card.setAttribute("data-time-id", timeData.id);
            card.setAttribute("data-ativo", estaAtivo);
            card.setAttribute("data-delay", index % 10);
            card.setAttribute(
                "data-nome",
                (timeData.nome_cartoleiro || "").toLowerCase(),
            );
            card.setAttribute(
                "data-time",
                (timeData.nome_time || "").toLowerCase(),
            );
            card.setAttribute(
                "data-clube",
                BrasoesHelper.getNomeClube(timeData.clube_id).toLowerCase(),
            );

            const temClubeCoracao =
                timeData.clube_id &&
                CLUBES_CONFIG.MAPEAMENTO[timeData.clube_id];
            const statusClass = estaAtivo ? "status-ativo" : "status-inativo";
            const statusText = estaAtivo
                ? "Ativo"
                : `Inativo R${timeData.rodada_desistencia || "?"}`;

            // Layout compacto horizontal
            card.innerHTML = `
                <div class="participante-row">
                    <span class="participante-numero">${String(index + 1).padStart(2, '0')}</span>
                    <div class="participante-avatar-mini">
                        <img src="${BrasoesHelper.getTimeFantasyBrasao(timeData)}"
                             alt="${timeData.nome_cartoleiro}"
                             onerror="this.src='${CLUBES_CONFIG.PATHS.defaultImage}'">
                        <span class="status-dot ${statusClass}"></span>
                    </div>

                    <div class="participante-info-compact">
                        <span class="participante-nome-compact">${timeData.nome_cartoleiro || "N/D"}</span>
                        <span class="participante-time-compact">${timeData.nome_time || "Time N/A"}</span>
                    </div>

                    ${temClubeCoracao ? `
                    <div class="participante-clube-mini" title="${BrasoesHelper.getNomeClube(timeData.clube_id)}">
                        <img src="${BrasoesHelper.getClubeBrasao(timeData.clube_id)}"
                             alt="${BrasoesHelper.getNomeClube(timeData.clube_id)}"
                             onerror="this.src='${CLUBES_CONFIG.PATHS.placeholder}'">
                    </div>
                    ` : ''}

                    <div class="participante-actions-compact">
                        <button class="btn-compact btn-compact-status"
                                data-action="toggle-status"
                                data-time-id="${timeData.id}"
                                data-ativo="${estaAtivo}"
                                title="${estaAtivo ? "Inativar" : "Reativar"}">
                            <span class="material-symbols-outlined">${estaAtivo ? "pause_circle" : "play_circle"}</span>
                        </button>
                        <button class="btn-compact btn-compact-senha"
                                data-action="gerenciar-senha"
                                data-time-id="${timeData.id}"
                                data-nome="${(timeData.nome_cartoleiro || "").replace(/"/g, "&quot;")}"
                                title="Senha">
                            <span class="material-symbols-outlined">key</span>
                        </button>
                        <button class="btn-compact btn-compact-dados"
                                data-action="ver-api-cartola"
                                data-time-id="${timeData.id}"
                                data-nome="${(timeData.nome_cartoleiro || "").replace(/"/g, "&quot;")}"
                                data-time-nome="${(timeData.nome_time || "").replace(/"/g, "&quot;")}"
                                title="API Cartola">
                            <span class="material-symbols-outlined">cloud_sync</span>
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

        // ✅ EVENT DELEGATION
        container.removeEventListener("click", handleCardClick);
        container.addEventListener("click", handleCardClick);

        // ✅ Atualizar toolbar batch (sempre visível em 2026+)
        atualizarToolbarBatch();

        // ✅ Atualizar stats do toolbar
        const totalAtivos = timesValidos.filter(t => t.ativo !== false).length;
        const totalEl = document.getElementById("total-participantes");
        const ativosEl = document.getElementById("participantes-ativos");
        if (totalEl) totalEl.textContent = timesValidos.length;
        if (ativosEl) ativosEl.textContent = totalAtivos;

        // ✅ Conectar busca inline do toolbar
        const searchInput = document.getElementById("searchParticipantes");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                filtrarParticipantes(e.target.value);
                // Atualizar contador de resultados
                const visibleCards = document.querySelectorAll(".participante-card:not([style*='display: none'])");
                const resultsInfo = document.getElementById("search-results-info");
                const resultsCount = document.getElementById("results-count");
                if (resultsInfo && resultsCount) {
                    if (e.target.value.trim()) {
                        resultsInfo.style.display = "block";
                        resultsCount.textContent = visibleCards.length;
                    } else {
                        resultsInfo.style.display = "none";
                    }
                }
            });
        }

        console.log(`✅ ${timesValidos.length} participantes carregados (${totalAtivos} ativos)`);
    } catch (error) {
        console.error("Erro ao carregar participantes:", error);
        container.innerHTML = `
            <div class="participantes-empty-state error">
                <span class="empty-icon material-symbols-outlined" style="font-size: 48px; color: #ef4444;">error</span>
                <div class="empty-title">Erro ao carregar</div>
                <button onclick="carregarParticipantesComBrasoes()" class="btn-retry"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">sync</span> Tentar novamente</button>
            </div>
        `;
    } finally {
        container.dataset.loading = "false";
    }
}

// ✅ EVENT DELEGATION HANDLER
async function handleCardClick(e) {
    const btn = e.target.closest("[data-action]");
    if (btn) {
        const action = btn.dataset.action;
        const timeId = btn.dataset.timeId;

        if (action === "toggle-status") {
            const estaAtivo = btn.dataset.ativo === "true";
            await toggleStatusParticipante(timeId, estaAtivo, btn);
        } else if (action === "gerenciar-senha") {
            const nome = btn.dataset.nome;
            await gerenciarSenhaParticipante(timeId, nome);
        } else if (action === "ver-api-cartola") {
            const nome = btn.dataset.nome;
            const timeNome = btn.dataset.timeNome;
            await verDadosApiCartola(timeId, nome, timeNome, btn);
        } else if (action === "validar-id") {
            const nome = btn.dataset.nome;
            await validarIdParticipante(timeId, nome, btn);
        } else if (action === "financeiro" || action === "ver-financeiro") {
            const nome = btn.dataset.nome;
            await verExtratoFinanceiroParticipante(timeId, nome, btn);
        }

        return;
    }

    const card = e.target.closest(".participante-card");
    if (card && card.dataset && card.dataset.timeId) {
        abrirCampinhoParticipante(card.dataset.timeId);
    }
}
// Exibe o extrato financeiro do participante
async function verExtratoFinanceiroParticipante(timeId, nomeCartoleiro, btn) {
    try {
        const temporada = temporadaSelecionada || new Date().getFullYear();
        const response = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache?temporada=${temporada}`);
        if (!response.ok) throw new Error("Erro ao buscar extrato financeiro");
        const data = await response.json();

        // Renderizar modal simples com resumo financeiro
        const resumo = data.resumo || {};
        const rodadas = data.rodadas || [];
        const saldo = resumo.saldo !== undefined ? resumo.saldo.toFixed(2) : "N/D";
        const ganhos = resumo.totalGanhos !== undefined ? resumo.totalGanhos.toFixed(2) : "0.00";
        const perdas = resumo.totalPerdas !== undefined ? resumo.totalPerdas.toFixed(2) : "0.00";

        const modal = document.createElement("div");
        modal.className = "modal-custom";
        modal.innerHTML = `
            <div class="modal-custom-overlay"></div>
            <div class="modal-custom-content">
                <div class="modal-custom-header">
                    <h3>Extrato Financeiro - ${nomeCartoleiro}</h3>
                </div>
                <div class="modal-custom-body">
                    <div><strong>Saldo Atual:</strong> R$ ${saldo}</div>
                    <div><strong>Ganhos:</strong> R$ ${ganhos}</div>
                    <div><strong>Perdas:</strong> R$ ${perdas}</div>
                    <div style="margin-top:10px;"><strong>Rodadas:</strong> ${rodadas.length}</div>
                </div>
                <div class="modal-custom-footer">
                    <button class="btn-modal-cancel">Fechar</button>
                </div>
            </div>
        `;
        modal.querySelector(".modal-custom-overlay").onclick = () => modal.remove();
        modal.querySelector(".btn-modal-cancel").onclick = () => modal.remove();
        document.body.appendChild(modal);
    } catch (error) {
        const modal = document.createElement("div");
        modal.className = "modal-custom";
        modal.innerHTML = `
            <div class="modal-custom-overlay"></div>
            <div class="modal-custom-content">
                <div class="modal-custom-header">
                    <h3>Erro ao Carregar</h3>
                </div>
                <div class="modal-custom-body">
                    <div style="color:#ef4444; font-weight:bold; margin-bottom:10px;">extrato financeiro não disponível</div>
                    <div>${error.message}</div>
                </div>
                <div class="modal-custom-footer">
                    <button class="btn-modal-cancel">Fechar</button>
                </div>
            </div>
        `;
        modal.querySelector(".modal-custom-overlay").onclick = () => modal.remove();
        modal.querySelector(".btn-modal-cancel").onclick = () => modal.remove();
        document.body.appendChild(modal);
    }
}

// ==============================
// ✅ GESTÃO DE STATUS OTIMIZADA
// ==============================
async function toggleStatusParticipante(timeId, estaAtivo, btnElement) {
    if (operacaoEmAndamento) {
        console.log("[STATUS] Operação em andamento, aguarde...");
        return;
    }
    operacaoEmAndamento = true;

    try {
        const confirmado = await mostrarModal({
            titulo: estaAtivo
                ? "Inativar Participante"
                : "Reativar Participante",
            mensagem: `Confirma ${estaAtivo ? "inativação" : "reativação"} deste participante?`,
            btnConfirmar: estaAtivo ? "Inativar" : "Reativar",
        });

        if (!confirmado) {
            operacaoEmAndamento = false;
            return;
        }

        let endpoint, body;

        if (estaAtivo) {
            const rodadaDesistencia = await mostrarModal({
                titulo: "Rodada de Desistência",
                mensagem: "Em qual rodada o participante desistiu?",
                input: {
                    label: "Número da rodada (1-38)",
                    type: "number",
                    placeholder: "Ex: 15",
                    min: 1,
                    max: 38,
                },
                btnConfirmar: "Confirmar",
            });

            if (!rodadaDesistencia) {
                operacaoEmAndamento = false;
                return;
            }

            const rodada = parseInt(rodadaDesistencia);
            if (isNaN(rodada) || rodada < 1 || rodada > 38) {
                mostrarToast(
                    "Rodada inválida! Deve ser entre 1 e 38.",
                    "error",
                );
                operacaoEmAndamento = false;
                return;
            }

            endpoint = `/api/time/${timeId}/inativar`;
            body = { rodada_desistencia: rodada };
        } else {
            endpoint = `/api/time/${timeId}/reativar`;
            body = {};
        }

        // Feedback visual
        const textoOriginal = btnElement.innerHTML;
        btnElement.innerHTML = '<span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">hourglass_empty</span>...';
        btnElement.disabled = true;

        const response = await fetch(endpoint, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || "Erro ao alterar status");
        }

        // ✅ ATUALIZAÇÃO PARCIAL
        atualizarCardStatus(timeId, !estaAtivo, body.rodada_desistencia);

        mostrarToast(data.mensagem || "Status atualizado!", "success");
    } catch (error) {
        console.error("Erro ao alterar status:", error);
        mostrarToast(`Erro: ${error.message}`, "error");
    } finally {
        operacaoEmAndamento = false;
    }
}

// ✅ ATUALIZAÇÃO PARCIAL DO CARD
function atualizarCardStatus(timeId, novoAtivo, rodadaDesistencia) {
    const card = document.getElementById(`card-time-${timeId}`);
    if (!card) {
        carregarParticipantesComBrasoes();
        return;
    }

    if (novoAtivo) {
        card.classList.remove("card-inativo");
    } else {
        card.classList.add("card-inativo");
    }

    const avatar = card.querySelector(".participante-avatar");
    if (avatar) avatar.textContent = novoAtivo ? "person" : "pause_circle";

    const statusDiv = card.querySelector(".participante-status");
    if (statusDiv) {
        statusDiv.className = `participante-status ${novoAtivo ? "status-ativo" : "status-inativo"}`;
        statusDiv.innerHTML = `
            <span class="status-indicator"></span>
            ${novoAtivo ? "Ativo" : `Inativo R${rodadaDesistencia || "?"}`}
        `;
    }

    const btnStatus = card.querySelector("[data-action='toggle-status']");
    if (btnStatus) {
        btnStatus.dataset.ativo = novoAtivo;
        btnStatus.innerHTML = novoAtivo
            ? '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">pause_circle</span> Inativar'
            : '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">play_circle</span> Reativar';
        btnStatus.title = novoAtivo
            ? "Inativar participante"
            : "Reativar participante";
        btnStatus.disabled = false;
    }

    card.setAttribute("data-ativo", novoAtivo);
    console.log(
        `[STATUS] Card ${timeId} atualizado: ${novoAtivo ? "Ativo" : "Inativo"}`,
    );
}

// ==============================
// FUNÇÕES DE BUSCA E FILTRO
// ==============================
export function filtrarParticipantes(termo) {
    const cards = document.querySelectorAll(".participante-card");
    const termoLower = termo.toLowerCase().trim();

    cards.forEach((card) => {
        const nome = card.getAttribute("data-nome") || "";
        const time = card.getAttribute("data-time") || "";
        const clube = card.getAttribute("data-clube") || "";

        const match =
            nome.includes(termoLower) ||
            time.includes(termoLower) ||
            clube.includes(termoLower);
        card.style.display = match ? "" : "none";
    });
}

// ==============================
// COMPATIBILIDADE LEGADA
// ==============================
export async function carregarParticipantes() {
    await carregarParticipantesComBrasoes();
}

export function toggleParticipants() {
    const container = document.getElementById("timesContainer");
    const button = document.querySelector(".toggle-participants");
    if (container && container.classList.contains("visible")) {
        container.classList.remove("visible");
        if (button) button.textContent = "Exibir Participantes";
    } else if (container) {
        container.classList.add("visible");
        if (button) button.textContent = "Ocultar Participantes";
    }
}

export function fecharModal() {
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";
}

// ==============================
// GERENCIAMENTO DE SENHAS
// ==============================
async function gerenciarSenhaParticipante(timeId, nomeCartoleiro) {
    try {
        const response = await fetch(`/api/time/${timeId}`);
        if (!response.ok) throw new Error("Erro ao buscar dados");

        const participante = await response.json();
        const temSenha =
            participante.senha_acesso && participante.senha_acesso.length > 0;

        const modal = document.createElement("div");
        modal.className = "modal-senha";
        modal.innerHTML = `
            <div class="modal-senha-content">
                <div class="modal-senha-header">
                    <h3><span class="material-symbols-outlined" style="vertical-align:middle">key</span> Gerenciar Senha - ${nomeCartoleiro}</h3>
                    <button class="modal-senha-close" onclick="this.closest('.modal-senha').remove()">×</button>
                </div>

                <div class="senha-status ${temSenha ? "configurada" : "nao-configurada"}">
                    <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">${temSenha ? "check_circle" : "warning"}</span>
                    ${temSenha ? " Senha configurada" : " Senha não configurada"}
                </div>

                <div class="senha-info">
                    <p><strong>ID do Time:</strong> ${timeId}</p>
                    <p>Configure uma senha para permitir acesso ao extrato financeiro.</p>
                </div>

                <div class="senha-field">
                    <label>Nova Senha:</label>
                    <div class="senha-input-group">
                        <input type="text" 
                               id="novaSenha" 
                               placeholder="Digite ou gere uma senha"
                               value="${temSenha ? participante.senha_acesso : ""}"
                               maxlength="20">
                        <button class="btn-gerar-senha" onclick="window.gerarSenhaAleatoria()">
                            🎲 Gerar
                        </button>
                    </div>
                    <small style="color: var(--text-muted); display: block; margin-top: 5px;">
                        Mínimo 4 caracteres.
                    </small>
                </div>

                <div class="senha-actions">
                    <button class="btn-modal btn-modal-cancelar" onclick="this.closest('.modal-senha').remove()">
                        Cancelar
                    </button>
                    <button class="btn-modal btn-modal-salvar" onclick="window.salvarSenhaParticipante(${timeId})">
                        💾 Salvar
                    </button>
                </div>
            </div>
        `;

        modal.addEventListener("keydown", (e) => {
            if (e.key === "Escape") modal.remove();
        });

        document.body.appendChild(modal);

        setTimeout(() => document.getElementById("novaSenha")?.focus(), 100);
    } catch (error) {
        console.error("Erro ao abrir modal de senha:", error);
        mostrarToast(`Erro: ${error.message}`, "error");
    }
}

function gerarSenhaAleatoria() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let senha = "";
    for (let i = 0; i < 8; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const input = document.getElementById("novaSenha");
    if (input) {
        input.value = senha;
        input.select();
    }
}

async function salvarSenhaParticipante(timeId) {
    const novaSenha = document.getElementById("novaSenha")?.value.trim();

    if (!novaSenha || novaSenha.length < 4) {
        mostrarToast("A senha deve ter no mínimo 4 caracteres!", "error");
        return;
    }

    try {
        const response = await fetch(`/api/time/${timeId}/senha`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ senha: novaSenha }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || "Erro ao salvar senha");
        }

        mostrarToast(`Senha configurada! ID: ${timeId}`, "success");
        document.querySelector(".modal-senha")?.remove();
    } catch (error) {
        console.error("Erro ao salvar senha:", error);
        mostrarToast(`Erro: ${error.message}`, "error");
    }
}

// ==============================
// 📦 DATA LAKE - DADOS GLOBO
// ==============================

// ==============================
// 🎨 JSON VIEWER INTERATIVO
// ==============================

/**
 * Configuração de formatação inteligente
 */
const JsonViewerConfig = {
    // Campos que são valores monetários (Cartoletas)
    camposMonetarios: ['patrimonio', 'valor_time', 'preco', 'variacao', 'media', 'pontos', 'pontos_num', 'cartoletas', 'saldo'],
    // Campos que são URLs de imagens
    camposImagem: ['foto', 'foto_perfil', 'url_escudo_png', 'url_escudo_svg', 'escudo'],
    // Campos que são datas
    camposData: ['data', 'created_at', 'updated_at', 'ultima_atualizacao'],
    // Campos importantes para destacar
    camposDestaque: ['nome', 'nome_cartola', 'time_id', 'rodada_atual', 'pontos', 'patrimonio'],
    // Ícones por tipo de dado
    icones: {
        object: 'data_object',
        array: 'lists',
        string: 'text_fields',
        number: 'tag',
        boolean: 'toggle_on',
        null: 'block',
        image: 'image',
        money: 'paid',
        date: 'schedule'
    }
};

/**
 * Formata valor baseado no tipo e nome do campo
 */
function formatarValorJson(valor, chave = '') {
    if (valor === null) return '<span class="jv-null">null</span>';
    if (valor === undefined) return '<span class="jv-null">undefined</span>';

    const chaveLower = chave.toLowerCase();

    // Booleano
    if (typeof valor === 'boolean') {
        return `<span class="jv-boolean jv-bool-${valor}">${valor ? '✓ Sim' : '✗ Não'}</span>`;
    }

    // Número
    if (typeof valor === 'number') {
        // Monetário (Cartoletas)
        if (JsonViewerConfig.camposMonetarios.some(c => chaveLower.includes(c))) {
            return `<span class="jv-money">C$ ${valor.toFixed(2)}</span>`;
        }
        // Porcentagem
        if (chaveLower.includes('percent') || chaveLower.includes('variacao')) {
            const sinal = valor >= 0 ? '+' : '';
            const classe = valor >= 0 ? 'jv-positive' : 'jv-negative';
            return `<span class="${classe}">${sinal}${valor.toFixed(2)}%</span>`;
        }
        return `<span class="jv-number">${valor.toLocaleString('pt-BR')}</span>`;
    }

    // String
    if (typeof valor === 'string') {
        // URL de imagem
        if (JsonViewerConfig.camposImagem.some(c => chaveLower.includes(c)) ||
            valor.match(/\.(png|jpg|jpeg|svg|gif)$/i) ||
            valor.includes('s.glbimg.com')) {
            return `<span class="jv-image-preview">
                <img src="${valor}" alt="Preview" onerror="this.style.display='none'" />
                <span class="jv-image-url">${valor.length > 40 ? valor.substring(0, 40) + '...' : valor}</span>
            </span>`;
        }
        // Data ISO
        if (valor.match(/^\d{4}-\d{2}-\d{2}/) || JsonViewerConfig.camposData.some(c => chaveLower.includes(c))) {
            try {
                const date = new Date(valor);
                if (!isNaN(date)) {
                    return `<span class="jv-date">${date.toLocaleString('pt-BR')}</span>`;
                }
            } catch {}
        }
        // String vazia
        if (valor === '') return '<span class="jv-empty">(vazio)</span>';
        // String longa
        if (valor.length > 100) {
            return `<span class="jv-string jv-string-long" title="${valor.replace(/"/g, '&quot;')}">"${valor.substring(0, 100)}..."</span>`;
        }
        return `<span class="jv-string">"${valor}"</span>`;
    }

    return String(valor);
}

/**
 * Renderiza um objeto como seção colapsável
 */
function renderizarObjetoJson(obj, nivel = 0, chaveParent = '') {
    if (!obj || typeof obj !== 'object') return formatarValorJson(obj, chaveParent);

    const isArray = Array.isArray(obj);
    const entries = isArray ? obj.map((v, i) => [i, v]) : Object.entries(obj);

    if (entries.length === 0) {
        return `<span class="jv-empty">${isArray ? '[]' : '{}'}</span>`;
    }

    // Array de atletas - renderização especial como cards
    if (isArray && entries.length > 0 && entries[0][1]?.apelido) {
        return renderizarAtletasCards(obj);
    }

    // Array simples de primitivos
    if (isArray && entries.every(([_, v]) => typeof v !== 'object' || v === null)) {
        return `<span class="jv-array-inline">[${entries.map(([_, v]) => formatarValorJson(v)).join(', ')}]</span>`;
    }

    const linhas = entries.map(([chave, valor]) => {
        const isObjeto = valor !== null && typeof valor === 'object';
        const isDestaque = JsonViewerConfig.camposDestaque.includes(chave);
        const tipoIcone = getTipoIcone(valor, chave);

        if (isObjeto) {
            const subEntries = Array.isArray(valor) ? valor : Object.entries(valor);
            const count = Array.isArray(valor) ? valor.length : Object.keys(valor).length;
            const tipoLabel = Array.isArray(valor) ? `${count} itens` : `${count} campos`;

            return `
                <div class="jv-row jv-collapsible ${nivel === 0 ? 'jv-expanded' : ''}" data-nivel="${nivel}">
                    <div class="jv-row-header" onclick="this.parentElement.classList.toggle('jv-expanded')">
                        <span class="jv-expand-icon material-symbols-outlined">chevron_right</span>
                        <span class="jv-key ${isDestaque ? 'jv-key-destaque' : ''}">${chave}</span>
                        <span class="jv-type-badge jv-type-${Array.isArray(valor) ? 'array' : 'object'}">
                            <span class="material-symbols-outlined">${tipoIcone}</span>
                            ${tipoLabel}
                        </span>
                    </div>
                    <div class="jv-row-content">
                        ${renderizarObjetoJson(valor, nivel + 1, chave)}
                    </div>
                </div>
            `;
        }

        return `
            <div class="jv-row jv-leaf" data-nivel="${nivel}">
                <span class="jv-icon material-symbols-outlined">${tipoIcone}</span>
                <span class="jv-key ${isDestaque ? 'jv-key-destaque' : ''}">${chave}</span>
                <span class="jv-separator">:</span>
                <span class="jv-value">${formatarValorJson(valor, chave)}</span>
            </div>
        `;
    });

    return `<div class="jv-object" data-nivel="${nivel}">${linhas.join('')}</div>`;
}

/**
 * Renderiza array de atletas como cards visuais
 */
function renderizarAtletasCards(atletas) {
    if (!atletas || atletas.length === 0) return '<span class="jv-empty">Nenhum atleta</span>';

    const cards = atletas.slice(0, 18).map((atleta, idx) => {
        const posicaoClasse = getPosicaoClasse(atleta.posicao_id);
        const pontosClasse = atleta.pontos_num > 0 ? 'positivo' : atleta.pontos_num < 0 ? 'negativo' : '';

        return `
            <div class="jv-atleta-card ${posicaoClasse}">
                <div class="jv-atleta-foto">
                    <img src="${atleta.foto || '/escudos/placeholder.png'}"
                         alt="${atleta.apelido}"
                         onerror="this.src='/escudos/placeholder.png'" />
                    ${atleta.capitao ? '<span class="jv-capitao">C</span>' : ''}
                </div>
                <div class="jv-atleta-info">
                    <span class="jv-atleta-nome" title="${atleta.apelido}">${atleta.apelido || 'N/D'}</span>
                    <span class="jv-atleta-clube">${atleta.clube?.nome || ''}</span>
                </div>
                <div class="jv-atleta-stats">
                    <span class="jv-atleta-pontos ${pontosClasse}">${atleta.pontos_num?.toFixed(1) || '-'}</span>
                    <span class="jv-atleta-preco">C$ ${atleta.preco_num?.toFixed(1) || '-'}</span>
                </div>
            </div>
        `;
    }).join('');

    const restantes = atletas.length > 18 ? `<div class="jv-atletas-mais">+${atletas.length - 18} atletas</div>` : '';

    return `
        <div class="jv-atletas-grid">
            ${cards}
            ${restantes}
        </div>
    `;
}

/**
 * Retorna classe CSS baseada na posição do atleta
 */
function getPosicaoClasse(posicaoId) {
    const posicoes = {
        1: 'goleiro',
        2: 'lateral',
        3: 'zagueiro',
        4: 'meia',
        5: 'atacante',
        6: 'tecnico'
    };
    return posicoes[posicaoId] || '';
}

/**
 * Retorna ícone baseado no tipo do valor
 */
function getTipoIcone(valor, chave = '') {
    if (valor === null) return JsonViewerConfig.icones.null;
    if (Array.isArray(valor)) return JsonViewerConfig.icones.array;
    if (typeof valor === 'object') return JsonViewerConfig.icones.object;
    if (typeof valor === 'boolean') return JsonViewerConfig.icones.boolean;
    if (typeof valor === 'number') {
        if (JsonViewerConfig.camposMonetarios.some(c => chave.toLowerCase().includes(c))) {
            return JsonViewerConfig.icones.money;
        }
        return JsonViewerConfig.icones.number;
    }
    if (typeof valor === 'string') {
        if (JsonViewerConfig.camposImagem.some(c => chave.toLowerCase().includes(c))) {
            return JsonViewerConfig.icones.image;
        }
        return JsonViewerConfig.icones.string;
    }
    return 'help';
}

/**
 * Renderiza o JSON Viewer completo
 */
function renderizarJsonViewer(json) {
    if (!json) return '<div class="jv-empty-state">Sem dados</div>';

    const stats = contarEstatisticas(json);

    return `
        <div class="json-viewer-container">
            <div class="jv-toolbar">
                <div class="jv-stats">
                    <span class="jv-stat"><span class="material-symbols-outlined">data_object</span> ${stats.objetos} objetos</span>
                    <span class="jv-stat"><span class="material-symbols-outlined">lists</span> ${stats.arrays} arrays</span>
                    <span class="jv-stat"><span class="material-symbols-outlined">tag</span> ${stats.campos} campos</span>
                </div>
                <div class="jv-actions">
                    <button class="jv-btn" onclick="expandirTudo()" title="Expandir tudo">
                        <span class="material-symbols-outlined">unfold_more</span>
                    </button>
                    <button class="jv-btn" onclick="recolherTudo()" title="Recolher tudo">
                        <span class="material-symbols-outlined">unfold_less</span>
                    </button>
                    <button class="jv-btn" onclick="toggleModoRaw()" title="Ver JSON bruto">
                        <span class="material-symbols-outlined">code</span>
                    </button>
                    <button class="jv-btn jv-btn-primary" onclick="window.copiarJsonGlobo()">
                        <span class="material-symbols-outlined">content_copy</span> Copiar
                    </button>
                </div>
            </div>
            <div class="jv-content" id="jv-content-formatted">
                ${renderizarObjetoJson(json)}
            </div>
            <pre class="jv-content-raw" id="jv-content-raw" style="display:none">${JSON.stringify(json, null, 2)}</pre>
            <div id="json-viewer-content" style="display:none">${JSON.stringify(json, null, 2)}</div>
        </div>
    `;
}

/**
 * Conta estatísticas do JSON
 */
function contarEstatisticas(obj, stats = { objetos: 0, arrays: 0, campos: 0 }) {
    if (Array.isArray(obj)) {
        stats.arrays++;
        obj.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                contarEstatisticas(item, stats);
            }
        });
    } else if (typeof obj === 'object' && obj !== null) {
        stats.objetos++;
        Object.entries(obj).forEach(([key, value]) => {
            stats.campos++;
            if (typeof value === 'object' && value !== null) {
                contarEstatisticas(value, stats);
            }
        });
    }
    return stats;
}

/**
 * Expande todas as seções
 */
window.expandirTudo = function() {
    document.querySelectorAll('.jv-collapsible').forEach(el => el.classList.add('jv-expanded'));
};

/**
 * Recolhe todas as seções
 */
window.recolherTudo = function() {
    document.querySelectorAll('.jv-collapsible').forEach(el => el.classList.remove('jv-expanded'));
};

/**
 * Alterna entre visualização formatada e JSON bruto
 */
window.toggleModoRaw = function() {
    const formatted = document.getElementById('jv-content-formatted');
    const raw = document.getElementById('jv-content-raw');
    if (formatted && raw) {
        const showRaw = formatted.style.display !== 'none';
        formatted.style.display = showRaw ? 'none' : 'block';
        raw.style.display = showRaw ? 'block' : 'none';
    }
};

/**
 * ✅ v2.2: Abre modal com dados da API Cartola (adaptado para pré-temporada)
 */
async function verDadosApiCartola(timeId, nomeCartoleiro, nomeTime, btnElement) {
    // Feedback visual no botão
    const textoOriginal = btnElement.innerHTML;
    btnElement.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;animation:spin 1s linear infinite">sync</span>';
    btnElement.disabled = true;

    try {
        const temporada = temporadaSelecionada || new Date().getFullYear();
        const anoAtual = new Date().getFullYear();
        const isPreTemporada = temporada >= anoAtual; // 2026 é pré-temporada enquanto API retorna 2025

        let data;

        if (isPreTemporada) {
            // Pré-temporada: buscar dados COMPLETOS da API Cartola + dados locais
            console.log(`[API-CARTOLA] Buscando dados completos para time ${timeId} (pré-temporada ${temporada})`);
            const response = await fetch(`/api/cartola/time/${timeId}/completo`);
            const apiData = await response.json();

            if (!apiData.success) {
                throw new Error(apiData.erro || "Erro ao buscar dados");
            }

            // Adaptar formato para o modal com dados locais incluídos
            data = {
                success: true,
                preTemporada: true,
                temporada: temporada,
                dump_atual: {
                    raw_json: apiData.dados_api,
                    rodada: 0
                },
                dados_local: apiData.dados_local,
                rodadas_disponiveis: [],
                historico: []
            };
        } else {
            // Temporada histórica: buscar do Data Lake
            console.log(`[API-CARTOLA] Buscando histórico do Data Lake para time ${timeId} (temporada ${temporada})`);
            const response = await fetch(`/api/data-lake/raw/${timeId}?historico=true&limit=50&temporada=${temporada}`);
            data = await response.json();
        }

        // Criar modal
        const modal = criarModalApiCartola(timeId, nomeCartoleiro, nomeTime, data);
        document.body.appendChild(modal);

        // Animar entrada
        requestAnimationFrame(() => modal.classList.add("modal-visible"));

    } catch (error) {
        console.error("[API-CARTOLA] Erro ao buscar dados:", error);
        mostrarToast(`Erro ao buscar dados: ${error.message}`, "error");
    } finally {
        btnElement.innerHTML = textoOriginal;
        btnElement.disabled = false;
    }
}

// Manter compatibilidade com código antigo
async function verDadosGlobo(timeId, nomeCartoleiro, nomeTime, btnElement) {
    return verDadosApiCartola(timeId, nomeCartoleiro, nomeTime, btnElement);
}

/**
 * Carrega dados de uma rodada específica no modal
 */
async function carregarRodadaEspecifica(timeId, rodada) {
    const contentArea = document.getElementById('modal-content-area');
    if (!contentArea) return;

    // Obter rodadas disponíveis dos botões existentes
    const rodadasDisponiveis = Array.from(document.querySelectorAll('.rodada-btn'))
        .map(btn => parseInt(btn.dataset.rodada))
        .sort((a, b) => a - b);

    // Mostrar loading
    contentArea.innerHTML = `
        <div class="loading-rodada">
            <span class="material-symbols-outlined" style="animation:spin 1s linear infinite;font-size:32px">sync</span>
            <p>Carregando rodada ${rodada}...</p>
        </div>
    `;

    try {
        // Temporada 2025 (histórico) - TODO: tornar dinâmico via seletor de temporada
        const response = await fetch(`/api/data-lake/raw/${timeId}?rodada=${rodada}&historico=false&temporada=2025`);
        const data = await response.json();

        if (!data.success) {
            contentArea.innerHTML = `
                <div class="erro-rodada">
                    <span class="material-symbols-outlined" style="font-size:48px;color:#ef4444">error</span>
                    <p>Dados não encontrados para rodada ${rodada}</p>
                </div>
            `;
            return;
        }

        const rawJson = data.dump_atual?.raw_json;
        const verificacao = verificarDadosValidos(rawJson);

        // Atualizar conteúdo com os dados da rodada (incluindo navegação)
        contentArea.innerHTML = renderizarConteudoRodada(rawJson, verificacao, rodada, timeId, rodadasDisponiveis);

        // Atualizar indicador de rodada selecionada
        document.querySelectorAll('.rodada-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.rodada) === rodada);
        });

    } catch (error) {
        console.error('[DATA-LAKE] Erro ao carregar rodada:', error);
        contentArea.innerHTML = `
            <div class="erro-rodada">
                <span class="material-icons" style="font-size:48px;color:#ef4444">wifi_off</span>
                <p>Erro ao carregar rodada: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * Renderiza o conteúdo de uma rodada específica
 */
function renderizarConteudoRodada(rawJson, verificacao, rodada, timeId = null, rodadasDisponiveis = []) {
    // Calcular rodadas anterior e próxima
    const idx = rodadasDisponiveis.indexOf(rodada);
    const rodadaAnterior = idx > 0 ? rodadasDisponiveis[idx - 1] : null;
    const rodadaProxima = idx < rodadasDisponiveis.length - 1 ? rodadasDisponiveis[idx + 1] : null;

    // Botões de navegação
    const botoesNavegacao = timeId ? `
        <div class="rodada-navegacao-btns">
            <button class="nav-rodada-btn ${!rodadaAnterior ? 'disabled' : ''}"
                    ${rodadaAnterior ? `onclick="window.carregarRodadaEspecifica(${timeId}, ${rodadaAnterior})"` : 'disabled'}>
                <span class="material-symbols-outlined">chevron_left</span>
                <span class="nav-label">Anterior${rodadaAnterior ? ` (R${rodadaAnterior})` : ''}</span>
            </button>
            <div class="nav-rodada-atual">
                <span class="material-symbols-outlined">sports_soccer</span>
                Rodada ${rodada}
            </div>
            <button class="nav-rodada-btn ${!rodadaProxima ? 'disabled' : ''}"
                    ${rodadaProxima ? `onclick="window.carregarRodadaEspecifica(${timeId}, ${rodadaProxima})"` : 'disabled'}>
                <span class="nav-label">Próxima${rodadaProxima ? ` (R${rodadaProxima})` : ''}</span>
                <span class="material-symbols-outlined">chevron_right</span>
            </button>
        </div>
    ` : '';

    if (!rawJson || !verificacao.valido) {
        return `
            ${botoesNavegacao}
            <div class="dados-invalidos-aviso">
                <span class="material-symbols-outlined" style="font-size:48px">warning</span>
                <h4>Dados não disponíveis para rodada ${rodada}</h4>
            </div>
        `;
    }

    const time = rawJson.time || rawJson;
    const pontos = rawJson.pontos;

    return `
        <div class="rodada-content">
            ${botoesNavegacao}

            <div class="rodada-header-info">
                <div class="rodada-pontos">
                    <span class="pontos-label">Pontuação</span>
                    <span class="pontos-valor">${pontos?.toFixed(2) || 'N/D'}</span>
                </div>
                <div class="rodada-meta">
                    <span><span class="material-symbols-outlined">person</span> ${time.nome_cartola || time.nome || 'N/D'}</span>
                    <span><span class="material-symbols-outlined">shield</span> ${time.nome || 'N/D'}</span>
                </div>
            </div>

            <div class="rodada-json-section">
                <h4><span class="material-symbols-outlined">code</span> JSON Completo</h4>
                ${renderizarJsonViewer(rawJson)}
            </div>
        </div>
    `;
}

/**
 * Volta para a aba Resumo
 */
function voltarParaResumo() {
    const modal = document.querySelector('.modal-dados-globo');
    if (!modal) return;

    // Ativar tab Resumo
    modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    modal.querySelector('[data-tab="resumo"]')?.classList.add('active');

    // Mostrar conteúdo Resumo
    modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    modal.querySelector('[data-tab-content="resumo"]')?.classList.add('active');
}

// Exportar para uso global
window.carregarRodadaEspecifica = carregarRodadaEspecifica;
window.voltarParaResumo = voltarParaResumo;

/**
 * Verifica se um dump contém dados reais do participante
 * ou apenas metadados da temporada (game_over)
 */
function verificarDadosValidos(rawJson) {
    if (!rawJson) return { valido: false, motivo: 'sem_dados' };

    // Campos que indicam dados reais do participante
    const temTime = rawJson.time && (rawJson.time.nome || rawJson.time.time_id);
    const temAtletas = Array.isArray(rawJson.atletas) && rawJson.atletas.length > 0;
    const temPatrimonio = typeof rawJson.patrimonio === 'number';
    const temPontos = typeof rawJson.pontos === 'number' || typeof rawJson.pontos_campeonato === 'number';

    // Se tem game_over e não tem dados do participante = inválido
    if (rawJson.game_over === true && !temTime && !temAtletas && !temPatrimonio) {
        return {
            valido: false,
            motivo: 'temporada_encerrada',
            gameOver: true,
            temporada: rawJson.temporada || 2025,
            rodadaAtual: rawJson.rodada_atual || 38
        };
    }

    // Verifica se tem pelo menos algum dado útil
    const temDadosUteis = temTime || temAtletas || temPatrimonio || temPontos;

    return {
        valido: temDadosUteis,
        motivo: temDadosUteis ? 'ok' : 'dados_incompletos',
        temTime,
        temAtletas,
        temPatrimonio,
        temPontos
    };
}

/**
 * ✅ v3.0: Cria modal COMPLETO de dados da API Cartola
 * - Exibe TODOS os dados disponíveis da API Globo
 * - Botão Refresh para atualizar dados
 * - Botão Salvar para persistir no banco
 * - Indicador de última sincronização
 */
function criarModalApiCartola(timeId, nomeCartoleiro, nomeTime, data) {
    // Remover modal existente
    document.querySelector(".modal-dados-globo")?.remove();

    const modal = document.createElement("div");
    modal.className = "modal-dados-globo";

    const isPreTemporada = data.preTemporada === true;
    const temporada = data.temporada || temporadaSelecionada || new Date().getFullYear();
    const temDados = data.success && data.dump_atual;
    const rawJson = temDados ? data.dump_atual.raw_json : null;

    // Se não é pré-temporada, usar modal histórico
    if (!isPreTemporada) {
        return criarModalDadosGlobo(timeId, nomeCartoleiro, nomeTime, data);
    }

    // Extrair dados do time
    const time = rawJson?.time || rawJson || {};
    const patrimonio = time.patrimonio ?? rawJson?.patrimonio;
    const pontosCampeonato = time.pontos_campeonato ?? rawJson?.pontos_campeonato ?? 0;

    // Dados do clube do coração
    // ✅ v3.1: Fallback para clube_id quando objeto clube não vier completo da API
    const clubeObj = time.clube || {};
    const clubeIdFallback = clubeObj.id || time.clube_id || null;
    const clube = {
        id: clubeIdFallback,
        nome: clubeObj.nome || (clubeIdFallback ? BrasoesHelper.getNomeClube(clubeIdFallback) : null),
        abreviacao: clubeObj.abreviacao || null,
        escudos: clubeObj.escudos || null
    };
    const clubeEscudo = clube.escudos?.["60x60"] || clube.escudos?.["45x45"] || "";

    // Última sincronização (do banco local, se disponível)
    const ultimaSync = data.dados_local?.ultima_sincronizacao;
    const ultimaSyncFormatada = ultimaSync
        ? new Date(ultimaSync).toLocaleString("pt-BR")
        : "Nunca sincronizado";

    modal.innerHTML = `
        <div class="modal-dados-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-dados-content modal-api-cartola-completo">
            <div class="modal-dados-header">
                <div class="header-info">
                    <h3>
                        <span class="material-symbols-outlined" style="color:#FF5500">cloud_sync</span>
                        API Cartola
                    </h3>
                    <span class="header-subtitle">Temporada ${temporada} • ID: ${timeId}</span>
                </div>
                <div class="header-actions">
                    <button class="btn-refresh-api" id="btn-refresh-api" title="Atualizar dados da API">
                        <span class="material-symbols-outlined">refresh</span>
                    </button>
                    <button class="btn-fechar" onclick="this.closest('.modal-dados-globo').remove()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            <div class="modal-dados-body">
                <!-- Banner Pré-Temporada -->
                <div class="pre-temporada-banner">
                    <span class="material-symbols-outlined">schedule</span>
                    <div>
                        <strong>Pré-Temporada ${temporada}</strong>
                        <p>Dados cadastrais do participante na API Globo</p>
                    </div>
                </div>

                <!-- Última Sincronização -->
                <div class="sync-status-bar" id="sync-status-bar">
                    <span class="material-symbols-outlined">update</span>
                    <span>Última sincronização: <strong id="ultima-sync-label">${ultimaSyncFormatada}</strong></span>
                </div>

                <!-- Seção: Dados do Time -->
                <div class="api-section">
                    <div class="api-section-header">
                        <span class="material-symbols-outlined">sports_soccer</span>
                        <h4>Dados do Time</h4>
                    </div>
                    <div class="api-grid">
                        <div class="api-card api-card-escudo">
                            ${time.url_escudo_png || time.url_escudo_svg ? `
                                <img src="${time.url_escudo_png || time.url_escudo_svg}"
                                     alt="Escudo do Time"
                                     class="escudo-grande"
                                     onerror="this.src='/escudos/default.png'">
                            ` : `
                                <div class="escudo-placeholder">
                                    <span class="material-symbols-outlined">shield</span>
                                </div>
                            `}
                            <span class="api-card-label">Escudo</span>
                        </div>
                        <div class="api-card">
                            <span class="api-card-value">${time.nome || nomeTime || "N/D"}</span>
                            <span class="api-card-label">Nome do Time</span>
                        </div>
                        <div class="api-card">
                            <span class="api-card-value">${time.nome_cartola || nomeCartoleiro || "N/D"}</span>
                            <span class="api-card-label">Cartoleiro</span>
                        </div>
                        <div class="api-card">
                            <span class="api-card-value">${time.time_id || timeId}</span>
                            <span class="api-card-label">ID Cartola</span>
                        </div>
                        <div class="api-card">
                            <span class="api-card-value">${time.slug || "N/D"}</span>
                            <span class="api-card-label">Slug</span>
                        </div>
                        <div class="api-card">
                            <span class="api-card-value ${time.assinante ? 'valor-positivo' : ''}">${time.assinante ? "PRO" : "Free"}</span>
                            <span class="api-card-label">Assinatura</span>
                        </div>
                    </div>
                </div>

                <!-- Seção: Dados Financeiros -->
                <div class="api-section">
                    <div class="api-section-header">
                        <span class="material-symbols-outlined">account_balance</span>
                        <h4>Patrimônio e Pontuação</h4>
                    </div>
                    <div class="api-grid api-grid-2">
                        <div class="api-card api-card-destaque">
                            <span class="api-card-value">C$ ${patrimonio !== undefined ? patrimonio.toFixed(2) : "N/D"}</span>
                            <span class="api-card-label">Patrimônio</span>
                        </div>
                        <div class="api-card ${pontosCampeonato > 0 ? 'api-card-destaque' : ''}">
                            <span class="api-card-value">${pontosCampeonato > 0 ? pontosCampeonato.toFixed(2) : "0.00"}</span>
                            <span class="api-card-label">Pontos Campeonato</span>
                        </div>
                    </div>
                </div>

                <!-- Seção: Clube do Coração -->
                <div class="api-section">
                    <div class="api-section-header">
                        <span class="material-symbols-outlined">favorite</span>
                        <h4>Clube do Coração</h4>
                    </div>
                    ${clube.id ? `
                    <div class="api-grid api-grid-clube">
                        <div class="api-card api-card-escudo-clube">
                            <img src="/escudos/${clube.id}.png"
                                 alt="${clube.nome || 'Clube'}"
                                 class="escudo-clube"
                                 onerror="this.onerror=null; this.src='${clubeEscudo || '/escudos/default.png'}'">
                        </div>
                        <div class="api-card">
                            <span class="api-card-value">${clube.nome || "N/D"}</span>
                            <span class="api-card-label">Nome</span>
                        </div>
                        <div class="api-card">
                            <span class="api-card-value">${clube.abreviacao || "N/D"}</span>
                            <span class="api-card-label">Abreviação</span>
                        </div>
                        <div class="api-card">
                            <span class="api-card-value">${clube.id}</span>
                            <span class="api-card-label">ID Clube</span>
                        </div>
                    </div>
                    ` : `
                    <div class="api-grid api-grid-1">
                        <div class="api-card api-card-warning">
                            <span class="material-symbols-outlined" style="color: #f59e0b; font-size: 32px;">help</span>
                            <span class="api-card-label">Clube não definido na API</span>
                        </div>
                    </div>
                    `}
                </div>

                <!-- Seção: IDs e Metadados -->
                <div class="api-section api-section-meta">
                    <div class="api-section-header">
                        <span class="material-symbols-outlined">info</span>
                        <h4>Metadados</h4>
                    </div>
                    <div class="api-grid api-grid-4">
                        <div class="api-card api-card-mini">
                            <span class="api-card-value">${time.cadun_id || "N/D"}</span>
                            <span class="api-card-label">Cadun ID</span>
                        </div>
                        <div class="api-card api-card-mini">
                            <span class="api-card-value">${time.temporada_inicial || "N/D"}</span>
                            <span class="api-card-label">Temporada Inicial</span>
                        </div>
                        <div class="api-card api-card-mini">
                            <span class="api-card-value">${time.assinante ? "PRO" : "Free"}</span>
                            <span class="api-card-label">Tipo Conta</span>
                        </div>
                        <div class="api-card api-card-mini">
                            <span class="api-card-value">${time.cadastro_completo ? "Sim" : "Não"}</span>
                            <span class="api-card-label">Cadastro Completo</span>
                        </div>
                    </div>
                </div>

                <!-- Botões de Ação -->
                <div class="api-actions">
                    <button class="btn-salvar-dados" id="btn-salvar-dados">
                        <span class="material-symbols-outlined">save</span>
                        Salvar no Banco
                    </button>
                    <p class="api-actions-hint">Salva os dados atuais no cadastro do participante</p>
                </div>
            </div>
        </div>
    `;

    // Event Listeners
    const btnRefresh = modal.querySelector("#btn-refresh-api");
    const btnSalvar = modal.querySelector("#btn-salvar-dados");

    // Refresh: Busca novamente da API
    btnRefresh?.addEventListener("click", async () => {
        btnRefresh.disabled = true;
        btnRefresh.innerHTML = `<span class="material-symbols-outlined spin">sync</span>`;

        try {
            // Buscar dados atualizados
            const response = await fetch(`/api/cartola/time/${timeId}/completo`);
            const novosDados = await response.json();

            if (novosDados.success) {
                // Fechar modal atual e reabrir com novos dados
                modal.remove();
                const novoData = {
                    success: true,
                    preTemporada: true,
                    temporada: temporada,
                    dump_atual: {
                        raw_json: novosDados.dados_api,
                        rodada: 0
                    },
                    dados_local: novosDados.dados_local
                };
                const novoModal = criarModalApiCartola(timeId, nomeCartoleiro, nomeTime, novoData);
                document.body.appendChild(novoModal);
                requestAnimationFrame(() => novoModal.classList.add("modal-visible"));
                mostrarToast("Dados atualizados com sucesso!", "success");
            } else {
                throw new Error(novosDados.erro || "Erro ao atualizar");
            }
        } catch (error) {
            console.error("[API-CARTOLA] Erro no refresh:", error);
            mostrarToast(`Erro ao atualizar: ${error.message}`, "error");
            btnRefresh.disabled = false;
            btnRefresh.innerHTML = `<span class="material-symbols-outlined">refresh</span>`;
        }
    });

    // Salvar: Persiste no banco de dados e na liga
    btnSalvar?.addEventListener("click", async () => {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = `
            <span class="material-symbols-outlined spin">sync</span>
            Salvando...
        `;

        try {
            // Incluir ligaId para atualizar também o participante embedded na liga
            const syncUrl = `/api/cartola/time/${timeId}/sincronizar?salvar=true${ligaId ? `&ligaId=${ligaId}` : ""}`;
            const response = await fetch(syncUrl, {
                method: "POST"
            });
            const resultado = await response.json();

            if (resultado.success && resultado.salvo_no_banco) {
                // Atualizar label de última sincronização
                const syncLabel = modal.querySelector("#ultima-sync-label");
                if (syncLabel) {
                    syncLabel.textContent = new Date().toLocaleString("pt-BR");
                }

                // Adicionar classe de sucesso temporária
                const syncBar = modal.querySelector("#sync-status-bar");
                syncBar?.classList.add("sync-success");
                setTimeout(() => syncBar?.classList.remove("sync-success"), 3000);

                // Mensagem de sucesso com detalhes da atualização
                const msgInscricao = resultado.atualizado_inscricao ? " (inscrição 2026 atualizada)" : "";
                mostrarToast(`Dados salvos com sucesso${msgInscricao}!`, "success");

                // Recarregar lista de participantes para refletir mudanças
                if (typeof carregarParticipantes === "function") {
                    carregarParticipantes();
                }
            } else {
                throw new Error(resultado.mensagem || resultado.erro || "Erro ao salvar");
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
            mostrarToast(`Erro ao salvar: ${error.message}`, "error");
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = `
                <span class="material-symbols-outlined">save</span>
                Salvar no Banco
            `;
        }
    });

    // Fechar com ESC
    const handleEsc = (e) => {
        if (e.key === "Escape") {
            document.removeEventListener("keydown", handleEsc);
            modal.remove();
        }
    };
    document.addEventListener("keydown", handleEsc);

    return modal;
}

/**
 * Cria o modal de exibição dos dados da Globo (histórico)
 */
function criarModalDadosGlobo(timeId, nomeCartoleiro, nomeTime, data) {
    // Remover modal existente
    document.querySelector(".modal-dados-globo")?.remove();

    const modal = document.createElement("div");
    modal.className = "modal-dados-globo";

    const temDados = data.success && data.dump_atual;
    const rawJson = temDados ? data.dump_atual.raw_json : null;

    // Verificar se os dados são válidos (dados do participante vs metadados da temporada)
    const verificacao = verificarDadosValidos(rawJson);

    // Extrair dados principais se existirem
    let resumoDados = "";
    if (rawJson && verificacao.valido) {
        const time = rawJson.time || rawJson;
        const atletas = rawJson.atletas || [];
        const patrimonio = rawJson.patrimonio;
        // ⭐ Usar soma de todas as rodadas se disponível, senão usar pontos da rodada atual
        const pontosTotal = data.pontos_total_temporada || rawJson.pontos || rawJson.pontos_campeonato;
        const rodadasCount = data.rodadas_disponiveis?.length || 0;

        resumoDados = `
            <div class="dados-resumo">
                <div class="resumo-item">
                    <span class="resumo-icon material-symbols-outlined">person</span>
                    <div class="resumo-info">
                        <span class="resumo-label">Cartoleiro</span>
                        <span class="resumo-value">${time.nome_cartola || nomeCartoleiro}</span>
                    </div>
                </div>
                <div class="resumo-item">
                    <span class="resumo-icon material-symbols-outlined">sports_soccer</span>
                    <div class="resumo-info">
                        <span class="resumo-label">Time</span>
                        <span class="resumo-value">${time.nome || nomeTime}</span>
                    </div>
                </div>
                ${patrimonio !== undefined ? `
                <div class="resumo-item">
                    <span class="resumo-icon material-symbols-outlined">account_balance</span>
                    <div class="resumo-info">
                        <span class="resumo-label">Patrimônio</span>
                        <span class="resumo-value">C$ ${patrimonio.toFixed(2)}</span>
                    </div>
                </div>
                ` : ""}
                ${pontosTotal !== undefined ? `
                <div class="resumo-item resumo-item-destaque">
                    <span class="resumo-icon material-symbols-outlined">emoji_events</span>
                    <div class="resumo-info">
                        <span class="resumo-label">Pontos Total (${rodadasCount} rodadas)</span>
                        <span class="resumo-value">${pontosTotal.toFixed(2)}</span>
                    </div>
                </div>
                ` : ""}
                ${atletas.length > 0 ? `
                <div class="resumo-item">
                    <span class="resumo-icon material-symbols-outlined">group</span>
                    <div class="resumo-info">
                        <span class="resumo-label">Atletas</span>
                        <span class="resumo-value">${atletas.length} jogadores</span>
                    </div>
                </div>
                ` : ""}
            </div>

            ${atletas.length > 0 ? `
            <div class="dados-atletas">
                <h4><span class="material-symbols-outlined" style="vertical-align:middle">sports</span> Escalação</h4>
                <div class="atletas-grid">
                    ${atletas.slice(0, 12).map(a => `
                        <div class="atleta-card">
                            <img src="${a.foto || '/escudos/placeholder.png'}" alt="${a.apelido}" onerror="this.src='/escudos/placeholder.png'">
                            <span class="atleta-nome">${a.apelido || a.nome}</span>
                            <span class="atleta-pontos">${a.pontos_num?.toFixed(1) || '-'} pts</span>
                        </div>
                    `).join("")}
                </div>
            </div>
            ` : ""}
        `;
    } else if (rawJson && !verificacao.valido) {
        // Dados inválidos - apenas metadados da temporada
        resumoDados = `
            <div class="dados-invalidos-aviso">
                <div class="aviso-icone">
                    <span class="material-symbols-outlined">warning</span>
                </div>
                <h4>Dados Indisponíveis</h4>
                <p>
                    ${verificacao.motivo === 'temporada_encerrada'
                        ? `A <strong>Temporada ${verificacao.temporada}</strong> do Cartola FC está encerrada.
                           A API oficial não retorna mais dados de times individuais.`
                        : 'Os dados coletados estão incompletos ou corrompidos.'}
                </p>
                <div class="aviso-detalhes">
                    <span class="detalhe-item">
                        <span class="material-symbols-outlined">sports_soccer</span>
                        Rodada ${verificacao.rodadaAtual || 38}/38
                    </span>
                    <span class="detalhe-item">
                        <span class="material-symbols-outlined">event_busy</span>
                        Temporada Encerrada
                    </span>
                </div>
                <p class="aviso-dica">
                    <span class="material-symbols-outlined">lightbulb</span>
                    Os dados do participante serão carregados automaticamente quando a <strong>Temporada ${(verificacao.temporada || 2025) + 1}</strong> iniciar.
                </p>
            </div>
        `;
    }

    // Obter rodadas disponíveis do histórico
    const rodadasDisponiveis = data.rodadas_disponiveis ||
        (data.historico ? data.historico.map(h => h.rodada).sort((a, b) => a - b) : []);
    const rodadaAtual = data.dump_atual?.rodada || rodadasDisponiveis[rodadasDisponiveis.length - 1] || 38;

    // Tabs para navegação (só mostra se tem dados válidos)
    const tabs = temDados ? `
        <div class="modal-tabs">
            <button class="tab-btn active" data-tab="resumo">
                <span class="material-symbols-outlined">dashboard</span> Resumo
            </button>
            <button class="tab-btn" data-tab="rodadas">
                <span class="material-symbols-outlined">calendar_month</span> Rodadas
            </button>
        </div>
    ` : "";

    // Conteúdo das tabs
    const tabResumo = temDados ? `
        <div class="tab-content active" data-tab-content="resumo">
            ${resumoDados}
        </div>
    ` : "";

    // Tab de navegação por rodadas
    const tabRodadas = temDados && rodadasDisponiveis.length > 0 ? `
        <div class="tab-content" data-tab-content="rodadas">
            <div class="rodadas-navegacao">
                <div class="rodadas-header">
                    <div class="rodadas-header-left">
                        <button class="btn-voltar-resumo" onclick="window.voltarParaResumo()" title="Voltar ao Resumo">
                            <span class="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h4><span class="material-symbols-outlined">calendar_month</span> Selecione uma Rodada</h4>
                    </div>
                    <span class="rodadas-count">${rodadasDisponiveis.length} rodadas disponíveis</span>
                </div>
                <div class="rodadas-grid">
                    ${rodadasDisponiveis.map(r => `
                        <button class="rodada-btn ${r === rodadaAtual ? 'active' : ''}"
                                data-rodada="${r}"
                                onclick="window.carregarRodadaEspecifica(${timeId}, ${r})">
                            <span class="rodada-numero">${r}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div id="modal-content-area" class="rodada-content-area">
                <div class="selecione-rodada">
                    <span class="material-symbols-outlined" style="font-size:48px;color:#666">touch_app</span>
                    <p>Clique em uma rodada acima para visualizar os dados</p>
                </div>
            </div>
        </div>
    ` : `
        <div class="tab-content" data-tab-content="rodadas">
            <div class="sem-rodadas">
                <span class="material-symbols-outlined" style="font-size:48px;color:#666">calendar_month</span>
                <p>Nenhuma rodada disponível</p>
            </div>
        </div>
    `;

    // Tab JSON removida - o JSON está disponível na aba Rodadas ao clicar em cada rodada

    const tabHistorico = temDados && data.historico ? `
        <div class="tab-content" data-tab-content="historico">
            <div class="historico-lista">
                ${data.historico.map(h => `
                    <div class="historico-item">
                        <span class="material-symbols-outlined">schedule</span>
                        <div class="historico-info">
                            <span class="historico-data">${new Date(h.data_coleta).toLocaleString('pt-BR')}</span>
                            <span class="historico-tipo">${h.tipo_coleta} • ${(h.payload_size / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    ` : `
        <div class="tab-content" data-tab-content="historico">
            <div class="sem-historico">
                <span class="material-symbols-outlined">history</span>
                <p>Nenhum histórico disponível</p>
            </div>
        </div>
    `;

    // Estado sem dados
    const semDados = !temDados ? `
        <div class="sem-dados">
            <span class="material-symbols-outlined" style="font-size:64px;color:#666">person_off</span>
            <h4>Dados ainda não coletados</h4>
            <p>Clique em "Buscar Dados" para importar as informações completas deste participante da API oficial do Cartola FC.</p>
            <button class="btn-sincronizar-globo" onclick="window.sincronizarComGlobo(${timeId})">
                <span class="material-symbols-outlined" style="vertical-align:middle">download</span>
                Buscar Dados
            </button>
        </div>
    ` : "";

    modal.innerHTML = `
        <div class="modal-dados-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-dados-content">
            <div class="modal-dados-header">
                <div class="header-info">
                    <h3>
                        <span class="material-symbols-outlined" style="color:#FF5500">person_search</span>
                        Dados do Time
                    </h3>
                    <span class="header-subtitle">ID Cartola: ${timeId}</span>
                </div>
                <div class="header-actions">
                    ${temDados ? `
                    <button class="btn-atualizar" onclick="window.sincronizarComGlobo(${timeId})" title="Atualizar dados">
                        <span class="material-symbols-outlined">refresh</span>
                    </button>
                    ` : ""}
                    <button class="btn-fechar" onclick="this.closest('.modal-dados-globo').remove()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            ${temDados ? `
                <div class="modal-dados-meta">
                    <span class="meta-item">
                        <span class="material-symbols-outlined" style="font-size:14px">schedule</span>
                        Última coleta: ${new Date(data.dump_atual.data_coleta).toLocaleString('pt-BR')}
                    </span>
                    <span class="meta-item">
                        <span class="material-symbols-outlined" style="font-size:14px">category</span>
                        Tipo: ${data.dump_atual.tipo_coleta}
                    </span>
                </div>
            ` : ""}

            ${tabs}

            <div class="modal-dados-body">
                ${temDados ? tabResumo + tabRodadas : semDados}
            </div>
        </div>
    `;

    // Event listeners para tabs
    modal.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;

            // Atualizar botões
            modal.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Atualizar conteúdo
            modal.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            modal.querySelector(`[data-tab-content="${tab}"]`)?.classList.add("active");
        });
    });

    // Fechar com ESC
    const handleEsc = (e) => {
        if (e.key === "Escape") {
            document.removeEventListener("keydown", handleEsc);
            modal.remove();
        }
    };
    document.addEventListener("keydown", handleEsc);

    return modal;
}

/**
 * Sincroniza participante com API Globo
 */
async function sincronizarComGlobo(timeId) {
    const btnSync = document.querySelector(".btn-sincronizar-globo, .btn-atualizar");

    if (btnSync) {
        btnSync.disabled = true;
        btnSync.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">sync</span> Sincronizando...';
    }

    try {
        mostrarToast("Buscando dados do time...", "info");

        const response = await fetch(`/api/data-lake/sincronizar/${timeId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || "Erro ao sincronizar");
        }

        mostrarToast("Sincronizado! " + data.dump.payload_size + " bytes salvos.", "success");

        // Recarregar modal com novos dados
        document.querySelector(".modal-dados-globo")?.remove();

        // Buscar e exibir novos dados
        const card = document.querySelector(`[data-time-id="${timeId}"]`);
        const nome = card?.dataset.nome || "";
        const timeNome = card?.dataset.time || "";
        const btn = card?.querySelector('[data-action="ver-api-cartola"]');

        if (btn) {
            await verDadosApiCartola(timeId, nome, timeNome, btn);
        }

    } catch (error) {
        console.error("[DATA-LAKE] Erro ao sincronizar:", error);
        mostrarToast("Erro: " + error.message, "error");

        if (btnSync) {
            btnSync.disabled = false;
            btnSync.innerHTML = '<span class="material-symbols-outlined" style="vertical-align:middle">download</span> Buscar Dados';
        }
    }
}

/**
 * Copia JSON para clipboard
 */
function copiarJsonGlobo() {
    const jsonContent = document.getElementById("json-viewer-content")?.textContent;
    if (jsonContent) {
        navigator.clipboard.writeText(jsonContent).then(() => {
            mostrarToast("JSON copiado para a área de transferência!", "success");
        }).catch(() => {
            mostrarToast("Erro ao copiar JSON", "error");
        });
    }
}

// ==============================
// VALIDAÇÃO DE IDs CARTOLA
// ==============================

/**
 * Valida ID de um único participante na API do Cartola
 * @param {string} timeId - ID do time
 * @param {string} nome - Nome do participante
 * @param {HTMLElement} btn - Botão que disparou a ação
 */
async function validarIdParticipante(timeId, nome, btn) {
    // ✅ v2.5: Validar E sincronizar dados (escudo, nome, clube_id)
    const iconOriginal = btn.innerHTML;
    const ligaId = window.SUPER_CARTOLA?.ligaAtual;
    const temporada = temporadaSelecionada || new Date().getFullYear();

    try {
        // Feedback visual
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span>`;

        const response = await fetch(`/api/cartola/time/${timeId}`);
        const data = await response.json();

        if (!response.ok || data.erro) {
            // Time não existe ou erro
            btn.innerHTML = `<span class="material-symbols-outlined" style="color: #ef4444;">error</span>`;
            btn.title = `Erro: ${data.erro || 'Time não encontrado'}`;
            mostrarToast(`${nome}: Time não encontrado na API do Cartola`, "error");
            return;
        }

        // Verificar se o nome do dono confere
        // ✅ v2.4 FIX: API retorna nome_cartoleiro (não nome_cartola)
        const nomeDono = data.time?.nome_cartoleiro || data.nome_cartoleiro || data.time?.nome_cartola || data.nome_cartola || '';
        const nomeLocal = nome || '';
        const nomeConfere = nomeDono.toLowerCase().trim() === nomeLocal.toLowerCase().trim();

        // ✅ v2.5: Sincronizar dados automaticamente se ID válido
        if (ligaId && timeId > 0) {
            try {
                const syncResponse = await fetch(`/api/ligas/${ligaId}/participantes/${timeId}/sincronizar`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ temporada })
                });
                const syncData = await syncResponse.json();

                if (syncData.success) {
                    console.log(`[VALIDACAO] Dados sincronizados:`, syncData.dados_atualizados);

                    // ✅ v2.7: Atualizar TODOS os dados visuais no card
                    const cardId = `card-time-${timeId}`;
                    const card = document.getElementById(cardId);
                    console.log(`[VALIDACAO] Buscando card: ${cardId}, encontrado:`, !!card);

                    if (card) {
                        const dados = syncData.dados_atualizados;

                        // 1. Atualizar escudo do time Cartola
                        const imgEscudo = card.querySelector('.participante-avatar-mini img');
                        console.log(`[VALIDACAO] Escudo recebido: "${dados.escudo}", img encontrada:`, !!imgEscudo);
                        if (dados.escudo && imgEscudo) {
                            // ✅ Cache busting para forçar reload da imagem
                            const escudoUrl = dados.escudo.includes('?')
                                ? `${dados.escudo}&_t=${Date.now()}`
                                : `${dados.escudo}?_t=${Date.now()}`;
                            imgEscudo.src = escudoUrl;
                            console.log(`[VALIDACAO] Escudo atualizado para:`, escudoUrl);
                        }

                        // 2. Atualizar nome do cartoleiro
                        if (dados.nome_cartoleiro) {
                            const nomeSpan = card.querySelector('.participante-nome-compact');
                            if (nomeSpan) {
                                nomeSpan.textContent = dados.nome_cartoleiro;
                            }
                        }

                        // 3. Atualizar nome do time
                        if (dados.nome_time) {
                            const timeSpan = card.querySelector('.participante-time-compact');
                            if (timeSpan) {
                                timeSpan.textContent = dados.nome_time;
                            }
                        }

                        // 4. Atualizar/Adicionar time do coração (clube_id)
                        console.log(`[VALIDACAO] clube_id recebido: ${dados.clube_id}, mapeado:`, !!CLUBES_CONFIG.MAPEAMENTO[dados.clube_id]);
                        const actionsDiv = card.querySelector('.participante-actions-compact');
                        let clubeDiv = card.querySelector('.participante-clube-mini');

                        if (dados.clube_id && CLUBES_CONFIG.MAPEAMENTO[dados.clube_id]) {
                            const clubeNome = BrasoesHelper.getNomeClube(dados.clube_id);
                            const clubeImg = BrasoesHelper.getClubeBrasao(dados.clube_id);

                            if (clubeDiv) {
                                // Atualizar existente
                                clubeDiv.title = clubeNome;
                                const img = clubeDiv.querySelector('img');
                                if (img) img.src = clubeImg;
                            } else {
                                // Criar novo elemento (time do coração)
                                clubeDiv = document.createElement('div');
                                clubeDiv.className = 'participante-clube-mini';
                                clubeDiv.title = clubeNome;
                                clubeDiv.innerHTML = `
                                    <img src="${clubeImg}"
                                         alt="${clubeNome}"
                                         onerror="this.src='${CLUBES_CONFIG.PATHS.placeholder}'">
                                `;
                                // Inserir antes das ações
                                if (actionsDiv) {
                                    actionsDiv.parentNode.insertBefore(clubeDiv, actionsDiv);
                                }
                            }
                        }
                    } else {
                        console.warn(`[VALIDACAO] Card não encontrado: ${cardId}`);
                    }
                } else {
                    console.warn(`[VALIDACAO] Sincronização falhou:`, syncData);
                }
            } catch (syncError) {
                console.warn(`[VALIDACAO] Erro ao sincronizar (não crítico):`, syncError);
            }
        }

        if (nomeConfere) {
            // ✅ v2.8: Válido e sincronizado - manter check verde permanente
            btn.innerHTML = `<span class="material-symbols-outlined" style="color: #22c55e;">check_circle</span>`;
            btn.title = `Sincronizado: ${nomeDono}`;
            btn.classList.add('ja-validado');
            btn.dataset.sincronizado = "true";
            mostrarToast(`${nome}: Validado e sincronizado`, "success");
            // NÃO resetar - manter verde
            btn.disabled = false;
            return;
        } else {
            // Dono diferente mas dados sincronizados - manter warning por 10s
            btn.innerHTML = `<span class="material-symbols-outlined" style="color: #f59e0b;">warning</span>`;
            btn.title = `Atenção: Dono atual é "${nomeDono}" (dados sincronizados)`;
            mostrarToast(`${nome}: Dono diferente (${nomeDono}) - dados sincronizados`, "warning");
            btn.disabled = false;
            // Resetar para check verde após 10s (pois dados foram sincronizados)
            setTimeout(() => {
                btn.innerHTML = `<span class="material-symbols-outlined" style="color: #22c55e;">check_circle</span>`;
                btn.title = `Sincronizado (dono diferente: ${nomeDono})`;
                btn.classList.add('ja-validado');
                btn.dataset.sincronizado = "true";
            }, 10000);
            return;
        }

    } catch (error) {
        console.error("[VALIDACAO] Erro:", error);
        btn.innerHTML = `<span class="material-symbols-outlined" style="color: #ef4444;">error</span>`;
        btn.title = `Erro: ${error.message}`;
        mostrarToast(`Erro ao validar ${nome}: ${error.message}`, "error");
        btn.disabled = false;
        // Resetar para original após 5 segundos apenas em caso de ERRO
        setTimeout(() => {
            btn.innerHTML = iconOriginal;
            btn.title = "Validar ID na API Cartola";
        }, 5000);
    }
}

/**
 * Valida IDs de TODOS os participantes na API do Cartola
 */
async function validarIdsCartola() {
    const ligaId = window.SUPER_CARTOLA?.ligaAtual;
    if (!ligaId) {
        mostrarToast("Liga não identificada", "error");
        return;
    }

    const temporada = temporadaSelecionada || new Date().getFullYear();
    const btn = document.getElementById("btn-validar-ids");

    try {
        // Feedback visual
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-icons" style="animation: spin 1s linear infinite;">sync</span><span class="btn-text">Validando...</span>`;
        }

        mostrarToast("Validando IDs na API do Cartola...", "info");

        const response = await fetch(`/api/ligas/${ligaId}/validar-participantes/${temporada}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || "Erro na validação");
        }

        // Mostrar modal com resultados
        mostrarModalValidacao(data);

    } catch (error) {
        console.error("[VALIDACAO] Erro:", error);
        mostrarToast("Erro ao validar: " + error.message, "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-icons">verified</span><span class="btn-text">Validar</span>`;
        }
    }
}

/**
 * Exibe modal com resultados da validação
 */
function mostrarModalValidacao(data) {
    const existente = document.getElementById("modal-validacao");
    if (existente) existente.remove();

    const { stats, resultados, temporada } = data;

    // Agrupar por status
    const validos = resultados.filter(r => r.status === "valido");
    const donoDiferente = resultados.filter(r => r.status === "dono_diferente");
    const inexistentes = resultados.filter(r => r.status === "inexistente");
    const erros = resultados.filter(r => r.status === "erro");

    const modal = document.createElement("div");
    modal.id = "modal-validacao";
    modal.className = "modal-dados-globo";
    modal.innerHTML = `
        <div class="modal-dados-overlay" onclick="fecharModalValidacao()"></div>
        <div class="modal-dados-content" style="max-width: 700px;">
            <div class="modal-dados-header">
                <div class="header-info">
                    <h3><span class="material-icons" style="color: #22c55e;">verified</span> Validação de IDs - ${temporada}</h3>
                    <span class="header-subtitle">Verificação na API do Cartola FC</span>
                </div>
                <div class="header-actions">
                    <button class="btn-fechar" onclick="fecharModalValidacao()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
            </div>

            <div class="modal-dados-body">
                <!-- Stats -->
                <div class="dados-resumo" style="margin-bottom: 20px;">
                    <div class="resumo-item">
                        <span class="resumo-icon" style="background: rgba(34, 197, 94, 0.2); color: #22c55e;">
                            <span class="material-icons">check_circle</span>
                        </span>
                        <div class="resumo-info">
                            <span class="resumo-label">Válidos</span>
                            <span class="resumo-value" style="color: #22c55e;">${stats.validos}</span>
                        </div>
                    </div>
                    <div class="resumo-item">
                        <span class="resumo-icon" style="background: rgba(251, 191, 36, 0.2); color: #fbbf24;">
                            <span class="material-icons">swap_horiz</span>
                        </span>
                        <div class="resumo-info">
                            <span class="resumo-label">Dono Diferente</span>
                            <span class="resumo-value" style="color: #fbbf24;">${stats.dono_diferente}</span>
                        </div>
                    </div>
                    <div class="resumo-item">
                        <span class="resumo-icon" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">
                            <span class="material-icons">cancel</span>
                        </span>
                        <div class="resumo-info">
                            <span class="resumo-label">Inexistentes</span>
                            <span class="resumo-value" style="color: #ef4444;">${stats.inexistentes}</span>
                        </div>
                    </div>
                </div>

                <!-- Lista de Resultados -->
                <div class="historico-lista" style="max-height: 400px; overflow-y: auto;">
                    ${validos.length > 0 ? `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #22c55e; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <span class="material-icons">check_circle</span> Válidos (${validos.length})
                            </h4>
                            ${validos.map(r => `
                                <div class="historico-item" style="border-left: 3px solid #22c55e;">
                                    <span class="material-icons" style="color: #22c55e;">person</span>
                                    <div class="historico-info">
                                        <span class="historico-data">${r.nome_registrado}</span>
                                        <span class="historico-tipo">${r.nome_time_registrado}${r.nome_time_atual !== r.nome_time_registrado ? ` → ${r.nome_time_atual}` : ""}</span>
                                    </div>
                                    <span style="font-size: 0.75rem; color: #666;">#${r.time_id}</span>
                                </div>
                            `).join("")}
                        </div>
                    ` : ""}

                    ${donoDiferente.length > 0 ? `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #fbbf24; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <span class="material-icons">warning</span> Dono Diferente (${donoDiferente.length})
                            </h4>
                            ${donoDiferente.map(r => `
                                <div class="historico-item" style="border-left: 3px solid #fbbf24;">
                                    <span class="material-icons" style="color: #fbbf24;">swap_horiz</span>
                                    <div class="historico-info" style="flex: 1;">
                                        <span class="historico-data" style="color: #fbbf24;">${r.nome_registrado} → ${r.nome_atual}</span>
                                        <span class="historico-tipo">${r.nome_time_registrado} → ${r.nome_time_atual}</span>
                                    </div>
                                    <button class="toolbar-btn btn-primary" style="padding: 4px 8px; font-size: 0.7rem;"
                                            onclick="sincronizarParticipanteValidacao('${r.time_id}', ${temporada})">
                                        <span class="material-icons" style="font-size: 14px;">sync</span>
                                        Atualizar
                                    </button>
                                </div>
                            `).join("")}
                        </div>
                    ` : ""}

                    ${inexistentes.length > 0 ? `
                        <div style="margin-bottom: 16px;">
                            <h4 style="color: #ef4444; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <span class="material-icons">error</span> Inexistentes na API (${inexistentes.length})
                            </h4>
                            ${inexistentes.map(r => `
                                <div class="historico-item" style="border-left: 3px solid #ef4444;">
                                    <span class="material-icons" style="color: #ef4444;">cancel</span>
                                    <div class="historico-info">
                                        <span class="historico-data" style="color: #ef4444;">${r.nome_registrado}</span>
                                        <span class="historico-tipo">ID ${r.time_id} não existe mais</span>
                                    </div>
                                </div>
                            `).join("")}
                            <p style="font-size: 0.8rem; color: #888; margin-top: 8px; padding: 8px; background: rgba(239,68,68,0.1); border-radius: 6px;">
                                <span class="material-icons" style="font-size: 14px; vertical-align: middle;">info</span>
                                Estes participantes precisam informar o novo ID do Cartola
                            </p>
                        </div>
                    ` : ""}

                    ${erros.length > 0 ? `
                        <div>
                            <h4 style="color: #888; margin-bottom: 8px;">Erros (${erros.length})</h4>
                            ${erros.map(r => `
                                <div class="historico-item" style="opacity: 0.6;">
                                    <span class="material-icons">error_outline</span>
                                    <div class="historico-info">
                                        <span class="historico-data">${r.nome_registrado}</span>
                                        <span class="historico-tipo">${r.mensagem}</span>
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    ` : ""}

                    ${resultados.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: #888;">
                            <span class="material-icons" style="font-size: 48px; opacity: 0.5;">fact_check</span>
                            <p>Nenhum participante com ID real para validar</p>
                        </div>
                    ` : ""}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("modal-visible"), 10);

    // Fechar com ESC
    document.addEventListener("keydown", fecharModalValidacaoEsc);
}

function fecharModalValidacao() {
    const modal = document.getElementById("modal-validacao");
    if (modal) {
        modal.classList.remove("modal-visible");
        setTimeout(() => modal.remove(), 300);
    }
    document.removeEventListener("keydown", fecharModalValidacaoEsc);
}

function fecharModalValidacaoEsc(e) {
    if (e.key === "Escape") fecharModalValidacao();
}

/**
 * Sincroniza dados de um participante específico
 */
async function sincronizarParticipanteValidacao(timeId, temporada) {
    const ligaId = window.SUPER_CARTOLA?.ligaAtual;
    if (!ligaId) return;

    try {
        mostrarToast("Sincronizando...", "info");

        const response = await fetch(`/api/ligas/${ligaId}/participantes/${timeId}/sincronizar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ temporada })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || "Erro ao sincronizar");
        }

        mostrarToast("Dados atualizados com sucesso!", "success");

        // Revalidar para atualizar modal
        fecharModalValidacao();
        await validarIdsCartola();

    } catch (error) {
        console.error("[SINCRONIZAR] Erro:", error);
        mostrarToast("Erro: " + error.message, "error");
    }
}

// Botão flutuante Mercado Aberto
function criarBotaoMercadoAberto() {
    let btn = document.getElementById('btn-mercado-aberto');
    if (!btn) {
        btn = document.createElement('div');
        btn.id = 'btn-mercado-aberto';
        btn.style.position = 'fixed';
        btn.style.bottom = '32px';
        btn.style.right = '32px';
        btn.style.zIndex = '9999';
        btn.style.background = '#22c55e';
        btn.style.color = '#fff';
        btn.style.padding = '16px 24px';
        btn.style.borderRadius = '32px';
        btn.style.boxShadow = '0 2px 12px #0003';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '1.1rem';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '12px';
        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 1.5em;">storefront</span><span id="mercado-status-label">Carregando...</span><span id="mercado-countdown" style="margin-left:8px;font-size:0.95em;"></span>`;
        document.body.appendChild(btn);
    }
    atualizarBotaoMercadoAberto();
}

async function atualizarBotaoMercadoAberto() {
    try {
        const res = await fetch('/api/cartola/mercado/status');
        if (!res.ok) throw new Error('Erro ao buscar status do mercado');
        const data = await res.json();
        const aberto = data.mercado_aberto || data.status_mercado === 1;
        const label = document.getElementById('mercado-status-label');
        const countdown = document.getElementById('mercado-countdown');
        let texto = aberto ? 'Mercado Aberto' : 'Mercado Fechado';
        label.textContent = texto;
        if (aberto && data.fechamento) {
            let fechamento = typeof data.fechamento === 'string' ? new Date(data.fechamento) : new Date(data.fechamento * 1000);
            atualizarCountdownMercado(fechamento);
        } else {
            countdown.textContent = '';
        }
        // Cor do botão
        const btn = document.getElementById('btn-mercado-aberto');
        btn.style.background = aberto ? '#22c55e' : '#ef4444';
    } catch (err) {
        const label = document.getElementById('mercado-status-label');
        if (label) label.textContent = 'Erro ao buscar mercado';
    }
}

function atualizarCountdownMercado(fechamento) {
    const countdown = document.getElementById('mercado-countdown');
    function update() {
        const agora = new Date();
        const diff = fechamento - agora;
        if (diff <= 0) {
            countdown.textContent = 'Fechou';
            return;
        }
        const horas = Math.floor(diff / 1000 / 60 / 60);
        const minutos = Math.floor((diff / 1000 / 60) % 60);
        const segundos = Math.floor((diff / 1000) % 60);
        countdown.textContent = `Fecha em ${horas}h ${minutos}m ${segundos}s`;
    }
    update();
    // Atualiza a cada segundo
    if (countdown._interval) clearInterval(countdown._interval);
    countdown._interval = setInterval(update, 1000);
}

// Inicializar botão ao carregar página
window.addEventListener('DOMContentLoaded', criarBotaoMercadoAberto);
// Atualizar status do mercado a cada 2 minutos
setInterval(atualizarBotaoMercadoAberto, 120000);

// ==============================
// CONTROLE DE INICIALIZAÇÃO
// ==============================
let participantesJaCarregados = false;

setTimeout(() => {
    if (
        document.getElementById("participantes-grid") &&
        !participantesJaCarregados
    ) {
        participantesJaCarregados = true;
        console.log("[PARTICIPANTES] 🚀 Auto-inicialização");
        carregarParticipantesComBrasoes();
    }
}, 100);

console.log("[PARTICIPANTES] ✅ Módulo carregado (otimizado)");

// ==============================
// AÇÕES EM LOTE - TEMPORADA 2026
// v1.0 - 2026-01-24
// ==============================

let selecaoBatch = new Set();

// Toggle seleção individual
window.toggleSelecaoBatch = function(timeId) {
    const checkbox = document.querySelector(`.batch-checkbox[data-time-id="${timeId}"]`);
    if (selecaoBatch.has(timeId)) {
        selecaoBatch.delete(timeId);
        if (checkbox) checkbox.checked = false;
    } else {
        selecaoBatch.add(timeId);
        if (checkbox) checkbox.checked = true;
    }
    atualizarToolbarBatch();
};

// Selecionar todos visíveis
window.selecionarTodosBatch = function() {
    document.querySelectorAll('.batch-checkbox').forEach(cb => {
        const timeId = parseInt(cb.dataset.timeId);
        selecaoBatch.add(timeId);
        cb.checked = true;
    });
    atualizarToolbarBatch();
};

// Limpar seleção
window.limparSelecao = function() {
    selecaoBatch.clear();
    document.querySelectorAll('.batch-checkbox').forEach(cb => cb.checked = false);
    const selectAll = document.getElementById('batch-select-all');
    if (selectAll) selectAll.checked = false;
    atualizarToolbarBatch();
};

// Toggle selecionar todos (checkbox do header)
window.toggleSelecionarTodos = function(checked) {
    if (checked) {
        selecionarTodosBatch();
    } else {
        limparSelecao();
    }
};

// Atualizar visibilidade da toolbar
function atualizarToolbarBatch() {
    const toolbar = document.getElementById('batch-toolbar');
    if (!toolbar) return;

    const count = selecaoBatch.size;

    // Sempre visível em temporada >= 2026
    if (temporadaSelecionada >= 2026) {
        toolbar.style.display = 'flex';
        toolbar.querySelector('.batch-count').textContent = count;

        // Desabilitar botões quando não há seleção
        const btns = toolbar.querySelectorAll('.btn-batch');
        btns.forEach(btn => {
            btn.disabled = count === 0;
            btn.style.opacity = count === 0 ? '0.5' : '1';
            btn.style.cursor = count === 0 ? 'not-allowed' : 'pointer';
        });
    } else {
        toolbar.style.display = 'none';
    }
}

// Limpar seleção ao trocar temporada
const _originalSelecionarTemporada = window.selecionarTemporada;
window.selecionarTemporada = async function(temporada) {
    limparSelecao();
    await _originalSelecionarTemporada(temporada);
};

// === AÇÕES EM LOTE ===

// Grupo Renovação
window.batchRenovar = () => executarAcaoBatch('renovar', 'Renovar participantes');
window.batchNaoParticipa = () => executarAcaoBatch('nao_participa', 'Marcar como não participa');
window.batchMarcarPago = () => executarAcaoBatch('marcar_pago', 'Marcar inscrição como paga');
window.batchReverter = () => executarAcaoBatch('reverter', 'Reverter para pendente');

// Grupo Gestão
window.batchValidarIds = () => executarAcaoBatch('validar_ids', 'Validar IDs na API Cartola');
window.batchToggleStatus = async () => {
    const acao = await mostrarModalEscolhaStatus();
    if (acao) {
        executarAcaoBatch(acao, acao === 'ativar' ? 'Ativar participantes' : 'Inativar participantes');
    }
};
window.batchGerarSenhas = () => executarAcaoBatch('gerar_senhas', 'Gerar senhas de acesso');

// Modal de escolha ativar/inativar
function mostrarModalEscolhaStatus() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-custom';
        modal.innerHTML = `
            <div class="modal-custom-overlay"></div>
            <div class="modal-custom-content" style="max-width: 300px;">
                <div class="modal-custom-header">
                    <h3>Escolha a ação</h3>
                </div>
                <div class="modal-custom-body" style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn-primary" onclick="this.closest('.modal-custom').remove(); window._resolveStatus('ativar')">
                        <span class="material-icons">play_circle</span> Ativar
                    </button>
                    <button class="btn-danger" onclick="this.closest('.modal-custom').remove(); window._resolveStatus('inativar')">
                        <span class="material-icons">pause_circle</span> Inativar
                    </button>
                </div>
                <div class="modal-custom-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-custom').remove(); window._resolveStatus(null)">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        window._resolveStatus = resolve;
    });
}

// Modal de confirmação batch
async function mostrarModalConfirmacaoBatch(acao, titulo, timeIds) {
    // Buscar dados dos participantes selecionados
    const participantes = timeIds.map((id, idx) => {
        const cb = document.querySelector(`.batch-checkbox[data-time-id="${id}"]`);
        return {
            num: idx + 1,
            nome: cb?.dataset.nome || `Time ${id}`,
            status: cb?.dataset.status || 'pendente'
        };
    });

    // Calcular largura máxima do número para alinhamento
    const maxNum = participantes.length;
    const numWidth = String(maxNum).length;

    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-custom';
        modal.innerHTML = `
            <div class="modal-custom-overlay" onclick="this.closest('.modal-custom').remove(); window._resolveBatch(false)"></div>
            <div class="modal-custom-content" style="max-width: 500px;">
                <div class="modal-custom-header" style="display: flex; align-items: center; gap: 12px;">
                    <span class="material-icons" style="color: #FF5500;">group</span>
                    <h3 style="margin: 0;">${titulo}</h3>
                </div>
                <div class="modal-custom-body">
                    <p style="margin-bottom: 16px; color: #a0a0a0;">
                        Aplicar ação em <strong style="color: #FF5500;">${timeIds.length}</strong> participante(s):
                    </p>
                    <div class="batch-lista-container" style="max-height: 280px; overflow-y: auto; background: #0d0d1a; border-radius: 10px; border: 1px solid #333;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead style="position: sticky; top: 0; background: #1a1a2e; z-index: 1;">
                                <tr style="border-bottom: 1px solid #FF5500;">
                                    <th style="padding: 10px 12px; text-align: right; width: 50px; color: #888; font-weight: 500;">#</th>
                                    <th style="padding: 10px 12px; text-align: left; color: #888; font-weight: 500;">Participante</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${participantes.map((p, i) => `
                                <tr style="border-bottom: 1px solid #222; ${i % 2 === 0 ? 'background: rgba(255,255,255,0.02);' : ''}">
                                    <td style="padding: 8px 12px; text-align: right; font-family: 'JetBrains Mono', monospace; color: #666; font-size: 13px;">
                                        ${String(p.num).padStart(numWidth, '0')}
                                    </td>
                                    <td style="padding: 8px 12px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 350px;">
                                        ${p.nome}
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${acao === 'renovar' ? `
                    <label style="display: flex; align-items: center; gap: 10px; margin-top: 16px; padding: 12px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; cursor: pointer;">
                        <input type="checkbox" id="batch-pagou-inscricao" style="width: 18px; height: 18px; accent-color: #22c55e;">
                        <span style="color: #22c55e;">Marcar como "Já pagou inscrição"</span>
                    </label>
                    ` : ''}
                </div>
                <div class="modal-custom-footer" style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 16px; border-top: 1px solid #333;">
                    <button class="btn-secondary" onclick="this.closest('.modal-custom').remove(); window._resolveBatch(false)">
                        <span class="material-icons" style="font-size: 18px;">close</span>
                        Cancelar
                    </button>
                    <button class="btn-primary" onclick="this.closest('.modal-custom').remove(); window._resolveBatch(true)">
                        <span class="material-icons" style="font-size: 18px;">check</span>
                        Confirmar (${timeIds.length})
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        window._resolveBatch = resolve;
    });
}

// Executor principal de ações em lote
async function executarAcaoBatch(acao, titulo) {
    if (selecaoBatch.size === 0) {
        mostrarToast('Selecione ao menos um participante', 'warning');
        return;
    }

    const timeIds = Array.from(selecaoBatch);
    const confirmado = await mostrarModalConfirmacaoBatch(acao, titulo, timeIds);
    if (!confirmado) return;

    // Obter opções extras
    const opcoes = {};
    if (acao === 'renovar') {
        const checkPagou = document.getElementById('batch-pagou-inscricao');
        opcoes.pagouInscricao = checkPagou?.checked || false;
    }

    // Loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'batch-loading';
    overlay.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: #1a1a2e; padding: 24px; border-radius: 12px; text-align: center;">
                <div class="loading-spinner" style="margin: 0 auto 12px;"></div>
                <p>Processando ${timeIds.length} participantes...</p>
                <p id="batch-progress" style="color: #888; font-size: 14px;">0 / ${timeIds.length}</p>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    try {
        const response = await fetch(`/api/inscricoes/${ligaId}/${temporadaSelecionada}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeIds, acao, opcoes })
        });

        const result = await response.json();

        if (result.success) {
            mostrarToast(`${result.processados}/${result.total} participantes processados!`, 'success');

            // Mostrar erros se houver
            if (result.erros?.length > 0) {
                console.warn('[BATCH] Erros:', result.erros);
                result.erros.forEach(e => {
                    mostrarToast(`Erro no time ${e.timeId}: ${e.error}`, 'error');
                });
            }

            limparSelecao();
            await carregarParticipantesPorTemporada(temporadaSelecionada);
        } else {
            mostrarToast('Erro ao processar: ' + (result.error || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        mostrarToast('Erro: ' + error.message, 'error');
    } finally {
        overlay.remove();
    }
}

console.log("[PARTICIPANTES] ✅ Módulo de ações em lote carregado");

// =====================================================================
// MODAL NOVO PARTICIPANTE
// =====================================================================

/**
 * Abre modal para adicionar novo participante
 */
window.abrirModalNovoParticipante = function() {
    // Remover modal existente
    document.querySelector('.modal-novo-participante')?.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-novo-participante';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="window.fecharModalNovoParticipante()"></div>
        <div class="modal-container">
            <div class="modal-header">
                <h3><span class="material-icons">person_add</span> Adicionar Participante</h3>
                <button class="modal-close" onclick="window.fecharModalNovoParticipante()">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <div class="modal-body">
                <!-- Busca -->
                <div class="busca-section">
                    <label>Buscar time no Cartola FC</label>
                    <div class="busca-input-group">
                        <input type="text"
                               id="novo-participante-busca"
                               placeholder="Digite o ID ou nome do time..."
                               autocomplete="off">
                        <button id="btn-buscar-time" onclick="window.buscarTimeNovoParticipante()">
                            <span class="material-icons">search</span>
                        </button>
                    </div>
                    <small class="busca-hint">Use o ID numérico para busca exata ou nome para busca aproximada</small>
                </div>

                <!-- Resultados da busca -->
                <div id="novo-participante-resultados" class="resultados-busca" style="display: none;">
                    <!-- Preenchido dinamicamente -->
                </div>

                <!-- Preview do time selecionado -->
                <div id="novo-participante-preview" class="time-preview" style="display: none;">
                    <div class="preview-header">
                        <span class="material-icons">check_circle</span>
                        Time Selecionado
                    </div>
                    <div class="preview-content">
                        <img id="preview-escudo" src="/escudos/default.png" alt="Escudo">
                        <div class="preview-info">
                            <div class="preview-nome" id="preview-nome-time">-</div>
                            <div class="preview-cartoleiro" id="preview-cartoleiro">-</div>
                            <div class="preview-id" id="preview-time-id">ID: -</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn-cancelar" onclick="window.fecharModalNovoParticipante()">Cancelar</button>
                <button class="btn-confirmar" id="btn-confirmar-novo" onclick="window.confirmarNovoParticipante()" disabled>
                    <span class="material-icons">person_add</span>
                    Adicionar
                </button>
            </div>
        </div>
    `;

    // Estilos inline do modal
    const styles = `
        .modal-novo-participante {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-novo-participante .modal-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
        }
        .modal-novo-participante .modal-container {
            position: relative;
            background: #1a1a2e;
            border-radius: 16px;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: modalSlideIn 0.3s ease;
        }
        @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .modal-novo-participante .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid #333;
            background: #0d0d1a;
        }
        .modal-novo-participante .modal-header h3 {
            margin: 0;
            font-family: 'Russo One', sans-serif;
            font-size: 1.1rem;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .modal-novo-participante .modal-header h3 .material-icons {
            color: #4caf50;
        }
        .modal-novo-participante .modal-close {
            background: transparent;
            border: none;
            color: #888;
            cursor: pointer;
            padding: 4px;
            display: flex;
            border-radius: 50%;
            transition: all 0.2s;
        }
        .modal-novo-participante .modal-close:hover {
            background: #333;
            color: #fff;
        }
        .modal-novo-participante .modal-body {
            padding: 20px;
            max-height: calc(90vh - 140px);
            overflow-y: auto;
        }
        .modal-novo-participante .busca-section {
            margin-bottom: 16px;
        }
        .modal-novo-participante .busca-section label {
            display: block;
            margin-bottom: 8px;
            color: #ccc;
            font-size: 0.9rem;
        }
        .modal-novo-participante .busca-input-group {
            display: flex;
            gap: 8px;
        }
        .modal-novo-participante .busca-input-group input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #333;
            border-radius: 8px;
            background: #0d0d1a;
            color: #fff;
            font-size: 1rem;
        }
        .modal-novo-participante .busca-input-group input:focus {
            outline: none;
            border-color: #ff6600;
        }
        .modal-novo-participante .busca-input-group button {
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            background: #ff6600;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: background 0.2s;
        }
        .modal-novo-participante .busca-input-group button:hover {
            background: #ff8533;
        }
        .modal-novo-participante .busca-hint {
            display: block;
            margin-top: 6px;
            color: #666;
            font-size: 0.8rem;
        }
        .modal-novo-participante .resultados-busca {
            margin-top: 16px;
            border: 1px solid #333;
            border-radius: 8px;
            max-height: 200px;
            overflow-y: auto;
        }
        .modal-novo-participante .resultado-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-bottom: 1px solid #222;
            cursor: pointer;
            transition: background 0.2s;
        }
        .modal-novo-participante .resultado-item:last-child {
            border-bottom: none;
        }
        .modal-novo-participante .resultado-item:hover {
            background: #252540;
        }
        .modal-novo-participante .resultado-item img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
        }
        .modal-novo-participante .resultado-info {
            flex: 1;
        }
        .modal-novo-participante .resultado-nome {
            color: #fff;
            font-weight: 500;
        }
        .modal-novo-participante .resultado-cartoleiro {
            color: #888;
            font-size: 0.85rem;
        }
        .modal-novo-participante .resultado-id {
            color: #666;
            font-size: 0.75rem;
            font-family: 'JetBrains Mono', monospace;
        }
        .modal-novo-participante .time-preview {
            margin-top: 16px;
            border: 2px solid #4caf50;
            border-radius: 12px;
            overflow: hidden;
            background: #0d2818;
        }
        .modal-novo-participante .preview-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: #1a4d2e;
            color: #4caf50;
            font-size: 0.9rem;
            font-weight: 500;
        }
        .modal-novo-participante .preview-content {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
        }
        .modal-novo-participante .preview-content img {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #4caf50;
        }
        .modal-novo-participante .preview-info {
            flex: 1;
        }
        .modal-novo-participante .preview-nome {
            color: #fff;
            font-weight: 600;
            font-size: 1.1rem;
            font-family: 'Russo One', sans-serif;
        }
        .modal-novo-participante .preview-cartoleiro {
            color: #aaa;
            font-size: 0.9rem;
            margin-top: 4px;
        }
        .modal-novo-participante .preview-id {
            color: #666;
            font-size: 0.8rem;
            font-family: 'JetBrains Mono', monospace;
            margin-top: 4px;
        }
        .modal-novo-participante .modal-footer {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            padding: 16px 20px;
            border-top: 1px solid #333;
            background: #0d0d1a;
        }
        .modal-novo-participante .btn-cancelar {
            padding: 10px 20px;
            border: 1px solid #444;
            border-radius: 8px;
            background: transparent;
            color: #aaa;
            cursor: pointer;
            font-size: 0.95rem;
            transition: all 0.2s;
        }
        .modal-novo-participante .btn-cancelar:hover {
            border-color: #666;
            color: #fff;
        }
        .modal-novo-participante .btn-confirmar {
            padding: 10px 24px;
            border: none;
            border-radius: 8px;
            background: #4caf50;
            color: #fff;
            cursor: pointer;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }
        .modal-novo-participante .btn-confirmar:hover:not(:disabled) {
            background: #66bb6a;
        }
        .modal-novo-participante .btn-confirmar:disabled {
            background: #333;
            color: #666;
            cursor: not-allowed;
        }
        .modal-novo-participante .loading-busca {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 20px;
            color: #888;
        }
        .modal-novo-participante .erro-busca {
            padding: 16px;
            color: #ff6b6b;
            text-align: center;
        }
        .modal-novo-participante .sem-resultados {
            padding: 16px;
            color: #888;
            text-align: center;
        }
    `;

    // Adicionar estilos
    const styleTag = document.createElement('style');
    styleTag.textContent = styles;
    modal.appendChild(styleTag);

    document.body.appendChild(modal);

    // Focus no input
    setTimeout(() => {
        document.getElementById('novo-participante-busca')?.focus();
    }, 100);

    // Enter para buscar
    document.getElementById('novo-participante-busca')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            window.buscarTimeNovoParticipante();
        }
    });

    console.log('[PARTICIPANTES] Modal novo participante aberto');
};

// Estado do time selecionado
let timeSelecionadoParaAdicionar = null;

/**
 * Busca time no Cartola FC (API da Globo)
 */
window.buscarTimeNovoParticipante = async function() {
    const input = document.getElementById('novo-participante-busca');
    const resultadosDiv = document.getElementById('novo-participante-resultados');
    const previewDiv = document.getElementById('novo-participante-preview');
    const query = input?.value?.trim();

    if (!query) {
        mostrarToast('Digite algo para buscar', 'warning');
        return;
    }

    // Esconder preview anterior
    previewDiv.style.display = 'none';
    timeSelecionadoParaAdicionar = null;
    document.getElementById('btn-confirmar-novo').disabled = true;

    // Mostrar loading
    resultadosDiv.style.display = 'block';
    resultadosDiv.innerHTML = `
        <div class="loading-busca">
            <div class="loading-spinner" style="width: 20px; height: 20px;"></div>
            Buscando na API Cartola...
        </div>
    `;

    try {
        let response;

        // Se for número, buscar por ID direto na API da Globo
        if (/^\d+$/.test(query)) {
            response = await fetch(`/api/cartola/buscar-time/${query}`);
            const data = await response.json();

            if (!response.ok || !data.time) {
                resultadosDiv.innerHTML = `<div class="erro-busca">${data.error || 'Time não encontrado com esse ID'}</div>`;
                return;
            }

            // Busca por ID retorna um time direto
            selecionarTimeParaAdicionar(data.time);
            resultadosDiv.style.display = 'none';
            return;
        }

        // Buscar por nome na API da Globo
        if (query.length < 3) {
            resultadosDiv.innerHTML = `<div class="erro-busca">Digite pelo menos 3 caracteres para buscar por nome</div>`;
            return;
        }

        // Usar endpoint que busca na API pública da Globo
        response = await fetch(`/api/cartola/buscar-time-globo?q=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();

        if (!response.ok) {
            resultadosDiv.innerHTML = `<div class="erro-busca">${data.error || 'Erro na busca'}</div>`;
            return;
        }

        // Busca por nome retorna lista
        const times = data.times || [];
        if (times.length === 0) {
            resultadosDiv.innerHTML = `<div class="sem-resultados">Nenhum time encontrado para "${query}" na API Cartola</div>`;
            return;
        }

        // Renderizar resultados (campos da API: nome_time, nome_cartoleiro)
        resultadosDiv.innerHTML = times.map(time => `
            <div class="resultado-item" onclick="window.selecionarTimeParaAdicionar(${JSON.stringify(time).replace(/"/g, '&quot;')})">
                <img src="${time.url_escudo_png || time.escudo || '/escudos/default.png'}"
                     alt="Escudo"
                     onerror="this.src='/escudos/default.png'">
                <div class="resultado-info">
                    <div class="resultado-nome">${time.nome_time || time.nome || 'Time sem nome'}</div>
                    <div class="resultado-cartoleiro">${time.nome_cartoleiro || time.nome_cartola || '-'}</div>
                    <div class="resultado-id">ID: ${time.time_id}</div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('[BUSCA] Erro:', error);
        resultadosDiv.innerHTML = `<div class="erro-busca">Erro ao buscar: ${error.message}</div>`;
    }
};

/**
 * Seleciona um time da lista para adicionar
 * Normaliza campos da API (nome_time, nome_cartoleiro) para uso interno
 */
window.selecionarTimeParaAdicionar = function(time) {
    // ✅ v3.0: Normalizar campos preservando TODOS os dados da API Cartola
    // Campos: nome_time, nome_cartoleiro, escudo, clube_id, foto_perfil, assinante
    const timeNormalizado = {
        time_id: time.time_id,
        nome_time: time.nome_time || time.nome || 'Time sem nome',
        nome_cartola: time.nome_cartoleiro || time.nome_cartola || '-',
        url_escudo_png: time.url_escudo_png || time.escudo || '/escudos/default.png',
        clube_id: time.clube_id || time.time_coracao || null,
        // ✅ Campos adicionais da API Cartola (como Paulinett Miranda tem)
        foto_perfil: time.foto_perfil || time.url_foto_perfil || '',
        assinante: time.assinante || false
    };

    timeSelecionadoParaAdicionar = timeNormalizado;

    // Esconder resultados
    document.getElementById('novo-participante-resultados').style.display = 'none';

    // Mostrar preview
    const previewDiv = document.getElementById('novo-participante-preview');
    previewDiv.style.display = 'block';

    document.getElementById('preview-escudo').src = timeNormalizado.url_escudo_png;
    document.getElementById('preview-nome-time').textContent = timeNormalizado.nome_time;
    document.getElementById('preview-cartoleiro').textContent = timeNormalizado.nome_cartola;
    document.getElementById('preview-time-id').textContent = `ID: ${timeNormalizado.time_id}`;

    // Habilitar botão
    document.getElementById('btn-confirmar-novo').disabled = false;

    console.log('[PARTICIPANTES] Time selecionado:', timeNormalizado);
};

/**
 * Confirma adição do novo participante
 * Usa endpoint simples /api/ligas/:id/participantes (sem exigir LigaRules)
 */
window.confirmarNovoParticipante = async function() {
    if (!timeSelecionadoParaAdicionar) {
        mostrarToast('Selecione um time primeiro', 'warning');
        return;
    }

    const btn = document.getElementById('btn-confirmar-novo');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner" style="width: 16px; height: 16px;"></div> Adicionando...';

    try {
        // ✅ v3.0: Usar endpoint simples com TODOS os campos da API Cartola
        // Campos já normalizados em selecionarTimeParaAdicionar()
        const response = await fetch(`/api/ligas/${ligaId}/participantes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                time_id: timeSelecionadoParaAdicionar.time_id,
                nome_cartola: timeSelecionadoParaAdicionar.nome_cartola,
                nome_time: timeSelecionadoParaAdicionar.nome_time,
                clube_id: timeSelecionadoParaAdicionar.clube_id,
                url_escudo_png: timeSelecionadoParaAdicionar.url_escudo_png,
                // ✅ Campos adicionais (como Paulinett Miranda tem)
                foto_perfil: timeSelecionadoParaAdicionar.foto_perfil,
                assinante: timeSelecionadoParaAdicionar.assinante
            })
        });

        const data = await response.json();

        if (data.success) {
            mostrarToast(`Participante "${timeSelecionadoParaAdicionar.nome_cartola}" adicionado com sucesso!`, 'success');
            window.fecharModalNovoParticipante();

            // Recarregar lista
            await carregarParticipantesPorTemporada(temporadaSelecionada);
        } else {
            throw new Error(data.error || 'Erro ao adicionar participante');
        }

    } catch (error) {
        console.error('[PARTICIPANTES] Erro ao adicionar:', error);
        mostrarToast('Erro: ' + error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
};

/**
 * Fecha modal de novo participante
 */
window.fecharModalNovoParticipante = function() {
    document.querySelector('.modal-novo-participante')?.remove();
    timeSelecionadoParaAdicionar = null;
};

console.log("[PARTICIPANTES] ✅ Modal novo participante carregado");

// =============================================================================
// EXPORTAR LISTA DE PARTICIPANTES PARA PDF
// =============================================================================

/**
 * Exporta lista de participantes para PDF
 * ✅ v2.15: Nova funcionalidade de exportação
 */
window.exportarParticipantesPDF = async function() {
    const participantes = window.participantesCarregados;
    const temporada = window.participantesTemporada || temporadaSelecionada;

    if (!participantes || participantes.length === 0) {
        mostrarToast('Nenhum participante para exportar', 'error');
        return;
    }

    // Verificar se jsPDF está disponível, senão carregar dinamicamente
    if (typeof window.jspdf === 'undefined') {
        mostrarToast('Carregando biblioteca PDF...', 'info');

        // Carregar jsPDF
        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

        await new Promise((resolve, reject) => {
            script1.onload = resolve;
            script1.onerror = reject;
            document.head.appendChild(script1);
        });

        // Carregar AutoTable plugin
        const script2 = document.createElement('script');
        script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';

        await new Promise((resolve, reject) => {
            script2.onload = resolve;
            script2.onerror = reject;
            document.head.appendChild(script2);
        });
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;

        // Buscar nome da liga
        let ligaNome = 'Liga';
        try {
            const ligaRes = await fetch(`/api/ligas/${ligaId}`);
            const ligaData = await ligaRes.json();
            ligaNome = ligaData.nome || 'Liga';
        } catch (e) {
            console.warn('[PDF] Erro ao buscar nome da liga:', e);
        }

        // ========== HEADER ==========
        doc.setFillColor(30, 30, 30);
        doc.rect(0, 0, pageWidth, 35, 'F');

        doc.setTextColor(255, 140, 0);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('SUPER CARTOLA', margin, 15);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text(`Lista de Participantes - ${temporada}`, margin, 24);

        doc.setFontSize(10);
        doc.setTextColor(180, 180, 180);
        doc.text(ligaNome, margin, 31);

        // Data de geração
        const dataGeracao = new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        doc.text(`Gerado em: ${dataGeracao}`, pageWidth - margin, 31, { align: 'right' });

        // ========== TABELA ==========
        const tableData = participantes.map((p, idx) => [
            String(idx + 1).padStart(2, '0'),
            p.nome_cartoleiro || 'N/D',
            p.nome_time || 'N/D',
            String(p.time_id),
            p.ativo !== false ? 'Ativo' : 'Inativo'
        ]);

        doc.autoTable({
            startY: 42,
            head: [['#', 'Cartoleiro', 'Nome do Time', 'ID Cartola', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [255, 140, 0],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 10,
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [50, 50, 50]
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 50 },
                2: { cellWidth: 50 },
                3: { halign: 'center', cellWidth: 30 },
                4: { halign: 'center', cellWidth: 20 }
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: margin, right: margin },
            didDrawPage: function(data) {
                // Footer em cada página
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Página ${data.pageNumber} de ${pageCount}`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }
        });

        // ========== RESUMO ==========
        const finalY = doc.lastAutoTable.finalY + 10;
        const ativos = participantes.filter(p => p.ativo !== false).length;
        const inativos = participantes.length - ativos;

        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Total: ${participantes.length} participantes`, margin, finalY);
        doc.text(`Ativos: ${ativos} | Inativos: ${inativos}`, margin, finalY + 5);

        // ========== SALVAR ==========
        const nomeArquivo = `participantes_${ligaNome.replace(/\s+/g, '_')}_${temporada}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(nomeArquivo);

        mostrarToast(`PDF exportado: ${participantes.length} participantes`, 'success');
        console.log(`[PDF] Exportado: ${nomeArquivo}`);

    } catch (error) {
        console.error('[PDF] Erro ao gerar:', error);
        mostrarToast('Erro ao gerar PDF: ' + error.message, 'error');
    }
};

console.log("[PARTICIPANTES] ✅ Exportação PDF disponível");
