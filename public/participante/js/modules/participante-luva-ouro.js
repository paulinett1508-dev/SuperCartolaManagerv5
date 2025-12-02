// =====================================================================
// PARTICIPANTE-LUVA-OURO.JS - v3.4 (APENAS CAMPEÃO DESTACADO)
// =====================================================================

console.log("[PARTICIPANTE-LUVA-OURO] 🔄 Carregando módulo v3.4...");

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

    const container = document.getElementById("luvaOuroContainer");
    if (!container) {
        console.error("[PARTICIPANTE-LUVA-OURO] ❌ Container não encontrado");
        return;
    }

    try {
        const ligaRes = await fetch(`/api/ligas/${ligaId}`);
        if (ligaRes.ok) {
            const liga = await ligaRes.json();
            const modulosAtivos =
                liga.modulosAtivos || liga.modulos_ativos || {};
            const luvaAtiva = modulosAtivos.luvaOuro !== false;

            if (!luvaAtiva) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(255, 215, 0, 0.3);">
                        <div style="font-size: 64px; margin-bottom: 16px;">🧤</div>
                        <h3 style="color: #fff; margin-bottom: 12px;">Luva de Ouro</h3>
                        <p style="color: #999;">Este módulo não está ativo para esta liga.</p>
                    </div>
                `;
                return;
            }
        }

        const response = await fetch(`/api/luva-de-ouro/${ligaId}/ranking`);
        if (!response.ok) throw new Error("Dados não disponíveis");

        const responseData = await response.json();
        console.log(
            "[PARTICIPANTE-LUVA-OURO] 📦 Dados recebidos:",
            responseData,
        );

        renderizarLuvaOuro(container, responseData, timeId);
    } catch (error) {
        console.error("[PARTICIPANTE-LUVA-OURO] ❌ Erro:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(255, 215, 0, 0.3);">
                <div style="font-size: 64px; margin-bottom: 16px;">🧤</div>
                <h3 style="color: #fff; margin-bottom: 12px;">Luva de Ouro</h3>
                <p style="color: #999;">Dados não disponíveis no momento.</p>
            </div>
        `;
    }
}

window.inicializarLuvaOuroParticipante = inicializarLuvaOuroParticipante;

// =====================================================================
// HELPERS
// =====================================================================
function getNome(item) {
    return item?.participanteNome || item?.nome || "N/D";
}

function getParticipanteId(item) {
    return String(item?.participanteId || item?.timeId || "");
}

function getPontos(item) {
    const pontos = item?.pontosTotais ?? item?.pontos ?? 0;
    return typeof pontos === "number" ? pontos : parseFloat(pontos) || 0;
}

function isMyTime(item, meuTimeId) {
    return getParticipanteId(item) === String(meuTimeId);
}

// =====================================================================
// RENDERIZAÇÃO
// =====================================================================
function renderizarLuvaOuro(container, response, meuTimeId) {
    const data = response.data || response;

    let ranking = [];
    let rodadaInicio = 1;
    let rodadaFim = 36;

    if (data.ranking && Array.isArray(data.ranking)) {
        ranking = data.ranking;
        rodadaInicio = data.rodadaInicio || 1;
        rodadaFim = data.rodadaFim || 36;
    } else if (Array.isArray(data)) {
        ranking = data;
    }

    if (ranking.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(255, 215, 0, 0.3);">
                <div style="font-size: 64px; margin-bottom: 16px;">🧤</div>
                <h3 style="color: #fff; margin-bottom: 12px;">Luva de Ouro Não Disponível</h3>
                <p style="color: #999;">Nenhum dado de goleiros disponível ainda.</p>
            </div>
        `;
        return;
    }

    const campeao = ranking[0];
    const minhaPosicao = ranking.findIndex((r) => isMyTime(r, meuTimeId));
    const meusDados = minhaPosicao >= 0 ? ranking[minhaPosicao] : null;
    const minhaColocacao = minhaPosicao >= 0 ? minhaPosicao + 1 : null;

    const distanciaLider =
        campeao && meusDados ? getPontos(campeao) - getPontos(meusDados) : 0;

    // Dados ricos
    let ultimaRodadaInfo = meusDados?.ultimaRodada || null;
    let meusGoleiros = [];
    let historicoRecente = [];

    if (meusDados?.rodadas && Array.isArray(meusDados.rodadas)) {
        const rodadasOrdenadas = [...meusDados.rodadas].sort(
            (a, b) => b.rodada - a.rodada,
        );
        historicoRecente = rodadasOrdenadas.slice(0, 5);

        const goleirosMap = {};
        meusDados.rodadas.forEach((r) => {
            const nome = r.goleiroNome;
            const pontos = r.pontos || 0;
            if (nome && nome !== "Sem goleiro" && pontos > 0) {
                if (!goleirosMap[nome]) goleirosMap[nome] = { nome, pontos: 0 };
                goleirosMap[nome].pontos += pontos;
            }
        });
        meusGoleiros = Object.values(goleirosMap)
            .sort((a, b) => b.pontos - a.pontos)
            .slice(0, 3);
    }

    const html = `
    <div style="padding: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #ffd700;">
                🧤 Luva de Ouro
            </h2>
            <p style="margin: 0; color: #888; font-size: 12px;">
                Rodadas ${rodadaInicio} - ${rodadaFim}
            </p>
        </div>

        ${
            meusDados
                ? `
        <div style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%); border: 2px solid rgba(255, 215, 0, 0.4); border-radius: 16px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div>
                    <div style="font-size: 10px; color: #ffd700; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Sua Posição</div>
                    <div style="font-size: 28px; font-weight: 900; color: #fff;">${minhaColocacao}º</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 26px; font-weight: 800; color: #ffd700;">${getPontos(meusDados).toFixed(1)}</div>
                    <div style="font-size: 10px; color: #888; text-transform: uppercase;">pontos</div>
                </div>
            </div>

            ${
                minhaColocacao > 1
                    ? `
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #888; font-size: 11px;">Distância p/ líder</span>
                <span style="color: #f59e0b; font-weight: 700; font-size: 13px;">-${distanciaLider.toFixed(1)} pts</span>
            </div>
            `
                    : `
            <div style="background: linear-gradient(90deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1)); border-radius: 8px; padding: 8px 12px; text-align: center;">
                <span style="color: #ffd700; font-weight: 700; font-size: 13px;">🏆 Você é o líder!</span>
            </div>
            `
            }
        </div>

        ${
            ultimaRodadaInfo
                ? `
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="color: #3b82f6; font-size: 11px; font-weight: 700; text-transform: uppercase;">📅 Rodada ${ultimaRodadaInfo.rodada}</span>
                <span style="color: #666; font-size: 10px;">Última atualização</span>
            </div>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <div style="background: rgba(255, 215, 0, 0.15); padding: 10px 20px; border-radius: 8px; text-align: center; flex: 1;">
                    <div style="font-size: 24px; font-weight: 800; color: #ffd700;">${(ultimaRodadaInfo.pontos || 0).toFixed(1)}</div>
                    <div style="font-size: 9px; color: #888; text-transform: uppercase;">Pontos</div>
                </div>
            </div>
            ${
                ultimaRodadaInfo.goleiroNome &&
                ultimaRodadaInfo.goleiroNome !== "Sem goleiro"
                    ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                <span style="background: rgba(255, 215, 0, 0.2); color: #ffd700; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                    🧤 ${ultimaRodadaInfo.goleiroNome}
                </span>
            </div>
            `
                    : ""
            }
        </div>
        `
                : ""
        }

        ${
            meusGoleiros.length > 0
                ? `
        <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
            <div style="font-size: 11px; color: #888; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">🎯 Seus Goleiros</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${meusGoleiros
                    .map(
                        (g, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: #888; font-size: 12px; width: 20px;">${idx + 1}º</span>
                        <span style="color: #fff; font-size: 12px; font-weight: 500;">${g.nome}</span>
                    </div>
                    <span style="color: #ffd700; font-weight: 800; font-size: 14px;">${g.pontos.toFixed(1)} pts</span>
                </div>
                `,
                    )
                    .join("")}
            </div>
        </div>
        `
                : ""
        }

        ${
            historicoRecente.length > 0
                ? `
        <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
            <div style="font-size: 11px; color: #888; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">📊 Últimas Rodadas</div>
            <div style="display: flex; gap: 6px; justify-content: space-between;">
                ${historicoRecente
                    .map((r) => {
                        const pontos = r.pontos || 0;
                        const bgColor =
                            pontos >= 5
                                ? "rgba(255, 215, 0, 0.2)"
                                : pontos > 0
                                  ? "rgba(59, 130, 246, 0.15)"
                                  : "rgba(255,255,255,0.05)";
                        const textColor =
                            pontos >= 5
                                ? "#ffd700"
                                : pontos > 0
                                  ? "#3b82f6"
                                  : "#666";
                        return `
                    <div style="flex: 1; background: ${bgColor}; border-radius: 8px; padding: 8px 4px; text-align: center;">
                        <div style="font-size: 9px; color: #666; margin-bottom: 4px;">R${r.rodada}</div>
                        <div style="font-size: 14px; font-weight: 800; color: ${textColor};">${pontos.toFixed(1)}</div>
                    </div>
                    `;
                    })
                    .join("")}
            </div>
        </div>
        `
                : ""
        }
        `
                : `
        <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 20px; margin-bottom: 16px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 8px;">😢</div>
            <span style="color: #888; font-size: 14px;">Você não está no ranking</span>
        </div>
        `
        }

        ${
            campeao && (!meusDados || minhaColocacao !== 1)
                ? `
        <div style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.03) 100%); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🏆</span>
                <div>
                    <div style="font-size: 10px; color: #ffd700; font-weight: 700; text-transform: uppercase;">Líder</div>
                    <div style="font-size: 14px; font-weight: 700; color: #fff;">${getNome(campeao)}</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 800; color: #ffd700;">${getPontos(campeao).toFixed(1)}</div>
                <div style="font-size: 8px; color: #888;">pontos</div>
            </div>
        </div>
        `
                : ""
        }

        <details style="background: rgba(0,0,0,0.3); border-radius: 12px; overflow: hidden;" open>
            <summary style="background: rgba(255, 215, 0, 0.1); padding: 12px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 215, 0, 0.2);">
                <span style="font-size: 13px; font-weight: 700; color: #ffd700;">📋 Ranking Completo</span>
                <span style="font-size: 11px; color: #888;">${ranking.length} participantes</span>
            </summary>

            <div style="max-height: 300px; overflow-y: auto;">
            ${ranking
                .map((time, idx) => {
                    const isMeuTime = isMyTime(time, meuTimeId);
                    const pos = idx + 1;
                    // ✅ APENAS CAMPEÃO COM TROFÉU
                    const posicaoDisplay = pos === 1 ? "🏆" : `${pos}º`;

                    return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); ${isMeuTime ? "background: rgba(255, 215, 0, 0.15);" : ""}">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: ${pos === 1 ? "16px" : "12px"}; width: 26px; ${pos === 1 ? "" : "color: #888;"}">${posicaoDisplay}</span>
                        <span style="color: ${isMeuTime ? "#ffd700" : "#fff"}; font-weight: ${isMeuTime ? "700" : "500"}; font-size: 12px;">${getNome(time)}</span>
                    </div>
                    <span style="color: #ffd700; font-weight: 700; font-size: 13px;">${getPontos(time).toFixed(1)}</span>
                </div>
                `;
                })
                .join("")}
            </div>
        </details>
    </div>
    `;

    container.innerHTML = html;
}

console.log("[PARTICIPANTE-LUVA-OURO] ✅ Módulo v3.4 carregado");
