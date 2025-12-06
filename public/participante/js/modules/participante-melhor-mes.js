// =====================================================================
// PARTICIPANTE-MELHOR-MES.JS - v3.3 (Suporte a participantes inativos)
// =====================================================================

console.log("[MELHOR-MES-PARTICIPANTE] 🏆 Módulo v3.3 carregando...");

let ligaIdAtual = null;
let timeIdAtual = null;

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
    console.log("[MELHOR-MES-PARTICIPANTE] 🚀 Inicializando v3.3...", {
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

    const countEl = document.getElementById("mmEdicoesCount");
    if (countEl) {
        countEl.textContent = `${edicoes.length} ${edicoes.length === 1 ? "edição" : "edições"}`;
    }

    // ✅ v3.3: Filtrar apenas campeões ativos
    const minhasConquistas = edicoes.filter(
        (e) =>
            e.campeao &&
            Number(e.campeao.timeId) === meuTimeIdNum &&
            e.campeao.ativo !== false,
    );

    renderizarConquistas(minhasConquistas);

    const container = document.getElementById("mesesGrid");
    if (!container) return;

    container.innerHTML = edicoes
        .map((edicao) => renderizarEdicaoCard(edicao, meuTimeIdNum))
        .join("");

    container.querySelectorAll(".mm-card-expand-btn").forEach((btn) => {
        btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const card = this.closest(".mm-edicao-card");
            const ranking = card.querySelector(".mm-ranking-expandido");
            const icon = this.querySelector(".expand-arrow");

            if (ranking.style.display === "none" || !ranking.style.display) {
                ranking.style.display = "block";
                icon.style.transform = "rotate(180deg)";
            } else {
                ranking.style.display = "none";
                icon.style.transform = "rotate(0deg)";
            }
        });
    });

    console.log("[MELHOR-MES-PARTICIPANTE] ✅ Cards renderizados");
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
// RENDERIZAR EDIÇÃO EM CARD
// =====================================================================
function renderizarEdicaoCard(edicao, meuTimeIdNum) {
    const campeao = edicao.campeao;
    // ✅ v3.3: Só considerar "sou campeão" se estiver ativo
    const souCampeao =
        campeao &&
        Number(campeao.timeId) === meuTimeIdNum &&
        campeao.ativo !== false;

    let statusClass = "aguardando";
    let statusIcon = "📅";
    let statusText = "AGUARDANDO";
    let statusBgClass = "bg-zinc-700/50";

    if (edicao.status === "consolidado" || edicao.status === "concluido") {
        statusClass = "concluido";
        statusIcon = "✓";
        statusText = "CONCLUÍDO";
        statusBgClass = "bg-green-500/20 text-green-400";
    } else if (edicao.status === "em_andamento") {
        statusClass = "em_andamento";
        statusIcon = "⏳";
        statusText = "EM ANDAMENTO";
        statusBgClass = "bg-blue-500/20 text-blue-400";
    }

    const edicaoIcon = edicoesIcons[edicao.id] || `📅`;
    const pontosFormatados = campeao
        ? campeao.pontos_total.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })
        : "0,00";
    const rodadasInfo =
        edicao.inicio && edicao.fim ? `R${edicao.inicio} - R${edicao.fim}` : "";

    // ✅ v3.3: Top 3 apenas ativos
    const rankingAtivos = edicao.ranking
        ? edicao.ranking.filter((t) => t.ativo !== false)
        : [];
    const top3 = rankingAtivos.slice(0, 3);

    return `
        <div class="mm-edicao-card ${souCampeao ? "meu-titulo" : ""}">
            <!-- Header do Card -->
            <div class="mm-card-header">
                <div class="mm-card-icon">${edicaoIcon}</div>
                <div class="mm-card-info">
                    <h3 class="mm-card-title">${edicao.nome}</h3>
                    ${rodadasInfo ? `<span class="mm-card-rodadas">${rodadasInfo}</span>` : ""}
                </div>
                <span class="mm-card-status ${statusBgClass}">
                    ${statusIcon} ${statusText}
                </span>
            </div>

            <!-- Campeão ou Aguardando -->
            ${
                campeao
                    ? `
                <div class="mm-card-campeao ${souCampeao ? "meu" : ""} ${campeao.ativo === false ? "inativo" : ""}">
                    <div class="mm-campeao-badge">
                        <span class="mm-campeao-icon">${souCampeao ? "🎖️" : "🏆"}</span>
                        <span class="mm-campeao-label">${souCampeao ? "VOCÊ É O CAMPEÃO!" : "CAMPEÃO"}</span>
                    </div>
                    <div class="mm-campeao-info">
                        <span class="mm-campeao-nome">${campeao.nome_time}</span>
                        <span class="mm-campeao-pontos">${pontosFormatados} pts</span>
                    </div>
                </div>
            `
                    : `
                <div class="mm-card-aguardando">
                    <span class="mm-aguardando-icon">⏳</span>
                    <span class="mm-aguardando-text">Em disputa...</span>
                </div>
            `
            }

            <!-- Pódio Compacto -->
            ${
                top3.length > 0
                    ? `
                <div class="mm-card-podio">
                    ${top3
                        .map((time, idx) => {
                            const isMeu =
                                Number(time.timeId) === meuTimeIdNum &&
                                time.ativo !== false;
                            const medalha =
                                idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                            const pts = time.pontos_total.toLocaleString(
                                "pt-BR",
                                {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1,
                                },
                            );
                            return `
                            <div class="mm-podio-item ${isMeu ? "meu" : ""}">
                                <span class="mm-podio-medal">${medalha}</span>
                                <span class="mm-podio-nome">${truncarNome(time.nome_time, 12)}</span>
                                <span class="mm-podio-pts">${pts}</span>
                            </div>
                        `;
                        })
                        .join("")}
                </div>
            `
                    : ""
            }

            <!-- Botão Expandir Ranking -->
            ${
                edicao.ranking && edicao.ranking.length > 3
                    ? `
                <button class="mm-card-expand-btn">
                    <span>Ver ranking completo (${edicao.ranking.length})</span>
                    <span class="expand-arrow material-icons">expand_more</span>
                </button>

                <!-- Ranking Expandido -->
                <div class="mm-ranking-expandido" style="display: none;">
                    ${renderizarRankingCards(edicao.ranking, meuTimeIdNum)}
                </div>
            `
                    : ""
            }
        </div>

        <style>
            .mm-card-campeao.inativo {
                opacity: 0.5;
                filter: grayscale(60%);
            }
            .mm-ranking-card-item.inativo {
                opacity: 0.5;
                filter: grayscale(60%);
            }
            .mm-ranking-card-item.inativo .mm-rank-pos { color: #6b7280; }
            .mm-ranking-card-item.inativo .mm-rank-nome { color: #6b7280; }
            .mm-ranking-card-item.inativo .mm-rank-pts { color: #6b7280; }
            .mm-ranking-divisor-inativos {
                background: rgba(63, 63, 70, 0.5);
                border-top: 1px solid #3f3f46;
                padding: 8px 12px;
                font-size: 10px;
                color: #6b7280;
                font-weight: 500;
                margin-top: 8px;
            }
        </style>
    `;
}

// =====================================================================
// RENDERIZAR RANKING EM CARDS
// =====================================================================
function renderizarRankingCards(ranking, meuTimeIdNum) {
    if (!ranking || ranking.length === 0) {
        return `<div class="mm-ranking-vazio">Sem dados disponíveis</div>`;
    }

    // ✅ v3.3: Separar ativos de inativos
    const ativos = ranking.filter((t) => t.ativo !== false);
    const inativos = ranking.filter((t) => t.ativo === false);

    // Mostrar do 4º ao 10º (top 3 já está no pódio)
    const restanteAtivos = ativos.slice(3, 10);

    let minhaPosicao = null;
    let meusDados = null;
    for (let i = 0; i < ativos.length; i++) {
        if (Number(ativos[i].timeId) === meuTimeIdNum) {
            minhaPosicao = i + 1;
            meusDados = ativos[i];
            break;
        }
    }

    let html = "";

    // Renderizar ativos (4º ao 10º)
    if (restanteAtivos.length > 0) {
        html += `<div class="mm-ranking-cards">`;
        html += restanteAtivos
            .map((time) => {
                const isMeuTime = Number(time.timeId) === meuTimeIdNum;
                const pts = time.pontos_total.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                });
                return `
                <div class="mm-ranking-card-item ${isMeuTime ? "meu" : ""}">
                    <span class="mm-rank-pos">${time.posicao}º</span>
                    <span class="mm-rank-nome">${time.nome_time}</span>
                    <span class="mm-rank-pts">${pts}</span>
                </div>
            `;
            })
            .join("");
        html += `</div>`;
    }

    // Card especial se usuário está fora do top 10
    if (minhaPosicao && minhaPosicao > 10 && meusDados) {
        const pts = meusDados.pontos_total.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        });
        html += `
            <div class="mm-ranking-minha-pos">
                <span class="mm-minha-pos-label">📍 Sua posição:</span>
                <div class="mm-ranking-card-item meu destacado">
                    <span class="mm-rank-pos">${minhaPosicao}º</span>
                    <span class="mm-rank-nome">${meusDados.nome_time}</span>
                    <span class="mm-rank-pts">${pts}</span>
                </div>
            </div>
        `;
    }

    // ✅ v3.3: Seção de inativos
    if (inativos.length > 0) {
        html += `
            <div class="mm-ranking-divisor-inativos">
                👤 Participantes Inativos (${inativos.length})
            </div>
            <div class="mm-ranking-cards">
        `;
        html += inativos
            .slice(0, 5)
            .map((time) => {
                const pts = time.pontos_total.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                });
                return `
                <div class="mm-ranking-card-item inativo">
                    <span class="mm-rank-pos">—</span>
                    <span class="mm-rank-nome">${time.nome_time}</span>
                    <span class="mm-rank-pts">${pts}</span>
                </div>
            `;
            })
            .join("");
        html += `</div>`;
    }

    if (ativos.length > 10) {
        html += `<div class="mm-ranking-mais">+${ativos.length - 10} participantes ativos</div>`;
    }

    return (
        html ||
        `<div class="mm-ranking-vazio">Apenas ${ranking.length} participantes</div>`
    );
}

// =====================================================================
// UTILS
// =====================================================================
function truncarNome(nome, max) {
    if (!nome) return "";
    return nome.length > max ? nome.substring(0, max) + "..." : nome;
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

console.log(
    "[MELHOR-MES-PARTICIPANTE] ✅ Módulo v3.3 carregado (suporte a inativos)",
);
