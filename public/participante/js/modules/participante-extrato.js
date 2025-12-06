// =====================================================================
// PARTICIPANTE-EXTRATO.JS - v2.2 (SUPORTE A INATIVOS)
// =====================================================================
// ✅ v2.2: Suporte a extrato travado para inativos
// ✅ Consome dados prontos do backend (cache já calculado)
// =====================================================================

console.log("[EXTRATO-PARTICIPANTE] 📄 Módulo v2.2 (suporte a inativos)");

const PARTICIPANTE_IDS = { ligaId: null, timeId: null };

// =====================================================================
// FUNÇÃO PRINCIPAL - INICIALIZAR
// =====================================================================
export async function inicializarExtratoParticipante({
    participante,
    ligaId,
    timeId,
}) {
    console.log("[EXTRATO-PARTICIPANTE] 🔄 Inicializando...", {
        ligaId,
        timeId,
    });

    if (!ligaId || !timeId) {
        mostrarErro("Dados inválidos para carregar extrato");
        return;
    }

    PARTICIPANTE_IDS.ligaId = ligaId;
    PARTICIPANTE_IDS.timeId = timeId;

    window.participanteData = { ligaId, timeId, participante };

    await carregarExtrato(ligaId, timeId);
}

// =====================================================================
// CARREGAR EXTRATO DO CACHE (BACKEND)
// =====================================================================
async function carregarExtrato(ligaId, timeId, forcarRefresh = false) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) {
        console.error("[EXTRATO-PARTICIPANTE] ❌ Container não encontrado");
        return;
    }

    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando extrato...</p>
        </div>
    `;

    try {
        // Buscar rodada atual
        let rodadaAtual = 1;
        try {
            const resStatus = await fetch("/api/cartola/mercado/status");
            if (resStatus.ok) {
                const status = await resStatus.json();
                rodadaAtual = status.rodada_atual || 1;
            }
        } catch (e) {
            console.warn(
                "[EXTRATO-PARTICIPANTE] ⚠️ Falha ao buscar rodada atual",
            );
        }

        // Buscar extrato do cache
        const url = `/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${rodadaAtual}`;
        console.log("[EXTRATO-PARTICIPANTE] 📡 Buscando:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro ao buscar extrato: ${response.status}`);
        }

        const cacheData = await response.json();
        console.log("[EXTRATO-PARTICIPANTE] 📦 Cache recebido:", {
            cached: cacheData.cached,
            temRodadas: !!cacheData.rodadas,
            qtdRodadas: cacheData.rodadas?.length || 0,
            resumo: cacheData.resumo,
            camposManuais: cacheData.camposManuais?.length || 0,
            // ✅ v2.2: Logs de inativo
            inativo: cacheData.inativo,
            extratoTravado: cacheData.extratoTravado,
            rodadaTravada: cacheData.rodadaTravada,
        });

        // Validar estrutura do cache
        let extratoData = null;

        if (
            cacheData.cached &&
            cacheData.rodadas &&
            cacheData.rodadas.length > 0
        ) {
            const primeiraRodada = cacheData.rodadas[0];
            const temCamposCompletos =
                primeiraRodada.posicao !== undefined ||
                primeiraRodada.bonusOnus !== undefined;

            if (temCamposCompletos) {
                extratoData = {
                    rodadas: cacheData.rodadas,
                    resumo: cacheData.resumo || {
                        saldo: 0,
                        totalGanhos: 0,
                        totalPerdas: 0,
                    },
                    camposManuais: cacheData.camposManuais || [],
                    // ✅ v2.2: Dados de inativo
                    inativo: cacheData.inativo || false,
                    extratoTravado: cacheData.extratoTravado || false,
                    rodadaTravada: cacheData.rodadaTravada || null,
                    rodadaDesistencia: cacheData.rodadaDesistencia || null,
                };
                console.log(
                    "[EXTRATO-PARTICIPANTE] ✅ Cache válido",
                    extratoData.extratoTravado
                        ? `| TRAVADO na R${extratoData.rodadaTravada}`
                        : "",
                );
            }
        }

        // Se cache não tem dados completos, tentar endpoint direto
        if (!extratoData) {
            console.log(
                "[EXTRATO-PARTICIPANTE] 📡 Buscando endpoint direto...",
            );

            const resDireto = await fetch(
                `/api/fluxo-financeiro/${ligaId}/extrato/${timeId}`,
            );
            if (resDireto.ok) {
                const dadosDireto = await resDireto.json();

                if (
                    dadosDireto &&
                    dadosDireto.rodadas &&
                    dadosDireto.rodadas.length > 0
                ) {
                    extratoData = {
                        ...dadosDireto,
                        camposManuais:
                            dadosDireto.camposManuais ||
                            cacheData.camposManuais ||
                            [],
                        inativo:
                            dadosDireto.inativo || cacheData.inativo || false,
                        extratoTravado:
                            dadosDireto.extratoTravado ||
                            cacheData.extratoTravado ||
                            false,
                        rodadaTravada:
                            dadosDireto.rodadaTravada ||
                            cacheData.rodadaTravada ||
                            null,
                        rodadaDesistencia:
                            dadosDireto.rodadaDesistencia ||
                            cacheData.rodadaDesistencia ||
                            null,
                    };
                } else if (
                    Array.isArray(dadosDireto) &&
                    dadosDireto.length > 0
                ) {
                    extratoData = {
                        rodadas: dadosDireto,
                        resumo: calcularResumoLocal(dadosDireto),
                        camposManuais: cacheData.camposManuais || [],
                        inativo: cacheData.inativo || false,
                        extratoTravado: cacheData.extratoTravado || false,
                        rodadaTravada: cacheData.rodadaTravada || null,
                        rodadaDesistencia: cacheData.rodadaDesistencia || null,
                    };
                }
            }
        }

        // Usar cache mesmo com campos incompletos
        if (!extratoData && cacheData.rodadas && cacheData.rodadas.length > 0) {
            extratoData = {
                rodadas: cacheData.rodadas,
                resumo: cacheData.resumo || {
                    saldo: 0,
                    totalGanhos: 0,
                    totalPerdas: 0,
                },
                camposManuais: cacheData.camposManuais || [],
                inativo: cacheData.inativo || false,
                extratoTravado: cacheData.extratoTravado || false,
                rodadaTravada: cacheData.rodadaTravada || null,
                rodadaDesistencia: cacheData.rodadaDesistencia || null,
            };
        }

        if (
            !extratoData ||
            !extratoData.rodadas ||
            extratoData.rodadas.length === 0
        ) {
            mostrarVazio();
            return;
        }

        // Renderizar
        console.log(
            "[EXTRATO-PARTICIPANTE] 🎨 Renderizando",
            extratoData.rodadas.length,
            "rodadas |",
            extratoData.camposManuais?.length || 0,
            "campos manuais",
            extratoData.extratoTravado
                ? `| TRAVADO R${extratoData.rodadaTravada}`
                : "",
        );

        const { renderizarExtratoParticipante } = await import(
            "./participante-extrato-ui.js"
        );
        renderizarExtratoParticipante(extratoData, timeId);

        console.log("[EXTRATO-PARTICIPANTE] ✅ Extrato carregado com sucesso");
    } catch (error) {
        console.error("[EXTRATO-PARTICIPANTE] ❌ Erro:", error);
        mostrarErro(error.message);
    }
}

// =====================================================================
// FUNÇÕES AUXILIARES
// =====================================================================

function calcularResumoLocal(rodadas) {
    if (!Array.isArray(rodadas) || rodadas.length === 0) {
        return { saldo: 0, totalGanhos: 0, totalPerdas: 0, saldo_final: 0 };
    }

    let totalGanhos = 0;
    let totalPerdas = 0;

    rodadas.forEach((r) => {
        const saldoRodada =
            (r.bonusOnus || 0) +
            (r.pontosCorridos || 0) +
            (r.mataMata || 0) +
            (r.top10 || 0);
        if (saldoRodada > 0) totalGanhos += saldoRodada;
        else totalPerdas += saldoRodada;
    });

    const saldo = totalGanhos + totalPerdas;
    return { saldo, saldo_final: saldo, totalGanhos, totalPerdas };
}

function mostrarVazio() {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #999;">
            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📊</div>
            <h3 style="color: #ccc; margin-bottom: 8px;">Sem dados ainda</h3>
            <p style="font-size: 13px;">O extrato será gerado após a primeira rodada.</p>
        </div>
    `;

    atualizarHeaderZerado();
}

function mostrarErro(mensagem) {
    const container =
        document.getElementById("fluxoFinanceiroContent") ||
        document.getElementById("moduleContainer");

    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1);
                        border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3 style="color: #ef4444; margin-bottom: 12px;">Erro ao Carregar</h3>
                <p style="color: #e0e0e0; margin-bottom: 20px;">${mensagem}</p>
                <button onclick="window.forcarRefreshExtratoParticipante()"
                        style="padding: 12px 24px; background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%);
                               color: white; border: none; border-radius: 8px; cursor: pointer;
                               font-weight: 600; font-size: 14px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function atualizarHeaderZerado() {
    const saldoEl = document.getElementById("saldoTotalHeader");
    const ganhosEl = document.getElementById("totalGanhosHeader");
    const perdasEl = document.getElementById("totalPerdeuHeader");
    const badgeEl = document.getElementById("saldoStatusBadge");

    if (saldoEl) saldoEl.textContent = "R$ 0,00";
    if (ganhosEl) ganhosEl.textContent = "R$ 0,00";
    if (perdasEl) perdasEl.textContent = "R$ 0,00";
    if (badgeEl) {
        badgeEl.querySelector(".status-icon").textContent = "⏳";
        badgeEl.querySelector(".status-text").textContent = "AGUARDANDO";
    }
}

// =====================================================================
// REFRESH
// =====================================================================
window.forcarRefreshExtratoParticipante = async function () {
    console.log("[EXTRATO-PARTICIPANTE] 🔄 Refresh solicitado");

    if (!PARTICIPANTE_IDS.ligaId || !PARTICIPANTE_IDS.timeId) {
        console.error("[EXTRATO-PARTICIPANTE] IDs não disponíveis");
        return;
    }

    const btn = document.getElementById("btnRefreshExtrato");
    if (btn) btn.classList.add("loading");

    try {
        await carregarExtrato(
            PARTICIPANTE_IDS.ligaId,
            PARTICIPANTE_IDS.timeId,
            true,
        );
    } finally {
        if (btn) btn.classList.remove("loading");
    }
};

window.mostrarLoadingExtrato = function () {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Atualizando...</p>
            </div>
        `;
    }
};

// =====================================================================
// EXPORTS GLOBAIS
// =====================================================================
window.inicializarExtratoParticipante = inicializarExtratoParticipante;

export function initExtratoParticipante() {
    console.log("[EXTRATO-PARTICIPANTE] Módulo pronto");
}

console.log(
    "[EXTRATO-PARTICIPANTE] ✅ Módulo v2.2 carregado (suporte a inativos)",
);
