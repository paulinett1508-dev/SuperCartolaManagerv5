// =====================================================================
// PARTICIPANTE-LUVA-OURO.JS - v2.0 (CORRIGIDO COM EXPORT)
// =====================================================================

console.log("[PARTICIPANTE-LUVA-OURO] 🔄 Carregando módulo v2.0...");

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarLuvaOuroParticipante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PARTICIPANTE-LUVA-OURO] 🚀 Inicializando...", {
        ligaId,
        timeId,
    });

    try {
        const response = await fetch(`/api/ligas/${ligaId}/luva-de-ouro`);
        if (!response.ok) {
            throw new Error("Erro ao buscar dados da Luva de Ouro");
        }

        const data = await response.json();
        renderizarLuvaOuro(data, timeId);
    } catch (error) {
        console.error("[PARTICIPANTE-LUVA-OURO] ❌ Erro:", error);
        mostrarErro(error.message);
    }
}

// Também expor no window para compatibilidade
window.inicializarLuvaOuroParticipante = inicializarLuvaOuroParticipante;

// =====================================================================
// RENDERIZAÇÃO
// =====================================================================
function renderizarLuvaOuro(data, meuTimeId) {
    const container = document.getElementById("luvaOuroContainer");
    if (!container) {
        console.error("[PARTICIPANTE-LUVA-OURO] ❌ Container não encontrado");
        return;
    }

    // Verificar se há edições
    if (!data.edicoes || data.edicoes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(255, 215, 0, 0.3);">
                <div style="font-size: 64px; margin-bottom: 16px;">🧤</div>
                <h3 style="color: #fff; margin-bottom: 12px;">Luva de Ouro Não Disponível</h3>
                <p style="color: #999;">Nenhuma edição da Luva de Ouro foi configurada ainda.</p>
            </div>
        `;
        return;
    }

    // Renderizar
    let html = `<div style="padding: 20px;">
        <h2 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 800; color: #fff;">🧤 Luva de Ouro</h2>
    `;

    // Cards das edições
    data.edicoes.forEach((edicao, index) => {
        const ranking = edicao.ranking || [];
        const campeao = ranking[0];
        const minhaPosicao = ranking.findIndex(
            (r) => String(r.timeId) === String(meuTimeId),
        );
        const minhaColocacao = minhaPosicao >= 0 ? minhaPosicao + 1 : null;

        html += `
            <div style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 215, 0, 0.03) 100%); border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid rgba(255, 215, 0, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffd700;">
                        🧤 ${edicao.nome || `Edição ${index + 1}`}
                    </h3>
                    <span style="background: ${edicao.status === "concluida" ? "rgba(34, 197, 94, 0.2)" : "rgba(59, 130, 246, 0.2)"}; color: ${edicao.status === "concluida" ? "#22c55e" : "#3b82f6"}; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                        ${edicao.status === "concluida" ? "✓ Concluída" : "⏳ Em Andamento"}
                    </span>
                </div>

                ${
                    campeao
                        ? `
                    <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid rgba(255, 215, 0, 0.3); border-radius: 10px; padding: 16px; margin-bottom: 16px;">
                        <div style="text-align: center;">
                            <div style="font-size: 32px; margin-bottom: 8px;">👑</div>
                            <div style="font-size: 12px; color: #ffd700; margin-bottom: 4px; font-weight: 600;">CAMPEÃO</div>
                            <div style="font-size: 18px; font-weight: 700; color: #fff;">${campeao.nomeTime || campeao.nome_time || "N/D"}</div>
                            <div style="font-size: 24px; font-weight: 900; color: #ffd700; margin-top: 8px;">
                                ${Number(campeao.pontos || campeao.defesas || 0).toLocaleString("pt-BR")} ${campeao.defesas !== undefined ? "defesas" : "pts"}
                            </div>
                        </div>
                    </div>
                `
                        : ""
                }

                ${
                    minhaColocacao
                        ? `
                    <div style="background: ${minhaColocacao === 1 ? "rgba(255, 215, 0, 0.15)" : "rgba(34, 197, 94, 0.1)"}; border: 2px solid ${minhaColocacao === 1 ? "rgba(255, 215, 0, 0.4)" : "rgba(34, 197, 94, 0.3)"}; border-radius: 10px; padding: 12px; margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 12px; color: #22c55e; font-weight: 600;">SUA POSIÇÃO</div>
                                <div style="font-size: 20px; font-weight: 800; color: #fff;">${minhaColocacao}º lugar</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 12px; color: #999;">Pontuação</div>
                                <div style="font-size: 18px; font-weight: 700; color: #22c55e;">
                                    ${Number(ranking[minhaPosicao]?.pontos || ranking[minhaPosicao]?.defesas || 0).toLocaleString("pt-BR")}
                                </div>
                            </div>
                        </div>
                    </div>
                `
                        : `
                    <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: center;">
                        <span style="color: #666; font-size: 14px;">Você não participou desta edição</span>
                    </div>
                `
                }

                <!-- Top 5 -->
                <div style="background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden;">
                    <div style="background: rgba(255, 215, 0, 0.1); padding: 10px 12px; border-bottom: 1px solid rgba(255, 215, 0, 0.2);">
                        <span style="font-size: 13px; font-weight: 700; color: #ffd700;">🏆 TOP 5</span>
                    </div>
                    ${ranking
                        .slice(0, 5)
                        .map((time, idx) => {
                            const isMeuTime =
                                String(time.timeId) === String(meuTimeId);
                            const pos = idx + 1;
                            const medalha =
                                pos === 1
                                    ? "🥇"
                                    : pos === 2
                                      ? "🥈"
                                      : pos === 3
                                        ? "🥉"
                                        : `${pos}º`;

                            return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); ${isMeuTime ? "background: rgba(34, 197, 94, 0.1);" : ""}">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 16px; width: 28px;">${medalha}</span>
                                    <span style="color: ${isMeuTime ? "#22c55e" : "#fff"}; font-weight: ${isMeuTime ? "700" : "500"};">${time.nomeTime || time.nome_time || "N/D"}</span>
                                </div>
                                <span style="color: #ffd700; font-weight: 700;">${Number(time.pontos || time.defesas || 0).toLocaleString("pt-BR")}</span>
                            </div>
                        `;
                        })
                        .join("")}
                </div>
            </div>
        `;
    });

    html += "</div>";
    container.innerHTML = html;
}

// =====================================================================
// ERRO
// =====================================================================
function mostrarErro(mensagem) {
    const container = document.getElementById("luvaOuroContainer");
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3 style="color: #ef4444; margin-bottom: 12px;">Erro ao Carregar Luva de Ouro</h3>
                <p style="color: #e0e0e0;">${mensagem}</p>
            </div>
        `;
    }
}

console.log("[PARTICIPANTE-LUVA-OURO] ✅ Módulo v2.0 carregado");
