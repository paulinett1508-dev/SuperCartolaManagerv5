// =====================================================================
// PARTICIPANTE-TOP10.JS - v2.0 (CORRIGIDO COM EXPORT)
// =====================================================================

console.log("[PARTICIPANTE-TOP10] 🔄 Carregando módulo v2.0...");

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarTop10Participante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PARTICIPANTE-TOP10] 🚀 Inicializando...", { ligaId, timeId });

    try {
        const response = await fetch(`/api/ligas/${ligaId}/top10`);
        if (!response.ok) {
            throw new Error("Erro ao buscar TOP 10");
        }

        const dados = await response.json();

        // Validar e extrair array de times
        let times = [];
        if (Array.isArray(dados)) {
            times = dados;
        } else if (dados && Array.isArray(dados.times)) {
            times = dados.times;
        } else if (dados && typeof dados === "object") {
            // Pode ser objeto com rodadas como chaves
            console.log(
                "[PARTICIPANTE-TOP10] Estrutura de dados:",
                Object.keys(dados),
            );
            times = Object.values(dados)
                .flat()
                .filter((item) => item && typeof item === "object");
        }

        console.log(
            `[PARTICIPANTE-TOP10] ✅ ${times.length} times processados`,
        );
        renderizarTop10(times, timeId);
    } catch (error) {
        console.error("[PARTICIPANTE-TOP10] ❌ Erro:", error);
        mostrarErro(error.message);
    }
}

// Também expor no window para compatibilidade
window.inicializarTop10Participante = inicializarTop10Participante;

// =====================================================================
// RENDERIZAÇÃO
// =====================================================================
function renderizarTop10(times, meuTimeId) {
    const container = document.getElementById("top10Grid");

    if (!container) {
        console.error("[PARTICIPANTE-TOP10] ❌ Container não encontrado");
        return;
    }

    if (!Array.isArray(times) || times.length === 0) {
        container.innerHTML =
            '<p style="text-align: center; color: #999; padding: 40px;">Nenhum dado disponível</p>';
        return;
    }

    const top10 = times.slice(0, 10);
    const totalTimes = top10.length;
    const meuTimeIdNum = Number(meuTimeId);

    const html = top10
        .map((time, index) => {
            const posicao = index + 1;
            const timeIdNum = Number(time.time_id || time.timeId);
            let badgeClass = "";
            let badge = "";

            if (posicao === 1) {
                badgeClass = "zona-mito";
                badge = '<div class="badge-especial badge-mito">MITO 🔥</div>';
            } else if (posicao === totalTimes && totalTimes >= 10) {
                badgeClass = "zona-mico";
                badge = '<div class="badge-especial badge-mico">MICO 💩</div>';
            } else if (posicao <= 3) {
                badgeClass = "zona-top3";
            } else if (posicao <= 6) {
                badgeClass = "zona-top10";
            }

            const podiumClass = posicao <= 3 ? `podium-${posicao}` : "";
            const meuTime = timeIdNum === meuTimeIdNum ? "meu-time" : "";
            const premiacaoClick =
                posicao <= 3
                    ? `onclick="window.mostrarPremiacaoTop10(${posicao})"`
                    : "";
            const cursorStyle = posicao <= 3 ? 'style="cursor: pointer;"' : "";

            const pontos = Number(time.pontos || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });

            return `
            <div class="top10-card ${podiumClass} ${badgeClass} ${meuTime}" ${cursorStyle}>
                ${badge}
                <div class="top10-posicao" ${premiacaoClick}>${posicao}º</div>
                <div class="top10-nome">${time.nome || time.nome_time || "N/D"}</div>
                <div class="top10-pontos">${pontos} pts</div>
            </div>
        `;
        })
        .join("");

    container.innerHTML = html;
}

// =====================================================================
// MODAL PREMIAÇÃO
// =====================================================================
window.mostrarPremiacaoTop10 = function (posicao) {
    const premiacoes = {
        1: { titulo: "🥇 CAMPEÃO", premio: "R$ 1.000,00" },
        2: { titulo: "🥈 2º LUGAR", premio: "R$ 700,00" },
        3: { titulo: "🥉 3º LUGAR", premio: "R$ 400,00" },
    };

    if (!premiacoes[posicao]) return;

    const { titulo, premio } = premiacoes[posicao];
    alert(`${titulo}\n${premio}`);
};

// =====================================================================
// ERRO
// =====================================================================
function mostrarErro(mensagem) {
    const container = document.getElementById("top10Grid");
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <h3>❌ Erro ao Carregar TOP 10</h3>
                <p>${mensagem}</p>
            </div>
        `;
    }
}

console.log("[PARTICIPANTE-TOP10] ✅ Módulo v2.0 carregado");
