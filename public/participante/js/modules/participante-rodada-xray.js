// =====================================================
// MÓDULO: RAIO-X DA RODADA - v1.0
// Análise detalhada de performance por rodada
// =====================================================

if (window.Log) Log.info('PARTICIPANTE-XRAY', 'Módulo v1.0 carregando...');

// Estado do módulo
let _ligaId = null;
let _timeId = null;
let _rodada = null;
let _temporada = null;
let _dados = null;

/**
 * Inicializa o módulo Raio-X da Rodada
 * Pode receber rodada via payload.params ou via window.xrayParams
 */
export async function inicializarRodadaXrayParticipante(payload) {
    if (window.Log) Log.info('PARTICIPANTE-XRAY', '🚀 Inicializando módulo v1.0...');

    try {
        // Obter dados do participante
        const participante = payload?.participante;
        _ligaId = payload?.ligaId || participante?.ligaId;
        _timeId = payload?.timeId || participante?.timeId;

        // Parâmetros da rodada (passados via window.xrayParams pelo módulo de rodadas)
        const params = window.xrayParams || {};
        _rodada = params.rodada || null;
        _temporada = params.temporada || null;

        if (!_ligaId || !_timeId || !_rodada) {
            mostrarEstadoVazio('Parâmetros insuficientes para gerar o raio-x.');
            return;
        }

        // Setup back button
        const backBtn = document.getElementById('xrayBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Limpar params
                delete window.xrayParams;
                window.participanteNav?.navegarPara('rodadas');
            });
        }

        // Carregar dados
        await carregarRaioX();

    } catch (error) {
        if (window.Log) Log.error('PARTICIPANTE-XRAY', '❌ Erro:', error);
        mostrarEstadoVazio(error.message || 'Erro ao carregar raio-x.');
    }
}

/**
 * Busca dados do backend e renderiza
 */
async function carregarRaioX() {
    mostrarLoading(true);

    try {
        const url = `/api/rodada-xray/${_ligaId}/${_rodada}/${_timeId}${_temporada ? `?temporada=${_temporada}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro ${response.status}`);
        }

        _dados = await response.json();

        if (_dados.time.rodadaNaoJogada) {
            mostrarEstadoVazio('Você não jogou esta rodada.');
            return;
        }

        renderizar(_dados);
        mostrarLoading(false);

    } catch (error) {
        if (window.Log) Log.error('PARTICIPANTE-XRAY', 'Erro ao carregar:', error);
        mostrarEstadoVazio(error.message);
    }
}

/**
 * Renderiza todos os componentes do raio-x
 */
function renderizar(dados) {
    renderizarSubtitulo(dados);
    renderizarScoreCard(dados);
    renderizarComparacao(dados);
    renderizarCapitao(dados);
    renderizarPosicoes(dados);
    renderizarDistribuicao(dados);
    renderizarAtletas(dados);
}

function renderizarSubtitulo(dados) {
    const el = document.getElementById('xraySubtitulo');
    if (el) {
        el.textContent = `Rodada ${dados.rodada} • ${dados.time.nome_cartola}`;
    }
}

function renderizarScoreCard(dados) {
    const { time } = dados;

    setTextById('xrayPontos', formatarPontos(time.pontos));
    setTextById('xrayPosicao', `${time.posicao}º`);
    setTextById('xrayParticipantes', `de ${time.totalParticipantes}`);

    // Financeiro
    const finEl = document.getElementById('xrayFinanceiro');
    if (finEl) {
        const valor = time.valorFinanceiro;
        finEl.textContent = formatarDinheiro(valor);
        finEl.className = 'xray-score-meta-value ' + (
            valor > 0 ? 'xray-financeiro-positivo' :
            valor < 0 ? 'xray-financeiro-negativo' :
            'xray-financeiro-neutro'
        );
    }
}

function renderizarComparacao(dados) {
    const container = document.getElementById('xrayCompBars');
    if (!container) return;

    const { time, liga } = dados;
    const maxPontos = Math.max(time.pontos, liga.melhor, liga.media, 1);

    const rows = [
        { label: 'Você', value: time.pontos, cls: 'meu', diff: null },
        { label: 'Média', value: liga.media, cls: 'media', diff: liga.diferenca_media },
        { label: 'Melhor', value: liga.melhor, cls: 'melhor', diff: liga.diferenca_melhor },
    ];

    container.innerHTML = rows.map(row => {
        const pct = maxPontos > 0 ? (Math.max(row.value, 0) / maxPontos) * 100 : 0;
        const diffHtml = row.diff !== null
            ? `<span class="xray-comp-diff ${row.diff >= 0 ? 'positivo' : 'negativo'}">${row.diff >= 0 ? '+' : ''}${row.diff.toFixed(1)}</span>`
            : '';

        return `
            <div class="xray-comp-row">
                <span class="xray-comp-label">${row.label}</span>
                <div class="xray-comp-bar-track">
                    <div class="xray-comp-bar-fill ${row.cls}" style="width:${pct.toFixed(1)}%"></div>
                </div>
                <span class="xray-comp-value">${formatarPontos(row.value)}</span>
                ${diffHtml}
            </div>
        `;
    }).join('');
}

function renderizarCapitao(dados) {
    const container = document.getElementById('xrayCapitaoSection');
    if (!container) return;

    if (!dados.capitao) {
        container.innerHTML = '';
        return;
    }

    const cap = dados.capitao;

    container.innerHTML = `
        <div class="xray-capitao-card">
            <div class="xray-capitao-badge">
                <span class="material-icons">star</span>
            </div>
            <div class="xray-capitao-info">
                <div class="xray-capitao-nome">${escapeHtml(cap.apelido)}</div>
                <div class="xray-capitao-pos">${cap.posicao} • Capitão</div>
            </div>
            <div class="xray-capitao-stats">
                <div class="xray-capitao-pontos">${formatarPontos(cap.pontos_base * 2)}</div>
                <div class="xray-capitao-bonus">+${formatarPontos(cap.bonus)} bônus (${cap.impacto_percentual}%)</div>
            </div>
        </div>
    `;
}

function renderizarPosicoes(dados) {
    const container = document.getElementById('xrayPosicaoGrid');
    if (!container) return;

    const posicoes = dados.analise_posicao;
    const maxPontosPosicao = Math.max(
        ...Object.values(posicoes).map(p => Math.abs(p.pontos_total)),
        1
    );

    // Ordem fixa: GOL, LAT, ZAG, MEI, ATA, TEC
    const ordem = ['1', '2', '3', '4', '5', '6'];

    container.innerHTML = ordem.map(posId => {
        const pos = posicoes[posId];
        if (!pos || pos.quantidade === 0) return '';

        const pct = maxPontosPosicao > 0
            ? (Math.abs(pos.pontos_total) / maxPontosPosicao) * 100
            : 0;

        return `
            <div class="xray-posicao-row">
                <span class="xray-posicao-badge" style="background:${pos.cor}">${pos.sigla}</span>
                <div class="xray-posicao-bar-track">
                    <div class="xray-posicao-bar-fill" style="width:${pct.toFixed(1)}%;background:${pos.cor}">
                        <span class="xray-posicao-bar-label">${pos.atletas.join(', ')}</span>
                    </div>
                </div>
                <span class="xray-posicao-value">${formatarPontos(pos.pontos_total)}</span>
            </div>
        `;
    }).join('');
}

function renderizarDistribuicao(dados) {
    const container = document.getElementById('xrayDistribBars');
    if (!container || !dados.distribuicao || dados.distribuicao.length === 0) return;

    const maxCount = Math.max(...dados.distribuicao.map(f => f.count), 1);

    container.innerHTML = dados.distribuicao.map(faixa => {
        const heightPct = maxCount > 0 ? (faixa.count / maxCount) * 100 : 0;
        const cls = faixa.is_minha_faixa ? 'destaque' : 'normal';

        return `
            <div class="xray-distrib-bar-col">
                <span class="xray-distrib-count">${faixa.count}</span>
                <div class="xray-distrib-bar ${cls}" style="height:${Math.max(heightPct, 4)}%"></div>
                <span class="xray-distrib-label">${faixa.label}</span>
            </div>
        `;
    }).join('');
}

function renderizarAtletas(dados) {
    const container = document.getElementById('xrayAtletasLista');
    if (!container) return;

    const atletas = dados.atletas || [];

    if (atletas.length === 0) {
        container.innerHTML = '<p style="color:var(--xray-text-muted);text-align:center;padding:20px;">Sem dados de escalação</p>';
        return;
    }

    container.innerHTML = atletas.map(atleta => {
        const pontosClass = atleta.pontos_efetivos > 0 ? 'positivo' :
                           atleta.pontos_efetivos < 0 ? 'negativo' : 'neutro';

        const tags = [];
        if (atleta.is_capitao) tags.push('<span class="xray-capitao-tag">C</span>');
        if (atleta.is_reserva) tags.push('<span class="xray-reserva-tag">RES</span>');

        const escudoUrl = atleta.clube_id ? `/escudos/${atleta.clube_id}.png` : '/escudos/default.png';

        return `
            <div class="xray-atleta-row">
                <span class="xray-atleta-pos-badge" style="background:${atleta.posicao_cor}">${atleta.posicao_sigla}</span>
                <img class="xray-atleta-clube-icon" src="${escudoUrl}" onerror="this.src='/escudos/default.png'" alt="">
                <div class="xray-atleta-info">
                    <div class="xray-atleta-nome">
                        ${escapeHtml(atleta.apelido)}
                        ${tags.join('')}
                    </div>
                    <div class="xray-atleta-sub">${atleta.posicao_nome}</div>
                </div>
                <span class="xray-atleta-pontos ${pontosClass}">${formatarPontos(atleta.pontos_efetivos)}</span>
            </div>
        `;
    }).join('');
}

// === HELPERS ===

function mostrarLoading(show) {
    const loading = document.getElementById('xrayLoading');
    const content = document.getElementById('xrayContent');
    if (loading) loading.style.display = show ? 'flex' : 'none';
    if (content) content.style.display = show ? 'none' : 'block';
}

function mostrarEstadoVazio(mensagem) {
    const loading = document.getElementById('xrayLoading');
    const content = document.getElementById('xrayContent');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'none';

    const container = document.getElementById('xrayContainer');
    if (container) {
        // Manter o back button funcional
        container.innerHTML = `
            <button class="xray-back-btn" onclick="delete window.xrayParams; window.participanteNav?.navegarPara('rodadas')">
                <span class="material-icons">arrow_back</span>
                Voltar para Rodadas
            </button>
            <div class="xray-empty">
                <span class="material-icons">search_off</span>
                <p>${escapeHtml(mensagem)}</p>
            </div>
        `;
    }
}

function formatarPontos(valor) {
    if (valor === null || valor === undefined) return '0.00';
    return Number(valor).toFixed(2);
}

function formatarDinheiro(valor) {
    if (!valor || valor === 0) return 'R$ 0';
    const prefix = valor > 0 ? '+R$ ' : '-R$ ';
    return prefix + Math.abs(valor).toFixed(0);
}

function setTextById(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export default { inicializarRodadaXrayParticipante };
