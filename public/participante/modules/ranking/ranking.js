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

// ===== EXPORT DE PDF / COMPARTILHAMENTO =====
const PDF_CDN = {
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    jsPDF: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
};

const scriptLoadPromises = {};
function carregarScriptRanking(src, key) {
    if (scriptLoadPromises[key]) return scriptLoadPromises[key];
    if (document.querySelector(`script[data-ranking-script="${key}"]`)) {
        scriptLoadPromises[key] = Promise.resolve();
        return scriptLoadPromises[key];
    }
    scriptLoadPromises[key] = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.dataset.rankingScript = key;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Não foi possível carregar ${src}`));
        document.head.appendChild(script);
    });
    return scriptLoadPromises[key];
}

async function ensureHtml2Canvas() {
    if (window.html2canvas) return window.html2canvas;
    await carregarScriptRanking(PDF_CDN.html2canvas, 'ranking-html2canvas');
    if (!window.html2canvas) {
        throw new Error('html2canvas não expôs o objeto global');
    }
    return window.html2canvas;
}

async function ensureJsPDF() {
    const existing = window.jspdf?.jsPDF || window.jsPDF;
    if (existing) return existing;
    await carregarScriptRanking(PDF_CDN.jsPDF, 'ranking-jspdf');
    const ctor = window.jspdf?.jsPDF || window.jsPDF;
    if (!ctor) {
        throw new Error('jsPDF não expôs o construtor esperado');
    }
    return ctor;
}

function mostrarToastRankingPDF(mensagem, tipo = 'info') {
    document.querySelectorAll('.ranking-pdf-toast').forEach(el => el.remove());
    const toast = document.createElement('div');
    toast.className = `ranking-pdf-toast toast-${tipo}`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    }, 2800);
}

async function compartilharRanking() {
    const shareButton = document.querySelector('.btn-share');
    if (shareButton) {
        shareButton.disabled = true;
        shareButton.classList.add('loading');
    }

    mostrarToastRankingPDF('Gerando PDF elegante do ranking…', 'info');

    try {
        const [html2canvasCtor, jsPDFCtor] = await Promise.all([
            ensureHtml2Canvas(),
            ensureJsPDF()
        ]);

        const target = document.querySelector('.ranking-participante-pro');
        if (!target) {
            throw new Error('Ranking não está disponível para captura');
        }

        const originalVisibility = shareButton?.style.visibility || '';
        if (shareButton) {
            shareButton.style.visibility = 'hidden';
        }

        const canvas = await html2canvasCtor(target, {
            backgroundColor: '#090909',
            scale: Math.min(2.8, Math.max(1.2, window.devicePixelRatio || 1)),
            useCORS: true,
            allowTaint: true,
            logging: false,
            scrollY: -window.scrollY
        });

        if (shareButton) {
            shareButton.style.visibility = originalVisibility;
        }

        const imageData = canvas.toDataURL('image/png');
        const doc = new jsPDFCtor({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        const margin = 12;

        doc.setFillColor(9, 11, 14);
        doc.rect(0, 0, pdfWidth, pdfHeight, 'F');
        doc.setFillColor(21, 24, 33);
        doc.rect(margin - 0.5, margin - 1, pdfWidth - margin * 2 + 1, 34, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 173, 64);
        doc.text('Ranking Geral', pdfWidth / 2, margin + 8, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(190, 190, 202);
        doc.text(`Super Cartola Manager • Temporada ${estadoRanking.temporada || new Date().getFullYear()}`, pdfWidth / 2, margin + 14, { align: 'center' });

        const imageWidth = pdfWidth - margin * 2;
        const imageHeight = (canvas.height / canvas.width) * imageWidth;
        const availableHeight = pdfHeight - margin - (margin + 34) - 14;
        const finalImageHeight = Math.min(imageHeight, Math.max(availableHeight, 0));
        const imageY = margin + 38;

        doc.addImage(imageData, 'PNG', margin, imageY, imageWidth, finalImageHeight, undefined, 'FAST');

        doc.setFontSize(8);
        doc.setTextColor(170, 170, 185);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pdfWidth - margin, pdfHeight - 8, { align: 'right' });

        const filename = `ranking-geral-${estadoRanking.temporada || '2026'}-${Date.now()}.pdf`;
        doc.save(filename);

        mostrarToastRankingPDF('PDF pronto! Confira sua pasta de downloads.', 'success');
    } catch (error) {
        console.error('[RANKING] Erro ao gerar PDF:', error);
        mostrarToastRankingPDF('Erro ao gerar PDF. Tente novamente.', 'error');
    } finally {
        if (shareButton) {
            shareButton.disabled = false;
            shareButton.classList.remove('loading');
        }
    }
}

window.compartilharRanking = compartilharRanking;

// ===== EXPORTS =====
export { initRanking, carregarRanking };

window.rankingModule = {
    init: initRanking,
    carregar: carregarRanking
};

console.log('✅ [RANKING v4.0] Módulo mobile-first carregado');
