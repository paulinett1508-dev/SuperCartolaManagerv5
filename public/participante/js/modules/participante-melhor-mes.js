// =====================================================================
// PARTICIPANTE-MELHOR-MES.JS - v3.1 (Design PRO + Config Admin)
// =====================================================================

console.log("[MELHOR-MES-PARTICIPANTE] 🏆 Módulo v3.1 carregando...");

let ligaIdAtual = null;
let timeIdAtual = null;

// Ícones por número de edição
const edicoesIcons = {
    1: "1️⃣",
    2: "2️⃣",
    3: "3️⃣",
    4: "4️⃣",
    5: "5️⃣",
    6: "6️⃣",
    7: "7️⃣",
    8: "8️⃣",
    9: "9️⃣",
    10: "🔟",
};

// =====================================================================
// FUNÇÃO PRINCIPAL - INICIALIZAR
// =====================================================================
export async function inicializarMelhorMesParticipante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[MELHOR-MES-PARTICIPANTE] 🚀 Inicializando...", {
        ligaId,
        timeId,
    });

    if (!ligaId) {
        mostrarErro("Dados da liga não encontrados");
        return;
    }

    ligaIdAtual = ligaId;
    timeIdAtual = timeId;

    await carregarMelhorMes(ligaId, timeId);
}

// Expor no window para compatibilidade
window.inicializarMelhorMesParticipante = inicializarMelhorMesParticipante;

// =====================================================================
// CARREGAR DADOS DO BACKEND
// =====================================================================
async function carregarMelhorMes(ligaId, timeId) {
    mostrarLoading(true);

    try {
        const response = await fetch(`/api/ligas/${ligaId}/melhor-mes`);

        if (!response.ok) {
            throw new Error(`Erro ao buscar dados: ${response.status}`);
        }

        const dados = await response.json();
        console.log("[MELHOR-MES-PARTICIPANTE] ✅ Dados recebidos:", dados);

        mostrarLoading(false);

        if (!dados.edicoes || dados.edicoes.length === 0) {
            mostrarEstadoVazio(true);
            return;
        }

        renderizarMelhorMes(dados.edicoes, timeId);
    } catch (error) {
        console.error("[MELHOR-MES-PARTICIPANTE] ❌ Erro:", error);
        mostrarLoading(false);
        mostrarErro(error.message);
    }
}

// =====================================================================
// RENDERIZAR MELHOR MÊS
// =====================================================================
function renderizarMelhorMes(edicoes, meuTimeId) {
    const meuTimeIdNum = Number(meuTimeId);

    // Atualizar contador de edições
    const countEl = document.getElementById("mmEdicoesCount");
    if (countEl) {
        countEl.textContent = `${edicoes.length} ${edicoes.length === 1 ? "edição" : "edições"}`;
    }

    // Encontrar minhas conquistas
    const minhasConquistas = edicoes.filter(
        (e) => e.campeao && Number(e.campeao.timeId) === meuTimeIdNum,
    );

    // Mostrar minhas conquistas se houver
    renderizarConquistas(minhasConquistas);

    // Renderizar edições
    const container = document.getElementById("mesesGrid");
    if (!container) return;

    container.innerHTML = edicoes
        .map((edicao) => renderizarEdicao(edicao, meuTimeIdNum))
        .join("");

    // Adicionar eventos de expansão
    container.querySelectorAll(".edicao-header-pro").forEach((header) => {
        header.addEventListener("click", function () {
            const card = this.closest(".edicao-card-pro");
            const ranking = card.querySelector(".edicao-ranking-pro");

            // Fechar outros cards
            container
                .querySelectorAll(".edicao-card-pro.expanded")
                .forEach((c) => {
                    if (c !== card) {
                        c.classList.remove("expanded");
                        c.querySelector(
                            ".edicao-ranking-pro",
                        )?.classList.remove("expanded");
                    }
                });

            card.classList.toggle("expanded");
            ranking?.classList.toggle("expanded");
        });
    });

    console.log("[MELHOR-MES-PARTICIPANTE] ✅ Rankings renderizados");
}

// =====================================================================
// RENDERIZAR CONQUISTAS
// =====================================================================
function renderizarConquistas(conquistas) {
    const container = document.getElementById("mmConquistas");
    const texto = document.getElementById("conquistasTexto");
    const meses = document.getElementById("conquistasMeses");

    if (!container || !texto || !meses) return;

    if (conquistas.length === 0) {
        container.style.display = "none";
        return;
    }

    container.style.display = "block";
    texto.textContent = `Você foi campeão ${conquistas.length}x!`;

    meses.innerHTML = conquistas
        .map((e) => `<span class="mes-chip-pro">${e.nome}</span>`)
        .join("");
}

// =====================================================================
// RENDERIZAR EDIÇÃO INDIVIDUAL
// =====================================================================
function renderizarEdicao(edicao, meuTimeIdNum) {
    const campeao = edicao.campeao;
    const souCampeao = campeao && Number(campeao.timeId) === meuTimeIdNum;

    // Status - aceita tanto "consolidado" quanto "concluido"
    let statusClass = "aguardando";
    let statusIcon = "📅";
    let statusText = "AGUARDANDO";

    if (edicao.status === "consolidado" || edicao.status === "concluido") {
        statusClass = "concluido";
        statusIcon = "✓";
        statusText = "CONCLUÍDO";
    } else if (edicao.status === "em_andamento") {
        statusClass = "em_andamento";
        statusIcon = "⏳";
        statusText = "EM ANDAMENTO";
    }

    // Ícone da edição
    const edicaoIcon = edicoesIcons[edicao.id] || `📅`;

    // Pontos formatados
    const pontosFormatados = campeao
        ? campeao.pontos_total.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })
        : "0,00";

    // Label do campeão
    let campeaoLabel = "CAMPEÃO";
    let campeaoIcon = "🏆";
    if (edicao.status === "em_andamento") {
        campeaoLabel = "LÍDER ATUAL";
        campeaoIcon = "📊";
    }
    if (souCampeao) {
        campeaoLabel = "VOCÊ É O CAMPEÃO!";
        campeaoIcon = "🎖️";
    }

    // Rodadas info
    const rodadasInfo =
        edicao.inicio && edicao.fim ? `R${edicao.inicio}-R${edicao.fim}` : "";

    return `
        <div class="edicao-card-pro ${souCampeao ? "meu-titulo" : ""}">
            <div class="edicao-header-pro">
                <div class="edicao-info-pro">
                    <div class="edicao-icon-box">${edicaoIcon}</div>
                    <div>
                        <span class="edicao-nome-pro">${edicao.nome}</span>
                        ${rodadasInfo ? `<span class="edicao-rodadas-info">${rodadasInfo}</span>` : ""}
                    </div>
                </div>
                <div class="edicao-controls">
                    <span class="status-badge ${statusClass}">
                        <span>${statusIcon}</span>
                        <span>${statusText}</span>
                    </span>
                    <span class="expand-icon-pro">▼</span>
                </div>
            </div>

            ${
                campeao
                    ? `
                <div class="edicao-campeao-pro ${souCampeao ? "meu-titulo" : ""}">
                    <div class="campeao-info-pro">
                        <span class="campeao-emoji">${campeaoIcon}</span>
                        <div>
                            <div class="campeao-label-pro">${campeaoLabel}</div>
                            <div class="campeao-nome-pro">${campeao.nome_time}</div>
                        </div>
                    </div>
                    <div class="campeao-pontos-pro">${pontosFormatados}</div>
                </div>
            `
                    : `
                <div class="edicao-aguardando">
                    <span class="aguardando-emoji">⏳</span>
                    <span class="aguardando-texto">Em disputa...</span>
                </div>
            `
            }

            <!-- Ranking expandível -->
            <div class="edicao-ranking-pro">
                ${renderizarRankingEdicao(edicao.ranking, meuTimeIdNum)}
            </div>
        </div>
    `;
}

// =====================================================================
// RENDERIZAR RANKING DA EDIÇÃO
// =====================================================================
function renderizarRankingEdicao(ranking, meuTimeIdNum) {
    if (!ranking || ranking.length === 0) {
        return `
            <div style="text-align: center; padding: 20px; color: #6b7280;">
                Sem dados disponíveis
            </div>
        `;
    }

    const top10 = ranking.slice(0, 10);
    const restante = ranking.length - 10;

    return `
        <table class="ranking-table-pro">
            <thead>
                <tr>
                    <th style="width: 40px;">#</th>
                    <th>Time</th>
                    <th style="width: 80px;">Pontos</th>
                </tr>
            </thead>
            <tbody>
                ${top10
                    .map((time) => {
                        const isMeuTime = Number(time.timeId) === meuTimeIdNum;
                        const pts = time.pontos_total.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        });
                        return `
                        <tr class="${isMeuTime ? "meu-time" : ""}">
                            <td>${time.posicao}º</td>
                            <td>${time.nome_time}</td>
                            <td>${pts}</td>
                        </tr>
                    `;
                    })
                    .join("")}
            </tbody>
        </table>
        ${
            restante > 0
                ? `
            <div class="ranking-mais">+${restante} participantes</div>
        `
                : ""
        }
    `;
}

// =====================================================================
// ESTADOS
// =====================================================================
function mostrarLoading(show) {
    const loading = document.getElementById("mmLoading");
    const grid = document.getElementById("mesesGrid");

    if (loading) loading.style.display = show ? "flex" : "none";
    if (grid) grid.style.display = show ? "none" : "flex";
}

function mostrarEstadoVazio(show) {
    const empty = document.getElementById("mmEmpty");
    const grid = document.getElementById("mesesGrid");

    if (empty) empty.style.display = show ? "block" : "none";
    if (grid) grid.style.display = show ? "none" : "flex";
}

function mostrarErro(mensagem) {
    const grid = document.getElementById("mesesGrid");
    if (grid) {
        grid.style.display = "flex";
        grid.innerHTML = `
            <div style="width: 100%; text-align: center; padding: 40px; color: #ef4444;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3 style="color: #f87171; margin-bottom: 8px;">Erro ao Carregar</h3>
                <p style="color: #9ca3af; margin: 12px 0;">${mensagem}</p>
                <button onclick="window.inicializarMelhorMesParticipante({ligaId: '${ligaIdAtual}', timeId: '${timeIdAtual}'})" 
                        style="margin-top: 16px; padding: 12px 24px; background: #E65100; 
                               color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function mostrarToast(msg) {
    const toast = document.getElementById("toastMM");
    const msgEl = document.getElementById("toastMMMsg");

    if (toast && msgEl) {
        msgEl.textContent = msg;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
}

console.log("[MELHOR-MES-PARTICIPANTE] ✅ Módulo v3.1 carregado");
