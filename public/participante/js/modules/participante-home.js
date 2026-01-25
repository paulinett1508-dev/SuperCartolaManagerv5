// =====================================================================
// PARTICIPANTE-HOME.JS - v1.0 (Premium Components)
// =====================================================================
// v1.0: Nova Home com componentes premium baseados no SKILL.md v3.2
//       - Header com Avatar e Badge Premium
//       - Grid de Atalhos 4 colunas
//       - Card Status do Time (split Pontos/Posicao)
//       - Card Saldo Financeiro
//       - FAB do Mercado com timer
//       - Lista de Jogos do Dia
// =====================================================================

if (window.Log)
    Log.info("PARTICIPANTE-HOME", "Carregando modulo v1.0 (Premium Components)...");

// Configuracao de temporada
const TEMPORADA_ATUAL = window.ParticipanteConfig?.CURRENT_SEASON || 2026;
const TEMPORADA_ANTERIOR = window.ParticipanteConfig?.PREVIOUS_SEASON || 2025;
const TEMPORADA_FINANCEIRA = window.ParticipanteConfig?.getFinancialSeason
    ? window.ParticipanteConfig.getFinancialSeason()
    : TEMPORADA_ATUAL;

// Estado do modulo
let participanteRenovado = false;
let participantePremium = false;
let mercadoStatus = null;

// =====================================================================
// FUNCAO PRINCIPAL
// =====================================================================
export async function inicializarHomeParticipante(params) {
    let ligaId, timeId, participante;

    if (typeof params === "object" && params !== null && !Array.isArray(params)) {
        ligaId = params.ligaId;
        timeId = params.timeId;
        participante = params.participante;
    } else {
        ligaId = params;
        timeId = arguments[1];
    }

    // Fallback - buscar dados do auth
    if (!ligaId || !timeId || ligaId === "[object Object]" || timeId === "undefined") {
        if (window.participanteAuth) {
            ligaId = ligaId || window.participanteAuth.ligaId;
            timeId = timeId || window.participanteAuth.timeId;
            participante = participante || window.participanteAuth.participante?.participante;
        }

        if (!ligaId || !timeId) {
            const authData = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(null), 3000);
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

    if (window.Log) Log.debug("PARTICIPANTE-HOME", "Inicializando...", { ligaId, timeId });

    if (!ligaId || ligaId === "[object Object]" || !timeId || timeId === "undefined") {
        if (window.Log) Log.error("PARTICIPANTE-HOME", "IDs invalidos");
        return;
    }

    await carregarDadosERenderizar(ligaId, timeId, participante);
}

window.inicializarHomeParticipante = inicializarHomeParticipante;

// =====================================================================
// CARREGAR DADOS E RENDERIZAR
// =====================================================================
async function carregarDadosERenderizar(ligaId, timeId, participante) {
    const container = document.getElementById("home-container");
    if (!container) return;

    const cache = window.ParticipanteCache;
    const meuTimeIdNum = Number(timeId);

    // Verificar status de renovacao e premium em paralelo
    await Promise.all([
        verificarStatusRenovacao(ligaId, timeId),
        verificarStatusPremium(),
        buscarStatusMercado()
    ]);

    // Buscar dados do cache ou API
    let liga = null, ranking = [], rodadas = [], extratoData = null;

    if (cache) {
        const deveBuscarExtratoDoCacheLocal = !participanteRenovado;

        [liga, ranking, rodadas, extratoData] = await Promise.all([
            cache.getLigaAsync ? cache.getLigaAsync(ligaId) : cache.getLiga(ligaId),
            cache.getRankingAsync ? cache.getRankingAsync(ligaId) : cache.getRanking(ligaId),
            cache.getRodadasAsync ? cache.getRodadasAsync(ligaId) : cache.getRodadas(ligaId),
            deveBuscarExtratoDoCacheLocal
                ? (cache.getExtratoAsync ? cache.getExtratoAsync(ligaId, timeId) : cache.getExtrato(ligaId, timeId))
                : Promise.resolve(null)
        ]);

        if (liga && ranking?.length) {
            const dadosRenderizados = processarDadosParaRender(
                liga, ranking, rodadas, extratoData, meuTimeIdNum, participante
            );
            renderizarHome(container, dadosRenderizados, ligaId);
            if (window.Log) Log.info("PARTICIPANTE-HOME", "Instant load - dados do cache!");
        }
    }

    // Se nao tem cache, mostrar loading
    if (!liga || !ranking?.length) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[300px] py-16">
                <div class="w-10 h-10 border-4 border-zinc-700 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                <p class="text-sm text-gray-400">Carregando...</p>
            </div>
        `;
    }

    // Buscar dados frescos da API
    try {
        const [ligaFresh, rankingFresh, rodadasFresh] = await Promise.all([
            fetch(`/api/ligas/${ligaId}`).then(r => r.ok ? r.json() : liga),
            fetch(`/api/ligas/${ligaId}/ranking`).then(r => r.ok ? r.json() : ranking),
            fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`).then(r => r.ok ? r.json() : rodadas)
        ]);

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
        let temporadaExtrato = participanteRenovado ? TEMPORADA_ATUAL : TEMPORADA_FINANCEIRA;

        try {
            const resCache = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache?rodadaAtual=${ultimaRodadaNum}&temporada=${temporadaExtrato}`);
            if (resCache.ok) {
                const cacheData = await resCache.json();
                extratoFresh = {
                    saldo_atual: cacheData?.resumo?.saldo_final ?? cacheData?.resumo?.saldo ?? 0,
                    resumo: cacheData?.resumo || {}
                };
            }
        } catch (e) {
            const resFallback = await fetch(`/api/fluxo-financeiro/${ligaId}/extrato/${timeId}`);
            extratoFresh = resFallback.ok ? await resFallback.json() : null;
        }

        if (cache && extratoFresh) {
            cache.setExtrato(ligaId, timeId, extratoFresh);
        }

        const dadosFresh = processarDadosParaRender(
            ligaFresh, rankingFresh, rodadasFresh, extratoFresh, meuTimeIdNum, participante
        );
        renderizarHome(container, dadosFresh, ligaId);

        if (window.Log) Log.info("PARTICIPANTE-HOME", "Dados carregados e cacheados");

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-HOME", "Erro:", error);
        if (!liga || !ranking?.length) {
            container.innerHTML = `
                <div class="text-center py-16 px-5">
                    <span class="material-icons text-5xl text-red-500">error</span>
                    <p class="text-white/70 mt-4">Erro ao carregar dados</p>
                </div>
            `;
        }
    }

    // Carregar jogos em background
    carregarEExibirJogos();
}

// =====================================================================
// PROCESSAR DADOS
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

    // Posicao anterior
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
    const clubeId = participante?.clube_id || meuTime?.clube_id || null;

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
        clubeId
    };
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

function getIniciais(nome) {
    if (!nome) return "??";
    const partes = nome.split(" ");
    if (partes.length >= 2) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
}

function getZonaInfo(posicao, total) {
    if (!posicao || !total)
        return { texto: "Aguardando", cor: "var(--app-primary)", icon: "schedule", bg: "var(--app-primary-muted)" };

    const percentual = (posicao / total) * 100;
    if (percentual <= 33)
        return { texto: "Zona de Premiacao", cor: "var(--app-success-light)", icon: "emoji_events", bg: "var(--app-success-muted)" };
    if (percentual <= 66)
        return { texto: "Zona Neutra", cor: "var(--app-warning)", icon: "remove", bg: "var(--app-warning-muted)" };
    return { texto: "Zona de Risco", cor: "var(--app-danger)", icon: "warning", bg: "var(--app-danger-muted)" };
}

async function verificarStatusRenovacao(ligaId, timeId) {
    try {
        const url = `/api/inscricoes/${ligaId}/${TEMPORADA_ATUAL}/${timeId}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.inscricao) {
                const status = data.inscricao.status;
                participanteRenovado = (status === 'renovado' || status === 'novo');
            }
        }
    } catch (error) {
        participanteRenovado = false;
    }
}

async function verificarStatusPremium() {
    try {
        const response = await fetch('/api/cartola-pro/verificar-premium', { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            participantePremium = data.premium === true;
        }
    } catch (error) {
        participantePremium = false;
    }
}

async function buscarStatusMercado() {
    try {
        const response = await fetch('/api/cartola/mercado/status');
        if (response.ok) {
            mercadoStatus = await response.json();
        }
    } catch (error) {
        mercadoStatus = null;
    }
}

// =====================================================================
// RENDERIZACAO PRINCIPAL
// =====================================================================
function renderizarHome(container, data, ligaId) {
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
        clubeId
    } = data;

    const iniciais = getIniciais(nomeCartola);
    const isPremium = participantePremium;
    const isRenovado = participanteRenovado;

    // Variacao de posicao
    let variacaoHTML = "";
    if (posicao && posicaoAnterior) {
        const diff = posicaoAnterior - posicao;
        if (diff > 0) variacaoHTML = `<span class="home-variation-up">+${diff}</span>`;
        else if (diff < 0) variacaoHTML = `<span class="home-variation-down">${diff}</span>`;
    }

    // Saldo formatado
    const saldoAbs = Math.abs(saldoFinanceiro);
    const saldoFormatado = saldoFinanceiro >= 0
        ? `R$ ${saldoAbs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : `-R$ ${saldoAbs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    const saldoClass = saldoFinanceiro > 0 ? "positive" : saldoFinanceiro < 0 ? "negative" : "";

    // FAB do Mercado
    const mercadoAberto = mercadoStatus?.status_mercado === 1;
    const fabClass = mercadoAberto ? "" : "closed";
    const fabStatus = mercadoAberto ? `Aberto R${mercadoStatus?.rodada_atual || 1}` : "Fechado";
    const fabTimer = mercadoStatus?.fechamento
        ? calcularTempoRestante(mercadoStatus.fechamento)
        : "";

    // Escudo do clube
    const escudoHTML = clubeId
        ? `<img src="/escudos/${clubeId}.png" alt="Escudo" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=\\'material-icons\\'>shield</span>'">`
        : `<span class="material-icons">shield</span>`;

    // Badge Premium
    const badgePremiumHTML = isPremium ? `
        <div class="home-badge-premium">
            <span class="material-icons badge-icon">star</span>
            <span>Premium</span>
        </div>
    ` : "";

    // Valores para display
    const aguardandoRodada = isRenovado || rodadaAtual === 0;
    const posicaoDisplay = aguardandoRodada ? "--" : (posicao ? `${posicao}` : "--");
    const pontosDisplay = aguardandoRodada ? "0" : formatarPontos(pontosTotal).split(",")[0];
    const hintPosicao = aguardandoRodada ? "Aguardando 1ª rodada" : `de ${totalParticipantes}${variacaoHTML}`;
    const hintPontos = aguardandoRodada ? "Aguardando 1ª rodada" : "total acumulado";

    container.innerHTML = `
        <!-- Header Premium -->
        <header class="home-header-premium">
            <div class="home-header-content">
                <div class="home-user-section">
                    <div class="home-avatar-circle">
                        <span class="home-avatar-initials">${iniciais}</span>
                    </div>
                    <div class="home-user-info">
                        <h1 class="home-user-name">${nomeCartola}</h1>
                        ${badgePremiumHTML}
                    </div>
                </div>
                <button class="home-btn-icon" onclick="window.participanteNav?.navegarPara('boas-vindas')" aria-label="Notificacoes">
                    <span class="material-icons">notifications</span>
                </button>
            </div>
        </header>

        <!-- Grid de Atalhos -->
        <section class="home-action-grid">
            <button class="home-action-item" onclick="window.abrirPremiacoes2026 && window.abrirPremiacoes2026()">
                <div class="home-action-icon">
                    <span class="material-icons">emoji_events</span>
                </div>
                <span class="home-action-label">Premiacoes</span>
            </button>
            <button class="home-action-item" onclick="window.abrirParticipantes2026 && window.abrirParticipantes2026()">
                <div class="home-action-icon">
                    <span class="material-icons">groups</span>
                </div>
                <span class="home-action-label">Participantes</span>
            </button>
            <button class="home-action-item" onclick="window.abrirRegras2026 && window.abrirRegras2026()">
                <div class="home-action-icon">
                    <span class="material-icons">description</span>
                </div>
                <span class="home-action-label">Regras</span>
            </button>
            <button class="home-action-item" onclick="window.abrirCartolaPro && window.abrirCartolaPro()">
                <div class="home-action-icon">
                    <span class="material-icons">workspace_premium</span>
                </div>
                <span class="home-action-label">Cartola PRO</span>
            </button>
        </section>

        <!-- Card Status do Time -->
        <section class="home-team-card">
            <div class="home-team-header">
                <h2 class="home-team-name">${nomeTime}</h2>
                <div class="home-team-shield">
                    ${escudoHTML}
                </div>
            </div>
            <div class="home-stats-split">
                <div class="home-stat-block">
                    <span class="home-stat-label">Pontos</span>
                    <span class="home-stat-value text-accent">${pontosDisplay}</span>
                    <span class="home-stat-hint">${hintPontos}</span>
                </div>
                <div class="home-stat-divider"></div>
                <div class="home-stat-block">
                    <span class="home-stat-label">Posicao</span>
                    <span class="home-stat-value">${posicaoDisplay}</span>
                    <span class="home-stat-hint">${hintPosicao}</span>
                </div>
            </div>
        </section>

        <!-- Card Saldo Financeiro -->
        <section class="home-finance-card" onclick="window.participanteNav?.navegarPara('extrato')">
            <div class="home-finance-left">
                <div class="home-finance-icon">
                    <span class="material-icons">toll</span>
                </div>
                <div class="home-finance-info">
                    <span class="home-finance-label">Saldo Financeiro</span>
                    <span class="home-finance-value ${saldoClass}">${saldoFormatado}</span>
                </div>
            </div>
            <div class="home-finance-arrow">
                <span class="material-icons">chevron_right</span>
            </div>
        </section>

        <!-- Jogos do Dia -->
        <div id="home-jogos-placeholder"></div>

        <!-- FAB do Mercado -->
        <div class="home-fab-mercado">
            <button class="home-fab-btn ${fabClass}" onclick="window.open('https://cartolafc.globo.com', '_blank')">
                <div class="home-fab-icon">
                    <span class="material-icons">storefront</span>
                </div>
                <div class="home-fab-content">
                    <span class="home-fab-timer">${fabTimer}</span>
                    <span class="home-fab-status">${fabStatus}</span>
                </div>
            </button>
        </div>
    `;
}

// =====================================================================
// CALCULAR TEMPO RESTANTE
// =====================================================================
function calcularTempoRestante(fechamento) {
    if (!fechamento) return "";

    const agora = new Date();
    const fim = new Date(fechamento);
    const diff = fim - agora;

    if (diff <= 0) return "Fechado";

    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (dias > 0) return `Fecha em ${dias}d ${horas}h`;
    if (horas > 0) return `Fecha em ${horas}h`;

    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `Fecha em ${minutos}min`;
}

// =====================================================================
// CARREGAR JOGOS
// =====================================================================
async function carregarEExibirJogos() {
    try {
        const mod = await import('./participante-jogos.js');
        const result = await mod.obterJogosAoVivo();

        window._jogosCache = result.jogos || [];

        if (result.jogos && result.jogos.length > 0) {
            const html = renderizarJogosHome(result.jogos.slice(0, 3), result.fonte, result.aoVivo, result.jogos.length);
            const el = document.getElementById('home-jogos-placeholder');
            if (el) {
                el.innerHTML = html;
            }

            if (result.aoVivo) {
                mod.iniciarAutoRefresh((novoResult) => {
                    window._jogosCache = novoResult.jogos || [];
                    const novoHtml = renderizarJogosHome(novoResult.jogos.slice(0, 3), novoResult.fonte, novoResult.aoVivo, novoResult.jogos.length);
                    const container = document.getElementById('home-jogos-placeholder');
                    if (container) {
                        container.innerHTML = novoHtml;
                    }
                });
            }
        }
    } catch (err) {
        if (window.Log) Log.error("PARTICIPANTE-HOME", "Erro ao carregar jogos:", err);
    }
}

// =====================================================================
// RENDERIZAR JOGOS NA HOME
// =====================================================================
function renderizarJogosHome(jogos, fonte, aoVivo, totalJogos) {
    if (!jogos || jogos.length === 0) return "";

    const jogosHTML = jogos.map(jogo => {
        const mandanteAbrev = jogo.mandante?.substring(0, 3).toUpperCase() || "???";
        const visitanteAbrev = jogo.visitante?.substring(0, 3).toUpperCase() || "???";
        const emAndamento = jogo.status === 'Em andamento' || jogo.minuto;

        const centerContent = emAndamento
            ? `<span class="home-match-score">${jogo.placar_mandante || 0} - ${jogo.placar_visitante || 0}</span>
               <div class="home-match-live">
                   <div class="home-match-live-dot"></div>
                   <span class="home-match-live-text">${jogo.minuto || 'AO VIVO'}</span>
               </div>`
            : `<span class="home-match-vs">VS</span>
               <span class="home-match-time">${jogo.horario || '--:--'}</span>`;

        return `
            <div class="home-match-card">
                <div class="home-match-league">${jogo.campeonato || 'Campeonato'}</div>
                <div class="home-match-content">
                    <div class="home-match-team">
                        <div class="home-team-badge" style="background: ${getTeamColor(jogo.mandante)};">
                            <span>${mandanteAbrev}</span>
                        </div>
                        <span class="home-team-name-short">${jogo.mandante || 'Time A'}</span>
                    </div>
                    <div class="home-match-center">
                        ${centerContent}
                    </div>
                    <div class="home-match-team">
                        <div class="home-team-badge" style="background: ${getTeamColor(jogo.visitante)};">
                            <span>${visitanteAbrev}</span>
                        </div>
                        <span class="home-team-name-short">${jogo.visitante || 'Time B'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    const verMaisBtn = totalJogos > 3 ? `
        <button onclick="window.abrirModalJogos && window.abrirModalJogos()"
                class="w-full mt-3 py-3 text-center text-sm font-medium text-primary border border-primary/30 rounded-xl active:scale-95 transition-transform">
            Ver todos os ${totalJogos} jogos
        </button>
    ` : "";

    return `
        <section class="home-matches-section">
            <div class="home-matches-header">
                <div class="home-matches-title">
                    <h3>Hoje</h3>
                    <span class="material-icons">schedule</span>
                </div>
                <span class="home-matches-badge">${totalJogos} jogos</span>
            </div>
            <div class="home-matches-list">
                ${jogosHTML}
            </div>
            ${verMaisBtn}
        </section>
    `;
}

// =====================================================================
// COR DO TIME (heuristica simples)
// =====================================================================
function getTeamColor(nome) {
    if (!nome) return "#4b5563";

    const cores = {
        "Flamengo": "#c8102e",
        "Palmeiras": "#006437",
        "Corinthians": "#000000",
        "Sao Paulo": "#ff0000",
        "Santos": "#ffffff",
        "Botafogo": "#000000",
        "Fluminense": "#7b2d3e",
        "Vasco": "#000000",
        "Cruzeiro": "#003399",
        "Atletico": "#000000",
        "Gremio": "#0066b3",
        "Internacional": "#e4002b",
        "Bahia": "#0033a0",
        "Fortaleza": "#c8102e",
        "Athletico": "#cc0000",
        "Bragantino": "#ffffff",
    };

    for (const [time, cor] of Object.entries(cores)) {
        if (nome.toLowerCase().includes(time.toLowerCase())) {
            return cor;
        }
    }

    return "#4b5563";
}

// Parar auto-refresh quando sair da tela
window.addEventListener('participante-nav-change', () => {
    import('./participante-jogos.js').then(mod => {
        mod.pararAutoRefresh && mod.pararAutoRefresh();
    }).catch(() => {});
});

if (window.Log)
    Log.info("PARTICIPANTE-HOME", "Modulo v1.0 carregado");
