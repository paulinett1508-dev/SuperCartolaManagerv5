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
                                data-action="ver-dados-globo"
                                data-time-id="${timeData.id}"
                                data-nome="${(timeData.nome_cartoleiro || "").replace(/"/g, "&quot;")}"
                                data-time-nome="${(timeData.nome_time || "").replace(/"/g, "&quot;")}"
                                title="Dados do Time">
                            <span class="material-symbols-outlined">person_search</span>
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

        // ✅ EVENT DELEGATION
        container.removeEventListener("click", handleCardClick);
        container.addEventListener("click", handleCardClick);

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
    if (!btn) return;

    const action = btn.dataset.action;
    const timeId = btn.dataset.timeId;

    if (action === "toggle-status") {
        const estaAtivo = btn.dataset.ativo === "true";
        await toggleStatusParticipante(timeId, estaAtivo, btn);
    } else if (action === "gerenciar-senha") {
        const nome = btn.dataset.nome;
        await gerenciarSenhaParticipante(timeId, nome);
    } else if (action === "ver-dados-globo") {
        const nome = btn.dataset.nome;
        const timeNome = btn.dataset.timeNome;
        await verDadosGlobo(timeId, nome, timeNome, btn);
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
 * Abre modal com dados completos do participante da API Globo
 */
async function verDadosGlobo(timeId, nomeCartoleiro, nomeTime, btnElement) {
    // Feedback visual no botão
    const textoOriginal = btnElement.innerHTML;
    btnElement.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;animation:spin 1s linear infinite">sync</span> Carregando...';
    btnElement.disabled = true;

    try {
        // Buscar dados do Data Lake com histórico completo
        const response = await fetch(`/api/data-lake/raw/${timeId}?historico=true&limit=50`);
        const data = await response.json();

        // Criar modal
        const modal = criarModalDadosGlobo(timeId, nomeCartoleiro, nomeTime, data);
        document.body.appendChild(modal);

        // Animar entrada
        requestAnimationFrame(() => modal.classList.add("modal-visible"));

    } catch (error) {
        console.error("[DATA-LAKE] Erro ao buscar dados:", error);
        mostrarToast(`Erro ao buscar dados: ${error.message}`, "error");
    } finally {
        btnElement.innerHTML = textoOriginal;
        btnElement.disabled = false;
    }
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
        const response = await fetch(`/api/data-lake/raw/${timeId}?rodada=${rodada}&historico=false`);
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
                <span class="material-symbols-outlined" style="font-size:48px;color:#ef4444">wifi_off</span>
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

// Exportar para uso global
window.carregarRodadaEspecifica = carregarRodadaEspecifica;

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
 * Cria o modal de exibição dos dados da Globo
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
        const pontos = rawJson.pontos || rawJson.pontos_campeonato;

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
                ${pontos !== undefined ? `
                <div class="resumo-item">
                    <span class="resumo-icon material-symbols-outlined">star</span>
                    <div class="resumo-info">
                        <span class="resumo-label">Pontos Total</span>
                        <span class="resumo-value">${pontos.toFixed(2)}</span>
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

    // Tabs para navegação (só mostra se tem dados válidos ou se quer ver o JSON mesmo assim)
    const tabs = temDados ? `
        <div class="modal-tabs">
            <button class="tab-btn active" data-tab="resumo">
                <span class="material-symbols-outlined">dashboard</span> Resumo
            </button>
            <button class="tab-btn" data-tab="rodadas">
                <span class="material-symbols-outlined">calendar_month</span> Rodadas
            </button>
            <button class="tab-btn" data-tab="json">
                <span class="material-symbols-outlined">code</span> JSON Raw
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
                    <h4><span class="material-symbols-outlined">calendar_month</span> Selecione uma Rodada</h4>
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

    const tabJson = temDados ? `
        <div class="tab-content" data-tab-content="json">
            ${renderizarJsonViewer(rawJson)}
        </div>
    ` : "";

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
                ${temDados ? tabResumo + tabRodadas + tabJson : semDados}
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

        mostrarToast(`Sincronizado! ${data.dump.payload_size} bytes salvos.`, "success");

        // Recarregar modal com novos dados
        document.querySelector(".modal-dados-globo")?.remove();

        // Buscar e exibir novos dados
        const card = document.querySelector(`[data-time-id="${timeId}"]`);
        const nome = card?.dataset.nome || "";
        const timeNome = card?.dataset.time || "";
        const btn = card?.querySelector('[data-action="ver-dados-globo"]');

        if (btn) {
            await verDadosGlobo(timeId, nome, timeNome, btn);
        }

    } catch (error) {
        console.error("[DATA-LAKE] Erro ao sincronizar:", error);
        mostrarToast(`Erro: ${error.message}`, "error");

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

// Exportar globalmente
window.carregarParticipantesComBrasoes = carregarParticipantesComBrasoes;
window.toggleStatusParticipante = toggleStatusParticipante;
window.gerenciarSenhaParticipante = gerenciarSenhaParticipante;
window.gerarSenhaAleatoria = gerarSenhaAleatoria;
window.salvarSenhaParticipante = salvarSenhaParticipante;
window.verDadosGlobo = verDadosGlobo;
window.sincronizarComGlobo = sincronizarComGlobo;
window.copiarJsonGlobo = copiarJsonGlobo;

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
