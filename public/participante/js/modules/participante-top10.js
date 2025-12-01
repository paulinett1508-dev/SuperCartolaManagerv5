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

        // Processar estrutura de dados
        let times = [];

        if (Array.isArray(dados)) {
            // Formato: array direto de times
            times = dados;
        } else if (dados && typeof dados === "object") {
            // Formato: objeto com rodadas como keys {1: [], 2: [], ..., 35: []}
            const rodadas = Object.keys(dados)
                .map(Number)
                .filter((n) => !isNaN(n));

            if (rodadas.length > 0) {
                // Pegar a última rodada disponível
                const ultimaRodada = Math.max(...rodadas);
                times = dados[ultimaRodada] || [];
                console.log(
                    `[PARTICIPANTE-TOP10] 📊 Usando rodada ${ultimaRodada} com ${times.length} times`,
                );
            }
        }

        if (times.length === 0) {
            throw new Error("Nenhum dado disponível");
        }

        // Ordenar por pontos (caso não venha ordenado) e pegar top 10
        times.sort((a, b) => (b.pontos || 0) - (a.pontos || 0));
        const top10 = times.slice(0, 10);

        console.log(`[PARTICIPANTE-TOP10] ✅ ${top10.length} times no TOP 10`);
        renderizarTop10(top10, timeId);
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

    const meuTimeIdNum = Number(meuTimeId);
    const totalTimes = times.length;

    const html = times
        .map((time, index) => {
            const posicao = index + 1;
            const timeIdNum = Number(time.time_id || time.timeId);
            const isMeuTime = timeIdNum === meuTimeIdNum;

            // Definir badges e zonas
            let badgeHTML = "";
            let cardClass = "top10-card";

            if (posicao === 1) {
                badgeHTML =
                    '<div class="badge-especial badge-mito">🔥 MITO</div>';
                cardClass += " podium-1 zona-mito";
            } else if (posicao === 2) {
                cardClass += " podium-2 zona-top3";
            } else if (posicao === 3) {
                cardClass += " podium-3 zona-top3";
            } else if (posicao === totalTimes && totalTimes >= 10) {
                badgeHTML =
                    '<div class="badge-especial badge-mico">💩 MICO</div>';
                cardClass += " zona-mico";
            } else {
                cardClass += " zona-top10";
            }

            if (isMeuTime) {
                cardClass += " meu-time";
            }

            const pontos = Number(time.pontos || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });

            const nomeTime = time.nome || time.nome_time || "N/D";
            const nomeCartola = time.nome_cartola || "";

            return `
            <div class="${cardClass}">
                ${badgeHTML}
                <div class="top10-posicao">${posicao}º</div>
                <div class="top10-nome">${nomeTime}</div>
                ${nomeCartola ? `<div style="font-size: 12px; color: #999; margin-bottom: 8px;">${nomeCartola}</div>` : ""}
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
