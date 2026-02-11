/**
 * WHATS HAPPENING WIDGET - "O que tá rolando?"
 * =============================================
 * Widget flutuante de engajamento em tempo real
 * Mostra disputas internas ativas nos módulos da liga
 *
 * @version 1.0.0
 *
 * Módulos suportados:
 * - Pontos Corridos (confrontos da rodada)
 * - Mata-Mata (confrontos ativos)
 * - Artilheiro (disputa pelo topo)
 * - Luva de Ouro (melhor goleiro)
 * - Capitão de Luxo (melhor capitão)
 * - Ranking da Rodada (top 3 + posição do usuário)
 */

if (window.Log) Log.info("[WHATS-HAPPENING] 🔥 Widget v1.0 carregando...");

// ============================================
// ESTADO DO WIDGET
// ============================================
const WHState = {
    isOpen: false,
    isLoading: false,
    ligaId: null,
    timeId: null,
    temporada: null,
    modulosAtivos: {},
    mercadoStatus: null,
    lastUpdate: null,
    pollingInterval: null,
    data: {
        pontosCorridos: null,
        mataMata: null,
        artilheiro: null,
        luvaOuro: null,
        capitao: null,
        ranking: null,
    },
    hasUpdates: false,
    // Drag state
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    fabPosition: { right: 16, bottom: 80 }, // Posição padrão
};

// ============================================
// DRAG & DROP - FAB SOLTO
// ============================================
const FAB_STORAGE_KEY = "wh-fab-position";

function loadFabPosition() {
    try {
        const saved = localStorage.getItem(FAB_STORAGE_KEY);
        if (saved) {
            const pos = JSON.parse(saved);
            WHState.fabPosition = pos;
        }
    } catch (e) {
        // Manter posição padrão
    }
}

function saveFabPosition() {
    try {
        localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(WHState.fabPosition));
    } catch (e) {
        // Ignorar erro de storage
    }
}

function applyFabPosition(fab) {
    fab.style.right = `${WHState.fabPosition.right}px`;
    fab.style.bottom = `${WHState.fabPosition.bottom}px`;
    // Limpar left/top se existirem
    fab.style.left = "auto";
    fab.style.top = "auto";
}

function initFabDrag(fab) {
    let startX, startY, startRight, startBottom;
    let hasMoved = false;

    // Mostrar hint de drag na primeira vez
    showDragHintIfNeeded(fab);

    // Touch events (mobile)
    fab.addEventListener("touchstart", handleDragStart, { passive: false });
    fab.addEventListener("touchmove", handleDragMove, { passive: false });
    fab.addEventListener("touchend", handleDragEnd);

    // Mouse events (desktop)
    fab.addEventListener("mousedown", handleDragStart);
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);

    function handleDragStart(e) {
        if (WHState.isOpen) return; // Não arrastar se painel aberto

        WHState.isDragging = true;
        hasMoved = false;
        fab.classList.add("dragging");
        fab.classList.remove("show-drag-hint");

        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        startRight = WHState.fabPosition.right;
        startBottom = WHState.fabPosition.bottom;

        if (e.type === "touchstart") {
            e.preventDefault(); // Prevenir scroll durante drag no mobile
        }
    }

    function handleDragMove(e) {
        if (!WHState.isDragging) return;

        const touch = e.touches ? e.touches[0] : e;
        const deltaX = startX - touch.clientX;
        const deltaY = startY - touch.clientY;

        // Considerar como "moveu" se deslocou mais de 5px
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            hasMoved = true;
        }

        // Calcular nova posição
        let newRight = startRight + deltaX;
        let newBottom = startBottom + deltaY;

        // Limites da tela
        const fabSize = 60;
        const margin = 8;
        const maxRight = window.innerWidth - fabSize - margin;
        const maxBottom = window.innerHeight - fabSize - margin;

        newRight = Math.max(margin, Math.min(maxRight, newRight));
        newBottom = Math.max(margin, Math.min(maxBottom, newBottom));

        WHState.fabPosition.right = newRight;
        WHState.fabPosition.bottom = newBottom;

        applyFabPosition(fab);

        if (e.type === "touchmove") {
            e.preventDefault();
        }
    }

    function handleDragEnd(e) {
        if (!WHState.isDragging) return;

        WHState.isDragging = false;
        fab.classList.remove("dragging");

        if (hasMoved) {
            // Efeito visual de "soltar"
            fab.classList.add("just-dropped");
            setTimeout(() => fab.classList.remove("just-dropped"), 400);

            // Salvar posição
            saveFabPosition();
            markDragHintShown();

            // Prevenir click se arrastou
            e.preventDefault();
            e.stopPropagation();
        }
    }
}

function showDragHintIfNeeded(fab) {
    const HINT_KEY = "wh-fab-drag-hint-shown";
    try {
        if (!localStorage.getItem(HINT_KEY)) {
            // Mostrar hint após 2 segundos
            setTimeout(() => {
                fab.classList.add("show-drag-hint");
                // Remover automaticamente após a animação (3s)
                setTimeout(() => {
                    fab.classList.remove("show-drag-hint");
                }, 3000);
            }, 2000);
        }
    } catch (e) {
        // Ignorar
    }
}

function markDragHintShown() {
    const HINT_KEY = "wh-fab-drag-hint-shown";
    try {
        localStorage.setItem(HINT_KEY, "1");
    } catch (e) {
        // Ignorar
    }
}

// ============================================
// CONFIGURAÇÃO
// ============================================
const WH_CONFIG = {
    POLLING_INTERVAL: 60000, // 60 segundos
    API_TIMEOUT: 10000,
    MIN_DIFF_HOT: 10, // Diferença mínima para ser "disputa quente"
};

// ============================================
// INICIALIZAÇÃO
// ============================================
export async function initWhatsHappeningWidget(params = {}) {
    if (window.Log) Log.info("[WHATS-HAPPENING] 🚀 Inicializando widget...", params);

    // Extrair parâmetros
    WHState.ligaId = params.ligaId || window.participanteData?.ligaId;
    WHState.timeId = params.timeId || window.participanteData?.timeId;
    WHState.temporada = params.temporada || new Date().getFullYear();
    WHState.modulosAtivos = params.modulosAtivos || {};

    if (!WHState.ligaId) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ ligaId não definido, widget não será renderizado");
        return;
    }

    // Verificar status do mercado
    await fetchMercadoStatus();

    // Criar elementos do DOM
    createWidgetElements();

    // Buscar dados iniciais
    await fetchAllData();

    // Iniciar polling se bola rolando
    if (WHState.mercadoStatus?.bola_rolando) {
        startPolling();
    }

    if (window.Log) Log.info("[WHATS-HAPPENING] ✅ Widget inicializado com sucesso");
}

// ============================================
// CRIAR ELEMENTOS DO DOM
// ============================================
function createWidgetElements() {
    // Remover elementos existentes (se houver)
    const existingFab = document.getElementById("wh-fab");
    const existingPanel = document.getElementById("wh-panel");
    const existingBackdrop = document.getElementById("wh-backdrop");

    if (existingFab) existingFab.remove();
    if (existingPanel) existingPanel.remove();
    if (existingBackdrop) existingBackdrop.remove();

    // Carregar posição salva
    loadFabPosition();

    // Criar FAB
    const fab = document.createElement("button");
    fab.id = "wh-fab";
    fab.className = "wh-fab";
    fab.innerHTML = `
        <span class="material-icons wh-fab-icon">local_fire_department</span>
    `;

    // Aplicar posição salva
    applyFabPosition(fab);

    // Click handler que ignora se estava arrastando
    fab.addEventListener("click", (e) => {
        if (WHState.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        togglePanel();
    });

    document.body.appendChild(fab);

    // Inicializar drag
    initFabDrag(fab);

    // Criar Backdrop
    const backdrop = document.createElement("div");
    backdrop.id = "wh-backdrop";
    backdrop.className = "wh-backdrop";
    backdrop.addEventListener("click", closePanel);
    document.body.appendChild(backdrop);

    // Criar Panel
    const panel = document.createElement("div");
    panel.id = "wh-panel";
    panel.className = "wh-panel";
    panel.innerHTML = `
        <div class="wh-handle"></div>
        <div class="wh-header">
            <div class="wh-title">
                <span class="material-icons wh-title-icon">local_fire_department</span>
                O que tá rolando?
            </div>
            <button class="wh-close-btn" id="wh-close-btn">
                <span class="material-icons">close</span>
            </button>
        </div>
        <div class="wh-content" id="wh-content">
            <div class="wh-loading">
                <div class="wh-loading-spinner"></div>
                <div class="wh-loading-text">Buscando disputas...</div>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // Event listener para fechar
    document.getElementById("wh-close-btn").addEventListener("click", closePanel);

    // Swipe down para fechar
    setupSwipeToClose(panel);
}

// ============================================
// TOGGLE / OPEN / CLOSE
// ============================================
function togglePanel() {
    if (WHState.isOpen) {
        closePanel();
    } else {
        openPanel();
    }
}

function openPanel() {
    WHState.isOpen = true;
    document.getElementById("wh-fab").classList.add("open");
    document.getElementById("wh-panel").classList.add("open");
    document.getElementById("wh-backdrop").classList.add("visible");

    // Remover badge de novidades
    WHState.hasUpdates = false;
    updateFabBadge();

    // Renderizar conteúdo
    renderContent();
}

function closePanel() {
    WHState.isOpen = false;
    document.getElementById("wh-fab").classList.remove("open");
    document.getElementById("wh-panel").classList.remove("open");
    document.getElementById("wh-backdrop").classList.remove("visible");
}

// ============================================
// SWIPE TO CLOSE
// ============================================
function setupSwipeToClose(panel) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    panel.addEventListener("touchstart", (e) => {
        if (e.target.closest(".wh-content")) return; // Não interferir no scroll
        startY = e.touches[0].clientY;
        isDragging = true;
    });

    panel.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0) {
            panel.style.transform = `translateY(${diff}px)`;
        }
    });

    panel.addEventListener("touchend", () => {
        if (!isDragging) return;
        isDragging = false;

        const diff = currentY - startY;
        if (diff > 100) {
            closePanel();
        }

        panel.style.transform = "";
    });
}

// ============================================
// BUSCAR DADOS
// ============================================
async function fetchMercadoStatus() {
    try {
        // Usar proxy interno para evitar CORS
        const res = await fetch("/api/cartola/mercado-status");
        if (res.ok) {
            WHState.mercadoStatus = await res.json();
        }
    } catch (e) {
        // Fallback: tentar cache do window se disponível
        if (window.mercadoStatusCache) {
            WHState.mercadoStatus = window.mercadoStatusCache;
        }
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Usando cache de mercado status");
    }
}

async function fetchAllData() {
    WHState.isLoading = true;

    const promises = [];

    // Pontos Corridos
    if (WHState.modulosAtivos.pontosCorridos) {
        promises.push(fetchPontosCorridos());
    }

    // Mata-Mata
    if (WHState.modulosAtivos.mataMata) {
        promises.push(fetchMataMata());
    }

    // Artilheiro
    if (WHState.modulosAtivos.artilheiro) {
        promises.push(fetchArtilheiro());
    }

    // Luva de Ouro
    if (WHState.modulosAtivos.luvaOuro) {
        promises.push(fetchLuvaOuro());
    }

    // Capitão de Luxo
    if (WHState.modulosAtivos.capitaoLuxo) {
        promises.push(fetchCapitao());
    }

    // Ranking da Rodada (sempre ativo)
    promises.push(fetchRanking());

    await Promise.allSettled(promises);

    WHState.isLoading = false;
    WHState.lastUpdate = new Date();

    // Se painel está aberto, atualizar conteúdo
    if (WHState.isOpen) {
        renderContent();
    }

    // Verificar se há novidades
    checkForUpdates();
}

async function fetchPontosCorridos() {
    try {
        const rodada = WHState.mercadoStatus?.rodada_atual || 1;
        const res = await fetch(
            `/api/pontos-corridos/${WHState.ligaId}?temporada=${WHState.temporada}`
        );
        if (res.ok) {
            const data = await res.json();
            // Encontrar rodada atual
            const rodadaData = data.find((r) => r.rodada === rodada);
            WHState.data.pontosCorridos = rodadaData;
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Pontos Corridos:", e);
    }
}

async function fetchMataMata() {
    try {
        // Primeiro buscar edições disponíveis
        const edicoesRes = await fetch(
            `/api/mata-mata/cache/${WHState.ligaId}/edicoes?temporada=${WHState.temporada}`
        );

        if (!edicoesRes.ok) return;

        const edicoesData = await edicoesRes.json();
        if (!edicoesData.edicoes || edicoesData.edicoes.length === 0) return;

        // Pegar a última edição (mais recente)
        const ultimaEdicao = edicoesData.edicoes[edicoesData.edicoes.length - 1];

        // Buscar dados da edição
        const res = await fetch(
            `/api/mata-mata/cache/${WHState.ligaId}/${ultimaEdicao.edicao}?temporada=${WHState.temporada}`
        );

        if (res.ok) {
            const data = await res.json();
            WHState.data.mataMata = {
                edicao: ultimaEdicao.edicao,
                confrontos: data.confrontos || [],
                faseAtual: data.fase_atual || "quartas"
            };
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Mata-Mata:", e);
    }
}

async function fetchArtilheiro() {
    try {
        const res = await fetch(
            `/api/artilheiro-campeao/${WHState.ligaId}/ranking?temporada=${WHState.temporada}`
        );
        if (res.ok) {
            const data = await res.json();
            // Normalizar formato
            WHState.data.artilheiro = {
                ranking: data.ranking || data.data || data
            };
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Artilheiro:", e);
    }
}

async function fetchLuvaOuro() {
    try {
        const res = await fetch(
            `/api/luva-de-ouro/${WHState.ligaId}/ranking?temporada=${WHState.temporada}`
        );
        if (res.ok) {
            const data = await res.json();
            // Normalizar formato
            WHState.data.luvaOuro = {
                ranking: data.ranking || data.data || data
            };
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Luva de Ouro:", e);
    }
}

async function fetchCapitao() {
    try {
        const res = await fetch(
            `/api/capitao/${WHState.ligaId}/ranking?temporada=${WHState.temporada}`
        );
        if (res.ok) {
            const data = await res.json();
            // Normalizar formato
            WHState.data.capitao = {
                ranking: data.ranking || data.data || data
            };
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Capitão:", e);
    }
}

async function fetchRanking() {
    try {
        const rodada = WHState.mercadoStatus?.rodada_atual || 1;
        const res = await fetch(
            `/api/ligas/${WHState.ligaId}/ranking/${rodada}?temporada=${WHState.temporada}`
        );
        if (res.ok) {
            const data = await res.json();
            // Normalizar formato
            WHState.data.ranking = {
                ranking: data.ranking || data.data || data
            };
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Ranking:", e);
    }
}

// ============================================
// POLLING (ATUALIZAÇÃO AUTOMÁTICA)
// ============================================
function startPolling() {
    if (WHState.pollingInterval) return;

    if (window.Log) Log.info("[WHATS-HAPPENING] 🔄 Iniciando polling (60s)...");

    WHState.pollingInterval = setInterval(async () => {
        // Verificar se ainda está rolando
        await fetchMercadoStatus();

        if (!WHState.mercadoStatus?.bola_rolando) {
            stopPolling();
            return;
        }

        await fetchAllData();
    }, WH_CONFIG.POLLING_INTERVAL);
}

function stopPolling() {
    if (WHState.pollingInterval) {
        clearInterval(WHState.pollingInterval);
        WHState.pollingInterval = null;
        if (window.Log) Log.info("[WHATS-HAPPENING] ⏹️ Polling parado");
    }
}

// ============================================
// VERIFICAR NOVIDADES
// ============================================
function checkForUpdates() {
    // Lógica simples: se há disputas "quentes", mostrar badge
    const hasHotDisputes =
        hasHotPontosCorridos() ||
        hasHotMataMata() ||
        hasHotArtilheiro();

    if (hasHotDisputes && !WHState.isOpen) {
        WHState.hasUpdates = true;
        updateFabBadge();
    }
}

function hasHotPontosCorridos() {
    const data = WHState.data.pontosCorridos;
    if (!data?.confrontos) return false;

    return data.confrontos.some((c) => {
        const diff = Math.abs((c.pontosA || 0) - (c.pontosB || 0));
        return diff < WH_CONFIG.MIN_DIFF_HOT;
    });
}

function hasHotMataMata() {
    const data = WHState.data.mataMata;
    if (!data?.confrontos) return false;

    return data.confrontos.some((c) => {
        const diff = Math.abs((c.timeA?.pontos || 0) - (c.timeB?.pontos || 0));
        return diff < WH_CONFIG.MIN_DIFF_HOT;
    });
}

function hasHotArtilheiro() {
    const data = WHState.data.artilheiro;
    if (!data?.ranking || data.ranking.length < 2) return false;

    const diff = (data.ranking[0]?.gols || 0) - (data.ranking[1]?.gols || 0);
    return diff <= 1;
}

function updateFabBadge() {
    const fab = document.getElementById("wh-fab");
    if (!fab) return;

    // Remover badge existente
    const existingBadge = fab.querySelector(".wh-fab-badge");
    if (existingBadge) existingBadge.remove();

    // Adicionar classe de pulsação e badge se há updates
    if (WHState.hasUpdates) {
        fab.classList.add("has-updates");
        const badge = document.createElement("span");
        badge.className = "wh-fab-badge";
        badge.textContent = "!";
        fab.appendChild(badge);
    } else {
        fab.classList.remove("has-updates");
    }
}

// ============================================
// RENDERIZAÇÃO
// ============================================
function renderContent() {
    const content = document.getElementById("wh-content");
    if (!content) return;

    if (WHState.isLoading) {
        content.innerHTML = `
            <div class="wh-loading">
                <div class="wh-loading-spinner"></div>
                <div class="wh-loading-text">Buscando disputas...</div>
            </div>
        `;
        return;
    }

    const sections = [];

    // Timestamp
    sections.push(renderTimestamp());

    // Ranking da Rodada (sempre primeiro)
    const rankingSection = renderRankingSection();
    if (rankingSection) sections.push(rankingSection);

    // Pontos Corridos
    if (WHState.modulosAtivos.pontosCorridos) {
        const pcSection = renderPontosCorridosSection();
        if (pcSection) sections.push(pcSection);
    }

    // Mata-Mata
    if (WHState.modulosAtivos.mataMata) {
        const mmSection = renderMataMataSection();
        if (mmSection) sections.push(mmSection);
    }

    // Artilheiro
    if (WHState.modulosAtivos.artilheiro) {
        const artSection = renderArtilheiroSection();
        if (artSection) sections.push(artSection);
    }

    // Luva de Ouro
    if (WHState.modulosAtivos.luvaOuro) {
        const luvaSection = renderLuvaOuroSection();
        if (luvaSection) sections.push(luvaSection);
    }

    // Capitão de Luxo
    if (WHState.modulosAtivos.capitaoLuxo) {
        const capSection = renderCapitaoSection();
        if (capSection) sections.push(capSection);
    }

    // Se não há nada
    if (sections.length <= 1) {
        content.innerHTML = `
            <div class="wh-empty">
                <span class="material-icons wh-empty-icon">sports_soccer</span>
                <div class="wh-empty-title">Nenhuma disputa ativa</div>
                <div class="wh-empty-desc">Aguardando início da rodada</div>
            </div>
        `;
        return;
    }

    content.innerHTML = sections.join("");
}

function renderTimestamp() {
    const now = WHState.lastUpdate || new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const isLive = WHState.mercadoStatus?.bola_rolando;

    return `
        <div class="wh-timestamp">
            <span class="material-icons">${isLive ? "sensors" : "schedule"}</span>
            ${isLive ? "Ao vivo" : "Atualizado"} às ${time}
            ${isLive ? '<span style="color: var(--app-danger);">●</span>' : ""}
        </div>
    `;
}

function renderRankingSection() {
    const data = WHState.data.ranking;
    if (!data?.ranking || !Array.isArray(data.ranking) || data.ranking.length === 0) return null;

    const ranking = data.ranking;
    const meuTime = ranking.find((r) => String(r.timeId) === String(WHState.timeId));
    const minhaPosicao = meuTime ? ranking.indexOf(meuTime) + 1 : null;

    // Top 3
    const top3 = ranking.slice(0, 3);

    // Montar HTML
    let items = top3.map((r, i) => {
        const posClass = i === 0 ? "gold" : i === 1 ? "silver" : "bronze";
        const isMe = String(r.timeId) === String(WHState.timeId);
        return `
            <div class="wh-ranking-item ${posClass} ${isMe ? "me" : ""}">
                <div class="wh-ranking-pos">${i + 1}</div>
                <div class="wh-ranking-nome">${r.nome_time || r.nomeTime}</div>
                <div class="wh-ranking-valor">${(r.pontos || 0).toFixed(1)}</div>
            </div>
        `;
    }).join("");

    // Se eu não estou no top 3, mostrar minha posição
    if (minhaPosicao && minhaPosicao > 3) {
        items += `
            <div class="wh-ranking-separator">···</div>
            <div class="wh-ranking-item me">
                <div class="wh-ranking-pos">${minhaPosicao}º</div>
                <div class="wh-ranking-nome">${meuTime.nome_time || meuTime.nomeTime}</div>
                <div class="wh-ranking-valor">${(meuTime.pontos || 0).toFixed(1)}</div>
            </div>
        `;
    }

    return `
        <div class="wh-section wh-section--ranking">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">leaderboard</span>
                </div>
                <div class="wh-section-title">Ranking Rodada ${WHState.mercadoStatus?.rodada_atual || "?"}</div>
            </div>
            <div class="wh-section-body">
                <div class="wh-ranking-mini">
                    ${items}
                </div>
            </div>
        </div>
    `;
}

function renderPontosCorridosSection() {
    const data = WHState.data.pontosCorridos;
    if (!data?.confrontos || data.confrontos.length === 0) return null;

    // Filtrar confrontos que envolvem meu time ou são "quentes"
    const myConfrontos = data.confrontos.filter((c) => {
        const isMyGame =
            String(c.timeAId) === String(WHState.timeId) ||
            String(c.timeBId) === String(WHState.timeId);
        const diff = Math.abs((c.pontosA || 0) - (c.pontosB || 0));
        const isHot = diff < WH_CONFIG.MIN_DIFF_HOT;
        return isMyGame || isHot;
    });

    if (myConfrontos.length === 0) return null;

    const confrontosHtml = myConfrontos.slice(0, 3).map((c) => {
        const diff = Math.abs((c.pontosA || 0) - (c.pontosB || 0));
        const isHot = diff < WH_CONFIG.MIN_DIFF_HOT;
        const isMyGame =
            String(c.timeAId) === String(WHState.timeId) ||
            String(c.timeBId) === String(WHState.timeId);

        const aWinning = (c.pontosA || 0) > (c.pontosB || 0);
        const bWinning = (c.pontosB || 0) > (c.pontosA || 0);

        let insight = "";
        if (isHot) {
            insight = `
                <div class="wh-confronto-insight">
                    <span class="material-icons">whatshot</span>
                    Disputa acirrada! Apenas ${diff.toFixed(1)} pts de diferença
                </div>
            `;
        }

        return `
            <div class="wh-confronto ${isHot ? "hot" : ""}">
                <div class="wh-confronto-header">
                    <span class="wh-confronto-rodada">Rodada ${data.rodada}</span>
                    ${isHot ? '<span class="wh-confronto-status tight"><span class="material-icons" style="font-size:12px">local_fire_department</span> Quente!</span>' : ""}
                </div>
                <div class="wh-confronto-times">
                    <div class="wh-time wh-time--home ${aWinning ? "winning" : bWinning ? "losing" : ""}">
                        <img class="wh-time-escudo" src="${c.escudoA || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                        <div class="wh-time-info">
                            <div class="wh-time-nome">${c.nomeTimeA || "Time A"}</div>
                        </div>
                        <div class="wh-time-pontos">${(c.pontosA || 0).toFixed(1)}</div>
                    </div>
                    <div class="wh-vs">
                        <span class="wh-vs-text">VS</span>
                    </div>
                    <div class="wh-time wh-time--away ${bWinning ? "winning" : aWinning ? "losing" : ""}">
                        <div class="wh-time-pontos">${(c.pontosB || 0).toFixed(1)}</div>
                        <div class="wh-time-info">
                            <div class="wh-time-nome">${c.nomeTimeB || "Time B"}</div>
                        </div>
                        <img class="wh-time-escudo" src="${c.escudoB || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                    </div>
                </div>
                ${insight}
            </div>
        `;
    }).join("");

    return `
        <div class="wh-section wh-section--pontos-corridos">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">swap_horiz</span>
                </div>
                <div class="wh-section-title">Pontos Corridos</div>
            </div>
            <div class="wh-section-body">
                ${confrontosHtml}
            </div>
        </div>
    `;
}

function renderMataMataSection() {
    const data = WHState.data.mataMata;
    if (!data?.confrontos || data.confrontos.length === 0) return null;

    // Filtrar confrontos que envolvem meu time
    const myConfrontos = data.confrontos.filter((c) => {
        const timeAId = c.timeA?.time_id || c.timeA?.timeId;
        const timeBId = c.timeB?.time_id || c.timeB?.timeId;
        return (
            String(timeAId) === String(WHState.timeId) ||
            String(timeBId) === String(WHState.timeId)
        );
    });

    if (myConfrontos.length === 0) return null;

    const confrontosHtml = myConfrontos.map((c) => {
        const pontosA = parseFloat(c.timeA?.pontos) || 0;
        const pontosB = parseFloat(c.timeB?.pontos) || 0;
        const diff = Math.abs(pontosA - pontosB);
        const aWinning = pontosA > pontosB;
        const bWinning = pontosB > pontosA;

        const fase = c.fase || "Fase";

        return `
            <div class="wh-confronto ${diff < 15 ? "hot" : ""}">
                <div class="wh-confronto-header">
                    <span class="wh-confronto-rodada">${data.edicao || "Mata-Mata"} - ${fase}</span>
                    ${WHState.mercadoStatus?.bola_rolando ? '<span class="wh-confronto-status live"><span class="material-icons" style="font-size:12px">sensors</span> AO VIVO</span>' : ""}
                </div>
                <div class="wh-confronto-times">
                    <div class="wh-time wh-time--home ${aWinning ? "winning" : bWinning ? "losing" : ""}">
                        <img class="wh-time-escudo" src="${c.timeA?.url_escudo_png || c.timeA?.escudo || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                        <div class="wh-time-info">
                            <div class="wh-time-nome">${c.timeA?.nome_time || "Time A"}</div>
                        </div>
                        <div class="wh-time-pontos">${pontosA.toFixed(1)}</div>
                    </div>
                    <div class="wh-vs">
                        <span class="wh-vs-text">VS</span>
                        <span class="wh-vs-diff">${diff.toFixed(1)}</span>
                    </div>
                    <div class="wh-time wh-time--away ${bWinning ? "winning" : aWinning ? "losing" : ""}">
                        <div class="wh-time-pontos">${pontosB.toFixed(1)}</div>
                        <div class="wh-time-info">
                            <div class="wh-time-nome">${c.timeB?.nome_time || "Time B"}</div>
                        </div>
                        <img class="wh-time-escudo" src="${c.timeB?.url_escudo_png || c.timeB?.escudo || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                    </div>
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="wh-section wh-section--mata-mata">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">emoji_events</span>
                </div>
                <div class="wh-section-title">Mata-Mata</div>
            </div>
            <div class="wh-section-body">
                ${confrontosHtml}
            </div>
        </div>
    `;
}

function renderArtilheiroSection() {
    const data = WHState.data.artilheiro;
    if (!data?.ranking || !Array.isArray(data.ranking) || data.ranking.length === 0) return null;

    const top = data.ranking[0];
    if (!top) return null;

    const segundo = data.ranking[1];
    const diff = segundo ? (top.gols || 0) - (segundo.gols || 0) : 999;

    const disputaAcirrada =
        diff <= 1
            ? `
        <div class="wh-disputa-acirrada">
            <span class="material-icons">warning</span>
            Disputa acirrada! ${segundo?.nome_cartola || "2º lugar"} está a apenas ${diff} gol(s)
        </div>
    `
            : "";

    return `
        <div class="wh-section wh-section--artilheiro">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">sports_soccer</span>
                </div>
                <div class="wh-section-title">Artilheiro Campeão</div>
            </div>
            <div class="wh-section-body">
                <div class="wh-leader-card">
                    <div class="wh-leader-avatar">
                        <img class="wh-leader-escudo" src="${top.escudo || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                        <span class="wh-leader-crown">👑</span>
                    </div>
                    <div class="wh-leader-info">
                        <div class="wh-leader-nome">${top.nome_cartola || top.nomeCartola}</div>
                        <div class="wh-leader-stat">
                            <span class="material-icons">sports_soccer</span>
                            ${top.gols || 0} gol(s) em ${top.rodadas || "?"} rodadas
                        </div>
                    </div>
                    <div class="wh-leader-value">${top.gols || 0}</div>
                </div>
                ${disputaAcirrada}
            </div>
        </div>
    `;
}

function renderLuvaOuroSection() {
    const data = WHState.data.luvaOuro;
    if (!data?.ranking || !Array.isArray(data.ranking) || data.ranking.length === 0) return null;

    const top = data.ranking[0];
    if (!top) return null;

    return `
        <div class="wh-section wh-section--luva-ouro">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">sports_handball</span>
                </div>
                <div class="wh-section-title">Luva de Ouro</div>
            </div>
            <div class="wh-section-body">
                <div class="wh-leader-card">
                    <div class="wh-leader-avatar">
                        <img class="wh-leader-escudo" src="${top.escudo || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                        <span class="wh-leader-crown">🧤</span>
                    </div>
                    <div class="wh-leader-info">
                        <div class="wh-leader-nome">${top.nome_cartola || top.nomeCartola}</div>
                        <div class="wh-leader-stat">
                            <span class="material-icons">shield</span>
                            ${top.defesas || 0} defesas | ${top.saldo_gols || 0} SG
                        </div>
                    </div>
                    <div class="wh-leader-value">${(top.pontos || 0).toFixed(0)}</div>
                </div>
            </div>
        </div>
    `;
}

function renderCapitaoSection() {
    const data = WHState.data.capitao;
    if (!data?.ranking || !Array.isArray(data.ranking) || data.ranking.length === 0) return null;

    const top = data.ranking[0];
    if (!top) return null;

    return `
        <div class="wh-section wh-section--capitao">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">military_tech</span>
                </div>
                <div class="wh-section-title">Capitão de Luxo</div>
            </div>
            <div class="wh-section-body">
                <div class="wh-leader-card">
                    <div class="wh-leader-avatar">
                        <img class="wh-leader-escudo" src="${top.escudo || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                        <span class="wh-leader-crown">🎖️</span>
                    </div>
                    <div class="wh-leader-info">
                        <div class="wh-leader-nome">${top.nome_cartola || top.nomeCartola}</div>
                        <div class="wh-leader-stat">
                            <span class="material-icons">trending_up</span>
                            Média: ${(top.media || 0).toFixed(1)} pts
                        </div>
                    </div>
                    <div class="wh-leader-value">${(top.total || 0).toFixed(0)}</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// DESTRUIR WIDGET
// ============================================
export function destroyWhatsHappeningWidget() {
    stopPolling();

    const fab = document.getElementById("wh-fab");
    const panel = document.getElementById("wh-panel");
    const backdrop = document.getElementById("wh-backdrop");

    if (fab) fab.remove();
    if (panel) panel.remove();
    if (backdrop) backdrop.remove();

    if (window.Log) Log.info("[WHATS-HAPPENING] 🗑️ Widget destruído");
}

// ============================================
// EXPOR GLOBALMENTE (para debug)
// ============================================
if (typeof window !== "undefined") {
    window.WhatsHappeningWidget = {
        init: initWhatsHappeningWidget,
        destroy: destroyWhatsHappeningWidget,
        open: openPanel,
        close: closePanel,
        refresh: fetchAllData,
        state: WHState,
    };
}

if (window.Log) Log.info("[WHATS-HAPPENING] ✅ Widget v1.0 carregado");
