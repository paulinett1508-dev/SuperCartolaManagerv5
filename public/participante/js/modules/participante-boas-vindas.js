// =====================================================================
// PARTICIPANTE-BOAS-VINDAS.JS - v10.11 (BADGE AMBIENTE NO HEADER)
// =====================================================================
// ✅ v10.11: Badge de ambiente movido para o header (próximo à versão)
//           - Removido do card de boas-vindas
//           - Agora aparece no topo, ao lado do badge de versão
// ✅ v10.9: Jogos ao vivo com API-Football para TODOS os participantes
//          - Usa /api/jogos-ao-vivo (API-Football + Globo fallback)
//          - Exibe placares em tempo real quando há jogos brasileiros
// ✅ v10.7: Integração do módulo Jogos do Dia para participantes premium
//          - Exibe jogos do Brasileirão (ou mock em pré-temporada)
//          - Apenas para participantes premium (ex: Paulinett Miranda)
// ✅ v10.6: FIX - Participantes renovados ignoram cache IndexedDB de extrato
//          - Evita mostrar saldo de 2025 em vez de 2026
//          - Cache local pode ter dados antigos após renovação
// ✅ v10.5: Para participantes RENOVADOS, mostra "Aguardando 1ª rodada"
//          em vez de dados da temporada anterior
// ✅ v10.4: FIX - URL correta para API de inscrições (/ligaId/temporada/timeId)
//          - Verifica status 'renovado' ou 'novo' na resposta
// ✅ v10.3: FIX - Verifica renovação antes de buscar extrato
//          - Renovados usam temporada 2026 (saldo começa com inscrição)
//          - Não renovados usam temporada 2025 (saldo da temporada anterior)
// ✅ v10.1: FIX - Inclui temporada nas URLs de API (evita criar cache 2026 vazio)
// ✅ v10.0: Hall da Fama discreto na tela inicial
//    - Card pequeno e clean na parte superior
//    - Não chama atenção para temporada anterior
//    - Navegação direta para histórico completo
// ✅ v9.0: Banner de Resumo da Temporada Anterior (SUBSTITUÍDO)
// ✅ v8.0: Carregamento INSTANTÂNEO com cache offline (IndexedDB)
// ✅ v7.5: FALLBACK - Busca dados do auth se não receber por parâmetro

if (window.Log)
    Log.info("PARTICIPANTE-BOAS-VINDAS", "🔄 Carregando módulo v10.10...");

// Configuração de temporada (com fallback seguro)
const TEMPORADA_ATUAL = window.ParticipanteConfig?.CURRENT_SEASON || 2026;
const TEMPORADA_ANTERIOR = window.ParticipanteConfig?.PREVIOUS_SEASON || 2025;
// ✅ v10.1 FIX: Temporada financeira (2025 durante pré-temporada)
const TEMPORADA_FINANCEIRA = window.ParticipanteConfig?.getFinancialSeason
    ? window.ParticipanteConfig.getFinancialSeason()
    : TEMPORADA_ATUAL;

// Estado do histórico
let historicoParticipante = null;

// ✅ v10.5: Estado de renovação do participante
let participanteRenovado = false;

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
// CARREGAR DADOS E RENDERIZAR - v10.6 FIX CACHE TEMPORADA
// =====================================================================
async function carregarDadosERenderizar(ligaId, timeId, participante) {
    const container = document.getElementById("boas-vindas-container");
    if (!container) return;

    const cache = window.ParticipanteCache;
    const meuTimeIdNum = Number(timeId);

    // ✅ v10.5: Verificar se participante renovou ANTES de renderizar
    await verificarStatusRenovacao(ligaId, timeId);

    // ✅ v9.0: Buscar histórico do participante em background
    buscarHistoricoParticipante(timeId);

    // =========================================================================
    // FASE 1: CARREGAMENTO INSTANTÂNEO (Cache IndexedDB)
    // =========================================================================

    // Tentar carregar tudo do cache primeiro
    let liga = null, ranking = [], rodadas = [], extratoData = null;
    let usouCache = false;

    if (cache) {
        // ✅ v10.6 FIX: Para participantes RENOVADOS, NÃO usar cache IndexedDB do extrato
        // O cache pode ter dados de 2025 (saldo antigo) que não se aplica mais em 2026
        const deveBuscarExtratoDoCacheLocal = !participanteRenovado;
        
        // Buscar regras da liga para a temporada
        let ligaRules = null;
        try {
            const resRules = await fetch(`/api/liga-rules/${ligaId}/${TEMPORADA_ATUAL}`);
            if (resRules.ok) {
                ligaRules = await resRules.json();
            }
        } catch (e) {
            ligaRules = null;
        }
        // Buscar do cache persistente (IndexedDB) - INSTANTÂNEO
        [liga, ranking, rodadas, extratoData] = await Promise.all([
            cache.getLigaAsync ? cache.getLigaAsync(ligaId) : cache.getLiga(ligaId),
            cache.getRankingAsync ? cache.getRankingAsync(ligaId) : cache.getRanking(ligaId),
            cache.getRodadasAsync ? cache.getRodadasAsync(ligaId) : cache.getRodadas(ligaId),
            deveBuscarExtratoDoCacheLocal
                ? (cache.getExtratoAsync ? cache.getExtratoAsync(ligaId, timeId) : cache.getExtrato(ligaId, timeId))
                : Promise.resolve(null) // ✅ Renovados: ignorar cache local de extrato
        ]);

        // ✅ v10.6: Log para debug
        if (participanteRenovado && window.Log) {
            Log.info("PARTICIPANTE-BOAS-VINDAS", "🔄 Participante renovado - ignorando cache local de extrato");
        }

        if (liga && ranking?.length && rodadas?.length) {
            // Inicializar dadosRenderizados antes de usar
            let dadosRenderizados = processarDadosParaRender(
                liga, ranking, rodadas, extratoData, meuTimeIdNum, participante
            );
            renderizarBoasVindas(container, dadosRenderizados, ligaRules);
            if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "⚡ INSTANT LOAD - dados do cache!");
        }
    }

    // Se não tem cache, mostrar loading
    if (!usouCache) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[300px] py-16">
                    <div class="w-10 h-10 border-4 border-zinc-700 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                    <p class="text-sm text-gray-400">Carregando...</p>
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
        const minhasRodadasTemp = (rodadasFresh || []).filter(
            (r) => Number(r.timeId) === meuTimeIdNum || Number(r.time_id) === meuTimeIdNum
        );
        const ultimaRodadaNum = minhasRodadasTemp.length > 0
            ? Math.max(...minhasRodadasTemp.map(r => r.rodada))
            : 1;

        let extratoFresh = null;
        try {
            // ✅ v10.4 FIX: Verificar se participante renovou para determinar temporada correta
            // Se renovou → mostrar extrato 2026 (saldo começa com taxa de inscrição)
            // Se não renovou → mostrar extrato 2025 (saldo da temporada anterior)
            let temporadaExtrato = TEMPORADA_FINANCEIRA;

            try {
                // URL correta: /api/inscricoes/:ligaId/:temporada/:timeId
                const resRenovacao = await fetch(`/api/inscricoes/${ligaId}/${TEMPORADA_ATUAL}/${timeId}`);
                if (resRenovacao.ok) {
                    const data = await resRenovacao.json();
                    // Verificar se tem inscrição com status renovado ou novo
                    const status = data.inscricao?.status;
                    if (status === 'renovado' || status === 'novo') {
                        temporadaExtrato = TEMPORADA_ATUAL; // 2026
                        if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", `✅ Inscrito (${status}) - usando temporada ${temporadaExtrato}`);
                    }
                }
            } catch (e) {
                // Fallback para temporada financeira padrão
                if (window.Log) Log.warn("PARTICIPANTE-BOAS-VINDAS", "Erro ao verificar renovação", e);
            }

            const resCache = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${ultimaRodadaNum}&temporada=${temporadaExtrato}`);
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

    // ✅ SYNC FIX: Usar mesma lógica do Admin (saldo_final + acertos)
    const saldoFinanceiro = extratoData?.saldo_atual ?? extratoData?.resumo?.saldo_final ?? 0;
    
    // 🐛 DEBUG: Log para verificar sincronização com Admin
    if (window.Log) {
        Log.info("PARTICIPANTE-BOAS-VINDAS", "💰 Saldo calculado:", {
            saldo_atual: extratoData?.saldo_atual,
            saldo_final: extratoData?.resumo?.saldo_final,
            saldo_usado: saldoFinanceiro,
            fonte: extratoData?.saldo_atual !== undefined ? "saldo_atual (backend)" : "saldo_final (resumo)"
        });
    }
    
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
        timeId: meuTimeIdNum,
    };
}

// =====================================================================
// ✅ v10.5: VERIFICAR SE PARTICIPANTE RENOVOU
// =====================================================================
async function verificarStatusRenovacao(ligaId, timeId) {
    try {
        const url = `/api/inscricoes/${ligaId}/${TEMPORADA_ATUAL}/${timeId}`;
        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.inscricao) {
                const status = data.inscricao.status;
                participanteRenovado = (status === 'renovado' || status === 'novo');
                if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", `✅ Status renovação: ${status} → renovado=${participanteRenovado}`);
            }
        }
    } catch (error) {
        if (window.Log) Log.warn("PARTICIPANTE-BOAS-VINDAS", "⚠️ Erro ao verificar renovação:", error);
        participanteRenovado = false;
    }
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
// ✅ v10.0: RENDERIZAR CARD DISCRETO DO HALL DA FAMA
// Pequeno, na parte superior, não chama atenção para temporada anterior
// =====================================================================
function renderizarBannerHistorico() {
    const container = document.getElementById("boas-vindas-container");
    if (!container || !historicoParticipante) return;

    // Verificar se já existe o card
    if (document.getElementById("card-hall-fama")) return;

    // Filtrar temporadas para exibir apenas até a anterior à atual
    const temporadaAtual = window.ParticipanteConfig?.CURRENT_SEASON || 2026;
    const temporadasPassadas = (historicoParticipante.historico || []).filter(t => Number(t.temporada) < temporadaAtual);
    const totalTemporadas = temporadasPassadas.length;
    // Contar títulos só das temporadas passadas
    const totalTitulos = temporadasPassadas.reduce((acc, t) => acc + (t.titulos || 0), 0);

    if (totalTemporadas === 0) return;

    // ✅ v10.0: Card pequeno e discreto
    const cardHTML = `
        <div id="card-hall-fama" class="mx-4 mb-3">
            <button onclick="window.participanteNav?.navegarPara('historico')"
                    class="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-dark active:scale-[0.98] transition-transform">
                <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style="background: rgba(255, 193, 7, 0.15);">
                    <span class="material-icons text-xl" style="color: #ffc107;">emoji_events</span>
                </div>
                <div class="flex-1 text-left">
                    <p class="text-sm font-semibold text-white">Hall da Fama</p>
                    <p class="text-xs text-white/50">${totalTemporadas} temporada${totalTemporadas > 1 ? 's' : ''}${totalTitulos > 0 ? ` • ${totalTitulos} título${totalTitulos > 1 ? 's' : ''}` : ''}</p>
                </div>
                <span class="material-icons text-white/30 text-lg">chevron_right</span>
            </button>
        </div>
    `;

    // Inserir após a saudação
    const saudacao = container.querySelector(".px-4.py-4");
    if (saudacao) {
        saudacao.insertAdjacentHTML("afterend", cardHTML);
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
function renderizarBoasVindas(container, data, ligaRules) {
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
        temporada // Adiciona temporada ao destructuring
    } = data;

    const zona = getZonaInfo(posicao, totalParticipantes);
    const primeiroNome = nomeCartola.split(" ")[0];
    // Selo premium para Paulinett Miranda (timeId 13935277)
    const isPremium = String(data?.timeId || '') === '13935277';
    const seloPremium = isPremium ? `<span title="Participante Premium" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full border border-yellow-400/40 bg-yellow-400/10 text-xs font-semibold text-yellow-300 shadow-sm" style="vertical-align:middle;">Premium <span class="material-icons text-yellow-300 text-base ml-1" style="font-size:14px;">star</span></span>` : '';
    // ✅ v10.11: Badge de ambiente movido para o header (próximo à versão)
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

    // =========================================================================
    // ✅ v10.5: RENDERIZAÇÃO CONDICIONAL - RENOVADO vs NÃO RENOVADO
    // =========================================================================
    
    if (participanteRenovado) {
        // ✅ PARTICIPANTE RENOVOU - Mostrar dados zerados com "Aguardando 1ª rodada"
        container.innerHTML = `
            <div class="pb-28">

                <!-- Saudação com indicador de temporada -->
                <div class="px-4 py-4">
                    <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl font-bold leading-tight tracking-tight text-white">Olá, ${primeiroNome}! 👋</h1>
                            ${seloPremium}
                        </div>
                        <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style="background: linear-gradient(135deg, #ff4500, #e63e00); color: white;">
                            ${TEMPORADA_ATUAL}
                        </span>
                    </div>
                    <p class="text-sm font-normal text-white/70">${nomeLiga} • Aguardando 1ª rodada</p>
                </div>

                <!-- Card Principal do Time - Aguardando -->
                <div class="mx-4 mb-4 rounded-xl bg-surface-dark p-4">
                    <h3 class="mb-4 text-center text-base font-bold leading-tight text-white">${nomeTime}</h3>
                    <div class="flex items-center justify-around">
                        <div class="text-center">
                            <p class="text-xs font-medium uppercase leading-normal text-white/70">Posição</p>
                            <p class="text-4xl font-bold leading-tight tracking-tighter text-white/30">--</p>
                            <p class="text-xs font-normal leading-normal text-white/50">aguardando</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs font-medium uppercase leading-normal text-white/70">Pontos</p>
                            <p class="text-4xl font-bold leading-tight tracking-tighter text-white/30">0</p>
                            <p class="text-xs font-normal leading-normal text-white/50">aguardando</p>
                        </div>
                    </div>
                    <div class="mt-4 flex items-center justify-center gap-2 rounded-full bg-primary/10 py-1.5 px-4">
                        <span class="material-icons text-sm text-primary">schedule</span>
                        <p class="text-xs font-medium text-white/90">Aguardando 1ª rodada</p>
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

                <!-- Grid de Estatísticas - Zerado -->
                <div class="mx-4 mb-4 grid grid-cols-3 gap-3">
                        <div class="flex flex-col items-center justify-center gap-1 rounded-xl bg-surface-dark p-3">
                            <p class="text-xs font-medium uppercase text-white/70">Rodadas</p>
                            <p class="text-2xl font-bold text-white/30">0</p>
                        </div>
                        <div class="flex flex-col items-center justify-center gap-1 rounded-xl bg-surface-dark p-3">
                            <p class="text-xs font-medium uppercase text-white/70">Participantes</p>
                            <p class="text-2xl font-bold text-white">
                                ${typeof totalParticipantes === 'number' && totalParticipantes > 0 && temporada === TEMPORADA_ATUAL ? totalParticipantes : '--'}
                            </p>
                            ${(typeof totalParticipantes !== 'number' || totalParticipantes === 0 || temporada !== TEMPORADA_ATUAL) ? `<span class="flex items-center gap-1 text-xs text-yellow-400 mt-1"><span class="material-icons text-base align-middle">hourglass_empty</span> Aguardando definição</span>` : ''}
                        </div>
                            <!-- Mini-card FALTAM removido -->
                </div>

                <!-- Card de Desempenho - Aguardando -->
                <div class="mx-4 mb-4 rounded-xl bg-surface-dark p-4">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="material-icons text-primary">insights</span>
                        <h3 class="text-sm font-bold text-white">Seu Desempenho</h3>
                    </div>
                    <div class="flex flex-col gap-2">
                        <div class="flex justify-between items-center p-3 rounded-lg bg-white/5">
                            <div class="flex items-center gap-2">
                                <span class="material-icons text-white/30 text-xl">bolt</span>
                                <span class="text-xs text-white/50">Última rodada</span>
                            </div>
                            <span class="text-sm font-medium text-white/30">Aguardando</span>
                        </div>
                        <div class="flex justify-between items-center p-3 rounded-lg bg-white/5">
                            <div class="flex items-center gap-2">
                                <span class="material-icons text-white/30 text-xl">trending_flat</span>
                                <span class="text-xs text-white/50">Variação</span>
                            </div>
                            <span class="text-sm font-medium text-white/30">Aguardando</span>
                        </div>
                        <div class="flex justify-between items-center p-3 rounded-lg bg-white/5">
                            <div class="flex items-center gap-2">
                                <span class="material-icons text-white/30 text-xl">history</span>
                                <span class="text-xs text-white/50">Posição anterior</span>
                            </div>
                            <span class="text-sm font-medium text-white/30">Aguardando</span>
                        </div>
                    </div>
                </div>

                <!-- Card de Boas-vindas 2026 -->
                    <div class="mx-4 mb-4 flex items-start gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                        <span class="material-icons mt-0.5 text-green-400">check_circle</span>
                        <div>
                            <p class="text-sm font-bold uppercase text-green-400">Inscrição Confirmada!</p>
                            <p class="text-sm font-normal text-white/70">${ligaRules && ligaRules.mensagens && ligaRules.mensagens.confirmacao ? ligaRules.mensagens.confirmacao : `Sua inscrição para a temporada ${TEMPORADA_ATUAL} está ativa.`}</p>
                        </div>
                    </div>
                    <div id="jogos-do-dia-placeholder"></div>
            </div>
        `;
        // ✅ v10.9: Carregar e renderizar jogos ao vivo (API-Football) para todos
        carregarEExibirJogos();
    } else {
        // ✅ PARTICIPANTE NÃO RENOVOU - Mostrar dados da temporada anterior normalmente
        container.innerHTML = `
            <div class="pb-28">

                <!-- Saudação com indicador de temporada -->
                <div class="px-4 py-4">
                    <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl font-bold leading-tight tracking-tight text-white">Olá, ${primeiroNome}! 👋</h1>
                            ${seloPremium}
                        </div>
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
                        <!-- Mini-card FALTAM removido -->
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

                <!-- Jogos ao Vivo -->
                <div id="jogos-do-dia-placeholder"></div>
            </div>
        `;
        // ✅ v10.9: Carregar e renderizar jogos ao vivo (API-Football) para todos
        carregarEExibirJogos();
    }
}

// =====================================================================
// ✅ v11.0: FUNÇÃO PARA CARREGAR E EXIBIR JOGOS AO VIVO + AUTO-REFRESH
// =====================================================================
async function carregarEExibirJogos() {
    try {
        if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "Carregando jogos ao vivo...");

        const mod = await import('./participante-jogos.js');
        const result = await mod.obterJogosAoVivo();

        if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "Resultado jogos:", {
            quantidade: result.jogos?.length || 0,
            fonte: result.fonte,
            aoVivo: result.aoVivo
        });

        // Armazenar jogos em cache global para modal
        window._jogosCache = result.jogos || [];
        console.log('[BOAS-VINDAS-DEBUG] _jogosCache populado com', window._jogosCache.length, 'jogos');

        if (result.jogos && result.jogos.length > 0) {
            const html = mod.renderizarJogosAoVivo(result.jogos, result.fonte, result.aoVivo);
            const el = document.getElementById('jogos-do-dia-placeholder');
            if (el) {
                el.innerHTML = html;
                if (window.Log) Log.info("PARTICIPANTE-BOAS-VINDAS", "Card de jogos renderizado!");
            }

            // v11.0: Iniciar auto-refresh se tem jogos ao vivo
            if (result.aoVivo) {
                mod.iniciarAutoRefresh((novoResult) => {
                    window._jogosCache = novoResult.jogos || [];
                    const novoHtml = mod.renderizarJogosAoVivo(novoResult.jogos, novoResult.fonte, novoResult.aoVivo);
                    const container = document.getElementById('jogos-do-dia-placeholder');
                    if (container) {
                        container.innerHTML = novoHtml;
                        if (window.Log) Log.debug("PARTICIPANTE-BOAS-VINDAS", "Jogos atualizados via auto-refresh");
                    }
                });
            }
        } else {
            if (window.Log) Log.debug("PARTICIPANTE-BOAS-VINDAS", "Sem jogos para exibir no momento");
        }
    } catch (err) {
        if (window.Log) Log.error("PARTICIPANTE-BOAS-VINDAS", "Erro ao carregar jogos:", err);
    }
}

// Parar auto-refresh quando sair da tela
window.addEventListener('participante-nav-change', () => {
    import('./participante-jogos.js').then(mod => {
        mod.pararAutoRefresh();
    }).catch(() => {});
});

if (window.Log)
    Log.info("PARTICIPANTE-BOAS-VINDAS", "Modulo v11.0 carregado (Jogos ao vivo + Auto-refresh)");
