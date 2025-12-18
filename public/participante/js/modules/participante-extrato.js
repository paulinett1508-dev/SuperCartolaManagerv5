// =====================================================================
// PARTICIPANTE-EXTRATO.JS - v3.4 (FIX CAMPOS MANUAIS)
// Destino: /participante/js/modules/participante-extrato.js
// =====================================================================
// ✅ v3.4: FIX - Re-renderiza quando campos manuais (ajustes) ou saldo mudam
// ✅ v3.3: ACERTOS FINANCEIROS - Exibe pagamentos/recebimentos no extrato
// ✅ v3.2: FIX - Detecta ausência de MATA_MATA mesmo com temporada encerrada
// ✅ v3.1: CACHE-FIRST - Carregamento instantâneo do IndexedDB
// ✅ v3.0: TEMPORADA ENCERRADA - dados são perpétuos, sem recálculos
// ✅ v2.8: Detecta cache incompleto e força recálculo automático
// ✅ v2.7: Correção URL campos editáveis (/times/ ao invés de /campos/)
// =====================================================================

// ⚽ CONFIGURAÇÃO DO CAMPEONATO 2025
const RODADA_FINAL_CAMPEONATO = 38;
const CAMPEONATO_ENCERRADO = true; // ✅ v3.0: Temporada 2025 finalizada

if (window.Log)
    Log.info("EXTRATO-PARTICIPANTE", `📄 Módulo v3.4 FIX-CAMPOS-MANUAIS (Temporada ${CAMPEONATO_ENCERRADO ? 'ENCERRADA' : 'em andamento'})`);

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
        Log.info("EXTRATO-PARTICIPANTE", "🔄 Inicializando...", {
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
// ✅ v3.2: DETECTAR CACHE INCOMPLETO (com verificação de MATA_MATA)
// =====================================================================
function detectarCacheIncompleto(rodadas) {
    if (!Array.isArray(rodadas) || rodadas.length === 0) return false;

    // ✅ v3.2 FIX: Verificar se falta MATA_MATA mesmo com temporada encerrada
    // Edições de Mata-Mata ocorrem em rodadas específicas (2-7, 9-14, 15-21, 22-26, 31-35)
    const rodadasMataMata = [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 31, 32, 33, 34, 35];

    // Verificar se existe pelo menos uma transação de MATA_MATA nas rodadas que deveriam ter
    const rodadasComMM = rodadas.filter(r => {
        const temMM = (r.mataMata || 0) !== 0;
        const ehRodadaMM = rodadasMataMata.includes(r.rodada);
        return ehRodadaMM && temMM;
    });

    // Se não tem NENHUMA transação de MM nas rodadas de MM, cache está incompleto
    if (rodadasComMM.length === 0) {
        if (window.Log) Log.warn("EXTRATO-PARTICIPANTE", "⚠️ Cache sem transações de Mata-Mata - forçando recálculo");
        return true;
    }

    // ✅ v3.0: TEMPORADA ENCERRADA = NUNCA recalcular (dados são perpétuos)
    // Exceto se detectou falta de MATA_MATA acima
    if (CAMPEONATO_ENCERRADO) {
        if (window.Log) Log.debug("EXTRATO-PARTICIPANTE", "🔒 Temporada encerrada - dados perpétuos, sem recálculo");
        return false;
    }

    if (!Array.isArray(rodadas) || rodadas.length === 0) return false;

    // Contadores para análise
    let rodadasSemDados = 0;
    let rodadasApenasBonus = 0;
    let totalRodadas = rodadas.length;

    rodadas.forEach((r) => {
        const temBonus = (r.bonusOnus || 0) !== 0;
        const temPC = (r.pontosCorridos || 0) !== 0;
        const temMM = (r.mataMata || 0) !== 0;
        const temTop10 = (r.top10 || 0) !== 0;
        const saldo = r.saldo || 0;

        // Rodada completamente zerada
        if (!temBonus && !temPC && !temMM && !temTop10 && saldo === 0) {
            rodadasSemDados++;
        }
        // Rodada só com bonusOnus (cache antigo sem PC/MM/Top10)
        else if (temBonus && !temPC && !temMM && !temTop10) {
            rodadasApenasBonus++;
        }
    });

    // ✅ Heurísticas de cache incompleto:
    // 1. Mais de 50% das rodadas zeradas = suspeito
    // 2. Mais de 80% das rodadas só com bonusOnus = cache antigo
    // 3. Últimas 5 rodadas todas zeradas = muito suspeito

    const percentualZeradas = (rodadasSemDados / totalRodadas) * 100;
    const percentualApenasBonus = (rodadasApenasBonus / totalRodadas) * 100;

    // Verificar últimas 5 rodadas
    const ultimasRodadas = rodadas.slice(-5);
    const ultimasZeradas = ultimasRodadas.filter((r) => {
        const saldo =
            (r.bonusOnus || 0) +
            (r.pontosCorridos || 0) +
            (r.mataMata || 0) +
            (r.top10 || 0);
        return saldo === 0;
    }).length;

    const cacheIncompleto =
        percentualZeradas > 50 ||
        percentualApenasBonus > 80 ||
        (ultimasZeradas >= 4 && totalRodadas > 10);

    if (cacheIncompleto && window.Log) {
        Log.warn("EXTRATO-PARTICIPANTE", "⚠️ Cache incompleto detectado:", {
            totalRodadas,
            rodadasSemDados,
            rodadasApenasBonus,
            percentualZeradas: percentualZeradas.toFixed(1) + "%",
            percentualApenasBonus: percentualApenasBonus.toFixed(1) + "%",
            ultimasZeradas,
        });
    }

    return cacheIncompleto;
}

// =====================================================================
// ✅ v2.7: BUSCAR CAMPOS EDITÁVEIS (URL CORRIGIDA)
// =====================================================================
async function buscarCamposEditaveis(ligaId, timeId) {
    try {
        // ✅ CORREÇÃO: /times/ ao invés de /campos/
        const url = `/api/fluxo-financeiro/${ligaId}/times/${timeId}`;
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
// CARREGAR EXTRATO (v3.1 CACHE-FIRST)
// =====================================================================
async function carregarExtrato(ligaId, timeId) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) {
        if (window.Log)
            Log.error("EXTRATO-PARTICIPANTE", "❌ Container não encontrado");
        return;
    }

    const cache = window.ParticipanteCache;
    let usouCache = false;
    let extratoDataCache = null;

    // =========================================================================
    // FASE 1: CARREGAMENTO INSTANTÂNEO (Cache IndexedDB)
    // =========================================================================
    if (cache) {
        extratoDataCache = await (cache.getExtratoAsync ? cache.getExtratoAsync(ligaId, timeId) : cache.getExtrato(ligaId, timeId));

        if (extratoDataCache && extratoDataCache.rodadas && extratoDataCache.rodadas.length > 0) {
            usouCache = true;
            if (window.Log) Log.info("EXTRATO-PARTICIPANTE", "⚡ INSTANT LOAD - dados do cache!");

            // Renderizar IMEDIATAMENTE com dados do cache
            const { renderizarExtratoParticipante } = await import(
                "./participante-extrato-ui.js"
            );
            renderizarExtratoParticipante(extratoDataCache, timeId);
        }
    }

    // Se não tem cache, mostrar loading
    if (!usouCache) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Carregando extrato...</p>
            </div>
        `;
    }

    // =========================================================================
    // FASE 2: ATUALIZAÇÃO EM BACKGROUND (Fetch API)
    // =========================================================================
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
        let usouCacheBackend = false;
        let precisaRecalculo = false;

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
                // ✅ v2.8: Verificar se cache parece completo
                precisaRecalculo = detectarCacheIncompleto(cacheData.rodadas);

                if (!precisaRecalculo) {
                    extratoData = {
                        ligaId: ligaId,
                        rodadas: cacheData.rodadas,
                        resumo: cacheData.resumo || {
                            saldo: 0,
                            totalGanhos: 0,
                            totalPerdas: 0,
                        },
                        camposManuais: cacheData.camposManuais || [],
                        // ✅ v2.9: Incluir acertos financeiros
                        acertos: cacheData.acertos || { lista: [], resumo: {} },
                        inativo: cacheData.inativo || false,
                        extratoTravado: cacheData.extratoTravado || false,
                        rodadaTravada: cacheData.rodadaTravada || null,
                        rodadaDesistencia: cacheData.rodadaDesistencia || null,
                    };
                    usouCacheBackend = true;
                    if (window.Log)
                        Log.info(
                            "EXTRATO-PARTICIPANTE",
                            "✅ Cache backend válido e completo",
                            extratoData.extratoTravado
                                ? `| TRAVADO R${extratoData.rodadaTravada}`
                                : "",
                        );
                } else {
                    if (window.Log)
                        Log.warn(
                            "EXTRATO-PARTICIPANTE",
                            "🔄 Cache incompleto, forçando recálculo...",
                        );
                }
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

        // ✅ PASSO 2: Se cache não existe, inválido OU INCOMPLETO, chamar endpoint de cálculo
        if (!extratoData || precisaRecalculo) {
            if (window.Log)
                Log.debug(
                    "EXTRATO-PARTICIPANTE",
                    precisaRecalculo
                        ? "🔄 Recalculando (cache incompleto)..."
                        : "📡 Buscando endpoint de cálculo...",
                );

            // ✅ v2.8: Se cache incompleto, limpar antes de recalcular
            if (precisaRecalculo) {
                try {
                    const urlLimpeza = `/api/extrato-cache/${ligaId}/times/${timeId}/limpar`;
                    await fetch(urlLimpeza, { method: "DELETE" });
                    if (window.Log)
                        Log.debug(
                            "EXTRATO-PARTICIPANTE",
                            "🗑️ Cache antigo limpo",
                        );
                } catch (e) {
                    // Ignora erro de limpeza
                }
            }

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
            if (!usouCache) mostrarVazio();
            return;
        }

        // ✅ v2.7: Buscar campos editáveis do endpoint específico (URL corrigida)
        const camposEditaveis = await buscarCamposEditaveis(ligaId, timeId);

        // Mesclar campos: priorizar campos editáveis se existirem
        if (camposEditaveis.length > 0) {
            extratoData.camposManuais = camposEditaveis;
            extratoData.camposEditaveis = camposEditaveis;
        }

        // ✅ v3.1: Salvar no cache local (IndexedDB)
        if (cache) {
            cache.setExtrato(ligaId, timeId, extratoData);
            if (window.Log) Log.debug("EXTRATO-PARTICIPANTE", "💾 Dados salvos no cache local");
        }

        // ✅ v3.4: Verificar se dados novos têm mudanças que justificam re-render
        let deveReRenderizar = !usouCache;
        if (usouCache && extratoDataCache) {
            // Cache local tinha MM?
            const cacheLocalTinhaMM = extratoDataCache.rodadas?.some(r => (r.mataMata || 0) !== 0);
            // Dados novos têm MM?
            const dadosNovosTemMM = extratoData.rodadas?.some(r => (r.mataMata || 0) !== 0);

            if (!cacheLocalTinhaMM && dadosNovosTemMM) {
                if (window.Log) Log.info("EXTRATO-PARTICIPANTE", "🔄 Dados novos têm MATA_MATA - re-renderizando!");
                deveReRenderizar = true;
            }

            // ✅ v3.3: Verificar se acertos financeiros mudaram
            const acertosCacheLocal = extratoDataCache.acertos?.lista?.length || 0;
            const acertosNovos = extratoData.acertos?.lista?.length || 0;
            const saldoAcertosCache = extratoDataCache.acertos?.resumo?.saldo || 0;
            const saldoAcertosNovo = extratoData.acertos?.resumo?.saldo || 0;

            if (acertosCacheLocal !== acertosNovos || saldoAcertosCache !== saldoAcertosNovo) {
                if (window.Log) Log.info("EXTRATO-PARTICIPANTE", "🔄 Acertos financeiros mudaram - re-renderizando!", {
                    cacheQtd: acertosCacheLocal,
                    novoQtd: acertosNovos,
                    cacheSaldo: saldoAcertosCache,
                    novoSaldo: saldoAcertosNovo
                });
                deveReRenderizar = true;
            }

            // ✅ v3.4 FIX: Verificar se campos manuais (ajustes) mudaram
            const camposCacheLocal = extratoDataCache.camposManuais || [];
            const camposNovos = extratoData.camposManuais || [];
            const totalCamposCache = camposCacheLocal.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
            const totalCamposNovo = camposNovos.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);

            if (totalCamposCache !== totalCamposNovo || camposCacheLocal.length !== camposNovos.length) {
                if (window.Log) Log.info("EXTRATO-PARTICIPANTE", "🔄 Campos manuais (ajustes) mudaram - re-renderizando!", {
                    cacheTotal: totalCamposCache,
                    novoTotal: totalCamposNovo,
                    cacheQtd: camposCacheLocal.length,
                    novoQtd: camposNovos.length
                });
                deveReRenderizar = true;
            }

            // ✅ v3.4 FIX: Verificar se o saldo total mudou (fallback seguro)
            const saldoCache = extratoDataCache.resumo?.saldo ?? extratoDataCache.resumo?.saldo_final ?? 0;
            const saldoNovo = extratoData.resumo?.saldo ?? extratoData.resumo?.saldo_final ?? 0;

            if (Math.abs(saldoCache - saldoNovo) > 0.01) {
                if (window.Log) Log.info("EXTRATO-PARTICIPANTE", "🔄 Saldo total mudou - re-renderizando!", {
                    saldoCache,
                    saldoNovo,
                    diferenca: (saldoNovo - saldoCache).toFixed(2)
                });
                deveReRenderizar = true;
            }
        }

        // Renderizar se necessário
        if (deveReRenderizar) {
            if (window.Log)
                Log.info(
                    "EXTRATO-PARTICIPANTE",
                    "🎨 Renderizando",
                    extratoData.rodadas.length,
                    "rodadas |",
                    extratoData.camposManuais?.length || 0,
                    "campos manuais",
                    extratoData.extratoTravado
                        ? `| TRAVADO R${extratoData.rodadaTravada}`
                        : "",
                    usouCacheBackend ? "| (cache backend)" : "| (calculado)",
                );

            const { renderizarExtratoParticipante } = await import(
                "./participante-extrato-ui.js"
            );
            renderizarExtratoParticipante(extratoData, timeId);
        }

        if (window.Log)
            Log.info(
                "EXTRATO-PARTICIPANTE",
                "✅ Extrato carregado com sucesso",
            );
    } catch (error) {
        if (window.Log) Log.error("EXTRATO-PARTICIPANTE", "❌ Erro:", error);
        if (!usouCache) mostrarErro(error.message);
    }
}

// =====================================================================
// TRANSFORMAR DADOS DO CONTROLLER PARA FORMATO UI
// =====================================================================
function transformarDadosController(dados) {
    // O controller retorna { extrato: [...transacoes], saldo_atual, resumo, acertos }
    // Precisamos agrupar por rodada

    const transacoes = dados.extrato || [];
    const rodadasMap = {};

    transacoes.forEach((t) => {
        // ✅ v3.3: Ignora ajustes manuais e acertos financeiros aqui (processados separadamente)
        if (t.rodada === null || t.tipo === "ACERTO_FINANCEIRO") return;

        const numRodada = t.rodada;
        if (!rodadasMap[numRodada]) {
            rodadasMap[numRodada] = {
                rodada: numRodada,
                posicao: t.posicao || null,
                bonusOnus: 0,
                pontosCorridos: 0,
                mataMata: 0,
                top10: 0,
                saldo: 0,
                isMito: false,
                isMico: false,
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
                r.isMito = true;
                break;
            case "MICO":
                r.top10 += valor;
                r.isMico = true;
                break;
            case "BONUS":
            case "BANCO_RODADA":
                r.bonusOnus += valor;
                break;
            case "ONUS":
                r.bonusOnus += valor;
                break;
            default:
                r.bonusOnus += valor;
        }
        r.saldo = r.bonusOnus + r.pontosCorridos + r.mataMata + r.top10;

        // Atualizar posição se veio na transação
        if (t.posicao && !r.posicao) {
            r.posicao = t.posicao;
        }
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

    // ✅ v3.3: Extrair acertos financeiros
    const acertosFinanceiros = transacoes
        .filter((t) => t.tipo === "ACERTO_FINANCEIRO")
        .map((t) => ({
            tipo: t.subtipo || "pagamento",
            descricao: t.descricao,
            valor: t.valor,
            data: t.data,
            metodoPagamento: t.metodoPagamento,
        }));

    // Calcular resumo
    let totalGanhos = 0;
    let totalPerdas = 0;
    rodadasArray.forEach((r) => {
        if (r.saldo > 0) totalGanhos += r.saldo;
        else totalPerdas += r.saldo;
    });

    return {
        ligaId: PARTICIPANTE_IDS.ligaId,
        rodadas: rodadasArray,
        resumo: dados.resumo || {
            saldo: dados.saldo_atual || saldoAcumulado,
            saldo_final: dados.saldo_atual || saldoAcumulado,
            saldo_temporada: dados.saldo_temporada || saldoAcumulado,
            saldo_acertos: dados.saldo_acertos || 0,
            totalGanhos: totalGanhos,
            totalPerdas: totalPerdas,
        },
        camposManuais: camposManuais,
        // ✅ v3.3: Incluir acertos financeiros
        acertos: dados.acertos || {
            lista: acertosFinanceiros,
            resumo: {
                totalPago: 0,
                totalRecebido: 0,
                saldoAcertos: dados.saldo_acertos || 0,
                quantidadeAcertos: acertosFinanceiros.length,
            },
        },
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
// ✅ v3.0: REFRESH - BLOQUEADO QUANDO TEMPORADA ENCERRADA
// =====================================================================
window.forcarRefreshExtratoParticipante = async function () {
    // ✅ v3.0: BLOQUEAR recálculo quando temporada encerrada
    if (CAMPEONATO_ENCERRADO) {
        if (window.Log)
            Log.info("EXTRATO-PARTICIPANTE", "🔒 Temporada encerrada - recálculo bloqueado (dados perpétuos)");

        // Apenas recarregar dados do cache (sem limpar/recalcular)
        if (PARTICIPANTE_IDS.ligaId && PARTICIPANTE_IDS.timeId) {
            await carregarExtrato(PARTICIPANTE_IDS.ligaId, PARTICIPANTE_IDS.timeId);
        }
        return;
    }

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
                ligaId: PARTICIPANTE_IDS.ligaId,
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

        // ✅ v2.7: Buscar campos editáveis após recálculo (URL corrigida)
        const camposEditaveis = await buscarCamposEditaveis(
            PARTICIPANTE_IDS.ligaId,
            PARTICIPANTE_IDS.timeId,
        );

        if (camposEditaveis.length > 0) {
            extratoData.camposManuais = camposEditaveis;
            extratoData.camposEditaveis = camposEditaveis;
        }

        if (window.Log)
            Log.info(
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
        "✅ Módulo v3.4 carregado (FIX CAMPOS MANUAIS)",
    );
