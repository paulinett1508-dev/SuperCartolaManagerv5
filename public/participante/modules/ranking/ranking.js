// 🏆 RANKING MODULE v4.0 - Mobile-First com Hierarquia G12/Z12
// Redesign completo para navegabilidade compacta e hierarquia visual correta

// ===== ESTADO DO MÓDULO =====
let estadoRanking = {
    ligaId: null,
    temporada: null,
    dadosOriginais: null,
    processando: false,
    ultimoProcessamento: 0
};

const INTERVALO_MINIMO = 2000; // 2 segundos entre requests

// ===== INIT =====
async function initRanking() {
    console.log('[RANKING v4.0] Inicializando módulo mobile-first');

    // Obter contexto da liga
    const participante = obterParticipanteLogado();
    if (!participante) {
        console.error('[RANKING] Participante não encontrado');
        const container = document.getElementById('rankingLista');
        if (container) {
            mostrarErro(container, 'Sessão inválida');
        }
        return;
    }

    estadoRanking.ligaId = participante.liga_id;
    estadoRanking.temporada = window.temporadaAtual || new Date().getFullYear();

    // Carregar ranking geral
    await carregarRanking('geral');
}

// ===== CARREGAR RANKING =====
async function carregarRanking(turno = 'geral') {
    const agora = Date.now();

    // Debounce
    if (estadoRanking.processando) {
        console.log('[RANKING] Processando, ignorando request duplicado');
        return;
    }

    if (agora - estadoRanking.ultimoProcessamento < INTERVALO_MINIMO) {
        console.log('[RANKING] Intervalo mínimo não atingido');
        return;
    }

    estadoRanking.processando = true;
    estadoRanking.ultimoProcessamento = agora;

    const container = document.getElementById('rankingLista');
    if (!container) {
        estadoRanking.processando = false;
        return;
    }

    // Loading state
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando ${turno === 'geral' ? 'classificação geral' : turno + 'º turno'}...</p>
        </div>
    `;

    try {
        const url = `/api/ranking-turno/${estadoRanking.ligaId}?turno=${turno}&temporada=${estadoRanking.temporada}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.ranking || data.ranking.length === 0) {
            mostrarSemDados(container, data.message, data.status);
            return;
        }

        // Renderizar ranking
        renderizarRanking(data.ranking, data.rodada_atual);

        console.log(`[RANKING] ✅ ${data.ranking.length} participantes renderizados`);

    } catch (error) {
        console.error('[RANKING] Erro ao carregar:', error);
        mostrarErro(container, error.message);
    } finally {
        estadoRanking.processando = false;
    }
}

// ===== RENDERIZAR RANKING =====
function renderizarRanking(ranking, rodadaAtual) {
    const container = document.getElementById('rankingLista');
    const participante = obterParticipanteLogado();
    const totalAtivos = ranking.filter(p => p.ativo !== false).length;

    let html = '';
    let posicao = 1;

    ranking.forEach((item, index) => {
        const estaInativo = item.ativo === false;

        // Separador de inativos
        if (estaInativo && posicao === totalAtivos + 1) {
            html += `
                <div class="zona-divider">
                    <span class="material-icons">pause_circle</span>
                    <span>Participantes inativos</span>
                </div>
            `;
        }

        // Divider fim do Top 10 (após 10º lugar)
        if (!estaInativo && posicao === 11 && totalAtivos >= 15) {
            html += `
                <div class="zona-divider top10-end">
                    <span class="material-icons">star</span>
                    <span>Top 10</span>
                </div>
            `;
        }

        html += criarItemRanking(item, posicao, totalAtivos, participante);

        if (!estaInativo) posicao++;
    });

    container.innerHTML = html;
}

// ===== CRIAR ITEM DO RANKING =====
function criarItemRanking(participante, posicao, totalAtivos, participanteLogado) {
    const estaInativo = participante.ativo === false;
    const ehMeuTime = participanteLogado && String(participante.timeId) === String(participanteLogado.time_id);

    // Definir classes
    let classes = ['ranking-item'];

    if (estaInativo) {
        classes.push('inativo');
    } else {
        // 1º lugar destacado
        if (posicao === 1) classes.push('podio-1');
        // Top 10 (2º ao 10º)
        else if (posicao >= 2 && posicao <= 10) classes.push('zona-top10');
        // Último colocado ativo = destaque vermelho
        if (totalAtivos > 1 && posicao === totalAtivos) classes.push('ranking-ultimo');
    }

    if (ehMeuTime) classes.push('meu-time');

    // Badge de posição - apenas 1º com troféu
    let badgePosicao;
    if (estaInativo) {
        badgePosicao = '<span class="posicao-badge">—</span>';
    } else if (posicao === 1) {
        badgePosicao = '<span class="material-icons podio-icon">emoji_events</span>';
    } else {
        badgePosicao = `<span class="posicao-badge">${posicao}º</span>`;
    }

    // Escudo do clube
    const escudoHTML = participante.clube_id
        ? `<div class="ranking-escudo-wrap">
               <img src="/escudos/${participante.clube_id}.png"
                    alt="Escudo"
                    class="ranking-escudo"
                    onerror="this.style.display='none'">
           </div>`
        : '';

    // Badge inativo
    const badgeInativo = estaInativo
        ? `<span class="badge-inativo">INATIVO R${participante.rodada_desistencia || '?'}</span>`
        : '';

    // Badge "VOCÊ"
    const badgeVoce = ehMeuTime
        ? '<span class="badge-voce"><span class="material-icons">person</span> VOCÊ</span>'
        : '';

    return `
        <div class="${classes.join(' ')}">
            <div class="posicao-container">
                ${badgePosicao}
            </div>
            <div class="time-info-container">
                ${escudoHTML}
                <div class="time-dados">
                    <div class="time-nome">
                        ${participante.nome_cartola || 'N/D'}
                        ${badgeInativo}
                        ${badgeVoce}
                    </div>
                    <div class="time-cartoleiro">${participante.nome_time || 'N/D'}</div>
                </div>
            </div>
            <div class="pontos-valor">${truncarPontos(participante.pontos)}</div>
        </div>
    `;
}


// ===== UTILS =====
function obterParticipanteLogado() {
    // Fonte primária: participanteAuth (sistema de autenticação atual)
    if (window.participanteAuth && window.participanteAuth.participante) {
        return {
            liga_id: window.participanteAuth.ligaId,
            time_id: window.participanteAuth.timeId,
            ...window.participanteAuth.participante.participante
        };
    }
    // Fallbacks legados
    return window.participanteSessao ||
           window.sessaoParticipante ||
           JSON.parse(sessionStorage.getItem('participanteSessao') || 'null') ||
           JSON.parse(localStorage.getItem('participanteSessao') || 'null');
}

function truncarPontos(valor) {
    const num = parseFloat(valor) || 0;
    const truncado = Math.trunc(num * 100) / 100;
    return truncado.toFixed(2).replace('.', ',');
}

function mostrarSemDados(container, mensagem, status) {
    let icone, titulo, cor;

    if (status === 'mercado_aberto') {
        icone = 'storefront';
        titulo = 'Mercado Aberto';
        cor = '#22c55e';
    } else if (status === 'sem_pontuacao') {
        icone = 'sports_soccer';
        titulo = 'Aguardando Jogos';
        cor = '#f59e0b';
    } else {
        icone = 'event_upcoming';
        titulo = 'Aguardando Rodadas';
        cor = '#3b82f6';
    }

    container.innerHTML = `
        <div class="empty-state">
            <span class="material-icons" style="color: ${cor};">${icone}</span>
            <p style="font-weight: 600; margin-bottom: 4px;">${titulo}</p>
            <p style="font-size: 0.85rem;">${mensagem || 'Nenhum dado disponível ainda'}</p>
        </div>
    `;
}

function mostrarErro(container, mensagem) {
    container.innerHTML = `
        <div class="empty-state">
            <span class="material-icons" style="color: #ef4444;">warning</span>
            <p style="font-weight: 600;">Erro ao carregar ranking</p>
            <p style="font-size: 0.85rem;">${mensagem}</p>
            <button onclick="location.reload()" style="margin-top: 12px; padding: 8px 16px; background: var(--rank-primary); color: white; border: none; border-radius: 6px; cursor: pointer;">
                Recarregar
            </button>
        </div>
    `;
}

// ===== EXPORTS =====
export { initRanking, carregarRanking };

window.rankingModule = {
    init: initRanking,
    carregar: carregarRanking
};

console.log('✅ [RANKING v4.0] Módulo mobile-first carregado');
