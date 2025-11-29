// MÓDULO PARTICIPANTES - VERSÃO OTIMIZADA (Performance)

const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");

// ✅ DEBOUNCE: Evitar cliques duplicados
let operacaoEmAndamento = false;

// CONFIGURAÇÃO DOS BRASÕES
const CLUBES_CONFIG = {
    MAPEAMENTO: {
        262: { nome: "Flamengo", arquivo: "262.png" },
        263: { nome: "Botafogo", arquivo: "263.png" },
        264: { nome: "Corinthians", arquivo: "264.png" },
        266: { nome: "Fluminense", arquivo: "266.png" },
        267: { nome: "Vasco", arquivo: "267.png" },
        275: { nome: "Palmeiras", arquivo: "275.png" },
        276: { nome: "São Paulo", arquivo: "276.png" },
        277: { nome: "Santos", arquivo: "277.png" },
        283: { nome: "Cruzeiro", arquivo: "283.png" },
        292: { nome: "Atlético-MG", arquivo: "292.png" },
        344: { nome: "Atlético-GO", arquivo: "344.png" },
    },
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
        <span class="toast-icon">${tipo === "success" ? "✅" : tipo === "error" ? "❌" : "ℹ️"}</span>
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

        const resLiga = await fetch(`/api/ligas/${ligaId}`);
        if (!resLiga.ok) throw new Error("Erro ao buscar liga");
        const liga = await resLiga.json();

        if (!liga.participantes || liga.participantes.length === 0) {
            container.innerHTML = `
                <div class="participantes-empty-state">
                    <div class="empty-icon">👥</div>
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

            card.innerHTML = `
                <div class="participante-header">
                    <div class="participante-avatar">${estaAtivo ? "👤" : "⏸️"}</div>
                    <div class="participante-status ${statusClass}">
                        <span class="status-indicator"></span>
                        ${statusText}
                    </div>
                </div>

                <div class="participante-info">
                    <h4 class="participante-nome">${timeData.nome_cartoleiro || "N/D"}</h4>
                    <p class="participante-time">${timeData.nome_time || "Time N/A"}</p>
                </div>

                <div class="brasoes-container">
                    <div class="brasao-wrapper">
                        <div class="brasao-circle brasao-fantasy">
                            <img src="${BrasoesHelper.getTimeFantasyBrasao(timeData)}" 
                                 alt="Time no Cartola" 
                                 class="brasao-img"
                                 onerror="this.src='${CLUBES_CONFIG.PATHS.defaultImage}'">
                        </div>
                        <span class="brasao-label fantasy-label">Cartola</span>
                    </div>

                    <div class="brasao-separator">⚡</div>

                    <div class="brasao-wrapper">
                        <div class="brasao-circle brasao-clube ${!temClubeCoracao ? "brasao-disabled" : ""}">
                            <img src="${BrasoesHelper.getClubeBrasao(timeData.clube_id)}" 
                                 alt="Clube do Coração" 
                                 title="${BrasoesHelper.getNomeClube(timeData.clube_id)}"
                                 class="brasao-img"
                                 onerror="this.src='${CLUBES_CONFIG.PATHS.placeholder}'">
                        </div>
                        <span class="brasao-label clube-label">
                            ${temClubeCoracao ? BrasoesHelper.getNomeClube(timeData.clube_id) : "Não definido"}
                        </span>
                    </div>
                </div>

                <div class="participante-actions">
                    <button class="btn-action btn-status" 
                            data-action="toggle-status"
                            data-time-id="${timeData.id}"
                            data-ativo="${estaAtivo}"
                            title="${estaAtivo ? "Inativar participante" : "Reativar participante"}">
                        ${estaAtivo ? "⏸️ Inativar" : "▶️ Reativar"}
                    </button>
                    <button class="btn-action btn-senha"
                            data-action="gerenciar-senha"
                            data-time-id="${timeData.id}"
                            data-nome="${(timeData.nome_cartoleiro || "").replace(/"/g, "&quot;")}"
                            title="Gerenciar senha de acesso">
                        🔑 Senha
                    </button>
                </div>
            `;

            container.appendChild(card);
        });

        // ✅ EVENT DELEGATION
        container.removeEventListener("click", handleCardClick);
        container.addEventListener("click", handleCardClick);

        console.log(`✅ ${timesValidos.length} participantes carregados`);
    } catch (error) {
        console.error("Erro ao carregar participantes:", error);
        container.innerHTML = `
            <div class="participantes-empty-state error">
                <div class="empty-icon">❌</div>
                <div class="empty-title">Erro ao carregar</div>
                <button onclick="carregarParticipantesComBrasoes()" class="btn-retry">🔄 Tentar novamente</button>
            </div>
        `;
    } finally {
        container.dataset.loading = "false";
    }
}

// ✅ EVENT DELEGATION HANDLER
async function handleCardClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const timeId = btn.dataset.timeId;

    if (action === "toggle-status") {
        const estaAtivo = btn.dataset.ativo === "true";
        await toggleStatusParticipante(timeId, estaAtivo, btn);
    } else if (action === "gerenciar-senha") {
        const nome = btn.dataset.nome;
        await gerenciarSenhaParticipante(timeId, nome);
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
                ? "⏸️ Inativar Participante"
                : "▶️ Reativar Participante",
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
                titulo: "📅 Rodada de Desistência",
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
        btnElement.innerHTML = "⏳...";
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
    if (avatar) avatar.textContent = novoAtivo ? "👤" : "⏸️";

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
        btnStatus.innerHTML = novoAtivo ? "⏸️ Inativar" : "▶️ Reativar";
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
                    <h3>🔑 Gerenciar Senha - ${nomeCartoleiro}</h3>
                    <button class="modal-senha-close" onclick="this.closest('.modal-senha').remove()">×</button>
                </div>

                <div class="senha-status ${temSenha ? "configurada" : "nao-configurada"}">
                    ${temSenha ? "✓ Senha configurada" : "⚠ Senha não configurada"}
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

// Exportar globalmente
window.carregarParticipantesComBrasoes = carregarParticipantesComBrasoes;
window.toggleStatusParticipante = toggleStatusParticipante;
window.gerenciarSenhaParticipante = gerenciarSenhaParticipante;
window.gerarSenhaAleatoria = gerarSenhaAleatoria;
window.salvarSenhaParticipante = salvarSenhaParticipante;

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
