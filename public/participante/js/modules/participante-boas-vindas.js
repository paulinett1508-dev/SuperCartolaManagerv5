// =====================================================================
// PARTICIPANTE-BOAS-VINDAS.JS - v9.0 (BANNER RESUMO 2025 + TEMPORADA)
// =====================================================================
// ✅ v9.0: Banner de Resumo da Temporada Anterior (2025)
//    - Exibe posição final, badges e saldo de 2025
//    - Indicação clara de "Nova Temporada 2026"
// ✅ v8.0: Carregamento INSTANTÂNEO com cache offline (IndexedDB)
// ✅ v7.5: FALLBACK - Busca dados do auth se não receber por parâmetro

if (window.Log)
    Log.info("PARTICIPANTE-BOAS-VINDAS", "🔄 Carregando módulo v9.0...");

// Configuração de temporada (com fallback seguro)
const TEMPORADA_ATUAL = window.ParticipanteConfig?.CURRENT_SEASON || 2026;
const TEMPORADA_ANTERIOR = window.ParticipanteConfig?.PREVIOUS_SEASON || 2025;

// Estado do histórico
let historicoParticipante = null;

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

    // ✅ v7.5: FALLBACK - Buscar dados do auth se não recebeu por parâmetro
    if (!ligaId || !timeId || ligaId === "[object Object]" || timeId === "undefined") {
        if (window.Log) Log.debug("PARTICIPANTE-BOAS-VINDAS", "🔄 Buscando dados do auth...");

        // Tentar obter do participanteAuth
        if (window.participanteAuth) {
            ligaId = ligaId || window.participanteAuth.ligaId;
            timeId = timeId || window.participanteAuth.timeId;
            participante = participante || window.participanteAuth.participante?.participante;
        }

        // Se ainda não tem, aguardar evento (max 3s)
        if (!ligaId || !timeId) {
            if (window.Log) Log.debug("PARTICIPANTE-BOAS-VINDAS", "⏳ Aguardando auth-ready...");

            const authData = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(null), 3000);

                // Verificar se já tem dados
                if (window.participanteAuth?.ligaId && window.participanteAuth?.timeId) {
                    clearTimeout(timeout);
                    resolve({
                        ligaId: window.participanteAuth.ligaId,
                        timeId: window.participanteAuth.timeId,
                        participante: window.participanteAuth.participante?.participante
                    });
                    return;
                }

                window.addEventListener('participante-auth-ready', (event) => {
                    clearTimeout(timeout);
                    resolve(event.detail);
                }, { once: true });
            });

            if (authData) {
                ligaId = authData.ligaId;
                timeId = authData.timeId;
                participante = authData.participante?.participante || authData.participante;
            }
        }
    }

    ligaId = typeof ligaId === "string" ? ligaId : String(ligaId || "");
    timeId = typeof timeId === "string" ? timeId : String(timeId || "");

    if (window.Log)
        Log.debug("PARTICIPANTE-BOAS-VINDAS", "🚀 Inicializando...", {
            ligaId,
            timeId,
            participante,
        });

    if (!ligaId || ligaId === "[object Object]") {
        if (window.Log)
            Log.error("PARTICIPANTE-BOAS-VINDAS", "❌ Liga ID inválido");
        return;
    }

    if (!timeId || timeId === "undefined") {
        if (window.Log)
            Log.error("PARTICIPANTE-BOAS-VINDAS", "❌ Time ID inválido");
        return;
    }

    await carregarDadosERenderizar(ligaId, timeId, participante);
}

window.inicializarBoasVindasParticipante = inicializarBoasVindasParticipante;

// =====================================================================
// CARREGAR DADOS E RENDERIZAR - v9.0 COM HISTÓRICO
// =====================================================================
async function carregarDadosERenderizar(ligaId, timeId, participante) {
    const container = document.getElementById("boas-vindas-container");
    if (!container) return;

    const cache = window.ParticipanteCache;
    const meuTimeIdNum = Number(timeId);

    // ✅ v9.0: Buscar histórico do participante em background
    buscarHistoricoParticipante(timeId);

    // =========================================================================
    // FASE 1: CARREGAMENTO INSTANTÂNEO (Cache IndexedDB)
    // =========================================================================

    // Tentar carregar tudo do cache primeiro
    let liga = null, ranking = [], rodadas = [], extratoData = null;
    let usouCache = false;

    if (cache) {
        // Buscar do cache persistente (IndexedDB) - INSTANTÂNEO
        [liga, ranking, rodadas, extratoData] = await Promise.all([
            cache.getLigaAsync ? cache.getLigaAsync(ligaId) : cache.getLiga(ligaId),
            cache.getRankingAsync ? cache.getRankingAsync(ligaId) : cache.getRanking(ligaId),
            cache.getRodadasAsync ? cache.getRodadasAsync(ligaId) : cache.getRodadas(ligaId),
            cache.getExtratoAsync ? cache.getExtratoAsync(ligaId, timeId) : cache.getExtrato(ligaId, timeId)
        ]);

        if (liga && ranking?.length && rodadas?.length) {
            usouCache = true;
            if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "⚡ INSTANT LOAD - dados do cache!");

            // Renderizar IMEDIATAMENTE com dados do cache
            const dadosRenderizados = processarDadosParaRender(
                liga, ranking, rodadas, extratoData, meuTimeIdNum, participante
            );
            renderizarBoasVindas(container, dadosRenderizados);
        }
    }

    // Se não tem cache, mostrar loading
    if (!usouCache) {
        container.innerHTML = `
            <div class="flex justify-center items-center min-h-[300px]">
                <div class="text-center">
                    <div class="w-10 h-10 border-4 border-zinc-700 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p class="text-sm text-white/70">Carregando...</p>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // FASE 2: ATUALIZAÇÃO EM BACKGROUND (Fetch API)
    // =========================================================================

    try {
        // Buscar dados frescos da API (mesmo se já mostrou cache)
        const [ligaFresh, rankingFresh, rodadasFresh] = await Promise.all([
            fetch(`/api/ligas/${ligaId}`).then(r => r.ok ? r.json() : liga),
            fetch(`/api/ligas/${ligaId}/ranking`).then(r => r.ok ? r.json() : ranking),
            fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`).then(r => r.ok ? r.json() : rodadas)
        ]);

        // Atualizar cache com dados frescos
        if (cache) {
            cache.setLiga(ligaId, ligaFresh);
            cache.setRanking(ligaId, rankingFresh);
            cache.setRodadas(ligaId, rodadasFresh);
        }

        // Buscar extrato
        const minhasRodadasTemp = rodadasFresh.filter(
            (r) => Number(r.timeId) === meuTimeIdNum || Number(r.time_id) === meuTimeIdNum
        );
        const ultimaRodadaNum = minhasRodadasTemp.length > 0
            ? Math.max(...minhasRodadasTemp.map(r => r.rodada))
            : 1;

        let extratoFresh = null;
        try {
            const resCache = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${ultimaRodadaNum}`);
            if (resCache.ok) {
                const cacheData = await resCache.json();
                extratoFresh = {
                    saldo_atual: cacheData?.resumo?.saldo_final ?? cacheData?.resumo?.saldo ?? 0,
                    resumo: cacheData?.resumo || {}
                };
            }
        } catch (e) {
            // Fallback
            const resFallback = await fetch(`/api/fluxo-financeiro/${ligaId}/extrato/${timeId}`);
            extratoFresh = resFallback.ok ? await resFallback.json() : null;
        }

        if (cache && extratoFresh) {
            cache.setExtrato(ligaId, timeId, extratoFresh);
        }

        // Se não usou cache antes, renderizar agora
        // Se usou cache, só re-renderizar se dados mudaram significativamente
        if (!usouCache) {
            const dadosRenderizados = processarDadosParaRender(
                ligaFresh, rankingFresh, rodadasFresh, extratoFresh, meuTimeIdNum, participante
            );
            renderizarBoasVindas(container, dadosRenderizados);
        } else {
            // Verificar se precisa atualizar UI
            const dadosFresh = processarDadosParaRender(
                ligaFresh, rankingFresh, rodadasFresh, extratoFresh, meuTimeIdNum, participante
            );
            const dadosCache = processarDadosParaRender(
                liga, ranking, rodadas, extratoData, meuTimeIdNum, participante
            );

            // Só re-renderiza se algo importante mudou
            if (dadosFresh.posicao !== dadosCache.posicao ||
                dadosFresh.pontosTotal !== dadosCache.pontosTotal ||
                dadosFresh.saldoFinanceiro !== dadosCache.saldoFinanceiro) {
                if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "🔄 Atualizando UI com dados frescos");
                renderizarBoasVindas(container, dadosFresh);
            }
        }

        if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "✅ Dados carregados e cacheados");

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-BOAS-VINDAS", "❌ Erro:", error);

        // Se já mostrou cache, não mostrar erro (dados antigos são melhores que nada)
        if (!usouCache) {
            container.innerHTML = `
                <div class="text-center py-16 px-5">
                    <span class="material-icons text-5xl text-red-500">error</span>
                    <p class="text-white/70 mt-4">Erro ao carregar dados</p>
                </div>
            `;
        }
    }
}

// =====================================================================
// PROCESSAR DADOS PARA RENDERIZAÇÃO
// =====================================================================
function processarDadosParaRender(liga, ranking, rodadas, extratoData, meuTimeIdNum, participante) {
    const meuTime = ranking?.find((t) => Number(t.timeId) === meuTimeIdNum);
    const posicao = meuTime ? meuTime.posicao : null;
    const totalParticipantes = ranking?.length || 0;

    const minhasRodadas = (rodadas || []).filter(
        (r) => Number(r.timeId) === meuTimeIdNum || Number(r.time_id) === meuTimeIdNum
    );

    const pontosTotal = minhasRodadas.reduce((total, rodada) => {
        return total + (parseFloat(rodada.pontos) || 0);
    }, 0);

    const rodadasOrdenadas = [...minhasRodadas].sort((a, b) => b.rodada - a.rodada);
    const ultimaRodada = rodadasOrdenadas[0];
    const rodadaAtual = ultimaRodada ? ultimaRodada.rodada : 0;

    // Posição anterior
    let posicaoAnterior = null;
    if (rodadaAtual > 1 && minhasRodadas.length >= 2) {
        const rodadasAteAnterior = (rodadas || []).filter((r) => r.rodada < rodadaAtual);
        const rankingAnterior = calcularRankingManual(rodadasAteAnterior);
        const meuTimeAnterior = rankingAnterior.find((t) => Number(t.timeId) === meuTimeIdNum);
        if (meuTimeAnterior) posicaoAnterior = meuTimeAnterior.posicao;
    }

    const saldoFinanceiro = extratoData?.saldo_atual ?? extratoData?.resumo?.saldo_final ?? 0;
    const nomeTime = participante?.nome_time || meuTime?.nome_time || "Seu Time";
    const nomeCartola = participante?.nome_cartola || meuTime?.nome_cartola || "Cartoleiro";
    const nomeLiga = liga?.nome || "Liga";

    return {
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
        minhasRodadas: rodadasOrdenadas,
    };
}

// =====================================================================
// ✅ v9.0: BUSCAR HISTÓRICO DO PARTICIPANTE
// =====================================================================
async function buscarHistoricoParticipante(timeId) {
    try {
        const response = await fetch(`/api/participante/historico/${timeId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                historicoParticipante = data;
                if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "📜 Histórico carregado:", {
                    temporadas: data.historico?.length || 0
                });
                // Re-renderizar banner se já tem container
                renderizarBannerHistorico();
            }
        }
    } catch (error) {
        if (window.Log) Log.debug("PARTICIPANTE-BOAS-VINDAS", "⚠️ Histórico não disponível");
    }
}

// =====================================================================
// ✅ v9.0: RENDERIZAR BANNER DE HISTÓRICO (Resumo 2025)
// =====================================================================
function renderizarBannerHistorico() {
    const container = document.getElementById("boas-vindas-container");
    if (!container || !historicoParticipante) return;

    // Verificar se já existe o banner
    if (document.getElementById("banner-historico-2025")) return;

    // Buscar dados da temporada anterior
    const temporadaAnterior = historicoParticipante.historico?.find(
        h => h.ano === TEMPORADA_ANTERIOR
    );

    if (!temporadaAnterior) return;

    const stats = temporadaAnterior.estatisticas || {};
    const financeiro = temporadaAnterior.financeiro || {};
    const badges = temporadaAnterior.conquistas?.badges || [];

    // Formatar saldo
    const saldo = financeiro.saldo_final || 0;
    const saldoAbs = Math.abs(saldo);
    const saldoFormatado = saldo >= 0
        ? `+R$ ${saldoAbs.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
        : `-R$ ${saldoAbs.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
    const saldoCor = saldo > 0 ? "#4ade80" : saldo < 0 ? "#f87171" : "#9ca3af";

    // Renderizar badges
    const badgesHTML = badges.slice(0, 3).map(badgeId => {
        const config = window.ParticipanteConfig?.BADGES_CONFIG?.[badgeId] ||
            { icon: "🎖️", nome: badgeId.replace(/_/g, " ").replace(/\d{4}/, "") };
        return `<span class="badge-mini" title="${config.nome}">${config.icon}</span>`;
    }).join("");

    // Criar banner HTML
    const bannerHTML = `
        <div id="banner-historico-2025" class="mx-4 mb-4 rounded-xl overflow-hidden" style="background: linear-gradient(135deg, rgba(255, 69, 0, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%); border: 1px solid rgba(255, 69, 0, 0.2);">
            <!-- Header do Banner -->
            <div class="flex items-center justify-between px-4 py-3" style="background: rgba(0,0,0,0.2);">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary" style="font-size: 20px;">history</span>
                    <span class="text-xs font-bold text-white/90 uppercase tracking-wide">Resumo ${TEMPORADA_ANTERIOR}</span>
                </div>
                <button onclick="document.getElementById('banner-historico-2025').style.display='none'" class="text-white/50 hover:text-white/80">
                    <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
                </button>
            </div>

            <!-- Conteúdo -->
            <div class="px-4 py-3">
                <div class="flex items-center justify-between">
                    <!-- Posição Final -->
                    <div class="text-center">
                        <p class="text-3xl font-bold text-white">${stats.posicao_final || "-"}º</p>
                        <p class="text-[10px] text-white/60 uppercase">Posição Final</p>
                    </div>

                    <!-- Pontos -->
                    <div class="text-center">
                        <p class="text-lg font-bold text-white">${(stats.pontos_totais || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
                        <p class="text-[10px] text-white/60 uppercase">Pontos</p>
                    </div>

                    <!-- Saldo -->
                    <div class="text-center">
                        <p class="text-lg font-bold" style="color: ${saldoCor}">${saldoFormatado}</p>
                        <p class="text-[10px] text-white/60 uppercase">Saldo</p>
                    </div>

                    <!-- Badges -->
                    ${badges.length > 0 ? `
                        <div class="text-center">
                            <div class="flex gap-1 justify-center text-xl">${badgesHTML}</div>
                            <p class="text-[10px] text-white/60 uppercase">Conquistas</p>
                        </div>
                    ` : ''}
                </div>

                <!-- Link para Hall da Fama -->
                <button onclick="window.participanteNav?.navegarPara('historico')"
                        class="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-primary"
                        style="background: rgba(255, 69, 0, 0.15);">
                    <span class="material-symbols-outlined" style="font-size: 16px;">emoji_events</span>
                    Ver Hall da Fama Completo
                </button>
            </div>
        </div>
    `;

    // Inserir após a saudação
    const saudacao = container.querySelector(".px-4.py-4");
    if (saudacao) {
        saudacao.insertAdjacentHTML("afterend", bannerHTML);
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
            timesAgrupados[timeId] = { timeId, pontos_totais: 0 };
        }
        timesAgrupados[timeId].pontos_totais += parseFloat(rodada.pontos) || 0;
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

function getZonaInfo(posicao, total) {
    if (!posicao || !total)
        return {
            texto: "N/D",
            corTexto: "text-white/50",
            corBg: "bg-white/5",
            icon: "help",
        };
    const percentual = (posicao / total) * 100;
    if (percentual <= 33)
        return {
            texto: "Zona de Premiação",
            corTexto: "text-green-400",
            corBg: "bg-green-400/10",
            icon: "emoji_events",
        };
    if (percentual <= 66)
        return {
            texto: "Zona Neutra",
            corTexto: "text-yellow-400",
            corBg: "bg-yellow-400/10",
            icon: "remove",
        };
    return {
        texto: "Zona de Risco",
        corTexto: "text-red-400",
        corBg: "bg-red-400/10",
        icon: "warning",
    };
}

// =====================================================================
// RENDERIZAÇÃO - TAILWIND CLASSES
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

    const zona = getZonaInfo(posicao, totalParticipantes);
    const primeiroNome = nomeCartola.split(" ")[0];
    const rodadasRestantes = Math.max(0, 38 - rodadaAtual);
    const pontosUltimaRodada = ultimaRodada
        ? parseFloat(ultimaRodada.pontos).toFixed(2)
        : "0.00";

    // Variação posição
    let variacaoPosHTML = "";
    if (posicao && posicaoAnterior) {
        const diff = posicaoAnterior - posicao;
        if (diff > 0)
            variacaoPosHTML = `<span class="text-green-400 text-xs ml-1">▲${diff}</span>`;
        else if (diff < 0)
            variacaoPosHTML = `<span class="text-red-400 text-xs ml-1">▼${Math.abs(diff)}</span>`;
    }

    // Variação pontos
    let variacaoInfo = {
        valor: "--",
        cor: "text-white/50",
        icon: "trending_flat",
    };
    if (minhasRodadas.length >= 2) {
        const ultima = parseFloat(minhasRodadas[0].pontos) || 0;
        const penultima = parseFloat(minhasRodadas[1].pontos) || 0;
        const diff = ultima - penultima;
        if (diff > 0)
            variacaoInfo = {
                valor: `+${diff.toFixed(1)}`,
                cor: "text-green-400",
                icon: "trending_up",
            };
        else if (diff < 0)
            variacaoInfo = {
                valor: diff.toFixed(1),
                cor: "text-red-400",
                icon: "trending_down",
            };
        else
            variacaoInfo = {
                valor: "0.0",
                cor: "text-white/50",
                icon: "trending_flat",
            };
    }

    // Saldo - v7.2: Cores dinâmicas com style inline
    const saldoAbs = Math.abs(saldoFinanceiro);
    const saldoFormatadoNumero = saldoAbs.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const saldoFormatado =
        saldoFinanceiro >= 0
            ? `R$ ${saldoFormatadoNumero}`
            : `-R$ ${saldoFormatadoNumero}`;
    const saldoCorStyle =
        saldoFinanceiro > 0
            ? "color: #4ade80;"
            : saldoFinanceiro < 0
              ? "color: #f87171;"
              : "color: rgba(255,255,255,0.5);";

    container.innerHTML = `
        <div class="pb-28">

            <!-- Saudação com indicador de temporada -->
            <div class="px-4 py-4">
                <div class="flex items-center justify-between mb-1">
                    <h1 class="text-xl font-bold leading-tight tracking-tight text-white">Olá, ${primeiroNome}! 👋</h1>
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style="background: linear-gradient(135deg, #ff4500, #e63e00); color: white;">
                        ${TEMPORADA_ATUAL}
                    </span>
                </div>
                <p class="text-sm font-normal text-white/70">${nomeLiga} • Rodada ${rodadaAtual || "--"}</p>
            </div>

            <!-- Card Principal do Time -->
            <div class="mx-4 mb-4 rounded-xl bg-surface-dark p-4">
                <h3 class="mb-4 text-center text-base font-bold leading-tight text-white">${nomeTime}</h3>
                <div class="flex items-center justify-around">
                    <div class="text-center">
                        <p class="text-xs font-medium uppercase leading-normal text-white/70">Posição</p>
                        <p class="text-4xl font-bold leading-tight tracking-tighter text-white">${posicao ? `${posicao}º` : "--"}</p>
                        <p class="text-xs font-normal leading-normal text-white/70">de ${totalParticipantes}${variacaoPosHTML}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-xs font-medium uppercase leading-normal text-white/70">Pontos</p>
                        <p class="text-4xl font-bold leading-tight tracking-tighter text-white">${formatarPontos(pontosTotal).split(",")[0]}</p>
                        <p class="text-xs font-normal leading-normal text-white/70">total acumulado</p>
                    </div>
                </div>
                <div class="mt-4 flex items-center justify-center gap-2 rounded-full ${zona.corBg} py-1.5 px-4">
                    <span class="material-icons text-sm ${zona.corTexto}">${zona.icon}</span>
                    <p class="text-xs font-medium text-white/90">${zona.texto}</p>
                </div>
            </div>

            <!-- Card Saldo Financeiro -->
            <div class="mx-4 mb-4 rounded-xl bg-surface-dark p-4 cursor-pointer active:scale-[0.98] transition-transform" onclick="window.participanteNav?.navegarPara('extrato')">
                <div class="flex w-full items-center gap-4 text-left">
                    <div class="flex-shrink-0">
                        <span class="material-icons text-3xl text-primary">paid</span>
                    </div>
                    <div class="flex-1">
                        <p class="text-xs font-medium uppercase text-white/70">Saldo Financeiro</p>
                        <p class="text-lg font-bold" style="${saldoCorStyle}">${saldoFormatado}</p>
                    </div>
                    <div class="flex-shrink-0">
                        <span class="material-icons text-white/70">arrow_forward_ios</span>
                    </div>
                </div>
            </div>

            <!-- Grid de Estatísticas -->
            <div class="mx-4 mb-4 grid grid-cols-3 gap-3">
                <div class="flex flex-col items-center justify-center gap-1 rounded-xl bg-surface-dark p-3">
                    <p class="text-xs font-medium uppercase text-white/70">Rodadas</p>
                    <p class="text-2xl font-bold text-white">${rodadaAtual || 0}</p>
                </div>
                <div class="flex flex-col items-center justify-center gap-1 rounded-xl bg-surface-dark p-3">
                    <p class="text-xs font-medium uppercase text-white/70">Participantes</p>
                    <p class="text-2xl font-bold text-white">${totalParticipantes}</p>
                </div>
                <div class="flex flex-col items-center justify-center gap-1 rounded-xl bg-surface-dark p-3">
                    <p class="text-xs font-medium uppercase text-white/70">Faltam</p>
                    <p class="text-2xl font-bold text-primary">${rodadasRestantes}</p>
                </div>
            </div>

            <!-- Card de Desempenho -->
            <div class="mx-4 mb-4 rounded-xl bg-surface-dark p-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-icons text-primary">insights</span>
                    <h3 class="text-sm font-bold text-white">Seu Desempenho</h3>
                </div>
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between items-center p-3 rounded-lg bg-white/5">
                        <div class="flex items-center gap-2">
                            <span class="material-icons text-primary text-xl">bolt</span>
                            <span class="text-xs text-white/70">Rodada ${rodadaAtual}</span>
                        </div>
                        <span class="text-sm font-bold text-white">${pontosUltimaRodada} pts</span>
                    </div>
                    <div class="flex justify-between items-center p-3 rounded-lg bg-white/5">
                        <div class="flex items-center gap-2">
                            <span class="material-icons ${variacaoInfo.cor} text-xl">${variacaoInfo.icon}</span>
                            <span class="text-xs text-white/70">Variação</span>
                        </div>
                        <span class="text-sm font-bold ${variacaoInfo.cor}">${variacaoInfo.valor}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 rounded-lg bg-white/5">
                        <div class="flex items-center gap-2">
                            <span class="material-icons text-primary text-xl">history</span>
                            <span class="text-xs text-white/70">Posição anterior</span>
                        </div>
                        <span class="text-sm font-bold text-white">${posicaoAnterior ? `${posicaoAnterior}º` : "--"}</span>
                    </div>
                </div>
            </div>

            <!-- Card de Dica -->
            <div class="mx-4 mb-4 flex items-start gap-3 rounded-xl bg-primary/10 p-4">
                <span class="material-icons mt-0.5 text-primary">lightbulb</span>
                <div>
                    <p class="text-sm font-bold uppercase text-white/90">Dica</p>
                    <p class="text-sm font-normal text-white/70">Acompanhe seu extrato financeiro para entender sua evolução na liga!</p>
                </div>
            </div>
        </div>
    `;
}

if (window.Log)
    Log.info("PARTICIPANTE-BOAS-VINDAS", "✅ Módulo v9.0 carregado (Banner Resumo 2025)");
