// =====================================================================
// PARTICIPANTE-EXTRATO.JS - v2.6 (CAMPOS EDITÁVEIS)
// =====================================================================
// ✅ v2.6: Busca campos editáveis do endpoint específico para UI
// ✅ v2.5: Passa ligaId no extratoData para UI classificar zonas corretamente
// ✅ v2.4: Botão Atualizar limpa cache + chama endpoint de cálculo
// ✅ v2.3: Botão Atualizar limpa cache MongoDB + nova requisição
// ✅ v2.2: Suporte a extrato travado para inativos
// =====================================================================

if (window.Log)
    Log.info("EXTRATO-PARTICIPANTE", "📄 Módulo v2.6 (campos editáveis)");

const PARTICIPANTE_IDS = { ligaId: null, timeId: null };

// =====================================================================
// FUNÇÃO PRINCIPAL - INICIALIZAR
// =====================================================================
export async function inicializarExtratoParticipante({
    participante,
    ligaId,
    timeId,
}) {
    if (window.Log)
        Log.debug("EXTRATO-PARTICIPANTE", "🔄 Inicializando...", {
            ligaId,
            timeId,
        });

    if (!ligaId || !timeId) {
        mostrarErro("Dados inválidos para carregar extrato");
        return;
    }

    PARTICIPANTE_IDS.ligaId = ligaId;
    PARTICIPANTE_IDS.timeId = timeId;

    // ✅ Expor globalmente para a UI
    window.PARTICIPANTE_IDS = PARTICIPANTE_IDS;
    window.participanteData = { ligaId, timeId, participante };

    await carregarExtrato(ligaId, timeId);
}

// =====================================================================
// ✅ v2.6: BUSCAR CAMPOS EDITÁVEIS
// =====================================================================
async function buscarCamposEditaveis(ligaId, timeId) {
    try {
        const url = `/api/fluxo-financeiro/${ligaId}/campos/${timeId}`;
        if (window.Log)
            Log.debug(
                "EXTRATO-PARTICIPANTE",
                "📡 Buscando campos editáveis:",
                url,
            );

        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.campos) {
                if (window.Log)
                    Log.debug(
                        "EXTRATO-PARTICIPANTE",
                        "✅ Campos editáveis:",
                        data.campos.length,
                    );
                return data.campos;
            }
        }

        return [];
    } catch (error) {
        if (window.Log)
            Log.warn(
                "EXTRATO-PARTICIPANTE",
                "⚠️ Erro ao buscar campos:",
                error,
            );
        return [];
    }
}

// =====================================================================
// CARREGAR EXTRATO DO CACHE (BACKEND)
// =====================================================================
async function carregarExtrato(ligaId, timeId) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) {
        if (window.Log)
            Log.error("EXTRATO-PARTICIPANTE", "❌ Container não encontrado");
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
            if (window.Log)
                Log.warn(
                    "EXTRATO-PARTICIPANTE",
                    "⚠️ Falha ao buscar rodada atual",
                );
        }

        let extratoData = null;

        // ✅ PASSO 1: Tentar buscar do cache
        const urlCache = `/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${rodadaAtual}`;
        if (window.Log)
            Log.debug("EXTRATO-PARTICIPANTE", "📡 Buscando cache:", urlCache);

        const responseCache = await fetch(urlCache);

        if (responseCache.ok) {
            const cacheData = await responseCache.json();
            if (window.Log)
                Log.debug("EXTRATO-PARTICIPANTE", "📦 Cache recebido:", {
                    cached: cacheData.cached,
                    qtdRodadas: cacheData.rodadas?.length || 0,
                    inativo: cacheData.inativo,
                    extratoTravado: cacheData.extratoTravado,
                });

            if (
                cacheData.cached &&
                cacheData.rodadas &&
                cacheData.rodadas.length > 0
            ) {
                extratoData = {
                    ligaId: ligaId, // ✅ Passar ligaId para UI
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
                if (window.Log)
                    Log.debug(
                        "EXTRATO-PARTICIPANTE",
                        "✅ Cache válido",
                        extratoData.extratoTravado
                            ? `| TRAVADO R${extratoData.rodadaTravada}`
                            : "",
                    );
            }
        } else {
            if (window.Log)
                Log.debug(
                    "EXTRATO-PARTICIPANTE",
                    "⚠️ Cache não encontrado (status:",
                    responseCache.status,
                    ")",
                );
        }

        // ✅ PASSO 2: Se cache não existe ou inválido, chamar endpoint de cálculo
        if (!extratoData) {
            if (window.Log)
                Log.debug(
                    "EXTRATO-PARTICIPANTE",
                    "📡 Buscando endpoint de cálculo...",
                );
            const urlCalculo = `/api/fluxo-financeiro/${ligaId}/extrato/${timeId}`;

            const resCalculo = await fetch(urlCalculo);

            if (resCalculo.ok) {
                const dadosCalculados = await resCalculo.json();
                if (window.Log)
                    Log.debug("EXTRATO-PARTICIPANTE", "✅ Dados calculados:", {
                        success: dadosCalculados.success,
                        extrato: dadosCalculados.extrato?.length || 0,
                        saldo: dadosCalculados.saldo_atual,
                    });

                // Transformar formato do controller para o formato esperado pela UI
                if (dadosCalculados.success && dadosCalculados.extrato) {
                    extratoData = transformarDadosController(dadosCalculados);
                }
            }
        }

        if (
            !extratoData ||
            !extratoData.rodadas ||
            extratoData.rodadas.length === 0
        ) {
            mostrarVazio();
            return;
        }

        // ✅ v2.6: Buscar campos editáveis do endpoint específico
        const camposEditaveis = await buscarCamposEditaveis(ligaId, timeId);

        // Mesclar campos: priorizar campos editáveis se existirem
        if (camposEditaveis.length > 0) {
            extratoData.camposManuais = camposEditaveis;
            extratoData.camposEditaveis = camposEditaveis;
        }

        // Renderizar
        if (window.Log)
            Log.debug(
                "EXTRATO-PARTICIPANTE",
                "🎨 Renderizando",
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

        if (window.Log)
            Log.info(
                "EXTRATO-PARTICIPANTE",
                "✅ Extrato carregado com sucesso",
            );
    } catch (error) {
        if (window.Log) Log.error("EXTRATO-PARTICIPANTE", "❌ Erro:", error);
        mostrarErro(error.message);
    }
}

// =====================================================================
// TRANSFORMAR DADOS DO CONTROLLER PARA FORMATO UI
// =====================================================================
function transformarDadosController(dados) {
    // O controller retorna { extrato: [...transacoes], saldo_atual, resumo }
    // Precisamos agrupar por rodada

    const transacoes = dados.extrato || [];
    const rodadasMap = {};

    transacoes.forEach((t) => {
        if (t.rodada === null) return; // Ignora ajustes manuais aqui

        const numRodada = t.rodada;
        if (!rodadasMap[numRodada]) {
            rodadasMap[numRodada] = {
                rodada: numRodada,
                bonusOnus: 0,
                pontosCorridos: 0,
                mataMata: 0,
                top10: 0,
                saldo: 0,
            };
        }

        const r = rodadasMap[numRodada];
        const valor = parseFloat(t.valor) || 0;

        switch (t.tipo) {
            case "PONTOS_CORRIDOS":
                r.pontosCorridos += valor;
                break;
            case "MATA_MATA":
                r.mataMata += valor;
                break;
            case "MITO":
                r.top10 += valor;
                break;
            case "MICO":
                r.top10 += valor;
                break;
            default:
                r.bonusOnus += valor;
        }
        r.saldo += valor;
    });

    // Ordenar por rodada e calcular acumulado
    const rodadasArray = Object.values(rodadasMap).sort(
        (a, b) => a.rodada - b.rodada,
    );
    let saldoAcumulado = 0;
    rodadasArray.forEach((r) => {
        saldoAcumulado += r.saldo;
        r.saldoAcumulado = saldoAcumulado;
    });

    // Extrair campos manuais do extrato
    const camposManuais = transacoes
        .filter((t) => t.tipo === "AJUSTE_MANUAL")
        .map((t, idx) => ({
            nome: t.descricao || `Campo ${idx + 1}`,
            valor: t.valor,
        }));

    return {
        ligaId: PARTICIPANTE_IDS.ligaId, // ✅ Passar ligaId para UI
        rodadas: rodadasArray,
        resumo: dados.resumo || {
            saldo: dados.saldo_atual,
            totalGanhos: 0,
            totalPerdas: 0,
        },
        camposManuais: camposManuais,
        inativo: false,
        extratoTravado: false,
        rodadaTravada: null,
        rodadaDesistencia: null,
    };
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
// ✅ v2.3: REFRESH COM LIMPEZA DE CACHE
// =====================================================================
window.forcarRefreshExtratoParticipante = async function () {
    if (window.Log)
        Log.info("EXTRATO-PARTICIPANTE", "🔄 Refresh solicitado (com limpeza)");

    if (!PARTICIPANTE_IDS.ligaId || !PARTICIPANTE_IDS.timeId) {
        if (window.Log)
            Log.error("EXTRATO-PARTICIPANTE", "IDs não disponíveis");
        return;
    }

    const btn = document.getElementById("btnRefreshExtrato");
    if (btn) {
        btn.classList.add("loading");
        btn.disabled = true;
    }

    const container = document.getElementById("fluxoFinanceiroContent");
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Recalculando extrato...</p>
            </div>
        `;
    }

    try {
        // ✅ PASSO 1: Limpar cache no MongoDB
        const urlLimpeza = `/api/extrato-cache/${PARTICIPANTE_IDS.ligaId}/times/${PARTICIPANTE_IDS.timeId}/limpar`;
        if (window.Log)
            Log.debug("EXTRATO-PARTICIPANTE", "🗑️ Limpando cache:", urlLimpeza);

        const resLimpeza = await fetch(urlLimpeza, { method: "DELETE" });

        if (resLimpeza.ok) {
            const resultado = await resLimpeza.json();
            if (window.Log)
                Log.debug("EXTRATO-PARTICIPANTE", "✅ Cache limpo:", resultado);
        } else {
            if (window.Log)
                Log.warn(
                    "EXTRATO-PARTICIPANTE",
                    "⚠️ Falha ao limpar cache:",
                    resLimpeza.status,
                );
        }

        // ✅ PASSO 2: Chamar endpoint DIRETO que calcula do zero
        const urlCalculo = `/api/fluxo-financeiro/${PARTICIPANTE_IDS.ligaId}/extrato/${PARTICIPANTE_IDS.timeId}`;
        if (window.Log)
            Log.debug("EXTRATO-PARTICIPANTE", "🔄 Recalculando:", urlCalculo);

        const resCalculo = await fetch(urlCalculo);

        if (!resCalculo.ok) {
            throw new Error(`Erro ao recalcular: ${resCalculo.status}`);
        }

        const dadosCalculados = await resCalculo.json();
        if (window.Log)
            Log.debug("EXTRATO-PARTICIPANTE", "✅ Extrato recalculado:", {
                success: dadosCalculados.success,
                extrato: dadosCalculados.extrato?.length || 0,
                saldo: dadosCalculados.saldo_atual,
            });

        // ✅ PASSO 3: Transformar e renderizar dados novos
        let extratoData = null;

        if (dadosCalculados.success && dadosCalculados.extrato) {
            extratoData = transformarDadosController(dadosCalculados);
        } else if (
            dadosCalculados.rodadas &&
            dadosCalculados.rodadas.length > 0
        ) {
            extratoData = {
                ligaId: PARTICIPANTE_IDS.ligaId, // ✅ Passar ligaId para UI
                rodadas: dadosCalculados.rodadas,
                resumo: dadosCalculados.resumo || {
                    saldo: 0,
                    totalGanhos: 0,
                    totalPerdas: 0,
                },
                camposManuais: dadosCalculados.camposManuais || [],
                inativo: dadosCalculados.inativo || false,
                extratoTravado: dadosCalculados.extratoTravado || false,
                rodadaTravada: dadosCalculados.rodadaTravada || null,
                rodadaDesistencia: dadosCalculados.rodadaDesistencia || null,
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

        // ✅ v2.6: Buscar campos editáveis após recálculo
        const camposEditaveis = await buscarCamposEditaveis(
            PARTICIPANTE_IDS.ligaId,
            PARTICIPANTE_IDS.timeId,
        );

        if (camposEditaveis.length > 0) {
            extratoData.camposManuais = camposEditaveis;
            extratoData.camposEditaveis = camposEditaveis;
        }

        if (window.Log)
            Log.debug(
                "EXTRATO-PARTICIPANTE",
                "🎨 Renderizando",
                extratoData.rodadas.length,
                "rodadas recalculadas |",
                extratoData.camposManuais?.length || 0,
                "campos manuais",
            );

        const { renderizarExtratoParticipante } = await import(
            "./participante-extrato-ui.js"
        );
        renderizarExtratoParticipante(extratoData, PARTICIPANTE_IDS.timeId);

        if (window.Log)
            Log.info("EXTRATO-PARTICIPANTE", "✅ Refresh completo!");
    } catch (error) {
        if (window.Log)
            Log.error("EXTRATO-PARTICIPANTE", "❌ Erro no refresh:", error);
        mostrarErro("Erro ao atualizar. Tente novamente.");
    } finally {
        if (btn) {
            btn.classList.remove("loading");
            btn.disabled = false;
        }
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
    if (window.Log) Log.debug("EXTRATO-PARTICIPANTE", "Módulo pronto");
}

if (window.Log)
    Log.info(
        "EXTRATO-PARTICIPANTE",
        "✅ Módulo v2.6 carregado (campos editáveis)",
    );
