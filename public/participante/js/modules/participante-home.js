// =====================================================================
// PARTICIPANTE-HOME.JS - v1.3 (Correção Rodada Disputada)
// =====================================================================
import { getZonaInfo } from "./zona-utils.js";
import * as ParciaisModule from "./participante-rodada-parcial.js";
import { getClubesNomeMap } from "/js/shared/clubes-data.js";
// v1.3: FIX - Distinguir rodada do mercado vs última rodada disputada
//       - Quando mercado aberto, usa rodada-1 para buscar escalação
//       - Evita erro 404 ao buscar dados de rodada não disputada
// v1.2: Integração com parciais em tempo real + Saldo projetado
//       - Removido header premium (badge com nome)
//       - Card central reflete pontos/posição parciais (AO VIVO)
//       - Saldo financeiro mostra projeção baseada na posição
// v1.1: FIX - Double RAF para garantir container no DOM após refresh
// v1.0: Nova Home com componentes premium baseados no SKILL.md v3.2
// =====================================================================

if (window.Log)
    Log.info("PARTICIPANTE-HOME", "Carregando modulo v1.3 (Correção Rodada Disputada)...");

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

const CLUBES_CACHE_KEY = 'cartola_clubes_cache_v1';
const CLUBES_CACHE_TTL = 12 * 60 * 60 * 1000; // 12h

const HOME_AUTO_REFRESH_MS = 60000; // 60s
let homeAutoRefreshId = null;
let homeAutoRefreshEmAndamento = false;

// Estado de parciais
let dadosParciais = null;
let configRankingRodada = null;
let parciaisAtivos = false;
let saldoOriginal = 0;

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

    // ✅ v1.1 FIX: SEMPRE buscar dados do auth para garantir campos completos (clube_id, etc)
    // A navegação passa dados incompletos (camelCase, sem clube_id)
    if (window.participanteAuth) {
        const authData = window.participanteAuth.participante?.participante;
        // Mesclar dados: auth tem prioridade pois tem estrutura completa
        if (authData && typeof authData === 'object') {
            participante = { ...participante, ...authData };
        }
    }

    // Fallback - buscar IDs do auth se não vieram
    if (!ligaId || !timeId || ligaId === "[object Object]" || timeId === "undefined") {
        if (window.participanteAuth) {
            ligaId = ligaId || window.participanteAuth.ligaId;
            timeId = timeId || window.participanteAuth.timeId;
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

    pararAutoRefreshHome();
    await carregarDadosERenderizar(ligaId, timeId, participante);
    iniciarAutoRefreshHome(ligaId, timeId, participante);
}

window.inicializarHomeParticipante = inicializarHomeParticipante;

// =====================================================================
// CARREGAR DADOS E RENDERIZAR - v1.1 FIX REFRESH
// =====================================================================
async function carregarDadosERenderizar(ligaId, timeId, participante) {
    // ✅ v1.1: Aguardar DOM estar renderizado (double RAF)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    let container = document.getElementById("home-container");

    // ✅ v1.1: Retry com polling se container não encontrado imediatamente
    if (!container) {
        if (window.Log) Log.warn("PARTICIPANTE-HOME", "Container não encontrado - aguardando...");
        container = await new Promise((resolve) => {
            let tentativas = 0;
            const maxTentativas = 10;
            const interval = setInterval(() => {
                tentativas++;
                const el = document.getElementById("home-container");
                if (el) {
                    clearInterval(interval);
                    resolve(el);
                } else if (tentativas >= maxTentativas) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 100);
        });
    }

    if (!container) {
        if (window.Log) Log.error("PARTICIPANTE-HOME", "Container não encontrado após retry");
        return;
    }

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

    // ✅ v9.1: Temporada para segregar cache
    const temporadaCacheHome = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();

    if (cache) {
        const deveBuscarExtratoDoCacheLocal = !participanteRenovado;

        [liga, ranking, rodadas, extratoData] = await Promise.all([
            cache.getLigaAsync ? cache.getLigaAsync(ligaId) : cache.getLiga(ligaId),
            cache.getRankingAsync ? cache.getRankingAsync(ligaId, null, null, temporadaCacheHome) : cache.getRanking(ligaId, temporadaCacheHome),
            cache.getRodadasAsync ? cache.getRodadasAsync(ligaId, null, null, temporadaCacheHome) : cache.getRodadas(ligaId, temporadaCacheHome),
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
    // ✅ v9.0: Passar temporada para segregar dados por ano
    const temporada = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();
    try {
        const [ligaFresh, rankingFresh, rodadasFresh] = await Promise.all([
            fetch(`/api/ligas/${ligaId}`).then(r => r.ok ? r.json() : liga),
            fetch(`/api/ligas/${ligaId}/ranking?temporada=${temporada}`).then(r => r.ok ? r.json() : ranking),
            fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38&temporada=${temporada}`).then(r => r.ok ? r.json() : rodadas)
        ]);

        if (cache) {
            cache.setLiga(ligaId, ligaFresh);
            cache.setRanking(ligaId, rankingFresh, temporadaCacheHome);
            cache.setRodadas(ligaId, rodadasFresh, temporadaCacheHome);
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

        // Guardar saldo original para cálculos parciais
        saldoOriginal = dadosFresh.saldoFinanceiro || 0;

        // Inicializar parciais se disponíveis
        await inicializarParciaisHome(ligaId, timeId, dadosFresh);

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

    // Carregar seção Tabelas Esportivas em background
    carregarTabelasEsportes(participante);

    // Carregar notícias do time do coração em background
    carregarNoticiasDoMeuTime(participante);
}

// =====================================================================
// AUTO-REFRESH DOS CARDS (PONTOS / POSICAO / SALDO)
// =====================================================================
function iniciarAutoRefreshHome(ligaId, timeId, participante) {
    pararAutoRefreshHome();

    if (!document.getElementById('home-container')) return;

    homeAutoRefreshId = setInterval(() => {
        if (document.hidden) return;
        if (window.moduloAtualParticipante && window.moduloAtualParticipante !== 'home') {
            pararAutoRefreshHome();
            return;
        }
        atualizarCardsHome(ligaId, timeId, participante);
    }, HOME_AUTO_REFRESH_MS);
}

function pararAutoRefreshHome() {
    if (homeAutoRefreshId) {
        clearInterval(homeAutoRefreshId);
        homeAutoRefreshId = null;
    }

    // Parar parciais também
    if (ParciaisModule?.pararAutoRefresh) {
        ParciaisModule.pararAutoRefresh();
    }

    // Limpar estado de parciais
    dadosParciais = null;
    parciaisAtivos = false;
}

async function atualizarCardsHome(ligaId, timeId, participante) {
    if (homeAutoRefreshEmAndamento) return;
    if (!document.getElementById('home-container')) return;

    homeAutoRefreshEmAndamento = true;
    try {
        const dadosFresh = await buscarDadosHomeFresh(ligaId, timeId);
        if (!dadosFresh) return;

        const meuTimeIdNum = Number(timeId);
        const dadosRender = processarDadosParaRender(
            dadosFresh.liga,
            dadosFresh.ranking,
            dadosFresh.rodadas,
            dadosFresh.extrato,
            meuTimeIdNum,
            participante
        );

        atualizarCardsHomeUI(dadosRender);
    } catch (error) {
        if (window.Log) Log.warn("PARTICIPANTE-HOME", "Falha no auto-refresh:", error);
    } finally {
        homeAutoRefreshEmAndamento = false;
    }
}

async function buscarDadosHomeFresh(ligaId, timeId) {
    const cache = window.ParticipanteCache;
    const temporada = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();

    const [ligaFresh, rankingFresh, rodadasFresh] = await Promise.all([
        fetch(`/api/ligas/${ligaId}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/ligas/${ligaId}/ranking?temporada=${temporada}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38&temporada=${temporada}`).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    if (!Array.isArray(rankingFresh) || !Array.isArray(rodadasFresh)) return null;

    if (cache) {
        if (ligaFresh) cache.setLiga(ligaId, ligaFresh);
        cache.setRanking(ligaId, rankingFresh, temporada);
        cache.setRodadas(ligaId, rodadasFresh, temporada);
    }

    const minhasRodadasTemp = (rodadasFresh || []).filter(
        (r) => Number(r.timeId) === Number(timeId) || Number(r.time_id) === Number(timeId)
    );
    const ultimaRodadaNum = minhasRodadasTemp.length > 0
        ? Math.max(...minhasRodadasTemp.map(r => r.rodada))
        : 1;

    let extratoFresh = null;
    const temporadaExtrato = participanteRenovado ? TEMPORADA_ATUAL : TEMPORADA_FINANCEIRA;

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

    return {
        liga: ligaFresh || {},
        ranking: rankingFresh,
        rodadas: rodadasFresh,
        extrato: extratoFresh
    };
}

function atualizarCardsHomeUI(data) {
    const {
        posicao,
        totalParticipantes,
        pontosTotal,
        ultimaRodada,
        minhasRodadas,
        saldoFinanceiro
    } = data;

    // === SLIDER DE POSIÇÃO ===
    const posicaoBadgeEl = document.getElementById('home-posicao-badge');
    const sliderProgressEl = document.getElementById('home-slider-progress');
    const posicaoIndicatorEl = document.getElementById('home-posicao-indicator');

    if (posicaoBadgeEl) {
        posicaoBadgeEl.textContent = posicao || '--';
    }

    if (sliderProgressEl && posicaoIndicatorEl && posicao && totalParticipantes > 0) {
        const percentual = ((posicao - 1) / (totalParticipantes - 1)) * 100;
        const percentualClamped = Math.max(5, Math.min(95, percentual));
        sliderProgressEl.style.width = `${100 - percentualClamped}%`;
        posicaoIndicatorEl.style.left = `${percentualClamped}%`;
    }

    // === ÚLTIMA PONTUAÇÃO ===
    const ultimaPontuacaoEl = document.getElementById('home-ultima-pontuacao');
    const variacaoPontosEl = document.getElementById('home-variacao-pontos');
    const rankingPontosEl = document.getElementById('home-ranking-pontos');

    const pontosUltimaRodada = ultimaRodada ? parseFloat(ultimaRodada.pontos || 0) : 0;
    const pontosRodadaAnterior = minhasRodadas?.[1] ? parseFloat(minhasRodadas[1].pontos || 0) : 0;
    const variacaoPontos = pontosUltimaRodada - pontosRodadaAnterior;

    if (ultimaPontuacaoEl) {
        ultimaPontuacaoEl.textContent = formatarPontos(pontosUltimaRodada);
    }

    if (variacaoPontosEl) {
        if (variacaoPontos >= 0) {
            variacaoPontosEl.textContent = `↑${formatarPontos(Math.abs(variacaoPontos))}`;
            variacaoPontosEl.className = 'home-stat-variacao positivo';
        } else {
            variacaoPontosEl.textContent = `↓${formatarPontos(Math.abs(variacaoPontos))}`;
            variacaoPontosEl.className = 'home-stat-variacao negativo';
        }
    }

    if (rankingPontosEl) {
        rankingPontosEl.textContent = posicao ? `${posicao}º` : '--';
    }

    // === PATRIMÔNIO ===
    const patrimonioEl = document.getElementById('home-patrimonio');
    const variacaoPatrimonioEl = document.getElementById('home-variacao-patrimonio');

    const saldoAbs = Math.abs(saldoFinanceiro);
    const saldoFormatado = saldoFinanceiro >= 0
        ? `R$ ${saldoAbs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : `-R$ ${saldoAbs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

    const ganhoUltimaRodada = ultimaRodada ? parseFloat(ultimaRodada.valorFinanceiro || ultimaRodada.ganho_rodada || 0) : 0;

    if (patrimonioEl) {
        patrimonioEl.textContent = saldoFormatado;
    }

    if (variacaoPatrimonioEl) {
        if (ganhoUltimaRodada >= 0) {
            variacaoPatrimonioEl.textContent = `↑${ganhoUltimaRodada.toFixed(2)}`;
            variacaoPatrimonioEl.className = 'home-stat-variacao positivo';
        } else {
            variacaoPatrimonioEl.textContent = `↓${Math.abs(ganhoUltimaRodada).toFixed(2)}`;
            variacaoPatrimonioEl.className = 'home-stat-variacao negativo';
        }
    }
}

// =====================================================================
// PROCESSAR DADOS
// =====================================================================
function processarDadosParaRender(liga, ranking, rodadas, extratoData, meuTimeIdNum, participante) {
    const meuTime = ranking?.find((t) => Number(t.timeId) === meuTimeIdNum);
    const posicao = meuTime ? meuTime.posicao : null;
    // ✅ v1.2: Fallback para liga.participantes em pré-temporada (consistente com boas-vindas)
    const totalParticipantes = ranking?.length || liga?.participantes?.filter(p => p.ativo !== false)?.length || liga?.times?.length || 0;

    const minhasRodadas = (rodadas || []).filter(
        (r) => Number(r.timeId) === meuTimeIdNum || Number(r.time_id) === meuTimeIdNum
    );

    const pontosCalcRodadas = minhasRodadas.reduce((total, rodada) => {
        return total + (parseFloat(rodada.pontos) || 0);
    }, 0);

    const rodadasOrdenadas = [...minhasRodadas].sort((a, b) => b.rodada - a.rodada);
    const pontosRanking = parseFloat(meuTime?.pontos ?? meuTime?.pontos_total ?? meuTime?.pontos_totais ?? meuTime?.pontuacao ?? meuTime?.pontos_corridos ?? 0) || 0;
    const pontosTotal = pontosRanking > 0 ? pontosRanking : pontosCalcRodadas;
    const ultimaRodada = rodadasOrdenadas[0];
    const rodadaAtualByRodadas = ultimaRodada ? Number(ultimaRodada.rodada) : 0;
    const rodadasDoRanking = Number(meuTime?.rodadas ?? meuTime?.rodada ?? meuTime?.rodadas_jogadas ?? 0) || 0;
    const rodadaMercado = Number(mercadoStatus?.rodada_atual ?? 0) || 0;
    const statusMercadoNum = Number(mercadoStatus?.status_mercado ?? 1) || 1;
    const rodadaAtual = Math.max(rodadaAtualByRodadas, rodadasDoRanking, rodadaMercado);

    // ✅ FIX: Calcular última rodada DISPUTADA (com dados de escalação/pontuação)
    // Quando mercado está ABERTO (status=1), a rodada_atual é a PRÓXIMA a ser disputada
    const ultimaRodadaDisputada = window.obterUltimaRodadaDisputada
        ? window.obterUltimaRodadaDisputada(rodadaMercado, statusMercadoNum)
        : (statusMercadoNum === 1 || statusMercadoNum === 3 ? Math.max(1, rodadaMercado - 1) : rodadaMercado);

    // Posicao anterior
    let posicaoAnterior = null;
    if (rodadaAtual > 1 && minhasRodadas.length >= 2) {
        const rodadasAteAnterior = (rodadas || []).filter((r) => r.rodada < rodadaAtual);
        const rankingAnterior = calcularRankingManual(rodadasAteAnterior);
        const meuTimeAnterior = rankingAnterior.find((t) => Number(t.timeId) === meuTimeIdNum);
        if (meuTimeAnterior) posicaoAnterior = meuTimeAnterior.posicao;
    }

    // ✅ Calcular saldo baseado nas rodadas (fonte da verdade - mesma regra do modal)
    const saldoCalculadoPorRodadas = minhasRodadas.reduce((total, rodada) => {
        return total + (parseFloat(rodada.valorFinanceiro || rodada.ganho_rodada || 0));
    }, 0);

    // Usar saldo calculado das rodadas (prioridade) ou fallback para cache do extrato
    const saldoFinanceiro = saldoCalculadoPorRodadas || (extratoData?.saldo_atual ?? extratoData?.resumo?.saldo_final ?? 0);

    // ✅ v1.1 FIX: Buscar dados do participante com fallback robusto
    // A navegação passa camelCase (nomeTime, nomeCartola) mas outros módulos usam snake_case
    // Também buscar do auth original se não vier nos params
    const authParticipante = window.participanteAuth?.participante?.participante;

    const nomeTime = participante?.nome_time || participante?.nomeTime ||
                     authParticipante?.nome_time || meuTime?.nome_time || "Seu Time";
    const nomeCartola = participante?.nome_cartola || participante?.nomeCartola ||
                        authParticipante?.nome_cartola || meuTime?.nome_cartola || "Cartoleiro";
    const nomeLiga = liga?.nome || "Liga";
    const clubeId = participante?.clube_id || participante?.clubeId ||
                    authParticipante?.clube_id || meuTime?.clube_id || null;

    return {
        posicao,
        totalParticipantes,
        pontosTotal,
        ultimaRodada,
        rodadaAtual,
        ultimaRodadaDisputada, // ✅ FIX: Rodada com dados de escalação disponíveis
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

async function obterClubesCache() {
    if (window.__clubesCache) return window.__clubesCache;

    try {
        const cached = sessionStorage.getItem(CLUBES_CACHE_KEY);
        if (cached) {
            const payload = JSON.parse(cached);
            if (payload?.data && Date.now() - (payload.timestamp || 0) < CLUBES_CACHE_TTL) {
                window.__clubesCache = payload.data;
                return payload.data;
            }
        }
    } catch (error) {
        // cache inválido, ignorar
    }

    try {
        const response = await fetch('/api/cartola/clubes');
        if (!response.ok) return null;
        const data = await response.json();
        window.__clubesCache = data;
        try {
            sessionStorage.setItem(CLUBES_CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data
            }));
        } catch (error) {
            // storage cheio/indisponível
        }
        return data;
    } catch (error) {
        return null;
    }
}

async function aplicarCorBadgeClube(clubeId) {
    if (!clubeId) return;
    const badge = document.querySelector('.home-team-badge');
    if (!badge) return;

    const clubes = await obterClubesCache();
    if (!clubes) return;

    const clube = clubes[String(clubeId)] || clubes[Number(clubeId)];
    const cor =
        clube?.cor_primaria ||
        clube?.cor_fundo ||
        clube?.cor_secundaria ||
        null;

    if (!cor) return;
    if (!document.contains(badge)) return;

    badge.style.background = cor;
    const icon = badge.querySelector('.material-icons');
    if (icon) {
        const rgb = corParaRGB(cor);
        if (rgb) {
            const luminancia = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
            icon.style.color = luminancia > 0.6 ? '#111111' : '#FFFFFF';
            badge.style.borderColor = luminancia > 0.7 ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)';
        } else {
            icon.style.color = '#FFFFFF';
        }
    }
}

function corParaRGB(cor) {
    if (!cor || typeof cor !== 'string') return null;
    const hex = cor.trim();
    if (hex.startsWith('#')) {
        const clean = hex.slice(1);
        if (clean.length === 3) {
            const r = parseInt(clean[0] + clean[0], 16);
            const g = parseInt(clean[1] + clean[1], 16);
            const b = parseInt(clean[2] + clean[2], 16);
            return { r, g, b };
        }
        if (clean.length === 6) {
            const r = parseInt(clean.slice(0, 2), 16);
            const g = parseInt(clean.slice(2, 4), 16);
            const b = parseInt(clean.slice(4, 6), 16);
            return { r, g, b };
        }
    }
    const rgbMatch = hex.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1], 10),
            g: parseInt(rgbMatch[2], 10),
            b: parseInt(rgbMatch[3], 10),
        };
    }
    return null;
}

function calcularValoresCards(data) {
    const {
        posicao,
        totalParticipantes,
        pontosTotal,
        rodadaAtual,
        posicaoAnterior,
        saldoFinanceiro
    } = data;

    let variacaoHTML = "";
    if (posicao && posicaoAnterior) {
        const diff = posicaoAnterior - posicao;
        if (diff > 0) variacaoHTML = `<span class="home-variation-up">+${diff}</span>`;
        else if (diff < 0) variacaoHTML = `<span class="home-variation-down">${diff}</span>`;
    }

    const saldoAbs = Math.abs(saldoFinanceiro);
    const saldoFormatado = saldoFinanceiro >= 0
        ? `R$ ${saldoAbs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : `-R$ ${saldoAbs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    const saldoClass = saldoFinanceiro > 0 ? "positive" : saldoFinanceiro < 0 ? "negative" : "";

    const aguardandoRodada = rodadaAtual === 0;
    const posicaoDisplay = aguardandoRodada ? "--" : (posicao ? `${posicao}` : "--");
    const pontosDisplay = aguardandoRodada ? "0" : formatarPontos(pontosTotal).split(",")[0];
    const hintPosicao = aguardandoRodada ? "Aguardando 1ª rodada" : `de ${totalParticipantes}${variacaoHTML}`;
    const hintPontos = aguardandoRodada ? "Aguardando 1ª rodada" : "total acumulado";

    const zona = getZonaInfo(posicao, totalParticipantes);
    const zonaTexto = zona.texto || "Zona Neutra";
    const zonaCor = zona.cor || "var(--app-primary)";
    const zonaBg = zona.bg || "rgba(255,255,255,0.08)";
    const zonaClass = zona.zonaClass || "zona-neutra";

    return {
        saldoFormatado,
        saldoClass,
        pontosDisplay,
        posicaoDisplay,
        hintPosicao,
        hintPontos,
        zonaTexto,
        zonaCor,
        zonaBg,
        zonaClass
    };
}

function renderShortcutButton(label, icon, onClick, enabled) {
    const classes = enabled ? "" : " home-action-disabled";
    const handler = enabled ? `onclick="${onClick}"` : "";
    const disabledAttr = enabled ? "" : "disabled";
    const title = enabled ? "" : 'title="Disponível apenas para participante Premium"';

    return `
        <button class="home-action-item${classes}" ${handler} ${disabledAttr} ${title}>
            <div class="home-action-icon">
                <span class="material-icons">${icon}</span>
            </div>
            <span class="home-action-label">${label}</span>
        </button>
    `;
}

// =====================================================================
// ATUALIZAR HEADER PREMIUM
// =====================================================================
function atualizarHeaderPremium(nomeTime, nomeCartola, iniciais, isPremium, clubeId) {
    const header = document.getElementById('home-header-premium');
    if (!header) return;

    const avatarInitials = header.querySelector('.home-avatar-initials');
    if (avatarInitials) {
        avatarInitials.textContent = iniciais;
    }

    const userName = header.querySelector('.home-user-name');
    if (userName) {
        userName.textContent = nomeTime;
    }

    // Badge Premium
    const badgePlaceholder = document.getElementById('home-badge-premium-placeholder');
    if (badgePlaceholder && isPremium) {
        badgePlaceholder.innerHTML = `
            <div class="home-badge-premium">
                <span class="material-icons badge-icon">star</span>
                <span>Premium</span>
            </div>
        `;
    }

    // Substituir botão do canto por refresh (mais discreto)
    const headerBtn = header.querySelector('.home-btn-icon');
    if (headerBtn) {
        headerBtn.setAttribute('title', 'Atualizar dados');
        headerBtn.setAttribute('onclick', '(window.RefreshButton?.showModal && window.RefreshButton.showModal()) || window.location.reload()');
        const icon = headerBtn.querySelector('.material-icons');
        if (icon) {
            icon.textContent = 'refresh';
        }
    }

    // Aplicar cor do clube ao badge
    if (clubeId) {
        aplicarCorBadgeClube(clubeId);
    }
}

// =====================================================================
// ATUALIZAR SAUDAÇÃO
// =====================================================================
function atualizarSaudacao(nomeCartola, nomeLiga, rodadaAtual, totalRodadas) {
    const greeting = document.getElementById('home-greeting');
    if (!greeting) return;

    const primeiroNome = nomeCartola.split(' ')[0];
    const emoji = getGreetingEmoji();

    const greetingH2 = greeting.querySelector('h2');
    if (greetingH2) {
        greetingH2.innerHTML = `Olá, ${primeiroNome}! <span class="emoji">${emoji}</span>`;
    }

    const subtitle = document.getElementById('home-subtitle');
    if (subtitle) {
        if (rodadaAtual === 0) {
            subtitle.textContent = `${nomeLiga} • Aguardando 1ª rodada`;
        } else {
            subtitle.textContent = `${nomeLiga} • Rodada ${rodadaAtual}`;
        }
    }
}

function getGreetingEmoji() {
    const hour = new Date().getHours();
    if (hour < 6) return '🌙';
    if (hour < 12) return '☀️';
    if (hour < 18) return '👋';
    return '🌙';
}

// =====================================================================
// RENDERIZACAO PRINCIPAL - v3.0 (Cartola Style)
// =====================================================================
function renderizarHome(container, data, ligaId) {
    const {
        posicao,
        totalParticipantes,
        pontosTotal,
        ultimaRodada,
        rodadaAtual,
        ultimaRodadaDisputada, // ✅ FIX: Rodada com dados de escalação
        nomeTime,
        nomeCartola,
        nomeLiga,
        saldoFinanceiro,
        posicaoAnterior,
        clubeId,
        minhasRodadas,
        timeId
    } = data;

    const isPremium = participantePremium;
    const totalRodadas = 38;

    // === PAINEL DE AVISOS ===
    atualizarPainelAvisos(rodadaAtual, totalParticipantes);

    // === SLIDER DE POSIÇÃO ===
    const posicaoBadgeEl = document.getElementById('home-posicao-badge');
    const sliderProgressEl = document.getElementById('home-slider-progress');
    const posicaoIndicatorEl = document.getElementById('home-posicao-indicator');
    const sliderTotalEl = document.getElementById('home-slider-total');

    if (posicaoBadgeEl) {
        posicaoBadgeEl.textContent = posicao || '--';
    }

    if (sliderProgressEl && posicaoIndicatorEl && posicao && totalParticipantes > 0) {
        const percentual = ((posicao - 1) / (totalParticipantes - 1)) * 100;
        const percentualClamped = Math.max(5, Math.min(95, percentual));
        sliderProgressEl.style.width = `${100 - percentualClamped}%`;
        posicaoIndicatorEl.style.left = `${percentualClamped}%`;
    }

    if (sliderTotalEl) {
        sliderTotalEl.textContent = totalParticipantes || 38;
    }

    // Link para rodada
    const linkRodadaEl = document.getElementById('home-link-rodada');
    const rodadaNumEl = document.getElementById('home-rodada-num');
    if (rodadaNumEl) {
        rodadaNumEl.textContent = `Rodada ${Math.max(1, rodadaAtual)}`;
    }

    // === CARDS DE STATS ===
    // Última Pontuação
    const ultimaPontuacaoEl = document.getElementById('home-ultima-pontuacao');
    const variacaoPontosEl = document.getElementById('home-variacao-pontos');
    const rankingPontosEl = document.getElementById('home-ranking-pontos');

    const pontosUltimaRodada = ultimaRodada ? parseFloat(ultimaRodada.pontos || 0) : 0;
    const pontosRodadaAnterior = minhasRodadas?.[1] ? parseFloat(minhasRodadas[1].pontos || 0) : 0;
    const variacaoPontos = pontosUltimaRodada - pontosRodadaAnterior;

    if (ultimaPontuacaoEl) {
        ultimaPontuacaoEl.textContent = formatarPontos(pontosUltimaRodada);
    }

    if (variacaoPontosEl) {
        if (variacaoPontos >= 0) {
            variacaoPontosEl.textContent = `↑${formatarPontos(Math.abs(variacaoPontos))}`;
            variacaoPontosEl.className = 'home-stat-variacao positivo';
        } else {
            variacaoPontosEl.textContent = `↓${formatarPontos(Math.abs(variacaoPontos))}`;
            variacaoPontosEl.className = 'home-stat-variacao negativo';
        }
    }

    if (rankingPontosEl) {
        rankingPontosEl.textContent = posicao ? `${posicao}º` : '--';
    }

    // Patrimônio
    const patrimonioEl = document.getElementById('home-patrimonio');
    const variacaoPatrimonioEl = document.getElementById('home-variacao-patrimonio');
    const rankingPatrimonioEl = document.getElementById('home-ranking-patrimonio');

    const saldoAbs = Math.abs(saldoFinanceiro);
    const saldoFormatado = saldoFinanceiro >= 0
        ? `R$ ${saldoAbs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : `-R$ ${saldoAbs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

    // Calcular variação do patrimônio (última rodada)
    const ganhoUltimaRodada = ultimaRodada ? parseFloat(ultimaRodada.valorFinanceiro || ultimaRodada.ganho_rodada || 0) : 0;

    if (patrimonioEl) {
        patrimonioEl.textContent = saldoFormatado;
    }

    if (variacaoPatrimonioEl) {
        if (ganhoUltimaRodada >= 0) {
            variacaoPatrimonioEl.textContent = `↑${ganhoUltimaRodada.toFixed(2)}`;
            variacaoPatrimonioEl.className = 'home-stat-variacao positivo';
        } else {
            variacaoPatrimonioEl.textContent = `↓${Math.abs(ganhoUltimaRodada).toFixed(2)}`;
            variacaoPatrimonioEl.className = 'home-stat-variacao negativo';
        }
    }

    if (rankingPatrimonioEl) {
        rankingPatrimonioEl.textContent = rodadaAtual ? `R${rodadaAtual}` : '--';
    }

    // === DESTAQUES DA RODADA ===
    // ✅ FIX: Usar ultimaRodadaDisputada para buscar escalação (não rodada do mercado)
    const rodadaParaDestaques = ultimaRodadaDisputada || rodadaAtual;
    const destaquesSection = document.getElementById('home-destaques-section');
    const destaquesContent = document.getElementById('home-destaques-content');
    if (destaquesSection) {
        if (rodadaParaDestaques > 0 && ultimaRodada) {
            destaquesSection.classList.remove('hidden');

            // Durante jogos ao vivo, iniciar colapsado
            const status = mercadoStatus?.status_mercado;
            const isJogosAoVivo = status === 2 || status === 'Mercado fechado';

            if (isJogosAoVivo) {
                destaquesSection.classList.remove('expanded');
                if (destaquesContent) destaquesContent.classList.add('collapsed');
            } else {
                // Fim de rodada: expandido por padrão
                destaquesSection.classList.add('expanded');
                if (destaquesContent) destaquesContent.classList.remove('collapsed');
            }

            carregarDestaquesRodada(ligaId, rodadaParaDestaques, timeId);
        } else {
            destaquesSection.classList.add('hidden');
        }
    }

    // === BOTÕES DE ATALHOS (Premium) ===
    const btnPremiacoes = document.getElementById('btn-premiacoes');
    const btnRegras = document.getElementById('btn-regras');
    const btnCartolaPro = document.getElementById('btn-cartola-pro');

    if (!isPremium) {
        [btnPremiacoes, btnRegras, btnCartolaPro].forEach(btn => {
            if (btn) {
                btn.classList.add('home-action-disabled');
                btn.onclick = () => window.mostrarAguarde && window.mostrarAguarde('Função Premium');
            }
        });
    }
}

// =====================================================================
// APLICAR COR DO CLUBE AO ESCUDO
// =====================================================================
async function aplicarCorEscudoTime(escudoEl, clubeId) {
    if (!escudoEl || !clubeId) return;

    const clubes = await obterClubesCache();
    if (!clubes) return;

    const clube = clubes[String(clubeId)] || clubes[Number(clubeId)];
    const corPrimaria = clube?.cor_primaria || clube?.cor_fundo || '#dc2626';
    const corSecundaria = clube?.cor_secundaria || '#991b1b';

    escudoEl.style.background = `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria || corPrimaria} 100%)`;

    // Atualizar imagem do escudo
    const imgEl = escudoEl.querySelector('img');
    if (imgEl) {
        imgEl.src = `/escudos/${clubeId}.png`;
        imgEl.onerror = () => {
            imgEl.style.display = 'none';
        };
    }
}

// =====================================================================
// CARREGAR DESTAQUES DA RODADA
// =====================================================================
async function carregarDestaquesRodada(ligaId, rodada, timeId) {
    try {
        // Atualizar badge com número da rodada
        const rodadaBadgeEl = document.getElementById('home-destaques-rodada');
        if (rodadaBadgeEl) {
            rodadaBadgeEl.textContent = `Rodada ${rodada}`;
        }

        // Buscar escalação do time na rodada
        const response = await fetch(`/api/cartola/time/${timeId}/rodada/${rodada}`);
        if (!response.ok) {
            if (window.Log) Log.debug("PARTICIPANTE-HOME", "Escalação não encontrada");
            // Esconder seção se não tiver dados
            const destaquesSection = document.getElementById('home-destaques-section');
            if (destaquesSection) destaquesSection.classList.add('hidden');
            return;
        }

        const escalacao = await response.json();
        if (!escalacao?.atletas?.length) {
            const destaquesSection = document.getElementById('home-destaques-section');
            if (destaquesSection) destaquesSection.classList.add('hidden');
            return;
        }

        const atletas = escalacao.atletas || [];
        const capitaoId = escalacao.capitao_id;

        // Encontrar capitão, maior e menor pontuador
        let capitao = atletas.find(a => a.atleta_id === capitaoId) || atletas[0];
        let maiorPontuador = atletas.reduce((max, a) => (a.pontos_num > (max?.pontos_num || -999) ? a : max), null);
        let menorPontuador = atletas.reduce((min, a) => (a.pontos_num < (min?.pontos_num || 999) ? a : min), null);

        // Popular cards
        popularDestaqueCard('capitao', capitao, true);
        popularDestaqueCard('maior', maiorPontuador, false);
        popularDestaqueCard('menor', menorPontuador, false);

        if (window.Log) Log.info("PARTICIPANTE-HOME", `Destaques carregados - Rodada ${rodada}`);

    } catch (error) {
        if (window.Log) Log.warn("PARTICIPANTE-HOME", "Erro ao carregar destaques:", error);
        // Esconder seção em caso de erro
        const destaquesSection = document.getElementById('home-destaques-section');
        if (destaquesSection) destaquesSection.classList.add('hidden');
    }
}

// =====================================================================
// POPULAR CARD DE DESTAQUE
// =====================================================================
function popularDestaqueCard(tipo, atleta, isCapitao = false) {
    if (!atleta) return;

    const nomeEl = document.getElementById(`home-nome-${tipo}`);
    const posicaoEl = document.getElementById(`home-posicao-${tipo}`);
    const pontosEl = document.getElementById(`home-pontos-${tipo}`);
    const escudoEl = document.getElementById(`home-escudo-${tipo}`);

    if (nomeEl) {
        nomeEl.textContent = atleta.apelido || atleta.nome || '--';
    }

    if (posicaoEl) {
        const posicoes = {
            1: 'GOLEIRO', 2: 'LATERAL', 3: 'ZAGUEIRO',
            4: 'MEIA', 5: 'ATACANTE', 6: 'TÉCNICO'
        };
        posicaoEl.textContent = posicoes[atleta.posicao_id] || 'JOGADOR';
    }

    if (pontosEl) {
        const pontos = parseFloat(atleta.pontos_num || 0);
        if (isCapitao) {
            // Capitão: mostrar pontos x1.5
            const pontosCapitao = pontos * 1.5;
            pontosEl.textContent = pontosCapitao.toFixed(2);

            // Pontos base
            const pontosBaseEl = document.getElementById('home-pontos-base-capitao');
            if (pontosBaseEl) {
                pontosBaseEl.textContent = pontos.toFixed(2);
            }
        } else {
            pontosEl.textContent = pontos.toFixed(2);
        }
    }

    // Escudo do clube
    if (escudoEl && atleta.clube_id) {
        const escudoImg = escudoEl.querySelector('img');
        if (escudoImg) {
            escudoImg.src = `/escudos/${atleta.clube_id}.png`;
            escudoImg.onerror = () => {
                escudoImg.src = '/escudos/default.png';
            };
        }
    }
}

// =====================================================================
// ABREVIAÇÃO DO CLUBE
// =====================================================================
function getAbrevClube(clubeId) {
    const abrevs = {
        262: 'FLA', 263: 'BOT', 264: 'COR', 265: 'BAH', 266: 'FLU',
        275: 'PAL', 276: 'SAO', 277: 'GRE', 278: 'INT', 280: 'BRA',
        282: 'CAM', 283: 'CRU', 284: 'SAN', 285: 'VAS', 286: 'CAP',
        287: 'GOI', 288: 'CFC', 290: 'FOR', 292: 'JUV', 293: 'CUI',
        294: 'AME', 354: 'CEA', 356: 'VIT', 373: 'AVA', 1371: 'RBB'
    };
    return abrevs[clubeId] || '---';
}

// =====================================================================
// TOGGLE DESTAQUES DA RODADA (Colapsável)
// =====================================================================
function toggleDestaquesRodada() {
    const section = document.getElementById('home-destaques-section');
    const content = document.getElementById('home-destaques-content');

    if (!section || !content) return;

    const isExpanded = section.classList.contains('expanded');

    if (isExpanded) {
        section.classList.remove('expanded');
        content.classList.add('collapsed');
    } else {
        section.classList.add('expanded');
        content.classList.remove('collapsed');
    }
}

// Expor função globalmente
window.toggleDestaquesRodada = toggleDestaquesRodada;

// =====================================================================
// PAINEL DE AVISOS
// =====================================================================
function atualizarPainelAvisos(rodadaAtual, totalParticipantes) {
    const avisoCard = document.getElementById('home-aviso-mercado');
    const avisoIcon = document.getElementById('home-aviso-icon');
    const avisoTitulo = document.getElementById('home-aviso-titulo');
    const avisoSubtitulo = document.getElementById('home-aviso-subtitulo');
    const avisosSecundarios = document.getElementById('home-avisos-secundarios');

    if (!avisoCard) return;

    const status = mercadoStatus?.status_mercado;
    const rodadaMercado = mercadoStatus?.rodada_atual || rodadaAtual;
    const fechamento = mercadoStatus?.fechamento;

    // Remover classes anteriores
    avisoCard.classList.remove('mercado-aberto', 'mercado-fechado', 'fim-rodada');

    if (status === 'Mercado aberto') {
        avisoCard.classList.add('mercado-aberto');
        if (avisoIcon) avisoIcon.textContent = 'lock_open';
        if (avisoTitulo) avisoTitulo.textContent = 'MERCADO ABERTO';

        // Calcular tempo restante
        const tempoRestante = calcularTempoRestante(fechamento);
        if (avisoSubtitulo) {
            avisoSubtitulo.textContent = `Rodada ${rodadaMercado} • ${tempoRestante || 'Escale seu time!'}`;
        }

        // Ação: abrir Cartola
        avisoCard.onclick = () => {
            window.open('https://cartolafc.globo.com', '_blank');
        };

    } else if (status === 'Mercado fechado') {
        avisoCard.classList.add('mercado-fechado');
        if (avisoIcon) avisoIcon.textContent = 'sports_soccer';
        if (avisoTitulo) avisoTitulo.textContent = 'JOGOS EM ANDAMENTO';
        if (avisoSubtitulo) {
            avisoSubtitulo.textContent = `Rodada ${rodadaMercado} • Acompanhe os parciais`;
        }

        // Ação: ir para rodadas
        avisoCard.onclick = () => {
            window.participanteNav?.navegarPara('rodadas');
        };

    } else {
        avisoCard.classList.add('fim-rodada');
        if (avisoIcon) avisoIcon.textContent = 'flag';
        if (avisoTitulo) avisoTitulo.textContent = 'FIM DE RODADA';
        if (avisoSubtitulo) {
            avisoSubtitulo.textContent = `Rodada ${rodadaMercado} finalizada • ${totalParticipantes} participantes`;
        }

        // Ação: ir para rodadas
        avisoCard.onclick = () => {
            window.participanteNav?.navegarPara('rodadas');
        };
    }

    // Avisos secundários
    if (avisosSecundarios) {
        let avisosHTML = '';

        // Aviso de pré-temporada
        const temporadaSelecionada = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();
        const temporadaMercado = mercadoStatus?.temporada || temporadaSelecionada;
        const isPreTemporada = temporadaSelecionada > temporadaMercado;

        if (isPreTemporada) {
            avisosHTML += `
                <div class="home-aviso-secundario" onclick="window.participanteNav?.navegarPara('extrato')">
                    <div class="home-aviso-icon-mini">
                        <span class="material-icons">event_upcoming</span>
                    </div>
                    <span class="home-aviso-texto">Pré-temporada ${temporadaSelecionada} - Renove sua inscrição!</span>
                    <span class="home-aviso-badge">NOVO</span>
                </div>
            `;
        }

        // Aviso de saldo negativo (se aplicável)
        // TODO: Verificar saldo e adicionar aviso se negativo

        avisosSecundarios.innerHTML = avisosHTML;
    }
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
// SISTEMA DE PARCIAIS EM TEMPO REAL
// =====================================================================

async function inicializarParciaisHome(ligaId, timeId, dadosRender) {
    try {
        // Verificar se o módulo de parciais está disponível
        if (!ParciaisModule?.inicializarParciais) {
            if (window.Log) Log.debug("PARTICIPANTE-HOME", "Módulo de parciais não disponível");
            return;
        }

        // Verificar se há rodada em andamento
        const statusParciais = await ParciaisModule.inicializarParciais(ligaId, timeId);

        if (!statusParciais?.disponivel) {
            if (window.Log) Log.debug("PARTICIPANTE-HOME", "Parciais indisponíveis:", statusParciais?.motivo);
            parciaisAtivos = false;
            return;
        }

        // Buscar configuração do ranking da rodada
        configRankingRodada = await buscarConfigRankingRodada(ligaId);

        // Carregar dados parciais
        dadosParciais = await ParciaisModule.carregarParciais();

        if (dadosParciais) {
            parciaisAtivos = true;
            atualizarCardsHomeComParciais();

            // Iniciar auto-refresh de parciais
            ParciaisModule.iniciarAutoRefresh((novosDados) => {
                dadosParciais = novosDados;
                atualizarCardsHomeComParciais();
            });

            if (window.Log) Log.info("PARTICIPANTE-HOME", "Parciais ativados - rodada em andamento");
        }
    } catch (error) {
        if (window.Log) Log.warn("PARTICIPANTE-HOME", "Erro ao inicializar parciais:", error);
        parciaisAtivos = false;
    }
}

async function buscarConfigRankingRodada(ligaId) {
    try {
        const response = await fetch(`/api/ligas/${ligaId}`);
        if (!response.ok) return null;

        const liga = await response.json();
        return liga?.configuracoes?.ranking_rodada || null;
    } catch (error) {
        if (window.Log) Log.warn("PARTICIPANTE-HOME", "Erro ao buscar config ranking:", error);
        return null;
    }
}

function atualizarCardsHomeComParciais() {
    if (!parciaisAtivos || !dadosParciais) return;

    // Obter minha posição parcial
    const minhaPosicao = ParciaisModule.obterMinhaPosicaoParcial?.() || null;
    if (!minhaPosicao) return;

    // Atualizar slider de posição
    const posicaoBadgeEl = document.getElementById('home-posicao-badge');
    const sliderProgressEl = document.getElementById('home-slider-progress');
    const posicaoIndicatorEl = document.getElementById('home-posicao-indicator');

    if (posicaoBadgeEl) {
        posicaoBadgeEl.textContent = minhaPosicao.posicao;
    }

    if (sliderProgressEl && posicaoIndicatorEl && minhaPosicao.totalTimes > 0) {
        const percentual = ((minhaPosicao.posicao - 1) / (minhaPosicao.totalTimes - 1)) * 100;
        const percentualClamped = Math.max(5, Math.min(95, percentual));
        sliderProgressEl.style.width = `${100 - percentualClamped}%`;
        posicaoIndicatorEl.style.left = `${percentualClamped}%`;
    }

    // Atualizar card de pontos (pontos da rodada parcial)
    const ultimaPontuacaoEl = document.getElementById('home-ultima-pontuacao');
    const variacaoPontosEl = document.getElementById('home-variacao-pontos');

    if (ultimaPontuacaoEl) {
        const pontosParciais = minhaPosicao.pontos || 0;
        ultimaPontuacaoEl.textContent = pontosParciais.toFixed(2);
    }

    if (variacaoPontosEl) {
        variacaoPontosEl.innerHTML = '<span class="live-badge-mini">AO VIVO</span>';
    }

    // Atualizar painel de avisos para modo AO VIVO
    const avisoTitulo = document.getElementById('home-aviso-titulo');
    const avisoSubtitulo = document.getElementById('home-aviso-subtitulo');
    if (avisoTitulo) {
        avisoTitulo.innerHTML = 'JOGOS AO VIVO <span class="live-badge-mini">LIVE</span>';
    }
    if (avisoSubtitulo) {
        avisoSubtitulo.textContent = `Posição ${minhaPosicao.posicao}º • ${minhaPosicao.pontos?.toFixed(1) || 0} pts parciais`;
    }

    // Atualizar saldo projetado
    atualizarSaldoProjetado(minhaPosicao.posicao);
}

function getValorRankingPosicao(config, posicao) {
    if (!config?.valores) return 0;
    return config.valores[posicao] || config.valores[String(posicao)] || 0;
}

function atualizarSaldoProjetado(posicaoParcial) {
    if (!configRankingRodada) return;

    const patrimonioEl = document.getElementById('home-patrimonio');
    const variacaoEl = document.getElementById('home-variacao-patrimonio');
    if (!patrimonioEl) return;

    // Calcular impacto da posição parcial
    const impacto = getValorRankingPosicao(configRankingRodada, posicaoParcial);
    const saldoProjetado = saldoOriginal + impacto;

    // Formatar valor
    const abs = Math.abs(saldoProjetado);
    const formatted = saldoProjetado >= 0
        ? `R$ ${abs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : `-R$ ${abs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

    // Atualizar UI
    patrimonioEl.textContent = formatted;

    // Mostrar variação como projeção
    if (variacaoEl) {
        if (impacto >= 0) {
            variacaoEl.innerHTML = `<span class="projected-badge">+${impacto.toFixed(0)} proj.</span>`;
        } else {
            variacaoEl.innerHTML = `<span class="projected-badge">${impacto.toFixed(0)} proj.</span>`;
        }
    }
}

// =====================================================================
// CARREGAR TABELAS ESPORTIVAS
// =====================================================================
async function carregarTabelasEsportes(participante) {
    try {
        const clubeId = participante?.clube_id || participante?.clubeId
                     || window.participanteAuth?.participante?.participante?.clube_id
                     || window.participanteAuth?.participante?.clube_id
                     || null;

        if (!clubeId) {
            if (window.Log) Log.debug("PARTICIPANTE-HOME", "Tabelas: sem clube_id");
            return;
        }

        // Verificar se componente está disponível
        if (!window.TabelasEsportes) {
            if (window.Log) Log.debug("PARTICIPANTE-HOME", "Tabelas: componente não carregado");
            return;
        }

        await window.TabelasEsportes.renderizar({
            containerId: 'home-tabelas-placeholder',
            clubeId
        });

        if (window.Log) Log.info("PARTICIPANTE-HOME", "Tabelas esportivas carregadas");
    } catch (error) {
        if (window.Log) Log.warn("PARTICIPANTE-HOME", "Erro ao carregar tabelas:", error);
    }
}

// =====================================================================
// CARREGAR NOTICIAS DO MEU TIME
// =====================================================================
async function carregarNoticiasDoMeuTime(participante) {
    try {
        const clubeId = participante?.clube_id || participante?.clubeId
                     || window.participanteAuth?.participante?.participante?.clube_id
                     || window.participanteAuth?.participante?.clube_id
                     || null;

        if (!clubeId) {
            if (window.Log) Log.debug("PARTICIPANTE-HOME", "Notícias: sem clube_id");
            return;
        }

        // Verificar se componente está disponível
        if (!window.NoticiasTime) {
            if (window.Log) Log.debug("PARTICIPANTE-HOME", "Notícias: componente não carregado");
            return;
        }

        await window.NoticiasTime.renderizar({
            clubeId,
            containerId: 'home-noticias-placeholder',
            limite: 5,
            modo: 'completo'
        });

        if (window.Log) Log.info("PARTICIPANTE-HOME", "Notícias do time carregadas");
    } catch (error) {
        if (window.Log) Log.warn("PARTICIPANTE-HOME", "Erro ao carregar notícias:", error);
    }
}

// Mapa de IDs de clubes - fonte centralizada em clubes-data.js
const _clubesNomeMap = getClubesNomeMap();
function getNomeClubePorId(clubeId) {
    return _clubesNomeMap[Number(clubeId)] || "Seu Time";
}

if (window.Log)
    Log.info("PARTICIPANTE-HOME", "Modulo v1.0 carregado");
