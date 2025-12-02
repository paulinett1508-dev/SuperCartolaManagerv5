// =====================================================================
// PARTICIPANTE-BOAS-VINDAS.JS - v3.0 (DESIGN PROFISSIONAL)
// =====================================================================

console.log("[PARTICIPANTE-BOAS-VINDAS] 🔄 Carregando módulo v3.0...");

// =====================================================================
// CONSTANTES DE DESIGN
// =====================================================================
const COLORS = {
    primary: "#ff5c00",
    primaryLight: "rgba(255, 92, 0, 0.1)",
    primaryBorder: "rgba(255, 92, 0, 0.2)",
    background: "#101010",
    surface: "#1c1c1c",
    surfaceLight: "#2a2a2a",
    textPrimary: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.7)",
    textMuted: "rgba(255, 255, 255, 0.5)",
    success: "#22c55e",
    successBg: "rgba(34, 197, 94, 0.1)",
    danger: "#ef4444",
    dangerBg: "rgba(239, 68, 68, 0.1)",
    warning: "#eab308",
    warningBg: "rgba(234, 179, 8, 0.1)",
};

// =====================================================================
// FUNÇÃO PRINCIPAL
// =====================================================================
export async function inicializarBoasVindasParticipante(params) {
    let ligaId, timeId, participante;

    if (
        typeof params === "object" &&
        params !== null &&
        !Array.isArray(params)
    ) {
        ligaId = params.ligaId;
        timeId = params.timeId;
        participante = params.participante;
    } else {
        ligaId = params;
        timeId = arguments[1];
    }

    ligaId = typeof ligaId === "string" ? ligaId : String(ligaId || "");
    timeId = typeof timeId === "string" ? timeId : String(timeId || "");

    console.log("[PARTICIPANTE-BOAS-VINDAS] 🚀 Inicializando...", {
        ligaId,
        timeId,
        participante,
    });

    if (!ligaId || ligaId === "[object Object]") {
        console.error("[PARTICIPANTE-BOAS-VINDAS] ❌ Liga ID inválido");
        return;
    }

    if (!timeId || timeId === "undefined") {
        console.error("[PARTICIPANTE-BOAS-VINDAS] ❌ Time ID inválido");
        return;
    }

    await carregarDadosERenderizar(ligaId, timeId, participante);
}

// Compatibilidade
window.inicializarBoasVindasParticipante = inicializarBoasVindasParticipante;

// =====================================================================
// CARREGAR DADOS
// =====================================================================
async function carregarDadosERenderizar(ligaId, timeId, participante) {
    const container = document.getElementById("boas-vindas-container");
    if (!container) return;

    // Loading state
    container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 300px;">
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 3px solid ${COLORS.surface}; border-top-color: ${COLORS.primary}; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                <p style="color: ${COLORS.textSecondary}; font-size: 14px;">Carregando...</p>
            </div>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    try {
        const [resLiga, resRanking, resRodadas, resExtrato] = await Promise.all(
            [
                fetch(`/api/ligas/${ligaId}`),
                fetch(`/api/ligas/${ligaId}/ranking`),
                fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`),
                fetch(`/api/fluxo-financeiro/${ligaId}/extrato/${timeId}`),
            ],
        );

        const liga = resLiga.ok ? await resLiga.json() : null;
        const ranking = resRanking.ok ? await resRanking.json() : [];
        const rodadas = resRodadas.ok ? await resRodadas.json() : [];
        const extratoData = resExtrato.ok ? await resExtrato.json() : null;

        console.log(
            "[PARTICIPANTE-BOAS-VINDAS] 📋 Dados da liga:",
            participante,
        );

        const meuTimeIdNum = Number(timeId);
        const meuTime = ranking.find((t) => Number(t.timeId) === meuTimeIdNum);
        const posicao = meuTime ? meuTime.posicao : null;
        const totalParticipantes = ranking.length;

        const minhasRodadas = rodadas.filter(
            (r) =>
                Number(r.timeId) === meuTimeIdNum ||
                Number(r.time_id) === meuTimeIdNum,
        );

        const pontosTotal = minhasRodadas.reduce((total, rodada) => {
            return total + (parseFloat(rodada.pontos) || 0);
        }, 0);

        const rodadasOrdenadas = [...minhasRodadas].sort(
            (a, b) => b.rodada - a.rodada,
        );
        const ultimaRodada = rodadasOrdenadas[0];
        const rodadaAtual = ultimaRodada ? ultimaRodada.rodada : 0;

        // Calcular posição anterior
        let posicaoAnterior = null;
        if (rodadaAtual > 1 && minhasRodadas.length >= 2) {
            const rodadasAteAnterior = rodadas.filter(
                (r) => r.rodada < rodadaAtual,
            );
            const rankingAnterior = calcularRankingManual(rodadasAteAnterior);
            const meuTimeAnterior = rankingAnterior.find(
                (t) => Number(t.timeId) === meuTimeIdNum,
            );
            if (meuTimeAnterior) {
                posicaoAnterior = meuTimeAnterior.posicao;
            }
        }

        const saldoFinanceiro =
            extratoData?.saldo_atual ?? extratoData?.resumo?.saldo_final ?? 0;

        // Dados do participante
        const nomeTime =
            participante?.nome_time || meuTime?.nome_time || "Seu Time";
        const nomeCartola =
            participante?.nome_cartola || meuTime?.nome_cartola || "Cartoleiro";
        const nomeLiga = liga?.nome || "Liga";
        const fotoTime = participante?.foto_time || meuTime?.foto_time || "";
        const clubeId = participante?.clube_id || meuTime?.clube_id || 262;

        console.log("[PARTICIPANTE-BOAS-VINDAS] ✅ Dados finais:", {
            nomeTime,
            nomeCartola,
            pontosTotais: pontosTotal,
        });

        renderizarBoasVindas(container, {
            posicao,
            totalParticipantes,
            pontosTotal,
            ultimaRodada,
            rodadaAtual,
            nomeTime,
            nomeCartola,
            nomeLiga,
            fotoTime,
            clubeId,
            saldoFinanceiro,
            posicaoAnterior,
            minhasRodadas: rodadasOrdenadas,
        });
    } catch (error) {
        console.error("[PARTICIPANTE-BOAS-VINDAS] ❌ Erro:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: ${COLORS.danger};">error</span>
                <p style="color: ${COLORS.textSecondary}; margin-top: 16px;">Erro ao carregar dados</p>
            </div>
        `;
    }
}

// =====================================================================
// HELPERS
// =====================================================================
function calcularRankingManual(rodadas) {
    const timesAgrupados = {};
    rodadas.forEach((rodada) => {
        const timeId = Number(rodada.timeId) || Number(rodada.time_id);
        if (!timesAgrupados[timeId]) {
            timesAgrupados[timeId] = {
                timeId,
                nome_time: rodada.nome_time,
                nome_cartola: rodada.nome_cartola,
                pontos_totais: 0,
                rodadas_jogadas: 0,
            };
        }
        timesAgrupados[timeId].pontos_totais += parseFloat(rodada.pontos) || 0;
        timesAgrupados[timeId].rodadas_jogadas += 1;
    });

    return Object.values(timesAgrupados)
        .sort((a, b) => b.pontos_totais - a.pontos_totais)
        .map((time, index) => ({ ...time, posicao: index + 1 }));
}

function formatarPontos(valor) {
    return valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getZonaTexto(posicao, total) {
    if (!posicao || !total)
        return { texto: "N/D", cor: COLORS.textMuted, icon: "help" };
    const percentual = (posicao / total) * 100;

    if (percentual <= 33) {
        return {
            texto: "Zona de Premiação",
            cor: COLORS.success,
            icon: "emoji_events",
            bg: COLORS.successBg,
        };
    } else if (percentual <= 66) {
        return {
            texto: "Zona Intermediária",
            cor: COLORS.warning,
            icon: "shield",
            bg: COLORS.warningBg,
        };
    } else {
        return {
            texto: "Zona de Risco",
            cor: COLORS.danger,
            icon: "warning",
            bg: COLORS.dangerBg,
        };
    }
}

// =====================================================================
// RENDERIZAÇÃO PRINCIPAL
// =====================================================================
function renderizarBoasVindas(container, data) {
    const {
        posicao,
        totalParticipantes,
        pontosTotal,
        ultimaRodada,
        rodadaAtual,
        nomeTime,
        nomeCartola,
        nomeLiga,
        saldoFinanceiro,
        posicaoAnterior,
        minhasRodadas,
    } = data;

    // Cálculos
    const zona = getZonaTexto(posicao, totalParticipantes);

    // Variação de posição
    let variacaoPosHTML = "";
    if (posicao && posicaoAnterior) {
        const diff = posicaoAnterior - posicao;
        if (diff > 0) {
            variacaoPosHTML = `<span style="color: ${COLORS.success}; font-size: 12px; margin-left: 4px;">▲${diff}</span>`;
        } else if (diff < 0) {
            variacaoPosHTML = `<span style="color: ${COLORS.danger}; font-size: 12px; margin-left: 4px;">▼${Math.abs(diff)}</span>`;
        }
    }

    // Variação de pontos
    let variacaoPontosHTML = "";
    let tendenciaHTML = "";
    if (minhasRodadas.length >= 2) {
        const ultima = parseFloat(minhasRodadas[0].pontos) || 0;
        const penultima = parseFloat(minhasRodadas[1].pontos) || 0;
        const diff = ultima - penultima;

        if (diff > 0) {
            variacaoPontosHTML = `<span style="color: ${COLORS.success};">+${diff.toFixed(1)}</span>`;
            tendenciaHTML = `<span class="material-symbols-outlined" style="color: ${COLORS.success}; font-size: 18px;">trending_up</span>`;
        } else if (diff < 0) {
            variacaoPontosHTML = `<span style="color: ${COLORS.danger};">${diff.toFixed(1)}</span>`;
            tendenciaHTML = `<span class="material-symbols-outlined" style="color: ${COLORS.danger}; font-size: 18px;">trending_down</span>`;
        } else {
            variacaoPontosHTML = `<span style="color: ${COLORS.textMuted};">0.0</span>`;
            tendenciaHTML = `<span class="material-symbols-outlined" style="color: ${COLORS.textMuted}; font-size: 18px;">trending_flat</span>`;
        }
    }

    // Saldo formatado
    const saldoAbs = Math.abs(saldoFinanceiro);
    const saldoFormatado =
        saldoFinanceiro >= 0
            ? `+R$ ${saldoAbs.toFixed(0)}`
            : `-R$ ${saldoAbs.toFixed(0)}`;
    const saldoCor =
        saldoFinanceiro > 0
            ? COLORS.success
            : saldoFinanceiro < 0
              ? COLORS.danger
              : COLORS.textMuted;

    // Pontos última rodada
    const pontosUltimaRodada = ultimaRodada
        ? parseFloat(ultimaRodada.pontos).toFixed(2)
        : "0.00";

    // Rodadas restantes
    const rodadasRestantes = 38 - rodadaAtual;

    container.innerHTML = `
        <div style="background: ${COLORS.background}; min-height: 100vh; padding-bottom: 100px; font-family: 'Lexend', sans-serif;">

            <!-- Saudação -->
            <div style="padding: 20px 16px 16px;">
                <h1 style="font-size: 24px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0 0 4px 0;">
                    Olá, ${nomeCartola.split(" ")[0]}! 👋
                </h1>
                <p style="font-size: 14px; color: ${COLORS.textSecondary}; margin: 0;">
                    ${nomeLiga} • Rodada ${rodadaAtual || "--"}
                </p>
            </div>

            <!-- Card Principal do Time -->
            <div style="margin: 0 16px 16px; padding: 20px; background: ${COLORS.surface}; border-radius: 16px;">
                <h3 style="text-align: center; font-size: 18px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0 0 20px 0;">
                    ${nomeTime}
                </h3>

                <div style="display: flex; justify-content: space-around; align-items: center;">
                    <!-- Posição -->
                    <div style="text-align: center;">
                        <p style="font-size: 12px; font-weight: 500; text-transform: uppercase; color: ${COLORS.textSecondary}; margin: 0 0 4px 0;">Posição</p>
                        <p style="font-size: 40px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0; line-height: 1;">
                            ${posicao ? `${posicao}º` : "--"}${variacaoPosHTML}
                        </p>
                        <p style="font-size: 12px; color: ${COLORS.textSecondary}; margin: 4px 0 0 0;">de ${totalParticipantes}</p>
                    </div>

                    <!-- Pontos -->
                    <div style="text-align: center;">
                        <p style="font-size: 12px; font-weight: 500; text-transform: uppercase; color: ${COLORS.textSecondary}; margin: 0 0 4px 0;">Pontos</p>
                        <p style="font-size: 40px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0; line-height: 1;">
                            ${formatarPontos(pontosTotal).split(",")[0]}
                        </p>
                        <p style="font-size: 12px; color: ${COLORS.textSecondary}; margin: 4px 0 0 0;">total acumulado</p>
                    </div>
                </div>

                <!-- Badge da Zona -->
                <div style="margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; background: ${zona.bg || "rgba(255,255,255,0.05)"}; border-radius: 50px;">
                    <span class="material-symbols-outlined" style="font-size: 18px; color: ${zona.cor};">${zona.icon}</span>
                    <p style="font-size: 13px; font-weight: 500; color: ${COLORS.textPrimary}; margin: 0;">${zona.texto}</p>
                </div>
            </div>

            <!-- Card Saldo Financeiro -->
            <div style="margin: 0 16px 16px; padding: 16px 20px; background: ${COLORS.surface}; border-radius: 16px; display: flex; align-items: center; gap: 16px;">
                <div style="flex-shrink: 0;">
                    <span class="material-symbols-outlined" style="font-size: 32px; color: ${COLORS.primary};">paid</span>
                </div>
                <div style="flex: 1;">
                    <p style="font-size: 12px; font-weight: 500; text-transform: uppercase; color: ${COLORS.textSecondary}; margin: 0 0 2px 0;">Saldo Financeiro</p>
                    <p style="font-size: 22px; font-weight: 700; color: ${saldoCor}; margin: 0;">${saldoFormatado}</p>
                </div>
                <div style="flex-shrink: 0;">
                    <span class="material-symbols-outlined" style="color: ${COLORS.textSecondary};">arrow_forward_ios</span>
                </div>
            </div>

            <!-- Grid de Estatísticas -->
            <div style="margin: 0 16px 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                <!-- Rodadas -->
                <div style="padding: 16px 12px; background: ${COLORS.surface}; border-radius: 16px; text-align: center;">
                    <p style="font-size: 11px; font-weight: 500; text-transform: uppercase; color: ${COLORS.textSecondary}; margin: 0 0 6px 0;">Rodadas</p>
                    <p style="font-size: 28px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0;">${rodadaAtual || 0}</p>
                </div>

                <!-- Participantes -->
                <div style="padding: 16px 12px; background: ${COLORS.surface}; border-radius: 16px; text-align: center;">
                    <p style="font-size: 11px; font-weight: 500; text-transform: uppercase; color: ${COLORS.textSecondary}; margin: 0 0 6px 0;">Participantes</p>
                    <p style="font-size: 28px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0;">${totalParticipantes}</p>
                </div>

                <!-- Faltam -->
                <div style="padding: 16px 12px; background: ${COLORS.surface}; border-radius: 16px; text-align: center;">
                    <p style="font-size: 11px; font-weight: 500; text-transform: uppercase; color: ${COLORS.textSecondary}; margin: 0 0 6px 0;">Faltam</p>
                    <p style="font-size: 28px; font-weight: 700; color: ${COLORS.primary}; margin: 0;">${rodadasRestantes > 0 ? rodadasRestantes : 0}</p>
                </div>
            </div>

            <!-- Card de Desempenho -->
            <div style="margin: 0 16px 16px; padding: 16px 20px; background: ${COLORS.surface}; border-radius: 16px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                    <span class="material-symbols-outlined" style="font-size: 22px; color: ${COLORS.primary};">insights</span>
                    <h3 style="font-size: 15px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0;">Seu Desempenho</h3>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <!-- Última Rodada -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: ${COLORS.surfaceLight}; border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: ${COLORS.primary};">bolt</span>
                            <span style="font-size: 13px; color: ${COLORS.textSecondary};">Rodada ${rodadaAtual}</span>
                        </div>
                        <span style="font-size: 16px; font-weight: 700; color: ${COLORS.textPrimary};">${pontosUltimaRodada} pts</span>
                    </div>

                    <!-- Variação -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: ${COLORS.surfaceLight}; border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${tendenciaHTML || `<span class="material-symbols-outlined" style="font-size: 20px; color: ${COLORS.textMuted};">trending_flat</span>`}
                            <span style="font-size: 13px; color: ${COLORS.textSecondary};">Variação</span>
                        </div>
                        <span style="font-size: 16px; font-weight: 700;">${variacaoPontosHTML || `<span style="color: ${COLORS.textMuted};">--</span>`}</span>
                    </div>

                    <!-- Posição Anterior -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: ${COLORS.surfaceLight}; border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: ${COLORS.primary};">history</span>
                            <span style="font-size: 13px; color: ${COLORS.textSecondary};">Posição anterior</span>
                        </div>
                        <span style="font-size: 16px; font-weight: 700; color: ${COLORS.textPrimary};">${posicaoAnterior ? `${posicaoAnterior}º` : "--"}</span>
                    </div>
                </div>
            </div>

            <!-- Card de Dica -->
            <div style="margin: 0 16px 16px; padding: 16px 20px; background: ${COLORS.primaryLight}; border-radius: 16px; display: flex; align-items: flex-start; gap: 12px;">
                <span class="material-symbols-outlined" style="font-size: 22px; color: ${COLORS.primary}; margin-top: 2px;">lightbulb</span>
                <div>
                    <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: ${COLORS.textPrimary}; margin: 0 0 4px 0;">Dica</p>
                    <p style="font-size: 13px; color: ${COLORS.textSecondary}; margin: 0; line-height: 1.5;">
                        Acompanhe seu extrato financeiro para entender sua evolução na liga!
                    </p>
                </div>
            </div>
        </div>
    `;
}

console.log("[PARTICIPANTE-BOAS-VINDAS] ✅ Módulo v3.0 carregado");
