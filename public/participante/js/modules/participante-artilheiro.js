// =====================================================================
// PARTICIPANTE-ARTILHEIRO.JS - v3.4 (Card Desempenho ao final)
// =====================================================================

console.log("[PARTICIPANTE-ARTILHEIRO] 🔄 Carregando módulo v3.4...");

const RODADA_FINAL = 38;

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarArtilheiroParticipante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[PARTICIPANTE-ARTILHEIRO] 🚀 Inicializando...", {
        ligaId,
        timeId,
    });

    const container = document.getElementById("artilheiro-content");
    if (!container) {
        console.error("[PARTICIPANTE-ARTILHEIRO] ❌ Container não encontrado");
        return;
    }

    try {
        const ligaRes = await fetch(`/api/ligas/${ligaId}`);
        if (ligaRes.ok) {
            const liga = await ligaRes.json();
            const modulosAtivos =
                liga.modulosAtivos || liga.modulos_ativos || {};
            const artilheiroAtivo = modulosAtivos.artilheiro !== false;

            if (!artilheiroAtivo) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(34, 197, 94, 0.3);">
                        <div style="font-size: 64px; margin-bottom: 16px;">⚽</div>
                        <h3 style="color: #fff; margin-bottom: 12px;">Artilheiro Campeão</h3>
                        <p style="color: #999;">Este módulo não está ativo para esta liga.</p>
                    </div>
                `;
                return;
            }
        }

        const response = await fetch(
            `/api/artilheiro-campeao/${ligaId}/ranking`,
        );
        if (!response.ok) throw new Error("Dados não disponíveis");

        const responseData = await response.json();
        console.log(
            "[PARTICIPANTE-ARTILHEIRO] 📦 Dados recebidos:",
            responseData,
        );

        await renderizarArtilheiro(container, responseData, timeId);
    } catch (error) {
        console.error("[PARTICIPANTE-ARTILHEIRO] ❌ Erro:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(34, 197, 94, 0.3);">
                <div style="font-size: 64px; margin-bottom: 16px;">⚽</div>
                <h3 style="color: #fff; margin-bottom: 12px;">Artilheiro Campeão</h3>
                <p style="color: #999;">Dados não disponíveis no momento.</p>
            </div>
        `;
    }
}

window.inicializarArtilheiroParticipante = inicializarArtilheiroParticipante;

// =====================================================================
// HELPERS
// =====================================================================
function getNome(item) {
    return item?.nomeTime || item?.nomeCartoleiro || item?.nome || "N/D";
}

function getTimeId(item) {
    return String(item?.timeId || item?.participanteId || "");
}

function isMyTime(item, meuTimeId) {
    return getTimeId(item) === String(meuTimeId);
}

// =====================================================================
// BANNER RODADA FINAL
// =====================================================================
function renderizarBannerRodadaFinal(rodadaAtual, mercadoAberto, lider) {
    if (rodadaAtual !== RODADA_FINAL) return "";

    const isParcial = !mercadoAberto;
    const liderNome = lider ? getNome(lider) : "---";
    const getGP = (item) => item?.golsPro ?? item?.gols ?? 0;
    const liderGols = lider ? getGP(lider) : 0;

    return `
        <style>
            @keyframes artBannerPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
            }
            @keyframes artShimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
            }
            .art-banner-final {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.06) 100%);
                border: 1px solid rgba(34, 197, 94, 0.35);
                border-radius: 12px;
                padding: 12px 16px;
                margin-bottom: 16px;
                ${isParcial ? "animation: artBannerPulse 2s ease-in-out infinite;" : ""}
            }
            .art-banner-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            .art-banner-title {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .art-banner-icon {
                font-size: 18px;
                color: #22c55e;
            }
            .art-banner-text {
                font-size: 11px;
                font-weight: 700;
                color: #22c55e;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .art-banner-status {
                font-size: 9px;
                padding: 3px 8px;
                border-radius: 4px;
                font-weight: 600;
                ${
                    isParcial
                        ? "background: rgba(34, 197, 94, 0.2); color: #22c55e;"
                        : "background: rgba(34, 197, 94, 0.15); color: #22c55e;"
                }
            }
            .art-banner-lider {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(0, 0, 0, 0.25);
                border-radius: 8px;
                padding: 10px 12px;
            }
            .art-banner-lider-info {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .art-banner-lider-badge {
                font-size: 9px;
                font-weight: 700;
                color: #22c55e;
                text-transform: uppercase;
                background: linear-gradient(90deg, #22c55e, #16a34a, #22c55e);
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: artShimmer 3s linear infinite;
            }
            .art-banner-lider-nome {
                font-size: 14px;
                font-weight: 700;
                color: #fff;
            }
            .art-banner-lider-gols {
                text-align: right;
            }
            .art-banner-lider-valor {
                font-size: 18px;
                font-weight: 800;
                color: #22c55e;
            }
            .art-banner-lider-label {
                font-size: 8px;
                color: #888;
                text-transform: uppercase;
            }
        </style>

        <div class="art-banner-final">
            <div class="art-banner-header">
                <div class="art-banner-title">
                    <span class="material-icons" style="font-size: 18px; color: #22c55e; vertical-align: middle;">emoji_events</span>
                    <span class="art-banner-text">Rodada Final</span>
                </div>
                <span class="art-banner-status">${isParcial ? "● Em andamento" : "Última Rodada"}</span>
            </div>
            <div class="art-banner-lider">
                <div class="art-banner-lider-info">
                    <div>
                        <div class="art-banner-lider-badge">Possível Campeão</div>
                        <div class="art-banner-lider-nome">${liderNome}</div>
                    </div>
                </div>
                <div class="art-banner-lider-gols">
                    <div class="art-banner-lider-valor">${liderGols}</div>
                    <div class="art-banner-lider-label">gols</div>
                </div>
            </div>
        </div>
    `;
}

// =====================================================================
// RENDERIZAÇÃO
// =====================================================================
async function renderizarArtilheiro(container, response, meuTimeId) {
    const data = response.data || response;

    let ranking = [];
    let estatisticas = {};

    if (data.ranking && Array.isArray(data.ranking)) {
        ranking = data.ranking;
        estatisticas = data.estatisticas || {};
    } else if (Array.isArray(data)) {
        ranking = data;
    }

    // ✅ FILTRAR TIMES INATIVOS - NÃO PODEM FIGURAR NO RANKING
    const rankingAtivos = ranking.filter((time) => {
        const isInativo = time.ativo === false || time.status === "inativo";
        return !isInativo;
    });

    if (rankingAtivos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(34, 197, 94, 0.3);">
                <div style="font-size: 64px; margin-bottom: 16px;">⚽</div>
                <h3 style="color: #fff; margin-bottom: 12px;">Artilheiro Campeão</h3>
                <p style="color: #999;">Nenhum dado disponível ainda.</p>
            </div>
        `;
        return;
    }

    const campeao = rankingAtivos[0];
    const minhaPosicao = rankingAtivos.findIndex((r) => isMyTime(r, meuTimeId));
    const meusDados = minhaPosicao >= 0 ? rankingAtivos[minhaPosicao] : null;
    const minhaColocacao = minhaPosicao >= 0 ? minhaPosicao + 1 : null;

    // Extrair dados
    const getGP = (item) => item?.golsPro ?? item?.gols ?? 0;
    const getGC = (item) => item?.golsContra ?? 0;
    const getSaldo = (item) => item?.saldoGols ?? getGP(item) - getGC(item);

    const distanciaLider =
        campeao && meusDados ? getSaldo(campeao) - getSaldo(meusDados) : 0;

    const rodadaInicio = estatisticas.rodadaInicio || 1;
    const rodadaFim = estatisticas.rodadaFim || estatisticas.rodadaAtual || 36;
    let rodadaAtual = estatisticas.rodadaAtual || null;
    let mercadoAberto = estatisticas.mercadoAberto !== false;

    // ✅ BUSCAR RODADA ATUAL DA API DE MERCADO SE NÃO VEIO NOS DADOS
    if (!rodadaAtual) {
        try {
            // Endpoint correto: /api/cartola/mercado/status
            const mercadoRes = await fetch("/api/cartola/mercado/status");
            if (mercadoRes.ok) {
                const mercado = await mercadoRes.json();
                rodadaAtual =
                    mercado.rodada_atual || mercado.rodadaAtual || rodadaFim;
                mercadoAberto = mercado.status_mercado === 1;
                console.log("[PARTICIPANTE-ARTILHEIRO] 📊 Mercado:", {
                    rodadaAtual,
                    mercadoAberto,
                });
            } else {
                rodadaAtual = rodadaFim;
                console.warn(
                    "[PARTICIPANTE-ARTILHEIRO] ⚠️ API mercado indisponível, usando rodadaFim:",
                    rodadaFim,
                );
            }
        } catch (e) {
            console.warn(
                "[PARTICIPANTE-ARTILHEIRO] ⚠️ Erro ao obter mercado:",
                e.message,
            );
            rodadaAtual = rodadaFim;
        }
    }

    // Dados ricos
    let ultimaRodada = null;
    let meusArtilheiros = [];
    let historicoRecente = [];

    if (
        meusDados?.detalhePorRodada &&
        Array.isArray(meusDados.detalhePorRodada)
    ) {
        const rodadasOrdenadas = [...meusDados.detalhePorRodada].sort(
            (a, b) => b.rodada - a.rodada,
        );
        ultimaRodada =
            rodadasOrdenadas.find(
                (r) => (r.golsPro || 0) > 0 || (r.golsContra || 0) > 0,
            ) || rodadasOrdenadas[0];
        historicoRecente = rodadasOrdenadas.slice(0, 5);

        const jogadoresMap = {};
        meusDados.detalhePorRodada.forEach((r) => {
            if (r.jogadores && Array.isArray(r.jogadores)) {
                r.jogadores.forEach((j) => {
                    if (j.gols > 0) {
                        if (!jogadoresMap[j.nome])
                            jogadoresMap[j.nome] = { nome: j.nome, gols: 0 };
                        jogadoresMap[j.nome].gols += j.gols;
                    }
                });
            }
        });
        meusArtilheiros = Object.values(jogadoresMap)
            .sort((a, b) => b.gols - a.gols)
            .slice(0, 3);
    }

    // Banner da rodada final
    const bannerRodadaFinal = renderizarBannerRodadaFinal(
        rodadaAtual,
        mercadoAberto,
        campeao,
    );

    const html = `
    <div style="padding: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #22c55e;">
                ⚽ Artilheiro Campeão
            </h2>
            <p style="margin: 0; color: #888; font-size: 12px;">
                Rodadas ${rodadaInicio} - ${rodadaFim}
            </p>
        </div>

        ${bannerRodadaFinal}

        ${
            meusDados
                ? `
        <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%); border: 2px solid rgba(34, 197, 94, 0.4); border-radius: 16px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div>
                    <div style="font-size: 10px; color: #22c55e; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Sua Posição</div>
                    <div style="font-size: 28px; font-weight: 900; color: #fff;">${minhaColocacao}º</div>
                </div>
                <div style="display: flex; gap: 16px; text-align: center;">
                    <div>
                        <div style="font-size: 20px; font-weight: 800; color: #22c55e;">${getGP(meusDados)}</div>
                        <div style="font-size: 9px; color: #888;">GP</div>
                    </div>
                    <div>
                        <div style="font-size: 20px; font-weight: 800; color: #ef4444;">${getGC(meusDados)}</div>
                        <div style="font-size: 9px; color: #888;">GC</div>
                    </div>
                    <div>
                        <div style="font-size: 20px; font-weight: 800; color: ${getSaldo(meusDados) >= 0 ? "#22c55e" : "#ef4444"};">${getSaldo(meusDados) >= 0 ? "+" : ""}${getSaldo(meusDados)}</div>
                        <div style="font-size: 9px; color: #888;">SG</div>
                    </div>
                </div>
            </div>

            ${
                minhaColocacao > 1
                    ? `
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #888; font-size: 11px;">Distância p/ líder</span>
                <span style="color: #f59e0b; font-weight: 700; font-size: 13px;">-${distanciaLider} gols</span>
            </div>
            `
                    : `
            <div style="background: linear-gradient(90deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1)); border-radius: 8px; padding: 8px 12px; text-align: center;">
                <span style="color: #22c55e; font-weight: 700; font-size: 13px;">🏆 Você é o líder!</span>
            </div>
            `
            }
        </div>

        ${
            ultimaRodada
                ? `
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="color: #3b82f6; font-size: 11px; font-weight: 700; text-transform: uppercase;">📅 Rodada ${ultimaRodada.rodada}</span>
                <span style="color: #666; font-size: 10px;">Última atualização</span>
            </div>
            <div style="display: flex; gap: 8px; justify-content: center;">
                <div style="background: rgba(34, 197, 94, 0.15); padding: 10px 16px; border-radius: 8px; text-align: center; flex: 1;">
                    <div style="font-size: 22px; font-weight: 800; color: #22c55e;">${ultimaRodada.golsPro || 0}</div>
                    <div style="font-size: 9px; color: #888;">GP</div>
                </div>
                <div style="background: rgba(239, 68, 68, 0.15); padding: 10px 16px; border-radius: 8px; text-align: center; flex: 1;">
                    <div style="font-size: 22px; font-weight: 800; color: #ef4444;">${ultimaRodada.golsContra || 0}</div>
                    <div style="font-size: 9px; color: #888;">GC</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.05); padding: 10px 16px; border-radius: 8px; text-align: center; flex: 1;">
                    ${(() => {
                        const saldo =
                            (ultimaRodada.golsPro || 0) -
                            (ultimaRodada.golsContra || 0);
                        return `<div style="font-size: 22px; font-weight: 800; color: ${saldo >= 0 ? "#22c55e" : "#ef4444"};">${saldo >= 0 ? "+" : ""}${saldo}</div>`;
                    })()}
                    <div style="font-size: 9px; color: #888;">SG</div>
                </div>
            </div>
            ${
                ultimaRodada.jogadores &&
                ultimaRodada.jogadores.filter((j) => j.gols > 0).length > 0
                    ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
                ${ultimaRodada.jogadores
                    .filter((j) => j.gols > 0)
                    .map(
                        (j) => `
                    <span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">
                        ⚽ ${j.nome} (${j.gols})
                    </span>
                `,
                    )
                    .join("")}
            </div>
            `
                    : ""
            }
        </div>
        `
                : ""
        }

        ${
            meusArtilheiros.length > 0
                ? `
        <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
            <div style="font-size: 11px; color: #888; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">🎯 Seus Artilheiros</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${meusArtilheiros
                    .map(
                        (j, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: #888; font-size: 12px; width: 20px;">${idx + 1}º</span>
                        <span style="color: #fff; font-size: 12px; font-weight: 500;">${j.nome}</span>
                    </div>
                    <span style="color: #22c55e; font-weight: 800; font-size: 14px;">${j.gols} gols</span>
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
                        const saldo = (r.golsPro || 0) - (r.golsContra || 0);
                        const bgColor =
                            saldo > 0
                                ? "rgba(34, 197, 94, 0.15)"
                                : saldo < 0
                                  ? "rgba(239, 68, 68, 0.15)"
                                  : "rgba(255,255,255,0.05)";
                        const textColor =
                            saldo > 0
                                ? "#22c55e"
                                : saldo < 0
                                  ? "#ef4444"
                                  : "#666";
                        return `
                    <div style="flex: 1; background: ${bgColor}; border-radius: 8px; padding: 8px 4px; text-align: center;">
                        <div style="font-size: 9px; color: #666; margin-bottom: 4px;">R${r.rodada}</div>
                        <div style="font-size: 14px; font-weight: 800; color: ${textColor};">${saldo >= 0 ? "+" : ""}${saldo}</div>
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
        <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.03) 100%); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🏆</span>
                <div>
                    <div style="font-size: 10px; color: #22c55e; font-weight: 700; text-transform: uppercase;">Líder</div>
                    <div style="font-size: 14px; font-weight: 700; color: #fff;">${getNome(campeao)}</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 800; color: #22c55e;">+${getSaldo(campeao)}</div>
                <div style="font-size: 8px; color: #888;">saldo de gols</div>
            </div>
        </div>
        `
                : ""
        }

        <details style="background: rgba(0,0,0,0.3); border-radius: 12px; overflow: hidden;" open>
            <summary style="background: rgba(34, 197, 94, 0.1); padding: 12px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(34, 197, 94, 0.2);">
                <span style="font-size: 13px; font-weight: 700; color: #22c55e;">📋 Ranking Completo</span>
                <span style="font-size: 11px; color: #888;">${rankingAtivos.length} participantes</span>
            </summary>

            <div style="max-height: 300px; overflow-y: auto;">
            ${(() => {
                // Separar ativos e inativos
                const ativos = rankingAtivos;
                const inativos = ranking.filter(
                    (time) => time.ativo === false || time.status === "inativo",
                );

                let html = "";

                // Renderizar ATIVOS
                ativos.forEach((time, idx) => {
                    const isMeuTime = isMyTime(time, meuTimeId);
                    const pos = idx + 1;
                    const posicaoDisplay = pos === 1 ? "🏆" : `${pos}º`;
                    const saldo = getSaldo(time);

                    html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); ${isMeuTime ? "background: rgba(34, 197, 94, 0.15);" : ""}">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: ${pos === 1 ? "16px" : "12px"}; width: 26px; ${pos === 1 ? "" : "color: #888;"}">${posicaoDisplay}</span>
                            <span style="color: ${isMeuTime ? "#22c55e" : "#fff"}; font-weight: ${isMeuTime ? "700" : "500"}; font-size: 12px;">${getNome(time)}</span>
                        </div>
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <span style="color: #888; font-size: 11px;">${getGP(time)}/${getGC(time)}</span>
                            <span style="color: ${saldo >= 0 ? "#22c55e" : "#ef4444"}; font-weight: 700; font-size: 13px;">${saldo >= 0 ? "+" : ""}${saldo}</span>
                        </div>
                    </div>
                    `;
                });

                // Renderizar INATIVOS (se houver)
                if (inativos.length > 0) {
                    html += `
                    <div style="padding: 8px 14px; background: rgba(100,100,100,0.15); border-top: 1px dashed rgba(100,100,100,0.4); border-bottom: 1px dashed rgba(100,100,100,0.4);">
                        <span style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">
                            <span class="material-icons" style="font-size: 12px; vertical-align: middle; margin-right: 4px;">person_off</span>
                            Participantes Inativos
                        </span>
                    </div>
                    `;

                    inativos.forEach((time) => {
                        const isMeuTime = isMyTime(time, meuTimeId);
                        const saldo = getSaldo(time);

                        html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.03); opacity: 0.5; filter: grayscale(60%);">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 12px; width: 26px; color: #555;">—</span>
                                <span style="color: #666; font-weight: 400; font-size: 12px;">${getNome(time)}</span>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center;">
                                <span style="color: #555; font-size: 11px;">${getGP(time)}/${getGC(time)}</span>
                                <span style="color: #555; font-weight: 500; font-size: 13px;">${saldo >= 0 ? "+" : ""}${saldo}</span>
                            </div>
                        </div>
                        `;
                    });
                }

                return html;
            })()}
            </div>
        </details>
    </div>
    `;

    container.innerHTML = html;

    // ✅ v3.4: Mover o card "Meus Dados" para o container externo ao final
    setTimeout(() => {
        const cardDesempenhoContainer = document.getElementById(
            "artilheiro-card-desempenho",
        );
        const cardMeusDados = container.querySelector(
            '[style*="linear-gradient(135deg, rgba(34, 197, 94, 0.15)"]',
        );

        if (cardDesempenhoContainer && cardMeusDados) {
            // Criar wrapper com estilos do card Seu Desempenho
            const wrapper = document.createElement("div");
            wrapper.innerHTML = `
                <div style="background: linear-gradient(135deg, #1a1a1a 0%, #262626 100%); border-radius: 16px; padding: 16px; border: 1px solid rgba(34, 197, 94, 0.3);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; color: #22c55e; font-weight: 600; font-size: 14px;">
                        <span class="material-icons" style="font-size: 20px;">insights</span>
                        <span>Seu Desempenho</span>
                    </div>
                    ${cardMeusDados.innerHTML}
                </div>
            `;
            cardDesempenhoContainer.innerHTML = "";
            cardDesempenhoContainer.appendChild(wrapper);

            // Remover o card original
            cardMeusDados.remove();
        }
    }, 100);
}

console.log("[PARTICIPANTE-ARTILHEIRO] ✅ Módulo v3.4 carregado");
