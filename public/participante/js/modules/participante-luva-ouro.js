// =====================================================================
// PARTICIPANTE-LUVA-OURO.JS - v4.0 (Cache-First IndexedDB)
// =====================================================================
// ✅ v4.0: Cache-first com IndexedDB para carregamento instantâneo
// ✅ v3.8: Detecção de temporada encerrada (R38 + mercado fechado)
//    - Badge "CAMPEÃO" quando temporada encerrada
//    - Banner ajustado para "CAMPEÃO CONFIRMADO"
// ✅ v3.7: Card Desempenho ao final
// =====================================================================

if (window.Log) Log.info("[PARTICIPANTE-LUVA-OURO] Carregando módulo v4.0...");

const RODADA_FINAL = 38;

// Estado do módulo
let estadoLuva = {
    temporadaEncerrada: false,
    rodadaAtual: null,
    mercadoAberto: true,
};

// =====================================================================
// FUNÇÃO PRINCIPAL - EXPORTADA PARA NAVIGATION
// =====================================================================
export async function inicializarLuvaOuroParticipante({
    participante,
    ligaId,
    timeId,
}) {
    if (window.Log) Log.info("[PARTICIPANTE-LUVA-OURO] 🚀 Inicializando v4.0...", {
        ligaId,
        timeId,
    });

    const container = document.getElementById("luvaOuroContainer");
    if (!container) {
        if (window.Log) Log.error("[PARTICIPANTE-LUVA-OURO] ❌ Container não encontrado");
        return;
    }

    // ✅ v4.0: CACHE-FIRST - Tentar carregar do IndexedDB primeiro
    let usouCache = false;
    let dadosCache = null;

    if (window.OfflineCache) {
        try {
            const luvaCache = await window.OfflineCache.get('luvaOuro', ligaId, true);
            if (luvaCache && (luvaCache.ranking || luvaCache.data)) {
                usouCache = true;
                dadosCache = luvaCache;

                // Renderizar IMEDIATAMENTE com dados do cache
                if (window.Log)
                    Log.info("[PARTICIPANTE-LUVA-OURO] ⚡ Cache IndexedDB encontrado");

                await renderizarLuvaOuro(container, luvaCache, timeId);
            }
        } catch (e) {
            if (window.Log) Log.warn("[PARTICIPANTE-LUVA-OURO] ⚠️ Erro ao ler cache:", e);
        }
    }

    try {
        const ligaRes = await fetch(`/api/ligas/${ligaId}`);
        if (ligaRes.ok) {
            const liga = await ligaRes.json();
            const modulosAtivos =
                liga.modulosAtivos || liga.modulos_ativos || {};
            // v2.0: Módulo OPCIONAL, só habilita se === true
            const luvaAtiva = modulosAtivos.luvaOuro === true;

            if (!luvaAtiva) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(255, 215, 0, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 64px; margin-bottom: 16px; color: #ffd700;">sports_handball</span>
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
        
        // DEBUG: Ver estrutura da resposta
        console.log('[DEBUG-LUVA] Response da API:', {
            hasRanking: !!responseData.ranking,
            rankingLength: responseData.ranking?.length || 0,
            firstItem: responseData.ranking?.[0] || null,
            responseKeys: Object.keys(responseData),
            fullResponse: responseData
        });
        
        if (window.Log) Log.info(
            "[PARTICIPANTE-LUVA-OURO] 📦 Dados recebidos da API",
        );

        // ✅ v4.0: Salvar no IndexedDB para próxima visita
        if (window.OfflineCache) {
            try {
                await window.OfflineCache.set('luvaOuro', ligaId, responseData);
                if (window.Log) Log.info("[PARTICIPANTE-LUVA-OURO] 💾 Cache IndexedDB atualizado");
            } catch (e) {
                if (window.Log) Log.warn("[PARTICIPANTE-LUVA-OURO] ⚠️ Erro ao salvar cache:", e);
            }
        }

        // Só re-renderizar se dados mudaram ou se não usou cache antes
        const dadosMudaram = !usouCache ||
            !dadosCache ||
            JSON.stringify(dadosCache.ranking?.slice(0,3)) !== JSON.stringify(responseData.ranking?.slice(0,3));

        if (dadosMudaram) {
            await renderizarLuvaOuro(container, responseData, timeId);
            if (usouCache && window.Log) {
                Log.info("[PARTICIPANTE-LUVA-OURO] 🔄 Re-renderizado com dados frescos");
            }
        } else if (window.Log) {
            Log.info("[PARTICIPANTE-LUVA-OURO] ✅ Dados iguais, mantendo renderização do cache");
        }
    } catch (error) {
        if (window.Log) Log.error("[PARTICIPANTE-LUVA-OURO] ❌ Erro:", error);
        if (!usouCache) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(255, 215, 0, 0.3);">
                    <span class="material-symbols-outlined" style="font-size: 64px; margin-bottom: 16px; color: #ffd700;">sports_handball</span>
                    <h3 style="color: #fff; margin-bottom: 12px;">Luva de Ouro</h3>
                    <p style="color: #999;">Dados não disponíveis no momento.</p>
                </div>
            `;
        }
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
// ✅ v3.8: BANNER RODADA FINAL / CAMPEÃO
// =====================================================================
function renderizarBannerRodadaFinal(
    rodadaAtual,
    mercadoAberto,
    lider,
    temporadaEncerrada,
) {
    if (rodadaAtual !== RODADA_FINAL) return "";

    const liderNome = lider ? getNome(lider) : "---";
    const liderPontos = lider ? getPontos(lider).toFixed(1) : "0";

    // ✅ v3.8: Detectar se é campeão confirmado
    if (temporadaEncerrada) {
        return `
            <style>
                @keyframes luvaCampeaoShine {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .luva-banner-campeao {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 180, 0, 0.08) 100%);
                    border: 2px solid rgba(255, 215, 0, 0.5);
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-bottom: 16px;
                }
                .luva-campeao-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                }
                .luva-campeao-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .luva-campeao-badge {
                    font-size: 10px;
                    font-weight: 700;
                    color: #ffd700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    background: linear-gradient(90deg, #ffd700, #ffaa00, #ffd700);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: luvaCampeaoShine 3s linear infinite;
                }
                .luva-campeao-status {
                    font-size: 9px;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-weight: 600;
                    background: rgba(255, 215, 0, 0.25);
                    color: #ffd700;
                }
                .luva-campeao-info {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(0, 0, 0, 0.25);
                    border-radius: 10px;
                    padding: 12px 14px;
                }
                .luva-campeao-nome {
                    font-size: 15px;
                    font-weight: 700;
                    color: #fff;
                }
                .luva-campeao-label {
                    font-size: 9px;
                    color: #ffd700;
                    font-weight: 600;
                    text-transform: uppercase;
                    margin-bottom: 2px;
                }
                .luva-campeao-pontos {
                    text-align: right;
                }
                .luva-campeao-pontos-valor {
                    font-size: 20px;
                    font-weight: 800;
                    color: #ffd700;
                }
                .luva-campeao-pontos-label {
                    font-size: 8px;
                    color: #888;
                    text-transform: uppercase;
                }
            </style>
            <div class="luva-banner-campeao">
                <div class="luva-campeao-header">
                    <div class="luva-campeao-title">
                        <span class="material-icons" style="font-size: 22px; color: #ffd700;">emoji_events</span>
                        <span class="luva-campeao-badge">CAMPEÃO LUVA DE OURO</span>
                    </div>
                    <span class="luva-campeao-status"><span class="material-symbols-outlined" style="font-size: 12px; vertical-align: middle;">check</span> CONSOLIDADO</span>
                </div>
                <div class="luva-campeao-info">
                    <div>
                        <div class="luva-campeao-label">Campeão</div>
                        <div class="luva-campeao-nome">${liderNome}</div>
                    </div>
                    <div class="luva-campeao-pontos">
                        <div class="luva-campeao-pontos-valor">${liderPontos}</div>
                        <div class="luva-campeao-pontos-label">pontos</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Rodada 38 em andamento
    const isParcial = !mercadoAberto;

    return `
        <style>
            @keyframes bannerPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(255, 215, 0, 0); }
            }
            @keyframes shimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
            }
            .luva-banner-final {
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 180, 0, 0.08) 100%);
                border: 1px solid rgba(255, 215, 0, 0.35);
                border-radius: 12px;
                padding: 12px 16px;
                margin-bottom: 16px;
                ${isParcial ? "animation: bannerPulse 2s ease-in-out infinite;" : ""}
            }
            .luva-banner-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            .luva-banner-title {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .luva-banner-text {
                font-size: 11px;
                font-weight: 700;
                color: #ffd700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .luva-banner-status {
                font-size: 9px;
                padding: 3px 8px;
                border-radius: 4px;
                font-weight: 600;
                ${
                    isParcial
                        ? "background: rgba(34, 197, 94, 0.2); color: #22c55e;"
                        : "background: rgba(255, 215, 0, 0.2); color: #ffd700;"
                }
            }
            .luva-banner-lider {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(0, 0, 0, 0.25);
                border-radius: 8px;
                padding: 10px 12px;
            }
            .luva-banner-lider-badge {
                font-size: 9px;
                font-weight: 700;
                color: #ffd700;
                text-transform: uppercase;
                background: linear-gradient(90deg, #ffd700, #ffaa00, #ffd700);
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: shimmer 3s linear infinite;
            }
            .luva-banner-lider-nome {
                font-size: 14px;
                font-weight: 700;
                color: #fff;
            }
            .luva-banner-lider-pontos {
                text-align: right;
            }
            .luva-banner-lider-valor {
                font-size: 18px;
                font-weight: 800;
                color: #ffd700;
            }
            .luva-banner-lider-label {
                font-size: 8px;
                color: #888;
                text-transform: uppercase;
            }
        </style>

        <div class="luva-banner-final">
            <div class="luva-banner-header">
                <div class="luva-banner-title">
                    <span class="material-icons" style="font-size: 18px; color: #ffd700; vertical-align: middle;">emoji_events</span>
                    <span class="luva-banner-text">Rodada Final</span>
                </div>
                <span class="luva-banner-status">${isParcial ? "● Em andamento" : "Última Rodada"}</span>
            </div>
            <div class="luva-banner-lider">
                <div>
                    <div class="luva-banner-lider-badge">Possível Campeão</div>
                    <div class="luva-banner-lider-nome">${liderNome}</div>
                </div>
                <div class="luva-banner-lider-pontos">
                    <div class="luva-banner-lider-valor">${liderPontos}</div>
                    <div class="luva-banner-lider-label">pontos</div>
                </div>
            </div>
        </div>
    `;
}

// =====================================================================
// RENDERIZAÇÃO
// =====================================================================
async function renderizarLuvaOuro(container, response, meuTimeId) {
    const data = response.data || response;

    console.log('[DEBUG-LUVA] Renderizar - dados recebidos:', {
        hasData: !!data,
        hasRanking: !!data.ranking,
        rankingLength: data.ranking?.length || 0,
        isArray: Array.isArray(data),
        dataKeys: Object.keys(data),
        fullData: data
    });

    let ranking = [];
    let rodadaInicio = 1;
    let rodadaFim = 36;
    let rodadaAtual = null;
    let mercadoAberto = true;
    let temporadaEncerrada = false;

    if (data.ranking && Array.isArray(data.ranking)) {
        ranking = data.ranking;
        rodadaInicio = data.rodadaInicio || 1;
        rodadaFim = data.rodadaFim || 36;
        rodadaAtual = data.rodadaAtual || null;
        mercadoAberto = data.mercadoAberto !== false;
    } else if (Array.isArray(data)) {
        ranking = data;
    }
    
    console.log('[DEBUG-LUVA] Ranking extraído:', {
        rankingLength: ranking.length,
        firstItem: ranking[0]
    });

    // ✅ v3.8: BUSCAR STATUS DO MERCADO PARA DETECTAR TEMPORADA ENCERRADA
    try {
        const mercadoRes = await fetch("/api/cartola/mercado/status");
        if (mercadoRes.ok) {
            const mercado = await mercadoRes.json();
            rodadaAtual =
                mercado.rodada_atual || mercado.rodadaAtual || rodadaFim;
            mercadoAberto = mercado.status_mercado === 1;

            // Temporada encerrada: status_mercado = 6 OU (rodada >= 38 E mercado fechado)
            temporadaEncerrada =
                mercado.status_mercado === 6 ||
                (rodadaAtual >= RODADA_FINAL && mercado.status_mercado !== 1);

            estadoLuva.rodadaAtual = rodadaAtual;
            estadoLuva.mercadoAberto = mercadoAberto;
            estadoLuva.temporadaEncerrada = temporadaEncerrada;

            if (window.Log) Log.info("[PARTICIPANTE-LUVA-OURO] 📊 Status:", {
                rodadaAtual,
                mercadoAberto,
                temporadaEncerrada,
                statusMercado: mercado.status_mercado,
            });
        } else {
            rodadaAtual = rodadaFim;
            if (window.Log) Log.warn(
                "[PARTICIPANTE-LUVA-OURO] ⚠️ API mercado indisponível, usando rodadaFim:",
                rodadaFim,
            );
        }
    } catch (e) {
        if (window.Log) Log.warn(
            "[PARTICIPANTE-LUVA-OURO] ⚠️ Erro ao obter mercado:",
            e.message,
        );
        rodadaAtual = rodadaFim;
    }

    // ✅ FILTRAR TIMES INATIVOS - NÃO PODEM FIGURAR NO RANKING
    const rankingAtivos = ranking.filter((time) => {
        const isInativo = time.ativo === false || time.status === "inativo";
        return !isInativo;
    });
    
    console.log('[DEBUG-LUVA] Ranking após filtro:', {
        rankingAtivosLength: rankingAtivos.length,
        rankingOriginalLength: ranking.length,
        firstAtivo: rankingAtivos[0],
        todosItens: rankingAtivos
    });

    if (rankingAtivos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%); border-radius: 12px; border: 2px dashed rgba(255, 215, 0, 0.3);">
                <span class="material-symbols-outlined" style="font-size: 64px; margin-bottom: 16px; color: #ffd700;">sports_handball</span>
                <h3 style="color: #fff; margin-bottom: 12px;">Luva de Ouro Não Disponível</h3>
                <p style="color: #999;">Nenhum dado de goleiros disponível ainda.</p>
            </div>
        `;
        return;
    }

    const campeao = rankingAtivos[0];
    const minhaPosicao = rankingAtivos.findIndex((r) => isMyTime(r, meuTimeId));
    const meusDados = minhaPosicao >= 0 ? rankingAtivos[minhaPosicao] : null;
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

    // ✅ v3.8: Banner da rodada final com detecção de campeão
    const bannerRodadaFinal = renderizarBannerRodadaFinal(
        rodadaAtual,
        mercadoAberto,
        campeao,
        temporadaEncerrada,
    );

    // ✅ v3.8: Labels dinâmicos
    const labelLider = temporadaEncerrada ? "Campeão" : "Líder";
    const textoVoceELider = temporadaEncerrada
        ? '<span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">emoji_events</span> Você é o CAMPEÃO!'
        : '<span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">emoji_events</span> Você é o líder!';

    const html = `
    <div style="padding: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #ffd700; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span class="material-symbols-outlined">sports_handball</span> Luva de Ouro
            </h2>
            <p style="margin: 0; color: #888; font-size: 12px;">
                Rodadas ${rodadaInicio} - ${rodadaFim}
            </p>
        </div>

        ${bannerRodadaFinal}

        ${
            meusDados
                ? `
        <div style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%); border: 2px solid rgba(255, 215, 0, 0.4); border-radius: 16px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div>
                    <div style="font-size: 10px; color: #ffd700; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Sua Posição</div>
                    <div style="font-size: 28px; font-weight: 900; color: #fff;">${minhaColocacao}º</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 26px; font-weight: 800; color: #ffd700;">${getPontos(meusDados).toFixed(1)}</div>
                    <div style="font-size: 9px; color: #888;">pontos</div>
                </div>
            </div>

            ${
                minhaColocacao > 1
                    ? `
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #888; font-size: 11px;">Distância p/ ${labelLider.toLowerCase()}</span>
                <span style="color: #f59e0b; font-weight: 700; font-size: 13px;">-${distanciaLider.toFixed(1)} pts</span>
            </div>
            `
                    : `
            <div style="background: linear-gradient(90deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1)); border-radius: 8px; padding: 8px 12px; text-align: center;">
                <span style="color: #ffd700; font-weight: 700; font-size: 13px;">${textoVoceELider}</span>
            </div>
            `
            }
        </div>

        ${
            meusGoleiros.length > 0
                ? `
        <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
            <div style="font-size: 11px; color: #888; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size: 14px;">sports_handball</span> Seus Goleiros</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${meusGoleiros
                    .map(
                        (g, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 12px; width: 20px; color: #888;">${idx + 1}º</span>
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
            <div style="font-size: 11px; color: #888; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size: 14px;">bar_chart</span> Últimas Rodadas</div>
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
            <span class="material-symbols-outlined" style="font-size: 32px; margin-bottom: 8px; color: #666;">sentiment_dissatisfied</span>
            <p style="color: #888; font-size: 14px; margin: 8px 0 0 0;">Você não está no ranking</p>
        </div>
        `
        }

        ${
            campeao && (!meusDados || minhaColocacao !== 1)
                ? `
        <div style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.03) 100%); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="material-symbols-outlined" style="font-size: 24px; color: #ffd700;">emoji_events</span>
                <div>
                    <div style="font-size: 10px; color: #ffd700; font-weight: 700; text-transform: uppercase;">${labelLider}</div>
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
                <span style="font-size: 13px; font-weight: 700; color: #ffd700; display: flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size: 16px;">list_alt</span> Ranking Completo</span>
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
                    const posicaoDisplay = pos === 1 ? '<span class="material-symbols-outlined" style="font-size: 16px; color: #ffd700;">emoji_events</span>' : `${pos}º`;

                    html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); ${isMeuTime ? "background: rgba(255, 215, 0, 0.15);" : ""}">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: ${pos === 1 ? "16px" : "12px"}; width: 26px; ${pos === 1 ? "" : "color: #888;"}">${posicaoDisplay}</span>
                            <span style="color: ${isMeuTime ? "#ffd700" : "#fff"}; font-weight: ${isMeuTime ? "700" : "500"}; font-size: 12px;">${getNome(time)}</span>
                        </div>
                        <span style="color: #ffd700; font-weight: 700; font-size: 13px;">${getPontos(time).toFixed(1)}</span>
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

                        html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.03); opacity: 0.5; filter: grayscale(60%);">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 12px; width: 26px; color: #555;">—</span>
                                <span style="color: #666; font-weight: 400; font-size: 12px;">${getNome(time)}</span>
                            </div>
                            <span style="color: #555; font-weight: 500; font-size: 13px;">${getPontos(time).toFixed(1)}</span>
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

    // ✅ v3.7: Mover o card "Meus Dados" para o container externo ao final
    setTimeout(() => {
        const cardDesempenhoContainer = document.getElementById(
            "luva-ouro-card-desempenho",
        );
        const cardMeusDados = container.querySelector(
            '[style*="linear-gradient(135deg, rgba(255, 215, 0, 0.15)"]',
        );

        if (cardDesempenhoContainer && cardMeusDados) {
            // Criar wrapper com estilos do card Seu Desempenho
            const wrapper = document.createElement("div");
            wrapper.innerHTML = `
                <div style="background: linear-gradient(135deg, #1a1a1a 0%, #262626 100%); border-radius: 16px; padding: 16px; border: 1px solid rgba(255, 215, 0, 0.3);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; color: #ffd700; font-weight: 600; font-size: 14px;">
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

if (window.Log) Log.info("[PARTICIPANTE-LUVA-OURO] Módulo v4.0 carregado (Cache-First IndexedDB)");
