// =====================================================================
// PARTICIPANTE-EXTRATO.JS - v4.5 (FIX SELETOR TEMPORADA)
// Destino: /participante/js/modules/participante-extrato.js
// =====================================================================
// ✅ v4.5: FIX SELETOR TEMPORADA - Extrato respeita seleção do usuário
//          - Ouve evento "temporada-alterada" do seletor de temporada
//          - Quando usuário seleciona 2026, mostra dados de 2026 (zerados)
//          - Quando usuário seleciona 2025, mostra histórico de 2025
//          - Ignora cache IndexedDB quando temporada é selecionada manualmente
// ✅ v4.4: FIX CRÍTICO - Endpoint de cálculo agora inclui ?temporada=
//          - Corrige problema de renovados recebendo dados de 2025
//          - URL /api/fluxo-financeiro/{ligaId}/extrato/{timeId}?temporada={temporada}
// ✅ v4.3: FIX RENOVADOS - Cache IndexedDB ignorado para participantes renovados
//          - Renovados buscam direto do backend (evita dados de 2025)
//          - Resolve problema de extrato mostrando dados antigos
// ✅ v4.2: FORCE UPDATE - Limpa cache IndexedDB desatualizado
//          - Garante dados corretos para temporada 2026
//          - Resolve problema de dados de 2025 aparecendo em 2026
// ✅ v4.1: FIX CRÍTICO - Taxa de inscrição 2026 exibida corretamente no extrato
//          - Processa INSCRICAO_TEMPORADA e SALDO_TEMPORADA_ANTERIOR
//          - Inclui taxaInscricao no resumo para exibição no modal de débitos
//          - Lançamentos iniciais (rodada 0) extraídos e contabilizados
// ✅ v4.0: RENOVACAO - Verifica status de renovacao do participante
//          Se renovado → mostra extrato 2026 (nova temporada)
//          Se nao renovado → mostra extrato 2025 (temporada anterior)
// ✅ v3.7: FIX - Inclui temporada em todas as chamadas de API (evita criar cache 2026 vazio)
// ✅ v3.6: FIX - Usa config global (CURRENT_SEASON) em vez de hardcoded
// ✅ v3.5: FIX CRÍTICO - Calcula totalPago/totalRecebido no fallback (não mais zerados)
// ✅ v3.4: FIX - Re-renderiza quando campos manuais (ajustes) ou saldo mudam
// ✅ v3.3: ACERTOS FINANCEIROS - Exibe pagamentos/recebimentos no extrato
// ✅ v3.2: FIX - Detecta ausência de MATA_MATA mesmo com temporada encerrada
// ✅ v3.1: CACHE-FIRST - Carregamento instantâneo do IndexedDB
// ✅ v3.0: TEMPORADA ENCERRADA - dados são perpétuos, sem recálculos
// ✅ v2.8: Detecta cache incompleto e força recálculo automático
// ✅ v2.7: Correção URL campos editáveis (/times/ ao invés de /campos/)
// =====================================================================

// ⚽ CONFIGURAÇÃO DO CAMPEONATO - Usa config global do app
const RODADA_FINAL_CAMPEONATO = 38;
// ✅ v3.6 FIX: Detectar temporada encerrada via config global
const CONFIG = window.ParticipanteConfig || {};
const CAMPEONATO_ENCERRADO = CONFIG.isPreparando?.() || false; // Durante pré-temporada, 2025 está encerrada

// ✅ v4.0: Cache de status de renovação
let statusRenovacaoCache = null;

// ✅ v4.5: Temporada selecionada pelo usuário (via seletor)
let temporadaSelecionadaPeloUsuario = null;

// ✅ v4.5: Ouvir mudanças do seletor de temporada
window.addEventListener("temporada-alterada", (event) => {
    const { ano, isHistorico } = event.detail || {};
    if (ano) {
        temporadaSelecionadaPeloUsuario = ano;
        statusRenovacaoCache = null; // Limpar cache de renovação
        if (window.Log)
            Log.info("EXTRATO-PARTICIPANTE", `🔄 Temporada alterada via seletor: ${ano}`);

        // Recarregar extrato se já foi inicializado
        if (PARTICIPANTE_IDS.ligaId && PARTICIPANTE_IDS.timeId) {
            carregarExtrato(PARTICIPANTE_IDS.ligaId, PARTICIPANTE_IDS.timeId);
        }
    }
});

if (window.Log)
    Log.info("EXTRATO-PARTICIPANTE", `📄 Módulo v4.5 FIX-SELETOR-TEMPORADA (Temporada ${CONFIG.CURRENT_SEASON || 2026})`);

// ✅ v4.5: Inicializar temporada selecionada do seletor (se já existir)
if (window.seasonSelector) {
    temporadaSelecionadaPeloUsuario = window.seasonSelector.getTemporadaSelecionada();
    if (window.Log)
        Log.debug("EXTRATO-PARTICIPANTE", `🎯 Temporada inicial do seletor: ${temporadaSelecionadaPeloUsuario}`);
}

const PARTICIPANTE_IDS = { ligaId: null, timeId: null };

// =====================================================================
// ✅ v4.0: VERIFICAR STATUS DE RENOVAÇÃO
// =====================================================================
async function verificarRenovacao(ligaId, timeId) {
    // Retornar do cache se já verificou
    if (statusRenovacaoCache !== null) {
        return statusRenovacaoCache;
    }

    const temporadaNova = CONFIG.CURRENT_SEASON || 2026;

    try {
        const url = `/api/inscricoes/${ligaId}/${temporadaNova}/${timeId}`;
        if (window.Log)
            Log.debug("EXTRATO-PARTICIPANTE", `🔍 Verificando renovação: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
            if (window.Log)
                Log.warn("EXTRATO-PARTICIPANTE", `⚠️ API renovação retornou ${response.status}`);
            statusRenovacaoCache = { renovado: false };
            return statusRenovacaoCache;
        }

        const data = await response.json();

        if (data.success && data.inscricao) {
            // Tem inscrição - verificar status
            const status = data.inscricao.status;
            const renovado = status === 'renovado' || status === 'novo';

            statusRenovacaoCache = {
                renovado,
                status,
                pagouInscricao: data.inscricao.pagou_inscricao,
                taxaInscricao: data.inscricao.taxa_inscricao,
                saldoInicial: data.inscricao.saldo_inicial_temporada,
                legado: data.inscricao.legado_manual || null
            };

            if (window.Log)
                Log.info("EXTRATO-PARTICIPANTE", `✅ Status renovação: ${status}`, statusRenovacaoCache);
        } else {
            // Sem inscrição = pendente (não renovou)
            statusRenovacaoCache = {
                renovado: false,
                status: data.statusImplicito || 'pendente'
            };

            if (window.Log)
                Log.info("EXTRATO-PARTICIPANTE", `📋 Sem inscrição 2026 (status: ${statusRenovacaoCache.status})`);
        }

        return statusRenovacaoCache;

    } catch (error) {
        if (window.Log)
            Log.error("EXTRATO-PARTICIPANTE", "❌ Erro ao verificar renovação:", error);

        statusRenovacaoCache = { renovado: false, error: true };
        return statusRenovacaoCache;
    }
}

// Expor função globalmente para uso em outros módulos
window.verificarRenovacaoParticipante = verificarRenovacao;

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
// ✅ v3.6: DETECTAR CACHE INCOMPLETO (RESPEITA MÓDULOS DA LIGA)
// =====================================================================
function detectarCacheIncompleto(rodadas, modulosAtivos = null) {
    if (!Array.isArray(rodadas) || rodadas.length === 0) return false;

    // ✅ v3.6 FIX: Só verificar Mata-Mata se o módulo estiver HABILITADO na liga
    // Buscar módulos ativos da liga cacheada
    const ligaCache = window.ParticipanteCache?.getLiga?.(PARTICIPANTE_IDS.ligaId);
    const mataMataHabilitado = modulosAtivos?.mataMata ||
                               ligaCache?.modulos_ativos?.mataMata ||
                               ligaCache?.configuracoes?.mata_mata?.habilitado;

    if (mataMataHabilitado) {
        // Edições de Mata-Mata ocorrem em rodadas específicas
        const rodadasMataMata = [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 31, 32, 33, 34, 35];

        const rodadasComMM = rodadas.filter(r => {
            const temMM = (r.mataMata || 0) !== 0;
            const ehRodadaMM = rodadasMataMata.includes(r.rodada);
            return ehRodadaMM && temMM;
        });

        // Se liga tem MM habilitado mas não tem nenhuma transação, cache incompleto
        if (rodadasComMM.length === 0) {
            if (window.Log) Log.warn("EXTRATO-PARTICIPANTE", "⚠️ Cache sem transações de Mata-Mata (módulo habilitado) - forçando recálculo");
            return true;
        }
    } else {
        if (window.Log) Log.debug("EXTRATO-PARTICIPANTE", "ℹ️ Liga sem Mata-Mata habilitado - pulando verificação");
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
// ✅ v4.1: BUSCAR CAMPOS EDITÁVEIS (COM TEMPORADA)
// =====================================================================
async function buscarCamposEditaveis(ligaId, timeId, temporada = null) {
    try {
        // ✅ v4.1 FIX: Passar temporada para buscar campos corretos (2025 ou 2026)
        const temporadaParam = temporada || CONFIG.CURRENT_SEASON || 2026;
        const url = `/api/fluxo-financeiro/${ligaId}/times/${timeId}?temporada=${temporadaParam}`;
        if (window.Log)
            Log.debug(
                "EXTRATO-PARTICIPANTE",
                `📡 Buscando campos editáveis (temporada ${temporadaParam}):`,
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

    // ✅ v4.1: Verificar status de renovação ANTES de usar cache local
    const statusRenovacao = await verificarRenovacao(ligaId, timeId);
    const participanteRenovado = statusRenovacao?.renovado === true;

    // =========================================================================
    // FASE 1: CARREGAMENTO INSTANTÂNEO (Cache IndexedDB)
    // ✅ v4.5: Ignorar cache local se temporada foi selecionada pelo usuário OU se renovado
    // =========================================================================
    const usuarioSelecionouTemporada = temporadaSelecionadaPeloUsuario !== null;
    const deveBuscarDoCacheLocal = !participanteRenovado && !usuarioSelecionouTemporada;

    if (cache && deveBuscarDoCacheLocal) {
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
    } else if (participanteRenovado) {
        if (window.Log) Log.info("EXTRATO-PARTICIPANTE", "🔄 Renovado - ignorando cache local para buscar dados 2026");
    } else if (usuarioSelecionouTemporada) {
        if (window.Log) Log.info("EXTRATO-PARTICIPANTE", `🎯 Temporada selecionada (${temporadaSelecionadaPeloUsuario}) - ignorando cache local`);
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

        // ✅ v4.5: Verificar se há temporada selecionada pelo usuário (via seletor)
        // Se o usuário selecionou explicitamente uma temporada, respeitar essa escolha
        const statusRenovacao = await verificarRenovacao(ligaId, timeId);
        let temporada;

        if (temporadaSelecionadaPeloUsuario) {
            // Usuário selecionou temporada explicitamente
            temporada = temporadaSelecionadaPeloUsuario;
            if (window.Log)
                Log.info("EXTRATO-PARTICIPANTE", `🎯 Usando temporada selecionada pelo usuário: ${temporada}`);
        } else if (statusRenovacao.renovado) {
            // Participante RENOVOU → mostrar extrato 2026 (nova temporada)
            temporada = CONFIG.CURRENT_SEASON || 2026;
            if (window.Log)
                Log.info("EXTRATO-PARTICIPANTE", `✅ Participante RENOVADO - exibindo temporada ${temporada}`);
        } else {
            // Participante NÃO renovou → mostrar extrato da temporada anterior
            temporada = CONFIG.getFinancialSeason ? CONFIG.getFinancialSeason() : (CONFIG.PREVIOUS_SEASON || 2025);
            if (window.Log)
                Log.info("EXTRATO-PARTICIPANTE", `📋 Participante pendente/não renovado - exibindo temporada ${temporada}`);
        }

        // ✅ PASSO 1: Tentar buscar do cache
        const urlCache = `/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${rodadaAtual}&temporada=${temporada}`;
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

            // ✅ v4.4: NOVA TEMPORADA - Se retornou dados de inscrição (rodadas vazias mas fonte válida)
            if (cacheData.fonte === 'inscricao-nova-temporada' || 
                (cacheData.cached && cacheData.resumo && cacheData.rodadas?.length === 0)) {
                if (window.Log)
                    Log.info("EXTRATO-PARTICIPANTE", "🆕 Nova temporada detectada - usando dados de inscrição");
                
                extratoData = {
                    ligaId: ligaId,
                    rodadas: [],
                    resumo: cacheData.resumo || {
                        saldo: 0,
                        totalGanhos: 0,
                        totalPerdas: 0,
                    },
                    camposManuais: cacheData.camposManuais || [],
                    acertos: cacheData.acertos || { lista: [], resumo: {} },
                    inativo: cacheData.inativo || false,
                    extratoTravado: false,
                    rodadaTravada: null,
                    rodadaDesistencia: null,
                    inscricao: cacheData.inscricao || null,
                    fonte: cacheData.fonte,
                    temporada: temporada,
                };
                usouCacheBackend = true;
            } else if (
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

            const urlCalculo = `/api/fluxo-financeiro/${ligaId}/extrato/${timeId}?temporada=${temporada}`;
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

        // ✅ v4.4: Para nova temporada (fonte 'inscricao-nova-temporada'), não ir buscar cálculo antigo
        // Dados de nova temporada podem ter rodadas vazias - isso é esperado
        const eNovaTemporada = extratoData?.fonte === 'inscricao-nova-temporada' || 
                               (extratoData?.temporada >= 2026 && extratoData?.rodadas?.length === 0);

        if (!extratoData && !eNovaTemporada) {
            if (!usouCache) mostrarVazio();
            return;
        }

        // ✅ v4.4: Nova temporada com rodadas vazias deve renderizar layout de pré-temporada
        if (eNovaTemporada) {
            if (window.Log)
                Log.info("EXTRATO-PARTICIPANTE", "🆕 Renderizando layout de nova temporada");
        }

        // ✅ v4.1: Buscar campos editáveis do endpoint específico (com temporada correta)
        const camposEditaveis = await buscarCamposEditaveis(ligaId, timeId, temporada);

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

    // ✅ v4.1 FIX: Extrair lançamentos iniciais (inscrição, saldo anterior) ANTES do loop
    // Esses lançamentos têm rodada=0 ou tipos especiais
    let taxaInscricaoCalculada = 0;
    let saldoAnteriorTransferido = 0;
    const lancamentosIniciais = [];

    transacoes.forEach((t) => {
        // ✅ v4.1: Processar lançamentos iniciais separadamente
        if (t.tipo === "INSCRICAO_TEMPORADA") {
            const valor = parseFloat(t.valor) || 0;
            taxaInscricaoCalculada += Math.abs(valor); // Taxa é sempre positiva para exibição
            lancamentosIniciais.push({
                tipo: t.tipo,
                descricao: t.descricao || "Taxa de inscrição",
                valor: valor,
                data: t.data
            });
            return; // Não processar como rodada normal
        }

        if (t.tipo === "SALDO_TEMPORADA_ANTERIOR" || t.tipo === "LEGADO_ANTERIOR" || t.tipo === "TRANSFERENCIA_SALDO") {
            const valor = parseFloat(t.valor) || 0;
            saldoAnteriorTransferido += valor;
            lancamentosIniciais.push({
                tipo: t.tipo,
                descricao: t.descricao || (valor > 0 ? "Crédito da temporada anterior" : "Dívida da temporada anterior"),
                valor: valor,
                data: t.data
            });
            return; // Não processar como rodada normal
        }

        // ✅ v3.3: Ignora ajustes manuais e acertos financeiros aqui (processados separadamente)
        if (t.rodada === null || t.rodada === 0 || t.tipo === "ACERTO_FINANCEIRO") return;

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

    // ✅ v4.1: Log de lançamentos iniciais para debug
    if (lancamentosIniciais.length > 0 && window.Log) {
        Log.info("EXTRATO-PARTICIPANTE", "📋 Lançamentos iniciais:", {
            taxaInscricao: taxaInscricaoCalculada,
            saldoAnterior: saldoAnteriorTransferido,
            total: lancamentosIniciais.length
        });
    }

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

    // ✅ v3.5 FIX: Calcular totalPago e totalRecebido a partir do array
    let totalPagoCalc = 0;
    let totalRecebidoCalc = 0;
    acertosFinanceiros.forEach(a => {
        // valor já vem com sinal correto do controller (pagamento=+, recebimento=-)
        if (a.tipo === "pagamento") {
            totalPagoCalc += Math.abs(a.valor);
        } else {
            totalRecebidoCalc += Math.abs(a.valor);
        }
    });

    // Calcular resumo
    let totalGanhos = 0;
    let totalPerdas = 0;
    rodadasArray.forEach((r) => {
        if (r.saldo > 0) totalGanhos += r.saldo;
        else totalPerdas += r.saldo;
    });

    // ✅ v4.1 FIX: Incluir lançamentos iniciais no cálculo
    // Taxa de inscrição é débito (negativo), saldo anterior pode ser + ou -
    const saldoLancamentosIniciais = -taxaInscricaoCalculada + saldoAnteriorTransferido;
    if (saldoAnteriorTransferido > 0) totalGanhos += saldoAnteriorTransferido;
    if (saldoAnteriorTransferido < 0) totalPerdas += saldoAnteriorTransferido;
    if (taxaInscricaoCalculada > 0) totalPerdas -= taxaInscricaoCalculada; // Taxa é débito

    // ✅ v4.1 FIX: Construir resumo com taxaInscricao incluída
    // Se dados.resumo existe (do cache), usar e complementar
    // Se não existe (fallback), construir do zero com lançamentos iniciais
    const resumoBase = dados.resumo || {};
    const resumoFinal = {
        saldo: resumoBase.saldo ?? (dados.saldo_atual || (saldoAcumulado + saldoLancamentosIniciais)),
        saldo_final: resumoBase.saldo_final ?? (dados.saldo_atual || (saldoAcumulado + saldoLancamentosIniciais)),
        saldo_temporada: resumoBase.saldo_temporada ?? (dados.saldo_temporada || (saldoAcumulado + saldoLancamentosIniciais)),
        saldo_acertos: resumoBase.saldo_acertos ?? (dados.saldo_acertos || 0),
        totalGanhos: resumoBase.totalGanhos ?? totalGanhos,
        totalPerdas: resumoBase.totalPerdas ?? totalPerdas,
        // ✅ v4.1 FIX: Sempre incluir taxaInscricao (do cache ou calculada)
        taxaInscricao: resumoBase.taxaInscricao ?? taxaInscricaoCalculada,
        saldoAnteriorTransferido: resumoBase.saldoAnteriorTransferido ?? saldoAnteriorTransferido,
    };

    return {
        ligaId: PARTICIPANTE_IDS.ligaId,
        rodadas: rodadasArray,
        resumo: resumoFinal,
        camposManuais: camposManuais,
        // ✅ v4.1: Incluir lançamentos iniciais para exibição na UI
        lancamentosIniciais: lancamentosIniciais,
        // ✅ v3.5 FIX: Incluir acertos financeiros com totais calculados
        acertos: dados.acertos || {
            lista: acertosFinanceiros,
            resumo: {
                totalPago: totalPagoCalc,
                totalRecebido: totalRecebidoCalc,
                saldo: (totalPagoCalc - totalRecebidoCalc), // pago - recebido
                saldoAcertos: dados.saldo_acertos || (totalPagoCalc - totalRecebidoCalc),
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

function mostrarVazio() {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) return;

    // Verificar se estamos em pre-temporada
    const config = window.ParticipanteConfig;
    const isPreTemporada = config && config.isPreparando && config.isPreparando();
    const temporadaAnterior = config ? config.PREVIOUS_SEASON : 2025;
    const temporadaAtual = config ? config.CURRENT_SEASON : 2026;

    // ✅ v4.0: Verificar se participante renovou
    const renovado = statusRenovacaoCache?.renovado || false;
    const pagouInscricao = statusRenovacaoCache?.pagouInscricao;
    const taxaInscricao = statusRenovacaoCache?.taxaInscricao || 0;

    if (renovado && isPreTemporada) {
        // Participante RENOVOU - mostrar mensagem de boas-vindas 2026
        const saldoInicialHtml = !pagouInscricao && taxaInscricao > 0
            ? `<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
                          border-radius: 8px; padding: 12px; margin-top: 16px;">
                   <div style="color: #ef4444; font-size: 12px; font-weight: 600;">Taxa de inscricao pendente</div>
                   <div style="color: #ef4444; font-size: 16px; font-weight: 700;">R$ ${taxaInscricao.toFixed(2).replace('.', ',')}</div>
               </div>`
            : '';

        container.innerHTML = `
            <div style="text-align: center; padding: 32px 20px;">
                <!-- Card Bem-vindo 2026 -->
                <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
                            border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 16px; padding: 24px;">
                    <div style="font-size: 40px; margin-bottom: 12px;">✅</div>
                    <h3 style="color: #10b981; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">
                        Renovacao Confirmada!
                    </h3>
                    <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">
                        Voce esta inscrito na temporada ${temporadaAtual}. Seu extrato financeiro
                        comecara a ser calculado quando o Brasileirao iniciar.
                    </p>
                    ${saldoInicialHtml}
                </div>

                <!-- Info Historico -->
                <div style="margin-top: 20px; padding: 12px; background: rgba(255,255,255,0.03);
                            border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                        Para ver seu historico de ${temporadaAnterior}, acesse o
                        <a href="#" onclick="window.participanteNav && window.participanteNav.navegarPara('historico'); return false;"
                           style="color: #ff5500; text-decoration: none; font-weight: 600;">Hall da Fama</a>.
                    </p>
                </div>
            </div>
        `;
    } else if (isPreTemporada) {
        // Participante NAO renovou - mostrar extrato 2025 ou mensagem de pendente
        container.innerHTML = `
            <div style="text-align: center; padding: 32px 20px;">
                <!-- Card Temporada Nova -->
                <div style="background: linear-gradient(135deg, rgba(255,85,0,0.1) 0%, rgba(255,136,0,0.05) 100%);
                            border: 1px solid rgba(255,85,0,0.3); border-radius: 16px; padding: 24px; margin-bottom: 20px;">
                    <div style="font-size: 40px; margin-bottom: 12px;">📋</div>
                    <h3 style="color: #ff5500; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">
                        Temporada ${temporadaAtual}
                    </h3>
                    <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">
                        Sua inscricao para ${temporadaAtual} ainda esta pendente.
                        Entre em contato com o admin da liga para renovar.
                    </p>
                </div>

                <!-- Card Historico -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 12px; padding: 16px; text-align: left;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                        <span class="material-symbols-outlined" style="color: #fbbf24; font-size: 20px;">history</span>
                        <span style="color: #e5e5e5; font-size: 14px; font-weight: 600;">Temporada ${temporadaAnterior}</span>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0 0 12px 0; line-height: 1.5;">
                        Para ver seu historico financeiro de ${temporadaAnterior}, incluindo acertos e pagamentos, acesse o <strong style="color: #ff5500;">Hall da Fama</strong>.
                    </p>
                    <button onclick="window.participanteNav && window.participanteNav.navegarPara('historico')"
                            style="width: 100%; padding: 12px; background: rgba(255,85,0,0.15); border: 1px solid rgba(255,85,0,0.3);
                                   border-radius: 8px; color: #ff5500; font-weight: 600; font-size: 13px; cursor: pointer;
                                   display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">emoji_events</span>
                        Ver Historico ${temporadaAnterior}
                    </button>
                </div>
            </div>
        `;
    } else {
        // Mensagem padrao (temporada ativa sem dados ainda)
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📊</div>
                <h3 style="color: #ccc; margin-bottom: 8px;">Sem dados ainda</h3>
                <p style="font-size: 13px;">O extrato sera gerado apos a primeira rodada.</p>
            </div>
        `;
    }

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
        const statusIcon = badgeEl.querySelector(".status-icon");
        const statusText = badgeEl.querySelector(".status-text");
        if (statusIcon) statusIcon.textContent = "⏳";
        if (statusText) statusText.textContent = "AGUARDANDO";
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
        // ✅ v4.4: Incluir temporada para garantir dados corretos
        const temporadaAtual = CONFIG.CURRENT_SEASON || 2026;
        const urlCalculo = `/api/fluxo-financeiro/${PARTICIPANTE_IDS.ligaId}/extrato/${PARTICIPANTE_IDS.timeId}?temporada=${temporadaAtual}`;
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

        // ✅ v4.5: Buscar campos editáveis após recálculo (com temporada correta)
        // Prioriza temporada selecionada pelo usuário, senão usa lógica de renovação
        let temporadaRefresh;
        if (temporadaSelecionadaPeloUsuario) {
            temporadaRefresh = temporadaSelecionadaPeloUsuario;
        } else if (statusRenovacaoCache?.renovado) {
            temporadaRefresh = CONFIG.CURRENT_SEASON || 2026;
        } else {
            temporadaRefresh = CONFIG.getFinancialSeason ? CONFIG.getFinancialSeason() : (CONFIG.PREVIOUS_SEASON || 2025);
        }
        const camposEditaveis = await buscarCamposEditaveis(
            PARTICIPANTE_IDS.ligaId,
            PARTICIPANTE_IDS.timeId,
            temporadaRefresh,
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
        "✅ Módulo v4.5 carregado (FIX SELETOR TEMPORADA)",
    );
