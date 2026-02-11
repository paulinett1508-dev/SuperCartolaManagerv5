// =====================================================================
// MÓDULO PARCIAIS - v5.0 (Multi-Temporada + Ranking em Tempo Real)
// public/js/parciais.js
// =====================================================================

console.log("[PARCIAIS] Módulo v5.0 carregando...");

// Configuração de temporadas
const TEMPORADAS_CONFIG = {
    2025: { encerrada: true, totalRodadas: 38 },
    2026: { encerrada: false, totalRodadas: 38 }
};

// Cache de escalações em memória (escalação não muda durante a rodada)
const _escalacaoCache = new Map();

/**
 * FIX SEC-001: Helper para fetch com timeout e retry
 */
async function fetchComTimeoutERetry(url, options = {}, timeoutMs = 10000, maxRetries = 3) {
    for (let tentativa = 0; tentativa < maxRetries; tentativa++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            // FIX SEC-002: Retry em rate limiting (429)
            if (response.status === 429 && tentativa < maxRetries - 1) {
                const delay = Math.pow(2, tentativa) * 1000; // Exponential backoff: 1s, 2s, 4s
                console.warn(`[PARCIAIS] [SEC] Rate limited (429), aguardando ${delay}ms antes de retry ${tentativa + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                console.warn(`[PARCIAIS] [SEC] Timeout (${timeoutMs}ms) em ${url}`);
                if (tentativa < maxRetries - 1) {
                    const delay = 1000 * (tentativa + 1);
                    console.log(`[PARCIAIS] [SEC] Retry ${tentativa + 1}/${maxRetries} após ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
            throw error;
        }
    }
}

// Estado do módulo
const estadoParciais = {
    ligaId: null,
    rodadaAtual: null,
    mercadoStatus: null,
    timesLiga: [],
    dadosParciais: [],
    atletasPontuados: null,
    isCarregando: false,
    ultimaAtualizacao: null,
    autoRefresh: {
        ativo: false,
        timer: null,
        intervalMs: 30000,
        minMs: 30000,
        maxMs: 120000,
        step: 1.6,
        slowStep: 1.3,
        failures: 0,
        cycles: 0
    }
};

/**
 * FIX PERF-001: Limpar cache de escalações ao mudar de rodada
 */
function limparCacheEscalacoes() {
    const tamanhoAntes = _escalacaoCache.size;
    _escalacaoCache.clear();
    console.log(`[PARCIAIS] [PERF] Cache de escalações limpo (${tamanhoAntes} entradas removidas)`);
}

/**
 * Obter temporada selecionada da URL ou contexto global
 */
function obterTemporadaSelecionada() {
    const urlParams = new URLSearchParams(window.location.search);
    const temporadaParam = urlParams.get("temporada");
    if (temporadaParam) return parseInt(temporadaParam, 10);
    if (window.temporadaAtual) return window.temporadaAtual;
    return new Date().getFullYear();
}

/**
 * Obter ligaId da URL
 */
function obterLigaIdDaUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
}

/**
 * Verificar se a temporada está encerrada
 */
function isTemporadaEncerrada(temporada) {
    const config = TEMPORADAS_CONFIG[temporada];
    if (config) return config.encerrada;
    // Temporadas anteriores a 2025 estão encerradas
    if (temporada < 2025) return true;
    // Temporadas futuras não estão encerradas
    return false;
}

// =====================================================================
// INICIALIZAÇÃO - COM VERIFICAÇÃO DE TEMPORADA
// =====================================================================
export async function inicializarParciais() {
    const temporada = obterTemporadaSelecionada();
    console.log(`[PARCIAIS] Inicializando para temporada ${temporada}...`);

    if (isTemporadaEncerrada(temporada)) {
        console.log(`[PARCIAIS] Temporada ${temporada} encerrada - módulo em modo standby`);

        // Parar scheduler se estiver rodando
        if (window.ParciaisScheduler?.parar) {
            window.ParciaisScheduler.parar();
            console.log("[PARCIAIS] Scheduler desativado");
        }

        // Mostrar UI de temporada encerrada
        mostrarUITemporadaEncerrada(temporada);
        return;
    }

    // Temporada ativa - carregar parciais normalmente
    console.log(`[PARCIAIS] Temporada ${temporada} ativa - carregando parciais...`);
    _escalacaoCache.clear();
    await carregarParciais();
}

/**
 * Mostrar UI quando temporada está encerrada
 */
function mostrarUITemporadaEncerrada(temporada) {
    const container = document.getElementById('parciais-container');
    if (!container) return;

    container.innerHTML = `
        <div class="parciais-encerrado">
            <div class="parciais-encerrado-icon">
                <span class="material-icons">emoji_events</span>
            </div>
            <h2 class="parciais-encerrado-title">Temporada ${temporada} Encerrada</h2>
            <p class="parciais-encerrado-subtitle">
                As 38 rodadas foram concluídas com sucesso
            </p>
            <div class="parciais-encerrado-stats">
                <div class="parciais-stat">
                    <span class="material-icons">flag</span>
                    <span>38 Rodadas</span>
                </div>
                <div class="parciais-stat">
                    <span class="material-icons">check_circle</span>
                    <span>Consolidado</span>
                </div>
            </div>
            <div class="parciais-encerrado-info">
                <span class="material-icons">info</span>
                <p>
                    Confira a classificação final e os premiados nos módulos de
                    Ranking e Premiações.
                </p>
            </div>
            <div class="parciais-encerrado-actions">
                <button class="parciais-btn-ranking"
                    onclick="window.orquestrador?.showModule('ranking-geral')">
                    <span class="material-icons">leaderboard</span>
                    Ver Classificação Final
                </button>
            </div>
        </div>
    `;
}

// =====================================================================
// FUNÇÕES DE BUSCA DE DADOS
// =====================================================================

/**
 * Buscar status do mercado
 */
async function buscarStatusMercado() {
    try {
        const response = await fetch("/api/cartola/mercado/status");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("[PARCIAIS] Erro ao buscar status:", error);
        return null;
    }
}

/**
 * Buscar times da liga
 */
async function buscarTimesLiga(ligaId) {
    try {
        const response = await fetch(`/api/ligas/${ligaId}/times`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const times = Array.isArray(data) ? data : data.times || data.participantes || [];
        console.log(`[PARCIAIS] 📋 Times da liga: ${times.length} total`);
        return times.filter(t => t.ativo !== false); // Apenas ativos
    } catch (error) {
        console.error("[PARCIAIS] Erro ao buscar times:", error);
        return [];
    }
}

/**
 * Buscar atletas pontuados (tempo real, sem cache)
 */
async function buscarAtletasPontuados() {
    try {
        const timestamp = Date.now();
        // FIX SEC-001: Usar fetch com timeout e retry
        const response = await fetchComTimeoutERetry(
            `/api/cartola/atletas/pontuados?_t=${timestamp}`,
            {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            },
            10000, // 10s timeout
            3 // 3 tentativas
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // FIX SEC-003: Validar Content-Type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('[PARCIAIS] [SEC] Resposta não é JSON');
            return {};
        }

        const data = await response.json();

        // FIX SEC-003: Validar estrutura da resposta
        if (!data || typeof data !== 'object' || !data.atletas) {
            console.warn("[PARCIAIS] ⚠️ Estrutura de resposta inválida");
            return {};
        }

        console.log(`[PARCIAIS] 🔥 ${Object.keys(data.atletas).length} atletas pontuados`);
        return data.atletas;
    } catch (error) {
        console.error("[PARCIAIS] Erro ao buscar atletas pontuados:", error);
        return {};
    }
}

/**
 * Buscar escalação e calcular pontuação de um time
 */
async function buscarECalcularPontuacao(time, rodada, atletasPontuados) {
    const timeId = time.id || time.time_id || time.timeId;

    if (!timeId) {
        console.warn("[PARCIAIS] Time sem ID:", time);
        return null;
    }

    try {
        // Cache de escalação (não muda durante a rodada)
        const cacheKey = `${timeId}_${rodada}`;
        let dadosEscalacao = _escalacaoCache.get(cacheKey);

        if (!dadosEscalacao) {
            const timestamp = Date.now();
            // FIX SEC-001: Usar fetch com timeout e retry
            const response = await fetchComTimeoutERetry(
                `/api/cartola/time/id/${timeId}/${rodada}?_t=${timestamp}`,
                {
                    cache: "no-store",
                    headers: {
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache"
                    }
                },
                10000, // 10s timeout
                3 // 3 tentativas
            );

            if (!response.ok) {
                if (response.status === 404) {
                    return {
                        timeId,
                        nome_time: time.nome_time || time.nome || "N/D",
                        nome_cartola: time.nome_cartola || time.cartoleiro || "N/D",
                        escudo: time.url_escudo_png || time.escudo || null,
                        pontos: 0,
                        rodadaNaoJogada: true
                    };
                }
                throw new Error(`HTTP ${response.status}`);
            }

            dadosEscalacao = await response.json();
            _escalacaoCache.set(cacheKey, dadosEscalacao);
        }

        // CALCULAR PONTUAÇÃO
        let pontos = 0;
        const posicoesQuePontuaram = new Set();

        // Somar pontos dos TITULARES
        if (dadosEscalacao.atletas && Array.isArray(dadosEscalacao.atletas)) {
            dadosEscalacao.atletas.forEach((atleta) => {
                const atletaPontuado = atletasPontuados[atleta.atleta_id];
                const pontuacao = atletaPontuado?.pontuacao || 0;
                const entrouEmCampo = atletaPontuado?.entrou_em_campo;

                if (entrouEmCampo || pontuacao !== 0) {
                    posicoesQuePontuaram.add(atleta.posicao_id);
                }

                // Capitão pontua em dobro
                if (atleta.atleta_id === dadosEscalacao.capitao_id) {
                    pontos += pontuacao * 2;
                } else {
                    pontos += pontuacao;
                }
            });
        }

        // Somar pontos dos RESERVAS
        if (dadosEscalacao.reservas && Array.isArray(dadosEscalacao.reservas)) {
            dadosEscalacao.reservas.forEach((atleta) => {
                const atletaPontuado = atletasPontuados[atleta.atleta_id];
                const pontuacao = atletaPontuado?.pontuacao || 0;
                const entrouEmCampo = atletaPontuado?.entrou_em_campo;

                // Reserva de luxo pontua 1.5x se entrou em campo
                if (atleta.atleta_id === dadosEscalacao.reserva_luxo_id && entrouEmCampo) {
                    pontos += pontuacao * 1.5;
                }
                // Reserva comum substitui titular que não pontuou
                else if (!posicoesQuePontuaram.has(atleta.posicao_id) && entrouEmCampo) {
                    pontos += pontuacao;
                    posicoesQuePontuaram.add(atleta.posicao_id);
                }
            });
        }

        const nomeTime = dadosEscalacao.time?.nome || time.nome_time || time.nome || "N/D";
        const nomeCartola = dadosEscalacao.time?.nome_cartola || time.nome_cartola || "N/D";
        const escudo = dadosEscalacao.time?.url_escudo_png || time.url_escudo_png || time.escudo || null;

        return {
            timeId,
            nome_time: nomeTime,
            nome_cartola: nomeCartola,
            escudo: escudo,
            pontos: pontos,
            patrimonio: dadosEscalacao.time?.patrimonio || 0,
            rodadaNaoJogada: !dadosEscalacao.atletas || dadosEscalacao.atletas.length === 0
        };
    } catch (error) {
        console.warn(`[PARCIAIS] Erro ao calcular time ${timeId}:`, error.message);
        return {
            timeId,
            nome_time: time.nome_time || time.nome || "N/D",
            nome_cartola: time.nome_cartola || "N/D",
            escudo: time.url_escudo_png || time.escudo || null,
            pontos: 0,
            erro: true
        };
    }
}

/**
 * Processar times com limite de concorrência
 */
async function processarTimesComLimite(times, rodada, atletasPontuados, limite = 8) {
    const resultados = [];
    let index = 0;
    let ativos = 0;

    return new Promise((resolve) => {
        const iniciarProximo = () => {
            while (ativos < limite && index < times.length) {
                const time = times[index++];
                ativos += 1;
                buscarECalcularPontuacao(time, rodada, atletasPontuados)
                    .then((res) => {
                        if (res) resultados.push(res);
                    })
                    .catch(() => {})
                    .finally(() => {
                        ativos -= 1;
                        if (index >= times.length && ativos === 0) {
                            resolve(resultados);
                        } else {
                            iniciarProximo();
                        }
                    });
            }
        };
        iniciarProximo();
    });
}

// =====================================================================
// CARREGAR PARCIAIS - IMPLEMENTAÇÃO COMPLETA
// =====================================================================

/**
 * Carregar parciais da rodada atual
 */
async function carregarParciais() {
    const temporada = obterTemporadaSelecionada();
    const ligaId = obterLigaIdDaUrl();

    if (isTemporadaEncerrada(temporada)) {
        console.log(`[PARCIAIS] Temporada ${temporada} encerrada - função desabilitada`);
        mostrarUITemporadaEncerrada(temporada);
        return;
    }

    if (!ligaId) {
        console.error("[PARCIAIS] Liga ID não encontrado na URL");
        mostrarUIErro("Liga não encontrada");
        return;
    }

    if (estadoParciais.isCarregando) {
        console.log("[PARCIAIS] ⏳ Já está carregando...");
        return null;
    }

    estadoParciais.isCarregando = true;
    estadoParciais.ligaId = ligaId;

    const container = document.getElementById('parciais-container');
    if (!container) {
        estadoParciais.isCarregando = false;
        return;
    }

    try {
        // 1. Buscar status do mercado
        const status = await buscarStatusMercado();
        if (!status) {
            mostrarUIErro("Não foi possível verificar o status do mercado");
            return;
        }

        // FIX PERF-001: Limpar cache se rodada mudou
        if (estadoParciais.rodadaAtual && estadoParciais.rodadaAtual !== status.rodada_atual) {
            console.log(`[PARCIAIS] [PERF] Rodada mudou de ${estadoParciais.rodadaAtual} para ${status.rodada_atual}`);
            limparCacheEscalacoes();
        }

        estadoParciais.mercadoStatus = status;
        estadoParciais.rodadaAtual = status.rodada_atual;

        // 2. Verificar estado do mercado
        const rodadaEmAndamento = status.status_mercado === 2 || status.bola_rolando;

        if (!rodadaEmAndamento) {
            // Mercado aberto - mostrar UI apropriada
            mostrarUIMercadoAberto(status.rodada_atual, temporada);
            return;
        }

        // 3. Mostrar loading
        container.innerHTML = `
            <div class="parciais-loading-estado" role="status" aria-live="polite" aria-busy="true">
                <div class="spinner" aria-hidden="true"></div>
                <span>Calculando pontuações...</span>
            </div>
        `;

        // 4. Buscar times da liga
        const times = await buscarTimesLiga(ligaId);
        if (!times.length) {
            mostrarUIErro("Nenhum participante ativo encontrado");
            return;
        }
        estadoParciais.timesLiga = times;

        // 5. Buscar atletas pontuados
        const atletasPontuados = await buscarAtletasPontuados();
        estadoParciais.atletasPontuados = atletasPontuados;

        if (Object.keys(atletasPontuados).length === 0) {
            mostrarUIAguardandoPontuacao(status.rodada_atual, temporada);
            return;
        }

        // 6. Calcular pontuação de cada time
        console.log(`[PARCIAIS] 🔄 Calculando ${times.length} times...`);
        const resultados = await processarTimesComLimite(times, status.rodada_atual, atletasPontuados, 8);

        // 7. Ordenar por pontos e adicionar posição
        resultados.sort((a, b) => (b.pontos || 0) - (a.pontos || 0));
        resultados.forEach((r, idx) => { r.posicao = idx + 1; });

        estadoParciais.dadosParciais = resultados;
        estadoParciais.ultimaAtualizacao = new Date();

        // 8. Renderizar ranking
        renderizarRankingParcial(resultados, status.rodada_atual, temporada);

        console.log(`[PARCIAIS] ✅ ${resultados.length} times calculados`);

        return {
            rodada: status.rodada_atual,
            participantes: resultados,
            totalTimes: resultados.length,
            atualizadoEm: estadoParciais.ultimaAtualizacao
        };

    } catch (error) {
        console.error("[PARCIAIS] ❌ Erro ao carregar parciais:", error);
        mostrarUIErro("Erro ao carregar parciais");
        return null;
    } finally {
        estadoParciais.isCarregando = false;
    }
}

// =====================================================================
// FUNÇÕES DE UI
// =====================================================================

/**
 * Mostrar UI de erro
 */
function mostrarUIErro(mensagem) {
    const container = document.getElementById('parciais-container');
    if (!container) return;

    container.innerHTML = `
        <div class="parciais-encerrado" role="alert" aria-live="polite">
            <div class="parciais-encerrado-icon" style="background: var(--gradient-error, linear-gradient(135deg, #ef4444 0%, #dc2626 100%));">
                <span class="material-icons" aria-hidden="true">error_outline</span>
            </div>
            <h2 class="parciais-encerrado-title">Erro</h2>
            <p class="parciais-encerrado-subtitle">${mensagem}</p>
            <div class="parciais-encerrado-actions">
                <button class="parciais-btn-ranking" onclick="window.carregarParciais()" aria-label="Tentar carregar parciais novamente">
                    <span class="material-icons" aria-hidden="true">refresh</span>
                    Tentar Novamente
                </button>
            </div>
        </div>
    `;
}

/**
 * Mostrar UI de mercado aberto
 */
function mostrarUIMercadoAberto(rodada, temporada) {
    const container = document.getElementById('parciais-container');
    if (!container) return;

    container.innerHTML = `
        <div class="parciais-encerrado" role="status" aria-live="polite">
            <div class="parciais-encerrado-icon" style="background: var(--gradient-success, linear-gradient(135deg, #22c55e 0%, #16a34a 100%));">
                <span class="material-icons" aria-hidden="true">storefront</span>
            </div>
            <h2 class="parciais-encerrado-title">Mercado Aberto</h2>
            <p class="parciais-encerrado-subtitle">
                Temporada ${temporada} - Próxima Rodada: ${rodada}
            </p>
            <div class="parciais-encerrado-info">
                <span class="material-icons" aria-hidden="true">info</span>
                <p>
                    Os parciais estarão disponíveis quando o mercado fechar e os jogos começarem.
                </p>
            </div>
            <div class="parciais-encerrado-actions">
                <button class="parciais-btn-ranking" onclick="window.orquestrador?.voltarParaCards()" aria-label="Voltar para lista de módulos">
                    <span class="material-icons" aria-hidden="true">arrow_back</span>
                    Voltar aos Módulos
                </button>
            </div>
        </div>
    `;
}

/**
 * Mostrar UI aguardando pontuação
 */
function mostrarUIAguardandoPontuacao(rodada, temporada) {
    const container = document.getElementById('parciais-container');
    if (!container) return;

    container.innerHTML = `
        <div class="parciais-encerrado" role="status" aria-live="polite">
            <div class="parciais-encerrado-icon" style="background: var(--gradient-warning, linear-gradient(135deg, #f59e0b 0%, #d97706 100%));">
                <span class="material-icons" aria-hidden="true">sports_soccer</span>
            </div>
            <h2 class="parciais-encerrado-title">Rodada ${rodada} - Temporada ${temporada}</h2>
            <p class="parciais-encerrado-subtitle">
                Aguardando início dos jogos
            </p>
            <div class="parciais-encerrado-info">
                <span class="material-icons" aria-hidden="true">info</span>
                <p>
                    As pontuações aparecerão assim que os jogos começarem.
                </p>
            </div>
            <div class="parciais-encerrado-actions">
                <button class="parciais-btn-ranking" onclick="window.carregarParciais()" aria-label="Atualizar parciais">
                    <span class="material-icons" aria-hidden="true">refresh</span>
                    Atualizar
                </button>
            </div>
        </div>
    `;

    // Iniciar auto-refresh para verificar quando começar
    iniciarAutoRefresh();
}

/**
 * Renderizar ranking parcial
 */
function renderizarRankingParcial(resultados, rodada, temporada) {
    const container = document.getElementById('parciais-container');
    if (!container) return;

    const atualizadoEm = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    let html = `
        <div class="parciais-ranking-wrapper">
            <div class="parciais-header">
                <div class="parciais-header-info">
                    <span class="parciais-badge-live" role="status" aria-live="polite" aria-label="Pontuações ao vivo em tempo real">
                        <span class="live-dot" aria-hidden="true"></span>
                        AO VIVO
                    </span>
                    <h2>Rodada ${rodada} - Temporada ${temporada}</h2>
                </div>
                <div class="parciais-header-actions">
                    <span class="parciais-atualizado" aria-label="Horário da última atualização">Atualizado: ${atualizadoEm}</span>
                    <button class="parciais-btn-refresh" onclick="window.carregarParciais()" title="Atualizar" aria-label="Atualizar pontuações agora">
                        <span class="material-icons" aria-hidden="true">refresh</span>
                    </button>
                </div>
            </div>
            <div class="parciais-ranking-list" role="list" aria-label="Classificação parcial ao vivo">
    `;

    resultados.forEach((time, idx) => {
        const posicao = idx + 1;
        const medalha = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : '';
        const pontosTxt = time.pontos?.toFixed(2) || '0.00';
        const escudoUrl = time.escudo || '/escudos/default.png';
        const naoJogou = time.rodadaNaoJogada ? ' nao-jogou' : '';

        html += `
            <div class="parciais-ranking-item${naoJogou}" role="listitem" aria-label="${posicao}º lugar - ${time.nome_time} com ${pontosTxt} pontos">
                <div class="parciais-posicao" aria-hidden="true">
                    ${medalha || posicao}
                </div>
                <div class="parciais-time-info">
                    <img src="${escudoUrl}" alt="Escudo ${time.nome_time}" class="parciais-escudo" onerror="this.onerror=null;this.src='/escudos/default.png'">
                    <div class="parciais-time-nomes">
                        <span class="parciais-time-nome">${time.nome_time}</span>
                        <span class="parciais-cartola-nome">${time.nome_cartola}</span>
                    </div>
                </div>
                <div class="parciais-pontos ${time.pontos > 0 ? 'positivo' : time.pontos < 0 ? 'negativo' : ''}" aria-label="${pontosTxt} pontos">
                    ${pontosTxt}
                </div>
            </div>
        `;
    });

    html += `
            </div>
            <div class="parciais-footer">
                <span aria-label="Total de participantes">${resultados.length} participantes</span>
                <button class="parciais-btn-auto ${estadoParciais.autoRefresh.ativo ? 'ativo' : ''}"
                        onclick="window.toggleAutoRefresh()"
                        title="${estadoParciais.autoRefresh.ativo ? 'Parar auto-refresh' : 'Iniciar auto-refresh'}"
                        aria-label="${estadoParciais.autoRefresh.ativo ? 'Pausar atualização automática' : 'Iniciar atualização automática'}"
                        aria-pressed="${estadoParciais.autoRefresh.ativo}">
                    <span class="material-icons" aria-hidden="true">${estadoParciais.autoRefresh.ativo ? 'pause' : 'play_arrow'}</span>
                    Auto-refresh
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Iniciar auto-refresh se não estiver ativo
    if (!estadoParciais.autoRefresh.ativo) {
        iniciarAutoRefresh();
    }
}

// =====================================================================
// AUTO-REFRESH
// =====================================================================

function iniciarAutoRefresh() {
    if (estadoParciais.autoRefresh.ativo) return;

    estadoParciais.autoRefresh.ativo = true;
    estadoParciais.autoRefresh.failures = 0;
    estadoParciais.autoRefresh.cycles = 0;
    estadoParciais.autoRefresh.intervalMs = 30000;

    console.log("[PARCIAIS] ▶️ Auto-refresh iniciado");
    programarAutoRefresh();
}

function pararAutoRefresh() {
    estadoParciais.autoRefresh.ativo = false;

    if (estadoParciais.autoRefresh.timer) {
        clearTimeout(estadoParciais.autoRefresh.timer);
        estadoParciais.autoRefresh.timer = null;
    }

    console.log("[PARCIAIS] ⏹️ Auto-refresh parado");
}

function toggleAutoRefresh() {
    if (estadoParciais.autoRefresh.ativo) {
        pararAutoRefresh();
    } else {
        iniciarAutoRefresh();
    }

    // Atualizar botão
    const btn = document.querySelector('.parciais-btn-auto');
    if (btn) {
        btn.classList.toggle('ativo', estadoParciais.autoRefresh.ativo);
        btn.querySelector('.material-icons').textContent = estadoParciais.autoRefresh.ativo ? 'pause' : 'play_arrow';
    }
}

function programarAutoRefresh() {
    if (!estadoParciais.autoRefresh.ativo) return;

    clearTimeout(estadoParciais.autoRefresh.timer);
    estadoParciais.autoRefresh.timer = setTimeout(executarAutoRefresh, estadoParciais.autoRefresh.intervalMs);
}

async function executarAutoRefresh() {
    if (!estadoParciais.autoRefresh.ativo) return;

    try {
        estadoParciais.autoRefresh.cycles += 1;

        // Verificar status do mercado a cada 5 ciclos
        if (estadoParciais.autoRefresh.cycles % 5 === 0) {
            const status = await buscarStatusMercado();
            if (status) {
                estadoParciais.mercadoStatus = status;
                estadoParciais.rodadaAtual = status.rodada_atual;

                // Se mercado abriu, parar auto-refresh
                if (status.status_mercado === 1 && !status.bola_rolando) {
                    pararAutoRefresh();
                    mostrarUIMercadoAberto(status.rodada_atual, obterTemporadaSelecionada());
                    return;
                }
            }
        }

        // Carregar parciais
        const dados = await carregarParciais();

        if (dados && dados.participantes?.length > 0) {
            // Dados OK: reset intervalo
            estadoParciais.autoRefresh.intervalMs = estadoParciais.autoRefresh.minMs;
            estadoParciais.autoRefresh.failures = 0;
        } else {
            // Sem dados: aumentar intervalo (backoff)
            estadoParciais.autoRefresh.intervalMs = Math.min(
                estadoParciais.autoRefresh.maxMs,
                Math.round(estadoParciais.autoRefresh.intervalMs * estadoParciais.autoRefresh.slowStep)
            );
        }
    } catch (error) {
        estadoParciais.autoRefresh.failures += 1;
        estadoParciais.autoRefresh.intervalMs = Math.min(
            estadoParciais.autoRefresh.maxMs,
            Math.round(estadoParciais.autoRefresh.intervalMs * estadoParciais.autoRefresh.step)
        );
        console.warn("[PARCIAIS] Auto-refresh falhou:", error?.message || error);
    } finally {
        programarAutoRefresh();
    }
}

function atualizarParciais() {
    return carregarParciais();
}

// =====================================================================
// FIX PERF-002: PAUSAR AUTO-REFRESH QUANDO TAB INATIVA
// =====================================================================
let autoRefreshPausadoPorTab = false;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Tab ficou inativa
        if (estadoParciais.autoRefresh.ativo) {
            console.log('[PARCIAIS] [PERF] Tab inativa, pausando auto-refresh temporariamente');
            autoRefreshPausadoPorTab = true;
            pararAutoRefresh();
        }
    } else {
        // Tab ficou ativa novamente
        if (autoRefreshPausadoPorTab && estadoParciais.dadosParciais.length > 0) {
            console.log('[PARCIAIS] [PERF] Tab ativa, retomando auto-refresh');
            autoRefreshPausadoPorTab = false;
            iniciarAutoRefresh();
            // Atualizar imediatamente
            carregarParciais();
        }
    }
});

// =====================================================================
// EXPOR GLOBALMENTE
// =====================================================================
window.carregarParciais = carregarParciais;
window.atualizarParciais = atualizarParciais;
window.inicializarParciais = inicializarParciais;
window.toggleAutoRefresh = toggleAutoRefresh;
window.pararAutoRefresh = pararAutoRefresh;
window.estadoParciais = estadoParciais;

console.log("[PARCIAIS] Módulo v5.1 carregado - Multi-Temporada + Ranking em Tempo Real + Security & Performance Fixes");
