// =====================================================
// MÓDULO: RANKING PARTICIPANTE - v3.2 PRO
// Usa API de snapshots /api/ranking-turno
// =====================================================

console.log("[PARTICIPANTE-RANKING] 🏆 Módulo v3.2 PRO carregando...");

const RANK_COLORS = {
    gold: "#facc15",
    goldBg: "rgba(250, 204, 21, 0.1)",
    silver: "#a1a1aa",
    silverBg: "rgba(161, 161, 170, 0.1)",
    bronze: "#d97706",
    bronzeBg: "rgba(217, 119, 6, 0.1)",
    primary: "#ff5c00",
    danger: "rgba(239, 68, 68, 0.15)",
};

// Estado do módulo
let estadoRanking = {
    ligaId: null,
    timeId: null,
    turnoAtivo: "geral",
    dadosAtuais: null,
};

export async function inicializarRankingParticipante(params, timeIdParam) {
    console.log("[PARTICIPANTE-RANKING] 🚀 Inicializando módulo...", params);

    let ligaId, timeId;

    if (typeof params === "object" && params !== null) {
        ligaId = params.ligaId;
        timeId = params.timeId;
    } else {
        ligaId = params;
        timeId = timeIdParam;
    }

    if (!ligaId) {
        console.error("[PARTICIPANTE-RANKING] ❌ Liga ID inválido");
        return;
    }

    estadoRanking.ligaId = ligaId;
    estadoRanking.timeId = timeId;

    console.log("[PARTICIPANTE-RANKING] 📋 Dados:", { ligaId, timeId });

    const container = document.getElementById("rankingLista");
    if (!container) {
        console.error("[PARTICIPANTE-RANKING] ❌ Container não encontrado");
        return;
    }

    configurarTabs();

    try {
        await carregarRanking(estadoRanking.turnoAtivo);
        console.log("[PARTICIPANTE-RANKING] ✅ Ranking carregado");
    } catch (error) {
        console.error("[PARTICIPANTE-RANKING] Erro:", error);
        container.innerHTML = renderizarErro();
    }
}

window.inicializarRankingParticipante = inicializarRankingParticipante;

// ===== CARREGAR RANKING VIA API =====
async function carregarRanking(turno) {
    const container = document.getElementById("rankingLista");
    const ligaId = estadoRanking.ligaId;

    // Loading
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando ranking...</p>
        </div>
    `;

    try {
        console.log(`[PARTICIPANTE-RANKING] 🌐 Buscando turno ${turno}...`);

        const response = await fetch(
            `/api/ranking-turno/${ligaId}?turno=${turno}`,
        );
        const data = await response.json();

        if (!data.success || !data.ranking) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">event_busy</span>
                    <p>Sem dados para este turno</p>
                </div>
            `;
            return;
        }

        estadoRanking.dadosAtuais = data;

        console.log(
            `[PARTICIPANTE-RANKING] ✅ ${data.total_times} times - Status: ${data.status}`,
        );

        renderizarRankingPro(container, data.ranking);
    } catch (error) {
        console.error("[PARTICIPANTE-RANKING] Erro:", error);
        container.innerHTML = renderizarErro();
    }
}

// ===== CONFIGURAR TABS =====
function configurarTabs() {
    const tabs = document.querySelectorAll(".ranking-tabs .tab-btn");

    tabs.forEach((tab) => {
        tab.addEventListener("click", async () => {
            tabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");

            estadoRanking.turnoAtivo = tab.dataset.turno;
            await carregarRanking(estadoRanking.turnoAtivo);
        });
    });
}

// ===== RENDERIZAR RANKING =====
function renderizarRankingPro(container, ranking) {
    if (!ranking || ranking.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">inbox</span>
                <p>Nenhum time encontrado</p>
            </div>
        `;
        return;
    }

    const totalTimes = ranking.length;
    const timeId = estadoRanking.timeId;

    container.innerHTML = ranking
        .map((time) => {
            const posicao = time.posicao;
            const isMeuTime = String(time.timeId) === String(timeId);
            const isPodio = posicao <= 3;
            const isZonaRebaixamento =
                posicao > totalTimes - 3 && totalTimes > 6;

            let classes = ["ranking-item"];
            if (posicao === 1) classes.push("podio-1");
            else if (posicao === 2) classes.push("podio-2");
            else if (posicao === 3) classes.push("podio-3");
            if (isMeuTime) classes.push("meu-time");
            if (isZonaRebaixamento && !isPodio)
                classes.push("zona-rebaixamento");

            const pontosFormatados = parseFloat(time.pontos).toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                },
            );

            const podioIcon = isPodio
                ? `<span class="material-icons podio-icon">military_tech</span>`
                : "";

            return `
            <div class="${classes.join(" ")}" 
                 data-posicao="${posicao}"
                 data-time-id="${time.timeId}"
                 ${isPodio ? `onclick="mostrarPremiacaoPro(${posicao})"` : ""}>
                <div class="posicao-container">
                    <span class="posicao-badge">${posicao}</span>
                    ${podioIcon}
                </div>
                <div class="time-info-container">
                    <span class="time-nome">${time.nome_time || "Time"}</span>
                    <span class="time-cartoleiro">${time.nome_cartola || "Cartoleiro"}</span>
                </div>
                <div class="pontos-valor">${pontosFormatados}</div>
            </div>
        `;
        })
        .join("");

    // Scroll para meu time
    setTimeout(() => {
        const meuTimeEl = container.querySelector(".meu-time");
        if (meuTimeEl) {
            const containerRect = container.getBoundingClientRect();
            const itemRect = meuTimeEl.getBoundingClientRect();

            if (
                itemRect.top > containerRect.bottom ||
                itemRect.bottom < containerRect.top
            ) {
                meuTimeEl.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
        }
    }, 100);
}

// ===== ERRO =====
function renderizarErro() {
    return `
        <div class="loading-state">
            <span class="material-icons" style="font-size: 48px; color: #ef4444;">error_outline</span>
            <p style="color: #ef4444;">Erro ao carregar ranking</p>
            <button onclick="location.reload()" 
                    style="margin-top: 16px; padding: 10px 20px; background: ${RANK_COLORS.primary}; 
                           color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                <span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">refresh</span>
                Tentar Novamente
            </button>
        </div>
    `;
}

// ===== COMPARTILHAR =====
window.compartilharRanking = async function () {
    const turnoLabel = { geral: "Geral", 1: "1º Turno", 2: "2º Turno" };
    const texto = `🏆 Ranking ${turnoLabel[estadoRanking.turnoAtivo]} - Super Cartola Manager`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: "Ranking da Liga",
                text: texto,
                url: window.location.href,
            });
        } catch (err) {
            if (err.name !== "AbortError") copiarParaClipboard(texto);
        }
    } else {
        copiarParaClipboard(texto);
    }
};

function copiarParaClipboard(texto) {
    navigator.clipboard
        .writeText(texto + "\n" + window.location.href)
        .then(() => {
            mostrarToast("Link copiado!");
        });
}

function mostrarToast(mensagem) {
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px;
        font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 500;
        z-index: 10000; animation: fadeInUp 0.3s ease;
    `;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ===== MODAL DE PREMIAÇÕES =====
window.mostrarPremiacaoPro = function (posicaoClicada) {
    const existente = document.getElementById("modalPremiacoes");
    if (existente) existente.remove();

    const premiacoes = [
        {
            posicao: 1,
            label: "CAMPEÃO",
            valor: "R$ 1.000,00",
            icon: "emoji_events",
            cor: RANK_COLORS.gold,
        },
        {
            posicao: 2,
            label: "2º LUGAR",
            valor: "R$ 700,00",
            icon: "military_tech",
            cor: RANK_COLORS.silver,
        },
        {
            posicao: 3,
            label: "3º LUGAR",
            valor: "R$ 400,00",
            icon: "military_tech",
            cor: RANK_COLORS.bronze,
        },
    ];

    const modal = document.createElement("div");
    modal.id = "modalPremiacoes";
    modal.innerHTML = `
        <style>
            #modalPremiacoes {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.9); display: flex; align-items: center;
                justify-content: center; z-index: 10000; padding: 20px;
                backdrop-filter: blur(8px); animation: fadeIn 0.2s ease;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            #modalPremiacoes .modal-content {
                background: linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%);
                border-radius: 20px; padding: 28px 24px; max-width: 400px; width: 100%;
                text-align: center; border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); animation: slideUp 0.3s ease;
            }
            #modalPremiacoes .modal-header { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 24px; }
            #modalPremiacoes .modal-header .material-icons { font-size: 28px; color: ${RANK_COLORS.gold}; }
            #modalPremiacoes .modal-header h2 { font-size: 20px; font-weight: 700; color: #fff; margin: 0; }
            #modalPremiacoes .premiacao-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 14px; margin-bottom: 12px; transition: transform 0.2s ease; }
            #modalPremiacoes .premiacao-item.destaque { transform: scale(1.02); }
            #modalPremiacoes .premiacao-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
            #modalPremiacoes .premiacao-icon .material-icons { font-size: 28px; }
            #modalPremiacoes .premiacao-info { flex: 1; text-align: left; }
            #modalPremiacoes .premiacao-label { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
            #modalPremiacoes .premiacao-valor { font-size: 20px; font-weight: 800; color: #22c55e; }
            #modalPremiacoes .total-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
            #modalPremiacoes .total-text { font-size: 13px; color: rgba(255, 255, 255, 0.6); }
            #modalPremiacoes .total-valor { font-size: 18px; font-weight: 700; color: #22c55e; }
            #modalPremiacoes .btn-fechar { margin-top: 20px; padding: 12px 32px; background: ${RANK_COLORS.primary}; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
            #modalPremiacoes .btn-fechar:active { transform: scale(0.98); }
        </style>
        <div class="modal-content" onclick="event.stopPropagation()">
            <div class="modal-header">
                <span class="material-icons">emoji_events</span>
                <h2>Premiações da Liga</h2>
            </div>
            ${premiacoes
                .map((p) => {
                    const isDestaque = p.posicao === posicaoClicada;
                    const bgColor =
                        p.posicao === 1
                            ? RANK_COLORS.goldBg
                            : p.posicao === 2
                              ? RANK_COLORS.silverBg
                              : RANK_COLORS.bronzeBg;
                    const borderColor = isDestaque ? p.cor : "transparent";
                    return `
                    <div class="premiacao-item ${isDestaque ? "destaque" : ""}" style="background: ${bgColor}; border: 2px solid ${borderColor};">
                        <div class="premiacao-icon" style="background: ${p.cor}20;">
                            <span class="material-icons" style="color: ${p.cor};">${p.icon}</span>
                        </div>
                        <div class="premiacao-info">
                            <div class="premiacao-label" style="color: ${p.cor};">${p.label}</div>
                            <div class="premiacao-valor">${p.valor}</div>
                        </div>
                    </div>
                `;
                })
                .join("")}
            <div class="total-section">
                <span class="total-text">💰 Total em prêmios:</span>
                <span class="total-valor"> R$ 2.100,00</span>
            </div>
            <button class="btn-fechar" onclick="document.getElementById('modalPremiacoes').remove()">Fechar</button>
        </div>
    `;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
};

console.log("[PARTICIPANTE-RANKING] ✅ Módulo v3.2 PRO carregado");
