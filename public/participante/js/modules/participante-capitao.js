// =============================================
// PARTICIPANTE-CAPITAO.JS v2.0.0
// Módulo Capitão de Luxo - App do Participante
// v2.0: Refatoração completa seguindo padrão Artilheiro/Luva de Ouro
//       - Verificação de módulo ativo
//       - Cache IndexedDB (OfflineCache)
//       - Card "Seu Desempenho" individual
//       - Detecção de temporada encerrada
//       - Spinner e loading padronizados
// =============================================
if (window.Log) Log.info('PARTICIPANTE-CAPITAO', 'Módulo v2.0 carregando...');

let estadoCapitao = {
    ligaId: null,
    timeId: null,
    temporada: null,
    rankingAtual: null,
    modeLive: false,
    moduloAtivo: false,
    temporadaEncerrada: false,
    inicializado: false,
};

const CACHE_KEY_PREFIX = 'capitao_ranking_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// =============================================
// INICIALIZAÇÃO
// =============================================
export async function inicializarCapitaoParticipante(params) {
    if (window.Log) Log.info('PARTICIPANTE-CAPITAO', 'Inicializando v2.0...', params);

    estadoCapitao.ligaId = params.ligaId;
    estadoCapitao.timeId = params.timeId;
    estadoCapitao.temporada = window.ParticipanteConfig?.CURRENT_SEASON || new Date().getFullYear();

    // 1. Verificar se módulo está ativo na liga
    const moduloAtivo = await verificarModuloAtivo();
    if (!moduloAtivo) {
        renderizarModuloInativo();
        return;
    }
    estadoCapitao.moduloAtivo = true;

    // 2. Verificar matchday (parciais)
    if (window.MatchdayService && window.MatchdayService.isActive) {
        estadoCapitao.modeLive = true;
        subscribeMatchdayEvents();
    }

    // 3. Verificar temporada encerrada
    await detectarEstadoTemporada();

    // 4. Tentar cache-first
    const dadosCache = await buscarDoCache();
    if (dadosCache) {
        if (window.Log) Log.info('PARTICIPANTE-CAPITAO', 'Dados do cache disponíveis');
        estadoCapitao.rankingAtual = dadosCache;
        renderizarRanking(dadosCache);
        renderizarCardDesempenho(dadosCache);
    }

    // 5. Buscar dados frescos (sempre, mesmo com cache)
    await carregarRanking();

    estadoCapitao.inicializado = true;
}

// =============================================
// VERIFICAÇÃO DE MÓDULO ATIVO
// =============================================
async function verificarModuloAtivo() {
    try {
        // Tentar obter dados da liga do auth cache
        if (window.participanteAuth?.ligaDataCache) {
            const modulos = window.participanteAuth.ligaDataCache.modulos_ativos || {};
            return modulos.capitaoLuxo === true || modulos.capitao_luxo === true || modulos.capitao === true;
        }

        // Fallback: buscar da API
        if (estadoCapitao.ligaId) {
            const response = await fetch(`/api/ligas/${estadoCapitao.ligaId}`);
            if (response.ok) {
                const liga = await response.json();
                const modulos = liga.modulos_ativos || {};
                return modulos.capitaoLuxo === true || modulos.capitao_luxo === true || modulos.capitao === true;
            }
        }

        // Se não conseguiu verificar, assumir ativo (mais seguro para UX)
        return true;
    } catch (error) {
        if (window.Log) Log.warn('PARTICIPANTE-CAPITAO', 'Erro ao verificar módulo:', error);
        return true;
    }
}

// =============================================
// DETECÇÃO DE TEMPORADA
// =============================================
async function detectarEstadoTemporada() {
    try {
        if (window.SeasonStatusManager) {
            const status = window.SeasonStatusManager.getStatus();
            estadoCapitao.temporadaEncerrada = status === 'encerrada';
            return;
        }

        // Fallback: verificar via status do mercado
        const response = await fetch('/api/cartola/mercado/status');
        if (response.ok) {
            const data = await response.json();
            const rodada = data.rodada_atual || 1;
            const mercadoAberto = data.status_mercado !== 2;
            estadoCapitao.temporadaEncerrada = rodada >= 38 && mercadoAberto;
        }
    } catch (error) {
        if (window.Log) Log.warn('PARTICIPANTE-CAPITAO', 'Erro detectar temporada:', error);
    }
}

// =============================================
// CACHE (IndexedDB via OfflineCache)
// =============================================
async function buscarDoCache() {
    try {
        if (!window.OfflineCache) return null;
        const key = `${CACHE_KEY_PREFIX}${estadoCapitao.ligaId}_${estadoCapitao.temporada}`;
        const cached = await window.OfflineCache.get(key);
        if (cached && cached.data && (Date.now() - cached.timestamp) < CACHE_TTL) {
            return cached.data;
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function salvarNoCache(ranking) {
    try {
        if (!window.OfflineCache) return;
        const key = `${CACHE_KEY_PREFIX}${estadoCapitao.ligaId}_${estadoCapitao.temporada}`;
        await window.OfflineCache.set(key, {
            data: ranking,
            timestamp: Date.now(),
        });
    } catch (error) {
        // Cache falhou, não é crítico
    }
}

// =============================================
// CARREGAR RANKING (API)
// =============================================
async function carregarRanking() {
    const container = document.getElementById('capitaoContent');
    if (!container) return;

    // Mostrar loading só se não tem cache
    if (!estadoCapitao.rankingAtual) {
        container.innerHTML = `
            <div class="loading-participante text-center py-10">
                <div class="spinner-capitao"></div>
                <p class="loading-text">Carregando capitães...</p>
            </div>
        `;
    }

    try {
        const endpoint = estadoCapitao.modeLive
            ? `/api/capitao/${estadoCapitao.ligaId}/ranking-live`
            : `/api/capitao/${estadoCapitao.ligaId}/ranking?temporada=${estadoCapitao.temporada}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (!data.success || !data.ranking || data.ranking.length === 0) {
            if (!estadoCapitao.rankingAtual) {
                renderizarVazio();
            }
            return;
        }

        estadoCapitao.rankingAtual = data.ranking;
        renderizarRanking(data.ranking);
        renderizarCardDesempenho(data.ranking);

        // Salvar no cache (apenas dados consolidados, não live)
        if (!estadoCapitao.modeLive) {
            await salvarNoCache(data.ranking);
        }
    } catch (error) {
        if (window.Log) Log.error('PARTICIPANTE-CAPITAO', 'Erro ao carregar:', error);
        if (!estadoCapitao.rankingAtual) {
            renderizarErro('Erro ao carregar ranking');
        }
    }
}

// =============================================
// RENDER: RANKING
// =============================================
function renderizarRanking(ranking) {
    const container = document.getElementById('capitaoContent');
    if (!container) return;

    let html = '';

    ranking.forEach((participante, index) => {
        const posicao = participante.posicao_final || index + 1;
        const isMeuTime = String(participante.timeId) === String(estadoCapitao.timeId);
        const isPodium1 = posicao === 1;
        const isPodium2 = posicao === 2;
        const isPodium3 = posicao === 3;

        const escudoSrc = participante.escudo || `/escudos/${participante.clube_id || 'default'}.png`;
        const pontos = (participante.pontuacao_total || 0).toFixed(2);
        const media = (participante.media_capitao || 0).toFixed(2);

        const cardClasses = [
            'capitao-card',
            isMeuTime ? 'meu-time' : '',
            isPodium1 ? 'podium-1' : '',
            isPodium2 ? 'podium-2' : '',
            isPodium3 ? 'podium-3' : '',
        ].filter(Boolean).join(' ');

        const posicaoIcon = isPodium1 ? '🥇' : isPodium2 ? '🥈' : isPodium3 ? '🥉' : `${posicao}º`;

        // Badge de campeão confirmado
        const campeaoBadge = isPodium1 && estadoCapitao.temporadaEncerrada
            ? '<span class="capitao-badge-captain">CAMPEÃO</span>'
            : '<span class="capitao-badge-captain">[C]</span>';

        html += `
            <div class="${cardClasses}">
                <div class="capitao-posicao">${posicaoIcon}</div>
                <img src="${escudoSrc}" class="capitao-escudo" alt=""
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='inline'">
                <span class="material-icons" style="display: none; font-size: 32px; color: #666;">emoji_events</span>
                <div class="capitao-info">
                    <div class="capitao-nome">${participante.nome_cartola || '---'}</div>
                    <div class="capitao-time-nome">${participante.nome_time || ''}</div>
                </div>
                <div class="capitao-stats">
                    <div class="capitao-stat">
                        <span class="capitao-stat-label">PTS</span>
                        <span class="capitao-stat-value">${pontos}</span>
                    </div>
                    <div class="capitao-stat">
                        <span class="capitao-stat-label">MED</span>
                        <span class="capitao-stat-value media">${media}</span>
                    </div>
                    ${campeaoBadge}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// =============================================
// RENDER: CARD DESEMPENHO INDIVIDUAL
// =============================================
function renderizarCardDesempenho(ranking) {
    const cardContainer = document.getElementById('capitao-card-desempenho');
    if (!cardContainer || !estadoCapitao.timeId) return;

    const meusDados = ranking.find(
        p => String(p.timeId) === String(estadoCapitao.timeId)
    );

    if (!meusDados) {
        cardContainer.innerHTML = '';
        return;
    }

    const posicao = meusDados.posicao_final || (ranking.indexOf(meusDados) + 1);
    const pontos = (meusDados.pontuacao_total || 0).toFixed(2);
    const media = (meusDados.media_capitao || 0).toFixed(2);
    const rodadas = meusDados.rodadas_jogadas || 0;
    const melhor = meusDados.melhor_capitao;
    const pior = meusDados.pior_capitao;
    const distintos = meusDados.capitaes_distintos || 0;

    cardContainer.innerHTML = `
        <div class="capitao-card" style="border-color: var(--capitao-primary); background: rgba(139, 92, 246, 0.08);">
            <div style="width: 100%;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span class="material-icons" style="color: var(--capitao-primary); font-size: 20px;">person</span>
                    <span style="font-family: var(--capitao-font-brand); color: #fff; font-size: 14px;">Seu Desempenho</span>
                    <span class="capitao-badge-captain">${posicao}º lugar</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center;">
                    <div>
                        <span style="display: block; font-size: 10px; color: var(--capitao-text-muted);">Pontos</span>
                        <span style="font-family: var(--capitao-font-mono); font-size: 16px; font-weight: 700; color: var(--capitao-primary);">${pontos}</span>
                    </div>
                    <div>
                        <span style="display: block; font-size: 10px; color: var(--capitao-text-muted);">Média</span>
                        <span style="font-family: var(--capitao-font-mono); font-size: 16px; color: var(--capitao-primary-light);">${media}</span>
                    </div>
                    <div>
                        <span style="display: block; font-size: 10px; color: var(--capitao-text-muted);">Rodadas</span>
                        <span style="font-family: var(--capitao-font-mono); font-size: 16px; color: #e5e7eb;">${rodadas}</span>
                    </div>
                </div>
                ${melhor ? `
                <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--capitao-border);">
                    <div style="font-size: 11px;">
                        <span style="color: var(--capitao-success);">Melhor:</span>
                        <span style="color: #e5e7eb;">${melhor.atleta_nome || '---'} (R${melhor.rodada})</span>
                        <span style="font-family: var(--capitao-font-mono); color: var(--capitao-success); font-weight: 700;">${(melhor.pontuacao || 0).toFixed(2)}</span>
                    </div>
                    ${pior ? `
                    <div style="font-size: 11px;">
                        <span style="color: var(--capitao-danger);">Pior:</span>
                        <span style="color: #e5e7eb;">${pior.atleta_nome || '---'} (R${pior.rodada})</span>
                        <span style="font-family: var(--capitao-font-mono); color: var(--capitao-danger); font-weight: 700;">${(pior.pontuacao || 0).toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                <div style="margin-top: 8px; font-size: 11px; color: var(--capitao-text-muted);">
                    Capitães distintos utilizados: <strong style="color: #e5e7eb;">${distintos}</strong>
                </div>
            </div>
        </div>
    `;
}

// =============================================
// RENDER: ESTADOS
// =============================================
function renderizarModuloInativo() {
    const container = document.getElementById('capitaoContent');
    if (!container) return;

    container.innerHTML = `
        <div class="capitao-modulo-inativo">
            <span class="material-icons">military_tech</span>
            <p style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 8px;">Capitão de Luxo</p>
            <p>Este módulo não está ativo nesta liga.</p>
            <p style="font-size: 12px; margin-top: 8px;">Converse com o administrador da liga para ativá-lo.</p>
        </div>
    `;
}

function renderizarVazio() {
    const container = document.getElementById('capitaoContent');
    if (!container) return;

    container.innerHTML = `
        <div class="capitao-empty">
            <span class="material-icons">military_tech</span>
            <p style="font-size: 14px; color: #fff; margin-bottom: 8px;">Sem dados disponíveis</p>
            <p>O ranking de capitães será atualizado após a consolidação das rodadas.</p>
        </div>
    `;
}

function renderizarErro(mensagem) {
    const container = document.getElementById('capitaoContent');
    if (!container) return;

    container.innerHTML = `
        <div class="capitao-error">
            <span class="material-icons" style="font-size: 36px;">warning</span>
            <p>${mensagem}</p>
        </div>
    `;
}

// =============================================
// MATCHDAY EVENTS
// =============================================
function subscribeMatchdayEvents() {
    if (!window.MatchdayService) return;

    window.MatchdayService.on('data:parciais', () => {
        if (window.Log) Log.info('PARTICIPANTE-CAPITAO', 'Atualizando com parciais');
        carregarRanking();
    });

    window.MatchdayService.on('matchday:stop', () => {
        estadoCapitao.modeLive = false;
        carregarRanking();
    });
}

// =============================================
// EXPORT GLOBAL
// =============================================
window.inicializarCapitaoParticipante = inicializarCapitaoParticipante;

if (window.Log) Log.info('PARTICIPANTE-CAPITAO', 'Módulo v2.0 pronto');
