/**
 * ROUND X-RAY WIDGET - "Raio-X da Rodada"
 * ========================================
 * Widget flutuante pós-rodada com análise de disputas internas
 * Aparece quando rodada encerra (consolidada + mercado aberto)
 *
 * @version 1.0.0 - Lançamento inicial
 *   - FAB bola estática (sem animações)
 *   - Modal com narrativa inteligente
 *   - Foco em disputas (PC, MM, Artilheiro, Luva, Capitão)
 *   - Draggable com persistência
 *   - Coordenação com WhatsHappening (nunca ambos visíveis)
 *
 * Ciclo de vida:
 * - Rodada consolida → Widget aparece
 * - Mercado fecha (nova rodada) → Widget desaparece, foguinho volta
 */

if (window.Log) Log.info("[ROUND-XRAY] ⚽ Widget v1.0 carregando...");

// ============================================
// ESTADO DO WIDGET
// ============================================
const RXrayState = {
    isVisible: false,
    isModalOpen: false,
    isLoading: false,
    ligaId: null,
    timeId: null,
    rodadaConsolidada: null,
    temporada: null,
    contexto: null, // Dados da API /rodada-contexto
    fabPosition: { right: 16, bottom: 80 },
};

// ============================================
// CONSTANTES
// ============================================
const RXRAY_STORAGE_KEY = "rxray-fab-position";
const RXRAY_CACHE_KEY = "rxray-cache";
const RXRAY_CACHE_DURATION = 60 * 60 * 1000; // 1 hora

// ============================================
// INICIALIZAÇÃO
// ============================================
export async function inicializarRaioXWidget(participante, mercadoStatus) {
    if (window.Log) Log.info("[ROUND-XRAY] Inicializando widget...");

    RXrayState.ligaId = participante.ligaId;
    RXrayState.timeId = participante.timeId;
    RXrayState.temporada = participante.temporada || new Date().getFullYear();

    // Verificar se deve exibir
    if (deveExibirWidget(mercadoStatus)) {
        RXrayState.rodadaConsolidada = mercadoStatus.rodada_atual;
        await mostrarWidget();
    } else {
        esconderWidget();
    }
}

/**
 * Determina se widget deve ser exibido
 */
function deveExibirWidget(mercadoStatus) {
    if (!mercadoStatus) return false;

    // Verificar se módulo está ativo na liga
    if (!window.participanteNavigation?.verificarModuloAtivo?.('raioX')) return false;

    // Rodada consolidada (não em andamento)
    const rodadaConsolidada = mercadoStatus.rodada_atual > 0
        && !mercadoStatus.rodada_em_andamento;

    // Mercado aberto (aguardando próxima rodada)
    const mercadoAberto = mercadoStatus.status_mercado === 1; // ABERTO

    // Não está em pré-temporada
    const naoPreTemporada = mercadoStatus.temporada === RXrayState.temporada;

    return rodadaConsolidada && mercadoAberto && naoPreTemporada;
}

/**
 * Mostra o widget (FAB bola)
 */
async function mostrarWidget() {
    if (RXrayState.isVisible) return;

    if (window.Log) Log.info("[ROUND-XRAY] Mostrando widget...");

    // Criar FAB se não existe
    let fab = document.getElementById("rxrayFab");
    if (!fab) {
        fab = criarFAB();
        document.body.appendChild(fab);
    }

    // Carregar posição salva
    carregarPosicaoFAB();
    aplicarPosicaoFAB(fab);

    // Inicializar drag & drop
    inicializarDragFAB(fab);

    // Adicionar event listener
    fab.addEventListener("click", abrirModal);

    // Mostrar
    fab.style.display = "flex";
    RXrayState.isVisible = true;

    if (window.Log) Log.info("[ROUND-XRAY] Widget visível");
}

/**
 * Esconde o widget
 */
function esconderWidget() {
    if (!RXrayState.isVisible) return;

    const fab = document.getElementById("rxrayFab");
    if (fab) {
        fab.style.display = "none";
    }

    RXrayState.isVisible = false;

    if (window.Log) Log.info("[ROUND-XRAY] Widget escondido");
}

/**
 * Cria elemento FAB (bola)
 */
function criarFAB() {
    const fab = document.createElement("div");
    fab.id = "rxrayFab";
    fab.className = "rxray-fab";
    fab.innerHTML = `
        <div class="rxray-fab-icon">⚽</div>
        <div class="rxray-fab-badge" id="rxrayBadge">${RXrayState.rodadaConsolidada || ""}</div>
    `;
    return fab;
}

// ============================================
// DRAG & DROP
// ============================================
function carregarPosicaoFAB() {
    try {
        const saved = localStorage.getItem(RXRAY_STORAGE_KEY);
        if (saved) {
            RXrayState.fabPosition = JSON.parse(saved);
        }
    } catch (e) {
        // Manter posição padrão
    }
}

function salvarPosicaoFAB() {
    try {
        localStorage.setItem(RXRAY_STORAGE_KEY, JSON.stringify(RXrayState.fabPosition));
    } catch (e) {
        // Ignorar erro
    }
}

function aplicarPosicaoFAB(fab) {
    fab.style.right = `${RXrayState.fabPosition.right}px`;
    fab.style.bottom = `${RXrayState.fabPosition.bottom}px`;
    fab.style.left = "auto";
    fab.style.top = "auto";
}

function inicializarDragFAB(fab) {
    let startX, startY, startRight, startBottom;
    let hasMoved = false;

    // Touch events (mobile)
    fab.addEventListener("touchstart", handleDragStart, { passive: true });
    fab.addEventListener("touchmove", handleDragMove, { passive: false });
    fab.addEventListener("touchend", handleDragEnd);

    // Mouse events (desktop)
    fab.addEventListener("mousedown", handleDragStart);
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);

    function handleDragStart(e) {
        if (RXrayState.isModalOpen) return; // Não arrastar se modal aberto

        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;

        const rect = fab.getBoundingClientRect();
        startRight = window.innerWidth - rect.right;
        startBottom = window.innerHeight - rect.bottom;

        hasMoved = false;
        fab.style.cursor = "grabbing";
    }

    function handleDragMove(e) {
        if (startX === undefined) return;
        if (RXrayState.isModalOpen) return;

        const touch = e.touches ? e.touches[0] : e;
        const deltaX = startX - touch.clientX;
        const deltaY = touch.clientY - startY;

        // Mínimo movimento para considerar drag (evita clicks acidentais)
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            hasMoved = true;
            e.preventDefault(); // Prevenir scroll durante drag
        }

        if (hasMoved) {
            const newRight = Math.max(0, Math.min(window.innerWidth - 56, startRight + deltaX));
            const newBottom = Math.max(0, Math.min(window.innerHeight - 56, startBottom - deltaY));

            RXrayState.fabPosition = { right: newRight, bottom: newBottom };
            aplicarPosicaoFAB(fab);
        }
    }

    function handleDragEnd(e) {
        if (startX === undefined) return;

        startX = undefined;
        startY = undefined;
        fab.style.cursor = "move";

        if (hasMoved) {
            salvarPosicaoFAB();
            // Prevenir click após drag
            e.preventDefault();
            e.stopPropagation();
        }
    }
}

// ============================================
// MODAL
// ============================================
async function abrirModal() {
    if (RXrayState.isModalOpen) return;

    if (window.Log) Log.info("[ROUND-XRAY] Abrindo modal...");

    RXrayState.isModalOpen = true;

    // Criar modal se não existe
    let modal = document.getElementById("rxrayModal");
    if (!modal) {
        modal = criarModal();
        document.body.appendChild(modal);
    }

    // Mostrar modal
    modal.style.display = "flex";

    // Carregar dados
    await carregarContexto();

    // Renderizar
    if (RXrayState.contexto) {
        renderizarModal(RXrayState.contexto);
    }
}

function fecharModal() {
    const modal = document.getElementById("rxrayModal");
    if (modal) {
        modal.style.display = "none";
    }
    RXrayState.isModalOpen = false;

    if (window.Log) Log.info("[ROUND-XRAY] Modal fechado");
}

function criarModal() {
    const modal = document.createElement("div");
    modal.id = "rxrayModal";
    modal.className = "rxray-modal";
    modal.innerHTML = `
        <div class="rxray-modal-overlay"></div>
        <div class="rxray-modal-content">
            <!-- Header -->
            <div class="rxray-modal-header">
                <h3>⚽ Raio-X da Rodada <span id="rxrayModalRodada"></span></h3>
                <button id="rxrayCloseBtn" class="rxray-close-btn">✕</button>
            </div>

            <!-- Loading -->
            <div id="rxrayLoading" class="rxray-loading">
                <div class="spinner"></div>
                <p>Carregando análise...</p>
            </div>

            <!-- Conteúdo -->
            <div id="rxrayContent" class="rxray-content" style="display:none;">

                <!-- NARRATIVA -->
                <div class="rxray-section">
                    <h4>💬 Resumo Inteligente</h4>
                    <div id="rxrayNarrativa" class="rxray-narrative-box"></div>
                </div>

                <!-- DISPUTAS -->
                <div class="rxray-section">
                    <h4>🎯 Suas Disputas</h4>
                    <div id="rxrayDisputas"></div>
                </div>

                <!-- PERFORMANCE -->
                <div class="rxray-section">
                    <h4>📊 Performance Geral</h4>
                    <div id="rxrayPerformance" class="rxray-stats-grid"></div>
                </div>

                <!-- MOVIMENTAÇÕES -->
                <div class="rxray-section">
                    <h4>🎖️ Mudanças na Liga</h4>
                    <div id="rxrayMovimentacoes"></div>
                </div>

                <!-- Botão análise completa -->
                <button id="rxrayVerCompleto" class="rxray-btn-primary">
                    Ver Análise Completa →
                </button>

            </div>
        </div>
    `;

    // Event listeners
    modal.querySelector(".rxray-modal-overlay").addEventListener("click", fecharModal);
    modal.querySelector("#rxrayCloseBtn").addEventListener("click", fecharModal);
    modal.querySelector("#rxrayVerCompleto").addEventListener("click", navegarParaAnaliseCompleta);

    return modal;
}

// ============================================
// DADOS
// ============================================
async function carregarContexto() {
    // Verificar cache primeiro
    const cached = getCachedContexto();
    if (cached) {
        RXrayState.contexto = cached;
        return;
    }

    // Mostrar loading
    document.getElementById("rxrayLoading").style.display = "flex";
    document.getElementById("rxrayContent").style.display = "none";

    try {
        const url = `/api/rodada-contexto/${RXrayState.ligaId}/${RXrayState.rodadaConsolidada}/${RXrayState.timeId}?temporada=${RXrayState.temporada}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
        }

        RXrayState.contexto = await response.json();
        cacheContexto(RXrayState.contexto);

        if (window.Log) Log.info("[ROUND-XRAY] Contexto carregado");

    } catch (error) {
        console.error("[ROUND-XRAY] Erro ao carregar contexto:", error);
        mostrarErro("Erro ao carregar dados. Tente novamente.");
    }
}

function getCachedContexto() {
    try {
        const cached = localStorage.getItem(`${RXRAY_CACHE_KEY}-${RXrayState.rodadaConsolidada}`);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < RXRAY_CACHE_DURATION) {
                if (window.Log) Log.info("[ROUND-XRAY] Usando cache");
                return data;
            }
        }
    } catch (e) {
        // Ignorar erro de cache
    }
    return null;
}

function cacheContexto(contexto) {
    try {
        localStorage.setItem(
            `${RXRAY_CACHE_KEY}-${RXrayState.rodadaConsolidada}`,
            JSON.stringify({ data: contexto, timestamp: Date.now() })
        );
    } catch (e) {
        // Ignorar erro
    }
}

// ============================================
// RENDERIZAÇÃO
// ============================================
function renderizarModal(contexto) {
    document.getElementById("rxrayLoading").style.display = "none";
    document.getElementById("rxrayContent").style.display = "block";

    // Rodada no header
    document.getElementById("rxrayModalRodada").textContent = contexto.rodada;

    // 1. Narrativa
    const narrativaEl = document.getElementById("rxrayNarrativa");
    narrativaEl.innerHTML = `<p>${escapeHtml(contexto.narrativa.resumida)}</p>`;

    // 2. Disputas
    renderizarDisputas(contexto.disputas);

    // 3. Performance
    renderizarPerformance(contexto.performance);

    // 4. Movimentações
    renderizarMovimentacoes(contexto.movimentacoes);
}

function renderizarDisputas(disputas) {
    const container = document.getElementById("rxrayDisputas");
    const disputasHTML = [];

    // Pontos Corridos
    if (disputas.pontos_corridos) {
        const pc = disputas.pontos_corridos;
        const resultadoClass = pc.seu_confronto.resultado === "vitoria" ? "vitoria" :
                               pc.seu_confronto.resultado === "derrota" ? "derrota" : "empate";
        const resultadoIcon = pc.seu_confronto.resultado === "vitoria" ? "✅" :
                             pc.seu_confronto.resultado === "derrota" ? "❌" : "⚖️";

        disputasHTML.push(`
            <div class="rxray-disputa-card">
                <div class="rxray-disputa-header">⚽ PONTOS CORRIDOS</div>
                <div class="rxray-disputa-confronto">
                    <span class="voce">Você ${pc.seu_confronto.voce.toFixed(1)}</span>
                    <span class="vs">×</span>
                    <span class="adv">${pc.seu_confronto.adversario.pontos.toFixed(1)} ${escapeHtml(pc.seu_confronto.adversario.nome)}</span>
                    <span class="resultado ${resultadoClass}">${resultadoIcon}</span>
                </div>
                <div class="rxray-disputa-status">
                    ${pc.minha_posicao}º lugar • ${pc.zona}
                </div>
            </div>
        `);
    }

    // Mata-Mata
    if (disputas.mata_mata && disputas.mata_mata.seu_confronto) {
        const mm = disputas.mata_mata;
        disputasHTML.push(`
            <div class="rxray-disputa-card">
                <div class="rxray-disputa-header">🏆 MATA-MATA (${escapeHtml(mm.fase_atual)})</div>
                <div class="rxray-disputa-status">
                    ${mm.seu_confronto.resultado === "classificado" ? "✅ Classificado" : "❌ Eliminado"}
                </div>
            </div>
        `);
    }

    // Artilheiro
    if (disputas.artilheiro) {
        const art = disputas.artilheiro;
        disputasHTML.push(`
            <div class="rxray-disputa-card">
                <div class="rxray-disputa-header">🎯 ARTILHEIRO CAMPEÃO</div>
                <div class="rxray-disputa-status">
                    ${art.sua_posicao}º lugar • ${art.seus_gols || 0} gols
                </div>
            </div>
        `);
    }

    // Capitão de Luxo
    if (disputas.capitao_luxo) {
        const cap = disputas.capitao_luxo;
        const diff = cap.classificacao_acumulada && cap.classificacao_acumulada.length > 0
            ? cap.classificacao_acumulada.find(c => c.posicao === cap.sua_posicao)?.diferenca || 0
            : 0;

        disputasHTML.push(`
            <div class="rxray-disputa-card">
                <div class="rxray-disputa-header">👑 CAPITÃO DE LUXO</div>
                <div class="rxray-disputa-status">
                    ${cap.sua_posicao}º lugar • ${diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} pts
                </div>
            </div>
        `);
    }

    container.innerHTML = disputasHTML.length > 0
        ? disputasHTML.join("")
        : '<p class="rxray-empty">Nenhuma disputa ativa nesta rodada.</p>';
}

function renderizarPerformance(performance) {
    const container = document.getElementById("rxrayPerformance");
    const positiveClass = performance.vs_media >= 0 ? "positive" : "negative";
    const finClass = performance.financeiro >= 0 ? "positive" : "negative";

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Posição</div>
            <div class="stat-value">🏆 ${performance.posicao}º de ${performance.total_participantes}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Pontos</div>
            <div class="stat-value">⭐ ${performance.pontos.toFixed(2)}</div>
        </div>
        <div class="stat-card ${positiveClass}">
            <div class="stat-label">vs Média</div>
            <div class="stat-value">📈 ${performance.vs_media >= 0 ? "+" : ""}${performance.vs_media.toFixed(1)}</div>
        </div>
        <div class="stat-card ${finClass}">
            <div class="stat-label">Financeiro</div>
            <div class="stat-value">💰 ${performance.financeiro >= 0 ? "+" : ""}R$ ${Math.abs(performance.financeiro)}</div>
        </div>
    `;
}

function renderizarMovimentacoes(movimentacoes) {
    const container = document.getElementById("rxrayMovimentacoes");

    if (!movimentacoes || movimentacoes.length === 0) {
        container.innerHTML = '<p class="rxray-empty">Sem mudanças significativas nesta rodada.</p>';
        return;
    }

    const movHTML = movimentacoes.slice(0, 5).map(mov => {
        if (mov.tipo === "subida") {
            return `<div class="mov-item">↗️ ${escapeHtml(mov.time)}: ${mov.de}º → ${mov.para}º</div>`;
        } else if (mov.tipo === "queda") {
            return `<div class="mov-item">↘️ ${escapeHtml(mov.time)}: ${mov.de}º → ${mov.para}º</div>`;
        }
        return "";
    }).join("");

    container.innerHTML = movHTML;
}

function mostrarErro(mensagem) {
    document.getElementById("rxrayLoading").style.display = "none";
    document.getElementById("rxrayContent").innerHTML = `
        <div class="rxray-error">
            <span class="material-icons">error_outline</span>
            <p>${escapeHtml(mensagem)}</p>
        </div>
    `;
    document.getElementById("rxrayContent").style.display = "block";
}

// ============================================
// NAVEGAÇÃO
// ============================================
function navegarParaAnaliseCompleta() {
    // Passar parâmetros para o Raio-X completo
    window.xrayParams = {
        rodada: RXrayState.rodadaConsolidada,
        temporada: RXrayState.temporada,
        focusMode: "disputas", // Flag para renderizar com foco em disputas
    };

    // Navegar
    if (window.participanteNav) {
        window.participanteNav.navegarPara("rodada-xray");
    }

    // Fechar modal
    fecharModal();
}

// ============================================
// HELPERS
// ============================================
function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// API PÚBLICA
// ============================================
window.RaioXWidget = {
    show: mostrarWidget,
    hide: esconderWidget,
    shouldShow: deveExibirWidget,
};

export default { inicializarRaioXWidget };
