// =====================================================
// MÓDULO: UI DO EXTRATO PARTICIPANTE - v11.0 BANK DIGITAL REDESIGN
// =====================================================
// ✅ v11.0: REDESIGN COMPLETO — estilo banco digital (Nubank/Inter)
//   - Hero Saldo Card com eye toggle + glassmorphism
//   - Quick Stats Row (pills horizontais)
//   - Transaction Timeline cronológico (substitui cards por rodada)
//   - Performance Card com glass background
//   - Skeleton shimmer loading
//   - Zero mudanças no data contract (participante-extrato.js v4.11)
// =====================================================

if (window.Log) Log.info("[EXTRATO-UI] v11.0 BANK DIGITAL REDESIGN");

// ===== CONFIG CACHE =====
let ligaConfigCache = null;
let statusRenovacaoParticipante = null;

// ===== PRÉ-TEMPORADA DETECTION =====
function isPreTemporada(rodadas) {
    if (!rodadas || rodadas.length === 0) return true;
    return rodadas.filter(r => r.rodada && r.rodada > 0).length === 0;
}

// ===== VERIFICAR RENOVAÇÃO =====
async function verificarStatusRenovacao() {
    if (window.verificarRenovacaoParticipante) {
        const ligaId = window.PARTICIPANTE_IDS?.ligaId || window.participanteData?.ligaId;
        const timeId = window.PARTICIPANTE_IDS?.timeId || window.participanteData?.timeId;
        if (ligaId && timeId) {
            statusRenovacaoParticipante = await window.verificarRenovacaoParticipante(ligaId, timeId);
            return statusRenovacaoParticipante;
        }
    }
    return { renovado: false };
}

// ===== LIGA CONFIG =====
async function fetchLigaConfigSilent(ligaId) {
    if (ligaConfigCache?.liga_id === ligaId) return ligaConfigCache;
    try {
        const response = await fetch(`/api/ligas/${ligaId}/configuracoes`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                ligaConfigCache = data;
                window.ligaConfigCache = data;
                return data;
            }
        }
    } catch (e) { /* silencioso */ }
    return null;
}

// ===== FAIXAS E CLASSIFICAÇÃO =====
function getFaixasParaRodada(ligaId, rodada) {
    const config = ligaConfigCache || window.ligaConfigCache;
    if (!config?.ranking_rodada) return detectarFaixasPorTotal(32);
    const rankingConfig = config.ranking_rodada;
    if (rankingConfig.temporal) {
        const rodadaTransicao = rankingConfig.rodada_transicao || 30;
        const fase = rodada < rodadaTransicao ? "fase1" : "fase2";
        const faseConfig = rankingConfig[fase];
        return { nome: config.liga_nome, totalTimes: faseConfig?.total_participantes || 32, ...faseConfig?.faixas };
    }
    return { nome: config.liga_nome, totalTimes: rankingConfig.total_participantes || 32, ...rankingConfig.faixas };
}

function detectarFaixasPorTotal(totalTimes) {
    if (totalTimes <= 6) {
        return {
            totalTimes,
            credito: { inicio: 1, fim: 2 },
            neutro: { inicio: 3, fim: Math.floor(totalTimes / 2) },
            debito: { inicio: Math.floor(totalTimes / 2) + 1, fim: totalTimes },
        };
    }
    const terco = Math.floor(totalTimes / 3);
    return {
        totalTimes,
        credito: { inicio: 1, fim: terco },
        neutro: { inicio: terco + 1, fim: totalTimes - terco },
        debito: { inicio: totalTimes - terco + 1, fim: totalTimes },
    };
}

function classificarPosicao(posicao, faixas) {
    if (!posicao) return "neutro";
    if (posicao >= faixas.credito.inicio && posicao <= faixas.credito.fim) return "credito";
    if (posicao >= faixas.debito.inicio && posicao <= faixas.debito.fim) return "debito";
    return "neutro";
}

function getPosicaoZonaLabel(posicao, faixas) {
    if (!posicao) return { label: null, tipo: "neutro" };
    if (posicao >= faixas.credito.inicio && posicao <= faixas.credito.fim) {
        return { label: `G${posicao}`, tipo: "ganho" };
    }
    if (posicao >= faixas.debito.inicio && posicao <= faixas.debito.fim) {
        const zNum = faixas.debito.fim - posicao + 1;
        return { label: `Z${zNum}`, tipo: "perda" };
    }
    return { label: null, tipo: "neutro" };
}

// ===== HELPERS =====
function calcularPosicaoTop10(valor, ligaId) {
    const absValor = Math.abs(valor);
    const config = ligaConfigCache || window.ligaConfigCache;
    const totalParticipantes = config?.total_participantes || config?.ranking_rodada?.total_participantes || 32;
    const isLigaGrande = totalParticipantes > 20;
    if (isLigaGrande) {
        const pos = Math.round((30 - absValor) / 2) + 1;
        return Math.min(Math.max(pos, 1), 10);
    } else {
        const pos = 11 - absValor;
        return Math.min(Math.max(pos, 1), 10);
    }
}

function formatarMoeda(valor) {
    return `R$ ${Math.abs(valor).toFixed(2).replace(".", ",")}`;
}

function sinalMoeda(valor) {
    if (valor > 0) return `+${formatarMoeda(valor)}`;
    if (valor < 0) return `-${formatarMoeda(valor)}`;
    return formatarMoeda(0);
}

// ===== EYE TOGGLE (localStorage) =====
function getSaldoHidden() {
    try { return localStorage.getItem('scm_hide_saldo') === '1'; } catch { return false; }
}

function toggleSaldoVisibility() {
    try {
        const hidden = !getSaldoHidden();
        localStorage.setItem('scm_hide_saldo', hidden ? '1' : '0');
        const valorEl = document.querySelector('.extrato-hero__valor');
        const eyeIcon = document.getElementById('eyeToggleIcon');
        if (valorEl) valorEl.classList.toggle('extrato-hero__valor--hidden', hidden);
        if (eyeIcon) eyeIcon.textContent = hidden ? 'visibility_off' : 'visibility';
    } catch (e) { /* silencioso */ }
}
window.toggleSaldoVisibility = toggleSaldoVisibility;

// ===== PREENCHER RODADAS =====
function preencherTodasRodadas(rodadasExistentes) {
    if (!rodadasExistentes || rodadasExistentes.length === 0) return [];
    const rodadasMap = new Map();
    rodadasExistentes.forEach(r => {
        if (r.rodada && r.rodada > 0) rodadasMap.set(r.rodada, r);
    });
    if (rodadasMap.size === 0) return [];
    const ultimaRodada = Math.max(...Array.from(rodadasMap.keys()));
    const todasRodadas = [];
    for (let i = 1; i <= ultimaRodada; i++) {
        if (rodadasMap.has(i)) {
            todasRodadas.push(rodadasMap.get(i));
        } else {
            todasRodadas.push({ rodada: i, posicao: null, bonusOnus: 0, pontosCorridos: 0, mataMata: 0, top10: 0, _preenchida: true });
        }
    }
    return todasRodadas;
}

// =====================================================================
// RENDER: HERO SALDO CARD
// =====================================================================
function renderHeroSaldoCard(saldo, statusTexto, taxaInscricao, pagouInscricao, temporada) {
    const saldoHidden = getSaldoHidden();
    const isPositivo = saldo > 0;
    const isNegativo = saldo < 0;
    const isZero = saldo === 0;

    const heroVariant = isPositivo ? 'extrato-hero--positive' : isNegativo ? 'extrato-hero--negative' : 'extrato-hero--zero';
    const valorClass = isPositivo ? 'extrato-hero__valor--positive' : isNegativo ? 'extrato-hero__valor--negative' : 'extrato-hero__valor--zero';
    const statusClass = isNegativo ? 'extrato-hero__status--devedor' : isPositivo ? 'extrato-hero__status--credor' : 'extrato-hero__status--quitado';

    const inscricaoHtml = taxaInscricao > 0 ? `
        <div class="extrato-hero__inscricao">
            <span>Inscrição ${temporada}: ${formatarMoeda(taxaInscricao)}</span>
            <span class="extrato-hero__inscricao-badge ${pagouInscricao ? 'extrato-hero__inscricao-badge--paga' : 'extrato-hero__inscricao-badge--devida'}">
                ${pagouInscricao ? 'PAGA' : 'DEVENDO'}
            </span>
        </div>
    ` : '';

    return `
        <div class="extrato-hero ${heroVariant}">
            <div class="extrato-hero__header">
                <span class="extrato-hero__label">Saldo Financeiro</span>
                <div class="extrato-hero__actions">
                    <button class="extrato-hero__btn" onclick="window.toggleSaldoVisibility()" aria-label="Mostrar/ocultar saldo">
                        <span class="material-icons" id="eyeToggleIcon">${saldoHidden ? 'visibility_off' : 'visibility'}</span>
                    </button>
                    <button class="extrato-hero__btn" id="btnRefreshExtrato" aria-label="Atualizar extrato">
                        <span class="material-icons">sync</span>
                    </button>
                </div>
            </div>
            <div class="extrato-hero__valor ${valorClass} ${saldoHidden ? 'extrato-hero__valor--hidden' : ''}">
                ${isNegativo ? '-' : isPositivo ? '+' : ''}${formatarMoeda(saldo)}
            </div>
            <div class="extrato-hero__status ${statusClass}">
                <span class="material-icons" style="font-size: 14px;">${isNegativo ? 'trending_down' : isPositivo ? 'trending_up' : 'check_circle'}</span>
                ${statusTexto}
            </div>
            ${inscricaoHtml}
        </div>
    `;
}

// =====================================================================
// RENDER: QUICK STATS ROW
// =====================================================================
function renderQuickStatsRow(resumo, rodadas, acertos) {
    const totalRodadas = rodadas.filter(r => r.rodada > 0).length;
    const totalPago = acertos?.resumo?.totalPago || 0;

    // Melhor rodada
    let melhorRodada = null;
    let melhorSaldo = -Infinity;
    rodadas.forEach(r => {
        const s = (r.bonusOnus || 0) + (r.pontosCorridos || 0) + (r.mataMata || 0) + (r.top10 || 0);
        if (s > melhorSaldo) { melhorSaldo = s; melhorRodada = r.rodada; }
    });

    const saldo = resumo.saldo_atual ?? resumo.saldo ?? 0;
    const saldoColor = saldo >= 0 ? 'color: var(--app-success-light)' : 'color: var(--app-danger-light)';

    return `
        <div class="extrato-stats">
            <div class="extrato-stat-pill">
                <span class="material-icons extrato-stat-pill__icon">bar_chart</span>
                <div class="extrato-stat-pill__content">
                    <span class="extrato-stat-pill__label">Rodadas</span>
                    <span class="extrato-stat-pill__value">${totalRodadas}</span>
                </div>
            </div>
            <div class="extrato-stat-pill">
                <span class="material-icons extrato-stat-pill__icon">account_balance_wallet</span>
                <div class="extrato-stat-pill__content">
                    <span class="extrato-stat-pill__label">Saldo</span>
                    <span class="extrato-stat-pill__value" style="${saldoColor}">${sinalMoeda(saldo)}</span>
                </div>
            </div>
            <div class="extrato-stat-pill">
                <span class="material-icons extrato-stat-pill__icon">payments</span>
                <div class="extrato-stat-pill__content">
                    <span class="extrato-stat-pill__label">Pago</span>
                    <span class="extrato-stat-pill__value">${formatarMoeda(totalPago)}</span>
                </div>
            </div>
            ${melhorRodada ? `
            <div class="extrato-stat-pill">
                <span class="material-icons extrato-stat-pill__icon">star</span>
                <div class="extrato-stat-pill__content">
                    <span class="extrato-stat-pill__label">Melhor</span>
                    <span class="extrato-stat-pill__value" style="color: var(--app-success-light)">R${melhorRodada} +${melhorSaldo.toFixed(0)}</span>
                </div>
            </div>` : ''}
        </div>
    `;
}

// =====================================================================
// RENDER: EVOLUTION CHART
// =====================================================================
function renderEvolutionChart(isPreTemporadaMode) {
    const filterButtons = isPreTemporadaMode
        ? `<span class="extrato-chart__filter-btn extrato-chart__filter-btn--active" style="cursor:default">PRÉ-TEMPORADA</span>`
        : `
            <button class="filtro-btn extrato-chart__filter-btn extrato-chart__filter-btn--active" data-range="all">Tudo</button>
            <button class="filtro-btn extrato-chart__filter-btn" data-range="10">10R</button>
            <button class="filtro-btn extrato-chart__filter-btn" data-range="5">5R</button>
        `;

    return `
        <div class="extrato-chart">
            <div class="extrato-chart__header">
                <span class="extrato-chart__title">Evolução Financeira</span>
                <div class="extrato-chart__filters">${filterButtons}</div>
            </div>
            <div class="extrato-chart__svg-container">
                <svg id="graficoSVG" style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 300 160" preserveAspectRatio="none" fill="none">
                    <defs>
                        <linearGradient id="chartGradientPositive" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="var(--app-success)" stop-opacity="0.25"></stop>
                            <stop offset="100%" stop-color="var(--app-success)" stop-opacity="0"></stop>
                        </linearGradient>
                        <linearGradient id="chartGradientNegative" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="var(--app-danger)" stop-opacity="0.25"></stop>
                            <stop offset="100%" stop-color="var(--app-danger)" stop-opacity="0"></stop>
                        </linearGradient>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="var(--app-primary)" stop-opacity="0.3"></stop>
                            <stop offset="100%" stop-color="var(--app-primary)" stop-opacity="0"></stop>
                        </linearGradient>
                    </defs>
                    <line class="extrato-chart__zero-line" x1="0" x2="300" y1="80" y2="80"></line>
                    <path id="graficoArea" fill="url(#chartGradient)" d=""></path>
                    <path id="graficoPath" fill="none" stroke="var(--app-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d=""></path>
                </svg>
                <div id="graficoLabels" style="position:absolute;inset:0;top:auto;display:flex;justify-content:space-between;font-size:10px;color:var(--app-text-dim);padding:0 4px"></div>
            </div>
        </div>
    `;
}

// =====================================================================
// RENDER: TRANSACTION TIMELINE
// =====================================================================
function renderTransactionTimeline(rodadas, acertos, lancamentosIniciais, ligaId) {
    const items = [];

    // 1. Lançamentos iniciais (inscrição, saldo anterior)
    if (lancamentosIniciais && lancamentosIniciais.length > 0) {
        const groupItems = lancamentosIniciais.map(l => {
            const isDebit = l.valor < 0;
            const iconType = l.tipo === 'INSCRICAO_TEMPORADA' ? 'inscricao' : (isDebit ? 'debit' : 'credit');
            const iconName = l.tipo === 'INSCRICAO_TEMPORADA' ? 'receipt_long' : (isDebit ? 'trending_down' : 'savings');
            return `
                <div class="extrato-timeline__item">
                    <div class="extrato-timeline__item-icon extrato-timeline__item-icon--${iconType}">
                        <span class="material-icons">${iconName}</span>
                    </div>
                    <div class="extrato-timeline__item-content">
                        <div class="extrato-timeline__item-title">${l.descricao || l.tipo}</div>
                    </div>
                    <div class="extrato-timeline__item-value" style="color: ${isDebit ? 'var(--app-danger-light)' : 'var(--app-success-light)'}">
                        ${isDebit ? '-' : '+'}${formatarMoeda(l.valor)}
                    </div>
                </div>
            `;
        });

        const totalInicial = lancamentosIniciais.reduce((s, l) => s + (l.valor || 0), 0);
        items.push({
            order: 0,
            html: `
                <div class="extrato-timeline__group">
                    <div class="extrato-timeline__group-header">
                        <span class="extrato-timeline__group-label">Inscrição</span>
                        <span class="extrato-timeline__group-total" style="color: ${totalInicial >= 0 ? 'var(--app-success-light)' : 'var(--app-danger-light)'}">
                            ${sinalMoeda(totalInicial)}
                        </span>
                    </div>
                    ${groupItems.join('')}
                </div>
            `
        });
    }

    // 2. Rodadas
    const rodadasCompletas = preencherTodasRodadas(rodadas);
    const rodadasOrdenadas = [...rodadasCompletas].sort((a, b) => a.rodada - b.rodada);

    let saldoAcumulado = lancamentosIniciais ? lancamentosIniciais.reduce((s, l) => s + (l.valor || 0), 0) : 0;

    rodadasOrdenadas.forEach(r => {
        const bonusOnus = r.bonusOnus || 0;
        const pontosCorridos = r.pontosCorridos || 0;
        const mataMata = r.mataMata || 0;
        const top10 = r.top10 || 0;
        const saldoRodada = bonusOnus + pontosCorridos + mataMata + top10;
        saldoAcumulado += saldoRodada;

        const faixas = getFaixasParaRodada(ligaId, r.rodada);
        const { label: zonaLabel, tipo: tipoZona } = getPosicaoZonaLabel(r.posicao, faixas);
        const isMito = r.posicao === 1;
        const isMico = r.posicao === (faixas.debito?.fim || faixas.totalTimes);

        // Subitems (breakdown)
        const subitems = [];

        if (bonusOnus !== 0) {
            let bancoLabel = bonusOnus > 0 ? 'Bônus de posição' : 'Ônus de posição';
            if (isMito) bancoLabel = 'MITO da Rodada';
            else if (isMico) bancoLabel = 'MICO da Rodada';
            else if (zonaLabel) bancoLabel = `${bonusOnus > 0 ? 'Bônus' : 'Ônus'} (${zonaLabel})`;
            const bancoColor = isMito ? 'var(--app-gold)' : isMico ? 'var(--app-danger)' : 'var(--app-pos-tec)';
            subitems.push({ icon: 'casino', label: bancoLabel, valor: bonusOnus, color: bancoColor });
        }
        if (pontosCorridos !== 0) subitems.push({ icon: 'sports_soccer', label: 'Pontos Corridos', valor: pontosCorridos, color: 'var(--app-indigo)' });
        if (mataMata !== 0) subitems.push({ icon: 'emoji_events', label: 'Mata-Mata', valor: mataMata, color: 'var(--app-danger)' });
        if (top10 !== 0) {
            const posTop10 = calcularPosicaoTop10(top10, ligaId);
            const labelTop10 = top10 > 0 ? `${posTop10}º Melhor Mito` : `${posTop10}º Pior Mico`;
            subitems.push({ icon: top10 > 0 ? 'military_tech' : 'sentiment_sad', label: labelTop10, valor: top10, color: 'var(--app-warning)' });
        }

        // Módulos extras = tudo exceto o ranking base (Banco/Bônus/Ônus de posição)
        const modulosExtras = subitems.filter(si => si.icon !== 'casino').length;
        const hasSubitems = subitems.length > 0;
        const expandableClass = hasSubitems ? 'extrato-timeline__expandable' : '';
        const expandClick = hasSubitems ? `onclick="window.toggleTimelineGroup(this)"` : '';
        const expandIcon = hasSubitems ? `<span class="material-icons extrato-timeline__expand-icon">expand_more</span>` : '';

        // Net icon based on result
        const iconType = saldoRodada > 0 ? 'credit' : saldoRodada < 0 ? 'debit' : 'credit';
        const iconName = isMito ? 'star' : isMico ? 'thumb_down' : (saldoRodada >= 0 ? 'trending_up' : 'trending_down');

        // Badge text
        let badgeText = '';
        if (isMito) badgeText = ' · MITO';
        else if (isMico) badgeText = ' · MICO';
        else if (zonaLabel) badgeText = ` · ${zonaLabel}`;

        // Subitems HTML (sempre renderiza se há subitems)
        const subitemsHtml = hasSubitems ? `
            <div class="extrato-timeline__subitems">
                ${subitems.map(si => `
                    <div class="extrato-timeline__subitem">
                        <span class="material-icons extrato-timeline__subitem-icon" style="color: ${si.color || 'var(--app-text-dim)'}">${si.icon}</span>
                        <span class="extrato-timeline__subitem-label" style="color: ${si.color || 'var(--app-text-dim)'}">${si.label}</span>
                        <span class="extrato-timeline__subitem-value" style="color: ${si.valor >= 0 ? 'var(--app-success-light)' : 'var(--app-danger-light)'}">
                            ${si.valor > 0 ? '+' : ''}${si.valor.toFixed(2).replace('.', ',')}
                        </span>
                    </div>
                `).join('')}
            </div>
        ` : '';

        const saldoRodadaZero = saldoRodada === 0 && subitems.length === 0;

        items.push({
            order: r.rodada,
            html: `
                <div class="extrato-timeline__group">
                    <div class="extrato-timeline__group-header">
                        <span class="extrato-timeline__group-label">Rodada ${r.rodada}${badgeText}</span>
                        <span class="extrato-timeline__group-total" style="color: ${saldoRodada > 0 ? 'var(--app-success-light)' : saldoRodada < 0 ? 'var(--app-danger-light)' : 'var(--app-text-dim)'}">
                            ${saldoRodada === 0 ? '—' : sinalMoeda(saldoRodada)}
                        </span>
                    </div>
                    ${saldoRodadaZero ? `
                        <div class="extrato-timeline__item" style="opacity: 0.4">
                            <div class="extrato-timeline__item-icon" style="background: var(--app-glass-hover); color: var(--app-text-dim)">
                                <span class="material-icons">remove</span>
                            </div>
                            <div class="extrato-timeline__item-content">
                                <div class="extrato-timeline__item-title" style="color: var(--app-text-dim)">Sem movimentação</div>
                            </div>
                        </div>
                    ` : `
                        <div class="extrato-timeline__item ${expandableClass}" ${expandClick}>
                            <div class="extrato-timeline__item-icon extrato-timeline__item-icon--${iconType}">
                                <span class="material-icons">${iconName}</span>
                            </div>
                            <div class="extrato-timeline__item-content">
                                <div class="extrato-timeline__item-title">
                                    ${r.posicao ? r.posicao + 'º lugar' : 'Rodada ' + r.rodada}
                                </div>
                                <div class="extrato-timeline__item-subtitle">${modulosExtras} ${modulosExtras === 1 ? 'módulo' : 'módulos'}</div>
                            </div>
                            <div class="extrato-timeline__item-value" style="color: ${saldoRodada >= 0 ? 'var(--app-success-light)' : 'var(--app-danger-light)'}">
                                ${sinalMoeda(saldoRodada)}
                            </div>
                            ${expandIcon}
                        </div>
                        ${subitemsHtml}
                    `}
                    <div class="extrato-timeline__accumulated">
                        <span class="extrato-timeline__accumulated-label">Saldo:</span>
                        <span class="extrato-timeline__accumulated-value" style="color: ${saldoAcumulado >= 0 ? 'var(--app-success-light)' : 'var(--app-danger-light)'}">
                            ${sinalMoeda(saldoAcumulado)}
                        </span>
                    </div>
                </div>
            `
        });
    });

    // 3. Acertos financeiros
    const listaAcertos = acertos?.lista || [];
    if (listaAcertos.length > 0) {
        const acertosOrdenados = [...listaAcertos].sort((a, b) => new Date(b.dataAcerto || b.data || 0) - new Date(a.dataAcerto || a.data || 0));

        const acertoItems = acertosOrdenados.map(acerto => {
            const isPagamento = acerto.tipo === "pagamento";
            const valor = Math.abs(acerto.valor || 0);
            const dataFormatada = (acerto.dataAcerto || acerto.data)
                ? new Date(acerto.dataAcerto || acerto.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                : "";
            const metodos = { pix: 'PIX', transferencia: 'TED', dinheiro: 'Dinheiro', outro: 'Outro' };
            const metodoLabel = metodos[acerto.metodoPagamento] || '';
            const subtitleParts = [metodoLabel, dataFormatada].filter(Boolean).join(' · ');

            return `
                <div class="extrato-timeline__item">
                    <div class="extrato-timeline__item-icon extrato-timeline__item-icon--acerto">
                        <span class="material-icons">${isPagamento ? 'arrow_upward' : 'arrow_downward'}</span>
                    </div>
                    <div class="extrato-timeline__item-content">
                        <div class="extrato-timeline__item-title">${acerto.descricao || (isPagamento ? 'Pagamento' : 'Recebimento')}</div>
                        ${subtitleParts ? `<div class="extrato-timeline__item-subtitle">${subtitleParts}</div>` : ''}
                    </div>
                    <div class="extrato-timeline__item-value" style="color: ${isPagamento ? 'var(--app-success-light)' : 'var(--app-danger-light)'}">
                        ${isPagamento ? '+' : '-'}${formatarMoeda(valor)}
                    </div>
                </div>
            `;
        });

        const totalAcertos = acertos?.resumo?.saldo || 0;
        items.push({
            order: 9999,
            html: `
                <div class="extrato-timeline__group">
                    <div class="extrato-timeline__group-header">
                        <span class="extrato-timeline__group-label">Acertos</span>
                        <span class="extrato-timeline__group-total" style="color: ${totalAcertos >= 0 ? 'var(--app-success-light)' : 'var(--app-danger-light)'}">
                            ${sinalMoeda(totalAcertos)}
                        </span>
                    </div>
                    ${acertoItems.join('')}
                </div>
            `
        });
    }

    // Sort chronologically
    items.sort((a, b) => a.order - b.order);

    // Timeline filters
    const filterHtml = `
        <div class="extrato-timeline__filters">
            <button class="extrato-timeline__filter-btn extrato-timeline__filter-btn--active" data-tl-filter="all">Todos</button>
            <button class="extrato-timeline__filter-btn" data-tl-filter="credito">Créditos</button>
            <button class="extrato-timeline__filter-btn" data-tl-filter="debito">Débitos</button>
            <button class="extrato-timeline__filter-btn" data-tl-filter="acertos">Acertos</button>
        </div>
    `;

    return `
        <div class="extrato-timeline">
            ${filterHtml}
            <div id="timelineContent">
                ${items.length > 0 ? items.map(i => i.html).join('') : `
                    <div class="extrato-empty">
                        <span class="material-icons extrato-empty__icon">inbox</span>
                        <p class="extrato-empty__title">Sem movimentações</p>
                        <p class="extrato-empty__text">O extrato será gerado após a primeira rodada</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

// Expand/collapse timeline groups
window.toggleTimelineGroup = function(el) {
    const subitems = el.parentElement.querySelector('.extrato-timeline__subitems');
    const icon = el.querySelector('.extrato-timeline__expand-icon');
    if (subitems) {
        subitems.classList.toggle('extrato-timeline__subitems--open');
    }
    if (icon) {
        icon.classList.toggle('extrato-timeline__expand-icon--open');
    }
};

// =====================================================================
// RENDER: PERFORMANCE CARD
// =====================================================================
function renderPerformanceCard(rodadas, ligaId) {
    if (!rodadas || rodadas.length === 0) return '';

    let totalMito = 0, totalMico = 0;
    let zonaCredito = 0, zonaDebito = 0;
    let melhorRodada = { rodada: 0, saldo: -Infinity };
    let piorRodada = { rodada: 0, saldo: Infinity };

    rodadas.forEach(r => {
        const faixas = getFaixasParaRodada(ligaId, r.rodada);
        const saldo = (r.bonusOnus || 0) + (r.pontosCorridos || 0) + (r.mataMata || 0) + (r.top10 || 0);
        if (r.top10 > 0) totalMito++;
        if (r.top10 < 0) totalMico++;
        if (r.posicao && r.posicao <= faixas.credito.fim) zonaCredito++;
        if (r.posicao && r.posicao >= faixas.debito.inicio) zonaDebito++;
        if (saldo > melhorRodada.saldo) melhorRodada = { rodada: r.rodada, saldo };
        if (saldo < piorRodada.saldo) piorRodada = { rodada: r.rodada, saldo };
    });

    return `
        <div class="extrato-performance">
            <div class="extrato-performance__title">Seu Desempenho</div>
            <div class="extrato-performance__grid">
                <div class="extrato-performance__stat">
                    <div class="extrato-performance__stat-value" style="color: var(--app-warning)">${totalMito}</div>
                    <div class="extrato-performance__stat-label">Mitos</div>
                </div>
                <div class="extrato-performance__stat">
                    <div class="extrato-performance__stat-value" style="color: var(--app-danger-light)">${totalMico}</div>
                    <div class="extrato-performance__stat-label">Micos</div>
                </div>
                <div class="extrato-performance__stat">
                    <div class="extrato-performance__stat-value" style="color: var(--app-success-light)">${zonaCredito}</div>
                    <div class="extrato-performance__stat-label">Zona Ganho</div>
                </div>
                <div class="extrato-performance__stat">
                    <div class="extrato-performance__stat-value" style="color: var(--app-danger-light)">${zonaDebito}</div>
                    <div class="extrato-performance__stat-label">Zona Perda</div>
                </div>
            </div>
            <div class="extrato-performance__best-worst">
                <div class="extrato-performance__best-worst-item">
                    <div class="extrato-performance__bw-label">Melhor Rodada</div>
                    <div class="extrato-performance__bw-value" style="color: var(--app-success-light)">
                        R${melhorRodada.rodada} (${sinalMoeda(melhorRodada.saldo)})
                    </div>
                </div>
                <div class="extrato-performance__best-worst-item">
                    <div class="extrato-performance__bw-label">Pior Rodada</div>
                    <div class="extrato-performance__bw-value" style="color: var(--app-danger-light)">
                        R${piorRodada.rodada} (${sinalMoeda(piorRodada.saldo)})
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =====================================================================
// RENDER: BOTTOM SHEET ACERTOS (mantido do v10.2)
// =====================================================================
function renderBottomSheetAcertos(listaAcertos, resumoAcertos, saldoTemporada, saldoAcertos) {
    const totalPago = resumoAcertos?.totalPago || 0;
    const totalRecebido = resumoAcertos?.totalRecebido || 0;
    const saldoFinal = saldoTemporada + saldoAcertos;
    const temAcertos = listaAcertos && listaAcertos.length > 0;

    const acertosOrdenados = temAcertos
        ? [...listaAcertos].sort((a, b) => new Date(b.dataAcerto || b.data || 0) - new Date(a.dataAcerto || a.data || 0))
        : [];

    const listaHTML = temAcertos
        ? acertosOrdenados.map(acerto => {
            const isPagamento = acerto.tipo === "pagamento";
            const valor = Math.abs(acerto.valor || 0);
            const dataFormatada = (acerto.dataAcerto || acerto.data)
                ? new Date(acerto.dataAcerto || acerto.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
                : "--/--/--";
            const metodos = { pix: { icon: "qr_code_2", label: "PIX" }, transferencia: { icon: "account_balance", label: "TED" }, dinheiro: { icon: "payments", label: "Dinheiro" }, outro: { icon: "receipt", label: "Outro" } };
            const metodo = metodos[acerto.metodoPagamento] || metodos.outro;
            const corCard = isPagamento ? "border-color: rgba(16,185,129,0.2)" : "border-color: rgba(239,68,68,0.2)";
            const corIconBg = isPagamento ? "background: rgba(16,185,129,0.12); color: var(--app-success-light)" : "background: rgba(239,68,68,0.12); color: var(--app-danger-light)";
            const corValor = isPagamento ? "color: var(--app-success-light)" : "color: var(--app-danger-light)";

            return `
                <div style="background: var(--app-glass-hover); border-radius: var(--app-radius-lg); padding: 12px; border: 1px solid; ${corCard}">
                    <div style="display:flex; align-items:center; justify-content:space-between">
                        <div style="display:flex; align-items:center; gap:12px">
                            <div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;${corIconBg}">
                                <span class="material-icons" style="font-size:18px">${isPagamento ? 'arrow_upward' : 'arrow_downward'}</span>
                            </div>
                            <div>
                                <p style="font-size:14px;color:var(--app-text-primary);font-weight:500">${acerto.descricao || (isPagamento ? 'Você pagou' : 'Você recebeu')}</p>
                                <div style="display:flex;align-items:center;gap:8px;font-size:10px;color:var(--app-text-dim)">
                                    <span style="display:flex;align-items:center;gap:4px">
                                        <span class="material-icons" style="font-size:10px">${metodo.icon}</span>
                                        ${metodo.label}
                                    </span>
                                    <span>·</span>
                                    <span>${dataFormatada}</span>
                                </div>
                            </div>
                        </div>
                        <span style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;${corValor}">
                            ${isPagamento ? '-' : '+'}R$ ${valor.toFixed(2).replace('.', ',')}
                        </span>
                    </div>
                </div>
            `;
        }).join('')
        : `
            <div style="text-align:center;padding:32px 0;color:var(--app-text-dim)">
                <span class="material-icons" style="font-size:36px;display:block;margin-bottom:8px;opacity:0.4">receipt_long</span>
                <p style="font-size:14px">Nenhum acerto registrado</p>
                <p style="font-size:12px;color:var(--app-text-dim);margin-top:4px">Acertos e pagamentos aparecerão aqui</p>
            </div>
        `;

    return `
        <div id="bottomSheetAcertos" class="fixed inset-0 z-[60] hidden">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="window.fecharBottomSheetAcertos()"></div>
            <div class="absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh] flex flex-col transform translate-y-full transition-transform duration-300 ease-out" style="background: var(--app-bg-elevated, var(--app-surface))" id="bottomSheetContent">
                <div style="display:flex;justify-content:center;padding:12px 0 8px"><div style="width:40px;height:4px;border-radius:9999px;background:var(--app-glass-hover)"></div></div>
                <div style="padding:0 20px 16px;border-bottom:1px solid var(--app-glass-border)">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <h3 style="font-size:18px;font-weight:700;color:var(--app-text-primary);display:flex;align-items:center;gap:8px">
                            <span class="material-icons" style="color:var(--app-warning)">receipt_long</span>
                            Meus Acertos
                        </h3>
                        <div style="display:flex;gap:4px">
                            <button id="btnRefreshAcertos" onclick="window.refreshAcertosBottomSheet()" style="padding:8px;border-radius:50%;background:none;border:none;cursor:pointer;color:var(--app-text-dim)">
                                <span class="material-icons" style="font-size:20px">sync</span>
                            </button>
                            <button onclick="window.fecharBottomSheetAcertos()" style="padding:8px;border-radius:50%;background:none;border:none;cursor:pointer;color:var(--app-text-dim)">
                                <span class="material-icons">close</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div style="background:rgba(16,185,129,0.08);border-radius:var(--app-radius-lg);padding:12px;text-align:center;border:1px solid rgba(16,185,129,0.15)">
                        <span class="material-icons" style="color:var(--app-success-light);font-size:20px">arrow_upward</span>
                        <p style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;color:var(--app-success-light)">R$ ${totalPago.toFixed(2).replace('.', ',')}</p>
                        <p style="font-size:10px;color:var(--app-text-dim);text-transform:uppercase">Você pagou</p>
                    </div>
                    <div style="background:rgba(239,68,68,0.08);border-radius:var(--app-radius-lg);padding:12px;text-align:center;border:1px solid rgba(239,68,68,0.15)">
                        <span class="material-icons" style="color:var(--app-danger-light);font-size:20px">arrow_downward</span>
                        <p style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;color:var(--app-danger-light)">R$ ${totalRecebido.toFixed(2).replace('.', ',')}</p>
                        <p style="font-size:10px;color:var(--app-text-dim);text-transform:uppercase">Você recebeu</p>
                    </div>
                </div>
                <div style="flex:1;overflow-y:auto;padding:0 20px 16px;display:flex;flex-direction:column;gap:8px">${listaHTML}</div>
                <div style="padding:16px 20px;border-top:1px solid var(--app-glass-border);background:var(--app-bg-card, #141414)">
                    <div style="border-radius:var(--app-radius-lg);padding:16px;border:1px solid ${saldoFinal >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};background:${saldoFinal >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)'}">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:12px;color:var(--app-text-dim)">
                            <span>Saldo do Jogo</span>
                            <span style="color:${saldoTemporada >= 0 ? 'var(--app-success-light)' : 'var(--app-danger-light)'}">${saldoTemporada >= 0 ? '+' : ''}R$ ${Math.abs(saldoTemporada).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:12px;color:var(--app-text-dim)">
                            <span>Ajuste Acertos</span>
                            <span style="color:${saldoAcertos >= 0 ? 'var(--app-success-light)' : 'var(--app-danger-light)'}">${saldoAcertos >= 0 ? '+' : ''}R$ ${Math.abs(saldoAcertos).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div style="border-top:1px solid var(--app-glass-border);padding-top:12px;display:flex;justify-content:space-between;align-items:center">
                            <span style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--app-text-primary)">
                                <span class="material-icons" style="color:var(--app-text-muted)">account_balance_wallet</span>
                                Saldo Final
                            </span>
                            <span style="font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:800;color:${saldoFinal >= 0 ? 'var(--app-success-light)' : 'var(--app-danger-light)'}">
                                R$ ${Math.abs(saldoFinal).toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== BOTTOM SHEET FUNÇÕES GLOBAIS =====
window.abrirBottomSheetAcertos = function() {
    const sheet = document.getElementById('bottomSheetAcertos');
    const content = document.getElementById('bottomSheetContent');
    if (sheet && content) {
        sheet.classList.remove('hidden');
        content.offsetHeight;
        setTimeout(() => { content.style.transform = 'translateY(0)'; }, 10);
        document.body.style.overflow = 'hidden';
    }
};

window.fecharBottomSheetAcertos = function() {
    const sheet = document.getElementById('bottomSheetAcertos');
    const content = document.getElementById('bottomSheetContent');
    if (sheet && content) {
        content.style.transform = 'translateY(100%)';
        setTimeout(() => { sheet.classList.add('hidden'); document.body.style.overflow = ''; }, 300);
    }
};

// ===== BOTÃO MEUS ACERTOS (pill) =====
function renderBotaoMeusAcertos(listaAcertos, saldoAcertos) {
    const temAcertos = listaAcertos && listaAcertos.length > 0;
    const qtdAcertos = listaAcertos?.length || 0;
    let badgeBg = 'background: var(--app-glass-hover); color: var(--app-text-dim)';
    let badgeTexto = 'Nenhum';
    if (temAcertos) {
        if (saldoAcertos > 0) {
            badgeBg = 'background: rgba(16,185,129,0.15); color: var(--app-success-light)';
            badgeTexto = `+R$ ${Math.abs(saldoAcertos).toFixed(0)}`;
        } else if (saldoAcertos < 0) {
            badgeBg = 'background: rgba(239,68,68,0.15); color: var(--app-danger-light)';
            badgeTexto = `-R$ ${Math.abs(saldoAcertos).toFixed(0)}`;
        } else {
            badgeBg = 'background: rgba(16,185,129,0.15); color: var(--app-success-light)';
            badgeTexto = 'Quitado';
        }
    }

    return `
        <div style="display:flex;justify-content:center;margin:var(--app-space-4) 0">
            <button onclick="window.abrirBottomSheetAcertos()" style="
                display:inline-flex;align-items:center;gap:8px;
                padding:10px 18px;border-radius:9999px;
                border:1px solid var(--app-glass-border);
                background:var(--app-glass-bg);
                cursor:pointer;-webkit-tap-highlight-color:transparent;
                transition:all 0.2s ease;
            ">
                <span class="material-icons" style="font-size:18px;color:var(--app-warning)">receipt_long</span>
                <span style="font-size:11px;font-weight:600;color:var(--app-text-muted);text-transform:uppercase;letter-spacing:0.5px">Meus Acertos</span>
                <span style="font-size:10px;font-weight:700;padding:4px 10px;border-radius:9999px;${badgeBg}">${temAcertos ? qtdAcertos : badgeTexto}</span>
            </button>
        </div>
    `;
}
// Compat: expose old name on window
window.renderizarBotaoMeusAcertos = renderBotaoMeusAcertos;

// =====================================================================
// RENDER: MAIN CONTEUDO COMPLETO
// =====================================================================
window.renderizarConteudoCompleto = function renderizarConteudoCompleto(container, extrato) {
    const resumoBase = extrato.resumo || { saldo: 0, totalGanhos: 0, totalPerdas: 0 };
    const temporadaAtual = window.ParticipanteConfig?.CURRENT_SEASON || 2026;
    const temporadaSelecionada = window.seasonSelector?.getTemporadaSelecionada?.();
    const isPreTemporada2026 = (temporadaSelecionada || temporadaAtual) >= 2026 && isPreTemporada(extrato.rodadas);

    const camposManuais = isPreTemporada2026 ? [] : (extrato.camposManuais || extrato.camposEditaveis || []);

    // Saldo calculation (same as v10.7)
    const acertos = extrato.acertos || { lista: [], resumo: {} };
    const listaAcertos = acertos.lista || [];
    const resumoAcertos = acertos.resumo || {};
    const saldoAcertosCalculado = resumoAcertos?.saldo ?? resumoBase?.saldo_acertos ?? 0;
    const saldoTemporada = resumoBase.saldo_temporada ?? resumoBase.saldo_final ?? resumoBase.saldo ?? 0;
    const saldoAcertos = saldoAcertosCalculado;
    const saldo = resumoBase.saldo_atual ?? (saldoTemporada + saldoAcertos);

    const saldoPositivo = saldo >= 0;
    const statusTexto = saldoPositivo ? (saldo === 0 ? "QUITADO" : "A RECEBER") : "VOCÊ DEVE";

    const taxaInscricao = resumoBase.taxaInscricao || 0;
    const pagouInscricao = resumoBase.pagouInscricao === true;

    const ligaId = extrato.liga_id || extrato.ligaId || window.PARTICIPANTE_IDS?.ligaId || window.participanteData?.ligaId || '';
    window.ligaIdAtual = ligaId;

    if (window.Log) Log.info("[EXTRATO-UI] 💰 Renderizando:", { saldo, saldoTemporada, saldoAcertos, rodadas: extrato.rodadas?.length });

    const rodadasValidas = extrato.rodadas.filter(r => r.rodada > 0);

    container.innerHTML = `
        ${renderHeroSaldoCard(saldo, statusTexto, taxaInscricao, pagouInscricao, temporadaSelecionada || temporadaAtual)}
        ${renderQuickStatsRow(resumoBase, rodadasValidas, acertos)}
        ${renderBotaoMeusAcertos(listaAcertos, saldoAcertos)}
        ${renderEvolutionChart(false)}
        ${renderTransactionTimeline(extrato.rodadas, acertos, extrato.lancamentosIniciais, ligaId)}
        ${renderPerformanceCard(rodadasValidas, ligaId)}

        <!-- Modal TOP10 Info -->
        <div id="modalTop10Info" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/70 backdrop-blur-sm p-4" onclick="this.classList.add('hidden'); this.classList.remove('flex');">
            <div onclick="event.stopPropagation()" style="background:var(--app-bg-elevated,#1c1c1e);border-radius:var(--app-radius-2xl);width:100%;max-width:400px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.5)">
                <div style="padding:16px;border-bottom:1px solid var(--app-glass-border)">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <h3 style="font-size:16px;font-weight:700;color:var(--app-text-primary);display:flex;align-items:center;gap:8px">
                            <span class="material-icons" style="color:var(--app-warning)">emoji_events</span>
                            Detalhe TOP 10
                        </h3>
                        <button style="color:var(--app-text-dim);background:none;border:none;cursor:pointer" onclick="document.getElementById('modalTop10Info').classList.add('hidden');document.getElementById('modalTop10Info').classList.remove('flex');">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                </div>
                <div id="modalTop10Body" style="padding:16px"></div>
            </div>
        </div>

        ${renderBottomSheetAcertos(listaAcertos, resumoAcertos, saldoTemporada, saldoAcertos)}
    `;

    // Setup timeline filters
    setTimeout(() => configurarFiltrosTimeline(), 50);
};

// =====================================================================
// RENDER: PRÉ-TEMPORADA (RENOVADOS)
// =====================================================================
function renderizarConteudoRenovadoPreTemporada(container, extrato) {
    const resumoBase = extrato.resumo || {};
    const inscricaoInfo = statusRenovacaoParticipante || {};

    const taxaInscricao = inscricaoInfo.taxaInscricao || resumoBase.taxaInscricao || 180;
    const pagouInscricao = inscricaoInfo.pagouInscricao === true || resumoBase.pagouInscricao === true;
    const saldoAnteriorTransferido = resumoBase.saldoAnteriorTransferido || 0;
    const debitoTaxa = pagouInscricao ? 0 : taxaInscricao;
    const saldoCalculado = saldoAnteriorTransferido - debitoTaxa;
    const saldo = resumoBase.saldo_atual ?? resumoBase.saldo ?? saldoCalculado;
    const saldoPositivo = saldo >= 0;
    const statusTexto = saldoPositivo ? (saldo === 0 ? "QUITADO" : "A RECEBER") : "VOCÊ DEVE";

    const acertos = extrato.acertos || { lista: [], resumo: {} };
    const listaAcertos = acertos.lista || [];
    const saldoAcertos = acertos.resumo?.saldo || 0;

    const temporadaAtual = window.ParticipanteConfig?.CURRENT_SEASON || 2026;

    // Build lancamentos iniciais from pre-temporada data
    const lancamentosIniciais = extrato.lancamentosIniciais || [];
    if (lancamentosIniciais.length === 0) {
        if (!pagouInscricao && taxaInscricao > 0) {
            lancamentosIniciais.push({ tipo: 'INSCRICAO_TEMPORADA', descricao: 'Taxa de inscrição', valor: -taxaInscricao });
        }
        if (saldoAnteriorTransferido !== 0) {
            lancamentosIniciais.push({
                tipo: 'SALDO_TEMPORADA_ANTERIOR',
                descricao: saldoAnteriorTransferido > 0 ? 'Crédito da temporada anterior' : 'Dívida da temporada anterior',
                valor: saldoAnteriorTransferido
            });
        }
    }

    container.innerHTML = `
        ${renderHeroSaldoCard(saldo, statusTexto, taxaInscricao, pagouInscricao, temporadaAtual)}
        ${renderBotaoMeusAcertos(listaAcertos, saldoAcertos)}
        ${renderEvolutionChart(true)}
        ${renderTransactionTimeline([], acertos, lancamentosIniciais, '')}

        <!-- Card Aguardando -->
        <div class="extrato-performance">
            <div class="extrato-performance__title">Seu Desempenho</div>
            <div class="extrato-performance__grid">
                <div class="extrato-performance__stat">
                    <div class="extrato-performance__stat-value" style="color: var(--app-text-dim)">0</div>
                    <div class="extrato-performance__stat-label">Mitos</div>
                </div>
                <div class="extrato-performance__stat">
                    <div class="extrato-performance__stat-value" style="color: var(--app-text-dim)">0</div>
                    <div class="extrato-performance__stat-label">Micos</div>
                </div>
                <div class="extrato-performance__stat">
                    <div class="extrato-performance__stat-value" style="color: var(--app-text-dim)">0</div>
                    <div class="extrato-performance__stat-label">Zona Ganho</div>
                </div>
                <div class="extrato-performance__stat">
                    <div class="extrato-performance__stat-value" style="color: var(--app-text-dim)">0</div>
                    <div class="extrato-performance__stat-label">Zona Perda</div>
                </div>
            </div>
            <div style="margin-top:12px;text-align:center;padding:12px;border-radius:var(--app-radius-lg);background:var(--app-glass-hover)">
                <p style="font-size:12px;color:var(--app-text-dim)">Estatísticas serão atualizadas após a rodada 1</p>
            </div>
        </div>

        ${renderBottomSheetAcertos(listaAcertos, acertos.resumo || {}, saldo, saldoAcertos)}
    `;
}

// =====================================================================
// EXPORTED: ENTRY POINT
// =====================================================================
export async function renderizarExtratoParticipante(extrato, participanteId) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) {
        if (window.Log) Log.error("[EXTRATO-UI] ❌ Container não encontrado!");
        return;
    }

    if (!extrato || !extrato.rodadas || !Array.isArray(extrato.rodadas)) {
        container.innerHTML = renderizarErro();
        return;
    }

    await verificarStatusRenovacao();
    const renovado = statusRenovacaoParticipante?.renovado || false;
    const preTemporada = isPreTemporada(extrato.rodadas);

    const temporadaSelecionada = window.seasonSelector?.getTemporadaSelecionada?.();
    const CONFIG = window.ParticipanteConfig || {};
    const temporadaAtual = CONFIG.CURRENT_SEASON || 2026;
    const visualizandoHistorico = temporadaSelecionada && temporadaSelecionada < temporadaAtual;

    if (window.Log) Log.info("[EXTRATO-UI] 📊 Status:", { renovado, preTemporada, rodadas: extrato.rodadas.length, temporadaSelecionada, visualizandoHistorico });

    window.extratoAtual = extrato;

    if (!visualizandoHistorico && renovado && preTemporada) {
        renderizarConteudoRenovadoPreTemporada(container, extrato);
    } else {
        window.renderizarConteudoCompleto(container, extrato);
    }

    setTimeout(() => {
        if (!visualizandoHistorico && renovado && preTemporada) {
            window.renderizarGraficoPreTemporada();
        } else {
            renderizarGraficoEvolucao(extrato.rodadas);
        }
        configurarFiltrosGrafico(extrato.rodadas);
        configurarBotaoRefresh();
    }, 100);
}

// =====================================================================
// CHART: GRÁFICO EVOLUÇÃO
// =====================================================================
function renderizarGraficoEvolucao(rodadas, range = "all") {
    const path = document.getElementById("graficoPath");
    const area = document.getElementById("graficoArea");
    const labels = document.getElementById("graficoLabels");
    if (!path || !area || !labels) return;

    let dadosOrdenados = [...rodadas].sort((a, b) => a.rodada - b.rodada);
    if (range !== "all") dadosOrdenados = dadosOrdenados.slice(-parseInt(range));
    if (dadosOrdenados.length === 0) { path.setAttribute("d", ""); area.setAttribute("d", ""); labels.innerHTML = ""; return; }

    let saldoAcumulado = 0;
    const pontos = dadosOrdenados.map(r => {
        saldoAcumulado += (r.bonusOnus || 0) + (r.pontosCorridos || 0) + (r.mataMata || 0) + (r.top10 || 0);
        return { rodada: r.rodada, saldo: saldoAcumulado };
    });

    const valores = pontos.map(p => p.saldo);
    const min = Math.min(...valores, 0);
    const max = Math.max(...valores, 0);
    const range2 = Math.max(Math.abs(max), Math.abs(min)) || 1;
    const width = 300, height = 140, paddingY = 10;

    const mapY = val => {
        const normalized = (val - min) / (range2 * 2 || 1);
        return height - paddingY - normalized * (height - paddingY * 2);
    };

    let pathD = "", areaD = "";
    pontos.forEach((p, i) => {
        const x = (i / (pontos.length - 1 || 1)) * width;
        const y = mapY(p.saldo);
        if (i === 0) { pathD = `M ${x} ${y}`; areaD = `M ${x} ${height - paddingY}`; }
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
    });
    if (pontos.length > 0) areaD += ` L ${width} ${height - paddingY} Z`;

    // Color based on final saldo
    const finalSaldo = pontos[pontos.length - 1].saldo;
    const strokeColor = 'var(--app-primary)'; // Orange identity
    path.setAttribute("d", pathD);
    path.setAttribute("stroke", strokeColor);
    area.setAttribute("d", areaD);

    const step = Math.ceil(pontos.length / 6);
    labels.innerHTML = pontos.filter((_, i) => i % step === 0 || i === pontos.length - 1).map(p => `<span>R${p.rodada}</span>`).join("");
}

window.renderizarGraficoPreTemporada = function() {
    const path = document.getElementById("graficoPath");
    const area = document.getElementById("graficoArea");
    const labels = document.getElementById("graficoLabels");
    if (!path || !area || !labels) return;

    const width = 300, height = 140, centerY = height / 2;
    const startX = 10, endX = width - 10;
    const pathD = `M ${startX} ${centerY} C ${startX + 30} ${centerY}, ${endX - 30} ${centerY}, ${endX} ${centerY}`;
    const areaD = `${pathD} L ${endX} ${height} L ${startX} ${height} Z`;

    path.setAttribute("d", pathD);
    area.setAttribute("d", areaD);

    const rodadasMarcadas = [1, 8, 15, 22, 29, 36, 38];
    labels.innerHTML = rodadasMarcadas.map(rodada => {
        const x = startX + ((endX - startX) * (rodada - 1) / 37);
        return `<span style="position:absolute;left:${(x / width) * 100}%;transform:translateX(-50%)">R${rodada}</span>`;
    }).join("");
};

// =====================================================================
// CHART FILTERS
// =====================================================================
function configurarFiltrosGrafico(rodadas) {
    const btns = document.querySelectorAll(".filtro-btn");
    btns.forEach(btn => {
        btn.addEventListener("click", () => {
            btns.forEach(b => { b.classList.remove("extrato-chart__filter-btn--active"); });
            btn.classList.add("extrato-chart__filter-btn--active");
            renderizarGraficoEvolucao(rodadas, btn.dataset.range);
        });
    });
}

function configurarBotaoRefresh() {
    const btn = document.getElementById("btnRefreshExtrato");
    if (btn) {
        btn.addEventListener("click", () => {
            if (window.forcarRefreshExtratoParticipante) window.forcarRefreshExtratoParticipante();
        });
    }
}

// =====================================================================
// TIMELINE FILTERS
// =====================================================================
function configurarFiltrosTimeline() {
    const btns = document.querySelectorAll('[data-tl-filter]');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('extrato-timeline__filter-btn--active'));
            btn.classList.add('extrato-timeline__filter-btn--active');

            const filter = btn.dataset.tlFilter;
            const groups = document.querySelectorAll('.extrato-timeline__group');

            groups.forEach(group => {
                const label = group.querySelector('.extrato-timeline__group-label')?.textContent?.toLowerCase() || '';
                let show = true;
                if (filter === 'credito') {
                    const total = group.querySelector('.extrato-timeline__group-total');
                    show = total && total.textContent.includes('+');
                } else if (filter === 'debito') {
                    const total = group.querySelector('.extrato-timeline__group-total');
                    show = total && total.textContent.includes('-');
                } else if (filter === 'acertos') {
                    show = label.includes('acerto');
                }
                group.style.display = show ? '' : 'none';
            });
        });
    });
}

// =====================================================================
// MINI REFRESH ACERTOS
// =====================================================================
window.refreshAcertosBottomSheet = async function() {
    const btn = document.getElementById('btnRefreshAcertos');
    const iconEl = btn?.querySelector('.material-icons');
    const ligaId = window.PARTICIPANTE_IDS?.ligaId || window.participanteData?.ligaId;
    const timeId = window.PARTICIPANTE_IDS?.timeId || window.participanteData?.timeId;
    if (!ligaId || !timeId) return;

    if (btn) btn.disabled = true;
    if (iconEl) iconEl.classList.add('animate-spin');

    try {
        const CONFIG = window.ParticipanteConfig || {};
        const temporada = CONFIG.getFinancialSeason ? CONFIG.getFinancialSeason() : (CONFIG.CURRENT_SEASON || 2026);
        const url = `/api/extrato-cache/${ligaId}/times/${timeId}/cache?temporada=${temporada}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro: ${response.status}`);

        const data = await response.json();
        const acertos = data.acertos || { lista: [], resumo: {} };
        const resumo = data.resumo || {};
        const saldoAcertosAtualizado = acertos.resumo?.saldo ?? resumo.saldo_acertos ?? 0;
        const saldoTemporadaAtual = resumo.saldo_temporada ?? resumo.saldo_final ?? resumo.saldo ?? 0;
        const saldoAtualCalculado = saldoTemporadaAtual + saldoAcertosAtualizado;

        if (window.extratoAtual) {
            window.extratoAtual.acertos = acertos;
            window.extratoAtual.resumo = { ...window.extratoAtual.resumo, ...resumo, saldo_acertos: saldoAcertosAtualizado, saldo_atual: saldoAtualCalculado };
        }

        if (window.ParticipanteCache) {
            const cacheAtual = await window.ParticipanteCache.getExtratoAsync?.(ligaId, timeId) || window.ParticipanteCache.getExtrato?.(ligaId, timeId);
            if (cacheAtual) {
                cacheAtual.acertos = acertos;
                cacheAtual.resumo = { ...cacheAtual.resumo, ...resumo, saldo_acertos: saldoAcertosAtualizado, saldo_atual: saldoAtualCalculado };
                window.ParticipanteCache.setExtrato(ligaId, timeId, cacheAtual);
            }
        }

        const wasOpen = !document.getElementById('bottomSheetAcertos')?.classList.contains('hidden');
        const container = document.getElementById("fluxoFinanceiroContent");
        if (container && window.extratoAtual) {
            window.renderizarConteudoCompleto(container, window.extratoAtual);
            if (wasOpen) setTimeout(() => window.abrirBottomSheetAcertos(), 100);
        }
        mostrarToast('Acertos atualizados!', 'success');
    } catch (error) {
        if (window.Log) Log.error("[EXTRATO-UI] ❌ Erro no refresh:", error);
        mostrarToast('Erro ao atualizar', 'error');
    } finally {
        if (btn) btn.disabled = false;
        if (iconEl) iconEl.classList.remove('animate-spin');
    }
};

// =====================================================================
// DETALHAMENTO GANHOS/PERDAS (mantido do v10.9)
// =====================================================================
window.mostrarDetalhamentoGanhos = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    try { mostrarPopupDetalhamento(true); } catch (e) { if (window.Log) Log.error('[EXTRATO-UI] ❌', e); }
};

window.mostrarDetalhamentoPerdas = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    try { mostrarPopupDetalhamento(false); } catch (e) { if (window.Log) Log.error('[EXTRATO-UI] ❌', e); }
};

function mostrarPopupDetalhamento(isGanhos) {
    const extrato = window.extratoAtual;
    if (!extrato || !extrato.resumo) { mostrarToast('Aguarde o carregamento', 'error'); return; }

    const titulo = isGanhos ? "Detalhamento de Créditos" : "Detalhamento de Débitos";
    const icon = isGanhos ? "arrow_upward" : "arrow_downward";
    const resumo = extrato.resumo || {};
    const categorias = {};
    const ligaId = window.ligaIdAtual || "";

    const bonus = resumo.bonus || 0;
    const onus = resumo.onus || 0;
    const pontosCorridos = resumo.pontosCorridos || 0;
    const mataMata = resumo.mataMata || 0;
    const top10 = resumo.top10 || 0;
    const somaGanhos = resumo.totalGanhos || 0;
    const somaPerdas = Math.abs(resumo.totalPerdas || 0);

    const isInativo = extrato.inativo || false;
    const rodadaDesistencia = extrato.rodadaDesistencia || null;
    const rodadaLimite = isInativo && rodadaDesistencia ? rodadaDesistencia - 1 : 999;

    let rodadasComGanho = 0, rodadasComPerda = 0, totalMito = 0, totalMico = 0, totalZonaCredito = 0, totalZonaDebito = 0;

    if (extrato.rodadas && Array.isArray(extrato.rodadas)) {
        extrato.rodadas.filter(r => r.rodada <= rodadaLimite).forEach(r => {
            const faixas = getFaixasParaRodada(ligaId, r.rodada);
            const saldo = (r.bonusOnus || 0) + (r.pontosCorridos || 0) + (r.mataMata || 0) + (r.top10 || 0);
            if (saldo > 0) rodadasComGanho++;
            if (saldo < 0) rodadasComPerda++;
            if (r.top10 > 0) totalMito++;
            if (r.top10 < 0) totalMico++;
            if (r.posicao && r.posicao <= faixas.credito.fim) totalZonaCredito++;
            if (r.posicao && r.posicao >= faixas.debito.inicio) totalZonaDebito++;
        });
    }

    if (isGanhos) {
        if (bonus > 0) addCategoria(categorias, "Zona de Ganho", bonus, "Total", "add_circle");
        if (pontosCorridos > 0) addCategoria(categorias, "Pontos Corridos", pontosCorridos, "Total", "sports_soccer");
        if (mataMata > 0) addCategoria(categorias, "Mata-Mata", mataMata, "Total", "emoji_events");
        if (top10 > 0) addCategoria(categorias, "Top 10 (MITO)", top10, "Total", "star");
        const saldoAnteriorGanho = resumo.saldoAnteriorTransferido || 0;
        if (saldoAnteriorGanho > 0) addCategoria(categorias, "Crédito Temporada Anterior", saldoAnteriorGanho, "Transferido", "savings");
    } else {
        const taxaInscricao = resumo.taxaInscricao || 0;
        if (taxaInscricao > 0) addCategoria(categorias, "Inscrição Temporada", taxaInscricao, "Inscrição", "receipt_long");
        const saldoAnterior = resumo.saldoAnteriorTransferido || 0;
        if (saldoAnterior < 0) addCategoria(categorias, "Dívida Temporada Anterior", Math.abs(saldoAnterior), "Transferido", "history");
        if (onus < 0) addCategoria(categorias, "Zona de Perda", Math.abs(onus), "Total", "remove_circle");
        if (pontosCorridos < 0) addCategoria(categorias, "Pontos Corridos", Math.abs(pontosCorridos), "Total", "sports_soccer");
        if (mataMata < 0) addCategoria(categorias, "Mata-Mata", Math.abs(mataMata), "Total", "sports_mma");
        if (top10 < 0) addCategoria(categorias, "Top 10 (MICO)", Math.abs(top10), "Total", "sentiment_very_dissatisfied");
    }

    const camposManuais = extrato.camposManuais || extrato.camposEditaveis || [];
    if (Array.isArray(camposManuais) && camposManuais.length > 0) {
        camposManuais.forEach(campo => {
            const valor = parseFloat(campo.valor) || 0;
            const nome = campo.nome || "Ajuste Manual";
            if (isGanhos && valor > 0) addCategoria(categorias, nome, valor, "Manual", "edit");
            else if (!isGanhos && valor < 0) addCategoria(categorias, nome, Math.abs(valor), "Manual", "edit");
        });
    }

    const total = isGanhos ? somaGanhos : somaPerdas;
    const mediaGanho = rodadasComGanho > 0 ? somaGanhos / rodadasComGanho : 0;
    const mediaPerda = rodadasComPerda > 0 ? somaPerdas / rodadasComPerda : 0;

    const categoriasArray = Object.values(categorias)
        .map(cat => ({ ...cat, percentual: total > 0 ? (cat.valor / total) * 100 : 0 }))
        .sort((a, b) => b.valor - a.valor);

    document.getElementById("popupDetalhamento")?.remove();

    const corPrincipal = isGanhos ? 'var(--app-success-light)' : 'var(--app-danger-light)';
    const corBg = isGanhos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
    const corBar = isGanhos ? 'var(--app-success)' : 'var(--app-danger)';

    const html = `
        <div id="popupDetalhamento" onclick="this.remove()" class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);padding:16px">
            <div onclick="event.stopPropagation()" style="background:var(--app-bg-elevated,#1c1c1e);border-radius:var(--app-radius-2xl);width:100%;max-width:400px;max-height:85vh;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.5)">
                <div style="padding:16px;border-bottom:1px solid var(--app-glass-border)">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
                        <h3 style="font-size:16px;font-weight:700;color:var(--app-text-primary);display:flex;align-items:center;gap:8px">
                            <span class="material-icons" style="color:${corPrincipal}">${icon}</span>
                            ${titulo}
                        </h3>
                        <button style="color:var(--app-text-dim);background:none;border:none;cursor:pointer" onclick="document.getElementById('popupDetalhamento').remove()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
                        <div style="text-align:center"><p style="font-size:10px;color:var(--app-text-dim)">Rodadas</p><p style="font-size:18px;font-weight:700;color:var(--app-text-primary)">${isGanhos ? rodadasComGanho : rodadasComPerda}</p></div>
                        <div style="text-align:center"><p style="font-size:10px;color:var(--app-text-dim)">Média</p><p style="font-size:18px;font-weight:700;color:var(--app-text-primary)">${(isGanhos ? mediaGanho : mediaPerda).toFixed(2).replace('.', ',')}</p></div>
                        <div style="text-align:center"><p style="font-size:10px;color:var(--app-text-dim)">${isGanhos ? 'Mitos' : 'Micos'}</p><p style="font-size:18px;font-weight:700;color:var(--app-text-primary)">${isGanhos ? totalMito : totalMico}x</p></div>
                        <div style="text-align:center"><p style="font-size:10px;color:var(--app-text-dim)">${isGanhos ? 'Zona G' : 'Zona Z'}</p><p style="font-size:18px;font-weight:700;color:var(--app-text-primary)">${isGanhos ? totalZonaCredito : totalZonaDebito}x</p></div>
                    </div>
                </div>
                <div style="padding:16px;overflow-y:auto;max-height:50vh;display:flex;flex-direction:column;gap:12px">
                    ${categoriasArray.length === 0
                        ? `<div style="text-align:center;padding:32px 0;color:var(--app-text-dim)"><span class="material-icons" style="font-size:36px;display:block;margin-bottom:8px">inbox</span>Nenhum registro encontrado</div>`
                        : categoriasArray.map(cat => `
                            <div style="background:var(--app-glass-hover);border-radius:var(--app-radius-lg);padding:12px">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                                    <div style="display:flex;align-items:center;gap:8px">
                                        <div style="width:32px;height:32px;border-radius:var(--app-radius-md);display:flex;align-items:center;justify-content:center;background:${corBg}">
                                            <span class="material-icons" style="font-size:16px;color:${corPrincipal}">${cat.icon}</span>
                                        </div>
                                        <span style="font-size:14px;font-weight:500;color:var(--app-text-primary)">${cat.nome}</span>
                                    </div>
                                    <span style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:${corPrincipal}">R$ ${cat.valor.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div style="height:6px;background:var(--app-glass-border);border-radius:9999px;overflow:hidden;margin-bottom:4px">
                                    <div style="height:100%;border-radius:9999px;background:${corBar};width:${cat.percentual}%"></div>
                                </div>
                                <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--app-text-dim)">
                                    <span>${Array.isArray(cat.rodadas) ? cat.rodadas.length + ' rodada(s)' : cat.rodadas}</span>
                                    <span>${cat.percentual.toFixed(1)}%</span>
                                </div>
                            </div>
                        `).join('')
                    }
                    <div style="border-radius:var(--app-radius-lg);padding:16px;background:${corBg}">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--app-text-primary)">
                                <span class="material-icons" style="color:${corPrincipal}">account_balance_wallet</span>
                                TOTAL ${isGanhos ? 'CRÉDITOS' : 'DÉBITOS'}
                            </span>
                            <span style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:800;color:${corPrincipal}">R$ ${total.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
}

function addCategoria(obj, nome, valor, rodada, icon) {
    if (!obj[nome]) obj[nome] = { nome, valor: 0, rodadas: [], icon };
    obj[nome].valor += valor;
    if (rodada !== "Manual") obj[nome].rodadas.push(rodada);
    else obj[nome].rodadas = "Ajuste manual";
}

// =====================================================================
// UTILS: TOASTS
// =====================================================================
function mostrarToast(mensagem, tipo = 'success') {
    const toast = document.createElement('div');
    const bg = tipo === 'success' ? 'var(--app-success)' : 'var(--app-danger)';
    toast.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:${bg};color:white;padding:8px 20px;border-radius:9999px;font-size:14px;font-weight:500;z-index:9999;animation:fadeIn 0.2s ease`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function renderizarErro() {
    return `
        <div class="extrato-empty">
            <span class="material-icons extrato-empty__icon">error_outline</span>
            <p class="extrato-empty__title">Erro ao carregar extrato</p>
            <p class="extrato-empty__text">Tente novamente em alguns instantes</p>
            <button onclick="window.forcarRefreshExtratoParticipante()" style="
                margin-top:16px;padding:12px 24px;
                background:var(--app-primary);color:white;
                border:none;border-radius:var(--app-radius-lg);
                font-weight:600;font-size:14px;cursor:pointer;
            ">Tentar Novamente</button>
        </div>
    `;
}

// =====================================================================
// ✅ v11.1: PROJEÇÃO FINANCEIRA EM TEMPO REAL
// Card exibido durante rodada em andamento (status_mercado === 2)
// =====================================================================

export function renderizarProjecaoFinanceira(projecaoData) {
    if (!projecaoData || !projecaoData.projecao) return;

    // Encontrar ou criar container da projeção
    let card = document.getElementById("projecaoFinanceiraCard");

    if (!card) {
        // Inserir após o hero card
        const heroCard = document.querySelector(".extrato-hero");
        if (heroCard && heroCard.parentNode) {
            card = document.createElement("div");
            card.id = "projecaoFinanceiraCard";
            heroCard.parentNode.insertBefore(card, heroCard.nextSibling);
        } else {
            // Fallback: inserir no topo do container principal
            const mainContainer = document.getElementById("fluxoFinanceiroContent");
            if (!mainContainer) return;
            card = document.createElement("div");
            card.id = "projecaoFinanceiraCard";
            mainContainer.insertBefore(card, mainContainer.firstChild);
        }
    }

    const { rodada, time, financeiro, saldo, atualizado_em } = projecaoData;
    const impacto = financeiro?.impactoProjetado || 0;
    const impactoPositivo = impacto > 0;
    const impactoNegativo = impacto < 0;
    const impactoCor = impactoPositivo ? 'var(--app-success)' : impactoNegativo ? 'var(--app-danger)' : 'var(--app-text-dim)';
    const impactoSinal = impactoPositivo ? '+' : '';

    const horaAtualizada = atualizado_em
        ? new Date(atualizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '--:--';

    // Banco info
    const banco = financeiro?.banco;
    const bancoValor = banco?.valor || 0;
    const bancoCor = bancoValor > 0 ? 'var(--app-success-light)' : bancoValor < 0 ? 'var(--app-danger-light)' : 'var(--app-text-dim)';

    // PC info
    const pc = financeiro?.pontosCorridos;
    const pcValor = pc?.valor || 0;
    const pcCor = pcValor > 0 ? 'var(--app-success-light)' : pcValor < 0 ? 'var(--app-danger-light)' : 'var(--app-text-dim)';

    // Saldo projetado
    const saldoProjetado = saldo?.projetado || 0;
    const saldoProjetadoCor = saldoProjetado >= 0 ? 'var(--app-success-light)' : 'var(--app-danger-light)';

    card.innerHTML = `
        <div style="
            margin: 12px 0;
            padding: 16px;
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.06) 0%, rgba(34, 197, 94, 0.02) 100%);
            border: 1.5px dashed rgba(34, 197, 94, 0.35);
            border-radius: var(--app-radius-xl, 16px);
            position: relative;
            overflow: hidden;
        ">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="
                        display: inline-block;
                        width: 8px; height: 8px;
                        background: #22c55e;
                        border-radius: 50%;
                        animation: projecaoPulse 2s ease-in-out infinite;
                    "></span>
                    <span style="
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #22c55e;
                    ">Projecao R${rodada} ao vivo</span>
                </div>
                <span style="font-size: 10px; color: var(--app-text-dim, #6b7280);">
                    ${horaAtualizada}
                </span>
            </div>

            <!-- Position + Points -->
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                <div style="
                    width: 44px; height: 44px;
                    border-radius: var(--app-radius-lg, 12px);
                    background: rgba(34, 197, 94, 0.12);
                    display: flex; align-items: center; justify-content: center;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 18px; font-weight: 800;
                    color: #22c55e;
                ">${time?.posicao_parcial || '-'}°</div>
                <div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--app-text-primary, #e5e5e5);">
                        ${time?.nome_time || 'Meu Time'}
                    </div>
                    <div style="font-size: 11px; color: var(--app-text-dim, #6b7280);">
                        ${(time?.pontos_parciais || 0).toFixed(2).replace('.', ',')} pts parciais
                        &middot; ${time?.total_times || '?'} times
                    </div>
                </div>
            </div>

            <!-- Financial Breakdown -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                <!-- Banco -->
                <div style="
                    background: var(--app-glass-bg, rgba(255,255,255,0.04));
                    border-radius: var(--app-radius-md, 8px);
                    padding: 10px;
                ">
                    <div style="font-size: 10px; color: var(--app-text-dim, #6b7280); margin-bottom: 4px;">
                        Banco (${banco?.posicao || '-'}° lugar)
                    </div>
                    <div style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 16px; font-weight: 700;
                        color: ${bancoCor};
                    ">${bancoValor >= 0 ? '+' : ''}${bancoValor.toFixed(2).replace('.', ',')}</div>
                </div>

                <!-- Pontos Corridos -->
                <div style="
                    background: var(--app-glass-bg, rgba(255,255,255,0.04));
                    border-radius: var(--app-radius-md, 8px);
                    padding: 10px;
                ">
                    <div style="font-size: 10px; color: var(--app-text-dim, #6b7280); margin-bottom: 4px;">
                        ${pc ? 'Pontos Corridos' : 'PC (inativo)'}
                    </div>
                    <div style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 16px; font-weight: 700;
                        color: ${pc ? pcCor : 'var(--app-text-dim, #6b7280)'};
                    ">${pc ? `${pcValor >= 0 ? '+' : ''}${pcValor.toFixed(2).replace('.', ',')}` : '--'}</div>
                    ${pc?.oponente ? `<div style="font-size: 9px; color: var(--app-text-dim, #6b7280); margin-top: 2px;">vs ${pc.oponente}</div>` : ''}
                </div>
            </div>

            <!-- Impact Total -->
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                background: ${impactoPositivo ? 'rgba(34, 197, 94, 0.1)' : impactoNegativo ? 'rgba(239, 68, 68, 0.1)' : 'var(--app-glass-bg, rgba(255,255,255,0.04))'};
                border-radius: var(--app-radius-md, 8px);
            ">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="material-icons" style="font-size: 16px; color: ${impactoCor};">
                        ${impactoPositivo ? 'trending_up' : impactoNegativo ? 'trending_down' : 'remove'}
                    </span>
                    <span style="font-size: 12px; font-weight: 600; color: var(--app-text-primary, #e5e5e5);">
                        Impacto projetado
                    </span>
                </div>
                <span style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 18px; font-weight: 800;
                    color: ${impactoCor};
                ">${impactoSinal}${impacto.toFixed(2).replace('.', ',')}</span>
            </div>

            <!-- Disclaimer -->
            <div style="margin-top: 10px; font-size: 9px; color: var(--app-text-dim, #6b7280); text-align: center; opacity: 0.7;">
                Valores provisorios baseados em parciais. Atualiza a cada 60s. Resultado final apos consolidacao.
            </div>
        </div>

        <style>
            @keyframes projecaoPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(1.3); }
            }
        </style>
    `;
}

if (window.Log) Log.info("[EXTRATO-UI] ✅ Módulo v11.1 carregado (BANK DIGITAL + PROJEÇÃO AO VIVO)");
